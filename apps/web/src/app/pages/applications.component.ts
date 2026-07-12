import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { ExportBarComponent } from '../core/export-bar.component';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { TableColumn } from '../ui/data-table.component';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent, ModuleShellComponent],
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
        <div>
          <label>Status</label>
          <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()">
            <option value="">All statuses</option>
            @for (s of statuses; track s) { <option [ngValue]="s">{{ s }}</option> }
          </select>
        </div>
        <div>
          <label>Job</label>
          <select [(ngModel)]="jobFilter" (ngModelChange)="onFilterChange()">
            <option value="">All jobs</option>
            @for (j of jobs; track j.id) { <option [ngValue]="j.id">{{ j.title }}</option> }
          </select>
        </div>
      </div>

      <div class="card">
        <div class="e360-toolbar">
          <h2 style="margin:0">Pipeline ({{ total }})</h2>
        </div>
        @if (!loading && !applications.length) {
          <p class="e360-muted">No applications yet. Publish a job and share its careers page.</p>
        } @else {
          <div class="e360-table-wrap e360-table-sticky" style="max-height:min(70vh, 640px)">
            <table class="e360-table e360-table-zebra e360-table-clickable">
              <thead>
                <tr>
                  @for (col of tableCols; track col.key) { <th>{{ col.label }}</th> }
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (a of applications; track a.id) {
                  <tr
                    [class.e360-row-selected]="selectedId === a.id"
                    (click)="selectApplication(a)"
                  >
                    <td><strong>{{ a.candidate.firstName }} {{ a.candidate.lastName }}</strong></td>
                    <td>{{ a.candidate.email }}</td>
                    <td>{{ a.job.title }}</td>
                    <td>
                      <span class="badge" [class.ok]="a.status === 'HIRED' || a.status === 'OFFER_ACCEPTED'"
                            [class.err]="a.status === 'REJECTED'">{{ a.status }}</span>
                    </td>
                    <td>{{ a.createdAt | date: 'mediumDate' }}</td>
                    <td>
                      <button class="secondary sm" (click)="selectApplication(a); $event.stopPropagation()">
                        {{ selectedId === a.id ? 'Hide' : 'Open' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="e360-pagination">
            <span>{{ pageFrom }}–{{ pageTo }} of {{ total }}</span>
            <div class="pages">
              <label class="e360-muted" style="font-size:.75rem;margin-right:.35rem">Rows</label>
              <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                @for (ps of pageSizeOptions; track ps) { <option [ngValue]="ps">{{ ps }}</option> }
              </select>
              <button class="secondary sm" [disabled]="page <= 1" (click)="goPage(page - 1)">‹</button>
              <span>Page {{ page }} / {{ totalPages }}</span>
              <button class="secondary sm" [disabled]="page >= totalPages" (click)="goPage(page + 1)">›</button>
            </div>
          </div>
        }
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
              <label>Move to status</label>
              <select [(ngModel)]="selectedApp._status">
                @for (s of statuses; track s) { <option [ngValue]="s">{{ s }}</option> }
              </select>
            </div>
            <div style="flex:0"><button class="secondary" (click)="setStatus(selectedApp)">Update</button></div>
          </div>
          }

          <h2>Interview rounds</h2>
          <table>
            <tr><th>Level</th><th>Name</th><th>Scheduled</th><th>Result</th><th>Recording</th><th>Screenshot</th><th></th></tr>
            @for (r of selectedApp.interviews; track r.id) {
              <tr>
                <td>{{ r.level }}</td><td>{{ r.name }}</td>
                <td>{{ r.scheduledAt | date: 'short' }}</td>
                <td><span class="badge" [class.ok]="r.result==='PASSED'" [class.err]="r.result==='FAILED'">{{ r.result }}</span></td>
                <td>{{ r.recordingUrl || r.recordingFileId ? '✔' : '—' }}</td>
                <td>{{ r.screenshotFileId ? '✔' : '—' }}</td>
                <td>
                  @if (r.result === 'PENDING') {
                    <button class="secondary" (click)="openResult(r)">Record result</button>
                  }
                </td>
              </tr>
            }
          </table>

          @if (resultRound && resultRound.applicationId === selectedApp.id) {
            <div class="e360-detail-panel">
              <h2 style="margin-top:0">Result — {{ resultRound.name }}</h2>
              <div class="row">
                <div><label>Rating (1–10)</label><input type="number" [(ngModel)]="res.rating" /></div>
                <div>
                  <label>Result</label>
                  <select [(ngModel)]="res.result">
                    <option>PASSED</option><option>FAILED</option><option>NO_SHOW</option>
                  </select>
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
            <div><label>Mode</label>
              <select [(ngModel)]="selectedApp._roundMode"><option>TEAMS</option><option>ZOOM</option><option>MEET</option><option>IN_PERSON</option></select>
            </div>
            <div><label>Interviewer</label>
              <select [(ngModel)]="selectedApp._interviewerId">
                <option [ngValue]="undefined">choose…</option>
                @for (i of interviewers; track i.id) {
                  <option [ngValue]="i.id">{{ i.firstName }} {{ i.lastName }}</option>
                }
              </select>
            </div>
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
  total = 0;
  totalPages = 1;
  statusFilter = '';
  jobFilter = '';

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
  ];
  statuses = ['APPLIED', 'SCREENING', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN'];
  resultRound: any = null;
  res: any = { result: 'PASSED' };
  screenshotFile: File | null = null;
  interviewers: any[] = [];

  get isHr() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }
  get pageFrom() { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageTo() { return Math.min(this.page * this.pageSize, this.total); }

  async ngOnInit() {
    this.statusFilter = this.status ?? '';
    await Promise.all([this.loadJobs(), this.load()]);
    if (this.isHr) {
      try { this.interviewers = await this.api.get<any[]>('/interviewers'); } catch { /* optional */ }
    }
  }

  ngOnChanges() {
    this.statusFilter = this.status ?? '';
    this.load();
  }

  onFilterChange() {
    this.page = 1;
    this.load();
  }

  onPageSizeChange() {
    this.page = 1;
    this.load();
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
      const params: Record<string, string> = {
        page: String(this.page),
        pageSize: String(this.pageSize),
      };
      if (this.statusFilter) params.status = this.statusFilter;
      if (this.jobFilter) params.jobId = this.jobFilter;
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
