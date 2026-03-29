import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import multipart from '@fastify/multipart'
import sharp from 'sharp'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { requireAuth } from '../../plugins/auth.js'
import { badRequest, internalError } from '../../lib/errors.js'
import { env } from '../../plugins/env.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

// ── Helpers ───────────────────────────────────────────────────────────────────

function getS3(): S3Client {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_REGION) {
    throw new Error('S3 credentials not configured')
  }
  return new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  })
}

function getBucket(): string {
  if (!env.S3_BUCKET_NAME) throw new Error('S3_BUCKET_NAME not configured')
  return env.S3_BUCKET_NAME
}

function logoKey(userId: string): string {
  return `logos/${userId}/logo.png`
}

function logoPublicUrl(userId: string): string {
  const key = logoKey(userId)
  if (env.CLOUDFRONT_DOMAIN) return `https://${env.CLOUDFRONT_DOMAIN}/${key}`
  return `https://${getBucket()}.s3.${env.AWS_REGION}.amazonaws.com/${key}`
}

// ── Plugin ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/require-await
const logoUploadRoute: FastifyPluginAsync = fp(async (server) => {
  // Register multipart scoped to this plugin only
  await server.register(multipart, {
    limits: { fileSize: MAX_BYTES, files: 1 },
  })

  // ── POST /upload/logo ────────────────────────────────────────────────────
  server.post('/upload/logo', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.user!.id

    let fileData: Buffer | null = null
    let mimeType = ''

    try {
      const part = await request.file()

      if (!part) return badRequest(reply, 'No file uploaded')

      mimeType = part.mimetype
      if (!ALLOWED_MIME.includes(mimeType)) {
        return badRequest(reply, 'File must be PNG, JPG, SVG, or WEBP')
      }

      const chunks: Buffer[] = []
      for await (const chunk of part.file) {
        chunks.push(chunk as Buffer)
      }
      fileData = Buffer.concat(chunks)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'FST_FILES_LIMIT') {
        return badRequest(reply, 'Only one file allowed')
      }
      if ((err as NodeJS.ErrnoException).code === 'FST_REQ_FILE_TOO_LARGE') {
        return badRequest(reply, 'File too large — maximum 2 MB')
      }
      throw err
    }

    if (!fileData || fileData.length === 0) return badRequest(reply, 'File is empty')

    // Resize + convert to PNG using sharp (strip metadata for privacy)
    let processed: Buffer
    try {
      processed = await sharp(fileData)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 8 })
        .withMetadata({ exif: {} }) // strip EXIF
        .toBuffer()
    } catch {
      return badRequest(reply, 'Could not process image — ensure the file is a valid image')
    }

    // Upload to S3
    try {
      const s3 = getS3()
      const bucket = getBucket()
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: logoKey(userId),
          Body: processed,
          ContentType: 'image/png',
          ServerSideEncryption: 'AES256',
        }),
      )
    } catch (err) {
      request.log.error(err, 'S3 logo upload failed')
      return internalError(reply, 'Failed to upload logo')
    }

    const logoUrl = logoPublicUrl(userId)

    // Save to DB
    await server.prisma.user.update({
      where: { id: userId },
      data: { logoUrl },
    })

    return reply.send({ data: { logoUrl } })
  })

  // ── DELETE /upload/logo ──────────────────────────────────────────────────
  server.delete('/upload/logo', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.user!.id

    try {
      const s3 = getS3()
      const bucket = getBucket()
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: logoKey(userId) }))
    } catch (err) {
      // Log but don't fail — DB update should still succeed
      request.log.warn(err, 'S3 logo delete failed (proceeding with DB clear)')
    }

    await server.prisma.user.update({
      where: { id: userId },
      data: { logoUrl: null },
    })

    return reply.send({ data: { success: true } })
  })
})

export default logoUploadRoute
