import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Hiring clients"
      description="Client accounts and careers page configuration."
      icon="briefcase"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Recruitment' }, { label: 'Hiring clients' }]"
    >
      <div actions><export-bar [rows]="clients" [cols]="exportCols" name="hiring-clients" /></div>
<div class="card">
      <h2>Add hiring client</h2>
      <div class="row">
        <div><label>Name</label><input [(ngModel)]="f.name" /></div>
        <div><label>Careers URL slug</label><input [(ngModel)]="f.slug" placeholder="client-x" /></div>
        <div><label>Description</label><input [(ngModel)]="f.description" /></div>
      </div>
      <label><input type="checkbox" [(ngModel)]="f.isInternal" style="width:auto;margin-right:.4rem" />Internal (our own openings)</label>
      @if (error) { <div class="e360-error">{{ error }}</div> }
      <div style="margin-top:.75rem"><button (click)="create()">Add client</button></div>
    </div>
    <div class="card">
      <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true">
        <ng-template #rowTemplate let-row>
          <td>{{ row.name }}</td>
          <td><a [href]="'/careers/' + auth.tenant + '/' + row.slug" target="_blank">/careers/{{ auth.tenant }}/{{ row.slug }}</a></td>
          <td>{{ row.type }}</td>
          <td>
            @if (editId === row.id) {
              <input [(ngModel)]="edit.name" />
              <button (click)="saveEdit(row.id)">Save</button>
              <button class="secondary" (click)="editId = null">Cancel</button>
            } @else {
              <span class="badge" [class.ok]="row._raw.isActive">{{ row._raw.isActive ? 'active' : 'inactive' }}</span>
              <button class="secondary" (click)="startEdit(row._raw)">Edit</button>
              <button class="secondary" (click)="toggleActive(row._raw)">{{ row._raw.isActive ? 'Disable' : 'Enable' }}</button>
            }
          </td>
        </ng-template>
      </e360-data-table>
    </div>
  
    </e360-module-shell>
  `,
})
export class ClientsComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  clients: any[] = [];
  error = '';
  f: any = {};
  editId: string | null = null;
  edit: any = {};
  exportCols = [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Careers slug' },
    { key: 'isInternal', label: 'Internal' },
    { key: 'isActive', label: 'Active' },
  ];
  tableCols: TableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'careers', label: 'Careers page', sortable: false, filterable: false },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status', sortable: false, filterable: false },
  ];

  get tableRows() {
    return this.clients.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      type: c.isInternal ? 'internal' : 'client',
      _raw: c,
    }));
  }

  async ngOnInit() {
    await this.load();
  }
  async load() {
    try {
      this.clients = await this.api.get<any[]>('/hiring-clients');
    } catch (e) {
      this.error = errMsg(e);
    }
  }
  async create() {
    this.error = '';
    try {
      await this.api.post('/hiring-clients', this.f);
      this.f = {};
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
  startEdit(c: any) {
    this.editId = c.id;
    this.edit = { name: c.name, description: c.description ?? '', isInternal: c.isInternal };
  }
  async saveEdit(id: string) {
    try {
      await this.api.patch(`/hiring-clients/${id}`, this.edit);
      this.editId = null;
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
  async toggleActive(c: any) {
    try {
      await this.api.patch(`/hiring-clients/${c.id}`, { isActive: !c.isActive });
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
}
