import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';
import { tableListParams, TableSort } from '../core/table-query.util';
import { LifecycleWizardComponent } from '../ui/lifecycle-wizard.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent, SelectFieldComponent, LifecycleWizardComponent],
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
          <e360-select-field
            label="Employee"
            placeholder="Select employee"
            [options]="employeeOptions"
            [(ngModel)]="form.employeeId"
          />
          <e360-select-field
            label="Candidate"
            placeholder="Or select candidate"
            [options]="candidateOptions"
            [(ngModel)]="form.candidateId"
          />
          <e360-select-field
            label="Contract"
            placeholder="Select contract"
            [options]="contractOptions"
            [(ngModel)]="form.contractId"
          />
          <div><label>Role</label><input [(ngModel)]="form.role" /></div>
          <div><label>Client ref</label><input [(ngModel)]="form.clientRef" /></div>
          <div><label>Rate</label><input type="number" [(ngModel)]="form.rate" /></div>
          <div><label>Rate type</label><select [(ngModel)]="form.rateType"><option value="HOURLY">Hourly</option><option value="DAILY">Daily</option><option value="MONTHLY">Monthly</option><option value="FIXED">Fixed</option></select></div>
          <div><label>Currency</label><input [(ngModel)]="form.currency" placeholder="INR" /></div>
          <div><label>Start</label><input type="date" [(ngModel)]="form.startDate" /></div>
          <div><label>End</label><input type="date" [(ngModel)]="form.endDate" /></div>
          <div><label>Notes</label><input [(ngModel)]="form.notes" placeholder="Assignment notes" /></div>
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
          [rowClickable]="true"
          [selectedId]="selectedContractor?.id ?? null"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onFilterChange($event)"
          (rowClick)="onContractorClick($event)"
        />
      </div>
      @if (selectedContractor) {
        <e360-lifecycle-wizard
          entityType="CONTRACTOR_ASSIGNMENT"
          [entityId]="selectedContractor.id"
          workflowCode="CONTRACTOR_LIFECYCLE"
          [title]="personLabel(selectedContractor) + ' — ' + (selectedContractor.role || 'contractor assignment')"
          [metadata]="{ clientRef: selectedContractor.clientRef, startDate: selectedContractor.startDate, endDate: selectedContractor.endDate }"
        />
      }
    </e360-module-shell>
  `,
})
export class ContractorsComponent implements OnInit {
  private api = inject(ApiService);
  contractors: any[] = [];
  employees: any[] = [];
  candidates: any[] = [];
  contracts: any[] = [];
  error = '';
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};
  form: any = { rateType: 'HOURLY', currency: 'INR' };
  selectedContractor: any = null;

  cols: TableColumn[] = [
    { key: 'person', label: 'Person' },
    { key: 'role', label: 'Role' },
    { key: 'client', label: 'Client' },
    { key: 'rate', label: 'Rate' },
    { key: 'start', label: 'Start' },
    { key: 'status', label: 'Status' },
  ];

  get employeeOptions(): SelectOption[] {
    return this.employees.map((e) => ({
      value: e.id,
      label: `${e.user?.firstName ?? ''} ${e.user?.lastName ?? ''} (${e.employeeCode})`.trim(),
    }));
  }

  get candidateOptions(): SelectOption[] {
    return this.candidates.map((c) => ({
      value: c.id,
      label: `${c.firstName} ${c.lastName} (${c.email})`,
    }));
  }

  get contractOptions(): SelectOption[] {
    return this.contracts.map((c) => ({
      value: c.id,
      label: `${c.project?.name ?? 'Contract'} — ${c.clientRef ?? c.id.slice(0, 8)}`,
    }));
  }

  get rows() {
    return this.contractors.map((c) => ({
      id: c.id,
      person: this.personLabel(c),
      role: c.role ?? '—',
      client: c.clientRef ?? '—',
      rate: c.rate ? `${c.rate} ${c.currency}/${c.rateType}` : '—',
      start: c.startDate ? new Date(c.startDate).toLocaleDateString() : '—',
      status: c.status,
    }));
  }

  personLabel(c: any): string {
    if (c.employeeId) {
      const e = this.employees.find((x) => x.id === c.employeeId);
      if (e?.user) return `${e.user.firstName} ${e.user.lastName}`;
      return `Employee ${c.employeeId.slice(0, 8)}`;
    }
    if (c.candidateId) {
      const cand = this.candidates.find((x) => x.id === c.candidateId);
      if (cand) return `${cand.firstName} ${cand.lastName}`;
      return `Candidate ${c.candidateId.slice(0, 8)}`;
    }
    return '—';
  }

  async ngOnInit() {
    await Promise.all([this.loadLookups(), this.load()]);
  }

  async loadLookups() {
    try {
      const [empRes, candRes, contractRes] = await Promise.all([
        this.api.get<any>('/employees', { page: '1', pageSize: '200' }),
        this.api.get<any>('/candidates', { page: '1', pageSize: '200' }),
        this.api.get<any>('/contracts', { page: '1', pageSize: '200' }),
      ]);
      this.employees = unwrapPaginated(empRes).items;
      this.candidates = unwrapPaginated(candRes).items;
      this.contracts = unwrapPaginated(contractRes).items;
    } catch { /* optional */ }
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
        '/contractors',
        tableListParams(this.page, this.pageSize, {}, this.sort, this.columnFilters),
      );
      const { items, meta } = unwrapPaginated(res);
      this.contractors = items;
      if (this.selectedContractor) this.selectedContractor = items.find((item: any) => item.id === this.selectedContractor.id) ?? null;
      this.total = meta?.total ?? items.length;
    } catch (e) {
      this.error = errMsg(e);
    } finally {
      this.loading = false;
    }
  }
  onContractorClick(row: Record<string, unknown>) {
    const id = String(row['id'] ?? '');
    this.selectedContractor = this.selectedContractor?.id === id ? null : this.contractors.find((item) => item.id === id) ?? null;
  }

  async add() {
    this.error = '';
    if (!!this.form.employeeId === !!this.form.candidateId) { this.error = 'Select either one employee or one candidate.'; return; }
    if (!this.form.startDate) { this.error = 'Assignment start date is required.'; return; }
    if (this.form.endDate && this.form.endDate < this.form.startDate) { this.error = 'End date cannot be before start date.'; return; }
    try {
      await this.api.post('/contractors', {
        ...this.form,
        rate: this.form.rate === '' || this.form.rate == null ? undefined : Number(this.form.rate),
        startDate: this.form.startDate
          ? new Date(this.form.startDate).toISOString()
          : undefined,
        endDate: this.form.endDate
          ? new Date(this.form.endDate).toISOString()
          : undefined,
      });
      this.form = { rateType: 'HOURLY', currency: 'INR' };
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
}
