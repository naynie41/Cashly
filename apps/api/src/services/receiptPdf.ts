import puppeteer from 'puppeteer'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PdfUser {
  name: string
  email: string
  businessName: string | null
  logoUrl: string | null
  brandColor: string
  currency: string
  businessAddress: string | null
  businessPhone: string | null
  businessWebsite: string | null
}

interface PdfClient {
  name: string
  email: string
  phone: string | null
  address: string | null
}

interface PdfReceipt {
  receiptNumber: string
  invoiceNumber: string
  paymentReference: string
  paymentMethod: string
  amountPaid: number
  paidAt: Date
  invoiceTotal: number
}

export interface ReceiptPdfData {
  user: PdfUser
  client: PdfClient
  receipt: PdfReceipt
}

// ── PDF generator ──────────────────────────────────────────────────────────────

export async function generateReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
  const html = buildReceiptHtml(data)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

// ── HTML template ──────────────────────────────────────────────────────────────

function buildReceiptHtml({ user, client, receipt }: ReceiptPdfData): string {
  const brand = sanitizeColor(user.brandColor)
  const displayName = esc(user.businessName ?? user.name)

  const fmt = (n: number) =>
    `${user.currency} ${n.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const fmtDateTime = (d: Date) =>
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<style>
  :root {
    --ink:        #0A0A09;
    --ink-2:      #2A2A26;
    --mute:       #6F6F68;
    --mute-2:     #A8A8A0;
    --paper:      #FFFFFF;
    --paper-2:    #FAF9F5;
    --rule:       rgba(10, 10, 9, 0.08);
    --rule-strong:rgba(10, 10, 9, 0.18);
    --brand:      ${brand};
    --paid:       #0F7A52;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    background: var(--paper);
    color: var(--ink);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-feature-settings: 'tnum' on, 'lnum' on;
  }

  .page {
    width: 794px;
    min-height: 1123px;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .brand-stripe { height: 8px; background: var(--brand); width: 100%; }

  /* ── Identity row ──────────────────────────────────────────────────────── */
  .identity {
    padding: 56px 56px 36px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 48px;
    align-items: start;
  }
  .identity-left { display: flex; flex-direction: column; gap: 14px; }
  .logo-wrap {
    width: 64px; height: 64px;
    border: 1px solid var(--rule);
    display: flex; align-items: center; justify-content: center;
    background: var(--paper-2);
  }
  .logo-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }

  .biz-name {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1.05;
    color: var(--ink);
    text-transform: uppercase;
  }
  .biz-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 4px;
    font-size: 11px;
    color: var(--mute);
    line-height: 1.5;
  }

  .identity-right {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }
  .wordmark {
    font-size: 56px;
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 0.92;
    color: var(--ink);
    text-transform: uppercase;
  }
  .receipt-number {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--mute);
    font-variant-numeric: tabular-nums;
  }
  .receipt-number .hash { color: var(--brand); margin-right: 4px; }
  .paid-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border: 1px solid var(--paid);
    color: var(--paid);
  }
  .paid-pill .dot { width: 6px; height: 6px; background: var(--paid); display: inline-block; }

  /* ── Meta band ─────────────────────────────────────────────────────────── */
  .meta-band {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    border-top: 1px solid var(--rule-strong);
    border-bottom: 1px solid var(--rule);
    padding: 22px 56px;
    background: var(--paper-2);
  }
  .meta-cell { display: flex; flex-direction: column; gap: 4px; }
  .meta-cell + .meta-cell { border-left: 1px solid var(--rule); padding-left: 24px; }
  .meta-lbl {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .meta-val {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }
  .meta-val-soft { font-weight: 600; color: var(--ink-2); }

  /* ── Parties ───────────────────────────────────────────────────────────── */
  .parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 32px 56px 28px;
  }
  .party { display: flex; flex-direction: column; gap: 6px; }
  .party + .party { border-left: 1px solid var(--rule); padding-left: 32px; }
  .party-lbl {
    font-size: 9px; font-weight: 700; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--mute); margin-bottom: 4px;
  }
  .party-name { font-size: 16px; font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }
  .party-line { font-size: 11.5px; color: var(--mute); line-height: 1.55; }

  /* ── Confirmation block ────────────────────────────────────────────────── */
  .confirm {
    margin: 0 56px;
    padding: 32px;
    border: 2px solid var(--ink);
    background: var(--paper-2);
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: center;
  }
  .confirm-text { display: flex; flex-direction: column; gap: 8px; }
  .confirm-lbl {
    font-size: 9px; font-weight: 700; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--mute);
  }
  .confirm-headline {
    font-size: 18px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.01em;
    line-height: 1.4;
  }
  .confirm-amount {
    font-family: 'Barlow', sans-serif;
    font-size: 44px;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: var(--brand);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    text-align: right;
  }

  /* ── Detail grid ───────────────────────────────────────────────────────── */
  .details {
    margin: 28px 56px 0;
    border-top: 2px solid var(--ink);
    border-bottom: 2px solid var(--ink);
  }
  .detail-row {
    display: grid;
    grid-template-columns: 200px 1fr;
    border-bottom: 1px solid var(--rule);
    padding: 16px 4px;
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-row.alt { background: var(--paper-2); }
  .detail-lbl {
    font-size: 9px; font-weight: 700; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--mute);
    align-self: center;
  }
  .detail-val {
    font-size: 13px; font-weight: 600; color: var(--ink);
    font-variant-numeric: tabular-nums;
    word-break: break-all;
  }

  /* ── Footer ────────────────────────────────────────────────────────────── */
  .footer {
    margin-top: auto;
    border-top: 1px solid var(--rule-strong);
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 18px 56px;
    background: var(--paper);
  }
  .footer-cell {
    font-size: 9px; font-weight: 600; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--mute);
  }
  .footer-cell.center { text-align: center; }
  .footer-cell.right  { text-align: right; }
  .footer-cell .accent { color: var(--brand); }
</style>
</head>
<body>
<div class="page">

  <div class="brand-stripe"></div>

  <section class="identity">
    <div class="identity-left">
      ${
        user.logoUrl
          ? `<div class="logo-wrap"><img src="${esc(user.logoUrl)}" alt="${displayName}"></div>`
          : ''
      }
      <div>
        <div class="biz-name">${displayName}</div>
        <div class="biz-meta">
          <span>${esc(user.email)}</span>
          ${user.businessPhone ? `<span>${esc(user.businessPhone)}</span>` : ''}
          ${user.businessWebsite ? `<span>${esc(user.businessWebsite)}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="identity-right">
      <div class="wordmark">Receipt</div>
      <div class="receipt-number"><span class="hash">№</span>${esc(receipt.receiptNumber)}</div>
      <div class="paid-pill"><span class="dot"></span>Paid</div>
    </div>
  </section>

  <section class="meta-band">
    <div class="meta-cell">
      <span class="meta-lbl">Receipt Date</span>
      <span class="meta-val">${fmtDate(receipt.paidAt)}</span>
    </div>
    <div class="meta-cell">
      <span class="meta-lbl">For Invoice</span>
      <span class="meta-val">${esc(receipt.invoiceNumber)}</span>
    </div>
    <div class="meta-cell">
      <span class="meta-lbl">Currency</span>
      <span class="meta-val-soft">${esc(user.currency)}</span>
    </div>
    <div class="meta-cell">
      <span class="meta-lbl">Method</span>
      <span class="meta-val-soft">${esc(capitalise(receipt.paymentMethod))}</span>
    </div>
  </section>

  <section class="parties">
    <div class="party">
      <span class="party-lbl">From</span>
      <span class="party-name">${displayName}</span>
      ${user.businessAddress ? `<span class="party-line">${esc(user.businessAddress).replace(/\n/g, '<br>')}</span>` : ''}
      <span class="party-line">${esc(user.email)}</span>
      ${user.businessPhone ? `<span class="party-line">${esc(user.businessPhone)}</span>` : ''}
    </div>
    <div class="party">
      <span class="party-lbl">Received From</span>
      <span class="party-name">${esc(client.name)}</span>
      ${client.address ? `<span class="party-line">${esc(client.address).replace(/\n/g, '<br>')}</span>` : ''}
      <span class="party-line">${esc(client.email)}</span>
      ${client.phone ? `<span class="party-line">${esc(client.phone)}</span>` : ''}
    </div>
  </section>

  <section class="confirm">
    <div class="confirm-text">
      <span class="confirm-lbl">Payment Confirmed</span>
      <span class="confirm-headline">
        Thank you. Payment received in full for invoice ${esc(receipt.invoiceNumber)}.
      </span>
    </div>
    <div class="confirm-amount">${fmt(receipt.amountPaid)}</div>
  </section>

  <section class="details">
    <div class="detail-row">
      <span class="detail-lbl">Receipt №</span>
      <span class="detail-val">${esc(receipt.receiptNumber)}</span>
    </div>
    <div class="detail-row alt">
      <span class="detail-lbl">Invoice №</span>
      <span class="detail-val">${esc(receipt.invoiceNumber)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-lbl">Amount Received</span>
      <span class="detail-val">${fmt(receipt.amountPaid)}</span>
    </div>
    <div class="detail-row alt">
      <span class="detail-lbl">Invoice Total</span>
      <span class="detail-val">${fmt(receipt.invoiceTotal)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-lbl">Paid On</span>
      <span class="detail-val">${fmtDateTime(receipt.paidAt)}</span>
    </div>
    <div class="detail-row alt">
      <span class="detail-lbl">Payment Method</span>
      <span class="detail-val">${esc(capitalise(receipt.paymentMethod))}</span>
    </div>
    <div class="detail-row">
      <span class="detail-lbl">Payment Reference</span>
      <span class="detail-val">${esc(receipt.paymentReference)}</span>
    </div>
  </section>

  <footer class="footer">
    <span class="footer-cell">№ ${esc(receipt.receiptNumber)}</span>
    <span class="footer-cell center">Issued ${fmtDate(receipt.paidAt)}</span>
    <span class="footer-cell right">Powered by <span class="accent">Cashly</span></span>
  </footer>

</div>
</body>
</html>`
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sanitizeColor(color: string): string {
  return /^[a-zA-Z0-9#(),%. ]+$/.test(color) ? color : '#6366f1'
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function capitalise(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
