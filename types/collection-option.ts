import { CategoryId } from '@/constants/top3-categories';
import { Top3Item } from '@/types/top3-item';

export type CollectionOptionKind =
  | 'type'
  | 'theme';

export type TmdbDiscoverProviderConfig = {
  primaryReleaseDateGte?: string;
  primaryReleaseDateLte?: string;
  withPeople?: number;
  withCompanies?: number;
  /** Optional editorial movie IDs for a specific credited company. */
  featuredCompanyId?: number;
  featuredMovieIds?: number[];
  /** Weighted TMDB keyword IDs, configured per theme. */
  keywordRules?: { id: number; weight: number }[];
  pinnedMovieIds?: number[];
  excludedMovieIds?: number[];
  minimumVotes?: number;
  franchiseCaps?: { term: string; max: number }[];
};

export type CollectionOption = {
  id: string;
  slug: string;
  categoryId: CategoryId;
  kind: CollectionOptionKind;
  name: string;
  groupName?: string;
  browseLabel?: string;
  keywords: string[];
  searchHints: string[];
  featured: boolean;
  trendingEnabled: boolean;
  active: boolean;
  displayOrder: number;
  entityKind?: string;
  providerKey?: string;
  providerMode?: string;
  providerConfig: Record<string, unknown>;
};

export type CollectionOptionSuggestion = {
  id: number;
  optionId: string;
  itemId: string;
  item: Top3Item;
  displayOrder: number;
  active: boolean;
};
