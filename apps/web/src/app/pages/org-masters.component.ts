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
      description="CFG-002 — legal entities, locations, grades"
      icon="building"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Administration' }, { label: 'Org masters' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2>Legal entities</h2>
      <input [(ngModel)]="le.code" placeholder="Code" /> <input [(ngModel)]="le.name" placeholder="Name" />
      <button (click)="addLe()">Add</button>
      <ul>@for (x of legal; track x.id) { <li>{{ x.code }} — {{ x.name }}</li> }</ul>
    </div>
    <div class="card">
      <h2>Locations</h2>
      <input [(ngModel)]="loc.code" placeholder="Code" /> <input [(ngModel)]="loc.name" placeholder="Name" />
      <button (click)="addLoc()">Add</button>
      <ul>@for (x of locations; track x.id) { <li>{{ x.code }} — {{ x.name }}</li> }</ul>
    </div>
    <div class="card">
      <h2>Grades</h2>
      <input [(ngModel)]="gr.code" placeholder="Code" /> <input [(ngModel)]="gr.name" placeholder="Name" />
      <button (click)="addGr()">Add</button>
      <ul>@for (x of grades; track x.id) { <li>{{ x.code }} — {{ x.name }}</li> }</ul>
    </div>
  
    </e360-module-shell>
  `,
})
export class OrgMastersComponent implements OnInit {
  private api = inject(ApiService);
  legal: any[] = []; locations: any[] = []; grades: any[] = [];
  le: any = {}; loc: any = {}; gr: any = {}; error = '';

  async ngOnInit() { await this.load(); }
  async load() {
    try {
      [this.legal, this.locations, this.grades] = await Promise.all([
        this.api.get<any[]>('/org-masters/legal-entities'),
        this.api.get<any[]>('/org-masters/locations'),
        this.api.get<any[]>('/org-masters/grades'),
      ]);
    } catch (e) { this.error = errMsg(e); }
  }
  async addLe() { await this.api.post('/org-masters/legal-entities', this.le); this.le = {}; await this.load(); }
  async addLoc() { await this.api.post('/org-masters/locations', this.loc); this.loc = {}; await this.load(); }
  async addGr() { await this.api.post('/org-masters/grades', this.gr); this.gr = {}; await this.load(); }
}
