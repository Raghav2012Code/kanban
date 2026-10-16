import { IconArrowBackUp, IconArrowForwardUp, IconSearch, IconX } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { PriorityFilter, SortMode } from '../types/kanban';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FilterPopover } from './FilterPopover';

interface TopBarProps {
  search: string;
  priorityFilter: PriorityFilter;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: PriorityFilter) => void;
  overdueOnly: boolean;
  onOverdueOnlyChange: (value: boolean) => void;
  dueWithinDays: number | null;
  onDueWithinChange: (value: number | null) => void;
  columnTitle: string;
  onColumnTitleChange: (value: string) => void;
  filedWithinDays: number | null;
  onFiledWithinChange: (value: number | null) => void;
  sort: SortMode;
  onSortChange: (value: SortMode) => void;
  /** How many view dimensions are not at their default, shown on the Filters trigger. */
  filterCount: number;
  onResetFilters: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  transfer: ReactNode;
  stats: ReactNode;
}

/**
 * One slim bar: brand, search, the Filters popover, the board actions and the
 * totals. Everything the old header stacked as permanent controls now hangs off
 * a single trigger, so the board itself owns the page.
 */
export function TopBar({ search, priorityFilter, onSearchChange, onPriorityChange, overdueOnly, onOverdueOnlyChange, dueWithinDays, onDueWithinChange, columnTitle, onColumnTitleChange, filedWithinDays, onFiledWithinChange, sort, onSortChange, filterCount, onResetFilters, canUndo, canRedo, onUndo, onRedo, transfer, stats }: TopBarProps): JSX.Element {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <BrandMark className="h-4 w-4" />
          <h1 className="font-display text-[15px] font-semibold tracking-tight text-ink">Docket</h1>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-faint lg:inline">Personal workspace</span>
        </div>

        <div className="order-last w-full min-[520px]:order-none min-[520px]:w-60 lg:w-72">
          <div className="relative flex w-full items-center">
            <IconSearch size={15} stroke={1.5} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && search) {
                  event.stopPropagation();
                  onSearchChange('');
                }
              }}
              placeholder="Search"
              aria-label="Search cards by title or description"
              className={cn('h-9 w-full pl-8', search && 'pr-8')}
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                title="Clear search"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-faint hover:text-ink"
              >
                <IconX size={14} stroke={1.5} />
              </Button>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <FilterPopover
            priority={priorityFilter}
            onPriorityChange={onPriorityChange}
            dueWithinDays={dueWithinDays}
            onDueWithinChange={onDueWithinChange}
            filedWithinDays={filedWithinDays}
            onFiledWithinChange={onFiledWithinChange}
            columnTitle={columnTitle}
            onColumnTitleChange={onColumnTitleChange}
            sort={sort}
            onSortChange={onSortChange}
            overdueOnly={overdueOnly}
            onOverdueOnlyChange={onOverdueOnlyChange}
            activeCount={filterCount}
            onReset={onResetFilters}
          />
          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
          <Button variant="outline" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
            <IconArrowBackUp size={15} stroke={1.5} />
          </Button>
          <Button variant="outline" size="icon" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
            <IconArrowForwardUp size={15} stroke={1.5} />
          </Button>
          {transfer}
          <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-line xl:block" />
          {stats}
        </div>
      </div>
    </header>
  );
}
