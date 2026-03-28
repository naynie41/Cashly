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

export interface ReminderEmailProps {
  businessName: string
  clientName: string
  invoiceNumber: string
  invoiceTotal: string
  dueDate: string
  daysOverdue: number
  paymentUrl?: string | undefined
}

export function ReminderEmail({
  businessName,
  clientName,
  invoiceNumber,
  invoiceTotal,
  dueDate,
  daysOverdue,
  paymentUrl,
}: ReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`Reminder: Invoice ${invoiceNumber} from ${businessName} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header — red tint to signal urgency without being alarming */}
          <Section style={header}>
            <Heading style={headerHeading}>{businessName}</Heading>
            <Text style={headerSub}>Payment Reminder</Text>
          </Section>

          {/* Body */}
          <Section style={content}>
            <Text style={greeting}>Hi {clientName},</Text>
            <Text style={paragraph}>
              This is a friendly reminder that the following invoice is now{' '}
              <strong>
                {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
              </strong>
              . Please arrange payment at your earliest convenience.
            </Text>

            {/* Invoice summary */}
            <Section style={invoiceBox}>
              <Row>
                <Column style={invoiceLabel}>Invoice Number</Column>
                <Column style={invoiceValue}>{invoiceNumber}</Column>
              </Row>
              <Row>
                <Column style={invoiceLabel}>Amount Due</Column>
                <Column style={{ ...invoiceValue, ...invoiceTotalStyle }}>{invoiceTotal}</Column>
              </Row>
              <Row>
                <Column style={invoiceLabel}>Original Due Date</Column>
                <Column style={invoiceValue}>{dueDate}</Column>
              </Row>
              <Row>
                <Column style={invoiceLabel}>Days Overdue</Column>
                <Column style={{ ...invoiceValue, ...overdueStyle }}>{daysOverdue}</Column>
              </Row>
            </Section>

            {paymentUrl ? (
              <Section style={ctaSection}>
                <Button style={payBtn} href={paymentUrl}>
                  Pay Now
                </Button>
              </Section>
            ) : null}

            <Text style={paragraph}>
              If you have already made this payment, please disregard this message. If you have any
              questions or need to discuss a payment arrangement, please reply to this email.
            </Text>

            <Text style={paragraph}>Thank you for your prompt attention to this matter.</Text>
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
  backgroundColor: '#1a0a0a',
  padding: '32px 40px 24px',
}

const headerHeading: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 900,
  margin: '0 0 4px',
  textTransform: 'uppercase',
  letterSpacing: '-0.03em',
}

const headerSub: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  margin: 0,
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

const invoiceTotalStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
}

const overdueStyle: React.CSSProperties = {
  color: '#dc2626',
  fontWeight: 700,
}

const ctaSection: React.CSSProperties = {
  margin: '0 0 24px',
}

const payBtn: React.CSSProperties = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  padding: '12px 28px',
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
