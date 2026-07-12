import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import {
  TENANT_TYPE_DEFAULT_PORTALS,
  TENANT_TYPE_LABELS,
  TenantType,
} from '../core/rbac';
import { TenantContextService } from '../core/tenant-context.service';
import { ModuleShellComponent } from '../ui/module-shell.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Tenant onboarding"
      description="Configure your tenant type and enabled portals."
      icon="sparkles"
      [showReports]="false"
      rolesHint="TENANT_ADMIN"
      [breadcrumbs]="[{ label: 'Settings' }, { label: 'Onboarding' }]"
    >
      @if (error) { <div class="e360-error">{{ error }}</div> }
      @if (done) {
        <div class="card">
          <p>Onboarding complete. Your portals and navigation are configured.</p>
          <button (click)="goDashboard()">Go to dashboard</button>
        </div>
      } @else {
        <div class="card">
          <div class="e360-toolbar" style="margin-bottom:.75rem">
            <h2 style="margin:0">Setup wizard</h2>
            <span class="e360-muted">Step {{ step }} of 2</span>
          </div>

          @if (step === 1) {
            <p class="e360-muted">Choose your organization type — this drives which modules appear in navigation.</p>
            <div class="row">
              @for (t of tenantTypes; track t) {
                <label class="card" style="flex:1;min-width:12rem;cursor:pointer"
                       [style.border-color]="form.tenantType === t ? 'var(--e360-accent)' : ''">
                  <input type="radio" name="tenantType" [value]="t" [(ngModel)]="form.tenantType" (ngModelChange)="onTypeChange()" />
                  <strong>{{ typeLabels[t] }}</strong>
                </label>
              }
            </div>
            <div style="margin-top:.75rem">
              <label>Primary use case (optional)</label>
              <textarea rows="2" [(ngModel)]="form.useCase" placeholder="e.g. IT staffing for enterprise clients"></textarea>
            </div>
            <button class="secondary" style="margin-top:.75rem" (click)="step = 2">Next: portals →</button>
          }

          @if (step === 2) {
            <p class="e360-muted">Confirm portal modules to enable (defaults match tenant type).</p>
            <div class="row">
              @for (p of allPortals; track p.key) {
                <label style="display:flex;gap:.35rem;align-items:center;min-width:10rem">
                  <input type="checkbox" [checked]="form.enabledPortals.includes(p.key)"
                         (change)="togglePortal(p.key, $event)" />
                  {{ p.label }}
                </label>
              }
            </div>
            <div style="margin-top:.75rem;display:flex;gap:.5rem">
              <button class="secondary" (click)="step = 1">← Back</button>
              <button (click)="submit()" [disabled]="saving">{{ saving ? 'Saving…' : 'Complete setup' }}</button>
            </div>
          }
        </div>
      }
    </e360-module-shell>
  `,
})
export class TenantOnboardingComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private tenantCtx = inject(TenantContextService);
  private router = inject(Router);

  error = '';
  saving = false;
  done = false;
  step = 1;
  form: {
    tenantType: TenantType;
    enabledPortals: string[];
    useCase: string;
  } = {
    tenantType: 'COMPANY',
    enabledPortals: [...TENANT_TYPE_DEFAULT_PORTALS.COMPANY],
    useCase: '',
  };

  tenantTypes: TenantType[] = [
    'COMPANY',
    'RECRUITMENT_AGENCY',
    'STAFFING_COMPANY',
    'INDIVIDUAL_RECRUITER',
  ];
  typeLabels = TENANT_TYPE_LABELS;
  allPortals = [
    { key: 'ats', label: 'Recruitment (ATS)' },
    { key: 'agency', label: 'Agency CRM' },
    { key: 'staffing', label: 'Staffing' },
    { key: 'workforce', label: 'Workforce & HR' },
    { key: 'operations', label: 'Operations' },
    { key: 'compensation', label: 'Compensation' },
    { key: 'performance', label: 'Performance' },
  ];

  async ngOnInit() {
    if (!this.auth.hasRole('TENANT_ADMIN')) {
      await this.router.navigate(['/dashboard']);
      return;
    }
    const t = await this.tenantCtx.load();
    if (t?.tenantType) this.form.tenantType = t.tenantType;
    if (t?.enabledPortals?.length) this.form.enabledPortals = [...t.enabledPortals];
    const q = t?.onboardingQuestionnaire as Record<string, unknown> | undefined;
    if (q?.useCase) this.form.useCase = String(q.useCase);
    if (q?.completedAt) this.done = true;
  }

  onTypeChange() {
    this.form.enabledPortals = [...TENANT_TYPE_DEFAULT_PORTALS[this.form.tenantType]];
  }

  togglePortal(key: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked && !this.form.enabledPortals.includes(key)) {
      this.form.enabledPortals = [...this.form.enabledPortals, key];
    } else if (!checked) {
      this.form.enabledPortals = this.form.enabledPortals.filter((k) => k !== key);
    }
  }

  async submit() {
    this.saving = true;
    this.error = '';
    try {
      await this.api.post('/tenant/onboarding-wizard', {
        tenantType: this.form.tenantType,
        enabledPortals: this.form.enabledPortals,
        questionnaire: {
          useCase: this.form.useCase,
          completedAt: new Date().toISOString(),
        },
      });
      await this.tenantCtx.load();
      this.done = true;
    } catch (e) {
      this.error = errMsg(e);
    } finally {
      this.saving = false;
    }
  }

  goDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
