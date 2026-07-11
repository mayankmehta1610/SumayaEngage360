import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService, errMsg } from '../core/api.service';
import { ExportBarComponent } from '../core/export-bar.component';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ExportService } from '../core/export.service';

@Component({
  standalone: true,
  imports: [DatePipe, DecimalPipe, ExportBarComponent, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="My profile"
      description="Employee profile, skills, history, and documents."
      icon="user"
      [showReports]="false"
      rolesHint="All authenticated users"
      [breadcrumbs]="[{ label: 'My workspace' }, { label: 'My profile' }]"
    >
      <div actions>@if (me) { <button class="secondary" (click)="print()">🖨 Print / save profile as PDF</button> }</div>
@if (error) { <div class="e360-error">{{ error }}</div> }
    @if (me) {
      <div #printable>
        <div class="card">
          <h2 style="margin-top:0">{{ me.user.firstName }} {{ me.user.lastName }}
            <span class="badge" [class.ok]="me.status==='ACTIVE'" [class.warn]="me.status==='ON_NOTICE'">{{ me.status }}</span>
          </h2>
          <div class="row">
            <div><label>Employee code</label><div>{{ me.employeeCode }}</div></div>
            <div><label>Email</label><div>{{ me.user.email }}</div></div>
            <div><label>Designation</label><div>{{ me.designation }}</div></div>
            <div><label>Department</label><div>{{ me.department?.name ?? '—' }}</div></div>
            <div><label>Reporting manager</label><div>{{ me.manager ? me.manager.user.firstName + ' ' + me.manager.user.lastName : '—' }}</div></div>
            <div><label>Joined</label><div>{{ me.joinDate | date }}</div></div>
            <div><label>Location</label><div>{{ me.location ?? '—' }}</div></div>
          </div>
        </div>

        <div class="card">
          <h2>Skills</h2>
          @for (s of me.skills; track s.skill.name) {
            <span class="badge" style="margin-right:.3rem">{{ s.skill.name }}@if (s.fromApplication) { ✓ }</span>
          } @empty { <span class="muted">No skills recorded.</span> }
          <p class="muted">✓ = tagged when you originally applied</p>
        </div>

        <div class="card">
          <h2>Current project allocations</h2>
          <table>
            <tr><th>Project</th><th>Client / location</th><th>Allocation</th><th>Since</th></tr>
            @for (a of me.allocations; track a.id) {
              <tr>
                <td>{{ a.project.name }} ({{ a.project.code }})</td>
                <td>{{ a.project.location ?? '—' }}</td>
                <td><strong>{{ a.percentage }}%</strong> {{ a.billable ? '· billable' : '' }}</td>
                <td>{{ a.startDate | date }}</td>
              </tr>
            } @empty { <tr><td colspan="4" class="muted">Not allocated to any project.</td></tr> }
          </table>
        </div>

        <div class="card">
          <h2>Assets issued to me</h2>
          <table>
            <tr><th>Tag</th><th>Category</th><th>Model</th><th>Issued</th></tr>
            @for (a of me.assetAssignments; track a.id) {
              <tr><td>{{ a.asset.assetTag }}</td><td>{{ a.asset.category }}</td><td>{{ a.asset.model ?? '—' }}</td><td>{{ a.issuedAt | date }}</td></tr>
            } @empty { <tr><td colspan="4" class="muted">No assets issued.</td></tr> }
          </table>
        </div>

        <div class="card">
          <div class="toolbar" style="margin-bottom:.25rem"><h2 style="margin:0">Salary history</h2>
            <export-bar [rows]="salary" [cols]="salaryCols" name="my-salary-history" />
          </div>
          @for (s of salary; track s.id) {
            <div style="border:1px solid #eef1f6;border-radius:8px;padding: .7rem .9rem;margin-bottom:.6rem">
              <strong>₹ {{ s.annualCtc | number }}</strong> / year
              @if (s.isOffered) { <span class="badge">as offered</span> } @else { <span class="badge ok">revision</span> }
              <span class="muted"> · effective {{ s.effectiveFrom | date }}@if (s.effectiveTo) { – {{ s.effectiveTo | date }} }</span>
              @if (isArray(s.components)) {
                <table style="margin-top:.5rem">
                  <tr><th>Component</th><th>Type</th><th>Monthly</th></tr>
                  @for (c of s.components; track c.code) {
                    <tr><td>{{ c.name }}</td><td>{{ c.type }}</td><td>₹ {{ c.monthly | number }}</td></tr>
                  }
                </table>
              }
            </div>
          } @empty { <p class="muted">No salary structures recorded.</p> }
        </div>
      </div>
    } @else if (!error) {
      <div class="card muted">No employee record is linked to this account (admin/HR-only users don't have one).</div>
    }
  
    </e360-module-shell>
  `,
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  private exporter = inject(ExportService);
  @ViewChild('printable') printable?: ElementRef<HTMLElement>;
  me: any = null;
  salary: any[] = [];
  error = '';
  salaryCols = [
    { key: 'annualCtc', label: 'Annual CTC' },
    { key: 'isOffered', label: 'Offered structure' },
    { key: 'effectiveFrom', label: 'Effective from' },
    { key: 'effectiveTo', label: 'Effective to' },
  ];

  async ngOnInit() {
    try {
      this.me = await this.api.get<any>('/employees/me');
      this.salary = await this.api.get<any[]>('/employees/me/salary');
    } catch (e: any) {
      if (e?.status !== 404) this.error = errMsg(e);
    }
  }
  isArray(v: unknown) { return Array.isArray(v); }
  print() {
    if (this.printable) {
      this.exporter.printElement('My Profile — SumayaEngage360', this.printable.nativeElement);
    }
  }
}
