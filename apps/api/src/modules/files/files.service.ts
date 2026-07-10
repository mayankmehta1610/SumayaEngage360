import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { extname, join, resolve } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

// Local-disk driver for development / single instance. Swap for an
// S3-compatible driver (same FileObject rows) before scaling out —
// Render's free-tier disk is ephemeral across deploys.
@Injectable()
export class FilesService {
  private readonly dir = resolve(process.env.UPLOAD_DIR ?? './uploads');

  constructor(private readonly prisma: PrismaService) {
    mkdirSync(this.dir, { recursive: true });
  }

  async save(
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    tenantId?: string,
    uploadedBy?: string,
  ) {
    const storageKey = `${randomUUID()}${extname(file.originalname)}`;
    writeFileSync(join(this.dir, storageKey), file.buffer);
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

  async getMeta(id: string) {
    const f = await this.prisma.fileObject.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('File not found');
    return f;
  }

  async getPath(id: string) {
    const f = await this.getMeta(id);
    return { path: join(this.dir, f.storageKey), meta: f };
  }
}
