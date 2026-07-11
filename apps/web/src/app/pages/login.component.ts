import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { homeForRoles } from '../core/rbac';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="max-width:420px;margin:8vh auto;padding:0 1rem">
      <div class="card">
        <h1 style="margin-top:0">SumayaEngage360</h1>
        <p class="muted">Sign in to your workspace</p>
        <label>Tenant (subdomain — leave empty for platform admin)</label>
        <input [(ngModel)]="tenant" placeholder="acme" autocomplete="organization" />
        <label>Email</label>
        <input [(ngModel)]="email" type="email" autocomplete="username" />
        <label>Password</label>
        <input [(ngModel)]="password" type="password" autocomplete="current-password"
               (keyup.enter)="submit()" />
        @if (error) { <div class="error">{{ error }}</div> }
        <button (click)="submit()" [disabled]="busy" style="width:100%">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  tenant = this.auth.tenant ?? '';
  email = '';
  password = '';
  error = '';
  busy = false;

  async submit() {
    this.busy = true;
    this.error = '';
    try {
      const user = await this.auth.login(this.email, this.password, this.tenant);
      this.router.navigateByUrl(homeForRoles(user.roles));
    } catch (e) {
      this.error = errMsg(e);
    } finally {
      this.busy = false;
    }
  }
}
