import { AlertTriangle, X } from 'lucide-react';
import type { StorageWarning } from '@/hooks/useKanbanBoard';
import { Button } from '@/components/ui/button';

const messages: Record<StorageWarning['kind'], string> = {
  corrupt: 'Your saved board could not be read, so a fresh board was loaded. The previous data was kept as a backup.',
  quota: 'Your browser storage is full, so recent changes may not be saved.',
  unavailable: 'This browser is blocking local storage, so recent changes may not be saved.',
  unknown: 'Recent changes may not be saved because local storage failed.',
};

interface StorageNoticeProps {
  warning: StorageWarning | null;
  onDismiss: () => void;
}

export function StorageNotice({ warning, onDismiss }: StorageNoticeProps): JSX.Element | null {
  if (!warning) return null;
  return <div role="status" aria-live="polite" className="mb-4 flex items-start gap-3 rounded-lg border border-amber-900/80 bg-amber-950/40 px-3 py-2 text-xs text-amber-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><p className="min-w-0 flex-1">{messages[warning.kind]}</p><Button variant="ghost" size="icon" onClick={onDismiss} aria-label="Dismiss storage warning" className="h-5 w-5 text-amber-300"><X className="h-3 w-3" /></Button></div>;
}
