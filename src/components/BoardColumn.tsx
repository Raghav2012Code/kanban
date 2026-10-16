import { AnimatePresence, motion } from 'motion/react';
import { IconArrowLeft, IconArrowRight, IconChevronDown, IconChevronRight, IconGauge, IconPlus, IconTrash } from '@tabler/icons-react';
import { Fragment, useEffect, useRef } from 'react';
import type { DragEvent, KeyboardEvent, RefObject } from 'react';
import { useMotionTransition } from '@/hooks/useMotionTransition';
import { isCardOverdue } from '@/lib/dates';
import { isColumnOverLimit } from '@/lib/board';
import { isDoneColumn } from '@/lib/done';
import { reducedMotionTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { cardToDraft } from '@/lib/validation';
import type { CardDraft, CardItem, ColumnItem, DropTarget } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardForm } from './CardForm';
import { KanbanCard, dropPlaceholderClass } from './KanbanCard';
import type { MoveDirection } from './KanbanCard';

// A column is a lane of tiles rather than a filled panel: the tiles carry the
// surface, the lane carries the space. It stays the flexible item in the row.
const panel = 'flex w-full min-w-0 shrink-0 flex-col gap-2 lg:w-0 lg:flex-1';
// The add-column form must reserve the same footprint as the collapsed trigger
// (lg:w-44), or opening it steals width from every column and reflows the board.
const addPanel = 'w-full min-w-0 shrink-0 rounded-ui border border-line bg-surface p-3 shadow-sm lg:w-44 lg:flex-none';
const emptyBay = 'px-0.5 py-4 text-xs leading-5 text-faint';

interface BoardColumnProps {
  column: ColumnItem;
  cards: CardItem[];
  activeForm: boolean;
  renaming: boolean;
  renameValue: string;
  draggedCardId: string | null;
  dropTarget: DropTarget | null;
  positionalEnabled: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onStartCardForm: () => void;
  onSaveCard: (draft: CardDraft) => void;
  onCancelCardForm: () => void;
  onBeginRename: () => void;
  onRenameChange: (value: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDeleteColumn: () => void;
  onDeleteCard: (id: string) => void;
  onEditCard: (id: string) => void;
  editingCardId: string | null;
  onSaveCardDraft: (cardId: string, draft: CardDraft) => void;
  onCancelEditCard: () => void;
  onMoveColumn: (direction: 'left' | 'right') => void;
  selectedIds: ReadonlySet<string>;
  onToggleSelected: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  settingLimit: boolean;
  limitValue: string;
  onStartLimit: () => void;
  onLimitChange: (value: string) => void;
  onSaveLimit: () => void;
  onCancelLimit: () => void;
  onMove: (id: string, direction: MoveDirection) => void;
  expandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
  onDragStart: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>, cardId?: string) => void;
  onDragEnter: (event: DragEvent<HTMLElement>, cardId?: string) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>, cardId?: string) => void;
}

