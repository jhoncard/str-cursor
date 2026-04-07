import "server-only";

import { getPriceLabsConfig } from "./config";

export class PriceLabsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string
  ) {
    super(message);
    this.name = "PriceLabsApiError";
  }
}

/**
 * Low-level HTTP call to PriceLabs. Path is appended to `PRICELABS_API_BASE_URL`.
 * Auth: `PRICELABS_API_KEY` as Bearer by default; set `PRICELABS_AUTH_BEARER=false` to send `X-API-Key` instead (if required by your program).
 */
export async function priceLabsRequest(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const { apiKey, baseUrl, useBearerAuth } = getPriceLabsConfig();
  if (!apiKey) {
    throw new Error("PRICELABS_API_KEY is not set.");
  }

  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (useBearerAuth) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  } else {
    headers.set("X-API-Key", apiKey);
  }

  const res = await fetch(url, { ...init, headers });
  return res;
}

export async function priceLabsJson<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await priceLabsRequest(path, init);
  const text = await res.text();
  if (!res.ok) {
    throw new PriceLabsApiError(
      `PriceLabs API error (${res.status})`,
      res.status,
      text
    );
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new PriceLabsApiError("Invalid JSON from PriceLabs", res.status, text);
  }
}
