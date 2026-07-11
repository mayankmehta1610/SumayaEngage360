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
      <table><tr><th>Tag</th><th>Category</th><th>Assigned to</th></tr>
        @for (a of assets; track a.id) {
          <tr>
            <td>{{ a.assetTag }}</td><td>{{ a.category }}</td>
            <td>{{ a.assignments?.[0]?.employee?.user?.firstName ?? '—' }}</td>
          </tr>
        }</table>
    </div>
  
    </e360-module-shell>
  `,
})
export class AssetsComponent implements OnInit {
  private api = inject(ApiService);
  assets: any[] = []; f: any = {}; error = '';

  async ngOnInit() { await this.load(); }
  async load() {
    try { this.assets = await this.api.get<any[]>('/assets'); }
    catch (e) { this.error = errMsg(e); }
  }
  async create() {
    await this.api.post('/assets', this.f);
    this.f = {}; await this.load();
  }
}
