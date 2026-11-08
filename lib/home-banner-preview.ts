/** Local-only Home banner preview; never persisted or sent to Supabase. */
import type { HomeCampaignBanner } from '@/lib/supabase/home-campaign-banner';

const DEVELOPMENT_REF = 'kkltzygebomopysklaqq';
const PREVIEW_DURATION_MS = 30 * 60 * 1000;

export function canPreviewHomeCampaignBanner(): boolean {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '');
  return url === `https://${DEVELOPMENT_REF}.supabase.co`;
}

type PreviewStore = { ownerId: string; banner: HomeCampaignBanner };
let currentPreview: PreviewStore | null = null;

export function setHomeBannerPreview(
  ownerId: string,
  data: Pick<HomeCampaignBanner, 'title' | 'message' | 'destination'>
): void {
  if (!canPreviewHomeCampaignBanner() || !ownerId.trim() ||
      !data.title.trim() || !data.message.trim()) {
    throw new Error('Banner preview is available only to a signed-in Development administrator with complete copy.');
  }
  currentPreview = {
    ownerId,
    banner: {
      id: 'local-dev-preview',
      title: data.title.trim(),
      message: data.message.trim(),
      destination: data.destination,
      expiresAt: new Date(Date.now() + PREVIEW_DURATION_MS).toISOString(),
    },
  };
}

export function getHomeBannerPreview(ownerId: string): HomeCampaignBanner | null {
  if (!canPreviewHomeCampaignBanner() || !ownerId ||
      currentPreview?.ownerId !== ownerId) return null;
  if (new Date(currentPreview.banner.expiresAt).getTime() <= Date.now()) {
    currentPreview = null;
    return null;
  }
  return currentPreview.banner;
}

export function dismissHomeBannerPreview(ownerId: string): void {
  if (canPreviewHomeCampaignBanner() && currentPreview?.ownerId === ownerId) {
    currentPreview = null;
  }
}
