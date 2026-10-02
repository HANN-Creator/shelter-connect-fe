import { apiFetch } from '../../../shared/lib/apiClient';
import type { UserPreferences } from '../types';

export function fetchCurrentShelterPreference() {
  return apiFetch<{ data: UserPreferences | null }>('/v1/me/preferences');
}

export function updateCurrentShelterPreference(shelterId: string | null) {
  return apiFetch<{ data: UserPreferences }>('/v1/me/preferences', {
    method: 'PUT',
    body: JSON.stringify({ currentShelterId: shelterId }),
  });
}
