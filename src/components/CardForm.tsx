import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useMotionTransition } from '@/hooks/useMotionTransition';
import { normalizeCardDraft, validateDueDate } from '@/lib/validation';
import type { CardDraft } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const emptyDraft: CardDraft = { title: '', priority: 'medium', dueDate: '', description: '' };

interface CardFormProps {
  onSave: (draft: CardDraft) => void;
  onCancel: () => void;
}

export function CardForm({ onSave, onCancel }: CardFormProps): JSX.Element {
  const [draft, setDraft] = useState<CardDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [pastConfirmed, setPastConfirmed] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const transition = useMotionTransition();
  useEffect(() => { titleRef.current?.focus(); }, []);
  const update = (patch: Partial<CardDraft>) => { setDraft((current) => ({ ...current, ...patch })); setError(null); setPastConfirmed(false); };
  const pastDate = validateDueDate(draft.dueDate) === 'past';
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const result = normalizeCardDraft(draft);
    if (!result.ok) { setError('Enter a valid due date as YYYY-MM-DD.'); return; }
    if (result.value.requiresPastConfirmation && !pastConfirmed) { setPastConfirmed(true); setError('This due date is in the past. Save again to confirm.'); return; }
    onSave(result.value.draft);
  };
  return <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={transition} onSubmit={submit} onKeyDown={(event: KeyboardEvent<HTMLFormElement>) => { if (event.key === 'Escape') onCancel(); }} className="space-y-2.5 overflow-hidden rounded-strip border border-line bg-surface p-3">
    <div className="space-y-1"><label htmlFor="card-title" className="block font-mono text-[11px] uppercase tracking-wide text-muted">Card title</label><Input id="card-title" ref={titleRef} value={draft.title} onChange={(event) => update({ title: event.target.value })} aria-label="Card title" /></div>
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1"><label htmlFor="card-priority" className="block font-mono text-[11px] uppercase tracking-wide text-muted">Priority</label><Select id="card-priority" value={draft.priority} onChange={(event) => update({ priority: event.target.value as CardDraft['priority'] })} aria-label="Priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></div>
      <div className="space-y-1"><label htmlFor="card-due" className="block font-mono text-[11px] uppercase tracking-wide text-muted">Due date</label><Input id="card-due" type="date" value={draft.dueDate} onChange={(event) => update({ dueDate: event.target.value })} aria-label="Due date" className="font-mono text-sm tabular-nums" /></div>
    </div>
    <div className="space-y-1"><label htmlFor="card-notes" className="block font-mono text-[11px] uppercase tracking-wide text-muted">Description (optional)</label><Textarea id="card-notes" value={draft.description} onChange={(event) => update({ description: event.target.value })} aria-label="Description" rows={3} /></div>
    {error && <p role="alert" className="font-mono text-[11px] uppercase leading-5 tracking-wide text-warn">{error}</p>}
    <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button><Button type="submit" size="sm">{pastConfirmed && pastDate ? 'Save anyway' : 'Save card'}</Button></div>
  </motion.form>;
}
