import { Component, Input, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { environment } from '../../environments/environment';

// The guided onboarding tool a new joiner opens from their secure email link.
@Component({
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div style="max-width:760px;margin:2rem auto;padding:0 1rem">
      <h1>Welcome aboard 🎉</h1>
      @if (error) { <div class="card error">{{ error }}</div> }
      @if (portal) {
        <div class="card">
          <p>
            <strong>{{ portal.employee.designation }}</strong>
            · joining {{ portal.employee.joinDate | date }}
            · {{ portal.employee.location }}
            <span class="badge" style="margin-left:.5rem">{{ portal.status }}</span>
          </p>
        </div>

        <div class="card">
          <h2>1 · Identity documents ({{ portal.country }})</h2>
          @for (r of portal.requirements; track r.code) {
            <div class="row" style="align-items:center;border-bottom:1px solid #eef1f6;padding:.4rem 0">
              <div><strong>{{ r.name }}</strong> ({{ r.code }})
                @if (r.mandatory) { <span class="badge warn">mandatory</span> }
              </div>
              <div>
                @if (r.submitted) { <span class="badge ok">uploaded</span> }
                @else { <input type="file" (change)="uploadDoc(r.code, $event)" /> }
              </div>
            </div>
          } @empty { <p class="muted">No document requirements configured for your country yet.</p> }
        </div>

        <div class="card">
          <h2>2 · Your skills</h2>
          <p class="muted">Carried over from your application — add anything missing.</p>
          <p>
            @for (s of portal.skills; track s.name) {
              <span class="badge" style="margin-right:.3rem">{{ s.name }}@if (s.fromApplication) { ✓ }</span>
            }
          </p>
          <div class="row" style="align-items:flex-end">
            <div><input [(ngModel)]="newSkills" placeholder="e.g. Docker, Kubernetes" /></div>
            <div style="flex:0"><button class="secondary" (click)="addSkills()">Add skills</button></div>
          </div>
        </div>

        <div class="card">
          <h2>3 · Company policies</h2>
          @for (p of portal.policies; track p.id) {
            <div class="row" style="align-items:center;border-bottom:1px solid #eef1f6;padding:.4rem 0">
              <div>{{ p.title }} <span class="muted">v{{ p.version }}</span>
                @if (p.mandatory) { <span class="badge warn">mandatory</span> }
              </div>
              <div>
                @if (p.acknowledged) { <span class="badge ok">acknowledged</span> }
                @else { <button class="secondary" (click)="ack(p.id)">I have read & agree</button> }
              </div>
            </div>
          } @empty { <p class="muted">No policies published yet.</p> }
        </div>

        <div class="card">
          <h2>4 · Set your password & submit</h2>
          <label>Choose a password for your employee portal (min 8 chars)</label>
          <input type="password" [(ngModel)]="password" />
          @if (submitError) { <div class="error">{{ submitError }}</div> }
          @if (done) { <div class="badge ok">Submitted! HR will verify your documents — you can now log in with your email and this password.</div> }
          @else { <button (click)="complete()" [disabled]="busy">{{ busy ? 'Submitting…' : 'Submit for verification' }}</button> }
        </div>
      }
    </div>
  `,
})
export class OnboardingPortalComponent implements OnInit {
  private api = inject(ApiService);
  @Input() token = '';

  portal: any = null;
  error = '';
  submitError = '';
  newSkills = '';
  password = '';
  busy = false;
  done = false;

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.portal = await this.api.get<any>(`/public/onboarding/${this.token}`); }
    catch (e) { this.error = errMsg(e); }
  }
  async uploadDoc(code: string, ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append('file', file);
      const up = await fetch(`${environment.apiBase}/files`, { method: 'POST', body: form })
        .then((r) => r.json());
      await this.api.post(`/public/onboarding/${this.token}/documents`, { code, fileId: up.id });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async addSkills() {
    const skills = this.newSkills.split(',').map((s) => s.trim()).filter(Boolean);
    if (!skills.length) return;
    try {
      await this.api.post(`/public/onboarding/${this.token}/skills`, { skills });
      this.newSkills = '';
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async ack(policyId: string) {
    try {
      await this.api.post(`/public/onboarding/${this.token}/policies/${policyId}/acknowledge`);
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async complete() {
    this.submitError = '';
    this.busy = true;
    try {
      await this.api.post(`/public/onboarding/${this.token}/complete`, { password: this.password });
      this.done = true;
    } catch (e) { this.submitError = errMsg(e); }
    finally { this.busy = false; }
  }
}
