import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, ExportBarComponent],
  template: `
    <div class="toolbar"><h1>Employees</h1>
      <span style="display:inline-flex;gap:.4rem;align-items:center">
        @if (status) { <span class="badge warn">filtered: {{ status }}</span>
          <button class="secondary" (click)="status = undefined; load()">Clear filter</button> }
        <export-bar [rows]="employees" [cols]="exportCols" name="employees" />
      </span>
    </div>
    @if (error) { <div class="error">{{ error }}</div> }
    <div class="card">
      <h2>Add employee (direct hire)</h2>
      <div class="row">
        <div><label>First name</label><input [(ngModel)]="f.firstName" /></div>
        <div><label>Last name</label><input [(ngModel)]="f.lastName" /></div>
        <div><label>Email</label><input [(ngModel)]="f.email" /></div>
        <div><label>Designation</label><input [(ngModel)]="f.designation" /></div>
        <div><label>Join date</label><input type="date" [(ngModel)]="f.joinDate" /></div>
      </div>
      <button (click)="create()">Add employee</button>
    </div>
    <div class="card">
      <table>
        <tr><th>Code</th><th>Name</th><th>Email</th><th>Designation</th><th>Department</th><th>Joined</th><th>Status</th></tr>
        @for (e of employees; track e.id) {
          <tr>
            <td>{{ e.employeeCode }}</td>
            <td>{{ e.user.firstName }} {{ e.user.lastName }}</td>
            <td>{{ e.user.email }}</td>
            <td>{{ e.designation }}</td>
            <td>{{ e.department?.name ?? '—' }}</td>
            <td>{{ e.joinDate | date }}</td>
            <td><span class="badge" [class.ok]="e.status==='ACTIVE'" [class.warn]="e.status==='ON_NOTICE'">{{ e.status }}</span></td>
          </tr>
        }
      </table>
    </div>
  `,
})
export class EmployeesComponent implements OnInit, OnChanges {
  private api = inject(ApiService);
  @Input() status?: string;
  employees: any[] = [];
  error = '';
  f: any = {};
  exportCols = [
    { key: 'employeeCode', label: 'Code' },
    { key: 'user.firstName', label: 'First name' },
    { key: 'user.lastName', label: 'Last name' },
    { key: 'user.email', label: 'Email' },
    { key: 'designation', label: 'Designation' },
    { key: 'department.name', label: 'Department' },
    { key: 'joinDate', label: 'Joined' },
    { key: 'status', label: 'Status' },
  ];

  async ngOnInit() { await this.load(); }
  ngOnChanges() { this.load(); }
  async load() {
    try {
      this.employees = await this.api.get<any[]>(
        this.status ? `/employees?status=${this.status}` : '/employees',
      );
    } catch (e) { this.error = errMsg(e); }
  }
  async create() {
    try {
      await this.api.post('/employees', {
        ...this.f,
        joinDate: this.f.joinDate ? new Date(this.f.joinDate).toISOString() : undefined,
      });
      this.f = {};
      await this.load();
    } catch (e) { this.error = errMsg(e); }
  }
}
