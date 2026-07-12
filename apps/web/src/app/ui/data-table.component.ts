import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { EmptyStateComponent } from './empty-state.component';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'e360-data-table',
  standalone: true,
  imports: [FormsModule, IconComponent, EmptyStateComponent],
  template: `
  @if (searchable || filterable) {
    <div class="e360-filters">
      @if (searchable && !filterable) {
        <div>
          <label>Search</label>
          <input [(ngModel)]="search" (ngModelChange)="onSearchChange()" placeholder="Filter rows…" />
        </div>
      }
      <ng-content select="[filters]"></ng-content>
    </div>
  }

  @if (loading) {
    <p class="e360-muted">Loading…</p>
  } @else if (!displayRows.length) {
    <e360-empty-state [title]="emptyTitle" [message]="emptyMessage" />
  } @else {
    <div class="e360-table-wrap" [class.e360-table-sticky]="stickyHeader" [style.max-height]="stickyHeader ? maxHeight : null">
      <table class="e360-table e360-table-zebra" [class.e360-table-clickable]="rowClickable">
        <thead>
          <tr>
            @for (col of columns; track col.key) {
              <th>
                @if (col.sortable) {
                  <button class="ghost sm" (click)="toggleSort(col.key)" style="padding:0;font-weight:inherit;color:inherit">
                    {{ col.label }}
                    @if (sortKey === col.key) { {{ sortDir === 'asc' ? '↑' : '↓' }} }
                  </button>
                } @else { {{ col.label }} }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of pagedRows; track trackBy(row, $index)) {
            <tr
              [class.e360-row-selected]="selectedRowKey && row[selectedRowKey] === selectedId"
              (click)="onRowClick(row)"
            >
              @for (col of columns; track col.key) {
                <td>{{ cellValue(row, col.key) }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if (paginated) {
      <div class="e360-pagination">
        <span>{{ meta.from }}–{{ meta.to }} of {{ meta.total }}</span>
        <div class="pages">
          @if (pageSizeOptions.length > 1) {
            <label class="e360-muted" style="font-size:.75rem;margin-right:.35rem">Rows</label>
            <select [ngModel]="pageSize" (ngModelChange)="onPageSizeChange($event)">
              @for (ps of pageSizeOptions; track ps) {
                <option [ngValue]="ps">{{ ps }}</option>
              }
            </select>
          }
          <button class="secondary sm" [disabled]="page <= 1" (click)="setPage(page - 1)">
            <e360-icon name="chevron-left" [size]="14" />
          </button>
          <span>Page {{ page }} / {{ meta.totalPages }}</span>
          <button class="secondary sm" [disabled]="page >= meta.totalPages" (click)="setPage(page + 1)">
            <e360-icon name="chevron-right" [size]="14" />
          </button>
        </div>
      </div>
    }
  }
  `,
})
export class DataTableComponent implements OnChanges {
  @Input() columns: TableColumn[] = [];
  @Input() rows: Record<string, unknown>[] = [];
  @Input() searchable = true;
  @Input() filterable = false;
  @Input() paginated = true;
  @Input() pageSize = 15;
  @Input() pageSizeOptions: number[] = [10, 25, 50];
  @Input() page = 1;
  @Input() total?: number;
  @Input() loading = false;
  @Input() stickyHeader = false;
  @Input() maxHeight = 'min(70vh, 640px)';
  @Input() rowClickable = false;
  @Input() selectedRowKey = 'id';
  @Input() selectedId: string | null = null;
  @Input() emptyTitle = 'No records found';
  @Input() emptyMessage = 'Try adjusting your filters.';
  @Input() trackBy: (row: Record<string, unknown>, i: number) => unknown = (_r, i) => i;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() rowClick = new EventEmitter<Record<string, unknown>>();
  @Output() sortChange = new EventEmitter<{ key: string; dir: 'asc' | 'desc' }>();

  search = '';
  sortKey = '';
  sortDir: 'asc' | 'desc' = 'asc';
  displayRows: Record<string, unknown>[] = [];

  get serverMode() { return this.total !== undefined && this.total !== null; }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rows'] || changes['searchable']) this.applyFilters();
    if (changes['page'] && !changes['page'].firstChange) {
      // keep in sync when parent controls page
    }
  }

  onSearchChange() {
    this.page = 1;
    this.pageChange.emit(this.page);
    this.applyFilters();
  }

  toggleSort(key: string) {
    if (this.sortKey === key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortKey = key; this.sortDir = 'asc'; }
    this.sortChange.emit({ key: this.sortKey, dir: this.sortDir });
    if (!this.serverMode) this.applyFilters();
  }

  setPage(p: number) {
    this.page = Math.max(1, Math.min(p, this.meta.totalPages));
    this.pageChange.emit(this.page);
  }

  onPageSizeChange(ps: number) {
    this.pageSize = ps;
    this.page = 1;
    this.pageSizeChange.emit(ps);
    this.pageChange.emit(this.page);
  }

  onRowClick(row: Record<string, unknown>) {
    if (this.rowClickable) this.rowClick.emit(row);
  }

  get pagedRows() {
    if (!this.paginated || this.serverMode) return this.displayRows;
    const start = (this.page - 1) * this.pageSize;
    return this.displayRows.slice(start, start + this.pageSize);
  }

  get meta() {
    const total = this.serverMode ? (this.total ?? 0) : this.displayRows.length;
    const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    const from = total ? (this.page - 1) * this.pageSize + 1 : 0;
    const to = this.serverMode
      ? Math.min(this.page * this.pageSize, total)
      : Math.min(this.page * this.pageSize, total);
    return { total, totalPages, from, to };
  }

  cellValue(row: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], row) ?? '—';
  }

  private applyFilters() {
    if (this.serverMode) {
      this.displayRows = [...this.rows];
      return;
    }
    let list = [...this.rows];
    if (this.searchable && this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter((r) =>
        this.columns.some((c) => String(this.cellValue(r, c.key) ?? '').toLowerCase().includes(q)),
      );
    }
    if (this.sortKey && !this.serverMode) {
      const k = this.sortKey;
      const dir = this.sortDir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const av = String(this.cellValue(a, k) ?? '');
        const bv = String(this.cellValue(b, k) ?? '');
        return av.localeCompare(bv) * dir;
      });
    }
    this.displayRows = list;
  }
}
