import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, QueryParams, errMsg, unwrapPaginated } from '../core/api.service';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { tableListParams, TableSort } from '../core/table-query.util';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent, ModuleShellComponent, DataTableComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Applications"
      description="Application pipeline, interviews, and offers."
      icon="inbox"
      moduleKey="applications"
      auditEntityType="APPLICATION"
      rolesHint="TENANT_ADMIN, HR, INTERVIEWER"
      [breadcrumbs]="[{ label: 'Recruitment' }, { label: 'Applications' }]"
    >
      <div actions class="e360-toolbar" style="margin:0;gap:.4rem">
        <export-bar [rows]="applications" [cols]="exportCols" name="applications" />
      </div>

      @if (error) { <div class="e360-error">{{ error }}</div> }

      <div class="e360-filters">
        <e360-select-field
          label="Status"
          placeholder="All statuses"
          [multiple]="true"
          [options]="statusOptions"
          [(ngModel)]="statusFilter"
          (ngModelChange)="onFilterChange()"
        />
        <e360-select-field
          label="Job"
          placeholder="All jobs"
          [multiple]="true"
          [options]="jobOptions"
          [(ngModel)]="jobFilter"
          (ngModelChange)="onFilterChange()"
        />
      </div>

      <div class="card">
        <div class="e360-toolbar">
          <h2 style="margin:0">Pipeline ({{ total }})</h2>
        </div>
        <e360-data-table
          [columns]="tableCols"
          [rows]="tableRows"
          [page]="page"
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          [total]="total"
          [loading]="loading"
          [stickyHeader]="true"
          [rowClickable]="true"
          [selectedId]="selectedId"
          (pageChange)="goPage($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onTableFilterChange($event)"
          (rowClick)="onRowClick($event)"
          emptyMessage="No applications yet. Publish a job and share its careers page."
        >
          <ng-template #rowTemplate let-row>
            <td><strong>{{ row.name }}</strong></td>
            <td>{{ row.email }}</td>
            <td>{{ row.job }}</td>
            <td>
              <span class="badge" [class.ok]="row.status === 'HIRED' || row.status === 'OFFER_ACCEPTED'"
                    [class.err]="row.status === 'REJECTED'">{{ row.status }}</span>
            </td>
            <td>{{ row.applied }}</td>
            <td>
              <button class="secondary sm" (click)="selectByRow(row); $event.stopPropagation()">
                {{ selectedId === row.id ? 'Hide' : 'Open' }}
              </button>
            </td>
          </ng-template>
        </e360-data-table>
      </div>

      @if (selectedApp) {
        <div class="card">
          <div class="toolbar" style="margin-bottom:.25rem">
            <div>
              <strong>{{ selectedApp.candidate.firstName }} {{ selectedApp.candidate.lastName }}</strong>
              <span class="e360-muted"> · {{ selectedApp.candidate.email }} · {{ selectedApp.job.title }}</span>
            </div>
            <span class="badge" [class.ok]="selectedApp.status === 'HIRED' || selectedApp.status === 'OFFER_ACCEPTED'"
                  [class.err]="selectedApp.status === 'REJECTED'">{{ selectedApp.status }}</span>
          </div>

          @if (isHr) {
          <div class="row" style="align-items:flex-end">
            <div>
              <e360-select-field
                label="Move to status"
                [options]="statusOptions"
                [(ngModel)]="selectedApp._status"
                [clearable]="false"
              />
            </div>
            <div style="flex:0"><button class="secondary" (click)="setStatus(selectedApp)">Update</button></div>
          </div>
          }

          <h2>Interview rounds</h2>
          <e360-data-table
            [columns]="interviewCols"
            [rows]="interviewRows"
            [paginated]="false"
            [stickyHeader]="true"
          >
            <ng-template #rowTemplate let-row>
              <td>{{ row.level }}</td>
              <td>{{ row.name }}</td>
              <td>{{ row.scheduled }}</td>
              <td><span class="badge" [class.ok]="row.result==='PASSED'" [class.err]="row.result==='FAILED'">{{ row.result }}</span></td>
              <td>{{ row.recording }}</td>
              <td>{{ row.screenshot }}</td>
              <td>
                @if (row.result === 'PENDING') {
                  <button class="secondary" (click)="openResult(row._raw)">Record result</button>
                }
              </td>
            </ng-template>
          </e360-data-table>

          @if (resultRound && resultRound.applicationId === selectedApp.id) {
            <div class="e360-detail-panel">
              <h2 style="margin-top:0">Result — {{ resultRound.name }}</h2>
              <div class="row">
                <div><label>Rating (1–10)</label><input type="number" [(ngModel)]="res.rating" /></div>
                <div>
                  <e360-select-field
                    label="Result"
                    [options]="resultOptions"
                    [(ngModel)]="res.result"
                    [clearable]="false"
                  />
                </div>
                <div><label>Recording URL (Teams/Zoom link)</label><input [(ngModel)]="res.recordingUrl" /></div>
              </div>
              <label>Feedback</label>
              <textarea rows="2" [(ngModel)]="res.feedback"></textarea>
              <label>Screenshot (mandatory proof)</label>
              <input type="file" accept="image/*" (change)="screenshotFile = fileOf($event)" />
              <div style="margin-top:.5rem">
                <button (click)="saveResult()">Save result</button>
                <button class="secondary" (click)="resultRound = null">Cancel</button>
              </div>
            </div>
          }

          @if (isHr) {
          <div class="row" style="margin-top: .75rem; align-items:flex-end">
            <div><label>Next round name</label><input [(ngModel)]="selectedApp._roundName" placeholder="Technical" /></div>
            <div><label>Interview date/time</label><input type="datetime-local" [(ngModel)]="selectedApp._roundAt" /></div>
            <e360-select-field
              label="Mode"
              [options]="modeOptions"
              [(ngModel)]="selectedApp._roundMode"
              [clearable]="false"
            />
            <e360-select-field
              label="Interviewer"
              placeholder="choose…"
              [options]="interviewerOptions"
              [(ngModel)]="selectedApp._interviewerId"
            />
            <div style="flex:0"><button class="secondary" (click)="schedule(selectedApp)">Schedule round</button></div>
          </div>
          }

          @if (isHr && !selectedApp.offer && selectedApp.status === 'SELECTED') {
            <h2>Create offer</h2>
            <div class="row">
              <div><label>Designation</label><input [(ngModel)]="selectedApp._designation" /></div>
              <div><label>Annual CTC</label><input type="number" [(ngModel)]="selectedApp._ctc" /></div>
              <div><label>Joining date</label><input type="date" [(ngModel)]="selectedApp._join" /></div>
              <div><label>Location</label><input [(ngModel)]="selectedApp._loc" /></div>
            </div>
            <button (click)="makeOffer(selectedApp)">Create offer</button>
          }
          @if (selectedApp.offer) {
            <h2>Offer</h2>
            <p>
              {{ selectedApp.offer.designation }} · CTC {{ selectedApp.offer.annualCtc }} · joins {{ selectedApp.offer.joiningDate | date }}
              <span class="badge" [class.ok]="selectedApp.offer.status==='ACCEPTED'">{{ selectedApp.offer.status }}</span>
              @if (isHr && selectedApp.offer.status === 'DRAFT') {
                <button class="secondary" style="margin-left:.5rem" (click)="sendOffer(selectedApp)">Send offer</button>
              }
            </p>
          }
        </div>
      }
    </e360-module-shell>
  `,
  styles: [`
    .e360-detail-panel {
      background: var(--surface-2);
      border: 1px solid var(--e360-border-strong);
      border-radius: var(--e360-radius-md);
      padding: .75rem;
      margin-top: .5rem;
    }
  `],
})
export class ApplicationsComponent implements OnInit, OnChanges {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  @Input() status?: string;

  applications: any[] = [];
  jobs: any[] = [];
  selectedId: string | null = null;
  selectedApp: any = null;
  error = '';
  loading = false;
  page = 1;
  pageSize = 25;
  pageSizeOptions = [10, 25, 50];
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};

  get tableRows() {
    return this.applications.map((a) => ({
      id: a.id,
      name: `${a.candidate.firstName} ${a.candidate.lastName}`,
      email: a.candidate.email,
      job: a.job.title,
      status: a.status,
      applied: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—',
      _raw: a,
    }));
  }

  get interviewRows() {
    return (this.selectedApp?.interviews ?? []).map((r: any) => ({
      id: r.id,
      level: r.level,
      name: r.name,
      scheduled: r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : '—',
      result: r.result,
      recording: r.recordingUrl || r.recordingFileId ? '✔' : '—',
      screenshot: r.screenshotFileId ? '✔' : '—',
      _raw: r,
    }));
  }

  exportCols = [
    { key: 'candidate.firstName', label: 'First name' },
    { key: 'candidate.lastName', label: 'Last name' },
    { key: 'candidate.email', label: 'Email' },
    { key: 'job.title', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Applied on' },
  ];
  tableCols: TableColumn[] = [
    { key: 'name', label: 'Candidate' },
    { key: 'email', label: 'Email' },
    { key: 'job', label: 'Job' },
    { key: 'status', label: 'Status' },
    { key: 'applied', label: 'Applied' },
    { key: 'actions', label: '', sortable: false, filterable: false },
  ];
  interviewCols: TableColumn[] = [
    { key: 'level', label: 'Level' },
    { key: 'name', label: 'Name' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'result', label: 'Result', filterable: false },
    { key: 'recording', label: 'Recording' },
    { key: 'screenshot', label: 'Screenshot' },
    { key: 'actions', label: '', sortable: false, filterable: false },
  ];
  total = 0;
  totalPages = 1;
  statusFilter: string[] = [];
  jobFilter: string[] = [];
  statuses = ['APPLIED', 'SCREENING', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN'];
  resultOptions: SelectOption[] = ['FAILED', 'NO_SHOW', 'PASSED'].map((v) => ({ value: v, label: v.replace(/_/g, ' ') }));
  modeOptions: SelectOption[] = ['IN_PERSON', 'MEET', 'TEAMS', 'ZOOM'].map((v) => ({ value: v, label: v.replace(/_/g, ' ') }));
  resultRound: any = null;
  res: any = { result: 'PASSED' };
  screenshotFile: File | null = null;
  interviewers: any[] = [];

  get statusOptions(): SelectOption[] {
    return [...this.statuses].sort().map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));
  }
  get jobOptions(): SelectOption[] {
    return this.jobs.map((j) => ({ value: j.id, label: j.title }));
  }
  get interviewerOptions(): SelectOption[] {
    return this.interviewers.map((i) => ({
      value: i.id,
      label: `${i.firstName} ${i.lastName}`,
    }));
  }
  get isHr() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }
  get pageTo() { return Math.min(this.page * this.pageSize, this.total); }

  async ngOnInit() {
    this.statusFilter = this.status ? [this.status] : [];
    await Promise.all([this.loadJobs(), this.load()]);
    if (this.isHr) {
      try { this.interviewers = await this.api.get<any[]>('/interviewers'); } catch { /* optional */ }
    }
  }

  ngOnChanges() {
    this.statusFilter = this.status ? [this.status] : [];
    this.load();
  }

  onFilterChange() {
    this.page = 1;
    this.load();
  }

  onPageSizeChange(ps?: number) {
    if (ps) this.pageSize = ps;
    this.page = 1;
    this.load();
  }

  onSortChange(s: { key: string; dir: 'asc' | 'desc' }) {
    this.sort = s;
    this.page = 1;
    this.load();
  }

  onTableFilterChange(f: Record<string, string>) {
    this.columnFilters = f;
    this.page = 1;
    this.load();
  }

  onRowClick(row: Record<string, unknown>) {
    this.selectByRow(row);
  }

  selectByRow(row: Record<string, unknown>) {
    const app = row['_raw'] as any;
    if (app) this.selectApplication(app);
  }

  goPage(p: number) {
    this.page = Math.max(1, Math.min(p, this.totalPages));
    this.load();
  }

  async loadJobs() {
    try {
      const res = await this.api.get<any>('/jobs', { page: '1', pageSize: '200' });
      const { items } = unwrapPaginated(res);
      this.jobs = items;
    } catch { /* optional */ }
  }

  async load() {
    this.loading = true;
    try {
      const extra: QueryParams = {};
      if (this.statusFilter.length) extra.status = this.statusFilter;
      if (this.jobFilter.length) extra.jobIds = this.jobFilter;
      const params = tableListParams(this.page, this.pageSize, extra, this.sort, this.columnFilters);
      const res = await this.api.get<any>('/applications', params);
      const { items, meta } = unwrapPaginated(res);
      this.applications = items;
      this.total = meta?.total ?? items.length;
      this.totalPages = meta?.totalPages ?? 1;
      this.error = '';
      if (this.selectedId && !items.some((a: any) => a.id === this.selectedId)) {
        this.selectedId = null;
        this.selectedApp = null;
      }
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
  }

  async selectApplication(a: any) {
    if (this.selectedId === a.id) {
      this.selectedId = null;
      this.selectedApp = null;
      return;
    }
    this.selectedId = a.id;
    try {
      const full = await this.api.get<any>(`/applications/${a.id}`);
      full._status = full.status;
      full._roundMode = 'TEAMS';
      this.selectedApp = full;
    } catch (e) { this.error = errMsg(e); }
  }

  fileOf(ev: Event): File | null {
    return (ev.target as HTMLInputElement).files?.[0] ?? null;
  }

  async setStatus(a: any) {
    try {
      await this.api.patch(`/applications/${a.id}/status`, { status: a._status });
      await this.load();
      if (this.selectedId === a.id) await this.selectApplication({ id: a.id });
    } catch (e) { this.error = errMsg(e); }
  }

  async schedule(a: any) {
    try {
      const level = (a.interviews?.length ?? 0) + 1;
      await this.api.post(`/applications/${a.id}/interviews`, {
        level,
        name: a._roundName || `Round ${level}`,
        scheduledAt: a._roundAt ? new Date(a._roundAt).toISOString() : undefined,
        mode: a._roundMode,
        interviewerId: a._interviewerId,
      });
      await this.load();
      if (this.selectedId === a.id) await this.selectApplication({ id: a.id });
    } catch (e) { this.error = errMsg(e); }
  }

  openResult(round: any) {
    this.resultRound = round;
    this.res = { result: 'PASSED' };
    this.screenshotFile = null;
  }

  async saveResult() {
    try {
      let screenshotFileId: string | undefined;
      if (this.screenshotFile) {
        const form = new FormData();
        form.append('file', this.screenshotFile);
        const up = await fetch(`${environment.apiBase}/files`, {
          method: 'POST',
          body: form,
          headers: this.uploadHeaders(),
        }).then((r) => r.json());
        screenshotFileId = up.id;
      }
      await this.api.patch(`/interviews/${this.resultRound.id}/result`, {
        ...this.res,
        rating: this.res.rating ? Number(this.res.rating) : undefined,
        screenshotFileId,
      });
      this.resultRound = null;
      await this.load();
      if (this.selectedId) await this.selectApplication({ id: this.selectedId });
    } catch (e) { this.error = errMsg(e); }
  }

  private uploadHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    const t = localStorage.getItem('e360.token');
    const ten = localStorage.getItem('e360.tenant');
    if (t) h['Authorization'] = `Bearer ${t}`;
    if (ten) h['x-tenant-id'] = ten;
    return h;
  }

  async makeOffer(a: any) {
    try {
      await this.api.post(`/applications/${a.id}/offer`, {
        designation: a._designation,
        annualCtc: Number(a._ctc),
        salaryBreakup: { annualCtc: Number(a._ctc) },
        joiningDate: new Date(a._join).toISOString(),
        location: a._loc,
      });
      await this.load();
      if (this.selectedId === a.id) await this.selectApplication({ id: a.id });
    } catch (e) { this.error = errMsg(e); }
  }

  async sendOffer(a: any) {
    try {
      await this.api.post(`/offers/${a.offer.id}/send`);
      await this.load();
      if (this.selectedId === a.id) await this.selectApplication({ id: a.id });
    } catch (e) { this.error = errMsg(e); }
  }
}
