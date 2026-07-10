import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent],
  template: `
    <div class="toolbar"><h1>Exit management</h1>
      <export-bar [rows]="resignations" [cols]="exportCols" name="resignations" />
    </div>
    @if (error) { <div class="error">{{ error }}</div> }

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
  `,
})
export class ExitComponent implements OnInit {
  private api = inject(ApiService);
  resignations: any[] = [];
  myClearances: any[] = [];
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
    try { this.myClearances = await this.api.get<any[]>('/exit/clearances/mine'); } catch { this.myClearances = []; }
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
