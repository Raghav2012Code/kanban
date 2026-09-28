import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KanbanBoard from '../../KanbanBoard';
import { STORAGE_KEY } from '../../lib/constants';
import { createSeedState } from '../../lib/persistence';

beforeEach(() => {
  window.localStorage.clear();
});

describe('KanbanBoard storage truthfulness', () => {
  it('warns and falls back safely when saved data is corrupt', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    render(<KanbanBoard />);
    expect(await screen.findByRole('status')).toHaveTextContent(/could not be read/i);
    expect(screen.getByLabelText('Backlog column')).toBeInTheDocument();
  });
});

describe('KanbanBoard overdue truthfulness', () => {
  it('never marks a card in the Done column as overdue, but does elsewhere', async () => {
    const board = createSeedState(new Date(2026, 8, 25));
    board.cards['card-tax'] = { ...board.cards['card-tax'], dueDate: '2000-01-01' };
    board.cards['card-research'] = { ...board.cards['card-research'], dueDate: '2000-01-01' };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    render(<KanbanBoard />);
    const done = await screen.findByLabelText('Done column');
    expect(within(done).queryByRole('img', { name: 'Overdue' })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('Backlog column')).getByRole('img', { name: 'Overdue' })).toBeInTheDocument();
  });
});

describe('KanbanBoard column counts', () => {
  it('shows the visible count while searching', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await user.type(screen.getByLabelText('Search cards by title or description'), 'groceries');
    expect(within(await screen.findByLabelText('To Do column')).getByTitle('1 of 3 cards')).toBeInTheDocument();
  });
});

describe('KanbanBoard done identity', () => {
  it('keeps marking cards done after the done column is renamed', async () => {
    const board = createSeedState(new Date(2026, 8, 25));
    const done = board.columns.find((column) => column.id === 'column-done');
    if (!done) throw new Error('seed is missing the done column');
    done.title = 'Completed';
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    render(<KanbanBoard />);
    const renamed = await screen.findByLabelText('Completed column');
    expect(within(renamed).getByRole('img', { name: 'Done' })).toBeInTheDocument();
  });
});

describe('KanbanBoard filtered move safety', () => {
  it('disables positional moves while filtering but keeps cross-column moves', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await user.type(screen.getByLabelText('Search cards by title or description'), 'groceries');
    const card = within(await screen.findByLabelText('To Do column')).getByRole('group', { name: 'Plan weekly groceries' });
    expect(within(card).getByRole('button', { name: 'Move Plan weekly groceries up' })).toBeDisabled();
    expect(within(card).getByRole('button', { name: 'Move Plan weekly groceries down' })).toBeDisabled();
    expect(within(card).getByRole('button', { name: 'Move Plan weekly groceries to the next column' })).toBeEnabled();
  });
});

describe('KanbanBoard column deletion', () => {
  it('explains why a non-empty column cannot be deleted', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await user.click(screen.getByRole('button', { name: 'Delete Backlog column' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/still has 2 cards/i);
    expect(screen.getByLabelText('Backlog column')).toBeInTheDocument();
  });
});

describe('KanbanBoard empty bays', () => {
  it('teaches the first action when a bay has no strips', async () => {
    const board = createSeedState(new Date(2026, 8, 25));
    board.columns.push({ id: 'column-empty', title: 'Archive', cardIds: [] });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    render(<KanbanBoard />);
    const empty = await screen.findByLabelText('Archive column');
    expect(within(empty).getByText(/No strips in this bay/i)).toBeInTheDocument();
  });
});

describe('KanbanBoard card deletion', () => {
  it('removes an expanded card and its details', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    const group = within(await screen.findByRole('group', { name: 'Research personal finance apps' }));
    await user.click(group.getByRole('button', { name: /Show details/i }));
    expect(group.getByText(/Compare budgeting workflows/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete Research personal finance apps' }));
    expect(screen.queryByRole('group', { name: 'Research personal finance apps' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Compare budgeting workflows/i)).not.toBeInTheDocument();
  });
});

const bayOrder = (): (string | null)[] =>
  screen.getAllByRole('region').map((bay) => bay.getAttribute('aria-label'));

describe('KanbanBoard card editing', () => {
  it('edits a card in place, preserving its slot and its filed date', async () => {
    const user = userEvent.setup();
    const board = createSeedState(new Date(2026, 8, 25));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    render(<KanbanBoard />);

    const filedAt = board.cards['card-groceries'].createdAt;
    const group = await screen.findByRole('group', { name: 'Plan weekly groceries' });
    await user.click(within(group).getByRole('button', { name: 'Edit Plan weekly groceries' }));

    const form = await screen.findByRole('form', { name: 'Edit card' });
    const title = within(form).getByLabelText('Card title');
    expect(title, 'the form must open on the card current values, not a blank').toHaveValue('Plan weekly groceries');

    await user.clear(title);
    await user.type(title, 'Plan groceries and staples');
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));

    await screen.findByRole('group', { name: 'Plan groceries and staples' });
    const strips = within(screen.getByLabelText('To Do column'))
      .getAllByRole('group')
      .map((strip) => strip.getAttribute('aria-label'));
    expect(strips, 'correcting a card must not reorder the board').toEqual([
      'Plan groceries and staples',
      'Book dentist appointment',
      'Organize reading list',
    ]);

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved.cards['card-groceries'].createdAt, 'editing must not falsify the filed date').toBe(filedAt);
  });

  it('offers an edit and a file form under different names, so they cannot be confused', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    const todo = await screen.findByLabelText('To Do column');
    await user.click(within(todo).getByRole('button', { name: 'File card' }));
    expect(await screen.findByRole('form', { name: 'File card' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Edit card' })).not.toBeInTheDocument();
  });

  it('abandons an edit without saving', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    const group = await screen.findByRole('group', { name: 'Plan weekly groceries' });
    await user.click(within(group).getByRole('button', { name: 'Edit Plan weekly groceries' }));
    const form = await screen.findByRole('form', { name: 'Edit card' });
    await user.clear(within(form).getByLabelText('Card title'));
    await user.type(within(form).getByLabelText('Card title'), 'Discarded');
    await user.click(within(form).getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByRole('group', { name: 'Plan weekly groceries' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Discarded' })).not.toBeInTheDocument();
  });
});

describe('KanbanBoard column ordering', () => {
  it('reorders the bays, carrying each column cards with it', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    expect(bayOrder()).toEqual(['Backlog column', 'To Do column', 'In Progress column', 'Done column']);

    await user.click(screen.getByRole('button', { name: 'Move To Do column right' }));

    expect(bayOrder()).toEqual(['Backlog column', 'In Progress column', 'To Do column', 'Done column']);
    const toDo = within(screen.getByLabelText('To Do column')).getAllByRole('group');
    expect(toDo.map((strip) => strip.getAttribute('aria-label'))).toEqual([
      'Plan weekly groceries',
      'Book dentist appointment',
      'Organize reading list',
    ]);
  });

  it('disables the control that would move a column past the edge', async () => {
    render(<KanbanBoard />);
    await screen.findByLabelText('Backlog column');
    expect(screen.getByRole('button', { name: 'Move Backlog column left' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Done column right' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Backlog column right' })).toBeEnabled();
  });

  it('reorders while a filter is active, because it is a structural change', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await user.type(await screen.findByLabelText('Search cards by title or description'), 'groceries');

    await user.click(screen.getByRole('button', { name: 'Move To Do column right' }));

    expect(bayOrder()).toEqual(['Backlog column', 'In Progress column', 'To Do column', 'Done column']);
  });
});
