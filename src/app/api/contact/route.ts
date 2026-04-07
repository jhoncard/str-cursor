import { NextResponse } from "next/server";
import { z } from "zod";
import { isResendConfigured, sendEmail } from "@/lib/email";
import { ContactFormEmail } from "@/lib/email/templates/contact-form";
import { CONTACT_FORM_INBOX_EMAIL } from "@/lib/site-contact";
import {
  assertWithinLimit,
  clientIpFromHeaders,
  contactLimiter,
} from "@/lib/ratelimit";

const isDev = process.env.NODE_ENV === "development";

// Security: server-side schema validation. Frontend validation is UX, not
// security — every input must be re-checked here. Limits prevent log forging
// (\n stripped via .trim()), oversize bodies, and malformed emails reaching
// Resend. See security audit Finding #3 (CWE-20).
const ContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1).max(5000),
});

export async function POST(request: Request) {
  try {
    // Security: rate limit by client IP to stop attackers from emptying
    // your Resend quota and getting your domain flagged for spam.
    // See security audit Finding #4 (CWE-770).
    const ip = clientIpFromHeaders(request.headers);
    const limit = await assertWithinLimit(contactLimiter, `contact:${ip}`);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a few minutes." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfter) },
        },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const parsed = ContactSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the form fields and try again." },
        { status: 400 },
      );
    }
    const { name, email, phone, message } = parsed.data;

    const inbox =
      process.env.CONTACT_EMAIL?.trim() || CONTACT_FORM_INBOX_EMAIL;

    if (!isResendConfigured()) {
      if (isDev) {
        console.warn("[contact] RESEND_API_KEY is not set; skipping send.", {
          to: inbox,
          name: name.trim(),
          email: email.trim(),
          phone: phone?.trim(),
          messagePreview: message.trim().slice(0, 200),
        });
        return NextResponse.json({ success: true, devEmailSkipped: true });
      }
      return NextResponse.json(
        {
          error:
            "Contact email is not configured on the server. Please reach us directly.",
          hint: `Email ${CONTACT_FORM_INBOX_EMAIL}`,
        },
        { status: 503 },
      );
    }

    await sendEmail({
      to: inbox,
      subject: `Contact Form: ${name.trim()}`,
      body: ContactFormEmail({
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim(),
        message: message.trim(),
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    const messageText =
      error instanceof Error ? error.message : "Unknown error";
    const resendHint =
      "Verify RESEND_API_KEY and that EMAIL_FROM uses an address on a domain verified at resend.com/domains.";
    return NextResponse.json(
      {
        error: isDev
          ? messageText
          : "Failed to send message. Please try again or email us directly.",
        hint: isDev
          ? resendHint
          : `If this keeps happening, email us at ${CONTACT_FORM_INBOX_EMAIL}.`,
      },
      { status: 500 },
    );
  }
}
