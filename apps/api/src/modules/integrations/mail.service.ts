import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// SMTP delivery, activated by SMTP_HOST. Unconfigured -> logs instead of
// sending, so flows never fail because email isn't set up yet.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      })
    : null;

  private readonly from =
    process.env.MAIL_FROM ?? 'Engage360 <no-reply@engage360.local>';

  async send(to: string, subject: string, html: string, attachments?: { filename: string; content: Buffer }[]) {
    if (!this.transport) {
      this.logger.log(`[mail disabled] to=${to} subject="${subject}"`);
      return { delivered: false };
    }
    try {
      await this.transport.sendMail({ from: this.from, to, subject, html, attachments });
      return { delivered: true };
    } catch (e) {
      // Never let a mail failure break the business flow.
      this.logger.error(`Mail to ${to} failed: ${(e as Error).message}`);
      return { delivered: false };
    }
  }
}
