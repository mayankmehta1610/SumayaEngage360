import { Component, Input, inject } from '@angular/core';
import { ExportColumn, ExportService } from './export.service';

// Drop-in Excel / PDF / print buttons for any table of API data.
@Component({
  selector: 'export-bar',
  standalone: true,
  template: `
    <span style="display:inline-flex;gap:.4rem">
      <button class="secondary" (click)="excel()" [disabled]="!rows.length" title="Download as Excel">⬇ Excel</button>
      <button class="secondary" (click)="pdf()" [disabled]="!rows.length" title="Print / save as PDF">⬇ PDF / Print</button>
    </span>
  `,
})
export class ExportBarComponent {
  private exporter = inject(ExportService);
  @Input({ required: true }) rows: any[] = [];
  @Input({ required: true }) cols: ExportColumn[] = [];
  @Input({ required: true }) name = 'export';

  excel() { this.exporter.excel(this.rows, this.cols, this.name); }
  pdf() { this.exporter.pdf(this.rows, this.cols, this.name); }
}
