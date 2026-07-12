import { Component, OnInit, inject } from '@angular/core';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService } from '../core/api.service';
import { CrudCardComponent, CrudField } from '../ui/crud-card.component';

interface OrgSection {
  key: string;
  title: string;
  icon: string;
  path: string;
  fields: CrudField[];
}

@Component({
  standalone: true,
  imports: [ModuleShellComponent, CrudCardComponent],
  template: `
    <e360-module-shell
      title="Organization masters"
      description="CFG-002 — legal entities, locations, grades, business units, cost centers, employment types"
      icon="building"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Administration' }, { label: 'Org masters' }]"
    >
      <div class="e360-org-grid">
        @for (s of sections; track s.key) {
          <e360-crud-card
            [title]="s.title"
            [icon]="s.icon"
            [fields]="s.fields"
            [rows]="data[s.key]"
            [onCreate]="creator(s)"
            [onUpdate]="updater(s)"
            [onDelete]="remover(s)"
            (changed)="reload(s)"
          />
        }
      </div>
    </e360-module-shell>
  `,
  styles: [`
    .e360-org-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1rem;
      align-items: start;
    }
  `],
})
export class OrgMastersComponent implements OnInit {
  private api = inject(ApiService);

  private codeName: CrudField[] = [
    { key: 'code', label: 'Code', placeholder: 'Code', required: true },
    { key: 'name', label: 'Name', placeholder: 'Name', required: true },
  ];

  sections: OrgSection[] = [
    { key: 'legal', title: 'Legal entities', icon: 'building-2', path: '/org-masters/legal-entities', fields: this.codeName },
    { key: 'locations', title: 'Locations', icon: 'building', path: '/org-masters/locations', fields: this.codeName },
    { key: 'grades', title: 'Grades', icon: 'star', path: '/org-masters/grades', fields: [
      { key: 'code', label: 'Code', placeholder: 'G1', required: true },
      { key: 'name', label: 'Name', placeholder: 'Grade 1', required: true },
      { key: 'level', label: 'Level', type: 'number', placeholder: '1' },
    ] },
    { key: 'bu', title: 'Business units', icon: 'network', path: '/org-masters/business-units', fields: this.codeName },
    { key: 'cc', title: 'Cost centers', icon: 'banknote', path: '/org-masters/cost-centers', fields: this.codeName },
    { key: 'et', title: 'Employment types', icon: 'briefcase', path: '/org-masters/employment-types', fields: this.codeName },
  ];

  data: Record<string, any[]> = {};

  async ngOnInit() {
    for (const s of this.sections) this.data[s.key] = [];
    await Promise.all(this.sections.map((s) => this.reload(s)));
  }

  reload = async (s: OrgSection) => {
    this.data[s.key] = await this.api.get<any[]>(s.path);
  };

  creator(s: OrgSection) {
    return (d: any) => this.api.post(s.path, this.coerce(d));
  }
  updater(s: OrgSection) {
    return (id: string, d: any) => this.api.patch(`${s.path}/${id}`, this.coerce(d));
  }
  remover(s: OrgSection) {
    return (id: string) => this.api.delete(`${s.path}/${id}`);
  }

  /** grades.level must be a number when present */
  private coerce(d: any): any {
    const out = { ...d };
    if (out.level !== undefined && out.level !== null && out.level !== '') {
      out.level = Number(out.level);
    } else {
      delete out.level;
    }
    return out;
  }
}
