// Empty stub that replaces the real "server-only" package during
// Vitest runs. See vitest.config.ts and docs/features/VITEST_SETUP.md §0
// decision 3.
//
// The real package exports nothing and exists only to throw at build
// time if accidentally imported from a client bundle. In tests there
// is no such distinction, so replacing it with an empty module is safe.
export {};
