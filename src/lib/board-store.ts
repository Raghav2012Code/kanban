import type { LoadStatus, PersistResult } from './persistence';
import { loadBoardState, persistBoardState } from './persistence';
import type { BoardState } from '../types/kanban';

/**
 * The one seam through which the board is read and written.
 *
 * The interface is deliberately three questions — what does the board say, has it
 * changed, and here is a change — so that nothing above it can learn whether the
 * board is local or shared. Components, the pure transitions, and the validity
 * check are all indifferent to the storage medium, which is what makes a remote
 * implementation possible later without a rewrite.
 *
 * The local implementation is the existing persistence, whose functions already
 * take their medium as a parameter. Its behaviour is unchanged, and its existing
 * tests remain the proof; this module adds no behaviour of its own.
 */
export interface BoardStore {
  /** The board, and how it was obtained: empty, loaded, unreadable, or blocked. */
  read(): { board: BoardState; status: LoadStatus };
  /** Write the board, reporting why it could not be written. */
  write(board: BoardState): PersistResult;
}

export function createLocalBoardStore(): BoardStore {
  return {
    read: () => loadBoardState(),
    write: (board) => persistBoardState(board),
  };
}
