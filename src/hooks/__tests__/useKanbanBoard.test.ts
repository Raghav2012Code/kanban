import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useKanbanBoard } from '../useKanbanBoard';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('useKanbanBoard storage warnings', () => {
  it('surfaces a quota warning when persistence fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const error = new Error('full');
      error.name = 'QuotaExceededError';
      throw error;
    });
    const { result } = renderHook(() => useKanbanBoard());
    await waitFor(() => expect(result.current.storageWarning).toEqual({ kind: 'quota' }));
  });

  it('does not warn when persistence succeeds', () => {
    const { result } = renderHook(() => useKanbanBoard());
    expect(result.current.storageWarning).toBeNull();
  });
});
