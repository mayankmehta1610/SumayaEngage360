import { Component, Input, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService, errMsg } from '../core/api.service';
import { BreadcrumbsComponent, BreadcrumbItem } from './breadcrumbs.component';
import { PageHeaderComponent } from './page-header.component';
import { ModuleReportsComponent } from './module-reports.component';
import { IconComponent } from './icon.component';
import { EmptyStateComponent } from './empty-state.component';

@Component({
  selector: 'e360-module-shell',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    PageHeaderComponent,
    ModuleReportsComponent,
    IconComponent,
    EmptyStateComponent,
    DatePipe,
  ],
  template: `
    <e360-breadcrumbs [items]="breadcrumbs" />
    <div class="e360-toolbar">
      <e360-page-header [title]="title" [description]="description" [icon]="icon" [rolesHint]="rolesHint" />
      <ng-content select="[actions]"></ng-content>
    </div>

    <div class="e360-tabs">
      <button class="e360-tab" [class.active]="tab === 'data'" (click)="tab = 'data'">
        <e360-icon name="database" [size]="15" /> Data
      </button>
      @if (showReports) {
        <button class="e360-tab" [class.active]="tab === 'reports'" (click)="tab = 'reports'">
          <e360-icon name="file-bar-chart" [size]="15" /> Reports
        </button>
      }
      @if (auditEntityType) {
        <button class="e360-tab" [class.active]="tab === 'audit'" (click)="loadAudit(); tab = 'audit'">
          <e360-icon name="history" [size]="15" /> Audit history
        </button>
      }
    </div>

    @if (tab === 'data') {
      <ng-content></ng-content>
    }
    @if (tab === 'reports' && showReports) {
      <e360-module-reports [moduleKey]="moduleKey" />
    }
    @if (tab === 'audit' && auditEntityType) {
      <div class="card">
        @if (auditLoading) { <p class="e360-muted">Loading audit trail…</p> }
        @else if (auditError) { <div class="e360-error">{{ auditError }}</div> }
        @else if (!auditLogs.length) {
          <e360-empty-state title="No audit entries" message="No audit records for this module yet." />
        } @else {
          <div class="e360-table-wrap">
            <table class="e360-table">
              <tr><th>When</th><th>Action</th><th>Entity</th><th>User</th></tr>
              @for (log of auditLogs; track log.id) {
                <tr>
                  <td>{{ log.createdAt | date:'medium' }}</td>
                  <td><span class="e360-badge">{{ log.action }}</span></td>
                  <td>{{ log.entityType }} {{ log.entityId ?? '' }}</td>
                  <td class="e360-muted">{{ log.userId ?? '—' }}</td>
                </tr>
              }
            </table>
          </div>
        }
      </div>
    }
  `,
})
export class ModuleShellComponent implements OnInit {
  @Input() title = '';
  @Input() description = '';
  @Input() icon = 'database';
  @Input() moduleKey = '';
  @Input() rolesHint = '';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
  @Input() showReports = true;
  @Input() auditEntityType = '';

  private api = inject(ApiService);

  tab: 'data' | 'reports' | 'audit' = 'data';
  auditLogs: any[] = [];
  auditLoading = false;
  auditError = '';
  auditLoaded = false;

  ngOnInit() {
    if (!this.breadcrumbs.length && this.title) {
      this.breadcrumbs = [{ label: this.title }];
    }
  }

  async loadAudit() {
    if (this.auditLoaded || !this.auditEntityType) return;
    this.auditLoading = true;
    this.auditError = '';
    try {
      this.auditLogs = await this.api.get<any[]>(`/audit?entityType=${encodeURIComponent(this.auditEntityType)}&limit=50`);
      this.auditLoaded = true;
    } catch (e) { this.auditError = errMsg(e); }
    finally { this.auditLoading = false; }
  }
}
