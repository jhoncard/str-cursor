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
