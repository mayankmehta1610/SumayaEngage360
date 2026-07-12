import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';
import { tableListParams } from '../core/table-query.util';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent, SelectFieldComponent],
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
          <div><label>Client name</label><input [(ngModel)]="form.clientName" placeholder="Acme Corp" /></div>
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
          (pageChange)="page = $event; load()"
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
  submissions: any[] = [];
  candidates: any[] = [];
  jobs: any[] = [];
  form: any = {};

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
      client: s.clientName ?? s.clientTenantId ?? '—',
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

  async ngOnInit() {
    await Promise.all([this.load(), this.loadCandidates(), this.loadJobs()]);
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

  async load() {
    this.loading = true;
    try {
      const params = tableListParams(this.page, this.pageSize);
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
}
