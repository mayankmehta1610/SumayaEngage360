import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { environment } from '../../environments/environment';

// Pipeline view: status changes, interview rounds (recording + mandatory
// screenshot before pass/fail), and offer creation/sending.
@Component({
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="toolbar"><h1>Applications</h1></div>
    @if (error) { <div class="error">{{ error }}</div> }
    @for (a of applications; track a.id) {
      <div class="card">
        <div class="toolbar" style="margin-bottom:.25rem">
          <div>
            <strong>{{ a.candidate.firstName }} {{ a.candidate.lastName }}</strong>
            <span class="muted"> · {{ a.candidate.email }} · applied to </span>
            <strong>{{ a.job.title }}</strong>
          </div>
          <div>
            <span class="badge" [class.ok]="a.status === 'HIRED' || a.status === 'OFFER_ACCEPTED'"
                  [class.err]="a.status === 'REJECTED'">{{ a.status }}</span>
          </div>
        </div>
        <div class="row" style="align-items:flex-end">
          <div>
            <label>Move to status</label>
            <select [(ngModel)]="a._status">
              @for (s of statuses; track s) { <option [ngValue]="s">{{ s }}</option> }
            </select>
          </div>
          <div style="flex:0"><button class="secondary" (click)="setStatus(a)">Update</button></div>
        </div>

        <h2>Interview rounds</h2>
        <table>
          <tr><th>Level</th><th>Name</th><th>Scheduled</th><th>Result</th><th>Recording</th><th>Screenshot</th><th></th></tr>
          @for (r of a.interviews; track r.id) {
            <tr>
              <td>{{ r.level }}</td><td>{{ r.name }}</td>
              <td>{{ r.scheduledAt | date: 'short' }}</td>
              <td><span class="badge" [class.ok]="r.result==='PASSED'" [class.err]="r.result==='FAILED'">{{ r.result }}</span></td>
              <td>{{ r.recordingUrl || r.recordingFileId ? '✔' : '—' }}</td>
              <td>{{ r.screenshotFileId ? '✔' : '—' }}</td>
              <td>
                @if (r.result === 'PENDING') {
                  <button class="secondary" (click)="openResult(r)">Record result</button>
                }
              </td>
            </tr>
          }
        </table>
        @if (resultRound && resultRound.applicationId === a.id) {
          <div style="background:#f7f9fd;border-radius:8px;padding: .75rem;margin-top:.5rem">
            <h2 style="margin-top:0">Result — {{ resultRound.name }}</h2>
            <div class="row">
              <div><label>Rating (1–10)</label><input type="number" [(ngModel)]="res.rating" /></div>
              <div>
                <label>Result</label>
                <select [(ngModel)]="res.result">
                  <option>PASSED</option><option>FAILED</option><option>NO_SHOW</option>
                </select>
              </div>
              <div><label>Recording URL (Teams/Zoom link)</label><input [(ngModel)]="res.recordingUrl" /></div>
            </div>
            <label>Feedback</label>
            <textarea rows="2" [(ngModel)]="res.feedback"></textarea>
            <label>Screenshot (mandatory proof)</label>
            <input type="file" accept="image/*" (change)="screenshotFile = fileOf($event)" />
            <div style="margin-top:.5rem">
              <button (click)="saveResult()">Save result</button>
              <button class="secondary" (click)="resultRound = null">Cancel</button>
            </div>
          </div>
        }
        <div class="row" style="margin-top: .75rem; align-items:flex-end">
          <div><label>Next round name</label><input [(ngModel)]="a._roundName" placeholder="Technical" /></div>
          <div><label>Interview date/time</label><input type="datetime-local" [(ngModel)]="a._roundAt" /></div>
          <div><label>Mode</label>
            <select [(ngModel)]="a._roundMode"><option>TEAMS</option><option>ZOOM</option><option>MEET</option><option>IN_PERSON</option></select>
          </div>
          <div style="flex:0"><button class="secondary" (click)="schedule(a)">Schedule round</button></div>
        </div>

        @if (!a.offer && a.status === 'SELECTED') {
          <h2>Create offer</h2>
          <div class="row">
            <div><label>Designation</label><input [(ngModel)]="a._designation" /></div>
            <div><label>Annual CTC</label><input type="number" [(ngModel)]="a._ctc" /></div>
            <div><label>Joining date</label><input type="date" [(ngModel)]="a._join" /></div>
            <div><label>Location</label><input [(ngModel)]="a._loc" /></div>
          </div>
          <button (click)="makeOffer(a)">Create offer</button>
        }
        @if (a.offer) {
          <h2>Offer</h2>
          <p>
            {{ a.offer.designation }} · CTC {{ a.offer.annualCtc }} · joins {{ a.offer.joiningDate | date }}
            <span class="badge" [class.ok]="a.offer.status==='ACCEPTED'">{{ a.offer.status }}</span>
            @if (a.offer.status === 'DRAFT') {
              <button class="secondary" style="margin-left:.5rem" (click)="sendOffer(a)">Send offer</button>
            }
          </p>
        }
      </div>
    } @empty {
      <div class="card muted">No applications yet. Publish a job and share its careers page.</div>
    }
  `,
})
export class ApplicationsComponent implements OnInit {
  private api = inject(ApiService);
  applications: any[] = [];
  error = '';
  statuses = ['APPLIED','SCREENING','INTERVIEW','SELECTED','REJECTED','WITHDRAWN'];
  resultRound: any = null;
  res: any = { result: 'PASSED' };
  screenshotFile: File | null = null;

  async ngOnInit() { await this.load(); }

  async load() {
    try {
      this.applications = await this.api.get<any[]>('/applications');
      for (const a of this.applications) {
        a._status = a.status;
        a._roundMode = 'TEAMS';
      }
    } catch (e) { this.error = errMsg(e); }
  }

  fileOf(ev: Event): File | null {
    return (ev.target as HTMLInputElement).files?.[0] ?? null;
  }

  async setStatus(a: any) {
    try {
      await this.api.patch(`/applications/${a.id}/status`, { status: a._status });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }

  async schedule(a: any) {
    try {
      const level = (a.interviews?.length ?? 0) + 1;
      await this.api.post(`/applications/${a.id}/interviews`, {
        level,
        name: a._roundName || `Round ${level}`,
        scheduledAt: a._roundAt ? new Date(a._roundAt).toISOString() : undefined,
        mode: a._roundMode,
      });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }

  openResult(round: any) {
    this.resultRound = round;
    this.res = { result: 'PASSED' };
    this.screenshotFile = null;
  }

  async saveResult() {
    try {
      let screenshotFileId: string | undefined;
      if (this.screenshotFile) {
        const form = new FormData();
        form.append('file', this.screenshotFile);
        const up = await fetch(`${environment.apiBase}/files`, {
          method: 'POST',
          body: form,
          headers: this.uploadHeaders(),
        }).then((r) => r.json());
        screenshotFileId = up.id;
      }
      await this.api.patch(`/interviews/${this.resultRound.id}/result`, {
        ...this.res,
        rating: this.res.rating ? Number(this.res.rating) : undefined,
        screenshotFileId,
      });
      this.resultRound = null;
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }

  private uploadHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    const t = localStorage.getItem('e360.token');
    const ten = localStorage.getItem('e360.tenant');
    if (t) h['Authorization'] = `Bearer ${t}`;
    if (ten) h['x-tenant-id'] = ten;
    return h;
  }

  async makeOffer(a: any) {
    try {
      await this.api.post(`/applications/${a.id}/offer`, {
        designation: a._designation,
        annualCtc: Number(a._ctc),
        salaryBreakup: { annualCtc: Number(a._ctc) },
        joiningDate: new Date(a._join).toISOString(),
        location: a._loc,
      });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }

  async sendOffer(a: any) {
    try {
      await this.api.post(`/offers/${a.offer.id}/send`);
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
