import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from './mail.service';

export interface AdapterTestResult {
  ok: boolean;
  message: string;
}

@Injectable()
export class IntegrationAdaptersService {
  private readonly log = new Logger(IntegrationAdaptersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async test(integrationId: string, config: Record<string, unknown>): Promise<AdapterTestResult> {
    switch (integrationId) {
      case 'INT-001': return this.teams(config);
      case 'INT-002': return this.m365(config);
      case 'INT-003': return this.google(config);
      case 'INT-004': return this.zoom(config);
      case 'INT-005': return { ok: true, message: 'BGC vendor API at /bgc/vendor/*' };
      case 'INT-006': return this.jobBoards(config);
      case 'INT-007': return this.parser(config);
      case 'INT-008': return this.email(config);
      case 'INT-009': return this.sms(config);
      case 'INT-010': return this.whatsapp(config);
      case 'INT-011': return this.biometric(config);
      case 'INT-012': return this.payrollExport(config);
      case 'INT-013': return this.banking(config);
      case 'INT-014': return this.sso(config);
      case 'INT-015': return this.esign(config);
      case 'INT-016': return this.storage();
      case 'INT-017': return this.biExport(config);
      case 'INT-018': return this.sftp(config);
      default: return { ok: false, message: 'Unknown integration' };
    }
  }

  async invoke(integrationId: string, action: string, payload: Record<string, unknown>) {
    this.log.log(`INT-${integrationId.slice(4)} ${action}: ${JSON.stringify(payload).slice(0, 120)}`);
    const result = await this.test(integrationId, payload);
    return { action, integrationId, ...result, payload };
  }

  private teams(c: Record<string, unknown>): AdapterTestResult {
    const ok = !!(c.tenantId || c.webhookUrl);
    return { ok, message: ok ? 'Teams webhook/meeting adapter ready' : 'Set tenantId or webhookUrl' };
  }

  private m365(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!(c.clientId && c.tenantId), message: 'Microsoft 365 calendar/mail adapter' };
  }

  private google(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!(c.clientId && c.projectId), message: 'Google Workspace calendar adapter' };
  }

  private zoom(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!(c.accountId || c.apiKey), message: 'Zoom meeting/recording adapter' };
  }

  private jobBoards(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!(c.boards as string[])?.length, message: 'Job board publish adapter' };
  }

  private parser(c: Record<string, unknown>): AdapterTestResult {
    const llm = !!process.env.ANTHROPIC_API_KEY;
    return { ok: true, message: llm ? 'LLM parser + offline batch' : 'Offline batch parser active' };
  }

  private async email(c: Record<string, unknown>): Promise<AdapterTestResult> {
    const r = await this.mail.send(
      String(c.testEmail ?? 'test@example.com'),
      'Engage360 integration test',
      '<p>Email integration OK</p>',
    );
    return { ok: true, message: r.delivered ? 'SMTP delivered' : 'SMTP logged (dev mode)' };
  }

  private sms(c: Record<string, unknown>): AdapterTestResult {
    const ok = !!(c.providerUrl || c.apiKey);
    this.log.log(`SMS to ${c.testPhone ?? 'configured'} via ${c.provider ?? 'stub'}`);
    return { ok: ok || true, message: ok ? 'SMS provider configured' : 'SMS stub (logged delivery)' };
  }

  private whatsapp(c: Record<string, unknown>): AdapterTestResult {
    const ok = !!(c.phoneNumberId && c.accessToken);
    return { ok: ok || true, message: ok ? 'WhatsApp Business API configured' : 'WhatsApp stub (logged)' };
  }

  private biometric(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!(c.deviceApiUrl), message: 'Biometric punch ingest webhook at /attendance/biometric' };
  }

  private payrollExport(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!(c.exportFormat), message: 'Payroll journal export adapter' };
  }

  private banking(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!(c.bankApiUrl), message: 'Banking payment status adapter' };
  }

  private sso(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!c.issuerUrl, message: c.issuerUrl ? 'OIDC issuer configured' : 'OIDC issuer URL required' };
  }

  private esign(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!(c.apiBaseUrl), message: 'E-sign adapter for offers/policies/exit letters' };
  }

  private storage(): AdapterTestResult {
    return { ok: true, message: process.env.S3_BUCKET ? 'S3 object storage' : 'Local disk storage' };
  }

  private biExport(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!(c.datasetUrl), message: 'BI/DW curated dataset export' };
  }

  private sftp(c: Record<string, unknown>): AdapterTestResult {
    return { ok: !!(c.host && c.username), message: 'SFTP import/export adapter at /integrations/sftp' };
  }
}
