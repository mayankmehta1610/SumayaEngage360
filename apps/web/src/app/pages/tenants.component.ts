import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';
import {
  TENANT_TYPE_DEFAULT_PORTALS,
  TENANT_TYPE_LABELS,
  TenantType,
} from '../core/rbac';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent, DataTableComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Tenants"
      description="Multi-tenant provisioning with tenant-type onboarding."
      icon="building-2"
      [showReports]="false"
      rolesHint="PLATFORM_ADMIN"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Tenants' }]"
    >
      <div actions><export-bar [rows]="tenants" [cols]="exportCols" name="tenants" /></div>

      <div class="card">
        <div class="e360-toolbar" style="margin-bottom:.75rem">
          <h2 style="margin:0">Provision tenant</h2>
          <span class="e360-muted">Step {{ wizardStep }} of 2</span>
        </div>

        @if (wizardStep === 1) {
          <p class="e360-muted">Choose the tenant type — this enables the right portals and workflows.</p>
          <div class="row">
            @for (t of tenantTypes; track t) {
              <label class="card" style="flex:1;min-width:12rem;cursor:pointer"
                     [style.border-color]="f.tenantType === t ? 'var(--e360-accent)' : ''">
                <input type="radio" name="tenantType" [value]="t" [(ngModel)]="f.tenantType" (ngModelChange)="onTypeChange()" />
                <strong>{{ typeLabels[t] }}</strong>
              </label>
            }
          </div>
          <div class="row" style="margin-top:.75rem">
            <div><label>Company name</label><input [(ngModel)]="f.name" /></div>
            <div><label>Subdomain</label><input [(ngModel)]="f.subdomain" placeholder="acme" /></div>
            <div><label>Country</label><input [(ngModel)]="f.country" placeholder="IN" /></div>
          </div>
          <button class="secondary" style="margin-top:.75rem" (click)="wizardStep = 2">Next: portals →</button>
        }

        @if (wizardStep === 2) {
          <p class="e360-muted">Confirm which portal modules to enable (defaults match tenant type).</p>
          <div class="row">
            @for (p of allPortals; track p.key) {
              <label style="display:flex;gap:.35rem;align-items:center;min-width:10rem">
                <input type="checkbox" [checked]="f.enabledPortals.includes(p.key)"
                       (change)="togglePortal(p.key, $event)" />
                {{ p.label }}
              </label>
            }
          </div>
          <div class="row" style="margin-top:.75rem">
            <div><label>Admin email</label><input [(ngModel)]="f.adminEmail" /></div>
            <div><label>Admin password</label><input [(ngModel)]="f.adminPassword" type="password" /></div>
            <div><label>Admin first name</label><input [(ngModel)]="f.adminFirstName" /></div>
            <div><label>Admin last name</label><input [(ngModel)]="f.adminLastName" /></div>
          </div>
          <div style="margin-top:.75rem;display:flex;gap:.5rem">
            <button class="secondary" (click)="wizardStep = 1">← Back</button>
            <button (click)="create()">Create tenant</button>
          </div>
        }

        @if (error) { <div class="e360-error" style="margin-top:.5rem">{{ error }}</div> }
      </div>

      <div class="card">
        <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true" />
      </div>
    </e360-module-shell>
  `,
})
export class TenantsComponent implements OnInit {
  private api = inject(ApiService);
  tenants: any[] = [];
  error = '';
  wizardStep = 1;
  f: any = {
    country: 'IN',
    tenantType: 'COMPANY' as TenantType,
    enabledPortals: [...TENANT_TYPE_DEFAULT_PORTALS.COMPANY],
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

  exportCols = [
    { key: 'name', label: 'Name' },
    { key: 'subdomain', label: 'Subdomain' },
    { key: 'tenantType', label: 'Type' },
    { key: 'country', label: 'Country' },
    { key: 'isActive', label: 'Active' },
    { key: 'createdAt', label: 'Created' },
  ];
  tableCols: TableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'subdomain', label: 'Subdomain' },
    { key: 'type', label: 'Type' },
    { key: 'country', label: 'Country' },
    { key: 'active', label: 'Active' },
  ];

  get tableRows() {
    return this.tenants.map((t) => ({
      name: t.name,
      subdomain: t.subdomain,
      type: this.typeLabels[t.tenantType as TenantType] ?? t.tenantType,
      country: t.country,
      active: t.isActive ? 'active' : 'disabled',
    }));
  }

  async ngOnInit() {
    await this.load();
  }

  onTypeChange() {
    const t = this.f.tenantType as TenantType;
    this.f.enabledPortals = [...TENANT_TYPE_DEFAULT_PORTALS[t]];
  }

  togglePortal(key: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const list: string[] = [...(this.f.enabledPortals ?? [])];
    if (checked && !list.includes(key)) list.push(key);
    if (!checked) this.f.enabledPortals = list.filter((p) => p !== key);
    else this.f.enabledPortals = list;
  }

  async load() {
    try {
      this.tenants = await this.api.get<any[]>('/tenants');
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  async create() {
    this.error = '';
    try {
      await this.api.post('/tenants', {
        ...this.f,
        onboardingQuestionnaire: { completedAt: new Date().toISOString(), step: 'wizard' },
      });
      this.f = {
        country: 'IN',
        tenantType: 'COMPANY',
        enabledPortals: [...TENANT_TYPE_DEFAULT_PORTALS.COMPANY],
      };
      this.wizardStep = 1;
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
}
