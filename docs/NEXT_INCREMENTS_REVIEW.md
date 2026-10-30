# Next increments review

Reviewed October 29, 2026 against `security/fixes-pass-3`, commit `7f2b031`.

Implementation update: increment 1 is implemented locally on
`codex/reservation-integrity`; see [verification and rollout notes](RESERVATION_INTEGRITY.md).
The tested database migration was applied to Supabase with user approval on
October 29, 2026; the constraints and local property page were verified afterward.
Application deployment remains pending review and merge of `codex/reservation-integrity`.
The evidence below records the original review. Subsequent read-only inspection
found an existing nightly-blocking trigger, but no overlap or payment uniqueness
guard; the implementation and tests account for that trigger.

## Basis and limits

Used Graphify's existing code graph to locate booking, payment, availability,
pricing, email, confirmation, and dashboard relationships, then inspected the
source alongside `plan-cc.md`, `docs/README.md`, and the Pass 3 security record.
The graph is code-only: this review reads documentation separately rather than
claiming it has been indexed. Two known TSX extraction gaps remain in the home
page and property modal. Graph links support navigation, not proof that a feature
is complete or absent.

The local database connection and `st-pete-oasis` property page were successfully
checked earlier in this session. This review also ran the existing suite:
51 tests pass across three files; TypeScript validation passes. Those tests cover
safe redirects and iCal URL/fetch protections, not the complete reservation flow.
No payments, emails, lock changes, migrations, or production operations were
performed for this review. Live database constraints and RLS policies were not
audited. Effort below is relative scope, not a delivery estimate.

## Reconcile the roadmap first

The unchecked boxes in `plan-cc.md` are not a reliable completion inventory.
These capabilities already have implementations:

| Roadmap item | Evidence | Classification |
| --- | --- | --- |
| Dynamic nightly prices | `src/lib/pricelabs/sync-rates.ts`, `src/lib/pricing/stay-quote.ts`, `src/lib/pricing/calendar-nightly-prices.ts` | Partial: nightly overrides exist; minimum-stay enforcement remains a gap |
| Transactional email | `src/lib/email/index.ts`, confirmation and host templates, calls in `src/app/actions/booking.ts` | Implemented in code; delivery configuration and live behavior need separate verification |
| Admin dashboard | `src/app/admin/(dashboard)/` | Exists; individual management features need separate assessment |
| Guest portal | `src/app/dashboard/page.tsx` | Partial: upcoming/past reservation display exists; full rebooking is not established by this review |
| Calendar import/export | `src/lib/ical/sync.ts`, `src/app/api/ical/export/[token]/route.ts` | Exists; external channel setup and refresh timing are not verified |
| Unit-test foundation | `vitest.config.ts`, three passing test files | Complete foundation; business-flow coverage remains limited |

Before implementation, update roadmap statuses to implemented, partial, pending,
or intentionally deferred, citing the current sources. Do not execute old
find/replace task documents without reconciling them with this branch.

## Recommended sequence

### 1. Reservation integrity and booking-flow verification

**Priority: highest. Relative effort: large; split into focused changes.**

Documentation basis: Phase 1 steps 6, 7, and 12 require booking creation,
availability updates, truthful confirmation, and complete booking-flow tests.

Evidence:

- Graphify connects `finalizeBookingFromStripe()` at
  `src/app/actions/booking.ts:137` to the Stripe webhook, availability checks,
  nightly blocking, smart-lock provisioning, and guest/host email.
- The implementation checks availability, inserts the reservation, and updates
  nights through separate operations. The code does not establish an atomic
  reservation boundary. Concurrent booking behavior needs database-backed tests;
  it was not reproduced against the live database.
- `src/lib/pricelabs/sync-rates.ts:78` updates an existing night's status to
  `available` or `blocked` and source to `pricelabs`, including when the existing
  row represents a direct booking. This can erase the booked status that the
  availability lookup relies on.
- `src/app/properties/[slug]/book/success/success-content.tsx:111` displays
  "Booking Confirmed!" for a paid session even when a confirmation code has not
  arrived. The component fetches session status once.

Proposed slices:

1. Inspect actual database constraints and add isolated integration tests for
   concurrent overlapping stays, duplicate payment events, and failed writes.
2. Make reservation creation and nightly blocking atomic, with database-backed
   uniqueness/locking as appropriate. Keep external email/lock calls outside
   database transactions and define retry/recovery behavior explicitly.
3. Preserve direct bookings and manual blocks during pricing sync; test sync
   against occupied nights.
