import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';
import { tableListParams, TableSort } from '../core/table-query.util';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent, SelectFieldComponent],
  template: `
    <e360-module-shell
      title="Agency contacts"
      description="CRM contacts — clients, hiring managers, vendors."
      icon="contact"
      moduleKey="agency-contacts"
      rolesHint="TENANT_ADMIN, HR"
      [breadcrumbs]="[{ label: 'Agency' }, { label: 'Contacts' }]"
    >
      @if (error) { <div class="e360-error">{{ error }}</div> }

      <div class="card">
        <h2 style="margin-top:0">Add contact</h2>
        <div class="row" style="align-items:flex-end">
          <e360-select-field
            label="Type"
            [options]="typeOptions"
            [(ngModel)]="form.type"
            [clearable]="false"
          />
          <div><label>Name</label><input [(ngModel)]="form.name" /></div>
          <div><label>Email</label><input [(ngModel)]="form.email" /></div>
          <div><label>Phone</label><input [(ngModel)]="form.phone" /></div>
          <div><label>Company</label><input [(ngModel)]="form.company" /></div>
          <div style="flex:0"><button (click)="add()">Add</button></div>
        </div>
      </div>

      <div class="card">
        <e360-data-table
          [columns]="cols"
          [rows]="rows"
          [page]="page"
          [pageSize]="pageSize"
          [total]="total"
          [loading]="loading"
          [stickyHeader]="true"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onFilterChange($event)"
        />
      </div>
    </e360-module-shell>
  `,
})
export class AgencyContactsComponent implements OnInit {
  private api = inject(ApiService);
  contacts: any[] = [];
  error = '';
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};
  form: any = { type: 'CLIENT' };

  typeOptions: SelectOption[] = [
    'CLIENT', 'HIRING_MANAGER', 'RECRUITER', 'VENDOR', 'OTHER',
  ].map((v) => ({ value: v, label: v.replace(/_/g, ' ') }));

  cols: TableColumn[] = [
    { key: 'type', label: 'Type' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'company', label: 'Company' },
  ];

  get rows() {
    return this.contacts.map((c) => ({
      type: c.type,
      name: c.name,
      email: c.email ?? '—',
      phone: c.phone ?? '—',
      company: c.company ?? '—',
    }));
  }

  async ngOnInit() {
    await this.load();
  }

  onPageChange(p: number) {
    this.page = p;
    this.load();
  }

  onPageSizeChange(ps: number) {
    this.pageSize = ps;
    this.page = 1;
    this.load();
  }

  onSortChange(s: { key: string; dir: 'asc' | 'desc' }) {
    this.sort = s;
    this.page = 1;
    this.load();
  }

  onFilterChange(f: Record<string, string>) {
    this.columnFilters = f;
    this.page = 1;
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      const res = await this.api.get<any>(
        '/agency/contacts',
        tableListParams(this.page, this.pageSize, {}, this.sort, this.columnFilters),
      );
      const { items, meta } = unwrapPaginated(res);
      this.contacts = items;
      this.total = meta?.total ?? items.length;
      this.error = '';
    } catch (e) {
      this.error = errMsg(e);
    } finally {
      this.loading = false;
    }
  }

  async add() {
    try {
      await this.api.post('/agency/contacts', this.form);
      this.form = { type: 'CLIENT' };
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
}
