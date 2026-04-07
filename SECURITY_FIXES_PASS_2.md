# Security Fixes — Pass 2 (High, Medium, Low)

> **Instructions for Cursor:** This document defines the second batch of security fixes for `str-cursor`, covering all remaining findings from the audit that were not addressed in Pass 1. Execute the tasks **in order**, exactly as specified. Do not add scope, refactor surrounding code, or "improve" naming. Each task includes the exact `OLD CODE` to find and the exact `NEW CODE` to replace it with. If a `FIND` block does not match a file exactly, **stop and report the mismatch** — do not improvise.

## 0. Goal and scope

Apply the remaining audit findings, grouped by severity:

| # | Severity | Finding | Type |
|---|---|---|---|
| 11 | 🟢 LOW | Update `drizzle-kit` to remove transitive `esbuild` advisory | Dependency |
| 3 | 🟠 HIGH | Add Zod schema validation to public POST routes | Code |
| 7 | 🟡 MEDIUM | Open-redirect via unvalidated `next` parameter in OAuth callback | Code |
| 8 | 🟡 MEDIUM | File upload accepts client-declared MIME type; SVG enables stored XSS | Code |
| 4 | 🟠 HIGH | No rate limiting on public endpoints | Code + new dep |
| 9 | 🟡 MEDIUM | Email-as-identity-key on guest dashboard | Manual + deferred |
| 12 | ⚠️ PARTIAL | RLS on core tables not verified from repo | Manual |
| 10 | ℹ️ INFO | Drizzle bypasses RLS by design | Architectural note |

**Total code changes:** 5 tasks, approximately 9 file edits, 1 new file, 2 new dependencies. Plus 2 manual steps the human must perform in dashboards.

**Prerequisite:** Pass 1 (`SECURITY_FIXES_PASS_1.md`) must already be merged to `main`. Verify with:

```bash
git log --oneline main | head -5
```

You should see the four Pass 1 commits at the top of `main`. If you do not, stop and tell the user that Pass 1 must be merged first.

**Out of scope for Pass 2 — do NOT touch:**

