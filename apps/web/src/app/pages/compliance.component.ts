import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ModuleShellComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Compliance"
      description="POSH, whistleblower, disciplinary and incident cases with anonymous reporting, legal hold and retention."
      icon="shield-alert"
      moduleKey="compliance"
      auditEntityType="COMPLIANCE_CASE"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Administration' }, { label: 'Compliance' }]"
    >
    @if (error) { <div class="e360-error">{{ error }}</div> }

    <div class="card">
      <h2 style="margin-top:0">🛡 Raise a concern</h2>
      <div class="row">
        <e360-select-field
          label="Type"
          [options]="caseTypeOptions"
          [(ngModel)]="f.type"
        />
        <div><label>Title</label><input [(ngModel)]="f.title" /></div>
      </div>
      <label>Details</label>
      <textarea rows="3" [(ngModel)]="f.details"></textarea>
      <label><input type="checkbox" [(ngModel)]="f.anonymous" style="width:auto;margin-right:.4rem" />
        Report anonymously (your identity is never shown, even to HR)</label>
      <div style="margin-top:.5rem"><button (click)="report()" [disabled]="!f.title || !f.details">Submit</button></div>
      @for (c of mine; track c.id) {
        <div style="border-top:1px solid #eef1f6;padding:.4rem 0">
          <span class="badge">{{ c.type }}</span> {{ c.title }}
          <span class="badge" [class.ok]="c.status==='RESOLVED'" [class.warn]="c.status==='UNDER_INVESTIGATION'">{{ c.status }}</span>
          @if (c.resolution) { <div class="muted">Resolution: {{ c.resolution }}</div> }
        </div>
      }
    </div>

    @if (isHr) {
      <div class="card">
        <h2 style="margin-top:0">Case board (HR / compliance officers)</h2>
        <table>
          <tr><th>Type</th><th>Title</th><th>Reporter</th><th>Status</th><th>Legal hold</th><th>Actions</th></tr>
          @for (c of cases; track c.id) {
            <tr>
              <td><span class="badge">{{ c.type }}</span></td>
              <td>{{ c.title }}<div class="muted" style="font-size:.75rem">{{ c.details.slice(0, 80) }}</div></td>
              <td>{{ c.anonymous ? '🔒 anonymous' : (c.reporterId ?? '—') }}</td>
              <td><span class="badge" [class.ok]="c.status==='RESOLVED'" [class.warn]="c.status==='UNDER_INVESTIGATION'">{{ c.status }}</span></td>
              <td><button class="secondary" (click)="update(c.id, { legalHold: !c.legalHold })">{{ c.legalHold ? '⚖ on — release' : 'apply' }}</button></td>
              <td style="white-space:nowrap">
                @if (c.status === 'OPEN') { <button class="secondary" (click)="update(c.id, { status: 'UNDER_INVESTIGATION' })">Investigate</button> }
                @if (c.status !== 'RESOLVED' && c.status !== 'DISMISSED') {
                  <button (click)="resolve(c.id)">Resolve</button>
                  <button class="danger" (click)="update(c.id, { status: 'DISMISSED', resolution: 'Dismissed after review' })">Dismiss</button>
                }
              </td>
            </tr>
          } @empty { <tr><td colspan="6" class="muted">No cases.</td></tr> }
        </table>
      </div>
    }

    @if (isAdmin) {
      <div class="card">
        <h2 style="margin-top:0">Data retention & purge (tenant admin)</h2>
        <div class="row" style="align-items:flex-end">
          <e360-select-field
            label="Entity"
            [options]="retentionEntityOptions"
            [(ngModel)]="rf.entity"
          />
          <div><label>Retain (months)</label><input type="number" [(ngModel)]="rf.retainMonths" min="1" /></div>
          <div style="flex:0"><button class="secondary" (click)="setRetention()">Save policy</button></div>
          <div style="flex:0"><button class="secondary" (click)="preview()">Purge preview</button></div>
        </div>
        <table>
          <tr><th>Entity</th><th>Retention</th><th>Purge enabled</th><th>Rows eligible for purge</th></tr>
          @for (p of purge; track p.entity) {
            <tr><td>{{ p.entity }}</td><td>{{ p.retainMonths }} months</td>
                <td>{{ p.purgeEnabled ? 'yes' : 'no' }}</td><td><strong>{{ p.eligibleRows }}</strong></td></tr>
          } @empty { <tr><td colspan="4" class="muted">No retention policies yet.</td></tr> }
        </table>
        <p class="muted">Legal-hold cases and disabled policies are always excluded. Preview is a dry run — actual purge is a deliberate manual action.</p>
      </div>
    }
    </e360-module-shell>
  `,
})
export class ComplianceComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  error = '';
  mine: any[] = [];
  cases: any[] = [];
  purge: any[] = [];
  f: any = { type: 'INCIDENT', anonymous: false };
  rf: any = { entity: 'CANDIDATE', retainMonths: 24 };
  caseTypeOptions: SelectOption[] = [
    { value: 'CONFLICT_OF_INTEREST', label: 'Conflict of interest declaration' },
    { value: 'GRIEVANCE', label: 'Grievance' },
    { value: 'INCIDENT', label: 'Incident report' },
    { value: 'POSH', label: 'POSH complaint' },
    { value: 'WHISTLEBLOWER', label: 'Whistleblower report' },
  ];
  retentionEntityOptions: SelectOption[] = [
    { value: 'ATTENDANCE', label: 'ATTENDANCE' },
    { value: 'AUDIT_LOG', label: 'AUDIT_LOG' },
    { value: 'CANDIDATE', label: 'CANDIDATE' },
    { value: 'COMPLIANCE_CASE', label: 'COMPLIANCE_CASE' },
  ];

  get isHr() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }
  get isAdmin() { return this.auth.hasRole('TENANT_ADMIN'); }

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.mine = await this.api.get<any[]>('/compliance/cases/mine'); } catch { this.mine = []; }
    if (this.isHr) { try { this.cases = await this.api.get<any[]>('/compliance/cases'); } catch {} }
    if (this.isAdmin) { try { this.purge = await this.api.get<any[]>('/compliance/retention/purge-preview'); } catch {} }
  }
  async report() {
    try {
      await this.api.post('/compliance/cases', this.f);
      this.f = { type: 'INCIDENT', anonymous: false };
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async update(id: string, patch: any) {
    try { await this.api.patch(`/compliance/cases/${id}`, patch); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async resolve(id: string) {
    const resolution = prompt('Resolution note:') ?? 'Resolved';
    await this.update(id, { status: 'RESOLVED', resolution });
  }
  async setRetention() {
    try {
      await this.api.post('/compliance/retention', {
        entity: this.rf.entity, retainMonths: Number(this.rf.retainMonths),
      });
      await this.preview();
    } catch (e) { this.error = errMsg(e); }
  }
  async preview() {
    try { this.purge = await this.api.get<any[]>('/compliance/retention/purge-preview'); }
    catch (e) { this.error = errMsg(e); }
  }
}
