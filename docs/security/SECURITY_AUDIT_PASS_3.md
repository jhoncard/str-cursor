# Security Audit — Pass 3

Auditor: senior application security engineer (vibe-coded codebase review)
Scope: verify Pass 1/Pass 2 fixes for findings #1–#12 are still in place,
audit code added since Pass 2 (Seam smart lock, per-reservation time
overrides, phone-derived door codes, client-side photo compression,
DB-backed property galleries, guest contract PDF flow, iCal export),
plus areas not previously audited (server actions, admin edit flows,
Supabase RLS SQL, storage bucket policies, dependencies, env hygiene).

---

## 1. Security Posture Rating

🟡 **ACCEPTABLE** — minor issues, no immediate data exposure.

The two prior remediation passes have held up well: every Pass 1 and
Pass 2 fix I checked is still present in main, and the new Seam,
per-reservation override, and contract-PDF features were built using
the same defensive patterns established earlier (Zod schemas, Upstash
rate limiting, `requireAdmin()` on every server action, magic-byte
upload validation, constant-time bearer comparison, allow-listed
metadata on the public Stripe session endpoint). `pnpm audit` is
clean (0 vulnerabilities across 895 deps). Findings in this pass are
all MEDIUM/LOW: an admin-side SSRF via the iCal-feed fetcher, an
information leak via the public iCal export route, an unauthenticated
booking-existence oracle on the property quote endpoint, a few
admin-only `Error(error.message)` rethrows that leak Supabase
internals to admins (low impact, but trivial to tighten), and several
RLS-related ⚠️ items I cannot fully verify because the base schema RLS
for `bookings`, `guests`, `profiles`, and `availability` is not in
the `supabase/` directory in this checkout (it lives in the hosted
project).

The user-supplied "earlier partial audit" findings A, B, and C did
not reproduce — those code paths are already hardened. They are
documented as "verified — not a finding" below.

---

## 2. Critical and High Findings

None. No CRITICAL or HIGH issues were found in this pass.

---

## 3. Quick Wins (≤ 10 min each)

