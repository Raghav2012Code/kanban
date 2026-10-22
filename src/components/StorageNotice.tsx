import { IconAlertTriangle, IconX } from '@tabler/icons-react';
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
  return <div role="status" aria-live="polite" className="rise-in mb-4 flex items-start gap-3 rounded-ui border border-warn bg-surface px-3 py-2.5 text-xs text-warn shadow-xs"><IconAlertTriangle size={15} stroke={1.5} aria-hidden="true" className="mt-0.5 shrink-0" /><p className="min-w-0 flex-1 leading-5">{messages[warning.kind]}</p><Button variant="ghost" size="icon" onClick={onDismiss} aria-label="Dismiss storage warning" className="h-6 w-6 text-warn hover:bg-raised hover:text-hold"><IconX size={13} stroke={1.5} /></Button></div>;
}
