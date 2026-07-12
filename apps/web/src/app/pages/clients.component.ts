import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent],
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
      <table>
        <tr><th>Name</th><th>Careers page</th><th>Type</th><th>Status</th></tr>
        @for (c of clients; track c.id) {
          <tr>
            <td>{{ c.name }}</td>
            <td><a [href]="'/careers/' + auth.tenant + '/' + c.slug" target="_blank">/careers/{{ auth.tenant }}/{{ c.slug }}</a></td>
            <td>{{ c.isInternal ? 'internal' : 'client' }}</td>
            <td>
              @if (editId === c.id) {
                <input [(ngModel)]="edit.name" />
                <button (click)="saveEdit(c.id)">Save</button>
                <button class="secondary" (click)="editId = null">Cancel</button>
              } @else {
                <span class="badge" [class.ok]="c.isActive">{{ c.isActive ? 'active' : 'inactive' }}</span>
                <button class="secondary" (click)="startEdit(c)">Edit</button>
                <button class="secondary" (click)="toggleActive(c)">{{ c.isActive ? 'Disable' : 'Enable' }}</button>
              }
            </td>
          </tr>
        }
      </table>
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
