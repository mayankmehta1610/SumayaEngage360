import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { AuthService } from '../core/auth.service';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent, DataTableComponent],
  template: `
    <e360-module-shell
      title="Expenses"
      description="Expense claims, submission, and approval workflow."
      icon="receipt"
      moduleKey="expenses"
      auditEntityType="EXPENSE_CLAIM"
      rolesHint="TENANT_ADMIN, HR, MANAGER, EMPLOYEE"
      [breadcrumbs]="[{ label: 'Compensation' }, { label: 'Expenses' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <h2>New claim</h2>
      <input [(ngModel)]="title" placeholder="Title" />
      <input [(ngModel)]="amount" type="number" placeholder="Amount" />
      <input [(ngModel)]="category" placeholder="Category" />
      <button (click)="create()">Create draft</button>
    </div>
    <div class="card">
      <e360-data-table [columns]="tableCols" [rows]="tableRows" [paginated]="false" [stickyHeader]="true">
        <ng-template #rowTemplate let-row>
          <td>{{ row.title }}</td>
          <td>{{ row.amount }}</td>
          <td>{{ row.status }}</td>
          <td>
            @if (row._raw.status === 'DRAFT') { <button (click)="submit(row.id)">Submit</button> }
            @if (row._raw.status === 'SUBMITTED' && auth.hasRole('MANAGER','HR','TENANT_ADMIN')) {
              <button (click)="approve(row.id)">Approve</button> }
          </td>
        </ng-template>
      </e360-data-table>
    </div>
  
    </e360-module-shell>
  `,
})
export class ExpensesComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  claims: any[] = []; title = ''; amount = 0; category = 'Travel'; error = '';
  tableCols: TableColumn[] = [
    { key: 'title', label: 'Title' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Action', sortable: false, filterable: false },
  ];

  get tableRows() {
    return this.claims.map((c) => ({
      id: c.id,
      title: c.title,
      amount: c.totalAmount,
      status: c.status,
      _raw: c,
    }));
  }

  async ngOnInit() { await this.load(); }
  async load() {
    try {
      this.claims = this.auth.hasRole('MANAGER', 'HR', 'TENANT_ADMIN')
        ? await this.api.get<any[]>('/expenses')
        : await this.api.get<any[]>('/expenses/mine');
    } catch (e) { this.error = errMsg(e); }
  }
  async create() {
    await this.api.post('/expenses', {
      title: this.title,
      lines: [{ date: new Date().toISOString(), category: this.category, amount: Number(this.amount) }],
    });
    this.title = ''; await this.load();
  }
  async submit(id: string) { await this.api.patch(`/expenses/${id}/submit`); await this.load(); }
  async approve(id: string) { await this.api.patch(`/expenses/${id}/approve`); await this.load(); }
}
