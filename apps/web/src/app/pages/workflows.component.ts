import { Component, OnInit, inject } from '@angular/core';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Workflow designer"
      description="Sheet 04 — versions & state transitions"
      icon="git-branch"
      moduleKey="workflows"
      auditEntityType="WORKFLOW"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Workflow' }, { label: 'Workflows' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    @for (w of workflows; track w.id) {
      <div class="card">
        <h2>{{ w.name }} ({{ w.entityType }})</h2>
        <p class="muted">Steps: @for (s of w.steps; track s.id) { {{ s.stepOrder }}. {{ s.approverType }} → }</p>
        <p>Versions: {{ w.versions?.length ?? 0 }}
          <button (click)="snapshot(w.id)">Save version snapshot</button>
        </p>
      </div>
    }
  
    </e360-module-shell>
  `,
})
export class WorkflowsComponent implements OnInit {
  private api = inject(ApiService);
  workflows: any[] = []; error = '';

  async ngOnInit() {
    try { this.workflows = await this.api.get<any[]>('/approvals/workflows'); }
    catch (e) { this.error = errMsg(e); }
  }
  async snapshot(id: string) {
    const wf = this.workflows.find((w) => w.id === id);
    await this.api.post(`/approvals/workflows/${id}/versions`, {
      definition: { steps: wf?.steps, savedAt: new Date().toISOString() },
    });
    this.workflows = await this.api.get<any[]>('/approvals/workflows');
  }
}
