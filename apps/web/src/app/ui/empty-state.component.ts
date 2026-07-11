import { Component, Input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'e360-empty-state',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="e360-empty">
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none" aria-hidden="true">
        <rect x="10" y="20" width="100" height="50" rx="8" fill="#e2e8f0"/>
        <rect x="20" y="32" width="50" height="6" rx="3" fill="#cbd5e1"/>
        <rect x="20" y="44" width="70" height="6" rx="3" fill="#cbd5e1"/>
        <rect x="20" y="56" width="40" height="6" rx="3" fill="#cbd5e1"/>
        <circle cx="90" cy="28" r="12" fill="#dbeafe"/>
        <e360-icon name="search" [size]="14" style="position:absolute;margin:18px 0 0 82px;color:#64748b"/>
      </svg>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      @if (actionLabel) {
        <button class="secondary" style="margin-top:.75rem" (click)="actionClick?.()">{{ actionLabel }}</button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = 'No records found';
  @Input() message = 'Try adjusting your filters or create a new record.';
  @Input() actionLabel = '';
  @Input() actionClick?: () => void;
}
