# Increment 1: reservation integrity

Implemented locally on `codex/reservation-integrity`, based on GitHub
`security/fixes-pass-3` at `7f2b031`. The database migration was applied to the
connected Supabase database on October 29, 2026 after explicit user approval.
No live payments, emails, lock operations, or reservation-data edits were performed.

## Behavior

- Only the signature-verified Stripe webhook can create paid reservations. The
  unused public mock-payment Server Action was removed.
- Checkout validates actual calendar dates and active property capacity. The
  webhook handles paid completion and delayed-payment success; unpaid completion
  does not create a booking. Before finalizing, it retrieves the current payment
  and expanded charge, rejecting unpaid/unverifiable payments and acknowledging
  already-refunded payments without creating a reservation.
- `src/lib/booking/reserve.ts` uses a PostgreSQL transaction, a payment-specific
  advisory lock, and a property row lock. It rechecks overlapping reservations,
  local blocks and imported iCal nights before creating the guest, booking and
  nightly blocks. A failed write rolls back all of them, including trigger effects.
  Adjacent stays are allowed because checkout is exclusive.
- Repeated payment events return the existing booking without inserting another
  booking or repeating fulfillment. Guest insertion tolerates simultaneous
  reservations for different properties. Quotes retain the charged accommodation
  and cleaning-fee snapshots; finalization does not recalculate today's price.
- PriceLabs refreshes may update prices on occupied nights, but retain booked
  status/source and non-PriceLabs blocks. Rate-only webhooks do not change status.
- The confirmation page requires both a confirmed reservation and paid status.
  It makes at most 12 status requests, spaced 2.5 seconds apart, with a 5-second
  timeout per request. It then displays host contact details and a payment
  reference if confirmation is unresolved. Cancellation/refund states do not
  display a confirmation code. Requests stop on navigation/unmount.

## Database inspection and migration

Read-only inspection on October 29, 2026 found:

- A unique `(property_id, date)` constraint already exists on `availability`.
- An AFTER INSERT booking trigger already blocks nights atomically with its
  booking insert. It overwrites conflicting nights and does not reject overlaps.
- Guest-count and cancellation-release triggers also exist outside the ORM schema.
- No unique payment-intent index or reservation overlap constraint existed.
- Preflight found **0 duplicate payment-intent groups and 0 overlapping pairs**
  among non-cancelled reservations. These are point-in-time results.

Applied migration: `supabase/migrations/20261029120000_reservation_integrity.sql`.
It has been tested on a disposable PostgreSQL 16 database, including repeat
application. **Applied successfully to the connected Supabase database on
October 29, 2026.** Catalog verification confirmed the overlap constraint is
validated and both payment-intent and property/date indexes are unique and valid.
The local `st-pete-oasis` property page returned HTTP 200 without a database query
error afterward. Application deployment remains pending; review and merge the
`codex/reservation-integrity` branch before deploying.

The migration installs `btree_gist`, a unique payment-intent index, and an exclusion
constraint preventing overlapping non-cancelled stays, including writes outside
the application service. It preserves all existing data and blocking triggers.
It aborts if existing duplicate payments or overlaps need reconciliation.

For other environments, review the SQL and run it using the database owner's migration
connection during a quiet window. It takes a table lock while checking and adding
constraints. Keep the existing backup/restore process available. Do not delete
reservations to force the migration through; reconcile any reported conflicts
with the host and Stripe first. Deploy the application change with this migration.
Application locks also work before migration, but database-wide enforcement
requires the migration.

## Payment and fulfillment recovery

Payment and reservation are distinct: checkout does not hold inventory while a
guest pays. Two guests can pay for competing dates, but only one reservation can
commit. This increment prevents double booking; it does not implement inventory
holds or automatic refunds.

1. If reservation creation fails, the webhook returns a non-success response and
   logs `booking_finalization_failed` with event/payment IDs and a reason, without
   guest details. A transient database failure can be retried/replayed. Find the
   failed event in Stripe's webhook delivery dashboard and check for a booking
   with that payment-intent ID before taking action.
