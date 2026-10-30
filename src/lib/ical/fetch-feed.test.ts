import { describe, it, expect, afterEach, vi } from "vitest";
import { fetchIcsText } from "@/lib/ical/fetch-feed";

// Regression cover for security audit Pass 3 finding #17 (CWE-770), plus the
// redirect re-validation that keeps finding #13's SSRF guard effective.
// See docs/security/SECURITY_AUDIT_PASS_3.md.

const FEED_URL = "https://calendar.example.com/feed.ics";
const ICS = "BEGIN:VCALENDAR\r\nEND:VCALENDAR";

/** Installs a stub global fetch for one test. */
function stubFetch(handler: (url: string) => Response) {
  vi.stubGlobal("fetch", (input: RequestInfo | URL) =>
    Promise.resolve(handler(String(input))),
  );
}

function redirectTo(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchIcsText", () => {
  describe("redirects are re-validated (guards finding #13)", () => {
    it("rejects a redirect into the cloud metadata endpoint", async () => {
      stubFetch(() => redirectTo("http://169.254.169.254/latest/meta-data/"));
      await expect(fetchIcsText(FEED_URL)).rejects.toThrow(/must use https/);
    });

    it("rejects a redirect to loopback", async () => {
      stubFetch(() => redirectTo("https://localhost:3000/api/admin"));
      await expect(fetchIcsText(FEED_URL)).rejects.toThrow(
        /host is not allowed/,
      );
    });

    it("terminates on a redirect loop", async () => {
      stubFetch(() => redirectTo(FEED_URL));
      await expect(fetchIcsText(FEED_URL)).rejects.toThrow(
        /redirected too many times/,
      );
    });

    it("rejects a redirect with no location header", async () => {
      stubFetch(() => new Response(null, { status: 302 }));
      await expect(fetchIcsText(FEED_URL)).rejects.toThrow(
        /redirect with no location/,
      );
    });

    it("follows a redirect to an allowed host", async () => {
      let hop = 0;
      stubFetch(() =>
        hop++ === 0
          ? redirectTo("https://cdn.example.com/real.ics")
          : new Response(ICS, { status: 200 }),
      );
      await expect(fetchIcsText(FEED_URL)).resolves.toBe(ICS);
    });
  });

  describe("response size is capped", () => {
    it("rejects when content-length exceeds the cap", async () => {
      stubFetch(
        () =>
          new Response("x", {
            status: 200,
            headers: { "content-length": String(9 * 1024 * 1024) },
          }),
      );
      await expect(fetchIcsText(FEED_URL)).rejects.toThrow(/too large/);
    });

    it("rejects an oversized body streamed without content-length", async () => {
      stubFetch(() => {
        const chunk = new Uint8Array(1024 * 1024);
        let sent = 0;
        return new Response(
          new ReadableStream({
            pull(controller) {
              if (sent++ >= 9) return controller.close();
              controller.enqueue(chunk);
            },
          }),
          { status: 200 },
        );
      });
      await expect(fetchIcsText(FEED_URL)).rejects.toThrow(/too large/);
    });

    it("accepts a body under the cap", async () => {
      stubFetch(() => new Response(ICS, { status: 200 }));
      await expect(fetchIcsText(FEED_URL)).resolves.toBe(ICS);
    });
  });

  describe("failure modes surface clean messages", () => {
    it("reports a timeout without leaking the abort error", async () => {
      vi.stubGlobal("fetch", () => {
        const err = new Error("aborted");
        err.name = "TimeoutError";
        return Promise.reject(err);
      });
      await expect(fetchIcsText(FEED_URL)).rejects.toThrow(/timed out/);
    });

    it("reports a non-OK status with its code", async () => {
      stubFetch(() => new Response("nope", { status: 404 }));
      await expect(fetchIcsText(FEED_URL)).rejects.toThrow(
        /Could not fetch iCal feed \(404\)/,
      );
    });
  });

  it("rejects an unsafe URL before any fetch is attempted", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    await expect(fetchIcsText("https://127.0.0.1/cal.ics")).rejects.toThrow(
      /host is not allowed/,
    );
    expect(spy).not.toHaveBeenCalled();
  });
});
