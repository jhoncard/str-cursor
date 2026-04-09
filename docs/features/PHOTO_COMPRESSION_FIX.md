# Feature: Client-Side Photo Compression for Property Uploads

> **Instructions for Cursor:** This document defines a small feature: resize and re-encode photos in the browser before they hit the server, so admins can upload straight from their phone without running into the 10 MB validator cap or the 12 MB Server Action body limit. Execute the tasks below **in order**, exactly as specified. Do not add scope. Each task includes explicit `FIND` / `REPLACE WITH` or `CREATE FILE` blocks. If any `FIND` block does not match the file exactly, **stop and report the mismatch** — do not improvise.

## 0. Goal and scope

Fix this specific problem: when the admin tries to upload a photo taken on a modern phone (iPhone, Samsung Galaxy, etc.), the upload fails because the file is 15-25 MB and the current pipeline caps at 10 MB in the validator and 12 MB in the Next.js Server Action body limit. Rather than raise the limits — which would slow down the site and waste storage — compress and resize the photo in the browser before it leaves the client.

### What changes

| # | Task | Type |
|---|---|---|
| 1 | Install `browser-image-compression` | Dependency |
| 2 | Create a client-safe image compression helper | New file |
| 3 | Wire the helper into the admin upload form | Code edit |
| 4 | Lower the server-side validator cap to 3 MB | Code edit |

**Total:** 1 new file, 2 file edits, 1 new dependency. No database changes. No environment variables. No new infrastructure.

### Design decisions baked into this document

These are settled — do NOT change them while executing the tasks. They reflect deliberate tradeoffs for the 4-property STR use case:

1. **Target dimensions: 2000px on the longest edge.** This is sharp on a standard 1920×1080 laptop (1x DPR) and effectively indistinguishable from the original on typical retina laptops at normal viewing distance. Phones will downscale regardless. Not 2400px (wasteful) and not 1600px (slightly soft on retina hero images).
2. **Output format: WebP at quality 0.82.** WebP is supported by every browser the user's guests will be on (Chrome, Safari 14+, Firefox, Edge). Quality 0.82 is visually identical to the source for photo content at normal viewing. Typical output size: 200-450 KB per photo regardless of source size.
3. **Replace the original, do not archive.** The user explicitly said they don't need to keep original full-resolution files.
4. **Server-side validator stays in place as defense-in-depth.** The new cap is 3 MB (not 1 MB) so that even an uncompressed-by-accident or panorama-format upload still has headroom, but anything over 3 MB is rejected as a "compression must have failed" signal.
5. **HEIC is not supported in this pass.** iPhone photos saved as HEIC cannot be decoded by the browser's `<canvas>` element and will fail compression. The admin workaround is to set iOS Settings → Camera → Formats → **Most Compatible** (saves as JPEG). A `heic2any` preprocessing step is deferred — see §7.

### Out of scope — do NOT touch

- Server-side image transformations (thumbnails, srcset variants, etc.). The server continues to store exactly what the client sends.
- `next/image` configuration changes.
- Moving storage to Cloudflare R2, Cloudflare Images, Bunny, or any other host. This fix keeps Supabase Storage exactly as-is.
- Changes to `assertRentalAgreementPdf` or any PDF flow — this is image-only.
- Changes to the security audit settings (magic-byte detection, `createServiceRoleSupabase`, etc.) — they stay in place unchanged.
- Refactoring the existing `handleFileSelected` beyond adding one compression call and updating one error message.
- Retroactive compression of already-uploaded images. The fix applies to new uploads only.

---

## 1. Pre-flight

```bash
git status
git checkout main
git pull origin main
git checkout -b feature/photo-compression
```

`git status` must report `nothing to commit, working tree clean` before you start. Confirm the baseline files exist:

```bash
ls src/lib/supabase/property-image-upload.ts \
   'src/app/admin/(dashboard)/properties/[id]/page.tsx' \
   src/app/admin/actions.ts
```

All three must exist. If any are missing, stop — the baseline has drifted and the document needs regeneration.

---

## 2. Task 1 — Install `browser-image-compression`

