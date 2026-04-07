# Feature: Phone-Derived Door Codes with Per-Reservation Time Overrides

> **Instructions for Cursor:** This document defines a feature implementation for `str-cursor` that improves the existing Seam smart-lock integration. Execute the tasks below **in order**, exactly as specified. Do not add scope, refactor surrounding code, or "improve" naming. Each task has explicit `FIND` / `REPLACE WITH` blocks (or `CREATE FILE` blocks for new files). If any `FIND` block does not match a file exactly, **stop and report the mismatch** — do not improvise.

## 0. Goal and scope

Replace the existing random-code generation with phone-derived door codes, widen the access window to ±1 hour (matching Airbnb's behaviour), add per-reservation check-in/out time overrides so admins can grant early check-in or late check-out on individual bookings and have the smart lock update automatically, and migrate from hand-rolled HTTP calls to the official Seam SDK (`seam` npm package, v1.160+).

The smart-lock integration is already **partially implemented** in `src/lib/seam/*`. This document builds on what's there — it does not replace the existing Seam module, it refines it.

### What changes

| # | Task | Type |
|---|---|---|
| 1 | Install the official Seam SDK | Dependency |
| 2 | Add per-booking time override columns to the database | Migration + schema |
| 3 | New helper: derive door code from phone number | New file |
| 4 | Widen access window from ±30 min to ±1 hour; accept overrides | Code edit |
| 5 | Replace hand-rolled HTTP with Seam SDK calls | Code edit |
| 6 | Use phone-derived code and per-booking overrides in provisioning | Code edit |
| 7 | Admin UI to edit a reservation's check-in/out times | New page + server action |
| 8 | Seam webhook handler for lock event visibility (optional) | New route |

### Out of scope — do NOT touch

- Changing which lock brand / model is used (user has Schlage via Seam; that does not change).
- Modifying the property-level check-in/out defaults or the existing property sync button — those stay as-is.
- Adding booking cancellation / date change flows beyond the check-in/out time edit. If the guest wants to change dates, that's a different feature.
- Seam Connect webviews or device onboarding. The user already has their Schlage connected.
- Any refactor of `src/app/actions/booking.ts` beyond what Task 6 explicitly requires.
- Any security audit follow-ups from `SECURITY_FIXES_PASS_1.md` / `PASS_2.md` that are already merged.
- Changing how `createBooking` (legacy path) works — only the Stripe path matters in production. `createBooking` stays as-is; provisioning just inherits the Task 6 changes transparently.

### Why these specific changes

1. **Current door codes are random** (`generateFourDigitCode` uses `randomInt`). The user wants phone-derived so guests can remember "it's the last 4 of the number I booked with."
2. **Current window is ±30 minutes** (`subMinutes(_, 30)` / `addMinutes(_, 30)` in `booking-window.ts`). The user wants ±1 hour to match what Airbnb does.
3. **Current time overrides are property-level only.** If a guest asks for a 2 PM early check-in on just one booking, there's no way to grant it without changing the default for everybody. The fix is per-booking override columns.
4. **Current HTTP layer is hand-rolled** (`seamPost` in `src/lib/seam/http.ts`). The official `seam` SDK is tree-shakeable, fully typed from `@seamapi/types`, and handles Seam API conventions (like `action_attempts` polling) that the hand-rolled layer does not.

---

## 1. Pre-flight

```bash
git status
git checkout main
git pull origin main
git checkout -b feature/seam-phone-code
```

Confirm the current working tree is clean and you are on `main`. The existing Seam module must be present — verify with:

```bash
ls src/lib/seam/
```

Expected: `access-codes.ts`, `booking-window.ts`, `http.ts`, `index.ts`, `provision-booking.ts`. If any of these files are missing, stop — the baseline for this feature has changed and the document needs to be regenerated.

---

## 2. Task 1 — Install the Seam SDK

The official SDK is the `seam` package (not the legacy `seamapi` package). Latest version at time of writing is 1.160.0. It re-exports from `@seamapi/http`, `@seamapi/webhook`, and `@seamapi/types`.

```bash
pnpm add seam
```

Verify the install:

```bash
pnpm list seam
```

Expected: a version starting with `1.160` or higher. If an older version is pinned elsewhere, report it and stop.

### Commit

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add seam sdk for smart lock integration

Installs the official 'seam' package (re-exports @seamapi/http,
@seamapi/webhook, @seamapi/types) to replace hand-rolled HTTP calls
in src/lib/seam/http.ts. Tree-shakeable and fully typed.

Refs: https://docs.seam.co/latest"
```

---

## 3. Task 2 — Add per-booking time override columns

### Background

The `bookings` table currently relies entirely on the property's default `check_in_time` / `check_out_time`. To let admins grant early check-in or late check-out on a single reservation, we add two nullable columns. `NULL` means "use the property default" so existing rows need no backfill.

### Step 1 — Create the migration file

**CREATE NEW FILE:** `supabase/migrations/20260408120000_booking_time_overrides.sql`

```sql
-- Per-booking check-in / check-out time overrides for individual reservations.
-- NULL means "use the property default". See feature doc:
-- docs/SEAM_PHONE_CODE_FEATURE.md (Task 2).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_in_time_override varchar(5),
  ADD COLUMN IF NOT EXISTS check_out_time_override varchar(5);

COMMENT ON COLUMN public.bookings.check_in_time_override IS
  'Per-reservation check-in time override (HH:mm). NULL = use property default.';
COMMENT ON COLUMN public.bookings.check_out_time_override IS
  'Per-reservation check-out time override (HH:mm). NULL = use property default.';
```

### Step 2 — Create the migration runner script

The repo already has `scripts/apply-seam-migration.ts` for the original Seam migration. Follow the same pattern.

**CREATE NEW FILE:** `scripts/apply-booking-time-overrides-migration.ts`

```ts
/**
 * One-off: apply supabase/migrations/20260408120000_booking_time_overrides.sql
 * Run: pnpm exec tsx scripts/apply-booking-time-overrides-migration.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";
import postgres from "postgres";

config({ path: path.join(process.cwd(), ".env.local") });

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set (.env.local).");
    process.exit(1);
  }
  return url;
}

async function main() {
  const sql = postgres(requireDatabaseUrl(), { max: 1 });
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20260408120000_booking_time_overrides.sql",
    ),
    "utf8",
  );

  try {
    await sql.unsafe(migration);
    console.log("Booking time-override migration applied successfully.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### Step 3 — Add the columns to the Drizzle schema

**FIND THIS EXACT CONTENT** in `src/lib/db/schema.ts`:

```ts
  /** Seam access code id when a smart lock code was provisioned. */
  seamAccessCodeId: varchar('seam_access_code_id', { length: 64 }),
  /** Guest door code (typically 4 digits); shown in confirmation email. */
  doorCode: varchar('door_code', { length: 16 }),
  /** Last Seam API error message if provisioning failed (for admin debugging). */
  seamAccessError: text('seam_access_error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**REPLACE WITH:**

```ts
  /** Seam access code id when a smart lock code was provisioned. */
  seamAccessCodeId: varchar('seam_access_code_id', { length: 64 }),
  /** Guest door code (typically 4 digits); shown in confirmation email. */
  doorCode: varchar('door_code', { length: 16 }),
  /** Last Seam API error message if provisioning failed (for admin debugging). */
  seamAccessError: text('seam_access_error'),
  /** Per-reservation check-in time override (HH:mm). NULL = use property default. */
  checkInTimeOverride: varchar('check_in_time_override', { length: 5 }),
  /** Per-reservation check-out time override (HH:mm). NULL = use property default. */
  checkOutTimeOverride: varchar('check_out_time_override', { length: 5 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Commit

```bash
git add supabase/migrations/20260408120000_booking_time_overrides.sql scripts/apply-booking-time-overrides-migration.ts src/lib/db/schema.ts
git commit -m "feat(db): add per-booking check-in/out time override columns

Adds two nullable varchar(5) columns to public.bookings:
  - check_in_time_override
  - check_out_time_override

NULL means 'use the property default' so no backfill is needed.
Used by the admin 'Edit reservation' flow to grant early check-in
or late check-out on a single reservation without changing the
property's global defaults, and picked up by the Seam provisioning
pipeline so the smart lock window updates automatically.

Includes a Drizzle schema update and a one-off migration runner
following the same pattern as apply-seam-migration.ts.

Refs: feature doc Task 2"
```

**Note:** the migration SQL is not auto-applied by this commit — the user must run it manually. This is covered in §10.1 below.

---

## 4. Task 3 — Phone-to-code helper

### Background

A small pure function that takes a guest phone number and returns the last 4 digits suitable for use as a door code. Handles international formats, separators, missing numbers, and short numbers. Returns `null` when a valid 4-digit code cannot be extracted — the caller falls back to random.

### CREATE NEW FILE: `src/lib/seam/phone-to-code.ts`

```ts
import "server-only";

/**
 * Derive a 4-digit door code from a guest phone number, matching
 * Airbnb's "last 4 digits of your phone" convention.
 *
 * Returns null when a valid code cannot be extracted. Callers should
 * fall back to a random code in that case.
 *
 * Rejected cases:
 *   - null / undefined / empty
 *   - fewer than 4 digits after stripping non-digits
 *   - all same digit ("0000", "1111", etc.) — weak codes
 */
export function extractDoorCodeFromPhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D+/g, "");
  if (digits.length < 4) return null;
  const last4 = digits.slice(-4);
  // Reject weak codes where every digit is the same.
  if (/^(\d)\1{3}$/.test(last4)) return null;
  return last4;
}
```

### Commit

```bash
git add src/lib/seam/phone-to-code.ts
git commit -m "feat(seam): add extractDoorCodeFromPhone helper

