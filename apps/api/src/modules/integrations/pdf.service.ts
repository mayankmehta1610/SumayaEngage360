import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { FilesService } from '../files/files.service';

export interface LetterData {
  companyName: string;
  title: string; // "Offer Letter" | "Relieving Letter" ...
  recipientName: string;
  paragraphs: string[];
  signatory?: string;
}

// Simple, clean letter PDFs stored through FilesService (returns fileId).
@Injectable()
export class PdfService {
  constructor(private readonly files: FilesService) {}

  async generateLetter(data: LetterData, tenantId?: string): Promise<string> {
    const buffer = await this.render(data);
    const saved = await this.files.save(
      {
        originalname: `${data.title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        mimetype: 'application/pdf',
        buffer,
        size: buffer.length,
      },
      tenantId,
    );
    return saved.id;
  }

  private render(data: LetterData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 60 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text(data.companyName);
      doc.moveDown(0.5);
      doc.fontSize(14).text(data.title);
      doc.moveDown();
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#555555')
        .text(new Date().toDateString());
      doc.moveDown(1.5);
      doc.fillColor('#000000').fontSize(11).text(`Dear ${data.recipientName},`);
      doc.moveDown();
      for (const p of data.paragraphs) {
        doc.text(p, { lineGap: 3 });
        doc.moveDown();
      }
      doc.moveDown(2);
      doc.text('Sincerely,');
      doc.moveDown();
      doc.font('Helvetica-Bold').text(data.signatory ?? `HR Team, ${data.companyName}`);
      doc.end();
    });
  }
}
