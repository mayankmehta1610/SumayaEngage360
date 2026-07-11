import { Injectable, NotFoundException } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { createReadStream, mkdirSync, writeFileSync } from 'fs';
import { extname, join, resolve } from 'path';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { FileSecurityService } from './file-security.service';

// Storage driver picks itself from the environment:
//  - S3_BUCKET set  -> S3-compatible object storage (AWS S3, Cloudflare R2,
//    Backblaze B2... via S3_ENDPOINT) — durable across deploys.
//  - otherwise      -> local disk (dev / single instance; ephemeral on Render).
@Injectable()
export class FilesService {
  private readonly dir = resolve(process.env.UPLOAD_DIR ?? './uploads');
  private readonly bucket = process.env.S3_BUCKET;
  private readonly s3 = this.bucket
    ? new S3Client({
        region: process.env.S3_REGION ?? 'auto',
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: !!process.env.S3_ENDPOINT,
        credentials: process.env.S3_ACCESS_KEY_ID
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
            }
          : undefined,
      })
    : null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly security: FileSecurityService,
  ) {
    if (!this.s3) mkdirSync(this.dir, { recursive: true });
  }

  async save(
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    tenantId?: string,
    uploadedBy?: string,
  ) {
    this.security.validate(file);
    const storageKey = `${randomUUID()}${extname(file.originalname)}`;
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } else {
      mkdirSync(this.dir, { recursive: true });
      writeFileSync(join(this.dir, storageKey), file.buffer);
    }
    return this.prisma.fileObject.create({
      data: {
        tenantId,
        storageKey,
        fileName: file.originalname,
        contentType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy,
      },
    });
  }

  async getMeta(id: string, tenantId?: string) {
    const f = await this.prisma.fileObject.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
    });
    if (!f) throw new NotFoundException('File not found');
    return f;
  }

  // Readable stream + metadata, regardless of driver.
  async getStream(id: string, tenantId?: string): Promise<{ stream: Readable; meta: any }> {
    const meta = await this.getMeta(id, tenantId);
    if (this.s3) {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: meta.storageKey }),
      );
      return { stream: res.Body as Readable, meta };
    }
    return { stream: createReadStream(join(this.dir, meta.storageKey)), meta };
  }

  // Full contents in memory — for parsing (resumes) and letter templating.
  async getBuffer(id: string, tenantId?: string): Promise<{ buffer: Buffer; meta: any }> {
    const { stream, meta } = await this.getStream(id, tenantId);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return { buffer: Buffer.concat(chunks), meta };
  }
}
