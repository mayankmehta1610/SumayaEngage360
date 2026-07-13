import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { SEGMENTS } from '../core/rbac';
import { IconComponent } from '../ui/icon.component';
import { ThemeToggleComponent } from '../ui/theme-toggle.component';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, IconComponent, ThemeToggleComponent],
  styles: [`
    :host { display: block; }
    .top {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.85rem 2rem; background: var(--e360-sidebar-bg); color: #fff;
      position: sticky; top: 0; z-index: 10;
      border-bottom: 1px solid var(--e360-sidebar-border);
    }
    .top-actions { display: flex; align-items: center; gap: 0.75rem; }
    .top-actions .e360-theme-toggle { color: #e2e8f0; }
    .top-actions .e360-theme-toggle:hover { background: var(--e360-sidebar-hover); color: #fff; }
    .brand { font-weight: 800; font-size: 1.1rem; letter-spacing: .01em; display: flex; align-items: center; gap: .55rem; }
    .brand-icon {
      width: 34px; height: 34px; border-radius: 9px;
      background: linear-gradient(135deg, var(--e360-primary), var(--e360-accent));
      display: flex; align-items: center; justify-content: center;
    }
    .brand span { color: #a5b4fc; }
    .top .btn { background: var(--e360-primary); }

    .hero {
      text-align: center;
      padding: 4.5rem 2rem 3rem;
      max-width: 880px; margin: 0 auto;
    }
    .hero .eyebrow {
      display: inline-flex; align-items: center; gap: .4rem;
      font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
      color: var(--e360-primary);
      background: var(--e360-primary-soft);
      border: 1px solid color-mix(in srgb, var(--e360-primary) 30%, transparent);
      padding: .3rem .8rem; border-radius: 999px; margin-bottom: 1.25rem;
    }
    .hero h1 { font-size: 2.75rem; line-height: 1.12; margin: 0 0 1rem; letter-spacing: -0.03em; }
    .hero h1 em { font-style: normal; background: linear-gradient(90deg, var(--e360-primary), var(--e360-accent)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .hero p { color: var(--e360-text-secondary); font-size: 1.05rem; line-height: 1.65; max-width: 640px; margin: 0 auto; }
    .country-picker { max-width: 720px; margin: 1.5rem auto 0; padding: 1rem; background: var(--e360-surface); border: 1px solid var(--e360-border); border-radius: var(--e360-radius-lg); text-align:left; box-shadow:var(--e360-shadow-sm); }
    .country-picker select { width:100%; margin-top:.35rem; }
    .country-flow { color:var(--e360-text-muted); font-size:.82rem; margin:.55rem 0 0; }

    .segments {
      max-width: 1160px; margin: 0 auto; padding: 1.5rem 2rem 3rem;
    }
    .segments h2 { text-align: center; font-size: 1.35rem; margin-bottom: .35rem; letter-spacing: -0.02em; }
    .segments .sub { text-align: center; color: var(--e360-text-muted); font-size: .9rem; margin: 0 0 1.75rem; }
    .seg-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.1rem;
    }
    .seg-card {
      --seg: var(--e360-seg-company);
      display: flex; flex-direction: column;
      background: var(--e360-surface);
      border: 1px solid var(--e360-border);
      border-top: 3px solid var(--seg);
      border-radius: var(--e360-radius-lg);
      padding: 1.4rem 1.3rem 1.2rem;
      box-shadow: var(--e360-shadow-sm);
      transition: box-shadow .18s, transform .18s, border-color .18s;
    }
    .seg-card:hover { box-shadow: var(--e360-shadow-lg); transform: translateY(-3px); }
    .seg-card[data-segment="agency"] { --seg: var(--e360-seg-agency); }
    .seg-card[data-segment="staffing"] { --seg: var(--e360-seg-staffing); }
    .seg-card[data-segment="recruiter"] { --seg: var(--e360-seg-recruiter); }
    .seg-card .seg-head { display: flex; align-items: center; gap: .7rem; margin-bottom: .6rem; }
    .seg-card .seg-icon {
      width: 42px; height: 42px; border-radius: 11px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--seg) 13%, transparent);
      color: var(--seg);
      border: 1px solid color-mix(in srgb, var(--seg) 28%, transparent);
    }
    .seg-card h3 { font-size: 1rem; margin: 0; letter-spacing: -0.01em; }
    .seg-card .seg-tag { color: var(--e360-text-muted); font-size: .82rem; line-height: 1.5; margin: 0 0 .8rem; }
    .seg-card ul { list-style: none; margin: 0 0 1rem; padding: 0; display: flex; flex-direction: column; gap: .38rem; flex: 1; }
    .seg-card li { display: flex; align-items: center; gap: .45rem; font-size: .8rem; color: var(--e360-text-secondary); }
    .seg-card li::before {
      content: ''; width: 5px; height: 5px; border-radius: 999px; flex-shrink: 0;
      background: var(--seg);
    }
    .seg-card .btn {
      justify-content: center; width: 100%;
      background: var(--seg); color: #fff;
    }
    .seg-card .btn:hover { background: color-mix(in srgb, var(--seg) 85%, #000); text-decoration: none; }

    .features {
      max-width: 1160px; margin: 0 auto; padding: 0 2rem 3.5rem;
      display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem;
    }
    .feature {
      background: var(--e360-surface); border: 1px solid var(--e360-border);
      border-radius: var(--e360-radius-md); padding: 1.15rem;
      box-shadow: var(--e360-shadow-sm);
      transition: box-shadow .15s, border-color .15s;
    }
    .feature:hover { box-shadow: var(--e360-shadow-md); }
    .feature .f-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--e360-primary-soft); color: var(--e360-primary);
      margin-bottom: .55rem;
    }
    .feature h3 { margin: 0 0 .3rem; font-size: .95rem; }
    .feature p { color: var(--e360-text-muted); font-size: .84rem; margin: 0; line-height: 1.5; }

    .band {
      background: var(--e360-sidebar-bg); color: var(--e360-sidebar-text); text-align: center; padding: 3rem 2rem;
      border-top: 1px solid var(--e360-sidebar-border);
    }
    .band h2 { color: var(--e360-sidebar-text-active); margin-top: 0; letter-spacing: -0.02em; }
    .band .cta { display: flex; gap: .75rem; justify-content: center; margin-top: 1.25rem; flex-wrap: wrap; }
    footer {
      text-align: center; color: var(--e360-text-muted); font-size: .8rem; padding: 1.5rem;
      display: flex; flex-direction: column; gap: .3rem;
    }
    footer a { color: var(--e360-text-muted); }
    footer a:hover { color: var(--e360-primary); }
    @media (max-width: 640px) {
      .hero { padding: 3rem 1.25rem 2rem; }
      .hero h1 { font-size: 1.9rem; }
      .segments, .features { padding-inline: 1.25rem; }
    }
  `],
  template: `
    <div class="top">
      <div class="brand">
        <span class="brand-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M3 3h7v9H3zm11 0h7v5h-7zm0 7h7v9h-7zM3 16h7v5H3z"/></svg>
        </span>
        Sumaya<span>Engage360</span>
      </div>
      <div class="top-actions">
        <e360-theme-toggle [iconSize]="20" />
        <a class="btn" routerLink="/login">Sign in</a>
      </div>
    </div>

    <section class="hero">
      <span class="eyebrow">
        <e360-icon name="sparkles" [size]="13" />
        Modern HR &amp; Talent ERP
      </span>
      <h1>One platform for <em>every talent business</em> — recruitment to retirement.</h1>
      <p>
        SumayaEngage360 unifies applicant tracking, onboarding with background verification,
        projects and timesheets, payroll, performance and governed exits — as a multi-tenant
        SaaS where every organization gets its own branded, workflow-driven workspace.
      </p>
      <div class="country-picker">
        <label for="country">Where will you recruit or deploy talent?</label>
        <select id="country" [(ngModel)]="selectedCountry" (ngModelChange)="selectCountry($event)">
          @for (j of jurisdictions; track j.code) { <option [value]="j.code">{{ j.name }}</option> }
        </select>
        <p class="country-flow">{{ selectedJurisdiction?.lifecycle?.join(' → ') }}</p>
      </div>
    </section>

    <section class="segments">
      <h2>Choose your workspace</h2>
      <p class="sub">Purpose-built portals for each business model — with dedicated login, navigation and workflows.</p>
      <div class="seg-grid">
        @for (s of segments; track s.key) {
          <div class="seg-card" [attr.data-segment]="s.accent">
            <div class="seg-head">
              <span class="seg-icon" aria-hidden="true"><e360-icon [name]="s.icon" [size]="21" /></span>
              <h3>{{ s.label }}</h3>
            </div>
            <p class="seg-tag">{{ s.tagline }}</p>
            <ul>
              @for (step of s.workflow; track step) { <li>{{ step }}</li> }
            </ul>
            <a class="btn" [routerLink]="['/login', s.key]" [queryParams]="{ country: selectedCountry }">
              <e360-icon name="log-in" [size]="15" />
              {{ s.shortLabel }} sign in
            </a>
          </div>
        }
      </div>
    </section>

    <section class="features">
      <div class="feature">
        <span class="f-icon"><e360-icon name="user-search" [size]="19" /></span>
        <h3>Applicant Tracking</h3>
        <p>Client-branded public career pages with JD, vacancies and locations. Skill tagging at apply time and AI resume parsing.</p>
      </div>
      <div class="feature">
        <span class="f-icon"><e360-icon name="video" [size]="19" /></span>
        <h3>Verified Interviews</h3>
        <p>Configurable interview rounds with recordings and mandatory proof screenshots — a complete audit trail.</p>
      </div>
      <div class="feature">
        <span class="f-icon"><e360-icon name="shield-check" [size]="19" /></span>
        <h3>Digital Onboarding</h3>
        <p>Country-aware document checklists, HR verification, third-party background checks and policy sign-off.</p>
      </div>
      <div class="feature">
        <span class="f-icon"><e360-icon name="folder-kanban" [size]="19" /></span>
        <h3>Projects &amp; Timesheets</h3>
        <p>Percentage-based allocation to client or internal projects, with timesheets and manager approvals.</p>
      </div>
      <div class="feature">
        <span class="f-icon"><e360-icon name="trending-up" [size]="19" /></span>
        <h3>Performance &amp; Growth</h3>
        <p>Customizable appraisal cycles, 360° feedback, recognition and mandatory no-skip training videos with quizzes.</p>
      </div>
      <div class="feature">
        <span class="f-icon"><e360-icon name="log-out" [size]="19" /></span>
        <h3>Governed Exits</h3>
        <p>Resignation approvals, departmental NOC sign-offs, asset recovery, full &amp; final settlement and letters.</p>
      </div>
    </section>

    <section class="band">
      <h2>One platform. Every client. The whole talent lifecycle.</h2>
      <p>Multi-tenant by design — every organization gets its own branded space, workflows and approvals.</p>
      <div class="cta">
        <a class="btn" routerLink="/login">Sign in to your workspace</a>
        <a class="btn secondary" routerLink="/careers/sumaya/sumaya-internal">View open roles</a>
      </div>
    </section>
    <footer>
      <span>© {{ year }} SumayaEngage360 · Applicant Tracking &amp; Employee Lifecycle Management</span>
      <span><a [routerLink]="['/login', 'platform']">Platform operations sign-in</a></span>
    </footer>
  `,
})
export class LandingComponent implements OnInit {
  private api = inject(ApiService);
  year = new Date().getFullYear();
  // Business segments (exclude platform ops from the main grid — linked in footer)
  segments = SEGMENTS.filter((s) => s.tenantType !== null);
  jurisdictions: any[] = [
    { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'New Zealand' }, { code: 'EU', name: 'European Union' },
    { code: 'AE', name: 'United Arab Emirates' }, { code: 'SA', name: 'Saudi Arabia' },
    { code: 'QA', name: 'Qatar' }, { code: 'BH', name: 'Bahrain' },
    { code: 'KW', name: 'Kuwait' }, { code: 'OM', name: 'Oman' },
  ];
  selectedCountry = localStorage.getItem('e360_country') || 'US';
  get selectedJurisdiction() { return this.jurisdictions.find((j) => j.code === this.selectedCountry); }

  async ngOnInit() {
    try { this.jurisdictions = await this.api.get<any[]>('/jurisdictions/catalog'); }
    catch { /* Keep the built-in country list if the public catalogue is temporarily unavailable. */ }
  }

  selectCountry(code: string) { localStorage.setItem('e360_country', code); }
}
