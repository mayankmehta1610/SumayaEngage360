import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent],
  template: `
    <div class="toolbar"><h1>Jobs</h1>
      <export-bar [rows]="jobs" [cols]="exportCols" name="jobs" />
    </div>
    <div class="card">
      <h2>Create job</h2>
      <div class="row">
        <div><label>Title</label><input [(ngModel)]="f.title" /></div>
        <div>
          <label>Hiring client</label>
          <select [(ngModel)]="f.hiringClientId">
            <option [ngValue]="undefined">— none —</option>
            @for (c of clients; track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
          </select>
        </div>
        <div><label>Location</label><input [(ngModel)]="f.location" /></div>
        <div><label>Vacancies</label><input type="number" [(ngModel)]="f.vacancies" /></div>
      </div>
      <label>Job description (JD)</label>
      <textarea rows="4" [(ngModel)]="f.description"></textarea>
      <label>Skills (comma separated)</label>
      <input [(ngModel)]="skills" placeholder="Angular, NestJS, SQL" />
      <label>Interview rounds (comma separated, in order)</label>
      <input [(ngModel)]="rounds" placeholder="Screening, Technical, Managerial, HR" />
      @if (error) { <div class="error">{{ error }}</div> }
      <button (click)="create()">Create job</button>
    </div>
    <div class="card">
      <table>
        <tr><th>Title</th><th>Client</th><th>Location</th><th>Vacancies</th><th>Applications</th><th>Status</th><th></th></tr>
        @for (j of jobs; track j.id) {
          <tr>
            <td>{{ j.title }}</td>
            <td>{{ j.hiringClient?.name ?? '—' }}</td>
            <td>{{ j.location }}</td>
            <td>{{ j.vacancies }}</td>
            <td>{{ j._count?.applications ?? 0 }}</td>
            <td><span class="badge" [class.ok]="j.status === 'PUBLISHED'">{{ j.status }}</span></td>
            <td style="white-space:nowrap">
              @if (j.status === 'DRAFT') {
                <button (click)="publish(j.id)">Publish</button>
              }
              <button class="secondary" (click)="toggleMatches(j)">
                {{ matchesFor === j.id ? 'Hide matches' : 'Matches' }}
              </button>
            </td>
          </tr>
        }
      </table>
    </div>

    @if (matchesFor) {
      <div class="card">
        <div class="toolbar">
          <h2 style="margin:0">Talent-pool matches</h2>
          <span style="display:inline-flex;gap:.4rem">
            <button class="secondary" (click)="runMatch(false)" [disabled]="matching">Run rule-based match</button>
            <button class="secondary" (click)="runMatch(true)" [disabled]="matching">Run AI match</button>
            <export-bar [rows]="matches" [cols]="matchCols" name="job-matches" />
          </span>
        </div>
        @if (matching) { <p class="muted">Scoring candidates…</p> }
        <table>
          <tr><th>Candidate</th><th>Email</th><th>Rule %</th><th>AI %</th><th>Final %</th><th>Matched skills</th><th>Status</th></tr>
          @for (m of matches; track m.id) {
            <tr>
              <td>{{ m.candidate.firstName }} {{ m.candidate.lastName }}</td>
              <td>{{ m.candidate.email }}</td>
              <td>{{ m.ruleScore ?? '—' }}</td>
              <td>{{ m.aiScore ?? '—' }}</td>
              <td><strong>{{ m.finalScore }}</strong></td>
              <td class="muted">{{ (m.breakdown?.rule?.matchedSkills ?? []).join(', ') }}</td>
              <td>
                @if (m.shortlisted) { <span class="badge ok">shortlisted</span> }
                @else { <span class="badge">scored</span> }
              </td>
            </tr>
          } @empty { <tr><td colspan="7" class="muted">No scores yet — run a match.</td></tr> }
        </table>
        <p class="muted">Shortlisting moves matching applicants to SCREENING and pulls past candidates
          from the talent pool into this job automatically (source: TALENT_POOL).</p>
      </div>
    }
  `,
})
export class JobsComponent implements OnInit, OnChanges {
  private api = inject(ApiService);
  @Input() status?: string;
  jobs: any[] = [];
  clients: any[] = [];
  error = '';
  exportCols = [
    { key: 'title', label: 'Title' },
    { key: 'hiringClient.name', label: 'Client' },
    { key: 'location', label: 'Location' },
    { key: 'vacancies', label: 'Vacancies' },
    { key: '_count.applications', label: 'Applications' },
    { key: 'status', label: 'Status' },
  ];
  f: any = { vacancies: 1 };
  skills = '';
  rounds = '';
  matchesFor: string | null = null;
  matches: any[] = [];
  matching = false;
  matchCols = [
    { key: 'candidate.firstName', label: 'First name' },
    { key: 'candidate.lastName', label: 'Last name' },
    { key: 'candidate.email', label: 'Email' },
    { key: 'ruleScore', label: 'Rule %' },
    { key: 'aiScore', label: 'AI %' },
    { key: 'finalScore', label: 'Final %' },
    { key: 'shortlisted', label: 'Shortlisted' },
  ];

  async ngOnInit() {
    await this.load();
    try {
      this.clients = await this.api.get<any[]>('/hiring-clients');
    } catch { /* role may not allow; job creation still works without */ }
  }
  ngOnChanges() { this.load(); }
  async load() {
    try {
      this.jobs = await this.api.get<any[]>(
        this.status ? `/jobs?status=${this.status}` : '/jobs',
      );
    } catch (e) {
      this.error = errMsg(e);
    }
  }
  async create() {
    this.error = '';
    try {
      const body = {
        ...this.f,
        skills: this.skills.split(',').map((s) => s.trim()).filter(Boolean),
        interviewPlan: this.rounds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name, i) => ({ level: i + 1, name })),
      };
      await this.api.post('/jobs', body);
      this.f = { vacancies: 1 };
      this.skills = this.rounds = '';
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
  async publish(id: string) {
    try {
      await this.api.post(`/jobs/${id}/publish`);
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  async toggleMatches(j: any) {
    if (this.matchesFor === j.id) { this.matchesFor = null; return; }
    this.matchesFor = j.id;
    await this.loadMatches();
  }
  async loadMatches() {
    if (!this.matchesFor) return;
    try { this.matches = await this.api.get<any[]>(`/jobs/${this.matchesFor}/matches`); }
    catch (e) { this.error = errMsg(e); }
  }
  async runMatch(useAi: boolean) {
    if (!this.matchesFor) return;
    this.matching = true;
    try {
      await this.api.post(`/jobs/${this.matchesFor}/match`, { useAi });
      await this.loadMatches();
    } catch (e) { this.error = errMsg(e); }
    finally { this.matching = false; }
  }
}
