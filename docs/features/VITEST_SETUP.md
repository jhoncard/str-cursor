# Vitest Setup for str-cursor

> **Instructions for Cursor / Claude Code:** This document sets up Vitest as the unit test runner for the repository. It is intentionally minimal — the goal is a working `pnpm test` command with one passing sample test, not a complete test suite. Writing the actual test suite is a follow-up task that consumes this foundation. Execute the tasks below **in order**. Each task has explicit `CREATE FILE` or `FIND` / `REPLACE WITH` blocks. If any `FIND` block does not match a file exactly, **stop and report the mismatch** — do not improvise.

## 0. Goal and scope

Add Vitest to the repository so that `pnpm test` runs the test suite and `pnpm test:watch` runs it in watch mode. Add one working sample test against `src/lib/safe-redirect.ts` that proves the setup is functional. Do not write tests for any other files — that is a separate, larger task that will be handed to Claude Code after this foundation lands.

### What changes

| # | Task | Type |
|---|---|---|
| 1 | Install Vitest and `@vitest/ui` | Dependencies |
| 2 | Create `vitest.config.ts` at the repo root | New file |
| 3 | Add `test`, `test:watch`, `test:ui` scripts to `package.json` | Edit |
| 4 | Create `src/lib/safe-redirect.test.ts` as the sample | New file |

**Total:** 2 new files, 1 file edit, 2 new dev dependencies. No source code changes. No database changes. No environment variables.

### Design decisions that are locked in

1. **Vitest, not Jest.** Vitest is the modern standard for TypeScript + Vite/Next.js projects. Native TS support (no `ts-jest`), faster, Jest-compatible API. Jest would also work but is the legacy option.
2. **No jsdom, no `@testing-library/react` in this pass.** Those are only needed when testing React components. The first batch of tests for this project targets pure functions (security helpers, code generation, magic-byte detection) — none need a DOM. §7 below describes how to add jsdom later when component tests are actually needed. Keeping it out now means a smaller dependency footprint and faster test startup.
3. **`server-only` is aliased to an empty module in test mode.** Several utility files in `src/lib/` (including the sample target `safe-redirect.ts`) import `server-only` to prevent accidental client-bundle inclusion. That package deliberately throws when imported outside a Next.js server context, which breaks Vitest. Aliasing it to an empty file in `vitest.config.ts` is the standard workaround and does not affect production behavior.
4. **Sample test file lives next to its source**, at `src/lib/safe-redirect.test.ts`. Vitest picks up `*.test.ts` files anywhere under `src/` by default.
5. **`safe-redirect.ts` is the sample target**, not `phone-to-code.ts`, because its logic is simpler (path validation vs. digit extraction with weak-code rejection) and makes a cleaner first example. `phone-to-code.ts` will be tested in the follow-up task.

### Out of scope — do NOT do any of these

- Writing tests for `phone-to-code.ts`, `property-image-upload.ts`, `ratelimit.ts`, the Stripe webhook handler, or any other file besides the sample. That is the follow-up "test sweep" task for Claude Code.
- Adding React Testing Library, jsdom, or component tests.
- Setting up integration tests against a real Supabase project.
- Adding a coverage report setup (`@vitest/coverage-v8`). Can be added later.
- Wiring tests into GitHub Actions CI. Separate task.
- Touching `tsconfig.json` in any way.

---

## 1. Pre-flight

```bash
git status
git checkout main
git pull origin main
git checkout -b chore/vitest-setup
```

`git status` must report `nothing to commit, working tree clean` before you start. Confirm the baseline files exist:

```bash
ls src/lib/safe-redirect.ts package.json tsconfig.json
```

All three must exist. If any are missing, stop — the baseline has drifted.

---

## 2. Task 1 — Install Vitest

```bash
pnpm add -D vitest @vitest/ui
```

`vitest` is the test runner. `@vitest/ui` is an optional browser-based UI for running tests interactively — small, useful, worth including from the start.

