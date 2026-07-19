import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent, SelectFieldComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Appraisals"
      description="Review cycles, self-assessments, and manager evaluations."
      icon="star"
      moduleKey="appraisals"
      auditEntityType="APPRAISAL"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Performance' }, { label: 'Appraisals' }]"
    >
      <div actions>@if (isHr) { <export-bar [rows]="cycles" [cols]="exportCols" name="appraisal-cycles" /> }</div>
@if (error) { <div class="e360-error">{{ error }}</div> }

    <!-- ══════════ MY APPRAISALS (employee) ══════════ -->
    <h2>My appraisals</h2>
    @for (a of mine; track a.id) {
      <div class="card">
        <div class="toolbar" style="margin-bottom:.4rem">
          <strong>{{ a.cycle.name }}</strong>
          <span class="badge" [class.ok]="a.status==='COMPLETED'" [class.warn]="a.status==='SELF_REVIEW'">{{ a.status }}</span>
        </div>
        @if (a.status === 'SELF_REVIEW') {
          <p class="muted">Write your self-review for each area, then submit — it goes to your manager.</p>
          @for (s of sections(a.cycle.template); track s) {
            <label>{{ s }}</label>
            <textarea rows="2" [(ngModel)]="a._self[s]" placeholder="Your achievements and evidence for {{ s }}"></textarea>
          }
          <button (click)="submitSelf(a)" [disabled]="busy">Submit self-review</button>
        } @else {
          @if (a.selfReview) {
            <label>My self-review</label>
            @for (s of keys(a.selfReview); track s) { <div><strong>{{ s }}:</strong> {{ a.selfReview[s] }}</div> }
          }
          @if (a.managerReview) {
            <label style="margin-top:.5rem;display:block">Manager's review</label>
            @for (s of keys(a.managerReview); track s) { <div><strong>{{ s }}:</strong> {{ a.managerReview[s] }}</div> }
          }
          @if (a.finalRating) { <p>Final rating: <span class="badge ok">{{ a.finalRating }} / 5</span></p> }
        }
      </div>
    } @empty { <div class="card muted">No appraisals assigned to you yet — they appear when HR launches a review cycle.</div> }

    <!-- ══════════ MY TEAM (manager) ══════════ -->
    @if (team.length) {
      <h2>My team's reviews (I am the appraiser)</h2>
      @for (a of team; track a.id) {
        <div class="card">
          <div class="toolbar" style="margin-bottom:.4rem">
            <strong>{{ a.employee.user.firstName }} {{ a.employee.user.lastName }}
              <span class="muted">({{ a.employee.employeeCode }}) · {{ a.cycle.name }}</span></strong>
            <span class="badge" [class.ok]="a.status==='COMPLETED'">{{ a.status }}</span>
          </div>
          @if (a.status === 'MANAGER_REVIEW') {
            @if (a.selfReview) {
              <label>Their self-review</label>
              @for (s of keys(a.selfReview); track s) { <div class="muted"><strong>{{ s }}:</strong> {{ a.selfReview[s] }}</div> }
            }
            <p class="muted" style="margin-top:.5rem">Your assessment:</p>
            @for (s of sections(a.cycle?.template); track s) {
              <label>{{ s }}</label>
              <textarea rows="2" [(ngModel)]="a._mgr[s]"></textarea>
            }
            <e360-select-field
              label="Rating (1–5)"
              [compact]="true"
              [searchable]="false"
              [options]="ratingOptions"
              [(ngModel)]="a._rating"
            />
            <div style="margin-top:.5rem"><button (click)="submitManager(a)" [disabled]="busy">Submit manager review</button></div>
          } @else {
            <span class="muted">Rating: {{ a.finalRating ?? 'pending' }}</span>
          }
        </div>
      }
    }

    <!-- ══════════ CYCLE MANAGEMENT (HR/Admin) ══════════ -->
    @if (isHr) {
      <h2>Review cycles</h2>
      <div class="card">
        <h2 style="margin-top:0">Create cycle</h2>
        <div class="row">
          <div><label>Name</label><input [(ngModel)]="f.name" placeholder="FY27 Q3" /></div>
          <e360-select-field
            label="Frequency"
            [options]="frequencyOptions"
            [(ngModel)]="f.frequency"
          />
          <div><label>Start</label><input type="date" [(ngModel)]="f.startDate" /></div>
          <div><label>End</label><input type="date" [(ngModel)]="f.endDate" /></div>
        </div>
        <label>Review areas (KRAs / sections)</label>
        @for (s of tplSections; track $index; let i = $index) {
          <div style="display:flex;gap:.5rem;margin:.3rem 0">
            <input [(ngModel)]="tplSections[i]" placeholder="e.g. Delivery quality" />
            <button class="danger" (click)="tplSections.splice(i, 1)" [disabled]="tplSections.length === 1">✕</button>
          </div>
        }
        <button class="secondary" (click)="tplSections.push('')">+ Add area</button>
        <button style="margin-left:.5rem" (click)="createCycle()" [disabled]="!f.name || !f.startDate">Create cycle</button>
      </div>
      <div class="card">
        <e360-data-table [columns]="cycleCols" [rows]="cycleRows" [pageSize]="15" [stickyHeader]="true">
          <ng-template #rowTemplate let-row>
            <td>{{ row.name }}</td>
            <td>{{ row.frequency }}</td>
            <td>{{ row.window }}</td>
            <td>{{ row.appraisals }}</td>
            <td><button class="secondary" (click)="launch(row.id)">Launch for all active employees</button></td>
          </ng-template>
        </e360-data-table>
      </div>
    }
  
    </e360-module-shell>
  `,
})
export class AppraisalsComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  cycles: any[] = [];
  team: any[] = [];
  mine: any[] = [];
  error = '';
  busy = false;
  f: any = { frequency: 'QUARTERLY' };
  tplSections: string[] = ['Delivery quality', 'Collaboration'];
  ratingOptions: SelectOption[] = ['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: v }));
  frequencyOptions: SelectOption[] = [
    { value: 'CUSTOM', label: 'CUSTOM' },
    { value: 'HALF_YEARLY', label: 'HALF_YEARLY' },
    { value: 'MONTHLY', label: 'MONTHLY' },
    { value: 'QUARTERLY', label: 'QUARTERLY' },
    { value: 'YEARLY', label: 'YEARLY' },
  ];
  exportCols = [
    { key: 'name', label: 'Cycle' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'startDate', label: 'Start' },
    { key: 'endDate', label: 'End' },
    { key: '_count.appraisals', label: 'Appraisals' },
  ];
  cycleCols: TableColumn[] = [
    { key: 'name', label: 'Cycle' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'window', label: 'Window' },
    { key: 'appraisals', label: 'Appraisals' },
    { key: 'actions', label: '', sortable: false, filterable: false },
  ];

  get cycleRows() {
    return this.cycles.map((c) => ({
      id: c.id,
      name: c.name,
      frequency: c.frequency,
      window: `${new Date(c.startDate).toLocaleDateString()} – ${new Date(c.endDate).toLocaleDateString()}`,
      appraisals: c._count?.appraisals ?? 0,
    }));
  }

  get isHr() { return this.auth.hasRole('TENANT_ADMIN', 'HR'); }

  async ngOnInit() { await this.load(); }
  async load() {
    if (this.isHr) { try { this.cycles = await this.api.get<any[]>('/appraisals/cycles'); } catch {} }
    try {
      this.mine = (await this.api.get<any[]>('/appraisals/mine')).map((a) => ({ ...a, _self: {} }));
    } catch { this.mine = []; }
    try {
      this.team = (await this.api.get<any[]>('/appraisals/team')).map((a) => ({ ...a, _mgr: {}, _rating: '4' }));
    } catch { this.team = []; }
  }
  sections(tpl: any): string[] {
    return Array.isArray(tpl?.sections) && tpl.sections.length ? tpl.sections : ['Overall performance'];
  }
  keys(o: any) { return Object.keys(o ?? {}); }
  async submitSelf(a: any) {
    this.busy = true;
    try { await this.api.post(`/appraisals/${a.id}/self-review`, { review: a._self }); await this.load(); }
    catch (e) { this.error = errMsg(e); }
    finally { this.busy = false; }
  }
  async submitManager(a: any) {
    this.busy = true;
    try {
      await this.api.post(`/appraisals/${a.id}/manager-review`, { review: a._mgr, rating: a._rating });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
    finally { this.busy = false; }
  }
  async createCycle() {
    try {
      await this.api.post('/appraisals/cycles', {
        name: this.f.name, frequency: this.f.frequency,
        startDate: new Date(this.f.startDate).toISOString(),
        endDate: new Date(this.f.endDate).toISOString(),
        template: { sections: this.tplSections.map((s) => s.trim()).filter(Boolean), ratingScale: [1, 2, 3, 4, 5] },
      });
      this.f = { frequency: 'QUARTERLY' };
      this.tplSections = ['Delivery quality', 'Collaboration'];
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async launch(id: string) {
    try { await this.api.post(`/appraisals/cycles/${id}/launch`); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
}
