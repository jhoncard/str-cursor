# Security Audit — Pass 3

Scope: verify Pass 1 / Pass 2 fixes still hold, audit features added since
Pass 2 (Seam smart lock, per-reservation time overrides, phone-derived door
codes, client-side image compression, DB-backed property galleries, guest
contract PDF flow, iCal export), and cover areas not previously audited
(server actions, admin edit flows, Supabase RLS files, storage policies,
dependency audit, env hygiene).

---

## 1. Security Posture Rating

🟡 **ACCEPTABLE** — Pass 1 and Pass 2 fixes are intact. The new Seam /
overrides / gallery / contract PDF code is generally well-built (auth-gated
server actions, signature-verified webhook, magic-byte validation still in
place, RLS added for `property_images`). Findings are concentrated in two
areas: (a) the `/api/properties/[slug]/quote` endpoint, which was added
without the Zod / rate-limit / error-hygiene treatment Pass 2 applied to
its siblings, and (b) the phone-derived door-code design, which makes lock
codes predictable from publicly inferable PII. There are also moderate
transitive `hono` advisories pulled in via the `shadcn` CLI (which is
mis-listed as a runtime dependency).

No active data exposure or auth bypass.

## 2. Critical And High Findings

- **FINDING #13** (HIGH): Phone-derived door codes are predictable.
- **FINDING #14** (HIGH): `/api/properties/[slug]/quote` has no schema
  validation, no rate limit, and echoes `error.message` to the client.

## 3. Quick Wins (<10 min)

