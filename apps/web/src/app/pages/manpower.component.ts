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
  requests: any[] = []; f: any = { headcount: 1 }; error = '';
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
    try { this.requests = await this.api.get<any[]>('/manpower'); }
    catch (e) { this.error = errMsg(e); }
  }
  async create() {
    await this.api.post('/manpower', this.f);
    this.requests = await this.api.get<any[]>('/manpower');
    this.f = { headcount: 1 };
  }
  async submit(id: string) { await this.api.patch(`/manpower/${id}/submit`); this.requests = await this.api.get<any[]>('/manpower'); }
  async approve(id: string) { await this.api.patch(`/manpower/${id}/approve`); this.requests = await this.api.get<any[]>('/manpower'); }
}
