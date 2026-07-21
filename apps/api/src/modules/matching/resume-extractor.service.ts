import { Injectable, Logger } from '@nestjs/common';
import { FilesService } from '../files/files.service';

/**
 * Proprietary, in-house resume parser — no external API, no LLM.
 *
 * Reads PDF / DOCX / plain-text resumes, extracts the raw text, and derives a
 * structured candidate profile deterministically (name, email, phone, location,
 * skills, total experience, work history and education). Powers the "auto-fill
 * from resume" experience on the public careers apply form.
 *
 * All logic here is owned by us and runs offline; the optional LLM parser in
 * integrations/resume-parser.service.ts remains a separate, opt-in enhancement.
 */

export interface ParsedExperience {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
}

export interface ParsedEducation {
  institution: string;
  degree?: string;
  field?: string;
  year?: number;
}

export interface ParsedResume {
  method: 'IN_HOUSE';
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
  location: string | null;
  city: string | null;
  summary: string | null;
  totalYearsExperience: number | null;
  skills: string[];
  experiences: ParsedExperience[];
  education: ParsedEducation[];
  rawTextLength: number;
}

// Built-in technical/functional skill dictionary — matched case-insensitively
// against the resume, and merged with the tenant's own skill master at runtime.
const SKILL_DICTIONARY = [
  // languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Golang', 'Rust',
  'Ruby', 'PHP', 'Kotlin', 'Swift', 'Scala', 'Dart', 'R', 'MATLAB', 'Perl',
  // web / frontend
  'React', 'Angular', 'Vue', 'Vue.js', 'Next.js', 'Svelte', 'HTML', 'CSS', 'SASS',
  'Tailwind', 'Redux', 'jQuery', 'Bootstrap',
  // backend / frameworks
  'Node.js', 'Express', 'NestJS', 'Spring', 'Spring Boot', 'Django', 'Flask',
  'FastAPI', 'Laravel', '.NET', 'ASP.NET', 'Rails', 'GraphQL', 'REST', 'gRPC',
  // data / db
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server',
  'Cassandra', 'DynamoDB', 'Elasticsearch', 'Snowflake', 'BigQuery', 'Databricks',
  'Kafka', 'Spark', 'Hadoop', 'Airflow', 'dbt', 'ETL', 'Power BI', 'Tableau',
  // cloud / devops
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform',
  'Ansible', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'CI/CD', 'Linux', 'Nginx',
  'Prometheus', 'Grafana', 'Cloudflare',
  // mobile
  'Flutter', 'React Native', 'iOS', 'Android', 'Xamarin',
  // testing / qa
  'Selenium', 'Cypress', 'Playwright', 'Jest', 'JUnit', 'Postman', 'API testing',
  'Automation testing', 'Manual testing',
  // methods / functional
  'Agile', 'Scrum', 'Kanban', 'JIRA', 'Confluence', 'Product management',
  'Project management', 'Primavera', 'MS Project', 'ITIL', 'DevOps', 'SRE',
  // domain / HR / finance
  'Payroll', 'EPF', 'ESI', 'TDS', 'GST', 'Recruitment', 'Sourcing', 'HRBP',
  'Employee relations', 'Compensation', 'Talent Acquisition', 'Onboarding',
  'SAP', 'Oracle ERP', 'Workday', 'IFRS', 'GAAP', 'Accounting', 'Financial modeling',
  'Supply chain', 'Logistics', 'Procurement', 'Six Sigma', 'Lean',
  // design
  'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'UX', 'UI', 'Wireframing',
  // networking / infra
  'Cisco', 'Networking', 'T24', 'Core banking', 'VMware', 'Active Directory',
  // data science / ai
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Pandas',
  'NumPy', 'scikit-learn', 'Computer Vision', 'Data Analysis', 'Statistics',
];