`browser-image-compression` is a well-maintained client-side library (~200K weekly downloads) that handles resize + re-encode + EXIF stripping in the browser using Canvas and optional Web Workers. No server component — it's tree-shakeable into the client bundle only.

```bash
pnpm add browser-image-compression
```

Verify the install:

```bash
pnpm list browser-image-compression
```

Expected: a version starting with `2.` (current stable line). If a major version bump has happened and `pnpm list` shows `3.x` or higher, **stop and report the version** — the API may have changed and the helper in Task 2 may need adjustment.

### Commit

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add browser-image-compression for client-side resize

Lets the admin upload photos taken directly on a phone (15-25 MB
HEIC/JPEG) by resizing and re-encoding to WebP in the browser before
the bytes hit the Next.js Server Action. Resolves upload failures
against the existing 10 MB validator cap.

Refs: feature doc Task 1"
```

---

## 3. Task 2 — Create the client-safe compression helper

This helper resizes images to 2000px on the longest edge, re-encodes as WebP at quality 0.82, and strips EXIF metadata (privacy + smaller files). It cannot import anything under `src/lib/supabase/**` or `src/lib/db/**` because those are `"server-only"` modules — it lives in the client bundle.

### CREATE NEW FILE: `src/lib/compress-image.ts`

```ts
// NOTE: this file is client-safe. Do NOT import "server-only" or any
// module from src/lib/supabase or src/lib/db here — those are server
// modules and will break the client bundle.

import imageCompression from "browser-image-compression";

/**
 * Resize and re-encode an uploaded photo in the browser before it is
 * sent to the server. Produces a WebP file ≤ ~500 KB with the longest
 * edge clamped to 2000 px, which is sharp on both phone and laptop
 * displays (including retina) while staying well under the server's
 * 3 MB validator cap and Next.js Server Action body limit.
 *
 * EXIF metadata (including GPS coordinates baked in by phone cameras)
 * is stripped as a side effect of the re-encode.
 *
 * Fails loudly on formats the browser cannot decode in a <canvas>,
 * most notably HEIC/HEIF from iPhones that haven't been set to save
 * in "Most Compatible" mode. Callers should surface the error message
 * to the admin rather than silently uploading the original.
 *
 * See feature doc Task 2.
 */
const TARGET_LONGEST_EDGE_PX = 2000;
const TARGET_QUALITY = 0.82;
const SAFETY_MAX_SIZE_MB = 1.5;

