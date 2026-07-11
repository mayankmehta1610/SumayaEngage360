import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="Payroll"
      description="Payroll calendars, runs, and payslip management."
      icon="banknote"
      moduleKey="payroll"
      auditEntityType="PAYROLL_RUN"
      rolesHint="TENANT_ADMIN, HR · Employees: view own payslips"
      [breadcrumbs]="[{ label: 'Compensation' }, { label: 'Payroll' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    @if (auth.hasRole('TENANT_ADMIN', 'HR')) {
      <div class="card">
        <h2>Payroll calendar</h2>
        <div class="row">
          <input [(ngModel)]="calName" placeholder="Calendar name" />
          <button (click)="createCal()">Create</button>
        </div>
        <ul>@for (c of calendars; track c.id) { <li>{{ c.name }} (pay day {{ c.payDay }})</li> }</ul>
      </div>
      <div class="card">
        <h2>Run payroll</h2>
        <select [(ngModel)]="runCalId"><option value="">Select calendar</option>
          @for (c of calendars; track c.id) { <option [value]="c.id">{{ c.name }}</option> }</select>
        <input type="date" [(ngModel)]="periodStart" /> <input type="date" [(ngModel)]="periodEnd" />
        <button (click)="createRun()">Create run</button>
        @for (r of runs; track r.id) {
          <div style="margin-top:.5rem">
            {{ r.periodStart | date:'shortDate' }} – {{ r.periodEnd | date:'shortDate' }} · {{ r.status }}
            @if (r.status === 'DRAFT') { <button (click)="process(r.id)">Process</button> }
            @if (r.status === 'COMPLETED') { <button (click)="viewPayslips(r.id)">View payslips ({{ r._count?.payslips }})</button> }
          </div>
        }
      </div>
      @if (payslips.length) {
        <div class="card"><h2>Payslips</h2>
          <table><tr><th>Employee</th><th>Gross</th><th>Net</th></tr>
            @for (p of payslips; track p.id) {
              <tr><td>{{ p.employee?.user?.firstName }} {{ p.employee?.user?.lastName }}</td>
                <td>{{ p.grossPay }}</td><td>{{ p.netPay }}</td></tr>
            }</table>
        </div>
      }
    } @else {
      <div class="card"><h2>My payslips</h2>
        <table><tr><th>Period</th><th>Net pay</th></tr>
          @for (p of mySlips; track p.id) {
            <tr><td>{{ p.payrollRun?.periodStart | date:'MMM yyyy' }}</td><td>{{ p.netPay }}</td></tr>
          }</table>
      </div>
    }
  
    </e360-module-shell>
  `,
})
export class PayrollComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  calendars: any[] = []; runs: any[] = []; payslips: any[] = []; mySlips: any[] = [];
  calName = ''; runCalId = ''; periodStart = ''; periodEnd = ''; error = '';

  async ngOnInit() {
    try {
      if (this.auth.hasRole('TENANT_ADMIN', 'HR')) {
        [this.calendars, this.runs] = await Promise.all([
          this.api.get<any[]>('/payroll/calendars'),
          this.api.get<any[]>('/payroll/runs'),
        ]);
      } else {
        this.mySlips = await this.api.get<any[]>('/payroll/payslips/mine');
      }
    } catch (e) { this.error = errMsg(e); }
  }

  async createCal() {
    await this.api.post('/payroll/calendars', { name: this.calName });
    this.calendars = await this.api.get<any[]>('/payroll/calendars');
    this.calName = '';
  }

  async createRun() {
    await this.api.post('/payroll/runs', { calendarId: this.runCalId, periodStart: this.periodStart, periodEnd: this.periodEnd });
    this.runs = await this.api.get<any[]>('/payroll/runs');
  }

  async process(id: string) {
    await this.api.post(`/payroll/runs/${id}/process`, {});
    this.runs = await this.api.get<any[]>('/payroll/runs');
  }

  async viewPayslips(id: string) {
    this.payslips = await this.api.get<any[]>(`/payroll/runs/${id}/payslips`);
  }
}
