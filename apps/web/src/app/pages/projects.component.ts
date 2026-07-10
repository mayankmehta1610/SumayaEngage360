import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="toolbar"><h1>Projects & allocation</h1></div>
    @if (error) { <div class="error">{{ error }}</div> }
    <div class="card">
      <h2>Create project</h2>
      <div class="row">
        <div><label>Name</label><input [(ngModel)]="f.name" /></div>
        <div><label>Code</label><input [(ngModel)]="f.code" placeholder="PRJ-001" /></div>
        <div>
          <label>Client (empty = internal)</label>
          <select [(ngModel)]="f.hiringClientId">
            <option [ngValue]="undefined">— internal —</option>
            @for (c of clients; track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
          </select>
        </div>
        <div><label>Deployment location</label><input [(ngModel)]="f.location" /></div>
        <div>
          <label>Project manager</label>
          <select [(ngModel)]="f.managerId">
            <option [ngValue]="undefined">choose…</option>
            @for (e of employees; track e.id) { <option [ngValue]="e.id">{{ e.user.firstName }} {{ e.user.lastName }}</option> }
          </select>
        </div>
      </div>
      <button (click)="create()">Create project</button>
    </div>

    @for (p of projects; track p.id) {
      <div class="card">
        <div class="toolbar" style="margin-bottom:.25rem">
          <strong>{{ p.name }} <span class="muted">({{ p.code }})</span></strong>
          <span class="badge">{{ p.client?.name ?? 'internal' }}</span>
        </div>
        <div class="row" style="align-items:flex-end">
          <div>
            <label>Allocate employee</label>
            <select [(ngModel)]="p._emp">
              <option [ngValue]="undefined">choose…</option>
              @for (e of employees; track e.id) { <option [ngValue]="e.id">{{ e.user.firstName }} {{ e.user.lastName }}</option> }
            </select>
          </div>
          <div><label>%</label><input type="number" [(ngModel)]="p._pct" min="1" max="100" /></div>
          <div><label>From</label><input type="date" [(ngModel)]="p._from" /></div>
          <div style="flex:0"><button class="secondary" (click)="allocate(p)">Allocate</button></div>
        </div>
        <p class="muted">Allocating sets the project manager as the employee's reporting manager (first allocation).</p>
      </div>
    }
  `,
})
export class ProjectsComponent implements OnInit {
  private api = inject(ApiService);
  projects: any[] = [];
  clients: any[] = [];
  employees: any[] = [];
  error = '';
  f: any = {};

  async ngOnInit() { await this.load(); }
  async load() {
    try {
      [this.projects, this.employees] = await Promise.all([
        this.api.get<any[]>('/projects'),
        this.api.get<any[]>('/employees'),
      ]);
      try { this.clients = await this.api.get<any[]>('/hiring-clients'); } catch {}
    } catch (e) { this.error = errMsg(e); }
  }
  async create() {
    try { await this.api.post('/projects', this.f); this.f = {}; await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async allocate(p: any) {
    try {
      await this.api.post(`/projects/${p.id}/allocations`, {
        employeeId: p._emp,
        percentage: Number(p._pct ?? 100),
        startDate: new Date(p._from ?? Date.now()).toISOString(),
      });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
