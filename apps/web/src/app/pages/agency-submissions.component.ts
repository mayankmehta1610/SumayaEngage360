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
      title="Client submissions"
      description="Submit candidates from your talent pool to client companies."
      icon="send"
      moduleKey="agency-submissions"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Agency' }, { label: 'Submissions' }]"
    >
      @if (error) { <div class="e360-error">{{ error }}</div> }

      <div class="card">
        <h2 style="margin-top:0">New submission</h2>
        <div class="row" style="align-items:flex-end">
          <e360-select-field
            label="Candidate"
            placeholder="Select candidate"
            [options]="candidateOptions"
            [(ngModel)]="form.candidateId"
          />
          <e360-select-field
            label="Client tenant"
            placeholder="Link company tenant"
            [options]="clientTenantOptions"
            [(ngModel)]="form.clientTenantId"
            (ngModelChange)="onClientTenantChange($event)"
          />
          <div><label>Client name</label><input [(ngModel)]="form.clientName" placeholder="Display name" /></div>
          <e360-select-field
            label="Job (optional)"
            placeholder="Link to job"
            [options]="jobOptions"
            [(ngModel)]="form.jobId"
          />
          <div style="flex:0"><button (click)="submit()">Create draft</button></div>
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
          [selectedId]="selectedSubmission?.id ?? null"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onFilterChange($event)"
          (rowClick)="onSubmissionClick($event)"
        >
          <ng-template #rowTemplate let-row>
            <td>{{ row.candidate }}</td>
            <td>{{ row.client }}</td>
            <td>{{ row.status }}</td>
            <td>{{ row.submitted }}</td>
            <td>
              @if (row.status === 'DRAFT') {
                <button class="secondary sm" (click)="markSubmitted(row.id)">Submit</button>
              }
            </td>
          </ng-template>
        </e360-data-table>
      </div>
      @if (selectedSubmission) {
        <e360-lifecycle-wizard
          entityType="AGENCY_SUBMISSION"
          [entityId]="selectedSubmission.id"
          workflowCode="AGENCY_PLACEMENT"
          [title]="(selectedSubmission.candidate?.firstName || 'Candidate') + ' ' + (selectedSubmission.candidate?.lastName || '') + ' — ' + (selectedSubmission.clientName || 'client placement')"
          [metadata]="{ candidateId: selectedSubmission.candidateId, jobId: selectedSubmission.jobId, clientName: selectedSubmission.clientName }"
        />
      }
    </e360-module-shell>
  `,
})
export class AgencySubmissionsComponent implements OnInit {
  private api = inject(ApiService);
  error = '';
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};
  submissions: any[] = [];
  candidates: any[] = [];
  jobs: any[] = [];
  clientTenants: any[] = [];
  form: any = {};
  selectedSubmission: any = null;

  cols: TableColumn[] = [
    { key: 'candidate', label: 'Candidate' },
    { key: 'client', label: 'Client' },
    { key: 'status', label: 'Status' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'actions', label: '', sortable: false, filterable: false },
  ];

  get rows() {
    return this.submissions.map((s) => ({
      id: s.id,
      candidate: s.candidate
        ? `${s.candidate.firstName} ${s.candidate.lastName}`
        : '—',
      client: s.clientName ?? this.clientTenantLabel(s.clientTenantId),
      status: s.status,
      submitted: s.submittedAt
        ? new Date(s.submittedAt).toLocaleDateString()
        : '—',
    }));
  }

  get candidateOptions(): SelectOption[] {
    return this.candidates.map((c) => ({
      value: c.id,
      label: `${c.firstName} ${c.lastName} (${c.email})`,
    }));
  }

  get jobOptions(): SelectOption[] {
    return this.jobs.map((j) => ({ value: j.id, label: j.title }));
  }

  get clientTenantOptions(): SelectOption[] {
    return this.clientTenants.map((t) => ({
      value: t.id,
      label: `${t.name} (${t.subdomain})`,
    }));
  }

  clientTenantLabel(id?: string) {
    if (!id) return '—';
    const t = this.clientTenants.find((x) => x.id === id);
    return t ? `${t.name} (${t.subdomain})` : id;
  }

  onClientTenantChange(id: string | null) {
    if (!id) return;
    const t = this.clientTenants.find((x) => x.id === id);
    if (t && !this.form.clientName) this.form.clientName = t.name;
  }

  async ngOnInit() {
    await Promise.all([this.load(), this.loadCandidates(), this.loadJobs(), this.loadClientTenants()]);
  }

  async loadClientTenants() {
    try {
      this.clientTenants = await this.api.get<any[]>('/agency/client-tenants');
    } catch { this.clientTenants = []; }
  }

  async loadCandidates() {
    try {
      const res = await this.api.get<any>('/candidates', { page: '1', pageSize: '200' });
      this.candidates = unwrapPaginated(res).items;
    } catch { /* optional */ }
  }

  async loadJobs() {
    try {
      const res = await this.api.get<any>('/jobs', { page: '1', pageSize: '200' });
      this.jobs = unwrapPaginated(res).items;
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
      const params = tableListParams(this.page, this.pageSize, {}, this.sort, this.columnFilters);
      const res = await this.api.get<any>('/agency/submissions', params);
      const { items, meta } = unwrapPaginated(res);
      this.submissions = items;
      this.total = meta?.total ?? items.length;
      this.error = '';
    } catch (e) {
      this.error = errMsg(e);
    } finally {
      this.loading = false;
    }
  }

  async submit() {
    try {
      await this.api.post('/agency/submissions', this.form);
      this.form = {};
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  async markSubmitted(id: string) {
    try {
      await this.api.patch(`/agency/submissions/${id}`, { status: 'SUBMITTED' });
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
  onSubmissionClick(row: Record<string, unknown>) {
    const id = String(row['id'] ?? '');
    this.selectedSubmission = this.selectedSubmission?.id === id ? null : this.submissions.find((item) => item.id === id) ?? null;
  }
}
