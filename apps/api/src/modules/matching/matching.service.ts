import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Candidate-vs-JD matching with two engines:
//  - RULE: deterministic — skill overlap, experience fit, title similarity.
//  - AI:   Claude scores the full profile against the JD (needs ANTHROPIC_API_KEY).
// Every scored pair is stored in match_scores; candidates at/above the
// threshold are auto-shortlisted: existing applications move to SCREENING and
// talent-pool candidates (past applicants) get a new application for the job.
@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly client = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;
  private readonly model = process.env.RESUME_PARSER_MODEL ?? 'claude-opus-4-8';

  constructor(private readonly prisma: PrismaService) {}

  get aiEnabled(): boolean {
    return !!this.client;
  }

  // ── scoring engines ────────────────────────────────────────────────

  ruleScore(
    job: { title: string; minExperience: number | null; maxExperience: number | null; skills: { skill: { name: string } }[] },
    candidate: {
      skills: { skill: { name: string } }[];
      experiences: { title: string; startDate: Date; endDate: Date | null }[];
      parsedResume: any;
    },
  ): { score: number; breakdown: Record<string, unknown> } {
    const jobSkills = job.skills.map((s) => s.skill.name.toLowerCase());
    const candSkills = new Set([
      ...candidate.skills.map((s) => s.skill.name.toLowerCase()),
      ...((candidate.parsedResume?.skills as string[]) ?? []).map((s) => s.toLowerCase()),
    ]);
    const matched = jobSkills.filter((js) =>
      [...candSkills].some((cs) => cs.includes(js) || js.includes(cs)),
    );
    const skillScore = jobSkills.length
      ? (matched.length / jobSkills.length) * 100
      : 50;

    // experience: parsed total, or summed from experience rows
    let years: number | null =
      candidate.parsedResume?.totalYearsExperience ?? null;
    if (years == null && candidate.experiences.length) {
      const ms = candidate.experiences.reduce(
        (sum, e) =>
          sum + ((e.endDate ?? new Date()).getTime() - new Date(e.startDate).getTime()),
        0,
      );
      years = ms / (365 * 864e5);
    }
    let expScore = 50; // unknown
    if (years != null) {
      const min = job.minExperience ?? 0;
      const max = job.maxExperience ?? Math.max(min, 50);
      if (years >= min && years <= max) expScore = 100;
      else if (years < min) expScore = min > 0 ? Math.max(0, (years / min) * 100) : 100;
      else expScore = 70; // overqualified
    }

    const jobWords = job.title.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const candTitles = candidate.experiences.map((e) => e.title.toLowerCase()).join(' ');
    const titleHits = jobWords.filter((w) => candTitles.includes(w));
    const titleScore = jobWords.length ? (titleHits.length / jobWords.length) * 100 : 0;

    const score = Math.round(0.6 * skillScore + 0.25 * expScore + 0.15 * titleScore);
    return {
      score,
      breakdown: {
        matchedSkills: matched,
        missingSkills: jobSkills.filter((s) => !matched.includes(s)),
        skillScore: Math.round(skillScore),
        experienceYears: years != null ? Math.round(years * 10) / 10 : null,
        expScore: Math.round(expScore),
        titleScore: Math.round(titleScore),
      },
    };
  }

  async aiScore(
    job: { title: string; description: string; skills: { skill: { name: string } }[] },
    candidate: any,
  ): Promise<{ score: number; breakdown: Record<string, unknown> } | null> {
    if (!this.client) return null;
    try {
      const profile = {
        skills: candidate.skills.map((s: any) => s.skill.name),
        experiences: candidate.experiences,
        parsedResume: candidate.parsedResume,
      };
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                score: { type: 'integer' },
                matchedSkills: { type: 'array', items: { type: 'string' } },
                gaps: { type: 'array', items: { type: 'string' } },
                summary: { type: 'string' },
              },
              required: ['score', 'matchedSkills', 'gaps', 'summary'],
              additionalProperties: false,
            } as any,
          },
        },
        messages: [
          {
            role: 'user',
            content: `Score how well this candidate fits the job on a 0-100 scale (100 = perfect fit).\n\nJOB: ${job.title}\nRequired skills: ${job.skills.map((s) => s.skill.name).join(', ')}\nDescription:\n${job.description.slice(0, 4000)}\n\nCANDIDATE PROFILE (JSON):\n${JSON.stringify(profile).slice(0, 6000)}`,
          },
        ],
      });
      if (response.stop_reason === 'refusal') return null;
      const text = response.content.find((b) => b.type === 'text');
      if (!text) return null;
      const parsed = JSON.parse((text as any).text);
      const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
      return { score, breakdown: parsed };
    } catch (e) {
      this.logger.error(`AI match failed: ${(e as Error).message}`);
      return null;
    }
  }

  // ── orchestration ──────────────────────────────────────────────────

  // Scores every candidate in the tenant's talent pool against the job.
  async matchJob(
    tenantId: string,
    jobId: string,
    opts: { useAi?: boolean; threshold?: number; autoShortlist?: boolean } = {},
  ) {
    const threshold = opts.threshold ?? 60;
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId },
      include: { skills: { include: { skill: true } } },
    });
    if (!job) throw new NotFoundException('Job not found');

    const candidates = await this.prisma.candidate.findMany({
      where: { tenantId },
      include: {
        skills: { include: { skill: true } },
        experiences: true,
        applications: { where: { jobId } },
      },
    });

    // Rule scoring for everyone; AI (when requested) only for the rule top-20
    // to bound cost on large pools.
    const scored = candidates.map((c) => ({ c, rule: this.ruleScore(job, c) }));
    scored.sort((a, b) => b.rule.score - a.rule.score);
    const aiPool = opts.useAi && this.aiEnabled ? scored.slice(0, 20) : [];

    let shortlistedCount = 0;
    for (const { c, rule } of scored) {
      let ai: { score: number; breakdown: Record<string, unknown> } | null = null;
      if (aiPool.some((x) => x.c.id === c.id)) {
        ai = await this.aiScore(job, c);
      }
      const finalScore = ai?.score ?? rule.score;
      const shortlisted = (opts.autoShortlist ?? true) && finalScore >= threshold;

      await this.prisma.matchScore.upsert({
        where: { jobId_candidateId: { jobId, candidateId: c.id } },
        create: {
          tenantId, jobId, candidateId: c.id,
          ruleScore: rule.score, aiScore: ai?.score ?? null, finalScore,
          breakdown: { rule: rule.breakdown, ai: ai?.breakdown ?? null } as any,
          shortlisted,
        },
        update: {
          ruleScore: rule.score,
          ...(ai ? { aiScore: ai.score } : {}),
          finalScore,
          breakdown: { rule: rule.breakdown, ai: ai?.breakdown ?? null } as any,
          shortlisted,
        },
      });

      if (shortlisted) {
        shortlistedCount++;
        const existing = c.applications[0];
        if (!existing) {
          // Talent-pool hit: a past applicant matches this new JD.
          await this.prisma.application.create({
            data: {
              tenantId, jobId, candidateId: c.id,
              status: ApplicationStatus.SCREENING, source: 'TALENT_POOL',
            },
          });
        } else if (existing.status === ApplicationStatus.APPLIED) {
          await this.prisma.application.update({
            where: { id: existing.id },
            data: { status: ApplicationStatus.SCREENING },
          });
        }
      }
    }
    return {
      jobId,
      candidatesScored: scored.length,
      aiScored: aiPool.length,
      shortlisted: shortlistedCount,
      threshold,
    };
  }

  listMatches(tenantId: string, jobId: string) {
    return this.prisma.matchScore.findMany({
      where: { tenantId, jobId },
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { finalScore: 'desc' },
    });
  }

  // Match one candidate against every open job (used after apply/parse).
  async matchCandidateToOpenJobs(tenantId: string, candidateId: string) {
    const jobs = await this.prisma.job.findMany({
      where: { tenantId, status: 'PUBLISHED' },
      include: { skills: { include: { skill: true } } },
    });
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { skills: { include: { skill: true } }, experiences: true },
    });
    if (!candidate) return;
    for (const job of jobs) {
      const rule = this.ruleScore(job, candidate);
      await this.prisma.matchScore.upsert({
        where: { jobId_candidateId: { jobId: job.id, candidateId } },
        create: {
          tenantId, jobId: job.id, candidateId,
          ruleScore: rule.score, finalScore: rule.score,
          breakdown: { rule: rule.breakdown } as any,
        },
        update: {
          ruleScore: rule.score, finalScore: rule.score,
          breakdown: { rule: rule.breakdown } as any,
        },
      });
    }
  }
}
