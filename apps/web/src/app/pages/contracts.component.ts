import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { tableListParams, TableSort } from '../core/table-query.util';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent, SelectFieldComponent],
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
        <h2>Create client contract</h2>
        <div class="row">
          <e360-select-field label="Project" placeholder="Select project" [options]="projectOptions" [(ngModel)]="form.projectId" />
          <div><label>Client reference</label><input [(ngModel)]="form.clientRef" placeholder="PO or contract number" /></div>
          <div><label>Contract value</label><input type="number" min="0" [(ngModel)]="form.value" /></div>
          <div><label>Start date</label><input type="date" [(ngModel)]="form.startDate" /></div>
          <div><label>End date</label><input type="date" [(ngModel)]="form.endDate" /></div>
        </div>
        <label>Commercial terms</label><textarea [(ngModel)]="form.terms" placeholder="Billing, payment, renewal, and termination terms"></textarea>
        <button (click)="create()" [disabled]="busy">Create contract</button>
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
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onFilterChange($event)"
        />
      </div>
    </e360-module-shell>
  `,
})
export class ContractsComponent implements OnInit {
  private api = inject(ApiService);
  contracts: any[] = [];
  projects: any[] = [];
  form: any = {};
  busy = false;
  error = '';
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};

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

  get projectOptions(): SelectOption[] { return this.projects.map((project) => ({ value: project.id, label: `${project.code} — ${project.name}` })); }

  async ngOnInit() {
    await Promise.all([this.load(), this.loadProjects()]);
  }

  async loadProjects() {
    try { this.projects = await this.api.get<any[]>('/projects'); }
    catch (e) { this.error = errMsg(e); }
  }

  async create() {
    this.error = '';
    if (!this.form.projectId || !this.form.startDate) { this.error = 'Project and start date are required.'; return; }
    if (this.form.endDate && this.form.endDate < this.form.startDate) { this.error = 'End date cannot be before start date.'; return; }
    this.busy = true;
    try {
      await this.api.post('/contracts', {
        ...this.form,
        value: this.form.value === '' || this.form.value == null ? undefined : Number(this.form.value),
        startDate: new Date(this.form.startDate).toISOString(),
        endDate: this.form.endDate ? new Date(this.form.endDate).toISOString() : undefined,
      });
      this.form = {}; await this.load();
    } catch (e) { this.error = errMsg(e); } finally { this.busy = false; }
  }

  onPageChange(p: number) {
    this.page = p;
    this.load();
  }

  onPageSizeChange(ps: number) {
    this.pageSize = ps;
    this.page = 1;
    this.load();
  }

  onSortChange(s: { key: string; dir: 'asc' | 'desc' }) {
    this.sort = s;
    this.page = 1;
    this.load();
  }

  onFilterChange(f: Record<string, string>) {
    this.columnFilters = f;
    this.page = 1;
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      const res = await this.api.get<any>(
        '/contracts',
        tableListParams(this.page, this.pageSize, {}, this.sort, this.columnFilters),
      );
      const { items, meta } = unwrapPaginated(res);
      this.contracts = items;
      this.total = meta?.total ?? items.length;
      this.error = '';
    } catch (e) {
      this.error = errMsg(e);
    } finally {
      this.loading = false;
    }
  }
}
