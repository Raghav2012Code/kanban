import { useEffect, useId, useRef, useState } from 'react';
import { IconDownload, IconUpload } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { downloadBoard, readBoardFile } from '@/lib/export';
import { isValidBoard } from '@/lib/persistence';
import type { BoardState } from '@/types/kanban';

export type TransferResult = 'replaced' | 'invalid' | 'unreadable';

interface BoardTransferProps {
  board: BoardState;
  /** Writes the board wholesale. Recorded, so an import is undoable. */
  onReplace: (updater: (current: BoardState) => BoardState) => void;
  /** Reports the outcome, including a refusal, so the board can say what happened. */
  onResult: (result: TransferResult) => void;
}

export function BoardTransfer({ board, onReplace, onResult }: BoardTransferProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importTriggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState<BoardState | null>(null);
  const pendingTextId = useId();

  const cancelPending = () => {
    setPending(null);
    // The Cancel button and Escape both unmount the panel under the pointer;
    // focus belongs back on the control that opened it.
    importTriggerRef.current?.focus();
  };

  // The confirmation is a small dialog, not a status message: it asks a question
  // and holds the two buttons that answer it. Move focus to the affirmative
  // answer so a keyboard user is not left behind the panel, and let Escape or a
  // click outside dismiss it the way every other floating surface does.
  useEffect(() => {
    if (!pending) return;
    importButtonRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      setPending(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [pending]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await readBoardFile(file);
      // The board's own validity check, so import cannot accept something the board
      // itself would refuse to load.
      if (!isValidBoard(parsed)) {
        setPending(null);
        onResult('invalid');
        return;
      }
      // Ask before replacing: importing must never quietly destroy today's work.
      setPending(parsed);
    } catch {
      setPending(null);
      onResult('unreadable');
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    onReplace(() => pending);
    setPending(null);
    onResult('replaced');
    // The board behind the panel has changed; the trigger survives, so it is a
    // better focus home than the document body.
    importTriggerRef.current?.focus();
  };

  return (
    <div className="relative flex items-center gap-1.5">
      <Button variant="outline" size="icon" onClick={() => downloadBoard(board)} aria-label="Export board" title="Export the board as JSON">
        <IconDownload size={15} stroke={1.5} />
      </Button>
      <Button ref={importTriggerRef} variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Import board" title="Import a board from JSON">
        <IconUpload size={15} stroke={1.5} />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        aria-label="Board file"
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {pending ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Confirm board import"
          aria-describedby={pendingTextId}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            cancelPending();
          }}
          className="rise-in absolute right-0 top-full z-30 mt-2 w-60 rounded-ui border border-line bg-surface p-3 shadow-lg"
        >
          <p id={pendingTextId} className="text-[13px] leading-5 text-ink">Replace this board?</p>
          <div className="mt-2.5 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={cancelPending}>Cancel</Button>
            <Button ref={importButtonRef} variant="outline" size="sm" onClick={confirmImport}>Import</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
