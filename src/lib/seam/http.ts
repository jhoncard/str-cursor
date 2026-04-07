import "server-only";

const SEAM_API_BASE = "https://connect.getseam.com";

export function isSeamConfigured(): boolean {
  return Boolean(process.env.SEAM_API_KEY?.trim());
}

export async function seamPost(path: string, body: Record<string, unknown>): Promise<unknown> {
  const apiKey = process.env.SEAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SEAM_API_KEY is not set.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const workspaceId = process.env.SEAM_WORKSPACE_ID?.trim();
  if (workspaceId) {
    headers["seam-workspace"] = workspaceId;
  }

  const res = await fetch(`${SEAM_API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Seam: invalid JSON response (${res.status}).`);
  }

  if (!res.ok) {
    const err =
      typeof data === "object" && data !== null && "error" in data
        ? JSON.stringify((data as { error: unknown }).error)
        : text.slice(0, 500);
    throw new Error(`Seam HTTP ${res.status}: ${err}`);
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "ok" in data &&
    (data as { ok?: boolean }).ok === false
  ) {
    throw new Error(`Seam API error: ${JSON.stringify(data)}`);
  }

  return data;
}
