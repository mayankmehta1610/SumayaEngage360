import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg, unwrapPaginated } from '../core/api.service';
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
        <div class="e360-table-wrap">
          <table class="e360-table">
            <tr><th>Country</th><th>Code</th><th>Name</th><th>Mandatory</th></tr>
            @for (r of requirements; track r.id) {
              <tr><td>{{ r.country }}</td><td>{{ r.code }}</td><td>{{ r.name }}</td><td>{{ r.mandatory ? 'yes' : 'no' }}</td></tr>
            }
          </table>
        </div>
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
          <div class="e360-table-wrap">
            <table class="e360-table">
              <tr><th>Document</th><th>Status</th><th></th></tr>
              @for (d of selectedCase.employee.documents; track d.id) {
                <tr>
                  <td>{{ d.code }}</td>
                  <td><span class="badge" [class.ok]="d.status==='VERIFIED'" [class.err]="d.status==='REJECTED'">{{ d.status }}</span></td>
                  <td>
                    @if (d.status === 'SUBMITTED') {
                      <button class="secondary" (click)="verify(d.id, true)">Verify</button>
                      <button class="danger" (click)="verify(d.id, false)">Reject</button>
                    }
                  </td>
                </tr>
              } @empty { <tr><td colspan="3" class="e360-muted">No documents submitted yet</td></tr> }
            </table>
          </div>
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
      const res = await this.api.get<any>('/onboarding/cases', {
        page: String(this.page),
        pageSize: String(this.pageSize),
      });
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
