import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Masters & workflow extensions"
      description="Job families, BGV packages, delegations, and workflow rules."
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
        <h3>BGV packages</h3>
        <input placeholder="Code" [(ngModel)]="bp.code" />
        <input placeholder="Name" [(ngModel)]="bp.name" />
        <button (click)="addBp()">Add</button>
        <ul><li *ngFor="let x of packages">{{ x.code }} — {{ x.name }}</li></ul>
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
  packages: any[] = [];
  delegations: any[] = [];
  rules: any[] = [];
  jf: any = {};
  bp: any = {};

  constructor(private api: ApiService) {}

  async ngOnInit() {
    await Promise.all([this.loadFamilies(), this.loadPackages(), this.loadDelegations(), this.loadRules()]);
  }

  async loadFamilies() { this.families = await this.api.get('/masters/job-families'); }
  async loadPackages() { this.packages = await this.api.get('/masters/bgv-packages'); }
  async loadDelegations() { this.delegations = await this.api.get('/approvals/delegations'); }
  async loadRules() { this.rules = await this.api.get('/approvals/rules'); }

  async addJf() {
    await this.api.post('/masters/job-families', this.jf);
    this.jf = {};
    await this.loadFamilies();
  }
  async addBp() {
    await this.api.post('/masters/bgv-packages', { ...this.bp, checks: ['ID', 'EMPLOYMENT'] });
    this.bp = {};
    await this.loadPackages();
  }
}
