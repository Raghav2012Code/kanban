import { IconArrowBackUp, IconArrowForwardUp, IconSearch } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { PriorityFilter, SortMode } from '../types/kanban';
import { BoardMark } from '@/components/BoardMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';

const DUE_WINDOWS: Array<{ value: number | null; label: string }> = [
  { value: null, label: 'Any due date' },
  { value: 3, label: 'Due in 3 days' },
  { value: 7, label: 'Due this week' },
  { value: 30, label: 'Due this month' },
];

const FILED_WINDOWS: Array<{ value: number | null; label: string }> = [
  { value: null, label: 'Any filed date' },
  { value: 7, label: 'Filed this week' },
  { value: 30, label: 'Filed this month' },
];

interface BoardHeaderProps {
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
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  transfer: ReactNode;
  /** Rendered only while cards are selected, so it never becomes a second toolbar. */
  selectionBar?: ReactNode;
}

export function BoardHeader({
  search,
  priorityFilter,
  onSearchChange,
  onPriorityChange,
  overdueOnly,
  onOverdueOnlyChange,
  dueWithinDays,
  onDueWithinChange,
  columnTitle,
  onColumnTitleChange,
  filedWithinDays,
  onFiledWithinChange,
  sort,
  onSortChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  transfer,
  selectionBar,
}: BoardHeaderProps): JSX.Element {
  return (
    <header className="border-b border-line px-4 py-5 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <BoardMark className="h-4 w-4" />
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">Personal workspace</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Noir Board</h1>
          <p className="mt-1 max-w-md text-sm text-muted">A quiet system for moving important work forward.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)" className="h-9 w-9">
              <IconArrowBackUp size={14} stroke={1.5} />
            </Button>
            <Button variant="outline" size="icon" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className="h-9 w-9">
              <IconArrowForwardUp size={14} stroke={1.5} />
            </Button>
            {transfer}
          </div>

          {selectionBar}

          <label className="relative">
            <IconSearch size={16} stroke={1.5} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search" aria-label="Search cards by title or description" className="h-9 w-full pl-8 sm:w-56" />
          </label>

          <Input value={columnTitle} onChange={(event) => onColumnTitleChange(event.target.value)} placeholder="Bay" aria-label="Filter by column title" className="h-9 w-full sm:w-32" />

          <Select value={priorityFilter} onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)} aria-label="Filter by priority" className="h-9">
            <option value="all">All priorities</option>
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </Select>

          <Select
            value={dueWithinDays === null ? '' : String(dueWithinDays)}
            onChange={(event) => onDueWithinChange(event.target.value === '' ? null : Number(event.target.value))}
            aria-label="Filter by due window"
            className="h-9"
          >
            {DUE_WINDOWS.map((option) => (
              <option key={String(option.value)} value={option.value === null ? '' : String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            value={filedWithinDays === null ? '' : String(filedWithinDays)}
            onChange={(event) => onFiledWithinChange(event.target.value === '' ? null : Number(event.target.value))}
            aria-label="Filter by filed window"
            className="h-9"
          >
            {FILED_WINDOWS.map((option) => (
              <option key={String(option.value)} value={option.value === null ? '' : String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select value={sort} onChange={(event) => onSortChange(event.target.value as SortMode)} aria-label="Sort cards" className="h-9">
            <option value="manual">Manual order</option>
            <option value="dueDate">Sort by due date</option>
            <option value="filedDate">Sort by filed date</option>
          </Select>

          {/* The state is in `aria-pressed` and in the accessible name, so the
              dimension is readable without perceiving the accent. Outline rather than
              the accent fill when on: the board has one primary, and this is a filter. */}
          <Button
            variant="outline"
            onClick={() => onOverdueOnlyChange(!overdueOnly)}
            aria-pressed={overdueOnly}
            aria-label={overdueOnly ? 'Overdue only, on' : 'Overdue only, off'}
            className={cn('h-9 font-mono text-[11px] uppercase tracking-wide', overdueOnly && 'border-accent text-accent')}
          >
            Overdue
          </Button>
        </div>
      </div>
    </header>
  );
}