1. Validate the URL passed to `addPropertyIcalFeed` — require
   `https:`, reject loopback / RFC1918 / link-local hosts before
   `fetch()`. (Finding #13)
2. Stop including `confirmationCode` in the public iCal export
   `SUMMARY` — replace with `"Booked"` only. (Finding #14)
3. In admin server actions, replace `throw new Error(error.message)`
   with a generic message + `console.error(error)`. (Finding #16)
4. Add a `User-Agent` allow-list / max body size to the `fetch` in
   `syncFeedBlockedDates` so a malicious feed cannot hand back a
   gigabyte of ICS to OOM the function.
5. Add a startup assertion that `SUPABASE_SERVICE_ROLE_KEY` does NOT
   start with `NEXT_PUBLIC_` (it doesn't today, but the helper in
   `property-image-upload.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and
   the service-role key from env — a one-line guard catches future
   regressions).

---

## 4. Prioritized Remediation Plan

| # | Sev    | Title                                                                 | Effort |
|---|--------|-----------------------------------------------------------------------|--------|
| 1 | MEDIUM | SSRF in admin iCal feed fetcher (Finding #13)                         | ~15 min|
| 2 | MEDIUM | Confirmation codes leaked via public iCal export (Finding #14)        | ~5 min |
| 3 | LOW    | `/api/properties/[slug]/quote` is a booking-existence oracle (#15)    | ~10 min|
| 4 | LOW    | Admin server actions rethrow Supabase `error.message` (#16)           | ~15 min|
| 5 | LOW    | iCal feed fetch has no body-size cap / timeout (#17)                  | ~10 min|
| 6 | INFO   | Guest contract PDFs stored in a public storage bucket (#18)           | ~30 min|

---

## 5. What's Already Done Right (do not break)

- **Pass 1 fixes verified in place**:
  - `requireAdminPage()` is the first call in
    `src/app/admin/(dashboard)/layout.tsx:15` and is also called by
    every admin page I sampled (e.g. reservations edit page line 17).
  - `/api/stripe/session` (`src/app/api/stripe/session/route.ts:60`)
    returns an allow-listed metadata object — no `customerEmail`,
    `customer_details`, or unfiltered `metadata` bag.
  - `/api/cron/ical-sync` (lines 12-15) and the PriceLabs rates
    route (lines 15-21) both use `timingSafeEqual` on bearer tokens
    with explicit length-mismatch short-circuiting.
  - `/api/contact` (lines 97-111) logs server-side and returns a
    fixed message — `error.message` is not echoed even in dev.
- **Pass 2 fixes verified in place**:
  - Zod schemas on `/api/contact` (line 18) and
    `/api/stripe/checkout-session` (line 22), both with `.max()`
    caps so attacker payloads cannot reach Stripe metadata limits.
  - Upstash rate limiting via `src/lib/ratelimit.ts`, applied to
    contact, checkout-session, and (correctly) the new
    `/api/properties/[slug]/quote` route.
  - `src/lib/safe-redirect.ts` exists and is consumed by
    `src/app/auth/callback/route.ts`.
  - Magic-byte validation in
    `src/lib/supabase/property-image-upload.ts:41` — JPEG, PNG,
    GIF, WebP allow-list; SVG explicitly blocked. PDF magic bytes
    enforced in `assertRentalAgreementPdf`.
  - `pnpm.overrides` block in `package.json:57` still pins
    `esbuild@<0.25.0` to `^0.25.0`.
- **Auth model**: middleware (`src/middleware.ts`) protects
  `/admin/*` (with login page exception) and `/dashboard/*`; admin
  role check is enforced again at the page boundary by
  `requireAdminPage()` (defence in depth). All security-sensitive
  paths use `supabase.auth.getUser()`, never `getSession()`.
- **Webhook signature verification**: Stripe (`constructEvent` at
  `route.ts:23`) and Seam (`SeamWebhook.verify` at `route.ts:33`)
  both verify signatures before any processing, with raw-body
  handling done correctly.
- **Per-reservation time override action**
  (`src/app/admin/actions.ts:91`) calls `requireAdmin()` first, runs
  a strict `^([01]\d|2[0-3]):([0-5]\d)$` regex on both fields, and
  re-provisions Seam after the DB update.
- **Seam provisioning**: door codes are generated server-side via
  `generateFourDigitCode()`, with collision-retry; the `phone-to-code`
  helper referenced in the feature doc is no longer wired into the
  provisioning path (good — phone-derived codes would have been a
  predictability issue), and the production path uses random 4-digit
  codes only.
- **Storage bucket RLS**: `supabase/storage-property-images.sql`
  enables admin-only INSERT/UPDATE/DELETE on the `property-images`
  bucket via `auth.uid()` joined to `profiles.role = 'admin'`.
  Public read is intentional for hero photos.
- **Property/property_images RLS** uses `auth.uid()`, not
  `user_metadata`, with `WITH CHECK` clauses on every UPDATE policy
  (`supabase/properties-admin-rls.sql`,
  `supabase/migrations/20260409120000_property_images_admin_rls.sql`).
- **Dependencies clean**: `pnpm audit` reports 0/0/0/0/0 across 895
  dependencies. Lockfile (`pnpm-lock.yaml`) is committed. No
  obviously hallucinated packages — every import I checked maps to
  a well-known npm package.
- **`.gitignore`** correctly ignores `.env*`, and `git log --all
  --diff-filter=A -- .env*` returns no history of a committed env
  file.
- **No `NEXT_PUBLIC_` prefix on any secret**: only the Supabase URL,
  anon key, app URL, bucket name, and feature flag use the public
  prefix. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `SEAM_API_KEY`, `SEAM_WEBHOOK_SECRET`,
  `RESEND_API_KEY`, `CRON_SECRET`, `PRICELABS_WEBHOOK_SECRET`, and
  `UPSTASH_REDIS_REST_TOKEN` are all server-only.
- **User-supplied Findings A, B, C did not reproduce**:
  - **A** (`/api/properties/[slug]/quote` lacks Zod / rate limit /
    leaks `err.message`) — false alarm. The route has a Zod
    `QuoteSchema` at line 33, calls `assertWithinLimit(checkoutLimiter,
    \`quote:${ip}\`)` at line 28, and the catch block returns a
    static `"Could not compute quote."`.
  - **B** (`/api/cron/ical-sync` returns `err.message` at lines 38
    and 50) — false alarm. Both catch blocks return a fixed
    `"iCal sync failed."` and only log the underlying error.
  - **C** (`confirmationCode` returned unauthenticated by
    `/api/stripe/session` is used as an auth token) — false alarm.
    Confirmation codes are display-only on the success page,
    guest dashboard, and email templates. Nothing in
    `src/app/api`, `src/app/actions`, or the guest dashboard
    treats `confirmation_code` as a credential. (Tip: keep it
    that way — short codes like `BK-XXXXXXXX` would be brute-
    forceable if they ever became authentication material.)

---

## New Findings (detail)

### FINDING #13 — SSRF in admin iCal feed fetcher

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Severity | MEDIUM                                                                |
| Category | Server-Side Request Forgery                                           |
| Location | `src/app/admin/actions.ts:451-465` (`syncFeedBlockedDates`)           |
| CWE      | CWE-918 (Server-Side Request Forgery)                                 |

**What's wrong:** `addPropertyIcalFeed()` accepts an arbitrary URL
from an admin and immediately `fetch()`es it server-side with no
scheme, host, or address filtering. Anything an admin can paste into
the "Calendar URL" field gets a request from the Vercel runtime —
including `http://169.254.169.254/...` (cloud metadata),
`http://localhost:3000/api/...` (self-recursion), `http://10.0.0.0/8`,
or any internal hostname reachable from the function.

**Why it matters:** Admin compromise (phished cookie, stolen session,
malicious admin) becomes an internal-network pivot. On Vercel the
metadata endpoint isn't reachable, but on a self-hosted Node deploy
it is, and even on Vercel a `localhost`/internal-DNS request can
exfiltrate response bodies into `property_ical_blocked_dates`. The
attacker controls the URL, the parser is lenient (it just looks for
`BEGIN:VEVENT`), and there's no max-size on the response body
(see #17), so a malicious endpoint can respond with anything.

**Vulnerable code:**
```ts
// src/app/admin/actions.ts
const url = feedUrl.trim();
if (!url) throw new Error("Calendar URL is required.");
// ...
const res = await fetch(feedUrl, {
  headers: { "user-agent": "FeathersHousesIcalSync/1.0" },
  cache: "no-store",
});
```

**Fix:**
```ts
function assertSafeFeedUrl(raw: string): URL {
  let parsed: URL;
  try { parsed = new URL(raw); }
  catch { throw new Error("Calendar URL must be a valid URL."); }
  if (parsed.protocol !== "https:") {
    throw new Error("Calendar URL must use https://");
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    throw new Error("Calendar URL host is not allowed.");
  }
  return parsed;
}
// then in addPropertyIcalFeed / syncFeedBlockedDates:
const safe = assertSafeFeedUrl(feedUrl);
const res = await fetch(safe.toString(), { /* ... */ });
```

Effort: ~15 minutes.

---

### FINDING #14 — Confirmation codes leaked via public iCal export

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Severity | MEDIUM                                                                |
| Category | Information Disclosure                                                |
| Location | `src/app/api/ical/export/[token]/route.ts:50-55`                      |
| CWE      | CWE-200 (Exposure of Sensitive Information)                           |

**What's wrong:** The unauthenticated iCal export endpoint embeds the
booking `confirmationCode` into the event `SUMMARY` line. The token
is an unguessable UUID, but the export URL is meant to be pasted into
Airbnb / VRBO calendar-import settings — anywhere that URL travels
(channel manager logs, third-party iCal aggregators, support
tickets), the confirmation codes for every confirmed booking on the
property travel with it.

**Why it matters:** The codebase doesn't currently use confirmation
codes as authentication material (verified — see Finding C above),
so today this is "PII / business data leak" rather than "auth bypass".
But these codes appear in guest emails, the success page, and the
admin UI — if any future feature ever treats them as a lookup token
(e.g. "enter your confirmation code to view your booking"), this
endpoint immediately becomes an enumeration source.

**Vulnerable code:**
```ts
events: confirmed.map((b) => ({
  uid: `booking-${b.id}@${host}`,
  summary: `Booked: ${property.name} (${b.confirmationCode})`,
  checkIn: String(b.checkIn),
  checkOut: String(b.checkOut),
})),
```

**Fix:**
```ts
events: confirmed.map((b) => ({
  uid: `booking-${b.id}@${host}`,
  summary: "Booked",
  checkIn: String(b.checkIn),
  checkOut: String(b.checkOut),
})),
```

Channel managers only need the dates and a unique UID; the human-
readable summary contributes nothing. Also drop `confirmationCode`
from the SELECT list at lines 22-28 so it can't accidentally come
back later.

Effort: ~5 minutes.

---

### FINDING #15 — Booking-existence oracle on property quote endpoint

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Severity | LOW                                                                   |
| Category | Information Disclosure                                                |
| Location | `src/app/api/properties/[slug]/quote/route.ts:42-57`                  |
| CWE      | CWE-204 (Observable Response Discrepancy)                             |

**What's wrong:** The route returns three distinct error messages
that tell an unauthenticated caller whether (a) the slug exists in
the static catalogue, (b) the slug exists in the DB but isn't
bookable, and (c) neither. Combined with the per-IP rate limit
(10/hour) this is a low-impact oracle, but it does let someone
fingerprint which slugs are "real" without ever creating a booking.

**Vulnerable code:**
```ts
if (!staticProp) {
  return NextResponse.json({ error: "Property not found." }, { status: 404 });
}
// ...
if (!row?.id) {
  return NextResponse.json(
    { error: "Property is not available for booking in the database." },
    { status: 404 },
  );
}
```

**Fix:** Collapse both branches to a single `404` with a single
generic message (`"Property not found."`).

Effort: ~5 minutes.

---

### FINDING #16 — Admin server actions rethrow raw Supabase error messages

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Severity | LOW                                                                   |
| Category | Error Message Information Disclosure                                  |
| Location | `src/app/admin/actions.ts` — multiple sites: lines 47, 183, 208, 243, 277, 300, 312, 332, 351, 471, 484, 491, 519, 537, 547, 559, 576 |
| CWE      | CWE-209 (Generation of Error Message Containing Sensitive Information)|

**What's wrong:** Every Supabase call in the admin actions file
follows the pattern `if (error) throw new Error(error.message);`.
Supabase error messages often contain SQL fragments, RLS policy
names, column names, and constraint identifiers, all of which are
shipped straight to the admin browser via React Server Action error
serialization.

**Why it matters:** The blast radius is limited because all of these
sites are gated by `requireAdmin()`, so an attacker would already need
admin access to see them — but a phished admin session, an XSS in
the admin UI (currently none found, but future code), or even a
shoulder-surf scenario would leak schema details and policy names
that simplify follow-on attacks. Also, AI-generated UIs love to
display caught errors verbatim, so the `error.message` you "trusted"
to stay in the admin tab can end up in screenshots, support tickets,
and Sentry breadcrumbs.

**Vulnerable code:**
```ts
if (error) throw new Error(error.message);
```

**Fix:**
```ts
if (error) {
  console.error("[admin] property update failed:", error);
  throw new Error("Could not save changes. Please try again.");
}
```

(Repeat for each site, with a slightly different generic message
per action so the admin UI is still useful.)

Effort: ~15 minutes (mostly mechanical).

---

### FINDING #17 — iCal feed fetch has no body-size cap or timeout

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Severity | LOW                                                                   |
| Category | Resource Exhaustion                                                   |
| Location | `src/app/admin/actions.ts:457-464` and `src/lib/ical/sync.ts` (cron path) |
| CWE      | CWE-770 (Allocation of Resources Without Limits)                      |

**What's wrong:** Both the manual admin sync and the Vercel cron
fetch arbitrary remote iCal URLs and `await res.text()` with no
upper bound and no `AbortSignal.timeout(...)`. A misbehaving (or
malicious) feed can hand back a 500 MB body and trip the function's
memory limit, or hang the connection until the function times out.

**Fix:** Wrap the `fetch` with `AbortSignal.timeout(10_000)`, then
stream-read the body up to e.g. 5 MB, rejecting beyond that. Do this
in `syncFeedBlockedDates` and any equivalent in `lib/ical/sync.ts`.

Effort: ~10 minutes.

---

### FINDING #18 — Guest rental-agreement PDFs stored in a public bucket

| Field    | Value                                                                 |
|----------|-----------------------------------------------------------------------|
| Severity | INFORMATIONAL                                                         |
| Category | Storage Permissions                                                   |
| Location | `supabase/storage-property-images.sql`, `src/app/admin/actions.ts:253` (`uploadPropertyRentalAgreementPdf`) |
| CWE      | CWE-552 (Files Accessible to External Parties)                        |

**What's wrong:** The `property-images` bucket is
`public: true` (intentionally — hero photos need it). The rental
agreement PDF flow stores the PDF in the *same* public bucket under
`{propertyId}/rental-agreement-{uuid}.pdf` and saves the public URL
on the property row.

**Why it matters:** Today this is fine — the rental agreement is a
generic property-level template, not a per-guest signed document, and
the path includes a random UUID so it isn't enumerable. But the
moment the flow grows to store *signed* per-guest contracts (with
guest names, signatures, addresses), they will land in a public
bucket and any leaked URL will be a permanent, un-revocable handle to
guest PII. Worth flagging now so the next iteration uses a private
bucket with a signed-URL fetch.

**Fix:** Create a separate `private-documents` bucket with no public
read policy, store rental PDFs there, and serve them through a Server
Action that signs a short-lived URL after `requireAdmin()` (or after
verifying the requesting guest owns the booking).

Effort: ~30 minutes when you actually need it.

---

## 6. Checklist Summary

### Section 1 — Environment Variables and Secret Management
- 1.1 ✅  No hardcoded secrets found in `src/`. The `Bearer` strings
       found are in the bearer-token *verifiers* (correct usage).
- 1.2 ✅  `.env*` is in `.gitignore`; `git log --all --diff-filter=A
       -- .env*` returns nothing.
- 1.3 ✅  Only Supabase URL/anon key, app URL, bucket name, and one
       feature flag use `NEXT_PUBLIC_`. All sensitive keys are
       server-only.
- 1.4 ✅  Console logs in API routes log the error object server-side
       only; client responses are static strings.
- 1.5 ✅  `next.config.ts` does not set `productionBrowserSourceMaps`
       (defaults to `false`).
- 1.6 ⚠️ Required env vars are read with `??` fallbacks rather than
       a centralized fail-fast validator. Cron and PriceLabs routes
       do return `503` when their secrets are missing, which is good,
       but Stripe / Supabase / Resend rely on `!`-assertions or
       runtime crashes. Consider a `src/env.ts` zod schema validated
       at module load.

### Section 2 — Database Security
- 2.1 ⚠️ Verified RLS enabled on `properties`, `property_images`,
       `property_ical_feeds`, `property_ical_blocked_dates` (in this
       repo's SQL). RLS for `bookings`, `guests`, `profiles`,
       `availability` is presumably defined in the hosted Supabase
       project but is NOT in `supabase/` here, so I cannot verify
       directly from this checkout. Treat as ⚠️ until confirmed in
       the dashboard.
- 2.2 ⚠️ Same caveat — for the SQL files present, every RLS-enabled
       table has at least the policies it needs. For tables not in
       this checkout I cannot confirm.
- 2.3 ✅  Every UPDATE policy in the present SQL files has a
       `WITH CHECK` clause (`properties-admin-rls.sql`,
       `20260409120000_property_images_admin_rls.sql`).
- 2.4 ✅  All policies use `auth.uid()` joined to
       `profiles.role = 'admin'`. None use
       `auth.jwt()->'user_metadata'`.
- 2.5 ✅  `SUPABASE_SERVICE_ROLE_KEY` is only read in
       `src/lib/supabase/property-image-upload.ts:110`
       (`createServiceRoleSupabase`), which is `import "server-only"`.
       It is never imported by a client component.
- 2.6 ✅  `storage-property-images.sql` enables admin-only writes on
       the `property-images` bucket. (See #18 about the PDF
       co-tenancy nuance.)
- 2.7 ✅  No raw SQL string concatenation found. All DB access goes
       through Drizzle (parameterized) or the Supabase client.
- 2.8 ⬚  No `SECURITY DEFINER` functions in the SQL files in this
       repo.

### Section 3 — Authentication and Session Management
- 3.1 ✅  `src/middleware.ts` runs on all non-static paths via the
       matcher; `updateSession` enforces redirects for `/admin/*`
       and `/dashboard/*`.
- 3.2 ⚠️ Middleware is *blocklist*-style (only `/admin` and
       `/dashboard` are protected). New top-level routes are
       public by default. Acceptable for a marketing-heavy site,
       but worth noting.
- 3.3 ✅  Every server-side auth check (`getUser`, `requireUser`,
       `requireAdmin`, `requireAdminPage`, middleware) calls
       `supabase.auth.getUser()`. No `getSession()` usage in
       protected paths.
- 3.4 ✅  `src/app/auth/callback/route.ts` uses `safeInternalPath`
       from `src/lib/safe-redirect.ts` (Pass 2 fix #7 still in
       place).
- 3.5 ✅  Sessions live in Supabase SSR cookies (httpOnly via
       `@supabase/ssr`); no `localStorage`-based session storage
       found.
- 3.6 ✅  Every API route handling sensitive data either verifies a
       webhook signature, requires a bearer secret, requires an
       authenticated session, or is intentionally public (quote /
       checkout creation / contact, all with rate limits + Zod).
- 3.7 ⬚  No custom OAuth callback validation logic — relies on
       Supabase's hosted OAuth.
- 3.8 ✅  Password reset is delegated to Supabase Auth (Pass 1's
       `7a62e9f` commit). Reset tokens are Supabase-managed.

### Section 4 — Server-Side Validation
- 4.1 ⚠️ Zod schemas on `/api/contact`, `/api/stripe/checkout-session`,
       and `/api/properties/[slug]/quote`. Server actions in
       `src/app/admin/actions.ts` use ad-hoc validation (regex on
       HH:mm, `instanceof File` checks, `typeof === "string"`)
       rather than Zod. Functional and admin-gated, but for
       consistency consider Zod here too.
- 4.2 ✅  User identity for write operations is always derived from
       `getUser()` / `requireAdmin()`, never from request bodies.
       The Stripe webhook trusts `metadata` (correct — the metadata
       was set server-side in `checkout-session/route.ts`).
- 4.3 ✅  No `dangerouslySetInnerHTML` on user-controlled data found.
       Email templates use React Email components which escape by
       default.
- 4.4 ✅  All state-changing endpoints use POST (or are server
       actions, which are POST under the hood). The cron route
       supports both GET and POST, which is fine because it
       requires a bearer secret.
- 4.5 ⚠️ Public routes are clean; admin server actions leak Supabase
       `error.message` (Finding #16).
- 4.6 ✅  Stripe and Seam webhooks both verify signatures before any
       processing.

### Section 5 — Dependency and Package Security
- 5.1 ✅  `pnpm audit` → 0 critical / 0 high / 0 moderate / 0 low / 0
       info, 895 deps.
- 5.2 ✅  Spot-checked dependencies — every entry in `package.json`
       maps to a well-known npm package. No suspiciously fresh /
       low-download names.
- 5.3 ✅  `pnpm-lock.yaml` is committed at repo root.
- 5.4 ✅  No outdated packages with known CVEs (audit is clean).
       `pnpm.overrides` still pins `esbuild@<0.25.0` (Pass 2 fix #11).
- 5.5 ⚠️ Likely unused / partially used:
       - `@vercel/postgres` — not imported anywhere I can find;
         the app uses `@neondatabase/serverless` + `drizzle-orm`.
         Candidate for removal.
       - `@base-ui/react` — appears in only a couple of UI files
         per a quick grep; verify it's still load-bearing.
       Removing unused deps shrinks the attack surface.

### Section 6 — Rate Limiting
- 6.1 ✅  All paid-API endpoints have per-IP rate limits via Upstash:
       `/api/contact` (Resend), `/api/stripe/checkout-session`
       (Stripe), `/api/properties/[slug]/quote` (PriceLabs / DB).
- 6.2 ⚠️ Login / signup / password reset run through Supabase Auth,
       which has its own server-side rate limiting — but the local
       app does not add an additional layer. Acceptable for now;
       monitor Supabase project rate-limit settings.
- 6.3 ✅  Rate limiting is server-side, backed by Upstash Redis
       (`src/lib/ratelimit.ts`), with a documented graceful no-op
       in dev when env vars are missing.

### Section 7 — CORS Configuration
- 7.1 ✅  No custom CORS headers set. Next.js defaults are
       same-origin, which is correct for these routes.
- 7.2 ⬚  N/A — no `Access-Control-Allow-Credentials` configured.

### Section 8 — File Upload Security
- 8.1 ✅  `assertImagePropertyImage` enforces magic-byte checks +
       size cap; `assertRentalAgreementPdf` enforces `%PDF-` magic
       bytes + 15 MB cap.
- 8.2 ⚠️ Property images are intentionally in a public bucket.
       Rental agreement PDFs share that public bucket — see
       Finding #18.
- 8.3 ✅  Uploads land in Supabase Storage, not the Next.js public
       directory or any executable path.

---

### Compact verdict line

1.1 ✅  1.2 ✅  1.3 ✅  1.4 ✅  1.5 ✅  1.6 ⚠️
2.1 ⚠️  2.2 ⚠️  2.3 ✅  2.4 ✅  2.5 ✅  2.6 ✅  2.7 ✅  2.8 ⬚
3.1 ✅  3.2 ⚠️  3.3 ✅  3.4 ✅  3.5 ✅  3.6 ✅  3.7 ⬚  3.8 ✅
4.1 ⚠️  4.2 ✅  4.3 ✅  4.4 ✅  4.5 ⚠️  4.6 ✅
5.1 ✅  5.2 ✅  5.3 ✅  5.4 ✅  5.5 ⚠️
6.1 ✅  6.2 ⚠️  6.3 ✅
7.1 ✅  7.2 ⬚
8.1 ✅  8.2 ⚠️  8.3 ✅

End of Pass 3.
