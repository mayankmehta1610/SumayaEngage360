import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { AuthService } from '../core/auth.service';
import { DataTableComponent, TableColumn } from '../ui/data-table.component';
import { SelectFieldComponent, SelectOption } from '../ui/select-field.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ModuleShellComponent, SelectFieldComponent, DataTableComponent],
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
          <select [(ngModel)]="calFrequency"><option value="MONTHLY">Monthly</option><option value="BIWEEKLY">Biweekly</option><option value="WEEKLY">Weekly</option></select>
          <input [(ngModel)]="calPayDay" type="number" min="1" max="31" placeholder="Pay day" />
          <button (click)="createCal()">Create</button>
        </div>
        <ul>@for (c of calendars; track c.id) { <li>{{ c.name }} · {{ c.frequency }} · pay day {{ c.payDay }}</li> }</ul>
      </div>
      <div class="card">
        <h2>Run payroll</h2>
        <e360-select-field
          placeholder="Select calendar"
          [options]="calendarOptions"
          [(ngModel)]="runCalId"
        />
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
          <e360-data-table [columns]="payslipCols" [rows]="payslipRows" [pageSize]="15" [stickyHeader]="true" />
        </div>
      }

      <div class="card">
        <h2>Add payroll adjustment</h2>
        <div class="row">
          <div><label>Employee</label><select [(ngModel)]="adjustment.employeeId">
            <option value="">Choose employee</option>
            @for (e of employees; track e.id) { <option [value]="e.id">{{ employeeName(e.id) }}</option> }
          </select></div>
          <div><label>Type</label><select [(ngModel)]="adjustment.type">
            @for (type of adjustmentTypes; track type) { <option [value]="type">{{ type }}</option> }
          </select></div>
          <div><label>Amount</label><input type="number" min="0" [(ngModel)]="adjustment.amount" /></div>
          <div><label>Payroll month</label><input type="month" [(ngModel)]="adjustment.period" /></div>
          @if (adjustment.type === 'LOAN' || adjustment.type === 'ADVANCE') {
            <div><label>Monthly recovery</label><input type="number" min="0" [(ngModel)]="adjustment.monthlyRecover" /></div>
          }
          <div><label>Note</label><input [(ngModel)]="adjustment.note" /></div>
        </div>
        <button (click)="createAdjustment()" [disabled]="!adjustment.employeeId || !adjustment.amount || !adjustment.period">Add adjustment</button>
        <table><tr><th>Employee</th><th>Type</th><th>Period</th><th>Amount</th><th>Balance</th></tr>
          @for (a of adjustments; track a.id) {
            <tr><td>{{ employeeName(a.employeeId) }}</td><td>{{ a.type }}</td><td>{{ a.period }}</td><td>{{ a.amount }}</td><td>{{ a.balance ?? '-' }}</td></tr>
          } @empty { <tr><td colspan="5" class="muted">No payroll adjustments.</td></tr> }
        </table>
      </div>

      <div class="card">
        <h2>Tax declaration verification</h2>
        <table><tr><th>Employee</th><th>Fiscal year</th><th>Regime</th><th>Total</th><th>Status</th><th>Action</th></tr>
          @for (d of declarations; track d.id) {
            <tr><td>{{ employeeName(d.employeeId) }}</td><td>{{ d.fiscalYear }}</td><td>{{ d.regime }}</td><td>{{ d.total }}</td><td>{{ d.status }}</td>
              <td>@if (d.status !== 'VERIFIED') { <button class="secondary" (click)="verifyDeclaration(d.id)">Verify</button> }</td></tr>
          } @empty { <tr><td colspan="6" class="muted">No tax declarations submitted.</td></tr> }
        </table>
      </div>

      <div class="card">
        <h2>🇮🇳 India statutory calculator (PF · ESI · PT · TDS)</h2>
        <p class="e360-muted" style="margin-top:0">
          Statutory deductions are auto-added to payslips for India tenants when a payroll run is processed.
          Preview the calculation here{{ statConfig ? ' · rates as of ' + statConfig.asOf : '' }}.
        </p>
        <div class="row" style="align-items:flex-end">
          <div><label>Monthly gross (₹)</label><input type="number" min="0" [(ngModel)]="stat.monthlyGross" /></div>
          <div><label>Monthly basic + DA (₹)</label><input type="number" min="0" [(ngModel)]="stat.monthlyBasic" /></div>
          <e360-select-field label="State (professional tax)" [options]="statStateOptions" [(ngModel)]="stat.state" placeholder="No PT / other state" />
          <div><label>Tax regime</label><select [(ngModel)]="stat.regime"><option>NEW</option><option>OLD</option></select></div>
          @if (stat.regime === 'OLD') {
            <div><label>Declared deductions (annual ₹)</label><input type="number" min="0" [(ngModel)]="stat.annualDeclaredDeductions" /></div>
          }
          <div style="flex:0"><button (click)="computeStatutory()" [disabled]="!stat.monthlyGross">Calculate</button></div>
        </div>
        @if (statResult) {
          <table style="margin-top:.6rem">
            <tr><th>Component</th><th>Employee / month</th><th>Employer / month</th></tr>
            <tr><td>Provident fund (EPF on ₹{{ statResult.pf.wages }})</td><td>₹{{ statResult.pf.employee }}</td>
              <td>₹{{ statResult.pf.employerEpf + statResult.pf.employerEps }} (EPS ₹{{ statResult.pf.employerEps }} + EPF ₹{{ statResult.pf.employerEpf }}) + EDLI/admin ₹{{ statResult.pf.edli + statResult.pf.admin }}</td></tr>
            <tr><td>ESI {{ statResult.esi.applicable ? '' : '(not applicable — gross above ceiling)' }}</td>
              <td>₹{{ statResult.esi.employee }}</td><td>₹{{ statResult.esi.employer }}</td></tr>
            <tr><td>Professional tax {{ statResult.state ? '(' + statResult.state + ')' : '(no PT state selected)' }}</td>
              <td>₹{{ statResult.pt.monthly }}</td><td>—</td></tr>
            <tr><td>TDS ({{ statResult.regime }} regime · taxable ₹{{ statResult.tds.taxableIncome }})</td>
              <td>₹{{ statResult.tds.monthly }}</td><td>—</td></tr>
            <tr><th>Total</th><th>₹{{ statResult.monthlyEmployeeDeductions }}</th><th>₹{{ statResult.monthlyEmployerCost }}</th></tr>
            <tr><th>Net take-home</th><th colspan="2">₹{{ statResult.netMonthly }}</th></tr>
          </table>
          <p class="e360-muted" style="font-size:.78rem">{{ statResult.notice }}</p>
        }
      </div>
    } @else {
      <div class="card"><h2>My payslips</h2>
        <e360-data-table [columns]="mySlipCols" [rows]="mySlipRows" [pageSize]="15" [stickyHeader]="true" />
      </div>
      <div class="card"><h2>My payroll adjustments</h2>
        <table><tr><th>Type</th><th>Period</th><th>Amount</th><th>Outstanding</th></tr>
          @for (a of myAdjustments; track a.id) { <tr><td>{{ a.type }}</td><td>{{ a.period }}</td><td>{{ a.amount }}</td><td>{{ a.balance ?? '-' }}</td></tr> }
          @empty { <tr><td colspan="4" class="muted">No adjustments.</td></tr> }
        </table>
      </div>
      <div class="card"><h2>Tax declaration</h2>
        <div class="row">
          <div><label>Fiscal year</label><input [(ngModel)]="tax.fiscalYear" placeholder="2026-27" /></div>
          <div><label>Regime</label><select [(ngModel)]="tax.regime"><option>NEW</option><option>OLD</option></select></div>
        </div>
        @for (item of taxItems; track $index; let i = $index) {
          <div class="row">
            <div><label>Section</label><input [(ngModel)]="item.section" placeholder="80C" /></div>
            <div><label>Description</label><input [(ngModel)]="item.description" placeholder="Investment" /></div>
            <div><label>Amount</label><input type="number" min="0" [(ngModel)]="item.amount" /></div>
            <div style="flex:0"><button class="danger" (click)="taxItems.splice(i, 1)" aria-label="Remove declaration item">Remove</button></div>
          </div>
        }
        <button class="secondary" (click)="taxItems.push({ section: '', description: '', amount: 0 })">Add item</button>
        <button style="margin-left:.5rem" (click)="submitDeclaration()" [disabled]="!tax.fiscalYear">Submit declaration</button>
        <table><tr><th>Fiscal year</th><th>Regime</th><th>Total</th><th>Status</th></tr>
          @for (d of myDeclarations; track d.id) { <tr><td>{{ d.fiscalYear }}</td><td>{{ d.regime }}</td><td>{{ d.total }}</td><td>{{ d.status }}</td></tr> }
          @empty { <tr><td colspan="4" class="muted">No declarations submitted.</td></tr> }
        </table>
      </div>
    }
  
    </e360-module-shell>
  `,
})
export class PayrollComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  calendars: any[] = []; runs: any[] = []; payslips: any[] = []; mySlips: any[] = [];
  employees: any[] = []; adjustments: any[] = []; declarations: any[] = [];
  myAdjustments: any[] = []; myDeclarations: any[] = [];
  adjustmentTypes = ['BONUS', 'INCENTIVE', 'OVERTIME', 'ARREAR', 'RECOVERY', 'LOAN', 'ADVANCE'];
  adjustment: any = { type: 'BONUS', period: new Date().toISOString().slice(0, 7) };
  tax: any = { regime: 'NEW' };
  taxItems: any[] = [{ section: '', description: '', amount: 0 }];
  statConfig: any = null;
  stat: any = { regime: 'NEW', state: '' };
  statResult: any = null;

  get statStateOptions(): SelectOption[] {
    return (this.statConfig?.ptStates ?? []).map((s: string) => ({
      value: s,
      label: s.replace(/_/g, ' '),
    }));
  }

  async computeStatutory() {
    this.error = '';
    try {
      this.statResult = await this.api.post('/payroll/india/statutory', {
        monthlyGross: Number(this.stat.monthlyGross),
        monthlyBasic: Number(this.stat.monthlyBasic || this.stat.monthlyGross * 0.5),
        state: this.stat.state || undefined,
        regime: this.stat.regime,
        annualDeclaredDeductions: this.stat.annualDeclaredDeductions
          ? Number(this.stat.annualDeclaredDeductions)
          : undefined,
      });
    } catch (e) { this.error = errMsg(e); }
  }
  calName = ''; calFrequency = 'MONTHLY'; calPayDay = 28; runCalId = ''; periodStart = ''; periodEnd = ''; error = '';
  payslipCols: TableColumn[] = [
    { key: 'employee', label: 'Employee' },
    { key: 'gross', label: 'Gross' },
    { key: 'net', label: 'Net' },
  ];
  mySlipCols: TableColumn[] = [
    { key: 'period', label: 'Period' },
    { key: 'net', label: 'Net pay' },
  ];

  get payslipRows() {
    return this.payslips.map((p) => ({
      employee: `${p.employee?.user?.firstName ?? ''} ${p.employee?.user?.lastName ?? ''}`.trim() || '—',
      gross: p.grossPay,
      net: p.netPay,
    }));
  }

  get mySlipRows() {
    return this.mySlips.map((p) => ({
      period: p.payrollRun?.periodStart ? new Date(p.payrollRun.periodStart).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—',
      net: p.netPay,
    }));
  }

  get calendarOptions(): SelectOption[] {
    return this.calendars.map((c) => ({ value: c.id, label: c.name }));
  }

  async ngOnInit() {
    try {
      if (this.auth.hasRole('TENANT_ADMIN', 'HR')) {
        [this.calendars, this.runs, this.employees, this.adjustments, this.declarations] = await Promise.all([
          this.api.get<any[]>('/payroll/calendars'),
          this.api.get<any[]>('/payroll/runs'),
          this.api.get<any[]>('/employees'),
          this.api.get<any[]>('/payroll/adjustments'),
          this.api.get<any[]>('/payroll/tax-declarations'),
        ]);
        this.statConfig = await this.api
          .get<any>('/payroll/india/statutory-config')
          .catch(() => null);
      } else {
        [this.mySlips, this.myAdjustments, this.myDeclarations] = await Promise.all([
          this.api.get<any[]>('/payroll/payslips/mine'),
          this.api.get<any[]>('/payroll/adjustments/mine'),
          this.api.get<any[]>('/payroll/tax-declarations/mine'),
        ]);
      }
    } catch (e) { this.error = errMsg(e); }
  }

  async createCal() {
    this.error = '';
    if (!this.calName.trim() || this.calPayDay < 1 || this.calPayDay > 31) { this.error = 'Calendar name and a pay day from 1 through 31 are required.'; return; }
    try {
      await this.api.post('/payroll/calendars', { name: this.calName.trim(), frequency: this.calFrequency, payDay: Number(this.calPayDay) });
      this.calendars = await this.api.get<any[]>('/payroll/calendars');
      this.calName = '';
    } catch (e) { this.error = errMsg(e); }
  }

  async createRun() {
    this.error = '';
    if (!this.runCalId || !this.periodStart || !this.periodEnd) { this.error = 'Calendar, period start, and period end are required.'; return; }
    try {
      await this.api.post('/payroll/runs', { calendarId: this.runCalId, periodStart: this.periodStart, periodEnd: this.periodEnd });
      this.runs = await this.api.get<any[]>('/payroll/runs');
    } catch (e) { this.error = errMsg(e); }
  }

  async process(id: string) {
    try { await this.api.post(`/payroll/runs/${id}/process`, {}); this.runs = await this.api.get<any[]>('/payroll/runs'); }
    catch (e) { this.error = errMsg(e); }
  }

  async viewPayslips(id: string) {
    this.payslips = await this.api.get<any[]>(`/payroll/runs/${id}/payslips`);
  }

  employeeName(id: string) {
    const employee = this.employees.find((e) => e.id === id);
    return employee ? `${employee.user.firstName} ${employee.user.lastName}` : id;
  }

  async createAdjustment() {
    try {
      await this.api.post('/payroll/adjustments', { ...this.adjustment, amount: Number(this.adjustment.amount), monthlyRecover: this.adjustment.monthlyRecover ? Number(this.adjustment.monthlyRecover) : undefined });
      this.adjustments = await this.api.get<any[]>('/payroll/adjustments');
      this.adjustment = { type: 'BONUS', period: new Date().toISOString().slice(0, 7) };
    } catch (e) { this.error = errMsg(e); }
  }

  async verifyDeclaration(id: string) {
    try { await this.api.post(`/payroll/tax-declarations/${id}/verify`); this.declarations = await this.api.get<any[]>('/payroll/tax-declarations'); }
    catch (e) { this.error = errMsg(e); }
  }

  async submitDeclaration() {
    try {
      const items = this.taxItems.filter((item) => item.section.trim()).map((item) => ({ ...item, amount: Number(item.amount) }));
      await this.api.post('/payroll/tax-declarations', { ...this.tax, items });
      this.myDeclarations = await this.api.get<any[]>('/payroll/tax-declarations/mine');
    } catch (e) { this.error = errMsg(e); }
  }
}
