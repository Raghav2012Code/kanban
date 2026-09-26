import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { useMotionTransition } from '@/hooks/useMotionTransition';
import { BoardColumn } from '../BoardColumn';
import type { ColumnItem } from '../../types/kanban';

// Guard test, not a behavioural assertion. The behavioural half lives in
// useMotionTransition.test.ts, which proves the hook collapses to a zero-duration
// transition. This pins the other half: that a column reads its motion config from
// that hook rather than importing the raw spring constant, which is the exact
// regression that made the board ignore prefers-reduced-motion.
vi.mock('@/hooks/useMotionTransition', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useMotionTransition')>();
  return { useMotionTransition: vi.fn(actual.useMotionTransition) };
});

const column: ColumnItem = { id: 'column-todo', title: 'To Do', cardIds: [] };

function renderColumn(overrides: Partial<ComponentProps<typeof BoardColumn>> = {}) {
  const props: ComponentProps<typeof BoardColumn> = {
    column,
    cards: [],
    activeForm: false,
    renaming: false,
    renameValue: '',
    draggedCardId: null,
    dropTarget: null,
    positionalEnabled: true,
    canMoveLeft: true,
    canMoveRight: true,
    onStartCardForm: vi.fn(),
    onSaveCard: vi.fn(),
    onCancelCardForm: vi.fn(),
    onBeginRename: vi.fn(),
    onRenameChange: vi.fn(),
    onSaveRename: vi.fn(),
    onCancelRename: vi.fn(),
    onDeleteColumn: vi.fn(),
    onDeleteCard: vi.fn(),
    onMove: vi.fn(),
    expandedIds: new Set<string>(),
    onToggleExpanded: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onDragOver: vi.fn(),
    onDragEnter: vi.fn(),
    onDragLeave: vi.fn(),
    onDrop: vi.fn(),
    ...overrides,
  };
  render(<BoardColumn {...props} />);
  return props;
}

describe('BoardColumn motion configuration', () => {
  it('sources its transition from the reduced-motion-aware hook', () => {
    vi.mocked(useMotionTransition).mockClear();
    renderColumn();
    expect(useMotionTransition).toHaveBeenCalled();
  });
});
