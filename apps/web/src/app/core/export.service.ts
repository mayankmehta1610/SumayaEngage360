import { Injectable } from '@angular/core';

export interface ExportColumn {
  key: string; // dot-path into the row, e.g. "user.firstName"
  label: string;
}

// Client-side export of API data (never hardcoded content):
//  - Excel: real .xls download (HTML-table format Excel opens natively)
//  - PDF / print: opens a clean printable view and triggers the browser's
//    print dialog, where "Save as PDF" produces the PDF.
@Injectable({ providedIn: 'root' })
export class ExportService {
  private value(row: any, path: string): string {
    const v = path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), row);
    if (v == null) return '';
    if (v instanceof Date) return v.toLocaleDateString();
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      return new Date(v).toLocaleDateString();
    }
    return String(v);
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private tableHtml(rows: any[], cols: ExportColumn[]): string {
    const head = cols.map((c) => `<th>${this.esc(c.label)}</th>`).join('');
    const body = rows
      .map(
        (r) =>
          `<tr>${cols.map((c) => `<td>${this.esc(this.value(r, c.key))}</td>`).join('')}</tr>`,
      )
      .join('');
    return `<table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  excel(rows: any[], cols: ExportColumn[], name: string) {
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${this.tableHtml(rows, cols)}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Also used for plain printing — the browser print dialog offers "Save as PDF".
  pdf(rows: any[], cols: ExportColumn[], title: string) {
    this.printHtml(title, this.tableHtml(rows, cols));
  }

  // Print any element (e.g. a filled form) — export-to-PDF via the print dialog.
  printElement(title: string, el: HTMLElement) {
    this.printHtml(title, el.outerHTML);
  }

  private printHtml(title: string, bodyHtml: string) {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<html><head><title>${this.esc(title)}</title><style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 18px; }
      table { border-collapse: collapse; width: 100%; font-size: 12px; }
      th, td { border: 1px solid #999; padding: 5px 7px; text-align: left; }
      th { background: #f0f2f7; }
      input, select, textarea, button { border: none; font: inherit; }
    </style></head><body><h1>${this.esc(title)}</h1>${bodyHtml}
    <script>window.onload = () => { window.print(); }</${'script'}></body></html>`);
    w.document.close();
  }
}
