import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from './icon.component';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Sort options A–Z by label (stable for equal labels). */
export function sortSelectOptions(options: SelectOption[]): SelectOption[] {
  return [...options].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
}

@Component({
  selector: 'e360-select-field',
  standalone: true,
  imports: [FormsModule, IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectFieldComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="e360-select"
      [class.open]="open"
      [class.disabled]="disabled"
      [class.multiple]="multiple"
      [class.compact]="compact"
    >
      @if (label) {
        <label class="e360-select-label" [attr.for]="triggerId">{{ label }}</label>
      }
      <div class="e360-select-wrap" #wrap>
        <button
          type="button"
          class="e360-select-trigger"
          [id]="triggerId"
          [disabled]="disabled"
          [attr.aria-expanded]="open"
          aria-haspopup="listbox"
          (click)="toggle($event)"
        >
          @if (multiple && selectedChips.length) {
            <span class="e360-select-chips">
              @for (chip of selectedChips; track chip.value) {
                <span class="e360-chip">
                  {{ chip.label }}
                  <button
                    type="button"
                    class="e360-chip-remove"
                    [attr.aria-label]="'Remove ' + chip.label"
                    (click)="removeValue(chip.value, $event)"
                  >×</button>
                </span>
              }
            </span>
          } @else {
            <span class="e360-select-value" [class.placeholder]="!displayLabel">
              {{ displayLabel || placeholder }}
            </span>
          }
          <e360-icon name="chevron-down" [size]="14" class="e360-select-chevron" />
        </button>

        @if (open) {
          <div class="e360-select-panel" role="listbox" [attr.aria-multiselectable]="multiple">
            @if (searchable) {
              <div class="e360-select-search-wrap">
                <input
                  #searchInput
                  class="e360-select-search"
                  type="search"
                  [(ngModel)]="search"
                  (ngModelChange)="highlightIndex = 0"
                  placeholder="Search…"
                  (click)="$event.stopPropagation()"
                  (keydown)="onSearchKeydown($event)"
                />
              </div>
            }
            <ul class="e360-select-options">
              @if (clearable && !multiple && placeholder) {
                <li
                  role="option"
                  class="e360-select-option"
                  [class.highlighted]="highlightIndex === 0 && !filteredOptions.length"
                  [class.selected]="!hasValue"
                  (click)="clearSingle($event)"
                >
                  {{ placeholder }}
                </li>
              }
              @for (opt of filteredOptions; track opt.value; let i = $index) {
                <li
                  role="option"
                  class="e360-select-option"
                  [class.highlighted]="highlightIndex === optionIndex(i)"
                  [class.selected]="isSelected(opt.value)"
                  [class.disabled]="opt.disabled"
                  (click)="pickOption(opt, $event)"
                >
                  @if (multiple) {
                    <input
                      type="checkbox"
                      class="e360-select-check"
                      [checked]="isSelected(opt.value)"
                      tabindex="-1"
                      (click)="$event.stopPropagation()"
                    />
                  }
                  <span>{{ opt.label }}</span>
                </li>
              } @empty {
                <li class="e360-select-empty">No matches</li>
              }
            </ul>
          </div>
        }
      </div>
    </div>
  `,
})
export class SelectFieldComponent implements ControlValueAccessor, OnChanges {
  private host = inject(ElementRef<HTMLElement>);

  @Input() label = '';
  @Input() placeholder = 'Select…';
  @Input() multiple = false;
  @Input() searchable = true;
  @Input() clearable = true;
  @Input() compact = false;
  @Input() disabled = false;
  @Input() options: SelectOption[] = [];

  @Output() valueChange = new EventEmitter<string | string[]>();

  triggerId = `e360-sel-${Math.random().toString(36).slice(2, 9)}`;
  open = false;
  search = '';
  sortedOptions: SelectOption[] = [];
  highlightIndex = 0;

  private value: string | string[] | null = null;
  private onChange: (v: string | string[] | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['options']) {
      this.sortedOptions = sortSelectOptions(this.options);
    }
  }

  get filteredOptions(): SelectOption[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.sortedOptions;
    return this.sortedOptions.filter((o) => o.label.toLowerCase().includes(q));
  }

  get hasValue(): boolean {
    if (this.multiple) return Array.isArray(this.value) && this.value.length > 0;
    return this.value !== null && this.value !== undefined && this.value !== '';
  }

  get displayLabel(): string {
    if (this.multiple) return '';
    const v = this.value;
    if (v === null || v === undefined || v === '') return '';
    return this.sortedOptions.find((o) => o.value === v)?.label ?? String(v);
  }

  get selectedChips(): SelectOption[] {
    if (!this.multiple || !Array.isArray(this.value)) return [];
    return this.value
      .map((v) => this.sortedOptions.find((o) => o.value === v) ?? { value: v, label: v })
      .filter(Boolean);
  }

  writeValue(val: string | string[] | null): void {
    if (this.multiple) {
      this.value = Array.isArray(val) ? val : val ? [String(val)] : [];
    } else {
      this.value = val === null || val === undefined ? '' : String(val);
    }
  }

  registerOnChange(fn: (v: string | string[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  isSelected(val: string): boolean {
    if (this.multiple) return Array.isArray(this.value) && this.value.includes(val);
    return this.value === val;
  }

  toggle(ev: Event) {
    ev.stopPropagation();
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) {
      this.search = '';
      this.highlightIndex = 0;
      setTimeout(() => this.focusSearch(), 0);
    } else {
      this.onTouched();
    }
  }

  pickOption(opt: SelectOption, ev: Event) {
    ev.stopPropagation();
    if (opt.disabled) return;
    if (this.multiple) {
      const current = Array.isArray(this.value) ? [...this.value] : [];
      const idx = current.indexOf(opt.value);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(opt.value);
      this.emit(current);
    } else {
      this.emit(opt.value);
      this.close();
    }
  }

  clearSingle(ev: Event) {
    ev.stopPropagation();
    this.emit('');
    this.close();
  }

  removeValue(val: string, ev: Event) {
    ev.stopPropagation();
    if (!this.multiple || !Array.isArray(this.value)) return;
    this.emit(this.value.filter((v) => v !== val));
  }

  close() {
    this.open = false;
    this.search = '';
    this.onTouched();
  }

  optionIndex(listIndex: number): number {
    return this.clearable && !this.multiple && this.placeholder ? listIndex + 1 : listIndex;
  }

  onSearchKeydown(ev: KeyboardEvent) {
    const opts = this.filteredOptions;
    const offset = this.clearable && !this.multiple && this.placeholder ? 1 : 0;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      const max = offset + opts.length - 1;
      this.highlightIndex = Math.min(this.highlightIndex + 1, Math.max(0, max));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.highlightIndex = Math.max(this.highlightIndex - 1, 0);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      if (this.highlightIndex === 0 && offset) {
        this.clearSingle(ev);
        return;
      }
      const opt = opts[this.highlightIndex - offset];
      if (opt) this.pickOption(opt, ev);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      this.close();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent) {
    if (!this.open) return;
    if (!this.host.nativeElement.contains(ev.target as Node)) this.close();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape' && this.open) this.close();
  }

  private emit(val: string | string[]) {
    this.value = val;
    this.onChange(val);
    this.valueChange.emit(val);
  }

  private focusSearch() {
    const el = this.host.nativeElement.querySelector('.e360-select-search') as HTMLInputElement | null;
    el?.focus();
  }
}
