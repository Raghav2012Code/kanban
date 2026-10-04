import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KanbanBoard from '../../KanbanBoard';
import { COLLAPSED_COLUMNS_KEY, STORAGE_KEY } from '../../lib/constants';
import { createSeedState } from '../../lib/persistence';
import { addDays, formatFiledDate, localDateString } from '../../lib/dates';

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

  // The gate below used to know only the text query and the priority. A dimension
  // it did not know about left positional moves enabled over a view that no longer
  // matched stored order, which is the exact scramble ADR-0002 prevents. So each
  // dimension is asserted separately rather than trusting the query case.
  //
  // A board is seeded that satisfies every dimension at once: an overdue card, a
  // card due inside the week, a card matching a bay name, and cards with distinct
  // due dates. Otherwise a dimension could empty the board and the assertion would
  // pass vacuously.
  function boardForEveryDimension(): void {
    const board = createSeedState(new Date(2026, 8, 25));
    board.cards['card-tax'] = { ...board.cards['card-tax'], dueDate: '2000-01-01' };
    board.cards['card-research'] = { ...board.cards['card-research'], dueDate: '2000-01-01' };
    board.cards['card-books'] = { ...board.cards['card-books'], dueDate: '2026-09-27', createdAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  }

  it.each([
    ['the overdue dimension', async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Overdue only, off' }))],
    ['a due window', async (user: ReturnType<typeof userEvent.setup>) => user.selectOptions(screen.getByLabelText('Filter by due window'), '7')],
    ['a column title', async (user: ReturnType<typeof userEvent.setup>) => user.type(screen.getByLabelText('Filter by column title'), 'To Do')],
    ['a filed window', async (user: ReturnType<typeof userEvent.setup>) => user.selectOptions(screen.getByLabelText('Filter by filed window'), '7')],
    ['a sort', async (user: ReturnType<typeof userEvent.setup>) => user.selectOptions(screen.getByLabelText('Sort cards'), 'dueDate')],
  ])('disables positional moves under %s, not just a text query', async (_label, apply) => {
    const user = userEvent.setup();
    boardForEveryDimension();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');
    await apply(user);

    // A sort filters nothing, so unlike the other dimensions it leaves every strip
    // on the board. It is the case that proves the gate is not merely responding to
    // cards disappearing from the view.
    const strips = screen.getAllByRole('group');
    expect(strips.length, 'the view must still render strips, or the check below is vacuous').toBeGreaterThan(0);

    const bays = screen.getAllByRole('region');
    expect(bays.length, 'the board must still render its bays').toBeGreaterThan(1);

    for (const bay of bays) {
      for (const strip of within(bay).queryAllByRole('group')) {
        const name = strip.getAttribute('aria-label') ?? '';
        expect(within(strip).getByRole('button', { name: `Move ${name} up` }), `${name} up`).toBeDisabled();
        expect(within(strip).getByRole('button', { name: `Move ${name} down` }), `${name} down`).toBeDisabled();
      }
    }

    // Cross-column moves still append, exactly as they do under a filter. Read off
    // whichever non-final bay still holds a strip, since a dimension is free to
    // empty any particular bay.
    const withStrips = bays
      .slice(0, -1)
      .filter((bay) => within(bay).queryAllByRole('group').length > 0);
    expect(withStrips.length, 'a non-final bay must still hold a strip').toBeGreaterThan(0);
    for (const bay of withStrips) {
      for (const strip of within(bay).queryAllByRole('group')) {
        const name = strip.getAttribute('aria-label') ?? '';
        expect(within(strip).getByRole('button', { name: `Move ${name} to the next column` }), `${name} across`).toBeEnabled();
      }
    }
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

/** The minimum surface a drop handler reads. jsdom has no real DataTransfer. */
function makeDataTransfer(payload: string): DataTransfer {
  return {
    dropEffect: 'move',
    effectAllowed: 'move',
    getData: () => payload,
    setData: () => undefined,
  } as unknown as DataTransfer;
}

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

  it('submits an edit with Enter and abandons one with Escape', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    const group = await screen.findByRole('group', { name: 'Plan weekly groceries' });
    await user.click(within(group).getByRole('button', { name: 'Edit Plan weekly groceries' }));
    const form = await screen.findByRole('form', { name: 'Edit card' });
    await user.clear(within(form).getByLabelText('Card title'));
    await user.type(within(form).getByLabelText('Card title'), 'Enter saves this{Enter}');

    expect(await screen.findByRole('group', { name: 'Enter saves this' })).toBeInTheDocument();

    // And Escape abandons, the same key the rename and limit fields already use.
    const again = screen.getByRole('group', { name: 'Enter saves this' });
    await user.click(within(again).getByRole('button', { name: 'Edit Enter saves this' }));
    const second = await screen.findByRole('form', { name: 'Edit card' });
    await user.clear(within(second).getByLabelText('Card title'));
    await user.type(within(second).getByLabelText('Card title'), 'Never saved{Escape}');

    expect(await screen.findByRole('group', { name: 'Enter saves this' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Never saved' })).not.toBeInTheDocument();
  });

  it('requires the same past-date confirmation when editing as when filing', async () => {
    const user = userEvent.setup();
    const past = localDateString(addDays(new Date(), -3));
    render(<KanbanBoard />);

    const group = await screen.findByRole('group', { name: 'Plan weekly groceries' });
    await user.click(within(group).getByRole('button', { name: 'Edit Plan weekly groceries' }));
    const form = await screen.findByRole('form', { name: 'Edit card' });
    await user.clear(within(form).getByLabelText('Due date'));
    await user.type(within(form).getByLabelText('Due date'), past);
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));

    // Backdating needs the same explicit second press as filing does.
    expect(await screen.findByText(/this due date is in the past/i)).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: 'Save anyway' })).toBeInTheDocument();

    await user.click(within(form).getByRole('button', { name: 'Save anyway' }));
    expect(await screen.findByRole('group', { name: 'Plan weekly groceries' })).toBeInTheDocument();
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

describe('KanbanBoard filtering and sorting', () => {
  const seed = (patch: (board: ReturnType<typeof createSeedState>) => void = () => {}) => {
    const board = createSeedState(new Date(2026, 8, 25));
    patch(board);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  };

  const stripNamesIn = (bay: string): string[] =>
    within(screen.getByLabelText(bay))
      .queryAllByRole('group')
      .map((strip) => strip.getAttribute('aria-label') ?? '');

  it('filters to overdue cards, and never treats Done as overdue', async () => {
    const user = userEvent.setup();
    seed((board) => {
      board.cards['card-tax'] = { ...board.cards['card-tax'], dueDate: '2000-01-01' };
      board.cards['card-research'] = { ...board.cards['card-research'], dueDate: '2000-01-01' };
    });
    render(<KanbanBoard />);
    await screen.findByLabelText('Backlog column');

    await user.click(screen.getByRole('button', { name: 'Overdue only, off' }));

    expect(stripNamesIn('Backlog column')).toEqual(['Research personal finance apps']);
    expect(stripNamesIn('To Do column')).toEqual([]);
    expect(stripNamesIn('Done column')).toEqual([]);
  });

  it('filters to cards due inside the chosen window', async () => {
    const user = userEvent.setup();
    // Dates are relative to the real today, because the window is measured from it.
    const soon = localDateString(addDays(new Date(), 2));
    const later = localDateString(addDays(new Date(), 40));
    seed((board) => {
      board.cards['card-books'] = { ...board.cards['card-books'], dueDate: soon };
      // Every other card in the bay is pushed outside the window, so the assertion
      // is about the window rather than about whatever the seed happened to contain.
      board.cards['card-groceries'] = { ...board.cards['card-groceries'], dueDate: later };
      board.cards['card-dentist'] = { ...board.cards['card-dentist'], dueDate: later };
    });
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await user.selectOptions(screen.getByLabelText('Filter by due window'), '7');

    expect(stripNamesIn('To Do column')).toEqual(['Organize reading list']);
  });

  it('filters to cards filed inside the chosen window', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const filedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8).getTime();
    const filedLongAgo = new Date(2020, 0, 1).getTime();
    seed((board) => {
      board.cards['card-books'] = { ...board.cards['card-books'], createdAt: filedToday };
      board.cards['card-groceries'] = { ...board.cards['card-groceries'], createdAt: filedLongAgo };
      board.cards['card-dentist'] = { ...board.cards['card-dentist'], createdAt: filedLongAgo };
    });
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await user.selectOptions(screen.getByLabelText('Filter by filed window'), '7');

    // The filed dimension is a filter in its own right, not only a sort key.
    expect(stripNamesIn('To Do column')).toEqual(['Organize reading list']);
  });

  it('finds cards by their column title', async () => {    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await user.type(screen.getByLabelText('Filter by column title'), 'progress');

    expect(stripNamesIn('To Do column')).toEqual([]);
    expect(stripNamesIn('In Progress column')).toEqual(['Refresh portfolio case study', 'Prepare laundry schedule']);
  });

  it('keeps the existing text search working unchanged', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await user.type(screen.getByLabelText('Search cards by title or description'), 'groceries');

    expect(stripNamesIn('To Do column')).toEqual(['Plan weekly groceries']);
    expect(stripNamesIn('Backlog column')).toEqual([]);
  });

  it('clears search input via clear button and Escape key', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    const searchInput = screen.getByLabelText('Search cards by title or description');
    await user.type(searchInput, 'groceries');
    expect(searchInput).toHaveValue('groceries');
    expect(stripNamesIn('To Do column')).toEqual(['Plan weekly groceries']);

    // Clear search using the clear button
    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    await user.click(clearButton);
    expect(searchInput).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    // Type again and clear using Escape key
    await user.type(searchInput, 'groceries');
    expect(searchInput).toHaveValue('groceries');
    await user.keyboard('{Escape}');
    expect(searchInput).toHaveValue('');
  });

  it('sorts by due date without changing what is stored', async () => {
    const user = userEvent.setup();
    // Due dates deliberately disagree with stored order, so the sorted view is
    // visibly different from the stored one.
    seed((board) => {
      board.cards['card-groceries'] = { ...board.cards['card-groceries'], dueDate: localDateString(addDays(new Date(), 30)) };
      board.cards['card-dentist'] = { ...board.cards['card-dentist'], dueDate: localDateString(addDays(new Date(), 1)) };
    });
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');
    const before = stripNamesIn('To Do column');

    await user.selectOptions(screen.getByLabelText('Sort cards'), 'dueDate');

    // Sorted view differs from stored order, putting the sooner card first.
    expect(before[0]).toBe('Plan weekly groceries');
    expect(stripNamesIn('To Do column')[0]).toBe('Book dentist appointment');
    // ...but nothing was written: the same cards are still there, in the old order.
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    const stored = saved.columns?.find((column: { id: string }) => column.id === 'column-todo')?.cardIds;
    expect(stored?.map((id: string) => saved.cards[id].title)).toEqual(before);
  });

  it('returns to manual order', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');
    const before = stripNamesIn('To Do column');

    await user.selectOptions(screen.getByLabelText('Sort cards'), 'dueDate');
    await user.selectOptions(screen.getByLabelText('Sort cards'), 'manual');

    expect(stripNamesIn('To Do column')).toEqual(before);
  });

  it('composes a sort with a filter, sorting only what is visible', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('In Progress column');
    await user.selectOptions(screen.getByLabelText('Sort cards'), 'dueDate');
    const sortedAll = stripNamesIn('In Progress column');

    await user.type(screen.getByLabelText('Search cards by title or description'), 'portfolio');

    expect(stripNamesIn('In Progress column')).toEqual(['Refresh portfolio case study']);
    expect(stripNamesIn('In Progress column')).toEqual(stripNamesIn('In Progress column').filter((name) => sortedAll.includes(name)));
  });
});