- The proper Finding #9 fix (migrating booking ownership from email-match to `user_id`). This requires a database migration and is tracked for a dedicated future pass. Pass 2 only handles the 5-minute Supabase setting that mitigates it.
- Any of the items listed in §0 of `SECURITY_FIXES_PASS_1.md` that are already done.
- Refactoring the Drizzle/Supabase dual-data-path architecture (Finding #10).
- Any "while I'm here" cleanups, formatting changes, import reordering, or unrelated refactors.

---

## 1. Pre-flight

```bash
git status
git checkout main
git pull origin main
git checkout -b security/fixes-pass-2
```

`git status` must report `nothing to commit, working tree clean`. Confirm Pass 1 is on `main`:

```bash
git log main --oneline | grep -E "(enforce admin role|remove PII from public session|timing-safe comparison|never echo internal error)" | wc -l
```

Expected output: `4`. If it's lower, Pass 1 isn't fully merged — stop.

---

## 2. Task 1 — Update `drizzle-kit` to clear esbuild advisory (Finding #11, LOW)

### Background

`pnpm audit` reports one moderate-severity advisory: [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — esbuild's dev server allows any website to read the bundle output. It enters via `drizzle-kit > @esbuild-kit/esm-loader > @esbuild-kit/core-utils > esbuild@0.18.20`. It is a dev-only dependency and never runs in production, so severity is LOW. The fix is trivial.

### Steps

```bash
pnpm update drizzle-kit
pnpm audit --json | grep -E '"high":|"critical":|"moderate":' | head -5
```

If `pnpm update drizzle-kit` does not eliminate the advisory (because the latest `drizzle-kit` still pulls the old `@esbuild-kit` chain), add an override to `package.json`. **FIND THIS EXACT CONTENT** in `package.json`:

```json
  "devDependencies": {
```

**REPLACE WITH:**

```json
  "pnpm": {
    "overrides": {
      "esbuild@<0.25.0": "^0.25.0"
    }
  },
  "devDependencies": {
```

Then run:

```bash
pnpm install
pnpm audit
```

The "moderate" count should be `0`. If a different unrelated moderate advisory has appeared since this document was written, do NOT try to fix it — that's out of scope for this task. Report the new advisory and continue.

### Commit

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): update drizzle-kit to clear esbuild advisory

GHSA-67mh-4wv8-2f99 entered transitively via drizzle-kit's esbuild-kit
dependency chain. esbuild's dev server set Access-Control-Allow-Origin: *
which let any website read the bundle output. Dev-only, never runs in
production, but a one-line fix.

Refs: security audit Finding #11"
```

---

## 3. Task 2 — Zod schema validation on public POST routes (Finding #3, HIGH)

### Background

Two public POST routes parse JSON bodies with bare TypeScript casts (`as Foo`) and no runtime validation. This means malformed payloads, oversize strings, non-date date fields, and log-forging characters all reach business logic, Stripe metadata, and Resend emails unchecked. Zod is already installed (`zod@^4.3.6`); we just need to use it.

This task touches **two files**: `/api/contact` and `/api/stripe/checkout-session`. The PriceLabs route is intentionally schema-flexible and is left as-is.

### File 2a: `src/app/api/contact/route.ts`

**FIND THIS EXACT CONTENT:**

```ts
import { NextResponse } from "next/server";
import { isResendConfigured, sendEmail } from "@/lib/email";
import { ContactFormEmail } from "@/lib/email/templates/contact-form";
import { CONTACT_FORM_INBOX_EMAIL } from "@/lib/site-contact";

const isDev = process.env.NODE_ENV === "development";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body as {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 },
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }
```

**REPLACE WITH:**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { isResendConfigured, sendEmail } from "@/lib/email";
import { ContactFormEmail } from "@/lib/email/templates/contact-form";
import { CONTACT_FORM_INBOX_EMAIL } from "@/lib/site-contact";

const isDev = process.env.NODE_ENV === "development";

// Security: server-side schema validation. Frontend validation is UX, not
// security — every input must be re-checked here. Limits prevent log forging
// (\n stripped via .trim()), oversize bodies, and malformed emails reaching
// Resend. See security audit Finding #3 (CWE-20).
const ContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1).max(5000),
});

export async function POST(request: Request) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const parsed = ContactSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the form fields and try again." },
        { status: 400 },
      );
    }
    const { name, email, phone, message } = parsed.data;
```

### File 2b: `src/app/api/stripe/checkout-session/route.ts`

**FIND THIS EXACT CONTENT:**

```ts
import { NextRequest, NextResponse } from "next/server";

import { propertiesData } from "@/data/properties";
import { getStripe } from "@/lib/stripe";
import { isStayAvailable } from "@/lib/availability";
import { computeStayAccommodationSubtotal } from "@/lib/pricing/stay-quote";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface CheckoutPayload {
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  specialRequests?: string;
  arrivalTime?: string;
  /** Required when the property has a rental agreement PDF. */
  contractAccepted?: boolean;
}

function toCurrencyAmount(value: number) {
  return Math.round(value * 100);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutPayload;
    const property = propertiesData.find((item) => item.slug === body.slug);

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    if (!body.numGuests || body.numGuests < 1 || body.numGuests > property.maxGuests) {
      return NextResponse.json(
        { error: `Guest count must be between 1 and ${property.maxGuests}.` },
        { status: 400 }
      );
    }
```

**REPLACE WITH:**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { propertiesData } from "@/data/properties";
import { getStripe } from "@/lib/stripe";
import { isStayAvailable } from "@/lib/availability";
import { computeStayAccommodationSubtotal } from "@/lib/pricing/stay-quote";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Security: server-side schema validation. Caps every string so attacker
// payloads cannot reach Stripe metadata (which has a 500-char per-value
// limit), Resend templates, or the database. Date format is enforced as
// yyyy-MM-dd so downstream new Date() math cannot produce nonsense.
// See security audit Finding #3 (CWE-20).
const CheckoutSchema = z.object({
  slug: z.string().min(1).max(200),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(30),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkIn must be yyyy-MM-dd"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkOut must be yyyy-MM-dd"),
  numGuests: z.number().int().min(1).max(50),
  specialRequests: z.string().trim().max(1000).optional(),
  arrivalTime: z.string().trim().max(20).optional(),
  contractAccepted: z.boolean().optional(),
});

