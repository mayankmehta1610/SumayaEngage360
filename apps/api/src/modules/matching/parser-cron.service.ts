import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResumeParserService } from '../integrations/resume-parser.service';
import { MatchingService } from './matching.service';

// The OFFLINE resume pipeline: on a schedule (default every 15 minutes),
// parse every resume that hasn't been parsed yet — with the LLM when
// configured, otherwise with the deterministic text parser — then refresh
// rule-based match scores for the affected tenants' open jobs.
// (The ONLINE path parses immediately after a candidate applies.)
@Injectable()
export class ParserCronService {
  private readonly logger = new Logger(ParserCronService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ResumeParserService,
    private readonly matching: MatchingService,
  ) {}

  @Cron(process.env.RESUME_PARSE_CRON ?? '*/15 * * * *')
  async scheduledRun() {
    await this.parsePending();
  }

  // Nightly full re-match of every published job (keeps talent-pool
  // shortlists fresh as new resumes arrive).
  @Cron(process.env.REMATCH_CRON ?? '0 2 * * *')
  async nightlyRematch() {
    const jobs = await this.prisma.job.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, tenantId: true },
    });
    for (const job of jobs) {
      try {
        await this.matching.matchJob(job.tenantId, job.id, { useAi: false });
      } catch (e) {
        this.logger.error(`Nightly rematch failed for ${job.id}: ${(e as Error).message}`);
      }
    }
    this.logger.log(`Nightly rematch done for ${jobs.length} job(s)`);
  }

  // Also exposed via POST /matching/parse-pending for on-demand runs.
  async parsePending(): Promise<{ parsed: number; pending: number }> {
    if (this.running) return { parsed: 0, pending: 0 };
    this.running = true;
    try {
      const pending = await this.prisma.candidate.findMany({
        where: { resumeFileId: { not: null }, parsedResume: { equals: Prisma.AnyNull } },
        take: 25, // batch size per run
      });
      let parsed = 0;
      for (const c of pending) {
        const skills = await this.prisma.skill.findMany({
          where: { OR: [{ tenantId: c.tenantId }, { tenantId: null }] },
          select: { name: true },
        });
        const result = this.parser.enabled
          ? await this.parser.parse(c.resumeFileId!)
          : await this.parser.parseNaive(c.resumeFileId!, skills.map((s) => s.name));
        if (result) {
          await this.prisma.candidate.update({
            where: { id: c.id },
            data: { parsedResume: result as any },
          });
          parsed++;
          // refresh this candidate's scores against all open jobs
          await this.matching.matchCandidateToOpenJobs(c.tenantId, c.id);
        }
      }
      if (pending.length) {
        this.logger.log(`Offline parser: ${parsed}/${pending.length} resumes parsed`);
      }
      return { parsed, pending: pending.length };
    } finally {
      this.running = false;
    }
  }
}