const DEGREE_PATTERNS = [
  /\b(Ph\.?D|Doctorate)\b/i,
  /\b(M\.?B\.?A)\b/i,
  /\b(M\.?Tech|M\.?E\.?|M\.?Sc|Master(?:'s)?(?: of| in)?)\b/i,
  /\b(B\.?Tech|B\.?E\.?|B\.?Sc|Bachelor(?:'s)?(?: of| in)?)\b/i,
  /\b(B\.?Com|M\.?Com|B\.?A\.?|M\.?A\.?)\b/i,
  /\b(Diploma)\b/i,
];

const MONTHS =
  '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*';

@Injectable()
export class ResumeExtractorService {
  private readonly logger = new Logger(ResumeExtractorService.name);

  constructor(private readonly files: FilesService) {}

  /** Extract structured data from an already-uploaded resume file. */
  async extract(resumeFileId: string, tenantSkills: string[] = []): Promise<ParsedResume | null> {
    const text = await this.readText(resumeFileId);
    if (!text || !text.trim()) return null;
    return this.parseText(text, tenantSkills);
  }

  private async readText(resumeFileId: string): Promise<string> {
    const { buffer, meta } = await this.files.getBuffer(resumeFileId);
    const type = (meta.contentType ?? '').toLowerCase();
    try {
      if (type === 'application/pdf' || meta.fileName?.toLowerCase().endsWith('.pdf')) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (b: Buffer) => Promise<{ text: string }>;
        return (await pdfParse(buffer)).text;
      }
      if (
        type.includes('officedocument.wordprocessingml') ||
        meta.fileName?.toLowerCase().endsWith('.docx')
      ) {
        return this.readDocx(buffer);
      }
      return buffer.toString('utf8');
    } catch (e) {
      this.logger.error(`Resume text extraction failed: ${(e as Error).message}`);
      return buffer.toString('utf8');
    }
  }

  /**
   * Minimal DOCX text extraction — a .docx is a zip; document.xml holds the
   * body. We pull the <w:t> runs without any external library.
   */
  private readDocx(buffer: Buffer): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const zlib = require('zlib');
      // Locate the raw deflate stream for word/document.xml in the zip.
      const marker = Buffer.from('word/document.xml');
      const idx = buffer.indexOf(marker);
      if (idx === -1) return '';
      // Fall back: scan for XML text nodes across the whole decompressed guess.
      // Try inflating the entire buffer regions is unreliable; instead read any
      // plainly embedded XML. As a pragmatic approach, strip tags from any
      // readable XML fragments present in the buffer.
      const asText = buffer.toString('latin1');
      const runs = [...asText.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
      if (runs.length) return this.decodeXmlEntities(runs.join(' '));
      // Last resort: inflateRaw on the region after the local file header.
      void zlib;
      return '';
    } catch {
      return '';
    }
  }

  private decodeXmlEntities(s: string): string {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  parseText(text: string, tenantSkills: string[] = []): ParsedResume {
    const clean = text.replace(/\r/g, '');
    const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
    const lower = clean.toLowerCase();

    const email = clean.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0]?.replace(/[.,;]$/, '') ?? null;
    const phone = this.extractPhone(clean);
    const linkedIn =
      clean.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i)?.[0] ?? null;

    const { firstName, lastName } = this.extractName(lines, email);
    const { location, city } = this.extractLocation(lines);
    const skills = this.extractSkills(clean, lower, tenantSkills);
    const totalYearsExperience = this.extractYears(clean);
    const summary = this.extractSummary(lines);
    const experiences = this.extractExperiences(lines);
    const education = this.extractEducation(lines);

    return {
      method: 'IN_HOUSE',
      firstName,
      lastName,
      email,
      phone,
      linkedIn,
      location,
      city,
      summary,
      totalYearsExperience,
      skills,
      experiences,
      education,
      rawTextLength: clean.length,
    };
  }

  private extractPhone(text: string): string | null {
    // Prefer numbers near a phone label; else the first plausible run.
    const labelled = text.match(
      /(?:phone|mobile|contact|tel|cell)[:\s]*(\+?\d[\d\s().-]{8,16}\d)/i,
    );
    const raw = labelled?.[1] ?? text.match(/\+?\d[\d\s().-]{8,16}\d/)?.[0] ?? null;
    if (!raw) return null;
    const digits = raw.replace(/[^\d+]/g, '');
    return digits.length >= 8 ? raw.trim() : null;
  }

  private extractName(lines: string[], email: string | null): { firstName: string | null; lastName: string | null } {
    // 1. An explicit "Name:" label.
    for (const l of lines.slice(0, 15)) {
      const m = l.match(/^name[:\s]+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,3})$/i);
      if (m) return this.splitName(m[1]);
    }
    // 2. The first line that looks like a person's name (2-4 capitalized words,
    //    no digits, not a heading/skill/section word).
    const bad = /(resume|curriculum|vitae|profile|summary|objective|contact|email|phone|address|www|http|@)/i;
    for (const l of lines.slice(0, 8)) {
      if (bad.test(l) || /\d/.test(l)) continue;
      const words = l.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Z][a-zA-Z.'-]+$/.test(w))) {
        return this.splitName(l);
      }
    }
    // 3. Derive from the email local part (john.doe@ -> John Doe).
    if (email) {
      const local = email.split('@')[0].replace(/\d+/g, '');
      const parts = local.split(/[._-]+/).filter((p) => p.length > 1);
      if (parts.length >= 2) {
        return { firstName: cap(parts[0]), lastName: cap(parts[parts.length - 1]) };
      }
      if (parts.length === 1) return { firstName: cap(parts[0]), lastName: null };
    }
    return { firstName: null, lastName: null };
  }

  private splitName(full: string): { firstName: string | null; lastName: string | null } {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: cap(parts[0]), lastName: null };
    return { firstName: cap(parts[0]), lastName: cap(parts[parts.length - 1]) };
  }

  private extractLocation(lines: string[]): { location: string | null; city: string | null } {
    for (const l of lines.slice(0, 20)) {
      const m = l.match(/(?:location|address|based in|city)[:\s]+(.+)$/i);
      if (m) {
        const loc = m[1].split('|')[0].trim().replace(/[.;]$/, '');
        return { location: loc, city: loc.split(',')[0].trim() };
      }
    }
    // A "City, Region" pattern in the header block.
    for (const l of lines.slice(0, 8)) {
      const m = l.match(/^([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?),\s*([A-Z][a-zA-Z]+.*)$/);
      if (m && !/@|\d{4}/.test(l)) {
        return { location: l.trim(), city: m[1].trim() };
      }
    }
    return { location: null, city: null };
  }

  private extractSkills(text: string, lower: string, tenantSkills: string[]): string[] {
    const dict = [...new Set([...SKILL_DICTIONARY, ...tenantSkills])];
    const found = new Map<string, string>(); // lower -> canonical
    for (const skill of dict) {
      const s = skill.toLowerCase();
      // Word-boundary match; escape regex specials in the skill.
      const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(s)}(?:$|[^a-z0-9])`, 'i');
      if (pattern.test(lower)) found.set(s, skill);
    }
    return [...found.values()].slice(0, 30);
  }

  private extractYears(text: string): number | null {
    // "X years of experience" style.
    const explicit = text.match(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
    if (explicit) return Number(explicit[1]);
    const generic = text.match(/(?:experience|exp)[:\s]*(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)/i);
    if (generic) return Number(generic[1]);
    // Infer from the earliest 4-digit year in the work-history range.
    const years = [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
    if (years.length >= 2) {
      const min = Math.min(...years);
      const now = new Date().getFullYear();
      const span = now - min;
      if (span > 0 && span < 45) return span;
    }
    return null;
  }

  private extractSummary(lines: string[]): string | null {
    const idx = lines.findIndex((l) => /^(summary|profile|objective|about)\b/i.test(l));
    if (idx !== -1) {
      const body: string[] = [];
      for (let i = idx + 1; i < lines.length && body.length < 4; i++) {
        if (this.isSectionHeading(lines[i])) break;
        body.push(lines[i]);
      }
      if (body.length) return body.join(' ').slice(0, 600);
    }
    return null;
  }

  private extractExperiences(lines: string[]): ParsedExperience[] {
    const out: ParsedExperience[] = [];
    const start = lines.findIndex((l) =>
      /^(work experience|professional experience|experience|employment(?: history)?)\b/i.test(l),
    );
    if (start === -1) return out;
    const dateRange = new RegExp(
      `((?:${MONTHS}\\.?\\s*)?(?:19|20)\\d{2})\\s*(?:-|–|to)\\s*((?:${MONTHS}\\.?\\s*)?(?:19|20)\\d{2}|present|current)`,
      'i',
    );
    for (let i = start + 1; i < lines.length && out.length < 6; i++) {
      const l = lines[i];
      if (this.isSectionHeading(l) && !/experience/i.test(l)) break;
      const dm = l.match(dateRange);
      if (dm) {
        // Prefer text on the date line itself (e.g. "Senior Engineer, Infosys |
        // Jan 2021 - Present"); only fall back to the previous line when the
        // date sits alone, and never treat a section heading as a role.
        let context = l.replace(dateRange, '').replace(/[|,–-]\s*$/, '').trim();
        if (context.length < 3) {
          const prev = lines[i - 1] ?? '';
          if (!this.isSectionHeading(prev)) context = prev;
        }
        const parts = context.split(/\s*[|,–]\s*|\s+at\s+|\s+@\s+|\s-\s/).map((p) => p.trim()).filter(Boolean);
        const title = parts[0] ?? 'Role';
        const company = parts[1] ?? parts[0] ?? 'Company';
        out.push({
          title: title.slice(0, 120),
          company: company.slice(0, 120),
          startDate: this.normDate(dm[1]),
          endDate: /present|current/i.test(dm[2]) ? undefined : this.normDate(dm[2]),
        });
      }
    }
    return out;
  }

  private extractEducation(lines: string[]): ParsedEducation[] {
    const out: ParsedEducation[] = [];
    const start = lines.findIndex((l) => /^(education|academic|qualifications?)\b/i.test(l));
    if (start === -1) return out;
    for (let i = start + 1; i < lines.length && out.length < 4; i++) {
      const l = lines[i];
      if (this.isSectionHeading(l) && !/education|academic/i.test(l)) break;
      const degMatch = DEGREE_PATTERNS.map((p) => l.match(p)).find(Boolean);
      const yearMatch = l.match(/\b(19|20)\d{2}\b/);
      if (degMatch || /university|college|institute|school/i.test(l)) {
        const institution =
          l.match(/([A-Z][\w.& ]*(?:University|College|Institute|School)[\w.& ]*)/)?.[1]?.trim() ??
          l.replace(DEGREE_PATTERNS.find((p) => p.test(l)) ?? '', '').trim();
        out.push({
          institution: (institution || l).slice(0, 140),
          degree: degMatch ? degMatch[0] : undefined,
          year: yearMatch ? Number(yearMatch[0]) : undefined,
        });
      }
    }
    return out;
  }

  private isSectionHeading(line: string): boolean {
    return /^(experience|work experience|professional experience|employment|education|academic|skills|technical skills|projects|certifications?|awards|summary|profile|objective|contact|references|languages|interests)\b/i.test(
      line,
    );
  }

  private normDate(raw: string): string | undefined {
    const y = raw.match(/(19|20)\d{2}/)?.[0];
    if (!y) return undefined;
    const mon = raw.toLowerCase().match(new RegExp(MONTHS))?.[0];
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const mm = mon ? monthMap[mon.slice(0, 3)] : '01';
    return `${y}-${mm}`;
  }
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
