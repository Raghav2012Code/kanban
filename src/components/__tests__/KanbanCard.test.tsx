import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { KanbanCard } from '../KanbanCard';
import type { CardItem } from '../../types/kanban';

const card: CardItem = { id: 'card-1', title: 'Write spec', priority: 'high', dueDate: '2026-09-01', description: 'Details here', createdAt: 1 };

function renderCard(overrides: Partial<ComponentProps<typeof KanbanCard>> = {}) {
  const props: ComponentProps<typeof KanbanCard> = {
    card,
    done: false,
    overdue: true,
    expanded: false,
    canMoveUp: true,
    canMoveDown: true,
    canMoveLeft: true,
    canMoveRight: true,
    onDelete: vi.fn(),
    onToggleExpanded: vi.fn(),
    onMove: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onDragOver: vi.fn(),
    onDragEnter: vi.fn(),
    onDragLeave: vi.fn(),
    onDrop: vi.fn(),
    dropIndicator: false,
    ...overrides,
  };
  render(<KanbanCard {...props} />);
  return props;
}

describe('KanbanCard overdue state', () => {
  it('marks an overdue card', () => {
    renderCard({ overdue: true });
    expect(screen.getByRole('img', { name: 'Overdue' })).toBeInTheDocument();
  });

  it('does not mark a card the board considers on time or done', () => {
    renderCard({ overdue: false });
    expect(screen.queryByRole('img', { name: 'Overdue' })).not.toBeInTheDocument();
  });
});

describe('KanbanCard priority', () => {
  it('exposes priority as a labelled meter', () => {
    renderCard();
    expect(screen.getByRole('img', { name: 'Priority: high' })).toBeInTheDocument();
  });
});

describe('KanbanCard controls', () => {
  it('keeps delete reachable without hover', async () => {
    const user = userEvent.setup();
    const props = renderCard();
    const del = screen.getByRole('button', { name: 'Delete Write spec' });
    const controls = del.parentElement as HTMLElement;
    expect(controls.className.split(' ')).not.toContain('opacity-0');
    expect(controls.className).toContain('[@media(hover:hover)]:opacity-0');
    await user.click(del);
    expect(props.onDelete).toHaveBeenCalledWith('card-1');
  });

  it('moves the card with explicit keyboard- and touch-usable controls', async () => {
    const user = userEvent.setup();
    const props = renderCard();
    await user.click(screen.getByRole('button', { name: 'Move Write spec up' }));
    await user.click(screen.getByRole('button', { name: 'Move Write spec down' }));
    await user.click(screen.getByRole('button', { name: 'Move Write spec to the previous column' }));
    await user.click(screen.getByRole('button', { name: 'Move Write spec to the next column' }));
    expect(props.onMove).toHaveBeenNthCalledWith(1, 'card-1', 'up');
    expect(props.onMove).toHaveBeenNthCalledWith(2, 'card-1', 'down');
    expect(props.onMove).toHaveBeenNthCalledWith(3, 'card-1', 'left');
    expect(props.onMove).toHaveBeenNthCalledWith(4, 'card-1', 'right');
  });

  it('disables move controls at the board boundaries', () => {
    renderCard({ canMoveUp: false, canMoveLeft: false });
    expect(screen.getByRole('button', { name: 'Move Write spec up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Write spec to the previous column' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Write spec down' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Write spec to the next column' })).toBeEnabled();
  });
});
