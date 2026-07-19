import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { BrandingService } from '../core/branding.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, ExportBarComponent, ModuleShellComponent, SelectFieldComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Settings & configuration"
      description="Sheet 10 — database-driven masters (no hard-coded business data)"
      icon="settings"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Settings' }]"
    >
    @if (auth.hasRole('TENANT_ADMIN')) {
      <div class="card" style="margin-bottom:.75rem">
        <a routerLink="/tenant-onboarding">Tenant onboarding wizard</a>
        <span class="e360-muted"> — configure tenant type and portals</span>
      </div>

      <div class="card" style="margin-bottom:.75rem">
        <h2 style="margin-top:0">🎨 Company branding</h2>
        <p class="e360-muted">Your logo and colors — applied instantly across the workspace for everyone in your company.</p>
        <div class="row" style="align-items:flex-end;gap:1rem;flex-wrap:wrap">
          <div>
            <label>Logo</label>
            <div style="display:flex;align-items:center;gap:.6rem">
              @if (brand.logoSrc()) {
                <img [src]="brand.logoSrc()" alt="Current logo" style="height:40px;max-width:140px;object-fit:contain;border:1px solid var(--e360-border);border-radius:8px;padding:3px;background:#fff" />
              }
              <label class="secondary" style="display:inline-flex;align-items:center;gap:.35rem;cursor:pointer;border:1px dashed var(--e360-border);border-radius:8px;padding:.4rem .7rem">
                Upload logo
                <input type="file" accept="image/*" hidden (change)="uploadLogo($event)" />
              </label>
              @if (brand.logoSrc()) {
                <button class="secondary sm" (click)="removeLogo()">Remove</button>
              }
            </div>
          </div>
          <div>
            <label>Primary color</label>
            <input type="color" [(ngModel)]="brandForm.brandPrimaryColor" style="width:56px;height:36px;padding:2px" />
          </div>
          <div>
            <label>Accent color</label>
            <input type="color" [(ngModel)]="brandForm.brandAccentColor" style="width:56px;height:36px;padding:2px" />
          </div>
          <div style="min-width:220px">
            <label>Tagline</label>
            <input [(ngModel)]="brandForm.brandTagline" placeholder="People first." />
          </div>
          <div style="flex:0;display:flex;gap:.4rem">
            <button (click)="saveBranding()">Save branding</button>
            <button class="secondary" (click)="resetBranding()">Reset colors</button>
          </div>
        </div>
        @if (brandMsg) { <p class="e360-muted" style="margin:.5rem 0 0">{{ brandMsg }}</p> }
      </div>
    }