type CheckoutPayload = z.infer<typeof CheckoutSchema>;

function toCurrencyAmount(value: number) {
  return Math.round(value * 100);
}

export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const parsed = CheckoutSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the booking details and try again." },
        { status: 400 },
      );
    }
    const body: CheckoutPayload = parsed.data;
    const property = propertiesData.find((item) => item.slug === body.slug);

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    if (body.numGuests < 1 || body.numGuests > property.maxGuests) {
      return NextResponse.json(
        { error: `Guest count must be between 1 and ${property.maxGuests}.` },
        { status: 400 }
      );
    }
```

### Verification before committing

```bash
pnpm build
```

Build must succeed. The `CheckoutPayload` type is now derived from the Zod schema via `z.infer<...>`, so any downstream usage that previously relied on the interface must still typecheck (the field shapes are identical, so it should).

### Commit

```bash
git add src/app/api/contact/route.ts src/app/api/stripe/checkout-session/route.ts
git commit -m "fix(api): zod schema validation on public POST routes

The /api/contact and /api/stripe/checkout-session endpoints parsed
JSON bodies with bare TypeScript casts and no runtime validation.
This let malformed payloads, oversize strings, log-forging newlines,
and non-date date fields reach Stripe metadata, Resend emails, and
database math unchecked.

Both routes now validate with Zod (already a dependency), reject
unparseable bodies with 400, and never expose validation error details
to the client (just a generic message — see Finding #6 pattern from
Pass 1).

The PriceLabs route is intentionally schema-flexible (supports
multiple inbound shapes via parseRatesFromUnknownPayload) and is
auth-gated, so it's left as-is.

Refs: security audit Finding #3
CWE-20 (Improper Input Validation)"
```

---

## 4. Task 3 — Fix open redirect in OAuth callback (Finding #7, MEDIUM)

### Background

`src/app/auth/callback/route.ts` reads `next` from the query string and redirects to `${origin}${next}`. Concatenation alone is not safe: an attacker can craft `next=@evil.com`, making the redirect URL `https://feathershouses.com@evil.com` — which the browser parses as userinfo `feathershouses.com` on host `evil.com`. Result: phishing attack against your real domain.

The fix is a small helper that allows only same-origin paths starting with exactly one `/` and rejects anything containing `@`, `:`, `\`, or whitespace.

This task touches **two files**: a new helper file and the callback route.

### File 3a: Create `src/lib/safe-redirect.ts`

This file does not exist yet. **CREATE IT** with this exact content:

```ts
import "server-only";

