import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Organization masters"
      description="CFG-002 — legal entities, locations, grades, business units, cost centers, employment types"
      icon="building"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Administration' }, { label: 'Org masters' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="grid">
      @for (s of sections; track s.key) {
        <div class="card">
          <h2>{{ s.title }}</h2>
          <input [(ngModel)]="drafts[s.key].code" placeholder="Code" />
          <input [(ngModel)]="drafts[s.key].name" placeholder="Name" />
          <button (click)="add(s)">Add</button>
          <ul>@for (x of data[s.key]; track x.id) { <li>{{ x.code }} — {{ x.name }}</li> }</ul>
        </div>
      }
    </div>
    </e360-module-shell>
  `,
  styles: [`.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; } .card { background: #fff; padding: 1rem; border-radius: 8px; }`],
})
export class OrgMastersComponent implements OnInit {
  private api = inject(ApiService);
  error = '';
  sections = [
    { key: 'legal', title: 'Legal entities', path: '/org-masters/legal-entities' },
    { key: 'locations', title: 'Locations', path: '/org-masters/locations' },
    { key: 'grades', title: 'Grades', path: '/org-masters/grades' },
    { key: 'bu', title: 'Business units', path: '/org-masters/business-units' },
    { key: 'cc', title: 'Cost centers', path: '/org-masters/cost-centers' },
    { key: 'et', title: 'Employment types', path: '/org-masters/employment-types' },
  ] as const;
  data: Record<string, any[]> = {};
  drafts: Record<string, { code: string; name: string }> = {};

  async ngOnInit() {
    for (const s of this.sections) {
      this.drafts[s.key] = { code: '', name: '' };
      this.data[s.key] = [];
    }
    await this.load();
  }

  async load() {
    try {
      await Promise.all(this.sections.map(async (s) => {
        this.data[s.key] = await this.api.get<any[]>(s.path);
      }));
    } catch (e) { this.error = errMsg(e); }
  }

  async add(s: (typeof this.sections)[number]) {
    try {
      await this.api.post(s.path, this.drafts[s.key]);
      this.drafts[s.key] = { code: '', name: '' };
      this.data[s.key] = await this.api.get<any[]>(s.path);
    } catch (e) { this.error = errMsg(e); }
  }
}
