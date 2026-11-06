import { supabase } from '@/lib/supabase';
import type { NotificationDestination } from '@/types/notification-destination';
import type { CategoryId } from '@/constants/top3-categories';

type BannerRow = {
  campaign_id: string;
  title: string;
  message: string;
  category_id: string;
  destination_kind: string;
  option_id: string | null;
  expires_at: string;
};

export type HomeCampaignBanner = {
  id: string;
  title: string;
  message: string;
  destination: NotificationDestination;
  expiresAt: string;
};

export async function getActiveHomeCampaignBanner(): Promise<HomeCampaignBanner | null> {
  const { data, error } = await supabase.rpc('get_active_home_campaign_banner');
  if (error) throw new Error('Unable to load featured Top 3.');
  const rows = data as BannerRow[] | null;
  const row = rows?.[0];
  if (!row) return null;
  if (!row.campaign_id || !row.title || !row.message || !row.category_id) return null;
  const categoryId = row.category_id as CategoryId;
  let destination: NotificationDestination;
  if (row.destination_kind === 'overall' && row.option_id === null) {
    destination = { categoryId, kind: 'overall' };
  } else if ((row.destination_kind === 'type' || row.destination_kind === 'theme' ||
              row.destination_kind === 'genre') && row.option_id) {
    destination = { categoryId, kind: row.destination_kind, optionId: row.option_id };
  } else return null;
  return { id: row.campaign_id, title: row.title, message: row.message,
    destination, expiresAt: row.expires_at };
}

export async function dismissHomeCampaignBanner(campaignId: string): Promise<void> {
  const { data, error } = await supabase.rpc('dismiss_home_campaign_banner', {
    p_campaign_id: campaignId,
  });
  if (error || data !== true) throw new Error('Unable to dismiss featured Top 3.');
}

