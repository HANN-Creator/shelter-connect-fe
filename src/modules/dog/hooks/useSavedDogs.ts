import { useEffect, useState } from 'react';
import { useAuthSession } from '../../../shared/lib/useAuthSession';
import { fetchSavedDogs } from '../api/savedDogs';
import type { SavedDog } from '../types';

export type SavedDogsState =
  | { status: 'anon' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; dogs: SavedDog[] };

/** Saved-dogs is login-gated server-side — don't call it while signed out. */
export function useSavedDogs(limit: number): SavedDogsState {
  const session = useAuthSession();
  const [state, setState] = useState<SavedDogsState>({ status: 'loading' });

  useEffect(() => {
    if (session.status !== 'signedIn') {
      setState(session.status === 'anon' ? { status: 'anon' } : { status: 'loading' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const { data } = await fetchSavedDogs({ limit });
        if (!cancelled) {
          setState({ status: 'ready', dogs: data });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session.status, limit]);

  return state;
}
