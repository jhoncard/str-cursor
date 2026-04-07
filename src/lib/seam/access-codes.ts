import "server-only";

import { randomInt } from "node:crypto";

import { getSeamClient } from "./http";

/** Fallback random 4-digit code when the guest phone can't yield one. */
export function generateFourDigitCode(): string {
  return String(randomInt(1000, 10000));
}

export async function seamCreateAccessCode(input: {
  deviceId: string;
  name: string;
  code: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<{ accessCodeId: string; code: string }> {
  const seam = getSeamClient();
  const result = await seam.accessCodes.create({
    device_id: input.deviceId,
    name: input.name,
    code: input.code,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
  });

  // SDK returns the access_code object directly.
  if (!result?.access_code_id || !result?.code) {
    throw new Error("Seam: unexpected response from accessCodes.create.");
  }
  return { accessCodeId: result.access_code_id, code: result.code };
}

export async function seamUpdateAccessCode(input: {
  accessCodeId: string;
  name?: string;
  code?: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<void> {
  const seam = getSeamClient();
  await seam.accessCodes.update({
    access_code_id: input.accessCodeId,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
    ...(input.name ? { name: input.name } : {}),
    ...(input.code ? { code: input.code } : {}),
  });
}
