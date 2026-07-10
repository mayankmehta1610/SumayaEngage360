import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="toolbar"><h1>Onboarding</h1></div>
    @if (error) { <div class="error">{{ error }}</div> }

    <div class="card">
      <h2>Document requirements (per country)</h2>
      <div class="row" style="align-items:flex-end">
        <div><label>Country</label><input [(ngModel)]="req.country" placeholder="IN" /></div>
        <div><label>Code</label><input [(ngModel)]="req.code" placeholder="AADHAAR" /></div>
        <div><label>Name</label><input [(ngModel)]="req.name" placeholder="Aadhaar card" /></div>
        <div style="flex:0"><button class="secondary" (click)="addReq()">Add</button></div>
      </div>
      <table>
        <tr><th>Country</th><th>Code</th><th>Name</th><th>Mandatory</th></tr>
        @for (r of requirements; track r.id) {
          <tr><td>{{ r.country }}</td><td>{{ r.code }}</td><td>{{ r.name }}</td><td>{{ r.mandatory ? 'yes' : 'no' }}</td></tr>
        }
      </table>
    </div>

    <h2>Cases</h2>
    @for (c of cases; track c.id) {
      <div class="card">
        <div class="toolbar" style="margin-bottom:.25rem">
          <strong>{{ c.employee.user.firstName }} {{ c.employee.user.lastName }}
            <span class="muted">({{ c.employee.employeeCode }})</span></strong>
          <span class="badge" [class.ok]="c.status === 'COMPLETED'">{{ c.status }}</span>
        </div>
        <table>
          <tr><th>Document</th><th>Status</th><th></th></tr>
          @for (d of c.employee.documents; track d.id) {
            <tr>
              <td>{{ d.code }}</td>
              <td><span class="badge" [class.ok]="d.status==='VERIFIED'" [class.err]="d.status==='REJECTED'">{{ d.status }}</span></td>
              <td>
                @if (d.status === 'SUBMITTED') {
                  <button class="secondary" (click)="verify(d.id, true)">Verify</button>
                  <button class="danger" (click)="verify(d.id, false)">Reject</button>
                }
              </td>
            </tr>
          } @empty { <tr><td colspan="3" class="muted">No documents submitted yet</td></tr> }
        </table>
        @if (c.status !== 'COMPLETED') {
          <button style="margin-top:.5rem" (click)="approve(c.id)">Approve onboarding → employee ACTIVE</button>
        }
      </div>
    } @empty { <div class="card muted">No onboarding cases yet.</div> }
  `,
})
export class OnboardingComponent implements OnInit {
  private api = inject(ApiService);
  cases: any[] = [];
  requirements: any[] = [];
  error = '';
  req: any = { country: 'IN' };

  async ngOnInit() { await this.load(); }
  async load() {
    try {
      [this.cases, this.requirements] = await Promise.all([
        this.api.get<any[]>('/onboarding/cases'),
        this.api.get<any[]>('/onboarding/requirements'),
      ]);
    } catch (e) { this.error = errMsg(e); }
  }
  async addReq() {
    try {
      await this.api.post('/onboarding/requirements', this.req);
      this.req = { country: this.req.country };
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async verify(id: string, approve: boolean) {
    try {
      await this.api.post(`/onboarding/documents/${id}/verify`, {
        approve, rejectionReason: approve ? undefined : 'Not legible / mismatch',
      });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async approve(id: string) {
    try {
      await this.api.post(`/onboarding/cases/${id}/approve`);
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
