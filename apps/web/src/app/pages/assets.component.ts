import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent],
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
      <input [(ngModel)]="f.assetTag" placeholder="Tag" />
      <input [(ngModel)]="f.category" placeholder="Category" />
      <input [(ngModel)]="f.model" placeholder="Model" />
      <button (click)="create()">Add</button>
    </div>
    <div class="card">
      <table><tr><th>Tag</th><th>Category</th><th>Assigned to</th><th>Action</th></tr>
        @for (a of assets; track a.id) {
          <tr>
            <td>{{ a.assetTag }}</td><td>{{ a.category }}</td>
            <td>
              @if (a.assignments?.[0]) {
                {{ a.assignments[0].employee.user.firstName }} {{ a.assignments[0].employee.user.lastName }}
              } @else { <span class="muted">Available</span> }
            </td>
            <td>
              @if (a.assignments?.[0]) {
                <input [(ngModel)]="a._condition" placeholder="Return condition" />
                <button class="secondary" (click)="returnAsset(a)">Return</button>
              } @else {
                <select [(ngModel)]="a._employeeId">
                  <option [ngValue]="undefined">Select employee</option>
                  @for (e of employees; track e.id) {
                    <option [ngValue]="e.id">{{ e.user.firstName }} {{ e.user.lastName }}</option>
                  }
                </select>
                <button (click)="assign(a)" [disabled]="!a._employeeId">Assign</button>
              }
            </td>
          </tr>
        }</table>
    </div>
  
    </e360-module-shell>
  `,
})
export class AssetsComponent implements OnInit {
  private api = inject(ApiService);
  assets: any[] = []; employees: any[] = []; f: any = {}; error = '';

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
