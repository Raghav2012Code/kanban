import { useRef, useState } from 'react';
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
  const [pending, setPending] = useState<BoardState | null>(null);

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
  };

  return (
    <div className="relative flex items-center gap-1.5">
      <Button variant="outline" size="icon" onClick={() => downloadBoard(board)} aria-label="Export board" title="Export the board as JSON">
        <IconDownload size={15} stroke={1.5} />
      </Button>
      <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Import board" title="Import a board from JSON">
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
        <div role="status" className="absolute right-0 top-full z-30 mt-2 w-60 rounded-ui border border-line bg-surface p-3 shadow-lg">
          <p className="text-[13px] leading-5 text-ink">Replace this board?</p>
          <div className="mt-2.5 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPending(null)}>Cancel</Button>
            <Button variant="outline" size="sm" onClick={confirmImport}>Import</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
