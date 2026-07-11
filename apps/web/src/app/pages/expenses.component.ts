import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent],
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
      <table><tr><th>Title</th><th>Amount</th><th>Status</th><th>Action</th></tr>
        @for (c of claims; track c.id) {
          <tr>
            <td>{{ c.title }}</td><td>{{ c.totalAmount }}</td><td>{{ c.status }}</td>
            <td>
              @if (c.status === 'DRAFT') { <button (click)="submit(c.id)">Submit</button> }
              @if (c.status === 'SUBMITTED' && auth.hasRole('MANAGER','HR','TENANT_ADMIN')) {
                <button (click)="approve(c.id)">Approve</button> }
            </td>
          </tr>
        }</table>
    </div>
  
    </e360-module-shell>
  `,
})
export class ExpensesComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  claims: any[] = []; title = ''; amount = 0; category = 'Travel'; error = '';

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
