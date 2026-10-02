import { useEffect, useState } from 'react';
import { useAuthSession } from '../../../shared/lib/useAuthSession';
import { fetchCommunityPosts, fetchCommunityRegion } from '../api/posts';
import type { CommunityPost } from '../types';

export type CommunityPreviewState =
  | { status: 'anon' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; post: CommunityPost | null; regionLabel: string | null };

/** Home's "우리 동네 찾기·발견" card — just the single newest post. The full feed with
 * pagination/filters belongs to the (not-yet-built) 커뮤니티 tab. */
export function useCommunityPreview(): CommunityPreviewState {
  const session = useAuthSession();
  const [state, setState] = useState<CommunityPreviewState>({ status: 'loading' });

  useEffect(() => {
    if (session.status !== 'signedIn') {
      setState(session.status === 'anon' ? { status: 'anon' } : { status: 'loading' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const { data: region } = await fetchCommunityRegion();
        const regionLabel = region.regionLabel;
        const { data } = await fetchCommunityPosts({ limit: 1, region: regionLabel ?? undefined });
        if (!cancelled) {
          setState({ status: 'ready', post: data[0] ?? null, regionLabel });
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
  }, [session.status]);

  return state;
}
