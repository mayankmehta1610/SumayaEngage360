import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
import { tableListParams, TableSort } from '../core/table-query.util';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportBarComponent } from '../core/export-bar.component';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent, ModuleShellComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Onboarding"
      description="Document requirements and onboarding case management."
      icon="user-plus"
      moduleKey="onboarding"
      auditEntityType="ONBOARDING_CASE"
      rolesHint="TENANT_ADMIN, HR, INTERVIEWER"
      [breadcrumbs]="[{ label: 'Workforce' }, { label: 'Onboarding' }]"
    >
      <div actions><export-bar [rows]="cases" [cols]="exportCols" name="onboarding-cases" /></div>
      @if (error) { <div class="e360-error">{{ error }}</div> }

      <div class="card">
        <h2>Document requirements (per country)</h2>
        <div class="row" style="align-items:flex-end">
          <div><label>Country</label><input [(ngModel)]="req.country" placeholder="IN" /></div>
          <div><label>Code</label><input [(ngModel)]="req.code" placeholder="AADHAAR" /></div>
          <div><label>Name</label><input [(ngModel)]="req.name" placeholder="Aadhaar card" /></div>
          <div style="flex:0"><button class="secondary" (click)="addReq()">Add</button></div>
        </div>
        <e360-data-table
          [columns]="reqCols"
          [rows]="reqRows"
          [paginated]="false"
          [stickyHeader]="true"
        />
      </div>

      <div class="card">
        <div class="e360-toolbar">
          <h2 style="margin:0">Cases ({{ total }})</h2>
        </div>
        <e360-data-table
          [columns]="caseCols"
          [rows]="caseRows"
          [page]="page"
          [pageSize]="pageSize"
          [total]="total"
          [loading]="loading"
          [stickyHeader]="true"
          [rowClickable]="true"
          [selectedId]="selectedCaseId"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
          (sortChange)="onSortChange($event)"
          (filterChange)="onFilterChange($event)"
          (rowClick)="onCaseClick($event)"
          emptyMessage="No onboarding cases yet."
        />
      </div>

      @if (selectedCase) {
        <div class="card">
          <div class="toolbar" style="margin-bottom:.25rem">
            <strong>{{ selectedCase.employee.user.firstName }} {{ selectedCase.employee.user.lastName }}
              <span class="e360-muted">({{ selectedCase.employee.employeeCode }})</span></strong>
            <span class="badge" [class.ok]="selectedCase.status === 'COMPLETED'">{{ selectedCase.status }}</span>
          </div>
          <e360-data-table
            [columns]="docCols"
            [rows]="docRows"
            [paginated]="false"
            [stickyHeader]="true"
          >
            <ng-template #rowTemplate let-row>
              <td>{{ row.document }}</td>
              <td><span class="badge" [class.ok]="row.status==='VERIFIED'" [class.err]="row.status==='REJECTED'">{{ row.status }}</span></td>
              <td>
                @if (row.status === 'SUBMITTED') {
                  <button class="secondary" (click)="verify(row.id, true)">Verify</button>
                  <button class="danger" (click)="verify(row.id, false)">Reject</button>
                }
              </td>
            </ng-template>
          </e360-data-table>
          @if (selectedCase.status !== 'COMPLETED') {
            <button style="margin-top:.5rem" (click)="approve(selectedCase.id)">Approve onboarding → employee ACTIVE</button>
          }
        </div>
      }
    </e360-module-shell>
  `,
})
export class OnboardingComponent implements OnInit {
  private api = inject(ApiService);
  cases: any[] = [];
  requirements: any[] = [];
  error = '';
  req: any = { country: 'IN' };
  loading = false;
  page = 1;
  pageSize = 25;
  total = 0;
  sort: TableSort | null = null;
  columnFilters: Record<string, string> = {};
  selectedCaseId: string | null = null;
  selectedCase: any = null;

  exportCols = [
    { key: 'employee.employeeCode', label: 'Code' },
    { key: 'employee.user.firstName', label: 'First name' },
    { key: 'employee.user.lastName', label: 'Last name' },
    { key: 'employee.user.email', label: 'Email' },
    { key: 'status', label: 'Status' },
  ];
  caseCols: TableColumn[] = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Employee', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'documents', label: 'Documents', sortable: true },
  ];
  reqCols: TableColumn[] = [
    { key: 'country', label: 'Country' },
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'mandatory', label: 'Mandatory' },
  ];
  docCols: TableColumn[] = [
    { key: 'document', label: 'Document' },
    { key: 'status', label: 'Status', filterable: false },
    { key: 'actions', label: '', sortable: false, filterable: false },
  ];

  get reqRows() {
    return this.requirements.map((r) => ({
      country: r.country,
      code: r.code,
      name: r.name,
      mandatory: r.mandatory ? 'yes' : 'no',
    }));
  }

  get docRows() {
    return (this.selectedCase?.employee?.documents ?? []).map((d: any) => ({
      id: d.id,
      document: d.code,
      status: d.status,
    }));
  }

  get caseRows() {
    return this.cases.map((c) => ({
      id: c.id,
      code: c.employee?.employeeCode ?? '—',
      name: `${c.employee?.user?.firstName ?? ''} ${c.employee?.user?.lastName ?? ''}`.trim() || '—',
      email: c.employee?.user?.email ?? '—',
      status: c.status,
      documents: c.employee?.documents?.length ?? 0,
      _raw: c,
    }));
  }

  async ngOnInit() { await this.load(); }

  onPageChange(p: number) {
    this.page = p;
    this.loadCases();
  }

  onPageSizeChange(ps: number) {
    this.pageSize = ps;
    this.page = 1;
    this.loadCases();
  }

  onSortChange(s: { key: string; dir: 'asc' | 'desc' }) {
    this.sort = s;
    this.page = 1;
    this.loadCases();
  }

  onFilterChange(f: Record<string, string>) {
    this.columnFilters = f;
    this.page = 1;
    this.loadCases();
  }

  onCaseClick(row: Record<string, unknown>) {
    const id = String(row['id'] ?? '');
    if (this.selectedCaseId === id) {
      this.selectedCaseId = null;
      this.selectedCase = null;
      return;
    }
    this.selectedCaseId = id;
    this.selectedCase = (row['_raw'] as any) ?? this.cases.find((c) => c.id === id);
  }

  async load() {
    try {
      this.requirements = await this.api.get<any[]>('/onboarding/requirements');
      await this.loadCases();
    } catch (e) { this.error = errMsg(e); }
  }

  async loadCases() {
    this.loading = true;
    try {
      const params = tableListParams(this.page, this.pageSize, {}, this.sort, this.columnFilters);
      const res = await this.api.get<any>('/onboarding/cases', params);
      const { items, meta } = unwrapPaginated(res);
      this.cases = items;
      this.total = meta?.total ?? items.length;
      if (this.selectedCaseId && !items.some((c: any) => c.id === this.selectedCaseId)) {
        this.selectedCaseId = null;
        this.selectedCase = null;
      } else if (this.selectedCaseId) {
        this.selectedCase = items.find((c: any) => c.id === this.selectedCaseId);
      }
    } catch (e) { this.error = errMsg(e); }
    finally { this.loading = false; }
  }

  async addReq() {
    try {
      await this.api.post('/onboarding/requirements', this.req);
      this.req = { country: this.req.country };
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async verify(id: string, approve: boolean) {
    try {
      await this.api.post(`/onboarding/documents/${id}/verify`, {
        approve, rejectionReason: approve ? undefined : 'Not legible / mismatch',
      });
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
  async approve(id: string) {
    try {
      await this.api.post(`/onboarding/cases/${id}/approve`);
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
