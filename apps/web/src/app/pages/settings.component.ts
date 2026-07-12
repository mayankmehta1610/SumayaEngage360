import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Settings & configuration"
      description="Sheet 10 — database-driven masters (no hard-coded business data)"
      icon="settings"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Settings' }]"
    >
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
          <div><label>Country</label>
            <select [(ngModel)]="branch.country">
              @for (c of countries; track c.country) { <option [value]="c.country">{{ c.country }}</option> }
            </select>
          </div>
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
        <div style="border-bottom:1px solid #eef1f6;padding:.5rem 0">
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
  auth = inject(AuthService);
  error = '';
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
  intCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'priority', label: 'Priority' },
    { key: 'protocol', label: 'Protocol' },
  ];

  async ngOnInit() {
    if (!this.auth.hasRole('TENANT_ADMIN', 'HR')) return;
    await this.reload();
  }

  async reload() {
    try {
      const [branches, shifts, flags, integrations, connections, areas, countries] = await Promise.all([
        this.api.get<any[]>('/config/branches'),
        this.api.get<any[]>('/config/shifts'),
        this.api.get<any[]>('/config/feature-flags'),
        this.api.get<any[]>('/integrations'),
        this.api.get<any[]>('/integrations/connections'),
        this.api.get<any[]>('/config/areas'),
        this.api.get<any[]>('/masters/country-configs').catch(() => [{ country: 'IN' }]),
      ]);
      this.branches = branches;
      this.shifts = shifts;
      this.flags = flags;
      this.integrations = integrations;
      this.areas = areas;
      this.countries = countries.length ? countries : [{ country: 'IN' }];
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
}
