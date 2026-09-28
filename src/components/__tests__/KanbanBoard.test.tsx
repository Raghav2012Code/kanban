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

describe('KanbanBoard Work In Progress limits', () => {
  const setLimit = async (user: ReturnType<typeof userEvent.setup>, column: string, value: string) => {
    await user.click(screen.getByRole('button', { name: `Set Work In Progress limit for ${column}` }));
    const input = screen.getByLabelText(`Work In Progress limit for ${column}`);
    await user.clear(input);
    if (value) await user.type(input, value);
    await user.keyboard('{Enter}');
  };

  it('shows a count against the limit, and clears the limit when the value is emptied', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await setLimit(user, 'To Do', '5');
    expect(within(screen.getByLabelText('To Do column')).getByTitle('3 of 3 cards')).toHaveTextContent('3/5');

    await setLimit(user, 'To Do', '');
    expect(within(screen.getByLabelText('To Do column')).getByTitle('3 of 3 cards')).toHaveTextContent('3');
  });

  it('says so in words when a column is over its limit, not by colour alone', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await setLimit(user, 'To Do', '2');

    const bay = screen.getByLabelText('To Do column');
    expect(within(bay).getByText('Over')).toBeInTheDocument();
    expect(within(bay).getByTitle(/over the Work In Progress limit/i)).toHaveTextContent('3/2');
  });

  it('refuses a move into a saturated column and explains why', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');
    await setLimit(user, 'To Do', '3');

    await user.click(screen.getByRole('button', { name: 'Move Research personal finance apps to the next column' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/at its Work In Progress limit of 3/i);
    const backlog = within(screen.getByLabelText('Backlog column')).getAllByRole('group');
    expect(backlog.some((strip) => strip.getAttribute('aria-label') === 'Research personal finance apps')).toBe(true);
  });

  it('keeps the badge honest while a filter is active', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');
    await setLimit(user, 'To Do', '2');

    await user.type(screen.getByLabelText('Search cards by title or description'), 'groceries');

    // Visible count over limit, not total membership, and the saturation marker
    // agrees with the count on screen rather than contradicting it.
    const bay = screen.getByLabelText('To Do column');
    expect(within(bay).getByTitle('1 of 3 cards')).toHaveTextContent('1/2');
    expect(within(bay).queryByText('Over')).not.toBeInTheDocument();
  });

  it('persists a limit and leaves older boards loadable', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');
    await setLimit(user, 'To Do', '4');

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved.columns.find((column: { id: string }) => column.id === 'column-todo')?.limit).toBe(4);
    expect(saved.columns.find((column: { id: string }) => column.id === 'column-done')?.limit).toBeUndefined();
  });
});

describe('KanbanBoard undo and redo', () => {
  it('starts with the controls disabled, so there is never a mystery', async () => {
    render(<KanbanBoard />);
    await screen.findByLabelText('Backlog column');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('restores a deleted card, and puts it back where it was', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    const group = await screen.findByRole('group', { name: 'Archive tax documents' });
    await user.click(within(group).getByRole('button', { name: 'Delete Archive tax documents' }));
    expect(screen.queryByRole('group', { name: 'Archive tax documents' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    const restored = await screen.findByRole('group', { name: 'Archive tax documents' });
    const done = within(screen.getByLabelText('Done column')).getAllByRole('group');
    expect(done.some((strip) => strip.getAttribute('aria-label') === 'Archive tax documents')).toBe(true);
    expect(restored).toBeInTheDocument();
  });

  it('redoes an undo that overshot', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    await user.click(screen.getByRole('button', { name: 'Delete Research personal finance apps' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await screen.findByRole('group', { name: 'Research personal finance apps' });

    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(screen.queryByRole('group', { name: 'Research personal finance apps' })).not.toBeInTheDocument();
  });

  it('undoes with the keyboard', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    await user.click(await screen.findByRole('button', { name: 'Delete Research personal finance apps' }));
    await user.keyboard('{Control>}z{/Control}');

    await screen.findByRole('group', { name: 'Research personal finance apps' });
  });

  it('leaves the browser own text undo alone while typing in a field', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    await user.click(await screen.findByRole('button', { name: 'Delete Research personal finance apps' }));

    const search = screen.getByLabelText('Search cards by title or description');
    await user.click(search);
    await user.keyboard('tax');
    await user.keyboard('{Control>}z{/Control}');

    // The card is still deleted: Ctrl+Z inside the search field meant "undo my typing".
    expect(screen.queryByRole('group', { name: 'Research personal finance apps' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
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