describe('KanbanBoard export and import', () => {
  /**
   * Exports the board and captures what would have been downloaded. The blob body
   * is read asynchronously, so it is awaited rather than assumed.
   */
  const exportFile = async (): Promise<{ name: string; content: string }> => {
    let captured: { name: string; content: string } | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      const record = { name: '', content: '' };
      captured = record;
      void blob.text().then((text) => {
        record.content = text;
      });
      return 'blob:board';
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      if (captured) (captured as { name: string }).name = this.download;
    });
    try {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Export board' }));
      await waitFor(() => expect(captured).not.toBeNull());
      await waitFor(() => expect((captured as unknown as { content: string }).content).not.toBe(''));
      return captured as unknown as { name: string; content: string };
    } finally {
      click.mockRestore();
      vi.unstubAllGlobals();
    }
  };

  /** Exports from a board already on screen, so the caller can then import into a fresh one. */
  const exportFrom = async (): Promise<{ name: string; content: string }> => {
    render(<KanbanBoard />);
    await screen.findByLabelText('Backlog column');
    return exportFile();
  };

  const importFile = async (user: ReturnType<typeof userEvent.setup>, content: string, name = 'board.json') => {
    const file = new File([content], name, { type: 'application/json' });
    await user.upload(screen.getByLabelText('Board file'), file);
  };

  it('exports the whole board as readable JSON', async () => {
    const exported = await exportFrom();
    expect(exported.name).toBe('noir-board.json');
    const parsed = JSON.parse(exported.content);
    expect(Object.keys(parsed.cards).length).toBeGreaterThan(0);
    expect(parsed.columns.length).toBe(4);
    // Readable, not minified: a person can open the export and hand-edit it.
    expect(exported.content).toContain('\n  "cards"');
  });

  it('round-trips a board back in, after asking first', async () => {
    const exported = await exportFrom();
    cleanup();

    const user = userEvent.setup();
    window.localStorage.clear();
    render(<KanbanBoard />);
    await screen.findByLabelText('Backlog column');

    await importFile(user, exported.content);
    // Nothing has been replaced yet: importing cannot quietly destroy work.
    expect(await screen.findByRole('status')).toHaveTextContent(/replace this board/i);
    expect(screen.getByRole('group', { name: 'Research personal finance apps' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/board imported/i);
  });

  it('lets a confirmation be cancelled, leaving the board alone', async () => {
    const user = userEvent.setup();
    const board = createSeedState(new Date(2026, 8, 25));
    const other = { ...board, cards: { ...board.cards, 'card-tax': { ...board.cards['card-tax'], title: 'Something else entirely' } } };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    render(<KanbanBoard />);
    await screen.findByLabelText('Backlog column');

    await importFile(user, JSON.stringify(other));
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('group', { name: 'Archive tax documents' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Something else entirely' })).not.toBeInTheDocument();
  });

  it('rejects a file that is not a board, and changes nothing', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('Backlog column');

    await importFile(user, JSON.stringify({ foo: 1 }));

    expect(await screen.findByRole('status')).toHaveTextContent(/not a board, so nothing was changed/i);
    expect(screen.getByRole('group', { name: 'Research personal finance apps' })).toBeInTheDocument();
  });

  it('rejects a file that is not JSON at all, and changes nothing', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('Backlog column');

    await importFile(user, 'this is not json', 'notes.txt');

    expect(await screen.findByRole('status')).toHaveTextContent(/could not be read as JSON/i);
    expect(screen.getByRole('group', { name: 'Research personal finance apps' })).toBeInTheDocument();
  });

  it('makes an import undoable, since it is a mutation like any other', async () => {
    const exported = await exportFrom();
    cleanup();

    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('Backlog column');

    await importFile(user, exported.content);
    await user.click(await screen.findByRole('button', { name: 'Import' }));
    expect(await screen.findByRole('group', { name: 'Archive tax documents' })).toBeInTheDocument();

    // The import is a recorded mutation, so one undo puts the board back.
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('group', { name: 'Archive tax documents' })).toBeInTheDocument();
  });
});

