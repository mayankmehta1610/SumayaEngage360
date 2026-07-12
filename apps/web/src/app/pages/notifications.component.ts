import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { ApiService, errMsg } from '../core/api.service';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Notifications"
      description="Sheet 09/12 — templates & delivery"
      icon="bell"
      [showReports]="false"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Workflow' }, { label: 'Notifications' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2>Templates</h2>
      <input [(ngModel)]="tpl.code" placeholder="Code" />
      <e360-select-field
        [options]="channelOptions"
        [(ngModel)]="tpl.channel"
      />
      <input [(ngModel)]="tpl.subject" placeholder="Subject" />
      <textarea [(ngModel)]="tpl.body" placeholder="Body with {{'{{name}}'}}"></textarea>
      <button (click)="create()">Create template</button>
      <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true" />
    </div>
    <div class="card"><h2>Recent deliveries</h2>
      <ul>@for (d of deliveries; track d.id) { <li>{{ d.channel }} → {{ d.recipient }} ({{ d.status }})</li> }</ul>
    </div>
  
    </e360-module-shell>
  `,
})
export class NotificationsComponent implements OnInit {
  private api = inject(ApiService);
  templates: any[] = []; deliveries: any[] = [];
  tpl: any = { channel: 'EMAIL', body: 'Hello {{name}}' }; error = '';
  channelOptions: SelectOption[] = [
    { value: 'EMAIL', label: 'EMAIL' },
    { value: 'SMS', label: 'SMS' },
    { value: 'WHATSAPP', label: 'WHATSAPP' },
  ];
  tableCols: TableColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'channel', label: 'Channel' },
    { key: 'subject', label: 'Subject' },
  ];

  get tableRows() {
    return this.templates.map((t) => ({
      code: t.code,
      channel: t.channel,
      subject: t.subject,
    }));
  }

  async ngOnInit() {
    try {
      [this.templates, this.deliveries] = await Promise.all([
        this.api.get<any[]>('/notifications/templates'),
        this.api.get<any[]>('/notifications/deliveries'),
      ]);
    } catch (e) { this.error = errMsg(e); }
  }
  async create() {
    await this.api.post('/notifications/templates', this.tpl);
    this.templates = await this.api.get<any[]>('/notifications/templates');
    this.tpl = { channel: 'EMAIL', body: 'Hello {{name}}' };
  }
}