/**
 * Returns the input only if it is a safe same-origin path. Otherwise returns
 * the fallback. Used to sanitize `next` / `redirect` query parameters that
 * become Location headers, to prevent open-redirect phishing attacks.
 *
 * Safe means:
 *   - starts with exactly one "/"
 *   - does not start with "//" (protocol-relative) or "/\\" (Windows-style)
 *   - contains no "@" (userinfo), ":" (scheme), backslash, or whitespace
 *
 * See security audit Finding #7 (CWE-601).
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!raw) return fallback;
  if (typeof raw !== "string") return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[@:\s\\]/.test(raw)) return fallback;
  return raw;
}
```

### File 3b: `src/app/auth/callback/route.ts`

**FIND THIS EXACT CONTENT:**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
```

**REPLACE WITH:**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Security: sanitize the `next` query param so an attacker cannot craft
  // ?next=@evil.com to phish via the OAuth callback.
  // See security audit Finding #7 (CWE-601).
  const next = safeInternalPath(searchParams.get("next"), "/dashboard");
```

### Verification before committing

```bash
grep -rn "searchParams.get(\"next\")" src/app/auth
```

Expected: zero matches in `src/app/auth/callback/route.ts` outside the line we just replaced (which now wraps it in `safeInternalPath`). If there are other unsanitized usages, leave them alone — they're tracked for a follow-up pass.

### Commit

```bash
git add src/lib/safe-redirect.ts src/app/auth/callback/route.ts
git commit -m "fix(auth): sanitize next param to close OAuth open redirect

The OAuth callback at /auth/callback read \`next\` from the query string
and concatenated it onto \${origin}, with no validation. An attacker
could craft ?next=@evil.com so the redirect URL became
https://feathershouses.com@evil.com — which the browser parses as
userinfo on host evil.com, enabling phishing under the real domain.

Added a safeInternalPath helper that requires exactly one leading
slash and rejects @, :, backslash, and whitespace. Used in the OAuth
callback. Other call sites (login form, register form) pass the value
through to this callback, so sanitizing here closes the actual hole.

Refs: security audit Finding #7
CWE-601 (URL Redirection to Untrusted Site)"
```

---

## 5. Task 4 — Magic-byte file upload validation (Finding #8, MEDIUM)

### Background

`assertImagePropertyImage` and `assertRentalAgreementPdf` in `src/lib/supabase/property-image-upload.ts` trust the client-declared `file.type` MIME header and (for PDFs) the file extension. Both are attacker-controlled in raw multipart requests. More importantly, the current image check accepts `image/svg+xml` because it starts with `image/`, and SVG files in a public Supabase bucket can contain `<script>` tags that execute as stored XSS on the storage domain.

Fix: read the first bytes of each file and verify against known magic-byte signatures. Explicitly disallow SVG. Make the assertion functions `async` and update their callers to `await` them.

This task touches **two files**: the helper module and the admin actions module.

### File 4a: `src/lib/supabase/property-image-upload.ts`

**FIND THIS EXACT CONTENT:**

```ts
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_RENTAL_PDF_BYTES = 15 * 1024 * 1024;

export function sanitizeImageFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "image.jpg";
}

export function buildPropertyImageStoragePath(
  propertyId: string,
  fileName: string
): string {
  return `${propertyId}/${newUuid()}-${sanitizeImageFileName(fileName)}`;
}

export function assertImagePropertyImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPEG, PNG, WebP, etc.).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 10MB or smaller.");
  }
}

export function assertRentalAgreementPdf(file: File) {
  const okType =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!okType) {
    throw new Error("Please upload a PDF file.");
  }
  if (file.size > MAX_RENTAL_PDF_BYTES) {
    throw new Error("PDF must be 15MB or smaller.");
  }
}
```

**REPLACE WITH:**

```ts
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_RENTAL_PDF_BYTES = 15 * 1024 * 1024;

export function sanitizeImageFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "image.jpg";
}

export function buildPropertyImageStoragePath(
  propertyId: string,
  fileName: string
): string {
  return `${propertyId}/${newUuid()}-${sanitizeImageFileName(fileName)}`;
}

/**
 * Verify file content against known magic bytes. Returns the detected
 * MIME type, or null if the format is not on the allow-list.
 *
 * Security: this is what blocks SVG (which would otherwise pass a
 * "starts with image/" check and execute scripts when served from the
 * public bucket). See security audit Finding #8 (CWE-434, CWE-79).
 */
async function detectAllowedImageType(file: File): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  // JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47 &&
    header[4] === 0x0d && header[5] === 0x0a && header[6] === 0x1a && header[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF87a / GIF89a: 47 49 46 38 (37|39) 61
  if (
    header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38 &&
    (header[4] === 0x37 || header[4] === 0x39) && header[5] === 0x61
  ) {
    return "image/gif";
  }
  // WebP: RIFF....WEBP (52 49 46 46 .. .. .. .. 57 45 42 50)
  if (
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function assertImagePropertyImage(file: File): Promise<void> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 10MB or smaller.");
  }
  const detected = await detectAllowedImageType(file);
  if (!detected) {
    throw new Error(
      "Please choose a JPEG, PNG, WebP, or GIF image. SVG and other formats are not supported.",
    );
  }
}

export async function assertRentalAgreementPdf(file: File): Promise<void> {
  if (file.size > MAX_RENTAL_PDF_BYTES) {
    throw new Error("PDF must be 15MB or smaller.");
  }
  // PDF magic bytes: %PDF- = 25 50 44 46 2D
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf =
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d;
  if (!isPdf) {
    throw new Error("File does not appear to be a valid PDF.");
  }
}
```

### File 4b: `src/app/admin/actions.ts`

The two assertion functions are now `async`. Both call sites must `await` them.

**Edit 1 of 2 — FIND THIS EXACT CONTENT:**

```ts
  assertImagePropertyImage(file);

  const altText =