Verify:

```bash
pnpm list vitest @vitest/ui
```

Expected: both packages installed. `vitest` should be on a 2.x or 3.x major version.

### Commit

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(test): add vitest and @vitest/ui

Installs Vitest as the project's unit test runner. @vitest/ui is
included for interactive test browsing via pnpm test:ui.

No source changes in this commit. Configuration and sample test
follow in subsequent commits.

Refs: VITEST_SETUP.md Task 1"
```

---

## 3. Task 2 — Create `vitest.config.ts`

### CREATE NEW FILE: `vitest.config.ts` (at the repo root)

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

// Minimal Vitest configuration.
//
// Design notes (see VITEST_SETUP.md §0):
//   - No jsdom environment. The first batch of tests targets pure
//     functions, not React components. Add jsdom + @testing-library/react
//     later when component tests are actually needed.
//   - "server-only" is aliased to an empty module. Several src/lib files
//     import "server-only" as a client-bundle guard; that package throws
//     when imported outside a Next.js server context, which would break
//     unit tests. The alias makes it a harmless no-op in test mode only
//     and does not affect the production build.
//   - @/* path alias mirrors tsconfig.json so test files can use the
//     same imports as source files.
export default defineConfig({
  test: {
    // Default "node" environment. Explicit for clarity.
    environment: "node",
    // Only pick up tests under src/. Ignore node_modules, .next, etc.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Reasonable default test timeout. Raise per-test if needed.
    testTimeout: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./test/mocks/server-only.ts"),
    },
  },
});
```

### CREATE NEW FILE: `test/mocks/server-only.ts`

```ts
// Empty stub that replaces the real "server-only" package during
// Vitest runs. See vitest.config.ts and VITEST_SETUP.md §0 decision 3.
//
// The real package exports nothing and exists only to throw at build
// time if accidentally imported from a client bundle. In tests there
// is no such distinction, so replacing it with an empty module is safe.
export {};
```

### Commit

```bash
git add vitest.config.ts test/mocks/server-only.ts
git commit -m "chore(test): vitest config and server-only alias

Creates vitest.config.ts with:
  - node environment (no jsdom in this pass)
  - @/* path alias mirroring tsconfig
  - server-only aliased to an empty module to prevent the real
    package from throwing when imported by src/lib utilities

Also creates test/mocks/server-only.ts as the empty replacement
module.

Refs: VITEST_SETUP.md Task 2"
```

---

## 4. Task 3 — Add test scripts to `package.json`

These are **additions** to the `scripts` block. Do not touch any existing script.

### File: `package.json`

**FIND THIS EXACT CONTENT:**

```json
  "scripts": {
    "clean": "rm -rf .next node_modules/.cache",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test-pricelabs": "tsx scripts/test-pricelabs.ts",
    "migrate:seam": "tsx scripts/apply-seam-migration.ts"
  },
```

**REPLACE WITH:**

```json
  "scripts": {
    "clean": "rm -rf .next node_modules/.cache",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test-pricelabs": "tsx scripts/test-pricelabs.ts",
    "migrate:seam": "tsx scripts/apply-seam-migration.ts"
  },
```

Three new scripts:

- **`pnpm test`** — single run, exits with non-zero on failure. This is the one CI will use.
- **`pnpm test:watch`** — watch mode, re-runs on file change. Use while actively writing tests.
- **`pnpm test:ui`** — opens the `@vitest/ui` browser UI. Useful for exploring a large suite.

### Commit

```bash
git add package.json
git commit -m "chore(test): add test, test:watch, test:ui scripts

Wires the three Vitest entry points into pnpm scripts so tests can
be run with 'pnpm test' (single run, CI-friendly), 'pnpm test:watch'
(watch mode for development), and 'pnpm test:ui' (browser UI).

Refs: VITEST_SETUP.md Task 3"
```

---

## 5. Task 4 — Create the sample test

