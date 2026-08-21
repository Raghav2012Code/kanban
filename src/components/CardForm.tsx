import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { CardDraft } from '../types/kanban';

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
  return <form onSubmit={submit} onKeyDown={(event: KeyboardEvent<HTMLFormElement>) => { if (event.key === 'Escape') onCancel(); }} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
    <input ref={titleRef} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Card title" aria-label="Card title" className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" />
    <div className="grid grid-cols-2 gap-2">
      <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as CardDraft['priority'] }))} aria-label="Priority" className="rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500"><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select>
      <input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} aria-label="Due date" className="min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-500" />
    </div>
    <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description (optional)" aria-label="Description" rows={3} className="w-full resize-none rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-zinc-500" />
    <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500">Cancel</button><button type="submit" className="rounded bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400">Save card</button></div>
  </form>;
}
