import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { loadBoardState, persistBoardState } from '../lib/persistence';
import type { BoardState } from '../types/kanban';

export interface StorageWarning {
  kind: 'corrupt' | 'quota' | 'unavailable' | 'unknown';
}

export interface UseKanbanBoardResult {
  board: BoardState;
  setBoard: Dispatch<SetStateAction<BoardState>>;
  storageWarning: StorageWarning | null;
  dismissStorageWarning: () => void;
}

export function useKanbanBoard(): UseKanbanBoardResult {
  const [initial] = useState(() => loadBoardState());
  const [board, setBoard] = useState<BoardState>(initial.board);
  const [storageWarning, setStorageWarning] = useState<StorageWarning | null>(() => {
    if (initial.status === 'corrupt') return { kind: 'corrupt' };
    if (initial.status === 'unavailable') return { kind: 'unavailable' };
    return null;
  });
  const dismissedKinds = useRef<Set<StorageWarning['kind']>>(new Set());

  useEffect(() => {
    const result = persistBoardState(board);
    if (!result.ok && !dismissedKinds.current.has(result.reason)) setStorageWarning({ kind: result.reason });
  }, [board]);

  const dismissStorageWarning = useCallback(() => {
    setStorageWarning((current) => {
      if (current) dismissedKinds.current.add(current.kind);
      return null;
    });
  }, []);

  return { board, setBoard, storageWarning, dismissStorageWarning };
}
