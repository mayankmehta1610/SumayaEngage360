import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, SelectFieldComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Assets"
      description="IT asset registry and assignments."
      icon="laptop"
      moduleKey="assets"
      auditEntityType="ASSET"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Operations' }, { label: 'Assets' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2>Register asset</h2>
      <input [(ngModel)]="f.assetTag" placeholder="Asset tag" />
      <select [(ngModel)]="f.category"><option value="">Select category</option><option value="LAPTOP">Laptop</option><option value="DESKTOP">Desktop</option><option value="MONITOR">Monitor</option><option value="MOBILE">Mobile phone</option><option value="ACCESS_CARD">Access card</option><option value="SOFTWARE_LICENSE">Software license</option><option value="OTHER">Other</option></select>
      <input [(ngModel)]="f.model" placeholder="Manufacturer and model" />
      <input [(ngModel)]="f.serialNo" placeholder="Serial number" />
      <button (click)="create()">Add</button>
    </div>
    <div class="card">
      <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true">
        <ng-template #rowTemplate let-row>
          <td>{{ row.tag }}</td>
          <td>{{ row.category }}</td>
          <td>{{ row.model }}</td>
          <td>{{ row.serial }}</td>
          <td>{{ row.assigned }}</td>
          <td>
            @if (row._raw.assignments?.[0]) {
              <input [(ngModel)]="row._raw._condition" placeholder="Return condition" />
              <button class="secondary" (click)="returnAsset(row._raw)">Return</button>
            } @else {
              <e360-select-field
                placeholder="Select employee"
                [compact]="true"
                [options]="employeeOptions"
                [(ngModel)]="row._raw._employeeId"
              />
              <button (click)="assign(row._raw)" [disabled]="!row._raw._employeeId">Assign</button>
            }
          </td>
        </ng-template>
      </e360-data-table>
    </div>
  
    </e360-module-shell>
  `,
})
export class AssetsComponent implements OnInit {
  private api = inject(ApiService);
  assets: any[] = []; employees: any[] = []; f: any = {}; error = '';
  tableCols: TableColumn[] = [
    { key: 'tag', label: 'Tag' },
    { key: 'category', label: 'Category' },
    { key: 'model', label: 'Model' },
    { key: 'serial', label: 'Serial number' },
    { key: 'assigned', label: 'Assigned to' },
    { key: 'actions', label: 'Action', sortable: false, filterable: false },
  ];

  get tableRows() {
    return this.assets.map((a) => ({
      id: a.id,
      tag: a.assetTag,
      category: a.category,
      model: a.model || '—',
      serial: a.serialNo || '—',
      assigned: a.assignments?.[0]
        ? `${a.assignments[0].employee.user.firstName} ${a.assignments[0].employee.user.lastName}`
        : 'Available',
      _raw: a,
    }));
  }

  get employeeOptions(): SelectOption[] {
    return this.employees.map((e) => ({
      value: e.id,
      label: `${e.user.firstName} ${e.user.lastName}`,
    }));
  }

  async ngOnInit() { await this.load(); }
  async load() {
    try {
      [this.assets, this.employees] = await Promise.all([
        this.api.get<any[]>('/assets'),
        this.api.get<any[]>('/employees'),
      ]);
    }
    catch (e) { this.error = errMsg(e); }
  }
  async create() {
    try {
      if (!this.f.assetTag?.trim() || !this.f.category) { this.error = 'Asset tag and category are required.'; return; }
      await this.api.post('/assets', this.f);
      this.f = {}; await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async assign(asset: any) {
    try {
      await this.api.post(`/assets/${asset.id}/assign/${asset._employeeId}`);
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async returnAsset(asset: any) {
    try {
      await this.api.post(`/assets/assignments/${asset.assignments[0].id}/return`, {
        condition: asset._condition || undefined,
      });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