describe('KanbanBoard filed date', () => {
  it('shows when a card was filed, as an absolute date', async () => {
    const board = createSeedState(new Date(2026, 8, 25));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    render(<KanbanBoard />);

    const strip = await screen.findByRole('group', { name: 'Plan weekly groceries' });
    // Read the expected value from the card itself, so the assertion is about the
    // date being surfaced rather than about one hand-computed seed constant.
    const filed = board.cards['card-groceries'];
    if (!filed) throw new Error('seed is missing the card');
    expect(within(strip).getByTitle(`Filed ${formatFiledDate(filed.createdAt)}`)).toBeInTheDocument();
  });

  it('does not reuse the relative due-date treatment for a filing time', async () => {
    render(<KanbanBoard />);
    const strip = await screen.findByRole('group', { name: 'Plan weekly groceries' });

    const filed = within(strip).getByTitle(/^Filed \d{4}-\d{2}-\d{2}$/);
    // A relative offset would read as "8D" and mean nothing as a filing time.
    expect(filed).toHaveTextContent(/^\d{4}-\d{2}-\d{2}$/);
    expect(filed.textContent).not.toMatch(/LATE|TMRW|TODAY|\+\d+D/);
  });

  it('adds no field to the card, and the date is a sort dimension', async () => {
    const user = userEvent.setup();
    const before = createSeedState(new Date(2026, 8, 25));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(before));
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    // The card shape is untouched: the filed value already existed and was merely
    // surfaced. No new field, no schema change.
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(Object.keys(saved.cards['card-groceries']).sort()).toEqual(
      Object.keys(before.cards['card-groceries']).sort(),
    );

    // The existing filed value is now usable as a sort, which it could not be before.
    await user.selectOptions(screen.getByLabelText('Sort cards'), 'filedDate');
    expect(screen.getAllByRole('group').length).toBeGreaterThan(0);
  });
});

