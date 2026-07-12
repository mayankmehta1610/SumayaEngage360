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
      <input [(ngModel)]="f.title" placeholder="Role title" />
      <input [(ngModel)]="f.headcount" type="number" placeholder="Headcount" />
      <button (click)="create()">Create</button>
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
      <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true">
        <ng-template #rowTemplate let-row>
          <td>{{ row.title }}</td>
          <td>{{ row.count }}</td>
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
  requests: any[] = []; bench: any[] = []; projects: any[] = []; matches: any = null;
  selectedProjectId = ''; f: any = { headcount: 1 }; error = '';
  tableCols: TableColumn[] = [
    { key: 'title', label: 'Title' },
    { key: 'count', label: 'Count' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  get tableRows() {
    return this.requests.map((r) => ({
      id: r.id,
      title: r.title,
      count: r.headcount,
      status: r.status,
      _raw: r,
    }));
  }

  async ngOnInit() {
    try {
      [this.requests, this.bench, this.projects] = await Promise.all([
        this.api.get<any[]>('/manpower'),
        this.api.get<any[]>('/resourcing/bench'),
        this.api.get<any[]>('/projects'),
      ]);
    }
    catch (e) { this.error = errMsg(e); }
  }
  async create() {
    await this.api.post('/manpower', this.f);
    this.requests = await this.api.get<any[]>('/manpower');
    this.f = { headcount: 1 };
  }
  async submit(id: string) { await this.api.patch(`/manpower/${id}/submit`); this.requests = await this.api.get<any[]>('/manpower'); }
  async approve(id: string) { await this.api.patch(`/manpower/${id}/approve`); this.requests = await this.api.get<any[]>('/manpower'); }
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
}
