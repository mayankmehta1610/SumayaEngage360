import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Recognition & feedback"
      description="Peer recognition, badges, and 360° feedback."
      icon="award"
      moduleKey="recognition"
      auditEntityType="RECOGNITION"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Performance' }, { label: 'Recognition' }]"
    >
      <div actions><export-bar [rows]="feed" [cols]="feedCols" name="recognition-feed" /></div>
@if (error) { <div class="e360-error">{{ error }}</div> }

    <div class="row">
      <div class="card">
        <h2 style="margin-top:0">🌟 Give instant recognition</h2>
        <label>Colleague</label>
        <select [(ngModel)]="r.receiverId">
          <option [ngValue]="undefined">choose…</option>
          @for (e of directory; track e.id) { <option [ngValue]="e.id">{{ e.user.firstName }} {{ e.user.lastName }} — {{ e.designation }}</option> }
        </select>
        <label>Badge</label>
        <select [(ngModel)]="r.badge">
          @for (b of badges; track b) { <option>{{ b }}</option> }
        </select>
        <label>Points</label>
        <input type="number" [(ngModel)]="r.points" min="0" max="500" />
        <label>Message</label>
        <textarea rows="2" [(ngModel)]="r.message" placeholder="What did they do brilliantly?"></textarea>
        <label><input type="checkbox" [(ngModel)]="r.isPublic" style="width:auto;margin-right:.4rem" />Show on the public feed</label>
        <div style="margin-top:.6rem"><button (click)="recognize()" [disabled]="!r.receiverId || !r.message">Send recognition</button></div>
      </div>

      <div class="card">
        <h2 style="margin-top:0">💬 Give feedback</h2>
        <label>To</label>
        <select [(ngModel)]="fb.receiverId">
          <option [ngValue]="undefined">choose…</option>
          @for (e of directory; track e.id) { <option [ngValue]="e.id">{{ e.user.firstName }} {{ e.user.lastName }} — {{ e.designation }}</option> }
        </select>
        <label>Type</label>
        <select [(ngModel)]="fb.type">
          <option value="PEER">Peer feedback</option>
          <option value="MANAGER_TO_EMPLOYEE">Manager → employee</option>
          <option value="EMPLOYEE_TO_MANAGER">Employee → manager</option>
          <option value="THREE_SIXTY">360°</option>
        </select>
        <label>Strengths</label>
        <textarea rows="2" [(ngModel)]="fb.strengths"></textarea>
        <label>Growth areas</label>
        <textarea rows="2" [(ngModel)]="fb.growth"></textarea>
        <label><input type="checkbox" [(ngModel)]="fb.anonymous" style="width:auto;margin-right:.4rem" />Send anonymously</label>
        <div style="margin-top:.6rem"><button (click)="giveFeedback()" [disabled]="!fb.receiverId || (!fb.strengths && !fb.growth)">Send feedback</button></div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0">🏆 Recognition feed</h2>
      @for (x of feed; track x.id) {
        <div style="border-bottom:1px solid #eef1f6;padding:.6rem 0">
          <span class="badge ok">{{ x.badge }}</span>
          <strong> {{ x.receiver.user.firstName }} {{ x.receiver.user.lastName }}</strong>
          <span class="muted">({{ x.receiver.employeeCode }})</span>
          @if (x.points) { <span class="badge">+{{ x.points }} pts</span> }
          <div>{{ x.message }}</div>
          <div class="muted" style="font-size:.75rem">{{ x.createdAt | date: 'medium' }}</div>
        </div>
      } @empty { <p class="muted">No recognitions yet — be the first!</p> }
    </div>

    <div class="card">
      <h2 style="margin-top:0">📥 Feedback I received</h2>
      @for (x of received; track x.id) {
        <div style="border-bottom:1px solid #eef1f6;padding:.6rem 0">
          <span class="badge">{{ x.type }}</span>
          @if (x.anonymous) { <span class="badge warn">anonymous</span> }
          <span class="muted" style="font-size:.75rem"> {{ x.createdAt | date }}</span>
          @if (x.content?.strengths) { <div><strong>Strengths:</strong> {{ x.content.strengths }}</div> }
          @if (x.content?.growth) { <div><strong>Growth:</strong> {{ x.content.growth }}</div> }
          @if (x.content?.text) { <div>{{ x.content.text }}</div> }
        </div>
      } @empty { <p class="muted">No feedback received yet.</p> }
    </div>
  
    </e360-module-shell>
  `,
})
export class RecognitionComponent implements OnInit {
  private api = inject(ApiService);
  directory: any[] = [];
  feed: any[] = [];
  received: any[] = [];
  error = '';
  badges: string[] = [];
  r: any = { points: 50, isPublic: true };
  fb: any = { type: 'PEER', anonymous: false };
  feedCols = [
    { key: 'badge', label: 'Badge' },
    { key: 'receiver.user.firstName', label: 'First name' },
    { key: 'receiver.user.lastName', label: 'Last name' },
    { key: 'points', label: 'Points' },
    { key: 'message', label: 'Message' },
    { key: 'createdAt', label: 'Date' },
  ];

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.directory = await this.api.get<any[]>('/employees/directory'); } catch {}
    try { this.feed = await this.api.get<any[]>('/recognitions/feed'); } catch {}
    try { this.received = await this.api.get<any[]>('/feedback/mine'); } catch { this.received = []; }
    try {
      const list = await this.api.get<{ name: string }[]>('/recognition-badges');
      this.badges = list.map((b) => b.name);
      if (this.badges.length && !this.r.badge) this.r.badge = this.badges[0];
    } catch { this.badges = []; }
  }
  async recognize() {
    try {
      await this.api.post('/recognitions', { ...this.r, points: Number(this.r.points) });
      this.r = { badge: this.badges[0], points: 50, isPublic: true };
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async giveFeedback() {
    try {
      await this.api.post('/feedback', {
        receiverId: this.fb.receiverId, type: this.fb.type, anonymous: !!this.fb.anonymous,
        content: { strengths: this.fb.strengths, growth: this.fb.growth },
      });
      this.fb = { type: 'PEER', anonymous: false };
      this.error = '';
      alert('Feedback sent ✓');
    } catch (e) { this.error = errMsg(e); }
  }
}