Pure function that returns the last 4 digits of a guest phone number
after stripping non-digit characters, or null when a valid code can
not be extracted (missing phone, fewer than 4 digits, or a weak code
like '0000'/'1111'). Callers fall back to random generation on null.

Matches Airbnb's 'last 4 digits of your phone' convention.

Refs: feature doc Task 3"
```

---

## 5. Task 4 — Widen access window and accept overrides

### Background

Two changes to `src/lib/seam/booking-window.ts`:

1. Buffer grows from 30 to 60 minutes on each side.
2. `computeBookingAccessWindowUtc` takes the effective check-in/out times that the caller has already resolved (property default vs. per-booking override). The function itself stays oblivious to where the times come from — that logic lives in `provision-booking.ts` (Task 6).

The existing signature already takes `checkInTime` / `checkOutTime` as parameters, so no signature change is needed. Only the buffer constants change, and the function doc comment updates.

### File: `src/lib/seam/booking-window.ts`

**FIND THIS EXACT CONTENT:**

```ts
/**
 * Access code is valid from 30 minutes before check-in time until 30 minutes after check-out time,
 * using the property IANA timezone.
 */
export function computeBookingAccessWindowUtc(params: {
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  timeZone: string;
}): { startsAt: Date; endsAt: Date } {
  const checkInTime = normalizeHHmm(params.checkInTime, "16:00");
  const checkOutTime = normalizeHHmm(params.checkOutTime, "11:00");
  const [iy, im, id] = params.checkIn.split("-").map(Number);
  const [ih, imin] = checkInTime.split(":").map(Number);
  const [oy, om, od] = params.checkOut.split("-").map(Number);
  const [oh, omin] = checkOutTime.split(":").map(Number);

  const checkInWall = new TZDate(iy, im - 1, id, ih, imin, params.timeZone);
  const checkOutWall = new TZDate(oy, om - 1, od, oh, omin, params.timeZone);

  const startsAt = subMinutes(checkInWall, 30);
  const endsAt = addMinutes(checkOutWall, 30);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("Invalid access window: check-out must be after check-in.");
  }

  return { startsAt, endsAt };
}
```

**REPLACE WITH:**

```ts
/**
 * Access code is valid from 1 hour before check-in time until 1 hour
 * after check-out time, using the property IANA timezone. This matches
 * the convention Airbnb uses in its smart-lock integrations.
 *
 * Callers are expected to resolve the effective check-in/out times
 * (property default vs. per-reservation override) before calling this
 * — the function is oblivious to where the times came from.
 */
