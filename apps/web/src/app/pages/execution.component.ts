import { Component, OnInit, inject } from '@angular/core';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [ModuleShellComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="AI execution checklist"
      description="Sheet 12 — implementation evidence"
      icon="check-circle"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Execution' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }

    <div class="card">
      <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true" />
    </div>
  
    </e360-module-shell>
  `,
})
export class ExecutionComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  steps: any[] = [];
  error = '';
  tableCols: TableColumn[] = [
    { key: 'step', label: 'Step' },
    { key: 'sheet', label: 'Sheet' },
    { key: 'evidence', label: 'Evidence' },
    { key: 'status', label: 'Status' },
  ];

  get tableRows() {
    return this.steps.map((s) => ({
      step: s.step,
      sheet: s.sheetRef,
      evidence: s.evidence,
      status: s.status,
    }));
  }

  async ngOnInit() {
    if (!this.auth.hasRole('TENANT_ADMIN', 'HR')) return;
    try {
      const res = await this.api.get<{ steps: any[] }>('/v1/execution/checklist');
      this.steps = res.steps;
    } catch (e) { this.error = errMsg(e); }
  }
}
