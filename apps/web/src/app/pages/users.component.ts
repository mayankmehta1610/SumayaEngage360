import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { tableListParams, TableSort } from '../core/table-query.util';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { AuthService } from '../core/auth.service';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent, DataTableComponent],
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
        <e360-data-table
          [columns]="tableCols"
          [rows]="tableRows"
          [page]="page"
          [pageSize]="pageSize"
          [total]="total"
          [stickyHeader]="true"
          (pageChange)="goPage($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onFilterChange($event)"
        >
          <ng-template #rowTemplate let-row>
            <td>{{ row.name }}</td>
            <td>{{ row.email }}</td>
            <td>
              @for (r of allRoles; track r) {
                <label style="font-weight:400;margin-right:.5rem"><input type="checkbox"
                  [checked]="row._raw._roles.includes(r)" (change)="toggleUserRole(row._raw, r)"
                  style="width:auto;margin-right:.2rem" />{{ r }}</label>
              }
            </td>
            <td><span class="badge" [class.ok]="row._raw.isActive">{{ row._raw.isActive ? 'active' : 'disabled' }}</span></td>
            <td>
              @if (row._raw.id !== auth.user()?.id) {
                <button (click)="saveAccess(row._raw)" [disabled]="!row._raw._roles.length">Save roles</button>
                <button class="secondary" (click)="toggleActive(row._raw)">{{ row._raw.isActive ? 'Disable' : 'Enable' }}</button>
              } @else { <span class="e360-muted">Current account</span> }
            </td>
          </ng-template>
        </e360-data-table>
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
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};
  allRoles = ['HR', 'MANAGER', 'INTERVIEWER', 'BGC_VENDOR', 'TENANT_ADMIN', 'EMPLOYEE'];
  f: any = { roles: ['HR'] };
  exportCols = [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'email', label: 'Email' },
    { key: 'roles', label: 'Roles' },
    { key: 'isActive', label: 'Active' },
  ];
  tableCols: TableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'roles', label: 'Roles', sortable: false, filterable: false },
    { key: 'active', label: 'Active' },
    { key: 'actions', label: 'Actions', sortable: false, filterable: false },
  ];

  get tableRows() {
    return this.users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      active: u.isActive ? 'active' : 'disabled',
      _raw: u,
    }));
  }

  async ngOnInit() { await this.load(); }

  goPage(p: number) {
    this.page = p;
    this.load();
  }

  onPageSizeChange(ps: number) {
    this.pageSize = ps;
    this.page = 1;
    this.load();
  }

  onSortChange(s: { key: string; dir: 'asc' | 'desc' }) {
    this.sort = s;
    this.page = 1;
    this.load();
  }

  onFilterChange(f: Record<string, string>) {
    this.columnFilters = f;
    this.page = 1;
    this.load();
  }

  async load() {
    try {
      const params = tableListParams(this.page, this.pageSize, {}, this.sort, this.columnFilters);
      const res = await this.api.get<any>('/users', params);
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
