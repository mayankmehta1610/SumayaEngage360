import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="toolbar"><h1>Trainings</h1></div>
    @if (error) { <div class="error">{{ error }}</div> }
    <div class="card">
      <h2>Create course</h2>
      <div class="row">
        <div><label>Title</label><input [(ngModel)]="f.title" /></div>
        <div><label>Video title</label><input [(ngModel)]="v.title" /></div>
        <div><label>Video URL (stream)</label><input [(ngModel)]="v.streamUrl" /></div>
        <div><label>Duration (seconds)</label><input type="number" [(ngModel)]="v.durationSeconds" /></div>
      </div>
      <label>
        <input type="checkbox" [(ngModel)]="f.mandatory" style="width:auto;margin-right:.4rem" />
        Mandatory (locked player — no skip/close, server-verified completion)
      </label><br />
      <label>
        <input type="checkbox" [(ngModel)]="f.forOnboarding" style="width:auto;margin-right:.4rem" />
        Part of onboarding
      </label>
      <div style="margin-top:.75rem"><button (click)="create()">Create course</button></div>
    </div>
    @for (c of courses; track c.id) {
      <div class="card">
        <div class="toolbar" style="margin-bottom:.25rem">
          <strong>{{ c.title }}</strong>
          <span>
            @if (c.mandatory) { <span class="badge warn">mandatory</span> }
            @if (c.forOnboarding) { <span class="badge">onboarding</span> }
            <span class="badge">{{ c._count?.assignments ?? 0 }} assigned</span>
          </span>
        </div>
        <p class="muted">
          @for (vd of c.videos; track vd.id) { {{ vd.title }} ({{ vd.durationSeconds }}s){{ $last ? '' : ' · ' }} }
        </p>
        <div class="row" style="align-items:flex-end">
          <div>
            <label>Assign to</label>
            <select [(ngModel)]="c._emp">
              <option [ngValue]="undefined">choose employee…</option>
              @for (e of employees; track e.id) { <option [ngValue]="e.id">{{ e.user.firstName }} {{ e.user.lastName }}</option> }
            </select>
          </div>
          <div style="flex:0"><button class="secondary" (click)="assign(c)">Assign</button></div>
        </div>
      </div>
    }
  `,
})
export class TrainingsComponent implements OnInit {
  private api = inject(ApiService);
  courses: any[] = [];
  employees: any[] = [];
  error = '';
  f: any = { mandatory: true };
  v: any = { durationSeconds: 300 };

  async ngOnInit() { await this.load(); }
  async load() {
    try {
      [this.courses, this.employees] = await Promise.all([
        this.api.get<any[]>('/trainings/courses'),
        this.api.get<any[]>('/employees'),
      ]);
    } catch (e) { this.error = errMsg(e); }
  }
  async create() {
    this.error = '';
    try {
      await this.api.post('/trainings/courses', {
        ...this.f,
        videos: this.v.title
          ? [{ title: this.v.title, streamUrl: this.v.streamUrl,
               durationSeconds: Number(this.v.durationSeconds), noSkip: !!this.f.mandatory }]
          : [],
      });
      this.f = { mandatory: true };
      this.v = { durationSeconds: 300 };
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async assign(c: any) {
    if (!c._emp) return;
    try {
      await this.api.post(`/trainings/courses/${c.id}/assign`, { employeeIds: [c._emp] });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
