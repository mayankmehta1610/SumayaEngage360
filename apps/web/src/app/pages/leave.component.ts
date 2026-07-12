import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent, ModuleShellComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Attendance & leave"
      description="Check-in/out, leave balances, requests, and manager approvals."
      icon="calendar-days"
      moduleKey="leave"
      auditEntityType="LEAVE_REQUEST"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Operations' }, { label: 'Attendance & leave' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }

    <!-- ══════════ TODAY (check-in / check-out) ══════════ -->
    <div class="card">
      <h2 style="margin-top:0">⏰ Today</h2>
      @if (today) {
        <p>
          Checked in: <strong>{{ today.inAt ? (today.inAt | date: 'shortTime') : '—' }}</strong>
          @if (today.late) { <span class="badge warn">late</span> }
          · Checked out: <strong>{{ today.outAt ? (today.outAt | date: 'shortTime') : '—' }}</strong>
        </p>
      }
      <div style="display:flex;gap:.5rem">
        <button (click)="checkIn()" [disabled]="!!today?.inAt">✅ Check in</button>
        <button class="secondary" (click)="checkOut()" [disabled]="!today?.inAt || !!today?.outAt">🏁 Check out</button>
      </div>
    </div>

    <div class="row">
      <!-- ══════════ MY ATTENDANCE ══════════ -->
      <div class="card">
        <div class="toolbar" style="margin-bottom:.25rem"><h2 style="margin:0">My attendance (30 days)</h2>
          <export-bar [rows]="punches" [cols]="punchCols" name="my-attendance" />
        </div>
        <table>
          <tr><th>Date</th><th>In</th><th>Out</th><th>Late</th><th>Source</th></tr>
          @for (p of punches; track p.id) {
            <tr>
              <td>{{ p.workDate | date }}</td>
              <td>{{ p.inAt ? (p.inAt | date: 'shortTime') : '—' }}</td>
              <td>{{ p.outAt ? (p.outAt | date: 'shortTime') : '—' }}</td>
              <td>@if (p.late) { <span class="badge warn">late</span> }</td>
              <td>{{ p.source }}</td>
            </tr>
          } @empty { <tr><td colspan="5" class="muted">No punches yet — check in above.</td></tr> }
        </table>
        <h2>Fix a missing punch (regularization)</h2>
        <div class="row" style="align-items:flex-end">
          <div><label>Date</label><input type="date" [(ngModel)]="reg.workDate" /></div>
          <div><label>Correct in-time</label><input type="datetime-local" [(ngModel)]="reg.requestedIn" /></div>
          <div><label>Correct out-time</label><input type="datetime-local" [(ngModel)]="reg.requestedOut" /></div>
        </div>
        <label>Reason</label><input [(ngModel)]="reg.reason" placeholder="e.g. forgot to punch out" />
        <button class="secondary" style="margin-top:.4rem" (click)="submitReg()" [disabled]="!reg.workDate || !reg.reason">Request correction</button>
        @for (r of myRegs; track r.id) {
          <div style="border-top:1px solid #eef1f6;padding:.4rem 0">
            {{ r.workDate | date }} — {{ r.reason }}
            <span class="badge" [class.ok]="r.status==='APPROVED'" [class.err]="r.status==='REJECTED'">{{ r.status }}</span>
          </div>
        }
      </div>

      <!-- ══════════ MY LEAVE ══════════ -->
      <div class="card">
        <h2 style="margin-top:0">🌴 My leave balances ({{ year }})</h2>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.75rem">
          @for (b of balances; track b.leaveType.id) {
            <div style="border:1px solid #e3e8f0;border-radius:10px;padding:.6rem .9rem;min-width:120px">
              <div style="font-size:1.4rem;font-weight:700">{{ b.remaining }}</div>
              <div class="muted" style="font-size:.75rem">{{ b.leaveType.name }} ({{ b.leaveType.code }})<br/>of {{ b.allocated }}</div>
            </div>
          } @empty { <span class="muted">No leave types configured yet.</span> }
        </div>
        <h2>Apply for leave</h2>
        <div class="row" style="align-items:flex-end">
          <e360-select-field
            label="Type"
            placeholder="choose…"
            [options]="leaveTypeOptions"
            [(ngModel)]="lr.leaveTypeId"
          />
          <div><label>From</label><input type="date" [(ngModel)]="lr.startDate" /></div>
          <div><label>To</label><input type="date" [(ngModel)]="lr.endDate" /></div>
        </div>
        <label>Reason</label><input [(ngModel)]="lr.reason" />
        <button style="margin-top:.4rem" (click)="applyLeave()" [disabled]="!lr.leaveTypeId || !lr.startDate || !lr.endDate">Submit leave request</button>
        <table style="margin-top:.75rem">
          <tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th></th></tr>
          @for (r of myLeave; track r.id) {
            <tr>
              <td>{{ r.leaveType.code }}</td>
              <td>{{ r.startDate | date }} – {{ r.endDate | date }}</td>
              <td>{{ r.days }}</td>
              <td><span class="badge" [class.ok]="r.status==='APPROVED'" [class.err]="r.status==='REJECTED'">{{ r.status }}</span>
                  @if (r.actionNote) { <span class="muted">{{ r.actionNote }}</span> }</td>
              <td>@if (r.status === 'PENDING' || r.status === 'APPROVED') {
                <button class="danger" (click)="cancelLeave(r.id)">Cancel</button>
              }</td>
            </tr>
          } @empty { <tr><td colspan="5" class="muted">No leave requests yet.</td></tr> }
        </table>
      </div>
    </div>

    <!-- ══════════ MANAGER INBOX ══════════ -->
    @if (pendingLeave.length || pendingRegs.length) {
      <div class="card">
        <h2 style="margin-top:0">👥 Waiting for my approval</h2>
        @for (r of pendingLeave; track r.id) {
          <div class="row" style="align-items:center;border-bottom:1px solid #eef1f6;padding:.45rem 0">
            <div style="flex:3">🌴 <strong>{{ r.employee?.user?.firstName }} {{ r.employee?.user?.lastName }}</strong>
              — {{ r.leaveType.name }}, {{ r.startDate | date }} – {{ r.endDate | date }} ({{ r.days }}d)
              <span class="muted">{{ r.reason }}</span></div>
            <div style="flex:0;white-space:nowrap">
              <button (click)="actLeave(r.id, true)">Approve</button>
              <button class="danger" (click)="actLeave(r.id, false)">Reject</button>
            </div>
          </div>
        }
        @for (r of pendingRegs; track r.id) {
          <div class="row" style="align-items:center;border-bottom:1px solid #eef1f6;padding:.45rem 0">
            <div style="flex:3">⏰ <strong>{{ r.employee?.user?.firstName }} {{ r.employee?.user?.lastName }}</strong>
              — attendance correction for {{ r.workDate | date }} <span class="muted">{{ r.reason }}</span></div>
            <div style="flex:0;white-space:nowrap">
              <button (click)="actReg(r.id, true)">Approve</button>
              <button class="danger" (click)="actReg(r.id, false)">Reject</button>
            </div>
          </div>
        }
      </div>
    }

    <!-- ══════════ TEAM CALENDAR + HR ══════════ -->
    @if (isOps) {
      <div class="row">
        <div class="card">
          <div class="toolbar" style="margin-bottom:.25rem"><h2 style="margin:0">Attendance register (today)</h2>
            <export-bar [rows]="register" [cols]="registerCols" name="attendance-register" />
          </div>
          <table>
            <tr><th>Employee</th><th>In</th><th>Out</th><th>Status</th></tr>
            @for (r of register; track r.employee.id) {
              <tr>
                <td>{{ r.employee.user.firstName }} {{ r.employee.user.lastName }} <span class="muted">({{ r.employee.employeeCode }})</span></td>
                <td>{{ r.inAt ? (r.inAt | date: 'shortTime') : '—' }}</td>
                <td>{{ r.outAt ? (r.outAt | date: 'shortTime') : '—' }}</td>
                <td>@if (r.present) { <span class="badge" [class.ok]="!r.late" [class.warn]="r.late">{{ r.late ? 'late' : 'present' }}</span> }
                    @else { <span class="badge err">absent</span> }</td>
              </tr>
            }
          </table>
        </div>
        <div class="card">
          <h2 style="margin-top:0">Leave calendar (this month, approved)</h2>
          @for (c of calendar; track c.id) {
            <div style="border-bottom:1px solid #eef1f6;padding:.4rem 0">
              <span class="badge">{{ c.leaveType.code }}</span>
              {{ c.employee?.user?.firstName }} {{ c.employee?.user?.lastName }} —
              {{ c.startDate | date }} to {{ c.endDate | date }} ({{ c.days }}d)
            </div>
          } @empty { <p class="muted">No approved leave this month.</p> }
          @if (isHr) {
            <h2>Configure leave types (HR)</h2>
            <div class="row" style="align-items:flex-end">
              <div><label>Code</label><input [(ngModel)]="lt.code" placeholder="AL" /></div>
              <div><label>Name</label><input [(ngModel)]="lt.name" placeholder="Annual Leave" /></div>
              <div><label>Days / year</label><input type="number" [(ngModel)]="lt.annualQuota" /></div>
              <div style="flex:0"><button class="secondary" (click)="addType()" [disabled]="!lt.code || !lt.name">Add</button></div>
            </div>
            @for (t of types; track t.id) { <span class="badge" style="margin-right:.3rem">{{ t.code }} · {{ t.annualQuota }}d</span> }
          }
        </div>
      </div>
    }
  
    </e360-module-shell>
  `,
})
export class LeaveComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  error = '';
  year = new Date().getUTCFullYear();
  punches: any[] = [];
  today: any = null;
  myRegs: any[] = [];
  balances: any[] = [];
  types: any[] = [];
  myLeave: any[] = [];
  pendingLeave: any[] = [];
  pendingRegs: any[] = [];
  register: any[] = [];
  calendar: any[] = [];
  reg: any = {};
  lr: any = {};
  lt: any = { annualQuota: 18 };
  punchCols = [
    { key: 'workDate', label: 'Date' }, { key: 'inAt', label: 'In' },
    { key: 'outAt', label: 'Out' }, { key: 'late', label: 'Late' }, { key: 'source', label: 'Source' },
  ];
  registerCols = [
    { key: 'employee.employeeCode', label: 'Code' },
    { key: 'employee.user.firstName', label: 'First name' },
    { key: 'employee.user.lastName', label: 'Last name' },
    { key: 'inAt', label: 'In' }, { key: 'outAt', label: 'Out' },
    { key: 'present', label: 'Present' }, { key: 'late', label: 'Late' },
  ];

  get isHr() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }
  get isOps() { return this.auth.hasRole('TENANT_ADMIN', 'HR', 'MANAGER'); }

  get leaveTypeOptions(): SelectOption[] {
    return this.types.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }));
  }

  async ngOnInit() { await this.load(); }

  async load() {
    try {
      this.punches = await this.api.get<any[]>('/attendance/mine');
      const todayKey = new Date().toISOString().slice(0, 10);
      this.today = this.punches.find((p) => String(p.workDate).slice(0, 10) === todayKey) ?? null;
      this.myRegs = await this.api.get<any[]>('/attendance/regularizations/mine');
      this.balances = await this.api.get<any[]>('/leave/balances/mine');
      this.myLeave = await this.api.get<any[]>('/leave/requests/mine');
      this.pendingLeave = await this.api.get<any[]>('/leave/requests/pending');
      this.pendingRegs = await this.api.get<any[]>('/attendance/regularizations/pending');
    } catch { /* non-employee accounts (platform admin) have no records */ }
    try { this.types = await this.api.get<any[]>('/leave/types'); } catch {}
    if (this.isOps) {
      try { this.register = await this.api.get<any[]>('/attendance/register'); } catch {}
      try { this.calendar = await this.api.get<any[]>('/leave/calendar'); } catch {}
    }
  }

  async checkIn() { try { await this.api.post('/attendance/check-in'); await this.load(); } catch (e) { this.error = errMsg(e); } }
  async checkOut() { try { await this.api.post('/attendance/check-out'); await this.load(); } catch (e) { this.error = errMsg(e); } }
  async submitReg() {
    try {
      await this.api.post('/attendance/regularizations', {
        workDate: new Date(this.reg.workDate).toISOString(),
        requestedIn: this.reg.requestedIn ? new Date(this.reg.requestedIn).toISOString() : undefined,
        requestedOut: this.reg.requestedOut ? new Date(this.reg.requestedOut).toISOString() : undefined,
        reason: this.reg.reason,
      });
      this.reg = {}; this.error = '';
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async applyLeave() {
    try {
      await this.api.post('/leave/requests', {
        leaveTypeId: this.lr.leaveTypeId,
        startDate: new Date(this.lr.startDate).toISOString(),
        endDate: new Date(this.lr.endDate).toISOString(),
        reason: this.lr.reason,
      });
      this.lr = {}; this.error = '';
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async cancelLeave(id: string) { try { await this.api.post(`/leave/requests/${id}/cancel`); await this.load(); } catch (e) { this.error = errMsg(e); } }
  async actLeave(id: string, ok: boolean) {
    try { await this.api.post(`/leave/requests/${id}/${ok ? 'approve' : 'reject'}`, { note: '' }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async actReg(id: string, ok: boolean) {
    try { await this.api.post(`/attendance/regularizations/${id}/${ok ? 'approve' : 'reject'}`, { note: '' }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async addType() {
    try {
      await this.api.post('/leave/types', { code: this.lt.code, name: this.lt.name, annualQuota: Number(this.lt.annualQuota) });
      this.lt = { annualQuota: 18 };
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
