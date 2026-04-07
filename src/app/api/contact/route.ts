import { NextResponse } from "next/server";
import { isResendConfigured, sendEmail } from "@/lib/email";
import { ContactFormEmail } from "@/lib/email/templates/contact-form";
import { CONTACT_FORM_INBOX_EMAIL } from "@/lib/site-contact";

const isDev = process.env.NODE_ENV === "development";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body as {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 },
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

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
    // Security: log details server-side, but never echo error.message to the
    // client — even in dev mode. Resend errors can include API-key prefixes,
    // domain verification state, and other backend metadata.
    // See security audit Finding #6 (CWE-209).
    console.error("Contact form error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to send message. Please try again or email us directly.",
        hint: `If this keeps happening, email us at ${CONTACT_FORM_INBOX_EMAIL}.`,
      },
      { status: 500 },
    );
  }
}
