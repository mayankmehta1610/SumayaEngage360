import { Injectable } from '@nestjs/common';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OpenApiService {
  constructor(private readonly prisma: PrismaService) {}

  async generate() {
    const implemented = await this.prisma.apiCatalogueEntry.findMany({
      where: { implemented: true, actualPath: { not: null } },
      orderBy: { id: 'asc' },
    });
    const paths: Record<string, unknown> = {};
    for (const api of implemented) {
      const path = `/api/v1${api.actualPath!.replace(/^\//, '/')}`;
      const methods = api.methods.toLowerCase();
      const ops: Record<string, unknown> = {};
      if (methods.includes('get')) {
        ops.get = {
          summary: api.resource,
          tags: [api.domain],
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'OK' } },
        };
      }
      if (methods.includes('post')) {
        ops.post = {
          summary: `Create ${api.resource}`,
          tags: [api.domain],
          security: [{ bearerAuth: [] }],
          responses: { '201': { description: 'Created' } },
        };
      }
      paths[path] = ops;
    }
    return {
      openapi: '3.0.3',
      info: {
        title: 'SumayaEngage360 API',
        version: '1.0.0',
        description: 'Versioned OpenAPI catalogue (NFR-014) — implemented routes only',
      },
      servers: [{ url: process.env.API_BASE_URL ?? 'http://localhost:3000' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      paths,
    };
  }

  countImplementedRoutes(): number {
    const src = join(__dirname, '..', '..');
    let count = 0;
    const walk = (dir: string) => {
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (f.name.endsWith('.controller.ts')) {
          const text = readFileSync(p, 'utf-8');
          count += (text.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length;
        }
      }
    };
    try { walk(join(src, 'modules')); } catch { /* test env */ }
    return count;
  }
}