@if (error) { <div class="e360-error">{{ error }}</div> }

    <div class="row">
      <div class="card">
        <h2 style="margin-top:0">🏢 Branches</h2>
        <table>
          <tr><th>Code</th><th>Name</th><th>Country</th></tr>
          @for (b of branches; track b.id) {
            <tr><td>{{ b.code }}</td><td>{{ b.name }}</td><td>{{ b.country }}</td></tr>
          } @empty { <tr><td colspan="3" class="muted">No branches yet.</td></tr> }
        </table>
        <div class="row" style="align-items:flex-end;margin-top:.6rem">
          <div><label>Code</label><input [(ngModel)]="branch.code" /></div>
          <div><label>Name</label><input [(ngModel)]="branch.name" /></div>
          <e360-select-field
            label="Country"
            [options]="countryOptions"
            [(ngModel)]="branch.country"
          />
          <div style="flex:0"><button (click)="addBranch()">Add branch</button></div>
        </div>
      </div>

      <div class="card">
        <h2 style="margin-top:0">⏰ Shifts</h2>
        <table>
          <tr><th>Code</th><th>Name</th><th>Hours</th><th>Grace (min)</th></tr>
          @for (s of shifts; track s.id) {
            <tr><td>{{ s.code }}</td><td>{{ s.name }}</td><td>{{ s.startTime }}–{{ s.endTime }}</td><td>{{ s.graceMinutes }}</td></tr>
          } @empty { <tr><td colspan="4" class="muted">No shifts configured.</td></tr> }
        </table>
        <div class="row" style="align-items:flex-end;margin-top:.6rem">
          <div><label>Code</label><input [(ngModel)]="shift.code" /></div>
          <div><label>Name</label><input [(ngModel)]="shift.name" /></div>
          <div><label>Start</label><input [(ngModel)]="shift.startTime" placeholder="09:00" /></div>
          <div><label>End</label><input [(ngModel)]="shift.endTime" placeholder="18:00" /></div>
          <div style="flex:0"><button (click)="addShift()">Add shift</button></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">🧩 Custom field definitions</h2>
      <p class="e360-muted">Configure extra fields on applications and candidates.</p>
      <e360-data-table [columns]="fieldCols" [rows]="fieldRows" [pageSize]="15" [stickyHeader]="true">
        <ng-template #rowTemplate let-row>
          <td>{{ row.entity }}</td>
          <td>{{ row.key }}</td>
          <td>{{ row.label }}</td>
          <td>{{ row.type }}</td>
          <td>{{ row.required }}</td>
          <td>
            <button class="secondary sm" (click)="deactivateField(row.id)">Remove</button>
          </td>
        </ng-template>
      </e360-data-table>
      <div class="row" style="align-items:flex-end;margin-top:.6rem">
        <e360-select-field label="Entity" [options]="entityOptions" [(ngModel)]="fieldForm.entity" [clearable]="false" />
        <div><label>Field key</label><input [(ngModel)]="fieldForm.fieldKey" placeholder="visa_status" /></div>
        <div><label>Label</label><input [(ngModel)]="fieldForm.label" placeholder="Visa status" /></div>
        <e360-select-field label="Type" [options]="fieldTypeOptions" [(ngModel)]="fieldForm.type" [clearable]="false" />
        <label style="display:flex;align-items:center;gap:.35rem">
          <input type="checkbox" [(ngModel)]="fieldForm.required" /> Required
        </label>
        <div style="flex:0"><button (click)="addFieldDef()">Add field</button></div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">🚩 Feature flags</h2>
      <table>
        <tr><th>Code</th><th>Name</th><th>Enabled</th><th></th></tr>
        @for (f of flags; track f.id) {
          <tr>
            <td>{{ f.code }}</td><td>{{ f.name }}</td>
            <td><span class="badge" [class.ok]="f.enabled">{{ f.enabled ? 'ON' : 'OFF' }}</span></td>
            <td><button class="secondary" (click)="toggleFlag(f)">{{ f.enabled ? 'Disable' : 'Enable' }}</button></td>
          </tr>
        } @empty { <tr><td colspan="4" class="muted">No feature flags.</td></tr> }
      </table>
      <div class="row" style="align-items:flex-end;margin-top:.6rem">
        <div><label>Code</label><input [(ngModel)]="flag.code" /></div>
        <div><label>Name</label><input [(ngModel)]="flag.name" /></div>
        <div style="flex:0"><button (click)="addFlag()">Add flag</button></div>
      </div>
    </div>

    <div class="card">
      <div class="toolbar"><h2 style="margin:0">🔌 Integrations (sheet 09)</h2>
        <export-bar [rows]="integrations" [cols]="intCols" name="integrations" />
      </div>
      <table>
        <tr><th>ID</th><th>Integration</th><th>Priority</th><th>Status</th><th></th></tr>
        @for (i of integrations; track i.id) {
          <tr>
            <td>{{ i.id }}</td>
            <td>{{ i.name }}</td>
            <td>{{ i.priority }}</td>
            <td>
              @if (connMap[i.id]?.enabled) { <span class="badge ok">enabled</span> }
              @else { <span class="badge">disabled</span> }
            </td>
            <td>
              <button class="secondary" (click)="toggleInt(i)">{{ connMap[i.id]?.enabled ? 'Disable' : 'Enable' }}</button>
              <button (click)="testInt(i.id)">Test</button>
            </td>
          </tr>
        }
      </table>
      @if (testMsg) { <p class="muted" style="margin-top:.5rem">{{ testMsg }}</p> }
    </div>

    <div class="card">
      <h2 style="margin-top:0">📋 Config master areas</h2>
      @for (a of areas; track a.id) {
        <div style="border-bottom:1px solid var(--e360-border);padding:.5rem 0">
          <strong>{{ a.id }}</strong> — {{ a.area }}
          <div class="muted" style="font-size:.8rem">{{ a.examples }}</div>
        </div>
      }
    </div>
  
    </e360-module-shell>
  `,
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  auth = inject(AuthService);
  brand = inject(BrandingService);
  error = '';
  brandMsg = '';
  brandForm = { brandPrimaryColor: '#6d5cff', brandAccentColor: '#06b6d4', brandTagline: '' };
  branches: any[] = [];
  shifts: any[] = [];
  flags: any[] = [];
  integrations: any[] = [];
  connMap: Record<string, any> = {};
  areas: any[] = [];
  countries: any[] = [];
  testMsg = '';
  branch = { code: '', name: '', country: 'IN' };
  shift = { code: '', name: '', startTime: '09:00', endTime: '18:00' };
  flag = { code: '', name: '' };
  fieldDefs: any[] = [];
  fieldForm: any = { entity: 'APPLICATION', type: 'TEXT', required: false };
  entityOptions: SelectOption[] = [
    { value: 'APPLICATION', label: 'Application' },
    { value: 'CANDIDATE', label: 'Candidate' },
  ];
  fieldTypeOptions: SelectOption[] = [
    'TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT',
  ].map((v) => ({ value: v, label: v }));
  fieldCols: TableColumn[] = [
    { key: 'entity', label: 'Entity' },
    { key: 'key', label: 'Key' },
    { key: 'label', label: 'Label' },
    { key: 'type', label: 'Type' },
    { key: 'required', label: 'Required' },
    { key: 'actions', label: '', sortable: false, filterable: false },
  ];

  get fieldRows() {
    return this.fieldDefs.map((f) => ({
      id: f.id,
      entity: f.entity,
      key: f.fieldKey,
      label: f.label,
      type: f.type,
      required: f.required ? 'Yes' : 'No',
    }));
  }

  get countryOptions(): SelectOption[] {
    return this.countries.map((c) => ({ value: c.country, label: c.country }));
  }
  intCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'priority', label: 'Priority' },
    { key: 'protocol', label: 'Protocol' },
  ];

  async ngOnInit() {
    if (!this.auth.hasRole('TENANT_ADMIN', 'HR')) return;
    await this.reload();
    const b = this.brand.branding();
    if (b) {
      this.brandForm = {
        brandPrimaryColor: b.brandPrimaryColor ?? '#6d5cff',
        brandAccentColor: b.brandAccentColor ?? '#06b6d4',
        brandTagline: b.brandTagline ?? '',
      };
    }
  }

  async uploadLogo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await firstValueFrom(this.http.post<any>(`${environment.apiBase}/files`, fd));
      await this.api.patch('/tenant/branding', { logoFileId: res.id });
      await this.brand.load();
      this.brandMsg = 'Logo updated.';
    } catch (e) { this.brandMsg = errMsg(e); }
    finally { input.value = ''; }
  }

  async removeLogo() {
    try {
      await this.api.patch('/tenant/branding', { logoFileId: '', logoUrl: '' });
      await this.brand.load();
      this.brandMsg = 'Logo removed.';
    } catch (e) { this.brandMsg = errMsg(e); }
  }

  async saveBranding() {
    try {
      await this.api.patch('/tenant/branding', {
        brandPrimaryColor: this.brandForm.brandPrimaryColor,
        brandAccentColor: this.brandForm.brandAccentColor,
        brandTagline: this.brandForm.brandTagline,
      });
      await this.brand.load();
      this.brandMsg = 'Branding saved — theme applied.';
    } catch (e) { this.brandMsg = errMsg(e); }
  }

  async resetBranding() {
    try {
      await this.api.patch('/tenant/branding', { brandPrimaryColor: '', brandAccentColor: '', brandTagline: '' });
      await this.brand.load();
      this.brandForm = { brandPrimaryColor: '#6d5cff', brandAccentColor: '#06b6d4', brandTagline: '' };
      this.brandMsg = 'Branding reset to platform defaults.';
    } catch (e) { this.brandMsg = errMsg(e); }
  }

  async reload() {
    try {
      const [branches, shifts, flags, integrations, connections, areas, countries, fieldDefs] = await Promise.all([
        this.api.get<any[]>('/config/branches'),
        this.api.get<any[]>('/config/shifts'),
        this.api.get<any[]>('/config/feature-flags'),
        this.api.get<any[]>('/integrations'),
        this.api.get<any[]>('/integrations/connections'),
        this.api.get<any[]>('/config/areas'),
        this.api.get<any[]>('/masters/country-configs').catch(() => [{ country: 'IN' }]),
        this.api.get<any>('/tenant-field-definitions').then((r) => unwrapPaginated(r).items),
      ]);
      this.branches = branches;
      this.shifts = shifts;
      this.flags = flags;
      this.integrations = integrations;
      this.areas = areas;
      this.countries = countries.length ? countries : [{ country: 'IN' }];
      this.fieldDefs = fieldDefs;
      this.connMap = Object.fromEntries(connections.map((c) => [c.integrationId, c]));
    } catch (e) { this.error = errMsg(e); }
  }

  async addBranch() {
    await this.api.post('/config/branches', this.branch);
    this.branch = { code: '', name: '', country: 'IN' };
    await this.reload();
  }

  async addShift() {
    await this.api.post('/config/shifts', this.shift);
    this.shift = { code: '', name: '', startTime: '09:00', endTime: '18:00' };
    await this.reload();
  }

  async addFlag() {
    await this.api.post('/config/feature-flags', this.flag);
    this.flag = { code: '', name: '' };
    await this.reload();
  }

  async toggleFlag(f: any) {
    await this.api.patch(`/config/feature-flags/${f.id}`, { enabled: !f.enabled });
    await this.reload();
  }

  async toggleInt(i: any) {
    const enabled = !this.connMap[i.id]?.enabled;
    await this.api.post('/integrations/connections', { integrationId: i.id, enabled, config: {} });
    await this.reload();
  }

  async testInt(id: string) {
    try {
      const r = await this.api.post<any>(`/integrations/connections/${id}/test`, {});
      this.testMsg = `${id}: ${r.message} (${r.ok ? 'OK' : 'check config'})`;
    } catch (e) { this.testMsg = errMsg(e); }
  }

  async addFieldDef() {
    try {
      await this.api.post('/tenant-field-definitions', this.fieldForm);
      this.fieldForm = { entity: 'APPLICATION', type: 'TEXT', required: false };
      await this.reload();
    } catch (e) { this.error = errMsg(e); }
  }

  async deactivateField(id: string) {
    try {
      await this.api.patch(`/tenant-field-definitions/${id}`, { isActive: false });
      await this.reload();
    } catch (e) { this.error = errMsg(e); }
  }
}