```

**REPLACE WITH:**

```ts
  await assertImagePropertyImage(file);

  const altText =
```

**Edit 2 of 2 — FIND THIS EXACT CONTENT:**

```ts
  assertRentalAgreementPdf(file);

  const supabase = await createClient();
```

**REPLACE WITH:**

```ts
  await assertRentalAgreementPdf(file);

  const supabase = await createClient();
```

### Verification before committing

```bash
# Both call sites should now have `await`
grep -n "assertImagePropertyImage\|assertRentalAgreementPdf" src/app/admin/actions.ts
```

Expected: 2 lines, both prefixed with `await`. If either is missing `await`, the build will fail because the assertion now returns a Promise.

```bash
pnpm build
```

Build must succeed.

### Commit

```bash
git add src/lib/supabase/property-image-upload.ts src/app/admin/actions.ts
git commit -m "fix(uploads): verify file magic bytes; block SVG and other formats

assertImagePropertyImage trusted file.type which is attacker-controlled
in raw multipart requests, and accepted image/svg+xml because it
starts with 'image/'. SVG files in the public property-images bucket
can contain <script> tags that execute as stored XSS on the storage
domain.

Now both assert helpers read the first bytes and check against known
magic-byte signatures (JPEG, PNG, GIF, WebP for images; %PDF- for
PDFs). SVG, BMP, TIFF, and anything else is rejected with a clear
error. Both functions are now async; updated the two call sites in
admin/actions.ts.

Gated behind requireAdmin() so practical exploitation needs a
compromised admin session, but layered defense matters precisely
because that's the scenario where it pays off.

Refs: security audit Finding #8
CWE-434 (Unrestricted Upload of File with Dangerous Type)
CWE-79 (Improper Neutralization of Input During Web Page Generation)"
```

---

## 6. Task 5 — Upstash rate limiting on public endpoints (Finding #4, HIGH)

### Background

Three public endpoints have no rate limiting and can be abused for cost or denial-of-service: `/api/contact` (Resend quota burn), `/api/stripe/checkout-session` (Stripe session spam), and `/api/properties/[slug]/quote` (cheap DoS). This task adds Upstash-backed sliding-window rate limiting to the first two; the quote endpoint is left for a follow-up because its abuse cost is low.

The helper is designed to **gracefully no-op when Upstash environment variables are missing**, so:

- Local development without Upstash credentials still works.
- CI builds pass without needing secrets injected.
- The user can deploy this code immediately and turn on rate limiting later by adding env vars.

The user must complete the manual setup in §6.4 for rate limiting to actually take effect in production.

### Step 1: Install dependencies

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

### Step 2: Create `src/lib/ratelimit.ts`

This file does not exist yet. **CREATE IT** with this exact content:

```ts
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Upstash-backed rate limiting for public endpoints.
 *
 * Gracefully degrades to a no-op if UPSTASH_REDIS_REST_URL or
 * UPSTASH_REDIS_REST_TOKEN are not set, so local dev and CI work
 * without Upstash credentials. In production a warning is logged
 * once per cold start when the credentials are missing.
 *
 * See security audit Finding #4 (CWE-770).
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

function makeLimiter(
  tokens: number,
  window: `${number} ${"s" | "m" | "h"}`,
): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: false,
    prefix: "str-cursor",
  });
}

/** 5 contact form submissions per IP per 10 minutes. */
export const contactLimiter = makeLimiter(5, "10 m");

/** 10 Stripe checkout sessions per IP per hour. */
export const checkoutLimiter = makeLimiter(10, "1 h");

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

let warnedMissing = false;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

