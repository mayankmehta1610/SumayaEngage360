import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Privacy & DSR"
      description="Sheet 05 — consent and data subject requests"
      icon="lock"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Administration' }, { label: 'Privacy & consent' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    @if (msg) { <div class="ok">{{ msg }}</div> }

    <div class="card">
      <h2>My consents</h2>
      <table>
        <tr><th>Purpose</th><th>Granted</th><th>Version</th><th>Recorded</th></tr>
        @for (c of consents; track c.id) {
          <tr>
            <td>{{ c.purpose }}</td>
            <td>{{ c.granted ? 'Yes' : 'No' }}</td>
            <td>{{ c.version ?? '—' }}</td>
            <td class="muted" style="font-size:.78rem">{{ c.createdAt | date:'short' }}</td>
          </tr>
        }
      </table>
      <form (ngSubmit)="recordConsent()" class="inline-form">
        <input [(ngModel)]="consentPurpose" name="purpose" placeholder="Purpose" required />
        <label><input type="checkbox" [(ngModel)]="consentGranted" name="granted" /> Granted</label>
        <button type="submit">Record consent</button>
      </form>
    </div>

    <div class="card">
      <h2>Data subject requests</h2>
      <table>
        <tr><th>Type</th><th>Status</th><th>Details</th><th>Submitted</th></tr>
        @for (d of dsrs; track d.id) {
          <tr>
            <td>{{ d.type }}</td>
            <td><span class="badge" [class.ok]="d.status === 'COMPLETED'">{{ d.status }}</span></td>
            <td>{{ d.details ?? '—' }}</td>
            <td class="muted" style="font-size:.78rem">{{ d.createdAt | date:'short' }}</td>
          </tr>
        }
      </table>
      <form (ngSubmit)="submitDsr()" class="inline-form">
        <select [(ngModel)]="dsrType" name="type">
          <option value="ACCESS">Access</option>
          <option value="ERASURE">Erasure</option>
          <option value="PORTABILITY">Portability</option>
          <option value="RECTIFICATION">Rectification</option>
        </select>
        <input [(ngModel)]="dsrDetails" name="details" placeholder="Details (optional)" />
        <button type="submit">Submit DSR</button>
      </form>
    </div>

    @if (auth.hasRole('TENANT_ADMIN', 'HR')) {
      <div class="card">
        <h2>All tenant DSRs (HR)</h2>
        <table>
          <tr><th>User</th><th>Type</th><th>Status</th><th>Action</th></tr>
          @for (d of allDsrs; track d.id) {
            <tr>
              <td>{{ d.userId?.slice(0,8) }}</td>
              <td>{{ d.type }}</td>
              <td>{{ d.status }}</td>
              <td>
                @if (d.status !== 'COMPLETED') {
                  <button (click)="completeDsr(d.id)">Complete</button>
                }
              </td>
            </tr>
          }
        </table>
      </div>
    }
  
    </e360-module-shell>
  `,
  styles: [`
    .inline-form { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .75rem; align-items: center; }
    .ok { background: #ecfdf5; color: #065f46; padding: .5rem .75rem; border-radius: 6px; margin-bottom: .75rem; }
  `],
})
export class PrivacyComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  consents: any[] = [];
  dsrs: any[] = [];
  allDsrs: any[] = [];
  consentPurpose = '';
  consentGranted = true;
  dsrType = 'ACCESS';
  dsrDetails = '';
  error = '';
  msg = '';

  async ngOnInit() {
    await this.reload();
  }

  async reload() {
    try {
      this.consents = await this.api.get<any[]>('/privacy/consent/mine');
      this.dsrs = await this.api.get<any[]>('/privacy/dsr/mine');
      if (this.auth.hasRole('TENANT_ADMIN', 'HR')) {
        this.allDsrs = await this.api.get<any[]>('/privacy/dsr');
      }
    } catch (e) { this.error = errMsg(e); }
  }

  async recordConsent() {
    this.error = ''; this.msg = '';
    try {
      await this.api.post('/privacy/consent', { purpose: this.consentPurpose, granted: this.consentGranted });
      this.msg = 'Consent recorded';
      this.consentPurpose = '';
      await this.reload();
    } catch (e) { this.error = errMsg(e); }
  }

  async submitDsr() {
    this.error = ''; this.msg = '';
    try {
      await this.api.post('/privacy/dsr', { type: this.dsrType, details: this.dsrDetails || undefined });
      this.msg = 'DSR submitted';
      this.dsrDetails = '';
      await this.reload();
    } catch (e) { this.error = errMsg(e); }
  }

  async completeDsr(id: string) {
    try {
      await this.api.patch(`/privacy/dsr/${id}`, { status: 'COMPLETED' });
      await this.reload();
    } catch (e) { this.error = errMsg(e); }
  }
}
