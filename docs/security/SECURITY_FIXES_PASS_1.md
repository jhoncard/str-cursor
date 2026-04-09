# Security Fixes — Pass 1 (Critical + Quick Wins)

> **Instructions for Cursor:** This document defines a fixed, reviewed set of security changes for the `str-cursor` repository. Execute the tasks below **in order**, exactly as specified. Do **not** add scope, refactor surrounding code, "improve" naming, or make changes outside what is explicitly listed. Each task includes the exact `OLD CODE` to find and the exact `NEW CODE` to replace it with. After all four tasks, run the verification steps in §6 and report results.

## 0. Goal and scope

Apply four security fixes from a completed audit:

| # | Severity | Finding | Files touched |
|---|---|---|---|
| 1 | 🔴 CRITICAL | Admin dashboard pages viewable by any authenticated user (missing role check) | 1 |
| 2 | 🟠 HIGH | `/api/stripe/session` leaks customer PII to anyone with a session ID | 2 |
| 3 | 🟡 MEDIUM | Bearer-token comparison is not timing-safe (cron + PriceLabs) | 2 |
| 4 | 🟡 MEDIUM | Contact form leaks internal error details to client in dev mode | 1 |

**Total:** 6 file edits, approximately +52/−16 lines. No new dependencies. No schema changes. No environment variable changes.

**Out of scope for this pass — do NOT touch:**

