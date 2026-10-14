import { useEffect, useRef, useState } from 'react';
import { decodeData, emptyData, STORAGE_KEY } from './model';
import type { Data } from './model';
export function useStore() {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return { data: raw ? decodeData(raw) : emptyData(), raw, error: '' };
    } catch {
      return {
        data: emptyData(),
        raw: null,
        error:
          'Your saved data could not be read. It has not been overwritten. Restore a valid backup or download the original data below.',
      };
    }
  });
  const [data, setData] = useState(initial.data);
  const [error, setError] = useState(initial.error);
  const raw = useRef(initial.raw);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      try {
        const next = localStorage.getItem(STORAGE_KEY);
        setData(next ? decodeData(next) : emptyData());
        raw.current = next;
        setError('');
      } catch {
        setError(
          'Saved data changed in another tab and could not be read. Reload or restore a valid backup.',
        );
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function save(next: Data, restore = false) {
    if (error && !restore) throw new Error(error);
    try {
      const latest = localStorage.getItem(STORAGE_KEY);
      if (!restore && latest !== raw.current)
        throw new Error(
          'Data changed in another tab. Reload this page before saving.',
        );
      const serialized = JSON.stringify(decodeData(JSON.stringify(next)));
      localStorage.setItem(STORAGE_KEY, serialized);
      raw.current = serialized;
      setData(next);
      setError('');
    } catch (e) {
      if (e instanceof Error && e.message.includes('another tab')) throw e;
      throw new Error(
        'Could not save your data. Browser storage may be full or unavailable. Export a backup before closing this page.',
      );
    }
  }
  return { data, save, error };
}