export async function assertWithinLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<RateLimitResult> {
  if (!limiter) {
    if (!warnedMissing && process.env.NODE_ENV === "production") {
      warnedMissing = true;
      console.warn(
        "[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set; rate limiting is disabled.",
      );
    }
    return { ok: true };
  }
  const result = await limiter.limit(key);
  if (result.success) return { ok: true };
  return {
    ok: false,
    retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}
```

### Step 3: Wire `/api/contact` to the contact limiter

**FIND THIS EXACT CONTENT** in `src/app/api/contact/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { isResendConfigured, sendEmail } from "@/lib/email";
import { ContactFormEmail } from "@/lib/email/templates/contact-form";
import { CONTACT_FORM_INBOX_EMAIL } from "@/lib/site-contact";
```

**REPLACE WITH:**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { isResendConfigured, sendEmail } from "@/lib/email";
import { ContactFormEmail } from "@/lib/email/templates/contact-form";
import { CONTACT_FORM_INBOX_EMAIL } from "@/lib/site-contact";
import {
  assertWithinLimit,
  clientIpFromHeaders,
  contactLimiter,
} from "@/lib/ratelimit";
```

Then **FIND THIS EXACT CONTENT** (in the POST handler, immediately inside the outer `try {`):

```ts
export async function POST(request: Request) {
  try {
    let rawBody: unknown;
```

**REPLACE WITH:**

```ts
export async function POST(request: Request) {
  try {
    // Security: rate limit by client IP to stop attackers from emptying
    // your Resend quota and getting your domain flagged for spam.
    // See security audit Finding #4 (CWE-770).
    const ip = clientIpFromHeaders(request.headers);
    const limit = await assertWithinLimit(contactLimiter, `contact:${ip}`);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a few minutes." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfter) },
        },
      );
    }

    let rawBody: unknown;
```

### Step 4: Wire `/api/stripe/checkout-session` to the checkout limiter

**FIND THIS EXACT CONTENT** in `src/app/api/stripe/checkout-session/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { propertiesData } from "@/data/properties";
import { getStripe } from "@/lib/stripe";
import { isStayAvailable } from "@/lib/availability";
import { computeStayAccommodationSubtotal } from "@/lib/pricing/stay-quote";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
```

**REPLACE WITH:**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { propertiesData } from "@/data/properties";
import { getStripe } from "@/lib/stripe";
import { isStayAvailable } from "@/lib/availability";
import { computeStayAccommodationSubtotal } from "@/lib/pricing/stay-quote";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  assertWithinLimit,
  checkoutLimiter,
  clientIpFromHeaders,
} from "@/lib/ratelimit";
```

Then **FIND THIS EXACT CONTENT**:

```ts
export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown;
```

**REPLACE WITH:**

```ts
export async function POST(request: NextRequest) {
  try {
    // Security: rate limit Stripe Checkout Session creation. Each call
    // creates a real session in Stripe; mass creation triggers Stripe's
    // own rate limiter (which then affects legitimate customers) and
    // can be used to scrape property data.
    // See security audit Finding #4 (CWE-770).
    const ip = clientIpFromHeaders(request.headers);
    const limit = await assertWithinLimit(checkoutLimiter, `checkout:${ip}`);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many booking attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfter) },
        },
      );
    }

    let rawBody: unknown;
```

### Step 5: Verify the build still works without Upstash credentials

```bash
pnpm build
```

Must succeed even though `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are not set in your local environment. The helper is designed to no-op silently in this case. If the build fails, **stop and report the error**.

### Commit

```bash
git add package.json pnpm-lock.yaml src/lib/ratelimit.ts src/app/api/contact/route.ts src/app/api/stripe/checkout-session/route.ts
git commit -m "feat(api): upstash rate limiting on public endpoints

Three public endpoints had no rate limiting:
  /api/contact            -> empties Resend quota, flags your domain
  /api/stripe/checkout-session -> spams Stripe, scrapes properties
  /api/properties/[slug]/quote -> cheap DoS (left for follow-up)

Added @upstash/ratelimit + @upstash/redis and a thin helper at
src/lib/ratelimit.ts that:
  - reads UPSTASH_REDIS_REST_URL / _TOKEN from env
  - exposes named limiters (contactLimiter 5/10m, checkoutLimiter
    10/1h) and a clientIpFromHeaders helper
  - gracefully no-ops when env vars are missing so local dev and CI
    work without Upstash credentials
  - logs a one-time warning in production if creds are missing

Wired contactLimiter into /api/contact and checkoutLimiter into
/api/stripe/checkout-session. Both return 429 with Retry-After when
the limit is exceeded.

Operator action required: create a free Upstash Redis database, set
UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local and
in Vercel project env. Without these, rate limiting is a no-op.

Refs: security audit Finding #4
CWE-770 (Allocation of Resources Without Limits or Throttling)"
```

---

## 7. Verification