const ACCESS_BUFFER_MINUTES = 60;

export function computeBookingAccessWindowUtc(params: {
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  timeZone: string;
}): { startsAt: Date; endsAt: Date } {
  const checkInTime = normalizeHHmm(params.checkInTime, "16:00");
  const checkOutTime = normalizeHHmm(params.checkOutTime, "11:00");
  const [iy, im, id] = params.checkIn.split("-").map(Number);
  const [ih, imin] = checkInTime.split(":").map(Number);
  const [oy, om, od] = params.checkOut.split("-").map(Number);
  const [oh, omin] = checkOutTime.split(":").map(Number);

  const checkInWall = new TZDate(iy, im - 1, id, ih, imin, params.timeZone);
  const checkOutWall = new TZDate(oy, om - 1, od, oh, omin, params.timeZone);

  const startsAt = subMinutes(checkInWall, ACCESS_BUFFER_MINUTES);
  const endsAt = addMinutes(checkOutWall, ACCESS_BUFFER_MINUTES);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("Invalid access window: check-out must be after check-in.");
  }

  return { startsAt, endsAt };
}
```

### Commit

```bash
git add src/lib/seam/booking-window.ts
git commit -m "feat(seam): widen access window to ±1 hour

Matches Airbnb's smart-lock convention: access code is valid from
1 hour before check-in until 1 hour after check-out. Previously
±30 minutes.

Extracted the buffer to an ACCESS_BUFFER_MINUTES constant to avoid
drift between the two calls.

Refs: feature doc Task 4"
```

---

## 6. Task 5 — Replace hand-rolled HTTP with the Seam SDK

### Background

The existing `src/lib/seam/http.ts` posts JSON directly to `https://connect.getseam.com/access_codes/create` (and `/update`). Replace this with a thin wrapper around the official `seam` SDK. The SDK handles auth, workspace scoping, action-attempt polling, and error shapes.

Two files change:

- `src/lib/seam/http.ts` — replace the `seamPost` function with a `getSeamClient()` factory that returns a `Seam` instance configured from env vars. Keep `isSeamConfigured` as-is.
- `src/lib/seam/access-codes.ts` — remove the `seamPost` import, replace its usage with SDK method calls (`seam.accessCodes.create`, `seam.accessCodes.update`).

### File 5a: `src/lib/seam/http.ts`

**REPLACE THE ENTIRE FILE CONTENT WITH:**

```ts
import "server-only";

import { Seam } from "seam";

export function isSeamConfigured(): boolean {
  return Boolean(process.env.SEAM_API_KEY?.trim());
}

/**
 * Returns a Seam SDK client configured from env vars.
 *
 *   SEAM_API_KEY       - required. Create in Seam Console → Developer → API Keys.
 *   SEAM_WORKSPACE_ID  - optional. Only needed when your API key can access
 *                        multiple workspaces (normally it is already scoped).
 *
 * Throws when SEAM_API_KEY is missing. Call isSeamConfigured() first if you
 * want to no-op gracefully (which is how the provisioning pipeline handles it).
 *
 * See https://docs.seam.co/latest and https://www.npmjs.com/package/seam.
 */
export function getSeamClient(): Seam {
  const apiKey = process.env.SEAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SEAM_API_KEY is not set.");
  }
  const workspaceId = process.env.SEAM_WORKSPACE_ID?.trim();
  return new Seam({
    apiKey,
    ...(workspaceId ? { workspaceId } : {}),
  });
}
```

### File 5b: `src/lib/seam/access-codes.ts`

**REPLACE THE ENTIRE FILE CONTENT WITH:**

```ts
import "server-only";

import { randomInt } from "node:crypto";

import { getSeamClient } from "./http";

/** Fallback random 4-digit code when the guest phone can't yield one. */
export function generateFourDigitCode(): string {
  return String(randomInt(1000, 10000));
}

export async function seamCreateAccessCode(input: {
  deviceId: string;
  name: string;
  code: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<{ accessCodeId: string; code: string }> {
  const seam = getSeamClient();
  const result = await seam.accessCodes.create({
    device_id: input.deviceId,
    name: input.name,
    code: input.code,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
  });

  // SDK returns the access_code object directly.
  if (!result?.access_code_id || !result?.code) {
    throw new Error("Seam: unexpected response from accessCodes.create.");
  }
  return { accessCodeId: result.access_code_id, code: result.code };
}

export async function seamUpdateAccessCode(input: {
  accessCodeId: string;
  name?: string;
  code?: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<void> {
  const seam = getSeamClient();
  await seam.accessCodes.update({
    access_code_id: input.accessCodeId,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
    ...(input.name ? { name: input.name } : {}),
    ...(input.code ? { code: input.code } : {}),
  });
}
```

### Verification before committing

```bash
pnpm build
```

Build must succeed. The `Seam` class exports its types directly, so `seam.accessCodes.create` / `seam.accessCodes.update` are fully typed. If TypeScript complains about a field name mismatch (`device_id` vs `deviceId`, etc.), verify against the latest Seam SDK types and re-run the build. **Do not "fix" by adding `as any`** — report the mismatch and stop.

### Commit

