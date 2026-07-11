import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Preboarding"
      description="CFG-004 — personal data & onboarding tasks"
      icon="clipboard-check"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Workforce' }, { label: 'Preboarding' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2>Onboarding tasks</h2>
      <table><tr><th>Employee</th><th>Type</th><th>Title</th><th>Status</th><th></th></tr>
        @for (t of tasks; track t.id) {
          <tr>
            <td>{{ t.employeeId?.slice(0,8) }}</td><td>{{ t.taskType }}</td><td>{{ t.title }}</td><td>{{ t.status }}</td>
            <td>@if (t.status !== 'COMPLETED') { <button (click)="complete(t.id)">Complete</button> }</td>
          </tr>
        }</table>
    </div>
    <div class="card">
      <h2>Init tasks for employee</h2>
      <input [(ngModel)]="employeeId" placeholder="Employee UUID" />
      <button (click)="init()">Init IT/Buddy/Induction tasks</button>
    </div>
  
    </e360-module-shell>
  `,
})
export class PreboardingAdminComponent implements OnInit {
  private api = inject(ApiService);
  tasks: any[] = []; employeeId = ''; error = '';

  async ngOnInit() {
    try { this.tasks = await this.api.get<any[]>('/preboarding/tasks'); }
    catch (e) { this.error = errMsg(e); }
  }
  async complete(id: string) {
    await this.api.patch(`/preboarding/tasks/${id}/complete`);
    this.tasks = await this.api.get<any[]>('/preboarding/tasks');
  }
  async init() {
    await this.api.post(`/preboarding/tasks/init/${this.employeeId}`, {});
    this.tasks = await this.api.get<any[]>('/preboarding/tasks');
  }
}
