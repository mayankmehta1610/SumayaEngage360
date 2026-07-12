import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { AuthService } from '../core/auth.service';

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
        <p class="e360-muted">For staff logins that are not employees hired through the ATS — HR executives,
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
        <div class="e360-toolbar">
          <h2 style="margin:0">Accounts ({{ total }})</h2>
        </div>
        <div class="e360-table-wrap e360-table-sticky" style="max-height:min(70vh, 640px)">
          <table class="e360-table e360-table-zebra">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Roles</th><th>Active</th><th>Actions</th></tr>
            </thead>
            <tbody>
              @for (u of users; track u.id) {
                <tr>
                  <td>{{ u.firstName }} {{ u.lastName }}</td>
                  <td>{{ u.email }}</td>
                  <td>
                    @for (r of allRoles; track r) {
                      <label style="font-weight:400;margin-right:.5rem"><input type="checkbox"
                        [checked]="u._roles.includes(r)" (change)="toggleUserRole(u, r)"
                        style="width:auto;margin-right:.2rem" />{{ r }}</label>
                    }
                  </td>
                  <td><span class="badge" [class.ok]="u.isActive">{{ u.isActive ? 'active' : 'disabled' }}</span></td>
                  <td>
                    @if (u.id !== auth.user()?.id) {
                      <button (click)="saveAccess(u)" [disabled]="!u._roles.length">Save roles</button>
                      <button class="secondary" (click)="toggleActive(u)">{{ u.isActive ? 'Disable' : 'Enable' }}</button>
                    } @else { <span class="e360-muted">Current account</span> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="e360-pagination">
          <span>{{ pageFrom }}–{{ pageTo }} of {{ total }}</span>
          <div class="pages">
            <label class="e360-muted" style="font-size:.75rem;margin-right:.35rem">Rows</label>
            <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
              <option [ngValue]="10">10</option>
              <option [ngValue]="25">25</option>
              <option [ngValue]="50">50</option>
            </select>
            <button class="secondary sm" [disabled]="page <= 1" (click)="goPage(page - 1)">‹</button>
            <span>Page {{ page }} / {{ totalPages }}</span>
            <button class="secondary sm" [disabled]="page >= totalPages" (click)="goPage(page + 1)">›</button>
          </div>
        </div>
      </div>
    </e360-module-shell>
  `,
})
export class UsersComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  users: any[] = [];
  error = '';
  page = 1;
  pageSize = 25;
  total = 0;
  allRoles = ['HR', 'MANAGER', 'INTERVIEWER', 'BGC_VENDOR', 'TENANT_ADMIN', 'EMPLOYEE'];
  f: any = { roles: ['HR'] };
  exportCols = [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'email', label: 'Email' },
    { key: 'roles', label: 'Roles' },
    { key: 'isActive', label: 'Active' },
  ];

  get totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get pageFrom() { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get pageTo() { return Math.min(this.page * this.pageSize, this.total); }

  async ngOnInit() { await this.load(); }

  goPage(p: number) {
    this.page = Math.max(1, Math.min(p, this.totalPages));
    this.load();
  }

  onPageSizeChange() {
    this.page = 1;
    this.load();
  }

  async load() {
    try {
      const res = await this.api.get<any>('/users', {
        page: String(this.page),
        pageSize: String(this.pageSize),
      });
      const { items, meta } = unwrapPaginated(res);
      this.users = items.map((u: any) => ({ ...u, _roles: [...u.roles] }));
      this.total = meta?.total ?? items.length;
    } catch (e) { this.error = errMsg(e); }
  }

  toggleRole(r: string) {
    this.f.roles = this.f.roles.includes(r)
      ? this.f.roles.filter((x: string) => x !== r)
      : [...this.f.roles, r];
  }
  toggleUserRole(user: any, role: string) {
    user._roles = user._roles.includes(role)
      ? user._roles.filter((r: string) => r !== role)
      : [...user._roles, role];
  }
  async create() {
    this.error = '';
    try {
      await this.api.post('/users', this.f);
      this.f = { roles: ['HR'] };
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async saveAccess(user: any) {
    try {
      await this.api.patch(`/users/${user.id}/access`, { roles: user._roles });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async toggleActive(user: any) {
    try {
      await this.api.patch(`/users/${user.id}/access`, { isActive: !user.isActive });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
