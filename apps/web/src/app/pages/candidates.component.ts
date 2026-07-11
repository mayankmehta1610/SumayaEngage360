import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';

// The talent pool: every candidate ever captured, their parse status,
// application history and best job matches.
@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Talent pool"
      description="Candidates, resume parsing, and job matching."
      icon="user-search"
      moduleKey="candidates"
      auditEntityType="CANDIDATE"
      rolesHint="TENANT_ADMIN, HR, INTERVIEWER"
      [breadcrumbs]="[{ label: 'Recruitment' }, { label: 'Talent pool' }]"
    >
      <div actions class="e360-toolbar" style="margin:0;gap:.4rem">
        <button class="secondary" (click)="parseNow()" [disabled]="busy">
          {{ busy ? 'Parsing…' : '⚙ Run offline resume parser now' }}
        </button>
        <export-bar [rows]="candidates" [cols]="exportCols" name="candidates" />
      </div>
@if (parseInfo) { <div class="card" style="border-color:#22c55e">{{ parseInfo }}</div> }
    @if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <table>
        <tr><th>Name</th><th>Email</th><th>Skills</th><th>Resume</th><th>Parsed</th><th>Applications</th><th>Matches</th><th>Added</th><th></th></tr>
        @for (c of candidates; track c.id) {
          <tr>
            <td>{{ c.firstName }} {{ c.lastName }}</td>
            <td>{{ c.email }}</td>
            <td>@for (s of c.skills; track s.skill.name) { <span class="badge" style="margin-right:.2rem">{{ s.skill.name }}</span> }</td>
            <td>{{ c.resumeFileId ? '📄' : '—' }}</td>
            <td>
              @if (c.parsedResume) { <span class="badge ok">{{ c.parsedResume.method === 'AI' ? 'AI parsed' : 'parsed' }}</span> }
              @else if (c.resumeFileId) { <span class="badge warn">pending</span> }
              @else { — }
            </td>
            <td>{{ c._count.applications }}</td>
            <td>{{ c._count.matches }}</td>
            <td>{{ c.createdAt | date }}</td>
            <td><button class="secondary" (click)="detailFor = detailFor === c.id ? null : c.id; loadDetail(c.id)">
              {{ detailFor === c.id ? 'Hide' : 'View' }}</button></td>
          </tr>
        } @empty { <tr><td colspan="9" class="muted">No candidates yet — they appear when people apply on the careers pages.</td></tr> }
      </table>
    </div>

    @if (detailFor && detail) {
      <div class="card">
        <h2 style="margin-top:0">{{ detail.firstName }} {{ detail.lastName }} — profile</h2>
        @if (detail.parsedResume) {
          <div class="row">
            <div><label>Parsed by</label><div>{{ detail.parsedResume.method }}</div></div>
            <div><label>Experience</label><div>{{ detail.parsedResume.totalYearsExperience ?? '—' }} years</div></div>
            <div><label>Phone</label><div>{{ detail.parsedResume.phone ?? detail.phone ?? '—' }}</div></div>
          </div>
          @if (detail.parsedResume.summary) { <p class="muted">{{ detail.parsedResume.summary }}</p> }
        }
        <h2>Application history</h2>
        <table>
          <tr><th>Role</th><th>Status</th><th>Source</th><th>Date</th></tr>
          @for (a of detail.applications; track a.id) {
            <tr><td>{{ a.job.title }}</td><td><span class="badge">{{ a.status }}</span></td>
                <td>{{ a.source ?? '—' }}</td><td>{{ a.createdAt | date }}</td></tr>
          }
        </table>
        <h2>Job match scores</h2>
        <table>
          <tr><th>Job</th><th>Rule %</th><th>AI %</th><th>Final %</th><th>Shortlisted</th></tr>
          @for (m of detail.matches; track m.id) {
            <tr><td>{{ m.job.title }}</td><td>{{ m.ruleScore ?? '—' }}</td><td>{{ m.aiScore ?? '—' }}</td>
                <td><strong>{{ m.finalScore }}</strong></td>
                <td>@if (m.shortlisted) { <span class="badge ok">yes</span> } @else { no }</td></tr>
          }
        </table>
      </div>
    }
  
    </e360-module-shell>
  `,
})
export class CandidatesComponent implements OnInit {
  private api = inject(ApiService);
  candidates: any[] = [];
  detail: any = null;
  detailFor: string | null = null;
  error = '';
  parseInfo = '';
  busy = false;
  exportCols = [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'email', label: 'Email' },
    { key: '_count.applications', label: 'Applications' },
    { key: '_count.matches', label: 'Matches' },
    { key: 'createdAt', label: 'Added' },
  ];

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.candidates = await this.api.get<any[]>('/candidates'); }
    catch (e) { this.error = errMsg(e); }
  }
  async loadDetail(id: string) {
    if (this.detailFor !== id) { this.detail = null; return; }
    try { this.detail = await this.api.get<any>(`/candidates/${id}`); }
    catch (e) { this.error = errMsg(e); }
  }
  async parseNow() {
    this.busy = true;
    this.parseInfo = '';
    try {
      const r = await this.api.post<any>('/matching/parse-pending');
      this.parseInfo = `Offline parser finished: ${r.parsed} of ${r.pending} pending resume(s) parsed. (Also runs automatically every 15 minutes.)`;
      await this.load();
    } catch (e) { this.error = errMsg(e); }
    finally { this.busy = false; }
  }
}
