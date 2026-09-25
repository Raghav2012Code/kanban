import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { loadBoardState, persistBoardState } from '../lib/persistence';
import type { BoardState } from '../types/kanban';

export function useKanbanBoard(): [BoardState, Dispatch<SetStateAction<BoardState>>] {
  const [initial] = useState(() => loadBoardState());
  const [board, setBoard] = useState<BoardState>(initial.board);
  useEffect(() => { persistBoardState(board); }, [board]);
  return [board, setBoard];
}