2. For `reservation_conflict`, the host must reconcile the paid but unreserved
   stay: arrange an alternative with the guest or refund the payment in Stripe.
   Do not charge the guest again or override occupied nights. Replayed historical
   events check current refund status and will not create a new booking after a
   full or partial refund. Refunds of already-created bookings still require the
   existing administrative cancellation/reconciliation workflow.
3. Email and Seam calls happen only after the transaction commits. Provider
   failures do not undo a reservation. Each failed email recipient is logged as
   `guest_email` or `host_email`; template errors use `email_template`. Unexpected
   lock failures use `seam`; the existing Seam helper also records provider errors
   in the booking's `seam_access_error` field.
4. Fulfillment is attempted once per new reservation, not once per webhook.
   Duplicate webhooks deliberately do not resend email or create another lock
   code. For missing access codes, inspect the existing admin Seam retry action
   and provider state before retrying. For missing email, check the provider's
   delivery history and manually send only the missing message.
5. A process crash after commit can leave fulfillment incomplete without an
   error log. Reconcile confirmed reservations with provider delivery records.
   There is no durable fulfillment queue in this increment; automated delivery
   retries and scheduled guest messages remain a later increment.

Monitor failed webhook deliveries and fulfillment logs during rollout. The
confirmation screen offers recovery guidance but is not an operations alerting
system. Refunds and reservation commits cannot be made atomic across Stripe and
PostgreSQL; staff must not refund concurrently with a finalization retry.
External-channel bookings remain subject to the documented iCal refresh delay.

## Reproduce the tests

Verified October 29, 2026:

- 57 unit/security/date tests passed.
- 24 isolated integration tests passed with the browser bridge enabled.
- Six additional browser confirmation scenarios passed.
- The changed application files passed targeted lint without warnings.
- TypeScript validation and the full Next.js production build passed. The build
  reported five existing warnings in unchanged files (images, a hook dependency,
  and an unused variable).
- Graphify was refreshed and the new reservation-service relationships checked.
  Its two previously known TSX extraction gaps remain.

Use Node 24 (the tested runtime) and pnpm 10. The exact PostgreSQL test runtime is pinned in the
lockfile. Its platform package's build script is allow-listed in `package.json`.
The fixture creates a random-password PostgreSQL cluster bound to loopback in a
new temporary directory and stops/removes it afterward. It never loads `.env`
or uses `DATABASE_URL`. Do not run it as root on Linux.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:booking
pnpm exec tsc --noEmit
```

`pnpm test` covers the existing security/unit cases and calendar boundaries.
`pnpm test:booking` covers concurrency, duplicates, rollback, legacy triggers,
database constraints, pricing sync, actual Stripe signature verification, delayed
payments, refund/retry recovery, fulfillment failures, and the status API.
The browser-bridge test is skipped in this command because it needs a running app.

For browser checks, start `pnpm dev` in one terminal, then:

```sh
pnpm test:booking:browser
```

It defaults to `http://127.0.0.1:3000`; `BOOKING_BROWSER_URL` can override this to
another loopback address. It uses installed Playwright Chromium, or Edge on
Windows if Chromium is absent (`PLAYWRIGHT_CHANNEL` can override the browser).
Install Chromium with `pnpm exec playwright install chromium` if needed.

Six UI scenarios cover pending-to-confirmed, bounded pending recovery,
cancellation, temporary errors, delayed payments and missing references. The
same command then runs the database suite with an additional browser flow:
browser checkout API -> server-calculated quote -> simulated paid Stripe session
-> real signed webhook validation -> real isolated PostgreSQL commit -> browser
confirmation. Stripe transport, email and lock operations are replaced by test
doubles; the actual route handlers and database transaction run. This does not
exercise Stripe's hosted card-entry UI or prove live email/lock delivery.

The browser tests block outbound browser services and route booking API calls
to either fixtures or the isolated handlers. The app server serves the UI and
may perform its normal read-only rendering; no real booking endpoints are posted
to it. Real Stripe test-mode account configuration is a separate deployment check.
