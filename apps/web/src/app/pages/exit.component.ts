import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Exit management"
      description="Resignations, clearances, and offboarding."
      icon="log-out"
      moduleKey="exit"
      auditEntityType="RESIGNATION"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Workforce' }, { label: 'Exit management' }]"
    >
      <div actions><export-bar [rows]="resignations" [cols]="exportCols" name="resignations" /></div>
@if (error) { <div class="e360-error">{{ error }}</div> }

    <!-- ══════════ MY RESIGNATION (employee self-service) ══════════ -->
    <div class="card">
      <h2 style="margin-top:0">My resignation</h2>
      @if (mine) {
        <div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-bottom:.75rem">
          @for (s of stages; track s) {
            <span class="badge" [class.ok]="stageIdx(mine.status) > stages.indexOf(s)"
                  [class.warn]="mine.status === s">{{ s }}</span>
            @if (!$last) { <span class="muted">→</span> }
          }
        </div>
        <div class="row">
          <div><label>Reason</label><div>{{ mine.reason ?? '—' }}</div></div>
          <div><label>Submitted</label><div>{{ mine.submittedAt | date }}</div></div>
          <div><label>Agreed last working day</label><div>{{ mine.agreedLastDay ? (mine.agreedLastDay | date) : 'not set yet' }}</div></div>
        </div>
        @if (mine.clearances?.length) {
          <label>Departmental clearances (NOCs)</label>
          <table>
            <tr><th>Department</th><th>Status</th><th>Remarks</th></tr>
            @for (c of mine.clearances; track c.id) {
              <tr><td>{{ c.department.name }}</td>
                  <td><span class="badge" [class.ok]="c.status==='SIGNED_OFF'" [class.err]="c.status==='REJECTED'">{{ c.status }}</span></td>
                  <td>{{ c.remarks ?? '' }}</td></tr>
            }
          </table>
        }
        @if (mine.status === 'SUBMITTED' || mine.status === 'APPROVAL') {
          <button class="danger" style="margin-top:.6rem" (click)="withdraw()">Withdraw resignation</button>
        }
      } @else if (hasEmployeeRecord) {
        <p class="muted">You have no resignation on record. To resign, fill in the form below — it will be routed
          through the configured approval chain to your manager and HR.</p>
        <div class="row" style="align-items:flex-end">
          <div><label>Reason</label><input [(ngModel)]="rf.reason" placeholder="e.g. relocation, higher studies" /></div>
          <div><label>Requested last working day</label><input type="date" [(ngModel)]="rf.lastDay" /></div>
          <div style="flex:0"><button class="danger" (click)="submitResignation()" [disabled]="!rf.reason || !rf.lastDay">Submit resignation</button></div>
        </div>
      } @else {
        <p class="muted">No employee record linked to this account.</p>
      }
    </div>

    <div class="card">
      <h2>Clearances waiting on me (department NOCs)</h2>
      <table>
        <tr><th>Leaver</th><th>Department</th><th>Held assets</th><th></th></tr>
        @for (cl of myClearances; track cl.id) {
          <tr>
            <td>{{ cl.resignation.employee.user.firstName }} {{ cl.resignation.employee.user.lastName }}</td>
            <td>{{ cl.department.name }}</td>
            <td>
              @for (a of cl.resignation.employee.assetAssignments; track a.id) {
                <span class="badge warn" style="margin-right:.25rem">{{ a.asset.assetTag }}</span>
              } @empty { <span class="muted">none</span> }
            </td>
            <td>
              <button (click)="signOff(cl.id)">Sign off NOC</button>
              <button class="danger" (click)="rejectNoc(cl.id)">Reject</button>
            </td>
          </tr>
        } @empty { <tr><td colspan="4" class="muted">No clearances assigned to you.</td></tr> }
      </table>
    </div>

    <h2>Resignations</h2>
    @for (r of resignations; track r.id) {
      <div class="card">
        <div class="toolbar" style="margin-bottom:.25rem">
          <strong>{{ r.employee.user.firstName }} {{ r.employee.user.lastName }}
            <span class="muted">({{ r.employee.employeeCode }} · {{ r.employee.designation }})</span></strong>
          <span class="badge" [class.ok]="r.status==='RELEASED'" [class.warn]="r.status!=='RELEASED'">{{ r.status }}</span>
        </div>
        <p class="muted">Submitted {{ r.submittedAt | date }} · reason: {{ r.reason ?? '—' }}</p>
        @if (r.clearances?.length) {
          <p>Clearances: {{ signedCount(r) }}/{{ r.clearances.length }} signed off</p>
        }
        <div class="row" style="align-items:flex-end">
          @if (r.status === 'SUBMITTED' || r.status === 'APPROVAL' || r.status === 'ACCEPTED') {
            <div><label>Agreed last working day</label><input type="date" [(ngModel)]="r._lastDay" /></div>
            <div style="flex:0"><button class="secondary" (click)="accept(r)">Accept resignation</button></div>
          }
          @if (r.status === 'ACCEPTED') {
            <div style="flex:0"><button class="secondary" (click)="initClearances(r.id)">Start departmental NOCs</button></div>
          }
          @if (r.status === 'FNF') {
            <div><label>Net payable (F&F)</label><input type="number" [(ngModel)]="r._net" /></div>
            <div style="flex:0"><button class="secondary" (click)="fnf(r)">Record F&F</button></div>
            <div style="flex:0"><button (click)="release(r.id)">Release employee</button></div>
          }
        </div>
      </div>
    } @empty { <div class="card muted">No resignations.</div> }
  
    </e360-module-shell>
  `,
})
export class ExitComponent implements OnInit {
  private api = inject(ApiService);
  resignations: any[] = [];
  myClearances: any[] = [];
  mine: any = null;
  hasEmployeeRecord = false;
  rf: any = {};
  stages = ['SUBMITTED', 'APPROVAL', 'ACCEPTED', 'CLEARANCE', 'FNF', 'RELEASED'];
  error = '';
  exportCols = [
    { key: 'employee.employeeCode', label: 'Code' },
    { key: 'employee.user.firstName', label: 'First name' },
    { key: 'employee.user.lastName', label: 'Last name' },
    { key: 'employee.designation', label: 'Designation' },
    { key: 'status', label: 'Status' },
    { key: 'submittedAt', label: 'Submitted' },
    { key: 'agreedLastDay', label: 'Last working day' },
  ];

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.resignations = await this.api.get<any[]>('/exit/resignations'); } catch { this.resignations = []; }
    try { this.myClearances = await this.api.get<any[]>('/exit/clearances/mine'); this.hasEmployeeRecord = true; } catch { this.myClearances = []; }
    try {
      this.mine = await this.api.get<any>('/exit/resignations/mine');
      this.hasEmployeeRecord = true;
      if (this.mine && this.mine.status === 'WITHDRAWN') this.mine = null;
    } catch { this.mine = null; }
  }
  stageIdx(s: string) { return this.stages.indexOf(s); }
  async submitResignation() {
    try {
      await this.api.post('/exit/resignations', {
        reason: this.rf.reason,
        requestedLastDay: new Date(this.rf.lastDay).toISOString(),
      });
      this.rf = {};
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async withdraw() {
    try { await this.api.post('/exit/resignations/withdraw'); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  signedCount(r: any) {
    return (r.clearances ?? []).filter((c: any) => c.status === 'SIGNED_OFF').length;
  }
  async accept(r: any) {
    try {
      await this.api.post(`/exit/resignations/${r.id}/accept`, {
        agreedLastDay: new Date(r._lastDay).toISOString(),
      });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async initClearances(id: string) {
    try { await this.api.post(`/exit/resignations/${id}/clearances/init`); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async signOff(id: string) {
    try { await this.api.post(`/exit/clearances/${id}/sign-off`, { remarks: 'All clear' }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async rejectNoc(id: string) {
    try { await this.api.post(`/exit/clearances/${id}/reject`, { remarks: 'Pending items' }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async fnf(r: any) {
    try {
      await this.api.post(`/exit/resignations/${r.id}/fnf`, {
        breakup: { netPayable: Number(r._net) },
        netPayable: Number(r._net),
      });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async release(id: string) {
    try { await this.api.post(`/exit/resignations/${id}/release`); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
}
