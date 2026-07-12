import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { AuthService } from '../core/auth.service';

// Business dashboard: every KPI aggregated live by /dashboard/kpis and
// clickable — each tile navigates to the underlying, filtered data.
@Component({
  standalone: true,
  imports: [RouterLink, ModuleShellComponent],
  styles: [`
    .kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: .75rem; }
    .kpi {
      background: var(--e360-surface); border: 1px solid var(--e360-border); border-radius: 12px;
      padding: .9rem 1rem; cursor: pointer; transition: box-shadow .15s, transform .15s;
    }
    .kpi:hover { box-shadow: var(--e360-shadow-md); transform: translateY(-1px); }
    .kpi .n { font-size: 1.7rem; font-weight: 700; color: var(--e360-text); }
    .kpi .l { color: var(--e360-text-muted); font-size: .78rem; margin-top: .15rem; }
    .kpi.warn .n { color: var(--e360-warning); }
    .kpi.good .n { color: var(--e360-success); }
    .bar { display: flex; align-items: center; gap: .5rem; margin: .3rem 0; }
    .bar .lbl { width: 130px; font-size: .78rem; color: var(--e360-text-secondary); text-align: right; }
    .bar .track { flex: 1; background: var(--surface-3); border-radius: 6px; height: 18px; position: relative; cursor: pointer; }
    .bar .fill { background: var(--e360-primary); height: 100%; border-radius: 6px; min-width: 2px; }
    .bar .val { font-size: .75rem; font-weight: 600; margin-left: .4rem; }
    h2 { margin: 1.4rem 0 .6rem; }
  `],
  template: `
    <e360-module-shell
      title="Dashboard"
      description="All figures live from the database · click any KPI to open the data"
      icon="layout-dashboard"
      moduleKey="dashboard"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE, INTERVIEWER, DEPARTMENT_HEAD"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Dashboard' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }

    @if (k?.business; as b) {
      <h2>Recruitment</h2>
      <div class="kpis">
        <div class="kpi" (click)="go('/jobs', { status: 'PUBLISHED' })"><div class="n">{{ b.jobsPublished }}</div><div class="l">Open jobs (published)</div></div>
        <div class="kpi" (click)="go('/jobs', { status: 'DRAFT' })"><div class="n">{{ b.jobsDraft }}</div><div class="l">Draft jobs</div></div>
        <div class="kpi" (click)="go('/applications')"><div class="n">{{ b.applicationsTotal }}</div><div class="l">Total applications</div></div>
        <div class="kpi" (click)="go('/candidates')"><div class="n">{{ b.candidates }}</div><div class="l">Talent pool (candidates)</div></div>
        <div class="kpi good" (click)="go('/jobs')"><div class="n">{{ b.shortlisted }}</div><div class="l">Auto-shortlisted matches</div></div>
        <div class="kpi warn" (click)="go('/candidates')"><div class="n">{{ b.unparsedResumes }}</div><div class="l">Resumes awaiting parse</div></div>
      </div>

      <div class="row" style="margin-top:1rem">
        <div class="card">
          <h2 style="margin-top:0">Applications by stage</h2>
          @for (s of b.applicationsByStatus; track s.status) {
            <div class="bar" (click)="go('/applications', { status: s.status })">
              <span class="lbl">{{ s.status }}</span>
              <div class="track"><div class="fill" [style.width.%]="pct(s.count, b.applicationsTotal)"></div></div>
              <span class="val">{{ s.count }}</span>
            </div>
          }
        </div>
        <div class="card">
          <h2 style="margin-top:0">Applications by job</h2>
          @for (s of b.applicationsByJob; track s.job) {
            <div class="bar" (click)="go('/applications')">
              <span class="lbl" [title]="s.job">{{ s.job.length > 18 ? s.job.slice(0,18) + '…' : s.job }}</span>
              <div class="track"><div class="fill" [style.width.%]="pct(s.count, b.applicationsTotal)"></div></div>
              <span class="val">{{ s.count }}</span>
            </div>
          }
        </div>
      </div>

      <h2>Workforce & operations</h2>
      <div class="kpis">
        <div class="kpi" (click)="go('/employees')"><div class="n">{{ b.employeesTotal }}</div><div class="l">Employees (all)</div></div>
        @for (e of b.employeesByStatus; track e.status) {
          <div class="kpi" [class.warn]="e.status==='ON_NOTICE'" (click)="go('/employees', { status: e.status })">
            <div class="n">{{ e.count }}</div><div class="l">{{ e.status }}</div>
          </div>
        }
        <div class="kpi warn" (click)="go('/onboarding')"><div class="n">{{ b.onboardingOpen }}</div><div class="l">Onboarding in progress</div></div>
        <div class="kpi warn" (click)="go('/timesheets')"><div class="n">{{ b.timesheetsSubmitted }}</div><div class="l">Timesheets awaiting approval</div></div>
        <div class="kpi warn" (click)="go('/approvals')"><div class="n">{{ b.approvalsPending }}</div><div class="l">Approvals pending (all)</div></div>
        <div class="kpi warn" (click)="go('/exit')"><div class="n">{{ b.exitsInFlight }}</div><div class="l">Exits in progress</div></div>
        <div class="kpi" (click)="go('/projects')"><div class="n">{{ b.projectsActive }}</div><div class="l">Active projects</div></div>
        <div class="kpi" (click)="go('/recognition')"><div class="n">{{ b.recognitions30d }}</div><div class="l">Recognitions (30 days)</div></div>
      </div>
    }

    @if (k?.personal; as p) {
      <h2>My work</h2>
      <div class="kpis">
        <div class="kpi" (click)="go('/timesheets')"><div class="n">{{ p.timesheetDrafts }}</div><div class="l">My draft timesheets</div></div>
        <div class="kpi" (click)="go('/timesheets')"><div class="n">{{ p.timesheetsAwaitingApproval }}</div><div class="l">My timesheets awaiting approval</div></div>
        <div class="kpi warn" (click)="go('/trainings')"><div class="n">{{ p.trainingsToComplete }}</div><div class="l">Trainings to complete</div></div>
        <div class="kpi warn" (click)="go('/appraisals')"><div class="n">{{ p.appraisalsAwaitingSelfReview }}</div><div class="l">Self-reviews due</div></div>
        <div class="kpi good" (click)="go('/recognition')"><div class="n">{{ p.recognitionsReceived }}</div><div class="l">Recognitions received</div></div>
        @if (k.myApprovals > 0) {
          <div class="kpi warn" (click)="go('/approvals')"><div class="n">{{ k.myApprovals }}</div><div class="l">Waiting for MY approval</div></div>
        }
      </div>
      @if (p.resignationStatus) {
        <p class="e360-muted">Your resignation status: <span class="badge warn">{{ p.resignationStatus }}</span>
          — <a routerLink="/exit">view progress</a></p>
      }
    }
  
    </e360-module-shell>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  auth = inject(AuthService);
  k: any = null;
  error = '';

  async ngOnInit() {
    try { this.k = await this.api.get<any>('/dashboard/kpis'); }
    catch (e) { this.error = errMsg(e); }
  }
  pct(n: number, total: number) { return total ? Math.max(2, (n / total) * 100) : 0; }
  go(path: string, queryParams?: Record<string, string>) {
    this.router.navigate([path], { queryParams });
  }
}