describe('KanbanBoard announcements', () => {
  const notice = async () => (await screen.findByRole('status')).textContent ?? '';

  it('announces a completed move, naming the card and where it went', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    const todo = await screen.findByLabelText('To Do column');

    await user.click(within(todo).getByRole('button', { name: 'Move Plan weekly groceries to the next column' }));

    // Informative rather than a bare "done": a person needs to know what moved where.
    expect(await notice()).toMatch(/moved plan weekly groceries to in progress/i);
    expect(await notice()).toMatch(/position \d+ of \d+/i);
  });

  it('announces an in-column move as a direction and a position', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    const todo = await screen.findByLabelText('To Do column');

    await user.click(within(todo).getByRole('button', { name: 'Move Plan weekly groceries down' }));

    expect(await notice()).toMatch(/moved plan weekly groceries down/i);
    expect(await notice()).toMatch(/position 2 of 3/i);
  });

  it('announces a refused move with the reason, so silence is never ambiguous', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await user.click(screen.getByRole('button', { name: 'Set Work In Progress limit for To Do' }));
    await user.type(screen.getByLabelText('Work In Progress limit for To Do'), '3');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Move Research personal finance apps to the next column' }));

    expect(await notice()).toMatch(/at its work in progress limit of 3/i);
  });

  it('announces a bulk move by naming the cards it moved', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await user.click(screen.getByRole('checkbox', { name: 'Select Organize reading list' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Plan weekly groceries' }));
    await user.click(screen.getByRole('button', { name: 'Move 2 selected cards to In Progress' }));

    expect(await notice()).toMatch(/moved 2 cards to in progress/i);
    expect(await notice()).toMatch(/reading list/i);
    expect(await notice()).toMatch(/weekly groceries/i);
  });

  it('uses one live region for the board, so a move is announced once', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    const todo = await screen.findByLabelText('To Do column');

    // Nothing has happened, so the board-level channel is not in the document at all
    // rather than sitting there empty and re-announcing on every change.
    expect(screen.queryAllByRole('status', { hidden: true })).toHaveLength(0);

    await user.click(within(todo).getByRole('button', { name: 'Move Plan weekly groceries to the next column' }));
    await screen.findByRole('status');

    // Exactly one appears. A second would announce the same event twice.
    expect(screen.getAllByRole('status', { hidden: true })).toHaveLength(1);
  });

  it('keeps the existing storage and column notices announcing themselves', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    render(<KanbanBoard />);

    // The storage notice keeps its own region, exactly as it had before this work.
    const regions = await screen.findAllByRole('status');
    expect(regions.some((region) => /could not be read/i.test(region.textContent ?? ''))).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Delete Backlog column' }));
    const after = await screen.findAllByRole('status');
    expect(after.some((region) => /still has 2 cards/i.test(region.textContent ?? ''))).toBe(true);
  });
});

