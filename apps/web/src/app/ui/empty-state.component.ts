import { Component, Input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'e360-empty-state',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="e360-empty">
      <div class="e360-empty-icon" aria-hidden="true">
        <e360-icon [name]="icon" [size]="48" />
      </div>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      @if (actionLabel) {
        <button class="secondary" style="margin-top:.75rem" (click)="actionClick?.()">{{ actionLabel }}</button>
      }
    </div>
  `,
  styles: [`
    .e360-empty-icon {
      width: 88px;
      height: 88px;
      margin: 0 auto var(--e360-space-md);
      border-radius: var(--e360-radius-lg);
      background: var(--surface-2);
      border: 1px solid var(--e360-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--e360-text-muted);
    }
  `],
})
export class EmptyStateComponent {
  @Input() title = 'No records found';
  @Input() message = 'Try adjusting your filters or create a new record.';
  @Input() icon = 'inbox-empty';
  @Input() actionLabel = '';
  @Input() actionClick?: () => void;
}
