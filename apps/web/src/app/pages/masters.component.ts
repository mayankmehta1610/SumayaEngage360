import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService } from '../core/api.service';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ModuleShellComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Masters & workflow extensions"
      description="Job families, positions, BGV packages, rating scales, country configs, recognition badges"
      icon="database"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR, MANAGER"
      [breadcrumbs]="[{ label: 'Administration' }, { label: 'Masters' }]"
    >
<div class="grid">
      <section>
        <h3>Job families</h3>
        <input placeholder="Code" [(ngModel)]="jf.code" />
        <input placeholder="Name" [(ngModel)]="jf.name" />
        <button (click)="addJf()">Add</button>
        <ul><li *ngFor="let x of families">{{ x.code }} — {{ x.name }}</li></ul>
      </section>
      <section>
        <h3>Positions</h3>
        <input placeholder="Code" [(ngModel)]="pos.code" />
        <input placeholder="Title" [(ngModel)]="pos.title" />
        <button (click)="addPos()">Add</button>
        <ul><li *ngFor="let x of positions">{{ x.code }} — {{ x.title }}</li></ul>
      </section>
      <section>
        <h3>BGV packages</h3>
        <input placeholder="Code" [(ngModel)]="bp.code" />
        <input placeholder="Name" [(ngModel)]="bp.name" />
        <button (click)="addBp()">Add</button>
        <ul><li *ngFor="let x of packages">{{ x.code }} — {{ x.name }}</li></ul>
      </section>
      <section>
        <h3>Rating scales</h3>
        <input placeholder="Name" [(ngModel)]="rs.name" />
        <input placeholder="Levels (comma-separated)" [(ngModel)]="rs.levels" />
        <button (click)="addRs()">Add</button>
        <ul><li *ngFor="let x of ratingScales">{{ x.name }}</li></ul>
      </section>
      <section>
        <h3>Country configs</h3>
        <input placeholder="Country code" [(ngModel)]="cc.country" />
        <button (click)="addCc()">Add</button>
        <ul><li *ngFor="let x of countryConfigs">{{ x.country }}</li></ul>
      </section>
      <section>
        <h3>Salary components</h3>
        <input placeholder="Code" [(ngModel)]="sc.code" />
        <input placeholder="Name" [(ngModel)]="sc.name" />
        <e360-select-field
          [options]="salaryComponentTypeOptions"
          [(ngModel)]="sc.type"
        />
        <button (click)="addSc()">Add</button>
        <ul><li *ngFor="let x of components">{{ x.code }} — {{ x.name }} ({{ x.type }})</li></ul>
      </section>
      <section>
        <h3>Recognition badges</h3>
        <input placeholder="Badge name" [(ngModel)]="badgeName" />
        <button (click)="addBadge()">Add</button>
        <ul><li *ngFor="let x of badges">{{ x.name }}</li></ul>
      </section>
      <section>
        <h3>Delegations</h3>
        <button (click)="loadDelegations()">Refresh</button>
        <ul><li *ngFor="let d of delegations">{{ d.delegatorId }} → {{ d.delegateId }}</li></ul>
      </section>
      <section>
        <h3>Workflow rules (SLA / escalation)</h3>
        <button (click)="loadRules()">Refresh</button>
        <ul><li *ngFor="let r of rules">{{ r.ruleType }}: {{ r.name }}</li></ul>
      </section>
    </div>
  
    </e360-module-shell>
  `,
  styles: [`.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } section { background: #fff; padding: 1rem; border-radius: 8px; }`],
})
export class MastersPageComponent implements OnInit {
  families: any[] = [];
  positions: any[] = [];
  packages: any[] = [];
  ratingScales: any[] = [];
  countryConfigs: any[] = [];
  components: any[] = [];
  badges: any[] = [];
  delegations: any[] = [];
  rules: any[] = [];
  jf: any = {};
  pos: any = {};
  bp: any = {};
  rs: any = { name: '', levels: '1,2,3,4,5' };
  cc: any = { country: 'IN' };
  sc: any = { type: 'EARNING' };
  badgeName = '';
  salaryComponentTypeOptions: SelectOption[] = [
    { value: 'DEDUCTION', label: 'Deduction' },
    { value: 'EARNING', label: 'Earning' },
  ];

  constructor(private api: ApiService) {}

  async ngOnInit() {
    await Promise.all([
      this.loadFamilies(), this.loadPositions(), this.loadPackages(),
      this.loadRatingScales(), this.loadCountryConfigs(), this.loadComponents(),
      this.loadBadges(), this.loadDelegations(), this.loadRules(),
    ]);
  }

  async loadFamilies() { this.families = await this.api.get('/masters/job-families'); }
  async loadPositions() { this.positions = await this.api.get('/masters/positions'); }
  async loadPackages() { this.packages = await this.api.get('/masters/bgv-packages'); }
  async loadRatingScales() { this.ratingScales = await this.api.get('/masters/rating-scales'); }
  async loadCountryConfigs() { this.countryConfigs = await this.api.get('/masters/country-configs'); }
  async loadComponents() { this.components = await this.api.get('/payroll/components'); }
  async loadBadges() { this.badges = await this.api.get('/recognition-badges'); }
  async loadDelegations() { this.delegations = await this.api.get('/approvals/delegations'); }
  async loadRules() { this.rules = await this.api.get('/approvals/rules'); }

  async addJf() {
    await this.api.post('/masters/job-families', this.jf);
    this.jf = {};
    await this.loadFamilies();
  }
  async addPos() {
    await this.api.post('/masters/positions', this.pos);
    this.pos = {};
    await this.loadPositions();
  }
  async addBp() {
    await this.api.post('/masters/bgv-packages', { ...this.bp, checks: ['ID', 'EMPLOYMENT'] });
    this.bp = {};
    await this.loadPackages();
  }
  async addRs() {
    const levels = this.rs.levels.split(',').map((s: string) => s.trim()).filter(Boolean);
    await this.api.post('/masters/rating-scales', { name: this.rs.name, levels });
    this.rs = { name: '', levels: '1,2,3,4,5' };
    await this.loadRatingScales();
  }
  async addCc() {
    await this.api.post('/masters/country-configs', { country: this.cc.country, settings: {} });
    this.cc = { country: 'IN' };
    await this.loadCountryConfigs();
  }
  async addSc() {
    await this.api.post('/payroll/components', this.sc);
    this.sc = { type: 'EARNING' };
    await this.loadComponents();
  }
  async addBadge() {
    await this.api.post('/recognition-badges', { name: this.badgeName });
    this.badgeName = '';
    await this.loadBadges();
  }
}
