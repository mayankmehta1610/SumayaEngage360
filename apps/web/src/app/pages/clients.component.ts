import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ExportBarComponent } from '../core/export-bar.component';

@Component({
  standalone: true,
  imports: [FormsModule, ExportBarComponent],
  template: `
    <div class="toolbar"><h1>Hiring clients</h1>
      <export-bar [rows]="clients" [cols]="exportCols" name="hiring-clients" />
    </div>
    <div class="card">
      <h2>Add hiring client</h2>
      <div class="row">
        <div><label>Name</label><input [(ngModel)]="f.name" /></div>
        <div><label>Careers URL slug</label><input [(ngModel)]="f.slug" placeholder="client-x" /></div>
        <div><label>Description</label><input [(ngModel)]="f.description" /></div>
      </div>
      <label><input type="checkbox" [(ngModel)]="f.isInternal" style="width:auto;margin-right:.4rem" />Internal (our own openings)</label>
      @if (error) { <div class="error">{{ error }}</div> }
      <div style="margin-top:.75rem"><button (click)="create()">Add client</button></div>
    </div>
    <div class="card">
      <table>
        <tr><th>Name</th><th>Careers page</th><th>Type</th><th>Status</th></tr>
        @for (c of clients; track c.id) {
          <tr>
            <td>{{ c.name }}</td>
            <td><a [href]="'/careers/' + auth.tenant + '/' + c.slug" target="_blank">/careers/{{ auth.tenant }}/{{ c.slug }}</a></td>
            <td>{{ c.isInternal ? 'internal' : 'client' }}</td>
            <td><span class="badge" [class.ok]="c.isActive">{{ c.isActive ? 'active' : 'inactive' }}</span></td>
          </tr>
        }
      </table>
    </div>
  `,
})
export class ClientsComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  clients: any[] = [];
  error = '';
  f: any = {};
  exportCols = [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Careers slug' },
    { key: 'isInternal', label: 'Internal' },
    { key: 'isActive', label: 'Active' },
  ];

  async ngOnInit() {
    await this.load();
  }
  async load() {
    try {
      this.clients = await this.api.get<any[]>('/hiring-clients');
    } catch (e) {
      this.error = errMsg(e);
    }
  }
  async create() {
    this.error = '';
    try {
      await this.api.post('/hiring-clients', this.f);
      this.f = {};
      await this.load();
    } catch (e) {
      this.error = errMsg(e);
    }
  }
}