4. Distinguish payment received from reservation confirmed, with bounded status
   refresh and a useful recovery path. Add the documented browser booking test
   using test-mode services and an isolated database.

Completion check: two overlapping requests cannot both confirm; duplicate payment
events do not create duplicate reservations; a failed write cannot leave a partial
confirmed reservation; pricing sync cannot reopen occupied nights; the success
screen reflects the actual reservation state. Document what happens to a payment
if a reservation cannot be finalized.

### 2. Complete minimum-stay rules

**Priority: high. Relative effort: medium. Depends on increment 1's test foundation.**

Documentation basis: Phase 2 dynamic pricing explicitly includes min-night rules.

Evidence: `src/lib/db/schema.ts:70` stores `availability.minNights`, but the
reviewed accommodation calculator, availability check, quote route, and checkout
path do not enforce it. Nightly pricing is already implemented and should be
extended rather than rebuilt.

Define whether the arrival night's rule or the strictest nightly rule applies.
Use one server-side rule for quote, checkout, and finalization; explain rejected
stays in the date-selection UI.

Completion check: a stay shorter than the configured requirement is rejected
consistently, including direct API requests, while valid stays retain correct
nightly pricing. Cover boundary dates and the agreed rule semantics.

### 3. Add-to-calendar on reservation confirmation

**Priority: next small guest-facing increment. Relative effort: small.**

Documentation basis: Phase 2 explicitly requests add-to-calendar buttons.

Evidence: the inspected confirmation component provides reservation details and
next steps but no guest calendar export. The existing channel iCal export blocks
nights for booking platforms and is a different workflow.

Add a downloadable calendar event, optionally followed by a Google Calendar link,
only after the reservation is confirmed. Use property-local check-in/out times.
Exclude door codes and private agreement URLs from event contents.

Completion check: the event imports with correct dates and times, including
daylight-saving boundaries, and is unavailable for unconfirmed bookings.

### 4. Paid add-ons and pet fees

**Priority: revenue enhancement after booking and pricing integrity. Relative effort: medium to large.**

Documentation basis: Phase 2 lists pool heating, early check-in, and pet-fee upsells.

Evidence: `src/app/actions/booking.ts:206` persists pet fee and add-on totals as
zero. The inspected Stripe checkout builds accommodation, cleaning, and service
fee items but has no selected add-on pricing flow.

Start with one configurable add-on. Calculate charges on the server and preserve
the purchased item and price through payment, reservation, receipt, and admin
display. Early check-in additionally needs an availability/approval policy and
coordination with smart-lock access times.

Completion check: the selected add-on appears consistently in the quote, Stripe
charge, saved reservation, and confirmation; client-supplied prices cannot alter
the charge.

### 5. Scheduled guest communications

**Priority: operational enhancement. Relative effort: medium to large.**

Documentation basis: Phase 2 requests pre-arrival and post-checkout review emails.

Evidence: the current email templates cover booking confirmation, host notification,
and contact submissions. The API route inventory and `vercel.json` show calendar
sync scheduling, not a scheduled guest-message workflow.

Add one pre-arrival message first, with durable delivery status, retries, timezone
handling, and duplicate prevention. Add review requests afterward. Require
verified email configuration and a supported scheduler; do not send from local
review tests.

Completion check: each eligible reservation receives one message at the intended
time; cancelled bookings are excluded, and failures can be retried without
duplicate delivery.

## Parallel operational work and deliberate deferrals

- Phase 2's Sentry monitoring is a useful companion to increment 1. No Sentry
  configuration was found in the inspected file inventory. Choose monitoring
  and alert destinations and redact guest data before enabling it.
- Daily iCal synchronization is explicitly an accepted hosting tradeoff in
  `docs/README.md` and the revised Phase 1 step 8. More frequent syncing depends
  on scheduling/hosting decisions; do not silently restore the historical
  15-minute requirement.
- Private signed-contract storage is conditional: Pass 3 finding 18 deliberately
  defers it while agreements remain generic property templates. Revisit before
  storing guest-specific signed documents.
- DNS rebinding protection and live RLS verification remain documented security
  follow-ups. They deserve separate scoped checks; repository review cannot
  establish the current database policies.

## Suggested first implementation

Start with increment 1, slice 1: inspect database constraints read-only and create
an isolated booking test fixture. Then fix the confirmed pricing-sync overwrite
path and establish the atomic reservation boundary. Advance to minimum-stay rules
after the booking integrity checks pass. This order is a recommendation from the
code review; the original plan does not prescribe this exact sequence.
