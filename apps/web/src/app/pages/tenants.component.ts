import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent],
  template: `
    <div class="toolbar"><h1>Tenants</h1>
      <export-bar [rows]="tenants" [cols]="exportCols" name="tenants" />
    </div>
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
      @if (error) { <div class="error">{{ error }}</div> }
      <button (click)="create()">Create tenant</button>
    </div>
    <div class="card">
      <table>
        <tr><th>Name</th><th>Subdomain</th><th>Country</th><th>Active</th></tr>
        @for (t of tenants; track t.id) {
          <tr>
            <td>{{ t.name }}</td><td>{{ t.subdomain }}</td><td>{{ t.country }}</td>
            <td><span class="badge" [class.ok]="t.isActive">{{ t.isActive ? 'active' : 'disabled' }}</span></td>
          </tr>
        }
      </table>
    </div>
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