- Zod input validation (Finding #3 in the audit)
- Rate limiting / Upstash setup (Finding #4)
- OAuth callback open-redirect fix (Finding #7)
- File upload MIME hardening (Finding #8)
- Guest dashboard email-as-identity rewrite (Finding #9)
- RLS policy SQL (Finding #12) — this lives in Supabase, not the repo
- Any "while I'm here" cleanups, formatting changes, import reordering, or unrelated refactors

If you find the `OLD CODE` block does not match the file exactly, **stop and report the mismatch**. Do not improvise the fix.

---

## 1. Pre-flight

Run these commands first. Confirm the working tree is clean and you are on `main` before making any changes.

```bash
git status
git checkout main
git pull origin main
git checkout -b security/critical-fixes-pass-1
```

`git status` must report `nothing to commit, working tree clean`. If it does not, stop and ask the user how to proceed (likely `git stash`, then resume).

---

## 2. Task 1 — Enforce admin role in dashboard layout (Finding #1, CRITICAL)

### Background

The Next.js middleware in `src/lib/supabase/middleware.ts` only checks whether a user is logged in for `/admin/*` paths. It does not check `profile.role === 'admin'`. Two admin pages (`webhooks/page.tsx` and `properties/[id]/page.tsx`) do not call `requireAdminPage()` on their own. Result: any guest who registers at `/register` can reach `/admin/webhooks` and view recent Stripe checkout sessions including guest emails, payment intent IDs, and confirmation codes.

The fix is to add the role check to the `(dashboard)` route-group layout. Because every page under `admin/(dashboard)/` inherits this layout — including the client-component `properties/[id]/page.tsx` that cannot enforce server-side auth on its own — a single change covers all six dashboard pages at once.

### File: `src/app/admin/(dashboard)/layout.tsx`

**FIND THIS EXACT CONTENT** (the entire file):

```tsx
import { AdminShell } from "@/components/layout/admin-shell";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
```

**REPLACE WITH:**

```tsx
import { AdminShell } from "@/components/layout/admin-shell";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Security: enforce admin role for every page under /admin/(dashboard).
  // Without this, the middleware only checks "is logged in" — any authenticated
  // guest could otherwise reach /admin/webhooks, /admin/properties/[id], etc.
  // See security audit Finding #1 (CWE-285, CWE-862).
  await requireAdminPage();
  return <AdminShell>{children}</AdminShell>;
}
```

### Commit

```bash
git add src/app/admin/\(dashboard\)/layout.tsx
git commit -m "fix(admin): enforce admin role in dashboard layout

Closes a critical authorization gap where the middleware only checked
'is the user logged in' for /admin/* paths, never the role. Combined
with two pages (webhooks, properties/[id]) that did not call
requireAdminPage() on their own, this meant any authenticated guest who
registered at /register could browse to /admin/webhooks and view recent
Stripe checkout sessions including guest emails, payment intent IDs,
and confirmation codes.

Adding the check to the (dashboard) route-group layout protects every
page inside it in one place, including the client-component
properties/[id] page that cannot enforce server-side auth on its own.

Refs: security audit Finding #1
CWE-285 (Improper Authorization), CWE-862 (Missing Authorization)"
```

---

## 3. Task 2 — Strip PII from `/api/stripe/session` (Finding #2, HIGH)

### Background

`GET /api/stripe/session?session_id=...` is unauthenticated and currently returns `customerEmail` plus the entire Stripe `metadata` bag, which includes `firstName`, `lastName`, `email`, `phone`, `specialRequests`, and `arrivalTime`. Stripe checkout session IDs leak through `success_url`, browser history, `Referer` headers, and server access logs, so this is a realistic PII exposure that an attacker could use to harvest guest contact details.

The booking success page (`src/app/properties/[slug]/book/success/success-content.tsx`) only consumes these fields from the response:

- Top level: `id`, `paymentStatus`, `amountTotal`, `currency`, `confirmationCode`, `guestContractPdfUrl`
- From metadata: `propertySlug`, `propertyName`, `propertyImage`, `numGuests`, `checkIn`, `checkOut`

It does **not** read `customerEmail`, `firstName`, `lastName`, `email`, `phone`, `specialRequests`, or `arrivalTime`. These have been verified by grep — do not re-verify, just trust this list and apply the allow-list below.

This task touches **two files**: the API route, and the success page's TypeScript interface.

### File 2a: `src/app/api/stripe/session/route.ts`

**FIND THIS EXACT CONTENT:**

```ts
    return NextResponse.json({
      id: session.id,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      metadata: session.metadata ?? {},
      confirmationCode,
      guestContractPdfUrl,
    });
```

**REPLACE WITH:**

```ts
    return NextResponse.json({
      id: session.id,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      // Security: do NOT return customerEmail, customer_details, or the full
      // metadata bag. This endpoint is unauthenticated — anyone with a session
      // ID (which appears in success_url, browser history, Referer headers,
      // server logs) could otherwise read the guest's full PII. We allow-list
      // only the fields the success page needs to render the reservation card.
      // See security audit Finding #2 (CWE-639).
      metadata: {
        propertySlug: session.metadata?.propertySlug ?? "",
        propertyName: session.metadata?.propertyName ?? "",
        propertyImage: session.metadata?.propertyImage ?? "",
        numGuests: session.metadata?.numGuests ?? "",
        checkIn: session.metadata?.checkIn ?? "",
        checkOut: session.metadata?.checkOut ?? "",
      },
      confirmationCode,
      guestContractPdfUrl,
    });
```

### File 2b: `src/app/properties/[slug]/book/success/success-content.tsx`

**FIND THIS EXACT CONTENT:**

```ts
interface SessionData {
  id: string;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
  metadata: Record<string, string>;
  confirmationCode: string | null;
  /** Rental agreement PDF URL when configured for this property (from database). */
  guestContractPdfUrl?: string | null;
}
```

**REPLACE WITH:**

```ts
interface SessionData {
  id: string;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  // customerEmail intentionally removed — see /api/stripe/session route and
  // security audit Finding #2. PII is no longer returned by the public endpoint.
  metadata: Record<string, string>;
  confirmationCode: string | null;
  /** Rental agreement PDF URL when configured for this property (from database). */
  guestContractPdfUrl?: string | null;
}
```

### Verification before committing

Run this grep to confirm no other code in the repo reads `customerEmail` from this endpoint. The only matches should be the comments in the two files you just edited.

```bash
grep -rn "customerEmail" src --include="*.ts" --include="*.tsx"
```

Expected output (exactly two lines, both comments):

```
src/app/properties/[slug]/book/success/success-content.tsx: ... customerEmail intentionally removed ...
src/app/api/stripe/session/route.ts: ... do NOT return customerEmail ...
```

If you find any other consumer, **stop and report it** — do not delete that consumer or "fix" it.

### Commit

```bash
git add src/app/api/stripe/session/route.ts src/app/properties/\[slug\]/book/success/success-content.tsx
git commit -m "fix(api/stripe): remove PII from public session endpoint

The /api/stripe/session endpoint is unauthenticated — anyone with a
session ID could read the customer's email and the entire metadata bag
including first name, last name, phone, special requests, and arrival
time. Stripe session IDs leak via success_url, browser history, Referer
headers, and server access logs, so this was a realistic PII exposure.

Now the endpoint returns only:
  - id, paymentStatus, amountTotal, currency
  - confirmationCode, guestContractPdfUrl
  - metadata (allow-listed): propertySlug, propertyName, propertyImage,
    numGuests, checkIn, checkOut

The success page consumes exactly these fields, so the booking
confirmation flow is unchanged. customerEmail and the PII metadata
fields (firstName, lastName, email, phone, specialRequests,
arrivalTime) are no longer reachable from this endpoint.

Note: dates + property name + guest count are still mildly sensitive
in aggregate. The proper long-term fix is to bind this endpoint to a
Supabase session or a short-lived signed cookie set during checkout.
Tracked as a follow-up.

Refs: security audit Finding #2
CWE-639 (Authorization Bypass Through User-Controlled Key)"
```

---

## 4. Task 3 — Timing-safe bearer-token comparison (Finding #5, MEDIUM)

### Background

The cron and PriceLabs webhook endpoints compare bearer tokens with plain string equality (`===` / `!==`), which short-circuits at the first mismatched byte and leaks the secret one character at a time via response timing. Real-world exploitability over Vercel + network jitter is hard, but the fix is trivial and removes the bug class entirely.

Replace string comparison with `crypto.timingSafeEqual` on equal-length buffers in **both** files.

### File 3a: `src/app/api/cron/ical-sync/route.ts`

**FIND THIS EXACT CONTENT:**

```ts
import { NextResponse } from 'next/server';
import { syncAllFeeds } from '@/lib/ical/sync';

function assertCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}
```

**REPLACE WITH:**

```ts
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { syncAllFeeds } from '@/lib/ical/sync';

function assertCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  // Security: constant-time comparison to avoid leaking the secret one byte
  // at a time via response timing. See security audit Finding #5 (CWE-208).
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  const actual = Buffer.from(authHeader, 'utf8');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
```

### File 3b: `src/app/api/integrations/pricelabs/rates/route.ts`

This file needs **two edits** — one to add the helper at the top, one to replace the comparison in the `POST` handler.

**Edit 1 of 2 — FIND THIS EXACT CONTENT:**

```ts
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { parseRatesFromUnknownPayload } from "@/lib/pricelabs/parse-rates";
import { upsertPriceLabsNightlyRates } from "@/lib/pricelabs/sync-rates";
```

**REPLACE WITH:**

```ts
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { parseRatesFromUnknownPayload } from "@/lib/pricelabs/parse-rates";
import { upsertPriceLabsNightlyRates } from "@/lib/pricelabs/sync-rates";

/**
 * Constant-time bearer-token comparison to avoid leaking the secret via
 * response-time differences. See security audit Finding #5 (CWE-208).
 */
function bearerTokenMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

**Edit 2 of 2 — FIND THIS EXACT CONTENT** (in the `POST` handler):

```ts
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
```

**REPLACE WITH:**

```ts
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!bearerTokenMatches(token, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
```

### Commit

```bash
git add src/app/api/cron/ical-sync/route.ts src/app/api/integrations/pricelabs/rates/route.ts
git commit -m "fix(api): use timing-safe comparison for bearer-token secrets

The cron and PriceLabs webhook endpoints compared bearer tokens with
plain-string equality (=== or !==), which short-circuits at the first
mismatched byte and leaks the secret one character at a time via
response-time differences. Replaced with crypto.timingSafeEqual on
equal-length buffers in both routes.

Real-world exploitability over Vercel + jitter is hard, but the fix is
trivial and removes the class of bug entirely.

Refs: security audit Finding #5
CWE-208 (Observable Timing Discrepancy)"
```

---

## 5. Task 4 — Stop echoing internal errors from contact form (Finding #6, MEDIUM)

### Background

The contact form's `catch` block returns `error.message` to the HTTP client when `NODE_ENV === 'development'`. Resend errors include API-key prefixes, `EMAIL_FROM` domain verification state, and other backend metadata that should never reach an HTTP response. A misconfigured preview deployment could expose this in non-dev environments too.

Always return the same generic message; details continue to be logged server-side via `console.error`.

**Important:** Do NOT delete the `isDev` constant at the top of the file. It is still used elsewhere (the dev-mode warn block when Resend is not configured). Leave it in place.

### File: `src/app/api/contact/route.ts`

**FIND THIS EXACT CONTENT:**

```ts
  } catch (error) {
    console.error("Contact form error:", error);
    const messageText =
      error instanceof Error ? error.message : "Unknown error";
    const resendHint =
      "Verify RESEND_API_KEY and that EMAIL_FROM uses an address on a domain verified at resend.com/domains.";
    return NextResponse.json(
      {
        error: isDev
          ? messageText
          : "Failed to send message. Please try again or email us directly.",
        hint: isDev
          ? resendHint
          : `If this keeps happening, email us at ${CONTACT_FORM_INBOX_EMAIL}.`,
      },
      { status: 500 },
    );
  }
}
```

**REPLACE WITH:**

```ts
  } catch (error) {
    // Security: log details server-side, but never echo error.message to the
    // client — even in dev mode. Resend errors can include API-key prefixes,
    // domain verification state, and other backend metadata.
    // See security audit Finding #6 (CWE-209).
    console.error("Contact form error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to send message. Please try again or email us directly.",
        hint: `If this keeps happening, email us at ${CONTACT_FORM_INBOX_EMAIL}.`,
      },
      { status: 500 },
    );
  }
}
```

### Verification before committing

Confirm `isDev` is still defined and used elsewhere in the file (it must be — do not delete it):

```bash
grep -n "isDev" src/app/api/contact/route.ts
```

Expected: at least two matches (the `const isDev = ...` definition and the `if (isDev) {` check in the Resend-not-configured branch).

### Commit

```bash
git add src/app/api/contact/route.ts
git commit -m "fix(api/contact): never echo internal error details to client

The contact form's catch block returned error.message to the client
when NODE_ENV === 'development'. Resend errors include API-key
prefixes, EMAIL_FROM domain verification state, and other backend
metadata that should never reach an HTTP response — and a misconfigured
preview deployment could expose this in non-dev environments too.

Now all error paths return the same generic message; details continue
to be logged server-side via console.error.

Refs: security audit Finding #6
CWE-209 (Generation of Error Message Containing Sensitive Information)"
```

---

## 6. Verification

After all four tasks are committed, run these checks **in order**. Report results for each.

### 6.1 Commit history

```bash
git log main..HEAD --oneline
```

Expected output (4 lines, in this order — most recent first; SHAs will differ):

```
<sha> fix(api/contact): never echo internal error details to client
<sha> fix(api): use timing-safe comparison for bearer-token secrets
<sha> fix(api/stripe): remove PII from public session endpoint
<sha> fix(admin): enforce admin role in dashboard layout
```

### 6.2 Diff stat

```bash
git diff main..HEAD --stat
```

Expected: 6 files changed, approximately +52 / −16 lines. The six files must be exactly:

- `src/app/admin/(dashboard)/layout.tsx`
- `src/app/api/contact/route.ts`
- `src/app/api/cron/ical-sync/route.ts`
- `src/app/api/integrations/pricelabs/rates/route.ts`
- `src/app/api/stripe/session/route.ts`
- `src/app/properties/[slug]/book/success/success-content.tsx`

If any other file appears in the diff, **stop and report it** — something went wrong.

### 6.3 Type check and build

```bash
pnpm install   # only if node_modules is missing or stale
pnpm build
```

`pnpm build` must succeed with no TypeScript errors. If it fails, the most likely cause is one of:

- An unused import warning (probably the existing `isDev` if you accidentally removed its other usage — don't, it should still be there)
- A type mismatch on the `SessionData` interface in `success-content.tsx` (verify Task 2b was applied correctly)

If `pnpm build` fails, **report the full error output and stop**. Do not try to "fix" it by changing other files. Roll back the failing commit with `git reset --hard HEAD~1` only if the user instructs you to.

### 6.4 Lint

```bash
pnpm lint
```

Should pass with no new errors. Pre-existing warnings unrelated to the touched files are acceptable.

### 6.5 Spot-check the four behavioral changes

These are quick `grep` checks to confirm the intended changes are present:

```bash
# Task 1: admin layout now async and calls requireAdminPage
grep -A1 "AdminDashboardLayout" src/app/admin/\(dashboard\)/layout.tsx | grep "requireAdminPage"

# Task 2a: stripe session route no longer returns customerEmail
! grep "customerEmail: session" src/app/api/stripe/session/route.ts

# Task 3: both routes import timingSafeEqual
grep -l "timingSafeEqual" src/app/api/cron/ical-sync/route.ts src/app/api/integrations/pricelabs/rates/route.ts | wc -l
# Expected output: 2

# Task 4: contact route no longer returns messageText
! grep "messageText" src/app/api/contact/route.ts
```

All four checks should succeed. The `!` prefixes invert the grep — they pass when the bad pattern is absent.

---

## 7. Push and open PR

**Only after §6 verification fully passes**, push and open a PR:

```bash
git push -u origin security/critical-fixes-pass-1
```

Then on GitHub, open a pull request from `security/critical-fixes-pass-1` to `main`. Use this PR description:

> Critical and quick-win security fixes from audit pass 1.
>
> - **#1 (CRITICAL)** — `requireAdminPage()` in dashboard layout. Closes auth bypass where any logged-in guest could reach `/admin/webhooks`, `/admin/properties/[id]`, etc.
> - **#2 (HIGH)** — Strip `customerEmail` and PII metadata from `/api/stripe/session`. Booking success page still works (verified — only the curated allow-list is consumed).
> - **#5 (MEDIUM)** — `crypto.timingSafeEqual` for cron and PriceLabs bearer tokens.
> - **#6 (MEDIUM)** — Stop echoing `error.message` from `/api/contact`.
>
> No new dependencies, no schema changes, no env-var changes. 6 files, +52/−16. Verified locally with `pnpm build` and `pnpm lint`.
>
> Follow-ups not in this PR: input validation with Zod (#3), rate limiting (#4), open-redirect fix (#7), file-upload MIME hardening (#8), email-as-identity-key fix (#9), and RLS verification on core tables (#12).

---

## 8. What this document does NOT do

Do not perform any of these as part of executing this document. They are tracked separately and require their own review:

1. Add Zod schemas to API routes (Finding #3)
2. Add Upstash rate limiting (Finding #4)
3. Add `safeInternalPath` helper for OAuth callback (Finding #7)
4. Magic-byte verification for image uploads, block SVG (Finding #8)
5. Migrate booking ownership from email-match to `user_id` (Finding #9)
6. Run `pg_tables` / `pg_policies` queries against Supabase (Finding #12) — this is a manual step the human user must do in the Supabase dashboard, not in code
7. Enable email confirmation in Supabase Auth — also a manual dashboard step
8. Update `drizzle-kit` to remove the moderate `esbuild` advisory (Finding #11)

If the user asks for any of these after the four tasks above are merged, treat it as a separate work item and request a new task document.

---

## 9. Done checklist

When you have finished, report back with this checklist filled in:

- [ ] Pre-flight passed (clean main, branch created)
- [ ] Task 1 applied and committed
- [ ] Task 2a applied
- [ ] Task 2b applied
- [ ] Task 2 grep verification passed
- [ ] Task 2 committed
- [ ] Task 3a applied
- [ ] Task 3b edits 1 and 2 applied
- [ ] Task 3 committed
- [ ] Task 4 applied
- [ ] Task 4 `isDev` verification passed
- [ ] Task 4 committed
- [ ] §6.1 commit history verified (4 commits in correct order)
- [ ] §6.2 diff stat verified (6 files, no extras)
- [ ] §6.3 `pnpm build` passed
- [ ] §6.4 `pnpm lint` passed
- [ ] §6.5 spot-checks passed
- [ ] Branch pushed to origin
- [ ] PR opened with description from §7

If any item is unchecked, report which one and why before stopping.