One passing test against `src/lib/safe-redirect.ts` — enough to prove the setup works end-to-end (test discovery, path aliases, `server-only` alias, TypeScript compilation). Covers the happy path, the known unsafe patterns documented in the source file's JSDoc, and the fallback default.

### CREATE NEW FILE: `src/lib/safe-redirect.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { safeInternalPath } from "@/lib/safe-redirect";

describe("safeInternalPath", () => {
  describe("safe paths", () => {
    it("returns a simple absolute path unchanged", () => {
      expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    });

    it("returns a nested path unchanged", () => {
      expect(safeInternalPath("/admin/properties/123")).toBe(
        "/admin/properties/123",
      );
    });

    it("returns a path with query string unchanged", () => {
      expect(safeInternalPath("/search?q=tampa")).toBe("/search?q=tampa");
    });
  });

  describe("unsafe inputs fall back", () => {
    it("falls back on null", () => {
      expect(safeInternalPath(null)).toBe("/dashboard");
    });

    it("falls back on undefined", () => {
      expect(safeInternalPath(undefined)).toBe("/dashboard");
    });

    it("falls back on empty string", () => {
      expect(safeInternalPath("")).toBe("/dashboard");
    });

    it("falls back on protocol-relative URL (//evil.com)", () => {
      expect(safeInternalPath("//evil.com/steal")).toBe("/dashboard");
    });

    it("falls back on Windows-style protocol-relative (/\\evil.com)", () => {
      expect(safeInternalPath("/\\evil.com")).toBe("/dashboard");
    });

    it("falls back on absolute URL", () => {
      expect(safeInternalPath("https://evil.com")).toBe("/dashboard");
    });

    it("falls back on path containing @ (userinfo trick)", () => {
      expect(safeInternalPath("/evil@attacker.com")).toBe("/dashboard");
    });

    it("falls back on path containing a colon", () => {
      expect(safeInternalPath("/javascript:alert(1)")).toBe("/dashboard");
    });

    it("falls back on path containing whitespace", () => {
      expect(safeInternalPath("/foo bar")).toBe("/dashboard");
    });

    it("falls back on path not starting with /", () => {
      expect(safeInternalPath("dashboard")).toBe("/dashboard");
    });
  });

  describe("custom fallback", () => {
    it("uses the provided fallback instead of the default", () => {
      expect(safeInternalPath(null, "/login")).toBe("/login");
    });

    it("uses the provided fallback when input is unsafe", () => {
      expect(safeInternalPath("//evil.com", "/home")).toBe("/home");
    });

    it("still returns a safe input when custom fallback is provided", () => {
      expect(safeInternalPath("/admin", "/login")).toBe("/admin");
    });
  });
});
```

### Commit

```bash
git add src/lib/safe-redirect.test.ts
git commit -m "test(safe-redirect): sample vitest suite for safeInternalPath

