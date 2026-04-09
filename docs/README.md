# str-cursor Documentation

Engineering decisions, security audits, feature specs, and deployment
guides for the Woven Services LLC direct booking platform.

## Security audits and fixes

These document each security audit pass and the fixes that followed.
Read them in order — each pass builds on the previous one's
remediations.

- [`security/SECURITY_FIXES_PASS_1.md`](security/SECURITY_FIXES_PASS_1.md) — First-pass critical fixes (admin auth bypass, Stripe PII leak, timing-safe bearer tokens, dev error echo).
- [`security/SECURITY_FIXES_PASS_2.md`](security/SECURITY_FIXES_PASS_2.md) — Second-pass hardening (Zod schemas, rate limiting, magic-byte file validation, open-redirect protection).
- [`security/SECURITY_AUDIT_PASS_3.md`](security/SECURITY_AUDIT_PASS_3.md) — Third audit findings (phone-derived door codes, quote endpoint hardening, hono advisories).
- [`security/SECURITY_FIXES_PASS_3.md`](security/SECURITY_FIXES_PASS_3.md) — Third-pass fixes applied.

## Features

Specs and execution plans for major features. Each is structured as
an executable task document with find/replace blocks.

- [`features/SEAM_PHONE_CODE_FEATURE.md`](features/SEAM_PHONE_CODE_FEATURE.md) — Original Seam smart-lock integration with per-reservation time overrides. (Note: phone-derived codes were later removed in Pass 3.)
- [`features/PHOTO_COMPRESSION_FIX.md`](features/PHOTO_COMPRESSION_FIX.md) — Client-side image compression for admin photo uploads.
- [`features/VITEST_SETUP.md`](features/VITEST_SETUP.md) — Vitest test runner foundation.

## Deployment

- [`deployment/CLOUDFLARE_DEPLOYMENT.md`](deployment/CLOUDFLARE_DEPLOYMENT.md) — Parallel Cloudflare Pages deployment guide on the `deployment/cloudflare` branch (kept separate from the Vercel production deployment on `main`).

## How these docs are used

Each task document is structured for execution by an AI coding agent
(Cursor or Claude Code). The format is intentional: `FIND` / `REPLACE
WITH` blocks that the agent applies verbatim, with explicit
verification steps and locked-in design decisions in the §0 section
of each doc.

To execute one, use the prompt pattern documented in the
[Anthropic Claude docs](https://docs.claude.com) or the Cursor agent
mode. The docs are intentionally kept separate from the source code
so they don't trigger TypeScript or build pipelines.