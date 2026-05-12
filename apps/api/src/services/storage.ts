import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../plugins/env.js'

// ── Lazy S3 client — only instantiated when first needed ──────────────────────

let _s3: S3Client | null = null

export function s3Configured(): boolean {
  return Boolean(
    env.AWS_ACCESS_KEY_ID &&
      env.AWS_SECRET_ACCESS_KEY &&
      env.AWS_REGION &&
      env.S3_BUCKET_NAME,
  )
}

function getS3Client(): S3Client {
  if (_s3) return _s3
  if (!s3Configured()) {
    throw new Error(
      'S3 credentials not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION.',
    )
  }

  _s3 = new S3Client({
    region: env.AWS_REGION!,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  })

  return _s3
}

function getBucket(): string {
  if (!env.S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME is not configured.')
  }
  return env.S3_BUCKET_NAME
}

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Uploads a PDF buffer to S3 at invoices/{userId}/{invoiceId}.pdf.
 * Returns a presigned URL (or CloudFront URL) valid for 7 days.
 */
export async function uploadInvoicePdf(
  userId: string,
  invoiceId: string,
  buffer: Buffer,
): Promise<string> {
  // Dev fallback: when S3 isn't configured, return a data URL so the PDF is
  // still viewable from the dashboard. Production will always have S3.
  if (!s3Configured()) {
    return `data:application/pdf;base64,${buffer.toString('base64')}`
  }

  const s3 = getS3Client()
  const bucket = getBucket()
  const key = `invoices/${userId}/${invoiceId}.pdf`

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      // Server-side encryption
      ServerSideEncryption: 'AES256',
    }),
  )

  return getInvoicePdfUrl(userId, invoiceId)
}

/**
 * Returns a presigned URL for an existing invoice PDF.
 * Uses CloudFront domain if configured, otherwise a standard S3 presigned URL.
 * Expiry: 7 days (604800 seconds).
 */
export async function getInvoicePdfUrl(userId: string, invoiceId: string): Promise<string> {
  const s3 = getS3Client()
  const bucket = getBucket()
  const key = `invoices/${userId}/${invoiceId}.pdf`
  const expiresIn = 60 * 60 * 24 * 7 // 7 days

  const command = new PutObjectCommand({ Bucket: bucket, Key: key })

  if (env.CLOUDFRONT_DOMAIN) {
    // NOTE: CloudFront signed URLs require a key pair — using S3 presigned URL
    // with CloudFront domain substitution here for simplicity. Full CloudFront
    // signed URL support (with key pair) can be added in the DevOps phase.
    const s3Url = await getSignedUrl(s3, command, { expiresIn })
    const s3UrlObj = new URL(s3Url)
    return `https://${env.CLOUDFRONT_DOMAIN}${s3UrlObj.pathname}${s3UrlObj.search}`
  }

  // Standard S3 presigned GET URL
  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn })
}

// ── Receipts ──────────────────────────────────────────────────────────────────
//
// Receipt PDFs land at `receipts/{userId}/{receiptNumber}.pdf` so a single S3
// listing per user shows the canonical receipt sequence in number order.

export function receiptS3Key(userId: string, receiptNumber: string): string {
  return `receipts/${userId}/${receiptNumber}.pdf`
}

/**
 * Persists a receipt PDF. The returned `pdfRef` is what gets stored on
 * Receipt.pdfS3Key — in prod it's an S3 object key, in dev (no S3) it's a
 * `data:application/pdf;base64,…` URL that getReceiptPdfUrl returns verbatim.
 * Both shapes are handled transparently by the resolver below.
 */
export async function uploadReceiptPdf(
  userId: string,
  receiptNumber: string,
  buffer: Buffer,
): Promise<{ pdfRef: string }> {
  if (!s3Configured()) {
    return { pdfRef: `data:application/pdf;base64,${buffer.toString('base64')}` }
  }

  const s3 = getS3Client()
  const bucket = getBucket()
  const key = receiptS3Key(userId, receiptNumber)

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      ServerSideEncryption: 'AES256',
    }),
  )

  return { pdfRef: key }
}

/**
 * Resolves a Receipt.pdfS3Key into a viewable URL.
 *
 * - When the stored value is a `data:application/pdf;base64,…` URL (dev
 *   fallback), it's returned verbatim — the browser renders it directly.
 * - When it's an S3 object key, a 7-day signed URL is generated (CloudFront
 *   when configured, otherwise a standard S3 presigned URL).
 */
export async function getReceiptPdfUrl(pdfRef: string): Promise<string | null> {
  if (pdfRef.startsWith('data:')) return pdfRef
  if (!s3Configured()) return null

  const s3 = getS3Client()
  const bucket = getBucket()
  const expiresIn = 60 * 60 * 24 * 7

  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const command = new GetObjectCommand({ Bucket: bucket, Key: pdfRef })

  if (env.CLOUDFRONT_DOMAIN) {
    const s3Url = await getSignedUrl(s3, command, { expiresIn })
    const s3UrlObj = new URL(s3Url)
    return `https://${env.CLOUDFRONT_DOMAIN}${s3UrlObj.pathname}${s3UrlObj.search}`
  }

  return getSignedUrl(s3, command, { expiresIn })
}
