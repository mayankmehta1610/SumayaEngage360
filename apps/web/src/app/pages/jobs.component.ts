import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="toolbar"><h1>Jobs</h1></div>
    <div class="card">
      <h2>Create job</h2>
      <div class="row">
        <div><label>Title</label><input [(ngModel)]="f.title" /></div>
        <div>
          <label>Hiring client</label>
          <select [(ngModel)]="f.hiringClientId">
            <option [ngValue]="undefined">— none —</option>
            @for (c of clients; track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
          </select>
        </div>
        <div><label>Location</label><input [(ngModel)]="f.location" /></div>
        <div><label>Vacancies</label><input type="number" [(ngModel)]="f.vacancies" /></div>
      </div>
      <label>Job description (JD)</label>
      <textarea rows="4" [(ngModel)]="f.description"></textarea>
      <label>Skills (comma separated)</label>
      <input [(ngModel)]="skills" placeholder="Angular, NestJS, SQL" />
      <label>Interview rounds (comma separated, in order)</label>
      <input [(ngModel)]="rounds" placeholder="Screening, Technical, Managerial, HR" />
      @if (error) { <div class="error">{{ error }}</div> }
      <button (click)="create()">Create job</button>
    </div>
    <div class="card">
      <table>
        <tr><th>Title</th><th>Client</th><th>Location</th><th>Vacancies</th><th>Applications</th><th>Status</th><th></th></tr>
        @for (j of jobs; track j.id) {
          <tr>
            <td>{{ j.title }}</td>
            <td>{{ j.hiringClient?.name ?? '—' }}</td>
            <td>{{ j.location }}</td>
            <td>{{ j.vacancies }}</td>
            <td>{{ j._count?.applications ?? 0 }}</td>
            <td><span class="badge" [class.ok]="j.status === 'PUBLISHED'">{{ j.status }}</span></td>
            <td>
              @if (j.status === 'DRAFT') {
                <button (click)="publish(j.id)">Publish</button>
              }
            </td>
          </tr>
        }
      </table>
    </div>
  `,
})
export class JobsComponent implements OnInit {
  private api = inject(ApiService);
  jobs: any[] = [];
  clients: any[] = [];
  error = '';
  f: any = { vacancies: 1 };
  skills = '';
  rounds = '';

  async ngOnInit() {
    await this.load();
    try {
      this.clients = await this.api.get<any[]>('/hiring-clients');
    } catch { /* role may not allow; job creation still works without */ }
  }
  async load() {
    try {
      this.jobs = await this.api.get<any[]>('/jobs');
    } catch (e) {
      this.error = errMsg(e);
    }
  }
  async create() {
    this.error = '';
    try {
      const body = {
        ...this.f,
        skills: this.skills.split(',').map((s) => s.trim()).filter(Boolean),
        interviewPlan: this.rounds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((name, i) => ({ level: i + 1, name })),
      };
      await this.api.post('/jobs', body);
      this.f = { vacancies: 1 };
      this.skills = this.rounds = '';
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
  async publish(id: string) {
    try {
      await this.api.post(`/jobs/${id}/publish`);
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
}
