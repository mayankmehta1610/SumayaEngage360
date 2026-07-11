import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModuleShellComponent } from '../ui/module-shell.component';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, ModuleShellComponent],
  template: `
    <e360-module-shell
      title="BGV vendor portal"
      description="Role: BGC_VENDOR — sheet 03/04"
      icon="microscope"
      [showReports]="false"
      rolesHint="BGC_VENDOR"
      [breadcrumbs]="[{ label: 'Administration' }, { label: 'BGV cases' }]"
    >
@if (error) { <div class="e360-error">{{ error }}</div> }
    <div class="card">
      <table><tr><th>Employee</th><th>Status</th><th>Action</th></tr>
        @for (c of cases; track c.id) {
          <tr>
            <td>{{ c.employee?.user?.firstName }} {{ c.employee?.user?.lastName }}</td>
            <td>{{ c.status }}</td>
            <td>
              @if (c.status === 'SUBMITTED_TO_VENDOR') {
                <button (click)="clear(c.id)">Mark clear</button>
                <button (click)="discrepancy(c.id)">Discrepancy</button>
              }
            </td>
          </tr>
        }</table>
    </div>
  
    </e360-module-shell>
  `,
})
export class BgcVendorComponent implements OnInit {
  private api = inject(ApiService);
  cases: any[] = []; error = '';

  async ngOnInit() {
    try { this.cases = await this.api.get<any[]>('/bgc/vendor/cases'); }
    catch (e) { this.error = errMsg(e); }
  }
  async clear(id: string) {
    await this.api.post(`/bgc/vendor/cases/${id}/report`, { status: 'CLEAR', reportSummary: 'All checks passed' });
    this.cases = await this.api.get<any[]>('/bgc/vendor/cases');
  }
  async discrepancy(id: string) {
    await this.api.post(`/bgc/vendor/cases/${id}/report`, { status: 'DISCREPANCY', reportSummary: 'Address mismatch' });
    this.cases = await this.api.get<any[]>('/bgc/vendor/cases');
  }
}
