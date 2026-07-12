import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { tableListParams } from '../core/table-query.util';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Contractor assignments"
      description="Staffing contractor lifecycle on client contracts."
      icon="hard-hat"
      moduleKey="contractors"
      rolesHint="TENANT_ADMIN, HR, MANAGER"
      [breadcrumbs]="[{ label: 'Staffing' }, { label: 'Contractors' }]"
    >
      @if (error) { <div class="e360-error">{{ error }}</div> }

      <div class="card">
        <h2 style="margin-top:0">Assign contractor</h2>
        <div class="row" style="align-items:flex-end">
          <div><label>Role</label><input [(ngModel)]="form.role" /></div>
          <div><label>Client ref</label><input [(ngModel)]="form.clientRef" /></div>
          <div><label>Rate</label><input type="number" [(ngModel)]="form.rate" /></div>
          <div><label>Start</label><input type="date" [(ngModel)]="form.startDate" /></div>
          <div><label>End</label><input type="date" [(ngModel)]="form.endDate" /></div>
          <div style="flex:0"><button (click)="add()">Create</button></div>
        </div>
      </div>

      <div class="card">
        <e360-data-table
          [columns]="cols"
          [rows]="rows"
          [page]="page"
          [pageSize]="pageSize"
          [total]="total"
          [loading]="loading"
          [stickyHeader]="true"
          (pageChange)="page = $event; load()"
        />
      </div>
    </e360-module-shell>
  `,
})
export class ContractorsComponent implements OnInit {
  private api = inject(ApiService);
  contractors: any[] = [];
  error = '';
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  form: any = {};

  cols: TableColumn[] = [
    { key: 'role', label: 'Role' },
    { key: 'client', label: 'Client' },
    { key: 'rate', label: 'Rate' },
    { key: 'start', label: 'Start' },
    { key: 'status', label: 'Status' },
  ];

  get rows() {
    return this.contractors.map((c) => ({
      role: c.role ?? '—',
      client: c.clientRef ?? '—',
      rate: c.rate ? `${c.rate} ${c.currency}/${c.rateType}` : '—',
      start: c.startDate ? new Date(c.startDate).toLocaleDateString() : '—',
      status: c.status,
    }));
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;
    try {
      const res = await this.api.get<any>('/contractors', tableListParams(this.page, this.pageSize));
      const { items, meta } = unwrapPaginated(res);
      this.contractors = items;
      this.total = meta?.total ?? items.length;
    } catch (e) {
      this.error = errMsg(e);
    } finally {
      this.loading = false;
    }
  }

  async add() {
    try {
      await this.api.post('/contractors', {
        ...this.form,
        startDate: this.form.startDate
          ? new Date(this.form.startDate).toISOString()
          : undefined,
        endDate: this.form.endDate
          ? new Date(this.form.endDate).toISOString()
          : undefined,
      });
      this.form = {};
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
}
