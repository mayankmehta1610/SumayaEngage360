import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { AuthService } from '../core/auth.service';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Manpower requests"
      description="Headcount requests and approval workflow."
      icon="users-2"
      moduleKey="manpower"
      auditEntityType="MANPOWER_REQUEST"
      rolesHint="TENANT_ADMIN, HR, MANAGER"
      [breadcrumbs]="[{ label: 'Operations' }, { label: 'Manpower' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2>New headcount requisition</h2>
      <div class="row">
        <div><label>Role title</label><input [(ngModel)]="f.title" placeholder="Senior Software Engineer" /></div>
        <div><label>Department</label><select [(ngModel)]="f.departmentId"><option value="">Select department</option>@for (d of departments; track d.id) { <option [value]="d.id">{{ d.name }}</option> }</select></div>
        <div><label>Headcount</label><input [(ngModel)]="f.headcount" type="number" min="1" /></div>
      </div>
      <div class="row">
        <div><label>Work location</label><input [(ngModel)]="f.location" placeholder="New York, NY or Remote" /></div>
        <div><label>Employment type</label><select [(ngModel)]="f.employmentType"><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="CONTRACT">Contract</option></select></div>
        <div><label>Approved budget</label><input [(ngModel)]="f.budget" type="number" min="0" placeholder="Annual budget" /></div>
      </div>
      <div class="row">
        <div><label>Minimum experience (years)</label><input [(ngModel)]="f.minExperience" type="number" min="0" step="0.5" /></div>
        <div><label>Maximum experience (years)</label><input [(ngModel)]="f.maxExperience" type="number" min="0" step="0.5" /></div>
        <div><label>Required skills</label><input [(ngModel)]="f.skillsText" placeholder="TypeScript, NestJS, PostgreSQL" /></div>
      </div>
      <label>Full job description</label><textarea [(ngModel)]="f.description" placeholder="Responsibilities, outcomes, and qualifications"></textarea>
      <label>Business justification</label><textarea [(ngModel)]="f.justification" placeholder="Why this role is required and the impact of leaving it unfilled"></textarea>
      <button (click)="create()" [disabled]="busy">Save draft</button>
    </div>
    <div class="card">
      <h2>Bench capacity</h2>
      <p class="muted">Live availability is calculated from active project allocations.</p>
      <table><tr><th>Employee</th><th>Designation</th><th>Skills</th><th>Allocated</th><th>Available</th></tr>
        @for (e of bench; track e.id) {
          <tr><td>{{ e.name }}</td><td>{{ e.designation || '-' }}</td><td>{{ e.skills.join(', ') || '-' }}</td><td>{{ e.allocatedPercent }}%</td><td><strong>{{ e.availablePercent }}%</strong></td></tr>
        } @empty { <tr><td colspan="5" class="muted">No available employees.</td></tr> }
      </table>
    </div>
    <div class="card">
      <h2>Skill-based project matching</h2>
      <div class="row">
        <div><label>Project</label><select [(ngModel)]="selectedProjectId">
          <option value="">Choose project</option>
          @for (p of projects; track p.id) { <option [value]="p.id">{{ p.name }}</option> }
        </select></div>
        <div style="flex:0"><button (click)="match()" [disabled]="!selectedProjectId">Find matches</button></div>
      </div>
      @if (matches) {
        <p><strong>Required skills:</strong> {{ matches.targetSkills.join(', ') || 'No skills configured for this project' }}</p>
        <table><tr><th>Employee</th><th>Matched skills</th><th>Match</th><th>Available</th><th>Allocate</th></tr>
          @for (e of matches.candidates; track e.id) {
            <tr><td>{{ e.name }}</td><td>{{ e.matchedSkills.join(', ') || '-' }}</td><td><strong>{{ e.matchScore }}%</strong></td><td>{{ e.availablePercent }}%</td>
              <td><input type="number" min="1" [max]="e.availablePercent" [(ngModel)]="e._allocate" style="width:80px" /> <button class="secondary" (click)="allocate(e)" [disabled]="!e._allocate">Allocate</button></td></tr>
          } @empty { <tr><td colspan="5" class="muted">No available matches.</td></tr> }
        </table>
      }
    </div>
    <div class="card">
      <e360-data-table [columns]="tableCols" [rows]="tableRows" [pageSize]="15" [stickyHeader]="true">
        <ng-template #rowTemplate let-row>
          <td>{{ row.title }}</td>
          <td>{{ row.count }}</td>
          <td>{{ row.department }}</td>
          <td>{{ row.location }}</td>
          <td>{{ row.budget }}</td>
          <td>{{ row.status }}</td>
          <td>
            @if (row._raw.status === 'DRAFT') { <button (click)="submit(row.id)">Submit</button> }
            @if (row._raw.status === 'SUBMITTED' && auth.hasRole('HR','TENANT_ADMIN')) {
              <button (click)="approve(row.id)">Approve</button> }
          </td>
        </ng-template>
      </e360-data-table>
    </div>
  
    </e360-module-shell>
  `,
})
export class ManpowerComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  requests: any[] = []; bench: any[] = []; projects: any[] = []; departments: any[] = []; matches: any = null;
  selectedProjectId = ''; f: any = this.emptyForm(); error = ''; busy = false;
  tableCols: TableColumn[] = [
    { key: 'title', label: 'Title' },
    { key: 'count', label: 'Count' },
    { key: 'department', label: 'Department' },
    { key: 'location', label: 'Location' },
    { key: 'budget', label: 'Budget' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  get tableRows() {
    return this.requests.map((r) => ({
      id: r.id,
      title: r.title,
      count: r.headcount,
      department: r.departmentName || '—',
      location: r.location,
      budget: r.budget == null ? '—' : Number(r.budget).toLocaleString('en-US'),
      status: r.status,
      _raw: r,
    }));
  }

  async ngOnInit() {
    try {
      [this.requests, this.bench, this.projects, this.departments] = await Promise.all([
        this.api.get<any[]>('/manpower'),
        this.api.get<any[]>('/resourcing/bench'),
        this.api.get<any[]>('/projects'),
        this.api.get<any[]>('/departments'),
      ]);
    }
    catch (e) { this.error = errMsg(e); }
  }
  async create() {
    this.error = '';
    if (!this.f.title?.trim() || !this.f.description?.trim() || !this.f.location?.trim() || !this.f.departmentId) {
      this.error = 'Role title, department, location, and full job description are required.';
      return;
    }
    if (this.f.maxExperience !== '' && this.f.minExperience !== '' && Number(this.f.maxExperience) < Number(this.f.minExperience)) {
      this.error = 'Maximum experience cannot be less than minimum experience.';
      return;
    }
    this.busy = true;
    try {
      const { skillsText, ...value } = this.f;
      await this.api.post('/manpower', {
        ...value,
        headcount: Number(value.headcount),
        budget: value.budget === '' ? undefined : Number(value.budget),
        minExperience: value.minExperience === '' ? undefined : Number(value.minExperience),
        maxExperience: value.maxExperience === '' ? undefined : Number(value.maxExperience),
        skills: String(skillsText ?? '').split(',').map((skill) => skill.trim()).filter(Boolean),
      });
      this.requests = await this.api.get<any[]>('/manpower');
      this.f = this.emptyForm();
    } catch (e) { this.error = errMsg(e); } finally { this.busy = false; }
  }
  async submit(id: string) { try { await this.api.patch(`/manpower/${id}/submit`); this.requests = await this.api.get<any[]>('/manpower'); } catch (e) { this.error = errMsg(e); } }
  async approve(id: string) { try { await this.api.patch(`/manpower/${id}/approve`); this.requests = await this.api.get<any[]>('/manpower'); } catch (e) { this.error = errMsg(e); } }
  async match() {
    try { this.matches = await this.api.get<any>(`/resourcing/projects/${this.selectedProjectId}/match`); }
    catch (e) { this.error = errMsg(e); }
  }
  async allocate(employee: any) {
    try {
      await this.api.post(`/projects/${this.selectedProjectId}/allocations`, {
        employeeId: employee.id,
        percentage: Number(employee._allocate),
        startDate: new Date().toISOString(),
      });
      this.bench = await this.api.get<any[]>('/resourcing/bench');
      await this.match();
    } catch (e) { this.error = errMsg(e); }
  }

  private emptyForm() {
    return { title: '', description: '', departmentId: '', headcount: 1, location: '', employmentType: 'FULL_TIME', budget: '', justification: '', minExperience: '', maxExperience: '', skillsText: '' };
  }
}
