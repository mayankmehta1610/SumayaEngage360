import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { environment } from '../../environments/environment';

// Public client-branded careers page: /careers/:slug
// Lists open roles (JD, vacancies, location, skills) and takes applications
// with mandatory skill tagging and resume upload.
@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="e360-careers-page">
      @if (error) { <div class="e360-card error">{{ error }}</div> }
      @if (client) {
        <div class="e360-card">
          <h1 style="margin:0">{{ client.name }} — Careers</h1>
          @if (client.description) { <p class="muted">{{ client.description }}</p> }
        </div>
        @for (j of jobs; track j.id) {
          <div class="e360-card">
            <div class="toolbar" style="margin-bottom:.25rem">
              <h2 style="margin:0">{{ j.title }}</h2>
              <span class="badge ok">{{ j.vacancies }} vacanc{{ j.vacancies === 1 ? 'y' : 'ies' }}</span>
            </div>
            <p class="muted">{{ j.location }} · {{ j.employmentType }}
              @if (j.minExperience != null) { · {{ j.minExperience }}–{{ j.maxExperience ?? '+' }} yrs }
            </p>
            <p style="white-space:pre-wrap">{{ j.description }}</p>
            <p>
              @for (s of j.skills; track s.skill.name) {
                <span class="badge" style="margin-right:.3rem">{{ s.skill.name }}</span>
              }
            </p>
            <button (click)="applyingTo = applyingTo === j.id ? null : j.id">
              {{ applyingTo === j.id ? 'Close form' : 'Apply now' }}
            </button>
            @if (applyingTo === j.id) {
              <form class="e360-form" (submit)="$event.preventDefault(); apply(j)">
                <div class="row">
                  <div><label>First name *</label><input [(ngModel)]="f.firstName" name="firstName" required /></div>
                  <div><label>Last name *</label><input [(ngModel)]="f.lastName" name="lastName" required /></div>
                </div>
                <div class="row">
                  <div><label>Email *</label><input type="email" [(ngModel)]="f.email" name="email" required /></div>
                  <div><label>Phone</label><input [(ngModel)]="f.phone" name="phone" /></div>
                </div>
                <label>Your skills * (comma separated — required at application time)</label>
                <input [(ngModel)]="skillsText" name="skills" placeholder="Angular, NestJS, SQL" />
                <label>Experience — most recent role</label>
                <div class="row">
                  <div><input [(ngModel)]="exp.company" name="expCompany" placeholder="Company" /></div>
                  <div><input [(ngModel)]="exp.title" name="expTitle" placeholder="Title" /></div>
                  <div><input type="date" [(ngModel)]="exp.startDate" name="expStart" /></div>
                  <div><input type="date" [(ngModel)]="exp.endDate" name="expEnd" /></div>
                </div>
                <label>Resume (PDF/DOCX)</label>
                <input class="e360-file-input" type="file" accept=".pdf,.doc,.docx" (change)="resume = fileOf($event)" />
                @if (applyError) { <div class="error">{{ applyError }}</div> }
                @if (applied) { <div class="badge ok" style="margin:.5rem 0">Application submitted — thank you!</div> }
                <div style="margin-top:.75rem">
                  <button type="submit" [disabled]="busy">{{ busy ? 'Submitting…' : 'Submit application' }}</button>
                </div>
              </form>
            }
          </div>
        } @empty {
          <div class="e360-card muted">No open roles right now — check back soon.</div>
        }
      }
    </div>
  `,
})
export class CareersComponent implements OnInit {
  private api = inject(ApiService);
  @Input() slug = ''; // from route param via withComponentInputBinding
  @Input() tenant = ''; // company segment of the URL — scopes every request

  client: any = null;
  jobs: any[] = [];
  error = '';
  applyingTo: string | null = null;
  applied = false;
  applyError = '';
  busy = false;
  f: any = {};
  exp: any = {};
  skillsText = '';
  resume: File | null = null;

  async ngOnInit() {
    try {
      const page = await this.api.get<any>(
        `/public/careers/${this.slug}`, undefined, this.tenant || undefined,
      );
      this.client = page.client;
      this.jobs = page.jobs;
    } catch (e) {
      this.error = errMsg(e);
    }
  }

  fileOf(ev: Event): File | null {
    return (ev.target as HTMLInputElement).files?.[0] ?? null;
  }

  async apply(job: any) {
    this.applyError = '';
    this.applied = false;
    const skills = this.skillsText.split(',').map((s) => s.trim()).filter(Boolean);
    if (!skills.length) {
      this.applyError = 'Please tag at least one skill — required at application time.';
      return;
    }
    this.busy = true;
    try {
      let resumeFileId: string | undefined;
      if (this.resume) {
        const form = new FormData();
        form.append('file', this.resume);
        const headers: Record<string, string> = {};
        const ten = this.tenant || localStorage.getItem('e360.tenant');
        if (ten) headers['x-tenant-id'] = ten;
        const up = await fetch(`${environment.apiBase}/files`, {
          method: 'POST', body: form, headers,
        }).then((r) => r.json());
        resumeFileId = up.id;
      }
      const experiences =
        this.exp.company && this.exp.startDate
          ? [{ ...this.exp, startDate: new Date(this.exp.startDate).toISOString(),
               endDate: this.exp.endDate ? new Date(this.exp.endDate).toISOString() : undefined }]
          : undefined;
      await this.api.post(`/public/careers/jobs/${job.id}/apply`, {
        ...this.f, skills, experiences, resumeFileId,
      }, this.tenant || undefined);
      this.applied = true;
      this.f = {}; this.exp = {}; this.skillsText = ''; this.resume = null;
    } catch (e) {
      this.applyError = errMsg(e);
    } finally {
      this.busy = false;
    }
  }
}
