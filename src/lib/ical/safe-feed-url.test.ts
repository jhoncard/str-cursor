import { describe, it, expect } from "vitest";
import { assertSafeFeedUrl } from "@/lib/ical/safe-feed-url";

// Regression cover for security audit Pass 3 finding #13 (SSRF, CWE-918).
// See docs/security/SECURITY_AUDIT_PASS_3.md.

describe("assertSafeFeedUrl", () => {
  describe("rejects non-https schemes", () => {
    it.each([
      ["plain http", "http://airbnb.com/calendar.ics"],
      ["http to cloud metadata", "http://169.254.169.254/latest/meta-data/"],
      ["file", "file:///etc/passwd"],
    ])("rejects %s", (_label, url) => {
      expect(() => assertSafeFeedUrl(url)).toThrow(/must use https/);
    });
  });

  describe("rejects unparseable input", () => {
    it.each([["bare word", "not-a-url"], ["empty", ""]])(
      "rejects %s",
      (_label, url) => {
        expect(() => assertSafeFeedUrl(url)).toThrow(/must be a valid URL/);
      },
    );
  });

  describe("rejects internal hosts over https", () => {
    it.each([
      ["cloud metadata", "https://169.254.169.254/latest/meta-data/"],
      ["localhost", "https://localhost:3000/api/admin"],
      ["IPv4 loopback", "https://127.0.0.1/x"],
      ["IPv6 loopback", "https://[::1]/x"],
      ["unspecified address", "https://0.0.0.0/x"],
      ["RFC1918 10/8", "https://10.0.0.5/internal.ics"],
      ["RFC1918 192.168/16", "https://192.168.1.10/cal.ics"],
      ["RFC1918 172.16/12 low", "https://172.16.0.9/cal.ics"],
      ["RFC1918 172.16/12 high", "https://172.31.255.1/cal.ics"],
      ["mDNS .local", "https://printer.local/cal.ics"],
    ])("rejects %s", (_label, url) => {
      expect(() => assertSafeFeedUrl(url)).toThrow(/host is not allowed/);
    });
  });

  describe("allows legitimate OTA feeds", () => {
    it.each([
      ["airbnb", "https://www.airbnb.com/calendar/ical/12345.ics?s=abc"],
      ["booking.com", "https://ical.booking.com/v1/export?t=xyz"],
      ["vrbo", "https://www.vrbo.com/icalendar/abc.ics"],
    ])("allows %s", (_label, url) => {
      expect(() => assertSafeFeedUrl(url)).not.toThrow();
    });

    it("preserves the query string on the returned URL", () => {
      const url = assertSafeFeedUrl(
        "https://www.airbnb.com/calendar/ical/12345.ics?s=abc",
      );
      expect(url.toString()).toBe(
        "https://www.airbnb.com/calendar/ical/12345.ics?s=abc",
      );
    });
  });

  describe("range boundaries are not over-matched", () => {
    // These sit just outside the blocked ranges and must stay reachable.
    it.each([
      ["just above 10/8", "https://11.0.0.1/cal.ics"],
      ["just above 172.16/12", "https://172.32.0.1/cal.ics"],
      ["not 192.168/16", "https://192.169.0.1/cal.ics"],
      ["not 169.254/16", "https://169.255.0.1/cal.ics"],
      ["host merely containing 'localhost'", "https://localhost.example.com/c.ics"],
    ])("allows %s", (_label, url) => {
      expect(() => assertSafeFeedUrl(url)).not.toThrow();
    });
  });
});
