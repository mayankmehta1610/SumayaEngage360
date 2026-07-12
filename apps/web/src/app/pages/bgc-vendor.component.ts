import { Component, OnInit, inject } from '@angular/core';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [ModuleShellComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="BGV vendor portal"
      description="Role: BGC_VENDOR — sheet 03/04"
      icon="microscope"
      [showReports]="false"
      rolesHint="BGC_VENDOR"
      [breadcrumbs]="[{ label: 'Administration' }, { label: 'BGV cases' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true">
        <ng-template #rowTemplate let-row>
          <td>{{ row.employee }}</td>
          <td>{{ row.status }}</td>
          <td>
            @if (row.status === 'SUBMITTED_TO_VENDOR') {
              <button (click)="clear(row.id)">Mark clear</button>
              <button (click)="discrepancy(row.id)">Discrepancy</button>
            }
          </td>
        </ng-template>
      </e360-data-table>
    </div>
  
    </e360-module-shell>
  `,
})
export class BgcVendorComponent implements OnInit {
  private api = inject(ApiService);
  cases: any[] = []; error = '';
  tableCols: TableColumn[] = [
    { key: 'employee', label: 'Employee' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Action', sortable: false, filterable: false },
  ];

  get tableRows() {
    return this.cases.map((c) => ({
      id: c.id,
      employee: `${c.employee?.user?.firstName ?? ''} ${c.employee?.user?.lastName ?? ''}`.trim() || '—',
      status: c.status,
    }));
  }

  async ngOnInit() {
    try { this.cases = await this.api.get<any[]>('/bgc/vendor/cases'); }
    catch (e) { this.error = errMsg(e); }
  }
  async clear(id: string) {
    await this.api.post(`/bgc/vendor/cases/${id}/report`, { status: 'CLEAR', reportSummary: 'All checks passed' });
    this.cases = await this.api.get<any[]>('/bgc/vendor/cases');
  }
  async discrepancy(id: string) {
    await this.api.post(`/bgc/vendor/cases/${id}/report`, { status: 'DISCREPANCY', reportSummary: 'Address mismatch' });
    this.cases = await this.api.get<any[]>('/bgc/vendor/cases');
  }
}
