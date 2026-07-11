import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Surveys & eNPS"
      description="Pulse, engagement and eNPS surveys with anonymous responses and live analytics."
      icon="bar-chart-3"
      moduleKey="surveys"
      auditEntityType="SURVEY"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Performance' }, { label: 'Surveys' }]"
    >
    @if (error) { <div class="e360-error">{{ error }}</div> }

    <!-- ══ Answer open surveys (everyone) ══ -->
    <div class="card">
      <h2 style="margin-top:0">📮 Open surveys for you</h2>
      @for (s of open; track s.id) {
        <div style="border:1px solid #e3e8f0;border-radius:10px;padding: .8rem 1rem;margin-bottom:.6rem">
          <strong>{{ s.title }}</strong> <span class="badge">{{ s.type }}</span>
          @if (s.anonymous) { <span class="badge warn">anonymous</span> }
          @if (s.alreadyAnswered) { <span class="badge ok">answered ✓</span> }
          @else {
            @for (q of s.questions; track q.q) {
              <label>{{ q.q }}</label>
              @if (q.kind === 'SCALE') {
                <select [(ngModel)]="draft[s.id + q.q]" style="max-width:120px">
                  <option [ngValue]="undefined">score…</option>
                  @for (n of scale; track n) { <option [ngValue]="n">{{ n }}</option> }
                </select>
              } @else {
                <textarea rows="2" [(ngModel)]="draft[s.id + q.q]"></textarea>
              }
            }
            <button style="margin-top:.4rem" (click)="respond(s)">Submit response</button>
          }
        </div>
      } @empty { <p class="muted">No open surveys right now.</p> }
    </div>

    <!-- ══ HR: build + manage + analytics ══ -->
    @if (isHr) {
      <div class="card">
        <h2 style="margin-top:0">Create survey</h2>
        <div class="row">
          <div><label>Title</label><input [(ngModel)]="f.title" placeholder="Q3 Engagement Pulse" /></div>
          <div><label>Type</label>
            <select [(ngModel)]="f.type"><option>PULSE</option><option>ENGAGEMENT</option><option>ENPS</option></select>
          </div>
          <div><label>Closes on</label><input type="date" [(ngModel)]="f.closesAt" /></div>
        </div>
        <label><input type="checkbox" [(ngModel)]="f.anonymous" style="width:auto;margin-right:.4rem" />Anonymous responses</label>
        @if (f.type === 'ENPS') { <p class="muted">The standard eNPS 0–10 question is added automatically.</p> }
        @for (q of qs; track $index; let i = $index) {
          <div style="display:flex;gap:.5rem;margin:.3rem 0">
            <input [(ngModel)]="q.q" placeholder="Question text" />
            <select [(ngModel)]="q.kind" style="max-width:120px;margin:0"><option>SCALE</option><option>TEXT</option></select>
            <button class="danger" (click)="qs.splice(i, 1)">✕</button>
          </div>
        }
        <button class="secondary" (click)="qs.push({ q: '', kind: 'SCALE' })">+ Add question</button>
        <button style="margin-left:.5rem" (click)="create()" [disabled]="!f.title">Create</button>
      </div>

      @for (s of all; track s.id) {
        <div class="card">
          <div class="toolbar" style="margin-bottom:.3rem">
            <strong>{{ s.title }} <span class="badge">{{ s.type }}</span>
              <span class="badge" [class.ok]="s.status==='OPEN'">{{ s.status }}</span>
              <span class="muted">{{ s._count.responses }} response(s)</span></strong>
            <span style="display:inline-flex;gap:.4rem">
              @if (s.status !== 'OPEN') { <button class="secondary" (click)="setStatus(s.id, 'open')">Open</button> }
              @if (s.status === 'OPEN') { <button class="secondary" (click)="setStatus(s.id, 'close')">Close</button> }
              <button class="secondary" (click)="showAnalytics(s.id)">Analytics</button>
            </span>
          </div>
          @if (analytics?.survey?.id === s.id) {
            <table>
              <tr><th>Question</th><th>Responses</th><th>Average</th><th>eNPS</th></tr>
              @for (q of analytics.perQuestion; track q.q) {
                <tr>
                  <td>{{ q.q }}</td><td>{{ q.count }}</td>
                  <td>{{ q.average ?? '—' }}</td>
                  <td>@if (q.enps !== null && q.enps !== undefined) { <strong>{{ q.enps }}</strong> } @else { — }</td>
                </tr>
              }
            </table>
          }
        </div>
      }
    }
    </e360-module-shell>
  `,
})
export class SurveysComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  error = '';
  open: any[] = [];
  all: any[] = [];
  analytics: any = null;
  draft: Record<string, unknown> = {};
  scale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  f: any = { type: 'PULSE', anonymous: true };
  qs: { q: string; kind: string }[] = [{ q: '', kind: 'SCALE' }];

  get isHr() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.open = await this.api.get<any[]>('/surveys/open/mine'); } catch { this.open = []; }
    if (this.isHr) { try { this.all = await this.api.get<any[]>('/surveys'); } catch {} }
  }
  async create() {
    try {
      await this.api.post('/surveys', {
        title: this.f.title, type: this.f.type, anonymous: !!this.f.anonymous,
        questions: this.qs.filter((q) => q.q.trim()),
        closesAt: this.f.closesAt ? new Date(this.f.closesAt).toISOString() : undefined,
      });
      this.f = { type: 'PULSE', anonymous: true };
      this.qs = [{ q: '', kind: 'SCALE' }];
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async setStatus(id: string, action: string) {
    try { await this.api.post(`/surveys/${id}/${action}`); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async respond(s: any) {
    try {
      const answers = s.questions
        .map((q: any) => ({ q: q.q, value: this.draft[s.id + q.q] }))
        .filter((a: any) => a.value !== undefined && a.value !== '');
      await this.api.post(`/surveys/${s.id}/respond`, { answers });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async showAnalytics(id: string) {
    try { this.analytics = await this.api.get<any>(`/surveys/${id}/analytics`); }
    catch (e) { this.error = errMsg(e); }
  }
}
