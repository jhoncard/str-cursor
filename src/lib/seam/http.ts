import "server-only";

import { Seam } from "seam";

export function isSeamConfigured(): boolean {
  return Boolean(process.env.SEAM_API_KEY?.trim());
}

/**
 * Returns a Seam SDK client configured from env vars.
 *
 *   SEAM_API_KEY       - required. Create in Seam Console → Developer → API Keys.
 *   SEAM_WORKSPACE_ID  - optional. Only needed when your API key can access
 *                        multiple workspaces (normally it is already scoped).
 *
 * Throws when SEAM_API_KEY is missing. Call isSeamConfigured() first if you
 * want to no-op gracefully (which is how the provisioning pipeline handles it).
 *
 * See https://docs.seam.co/latest and https://www.npmjs.com/package/seam.
 */
export function getSeamClient(): Seam {
  const apiKey = process.env.SEAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SEAM_API_KEY is not set.");
  }
  const workspaceId = process.env.SEAM_WORKSPACE_ID?.trim();
  return new Seam({
    apiKey,
    ...(workspaceId ? { workspaceId } : {}),
  });
}
