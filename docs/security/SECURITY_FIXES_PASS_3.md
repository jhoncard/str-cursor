# Security Fixes — Pass 3

> **Note on format:** `SECURITY_FIXES_PASS_1.md` and
> `SECURITY_FIXES_PASS_2.md` are *forward-looking task documents* —
> instructions written to be executed by an agent. This one is a
> **record of fixes already applied**. Nothing here is left to do
> except the items explicitly listed as deferred in §4.

Remediates the findings raised in
[`SECURITY_AUDIT_PASS_3.md`](SECURITY_AUDIT_PASS_3.md).

---

## 0. Scope

The Pass 3 audit raised six findings. Two were closed by commit
`ba5104a` at the time the audit was written; the audit document itself
was committed in that same change, which is why the repository briefly
contained an audit with no matching fixes document.

| # | Sev | Finding | Status |
|---|-----|---------|--------|
| 13 | 🟡 MEDIUM | SSRF in admin iCal feed fetcher | ✅ Fixed here |
| 14 | 🟡 MEDIUM | Confirmation codes leaked via public iCal export | ✅ Fixed here |
| 15 | 🟢 LOW | Quote endpoint booking-existence oracle | ✅ Fixed in `ba5104a` |
| 16 | 🟢 LOW | Admin actions rethrow raw Supabase `error.message` | ✅ Fixed here |
| 17 | 🟢 LOW | iCal feed fetch has no body-size cap or timeout | ✅ Fixed here |
| 18 | ℹ️ INFO | Guest rental-agreement PDFs in a public bucket | ⏭️ Deferred — see §4 |

Also removed in `ba5104a`: the phone-derived door-code helper
(`src/lib/phone-to-code.ts`). Seam provisioning now uses random
server-generated codes only.

---

## 1. Finding #14 — Confirmation codes leaked via public iCal export

**File:** `src/app/api/ical/export/[token]/route.ts`

`/api/ical/export/[token]` is public and unauthenticated. It embedded
the booking `confirmationCode` into every event `SUMMARY`, so the codes
travelled anywhere the export URL travelled — channel-manager logs,
third-party iCal aggregators, support tickets.

`SUMMARY` is now the literal string `"Booked"`. `confirmationCode` was
also dropped from the `SELECT` list so it cannot be reintroduced by a
later edit without deliberately adding the column back.

Channel managers need only the dates and a stable `UID`; the
human-readable summary contributed nothing.

---

## 2. Findings #13 and #17 — iCal feed fetching

**New files:** `src/lib/ical/safe-feed-url.ts`,
`src/lib/ical/fetch-feed.ts`
**Edited:** `src/app/admin/actions.ts`, `src/lib/ical/sync.ts`

### #13 — SSRF (CWE-918)

`addPropertyIcalFeed()` accepted an arbitrary URL from an admin and
fetched it server-side with no scheme, host, or address filtering.

`assertSafeFeedUrl()` now permits `https:` only, and rejects
`localhost`, `0.0.0.0`, `::1`, any `*.local` host, `127.0.0.0/8`,
`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, and `169.254.0.0/16`
(which covers the cloud metadata endpoint).

It is applied at **three** call sites:

| Call site | Why |
|---|---|
| `addPropertyIcalFeed` | Rejects before a row is written, so a bad feed never reaches the database |
| `syncFeedBlockedDates` | Admin-triggered re-sync |
| `syncIcalFeed` (`lib/ical/sync.ts`) | The daily cron path |

> **The audit named only `admin/actions.ts`.** `lib/ical/sync.ts` is a
> second, separate fetch site, and it is the one the Vercel cron uses
> to fetch *every stored feed*. Guarding only the admin path would have
> left the cron exploitable, and any malicious feed added before this
> change would have continued to be fetched on every run. Validating at
> fetch time — not only at insert time — is what covers pre-existing
> rows.

### #17 — Unbounded fetch (CWE-770)

`fetchIcsText()` replaces the two duplicated inline fetches with a
single guarded helper:

- **10s wall-clock timeout** via `AbortSignal.timeout()`
- **5 MB response cap**, enforced both on the `content-length` header
  and while streaming, so a malicious feed cannot OOM the function
- **Manual redirect following**, max 3 hops

> **The redirect handling is not in the audit text, and #13 does not
> hold without it.** With `fetch`'s default `redirect: 'follow'`, a
> feed hosted on a perfectly legitimate host can respond `302` to
> `http://169.254.169.254/` — only the *first* URL would ever be
> validated. Following redirects manually and re-applying the guard to
> every hop is what closes that bypass.

---

## 3. Finding #16 — Admin actions rethrow raw Supabase errors

**File:** `src/app/admin/actions.ts`

Every Supabase call followed the pattern
`if (error) throw new Error(error.message)`. Supabase error messages
carry SQL fragments, RLS policy names, column names and constraint
identifiers, all shipped to the admin browser via React Server Action
error serialization.

All **17** sites now follow:

```ts
if (error) {
  console.error("[admin] <context> failed:", error);
  throw new Error("<generic, action-specific message>");
}
```

The messages differ per action so the admin UI stays useful
("Could not upload the image", "Could not delete the calendar feed",
and so on). The `23505` duplicate-feed branch keeps its existing
user-facing text, which is intentional and not an internal detail.

---

## 4. Deferred and residual

### #18 — Guest PDFs in a public bucket (INFORMATIONAL)

**Not fixed. Deferred on the audit's own advice:** *"Today this is
fine… ~30 minutes when you actually need it."*

The rental agreement is currently a generic property-level template,
not a per-guest signed document, and its path includes a random UUID.
The finding becomes real the moment the flow stores **signed per-guest
contracts** containing names, signatures and addresses.

When that happens: create a `private-documents` bucket with no public
read policy, and serve through a Server Action that signs a short-lived
URL after `requireAdmin()` (or after verifying the requesting guest
owns the booking). This requires creating the bucket in the Supabase
dashboard.

### DNS rebinding is not covered

`assertSafeFeedUrl()` validates the **literal host** in the URL. It
does not resolve DNS, so a hostname that resolves to a private address
is not caught. Closing that requires resolving and checking the address
at connect time. Documented in the module header.

### RLS still unverified from this checkout

Unchanged from the audit: RLS for `bookings`, `guests`, `profiles` and
`availability` is not in `supabase/` in this repository and could not
be verified. Confirm in the Supabase dashboard.

---

## 5. Verification

A test runner was added as part of this pass
(see [`../features/VITEST_SETUP.md`](../features/VITEST_SETUP.md)) and
the checks used to verify these fixes were ported into it.

```bash
pnpm test          # 51 passed across 3 files
pnpm exec tsc --noEmit
pnpm exec eslint .
```

`src/lib/ical/safe-feed-url.test.ts` and
`src/lib/ical/fetch-feed.test.ts` cover the attack cases directly:
cloud metadata, loopback (v4 and v6), all three RFC1918 ranges,
`.local`, redirect-into-blocked-host, redirect loops, oversized bodies
(both declared and streamed), and timeouts.

They also assert the **boundary** cases — `11.0.0.1`, `172.32.0.1`,
`192.169.0.1`, `169.255.0.1`, `localhost.example.com` — so that a
future tightening of the ranges cannot silently over-match and start
blocking legitimate OTA feeds.
