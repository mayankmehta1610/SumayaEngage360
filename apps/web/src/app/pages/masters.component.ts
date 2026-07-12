import { Component, OnInit, inject } from '@angular/core';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService } from '../core/api.service';
import { CrudCardComponent, CrudColumn, CrudField } from '../ui/crud-card.component';
import { SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [ModuleShellComponent, CrudCardComponent],
  template: `
    <e360-module-shell
      title="Masters & workflow extensions"
      description="Job families, positions, BGV packages, rating scales, country configs, salary components and recognition badges"
      icon="database"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR, MANAGER"
      [breadcrumbs]="[{ label: 'Administration' }, { label: 'Masters' }]"
    >
      <div class="e360-masters-grid">
        <e360-crud-card
          title="Job families"
          icon="briefcase"
          [fields]="jfFields"
          [rows]="families"
          [onCreate]="createJf"
          [onUpdate]="updateJf"
          [onDelete]="deleteJf"
          (changed)="loadFamilies()"
        />

        <e360-crud-card
          title="Positions"
          icon="users-round"
          [fields]="posFields"
          [rows]="positions"
          [onCreate]="createPos"
          [onUpdate]="updatePos"
          [onDelete]="deletePos"
          (changed)="loadPositions()"
        />

        <e360-crud-card
          title="BGV packages"
          icon="shield-check"
          [fields]="bpFields"
          [columns]="bpColumns"
          [rows]="packages"
          [onCreate]="createBp"
          [onUpdate]="updateBp"
          [onDelete]="deleteBp"
          (changed)="loadPackages()"
        />

        <e360-crud-card
          title="Rating scales"
          icon="star"
          [fields]="rsFields"
          [columns]="rsColumns"
          [rows]="ratingScales"
          [onCreate]="createRs"
          [onUpdate]="updateRs"
          [onDelete]="deleteRs"
          (changed)="loadRatingScales()"
        />

        <e360-crud-card
          title="Country configs"
          icon="building"
          [fields]="ccFields"
          [rows]="countryConfigs"
          [onCreate]="createCc"
          [editable]="false"
          [onDelete]="deleteCc"
          (changed)="loadCountryConfigs()"
        />

        <e360-crud-card
          title="Salary components"
          icon="banknote"
          [fields]="scFields"
          [columns]="scColumns"
          [rows]="components"
          [onCreate]="createSc"
          [editable]="false"
          [deletable]="false"
          (changed)="loadComponents()"
        />
      </div>
    </e360-module-shell>
  `,
  styles: [`
    .e360-masters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1rem;
      align-items: start;
    }
  `],
})
export class MastersPageComponent implements OnInit {
  private api = inject(ApiService);

  families: any[] = [];
  positions: any[] = [];
  packages: any[] = [];
  ratingScales: any[] = [];
  countryConfigs: any[] = [];
  components: any[] = [];

  salaryTypeOptions: SelectOption[] = [
    { value: 'EARNING', label: 'Earning' },
    { value: 'DEDUCTION', label: 'Deduction' },
  ];

  // Field configs
  jfFields: CrudField[] = [
    { key: 'code', label: 'Code', placeholder: 'ENG', required: true },
    { key: 'name', label: 'Name', placeholder: 'Engineering', required: true },
  ];
  posFields: CrudField[] = [
    { key: 'code', label: 'Code', placeholder: 'SE2', required: true },
    { key: 'title', label: 'Title', placeholder: 'Senior Engineer', required: true },
  ];
  bpFields: CrudField[] = [
    { key: 'code', label: 'Code', placeholder: 'STD', required: true },
    { key: 'name', label: 'Name', placeholder: 'Standard check', required: true },
  ];
  bpColumns: CrudColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'checks', label: 'Checks' },
  ];
  rsFields: CrudField[] = [
    { key: 'name', label: 'Name', placeholder: '5-point scale', required: true },
    { key: 'levels', label: 'Levels', placeholder: '1,2,3,4,5', required: true },
  ];
  rsColumns: CrudColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'levels', label: 'Levels' },
  ];
  ccFields: CrudField[] = [
    { key: 'country', label: 'Country code', placeholder: 'IN', required: true, default: 'IN' },
  ];
  scFields: CrudField[] = [
    { key: 'code', label: 'Code', placeholder: 'HRA', required: true },
    { key: 'name', label: 'Name', placeholder: 'House rent', required: true },
    { key: 'type', label: 'Type', type: 'select', options: this.salaryTypeOptions, default: 'EARNING' },
  ];
  scColumns: CrudColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
  ];

  async ngOnInit() {
    await Promise.all([
      this.loadFamilies(), this.loadPositions(), this.loadPackages(),
      this.loadRatingScales(), this.loadCountryConfigs(), this.loadComponents(),
    ]);
  }

  loadFamilies = async () => { this.families = await this.api.get('/masters/job-families'); };
  loadPositions = async () => { this.positions = await this.api.get('/masters/positions'); };
  loadPackages = async () => { this.packages = await this.api.get('/masters/bgv-packages'); };
  loadRatingScales = async () => { this.ratingScales = await this.api.get('/masters/rating-scales'); };
  loadCountryConfigs = async () => { this.countryConfigs = await this.api.get('/masters/country-configs'); };
  loadComponents = async () => { this.components = await this.api.get('/payroll/components'); };

  // Job families
  createJf = (d: any) => this.api.post('/masters/job-families', d);
  updateJf = (id: string, d: any) => this.api.patch(`/masters/job-families/${id}`, d);
  deleteJf = (id: string) => this.api.delete(`/masters/job-families/${id}`);

  // Positions
  createPos = (d: any) => this.api.post('/masters/positions', d);
  updatePos = (id: string, d: any) => this.api.patch(`/masters/positions/${id}`, d);
  deletePos = (id: string) => this.api.delete(`/masters/positions/${id}`);

  // BGV packages (checks default to a standard set)
  createBp = (d: any) => this.api.post('/masters/bgv-packages', { ...d, checks: ['ID', 'EMPLOYMENT'] });
  updateBp = (id: string, d: any) => this.api.patch(`/masters/bgv-packages/${id}`, { code: d.code, name: d.name });
  deleteBp = (id: string) => this.api.delete(`/masters/bgv-packages/${id}`);

  // Rating scales (levels is a comma list)
  createRs = (d: any) => this.api.post('/masters/rating-scales', { name: d.name, levels: this.parseLevels(d.levels) });
  updateRs = (id: string, d: any) => this.api.patch(`/masters/rating-scales/${id}`, { name: d.name, levels: this.parseLevels(d.levels) });
  deleteRs = (id: string) => this.api.delete(`/masters/rating-scales/${id}`);

  // Country configs
  createCc = (d: any) => this.api.post('/masters/country-configs', { country: d.country, settings: {} });
  deleteCc = (id: string) => this.api.delete(`/masters/country-configs/${id}`);

  // Salary components (payroll module — add-only here)
  createSc = (d: any) => this.api.post('/payroll/components', d);

  private parseLevels(v: unknown): string[] {
    if (Array.isArray(v)) return v as string[];
    return String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  }
}
