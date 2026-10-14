import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { emptyData, sampleData, STORAGE_KEY } from './model';
import { useStore } from './useStore';
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe('local persistence', () => {
  it('persists and rehydrates a complete workspace', () => {
    const first = renderHook(useStore);
    const data = sampleData();
    act(() => first.result.current.save(data));
    first.unmount();
    const next = renderHook(useStore);
    expect(next.result.current.data).toEqual(data);
  });
  it('does not overwrite corrupt saved data', () => {
    localStorage.setItem(STORAGE_KEY, 'corrupt');
    const hook = renderHook(useStore);
    expect(hook.result.current.error).toBeTruthy();
    expect(() => hook.result.current.save(emptyData())).toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('corrupt');
    act(() => hook.result.current.save(emptyData(), true));
    expect(hook.result.current.error).toBe('');
  });
  it('keeps state unchanged when a write fails', () => {
    const hook = renderHook(useStore);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => hook.result.current.save(sampleData())).toThrow(
      'Could not save',
    );
    expect(hook.result.current.data).toEqual(emptyData());
  });
  it('rejects a save when another tab has written unseen changes', () => {
    const hook = renderHook(useStore);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData()));
    expect(() => hook.result.current.save(emptyData())).toThrow('another tab');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(
      sampleData(),
    );
  });
  it('reflects storage events from another tab', () => {
    const hook = renderHook(useStore);
    const data = sampleData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    act(() =>
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY })),
    );
    expect(hook.result.current.data).toEqual(data);
  });
});
