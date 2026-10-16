import { IconAdjustmentsHorizontal, IconCheck } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { PriorityFilter, SortMode } from '../types/kanban';

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

/**
 * A native popover is used where the platform has one: the panel then lives in
 * the top layer, and Escape and an outside click close it without this component
 * listening for either. The position is set from script rather than CSS anchor
 * positioning so the panel behaves the same in every current browser.
 */
const popoverSupported = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

type PopoverPanel = HTMLElement & { showPopover?: () => void; hidePopover?: () => void };

interface FilterPopoverProps {
  priority: PriorityFilter;
  onPriorityChange: (value: PriorityFilter) => void;
  dueWithinDays: number | null;
  onDueWithinChange: (value: number | null) => void;
  filedWithinDays: number | null;
  onFiledWithinChange: (value: number | null) => void;
  columnTitle: string;
  onColumnTitleChange: (value: string) => void;
  sort: SortMode;
  onSortChange: (value: SortMode) => void;
  overdueOnly: boolean;
  onOverdueOnlyChange: (value: boolean) => void;
  /** How many view dimensions are not at their default, shown on the trigger. */
  activeCount: number;
  onReset: () => void;
}

export function FilterPopover({ priority, onPriorityChange, dueWithinDays, onDueWithinChange, filedWithinDays, onFiledWithinChange, columnTitle, onColumnTitleChange, sort, onSortChange, overdueOnly, onOverdueOnlyChange, activeCount, onReset }: FilterPopoverProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => {
    const panel = panelRef.current as PopoverPanel | null;
    if (panel && typeof panel.hidePopover === 'function') panel.hidePopover();
    setOpen(false);
  };

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !popoverSupported) return;
    const onToggle = (event: Event) => {
      const nowOpen = (event as Event & { newState?: string }).newState === 'open';
      setOpen(nowOpen);
      // A popover takes focus into itself; on close, hand it back to the trigger
      // so a keyboard path never drops to the document body.
      if (!nowOpen && panel.contains(document.activeElement)) buttonRef.current?.focus();
    };
    panel.addEventListener('toggle', onToggle);
    return () => panel.removeEventListener('toggle', onToggle);
  }, []);

  useEffect(() => {
    if (!open || !popoverSupported) return;
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = () => {
    const panel = panelRef.current as PopoverPanel | null;
    const button = buttonRef.current;
    if (!panel || !button) return;
    if (open) {
      close();
      return;
    }
    if (typeof panel.showPopover === 'function') {
      const rect = button.getBoundingClientRect();
      const width = panel.offsetWidth || 288;
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      panel.style.left = `${left}px`;
      panel.style.top = `${rect.bottom + 8}px`;
      panel.showPopover();
      setOpen(true);
      return;
    }
    // Environments without the popover API (including the test suite) simply
    // show and hide the panel in place.
    setOpen(true);
  };

  const label = activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters';

  return (
    <div className="relative shrink-0">
      <Button ref={buttonRef} variant="outline" onClick={toggle} aria-expanded={open} aria-controls="filters-panel" aria-label={label} className="px-2.5">
        <IconAdjustmentsHorizontal size={15} stroke={1.5} aria-hidden="true" />
        <span className="hidden sm:inline">Filters</span>
        {activeCount > 0 && <span aria-hidden="true" className="ml-0.5 rounded-full bg-accent px-1.5 font-mono text-[10px] font-semibold tabular-nums text-accent-fg">{activeCount}</span>}
      </Button>

      <div
        id="filters-panel"
        ref={panelRef}
        {...(popoverSupported ? { popover: 'auto' } : {})}
        hidden={popoverSupported ? undefined : !open}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => { if (!popoverSupported && event.key === 'Escape') close(); }}
        aria-label="Filters"
        className={cn('popover-panel z-30 w-72 rounded-ui border border-line bg-surface p-3 shadow-lg', !popoverSupported && 'absolute right-0 top-full mt-2')}
      >
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <label htmlFor="filters-priority" className="block font-mono text-[11px] uppercase tracking-wide text-muted">Priority</label>
            <Select id="filters-priority" value={priority} onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)} aria-label="Filter by priority">
              <option value="all">All priorities</option>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="filters-due" className="block font-mono text-[11px] uppercase tracking-wide text-muted">Due window</label>
            <Select
              id="filters-due"
              value={dueWithinDays === null ? '' : String(dueWithinDays)}
              onChange={(event) => onDueWithinChange(event.target.value === '' ? null : Number(event.target.value))}
              aria-label="Filter by due window"
            >
              {DUE_WINDOWS.map((option) => (
                <option key={String(option.value)} value={option.value === null ? '' : String(option.value)}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="filters-filed" className="block font-mono text-[11px] uppercase tracking-wide text-muted">Filed window</label>
            <Select
              id="filters-filed"
              value={filedWithinDays === null ? '' : String(filedWithinDays)}
              onChange={(event) => onFiledWithinChange(event.target.value === '' ? null : Number(event.target.value))}
              aria-label="Filter by filed window"
            >
              {FILED_WINDOWS.map((option) => (
                <option key={String(option.value)} value={option.value === null ? '' : String(option.value)}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="filters-sort" className="block font-mono text-[11px] uppercase tracking-wide text-muted">Sort</label>
            <Select id="filters-sort" value={sort} onChange={(event) => onSortChange(event.target.value as SortMode)} aria-label="Sort cards">
              <option value="manual">Manual order</option>
              <option value="dueDate">Sort by due date</option>
              <option value="filedDate">Sort by filed date</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="filters-column" className="block font-mono text-[11px] uppercase tracking-wide text-muted">Column</label>
            <Input id="filters-column" value={columnTitle} onChange={(event) => onColumnTitleChange(event.target.value)} placeholder="Column title" aria-label="Filter by column title" />
          </div>

          {/* The state is in aria-pressed and in the accessible name, so the
              dimension is readable without perceiving the accent. */}
          <Button
            variant="outline"
            onClick={() => onOverdueOnlyChange(!overdueOnly)}
            aria-pressed={overdueOnly}
            aria-label={overdueOnly ? 'Overdue only, on' : 'Overdue only, off'}
            className={cn('w-full justify-between', overdueOnly && 'border-accent text-accent')}
          >
            Overdue only
            {overdueOnly && <IconCheck size={15} stroke={2} aria-hidden="true" />}
          </Button>

          <div className="flex items-center justify-between border-t border-line pt-3">
            <Button variant="ghost" size="sm" onClick={onReset} disabled={activeCount === 0}>Reset filters</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
