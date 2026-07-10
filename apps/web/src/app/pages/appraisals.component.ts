import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent],
  template: `
    <div class="toolbar"><h1>Appraisals</h1>
      <export-bar [rows]="cycles" [cols]="exportCols" name="appraisal-cycles" />
    </div>
    @if (error) { <div class="error">{{ error }}</div> }
    <div class="card">
      <h2>Create review cycle</h2>
      <div class="row">
        <div><label>Name</label><input [(ngModel)]="f.name" placeholder="FY27 Q2" /></div>
        <div><label>Frequency</label>
          <select [(ngModel)]="f.frequency">
            <option>QUARTERLY</option><option>HALF_YEARLY</option><option>YEARLY</option><option>MONTHLY</option><option>CUSTOM</option>
          </select>
        </div>
        <div><label>Start</label><input type="date" [(ngModel)]="f.startDate" /></div>
        <div><label>End</label><input type="date" [(ngModel)]="f.endDate" /></div>
      </div>
      <label>Template (sections / KRAs — free-form, one per line)</label>
      <textarea rows="3" [(ngModel)]="templateText" placeholder="Delivery quality
Team collaboration
Client feedback"></textarea>
      <button (click)="createCycle()">Create cycle</button>
    </div>
    <div class="card">
      <table>
        <tr><th>Cycle</th><th>Frequency</th><th>Window</th><th>Appraisals</th><th></th></tr>
        @for (c of cycles; track c.id) {
          <tr>
            <td>{{ c.name }}</td><td>{{ c.frequency }}</td>
            <td>{{ c.startDate | date }} – {{ c.endDate | date }}</td>
            <td>{{ c._count?.appraisals ?? 0 }}</td>
            <td><button class="secondary" (click)="launch(c.id)">Launch for all active employees</button></td>
          </tr>
        }
      </table>
    </div>
    <div class="card">
      <h2>My team's reviews</h2>
      <table>
        <tr><th>Employee</th><th>Cycle</th><th>Status</th><th>Rating</th></tr>
        @for (a of team; track a.id) {
          <tr>
            <td>{{ a.employee.user.firstName }} {{ a.employee.user.lastName }}</td>
            <td>{{ a.cycle.name }}</td>
            <td><span class="badge">{{ a.status }}</span></td>
            <td>{{ a.finalRating ?? '—' }}</td>
          </tr>
        } @empty { <tr><td colspan="4" class="muted">No team reviews assigned to you.</td></tr> }
      </table>
    </div>
  `,
})
export class AppraisalsComponent implements OnInit {
  private api = inject(ApiService);
  cycles: any[] = [];
  team: any[] = [];
  error = '';
  exportCols = [
    { key: 'name', label: 'Cycle' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'startDate', label: 'Start' },
    { key: 'endDate', label: 'End' },
    { key: '_count.appraisals', label: 'Appraisals' },
  ];
  f: any = { frequency: 'QUARTERLY' };
  templateText = '';

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.cycles = await this.api.get<any[]>('/appraisals/cycles'); } catch { this.cycles = []; }
    try { this.team = await this.api.get<any[]>('/appraisals/team'); } catch { this.team = []; }
  }
  async createCycle() {
    this.error = '';
    try {
      await this.api.post('/appraisals/cycles', {
        ...this.f,
        startDate: new Date(this.f.startDate).toISOString(),
        endDate: new Date(this.f.endDate).toISOString(),
        template: {
          sections: this.templateText.split('\n').map((s) => s.trim()).filter(Boolean),
          ratingScale: [1, 2, 3, 4, 5],
        },
      });
      this.f = { frequency: 'QUARTERLY' };
      this.templateText = '';
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async launch(id: string) {
    try { await this.api.post(`/appraisals/cycles/${id}/launch`); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
}
