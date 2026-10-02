import { apiFetch } from '../../../shared/lib/apiClient';
import type { Page, SavedDog } from '../types';

export function fetchSavedDogs(params?: { limit?: number; cursor?: string }) {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);
  const qs = query.toString();
  return apiFetch<Page<SavedDog>>(`/v1/me/saved-dogs${qs ? `?${qs}` : ''}`);
}
