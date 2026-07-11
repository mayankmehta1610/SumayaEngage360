import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="User accounts"
      description="Staff logins for HR, interviewers, and vendor agencies."
      icon="users"
      [showReports]="false"
      rolesHint="TENANT_ADMIN"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'User accounts' }]"
    >
      <div actions><export-bar [rows]="users" [cols]="exportCols" name="users" /></div>
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2 style="margin-top:0">Create user account</h2>
      <p class="muted">For staff logins that are not employees hired through the ATS — HR executives,
        interview panelists, BGC vendor agencies. (Employees get accounts automatically via Employees / offer acceptance.)</p>
      <div class="row">
        <div><label>First name</label><input [(ngModel)]="f.firstName" /></div>
        <div><label>Last name</label><input [(ngModel)]="f.lastName" /></div>
        <div><label>Email</label><input type="email" [(ngModel)]="f.email" /></div>
        <div><label>Password (min 8)</label><input type="password" [(ngModel)]="f.password" /></div>
      </div>
      <label>Roles</label>
      <div style="display:flex;gap:1rem;flex-wrap:wrap;margin:.3rem 0 .8rem">
        @for (r of allRoles; track r) {
          <label style="font-weight:400"><input type="checkbox" [checked]="f.roles.includes(r)"
            (change)="toggleRole(r)" style="width:auto;margin-right:.35rem" />{{ r }}</label>
        }
      </div>
      <button (click)="create()" [disabled]="!f.email || !f.password || !f.roles.length">Create user</button>
    </div>
    <div class="card">
      <table>
        <tr><th>Name</th><th>Email</th><th>Roles</th><th>Active</th></tr>
        @for (u of users; track u.id) {
          <tr>
            <td>{{ u.firstName }} {{ u.lastName }}</td>
            <td>{{ u.email }}</td>
            <td>@for (r of u.roles; track r) { <span class="badge" style="margin-right:.25rem">{{ r }}</span> }</td>
            <td><span class="badge" [class.ok]="u.isActive">{{ u.isActive ? 'active' : 'disabled' }}</span></td>
          </tr>
        }
      </table>
    </div>
  
    </e360-module-shell>
  `,
})
export class UsersComponent implements OnInit {
  private api = inject(ApiService);
  users: any[] = [];
  error = '';
  allRoles = ['HR', 'MANAGER', 'INTERVIEWER', 'BGC_VENDOR', 'TENANT_ADMIN', 'EMPLOYEE'];
  f: any = { roles: ['HR'] };
  exportCols = [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'email', label: 'Email' },
    { key: 'roles', label: 'Roles' },
    { key: 'isActive', label: 'Active' },
  ];

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.users = await this.api.get<any[]>('/users'); }
    catch (e) { this.error = errMsg(e); }
  }
  toggleRole(r: string) {
    this.f.roles = this.f.roles.includes(r)
      ? this.f.roles.filter((x: string) => x !== r)
      : [...this.f.roles, r];
  }
  async create() {
    this.error = '';
    try {
      await this.api.post('/users', this.f);
      this.f = { roles: ['HR'] };
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
