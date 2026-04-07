import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface HostNotificationEmailProps {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  totalAmount: string;
  confirmationCode: string;
  specialRequests?: string;
  doorCode?: string;
}

export function HostNotificationEmail({
  guestName,
  guestEmail,
  guestPhone,
  propertyName,
  checkIn,
  checkOut,
  numGuests,
  totalAmount,
  confirmationCode,
  specialRequests,
  doorCode,
}: HostNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New booking: {propertyName} - {confirmationCode}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>Feathers Houses</Heading>
            <Text style={headerSubtitle}>Host Notification</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              New Booking Received
            </Heading>
            <Text style={paragraph}>
              A new booking has been made. Here are the details:
            </Text>

            <Section style={detailsBox}>
              <Text style={sectionLabel}>Booking Details</Text>

              <Text style={detailLabel}>Confirmation Code</Text>
              <Text style={detailValue}>{confirmationCode}</Text>

              <Text style={detailLabel}>Property</Text>
              <Text style={detailValue}>{propertyName}</Text>

              <Text style={detailLabel}>Check-in</Text>
              <Text style={detailValue}>{checkIn}</Text>

              <Text style={detailLabel}>Check-out</Text>
              <Text style={detailValue}>{checkOut}</Text>

              <Text style={detailLabel}>Number of Guests</Text>
              <Text style={detailValue}>{numGuests}</Text>

              <Text style={detailLabel}>Total Amount</Text>
              <Text style={detailValue}>${totalAmount}</Text>

              {doorCode ? (
                <>
                  <Text style={detailLabel}>Guest door code (Seam)</Text>
                  <Text style={detailValue}>{doorCode}</Text>
                </>
              ) : null}
            </Section>

            <Section style={detailsBox}>
              <Text style={sectionLabel}>Guest Information</Text>

              <Text style={detailLabel}>Name</Text>
              <Text style={detailValue}>{guestName}</Text>

              <Text style={detailLabel}>Email</Text>
              <Text style={detailValue}>{guestEmail}</Text>

              {guestPhone && (
                <>
                  <Text style={detailLabel}>Phone</Text>
                  <Text style={detailValue}>{guestPhone}</Text>
                </>
              )}
            </Section>

            {specialRequests && (
              <>
                <Hr style={hr} />
                <Heading as="h3" style={subheading}>
                  Special Requests
                </Heading>
                <Text style={paragraph}>{specialRequests}</Text>
              </>
            )}
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Feathers Houses &bull; Host Dashboard
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

const headerSubtitle: React.CSSProperties = {
  color: "#ffffff99",
  fontSize: "13px",
  margin: "4px 0 0",
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
  margin: "16px 0",
};

const sectionLabel: React.CSSProperties = {
  color: "#2b2b36",
  fontSize: "14px",
  fontWeight: 600,
  margin: "0 0 12px",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "8px",
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

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
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
