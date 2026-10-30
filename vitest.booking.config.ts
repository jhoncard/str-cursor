import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["test/booking.integration.test.ts"],
    testTimeout: 15000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
  resolve: { alias: {
    "@": path.resolve(__dirname, "src"),
    "server-only": path.resolve(__dirname, "test/mocks/server-only.ts"),
  } },
});
