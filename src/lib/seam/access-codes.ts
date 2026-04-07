import "server-only";

import { randomInt } from "node:crypto";

import { seamPost } from "./http";

export function generateFourDigitCode(): string {
  return String(randomInt(1000, 10000));
}

function unwrapAccessCodePayload(data: unknown): {
  accessCodeId: string;
  code: string;
} | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const ac = (root.access_code ?? root) as Record<string, unknown>;
  const accessCodeId = ac.access_code_id;
  const code = ac.code;
  if (typeof accessCodeId === "string" && typeof code === "string") {
    return { accessCodeId, code };
  }
  return null;
}

export async function seamCreateAccessCode(input: {
  deviceId: string;
  name: string;
  code: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<{ accessCodeId: string; code: string }> {
  const data = await seamPost("/access_codes/create", {
    device_id: input.deviceId,
    name: input.name,
    code: input.code,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
  });
  const parsed = unwrapAccessCodePayload(data);
  if (!parsed) {
    throw new Error("Seam: unexpected response from access_codes/create.");
  }
  return { accessCodeId: parsed.accessCodeId, code: parsed.code };
}

export async function seamUpdateAccessCode(input: {
  accessCodeId: string;
  name?: string;
  code?: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<void> {
  const body: Record<string, unknown> = {
    access_code_id: input.accessCodeId,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
  };
  if (input.name) body.name = input.name;
  if (input.code) body.code = input.code;
  await seamPost("/access_codes/update", body);
}
