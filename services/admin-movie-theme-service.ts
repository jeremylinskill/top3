import { supabase } from '@/lib/supabase';
import type { TmdbDiscoverProviderConfig } from '@/types/collection-option';
import type { Top3Item } from '@/types/top3-item';

export type AdminKeywordRule = { id: number; weight: number; name?: string };
export type AdminMovieThemeDefinition = {
  name: string;
  slug: string;
  displayTitle: string;
  description: string;
  keywordTerms: string[];
  keywordRules: AdminKeywordRule[];
  pinnedMovieIds: number[];
  excludedMovieIds: number[];
  minimumVotes: number;
  franchiseCaps: { term: string; max: number }[];
};

/** Actor drafts share the existing admin-only drafts table, with a distinct discriminator. */
export type AdminActorThemeDraftDefinition = {
  discoveryMethod: 'actor';
  name: string;
  slug: string;
  displayTitle: string;
  description: string;
  personId: number;
};
export type AdminCompanyThemeDraftDefinition = {
  discoveryMethod: 'company';
  name: string;
  slug: string;
  displayTitle: string;
  description: string;
  companyId: number;
};
/** Inclusive primary-release-date range. Saved drafts may have blank dates. */
export type AdminReleasePeriodDraftDefinition = {
  discoveryMethod: 'release_period';
  name: string;
  slug: string;
  displayTitle: string;
  description: string;
  startDate: string;
  endDate: string;
};
export type AdminReleasePeriodUpdate = {
  displayTitle: string;
  description: string;
  startDate: string;
  endDate: string;
};
export type AdminMovieThemeDraft = {
  id: string;
  definition: AdminMovieThemeDefinition | AdminActorThemeDraftDefinition | AdminCompanyThemeDraftDefinition | AdminReleasePeriodDraftDefinition | AdminCuratedThemeDraftDefinition;
  updated_at: string;
};
export function isAdminReleasePeriodDraft(
  definition: AdminMovieThemeDraft['definition']
): definition is AdminReleasePeriodDraftDefinition {
  return 'discoveryMethod' in definition && definition.discoveryMethod === 'release_period';
}
export function isAdminCompanyThemeDraft(
  definition: AdminMovieThemeDraft['definition']
): definition is AdminCompanyThemeDraftDefinition {
  return 'discoveryMethod' in definition && definition.discoveryMethod === 'company';
}
export function isAdminActorThemeDraft(
  definition: AdminMovieThemeDraft['definition']
): definition is AdminActorThemeDraftDefinition {
  return 'discoveryMethod' in definition && definition.discoveryMethod === 'actor';
}

export type AdminMovieThemeAction =
  | 'save_draft'
  | 'publish_draft'
  | 'update_published'
  | 'archive'
  | 'restore'
  | 'delete_draft';

export function movieThemeDiscoveryConfig(
  definition: AdminMovieThemeDefinition
): TmdbDiscoverProviderConfig {
  return {
    keywordRules: definition.keywordRules.map(({ id, weight }) => ({ id, weight })),
    pinnedMovieIds: definition.pinnedMovieIds,
    excludedMovieIds: definition.excludedMovieIds,
    minimumVotes: definition.minimumVotes,
    franchiseCaps: definition.franchiseCaps,
  };
}

export async function getAdminMovieThemeDrafts(): Promise<AdminMovieThemeDraft[]> {
  const { data, error } = await supabase
    .from('admin_movie_theme_drafts')
    .select('id, definition, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Unable to load drafts: ${error.message}`);
  return (data ?? []) as AdminMovieThemeDraft[];
}

export async function manageAdminMovieTheme(
  action: AdminMovieThemeAction,
  id: string | null = null,
  definition: AdminMovieThemeDefinition | null = null
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_manage_movie_theme', {
    p_action: action,
    p_id: id,
    p_definition: definition ?? {},
  });
  if (error) throw new Error(error.message);
  const result = data as { id?: string } | null;
  if (!result?.id) throw new Error('No identifier returned by the admin service.');
  return result.id;
}


/** Actor themes use a separate, narrowly scoped Development RPC. */
export type AdminActorThemeUpdate = {
  displayTitle: string;
  description: string;
  personId: number;
};
export async function updateAdminActorMovieTheme(
  id: string,
  details: AdminActorThemeUpdate
): Promise<void> {
  const { data, error } = await supabase.rpc('admin_update_movie_actor_theme', {
    p_id: id,
    p_details: details,
  });
  if (error) throw new Error(error.message);
  const result = data as { id?: string } | null;
  if (result?.id !== id) throw new Error('Actor theme update was not confirmed.');
}

/** Create, publish and delete actor drafts using an actor-only, administrator RPC. */
export async function manageAdminMovieActorDraft(
  action: 'save_draft' | 'publish_draft' | 'delete_draft',
  id: string | null = null,
  definition: AdminActorThemeDraftDefinition | null = null
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_manage_movie_actor_draft', {
    p_action: action,
    p_id: id,
    p_definition: definition ?? {},
  });
  if (error) throw new Error(error.message);
  const result = data as { id?: string } | null;
  if (!result?.id) throw new Error('No identifier returned by the actor theme admin service.');
  return result.id;
}

