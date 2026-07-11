import { Component, OnInit, inject } from '@angular/core';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [ModuleShellComponent],
  template: `
    <e360-module-shell
      title="AI execution checklist"
      description="Sheet 12 — implementation evidence"
      icon="check-circle"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Execution' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }

    <div class="card">
      <table>
        <tr><th>Step</th><th>Sheet</th><th>Evidence</th><th>Status</th></tr>
        @for (s of steps; track s.step) {
          <tr>
            <td>{{ s.step }}</td>
            <td>{{ s.sheetRef }}</td>
            <td>{{ s.evidence }}</td>
            <td><span class="badge" [class.ok]="s.status === 'DONE'">{{ s.status }}</span></td>
          </tr>
        }
      </table>
    </div>
  
    </e360-module-shell>
  `,
})
export class ExecutionComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  steps: any[] = [];
  error = '';

  async ngOnInit() {
    if (!this.auth.hasRole('TENANT_ADMIN', 'HR')) return;
    try {
      const res = await this.api.get<{ steps: any[] }>('/v1/execution/checklist');
      this.steps = res.steps;
    } catch (e) { this.error = errMsg(e); }
  }
}