1. Move `shadcn` from `dependencies` → `devDependencies` in `package.json`
   to drop the vulnerable transitive `hono` tree from the production
   bundle (Finding #15).
2. Replace `error.message` echoes in `/api/cron/ical-sync` GET/POST catch
   blocks with a static string (Finding #16).
3. Add `pnpm.overrides` for `hono@<4.12.12` and `@hono/node-server@<1.19.13`
   to silence pnpm audit even if `shadcn` stays in dependencies.
4. Drop the `seamError` field returned to the client by
   `updateBookingTimeOverrides` and only show a generic "Lock update
   failed — see admin logs" (Finding #17).

## 4. Findings (Prioritized)

```
┌─────────────────────────────────────────────────────────┐
│ FINDING #13                                             │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ HIGH                                         │
│ Category │ Predictable Credentials / Weak Auth          │
│ Location │ src/lib/seam/phone-to-code.ts:15             │
│          │ src/lib/seam/provision-booking.ts:118-147    │
│ CWE      │ CWE-330 (Use of Insufficiently Random Vals)  │
└──────────┴──────────────────────────────────────────────┘
What's wrong:
The smart-lock door code defaults to the last 4 digits of the guest's
phone number. Phone numbers (and especially the last four) are commonly
disclosed on social media, in email signatures, on Airbnb-style host
messages, and via data brokers. Anyone who can guess or look up the
guest's phone can open the door during the access window.

Why it matters:
Door codes are the primary physical-access control for the property. If
an attacker knows or can enumerate the guest's last-4 (10,000-state
keyspace, easily brute-forced if Seam doesn't lock the keypad), they
gain physical entry during the booked stay.

The vulnerable code:
```ts
// phone-to-code.ts
const last4 = digits.slice(-4);
if (/^(\d)\1{3}$/.test(last4)) return null;
return last4;
```

The fix:
Stop deriving the code from the phone. Use `generateFourDigitCode()` for
every booking and surface it to the guest via the existing email /
confirmation page. If matching the Airbnb "last-4" UX is a product
requirement, gate it behind an explicit opt-in per property and document
the risk.

```ts
// provision-booking.ts
const code = row.doorCode?.trim() || generateFourDigitCode();
```

Effort: ~20 minutes (plus product discussion).

┌─────────────────────────────────────────────────────────┐
│ FINDING #14                                             │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ HIGH                                         │
│ Category │ Missing Validation + Rate Limit + Info Leak  │
│ Location │ src/app/api/properties/[slug]/quote/route.ts │
│ CWE      │ CWE-20, CWE-770, CWE-209                     │
└──────────┴──────────────────────────────────────────────┘
What's wrong:
This route was added after Pass 2 and skipped every hardening pattern
that the rest of the routes received: no Zod schema on `checkIn` /
`checkOut`, no rate limiter, and the catch block echoes
`e.message` directly to the client.

Why it matters:
- Each request hits the database and the pricing pipeline; an attacker
  can spam this endpoint cheaply.
- Malformed dates can reach `computeStayAccommodationSubtotal` and the
  resulting error message (which may contain internal field names or
  SQL hints from drizzle) is returned to the caller.

The vulnerable code:
```ts
const checkIn = request.nextUrl.searchParams.get("checkIn");
const checkOut = request.nextUrl.searchParams.get("checkOut");
if (!checkIn || !checkOut) { ... }
// no zod, no rate limit
} catch (e) {
  const msg = e instanceof Error ? e.message : "Could not compute quote.";
  return NextResponse.json({ error: msg }, { status: 400 });
}
```

The fix:
```ts
import { z } from "zod";
import { assertWithinLimit, checkoutLimiter, clientIpFromHeaders } from "@/lib/ratelimit";

const QuoteSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const ip = clientIpFromHeaders(request.headers);
const lim = await assertWithinLimit(checkoutLimiter, `quote:${ip}`);
if (!lim.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

const parsed = QuoteSchema.safeParse({ checkIn, checkOut });
if (!parsed.success) return NextResponse.json({ error: "Invalid dates." }, { status: 400 });

// ...
} catch (e) {
  console.error("[quote] compute failed:", e);
  return NextResponse.json({ error: "Could not compute quote." }, { status: 400 });
}
```
(Consider adding a dedicated `quoteLimiter` with a higher per-minute
ceiling if checkoutLimiter is too tight for legitimate browsing.)

Effort: ~15 minutes.

┌─────────────────────────────────────────────────────────┐
│ FINDING #15                                             │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ MEDIUM                                       │
│ Category │ Vulnerable Transitive Dependencies           │
│ Location │ package.json (shadcn in "dependencies")      │
│ CWE      │ CWE-1395                                     │
└──────────┴──────────────────────────────────────────────┘
What's wrong:
`pnpm audit` reports 6 moderate hono / @hono/node-server advisories
(GHSA-26pp-8wgv-hjvm, GHSA-r5rp-j6wh-rvv4, GHSA-xpcf-pg52-r92g,
GHSA-xf4j-xp2r-rqqx, GHSA-wmmm-f939-6g9c, GHSA-92pp-h63x-v22m), all
chained through `shadcn > @modelcontextprotocol/sdk > hono`. `shadcn`
is a CLI used to scaffold UI components, not a runtime dependency, and
should not be in the production install set.

Why it matters:
Listed as a runtime dependency, `shadcn` and its hono subtree are
included in production `node_modules`, are downloaded by Vercel on every
deploy, and continue to be reported by audits.

The fix:
```jsonc
// package.json
"dependencies": {
  // ...remove "shadcn": "^4.1.2"
},
"devDependencies": {
  "shadcn": "^4.1.2",
  // ...
},
"pnpm": {
  "overrides": {
    "esbuild@<0.25.0": "^0.25.0",
    "hono@<4.12.12": "^4.12.12",
    "@hono/node-server@<1.19.13": "^1.19.13"
  }
}
```
Then `pnpm install` and re-run `pnpm audit`.

Effort: ~5 minutes.

┌─────────────────────────────────────────────────────────┐
│ FINDING #16                                             │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ LOW                                          │
│ Category │ Information Disclosure                       │
│ Location │ src/app/api/cron/ical-sync/route.ts:38,50    │
│ CWE      │ CWE-209                                      │
└──────────┴──────────────────────────────────────────────┘
What's wrong:
Both GET and POST catch blocks return the raw `err.message` to the
caller, which can include feed URLs, drizzle/postgres error text, and
network failure details.

Why it matters:
The endpoint is bearer-protected, so exposure requires the cron token;
that's why this is LOW. But the principle still applies and it's
trivially fixable.

The vulnerable code:
```ts
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: message }, { status: 500 });
}
```

The fix:
```ts
} catch (err) {
  console.error("[cron/ical-sync] failed:", err);
  return NextResponse.json({ error: "iCal sync failed." }, { status: 500 });
}
```
Effort: ~3 minutes.

┌─────────────────────────────────────────────────────────┐
│ FINDING #17                                             │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ LOW                                          │
│ Category │ Error Information Leak (admin surface)       │
│ Location │ src/app/admin/actions.ts:135-141             │
│          │ src/app/admin/(dashboard)/reservations/      │
│          │   [id]/edit/edit-form.tsx:45                 │
│ CWE      │ CWE-209                                      │
└──────────┴──────────────────────────────────────────────┘
What's wrong:
`updateBookingTimeOverrides` returns the raw `seam.seamAccessError`
string to the admin client and the form renders it inline. Seam SDK
errors have historically included request IDs, device identifiers and
upstream stack fragments. Admin-only, but it normalises the pattern of
leaking SDK internals to a browser.

The fix: log the raw error server-side and return a static
"Smart lock update failed — check Seam dashboard." string.

Effort: ~5 minutes.

┌─────────────────────────────────────────────────────────┐
│ FINDING #18                                             │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ LOW                                          │
│ Category │ Auth — getSession/getUser hygiene            │
│ Location │ src/lib/supabase/middleware.ts:38            │
│ CWE      │ CWE-287                                      │
└──────────┴──────────────────────────────────────────────┘
What's wrong: Middleware runs on every request and calls
`supabase.auth.getUser()` which makes a network call to Supabase. This
is correct for security (✓ not getSession) but the middleware matcher
also runs on `/api/*` routes, so every API hit incurs an auth round-trip
even when unauthenticated. Not a vulnerability — flagged so it isn't
"optimised away" to `getSession()` later. Keep `getUser()`.

Effort: 0 (informational).

┌─────────────────────────────────────────────────────────┐
│ FINDING #19                                             │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ LOW                                          │
│ Category │ RLS coverage unverifiable from repo          │
│ Location │ supabase/ (no SQL for bookings/guests/       │
│          │   profiles/availability/property_ical_*)     │
│ CWE      │ CWE-732                                      │
└──────────┴──────────────────────────────────────────────┘
What's wrong:
The repo only contains RLS SQL for `properties`, `property_images`,
`property_ical_feeds`, `property_ical_blocked_dates`, and the
`property-images` storage bucket. There is no committed SQL describing
RLS for `bookings`, `guests`, `profiles`, `availability`, or the new
Seam-related columns. Those tables are presumably managed in the
Supabase dashboard, which means their policies are not auditable from
git history and could regress silently.

The fix: dump the live policies (`pg_dump --schema-only -t public.bookings`
etc.) into `supabase/migrations/` so RLS state is reviewable in PRs.

Effort: ~30 minutes.
```

## 5. What's Already Done Right (Pass 1 / Pass 2 verifications + new code)

- **Finding #1 verified** — `requireAdminPage()` is still called in
  `src/app/admin/(dashboard)/layout.tsx:15`.
- **Finding #2 verified** — `/api/stripe/session` returns an
  allow-listed metadata bag only (`route.ts:60-67`); customerEmail
  removed; comment cites the audit.
- **Finding #3 verified** — Zod schemas in
  `/api/contact/route.ts:18-23` and
  `/api/stripe/checkout-session/route.ts:22-34`.
- **Finding #4 verified** — `src/lib/ratelimit.ts` exists, uses Upstash,
  is wired into both `/api/contact` and `/api/stripe/checkout-session`.
- **Finding #5 verified** — `timingSafeEqual` is used in both
  `/api/cron/ical-sync/route.ts:5-16` and
  `/api/integrations/pricelabs/rates/route.ts:15-21`.
- **Finding #6 verified** — `/api/contact/route.ts:97-111` no longer
  echoes `error.message`.
- **Finding #7 verified** — `src/lib/safe-redirect.ts` exists and
  enforces single-leading-slash, no `//`, no `@:\s\\`.
- **Finding #8 verified** — `assertImagePropertyImage` in
  `src/lib/supabase/property-image-upload.ts:71-83` does magic-byte
  detection (rejects SVG) before upload.
- **Finding #11 verified** — `pnpm.overrides.esbuild@<0.25.0` is set in
  `package.json`; drizzle-kit advisory is gone from pnpm audit output.
- **Seam webhook (new)** — `/api/seam/webhook/route.ts` verifies the SVIX
  signature via the SDK before doing anything else; refuses without
  `SEAM_WEBHOOK_SECRET`.
- **Stripe webhook (existing)** — still calls
  `stripe.webhooks.constructEvent()` correctly.
- **Server actions** — Every mutating function in `src/app/admin/actions.ts`
  starts with `await requireAdmin()`. `updateBookingTimeOverrides`
  validates time format with a regex before writing.
- **iCal export** — Token is a server-issued UUID stored in
  `properties.ical_export_token`; no PII beyond stay dates and
  confirmation codes is published. Token can be regenerated by an admin
  via `regeneratePropertyIcalExportToken`.
- **Confirmation code (Finding C verification)** — `confirmationCode` is
  used purely as a guest-facing reference. Grep across the codebase
  shows it is never used as an authentication token: it is rendered on
  the success page, looked up server-side from Stripe → DB by
  payment_intent (not by code), included in confirmation emails, and
  the dashboard reads it from a join keyed by the authenticated user's
  ID. The unauthenticated `/api/stripe/session` returning it is
  therefore **not** a vulnerability and is **not** flagged.
- **Service role key isolation** — Only referenced in
  `src/lib/supabase/property-image-upload.ts:110`, inside a
  `"server-only"` module, used by server actions only.
- **`.gitignore`** — `.env*` is ignored; only `.env.example` and
  `.env.local` exist locally; nothing committed.
- **No `dangerouslySetInnerHTML`** on user content — only one occurrence
  in `src/components/seo/json-ld.tsx:11`, content is
  `JSON.stringify(data)` of a static schema object.
- **Photo upload pipeline** — Server still re-validates with magic
  bytes after the new client-side compression; the 3 MB ceiling is a
  defensive hard cap, not a trust boundary moved to the client.

## 6. Checklist Summary

```
1.1 ✅  1.2 ✅  1.3 ✅  1.4 ✅  1.5 ✅  1.6 ⚠️
2.1 ⚠️  2.2 ⚠️  2.3 ⚠️  2.4 ✅  2.5 ✅  2.6 ✅  2.7 ✅  2.8 ⬚
3.1 ✅  3.2 ⚠️  3.3 ✅  3.4 ✅  3.5 ✅  3.6 ⚠️  3.7 ⬚  3.8 ⬚
4.1 ❌  4.2 ✅  4.3 ✅  4.4 ✅  4.5 ❌  4.6 ✅
5.1 ⚠️  5.2 ✅  5.3 ✅  5.4 ⚠️  5.5 ⚠️
6.1 ❌  6.2 ⬚  6.3 ✅
7.1 ⬚  7.2 ⬚
8.1 ✅  8.2 ✅  8.3 ✅
```

### Checklist verdict notes

- **1.6** ⚠️ — Supabase env vars use non-null assertions in
  `src/lib/supabase/server.ts:7`; middleware logs a warning instead of
  failing fast. Acceptable but could be louder.
- **2.1 / 2.2 / 2.3** ⚠️ — RLS for `bookings`, `guests`, `profiles`,
  `availability` is not in repo (Finding #19). Cannot verify from git.
  Tables touched only by service-role / server actions in current code,
  so likely fine, but unverifiable.
- **3.2** ⚠️ — Middleware uses route-prefix allowlist (`/admin`,
  `/dashboard`). New routes outside those prefixes are unauthenticated
  by default. Acceptable for a public marketing site.
- **3.6** ⚠️ — `/api/properties/[slug]/quote` is unauthenticated and now
  flagged in Finding #14; `/api/auth/me` correctly returns the
  authenticated user only.
- **4.1** ❌ — Quote route lacks Zod (Finding #14).
- **4.5** ❌ — Quote route + cron/ical-sync echo error.message
  (Findings #14, #16, #17).
- **5.1 / 5.4** ⚠️ — 6 moderate hono advisories via `shadcn` (Finding #15).
- **5.5** ⚠️ — `shadcn` should be a devDependency, not a runtime dep
  (Finding #15). All other listed packages are imported.
- **6.1** ❌ — Quote route hits the DB and pricing pipeline with no
  rate limit (Finding #14). Contact and checkout routes are properly
  limited.
- **6.2** ⬚ — Auth is delegated to Supabase (built-in throttling).
- **7.1 / 7.2** ⬚ — No CORS configured; routes are intended for the
  app's own frontend and Next.js does not add `Access-Control-Allow-
  Origin: *`.
- **2.8** ⬚ — No `SECURITY DEFINER` functions in committed SQL.
- **3.7 / 3.8** ⬚ — OAuth is handled by Supabase; no custom password
  reset flow.

---

## 7. Execution appendix — Pass 3 mechanical fixes

This section is written so someone following it verbatim can implement **Findings #13–#17** in one pass, verify, and tick a checklist. **Finding #19** (RLS policy dump) is **manual** and is not expressed as FIND/REPLACE here. **Finding #18** intentionally requires **no code change**.

Do **not** push to GitHub until your own review is complete.

### §0 Locked-in decisions (match this audit)

| Finding | Decisions |
| --- | --- |
| **#13** | Never derive door codes from guest phone. Use `row.doorCode?.trim()` when present, else `generateFourDigitCode()` (including the collision retry loop). Delete `src/lib/seam/phone-to-code.ts` if nothing imports it afterward. |
| **#14** | Quote route: `checkoutLimiter` + `assertWithinLimit`, Zod date strings, **400** `"Invalid dates."`, **429** `"Too many requests."`, generic catch body. |
| **#15** | Move `shadcn` to `devDependencies`; add `pnpm.overrides` for `hono` and `@hono/node-server` as in **Step 1**; then `pnpm install`. |
| **#16** | Cron iCal sync: never return raw `err.message` in JSON. Log server-side; client sees `{ error: "iCal sync failed." }`. |
| **#17** | Admin `updateBookingTimeOverrides`: log full `seam.seamAccessError` server-side; return **no** raw Seam string to the client. Use `lockUpdateFailed: boolean` + fixed UI copy (below). |
| **#18** | Keep `getUser()` (informational). |
| **#19** | Run `pg_dump` (or Supabase dashboard) when DB access exists; store policies under `supabase/migrations/`. Optional in this mechanical run. |

### Pre-flight

1. Work from repo root (this tree is `website-str`).
2. `git status` — note branch; resolve unrelated changes or stash.
3. **Branch:** `git checkout main && git pull` (adjust default branch if needed), then `git checkout -b security/pass-3-fixes`.
4. After each commit in the steps below, run `git log -1 --oneline` and confirm `git branch --show-current` is `security/pass-3-fixes`.

Execute **Step 1 → Step 6** in order. Each step lists COPY-pastable FIND / REPLACE blocks matched to the repo **as of Pass 3**.

---

### Step 1 — `package.json` (Finding #15)

**Commit message suggestion:** `chore(security): shadcn devDep + hono overrides (pass-3)`

**FIND**

```text
    "server-only": "^0.0.1",
    "shadcn": "^4.1.2",
    "stripe": "^21.0.1",
```

**REPLACE WITH**

```text
    "server-only": "^0.0.1",
    "stripe": "^21.0.1",
```

**FIND**

```text
  "pnpm": {
    "overrides": {
      "esbuild@<0.25.0": "^0.25.0"
    }
  },
```

**REPLACE WITH**

```text
  "pnpm": {
    "overrides": {
      "esbuild@<0.25.0": "^0.25.0",
      "hono@<4.12.12": "^4.12.12",
      "@hono/node-server@<1.19.13": "^1.19.13"
    }
  },
```

**FIND**

```text
    "postcss-import": "^16.1.1",
    "tailwindcss": "^3.4.1",
```

**REPLACE WITH**

```text
    "postcss-import": "^16.1.1",
    "shadcn": "^4.1.2",
    "tailwindcss": "^3.4.1",
```

**Then run (exact order):**

```bash
pnpm install
pnpm audit
```

---

### Step 2 — `src/app/api/cron/ical-sync/route.ts` (Finding #16)

**Commit message suggestion:** `fix(security): generic error body for iCal cron`

**FIND** (same block appears for **GET** and **POST**; apply **twice** or use editor “replace all”)

```text
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
```

**REPLACE WITH**

```text
  } catch (err) {
    console.error("[cron/ical-sync] failed:", err);
    return NextResponse.json({ error: "iCal sync failed." }, { status: 500 });
  }
```

---

### Step 3 — `src/app/api/properties/[slug]/quote/route.ts` (Finding #14)

**Commit message suggestion:** `fix(security): rate limit + zod + safe errors on quote API`

**FIND**

```text
import { NextRequest, NextResponse } from "next/server";

import { propertiesData } from "@/data/properties";
```

**REPLACE WITH**

```text
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { propertiesData } from "@/data/properties";
import {
  assertWithinLimit,
  checkoutLimiter,
  clientIpFromHeaders,
} from "@/lib/ratelimit";
```

**FIND**

```text
  const { slug } = await context.params;
  const checkIn = request.nextUrl.searchParams.get("checkIn");
  const checkOut = request.nextUrl.searchParams.get("checkOut");

  if (!checkIn || !checkOut) {
    return NextResponse.json(
      { error: "checkIn and checkOut are required (yyyy-MM-dd)." },
      { status: 400 }
    );
  }

  const staticProp = propertiesData.find((p) => p.slug === slug);
```

**REPLACE WITH**

```text
  const { slug } = await context.params;
  const checkIn = request.nextUrl.searchParams.get("checkIn");
  const checkOut = request.nextUrl.searchParams.get("checkOut");

  const ip = clientIpFromHeaders(request.headers);
  const lim = await assertWithinLimit(checkoutLimiter, `quote:${ip}`);
  if (!lim.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const QuoteSchema = z.object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });
  const parsed = QuoteSchema.safeParse({ checkIn, checkOut });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid dates." }, { status: 400 });
  }

  const staticProp = propertiesData.find((p) => p.slug === slug);
```

**FIND**

```text
    const acc = await computeStayAccommodationSubtotal(
      row.id,
      checkIn,
      checkOut,
```

**REPLACE WITH**

```text
    const acc = await computeStayAccommodationSubtotal(
      row.id,
      parsed.data.checkIn,
      parsed.data.checkOut,
```

**FIND**

```text
    return NextResponse.json({
      slug,
      checkIn,
      checkOut,
```

**REPLACE WITH**

```text
    return NextResponse.json({
      slug,
      checkIn: parsed.data.checkIn,
      checkOut: parsed.data.checkOut,
```

**FIND**

```text
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not compute quote.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
```

**REPLACE WITH**

```text
  } catch (e) {
    console.error("[quote] compute failed:", e);
    return NextResponse.json(
      { error: "Could not compute quote." },
      { status: 400 },
    );
  }
```

---

### Step 4 — Seam provisioning, no phone-derived codes (Finding #13)

**Commit message suggestion:** `fix(security): stop deriving Seam door codes from phone`

#### 4a. `src/lib/seam/provision-booking.ts`

**FIND**

```text
import { extractDoorCodeFromPhone } from "./phone-to-code";

export type ProvisionSeamResult = {
```

**REPLACE WITH**

```text
export type ProvisionSeamResult = {
```

**FIND**

```text
        },
      },
      guest: {
        columns: {
          phone: true,
        },
      },
    },
  });
```

**REPLACE WITH**

```text
        },
      },
    },
  });
```

**FIND**

```text
  const name = `${row.property.name} · ${row.confirmationCode}`.slice(0, 120);

  // Phone-derived code (last 4 digits). Falls back to random when the guest
  // phone is missing, too short, or a weak code like '0000'. See Task 3.
  const phoneCode = extractDoorCodeFromPhone(row.guest?.phone);

  try {
    if (row.seamAccessCodeId) {
      // Existing code: keep whatever is already stored on the booking unless
      // we have no code at all, in which case prefer phone-derived.
      const code =
        row.doorCode?.trim() || phoneCode || generateFourDigitCode();
```

**REPLACE WITH**

```text
  const name = `${row.property.name} · ${row.confirmationCode}`.slice(0, 120);

  try {
    if (row.seamAccessCodeId) {
      const code = row.doorCode?.trim() || generateFourDigitCode();
```

**FIND**

```text
    }

    // First attempt uses phone-derived code. Subsequent attempts fall back
    // to random because the collision is almost certainly another booking
    // on the same lock using the same last-4 digits.
    let code = phoneCode ?? generateFourDigitCode();
```

**REPLACE WITH**

```text
    }

    let code = row.doorCode?.trim() || generateFourDigitCode();
```

#### 4b. Remove the helper file

**Action:** Delete `src/lib/seam/phone-to-code.ts`.

**Verify nothing else imports it:**

```bash
rg "phone-to-code|extractDoorCodeFromPhone" --glob "*.ts" --glob "*.tsx"
```

Expect matches only in docs (e.g. `SEAM_PHONE_CODE_FEATURE.md`) and this audit file.

---

### Step 5 — Admin time override: no raw Seam text to client (Finding #17)

**Commit message suggestion:** `fix(security): redact Seam errors in admin updateBookingTimeOverrides`

#### 5a. `src/app/admin/actions.ts`

**FIND**

```text
  const seam = await provisionSeamAccessCodeForBooking(bookingId);

  return {
    success: true,
    doorCode: seam.doorCode,
    seamAccessError: seam.seamAccessError,
  };
}
```

**REPLACE WITH**

```text
  const seam = await provisionSeamAccessCodeForBooking(bookingId);
  if (seam.seamAccessError) {
    console.error(
      "[admin] Seam provision after time override:",
      seam.seamAccessError,
    );
  }

  return {
    success: true,
    doorCode: seam.doorCode,
    lockUpdateFailed: Boolean(seam.seamAccessError),
  };
}
```

#### 5b. `src/app/admin/(dashboard)/reservations/[id]/edit/edit-form.tsx`

**FIND**

```text
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "ok"; doorCode: string | null; seamError: string | null }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
```

**REPLACE WITH**

```text
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "ok"; doorCode: string | null; lockUpdateFailed: boolean }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
```

**FIND**

```text
      setResult({
        kind: "ok",
        doorCode: res.doorCode,
        seamError: res.seamAccessError,
      });
```

**REPLACE WITH**

```text
      setResult({
        kind: "ok",
        doorCode: res.doorCode,
        lockUpdateFailed: res.lockUpdateFailed,
      });
```

**FIND**

```text
              {result.seamError && (
                <p className="text-xs mt-1 text-emerald-700">
                  Seam warning: {result.seamError}
                </p>
              )}
```

**REPLACE WITH**

```text
              {result.lockUpdateFailed && (
                <p className="text-xs mt-1 text-emerald-700">
                  Lock update failed — see admin logs.
                </p>
              )}
```

---

### Step 6 — Verification (run exactly)

```bash
pnpm install
pnpm audit
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

Optional sanity calls (after `pnpm dev` or against deployed env):

- Quote: missing dates → **400** `{ "error": "Invalid dates." }`; rapid repeat → **429** `"Too many requests."`
- Cron: bad auth → **401**; forced failure path (if you simulate) → **500** body does **not** echo stack or internal messages.

---

## 8. Done checklist (executor)

Copy and check off:

- [ ] **Pre-flight:** On branch `security/pass-3-fixes`; working tree clean before merge.
- [ ] **Step 1:** `package.json` edits applied; `pnpm install` + `pnpm audit` run; moderate `hono` count reduced per audit expectations.
- [ ] **Step 2:** Both **GET** and **POST** in `ical-sync` use generic **500** body + `console.error`.
- [ ] **Step 3:** Quote route has rate limit, Zod, and generic catch error string.
- [ ] **Step 4:** `provision-booking.ts` updated; `phone-to-code.ts` deleted; `rg` shows no TS imports of `extractDoorCodeFromPhone`.
- [ ] **Step 5:** `updateBookingTimeOverrides` returns `lockUpdateFailed`; admin edit form shows only fixed copy (no interpolated SDK string).
- [ ] **Step 6:** `tsc`, `lint`, and `build` all succeed.
- [ ] **Finding #19 (optional):** RLS / policy snapshot captured to `supabase/migrations/` when DB is available.
- [ ] **Review:** Self-review diff; **do not push** until you are satisfied (per project preference).