Adds the first Vitest test file to prove the test setup works
end-to-end: test discovery, @/ path alias, server-only alias, and
TypeScript compilation. Covers the safe path cases, the unsafe
patterns documented in the source JSDoc (open-redirect vectors from
security audit Finding #7), and the custom fallback behavior.

Refs: VITEST_SETUP.md Task 4"
```

---

## 6. Verification

### 6.1 Run the test suite

```bash
pnpm test
```

**Expected output** (exact numbers will match the 17 test cases above):

```
 ✓ src/lib/safe-redirect.test.ts (17 tests)

 Test Files  1 passed (1)
      Tests  17 passed (17)
```

If the test output shows any failure, stop and report the exact error. Do not "fix" the sample test by loosening assertions — if a test fails, either the source file has drifted from what the test expects, or the setup is wrong.

### 6.2 Commit history

```bash
git log main..HEAD --oneline
```

Expected (4 commits, most recent first; SHAs will differ):

```
<sha> test(safe-redirect): sample vitest suite for safeInternalPath
<sha> chore(test): add test, test:watch, test:ui scripts
<sha> chore(test): vitest config and server-only alias
<sha> chore(test): add vitest and @vitest/ui
```

### 6.3 Diff stat

```bash
git diff main..HEAD --stat
```

Expected files (5 total, 2 edits + 3 new):

- `package.json`
- `pnpm-lock.yaml`
- `vitest.config.ts` *(new)*
- `test/mocks/server-only.ts` *(new)*
- `src/lib/safe-redirect.test.ts` *(new)*

**If any other file appears in the diff, stop and report.** Nothing else should have been touched.

### 6.4 Build still passes

```bash
pnpm build
```

Must succeed. Vitest, `@vitest/ui`, the config file, the mock, and the test file should all be invisible to the Next.js production build. If the build fails, something in the config leaked into the build — stop and report.

### 6.5 Lint still passes

```bash
pnpm lint
```

Must succeed. Pre-existing lint warnings unrelated to the new files are acceptable.

---

## 7. Extending later (reference only — do NOT do any of this now)

When you or Claude Code need to test React components later, add these **in a separate commit on a separate branch**:

1. Install: `pnpm add -D jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`
2. In `vitest.config.ts`, change `environment: "node"` to `environment: "jsdom"` or use per-file `// @vitest-environment jsdom` docblocks to mix.
3. Create `test/setup.ts` with `import "@testing-library/jest-dom/vitest"` and add `setupFiles: ["./test/setup.ts"]` to the Vitest config.

When you need coverage reports:

1. Install: `pnpm add -D @vitest/coverage-v8`
2. Add `coverage: { provider: "v8", reporter: ["text", "html"] }` to the Vitest config.
3. Run with `pnpm test --coverage`.

When you need CI integration:

1. In `.github/workflows/ci.yml`, add a step that runs `pnpm install && pnpm test` on pull requests.

None of this belongs in this PR. Each is a separate, scoped follow-up.

---

## 8. Push and open PR

Only after §6 verification fully passes:

```bash
git push -u origin chore/vitest-setup
```

Open a PR on GitHub from `chore/vitest-setup` to `main`. Suggested description:

> Adds Vitest as the project's unit test runner, with one working sample test against `src/lib/safe-redirect.ts`.
>
> - **Task 1** — Installs `vitest` and `@vitest/ui`.
> - **Task 2** — Creates `vitest.config.ts` with `@/*` path alias and a `server-only` stub that prevents the real package from throwing in test mode. Mock lives at `test/mocks/server-only.ts`.
> - **Task 3** — Adds `pnpm test`, `pnpm test:watch`, `pnpm test:ui` scripts. Existing scripts untouched.
> - **Task 4** — Sample test covering 17 cases for `safeInternalPath` (happy path, all documented unsafe input patterns, custom fallback). Proves the setup works end-to-end.
>
> 5 files, 2 new dependencies. No source code changes. Next step is a separate task to generate unit tests for the other security-sensitive files (`phone-to-code.ts`, `property-image-upload.ts`, `ratelimit.ts`, Stripe webhook handler).

---

## 9. Done checklist

Fill in and paste back when finished:

- [ ] Pre-flight passed (clean main, branch created, baseline files present)
- [ ] Task 1 — `vitest` and `@vitest/ui` installed and committed
- [ ] Task 2 — `vitest.config.ts` and `test/mocks/server-only.ts` created and committed
- [ ] Task 3 — `package.json` test scripts added and committed
- [ ] Task 4 — `src/lib/safe-redirect.test.ts` created and committed
- [ ] §6.1 `pnpm test` passed with 17/17 tests green
- [ ] §6.2 commit history verified (4 commits in correct order)
- [ ] §6.3 diff stat verified (5 files, no extras)
- [ ] §6.4 `pnpm build` still passes
- [ ] §6.5 `pnpm lint` still passes
- [ ] Branch pushed to origin
- [ ] PR opened with description from §8

If any item is unchecked, report which one and why before stopping.