```bash
git add src/lib/seam/http.ts src/lib/seam/access-codes.ts
git commit -m "refactor(seam): migrate from hand-rolled http to seam sdk

Replaces src/lib/seam/http.ts's seamPost wrapper with a getSeamClient()
factory backed by the official 'seam' SDK, and rewrites
src/lib/seam/access-codes.ts to call seam.accessCodes.create() and
seam.accessCodes.update() directly instead of posting raw JSON.

Public function signatures in access-codes.ts are unchanged so the
rest of the Seam module is unaffected. The isSeamConfigured() export
in http.ts is also unchanged so all existing call sites keep working.

Refs: feature doc Task 5
Docs: https://docs.seam.co/latest/api/access_codes/create"
```

---

## 7. Task 6 — Wire phone-derived codes and per-booking overrides into provisioning

### Background

`provisionSeamAccessCodeForBooking` in `src/lib/seam/provision-booking.ts` is the heart of the feature. It needs three changes:

1. Query the booking's guest **phone** and the per-booking **check-in/out overrides**.
2. Resolve effective times: override if set, else property default.
3. Derive the door code from the phone number. Fall back to random on collision or missing phone. Keep the existing 5-attempt retry loop unchanged.

### File: `src/lib/seam/provision-booking.ts`

**Edit 1 of 3 — FIND THIS EXACT CONTENT:**

```ts
import { seamCreateAccessCode, seamUpdateAccessCode, generateFourDigitCode } from "./access-codes";
import { computeBookingAccessWindowUtc, normalizeHHmm } from "./booking-window";
import { isSeamConfigured } from "./http";
```

**REPLACE WITH:**

```ts
import { seamCreateAccessCode, seamUpdateAccessCode, generateFourDigitCode } from "./access-codes";
import { computeBookingAccessWindowUtc, normalizeHHmm } from "./booking-window";
import { isSeamConfigured } from "./http";
import { extractDoorCodeFromPhone } from "./phone-to-code";
```

**Edit 2 of 3 — FIND THIS EXACT CONTENT:**

```ts
  const row = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    columns: {
      id: true,
      confirmationCode: true,
      checkIn: true,
      checkOut: true,
      bookingStatus: true,
      seamAccessCodeId: true,
      doorCode: true,
    },
    with: {
      property: {
        columns: {
          name: true,
          seamDeviceId: true,
          checkInTime: true,
          checkOutTime: true,
          propertyTimezone: true,
        },
      },
    },
  });
```

**REPLACE WITH:**

