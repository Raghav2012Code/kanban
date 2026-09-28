import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KanbanBoard from '../../KanbanBoard';

/**
 * Guard test, not a behavioural assertion, and deliberately weaker than the
 * obvious one. This is a recorded deviation and is labelled as one.
 *
 * The rule is that a transient panel appearing in the board row must reserve the
 * footprint of the control that opens it, so opening it cannot reflow the bays.
 * The obvious test renders the board, records the bay widths, opens the panel,
 * records them again, and compares. That test cannot run here: the suite has no
 * layout engine, so every element measures zero and the assertion would pass no
 * matter what the CSS said. A check that cannot fail is worse than no check,
 * because it is trusted.
 *
 * So this asserts the invariant that *can* be checked — the rendered trigger and
 * the rendered panel declare the same width, and the panel refuses to grow — and
 * the design document records the widths and the gap. That is a weaker proxy than
 * a measurement, and it is honestly labelled rather than dressed up. Verifying
 * the layout for real needs a headless browser, which the design document names
 * as the available alternative and deliberately does not take.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const readRepoFile = (relativePath: string) => readFileSync(path.resolve(repoRoot, relativePath), 'utf8');

/** Only the breakpoint-qualified widths, which are the ones the reservation is about. */
const RESPONSIVE_WIDTH_TOKEN = /(?:^|\s)([a-z]+:w-\S+)/g;

function responsiveWidths(element: Element | null): string[] {
  if (!element) return [];
  return [...(element.getAttribute('class') ?? '').matchAll(RESPONSIVE_WIDTH_TOKEN)].map((match) => match[1]);
}

/** The nearest ancestor that reserves a width at a breakpoint, which is the footprint the row holds. */
function nearestReservedAncestor(start: Element): Element | null {
  let current: Element | null = start;
  while (current) {
    if (responsiveWidths(current).length > 0) return current;
    current = current.parentElement;
  }
  return null;
}

function hasClass(element: Element | null, className: string): boolean {
  return (element?.getAttribute('class') ?? '').split(/\s+/).includes(className);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('the add-bay footprint', () => {
  it('reserves the collapsed trigger width in the expanded form', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    const trigger = screen.getByRole('button', { name: /add bay/i });
    const triggerWidths = responsiveWidths(trigger);
    expect(triggerWidths.length, 'the collapsed trigger must reserve a width at a breakpoint').toBeGreaterThan(0);

    await user.click(trigger);

    const panelWidths = responsiveWidths(nearestReservedAncestor(screen.getByLabelText('New column name')));

    expect(panelWidths, 'the expanded form must reserve a width at a breakpoint').not.toEqual([]);
    expect(
      panelWidths,
      'the expanded form must occupy the same width as the control that opens it, or every bay resizes',
    ).toEqual(triggerWidths);
  });

  it('holds the panel to its reservation instead of letting it absorb the row', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard />);

    expect(hasClass(screen.getByLabelText('Backlog column'), 'lg:flex-1'), 'the bays are the flexible items in the row').toBe(true);

    await user.click(screen.getByRole('button', { name: /add bay/i }));
    const panel = nearestReservedAncestor(screen.getByLabelText('New column name'));

    // A panel that grew would have to take the space from somewhere. The bays are the
    // only flexible neighbours, so the panel must be the one that refuses to grow.
    expect(hasClass(panel, 'lg:flex-none'), 'the panel must refuse to grow').toBe(true);
    expect(hasClass(panel, 'lg:flex-1'), 'the panel must never be the flexible item').toBe(false);
  });
});

describe('the horizontal overflow gate', () => {
  it('sets no minimum width on the document, which is what forced page-level scroll before', () => {
    // The defect this guards is concrete and known: a `min-width: 320px` floor on
    // html/body forced 15px of page-level horizontal scroll at a 320px viewport once
    // the vertical scrollbar was accounted for. Unlike a rendered-width measurement,
    // this can actually fail, and it fails for the reason the defect occurred.
    const tokenFile = readRepoFile('src/styles/index.css');
    const documentRules = [...tokenFile.matchAll(/^(html|body)\s*\{([^}]*)\}/gm)];
    expect(documentRules.length, 'the token file should declare rules for html and body').toBeGreaterThan(0);

    const offenders = documentRules
      .filter(([, , declarations]) => /min-width/.test(declarations))
      .map(([, selector, declarations]) => `${selector} declares ${declarations.match(/min-width:[^;]*/)?.[0]}`);

    expect(offenders, 'a minimum-width floor on the document is what forces the page to scroll sideways').toEqual([]);
  });

  it('keeps the bay row the only horizontal scroll container, so the page does not move', () => {
    const { container } = render(<KanbanBoard />);

    expect(
      container.firstElementChild?.getAttribute('class'),
      'the app root must clip its own overflow so nothing drags the page sideways',
    ).toContain('overflow-x-hidden');

    const scrollable = [...container.querySelectorAll('*')].filter((element) =>
      element.getAttribute('class')?.includes('overflow-x-auto'),
    );
    expect(scrollable.length, 'the bay row must be a horizontal scroll container').toBeGreaterThan(0);
  });
});

/**
 * These two are records, not guards, and they are grouped separately so nobody
 * mistakes them for behavioural coverage. They cannot fail because a behaviour
 * broke; they fail only if the record is deleted. Their job is to stop a known
 * gap being forgotten, which is a documentation concern, so it is asserted as one.
 */
describe('the recorded layout gap', () => {
  const designDoc = readRepoFile('DESIGN.md');

  it('records the widths the board supports', () => {
    expect(designDoc, 'the smallest supported width must be stated').toContain('320px');
    expect(designDoc, 'the width the board row is intended for must be stated').toContain('1024px');
  });

  it('records that this suite cannot measure page-level overflow, and names the real alternative', () => {
    expect(designDoc, 'the inability to measure overflow must be stated, not glossed').toMatch(/no layout engine/i);
    expect(designDoc, 'the real alternative must be named rather than implied').toMatch(/headless browser/i);
    expect(designDoc, 'the gap must be described as deliberate').toMatch(/not taken here|deliberately not taken/i);
  });
});
