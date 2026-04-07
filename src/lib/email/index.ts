import { Resend } from "resend";
import * as React from "react";

let _resend: Resend | null = null;

/** True when `RESEND_API_KEY` is set (trimmed non-empty). */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getResend(): Resend {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }
  _resend = new Resend(apiKey);
  return _resend;
}

const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? "Feathers Houses <bookings@feathershouses.com>";

export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: React.ReactElement;
}) {
  const { data, error } = await getResend().emails.send({
    from: DEFAULT_FROM,
    to,
    subject,
    react: body,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
