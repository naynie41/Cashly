import puppeteer from 'puppeteer'

// ── Types ──────────────────────────────────────────────────────────────────────

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

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

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'

interface PdfInvoice {
  invoiceNumber: string
  status: InvoiceStatus
  issueDate: Date
  dueDate: Date
  subtotal: number
  taxRate: number
  discount: number
  total: number
  notes: string | null
  paymentUrl: string | null
}

export interface InvoicePdfData {
  user: PdfUser
  client: PdfClient
  invoice: PdfInvoice
  lineItems: LineItem[]
}

// ── PDF generator ──────────────────────────────────────────────────────────────

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const html = buildInvoiceHtml(data)

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

function buildInvoiceHtml({ user, client, invoice, lineItems }: InvoicePdfData): string {
  const brand = sanitizeColor(user.brandColor)
  const displayName = esc(user.businessName ?? user.name)

  const fmt = (n: number) =>
    `${user.currency} ${n.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const taxAmount = invoice.subtotal * (invoice.taxRate / 100)
  const status = invoice.status

  const rowsHtml = lineItems
    .map(
      (item, i) => `
      <tr class="${i % 2 === 1 ? 'row-alt' : ''}">
        <td class="cell-num">${String(i + 1).padStart(2, '0')}</td>
        <td class="cell-desc">${esc(item.description)}</td>
        <td class="cell-qty">${item.quantity}</td>
        <td class="cell-unit">${fmt(item.unitPrice)}</td>
        <td class="cell-amount">${fmt(item.amount)}</td>
      </tr>`,
    )
    .join('')

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

  /* ── Brand stripe ──────────────────────────────────────────────────────── */
  .brand-stripe {
    height: 8px;
    background: var(--brand);
    width: 100%;
  }

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
  .inv-number {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--mute);
    font-variant-numeric: tabular-nums;
  }
  .inv-number .hash { color: var(--brand); margin-right: 4px; }

  /* ── Status pill ───────────────────────────────────────────────────────── */
  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border: 1px solid currentColor;
    color: var(--ink);
    background: transparent;
  }
  .status .dot {
    width: 6px; height: 6px;
    background: currentColor;
    display: inline-block;
  }
  .status-PAID     { color: #0F7A52; }
  .status-OVERDUE  { color: #C92B2B; }
  .status-SENT     { color: #1F6B6B; }
  .status-DRAFT    { color: var(--mute); }

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
    gap: 0;
    padding: 32px 56px 28px;
  }
  .party { display: flex; flex-direction: column; gap: 6px; }
  .party + .party { border-left: 1px solid var(--rule); padding-left: 32px; }
  .party-lbl {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--mute);
    margin-bottom: 4px;
  }
  .party-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .party-line {
    font-size: 11.5px;
    color: var(--mute);
    line-height: 1.55;
  }

  /* ── Items table ───────────────────────────────────────────────────────── */
  .items-wrap { padding: 0 56px; }
  .items {
    width: 100%;
    border-collapse: collapse;
    border-top: 2px solid var(--ink);
    border-bottom: 2px solid var(--ink);
  }
  .items thead th {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--ink);
    padding: 14px 12px;
    text-align: left;
    border-bottom: 1px solid var(--ink);
  }
  .items thead th.right { text-align: right; }

  .items tbody td {
    padding: 18px 12px;
    font-size: 12px;
    color: var(--ink);
    border-bottom: 1px solid var(--rule);
    vertical-align: top;
    font-variant-numeric: tabular-nums;
  }
  .items tbody tr:last-child td { border-bottom: none; }
  .items tbody tr.row-alt td { background: var(--paper-2); }

  .cell-num {
    width: 36px;
    color: var(--mute-2);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding-left: 0 !important;
  }
  .cell-desc {
    font-weight: 500;
    color: var(--ink);
    line-height: 1.4;
  }
  .cell-qty   { width: 60px; text-align: right; color: var(--mute); }
  .cell-unit  { width: 110px; text-align: right; color: var(--mute); }
  .cell-amount{ width: 130px; text-align: right; font-weight: 600; color: var(--ink); padding-right: 0 !important; }

  /* ── Totals ────────────────────────────────────────────────────────────── */
  .totals {
    padding: 28px 56px 40px;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 40px;
  }
  .totals-stamp {
    align-self: end;
  }
  .stamp-text {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--mute-2);
    line-height: 1.6;
  }
  .stamp-line { color: var(--mute); }

  .totals-block { display: flex; flex-direction: column; }
  .t-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 8px 0;
    font-variant-numeric: tabular-nums;
  }
  .t-row + .t-row { border-top: 1px solid var(--rule); }
  .t-lbl {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .t-val {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .t-total {
    margin-top: 4px;
    padding: 16px 0 4px;
    border-top: 2px solid var(--ink);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-variant-numeric: tabular-nums;
  }
  .t-total-lbl {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--ink);
  }
  .t-total-val {
    font-size: 28px;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: var(--brand);
  }

  /* ── Pay callout ───────────────────────────────────────────────────────── */
  .pay {
    margin: 0 56px 36px;
    background: var(--brand);
    color: var(--paper);
    padding: 24px 28px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 24px;
    align-items: center;
  }
  .pay-text { display: flex; flex-direction: column; gap: 4px; }
  .pay-lbl {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.7);
  }
  .pay-headline {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  .pay-url {
    font-size: 11px;
    font-weight: 500;
    color: rgba(255,255,255,0.85);
    word-break: break-all;
  }
  .pay-cta {
    border: 2px solid rgba(255,255,255,0.95);
    padding: 10px 18px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #fff;
    text-decoration: none;
    white-space: nowrap;
  }

  /* ── Notes ─────────────────────────────────────────────────────────────── */
  .notes {
    padding: 0 56px 32px;
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 24px;
    border-top: 1px solid var(--rule);
    padding-top: 24px;
  }
  .notes-lbl {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .notes-text {
    font-size: 12px;
    line-height: 1.7;
    color: var(--ink-2);
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
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--mute);
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
      <div class="wordmark">Invoice</div>
      <div class="inv-number"><span class="hash">№</span>${esc(invoice.invoiceNumber)}</div>
      <div class="status status-${status}">
        <span class="dot"></span>${status}
      </div>
    </div>
  </section>

  <section class="meta-band">
    <div class="meta-cell">
      <span class="meta-lbl">Issue Date</span>
      <span class="meta-val">${fmtDate(invoice.issueDate)}</span>
    </div>
    <div class="meta-cell">
      <span class="meta-lbl">Due Date</span>
      <span class="meta-val">${fmtDate(invoice.dueDate)}</span>
    </div>
    <div class="meta-cell">
      <span class="meta-lbl">Currency</span>
      <span class="meta-val-soft">${esc(user.currency)}</span>
    </div>
    <div class="meta-cell">
      <span class="meta-lbl">Amount Due</span>
      <span class="meta-val">${fmt(invoice.total)}</span>
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
      <span class="party-lbl">Bill To</span>
      <span class="party-name">${esc(client.name)}</span>
      ${client.address ? `<span class="party-line">${esc(client.address).replace(/\n/g, '<br>')}</span>` : ''}
      <span class="party-line">${esc(client.email)}</span>
      ${client.phone ? `<span class="party-line">${esc(client.phone)}</span>` : ''}
    </div>
  </section>

  <div class="items-wrap">
    <table class="items">
      <thead>
        <tr>
          <th>№</th>
          <th>Description</th>
          <th class="right">Qty</th>
          <th class="right">Unit Price</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>

  <section class="totals">
    <div class="totals-stamp">
      <div class="stamp-text">
        <span class="stamp-line">Thank you for your<br>business.</span>
      </div>
    </div>
    <div class="totals-block">
      <div class="t-row">
        <span class="t-lbl">Subtotal</span>
        <span class="t-val">${fmt(invoice.subtotal)}</span>
      </div>
      ${
        invoice.taxRate > 0
          ? `<div class="t-row"><span class="t-lbl">Tax · ${invoice.taxRate}%</span><span class="t-val">${fmt(taxAmount)}</span></div>`
          : ''
      }
      ${
        invoice.discount > 0
          ? `<div class="t-row"><span class="t-lbl">Discount</span><span class="t-val">−${fmt(invoice.discount)}</span></div>`
          : ''
      }
      <div class="t-total">
        <span class="t-total-lbl">Total Due</span>
        <span class="t-total-val">${fmt(invoice.total)}</span>
      </div>
    </div>
  </section>

  ${
    invoice.paymentUrl && status !== 'PAID'
      ? `
  <section class="pay">
    <div class="pay-text">
      <span class="pay-lbl">Pay this invoice</span>
      <span class="pay-headline">Settle ${fmt(invoice.total)} securely online</span>
      <span class="pay-url">${esc(invoice.paymentUrl)}</span>
    </div>
    <a class="pay-cta" href="${esc(invoice.paymentUrl)}">Pay Now →</a>
  </section>`
      : ''
  }

  ${
    invoice.notes
      ? `
  <section class="notes">
    <span class="notes-lbl">Notes</span>
    <span class="notes-text">${esc(invoice.notes).replace(/\n/g, '<br>')}</span>
  </section>`
      : ''
  }

  <footer class="footer">
    <span class="footer-cell">№ ${esc(invoice.invoiceNumber)}</span>
    <span class="footer-cell center">Issued ${fmtDate(invoice.issueDate)} · Due ${fmtDate(invoice.dueDate)}</span>
    <span class="footer-cell right">Powered by <span class="accent">Cashly</span></span>
  </footer>

</div>
</body>
</html>`
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// Prevent CSS injection via brandColor
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