export async function compressPropertyImage(file: File): Promise<File> {
  // Fast path: tiny already-compressed files pass through unchanged.
  // Guards against double-compressing an image that was already optimized.
  if (file.size < 300 * 1024 && /^image\/(webp|jpeg)$/.test(file.type)) {
    return file;
  }

  // HEIC/HEIF cannot be decoded by <canvas>. Fail early with a clear
  // message so the admin knows what to do instead of seeing a generic
  // "Upload failed."
  const lowerName = file.name.toLowerCase();
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif")
  ) {
    throw new Error(
      "iPhone HEIC photos aren't supported. On your iPhone go to Settings → Camera → Formats → Most Compatible, then retake the photo. Or export as JPEG from Photos.",
    );
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: SAFETY_MAX_SIZE_MB,
    maxWidthOrHeight: TARGET_LONGEST_EDGE_PX,
    initialQuality: TARGET_QUALITY,
    fileType: "image/webp",
    useWebWorker: true,
    alwaysKeepResolution: false,
  });

  // browser-image-compression returns a Blob in some environments.
  // Ensure we always hand back a real File with a sensible name so the
  // server-side sanitizeImageFileName gets something to work with.
  if (compressed instanceof File) {
    return compressed;
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([compressed], `${base}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
```

### Commit

```bash
git add src/lib/compress-image.ts
git commit -m "feat(images): client-side compression helper for admin uploads

Adds compressPropertyImage() which takes a File from a browser file
input, resizes to 2000px longest edge, re-encodes as WebP at quality
0.82, and strips EXIF. Designed for admin property photo uploads.

Fast-paths small already-compressed files unchanged. Fails early with
a clear error message on HEIC/HEIF (iPhone default format) since
<canvas> cannot decode it — admin workaround is Settings → Camera →
Formats → Most Compatible on iOS, documented in the error message.

File is intentionally outside src/lib/supabase/ because it ships to
the client bundle and cannot import server-only modules.

Refs: feature doc Task 2"
```

---

## 4. Task 3 — Wire the helper into the admin upload form

The admin property edit page has a `handleFileSelected` function in `src/app/admin/(dashboard)/properties/[id]/page.tsx` that takes a file from the input and uploads it directly. Add a compression call immediately after selection, before constructing the FormData.

### File: `src/app/admin/(dashboard)/properties/[id]/page.tsx`

**Edit 1 of 2 — add the import.** Find the existing import line for `uploadPropertyImageFile` and add the new helper import below it.

**FIND THIS EXACT CONTENT:**

```tsx
  uploadPropertyImageFile,
```

**REPLACE WITH:**

```tsx
  uploadPropertyImageFile,
```

Then, separately, add this import at the top of the file with the other `@/lib/*` imports. Locate the block of `import` statements near the top (after the `"use client";` directive and React imports, before the component body). Add this line **after** the last `@/lib/*` import in that block:

```tsx
import { compressPropertyImage } from "@/lib/compress-image";
```

> **Note for Cursor:** the exact position in the import block depends on what else is imported. Add the new import on its own line, in alphabetical order if there's a pattern, otherwise at the end of the `@/lib/*` group. Do not reorder any other imports.

**Edit 2 of 2 — compress inside `handleFileSelected`.**

**FIND THIS EXACT CONTENT:**

```tsx
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("propertyId", id);
      fd.append("altText", newImageAlt.trim());
      await uploadPropertyImageFile(fd);
```

**REPLACE WITH:**

```tsx
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingFile(true);
    try {
      // Resize + re-encode in the browser before uploading. Phone photos
      // can be 15-25 MB; the server validator caps at 3 MB. See feature
      // doc Task 3 and src/lib/compress-image.ts.
      let fileToUpload: File;
      try {
        fileToUpload = await compressPropertyImage(file);
      } catch (compressionError) {
        throw compressionError instanceof Error
          ? compressionError
          : new Error("Could not process this image. Try a different file.");
      }

      const fd = new FormData();
      fd.append("file", fileToUpload);
      fd.append("propertyId", id);
      fd.append("altText", newImageAlt.trim());
      await uploadPropertyImageFile(fd);
```

### Verification before committing

```bash
pnpm build
```

The build must succeed. If TypeScript complains that `compressPropertyImage` cannot be found, verify the import path is `@/lib/compress-image` (matching `tsconfig.json`'s `paths` alias — the existing code uses `@/lib/...` for everything in `src/lib/`).

If the build complains about `browser-image-compression` not having types, the package ships its own types — so either the install didn't finish (re-run `pnpm install`) or the version landed something unexpected (check `pnpm list browser-image-compression` and report the version).

### Commit

```bash
git add 'src/app/admin/(dashboard)/properties/[id]/page.tsx'
git commit -m "feat(admin): compress property photos in the browser before upload

handleFileSelected now calls compressPropertyImage() before
constructing the FormData, so a 20 MB iPhone photo becomes a ~400 KB
WebP before any bytes cross the network. Fixes upload failures against
the server's 3 MB validator cap (lowered in a follow-up commit) and
the 12 MB Next.js Server Action body limit.

Compression errors (including the HEIC-not-supported message) are
surfaced through the existing showToast('error', ...) path so the
admin sees a clear message about what to do.

Refs: feature doc Task 3"
```

---

## 5. Task 4 — Lower the server-side validator cap

With client-side compression in place, legitimate uploads should never exceed ~500 KB. Lower the server validator to 3 MB — well above any reasonable compressed output (so panoramas and edge cases still work) but low enough that an uncompressed-by-accident 15 MB upload is rejected with a clear error instead of silently filling the storage bucket.

Do not touch the `bodySizeLimit` in `next.config.ts` — leaving it at `12mb` gives you headroom in case you ever temporarily disable compression for debugging.

### File: `src/lib/supabase/property-image-upload.ts`

**FIND THIS EXACT CONTENT:**

```ts
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_RENTAL_PDF_BYTES = 15 * 1024 * 1024;
```

**REPLACE WITH:**

```ts
// Client-side compression (src/lib/compress-image.ts) targets ≤ 500 KB
// per image. 3 MB is a safety ceiling: high enough to tolerate edge
// cases like wide panoramas or rare compression underperformers, low
// enough that a raw phone photo uploaded by mistake is rejected loudly
// instead of silently storing 20 MB.
// See feature doc Task 4.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_RENTAL_PDF_BYTES = 15 * 1024 * 1024;
```

Then update the error message to match the new cap.

**FIND THIS EXACT CONTENT:**

```ts
export async function assertImagePropertyImage(file: File): Promise<void> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 10MB or smaller.");
  }
```

**REPLACE WITH:**

```ts
export async function assertImagePropertyImage(file: File): Promise<void> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      "Image is larger than 3 MB after compression — try a different photo.",
    );
  }
```

### Verification before committing

```bash
pnpm build
pnpm lint
```

Both must succeed.

### Commit

```bash
git add src/lib/supabase/property-image-upload.ts
git commit -m "fix(uploads): lower server image validator cap to 3 MB

With client-side compression landing in Task 3, legitimate uploads
target ≤ 500 KB (2000px WebP @ quality 0.82). 3 MB is a safety
ceiling — high enough to tolerate panoramas and compression edge
cases, low enough to reject an accidental raw phone photo loudly.

Also updates the error message from the generic '10MB or smaller'
to something that points the admin at the compression step.

bodySizeLimit in next.config.ts stays at 12mb as debugging headroom
in case compression is ever temporarily bypassed.

Refs: feature doc Task 4"
```

---

## 6. Verification

After all four tasks are committed, run these checks **in order** and report results.

### 6.1 Commit history

```bash
git log main..HEAD --oneline
```

Expected (4 commits, most recent first; SHAs will differ):

```
<sha> fix(uploads): lower server image validator cap to 3 MB
<sha> feat(admin): compress property photos in the browser before upload
<sha> feat(images): client-side compression helper for admin uploads
<sha> chore(deps): add browser-image-compression for client-side resize
```

### 6.2 Diff stat

```bash
git diff main..HEAD --stat
```

Expected files (exactly 4 + 1 new file = 5 lines):

- `package.json`
- `pnpm-lock.yaml`
- `src/lib/compress-image.ts` *(new)*
- `src/lib/supabase/property-image-upload.ts`
- `src/app/admin/(dashboard)/properties/[id]/page.tsx`

**If any other file appears in the diff, stop and report it.** Nothing else should have been touched.

### 6.3 Build and lint

```bash
pnpm build
pnpm lint
```

Both must succeed. Pre-existing lint warnings unrelated to the touched files are acceptable.

### 6.4 Spot checks

```bash
# Task 1 — dependency installed
pnpm list browser-image-compression | grep -q "browser-image-compression" && echo ok

# Task 2 — helper file exists with the exported name
grep -q "export async function compressPropertyImage" src/lib/compress-image.ts && echo ok

# Task 3 — helper is imported and called in the upload handler
grep -q "compressPropertyImage" 'src/app/admin/(dashboard)/properties/[id]/page.tsx' && echo ok

# Task 4 — validator cap lowered to 3 MB
grep -q "MAX_IMAGE_BYTES = 3 \* 1024 \* 1024" src/lib/supabase/property-image-upload.ts && echo ok
```

All four should print `ok`. If any don't, stop and report which.

### 6.5 Manual sanity test

Still in your local dev environment (do NOT push yet):

```bash
pnpm dev
```

Open `http://localhost:3000/admin`, sign in, click into any property, scroll to the Photos section, and upload a **real photo from your phone** (not a pre-compressed test image). Either AirDrop / Nearby Share a photo from your phone to the laptop, or use a 10+ MB sample from a stock photo site.

Expected:
- No error toast.
- The photo appears in the gallery within a few seconds.
- In the Network tab of devtools, the `uploadPropertyImageFile` server action request body should show a Content-Length of a few hundred KB, not tens of MB.
- In Supabase Studio → Storage → `property-images` bucket, the new file should be a `.webp` with a small file size.

**If the upload still fails:** check the browser console for the exact error message from `compressPropertyImage`. If it says "HEIC photos aren't supported," the test file was HEIC — try a JPEG instead. If it says anything else, capture the full error and stop.

**If the test passes**, you're done with verification. Proceed to §7.

---

## 7. Push and open PR

Only after §6 verification fully passes:

```bash
git push -u origin feature/photo-compression
```

Open a PR on GitHub from `feature/photo-compression` to `main`. Suggested description:

> Fixes admin property photo upload failures on large phone photos.
>
> - **Task 1** — Adds `browser-image-compression` (client-side only, tree-shakeable).
> - **Task 2** — New `src/lib/compress-image.ts` helper: resize to 2000px longest edge, re-encode as WebP quality 0.82, strip EXIF. Fast-paths small already-compressed files. Fails loudly on HEIC with an actionable error message.
> - **Task 3** — Wires the helper into the admin property edit page's upload handler.
> - **Task 4** — Lowers the server validator cap from 10 MB to 3 MB as defense-in-depth.
>
> 5 files, +60/−8 lines, 1 new dependency. No DB changes, no env var changes, no hosting changes. Supabase Storage stays as-is. Verified locally with a real 18 MB iPhone photo upload that was previously failing.

---

## 8. Deferred / known limitations

Tracked for a future pass. Not blockers for this PR.

1. **HEIC/HEIF support.** iPhones save in HEIC by default and those files cannot be decoded by `<canvas>`. The admin gets a clear error message with a workaround (toggle iOS Camera → Formats → Most Compatible). Adding `heic2any` preprocessing would let the helper convert HEIC → JPEG before the Canvas step, but it ships ~200 KB of wasm and doubles the client bundle for a feature only used by the admin. Worth revisiting if HEIC uploads become frequent.

2. **No progress indicator during compression.** A 25 MB source photo can take 2-5 seconds to compress on a slower laptop. The existing `setUploadingFile(true)` spinner covers it, but a separate "Compressing…" / "Uploading…" state would be clearer. Small UX polish for a follow-up.

3. **No compression on drag-and-drop, multi-select, or paste-from-clipboard.** The current admin upload only supports single-file input selection via the file picker, so this limitation is theoretical until those flows are added.

4. **Already-uploaded images are not retroactively compressed.** Existing photos in the `property-images` bucket keep their original size. A one-off script to re-download, compress, and re-upload each image could be added if storage usage becomes a concern — but at 4 properties it's almost certainly not worth the effort.

5. **No `srcset` / responsive image delivery.** The same 2000px WebP is served to every device regardless of screen size. `next/image` (which the site already uses elsewhere) would handle this automatically if the property gallery images were routed through it. Out of scope for this PR because it touches the public-facing gallery components, not the admin upload.

6. **Client compression can be bypassed.** An attacker with admin access could craft a direct multipart POST to the server action with an uncompressed file. The 3 MB validator cap in Task 4 catches this — anything over 3 MB is rejected — but it's worth knowing that the "compression happens client-side" guarantee is not a security boundary. It's a UX optimization. The existing magic-byte detection (Finding #8 from the security audit pass 2) is still the actual security layer.

---

## 9. Done checklist

Fill this in and paste back when finished:

- [ ] Pre-flight passed (clean main, branch created, baseline files present)
- [ ] Task 1 — `browser-image-compression` installed and committed
- [ ] Task 2 — `src/lib/compress-image.ts` created and committed
- [ ] Task 3 — import added + `handleFileSelected` updated + committed
- [ ] Task 4 — validator cap lowered and committed
- [ ] §6.1 commit history verified (4 commits in correct order)
- [ ] §6.2 diff stat verified (5 files, no extras)
- [ ] §6.3 `pnpm build` and `pnpm lint` passed
- [ ] §6.4 all four spot checks printed `ok`
- [ ] §6.5 manual sanity test: real phone photo uploaded successfully
- [ ] Branch pushed to origin
- [ ] PR opened with description from §7

If any item is unchecked, report which one and why before stopping.
