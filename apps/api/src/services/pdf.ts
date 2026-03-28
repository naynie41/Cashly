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
}

interface PdfClient {
  name: string
  email: string
  phone: string | null
  address: string | null
}

interface PdfInvoice {
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  subtotal: number
  taxRate: number
  discount: number
  total: number
  notes: string | null
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
  const color = sanitizeColor(user.brandColor)
  const displayName = esc(user.businessName ?? user.name)

  const fmt = (n: number) =>
    `${user.currency} ${n.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const taxAmount = invoice.subtotal * (invoice.taxRate / 100)

  const rowsHtml = lineItems
    .map(
      (item) => `
      <tr>
        <td class="td-desc">${esc(item.description)}</td>
        <td class="td-num">${item.quantity}</td>
        <td class="td-num">${fmt(item.unitPrice)}</td>
        <td class="td-num td-amount">${fmt(item.amount)}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, Arial, sans-serif;
    color: #0A0A09;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { width: 794px; min-height: 1123px; display: flex; flex-direction: column; }

  /* ── Header ─────── */
  .header {
    background-color: ${color};
    padding: 40px 52px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
  .header-logo {
    width: 56px;
    height: 56px;
    object-fit: contain;
    display: block;
    margin-bottom: 12px;
  }
  .biz-name {
    font-size: 26px;
    font-weight: 900;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .inv-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(255,255,255,0.5);
    margin-bottom: 6px;
    text-align: right;
  }
  .inv-number {
    font-size: 22px;
    font-weight: 900;
    color: #fff;
    letter-spacing: -0.02em;
    text-align: right;
  }

  /* ── Addresses ─── */
  .addresses {
    display: flex;
    padding: 28px 52px;
    gap: 40px;
    border-bottom: 1px solid rgba(0,0,0,0.08);
    background: #fff;
  }
  .addr { flex: 1; }
  .addr-lbl {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #888880;
    margin-bottom: 8px;
  }
  .addr-name { font-size: 15px; font-weight: 700; color: #0A0A09; margin-bottom: 3px; }
  .addr-line { font-size: 12px; color: #555; line-height: 1.55; }

  /* ── Dates ────── */
  .dates {
    display: flex;
    gap: 40px;
    padding: 16px 52px;
    background: #f7f6f2;
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }
  .date-lbl {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #888880;
    margin-bottom: 3px;
  }
  .date-val { font-size: 13px; font-weight: 600; color: #0A0A09; }

  /* ── Table ───── */
  .table-wrap { padding: 0 52px; flex: 1; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background-color: #0A0A09; }
  th {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: rgba(255,255,255,0.5);
    padding: 11px 14px;
    text-align: left;
  }
  th.th-num { text-align: right; }
  tbody tr { border-bottom: 1px solid rgba(0,0,0,0.06); }
  td { padding: 13px 14px; font-size: 12px; color: #0A0A09; vertical-align: top; }
  td.td-desc { max-width: 300px; }
  td.td-num { text-align: right; color: #444; }
  td.td-amount { font-weight: 600; color: #0A0A09; }

  /* ── Totals ──── */
  .totals { padding: 20px 52px 28px; display: flex; justify-content: flex-end; }
  .totals-inner { min-width: 240px; }
  .t-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .t-lbl { font-size: 12px; color: #888880; }
  .t-val { font-size: 12px; color: #0A0A09; font-weight: 500; }
  .t-div { border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 8px 0; }
  .t-total-lbl { font-size: 14px; font-weight: 700; color: #0A0A09; }
  .t-total-val { font-size: 18px; font-weight: 900; color: ${color}; }

  /* ── Notes ───── */
  .notes { padding: 0 52px 28px; }
  .notes-lbl {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #888880;
    margin-bottom: 6px;
  }
  .notes-text { font-size: 12px; color: #555; line-height: 1.6; }

  /* ── Footer ──── */
  .footer {
    background: #0A0A09;
    padding: 16px 52px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
  }
  .footer-text { font-size: 10px; color: rgba(255,255,255,0.35); }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      ${user.logoUrl ? `<img src="${esc(user.logoUrl)}" class="header-logo" alt="${displayName}">` : ''}
      <div class="biz-name">${displayName}</div>
    </div>
    <div>
      <div class="inv-label">Invoice</div>
      <div class="inv-number">${esc(invoice.invoiceNumber)}</div>
    </div>
  </div>

  <div class="addresses">
    <div class="addr">
      <div class="addr-lbl">From</div>
      <div class="addr-name">${displayName}</div>
      <div class="addr-line">${esc(user.email)}</div>
    </div>
    <div class="addr">
      <div class="addr-lbl">Bill To</div>
      <div class="addr-name">${esc(client.name)}</div>
      <div class="addr-line">${esc(client.email)}</div>
      ${client.phone ? `<div class="addr-line">${esc(client.phone)}</div>` : ''}
      ${client.address ? `<div class="addr-line">${esc(client.address)}</div>` : ''}
    </div>
  </div>

  <div class="dates">
    <div>
      <div class="date-lbl">Issue Date</div>
      <div class="date-val">${fmtDate(invoice.issueDate)}</div>
    </div>
    <div>
      <div class="date-lbl">Due Date</div>
      <div class="date-val">${fmtDate(invoice.dueDate)}</div>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="th-num">Qty</th>
          <th class="th-num">Unit Price</th>
          <th class="th-num">Amount</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-inner">
      <div class="t-row">
        <span class="t-lbl">Subtotal</span>
        <span class="t-val">${fmt(invoice.subtotal)}</span>
      </div>
      ${invoice.taxRate > 0 ? `<div class="t-row"><span class="t-lbl">Tax (${invoice.taxRate}%)</span><span class="t-val">${fmt(taxAmount)}</span></div>` : ''}
      ${invoice.discount > 0 ? `<div class="t-row"><span class="t-lbl">Discount</span><span class="t-val">-${fmt(invoice.discount)}</span></div>` : ''}
      <hr class="t-div">
      <div class="t-row">
        <span class="t-total-lbl">Total Due</span>
        <span class="t-total-val">${fmt(invoice.total)}</span>
      </div>
    </div>
  </div>

  ${
    invoice.notes
      ? `<div class="notes"><div class="notes-lbl">Notes</div><div class="notes-text">${esc(invoice.notes)}</div></div>`
      : ''
  }

  <div class="footer">
    <span class="footer-text">${esc(invoice.invoiceNumber)} · Due ${fmtDate(invoice.dueDate)}</span>
    <span class="footer-text">Powered by Cashly</span>
  </div>

</div>
</body>
</html>`
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// Prevent CSS injection via brandColor
function sanitizeColor(color: string): string {
  // Allow only hex colors, rgb(), or named colors — reject anything with ; { }
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