/** Production company changes are constrained to the company-only Development RPC. */
export type AdminCompanyThemeUpdate = {
  displayTitle: string;
  description: string;
  companyId: number;
};
export async function updateAdminCompanyMovieTheme(
  id: string,
  details: AdminCompanyThemeUpdate
): Promise<void> {
  const { data, error } = await supabase.rpc('admin_update_movie_company_theme', {
    p_id: id,
    p_details: details,
  });
  if (error) throw new Error(error.message);
  const result = data as { id?: string } | null;
  if (result?.id !== id) throw new Error('Company theme update was not confirmed.');
}

/** Company drafts cannot modify keyword or actor drafts. */
export async function manageAdminMovieCompanyDraft(
  action: 'save_draft' | 'publish_draft' | 'delete_draft',
  id: string | null = null,
  definition: AdminCompanyThemeDraftDefinition | null = null
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_manage_movie_company_draft', {
    p_action: action,
    p_id: id,
    p_definition: definition ?? {},
  });
  if (error) throw new Error(error.message);
  const result = data as { id?: string } | null;
  if (!result?.id) throw new Error('No identifier returned by the company theme admin service.');
  return result.id;
}

/** Only existing date-range Movie Themes can use this administrator-only RPC. */
export async function updateAdminReleasePeriodTheme(
  id: string,
  details: AdminReleasePeriodUpdate
): Promise<void> {
  const { data, error } = await supabase.rpc('admin_update_movie_release_period_theme', {
    p_id: id,
    p_details: details,
  });
  if (error) throw new Error(error.message);
  const result = data as { id?: string } | null;
  if (result?.id !== id) throw new Error('Release Period update was not confirmed.');
}

/** Release Period drafts are isolated from keyword, actor, and company drafts. */
export async function manageAdminReleasePeriodDraft(
  action: 'save_draft' | 'publish_draft' | 'delete_draft',
  id: string | null = null,
  definition: AdminReleasePeriodDraftDefinition | null = null
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_manage_movie_release_period_draft', {
    p_action: action,
    p_id: id,
    p_definition: definition ?? {},
  });
  if (error) throw new Error(error.message);
  const result = data as { id?: string } | null;
  if (!result?.id) throw new Error('No identifier returned by the release period admin service.');
  return result.id;
}

/** Curated themes use suggestion rows; existing title-only rows are preserved by row ID. */
export type AdminCuratedMovie = { id: string; title: string; imageUrl?: string; releaseYear?: string };
export type AdminCuratedMovieEntry = { rowId?: number; item: Top3Item };
export type AdminCuratedThemeDraftDefinition = {
  discoveryMethod: 'curated';
  name: string;
  slug: string;
  displayTitle: string;
  description: string;
  movies: AdminCuratedMovie[];
};
export type AdminCuratedThemePublishedUpdate = {
  displayTitle: string;
  description: string;
  version: string;
  entries: ({ rowId: number } | { item: AdminCuratedMovie })[];
};
export function isAdminCuratedThemeDraft(
  definition: AdminMovieThemeDraft['definition']
): definition is AdminCuratedThemeDraftDefinition {
  return 'discoveryMethod' in definition && definition.discoveryMethod === 'curated';
}
export async function getAdminCuratedMovieTheme(id: string): Promise<{
  entries: AdminCuratedMovieEntry[]; version: string;
}> {
  const { data, error } = await supabase.rpc('admin_get_movie_curated_theme', { p_id: id });
  if (error) throw new Error(error.message);
  const result = data as { entries?: AdminCuratedMovieEntry[]; version?: string } | null;
  if (!result || !Array.isArray(result.entries) || typeof result.version !== 'string') {
    throw new Error('Curated theme suggestions could not be verified.');
  }
  return { entries: result.entries, version: result.version };
}
export async function manageAdminCuratedMovieTheme(
  action: 'save_draft' | 'publish_draft' | 'delete_draft' | 'update_published',
  id: string | null = null,
  definition: AdminCuratedThemeDraftDefinition | AdminCuratedThemePublishedUpdate | null = null
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_manage_movie_curated_theme', {
    p_action: action,
    p_id: id,
    p_definition: definition ?? {},
  });
  if (error) throw new Error(error.message);
  const result = data as { id?: string } | null;
  if (!result?.id) throw new Error('No identifier returned by the curated theme service.');
  return result.id;
}

/** Archive/restore only already-published Curated Movie Themes; never delete suggestions. */
export async function setAdminCuratedMovieThemeActive(id: string, active: boolean): Promise<void> {
  const { data, error } = await supabase.rpc('admin_set_curated_movie_theme_active', {
    p_id: id,
    p_active: active,
  });
  if (error) throw new Error(error.message);
  const result = data as { id?: string; active?: boolean } | null;
  if (result?.id !== id || result?.active !== active) {
    throw new Error('Curated Movie Theme status change was not confirmed.');
  }
}
