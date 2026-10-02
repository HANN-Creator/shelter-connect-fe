import { apiFetch } from '../../../shared/lib/apiClient';
import type { CommunityCategory, CommunityPost, Page } from '../types';

export function fetchCommunityPosts(params?: {
  limit?: number;
  cursor?: string;
  region?: string;
  category?: CommunityCategory;
}) {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);
  if (params?.region) query.set('region', params.region);
  if (params?.category) query.set('category', params.category);
  const qs = query.toString();
  return apiFetch<Page<CommunityPost>>(`/v1/community/posts${qs ? `?${qs}` : ''}`);
}

export function fetchCommunityMediaUrl(mediaId: string) {
  return apiFetch<{ data: { id: string; url: string; expiresAt: string } }>(`/v1/community/media/${mediaId}`);
}

export function fetchCommunityRegion() {
  return apiFetch<{ data: { regionLabel: string | null } }>('/v1/me/community-region');
}
