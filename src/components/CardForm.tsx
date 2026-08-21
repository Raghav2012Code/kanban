import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { motionTransition } from '@/lib/motion';
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
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.title.trim()) onSave({ ...draft, title: draft.title.trim(), description: draft.description.trim() });
  };
  return <motion.form initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -8 }} transition={motionTransition} onSubmit={submit} onKeyDown={(event: KeyboardEvent<HTMLFormElement>) => { if (event.key === 'Escape') onCancel(); }} className="space-y-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-3">
    <Input ref={titleRef} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Card title" aria-label="Card title" />
    <div className="grid grid-cols-2 gap-2">
      <Select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as CardDraft['priority'] }))} aria-label="Priority"><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></Select>
      <Input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} aria-label="Due date" />
    </div>
    <Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description (optional)" aria-label="Description" rows={3} />
    <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button><Button type="submit" size="sm">Save card</Button></div>
  </motion.form>;
}
