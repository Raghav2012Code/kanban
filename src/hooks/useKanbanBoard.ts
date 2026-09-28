import { useCallback, useEffect, useRef, useState } from 'react';
import { createLocalBoardStore } from '../lib/board-store';
import { isValidBoard } from '../lib/persistence';
import type { BoardState } from '../types/kanban';

/** Bounded so memory cannot grow without limit. */
export const HISTORY_LIMIT = 50;

interface BoardHistory {
  board: BoardState;
  past: BoardState[];
  future: BoardState[];
}

export type StorageWarningKind = 'corrupt' | 'quota' | 'unavailable' | 'unknown';

export interface StorageWarning {
  kind: StorageWarningKind;
}

export interface UseKanbanBoardResult {
  board: BoardState;
  /** The only way to change the board, so every mutation is recorded exactly once. */
  mutate: (updater: (current: BoardState) => BoardState) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Writes the board wholesale, as a recorded mutation. Used by import. */
  replaceBoard: (updater: (current: BoardState) => BoardState) => void;
  storageWarning: StorageWarning | null;
  dismissStorageWarning: () => void;
}

export function useKanbanBoard(): UseKanbanBoardResult {
  // Everything the board touches goes through the store, so nothing above this hook
  // knows whether the board is local or shared.
  const [store] = useState(createLocalBoardStore);
  const [initial] = useState(() => store.read());
  // One object rather than three states, so a mutation and its history entry are
  // applied atomically and cannot be recorded twice or half-written.
  const [state, setState] = useState<BoardHistory>(() => ({ board: initial.board, past: [], future: [] }));
  const [storageWarning, setStorageWarning] = useState<StorageWarning | null>(() => {
    if (initial.status === 'corrupt') return { kind: 'corrupt' };
    if (initial.status === 'unavailable') return { kind: 'unavailable' };
    return null;
  });
  const dismissedKinds = useRef<Set<StorageWarning['kind']>>(new Set());

  useEffect(() => {
    const result = store.write(state.board);
    if (!result.ok && !dismissedKinds.current.has(result.reason)) setStorageWarning({ kind: result.reason });
  }, [state.board, store]);

  const mutate = useCallback((updater: (current: BoardState) => BoardState) => {
    setState((current) => {
      const next = updater(current.board);
      // A transition that changes nothing is not a mutation: it must not grow the
      // history, and it must not discard the redo tail either.
      if (next === current.board) return current;
      // A mutation that leaves the board invalid is refused rather than recorded, so
      // a bad write cannot be persisted and cannot be undone into.
      if (!isValidBoard(next)) return current;
      return { board: next, past: [...current.past, current.board].slice(-HISTORY_LIMIT), future: [] };
    });
  }, []);

  // A restore is refused rather than applied when the snapshot no longer validates,
  // so undo can never load a board the rest of the app would reject.
  const undo = useCallback(() => {
    setState((current) => {
      const previous = current.past[current.past.length - 1];
      if (!previous || !isValidBoard(previous)) return current;
      return {
        board: previous,
        past: current.past.slice(0, -1),
        future: [current.board, ...current.future].slice(0, HISTORY_LIMIT),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      const next = current.future[0];
      if (!next || !isValidBoard(next)) return current;
      return {
        board: next,
        past: [...current.past, current.board].slice(-HISTORY_LIMIT),
        future: current.future.slice(1),
      };
    });
  }, []);

  const dismissStorageWarning = useCallback(() => {
    setStorageWarning((current) => {
      if (current) dismissedKinds.current.add(current.kind);
      return null;
    });
  }, []);

  return {
    board: state.board,
    mutate,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    replaceBoard: mutate,
    storageWarning,
    dismissStorageWarning,
  };
}