```ts
  const row = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    columns: {
      id: true,
      confirmationCode: true,
      checkIn: true,
      checkOut: true,
      bookingStatus: true,
      seamAccessCodeId: true,
      doorCode: true,
      checkInTimeOverride: true,
      checkOutTimeOverride: true,
    },
    with: {
      property: {
        columns: {
          name: true,
          seamDeviceId: true,
          checkInTime: true,
          checkOutTime: true,
          propertyTimezone: true,
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

**Edit 3 of 3 — FIND THIS EXACT CONTENT:**

```ts
  const checkIn = String(row.checkIn);
  const checkOut = String(row.checkOut);
  const tz = row.property.propertyTimezone?.trim() || "America/New_York";
  const checkInTime = normalizeHHmm(row.property.checkInTime, "16:00");
  const checkOutTime = normalizeHHmm(row.property.checkOutTime, "11:00");

  let startsAt: Date;
  let endsAt: Date;
  try {
    ({ startsAt, endsAt } = computeBookingAccessWindowUtc({
      checkIn,
      checkOut,
      checkInTime,
      checkOutTime,
      timeZone: tz,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db
      .update(bookings)
      .set({ seamAccessError: msg, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    return { doorCode: null, seamAccessError: msg };
  }

  const name = `${row.property.name} · ${row.confirmationCode}`.slice(0, 120);

  try {
    if (row.seamAccessCodeId) {
      const code = row.doorCode?.trim() || generateFourDigitCode();
      await seamUpdateAccessCode({
        accessCodeId: row.seamAccessCodeId,
        name,
        code,
        startsAt,
        endsAt,
      });
      await db
        .update(bookings)
        .set({
          doorCode: code,
          seamAccessError: null,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));
      return { doorCode: code, seamAccessError: null };
    }

    let code = generateFourDigitCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await seamCreateAccessCode({
          deviceId,
          name,
          code,
          startsAt,
          endsAt,
        });
```

**REPLACE WITH:**

```ts
  const checkIn = String(row.checkIn);
  const checkOut = String(row.checkOut);
  const tz = row.property.propertyTimezone?.trim() || "America/New_York";

  // Effective check-in/out times: per-booking override if set, else property default.
  const checkInTime = normalizeHHmm(
    row.checkInTimeOverride ?? row.property.checkInTime,
    "16:00",
  );
  const checkOutTime = normalizeHHmm(
    row.checkOutTimeOverride ?? row.property.checkOutTime,
    "11:00",
  );

  let startsAt: Date;
  let endsAt: Date;
  try {
    ({ startsAt, endsAt } = computeBookingAccessWindowUtc({
      checkIn,
      checkOut,
      checkInTime,
      checkOutTime,
      timeZone: tz,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db
      .update(bookings)
      .set({ seamAccessError: msg, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    return { doorCode: null, seamAccessError: msg };
  }

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
      await seamUpdateAccessCode({
        accessCodeId: row.seamAccessCodeId,
        name,
        code,
        startsAt,
        endsAt,
      });
      await db
        .update(bookings)
        .set({
          doorCode: code,
          seamAccessError: null,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));
      return { doorCode: code, seamAccessError: null };
    }

    // First attempt uses phone-derived code. Subsequent attempts fall back
    // to random because the collision is almost certainly another booking
    // on the same lock using the same last-4 digits.
    let code = phoneCode ?? generateFourDigitCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await seamCreateAccessCode({
          deviceId,
          name,
          code,
          startsAt,
          endsAt,
        });
```

### Verification before committing

```bash
pnpm build
```

The Drizzle `findFirst` query now joins `guest` via the existing `bookingsRelations` (already defined in `schema.ts`). If TypeScript complains that `guest` is not a valid relation key, verify that `bookingsRelations` in `src/lib/db/schema.ts` includes the `guest: one(guests, …)` definition (it should — it was already there in the baseline).

### Commit

```bash
git add src/lib/seam/provision-booking.ts
git commit -m "feat(seam): phone-derived door codes with per-booking overrides

Three changes to provisionSeamAccessCodeForBooking:

1. The query now includes the guest relation (for phone) and the
   two new per-booking override columns.
2. Effective check-in/out times are resolved as 'override ?? property
   default' so an admin grant of early check-in or late check-out on
   a single reservation takes effect on the smart lock automatically.
3. New bookings try a phone-derived code first (last 4 digits of the
   guest phone number, via extractDoorCodeFromPhone from Task 3).
   Missing/weak phones and collisions fall through to the existing
   5-attempt random retry loop unchanged.

Existing code-with-seamAccessCodeId path (updates, re-syncs) keeps
the already-stored doorCode unless it's missing, in which case it
prefers phone-derived. No observable change for existing reservations
until they're explicitly re-provisioned.

Refs: feature doc Task 6"
```

---

## 8. Task 7 — Admin UI to edit a reservation's check-in/out times

### Background

The admin reservations page at `/admin/reservations` is currently read-only. Add an "Edit" link on each row that opens a dedicated edit page (`/admin/reservations/[id]/edit`) with a small form for the per-booking time overrides. On save, the form calls a server action that updates the booking row and re-provisions the Seam access code.

Using a dedicated page instead of a modal keeps the implementation self-contained — it's easier to reason about than client-side state for a modal, and it matches the existing admin property edit pattern.

This task adds **three things**:

1. A new server action `updateBookingTimeOverrides` in `src/app/admin/actions.ts`.
2. A new page `src/app/admin/(dashboard)/reservations/[id]/edit/page.tsx`.
3. A new client form component `src/app/admin/(dashboard)/reservations/[id]/edit/edit-form.tsx`.
4. An "Edit" link in the existing reservations table.

### Step 1 — Add the server action

**FIND THIS EXACT CONTENT** in `src/app/admin/actions.ts`:

```ts
/** Re-push Seam access code windows for all future confirmed stays (after changing times or lock). */
export async function syncSeamAccessCodesForPropertyAction(propertyId: string) {
  await requireAdmin();
  const { syncSeamAccessCodesForProperty } = await import(
    "@/lib/seam/provision-booking"
  );
  return syncSeamAccessCodesForProperty(propertyId);
}
```

**REPLACE WITH:**

```ts
/** Re-push Seam access code windows for all future confirmed stays (after changing times or lock). */
export async function syncSeamAccessCodesForPropertyAction(propertyId: string) {
  await requireAdmin();
  const { syncSeamAccessCodesForProperty } = await import(
    "@/lib/seam/provision-booking"
  );
  return syncSeamAccessCodesForProperty(propertyId);
}

/**
 * Update a single reservation's per-booking check-in / check-out time
 * overrides and re-provision its Seam access code window. Empty string
 * in either field clears the override (reverts to property default).
 *
 * See feature doc Task 7.
 */
export async function updateBookingTimeOverrides(
  bookingId: string,
  data: {
    checkInTimeOverride: string;
    checkOutTimeOverride: string;
  },
) {
  await requireAdmin();
  const { db } = await import("@/lib/db");
  const { bookings } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const normalize = (raw: string): string | null => {
    const s = raw.trim();
    if (s === "") return null;
    if (!TIME_RE.test(s)) {
      throw new Error(`Invalid time format: "${s}". Use HH:mm (e.g. 14:00).`);
    }
    return s;
  };

  const checkInTimeOverride = normalize(data.checkInTimeOverride);
  const checkOutTimeOverride = normalize(data.checkOutTimeOverride);

  const result = await db
    .update(bookings)
    .set({
      checkInTimeOverride,
      checkOutTimeOverride,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId))
    .returning({ id: bookings.id });

  if (result.length === 0) {
    throw new Error("Reservation not found.");
  }

  // Push the new window to the smart lock. Safe to call when Seam is not
  // configured — provisionSeamAccessCodeForBooking no-ops in that case.
  const { provisionSeamAccessCodeForBooking } = await import(
    "@/lib/seam/provision-booking"
  );
  const seam = await provisionSeamAccessCodeForBooking(bookingId);

  return {
    success: true,
    doorCode: seam.doorCode,
    seamAccessError: seam.seamAccessError,
  };
}
```

### Step 2 — Create the edit page

**CREATE NEW FILE:** `src/app/admin/(dashboard)/reservations/[id]/edit/page.tsx`

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";

import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";

import { EditReservationForm } from "./edit-form";

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;

  const row = await db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    columns: {
      id: true,
      confirmationCode: true,
      checkIn: true,
      checkOut: true,
      checkInTimeOverride: true,
      checkOutTimeOverride: true,
      doorCode: true,
      seamAccessError: true,
    },
    with: {
      property: {
        columns: {
          name: true,
          checkInTime: true,
          checkOutTime: true,
        },
      },
      guest: {
        columns: {
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });

  if (!row) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/reservations"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#2b2b36] mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to reservations
      </Link>

      <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36] tracking-tight mb-2">
        Edit reservation
      </h1>
      <p className="text-gray-500 mb-6">
        {row.property.name} · {row.confirmationCode}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Guest</span>
          <span className="font-medium">
            {row.guest.firstName} {row.guest.lastName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Phone</span>
          <span className="font-mono">{row.guest.phone ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Stay</span>
          <span className="font-medium">
            {String(row.checkIn)} → {String(row.checkOut)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Door code</span>
          <span className="font-mono font-semibold">
            {row.doorCode ?? "—"}
          </span>
        </div>
        {row.seamAccessError && (
          <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3">
            Last Seam error: {row.seamAccessError}
          </div>
        )}
      </div>

      <EditReservationForm
        bookingId={row.id}
        propertyCheckInTime={row.property.checkInTime}
        propertyCheckOutTime={row.property.checkOutTime}
        initialCheckInOverride={row.checkInTimeOverride ?? ""}
        initialCheckOutOverride={row.checkOutTimeOverride ?? ""}
      />
    </div>
  );
}
```

### Step 3 — Create the client form

**CREATE NEW FILE:** `src/app/admin/(dashboard)/reservations/[id]/edit/edit-form.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { updateBookingTimeOverrides } from "@/app/admin/actions";

type Props = {
  bookingId: string;
  propertyCheckInTime: string;
  propertyCheckOutTime: string;
  initialCheckInOverride: string;
  initialCheckOutOverride: string;
};

export function EditReservationForm({
  bookingId,
  propertyCheckInTime,
  propertyCheckOutTime,
  initialCheckInOverride,
  initialCheckOutOverride,
}: Props) {
  const router = useRouter();
  const [checkInOverride, setCheckInOverride] = useState(initialCheckInOverride);
  const [checkOutOverride, setCheckOutOverride] = useState(initialCheckOutOverride);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "ok"; doorCode: string | null; seamError: string | null }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function handleSave() {
    setSaving(true);
    setResult({ kind: "idle" });
    try {
      const res = await updateBookingTimeOverrides(bookingId, {
        checkInTimeOverride: checkInOverride,
        checkOutTimeOverride: checkOutOverride,
      });
      setResult({
        kind: "ok",
        doorCode: res.doorCode,
        seamError: res.seamAccessError,
      });
      router.refresh();
    } catch (e) {
      setResult({
        kind: "error",
        message: e instanceof Error ? e.message : "Failed to save.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#2b2b36] mb-1">
          Check-in / check-out overrides
        </h2>
        <p className="text-sm text-gray-500">
          Override the property default for this reservation only. Leave blank
          to use the property default. The smart lock access window will
          update automatically (±1 hour).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-[#2b2b36] mb-1">
            Check-in time override
          </span>
          <input
            type="time"
            value={checkInOverride}
            onChange={(e) => setCheckInOverride(e.target.value)}
            placeholder={propertyCheckInTime}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20"
          />
          <span className="block text-xs text-gray-400 mt-1">
            Property default: {propertyCheckInTime}
          </span>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-[#2b2b36] mb-1">
            Check-out time override
          </span>
          <input
            type="time"
            value={checkOutOverride}
            onChange={(e) => setCheckOutOverride(e.target.value)}
            placeholder={propertyCheckOutTime}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20"
          />
          <span className="block text-xs text-gray-400 mt-1">
            Property default: {propertyCheckOutTime}
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2b2b36] text-white text-sm font-medium hover:bg-[#414152] disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving & updating lock…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save and update smart lock
            </>
          )}
        </button>

        {result.kind === "ok" && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">
                Saved. Door code: {result.doorCode ?? "(not provisioned)"}
              </p>
              {result.seamError && (
                <p className="text-xs mt-1 text-emerald-700">
                  Seam warning: {result.seamError}
                </p>
              )}
            </div>
          </div>
        )}

        {result.kind === "error" && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{result.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 4 — Add the Edit link to the reservations table

**FIND THIS EXACT CONTENT** in `src/app/admin/(dashboard)/reservations/page.tsx`:

```tsx
import { requireAdminPage } from "@/lib/auth";
import { listBookingsForAdmin } from "@/lib/admin/bookings-from-db";
import { format } from "date-fns";
```

**REPLACE WITH:**

```tsx
import Link from "next/link";

import { requireAdminPage } from "@/lib/auth";
import { listBookingsForAdmin } from "@/lib/admin/bookings-from-db";
import { format } from "date-fns";
```

Then **FIND THIS EXACT CONTENT** in the same file:

```tsx
                <th className="px-5 py-4 font-semibold text-right">Total</th>
```

**REPLACE WITH:**

```tsx
                <th className="px-5 py-4 font-semibold text-right">Total</th>
                <th className="px-5 py-4 font-semibold text-right">Edit</th>
```

Then locate the closing `</tr>` of each body row in the same file. There is one row template inside the `.map()`. **FIND THIS EXACT CONTENT:**

```tsx
                  <td className="px-5 py-4 text-right font-mono font-semibold text-[#2b2b36]">
                    ${Number(row.totalAmount).toFixed(2)}
                  </td>
                </tr>
```

**REPLACE WITH:**

```tsx
                  <td className="px-5 py-4 text-right font-mono font-semibold text-[#2b2b36]">
                    ${Number(row.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/reservations/${row.id}/edit`}
                      className="text-xs font-medium text-[#2b2b36] underline hover:text-[#414152]"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
```

### Verification before committing

```bash
pnpm build
pnpm lint
```

Both must succeed. Then spot-check that the new page file tree is in place:

```bash
ls src/app/admin/\(dashboard\)/reservations/\[id\]/edit/
```

Expected: `page.tsx`, `edit-form.tsx`.

### Commit

```bash
git add src/app/admin/actions.ts 'src/app/admin/(dashboard)/reservations/page.tsx' 'src/app/admin/(dashboard)/reservations/[id]/edit/page.tsx' 'src/app/admin/(dashboard)/reservations/[id]/edit/edit-form.tsx'
git commit -m "feat(admin): edit per-reservation check-in/out times

Adds a dedicated /admin/reservations/[id]/edit page backed by a new
updateBookingTimeOverrides server action. Admins can now grant early
check-in or late check-out on a single reservation; the Seam access
code window updates automatically via provisionSeamAccessCodeForBooking.

The existing reservations list gets an 'Edit' link on each row.
Empty override fields clear the override back to the property default.

Refs: feature doc Task 7"
```

---

## 9. Task 8 — Seam webhook handler (OPTIONAL)

> **Skip this task unless the user has explicitly asked for it**, or unless Task 7 is already done and there's time left. Webhooks are a "nice to have" for observability, not required for the core feature to work. If you skip this task, proceed directly to §10.

### Background

Seam sends webhooks when things happen on the lock: the code gets written to the device (`access_code.set_on_device`), someone unlocks the door (`lock.access_granted`), the code is removed, etc. Capturing these events lets you show the admin a timeline of door activity per reservation. The `seam` SDK includes a `SeamWebhook` class that verifies the webhook signature for you.

### Step 1 — Create the webhook route

**CREATE NEW FILE:** `src/app/api/seam/webhook/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { SeamWebhook } from "seam";

/**
 * Receives lock events from Seam. Configure in Seam Console → Developer →
 * Webhooks with a URL like https://your-domain/api/seam/webhook and copy
 * the signing secret into SEAM_WEBHOOK_SECRET.
 *
 * Docs: https://docs.seam.co/latest/developer-tools/webhooks
 * Refs: feature doc Task 8
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SEAM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "SEAM_WEBHOOK_SECRET is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();

  // Seam signs webhooks with an SVIX-compatible signature. Pass the raw
  // body and headers directly to SeamWebhook.verify().
  const webhook = new SeamWebhook(secret);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  let event: unknown;
  try {
    event = webhook.verify(rawBody, headers);
  } catch (e) {
    console.error(
      "[seam webhook] signature verification failed:",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Log for now. The next phase of this feature would write events to a
  // seam_events table keyed by booking and surface them in the admin UI.
  console.log(
    "[seam webhook] verified event:",
    JSON.stringify(event).slice(0, 500),
  );

  return NextResponse.json({ received: true });
}
```

### Step 2 — Verify the build

```bash
pnpm build
```

### Commit

```bash
git add src/app/api/seam/webhook/route.ts
git commit -m "feat(seam): add webhook route for lock event visibility

Receives verified events from Seam (access_code.set_on_device,
lock.access_granted, etc.) using the official SeamWebhook verifier
from the 'seam' SDK. Currently only logs events; persistence to a
seam_events table and admin-UI surfacing is deferred to a follow-up.

Requires SEAM_WEBHOOK_SECRET in the env. Configured in Seam Console
→ Developer → Webhooks pointing at /api/seam/webhook.

Refs: feature doc Task 8
Docs: https://docs.seam.co/latest/developer-tools/webhooks"
```

---

## 10. Verification

After all tasks are committed, run these checks **in order** and report results.

### 10.1 Commit history

```bash
git log main..HEAD --oneline
```

Expected: 7 commits (8 if Task 8 was done), in reverse task order.

### 10.2 Diff stat

```bash
git diff main..HEAD --stat
```

Expected files touched (Task 8 adds one more if done):

- `package.json`
- `pnpm-lock.yaml`
- `src/lib/db/schema.ts`
- `src/lib/seam/http.ts`
- `src/lib/seam/access-codes.ts`
- `src/lib/seam/booking-window.ts`
- `src/lib/seam/provision-booking.ts`
- `src/lib/seam/phone-to-code.ts` *(new)*
- `src/app/admin/actions.ts`
- `src/app/admin/(dashboard)/reservations/page.tsx`
- `src/app/admin/(dashboard)/reservations/[id]/edit/page.tsx` *(new)*
- `src/app/admin/(dashboard)/reservations/[id]/edit/edit-form.tsx` *(new)*
- `supabase/migrations/20260408120000_booking_time_overrides.sql` *(new)*
- `scripts/apply-booking-time-overrides-migration.ts` *(new)*
- `src/app/api/seam/webhook/route.ts` *(new, Task 8 only)*

### 10.3 Build and lint

```bash
pnpm build
pnpm lint
```

Both must pass. If `pnpm build` fails:

- **If it's a TypeScript error about Seam SDK types** (field names, response shapes), re-read the access-codes.ts changes against the current `seam` package types and stop — do not `as any` it. Report the exact error.
- **If it's a Drizzle relation error on `row.guest`**, verify that `bookingsRelations` in `src/lib/db/schema.ts` still includes the `guest: one(guests, …)` definition that was there in the baseline. It should be untouched.
- **If it's any other error**, report it verbatim and stop.

### 10.4 Spot checks

```bash
# Task 1 — seam is installed
pnpm list seam | grep -q "seam" && echo ok

# Task 2 — override columns in schema
grep -q "checkInTimeOverride" src/lib/db/schema.ts && echo ok

# Task 3 — phone-to-code helper exists
grep -q "extractDoorCodeFromPhone" src/lib/seam/phone-to-code.ts && echo ok

# Task 4 — 1-hour buffer constant
grep -q "ACCESS_BUFFER_MINUTES = 60" src/lib/seam/booking-window.ts && echo ok

# Task 5 — SDK imported in http helper
grep -q 'from "seam"' src/lib/seam/http.ts && echo ok

# Task 6 — phone helper used in provisioning
grep -q "extractDoorCodeFromPhone" src/lib/seam/provision-booking.ts && echo ok

# Task 7 — edit page exists
test -f "src/app/admin/(dashboard)/reservations/[id]/edit/page.tsx" && echo ok
```

All seven should print `ok`. If any don't, report which and stop.

---

## 11. Manual steps the user must perform

These cannot be automated — they need a human with dashboard access.

### 11.1 Apply the database migration

After merging this PR (or locally against the dev database):

```bash
pnpm exec tsx scripts/apply-booking-time-overrides-migration.ts
```

This runs the SQL in `supabase/migrations/20260408120000_booking_time_overrides.sql` against the database at `DATABASE_URL`. The migration is idempotent (`ADD COLUMN IF NOT EXISTS`) so running it twice is safe.

### 11.2 Environment variables

If Task 8 was done, add to `.env.local` and to Vercel Project Settings → Environment Variables:

```
SEAM_WEBHOOK_SECRET=<copy from Seam Console → Developer → Webhooks>
```

`SEAM_API_KEY` and `SEAM_WORKSPACE_ID` should already be set from the original Seam integration. If they are not, create an API key in Seam Console → Developer → API Keys.

### 11.3 Configure the Seam webhook (only if Task 8 was done)

1. Go to Seam Console → Developer → Webhooks.
2. Create a new webhook pointing at `https://<your-domain>/api/seam/webhook`.
3. Subscribe to at least these event types:
   - `access_code.created`
   - `access_code.set_on_device`
   - `access_code.removed_from_device`
   - `lock.access_granted`
4. Copy the signing secret into `SEAM_WEBHOOK_SECRET` (§11.2).

### 11.4 Backfill existing reservations (optional)

Existing confirmed bookings will keep their random door codes until they're re-provisioned. To force all future reservations to use phone-derived codes right now, use the existing **"Sync Seam access codes"** button on each property's admin edit page. That re-runs `provisionSeamAccessCodeForBooking` for every future confirmed stay on that property, which picks up the new phone-derived logic from Task 6.

Caveat: if the existing `doorCode` is already set on a booking (from the old random generator), the Task 6 logic **preserves it** rather than overwriting. To force a re-generation, you would need to manually clear `doorCode` in the `bookings` table first — not recommended unless you specifically want to rotate codes.

---

## 12. Acceptance test

Once all tasks are merged and the migration is applied, run this end-to-end test against a staging environment:

1. **New booking flow:** make a test Stripe booking with a phone number ending in `5678`. After the webhook finalizes, check the admin reservations page — the `doorCode` column should show `5678`. Check Seam Console → Access Codes on the linked Schlage device — there should be an access code named `<Property name> · BK-<confirmation>` with `code = "5678"` and `starts_at` exactly 1 hour before the check-in time and `ends_at` exactly 1 hour after the check-out time (in the property's timezone).
2. **Edit override flow:** open that reservation's edit page in admin. Set Check-in override to `14:00` (2 PM early check-in). Save. The success message should show the same door code (`5678`). Verify in Seam Console that the access code's `starts_at` has moved to 1 PM local time (1 hour before 2 PM).
3. **Clear override flow:** in the same edit page, clear the Check-in override (empty string). Save. The `starts_at` should move back to the original time (1 hour before the property default check-in).
4. **Phone-missing fallback:** create a booking with no phone. The `doorCode` should be a random 4-digit number, not `null`. No error in `seamAccessError`.
5. **Phone-collision fallback:** create two bookings with phone numbers ending in the same 4 digits, both overlapping on the same property. The second one should fall through to a different code after Seam rejects the duplicate. Check `doorCode` on both rows — they should be different.

If any of these fail, report the exact error message and which step failed. Do not attempt to "fix" the test — report the finding and stop.

---

## 13. What this document does NOT cover (deferred)

None of these are blockers. Track them for a future pass if the user asks.

1. **Persisted Seam event log.** Task 8 only logs events to stdout. A future pass should write them to a `seam_events` table keyed by `seam_access_code_id` and surface a timeline in the admin reservation edit page.
2. **Guest-facing door code email.** The existing booking confirmation email already includes `doorCode`. If the phone-derived code changes after the email is sent (via the edit override flow), the guest does not get a new email automatically. Decide whether to re-send on code change.
3. **Rotating door codes on cancellation.** When a booking is cancelled, its Seam access code is not deleted. The property-level sync button will eventually skip it (because it only looks at confirmed future stays), but the code stays active on the lock until its `ends_at`. Add `bookingStatus === "cancelled"` handling in `provisionSeamAccessCodeForBooking` in a future pass.
4. **Lock offline / sync errors in UI.** The `seamAccessError` column is populated on failure but only shown on the edit page. Add a red badge on the reservations list row when `seamAccessError IS NOT NULL`.
5. **Multi-lock properties.** The schema assumes one `seam_device_id` per property. If a property has multiple locks, only the main door gets a code.

---

## 14. Done checklist

When you have finished, report back with this filled in:

- [ ] Pre-flight passed (clean main, branch created, baseline Seam files present)
- [ ] Task 1 — seam SDK installed and committed
- [ ] Task 2 — migration file + runner script + schema update committed (SQL not yet applied)
- [ ] Task 3 — phone-to-code helper committed
- [ ] Task 4 — booking window widened to ±1 hour committed
- [ ] Task 5 — SDK migration in http.ts + access-codes.ts committed
- [ ] Task 6 — phone code + per-booking overrides wired into provisioning committed
- [ ] Task 7 — admin edit page + server action + Edit link committed
- [ ] Task 8 — Seam webhook route (if done) committed, or explicitly skipped
- [ ] §10.1 commit history verified
- [ ] §10.2 diff stat verified (no unexpected files)
- [ ] §10.3 `pnpm build` and `pnpm lint` passed
- [ ] §10.4 spot checks all printed `ok`
- [ ] Branch pushed to origin
- [ ] PR opened with reference to this feature doc
- [ ] User reminded of §11.1 (apply migration) — **critical, feature is broken until this runs**
- [ ] User reminded of §11.2 (env vars, if Task 8 was done)
- [ ] User reminded of §11.3 (Seam webhook config, if Task 8 was done)
- [ ] User reminded of §12 acceptance test

If any item is unchecked, report which one and why before stopping.
