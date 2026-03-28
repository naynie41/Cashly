import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export interface InvoiceEmailProps {
  businessName: string
  clientName: string
  invoiceNumber: string
  invoiceTotal: string
  dueDate: string
  pdfUrl: string
  paymentUrl?: string | undefined
  notes?: string | null | undefined
}

export function InvoiceEmail({
  businessName,
  clientName,
  invoiceNumber,
  invoiceTotal,
  dueDate,
  pdfUrl,
  paymentUrl,
  notes,
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Invoice {invoiceNumber} from {businessName} — {invoiceTotal} due {dueDate}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={headerHeading}>{businessName}</Heading>
          </Section>

          {/* Body */}
          <Section style={content}>
            <Text style={greeting}>Hi {clientName},</Text>
            <Text style={paragraph}>
              Please find your invoice from {businessName} attached to this email.
            </Text>

            {/* Invoice summary */}
            <Section style={invoiceBox}>
              <Row>
                <Column style={invoiceLabel}>Invoice Number</Column>
                <Column style={invoiceValue}>{invoiceNumber}</Column>
              </Row>
              <Row>
                <Column style={invoiceLabel}>Amount Due</Column>
                <Column style={{ ...invoiceValue, ...invoiceTotal_ }}>{invoiceTotal}</Column>
              </Row>
              <Row>
                <Column style={invoiceLabel}>Due Date</Column>
                <Column style={invoiceValue}>{dueDate}</Column>
              </Row>
            </Section>

            {notes ? (
              <Section style={notesSection}>
                <Text style={notesLabel}>Notes</Text>
                <Text style={notesText}>{notes}</Text>
              </Section>
            ) : null}

            {/* CTAs */}
            <Section style={ctaSection}>
              <Button style={primaryBtn} href={pdfUrl}>
                Download PDF
              </Button>
              {paymentUrl ? (
                <Button style={secondaryBtn} href={paymentUrl}>
                  Pay Now
                </Button>
              ) : null}
            </Section>

            <Text style={paragraph}>
              If you have any questions about this invoice, please reply to this email.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>Powered by Cashly</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#ECEAE3',
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: 0,
  padding: '40px 0',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  maxWidth: '560px',
  margin: '0 auto',
  borderRadius: '4px',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  backgroundColor: '#0A0A09',
  padding: '32px 40px',
}

const headerHeading: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 900,
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '-0.03em',
}

const content: React.CSSProperties = {
  padding: '32px 40px',
}

const greeting: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#0A0A09',
  margin: '0 0 12px',
}

const paragraph: React.CSSProperties = {
  fontSize: '14px',
  color: '#555',
  lineHeight: '1.6',
  margin: '0 0 20px',
}

const invoiceBox: React.CSSProperties = {
  backgroundColor: '#F7F6F2',
  borderRadius: '4px',
  padding: '20px 24px',
  margin: '0 0 24px',
}

const invoiceLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#888880',
  paddingBottom: '10px',
  width: '50%',
}

const invoiceValue: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: '#0A0A09',
  paddingBottom: '10px',
  textAlign: 'right' as const,
}

const invoiceTotal_: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
}

const notesSection: React.CSSProperties = {
  margin: '0 0 24px',
}

const notesLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#888880',
  margin: '0 0 4px',
}

const notesText: React.CSSProperties = {
  fontSize: '13px',
  color: '#555',
  lineHeight: '1.6',
  margin: 0,
}

const ctaSection: React.CSSProperties = {
  margin: '0 0 24px',
}

const primaryBtn: React.CSSProperties = {
  backgroundColor: '#0A0A09',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 600,
  padding: '12px 24px',
  borderRadius: '4px',
  textDecoration: 'none',
  display: 'inline-block',
  marginRight: '12px',
}

const secondaryBtn: React.CSSProperties = {
  backgroundColor: '#CCFF00',
  color: '#0A0A09',
  fontSize: '13px',
  fontWeight: 700,
  padding: '12px 24px',
  borderRadius: '4px',
  textDecoration: 'none',
  display: 'inline-block',
}

const divider: React.CSSProperties = {
  borderColor: 'rgba(0,0,0,0.08)',
  margin: 0,
}

const footer: React.CSSProperties = {
  padding: '16px 40px',
  backgroundColor: '#0A0A09',
}

const footerText: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.35)',
  margin: 0,
}