After all five tasks are committed, run these checks **in order** and report results.

### 7.1 Commit history

```bash
git log main..HEAD --oneline
```

Expected output (5 lines, in this order — most recent first; SHAs will differ):

```
<sha> feat(api): upstash rate limiting on public endpoints
<sha> fix(uploads): verify file magic bytes; block SVG and other formats
<sha> fix(auth): sanitize next param to close OAuth open redirect
<sha> fix(api): zod schema validation on public POST routes
<sha> chore(deps): update drizzle-kit to clear esbuild advisory
```

### 7.2 Diff stat

```bash
git diff main..HEAD --stat
```

Expected files touched (no others — if extras appear, **stop and report**):

- `package.json`
- `pnpm-lock.yaml`
- `src/app/admin/actions.ts`
- `src/app/api/contact/route.ts`
- `src/app/api/stripe/checkout-session/route.ts`
- `src/app/auth/callback/route.ts`
- `src/lib/ratelimit.ts` *(new file)*
- `src/lib/safe-redirect.ts` *(new file)*
- `src/lib/supabase/property-image-upload.ts`

### 7.3 Build and lint

```bash
pnpm build
pnpm lint
```

Both must succeed. Pre-existing lint warnings unrelated to the touched files are acceptable. New errors in the touched files are not — report them.

### 7.4 Audit

```bash
pnpm audit --json | grep -E '"high":|"critical":|"moderate":'
```

Expected: all three counts are `0`. If a new advisory has appeared since this document was written (e.g. a CVE in `@upstash/redis`), report it but do not try to fix it as part of this pass.

### 7.5 Spot-check the changes

```bash
# Task 1 — drizzle-kit updated
grep -A2 "pnpm" package.json | grep -q "overrides" && echo "override present" || echo "override absent (ok if pnpm update was sufficient)"

# Task 2 — Zod schemas in both routes
grep -l "ContactSchema\|CheckoutSchema" src/app/api/contact/route.ts src/app/api/stripe/checkout-session/route.ts | wc -l
# Expected: 2

# Task 3 — safe-redirect helper exists and is imported
test -f src/lib/safe-redirect.ts && grep -q "safeInternalPath" src/app/auth/callback/route.ts && echo ok

# Task 4 — magic-byte detection function exists
grep -q "detectAllowedImageType" src/lib/supabase/property-image-upload.ts && echo ok

# Task 4 — both assertion calls are awaited
grep -E "await assert(ImagePropertyImage|RentalAgreementPdf)" src/app/admin/actions.ts | wc -l
# Expected: 2

# Task 5 — ratelimit module exists and is wired into both routes
test -f src/lib/ratelimit.ts && grep -l "assertWithinLimit" src/app/api/contact/route.ts src/app/api/stripe/checkout-session/route.ts | wc -l
# Expected: 2
```

All checks should pass. Report any that don't.

---

## 8. Push and open PR

**Only after §7 verification fully passes**, push and open a PR:

```bash
git push -u origin security/fixes-pass-2
```

Then on GitHub, open a pull request from `security/fixes-pass-2` to `main`. Use this PR description:

> Pass 2 security fixes from audit (high, medium, low).
>
> - **#11 (LOW)** — Update drizzle-kit to clear esbuild GHSA-67mh-4wv8-2f99.
> - **#3 (HIGH)** — Zod validation on `/api/contact` and `/api/stripe/checkout-session`.
> - **#7 (MEDIUM)** — `safeInternalPath` helper closes open redirect in OAuth callback.
> - **#8 (MEDIUM)** — Magic-byte verification on file uploads; SVG explicitly blocked.
> - **#4 (HIGH)** — Upstash rate limiting on contact and checkout endpoints. Gracefully no-ops without Upstash credentials.
>
> 9 files changed, 2 new files, 2 new dependencies. Verified locally with `pnpm build`, `pnpm lint`, and `pnpm audit`.
>
> **Operator action required after merge:**
> 1. Create a free Upstash Redis database and set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel project env (see §9.1 of the task doc).
> 2. Enable Supabase email confirmation (see §9.2).
> 3. Run the RLS verification SQL in Supabase (see §9.3).
>
> Follow-ups not in this PR: rate limiting on `/api/properties/[slug]/quote`; the proper Finding #9 fix (migrating booking ownership from email-match to `user_id`); architectural refactor of the Drizzle/Supabase dual-data-path (Finding #10).

