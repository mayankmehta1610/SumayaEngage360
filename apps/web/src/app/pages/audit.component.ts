import { DatePipe, JsonPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [ExportBarComponent, DatePipe, JsonPipe, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Audit log"
      description="Sheet 05 — NFR audit trail from database"
      icon="shield-check"
      moduleKey="audit"
      auditEntityType="AUDIT_LOG"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Platform' }, { label: 'Audit trail' }]"
    >
      <div actions><export-bar [rows]="rows" [cols]="cols" name="audit-log" /></div>
@if (error) { <div class="e360-error">{{ error }}</div> }

    <div class="card">
      <table>
        <tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr>
        @for (r of rows; track r.id) {
          <tr>
            <td class="muted" style="font-size:.78rem">{{ r.createdAt | date:'short' }}</td>
            <td>{{ r.actorEmail ?? r.actorId ?? '—' }}</td>
            <td>{{ r.action }}</td>
            <td>{{ r.entityType }} {{ r.entityId ? '#' + r.entityId.slice(0,8) : '' }}</td>
            <td class="muted" style="font-size:.75rem;max-width:280px;overflow:hidden;text-overflow:ellipsis">{{ r.details | json }}</td>
          </tr>
        }
      </table>
    </div>
  
    </e360-module-shell>
  `,
})
export class AuditComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  rows: any[] = [];
  error = '';
  cols = [
    { key: 'createdAt', label: 'When' },
    { key: 'action', label: 'Action' },
    { key: 'entityType', label: 'Entity' },
  ];

  async ngOnInit() {
    if (!this.auth.hasRole('TENANT_ADMIN', 'HR')) return;
    try {
      this.rows = await this.api.get<any[]>('/audit?limit=100');
    } catch (e) { this.error = errMsg(e); }
  }
}