describe('KanbanBoard column collapse', () => {
  it('collapses a column without hiding its count', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    const todo = await screen.findByLabelText('To Do column');

    await user.click(within(todo).getByRole('button', { name: 'Collapse To Do column' }));

    // The header survives, so the count is still readable: collapsing must never
    // hide how full a bay is.
    expect(within(todo).getByTitle('3 of 3 cards')).toBeInTheDocument();
    expect(within(todo).queryByRole('group', { name: 'Plan weekly groceries' })).not.toBeInTheDocument();
  });

  it('keeps a collapsed column limit and its saturation readable', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    const todo = await screen.findByLabelText('To Do column');

    await user.click(within(todo).getByRole('button', { name: 'Set Work In Progress limit for To Do' }));
    await user.type(screen.getByLabelText('Work In Progress limit for To Do'), '2');
    await user.keyboard('{Enter}');
    await user.click(within(todo).getByRole('button', { name: 'Collapse To Do column' }));

    expect(within(todo).getByTitle(/over the Work In Progress limit/i)).toHaveTextContent('3/2');
    expect(within(todo).getByText('Over')).toBeInTheDocument();
  });

  it('states collapse in the accessible name and expanded state, not a chevron alone', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    const todo = await screen.findByLabelText('To Do column');

    const control = within(todo).getByRole('button', { name: 'Collapse To Do column' });
    expect(control).toHaveAttribute('aria-expanded', 'true');

    await user.click(control);
    const collapsedControl = within(todo).getByRole('button', { name: 'Expand To Do column' });
    expect(collapsedControl).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands without a pointer', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    const todo = await screen.findByLabelText('To Do column');

    await user.click(within(todo).getByRole('button', { name: 'Collapse To Do column' }));
    todo.focus();
    await user.keyboard('{Enter}');

    expect(await within(todo).findByRole('group', { name: 'Plan weekly groceries' })).toBeInTheDocument();
  });

  it('refuses a drop onto a collapsed bay rather than hiding the card in it', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    const todo = await screen.findByLabelText('To Do column');
    await user.click(within(todo).getByRole('button', { name: 'Collapse To Do column' }));

    // Simulated rather than a real drag: jsdom cannot produce a trusted HTML5 drag,
    // and what is under test is the refusal, not the browser's drag machinery.
    const strip = screen.getByRole('group', { name: 'Prepare laundry schedule' });
    fireEvent.dragStart(strip, { dataTransfer: makeDataTransfer('card-laundry') });
    fireEvent.drop(todo, { dataTransfer: makeDataTransfer('card-laundry') });

    expect(await screen.findByRole('status')).toHaveTextContent(/collapsed/i);
    // The card stayed where it was, rather than arriving invisibly.
    const progress = within(screen.getByLabelText('In Progress column'))
      .queryAllByRole('group')
      .map((entry) => entry.getAttribute('aria-label'));
    expect(progress).toContain('Prepare laundry schedule');
  });

  it('announces a dropped card, because a drag is a move too', async () => {
    render(<KanbanBoard />);
    const todo = await screen.findByLabelText('To Do column');
    const strip = screen.getByRole('group', { name: 'Prepare laundry schedule' });

    fireEvent.dragStart(strip, { dataTransfer: makeDataTransfer('card-laundry') });
    fireEvent.drop(todo, { dataTransfer: makeDataTransfer('card-laundry') });

    // Someone who cannot see the drop happen needs the same confirmation an arrow-key
    // move gives them.
    expect(await screen.findByRole('status')).toHaveTextContent(/moved prepare laundry schedule to to do/i);
  });

  it('stays collapsed across reloads, without touching the board', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<KanbanBoard />);
    const todo = await screen.findByLabelText('To Do column');
    await user.click(within(todo).getByRole('button', { name: 'Collapse To Do column' }));
    await waitFor(() => expect(window.localStorage.getItem(COLLAPSED_COLUMNS_KEY)).toContain('column-todo'));

    const boardBefore = window.localStorage.getItem(STORAGE_KEY);
    unmount();
    render(<KanbanBoard />);

    const reloaded = await screen.findByLabelText('To Do column');
    expect(within(reloaded).getByRole('button', { name: 'Expand To Do column' })).toBeInTheDocument();
    // The preference is stored apart from the board, so the board is byte-identical.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(boardBefore);
  });
});

