import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ModuleShellComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Client contracts"
      description="Project contracts for staffing engagements."
      icon="file-signature"
      moduleKey="contracts"
      rolesHint="TENANT_ADMIN, HR, MANAGER"
      [breadcrumbs]="[{ label: 'Staffing' }, { label: 'Contracts' }]"
    >
      @if (error) { <div class="e360-error">{{ error }}</div> }

      <div class="card">
        <e360-data-table [columns]="cols" [rows]="rows" [paginated]="false" [stickyHeader]="true" />
      </div>
    </e360-module-shell>
  `,
})
export class ContractsComponent implements OnInit {
  private api = inject(ApiService);
  contracts: any[] = [];
  error = '';

  cols: TableColumn[] = [
    { key: 'project', label: 'Project' },
    { key: 'client', label: 'Client ref' },
    { key: 'value', label: 'Value' },
    { key: 'start', label: 'Start' },
    { key: 'end', label: 'End' },
  ];

  get rows() {
    return this.contracts.map((c) => ({
      project: c.project?.name ?? c.projectId,
      client: c.clientRef ?? '—',
      value: c.value ?? '—',
      start: c.startDate ? new Date(c.startDate).toLocaleDateString() : '—',
      end: c.endDate ? new Date(c.endDate).toLocaleDateString() : '—',
    }));
  }

  async ngOnInit() {
    try {
      this.contracts = await this.api.get<any[]>('/contracts');
    } catch (e) {
      this.error = errMsg(e);
    }
  }
}
