import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { FilesService } from '../files/files.service';

// Claude-powered resume parsing, activated by ANTHROPIC_API_KEY.
// Unconfigured -> returns null and the ATS keeps working with the raw CV only.
// Model is env-overridable (RESUME_PARSER_MODEL) so a cheaper model can be
// used for this extraction task if desired.

const RESUME_SCHEMA = {
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    summary: { type: ['string', 'null'] },
    totalYearsExperience: { type: ['number', 'null'] },
    skills: { type: 'array', items: { type: 'string' } },
    experiences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          startDate: { type: ['string', 'null'] },
          endDate: { type: ['string', 'null'] },
          description: { type: ['string', 'null'] },
        },
        required: ['company', 'title', 'startDate', 'endDate', 'description'],
        additionalProperties: false,
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          degree: { type: ['string', 'null'] },
          year: { type: ['string', 'null'] },
        },
        required: ['institution', 'degree', 'year'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'firstName', 'lastName', 'email', 'phone', 'location', 'summary',
    'totalYearsExperience', 'skills', 'experiences', 'education',
  ],
  additionalProperties: false,
} as const;

@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);
  private readonly client = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;
  private readonly model = process.env.RESUME_PARSER_MODEL ?? 'claude-opus-4-8';

  constructor(private readonly files: FilesService) {}

  get enabled(): boolean {
    return !!this.client;
  }

  // Non-AI parser: extracts raw text (PDF or plain text) and derives the
  // profile deterministically — email/phone patterns, known-skill matching,
  // "N years" experience detection. Used by the offline batch when no LLM is
  // configured, and available as an explicit non-AI mode.
  async parseNaive(
    resumeFileId: string,
    knownSkills: string[],
  ): Promise<Record<string, unknown> | null> {
    try {
      const { buffer, meta } = await this.files.getBuffer(resumeFileId);
      let text = '';
      if (meta.contentType === 'application/pdf') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
          b: Buffer,
        ) => Promise<{ text: string }>;
        text = (await pdfParse(buffer)).text;
      } else {
        text = buffer.toString('utf8');
      }
      if (!text.trim()) return null;
      const lower = text.toLowerCase();

      const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
      const phone = text.match(/(?:\+?\d[\d\s-]{8,14}\d)/)?.[0]?.trim() ?? null;
      const years = text.match(/(\d{1,2})\s*\+?\s*(?:years|yrs)/i);
      const skills = knownSkills.filter((s) =>
        lower.includes(s.toLowerCase()),
      );
      const firstLine =
        text.split('\n').map((l) => l.trim()).find((l) => l.length > 2) ?? '';
      const nameParts = firstLine.split(/\s+/).slice(0, 2);

      return {
        method: 'OFFLINE_RULE',
        firstName: nameParts[0] ?? null,
        lastName: nameParts[1] ?? null,
        email,
        phone,
        totalYearsExperience: years ? Number(years[1]) : null,
        skills,
        summary: text.slice(0, 400),
      };
    } catch (e) {
      this.logger.error(`Naive resume parse failed: ${(e as Error).message}`);
      return null;
    }
  }

  // Returns the structured profile, or null when parsing isn't possible.
  async parse(resumeFileId: string): Promise<Record<string, unknown> | null> {
    if (!this.client) return null;
    try {
      const { buffer, meta } = await this.files.getBuffer(resumeFileId);

      const content: Anthropic.ContentBlockParam[] = [];
      if (meta.contentType === 'application/pdf') {
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: buffer.toString('base64'),
          },
        });
      } else if (
        meta.contentType.startsWith('text/') ||
        meta.contentType === 'application/octet-stream'
      ) {
        content.push({ type: 'text', text: buffer.toString('utf8').slice(0, 200_000) });
      } else {
        this.logger.warn(`Unsupported resume type ${meta.contentType}; skipping parse`);
        return null;
      }
      content.push({
        type: 'text',
        text: 'Extract the candidate profile from this resume. Use ISO dates (YYYY-MM) where possible; use null for anything not present.',
      });

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000,
        output_config: {
          format: { type: 'json_schema', schema: RESUME_SCHEMA as any },
        },
        messages: [{ role: 'user', content }],
      });

      if (response.stop_reason === 'refusal') {
        this.logger.warn('Resume parse refused by model');
        return null;
      }
      const text = response.content.find((b) => b.type === 'text');
      if (!text) return null;
      return {
        method: 'AI',
        ...(JSON.parse((text as any).text) as Record<string, unknown>),
      };
    } catch (e) {
      this.logger.error(`Resume parse failed: ${(e as Error).message}`);
      return null;
    }
  }
}