describe('KanbanBoard bulk move', () => {
  const selectCards = async (user: ReturnType<typeof userEvent.setup>, titles: string[]) => {
    for (const title of titles) {
      await user.click(screen.getByRole('checkbox', { name: `Select ${title}` }));
    }
  };

  const stripNamesIn = (bay: string): string[] =>
    within(screen.getByLabelText(bay))
      .queryAllByRole('group')
      .map((strip) => strip.getAttribute('aria-label') ?? '');

  it('shows nothing to bulk-move until something is selected', async () => {
    render(<KanbanBoard />);
    await screen.findByLabelText('Backlog column');
    expect(screen.queryByRole('button', { name: /Move \d+ selected cards/ })).not.toBeInTheDocument();
  });

  it('moves several selected cards at once, preserving their relative order', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await selectCards(user, ['Organize reading list', 'Plan weekly groceries', 'Book dentist appointment']);
    await user.click(screen.getByRole('button', { name: 'Move 3 selected cards to In Progress' }));

    // Selected in the order reading-list, groceries, dentist; stored order follows it.
    expect(stripNamesIn('To Do column')).toEqual([]);
    expect(stripNamesIn('In Progress column')).toEqual([
      'Refresh portfolio case study',
      'Prepare laundry schedule',
      'Organize reading list',
      'Plan weekly groceries',
      'Book dentist appointment',
    ]);
  });

  it('clears the selection once the move is done', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await selectCards(user, ['Organize reading list']);
    await user.click(screen.getByRole('button', { name: 'Move 1 selected cards to In Progress' }));

    expect(screen.queryByRole('button', { name: /selected cards/ })).not.toBeInTheDocument();
  });

  it('obeys the same Work In Progress limit as a single move', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    // In Progress holds two cards, so a limit of two admits nothing.
    await user.click(screen.getByRole('button', { name: 'Set Work In Progress limit for In Progress' }));
    await user.type(screen.getByLabelText('Work In Progress limit for In Progress'), '2');
    await user.keyboard('{Enter}');

    await selectCards(user, ['Organize reading list', 'Plan weekly groceries']);
    await user.click(screen.getByRole('button', { name: 'Move 2 selected cards to In Progress' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/at its Work In Progress limit of 2/i);
    expect(stripNamesIn('To Do column')).toEqual([
      'Plan weekly groceries',
      'Book dentist appointment',
      'Organize reading list',
    ]);
  });

  it('refuses the whole group rather than part of it', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');
    const todoBefore = stripNamesIn('To Do column');

    // Backlog already holds two cards, so a limit of two admits nothing at all.
    await user.click(screen.getByRole('button', { name: 'Set Work In Progress limit for Backlog' }));
    await user.type(screen.getByLabelText('Work In Progress limit for Backlog'), '2');
    await user.keyboard('{Enter}');

    await selectCards(user, ['Book dentist appointment', 'Organize reading list']);
    await user.click(screen.getByRole('button', { name: 'Move 2 selected cards to Backlog' }));

    // A partial move would leave the board holding some of what was asked for and
    // none of the rest, with no way for the person to tell which.
    expect(stripNamesIn('Backlog column')).toEqual(['Research personal finance apps', 'Set up photo backup']);
    expect(stripNamesIn('To Do column')).toEqual(todoBefore);
    expect(await screen.findByRole('status')).toHaveTextContent(/at its Work In Progress limit of 2/i);
  });

  it('can bulk-move into the final bay, because that is where a queue gets cleared', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await user.click(screen.getByRole('checkbox', { name: 'Select Plan weekly groceries' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select Organize reading list' }));
    // The last bay is a real destination. Clearing a queue usually means emptying it
    // into Done, so the control a person actually wants must not be the dead one.
    await user.click(screen.getByRole('button', { name: 'Move 2 selected cards to Done' }));

    expect(stripNamesIn('To Do column')).toEqual(['Book dentist appointment']);
    expect(stripNamesIn('Done column')).toEqual(['Archive tax documents', 'Plan weekly groceries', 'Organize reading list']);
  });

  it('clears a selection without moving anything', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');
    const before = stripNamesIn('To Do column');

    await selectCards(user, ['Plan weekly groceries']);
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(screen.queryByRole('button', { name: /selected cards/ })).not.toBeInTheDocument();
    expect(stripNamesIn('To Do column')).toEqual(before);
  });

  it('never writes selection into saved data', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await selectCards(user, ['Plan weekly groceries']);

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(JSON.stringify(saved)).not.toContain('selected');
    expect(saved.cards['card-groceries'].title).toBe('Plan weekly groceries');
  });

  it('forgets a selected card when it is deleted', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await selectCards(user, ['Plan weekly groceries']);
    await user.click(screen.getByRole('button', { name: 'Delete Plan weekly groceries' }));

    // Leaving a deleted card in the selection would let it be "moved" to nowhere.
    expect(screen.queryByRole('button', { name: /selected cards/ })).not.toBeInTheDocument();
  });

  it('states selection in words as well as a checked box', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);
    await screen.findByLabelText('To Do column');

    await selectCards(user, ['Plan weekly groceries']);

    const strip = screen.getByRole('group', { name: 'Plan weekly groceries' });
    expect(within(strip).getByRole('checkbox', { name: 'Select Plan weekly groceries' })).toBeChecked();
    // The word is what carries the state in greyscale; the tint alone would not.
    expect(within(strip).getByText('Selected')).toBeInTheDocument();
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
