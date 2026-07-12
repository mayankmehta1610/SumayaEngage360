import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Tenants"
      description="Multi-tenant provisioning and management."
      icon="building-2"
      [showReports]="false"
      rolesHint="PLATFORM_ADMIN"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Tenants' }]"
    >
      <div actions><export-bar [rows]="tenants" [cols]="exportCols" name="tenants" /></div>
<div class="card">
      <h2>Create tenant</h2>
      <div class="row">
        <div><label>Company name</label><input [(ngModel)]="f.name" /></div>
        <div><label>Subdomain</label><input [(ngModel)]="f.subdomain" placeholder="acme" /></div>
        <div><label>Country</label><input [(ngModel)]="f.country" placeholder="IN" /></div>
      </div>
      <div class="row">
        <div><label>Admin email</label><input [(ngModel)]="f.adminEmail" /></div>
        <div><label>Admin password</label><input [(ngModel)]="f.adminPassword" type="password" /></div>
        <div><label>Admin first name</label><input [(ngModel)]="f.adminFirstName" /></div>
        <div><label>Admin last name</label><input [(ngModel)]="f.adminLastName" /></div>
      </div>
      @if (error) { <div class="e360-error">{{ error }}</div> }
      <button (click)="create()">Create tenant</button>
    </div>
    <div class="card">
      <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true" />
    </div>
  
    </e360-module-shell>
  `,
})
export class TenantsComponent implements OnInit {
  private api = inject(ApiService);
  tenants: any[] = [];
  error = '';
  f: any = { country: 'IN' };
  exportCols = [
    { key: 'name', label: 'Name' },
    { key: 'subdomain', label: 'Subdomain' },
    { key: 'country', label: 'Country' },
    { key: 'isActive', label: 'Active' },
    { key: 'createdAt', label: 'Created' },
  ];
  tableCols: TableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'subdomain', label: 'Subdomain' },
    { key: 'country', label: 'Country' },
    { key: 'active', label: 'Active' },
  ];

  get tableRows() {
    return this.tenants.map((t) => ({
      name: t.name,
      subdomain: t.subdomain,
      country: t.country,
      active: t.isActive ? 'active' : 'disabled',
    }));
  }

  async ngOnInit() {
    await this.load();
  }
  async load() {
    try {
      this.tenants = await this.api.get<any[]>('/tenants');
    } catch (e) {
      this.error = errMsg(e);
    }
  }
  async create() {
    this.error = '';
    try {
      await this.api.post('/tenants', this.f);
      this.f = { country: 'IN' };
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
}