---

## 9. Manual steps the user must perform (no code changes)

These are not in the PR because they happen in dashboards and databases, not in the repo. Cursor cannot do them — the human operator must. **Remind the user of all three** when reporting completion.

### 9.1 Set up Upstash for rate limiting (Finding #4 — required to take effect)

1. Go to https://console.upstash.com/ and create a free account.
2. Create a new Redis database (the free tier is sufficient for low-traffic STR sites). Pick the region closest to your Vercel deployment.
3. From the database details page, copy the **REST URL** and **REST Token**.
4. Add to your local `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://...upstash.io
   UPSTASH_REDIS_REST_TOKEN=...
   ```
5. Add the same two variables to your Vercel project: **Project Settings → Environment Variables** for both Production and Preview.
6. Redeploy. The rate limiter will automatically activate once the env vars are present.

Until you do this, the `pnpm build` will succeed and the site will run normally — but rate limiting is disabled and the warning `[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set` will appear once per cold start in production logs.

### 9.2 Enable email confirmation in Supabase Auth (Finding #9 — partial mitigation)

This is the 5-minute mitigation for the email-as-identity-key issue. Without it, anyone can register with someone else's email and see that guest's bookings on the dashboard.

1. Go to your Supabase project dashboard.
2. **Authentication → Providers → Email**.
3. Toggle on **"Confirm email"**.
4. Save.

The proper fix (migrating booking ownership from email-match to `user_id` on the `guests` table) is deferred to a future pass — it requires a database migration. This dashboard toggle blocks the trivial exploitation path immediately.

### 9.3 Verify RLS on core tables (Finding #12 — audit blind spot)

The repository does not contain RLS policies for `bookings`, `guests`, `availability`, `profiles`, or `property_images` (the table). These were likely applied directly in the Supabase SQL editor and are not committed. Verify them now.

Run this in the Supabase SQL editor:

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
```

Every row should have `rls_enabled = true`. Tables with `rls_enabled = true` AND `policy_count = 0` silently return empty results — that's the AI-generated mistake to watch for. Tables with `rls_enabled = false` are reachable by anyone with the anon key.

Then dump the policies for the audit trail:

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Save the output to `supabase/core-rls.sql` in the repo and commit it on a new branch (separate from this PR) so future audits can see the real state of the database.

### 9.4 Architectural note (Finding #10 — informational)

The codebase has two parallel data paths: the Supabase client (RLS-enforced) and Drizzle / postgres.js via `DATABASE_URL` (RLS-bypassing). Most of the app uses Drizzle. This is a valid architecture, but it means **every Drizzle query in a server action must be preceded by a correct app-level auth check**, because the database will not catch mistakes. Pass 1 Finding #1 was exactly this failure mode.

No code change required. Be aware as the codebase grows: any new server action that imports from `@/lib/db` must call `requireUser()` or `requireAdmin()` first.

---

## 10. Done checklist

When you have finished, report back with this checklist filled in:

- [ ] Pre-flight passed (Pass 1 confirmed on main, branch created)
- [ ] Task 1 — drizzle-kit updated and committed
- [ ] Task 2 — Zod schemas added to contact and checkout routes; committed
- [ ] Task 3 — safe-redirect helper created; OAuth callback updated; committed
- [ ] Task 4 — magic-byte validation added; both call sites awaited; committed
- [ ] Task 5 — Upstash deps installed; ratelimit helper created; both routes wired; committed
- [ ] §7.1 commit history verified (5 commits in correct order)
- [ ] §7.2 diff stat verified (9 files, no extras)
- [ ] §7.3 `pnpm build` and `pnpm lint` passed
- [ ] §7.4 `pnpm audit` clean (zero high/critical/moderate)
- [ ] §7.5 spot-checks all passed
- [ ] Branch pushed to origin
- [ ] PR opened with description from §8
- [ ] User reminded of §9.1 (Upstash setup)
- [ ] User reminded of §9.2 (Supabase email confirmation)
- [ ] User reminded of §9.3 (RLS verification SQL)

If any item is unchecked, report which one and why before stopping.
