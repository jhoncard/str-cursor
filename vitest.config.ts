import path from "node:path";
import { defineConfig } from "vitest/config";

// Minimal Vitest configuration.
//
// Design notes (see docs/features/VITEST_SETUP.md §0):
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
