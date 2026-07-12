import { Component, Input, inject } from '@angular/core';
import { ThemeService } from '../core/theme.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'e360-theme-toggle',
  standalone: true,
  imports: [IconComponent],
  template: `
    <button
      type="button"
      class="e360-theme-toggle"
      (click)="theme.toggle()"
      [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
      [title]="theme.isDark() ? 'Light mode' : 'Dark mode'"
    >
      <e360-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="iconSize" />
    </button>
  `,
})
export class ThemeToggleComponent {
  theme = inject(ThemeService);
  @Input() iconSize = 18;
}
