import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export interface ReceiptEmailProps {
  businessName: string
  clientName: string
  receiptNumber: string
  invoiceNumber: string
  amountPaid: string
  paidAt: string
  paymentMethod: string
  paymentReference: string
  brandColor?: string | undefined
  logoUrl?: string | null | undefined
}

export function ReceiptEmail({
  businessName,
  clientName,
  receiptNumber,
  invoiceNumber,
  amountPaid,
  paidAt,
  paymentMethod,
  paymentReference,
  brandColor = '#0A0A09',
  logoUrl,
}: ReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Receipt {receiptNumber} from {businessName} — {amountPaid} received
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Brand stripe */}
          <Section style={{ ...stripe, backgroundColor: brandColor }} />

          {/* Identity */}
          <Section style={identity}>
            <Row>
              <Column style={{ verticalAlign: 'top' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt={businessName} width={48} height={48} style={logoStyle} />
                ) : null}
                <Text style={bizName}>{businessName}</Text>
              </Column>
              <Column style={{ verticalAlign: 'top', textAlign: 'right' }}>
                <Text style={wordmark}>RECEIPT</Text>
                <Text style={receiptNumberStyle}>
                  <span style={{ color: brandColor, marginRight: 4 }}>№</span>
                  {receiptNumber}
                </Text>
                <Text style={{ ...paidPill, color: PAID_GREEN, borderColor: PAID_GREEN }}>
                  ● Paid
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Greeting + thank you */}
          <Section style={greetingSection}>
            <Text style={greeting}>Hi {clientName},</Text>
            <Text style={paragraph}>
              We've received your payment of <strong style={{ color: '#0A0A09' }}>{amountPaid}</strong>{' '}
              for invoice {invoiceNumber}. Your official receipt is attached as a PDF for your records.
              Thank you.
            </Text>
          </Section>

          {/* Summary band */}
          <Section style={summaryBand}>
            <Row>
              <Column style={summaryCell}>
                <Text style={summaryLbl}>Amount Paid</Text>
                <Text style={summaryValStrong}>{amountPaid}</Text>
              </Column>
              <Column style={{ ...summaryCell, ...summaryCellMid }}>
                <Text style={summaryLbl}>Paid On</Text>
                <Text style={summaryVal}>{paidAt}</Text>
              </Column>
              <Column style={summaryCell}>
                <Text style={summaryLbl}>Method</Text>
                <Text style={summaryVal}>{capitalise(paymentMethod)}</Text>
              </Column>
            </Row>
          </Section>

          {/* References */}
          <Section style={refs}>
            <Row>
              <Column style={refCell}>
                <Text style={summaryLbl}>Receipt</Text>
                <Text style={refVal}>{receiptNumber}</Text>
              </Column>
              <Column style={refCell}>
                <Text style={summaryLbl}>Invoice</Text>
                <Text style={refVal}>{invoiceNumber}</Text>
              </Column>
              <Column style={refCell}>
                <Text style={summaryLbl}>Payment Ref</Text>
                <Text style={refValSmall}>{paymentReference}</Text>
              </Column>
            </Row>
          </Section>

          <Section style={signOff}>
            <Text style={paragraph}>
              The PDF receipt attached to this email is your official record of payment.
              <br />— {businessName}
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              Powered by{' '}
              <span style={{ color: brandColor, fontWeight: 700 }}>Cashly</span>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

function capitalise(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Styles (match InvoiceEmail.tsx — same brand language) ─────────────────────

const PAID_GREEN = '#0F7A52'

const body: React.CSSProperties = {
  backgroundColor: '#ECEAE3',
  fontFamily:
    "'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '40px 0',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  maxWidth: '600px',
  margin: '0 auto',
}

const stripe: React.CSSProperties = {
  height: '6px',
  padding: 0,
  margin: 0,
  fontSize: 0,
  lineHeight: '6px',
}

const identity: React.CSSProperties = {
  padding: '40px 44px 28px',
}

const logoStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '14px',
  objectFit: 'contain',
  border: '1px solid rgba(10,10,9,0.08)',
  padding: 4,
}

const bizName: React.CSSProperties = {
  margin: 0,
  fontSize: '22px',
  fontWeight: 900,
  letterSpacing: '-0.02em',
  color: '#0A0A09',
  textTransform: 'uppercase',
  lineHeight: 1.05,
}

const wordmark: React.CSSProperties = {
  margin: 0,
  fontSize: '36px',
  fontWeight: 900,
  letterSpacing: '-0.04em',
  color: '#0A0A09',
  textTransform: 'uppercase',
  lineHeight: 1,
}

const receiptNumberStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  color: '#6F6F68',
}

const paidPill: React.CSSProperties = {
  display: 'inline-block',
  margin: '8px 0 0',
  padding: '4px 10px',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  border: '1px solid currentColor',
}

const greetingSection: React.CSSProperties = {
  padding: '0 44px 8px',
}

const greeting: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '15px',
  fontWeight: 600,
  color: '#0A0A09',
}

const paragraph: React.CSSProperties = {
  margin: '0 0 18px',
  fontSize: '14px',
  color: '#555',
  lineHeight: 1.65,
}

const summaryBand: React.CSSProperties = {
  margin: '8px 44px 0',
  borderTop: '2px solid #0A0A09',
  borderBottom: '1px solid rgba(10,10,9,0.18)',
  backgroundColor: '#FAF9F5',
  padding: '18px 18px',
}

const summaryCell: React.CSSProperties = {
  verticalAlign: 'top',
  padding: '0 6px',
}

const summaryCellMid: React.CSSProperties = {
  borderLeft: '1px solid rgba(10,10,9,0.08)',
  borderRight: '1px solid rgba(10,10,9,0.08)',
}

const summaryLbl: React.CSSProperties = {
  margin: 0,
  fontSize: '9px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  color: '#6F6F68',
}

const summaryVal: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: '14px',
  fontWeight: 600,
  color: '#0A0A09',
  letterSpacing: '-0.01em',
}

const summaryValStrong: React.CSSProperties = {
  ...summaryVal,
  fontWeight: 800,
  fontSize: '16px',
}

const refs: React.CSSProperties = {
  padding: '14px 44px 0',
}

const refCell: React.CSSProperties = {
  verticalAlign: 'top',
  padding: '0 6px',
}

const refVal: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: '12px',
  fontWeight: 600,
  color: '#0A0A09',
  fontFamily:
    "'Barlow', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
}

const refValSmall: React.CSSProperties = {
  ...refVal,
  fontSize: '10.5px',
  wordBreak: 'break-all',
}

const signOff: React.CSSProperties = {
  padding: '24px 44px 8px',
}

const divider: React.CSSProperties = {
  borderColor: 'rgba(10,10,9,0.18)',
  borderTopWidth: 1,
  margin: '24px 0 0',
}

const footer: React.CSSProperties = {
  padding: '16px 44px',
  textAlign: 'center' as const,
}

const footerText: React.CSSProperties = {
  margin: 0,
  fontSize: '10px',
  color: '#A8A8A0',
  fontWeight: 600,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
}
