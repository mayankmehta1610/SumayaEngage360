import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="toolbar"><h1>Departments & designations</h1></div>
    @if (error) { <div class="error">{{ error }}</div> }
    <div class="row">
      <div class="card">
        <h2>Departments</h2>
        <div class="row" style="align-items:flex-end">
          <div><label>Name</label><input [(ngModel)]="deptName" placeholder="IT" /></div>
          <div style="flex:0"><button class="secondary" (click)="addDept()">Add</button></div>
        </div>
        <table>
          <tr><th>Name</th><th>Head</th><th>Employees</th><th>Set head</th></tr>
          @for (d of departments; track d.id) {
            <tr>
              <td>{{ d.name }}</td>
              <td>{{ headName(d.headId) }}</td>
              <td>{{ d._count?.employees ?? 0 }}</td>
              <td>
                <select [(ngModel)]="d._head" (change)="setHead(d)">
                  <option [ngValue]="undefined">choose…</option>
                  @for (e of employees; track e.id) {
                    <option [ngValue]="e.id">{{ e.user.firstName }} {{ e.user.lastName }}</option>
                  }
                </select>
              </td>
            </tr>
          }
        </table>
      </div>
      <div class="card">
        <h2>Designations</h2>
        <div class="row" style="align-items:flex-end">
          <div><label>Name</label><input [(ngModel)]="desigName" placeholder="Senior Engineer" /></div>
          <div><label>Level</label><input type="number" [(ngModel)]="desigLevel" /></div>
          <div style="flex:0"><button class="secondary" (click)="addDesig()">Add</button></div>
        </div>
        <table>
          <tr><th>Name</th><th>Level</th></tr>
          @for (d of designations; track d.id) { <tr><td>{{ d.name }}</td><td>{{ d.level }}</td></tr> }
        </table>
      </div>
    </div>
  `,
})
export class OrgComponent implements OnInit {
  private api = inject(ApiService);
  departments: any[] = [];
  designations: any[] = [];
  employees: any[] = [];
  error = '';
  deptName = '';
  desigName = '';
  desigLevel = 0;

  async ngOnInit() { await this.load(); }
  async load() {
    try {
      [this.departments, this.designations, this.employees] = await Promise.all([
        this.api.get<any[]>('/departments'),
        this.api.get<any[]>('/designations'),
        this.api.get<any[]>('/employees'),
      ]);
    } catch (e) { this.error = errMsg(e); }
  }
  headName(id?: string) {
    const e = this.employees.find((x) => x.id === id);
    return e ? `${e.user.firstName} ${e.user.lastName}` : '—';
  }
  async addDept() {
    try { await this.api.post('/departments', { name: this.deptName }); this.deptName = ''; await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async addDesig() {
    try { await this.api.post('/designations', { name: this.desigName, level: this.desigLevel }); this.desigName = ''; await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
  async setHead(d: any) {
    if (!d._head) return;
    try { await this.api.post(`/departments/${d.id}/head/${d._head}`); await this.load(); }
    catch (e) { this.error = errMsg(e); }
  }
}