export function BoardColumn({ column, cards, activeForm, renaming, renameValue, draggedCardId, dropTarget, positionalEnabled, canMoveLeft, canMoveRight, onStartCardForm, onSaveCard, onCancelCardForm, onBeginRename, onRenameChange, onSaveRename, onCancelRename, onDeleteColumn, onDeleteCard, onEditCard, editingCardId, onSaveCardDraft, onCancelEditCard, onMoveColumn, selectedIds, onToggleSelected, collapsed, onToggleCollapsed, settingLimit, limitValue, onStartLimit, onLimitChange, onSaveLimit, onCancelLimit, onMove, expandedIds, onToggleExpanded, onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop }: BoardColumnProps): JSX.Element {
  const renameRef = useRef<HTMLInputElement>(null);
  const limitRef = useRef<HTMLInputElement>(null);
  const transition = useMotionTransition();
  // While a card is being dragged, the board must not animate under the cursor:
  // every slot change would otherwise retarget a 180ms layout animation and the
  // lane would visibly wobble. Positions snap instantly during the drag and the
  // one settle animation plays when the card lands.
  const settle = draggedCardId ? reducedMotionTransition : transition;
  useEffect(() => { if (renaming) { renameRef.current?.focus(); renameRef.current?.select(); } }, [renaming]);
  useEffect(() => { if (settingLimit) { limitRef.current?.focus(); limitRef.current?.select(); } }, [settingLimit]);
  const isDone = isDoneColumn(column);
  const total = column.cardIds.length;
  const showColumnDropIndicator = Boolean(draggedCardId && dropTarget?.columnId === column.id && !dropTarget.cardId);
  const hasLimit = column.limit !== undefined;
  const overLimit = isColumnOverLimit(column, cards.length);
  // A collapsed column keeps its header, so the count and the limit stay readable
  // and collapsing can never hide saturation. `aria-expanded` carries the state,
  // not the chevron, so it survives greyscale.
  const bodyId = `${column.id}-body`;
  // Over-limit is stated in words, never by hue alone, so the signal survives
  // greyscale and colour blindness.
  const countLabel = hasLimit ? `${cards.length}/${column.limit}` : String(cards.length);
  const countTitle = hasLimit
    ? `${cards.length} of ${total} cards${overLimit ? ', over the Work In Progress limit' : ''}`
    : `${cards.length} of ${total} cards`;
  return <motion.section layout variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} initial="hidden" animate="visible" transition={settle} className={panel} onDragOver={(event) => onDragOver(event)} onDragEnter={(event) => onDragEnter(event)} onDragLeave={onDragLeave} onDrop={(event) => onDrop(event)} aria-label={`${column.title} column`}>
    <div className="flex items-center gap-1">
      {renaming
        ? <Input ref={renameRef} value={renameValue} onChange={(event) => onRenameChange(event.target.value)} onBlur={onSaveRename} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') onSaveRename(); if (event.key === 'Escape') onCancelRename(); }} aria-label="Rename column" className="h-7 min-w-0 flex-1 px-2 py-0.5 text-sm" />
        : <Button variant="ghost" onClick={onBeginRename} className="h-7 min-w-0 justify-start px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink hover:bg-transparent hover:text-accent" title="Click or press Enter to rename" aria-label={`Rename ${column.title} column`}>{column.title}</Button>}
      {settingLimit
        ? <Input ref={limitRef} type="number" min={0} value={limitValue} onChange={(event) => onLimitChange(event.target.value)} onBlur={onSaveLimit} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') onSaveLimit(); if (event.key === 'Escape') onCancelLimit(); }} aria-label={`Work In Progress limit for ${column.title}`} title="Leave empty for no limit" className="h-7 w-14 shrink-0 px-1 text-center font-mono text-sm" />
        : <><span title={countTitle} className={cn('shrink-0 font-mono text-[11px] tabular-nums', overLimit ? 'font-semibold text-hold' : 'text-faint')}>{countLabel}</span>{overLimit && <span className="shrink-0 rounded-full border border-hold px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-wide text-hold">Over</span>}<Button variant="ghost" size="icon" onClick={onStartLimit} aria-label={`Set Work In Progress limit for ${column.title}`} title={hasLimit ? `Limit ${column.limit}` : 'No limit set'} className="h-7 w-7 text-faint hover:text-ink"><IconGauge size={14} stroke={1.5} /></Button></>}
      <span aria-hidden="true" className="flex-1" />
      <Button variant="ghost" size="icon" onClick={onToggleCollapsed} aria-expanded={!collapsed} aria-controls={bodyId} aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${column.title} column`} title={collapsed ? 'Expand column' : 'Collapse column'} className="h-7 w-7 text-faint hover:text-ink">{collapsed ? <IconChevronRight size={14} stroke={1.5} /> : <IconChevronDown size={14} stroke={1.5} />}</Button>
      <Button variant="ghost" size="icon" onClick={() => onMoveColumn('left')} disabled={!canMoveLeft} aria-label={`Move ${column.title} column left`} title="Move column left" className="h-7 w-7 text-faint hover:text-ink"><IconArrowLeft size={14} stroke={1.5} /></Button>
      <Button variant="ghost" size="icon" onClick={() => onMoveColumn('right')} disabled={!canMoveRight} aria-label={`Move ${column.title} column right`} title="Move column right" className="h-7 w-7 text-faint hover:text-ink"><IconArrowRight size={14} stroke={1.5} /></Button>
      <Button variant="destructive" size="icon" onClick={onDeleteColumn} aria-label={`Delete ${column.title} column`} title={total > 0 ? 'Only empty columns can be deleted' : 'Delete column'} className="h-7 w-7"><IconTrash size={14} stroke={1.5} /></Button>
    </div>
    <div id={bodyId} hidden={collapsed} className="flex flex-col gap-2" onDragLeave={onDragLeave}><AnimatePresence initial={false}>{showColumnDropIndicator && <motion.div key="column-drop" initial={{ opacity: 0, scaleY: 0.8 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0.8 }} transition={settle} className={dropPlaceholderClass} aria-hidden="true" />}{cards.map((card) => {
      const index = column.cardIds.indexOf(card.id);
      const canMoveUp = positionalEnabled && index > 0;
      const canMoveDown = positionalEnabled && index >= 0 && index < total - 1;
      const dropBefore = positionalEnabled && Boolean(draggedCardId && dropTarget?.columnId === column.id && dropTarget.cardId === card.id && !dropTarget.insertAfter);
      const dropAfter = positionalEnabled && dropTarget?.columnId === column.id && dropTarget.cardId === card.id && dropTarget.insertAfter;
      return <Fragment key={card.id}>{editingCardId === card.id
        ? <CardForm key="edit" mode="edit" initialDraft={cardToDraft(card)} onSave={(draft) => onSaveCardDraft(card.id, draft)} onCancel={onCancelEditCard} />
        : <KanbanCard card={card} done={isDone} overdue={isCardOverdue(card, isDone)} expanded={expandedIds.has(card.id)} dragging={Boolean(draggedCardId)} dragged={draggedCardId === card.id} canMoveUp={canMoveUp} canMoveDown={canMoveDown} canMoveLeft={canMoveLeft} canMoveRight={canMoveRight} onDelete={onDeleteCard} onEdit={onEditCard} selected={selectedIds.has(card.id)} onToggleSelected={onToggleSelected} onToggleExpanded={onToggleExpanded} onMove={onMove} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={(event, id) => onDragOver(event, id)} onDragEnter={(event, id) => onDragEnter(event, id)} onDragLeave={onDragLeave} onDrop={(event, id) => onDrop(event, id)} dropIndicator={dropBefore} />}{dropAfter && <motion.div initial={{ opacity: 0, scaleY: 0.8 }} animate={{ opacity: 1, scaleY: 1 }} transition={settle} className={dropPlaceholderClass} aria-hidden="true" />}</Fragment>;
    })}</AnimatePresence>{total === 0 && !activeForm && <p className={emptyBay}>No cards in this column. File the first card.</p>}{total > 0 && cards.length === 0 && <p className={emptyBay}>No cards match the filter.</p>}</div>
    <AnimatePresence initial={false} mode="popLayout">{!collapsed && (activeForm ? <CardForm key="form" onSave={onSaveCard} onCancel={onCancelCardForm} /> : <Button key="add" variant="ghost" onClick={onStartCardForm} className="h-9 w-full justify-start rounded-ui border border-dashed border-line-strong px-2.5 text-[12px] font-medium text-muted hover:border-accent hover:text-accent"><IconPlus size={14} stroke={1.5} /> File card</Button>)}</AnimatePresence>
  </motion.section>;
}

interface AddColumnProps { value: string; inputRef: RefObject<HTMLInputElement>; onChange: (value: string) => void; onSave: () => void; onCancel: () => void; }
export function AddColumn({ value, inputRef, onChange, onSave, onCancel }: AddColumnProps): JSX.Element {
  const transition = useMotionTransition();
  useEffect(() => { inputRef.current?.focus(); }, [inputRef]);
  return <motion.div initial={{ opacity: 0, scale: 0.98, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }} transition={transition} className={addPanel}><div className="flex flex-col gap-2"><Input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSave(); if (event.key === 'Escape') onCancel(); }} placeholder="Column name" aria-label="New column name" className="h-9 w-full" /><div className="flex gap-2"><Button variant="default" size="sm" onClick={onSave} aria-label="Save column" className="flex-1">Save</Button><Button variant="outline" size="sm" onClick={onCancel} aria-label="Cancel adding column" className="flex-1">Cancel</Button></div></div></motion.div>;
}
