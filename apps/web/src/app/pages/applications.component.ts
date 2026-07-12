import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
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
  imports: [FormsModule, DatePipe, JsonPipe, ExportBarComponent, ModuleShellComponent, DataTableComponent, SelectFieldComponent],
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

          <div class="e360-tabs" style="display:flex;gap:.35rem;flex-wrap:wrap;margin:.5rem 0">
            @for (tab of profileTabs; track tab.key) {
              <button type="button" class="secondary sm"
                      [class.ok]="profileTab === tab.key"
                      (click)="profileTab = tab.key">{{ tab.label }}</button>
            }
          </div>

          @if (profileTab === 'personal') {
            <div class="e360-detail-panel">
              <div class="row">
                <div><label>First name</label><input [value]="selectedApp.candidate.firstName" readonly /></div>
                <div><label>Last name</label><input [value]="selectedApp.candidate.lastName" readonly /></div>
                <div><label>Email</label><input [value]="selectedApp.candidate.email" readonly /></div>
                <div><label>Phone</label><input [value]="selectedApp.candidate.phone ?? '—'" readonly /></div>
              </div>
              @if (selectedApp.candidate.demographics) {
                <pre style="font-size:.8rem;margin-top:.5rem">{{ selectedApp.candidate.demographics | json }}</pre>
              }
            </div>
          }

          @if (profileTab === 'professional') {
            <div class="e360-detail-panel">
              <label>Professional summary</label>
              <textarea rows="4" [(ngModel)]="profile.professionalSummary"></textarea>
              <label>Domain expertise (comma-separated)</label>
              <input [(ngModel)]="domainExpertiseText" />
              @if (isHr) {
                <button style="margin-top:.5rem" (click)="saveProfile()">Save profile</button>
              }
            </div>
          }

          @if (profileTab === 'skills') {
            <div class="e360-detail-panel">
              <ul>
                @for (s of selectedApp.candidate.skills ?? []; track s.skillId) {
                  <li>{{ s.skill?.name }} @if (s.yearsOfExp) { ({{ s.yearsOfExp }} yrs) }</li>
                } @empty { <li class="e360-muted">No skills tagged.</li> }
              </ul>
            </div>
          }

          @if (profileTab === 'experience') {
            <div class="e360-detail-panel">
              @for (e of selectedApp.candidate.experiences ?? []; track e.id) {
                <div style="margin-bottom:.5rem">
                  <strong>{{ e.title }}</strong> at {{ e.company }}
                  <span class="e360-muted"> · {{ e.startDate | date }} – {{ e.endDate ? (e.endDate | date) : 'Present' }}</span>
                  @if (e.description) { <p style="margin:.25rem 0 0">{{ e.description }}</p> }
                </div>
              } @empty { <p class="e360-muted">No experience recorded.</p> }
            </div>
          }

          @if (profileTab === 'education') {
            <div class="e360-detail-panel">
              <label>Education (JSON array)</label>
              <textarea rows="5" [(ngModel)]="educationJson"></textarea>
              @if (isHr) { <button style="margin-top:.5rem" (click)="saveProfile()">Save education</button> }
            </div>
          }

          @if (profileTab === 'documents') {
            <div class="e360-detail-panel">
              <label>Resume</label>
              @if (selectedApp.candidate.resumeFileId) {
                <p class="e360-muted">Uploaded ({{ selectedApp.candidate.resumeFileId }})</p>
              } @else {
                <p class="e360-muted">No resume on file.</p>
              }
              @if (isHr) {
                <input type="file" accept=".pdf,.doc,.docx" (change)="resumeFile = fileOf($event)" />
                @if (resumeFile) {
                  <button style="margin-top:.35rem" (click)="uploadResume()">Upload resume</button>
                }
              }
              <label style="margin-top:.75rem;display:block">Cover letter</label>
              @if (profile.coverLetterFileId) {
                <p class="e360-muted">Uploaded ({{ profile.coverLetterFileId }})</p>
              }
              @if (isHr) {
                <input type="file" accept=".pdf,.doc,.docx" (change)="coverLetterFile = fileOf($event)" />
                @if (coverLetterFile) {
                  <button style="margin-top:.35rem" (click)="uploadCoverLetter()">Upload cover letter</button>
                }
              }
            </div>
          }

          @if (profileTab === 'agency') {
            <div class="e360-detail-panel">
              <h3 style="margin-top:0">Client submissions</h3>
              @if (isHr) {
                <div class="row" style="align-items:flex-end;margin-bottom:.75rem">
                  <div><label>Client name</label><input [(ngModel)]="submissionForm.clientName" /></div>
                  <e360-select-field
                    label="Client tenant"
                    placeholder="Link platform tenant (optional)"
                    [options]="clientTenantOptions"
                    [(ngModel)]="submissionForm.clientTenantId"
                  />
                  <div style="flex:0"><button (click)="createSubmission()">Create draft</button></div>
                </div>
              }
              <e360-data-table [columns]="submissionCols" [rows]="submissionRows" [paginated]="false" [stickyHeader]="true" />
            </div>
          }

          @if (profileTab === 'contacts') {
            <div class="e360-detail-panel">
              <label>Contacts (JSON array)</label>
              <textarea rows="4" [(ngModel)]="contactsJson"></textarea>
              @if (isHr) { <button style="margin-top:.5rem" (click)="saveProfile()">Save contacts</button> }
            </div>
          }

          @if (profileTab === 'custom') {
            <div class="e360-detail-panel">
              @for (fd of fieldDefs; track fd.id) {
                <label>{{ fd.label }}@if (fd.required) { * }</label>
                <input [(ngModel)]="customFields[fd.fieldKey]" />
              } @empty {
                <p class="e360-muted">No custom fields configured. Add definitions in tenant settings.</p>
              }
              @if (isHr && fieldDefs.length) {
                <button style="margin-top:.5rem" (click)="saveProfile()">Save custom fields</button>
              }
            </div>
          }

          @if (profileTab === 'pipeline') {
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
  profileTab = 'personal';
  profile: any = {};
  fieldDefs: any[] = [];
  customFields: Record<string, string> = {};
  domainExpertiseText = '';
  educationJson = '[]';
  contactsJson = '[]';
  profileTabs = [
    { key: 'personal', label: 'Personal' },
    { key: 'professional', label: 'Professional' },
    { key: 'skills', label: 'Skills' },
    { key: 'experience', label: 'Experience' },
    { key: 'education', label: 'Education' },
    { key: 'documents', label: 'Documents' },
    { key: 'agency', label: 'Agency submissions' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'custom', label: 'Custom fields' },
    { key: 'pipeline', label: 'Pipeline & offers' },
  ];
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
  resumeFile: File | null = null;
  coverLetterFile: File | null = null;
  interviewers: any[] = [];
  agencySubmissions: any[] = [];
  clientTenants: any[] = [];
  submissionForm: any = {};
  submissionCols: TableColumn[] = [
    { key: 'client', label: 'Client' },
    { key: 'status', label: 'Status' },
    { key: 'submitted', label: 'Submitted' },
  ];

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
  get clientTenantOptions(): SelectOption[] {
    return this.clientTenants.map((t) => ({
      value: t.id,
      label: `${t.name} (${t.subdomain})`,
    }));
  }
  get submissionRows() {
    return this.agencySubmissions.map((s) => ({
      client: s.clientName ?? s.clientTenant?.name ?? s.clientTenantId ?? '—',
      status: s.status,
      submitted: s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '—',
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
    this.profileTab = 'personal';
    try {
      const full = await this.api.get<any>(`/applications/${a.id}`);
      full._status = full.status;
      full._roundMode = 'TEAMS';
      this.selectedApp = full;
      await Promise.all([this.loadProfile(a.id), this.loadFieldDefs(), this.loadAgencySubmissions(a)]);
      try {
        this.clientTenants = await this.api.get<any[]>('/agency/client-tenants');
      } catch { this.clientTenants = []; }
    } catch (e) { this.error = errMsg(e); }
  }

  async loadProfile(applicationId: string) {
    try {
      const p = await this.api.get<any>(`/applications/${applicationId}/profile`);
      this.profile = p;
      this.domainExpertiseText = (p.domainExpertise ?? []).join(', ');
      this.educationJson = JSON.stringify(p.education ?? [], null, 2);
      this.contactsJson = JSON.stringify(p.contacts ?? [], null, 2);
      this.customFields = { ...(p.customFields ?? {}) };
    } catch { /* optional */ }
  }

  async loadFieldDefs() {
    try {
      this.fieldDefs = await this.api.get<any[]>('/tenant-field-definitions/entity/APPLICATION');
    } catch {
      try {
        this.fieldDefs = await this.api.get<any[]>('/tenant-field-definitions');
      } catch { this.fieldDefs = []; }
    }
  }

  async loadAgencySubmissions(a: any) {
    try {
      const res = await this.api.get<any>('/agency/submissions', {
        candidateId: a.candidate?.id ?? a.candidateId,
        page: '1',
        pageSize: '50',
      });
      this.agencySubmissions = unwrapPaginated(res).items;
    } catch {
      this.agencySubmissions = [];
    }
  }

  async createSubmission() {
    if (!this.selectedApp) return;
    try {
      await this.api.post('/agency/submissions', {
        candidateId: this.selectedApp.candidate.id,
        clientName: this.submissionForm.clientName,
        clientTenantId: this.submissionForm.clientTenantId || undefined,
        jobId: this.selectedApp.job?.id,
      });
      this.submissionForm = {};
      await this.loadAgencySubmissions(this.selectedApp);
    } catch (e) { this.error = errMsg(e); }
  }

  async uploadResume() {
    if (!this.resumeFile || !this.selectedApp) return;
    try {
      const fileId = await this.uploadFile(this.resumeFile);
      await this.api.patch(`/candidates/${this.selectedApp.candidate.id}`, { resumeFileId: fileId });
      this.selectedApp.candidate.resumeFileId = fileId;
      this.resumeFile = null;
    } catch (e) { this.error = errMsg(e); }
  }

  async uploadCoverLetter() {
    if (!this.coverLetterFile || !this.selectedId) return;
    try {
      const fileId = await this.uploadFile(this.coverLetterFile);
      this.profile.coverLetterFileId = fileId;
      await this.api.post(`/applications/${this.selectedId}/profile`, {
        coverLetterFileId: fileId,
      });
      this.coverLetterFile = null;
    } catch (e) { this.error = errMsg(e); }
  }

  private async uploadFile(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const up = await fetch(`${environment.apiBase}/files`, {
      method: 'POST',
      body: form,
      headers: this.uploadHeaders(),
    }).then((r) => r.json());
    return up.id;
  }

  async saveProfile() {
    if (!this.selectedId) return;
    try {
      let education: unknown[] = [];
      let contacts: unknown[] = [];
      try { education = JSON.parse(this.educationJson); } catch { /* keep */ }
      try { contacts = JSON.parse(this.contactsJson); } catch { /* keep */ }
      await this.api.post(`/applications/${this.selectedId}/profile`, {
        professionalSummary: this.profile.professionalSummary,
        domainExpertise: this.domainExpertiseText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        education,
        coverLetterFileId: this.profile.coverLetterFileId,
        contacts,
        customFields: this.customFields,
      });
      await this.loadProfile(this.selectedId);
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
