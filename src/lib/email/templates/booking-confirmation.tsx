import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import {
  SITE_CONTACT_EMAIL,
  SITE_CONTACT_PHONE_TEL_HREFS,
} from "@/lib/site-contact";

interface BookingConfirmationEmailProps {
  guestFirstName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  confirmationCode: string;
  totalAmount: string;
  /** Smart lock / Seam guest code when provisioned. */
  doorCode?: string;
}

export function BookingConfirmationEmail({
  guestFirstName,
  propertyName,
  checkIn,
  checkOut,
  confirmationCode,
  totalAmount,
  doorCode,
}: BookingConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Booking confirmed - {propertyName} ({confirmationCode})
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>Feathers Houses</Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Booking Confirmed
            </Heading>
            <Text style={paragraph}>
              Hi {guestFirstName}, your reservation is confirmed! Here are
              your booking details:
            </Text>

            <Section style={detailsBox}>
              <Text style={detailLabel}>Confirmation Code</Text>
              <Text style={detailValue}>{confirmationCode}</Text>

              <Text style={detailLabel}>Property</Text>
              <Text style={detailValue}>{propertyName}</Text>

              <Text style={detailLabel}>Check-in</Text>
              <Text style={detailValue}>{checkIn}</Text>

              <Text style={detailLabel}>Check-out</Text>
              <Text style={detailValue}>{checkOut}</Text>

              <Text style={detailLabel}>Total Amount</Text>
              <Text style={detailValue}>${totalAmount}</Text>

              {doorCode ? (
                <>
                  <Text style={detailLabel}>Door code</Text>
                  <Text style={detailValue}>{doorCode}</Text>
                  <Text style={detailNote}>
                    This code is active from 30 minutes before your check-in
                    time until 30 minutes after your check-out time (property
                    local time). Save it for arrival.
                  </Text>
                </>
              ) : null}
            </Section>

            <Hr style={hr} />

            <Heading as="h3" style={subheading}>
              What to Expect
            </Heading>
            <Text style={paragraph}>
              {doorCode
                ? "Bring your door code with you. You will also receive detailed check-in instructions and directions if we send them separately."
                : "You will receive detailed check-in instructions before your arrival, including access information and directions to the property. If you have any questions before then, do not hesitate to reach out."}
            </Text>

            <Hr style={hr} />

            <Heading as="h3" style={subheading}>
              Cancellation Policy
            </Heading>
            <Text style={paragraph}>
              Please review our{" "}
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://feathershouses.com"}/cancellation-policy`}
                style={link}
              >
                cancellation policy
              </Link>{" "}
              for details on modifications and refunds.
            </Text>

            <Hr style={hr} />

            <Text style={paragraph}>
              Need help? Contact us at{" "}
              <Link href={`mailto:${SITE_CONTACT_EMAIL}`} style={link}>
                {SITE_CONTACT_EMAIL}
              </Link>{" "}
              or call{" "}
              <Link href={SITE_CONTACT_PHONE_TEL_HREFS[0]} style={link}>
                (603) 484-9623
              </Link>{" "}
              or{" "}
              <Link href={SITE_CONTACT_PHONE_TEL_HREFS[1]} style={link}>
                (651) 285-6410
              </Link>
              .
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Feathers Houses &bull; Tampa Bay, FL
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: "#f4f6f8",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
};

const header: React.CSSProperties = {
  backgroundColor: "#2b2b36",
  padding: "32px 40px",
  borderRadius: "12px 12px 0 0",
};

const headerTitle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 600,
  margin: 0,
};

const content: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "32px 40px",
};

const heading: React.CSSProperties = {
  color: "#2b2b36",
  fontSize: "24px",
  fontWeight: 600,
  margin: "0 0 16px",
};

const subheading: React.CSSProperties = {
  color: "#2b2b36",
  fontSize: "16px",
  fontWeight: 600,
  margin: "0 0 8px",
};

const paragraph: React.CSSProperties = {
  color: "#4a4a5a",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const detailsBox: React.CSSProperties = {
  backgroundColor: "#f4f6f8",
  borderRadius: "8px",
  padding: "20px 24px",
  margin: "16px 0 24px",
};

const detailLabel: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 500,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 2px",
};

const detailValue: React.CSSProperties = {
  color: "#2b2b36",
  fontSize: "15px",
  fontWeight: 600,
  margin: "0 0 12px",
};

const detailNote: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 12px",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const link: React.CSSProperties = {
  color: "#2b2b36",
  textDecoration: "underline",
};

const footer: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "16px 40px 24px",
  borderRadius: "0 0 12px 12px",
  borderTop: "1px solid #e5e7eb",
};

const footerText: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: 0,
};
