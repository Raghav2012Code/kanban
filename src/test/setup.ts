/**
 * Where a test belongs.
 *
 * Pure transitions are tested in the board library. Anything only a component can
 * break is tested through the component. Nothing else needs a new seam.
 *
 * This split is written down because getting it wrong is invisible. A component
 * once stopped calling four correct predicates, and the library tests stayed
 * green throughout: they proved the predicates worked and said nothing about
 * whether anything called them. Seventy-two green tests coexisted with a board
 * that misreported completion, overdue state, and filtered reordering. A green
 * suite proves the layer it covers, and says nothing about the layer above.
 *
 * So before writing a test, ask what would have to be true for the behaviour to
 * be broken. If the answer is something the library cannot observe, the test
 * belongs at the component seam. If a test cannot be made to fail, it is not a
 * test: delete it rather than trusting it.
 *
 * One more kind of assertion exists, and it is labelled where it lives: checks
 * that a *record* is still present, such as a documented gap this suite cannot
 * verify. Those fail only if the record is deleted, never because a behaviour
 * broke. They are grouped under their own heading so they are never read as
 * behavioural coverage.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

if (typeof window !== 'undefined') {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  window.ResizeObserver ??= ResizeObserverStub as unknown as typeof window.ResizeObserver;
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
}
