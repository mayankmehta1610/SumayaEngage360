import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SEGMENTS, Segment, homeForRoles, segmentByKey } from '../core/rbac';
import { IconComponent } from '../ui/icon.component';
import { ThemeToggleComponent } from '../ui/theme-toggle.component';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, ThemeToggleComponent],
  template: `
    <div class="e360-login-page" [attr.data-segment]="segment?.accent ?? 'company'">
      <e360-theme-toggle class="e360-login-theme-toggle" [iconSize]="20" />

      <div class="e360-login-shell">
        <!-- Brand / segment panel -->
        <aside class="e360-login-aside">
          <a routerLink="/" class="e360-login-home">
            <span class="brand-mark" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h7v9H3zm11 0h7v5h-7zm0 7h7v9h-7zM3 16h7v5H3z"/></svg>
            </span>
            Sumaya<strong>Engage360</strong>
          </a>

          <div class="e360-login-aside-body">
            <div class="seg-icon" aria-hidden="true">
              <e360-icon [name]="segment?.icon ?? 'building-2'" [size]="26" />
            </div>
            <h2>{{ company?.name ?? segment?.label ?? 'Enterprise workspace' }}</h2>
            <p class="tagline">{{ company?.brandTagline ?? segment?.tagline ?? 'Sign in to your workspace.' }}</p>

            @if (segment) {
              <ul class="workflow">
                @for (step of segment.workflow; track step; let i = $index) {
                  <li><span class="step-n">{{ i + 1 }}</span>{{ step }}</li>
                }
              </ul>
            }
          </div>

          <div class="e360-login-aside-foot">
            Modern multi-tenant HR &amp; talent ERP — recruitment to retirement.
          </div>
        </aside>

        <!-- Form panel -->
        <div class="e360-login-card">
          <div class="e360-login-brand">
            <h1>{{ company ? 'Sign in to ' + company.name : 'Sign in' }}</h1>
            <p>
              {{ company ? 'Your organization workspace' : segment ? segment.label : 'Choose your workspace type below' }}
            </p>
          </div>

          <!-- Segment switcher -->
          <nav class="e360-seg-switch" aria-label="Workspace type">
            @for (s of segments; track s.key) {
              <a
                [routerLink]="['/login', s.key]"
                class="seg-chip"
                [class.active]="segment?.key === s.key"
                [attr.data-segment]="s.accent"
              >
                <e360-icon [name]="s.icon" [size]="14" />
                {{ s.shortLabel }}
              </a>
            }
          </nav>

          @if (!isPlatform) {
            <label class="e360-label">Organization ID</label>
            <input
              [(ngModel)]="tenant"
              [placeholder]="tenantPlaceholder"
              autocomplete="organization"
              [readonly]="orgLocked"
              (blur)="resolveCompany()"
              (keyup.enter)="resolveCompany()"
            />
            @if (company) {
              <p class="e360-login-company">Signing in to <strong>{{ company.name }}</strong></p>
            } @else if (companyError) {
              <p class="e360-field-error">{{ companyError }}</p>
            }
          }
          <label class="e360-label">Work email</label>
          <input [(ngModel)]="email" type="email" autocomplete="username" placeholder="you@company.com" />
          <label class="e360-label">Password</label>
          <input
            [(ngModel)]="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••••"
            (keyup.enter)="submit()"
          />
          @if (error) { <div class="error">{{ error }}</div> }
          <button (click)="submit()" [disabled]="busy" class="e360-login-submit">
            @if (!busy) { <e360-icon name="log-in" [size]="16" /> }
            {{ busy ? 'Signing in…' : 'Sign in' }}
          </button>

          <p class="e360-login-alt">
            @if (isPlatform) {
              Client workspace? <a [routerLink]="['/login', 'company']">Sign in to your organization</a>
            } @else {
              Platform operator? <a [routerLink]="['/login', 'platform']">Sign in to operations</a>
            }
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  segments = SEGMENTS;
  segment: Segment | null = null;

  tenant = this.auth.tenant ?? '';
  email = '';
  password = '';
  error = '';
  busy = false;

  /** Resolved company profile (name/branding) once an Organization ID is known. */
  company: { name: string; brandTagline?: string | null; tenantType?: string } | null = null;
  companyError = '';
  orgLocked = false;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.segment = segmentByKey(params.get('segment')) ?? segmentByKey('company');
      // Country-scoped URI (/in/company): remember the country context.
      const country = params.get('country');
      if (country && /^[a-z]{2}$/i.test(country)) {
        localStorage.setItem('e360_country', country.toUpperCase());
      }
      // Company-scoped URI (/in/company/meridian-in): lock to that organization.
      const org = params.get('org');
      if (org) {
        this.tenant = org;
        this.orgLocked = true;
        void this.resolveCompany();
      }
      this.error = '';
    });
  }

  /** Look up the real company name/branding for the entered Organization ID. */
  async resolveCompany() {
    const org = this.tenant?.trim();
    this.company = null;
    this.companyError = '';
    if (!org) return;
    try {
      const p = await this.api.get<any>(`/tenant/public-profile/${encodeURIComponent(org)}`);
      this.company = p;
      // Align the segment styling to the resolved company's type when sensible.
      const byType = SEGMENTS.find((s) => s.tenantType === p.tenantType);
      if (byType && this.segment?.key !== 'platform') this.segment = byType;
    } catch {
      this.companyError = 'No organization found with that ID.';
    }
  }

  get isPlatform(): boolean {
    return this.segment?.key === 'platform';
  }

  get tenantPlaceholder(): string {
    switch (this.segment?.key) {
      case 'agency': return 'talentbridge';
      case 'staffing': return 'staffpro';
      case 'recruiter': return 'jane-recruits';
      default: return 'acme';
    }
  }

  async submit() {
    this.busy = true;
    this.error = '';
    try {
      const tenant = this.isPlatform ? '' : this.tenant;
      const user = await this.auth.login(this.email, this.password, tenant);
      this.router.navigateByUrl(
        user.roles.includes('PLATFORM_ADMIN')
          ? '/tenants'
          : this.segment?.home ?? homeForRoles(user.roles),
      );
    } catch (e) {
      this.error = errMsg(e);
    } finally {
      this.busy = false;
    }
  }
}
