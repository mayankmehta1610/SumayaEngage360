import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Manpower requests"
      description="Headcount requests and approval workflow."
      icon="users-2"
      moduleKey="manpower"
      auditEntityType="MANPOWER_REQUEST"
      rolesHint="TENANT_ADMIN, HR, MANAGER"
      [breadcrumbs]="[{ label: 'Operations' }, { label: 'Manpower' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <input [(ngModel)]="f.title" placeholder="Role title" />
      <input [(ngModel)]="f.headcount" type="number" placeholder="Headcount" />
      <button (click)="create()">Create</button>
    </div>
    <div class="card">
      <table><tr><th>Title</th><th>Count</th><th>Status</th><th>Actions</th></tr>
        @for (r of requests; track r.id) {
          <tr>
            <td>{{ r.title }}</td><td>{{ r.headcount }}</td><td>{{ r.status }}</td>
            <td>
              @if (r.status === 'DRAFT') { <button (click)="submit(r.id)">Submit</button> }
              @if (r.status === 'SUBMITTED' && auth.hasRole('HR','TENANT_ADMIN')) {
                <button (click)="approve(r.id)">Approve</button> }
            </td>
          </tr>
        }</table>
    </div>
  
    </e360-module-shell>
  `,
})
export class ManpowerComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  requests: any[] = []; f: any = { headcount: 1 }; error = '';

  async ngOnInit() {
    try { this.requests = await this.api.get<any[]>('/manpower'); }
    catch (e) { this.error = errMsg(e); }
  }
  async create() {
    await this.api.post('/manpower', this.f);
    this.requests = await this.api.get<any[]>('/manpower');
    this.f = { headcount: 1 };
  }
  async submit(id: string) { await this.api.patch(`/manpower/${id}/submit`); this.requests = await this.api.get<any[]>('/manpower'); }
  async approve(id: string) { await this.api.patch(`/manpower/${id}/approve`); this.requests = await this.api.get<any[]>('/manpower'); }
}
