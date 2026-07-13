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
      <label>Claim title</label><input [(ngModel)]="title" placeholder="June client travel" />
      @for (line of lines; track $index; let i = $index) {
        <div class="row">
          <div><label>Date</label><input [(ngModel)]="line.date" type="date" /></div>
          <div><label>Category</label><select [(ngModel)]="line.category"><option>Travel</option><option>Lodging</option><option>Meals</option><option>Office supplies</option><option>Training</option><option>Other</option></select></div>
          <div><label>Amount</label><input [(ngModel)]="line.amount" type="number" min="0.01" step="0.01" /></div>
          <div><label>Description</label><input [(ngModel)]="line.description" placeholder="Business purpose" /></div>
          <div><label>Receipt file ID</label><input [(ngModel)]="line.receiptFileId" placeholder="Optional uploaded file ID" /></div>
          <div style="flex:0"><button class="danger" (click)="removeLine(i)" [disabled]="lines.length === 1">Remove</button></div>
        </div>
      }
      <p><strong>Claim total:</strong> {{ claimTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</p>
      <button class="secondary" (click)="addLine()">Add line</button>
      <button style="margin-left:.5rem" (click)="create()" [disabled]="busy">Save draft</button>
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
  claims: any[] = []; title = ''; lines: any[] = [this.emptyLine()]; error = ''; busy = false;
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

  get claimTotal() { return this.lines.reduce((sum, line) => sum + Number(line.amount || 0), 0); }

  async ngOnInit() { await this.load(); }
  async load() {
    try {
      this.claims = this.auth.hasRole('MANAGER', 'HR', 'TENANT_ADMIN')
        ? await this.api.get<any[]>('/expenses')
        : await this.api.get<any[]>('/expenses/mine');
    } catch (e) { this.error = errMsg(e); }
  }
  async create() {
    this.error = '';
    if (!this.title.trim()) { this.error = 'Claim title is required.'; return; }
    if (this.lines.some((line) => !line.date || !line.category || Number(line.amount) <= 0)) {
      this.error = 'Every line requires a date, category, and amount greater than zero.'; return;
    }
    this.busy = true;
    try {
      await this.api.post('/expenses', {
        title: this.title.trim(),
        lines: this.lines.map((line) => ({ ...line, amount: Number(line.amount), receiptFileId: line.receiptFileId || undefined })),
      });
      this.title = ''; this.lines = [this.emptyLine()]; await this.load();
    } catch (e) { this.error = errMsg(e); } finally { this.busy = false; }
  }
  async submit(id: string) { try { await this.api.patch(`/expenses/${id}/submit`); await this.load(); } catch (e) { this.error = errMsg(e); } }
  async approve(id: string) { try { await this.api.patch(`/expenses/${id}/approve`); await this.load(); } catch (e) { this.error = errMsg(e); } }
  addLine() { this.lines.push(this.emptyLine()); }
  removeLine(index: number) { if (this.lines.length > 1) this.lines.splice(index, 1); }
  private emptyLine() { return { date: new Date().toISOString().slice(0, 10), category: 'Travel', amount: 0, description: '', receiptFileId: '' }; }
}
