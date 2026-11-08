import AppText from '@/components/app-text';
import ActionSheet, { type ActionSheetAction } from '@/components/action-sheet';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import { useCollectionOptions } from '@/context/collection-options-context';
import { useProfile } from '@/context/profile-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import {
  getThemeMovieSuggestions,
  getMovieById,
  getTmdbMovieActorById,
  searchTmdbMovieActors,
  getTmdbMovieCompanyById,
  searchTmdbMovieCompanies,
  searchMovies,
  searchTmdbMovieKeywords,
} from '@/providers/movies-and-tv';
import {
  AdminActorThemeUpdate,
  AdminActorThemeDraftDefinition,
  AdminCompanyThemeDraftDefinition,
  AdminCompanyThemeUpdate,
  AdminReleasePeriodDraftDefinition,
  AdminReleasePeriodUpdate,
  AdminCuratedMovie,
  AdminCuratedMovieEntry,
  AdminCuratedThemeDraftDefinition,
  AdminMovieThemeDefinition,
  AdminMovieThemeDraft,
  getAdminMovieThemeDrafts,
  isAdminActorThemeDraft,
  isAdminCompanyThemeDraft,
  isAdminReleasePeriodDraft,
  isAdminCuratedThemeDraft,
  getAdminCuratedMovieTheme,
  manageAdminCuratedMovieTheme,
  setAdminCuratedMovieThemeActive,
  manageAdminMovieActorDraft,
  manageAdminMovieCompanyDraft,
  manageAdminReleasePeriodDraft,
  manageAdminMovieTheme,
  movieThemeDiscoveryConfig,
  updateAdminActorMovieTheme,
  updateAdminCompanyMovieTheme,
  updateAdminReleasePeriodTheme,
} from '@/services/admin-movie-theme-service';
import type { CollectionOption } from '@/types/collection-option';
import type { Top3Item } from '@/types/top3-item';
import { getAdminCuratedSmartSuggestions, type CuratedSmartMovieResponse } from '@/providers/admin-curated-movie-suggestions';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Reanimated from 'react-native-reanimated';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type PendingConfirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

type Editing =
  | { kind: 'new' }
  | { kind: 'new_actor' }
  | { kind: 'actor_draft'; id: string }
  | { kind: 'new_company' }
  | { kind: 'new_period' }
  | { kind: 'new_curated' }
  | { kind: 'curated_draft'; id: string }
  | { kind: 'curated'; id: string }
  | { kind: 'period_draft'; id: string }
  | { kind: 'period'; id: string }
  | { kind: 'company_draft'; id: string }
  | { kind: 'company'; id: string }
  | { kind: 'draft'; id: string }
  | { kind: 'published'; id: string }
  | { kind: 'actor'; id: string }
  | { kind: 'view'; id: string };

type Keyword = { id: number; name: string };
type CuratedMovieLabel = { title: string; year?: string };
type ActorSearchResult = { id: number; name: string; knownFor: string[] };
type CompanySearchResult = { id: number; name: string; originCountry: string };

// Keep the shared scrolling-header state inside the keyed view shell. Opening a
// draft/editor remounts this shell so both content and header start at the top.
function AdminMovieThemeScrollShell({
  children,
  backgroundColor,
  onBackPress,
  refreshing,
  onRefresh,
  refreshTint,
}: {
  children: ReactNode;
  backgroundColor: string;
  onBackPress: () => void;
  refreshing: boolean;
  onRefresh?: () => void;
  refreshTint: string;
}) {
  const insets = useSafeAreaInsets();
  const ignoreScrollOffset = useCallback((_offset: number) => {}, []);
  const ignoreScrolledState = useCallback((_scrolled: boolean) => {}, []);
  const { scrollHandler, headerStyle } = useHomeStickyHeader(
    ignoreScrollOffset,
    ignoreScrolledState,
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor }]}
      edges={['left', 'right', 'bottom']}>
      <Reanimated.View
        pointerEvents="box-none"
        style={[
          styles.scrollingHeader,
          { height: insets.top + SCREEN_HEADER_HEIGHT + 16 },
          headerStyle,
        ]}>
        <ScreenHeader
          showBackButton
          onBackPress={onBackPress}
          overlay
          featheredBackdrop
          androidStatusBarGlass
        />
      </Reanimated.View>
      <Reanimated.ScrollView
        keyboardShouldPersistTaps="handled"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={refreshTint}
            colors={[refreshTint]}
            progressViewOffset={insets.top + SCREEN_HEADER_HEIGHT}
          />
        ) : undefined}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SCREEN_HEADER_HEIGHT + 26 },
        ]}>
        {children}
      </Reanimated.ScrollView>
    </SafeAreaView>
  );
}

// Movie IDs remain authoritative in the saved theme. These labels are display-only.
// Share successful lookups across editor visits and deduplicate concurrent requests.
const curatedMovieLabelCache = new Map<number, CuratedMovieLabel>();
const curatedMovieLabelRequests = new Map<number, Promise<CuratedMovieLabel>>();

async function getCuratedMovieLabel(movieId: number): Promise<CuratedMovieLabel> {
  const cached = curatedMovieLabelCache.get(movieId);
  if (cached) return cached;
  const pending = curatedMovieLabelRequests.get(movieId);
  if (pending) return pending;
  const request = getMovieById(movieId).then((movie) => {
    const label = { title: movie.title, year: movie.releaseYear };
    curatedMovieLabelCache.set(movieId, label);
    return label;
  }).finally(() => { curatedMovieLabelRequests.delete(movieId); });
  curatedMovieLabelRequests.set(movieId, request);
  return request;
}

const EMPTY_CURATED: AdminCuratedThemeDraftDefinition = {
  discoveryMethod: 'curated', name: '', slug: '', displayTitle: '', description: '', movies: [],
};
const EMPTY_PERIOD: AdminReleasePeriodDraftDefinition = {
  discoveryMethod: 'release_period', name: '', slug: '',
  displayTitle: '', description: '', startDate: '', endDate: '',
};
const EMPTY_COMPANY: AdminCompanyThemeDraftDefinition = {
  discoveryMethod: 'company', name: '', slug: '',
  displayTitle: '', description: '', companyId: 0,
};
const EMPTY_ACTOR: AdminActorThemeDraftDefinition = {
  discoveryMethod: 'actor', name: '', slug: '',
  displayTitle: '', description: '', personId: 0,
};
const EMPTY: AdminMovieThemeDefinition = {
  name: '', slug: '', displayTitle: '', description: '',
  keywordTerms: [], keywordRules: [], pinnedMovieIds: [],
  excludedMovieIds: [], minimumVotes: 150, franchiseCaps: [],
};
const toSlug = (name: string) => name.toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').slice(0, 60);
const ids = (value: unknown): number[] => Array.isArray(value)
  ? value.filter((x): x is number => Number.isSafeInteger(x) && x > 0)
  : [];
const rules = (value: unknown): AdminMovieThemeDefinition['keywordRules'] =>
  Array.isArray(value) ? value.filter((x) => x &&
    Number.isSafeInteger(x.id) && Number.isInteger(x.weight) &&
    x.id > 0 && x.weight > 0) : [];
const caps = (value: unknown): AdminMovieThemeDefinition['franchiseCaps'] =>
  Array.isArray(value) ? value.filter((x) => x &&
    typeof x.term === 'string' && Number.isInteger(x.max) && x.max > 0) : [];

function fromPublished(option: CollectionOption): AdminMovieThemeDefinition {
  const config = option.providerConfig ?? {};
  return {
    name: option.name,
    slug: option.slug,
    displayTitle: typeof config.displayTitle === 'string'
      ? config.displayTitle : `Top 3 ${option.name}`,
    description: option.browseLabel ?? '',
    keywordTerms: option.keywords ?? [],
    keywordRules: rules(config.keywordRules),
    pinnedMovieIds: ids(config.pinnedMovieIds),
    excludedMovieIds: ids(config.excludedMovieIds),
    minimumVotes: typeof config.minimumVotes === 'number'
      ? config.minimumVotes : 150,
    franchiseCaps: caps(config.franchiseCaps),
  };
}

// Actor and production company edits use separate administrator-only RPCs.
// Other discovery methods remain view-only until their controls are supported.
function isActorMovieTheme(option: CollectionOption): boolean {
  const config = option.providerConfig ?? {};
  return option.categoryId === 'movies' && option.kind === 'theme' &&
    option.providerKey === 'tmdb' && option.providerMode === 'discover' &&
    Number.isSafeInteger(config.withPeople) && (config.withPeople as number) > 0 &&
    !Array.isArray(config.keywordRules) &&
    config.withCompanies === undefined &&
    config.primaryReleaseDateGte === undefined &&
    config.primaryReleaseDateLte === undefined;
}

function isCompanyMovieTheme(option: CollectionOption): boolean {
  const config = option.providerConfig ?? {};
  return option.categoryId === 'movies' && option.kind === 'theme' &&
    option.providerKey === 'tmdb' && option.providerMode === 'discover' &&
    Number.isSafeInteger(config.withCompanies) && (config.withCompanies as number) > 0 &&
    !Array.isArray(config.keywordRules) &&
    config.withPeople === undefined &&
    config.primaryReleaseDateGte === undefined &&
    config.primaryReleaseDateLte === undefined;
}

function isCuratedMovieTheme(option: CollectionOption): boolean {
  return option.categoryId === 'movies' && option.kind === 'theme' &&
    option.providerMode === 'curated' && !option.providerKey;
}

function isReleasePeriodMovieTheme(option: CollectionOption): boolean {
  const config = option.providerConfig ?? {};
  return option.categoryId === 'movies' && option.kind === 'theme' &&
    option.providerKey === 'tmdb' && option.providerMode === 'discover' &&
    (typeof config.primaryReleaseDateGte === 'string' ||
      typeof config.primaryReleaseDateLte === 'string') &&
    !Array.isArray(config.keywordRules) &&
    config.withPeople === undefined && config.withCompanies === undefined;
}

// Dates are passed to TMDB in strict ISO YYYY-MM-DD form.
function isValidReleaseDate(value: string): boolean {
  if (!/^(18|19|20|21)[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function releasePeriodProblem(startDate: string, endDate: string, allowBlank: boolean): string | null {
  if (allowBlank && !startDate && !endDate) return null;
  if ((startDate && !isValidReleaseDate(startDate)) ||
    (endDate && !isValidReleaseDate(endDate))) {
    return 'Enter real dates in YYYY-MM-DD format (1800–2199).';
  }
  if (!allowBlank && (!startDate || !endDate)) {
    return 'Enter both a start date and an end date.';
  }
  if (startDate && endDate && startDate > endDate) {
    return 'The start date must be on or before the end date.';
  }
  return null;
}

// Mirrors the Development admin RPC's editable/archivable predicate.
// Other Movie Themes are displayed, but never sent to that write endpoint.
function isEditableMovieTheme(option: CollectionOption): boolean {
  return option.categoryId === 'movies' && option.kind === 'theme' &&
    option.providerKey === 'tmdb' && option.providerMode === 'discover' &&
    Array.isArray(option.providerConfig?.keywordRules);
}

function readOnlyDiscovery(option: CollectionOption): { label: string; detail: string } {
  const config = option.providerConfig ?? {};
  if (option.providerMode === 'curated') {
    return {
      label: 'Curated movie suggestions',
      detail: 'Suggestions are maintained separately from TMDB discovery settings.',
    };
  }
  if (option.providerKey === 'tmdb' && option.providerMode === 'discover') {
    if (typeof config.withPeople === 'number') {
      return { label: 'TMDB person', detail: `Person ID: ${config.withPeople}` };
    }
    if (typeof config.withCompanies === 'number') {
      return { label: 'TMDB production company', detail: `Company ID: ${config.withCompanies}` };
    }
    if (typeof config.primaryReleaseDateGte === 'string' ||
        typeof config.primaryReleaseDateLte === 'string') {
      const start = typeof config.primaryReleaseDateGte === 'string'
        ? config.primaryReleaseDateGte : 'Any start date';
      const end = typeof config.primaryReleaseDateLte === 'string'
        ? config.primaryReleaseDateLte : 'Any end date';
      return { label: 'TMDB release dates', detail: `${start} – ${end}` };
    }
  }
  return {
    label: 'Existing discovery configuration',
    detail: 'This theme uses a discovery method not yet supported by the editor.',
  };
}

function getDefinitionProblem(
  def: AdminMovieThemeDefinition, allowEmptyKeywords = false
): string | null {
  if (def.name.trim().length < 2 || def.name.trim().length > 100)
    return 'Enter a theme name (2–100 characters).';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(def.slug) || def.slug.length > 60)
    return 'Use a lowercase, hyphenated slug (up to 60 characters).';
  if (def.displayTitle.trim().length < 4 || def.displayTitle.trim().length > 120)
    return 'Enter a full list title (4–120 characters).';
  if (def.description.length > 180)
    return 'Keep the description under 180 characters.';
  if ((!allowEmptyKeywords && def.keywordRules.length < 1) || def.keywordRules.length > 8)
    return 'Choose 1–8 TMDB keywords for intelligent suggestions.';
  if (def.keywordRules.some((rule) => rule.weight < 1 || rule.weight > 10))
    return 'Keyword weights must be from 1 to 10.';
  if (def.minimumVotes < 0 || def.minimumVotes > 5000 || !Number.isInteger(def.minimumVotes))
    return 'Minimum votes must be a whole number from 0 to 5000.';
  if (def.pinnedMovieIds.length > 20 || def.excludedMovieIds.length > 20)
    return 'Use no more than 20 pinned or excluded movies.';
  return null;
}

export default function AdminListIdeasScreen() {
  const colors = useAppColors();
  const appearance = useColorScheme();
  const { profile } = useProfile();
  const { options, refreshOptions } = useCollectionOptions();
  const [drafts, setDrafts] = useState<AdminMovieThemeDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingAction, setWorkingAction] = useState<
    'save_draft' | 'publish_draft' | 'update_published' | 'update_actor' |
    'save_actor_draft' | 'publish_actor_draft' | 'delete_actor_draft' |
    'save_company_draft' | 'publish_company_draft' | 'delete_company_draft' | 'update_company' |
    'save_period_draft' | 'publish_period_draft' | 'delete_period_draft' | 'update_period' |
    'save_curated_draft' | 'publish_curated_draft' | 'delete_curated_draft' | 'update_curated' |
    'archive' | 'restore' | 'delete_draft' | null
  >(null);
  const working = workingAction !== null;
  const originalDefinitionKey = useRef(JSON.stringify(EMPTY));
  const originalFranchiseText = useRef('');
  const originalKeywordTermsText = useRef('');
  // Preserve a verified preview when returning to a saved draft on this screen.
  // The cache is keyed to the exact discovery configuration, not just the draft ID.
  const draftPreviewCache = useRef(new Map<string, { key: string; items: Top3Item[] }>());
  const [editing, setEditing] = useState<Editing | null>(null);
  const [definition, setDefinition] = useState<AdminMovieThemeDefinition>({ ...EMPTY });
  const [actorDetails, setActorDetails] = useState<AdminActorThemeUpdate>({
    displayTitle: '', description: '', personId: 0,
  });
  const originalActorDetails = useRef('');
  const [actorCreation, setActorCreation] = useState<AdminActorThemeDraftDefinition>({ ...EMPTY_ACTOR });
  const originalActorCreationKey = useRef(JSON.stringify(EMPTY_ACTOR));
  const [actorName, setActorName] = useState('');
  const [actorSearch, setActorSearch] = useState('');
  const [actorResults, setActorResults] = useState<ActorSearchResult[]>([]);
  const [actorLookupBusy, setActorLookupBusy] = useState(false);
  const [actorPreviewBusy, setActorPreviewBusy] = useState(false);
  const [actorPreview, setActorPreview] = useState<Top3Item[]>([]);
  const [actorPreviewPersonId, setActorPreviewPersonId] = useState<number | null>(null);
  const [companyDetails, setCompanyDetails] = useState<AdminCompanyThemeUpdate>({
    displayTitle: '', description: '', companyId: 0,
  });
  const originalCompanyDetails = useRef('');
  const [companyCreation, setCompanyCreation] = useState<AdminCompanyThemeDraftDefinition>({ ...EMPTY_COMPANY });
  const originalCompanyCreationKey = useRef(JSON.stringify(EMPTY_COMPANY));
  const [companyName, setCompanyName] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [companyResults, setCompanyResults] = useState<CompanySearchResult[]>([]);
  const [companyLookupBusy, setCompanyLookupBusy] = useState(false);
  const [companyPreviewBusy, setCompanyPreviewBusy] = useState(false);
  const [companyPreview, setCompanyPreview] = useState<Top3Item[]>([]);
  const [companyPreviewId, setCompanyPreviewId] = useState<number | null>(null);
  const [curatedDetails, setCuratedDetails] = useState({ displayTitle: '', description: '' });
  const [curatedCreation, setCuratedCreation] = useState<AdminCuratedThemeDraftDefinition>({ ...EMPTY_CURATED });
  const [curatedEntries, setCuratedEntries] = useState<AdminCuratedMovieEntry[]>([]);
  const [curatedVersion, setCuratedVersion] = useState('');
  const [curatedLoading, setCuratedLoading] = useState(false);
  const [curatedSearchBusy, setCuratedSearchBusy] = useState(false);
  const [curatedSearch, setCuratedSearch] = useState('');
  const [curatedResults, setCuratedResults] = useState<Top3Item[]>([]);
  const curatedSearchToken = useRef(0);
  const [smartBusy, setSmartBusy] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<CuratedSmartMovieResponse | null>(null);
  const [smartSuggestionsKey, setSmartSuggestionsKey] = useState('');
  const [smartError, setSmartError] = useState<string | null>(null);
  const smartRequestToken = useRef(0);
  const originalCuratedKey = useRef('');
  const curatedLoadToken = useRef(0);
  const [periodDetails, setPeriodDetails] = useState<AdminReleasePeriodUpdate>({
    displayTitle: '', description: '', startDate: '', endDate: '',
  });
  const originalPeriodDetailsKey = useRef('');
  const [periodCreation, setPeriodCreation] = useState<AdminReleasePeriodDraftDefinition>({ ...EMPTY_PERIOD });
  const originalPeriodCreationKey = useRef(JSON.stringify(EMPTY_PERIOD));
  const [periodPreviewBusy, setPeriodPreviewBusy] = useState(false);
  const [periodPreview, setPeriodPreview] = useState<Top3Item[]>([]);
  const [periodPreviewKey, setPeriodPreviewKey] = useState('');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [keywordResults, setKeywordResults] = useState<Keyword[]>([]);
  const [movieSearch, setMovieSearch] = useState('');
  const [movieResults, setMovieResults] = useState<Top3Item[]>([]);
  const [curatedMovieLabels, setCuratedMovieLabels] = useState<Record<number, CuratedMovieLabel>>({});
  const [failedMovieLabelIds, setFailedMovieLabelIds] = useState<number[]>([]);
  const [lookupTarget, setLookupTarget] = useState<'keywords' | 'movies' | null>(null);
  const lookupBusy = lookupTarget !== null;
  const [previewBusy, setPreviewBusy] = useState(false);
  const [preview, setPreview] = useState<Top3Item[]>([]);
  const [previewKey, setPreviewKey] = useState('');
  const [franchiseText, setFranchiseText] = useState('');
  const [keywordTermsText, setKeywordTermsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const showConfirmation = useCallback((next: PendingConfirmation) => {
    setConfirmation(next);
  }, []);

  const movieThemes = useMemo(() => options.filter((option) =>
    option.categoryId === 'movies' && option.kind === 'theme'
  ).sort((a, b) => a.name.localeCompare(b.name)), [options]);
  const publishedThemes = movieThemes.filter((option) => option.active);
  const archivedThemes = movieThemes.filter((option) => !option.active);
  const viewOnlyTheme = editing?.kind === 'view'
    ? movieThemes.find((option) => option.id === editing.id) : undefined;
  const actorTheme = editing?.kind === 'actor'
    ? movieThemes.find((option) => option.id === editing.id) : undefined;
  const actorCreating = editing?.kind === 'new_actor' || editing?.kind === 'actor_draft';
  const companyTheme = editing?.kind === 'company'
    ? movieThemes.find((option) => option.id === editing.id) : undefined;
  const companyCreating = editing?.kind === 'new_company' || editing?.kind === 'company_draft';
  const curatedTheme = editing?.kind === 'curated'
    ? movieThemes.find((option) => option.id === editing.id) : undefined;
  const curatedCreating = editing?.kind === 'new_curated' || editing?.kind === 'curated_draft';
  const activeCuratedDetails = curatedCreating ? curatedCreation : curatedDetails;
  const curatedDraftProblem = curatedCreation.name.trim().length < 2 || curatedCreation.name.trim().length > 100
    ? 'Enter a theme name (2–100 characters).'
    : !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(curatedCreation.slug) || curatedCreation.slug.length > 60
      ? 'Use a lowercase, hyphenated slug (up to 60 characters).' : null;
  const curatedDetailsProblem = activeCuratedDetails.displayTitle.trim().length < 4 || activeCuratedDetails.displayTitle.trim().length > 120
    ? 'Enter a full list title (4–120 characters).'
    : activeCuratedDetails.description.length > 180 ? 'Keep the description under 180 characters.' : null;
  const curatedTooFew = curatedEntries.length < 3;
  const curatedTooMany = curatedEntries.length > 60;
  const periodTheme = editing?.kind === 'period'
    ? movieThemes.find((option) => option.id === editing.id) : undefined;
  const periodCreating = editing?.kind === 'new_period' || editing?.kind === 'period_draft';
  const activePeriodDetails = periodCreating ? periodCreation : periodDetails;
  const periodCurrentKey = JSON.stringify([activePeriodDetails.startDate, activePeriodDetails.endDate]);
  const periodPreviewCurrent = periodPreview.length >= 3 && periodPreviewKey === periodCurrentKey;
  const periodDatesChanged = Boolean(periodTheme && (
    periodDetails.startDate !== periodTheme.providerConfig.primaryReleaseDateGte ||
    periodDetails.endDate !== periodTheme.providerConfig.primaryReleaseDateLte
  ));
  const periodRangeProblem = releasePeriodProblem(
    activePeriodDetails.startDate, activePeriodDetails.endDate, false
  );
  const periodProblem = activePeriodDetails.displayTitle.trim().length < 4 || activePeriodDetails.displayTitle.length > 120
    ? 'Enter a full list title (4–120 characters).'
    : activePeriodDetails.description.length > 180
      ? 'Keep the description under 180 characters.' : periodRangeProblem;
  const periodDraftProblem = periodCreation.name.trim().length < 2 || periodCreation.name.trim().length > 100
    ? 'Enter a theme name (2–100 characters).'
    : !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(periodCreation.slug) || periodCreation.slug.length > 60
      ? 'Use a lowercase, hyphenated slug (up to 60 characters).'
      : periodCreation.displayTitle.trim().length < 4 || periodCreation.displayTitle.length > 120
        ? 'Enter a full list title (4–120 characters).'
        : periodCreation.description.length > 180
          ? 'Keep the description under 180 characters.'
          : releasePeriodProblem(periodCreation.startDate, periodCreation.endDate, true);
  const activeCompanyDetails = companyCreating ? companyCreation : companyDetails;
  const companyIdChanged = Boolean(companyTheme && companyTheme.providerConfig.withCompanies !== companyDetails.companyId);
  const companyPreviewCurrent = companyPreview.length >= 3 && companyPreviewId === activeCompanyDetails.companyId;
  const companyProblem = activeCompanyDetails.displayTitle.trim().length < 4 || activeCompanyDetails.displayTitle.length > 120
    ? 'Enter a full list title (4–120 characters).'
    : activeCompanyDetails.description.length > 180
      ? 'Keep the description under 180 characters.'
      : !Number.isSafeInteger(activeCompanyDetails.companyId) || activeCompanyDetails.companyId <= 0
        ? 'Select a production company from TMDB.' : null;
  const companyDraftProblem = companyCreation.name.trim().length < 2 || companyCreation.name.trim().length > 100
    ? 'Enter a theme name (2–100 characters).'
    : !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(companyCreation.slug) || companyCreation.slug.length > 60
      ? 'Use a lowercase, hyphenated slug (up to 60 characters).'
      : companyCreation.displayTitle.trim().length < 4 || companyCreation.displayTitle.trim().length > 120
        ? 'Enter a full list title (4–120 characters).'
        : companyCreation.description.length > 180
          ? 'Keep the description under 180 characters.' : null;
  const activeActorDetails = actorCreating ? actorCreation : actorDetails;
  const actorPersonChanged = Boolean(actorTheme && actorTheme.providerConfig.withPeople !== actorDetails.personId);
  const actorPreviewCurrent = actorPreview.length >= 3 && actorPreviewPersonId === activeActorDetails.personId;
  const actorProblem = activeActorDetails.displayTitle.trim().length < 4 || activeActorDetails.displayTitle.length > 120
    ? 'Enter a full list title (4–120 characters).'
    : activeActorDetails.description.length > 180
      ? 'Keep the description under 180 characters.'
      : !Number.isSafeInteger(activeActorDetails.personId) || activeActorDetails.personId <= 0
        ? 'Select an actor from TMDB.' : null;
  const actorDraftProblem = actorCreation.name.trim().length < 2 || actorCreation.name.trim().length > 100
    ? 'Enter a theme name (2–100 characters).'
    : !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(actorCreation.slug) || actorCreation.slug.length > 60
      ? 'Use a lowercase, hyphenated slug (up to 60 characters).'
      : actorCreation.displayTitle.trim().length < 4 || actorCreation.displayTitle.trim().length > 120
        ? 'Enter a full list title (4–120 characters).'
        : actorCreation.description.length > 180
          ? 'Keep the description under 180 characters.' : null;

  const reload = useCallback(async () => {
    if (!profile.isAdmin) return;
    setLoading(true);
    try {
      const next = await getAdminMovieThemeDrafts();
      setDrafts(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load drafts.');
    } finally {
      setLoading(false);
    }
  }, [profile.isAdmin]);
  useEffect(() => { void reload(); }, [reload]);

  const refreshCatalogue = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([reload(), refreshOptions()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not refresh catalogue.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, reload, refreshOptions]);

  const configKey = JSON.stringify(movieThemeDiscoveryConfig(definition));
  const isPreviewCurrent = preview.length >= 3 && previewKey === configKey;
  const validationProblem = getDefinitionProblem(definition);
  const draftProblem = getDefinitionProblem(definition, true);

  const selectedMovieIds = editing
    ? [...new Set([...definition.pinnedMovieIds, ...definition.excludedMovieIds])]
    : [];
  const selectedMovieIdsKey = selectedMovieIds.join(',');

  // Resolve a small batch at a time instead of flooding TMDB when opening a
  // heavily curated theme. A failed lookup never blocks editing or removal.
  useEffect(() => {
    let active = true;
    const movieIds = selectedMovieIdsKey.split(',')
      .filter(Boolean).map(Number).filter(Number.isSafeInteger);
    void (async () => {
      for (let start = 0; start < movieIds.length && active; start += 3) {
        await Promise.all(movieIds.slice(start, start + 3).map(async (movieId) => {
          try {
            const label = await getCuratedMovieLabel(movieId);
            if (active) {
              setCuratedMovieLabels((previous) => ({ ...previous, [movieId]: label }));
            }
          } catch {
            if (active) {
              setFailedMovieLabelIds((previous) => previous.includes(movieId)
                ? previous : [...previous, movieId]);
            }
          }
        }));
      }
    })();
    return () => { active = false; };
  }, [selectedMovieIdsKey]);

  function begin(edit: Editing, def: AdminMovieThemeDefinition) {
    const nextDefinition = { ...def, keywordRules: [...def.keywordRules],
      pinnedMovieIds: [...def.pinnedMovieIds], excludedMovieIds: [...def.excludedMovieIds],
      franchiseCaps: [...def.franchiseCaps] };
    setEditing(edit);
    setDefinition(nextDefinition);
    originalDefinitionKey.current = JSON.stringify(nextDefinition);
    const nextFranchiseText = def.franchiseCaps.map((cap) => `${cap.term}:${cap.max}`).join(', ');
    const nextKeywordTermsText = def.keywordTerms.join(', ');
    setFranchiseText(nextFranchiseText);
    setKeywordTermsText(nextKeywordTermsText);
    originalFranchiseText.current = nextFranchiseText;
    originalKeywordTermsText.current = nextKeywordTermsText;
    setKeywordSearch(''); setKeywordResults([]);
    setMovieSearch(''); setMovieResults([]);
    const cached = edit.kind === 'draft' ? draftPreviewCache.current.get(edit.id) : undefined;
    const nextKey = JSON.stringify(movieThemeDiscoveryConfig(nextDefinition));
    const useCache = Boolean(cached && cached.key === nextKey && cached.items.length >= 3);
    setPreview(useCache && cached ? cached.items : []);
    setPreviewKey(useCache ? nextKey : '');
    setError(null);
    Keyboard.dismiss();
  }
  function resetCuratedSearch() {
    setCuratedSearch(''); setCuratedResults([]); setCuratedSearchBusy(false);
    smartRequestToken.current += 1;
    setSmartBusy(false); setSmartSuggestions(null); setSmartSuggestionsKey(''); setSmartError(null);
  }
  async function findSmartCuratedSuggestions() {
    if (!editing || !['curated', 'curated_draft', 'new_curated'].includes(editing.kind) ||
      curatedLoading || smartBusy || working) return;
    const name = curatedCreating ? curatedCreation.name : curatedTheme?.name ?? '';
    const details = curatedCreating ? curatedCreation : curatedDetails;
    const description = details.description;
    const key = JSON.stringify([name, description]);
    if (!name.trim() && !description.trim()) {
      setSmartError('Enter a theme name or description first.');
      return;
    }
    const token = ++smartRequestToken.current;
    setSmartBusy(true); setSmartError(null); setSmartSuggestions(null);
    Keyboard.dismiss();
    try {
      const response = await getAdminCuratedSmartSuggestions({
        name, description, selectedMovies: curatedEntries.map((entry) => entry.item),
      });
      if (token !== smartRequestToken.current) return;
      setSmartSuggestions(response); setSmartSuggestionsKey(key);
    } catch (caught) {
      if (token === smartRequestToken.current)
        setSmartError(caught instanceof Error ? caught.message : 'Unable to load suggestions.');
    } finally {
      if (token === smartRequestToken.current) setSmartBusy(false);
    }
  }
  function beginNewCurated() {
    curatedLoadToken.current += 1;
    setEditing({ kind: 'new_curated' });
    setCuratedCreation({ ...EMPTY_CURATED, movies: [] });
    setCuratedEntries([]); setCuratedVersion(''); setCuratedLoading(false);
    originalCuratedKey.current = JSON.stringify([EMPTY_CURATED, []]);
    resetCuratedSearch(); setError(null); Keyboard.dismiss();
  }
  function beginCuratedDraft(draft: AdminMovieThemeDraft) {
    if (!isAdminCuratedThemeDraft(draft.definition)) return;
    curatedLoadToken.current += 1;
    const selected = { ...draft.definition, movies: [...draft.definition.movies] };
    const entries = selected.movies.map((item) => ({ item }));
    setEditing({ kind: 'curated_draft', id: draft.id });
    setCuratedCreation(selected);
    setCuratedEntries(entries);
    setCuratedVersion(''); setCuratedLoading(false);
    originalCuratedKey.current = JSON.stringify([selected, entries]);
    resetCuratedSearch(); setError(null); Keyboard.dismiss();
  }
  function beginCurated(option: CollectionOption) {
    const token = ++curatedLoadToken.current;
    const details = {
      displayTitle: typeof option.providerConfig.displayTitle === 'string'
        ? option.providerConfig.displayTitle : `Top 3 ${option.name}`,
      description: option.browseLabel ?? '',
    };
    setEditing({ kind: 'curated', id: option.id });
    setCuratedDetails(details);
    setCuratedEntries([]); setCuratedVersion(''); setCuratedLoading(true);
    originalCuratedKey.current = '';
    resetCuratedSearch(); setError(null); Keyboard.dismiss();
    void getAdminCuratedMovieTheme(option.id).then(({ entries, version }) => {
      if (curatedLoadToken.current !== token) return;
      setCuratedEntries(entries);
      setCuratedVersion(version);
      originalCuratedKey.current = JSON.stringify([details, entries]);
    }).catch((caught) => {
      if (curatedLoadToken.current === token) {
        setError(caught instanceof Error ? caught.message : 'Could not load curated movies.');
      }
    }).finally(() => { if (curatedLoadToken.current === token) setCuratedLoading(false); });
  }
  function curatedMovieFromSearch(item: Top3Item): AdminCuratedMovie {
    return {
      id: item.id, title: item.title,
      ...(item.releaseYear ? { releaseYear: item.releaseYear } : {}),
      ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    };
  }
  function changeCuratedSearch(text: string) {
    // Invalidate in-flight lookups so Clear cannot be undone by a late response.
    curatedSearchToken.current += 1;
    setCuratedSearch(text);
    setCuratedResults([]);
    setCuratedSearchBusy(false);
  }
  async function lookupCuratedMovies() {
    const query = curatedSearch.trim();
    if (query.length < 2 || curatedSearchBusy || working) return;
    const requestToken = ++curatedSearchToken.current;
    setCuratedSearchBusy(true);
    setCuratedResults([]);
    try {
      const results = await searchMovies(query);
      if (requestToken !== curatedSearchToken.current) return;
      setCuratedResults(results.filter((item) => /^movie-[1-9][0-9]{0,8}$/.test(item.id)));
      setError(null);
    } catch (caught) {
      if (requestToken === curatedSearchToken.current) {
        setError(caught instanceof Error ? caught.message : 'Movie search failed.');
      }
    } finally {
      if (requestToken === curatedSearchToken.current) setCuratedSearchBusy(false);
    }
  }
  function addCuratedMovie(item: Top3Item) {
    if (curatedLoading || curatedEntries.length >= 60) return;
    const title = item.title.trim().toLowerCase();
    if (curatedEntries.some((entry) => entry.item.id === item.id ||
      entry.item.title.trim().toLowerCase() === title)) return;
    setCuratedEntries((prev) => [...prev, { item: curatedMovieFromSearch(item) }]);
  }
  function moveCuratedMovie(index: number, direction: -1 | 1) {
    setCuratedEntries((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  async function saveCurated(action: 'save_draft' | 'publish_draft' | 'update_published') {
    if (!editing || working || curatedLoading || curatedDetailsProblem || curatedTooMany ||
      (curatedCreating && curatedDraftProblem) ||
      ((action === 'publish_draft' || action === 'update_published') && curatedTooFew)) return;
    const editingAtStart = editing;
    setWorkingAction(action === 'save_draft' ? 'save_curated_draft'
      : action === 'publish_draft' ? 'publish_curated_draft' : 'update_curated');
    setError(null);
    try {
      if (action === 'update_published') {
        if (editingAtStart.kind !== 'curated' || !curatedVersion) return;
        await manageAdminCuratedMovieTheme('update_published', editingAtStart.id, {
          ...curatedDetails,
          version: curatedVersion,
          entries: curatedEntries.map((entry) => entry.rowId !== undefined
            ? { rowId: entry.rowId } : { item: curatedMovieFromSearch(entry.item) }),
        });
      } else {
        if (editingAtStart.kind !== 'new_curated' && editingAtStart.kind !== 'curated_draft') return;
        const details: AdminCuratedThemeDraftDefinition = {
          ...curatedCreation,
          movies: curatedEntries.map((entry) => curatedMovieFromSearch(entry.item)),
        };
        const draftId = await manageAdminCuratedMovieTheme('save_draft',
          editingAtStart.kind === 'curated_draft' ? editingAtStart.id : null, details);
        if (action === 'publish_draft') {
          await manageAdminCuratedMovieTheme('publish_draft', draftId);
        } else {
          setCuratedCreation(details);
          originalCuratedKey.current = JSON.stringify([details, curatedEntries]);
          setEditing({ kind: 'curated_draft', id: draftId });
        }
      }
      await Promise.all([reload(), refreshOptions()]);
      if (action !== 'save_draft') setEditing(null);
      Alert.alert(action === 'publish_draft' ? 'Published' : 'Saved',
        action === 'publish_draft' ? 'Your curated Movie Theme is now available in Top 3.'
          : 'Curated Movie Theme changes have been saved.');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not save curated Movie Theme.';
      setError(message);
      // The publish button is far below the error notice; make failures visible here.
      if (action === 'publish_draft') Alert.alert('Could not publish theme', message);
    } finally { setWorkingAction(null); }
  }
  function confirmCuratedArchiveRestore(id: string, restore: boolean) {
    if (working || curatedLoading || !curatedVersion) return;
    // Don't discard an administrator's unsaved title/description/selection changes.
    if (JSON.stringify([curatedDetails, curatedEntries]) !== originalCuratedKey.current) {
      Alert.alert('Unsaved changes', 'Save your changes before archiving or restoring this theme.');
      return;
    }
    showConfirmation({
      title: restore ? 'Restore theme?' : 'Archive theme?',
      message: restore
        ? 'This theme will become available again when creating a Top 3.'
        : 'This theme will no longer appear in new Top 3 choices. Existing published user lists and curated suggestions are preserved.',
      confirmLabel: restore ? 'Restore' : 'Archive',
      destructive: !restore,
      onConfirm: () => { void (async () => {
        if (working) return;
        setWorkingAction(restore ? 'restore' : 'archive'); setError(null);
        try {
          await setAdminCuratedMovieThemeActive(id, restore);
          await Promise.all([reload(), refreshOptions()]);
          setEditing(null);
          Alert.alert(restore ? 'Restored' : 'Archived', restore
            ? 'This Curated Movie Theme is available again.'
            : 'This Curated Movie Theme has been moved to Archived themes.');
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Could not change the theme status.');
        } finally { setWorkingAction(null); }
      })(); },
    });
  }
  function confirmDeleteCuratedDraft(id: string) {
    showConfirmation({
      title: 'Delete draft?',
      message: 'This unpublished Curated Movie Theme draft will be permanently deleted.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => { void (async () => {
        if (working) return;
        setWorkingAction('delete_curated_draft'); setError(null);
        try {
          await manageAdminCuratedMovieTheme('delete_draft', id);
          await reload(); setEditing(null);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Could not delete curated draft.');
        } finally { setWorkingAction(null); }
      })(); },
    });
  }
  function beginNewPeriod() {
    setEditing({ kind: 'new_period' });
    setPeriodCreation({ ...EMPTY_PERIOD });
    originalPeriodCreationKey.current = JSON.stringify(EMPTY_PERIOD);
    setPeriodPreview([]); setPeriodPreviewKey('');
    setError(null);
    Keyboard.dismiss();
  }
  function beginPeriodDraft(draft: AdminMovieThemeDraft) {
    if (!isAdminReleasePeriodDraft(draft.definition)) return;
    const selected = { ...draft.definition };
    setEditing({ kind: 'period_draft', id: draft.id });
    setPeriodCreation(selected);
    originalPeriodCreationKey.current = JSON.stringify(selected);
    setPeriodPreview([]); setPeriodPreviewKey('');
    setError(null);
    Keyboard.dismiss();
  }
  function beginPeriod(option: CollectionOption) {
    const config = option.providerConfig;
    const selected: AdminReleasePeriodUpdate = {
      displayTitle: typeof config.displayTitle === 'string'
        ? config.displayTitle : `Top 3 ${option.name}`,
      description: option.browseLabel ?? '',
      startDate: typeof config.primaryReleaseDateGte === 'string' ? config.primaryReleaseDateGte : '',
      endDate: typeof config.primaryReleaseDateLte === 'string' ? config.primaryReleaseDateLte : '',
    };
    setEditing({ kind: 'period', id: option.id });
    setPeriodDetails(selected);
    originalPeriodDetailsKey.current = JSON.stringify(selected);
    setPeriodPreview([]); setPeriodPreviewKey('');
    setError(null);
    Keyboard.dismiss();
  }
  function beginNewActor() {
    setEditing({ kind: 'new_actor' });
    setActorCreation({ ...EMPTY_ACTOR });
    originalActorCreationKey.current = JSON.stringify(EMPTY_ACTOR);
    setActorName('No actor selected');
    setActorSearch(''); setActorResults([]); setActorLookupBusy(false);
    setActorPreview([]); setActorPreviewPersonId(null);
    setError(null);
    Keyboard.dismiss();
  }
  function openDraft(draft: AdminMovieThemeDraft) {
    const def = draft.definition;
    if (isAdminCuratedThemeDraft(def)) beginCuratedDraft(draft);
    else if (isAdminReleasePeriodDraft(def)) beginPeriodDraft(draft);
    else if (isAdminActorThemeDraft(def)) beginActorDraft(draft);
    else if (isAdminCompanyThemeDraft(def)) beginCompanyDraft(draft);
    else begin({ kind: 'draft', id: draft.id }, def);
  }
  function beginActorDraft(draft: AdminMovieThemeDraft) {
    if (!isAdminActorThemeDraft(draft.definition)) return;
    setEditing({ kind: 'actor_draft', id: draft.id });
    const selected = { ...draft.definition };
    setActorCreation(selected);
    originalActorCreationKey.current = JSON.stringify(selected);
    setActorName(selected.personId ? `TMDB person #${selected.personId}` : 'No actor selected');
    setActorSearch(''); setActorResults([]); setActorLookupBusy(false);
    setActorPreview([]); setActorPreviewPersonId(null);
    setError(null);
    Keyboard.dismiss();
  }
  function beginActor(option: CollectionOption) {
    const config = option.providerConfig;
    const details: AdminActorThemeUpdate = {
      displayTitle: typeof config.displayTitle === 'string'
        ? config.displayTitle : `Top 3 ${option.name}`,
      description: option.browseLabel ?? '',
      personId: config.withPeople as number,
    };
    setEditing({ kind: 'actor', id: option.id });
    setActorDetails(details);
    originalActorDetails.current = JSON.stringify(details);
    setActorName(`TMDB person #${details.personId}`);
    setActorSearch(''); setActorResults([]); setActorLookupBusy(false);
    setActorPreview([]); setActorPreviewPersonId(null);
    setError(null);
    Keyboard.dismiss();
  }
  function beginNewCompany() {
    setEditing({ kind: 'new_company' });
    setCompanyCreation({ ...EMPTY_COMPANY });
    originalCompanyCreationKey.current = JSON.stringify(EMPTY_COMPANY);
    setCompanyName('No company selected');
    setCompanySearch(''); setCompanyResults([]); setCompanyLookupBusy(false);
    setCompanyPreview([]); setCompanyPreviewId(null);
    setError(null);
    Keyboard.dismiss();
  }
  function beginCompanyDraft(draft: AdminMovieThemeDraft) {
    if (!isAdminCompanyThemeDraft(draft.definition)) return;
    setEditing({ kind: 'company_draft', id: draft.id });
    const selected = { ...draft.definition };
    setCompanyCreation(selected);
    originalCompanyCreationKey.current = JSON.stringify(selected);
    setCompanyName(selected.companyId ? `TMDB company #${selected.companyId}` : 'No company selected');
    setCompanySearch(''); setCompanyResults([]); setCompanyLookupBusy(false);
    setCompanyPreview([]); setCompanyPreviewId(null);
    setError(null);
    Keyboard.dismiss();
  }
  function beginCompany(option: CollectionOption) {
    const config = option.providerConfig;
    const details: AdminCompanyThemeUpdate = {
      displayTitle: typeof config.displayTitle === 'string'
        ? config.displayTitle : `Top 3 ${option.name}`,
      description: option.browseLabel ?? '',
      companyId: config.withCompanies as number,
    };
    setEditing({ kind: 'company', id: option.id });
    setCompanyDetails(details);
    originalCompanyDetails.current = JSON.stringify(details);
    setCompanyName(`TMDB company #${details.companyId}`);
    setCompanySearch(''); setCompanyResults([]); setCompanyLookupBusy(false);
    setCompanyPreview([]); setCompanyPreviewId(null);
    setError(null);
    Keyboard.dismiss();
  }
  function openMovieTheme(option: CollectionOption) {
    if (isCuratedMovieTheme(option)) { beginCurated(option); return; }
    if (isReleasePeriodMovieTheme(option)) {
      beginPeriod(option);
      return;
    }
    if (isActorMovieTheme(option)) {
      beginActor(option);
      return;
    }
    if (isCompanyMovieTheme(option)) {
      beginCompany(option);
      return;
    }
    begin(
      { kind: isEditableMovieTheme(option) ? 'published' : 'view', id: option.id },
      fromPublished(option)
    );
  }
  // Fetch the authoritative name for the configured TMDB person, not a guess
  // based on the theme title. Failed lookups never prevent editing.
  useEffect(() => {
    if (!['actor', 'new_actor', 'actor_draft'].includes(editing?.kind ?? '') || !activeActorDetails.personId) return;
    let active = true;
    void getTmdbMovieActorById(activeActorDetails.personId).then((person) => {
      if (active) setActorName(`${person.name} · TMDB #${person.id}`);
    }).catch(() => {});
    return () => { active = false; };
  }, [editing?.kind, activeActorDetails.personId]);

  useEffect(() => {
    if (!['company', 'new_company', 'company_draft'].includes(editing?.kind ?? '') || !activeCompanyDetails.companyId) return;
    let active = true;
    void getTmdbMovieCompanyById(activeCompanyDetails.companyId).then((company) => {
      if (active) setCompanyName(`${company.name} · TMDB #${company.id}`);
    }).catch(() => {});
    return () => { active = false; };
  }, [editing?.kind, activeCompanyDetails.companyId]);

  async function previewPeriodSuggestions() {
    if (periodPreviewBusy || periodProblem) return;
    const expectedKey = periodCurrentKey;
    setPeriodPreviewBusy(true);
    setPeriodPreview([]); setPeriodPreviewKey('');
    try {
      const movies = await getThemeMovieSuggestions({
        primaryReleaseDateGte: activePeriodDetails.startDate,
        primaryReleaseDateLte: activePeriodDetails.endDate,
      }, 15);
      setPeriodPreview(movies);
      if (movies.length >= 3) setPeriodPreviewKey(expectedKey);
      setError(movies.length < 3
        ? 'Fewer than three movies were found in this period. Try a wider date range.'
        : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Release Period preview failed.');
    } finally { setPeriodPreviewBusy(false); }
  }
  async function savePeriodChanges() {
    if (editing?.kind !== 'period' || working || periodProblem ||
        (periodDatesChanged && !periodPreviewCurrent)) {
      if (periodDatesChanged && !periodPreviewCurrent) {
        setError('Preview at least three matching movies before changing release dates.');
      }
      return;
    }
    setWorkingAction('update_period'); setError(null);
    try {
      await updateAdminReleasePeriodTheme(editing.id, periodDetails);
      await Promise.all([reload(), refreshOptions()]);
      setEditing(null);
      Alert.alert('Saved', 'Release Period Movie Theme changes have been saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save release period.');
    } finally { setWorkingAction(null); }
  }
  async function savePeriodDraft(action: 'save_draft' | 'publish_draft') {
    if (!periodCreating || working || periodDraftProblem) return;
    if (action === 'publish_draft' && (periodProblem || !periodPreviewCurrent)) {
      setError('Preview at least three matching movies before publishing.');
      return;
    }
    setWorkingAction(action === 'save_draft' ? 'save_period_draft' : 'publish_period_draft');
    setError(null);
    try {
      const draftId = await manageAdminReleasePeriodDraft('save_draft',
        editing?.kind === 'period_draft' ? editing.id : null, periodCreation);
      if (action === 'publish_draft') {
        await manageAdminReleasePeriodDraft('publish_draft', draftId);
      }
      await Promise.all([reload(), refreshOptions()]);
      if (action === 'publish_draft') {
        setEditing(null);
        Alert.alert('Published', 'The Release Period Movie Theme is now available in Top 3.');
      } else {
        originalPeriodCreationKey.current = JSON.stringify(periodCreation);
        setEditing({ kind: 'period_draft', id: draftId });
        Alert.alert('Saved', 'Your Release Period Movie Theme draft has been saved.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save release period draft.');
    } finally { setWorkingAction(null); }
  }
  function confirmDeletePeriodDraft(id: string) {
    showConfirmation({
      title: 'Delete draft?',
      message: 'This unpublished Release Period draft will be permanently deleted.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => { void (async () => {
        if (working) return;
        setWorkingAction('delete_period_draft'); setError(null);
        try {
          await manageAdminReleasePeriodDraft('delete_draft', id);
          await reload();
          setEditing(null);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Could not delete release period draft.');
        } finally { setWorkingAction(null); }
      })(); },
    });
  }
  async function companyLookup() {
    if (companySearch.trim().length < 2 || companyLookupBusy) return;
    setCompanyLookupBusy(true);
    setCompanyResults([]);
    try {
      setCompanyResults(await searchTmdbMovieCompanies(companySearch));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Company lookup failed.');
    } finally { setCompanyLookupBusy(false); }
  }
  async function previewCompanySuggestions() {
    if (companyPreviewBusy || companyProblem) return;
    const companyId = activeCompanyDetails.companyId;
    setCompanyPreviewBusy(true);
    setCompanyPreview([]);
    setCompanyPreviewId(null);
    try {
      // An existing theme can carry editorial Netflix Originals selections.
      // Never reuse those movie IDs when the administrator changes company.
      const savedConfig = companyTheme?.providerConfig ?? {};
      const featuredIds = Array.isArray(savedConfig.featuredMovieIds)
        ? savedConfig.featuredMovieIds.filter(
            (id): id is number => Number.isSafeInteger(id) && id > 0
          ).slice(0, 30)
        : [];
      const useFeatured = savedConfig.withCompanies === companyId &&
        savedConfig.featuredCompanyId === companyId &&
        featuredIds.length > 0;
      const movies = await getThemeMovieSuggestions({
        withCompanies: companyId,
        ...(useFeatured ? {
          featuredCompanyId: companyId,
          featuredMovieIds: featuredIds,
        } : {}),
      }, 15);
      setCompanyPreview(movies);
      if (movies.length >= 3) setCompanyPreviewId(companyId);
      setError(movies.length < 3
        ? 'Fewer than three production-company movies were found. Select a different company.'
        : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Company preview failed.');
    } finally { setCompanyPreviewBusy(false); }
  }
  async function saveCompanyChanges() {
    if (editing?.kind !== 'company' || working || companyProblem || (companyIdChanged && !companyPreviewCurrent)) {
      if (companyIdChanged && !companyPreviewCurrent) setError('Preview at least three movies before changing the company.');
      return;
    }
    setWorkingAction('update_company'); setError(null);
    try {
      await updateAdminCompanyMovieTheme(editing.id, companyDetails);
      await Promise.all([reload(), refreshOptions()]);
      setEditing(null);
      Alert.alert('Saved', 'Production Company Movie Theme changes have been saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save company theme.');
    } finally { setWorkingAction(null); }
  }
  async function saveCompanyDraft(action: 'save_draft' | 'publish_draft') {
    if (!companyCreating || working || companyDraftProblem) return;
    if (action === 'publish_draft' && !companyPreviewCurrent) {
      setError('Preview at least three production-company movies before publishing.');
      return;
    }
    setWorkingAction(action === 'save_draft' ? 'save_company_draft' : 'publish_company_draft');
    setError(null);
    try {
      const draftId = await manageAdminMovieCompanyDraft(
        'save_draft', editing?.kind === 'company_draft' ? editing.id : null, companyCreation
      );
      if (action === 'publish_draft') await manageAdminMovieCompanyDraft('publish_draft', draftId);
      await Promise.all([reload(), refreshOptions()]);
      if (action === 'publish_draft') {
        setEditing(null);
        Alert.alert('Published', 'The Production Company Movie Theme is now available in Top 3.');
      } else {
        originalCompanyCreationKey.current = JSON.stringify(companyCreation);
        setEditing({ kind: 'company_draft', id: draftId });
        Alert.alert('Saved', 'Your Production Company Movie Theme draft has been saved.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save company draft.');
    } finally { setWorkingAction(null); }
  }
  function confirmDeleteCompanyDraft(id: string) {
    showConfirmation({
      title: 'Delete draft?',
      message: 'This unpublished company theme draft will be permanently deleted.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => { void (async () => {
        if (working) return;
        setWorkingAction('delete_company_draft'); setError(null);
        try {
          await manageAdminMovieCompanyDraft('delete_draft', id);
          await reload();
          setEditing(null);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Could not delete company draft.');
        } finally { setWorkingAction(null); }
      })(); },
    });
  }
  async function actorLookup() {
    if (actorSearch.trim().length < 2 || actorLookupBusy) return;
    setActorLookupBusy(true);
    setActorResults([]);
    try {
      setActorResults(await searchTmdbMovieActors(actorSearch));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Actor lookup failed.');
    } finally { setActorLookupBusy(false); }
  }
  async function previewActorSuggestions() {
    if (actorPreviewBusy || actorProblem) return;
    const personId = activeActorDetails.personId;
    setActorPreviewBusy(true);
    setActorPreview([]);
    setActorPreviewPersonId(null);
    try {
      const movies = await getThemeMovieSuggestions({ withPeople: personId }, 15);
      setActorPreview(movies);
      if (movies.length >= 3) setActorPreviewPersonId(personId);
      setError(movies.length < 3
        ? 'Fewer than three actor movie suggestions were found. Choose another matching TMDB person.'
        : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Actor preview failed.');
    } finally { setActorPreviewBusy(false); }
  }
  async function saveActorChanges() {
    if (editing?.kind !== 'actor' || working || actorProblem || (actorPersonChanged && !actorPreviewCurrent)) {
      if (actorPersonChanged && !actorPreviewCurrent) {
        setError('Preview at least three movies before changing the actor.');
      }
      return;
    }
    setWorkingAction('update_actor'); setError(null);
    try {
      await updateAdminActorMovieTheme(editing.id, actorDetails);
      await Promise.all([reload(), refreshOptions()]);
      setEditing(null);
      Alert.alert('Saved', 'Actor-based Movie Theme changes have been saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save actor theme.');
    } finally { setWorkingAction(null); }
  }
  async function saveActorDraft(action: 'save_draft' | 'publish_draft') {
    if (!actorCreating || working || actorDraftProblem) return;
    if (action === 'publish_draft' && !actorPreviewCurrent) {
      setError('Preview at least three actor movie suggestions before publishing.');
      return;
    }
    setWorkingAction(action === 'save_draft' ? 'save_actor_draft' : 'publish_actor_draft');
    setError(null);
    try {
      const draftId = await manageAdminMovieActorDraft(
        'save_draft', editing?.kind === 'actor_draft' ? editing.id : null, actorCreation
      );
      if (action === 'publish_draft') {
        await manageAdminMovieActorDraft('publish_draft', draftId);
      }
      await Promise.all([reload(), refreshOptions()]);
      if (action === 'publish_draft') {
        setEditing(null);
        Alert.alert('Published', 'The actor-based Movie Theme is now available in Top 3.');
      } else {
        originalActorCreationKey.current = JSON.stringify(actorCreation);
        setEditing({ kind: 'actor_draft', id: draftId });
        Alert.alert('Saved', 'Your actor Movie Theme draft has been saved.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save actor draft.');
    } finally { setWorkingAction(null); }
  }
  function confirmDeleteActorDraft(id: string) {
    showConfirmation({
      title: 'Delete draft?',
      message: 'This unpublished actor theme draft will be permanently deleted.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => { void (async () => {
        if (working) return;
        setWorkingAction('delete_actor_draft'); setError(null);
        try {
          await manageAdminMovieActorDraft('delete_draft', id);
          await reload();
          setEditing(null);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Could not delete actor draft.');
        } finally { setWorkingAction(null); }
      })(); },
    });
  }
  function chooseNewMethod(method: 'keywords' | 'actor' | 'company' | 'period' | 'curated') {
    if (working || !editing || !['new', 'new_actor', 'new_company', 'new_period', 'new_curated'].includes(editing.kind)) return;
    if ((method === 'curated' && editing.kind === 'new_curated') ||
        (method === 'actor' && editing.kind === 'new_actor') ||
        (method === 'company' && editing.kind === 'new_company') ||
        (method === 'period' && editing.kind === 'new_period') ||
        (method === 'keywords' && editing.kind === 'new')) return;
    const switchMethod = () => {
      if (method === 'curated') beginNewCurated();
      else if (method === 'actor') beginNewActor();
      else if (method === 'company') beginNewCompany();
      else if (method === 'period') beginNewPeriod();
      else begin({ kind: 'new' }, { ...EMPTY });
    };
    if (hasUnsavedChanges) {
      showConfirmation({
        title: 'Switch discovery method?',
        message: 'Your unsaved form changes will be lost.',
        confirmLabel: 'Switch',
        cancelLabel: 'Keep editing',
        destructive: true,
        onConfirm: switchMethod,
      });
    } else switchMethod();
  }
  const methodPicker = () => (
    <View style={styles.methodPicker}>
      <AppText variant="formLabel">Discovery method</AppText>
      <View style={styles.methodOptions}>
        {(['keywords', 'actor', 'company', 'period', 'curated'] as const).map((method) => {
          const selected = method === (editing?.kind === 'new_curated' ? 'curated'
            : editing?.kind === 'new_actor' ? 'actor'
            : editing?.kind === 'new_company' ? 'company'
            : editing?.kind === 'new_period' ? 'period' : 'keywords');
          const label = method === 'curated' ? 'Curated Movies'
            : method === 'actor' ? 'Actor'
            : method === 'company' ? 'Production Company'
            : method === 'period' ? 'Release Period' : 'TMDB Keywords';
          return (
            <Pressable key={method} onPress={() => chooseNewMethod(method)}
              accessibilityRole="button" accessibilityState={{ selected }}
              style={({ pressed }) => [styles.methodOption,
                { backgroundColor: selected ? colors.text : colors.surface,
                  borderColor: selected ? colors.text : colors.border },
                pressed && styles.pressed]}>
              <AppText variant="bodyBold" tone={selected ? 'invertedPrimary' : 'primary'}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
  function patch(value: Partial<AdminMovieThemeDefinition>) {
    setDefinition((prev) => ({ ...prev, ...value }));
    // Discovery preview validity is determined by its config fingerprint.
    // Editing a title or description does not invalidate that preview.
  }
  function rename(name: string) {
    if (editing?.kind === 'new') {
      setDefinition((prev) => ({ ...prev, name,
        slug: toSlug(name),
        displayTitle: `Top 3 ${name.trim()}` }));
    } else {
      patch({ name });
    }
  }
  async function keywordLookup() {
    if (keywordSearch.trim().length < 2 || lookupBusy) return;
    setLookupTarget('keywords');
    try {
      setKeywordResults(await searchTmdbMovieKeywords(keywordSearch));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Keyword lookup failed.');
    } finally { setLookupTarget(null); }
  }
  async function movieLookup() {
    if (movieSearch.trim().length < 2 || lookupBusy) return;
    setLookupTarget('movies');
    try {
      const results = (await searchMovies(movieSearch)).slice(0, 12);
      // Search results already have the names and years we need for display.
      for (const item of results) {
        const movieId = Number(item.id.replace(/^movie-/, ''));
        if (Number.isSafeInteger(movieId) && movieId > 0 && item.title) {
          curatedMovieLabelCache.set(movieId, { title: item.title, year: item.releaseYear });
        }
      }
      setMovieResults(results);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Movie lookup failed.');
    } finally { setLookupTarget(null); }
  }
  async function previewSuggestions() {
    if (previewBusy || validationProblem) return;
    setPreviewBusy(true); setPreview([]); setPreviewKey('');
    try {
      const next = await getThemeMovieSuggestions(movieThemeDiscoveryConfig(definition), 15);
      setPreview(next);
      if (next.length >= 3) setPreviewKey(configKey);
      setError(next.length < 3
        ? 'Fewer than three suggestions were found. Refine your keywords before publishing.'
        : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Preview failed.');
    } finally { setPreviewBusy(false); }
  }

  async function execute(action: 'save_draft' | 'publish_draft' | 'update_published') {
    if (!editing || working || (action === 'save_draft' ? draftProblem : validationProblem)) return;
    if (action === 'publish_draft' && !isPreviewCurrent) {
      setError('Preview at least three matching suggestions before publishing.');
      return;
    }
    setWorkingAction(action); setError(null);
    try {
      if (action === 'update_published') {
        if (editing.kind !== 'published') return;
        await manageAdminMovieTheme('update_published', editing.id, definition);
      } else {
        const draftId = await manageAdminMovieTheme(
          'save_draft', editing.kind === 'draft' ? editing.id : null, definition
        );
        if (action === 'publish_draft') {
          await manageAdminMovieTheme('publish_draft', draftId, definition);
          draftPreviewCache.current.delete(draftId);
        } else {
          if (isPreviewCurrent) {
            draftPreviewCache.current.set(draftId, { key: configKey, items: [...preview] });
          } else {
            draftPreviewCache.current.delete(draftId);
          }
          originalDefinitionKey.current = JSON.stringify(definition);
          originalFranchiseText.current = franchiseText;
          originalKeywordTermsText.current = keywordTermsText;
          setEditing({ kind: 'draft', id: draftId });
        }
      }
      await Promise.all([reload(), refreshOptions()]);
      if (action !== 'save_draft') setEditing(null);
      Alert.alert('Saved', action === 'publish_draft'
        ? 'The new Movie Theme is now available in Top 3.'
        : 'Your changes have been saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Save failed.');
    } finally { setWorkingAction(null); }
  }
  function confirmAction(action: 'archive' | 'restore' | 'delete_draft', id: string) {
    const label = action === 'archive' ? 'Archive theme?'
      : action === 'restore' ? 'Restore theme?' : 'Delete draft?';
    showConfirmation({
      title: label,
      message: action === 'archive'
        ? 'The theme will disappear from new list choices. Existing published lists are preserved.'
        : action === 'restore' ? 'The theme will become selectable again.'
        : 'This unpublished draft will be permanently deleted.',
      confirmLabel: action === 'archive' ? 'Archive'
        : action === 'restore' ? 'Restore' : 'Delete',
      destructive: action !== 'restore',
      onConfirm: () => { void (async () => {
        if (working) return;
        setWorkingAction(action); setError(null);
        try {
          await manageAdminMovieTheme(action, id);
          await Promise.all([reload(), refreshOptions()]);
          if (action === 'delete_draft') draftPreviewCache.current.delete(id);
          setEditing(null);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Action failed.');
        } finally { setWorkingAction(null); }
      })(); },
    });
  }

  const hasUnsavedChanges = (editing?.kind === 'curated' ||
    editing?.kind === 'new_curated' || editing?.kind === 'curated_draft')
      ? JSON.stringify([curatedCreating ? curatedCreation : curatedDetails, curatedEntries]) !== originalCuratedKey.current
    : editing?.kind === 'period'
    ? JSON.stringify(periodDetails) !== originalPeriodDetailsKey.current
    : (editing?.kind === 'new_period' || editing?.kind === 'period_draft')
      ? JSON.stringify(periodCreation) !== originalPeriodCreationKey.current
    : editing?.kind === 'company'
    ? JSON.stringify(companyDetails) !== originalCompanyDetails.current
    : (editing?.kind === 'new_company' || editing?.kind === 'company_draft')
      ? JSON.stringify(companyCreation) !== originalCompanyCreationKey.current
    : editing?.kind === 'actor'
    ? JSON.stringify(actorDetails) !== originalActorDetails.current
    : (editing?.kind === 'new_actor' || editing?.kind === 'actor_draft')
      ? JSON.stringify(actorCreation) !== originalActorCreationKey.current
    : editing !== null && (
      JSON.stringify(definition) !== originalDefinitionKey.current ||
      franchiseText !== originalFranchiseText.current ||
      keywordTermsText !== originalKeywordTermsText.current
    );
  const closeEditor = useCallback(() => {
    curatedLoadToken.current += 1;
    Keyboard.dismiss();
    setEditing(null);
    setError(null);
  }, []);
  const handleBack = useCallback(() => {
    if (working) return;
    if (!editing) {
      router.back();
      return;
    }
    if (hasUnsavedChanges) {
      showConfirmation({
        title: 'Discard unsaved changes?',
        message: 'Changes you have not saved will be lost.',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        destructive: true,
        onConfirm: closeEditor,
      });
    } else {
      closeEditor();
    }
  }, [closeEditor, editing, hasUnsavedChanges, working, showConfirmation]);
  // Android's system back key should behave exactly like the shared header back.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!editing) return false;
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [editing, handleBack]);

  const input = (label: string, value: string, onChangeText: (text: string) => void,
    hint?: string, multiline = false, onSearch?: () => void, subsection = false,
    onClear?: () => void) => {
    const textField = (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={hint}
        placeholderTextColor={colors.tertiaryText}
        multiline={multiline}
        returnKeyType={onSearch ? 'search' : undefined}
        onSubmitEditing={onSearch}
        submitBehavior={onSearch ? 'submit' : undefined}
        style={[styles.input, { color: colors.text,
          backgroundColor: onClear ? 'transparent' : colors.surface },
          multiline && styles.multiline, onClear && styles.clearableInputField]}
        accessibilityLabel={label}
        autoCorrect={false}
      />
    );
    return (
      <View style={styles.field}>
        <AppText variant={subsection ? 'sectionTitle' : 'formLabel'}
          style={subsection ? styles.smartSuggestionHeading : undefined}>{label}</AppText>
        {onClear ? (
          <View style={[styles.clearableInputRow, { backgroundColor: colors.surface }]}>
            {textField}
            {value.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear movie search"
                onPress={onClear}
                style={styles.clearSearchButton}>
                <Ionicons name="close-circle" size={21} color={colors.tertiaryText}/>
              </Pressable>
            ) : null}
          </View>
        ) : textField}
      </View>
    );
  };
  const smallButton = (label: string, onPress: () => void, disabled = false,
    fullWidth = false, centerInRow = false) => (
    <Pressable
      onPress={onPress} disabled={disabled}
      accessibilityRole="button" accessibilityLabel={label}
      style={[styles.smallButton, { backgroundColor: colors.surface },
        fullWidth && styles.smartSuggestionFullWidthButton,
        centerInRow && styles.centeredSmallButton,
        disabled && styles.disabled]}>
      <AppText variant="action" style={fullWidth ? styles.smartSuggestionButtonLabel : undefined}>{label}</AppText>
    </Pressable>
  );

  const curatedMovieRow = (movieId: number, list: 'pinned' | 'excluded') => {
    const movie = curatedMovieLabels[movieId] ?? curatedMovieLabelCache.get(movieId);
    const movieName = movie?.title ?? `Movie #${movieId}`;
    const caption = movie?.year ? `${movie.title} (${movie.year})` : movieName;
    const isUnavailable = !movie && failedMovieLabelIds.includes(movieId);
    return (
      <View key={`${list}-${movieId}`}
        style={[styles.chipRow, { borderBottomColor: colors.border }]}>
        <View style={styles.flex}>
          <AppText variant="bodyBold">
            {movie ? caption : isUnavailable ? movieName : 'Loading movie…'}
          </AppText>
          {isUnavailable ? <AppText variant="metadata">Title unavailable · TMDB #{movieId}</AppText> : null}
        </View>
        <Pressable
          onPress={() => list === 'pinned'
            ? patch({ pinnedMovieIds: definition.pinnedMovieIds.filter((id) => id !== movieId) })
            : patch({ excludedMovieIds: definition.excludedMovieIds.filter((id) => id !== movieId) })}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${movieName} from ${list} movies`}
          style={[styles.smallButton, { backgroundColor: colors.surface }]}>
          <AppText variant="action">Remove</AppText>
        </Pressable>
      </View>
    );
  };

  const destructiveButton = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.destructiveButton,
        { backgroundColor: colors.surface, borderColor: colors.destructive },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <AppText variant="headline" tone="destructive" style={styles.destructiveButtonText}>
        {label}
      </AppText>
    </Pressable>
  );

  const confirmationActions: ActionSheetAction[] = confirmation ? [
    {
      label: confirmation.confirmLabel,
      variant: confirmation.destructive ? 'destructive' : 'default',
      onPress: () => {
        const confirmedAction = confirmation.onConfirm;
        setConfirmation(null);
        confirmedAction();
      },
    },
    {
      label: confirmation.cancelLabel ?? 'Cancel',
      variant: 'cancel',
      onPress: () => setConfirmation(null),
    },
  ] : [];

  if (!profile.isAdmin) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader showBackButton />
        <View style={styles.content}><AppText variant="pageTitle">Manage List Ideas</AppText>
          <AppText>Administrator access required.</AppText></View>
      </SafeAreaView>
    );
  }

  return (
    <>
    <AdminMovieThemeScrollShell
      key={editing?.kind ?? 'overview'}
      backgroundColor={colors.background}
      onBackPress={handleBack}
      refreshing={refreshing}
      onRefresh={!editing ? () => { void refreshCatalogue(); } : undefined}
      refreshTint={colors.text}>
        <View style={styles.titleDescriptionGroup}>
          <AppText variant="pageTitle">
            {editing ? (['new', 'new_actor', 'new_company', 'new_period', 'new_curated'].includes(editing.kind) ? 'Add Movie Theme' : editing.kind === 'view' ? 'View Movie Theme' : 'Edit Movie Theme') : 'Manage List Ideas'}
          </AppText>
          <AppText variant="body">Admin pilot</AppText>
        </View>
        {error ? (
          <View style={[styles.notice, { borderColor: colors.destructive }]}>
            <AppText tone="destructive">{error}</AppText>
          </View>
        ) : null}
        {!editing ? (
          <>
            {loading && !refreshing ? <ActivityIndicator style={styles.busy} /> : null}
            <AppText variant="sectionTitle" style={styles.sectionHeading}>Drafts ({drafts.length})</AppText>
            {drafts.length === 0 ? <AppText>No drafts yet.</AppText> : null}
            {drafts.map((draft) => (
              <Pressable key={draft.id} onPress={() => openDraft(draft)}
                style={[styles.listRow, { backgroundColor: colors.surface }]}
                accessibilityRole="button">
                <View style={styles.flex}>
                  <AppText variant="headline">{draft.definition.name}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.tertiaryText}/>
              </Pressable>
            ))}
            <AppText variant="sectionTitle" style={styles.sectionHeading}>Published themes ({publishedThemes.length})</AppText>
            {publishedThemes.map((option) => (
              <Pressable key={option.id} onPress={() => openMovieTheme(option)}
                style={[styles.listRow, { backgroundColor: colors.surface }]}
                accessibilityRole="button" accessibilityLabel={`Open ${option.name}`}>
                <View style={styles.flex}>
                  <AppText variant="headline">{option.name}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.tertiaryText}/>
              </Pressable>
            ))}
            {archivedThemes.length > 0 ? (
              <>
                <AppText variant="sectionTitle" style={styles.sectionHeading}>Archived themes ({archivedThemes.length})</AppText>
                {archivedThemes.map((option) => (
                  <Pressable key={option.id} onPress={() => openMovieTheme(option)}
                    style={[styles.listRow, { backgroundColor: colors.surface }]}
                    accessibilityRole="button" accessibilityLabel={`Open archived ${option.name}`}>
                    <View style={styles.flex}>
                      <AppText variant="headline">{option.name}</AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.tertiaryText}/>
                  </Pressable>
                ))}
              </>
            ) : null}
            <AppText variant="metadata" tone="tertiary">
              Movie Themes can be managed using TMDB Keywords, Actor, Production Company, Release Period or Curated Movies.
            </AppText>
            <PrimaryButton title="Add Movie Theme" onPress={() => begin({ kind: 'new' }, { ...EMPTY })}
              disabled={working || loading || refreshing} />
          </>
        ) : (editing.kind === 'curated' || editing.kind === 'new_curated' || editing.kind === 'curated_draft') ? (
          <>
            {editing.kind === 'new_curated' ? methodPicker() : null}
            <View style={styles.editorHeadingRow}>
              <AppText variant="sectionTitle" style={styles.editorHeadingTitle}>Theme details</AppText>
            </View>
            {curatedCreating ? (
              <>
                {input('Theme name', curatedCreation.name, (text) => setCuratedCreation((previous) => ({
                  ...previous, name: text, slug: toSlug(text),
                  displayTitle: previous.displayTitle === `Top 3 ${previous.name.trim()}` || !previous.displayTitle.trim()
                    ? `Top 3 ${text.trim()}` : previous.displayTitle,
                })), 'e.g. Great Underdog Movies')}
                {input('Identifier (slug)', curatedCreation.slug,
                  (text) => setCuratedCreation((previous) => ({ ...previous, slug: toSlug(text) })),
                  'e.g. great-underdog-movies')}
              </>
            ) : (
              <View style={styles.field}>
                <AppText variant="formLabel">Theme name (fixed)</AppText>
                <AppText variant="bodyBold">{curatedTheme?.name ?? ''}</AppText>
                <AppText variant="metadata">The theme name and ID stay fixed to protect existing lists.</AppText>
                {curatedTheme && !curatedTheme.active ? (
                  <AppText variant="metadata">Archived — not available for new Top 3 lists.</AppText>
                ) : null}
              </View>
            )}
            {input('Full list title', activeCuratedDetails.displayTitle,
              (text) => curatedCreating
                ? setCuratedCreation((previous) => ({ ...previous, displayTitle: text }))
                : setCuratedDetails((previous) => ({ ...previous, displayTitle: text })),
              'Top 3 Great Underdog Movies')}
            {input('Theme description', activeCuratedDetails.description,
              (text) => curatedCreating
                ? setCuratedCreation((previous) => ({ ...previous, description: text }))
                : setCuratedDetails((previous) => ({ ...previous, description: text })),
              'Shown below the theme name', true)}
            <View style={[styles.titleDescriptionGroup, styles.sectionHeading]}>
              <AppText variant="sectionTitle">Curate movie suggestions</AppText>
              <AppText variant="body">
                Choose individual movies from TMDB, then arrange their order. Existing curated suggestions
                keep their original records unless you explicitly remove them.
              </AppText>
            </View>
            {curatedLoading ? <ActivityIndicator style={styles.busy} /> : (
              <>
                <View style={styles.smartSuggestionSection}>
                  <AppText variant="sectionTitle" style={styles.smartSuggestionHeading}>Discover suggestions</AppText>
                  <AppText variant="body">Find possible matches based on your theme and selected movies. Review each suggestion before adding it.</AppText>
                  {smallButton(smartBusy ? 'Finding suggestions…' : smartSuggestions ? 'Refresh suggestions' : 'Find suggestions',
                    () => { void findSmartCuratedSuggestions(); }, smartBusy || working, true)}
                  {smartBusy ? <ActivityIndicator style={styles.busy} /> : null}
                  {smartError ? <AppText tone="destructive">{smartError}</AppText> : null}
                  {smartSuggestions ? (
                    <>
                      {smartSuggestionsKey !== JSON.stringify([
                        curatedCreating ? curatedCreation.name : curatedTheme?.name ?? '',
                        activeCuratedDetails.description,
                      ]) ? (
                        <AppText variant="metadata">The theme details have changed. Refresh suggestions to match the new description.</AppText>
                      ) : (
                        <>
                          {smartSuggestions.selectionExamples > 0 ? (
                            <AppText variant="metadata">Suggestions informed by {smartSuggestions.selectionExamples} of {smartSuggestions.selectedCount} selected movies at last refresh.</AppText>
                          ) : null}
                          {smartSuggestions.concepts.length ? (
                            <AppText variant="metadata">Interpreted as: {smartSuggestions.concepts.join(' · ')}</AppText>
                          ) : null}
                          {smartSuggestions.keywords.length ? (
                            <AppText variant="metadata">TMDB keywords: {smartSuggestions.keywords.join(' · ')}</AppText>
                          ) : null}
                          {smartSuggestions.note ? <AppText variant="metadata">{smartSuggestions.note}</AppText> : null}
                          {smartSuggestions.suggestions.length ? (
                            <AppText variant="formLabel">Suggested movies ({smartSuggestions.suggestions.length})</AppText>
                          ) : <AppText variant="metadata">No matching suggestions found. Try a more descriptive theme or search for individual movies below.</AppText>}
                          {smartSuggestions.suggestions.map(({ item, reason }) => {
                            const selected = curatedEntries.some((entry) => entry.item.id === item.id ||
                              entry.item.title.trim().toLowerCase() === item.title.trim().toLowerCase());
                            return (
                              <View key={item.id} style={[styles.chipRow, { borderColor: colors.border }]}>
                                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.poster}/> : null}
                                <View style={styles.flex}>
                                  <AppText variant="bodyBold">{item.title}</AppText>
                                  <AppText variant="metadata">{[item.releaseYear, reason].filter(Boolean).join(' · ')}</AppText>
                                </View>
                                {smallButton(selected ? 'Added' : 'Add', () => addCuratedMovie(item),
                                  selected || curatedEntries.length >= 60 || working, false, true)}
                              </View>
                            );
                          })}
                        </>
                      )}
                    </>
                  ) : null}
                </View>
                <View style={styles.curatedSearchSection}>
                  {input('Find a movie', curatedSearch, changeCuratedSearch,
                    'e.g. Back to the Future', false, () => {
                      Keyboard.dismiss(); void lookupCuratedMovies();
                    }, true, () => changeCuratedSearch(''))}
                </View>
                {curatedSearchBusy ? <AppText variant="metadata">Searching movies…</AppText> : null}
                {curatedResults.map((item) => {
                  const selected = curatedEntries.some((entry) => entry.item.id === item.id ||
                    entry.item.title.trim().toLowerCase() === item.title.trim().toLowerCase());
                  return (
                    <View key={item.id} style={[styles.chipRow, { borderColor: colors.border }]}>
                      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.poster}/> : null}
                      <View style={styles.flex}>
                        <AppText variant="bodyBold">{item.title}</AppText>
                        <AppText variant="metadata">{item.releaseYear ?? ''}</AppText>
                      </View>
                      {smallButton(selected ? 'Added' : 'Add', () => addCuratedMovie(item),
                        selected || curatedEntries.length >= 60 || working, false, true)}
                    </View>
                  );
                })}
                <View style={styles.curatedSection}>
                  <AppText variant="sectionTitle" style={styles.smartSuggestionHeading}>
                    Selected movies ({curatedEntries.length}/60)
                  </AppText>
                  {curatedEntries.length === 0 ? (
                    <AppText variant="metadata">No movies selected. Search TMDB to add titles.</AppText>
                  ) : (
                    <View style={[styles.dividedRows, { borderTopColor: colors.border }]}>
                      {curatedEntries.map((entry, index) => (
                        <View key={entry.rowId ? `row-${entry.rowId}` : `movie-${entry.item.id}`}
                          style={[styles.chipRow, { borderColor: colors.border }]}>
                          {entry.item.imageUrl ? <Image source={{ uri: entry.item.imageUrl }} style={styles.poster}/> : null}
                          <View style={styles.flex}>
                            <AppText variant="bodyBold">{index + 1}. {entry.item.title}</AppText>
                            {entry.item.releaseYear ? <AppText variant="metadata">{entry.item.releaseYear}</AppText> : null}
                          </View>
                          {smallButton('↑', () => moveCuratedMovie(index, -1), index === 0 || working, false, true)}
                          {smallButton('↓', () => moveCuratedMovie(index, 1), index === curatedEntries.length - 1 || working, false, true)}
                          {smallButton('Remove', () => setCuratedEntries((previous) =>
                            previous.filter((_, i) => i !== index)), working, false, true)}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <AppText variant="metadata">The ordered list above is your live suggestion preview.</AppText>
                {curatedDetailsProblem || (curatedCreating ? curatedDraftProblem : null) ? (
                  <AppText tone="destructive">{curatedDetailsProblem || curatedDraftProblem}</AppText>
                ) : null}
                <View style={styles.actions}>
                  {curatedCreating ? (
                    <>
                      <PrimaryButton title={workingAction === 'save_curated_draft' ? 'Saving…' : 'Save Draft'}
                        disabled={working || Boolean(curatedDetailsProblem) || Boolean(curatedDraftProblem) || curatedTooMany}
                        onPress={() => { void saveCurated('save_draft'); }}/>
                      <PrimaryButton title={workingAction === 'publish_curated_draft' ? 'Publishing…' : 'Publish Theme'}
                        disabled={working || Boolean(curatedDetailsProblem) || Boolean(curatedDraftProblem) || curatedTooFew || curatedTooMany}
                        onPress={() => { void saveCurated('publish_draft'); }}/>
                      {curatedTooFew ? <AppText variant="metadata">Add at least three movies before publishing.</AppText> : null}
                      {editing.kind === 'curated_draft' ? destructiveButton('Delete Draft',
                        () => confirmDeleteCuratedDraft(editing.id), working) : null}
                    </>
                  ) : (
                    <>
                      <PrimaryButton title={workingAction === 'update_curated' ? 'Saving…' : 'Save Changes'}
                        disabled={working || !curatedVersion || Boolean(curatedDetailsProblem) || curatedTooFew || curatedTooMany}
                        onPress={() => { void saveCurated('update_published'); }}/>
                      {curatedTooFew ? <AppText variant="metadata">Keep at least three curated movies in a published theme.</AppText> : null}
                      {curatedTheme ? (curatedTheme.active
                        ? destructiveButton('Archive Theme',
                            () => confirmCuratedArchiveRestore(editing.id, false),
                            working || curatedLoading || !curatedVersion)
                        : smallButton('Restore Theme',
                            () => confirmCuratedArchiveRestore(editing.id, true),
                            working || curatedLoading || !curatedVersion, true)) : null}
                      <AppText variant="metadata">Your changes affect suggestions, not existing users’ published lists.</AppText>
                    </>
                  )}
                </View>
              </>
            )}
          </>
        ) : (editing.kind === 'period' || editing.kind === 'new_period' || editing.kind === 'period_draft') ? (
          <>
            {editing.kind === 'new_period' ? methodPicker() : null}
            <View style={styles.editorHeadingRow}>
              <AppText variant="sectionTitle" style={styles.editorHeadingTitle}>Theme details</AppText>
            </View>
            {periodCreating ? (
              <>
                {input('Theme name', periodCreation.name, (text) => setPeriodCreation((previous) => ({
                  ...previous, name: text, slug: toSlug(text),
                  displayTitle: previous.displayTitle === `Top 3 ${previous.name.trim()}` || !previous.displayTitle.trim()
                    ? `Top 3 ${text.trim()}` : previous.displayTitle,
                })), 'e.g. 1990s Movies')}
                {input('Identifier (slug)', periodCreation.slug,
                  (text) => setPeriodCreation((previous) => ({ ...previous, slug: toSlug(text) })),
                  'e.g. 1990s-movies')}
              </>
            ) : (
              <View style={styles.field}>
                <AppText variant="formLabel">Theme name (fixed)</AppText>
                <AppText variant="bodyBold">{periodTheme?.name ?? ''}</AppText>
                <AppText variant="metadata">The theme name and ID remain fixed to protect existing lists.</AppText>
              </View>
            )}
            {input('Full list title', activePeriodDetails.displayTitle,
              (text) => periodCreating
                ? setPeriodCreation((previous) => ({ ...previous, displayTitle: text }))
                : setPeriodDetails((previous) => ({ ...previous, displayTitle: text })),
              'Top 3 1990s Movies')}
            {input('Theme description', activePeriodDetails.description,
              (text) => periodCreating
                ? setPeriodCreation((previous) => ({ ...previous, description: text }))
                : setPeriodDetails((previous) => ({ ...previous, description: text })),
              'Shown below the theme name', true)}
            <View style={[styles.titleDescriptionGroup, styles.sectionHeading]}>
              <AppText variant="sectionTitle">Discover by release period</AppText>
              <AppText variant="body">Only movies released within these dates appear in suggestions and themed search. Both dates are inclusive.</AppText>
            </View>
            {input('Start date (YYYY-MM-DD)', activePeriodDetails.startDate,
              (text) => periodCreating
                ? setPeriodCreation((previous) => ({ ...previous, startDate: text.trim() }))
                : setPeriodDetails((previous) => ({ ...previous, startDate: text.trim() })),
              '1980-01-01')}
            {input('End date (YYYY-MM-DD)', activePeriodDetails.endDate,
              (text) => periodCreating
                ? setPeriodCreation((previous) => ({ ...previous, endDate: text.trim() }))
                : setPeriodDetails((previous) => ({ ...previous, endDate: text.trim() })),
              '1989-12-31')}
            {periodCreating ? (periodDraftProblem || periodProblem ? (
              <AppText tone="destructive">{periodDraftProblem ?? periodProblem}</AppText>
            ) : null) : periodProblem ? <AppText tone="destructive">{periodProblem}</AppText> : null}
            <View style={styles.previewAction}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Preview movie suggestions"
                accessibilityState={{ disabled: periodPreviewBusy || Boolean(periodProblem) }}
                onPress={() => { void previewPeriodSuggestions(); }}
                disabled={periodPreviewBusy || Boolean(periodProblem)}
                style={({ pressed }) => [styles.previewButton,
                  (periodPreviewBusy || Boolean(periodProblem)) && styles.disabled,
                  pressed && !periodPreviewBusy && !periodProblem && styles.pressed]}>
                <AppText variant="headline" tone={appearance === 'dark' ? 'invertedPrimary' : 'primary'}
                  style={styles.previewButtonText}>
                  {periodPreviewBusy ? 'Loading suggestions…' : 'Preview movie suggestions'}
                </AppText>
              </Pressable>
            </View>
            {periodPreviewBusy ? <ActivityIndicator style={styles.busy} /> : null}
            {periodPreview.length > 0 ? (
              <AppText variant="metadata">{periodPreview.length} suggestions · {periodPreviewCurrent ? 'Preview current' : 'Preview outdated'}</AppText>
            ) : null}
            {periodPreview.map((item, index) => (
              <View key={item.id} style={[styles.previewRow, { borderColor: colors.border }]}>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.poster} /> : null}
                <AppText variant="bodyBold" style={styles.flex}>
                  {index + 1}. {item.title}{item.releaseYear ? ` (${item.releaseYear})` : ''}
                </AppText>
              </View>
            ))}
            <View style={styles.actions}>
              {periodCreating ? (
                <>
                  <PrimaryButton title={workingAction === 'save_period_draft' ? 'Saving…' : 'Save Draft'}
                    disabled={working || Boolean(periodDraftProblem)}
                    onPress={() => { void savePeriodDraft('save_draft'); }}/>
                  <PrimaryButton title={workingAction === 'publish_period_draft' ? 'Publishing…' : 'Publish Theme'}
                    disabled={working || Boolean(periodDraftProblem) || Boolean(periodProblem) || !periodPreviewCurrent}
                    onPress={() => { void savePeriodDraft('publish_draft'); }}/>
                  {!periodPreviewCurrent ? (
                    <AppText variant="metadata">Preview at least three matching movies before publishing.</AppText>
                  ) : null}
                  {editing.kind === 'period_draft' ? destructiveButton('Delete Draft',
                    () => confirmDeletePeriodDraft(editing.id), working) : null}
                </>
              ) : (
                <>
                  <PrimaryButton title={workingAction === 'update_period' ? 'Saving…' : 'Save Changes'}
                    disabled={working || Boolean(periodProblem) || (periodDatesChanged && !periodPreviewCurrent)}
                    onPress={() => { void savePeriodChanges(); }}/>
                  {periodDatesChanged && !periodPreviewCurrent ? (
                    <AppText variant="metadata">Preview at least three matching movies before saving new dates.</AppText>
                  ) : null}
                  <AppText variant="metadata">Existing theme identifiers and published lists are preserved.</AppText>
                </>
              )}
            </View>
          </>
        ) : (editing.kind === 'company' || editing.kind === 'new_company' || editing.kind === 'company_draft') ? (
          <>
            {editing.kind === 'new_company' ? methodPicker() : null}
            <View style={styles.editorHeadingRow}>
              <AppText variant="sectionTitle" style={styles.editorHeadingTitle}>Theme details</AppText>
            </View>
            {companyCreating ? (
              <>
                {input('Theme name', companyCreation.name, (text) => setCompanyCreation((previous) => ({
                  ...previous, name: text, slug: toSlug(text),
                  displayTitle: previous.displayTitle === `Top 3 ${previous.name.trim()}` || !previous.displayTitle.trim()
                    ? `Top 3 ${text.trim()}` : previous.displayTitle,
                })), 'e.g. Pixar Movies')}
                {input('Identifier (slug)', companyCreation.slug,
                  (text) => setCompanyCreation((previous) => ({ ...previous, slug: toSlug(text) })),
                  'e.g. pixar-movies')}
              </>
            ) : (
              <View style={styles.field}>
                <AppText variant="formLabel">Theme name (fixed)</AppText>
                <AppText variant="bodyBold">{companyTheme?.name ?? ''}</AppText>
                <AppText variant="metadata">The theme name and ID remain fixed to protect existing lists.</AppText>
              </View>
            )}
            {input('Full list title', activeCompanyDetails.displayTitle,
              (text) => companyCreating
                ? setCompanyCreation((previous) => ({ ...previous, displayTitle: text }))
                : setCompanyDetails((previous) => ({ ...previous, displayTitle: text })),
              'Top 3 Pixar Movies')}
            {input('Theme description', activeCompanyDetails.description,
              (text) => companyCreating
                ? setCompanyCreation((previous) => ({ ...previous, description: text }))
                : setCompanyDetails((previous) => ({ ...previous, description: text })),
              'Shown below the theme name', true)}
            <View style={[styles.titleDescriptionGroup, styles.sectionHeading]}>
              <AppText variant="sectionTitle">Discover with a production company</AppText>
              <AppText variant="body">Choose a TMDB production company to find movies credited to that company. Streaming exclusives and distribution rights are not included automatically.</AppText>
              {companyTheme?.providerConfig.featuredCompanyId === activeCompanyDetails.companyId &&
                Array.isArray(companyTheme.providerConfig.featuredMovieIds) ? (
                <AppText variant="metadata">This theme also has an editorially selected movie lineup for Netflix Originals. Its preview prioritizes those films over company credits. Selecting a different company returns to normal company discovery.</AppText>
              ) : null}
            </View>
            <View style={styles.field}>
              <AppText variant="formLabel">Selected company</AppText>
              <AppText variant="bodyBold">{companyName}</AppText>
            </View>
            {input('Find a production company', companySearch, (text) => {
              setCompanySearch(text);
              setCompanyResults([]);
            }, 'e.g. Pixar', false, () => {
              Keyboard.dismiss();
              void companyLookup();
            })}
            {companyLookupBusy ? <AppText variant="metadata">Searching companies…</AppText> : null}
            {companyResults.map((company) => (
              <View key={company.id} style={[styles.chipRow, { borderBottomColor: colors.border }]}>
                <View style={styles.flex}>
                  <AppText variant="bodyBold">{company.name}</AppText>
                  <AppText variant="metadata">
                    {company.originCountry ? `${company.originCountry} · ` : ''}TMDB #{company.id}
                  </AppText>
                </View>
                {smallButton(activeCompanyDetails.companyId === company.id ? 'Selected' : 'Select', () => {
                  if (companyCreating) {
                    const formerName = companyName.split(' · ')[0];
                    setCompanyCreation((previous) => {
                      const suggestedName = `${company.name} Movies`;
                      const previousDefault = `${formerName} Movies`;
                      const shouldRename = !previous.name.trim() || previous.name === previousDefault;
                      const newName = shouldRename ? suggestedName : previous.name;
                      const shouldRetitle = !previous.displayTitle.trim() ||
                        previous.displayTitle === `Top 3 ${previous.name.trim()}`;
                      return { ...previous, companyId: company.id,
                        name: newName,
                        slug: shouldRename ? toSlug(newName) : previous.slug,
                        displayTitle: shouldRetitle ? `Top 3 ${newName}` : previous.displayTitle };
                    });
                  } else {
                    setCompanyDetails((previous) => ({ ...previous, companyId: company.id }));
                  }
                  setCompanyName(`${company.name} · TMDB #${company.id}`);
                  setCompanyResults([]);
                  setCompanySearch('');
                  setCompanyPreview([]);
                  setCompanyPreviewId(null);
                }, activeCompanyDetails.companyId === company.id)}
              </View>
            ))}
            {(companyCreating ? companyDraftProblem || companyProblem : companyProblem)
              ? <AppText tone="destructive">{companyCreating ? companyDraftProblem || companyProblem : companyProblem}</AppText> : null}
            <View style={styles.previewAction}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Preview movie suggestions"
                accessibilityState={{ disabled: companyPreviewBusy || Boolean(companyProblem) }}
                onPress={() => { void previewCompanySuggestions(); }}
                disabled={companyPreviewBusy || Boolean(companyProblem)}
                style={({ pressed }) => [
                  styles.previewButton,
                  (companyPreviewBusy || Boolean(companyProblem)) && styles.disabled,
                  pressed && !companyPreviewBusy && !companyProblem && styles.pressed,
                ]}>
                <AppText variant="headline" tone={appearance === 'dark' ? 'invertedPrimary' : 'primary'}
                  style={styles.previewButtonText}>
                  {companyPreviewBusy ? 'Loading suggestions…' : 'Preview movie suggestions'}
                </AppText>
              </Pressable>
            </View>
            {companyPreviewBusy ? <ActivityIndicator style={styles.busy} /> : null}
            {companyPreview.length > 0 ? (
              <AppText variant="metadata">
                {companyPreview.length} suggestions · {companyPreviewCurrent ? 'Preview current' : 'Preview outdated'}
              </AppText>
            ) : null}
            {companyPreview.map((item, index) => (
              <View key={item.id} style={[styles.previewRow, { borderColor: colors.border }]}>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.poster} /> : null}
                <AppText variant="bodyBold" style={styles.flex}>
                  {index + 1}. {item.title}{item.releaseYear ? ` (${item.releaseYear})` : ''}
                </AppText>
              </View>
            ))}
            <View style={styles.actions}>
              {companyCreating ? (
                <>
                  <PrimaryButton title={workingAction === 'save_company_draft' ? 'Saving…' : 'Save Draft'}
                    disabled={working || Boolean(companyDraftProblem)}
                    onPress={() => { void saveCompanyDraft('save_draft'); }}/>
                  <PrimaryButton title={workingAction === 'publish_company_draft' ? 'Publishing…' : 'Publish Theme'}
                    disabled={working || Boolean(companyDraftProblem) || Boolean(companyProblem) || !companyPreviewCurrent}
                    onPress={() => { void saveCompanyDraft('publish_draft'); }}/>
                  {!companyPreviewCurrent ? (
                    <AppText variant="metadata">Preview at least three production-company movies before publishing.</AppText>
                  ) : null}
                  {editing.kind === 'company_draft' ? destructiveButton('Delete Draft',
                    () => confirmDeleteCompanyDraft(editing.id), working) : null}
                </>
              ) : (
                <>
                  <PrimaryButton title={workingAction === 'update_company' ? 'Saving…' : 'Save Changes'}
                    disabled={working || Boolean(companyProblem) || (companyIdChanged && !companyPreviewCurrent)}
                    onPress={() => { void saveCompanyChanges(); }}/>
                  {companyIdChanged && !companyPreviewCurrent ? (
                    <AppText variant="metadata">Preview at least three relevant movies before saving a new company selection.</AppText>
                  ) : null}
                  <AppText variant="metadata">Existing theme identifiers and users’ published lists are preserved.</AppText>
                </>
              )}
            </View>
          </>
        ) : (editing.kind === 'actor' || editing.kind === 'new_actor' || editing.kind === 'actor_draft') ? (
          <>
            {editing.kind === 'new_actor' ? methodPicker() : null}
            <View style={styles.editorHeadingRow}>
              <AppText variant="sectionTitle" style={styles.editorHeadingTitle}>Theme details</AppText>
            </View>
            {actorCreating ? (
              <>
                {input('Theme name', actorCreation.name, (text) => setActorCreation((previous) => ({
                  ...previous, name: text, slug: toSlug(text),
                  displayTitle: previous.displayTitle === `Top 3 ${previous.name.trim()}` || !previous.displayTitle.trim()
                    ? `Top 3 ${text.trim()}` : previous.displayTitle,
                })), 'e.g. Leonardo DiCaprio Movies')}
                {input('Identifier (slug)', actorCreation.slug,
                  (text) => setActorCreation((previous) => ({ ...previous, slug: toSlug(text) })),
                  'e.g. leonardo-dicaprio-movies')}
              </>
            ) : (
              <View style={styles.field}>
                <AppText variant="formLabel">Theme name (fixed)</AppText>
                <AppText variant="bodyBold">{actorTheme?.name ?? ''}</AppText>
                <AppText variant="metadata">The theme name and ID remain fixed to protect existing lists.</AppText>
              </View>
            )}
            {input('Full list title', activeActorDetails.displayTitle,
              (text) => actorCreating
                ? setActorCreation((previous) => ({ ...previous, displayTitle: text }))
                : setActorDetails((previous) => ({ ...previous, displayTitle: text })),
              'Top 3 Leonardo DiCaprio Movies')}
            {input('Theme description', activeActorDetails.description,
              (text) => actorCreating
                ? setActorCreation((previous) => ({ ...previous, description: text }))
                : setActorDetails((previous) => ({ ...previous, description: text })),
              'Shown below the theme name', true)}
            <View style={[styles.titleDescriptionGroup, styles.sectionHeading]}>
              <AppText variant="sectionTitle">Discover with a TMDB actor</AppText>
              <AppText variant="body">{actorCreating
                ? 'Search TMDB and choose an actor. You can adjust the theme name, list title and description before publishing.'
                : "Find and select the person who belongs to this theme. The theme name stays fixed, so don't repurpose an existing theme for a different actor."}</AppText>
            </View>
            <View style={styles.field}>
              <AppText variant="formLabel">Selected actor</AppText>
              <AppText variant="bodyBold">{actorName}</AppText>
            </View>
            {input('Find an actor', actorSearch, (text) => {
              setActorSearch(text);
              setActorResults([]);
            }, 'e.g. Tom Cruise', false, () => {
              Keyboard.dismiss();
              void actorLookup();
            })}
            {actorLookupBusy ? <AppText variant="metadata">Searching actors…</AppText> : null}
            {actorResults.map((person) => (
              <View key={person.id} style={[styles.chipRow, { borderBottomColor: colors.border }]}>
                <View style={styles.flex}>
                  <AppText variant="bodyBold">{person.name}</AppText>
                  <AppText variant="metadata">
                    {person.knownFor.length > 0 ? person.knownFor.join(' · ') : `TMDB person #${person.id}`}
                  </AppText>
                </View>
                {smallButton(activeActorDetails.personId === person.id ? 'Selected' : 'Select', () => {
                  if (actorCreating) {
                    const formerName = actorName.split(' · ')[0];
                    setActorCreation((previous) => {
                      const suggestedName = `${person.name} Movies`;
                      const previousDefault = `${formerName} Movies`;
                      const shouldRename = !previous.name.trim() || previous.name === previousDefault;
                      const newName = shouldRename ? suggestedName : previous.name;
                      const shouldRetitle = !previous.displayTitle.trim() ||
                        previous.displayTitle === `Top 3 ${previous.name.trim()}`;
                      return { ...previous, personId: person.id,
                        name: newName,
                        slug: shouldRename ? toSlug(newName) : previous.slug,
                        displayTitle: shouldRetitle ? `Top 3 ${newName}` : previous.displayTitle };
                    });
                  } else {
                    setActorDetails((previous) => ({ ...previous, personId: person.id }));
                  }
                  setActorName(`${person.name} · TMDB #${person.id}`);
                  setActorResults([]);
                  setActorSearch('');
                  setActorPreview([]);
                  setActorPreviewPersonId(null);
                }, activeActorDetails.personId === person.id)}
              </View>
            ))}
            {(actorCreating ? actorDraftProblem || actorProblem : actorProblem)
              ? <AppText tone="destructive">{actorCreating ? actorDraftProblem || actorProblem : actorProblem}</AppText> : null}
            <View style={styles.previewAction}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Preview movie suggestions"
                accessibilityState={{ disabled: actorPreviewBusy || Boolean(actorProblem) }}
                onPress={() => { void previewActorSuggestions(); }}
                disabled={actorPreviewBusy || Boolean(actorProblem)}
                style={({ pressed }) => [
                  styles.previewButton,
                  (actorPreviewBusy || Boolean(actorProblem)) && styles.disabled,
                  pressed && !actorPreviewBusy && !actorProblem && styles.pressed,
                ]}>
                <AppText variant="headline" tone={appearance === 'dark' ? 'invertedPrimary' : 'primary'}
                  style={styles.previewButtonText}>
                  {actorPreviewBusy ? 'Loading suggestions…' : 'Preview movie suggestions'}
                </AppText>
              </Pressable>
            </View>
            {actorPreviewBusy ? <ActivityIndicator style={styles.busy} /> : null}
            {actorPreview.length > 0 ? (
              <AppText variant="metadata">
                {actorPreview.length} suggestions · {actorPreviewCurrent ? 'Preview current' : 'Preview outdated'}
              </AppText>
            ) : null}
            {actorPreview.map((item, index) => (
              <View key={item.id} style={[styles.previewRow, { borderColor: colors.border }]}>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.poster} /> : null}
                <AppText variant="bodyBold" style={styles.flex}>
                  {index + 1}. {item.title}{item.releaseYear ? ` (${item.releaseYear})` : ''}
                </AppText>
              </View>
            ))}
            <View style={styles.actions}>
              {actorCreating ? (
                <>
                  <PrimaryButton title={workingAction === 'save_actor_draft' ? 'Saving…' : 'Save Draft'}
                    disabled={working || Boolean(actorDraftProblem)}
                    onPress={() => { void saveActorDraft('save_draft'); }}/>
                  <PrimaryButton title={workingAction === 'publish_actor_draft' ? 'Publishing…' : 'Publish Theme'}
                    disabled={working || Boolean(actorDraftProblem) || Boolean(actorProblem) || !actorPreviewCurrent}
                    onPress={() => { void saveActorDraft('publish_draft'); }}/>
                  {!actorPreviewCurrent ? (
                    <AppText variant="metadata">Preview at least three relevant actor movies before publishing.</AppText>
                  ) : null}
                  {editing.kind === 'actor_draft' ? destructiveButton('Delete Draft',
                    () => confirmDeleteActorDraft(editing.id), working) : null}
                </>
              ) : (
                <>
                  <PrimaryButton title={workingAction === 'update_actor' ? 'Saving…' : 'Save Changes'}
                    disabled={working || Boolean(actorProblem) || (actorPersonChanged && !actorPreviewCurrent)}
                    onPress={() => { void saveActorChanges(); }}/>
                  {actorPersonChanged && !actorPreviewCurrent ? (
                    <AppText variant="metadata">Preview at least three relevant movies before saving a new actor selection.</AppText>
                  ) : null}
                  <AppText variant="metadata">Existing theme identifiers and users’ published lists are preserved.</AppText>
                </>
              )}
            </View>
          </>
        ) : editing.kind === 'view' ? (
          <>
            <View style={styles.editorHeadingRow}>
              <AppText variant="sectionTitle" style={styles.editorHeadingTitle}>Theme details</AppText>
            </View>
            {viewOnlyTheme ? (
              <>
                <View style={styles.field}>
                  <AppText variant="formLabel">Theme name</AppText>
                  <AppText variant="bodyBold">{viewOnlyTheme.name}</AppText>
                </View>
                {viewOnlyTheme.browseLabel ? (
                  <View style={styles.field}>
                    <AppText variant="formLabel">Theme description</AppText>
                    <AppText variant="body">{viewOnlyTheme.browseLabel}</AppText>
                  </View>
                ) : null}
                <View style={styles.field}>
                  <AppText variant="formLabel">Discovery method</AppText>
                  <AppText variant="bodyBold">{readOnlyDiscovery(viewOnlyTheme).label}</AppText>
                  <AppText variant="metadata">{readOnlyDiscovery(viewOnlyTheme).detail}</AppText>
                </View>
                <AppText variant="metadata" tone="tertiary">
                  View only. Editing this discovery method will be available in a future update. Existing movie suggestions and published lists remain unchanged.
                </AppText>
              </>
            ) : (
              <AppText variant="body">This Movie Theme is no longer available in the catalogue. Return to Manage List Ideas.</AppText>
            )}
          </>
        ) : (
          <>
            {editing.kind === 'new' ? methodPicker() : null}
            <View style={styles.editorHeadingRow}>
              <AppText variant="sectionTitle" style={styles.editorHeadingTitle}>Theme details</AppText>
            </View>
            {editing.kind === 'published' ? (
              <View style={styles.field}>
                <AppText variant="formLabel">Theme name (fixed)</AppText>
                <AppText variant="bodyBold">{definition.name}</AppText>
                <AppText variant="metadata">The name and ID stay fixed to protect existing lists.</AppText>
                <AppText variant="metadata">Identifier: {definition.slug}</AppText>
              </View>
            ) : (
              <>
                {input('Theme name', definition.name, rename, 'e.g. Time Travel')}
                {input('Identifier (slug)', definition.slug, (text) => patch({ slug: toSlug(text) }), 'e.g. time-travel')}
              </>
            )}
            {input('Full list title', definition.displayTitle,
              (text) => patch({ displayTitle: text }), 'Top 3 Time Travel Movies')}
            {input('Theme description', definition.description,
              (text) => patch({ description: text }), 'Shown below the theme name', true)}
            {input('Search terms (comma-separated)', keywordTermsText,
              (text) => { setKeywordTermsText(text); patch({ keywordTerms: text.split(',').map((x) => x.trim()).filter(Boolean) }); },
              'time travel, time machine')}
            <View style={[styles.titleDescriptionGroup, styles.sectionHeading]}>
              <AppText variant="sectionTitle">Discover with TMDB keywords</AppText>
              <AppText variant="body">Search for concepts, then tap the matching TMDB keyword. Stronger keywords can be weighted higher.</AppText>
            </View>
            {input('Find keywords', keywordSearch, (text) => {
              setKeywordSearch(text);
              setKeywordResults([]);
            }, 'e.g. time travel', false, () => {
              Keyboard.dismiss();
              void keywordLookup();
            })}
            {lookupTarget === 'keywords' ? <AppText variant="metadata">Searching keywords…</AppText> : null}
            {keywordResults.map((result) => (
              <View key={result.id}>
                {smallButton(`+ ${result.name} (#${result.id})`, () => {
                  if (definition.keywordRules.some((rule) => rule.id === result.id)) return;
                  patch({ keywordRules: [...definition.keywordRules, { ...result, weight: 4 }] });
                }, definition.keywordRules.some((rule) => rule.id === result.id))}
              </View>
            ))}
            {definition.keywordRules.length > 0 ? (
              <View style={[styles.dividedRows, { borderTopColor: colors.border }]}>
                {definition.keywordRules.map((rule) => (
                  <View key={rule.id} style={[styles.chipRow, { borderColor: colors.border }]}>
                    <View style={styles.flex}>
                      <AppText variant="bodyBold">{rule.name ?? `TMDB keyword #${rule.id}`}</AppText>
                      <AppText variant="metadata">Weight {rule.weight}</AppText>
                    </View>
                    {smallButton('−', () => patch({ keywordRules: definition.keywordRules.map((x) =>
                      x.id === rule.id ? { ...x, weight: Math.max(1, x.weight - 1) } : x) }), rule.weight <= 1)}
                    {smallButton('+', () => patch({ keywordRules: definition.keywordRules.map((x) =>
                      x.id === rule.id ? { ...x, weight: Math.min(10, x.weight + 1) } : x) }), rule.weight >= 10)}
                    {smallButton('Remove', () => patch({ keywordRules: definition.keywordRules.filter((x) => x.id !== rule.id) }))}
                  </View>
                ))}
              </View>
            ) : null}
            {input('Minimum audience votes', String(definition.minimumVotes),
              (text) => patch({ minimumVotes: Number(text.replace(/[^0-9]/g, '')) || 0 }), '150')}
            <View style={[styles.titleDescriptionGroup, styles.sectionHeading]}>
              <AppText variant="sectionTitle">Curated additions and exclusions</AppText>
              <AppText variant="body">Search for a movie and pin it to suggestions, or exclude it. You can still find excluded titles through ordinary movie search.</AppText>
            </View>
            {input('Find a movie', movieSearch, (text) => {
              setMovieSearch(text);
              setMovieResults([]);
            }, 'e.g. Back to the Future', false, () => {
              Keyboard.dismiss();
              void movieLookup();
            })}
            {lookupTarget === 'movies' ? <AppText variant="metadata">Searching movies…</AppText> : null}
            {movieResults.map((item) => {
              const movieId = Number(item.id.replace(/^movie-/, ''));
              if (!Number.isSafeInteger(movieId) || movieId <= 0) return null;
              return (
                <View key={item.id} style={[styles.chipRow, { borderColor: colors.border }]}>
                  <View style={styles.flex}>
                    <AppText variant="bodyBold">{item.title}</AppText>
                    <AppText variant="metadata">{item.releaseYear ?? ''} · TMDB #{movieId}</AppText>
                  </View>
                  {smallButton('Pin', () => patch({
                    pinnedMovieIds: [...definition.pinnedMovieIds.filter((id) => id !== movieId), movieId],
                    excludedMovieIds: definition.excludedMovieIds.filter((id) => id !== movieId),
                  }), definition.pinnedMovieIds.includes(movieId))}
                  {smallButton('Exclude', () => patch({
                    excludedMovieIds: [...definition.excludedMovieIds.filter((id) => id !== movieId), movieId],
                    pinnedMovieIds: definition.pinnedMovieIds.filter((id) => id !== movieId),
                  }), definition.excludedMovieIds.includes(movieId))}
                </View>
              );
            })}
            <View style={styles.curatedSection}>
              <AppText variant="formLabel">Pinned movies</AppText>
              {definition.pinnedMovieIds.length > 0 ? (
                <View style={[styles.dividedRows, { borderTopColor: colors.border }]}>
                  {definition.pinnedMovieIds.map((id) => curatedMovieRow(id, 'pinned'))}
                </View>
              ) : <AppText variant="metadata">No pinned movies.</AppText>}
            </View>
            <View style={styles.curatedSection}>
              <AppText variant="formLabel">Excluded movies</AppText>
              {definition.excludedMovieIds.length > 0 ? (
                <View style={[styles.dividedRows, { borderTopColor: colors.border }]}>
                  {definition.excludedMovieIds.map((id) => curatedMovieRow(id, 'excluded'))}
                </View>
              ) : <AppText variant="metadata">No excluded movies.</AppText>}
            </View>
            <View style={styles.subsectionGap}>
              {input('Franchise limits (optional)', franchiseText, (text) => {
                setFranchiseText(text);
                patch({ franchiseCaps: text.split(',').map((chunk) => {
                  const [term, amount] = chunk.split(':');
                  return { term: term?.trim() ?? '', max: Number(amount?.trim()) || 0 };
                }).filter((item) => item.term && Number.isInteger(item.max) && item.max > 0) });
              }, 'godzilla:2, kong:2')}
            </View>
            {validationProblem ? <AppText tone="destructive" style={styles.sectionHeading}>{validationProblem}</AppText> : null}
            <View style={styles.previewAction}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Preview movie suggestions"
                accessibilityState={{ disabled: previewBusy || Boolean(validationProblem) }}
                onPress={() => { void previewSuggestions(); }}
                disabled={previewBusy || Boolean(validationProblem)}
                style={({ pressed }) => [
                  styles.previewButton,
                  (previewBusy || Boolean(validationProblem)) && styles.disabled,
                  pressed && !previewBusy && !validationProblem && styles.pressed,
                ]}>
                <AppText
                  variant="headline"
                  tone={appearance === 'dark' ? 'invertedPrimary' : 'primary'}
                  style={styles.previewButtonText}>
                  {previewBusy ? 'Loading suggestions…' : 'Preview movie suggestions'}
                </AppText>
              </Pressable>
            </View>
            {previewBusy ? <ActivityIndicator style={styles.busy} /> : null}
            {preview.length ? <AppText variant="metadata">{preview.length} suggestions · {isPreviewCurrent ? 'Preview current' : 'Preview outdated'}</AppText> : null}
            {preview.map((item, index) => (
              <View key={item.id} style={[styles.previewRow, { borderColor: colors.border }]}>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.poster} /> : null}
                <AppText variant="bodyBold" style={styles.flex}>{index + 1}. {item.title}{item.releaseYear ? ` (${item.releaseYear})` : ''}</AppText>
              </View>
            ))}
            <View style={styles.actions}>
              {editing.kind !== 'published' ? (
                <>
                  <PrimaryButton title={workingAction === 'save_draft' ? 'Saving…' : 'Save Draft'}
                    disabled={working || Boolean(draftProblem)}
                    onPress={() => { void execute('save_draft'); }}/>
                  <PrimaryButton title={workingAction === 'publish_draft' ? 'Publishing…' : 'Publish Theme'}
                    disabled={working || Boolean(validationProblem) || !isPreviewCurrent}
                    onPress={() => { void execute('publish_draft'); }}/>
                  {!isPreviewCurrent ? <AppText variant="metadata">Preview at least three relevant suggestions before publishing.</AppText> : null}
                  {editing.kind === 'draft' ? destructiveButton('Delete Draft', () => confirmAction('delete_draft', editing.id), working) : null}
                </>
              ) : (
                <>
                  <PrimaryButton title={workingAction === 'update_published' ? 'Saving…' : 'Save Changes'}
                    disabled={working || Boolean(validationProblem)}
                    onPress={() => { void execute('update_published'); }}/>
                  {publishedThemes.find((x) => x.id === editing.id)?.active
                    ? destructiveButton('Archive Theme', () => confirmAction('archive', editing.id), working)
                    : smallButton('Restore Theme', () => confirmAction('restore', editing.id), working, true)}
                  <AppText variant="metadata">Editing an existing theme does not rewrite users’ previously published lists.</AppText>
                </>
              )}
            </View>
          </>
        )}
    </AdminMovieThemeScrollShell>
    <ActionSheet
      visible={confirmation !== null}
      title={confirmation?.title}
      message={confirmation?.message}
      actions={confirmationActions}
      onClose={() => setConfirmation(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
  content: { paddingHorizontal: 20, paddingVertical: 26, gap: 16, paddingBottom: 90 },
  notice: { borderWidth: 1, borderRadius: 12, padding: 12 },
  listRow: { padding: 16, minHeight: 64, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  field: { gap: 8 },
  methodPicker: { gap: 8, marginTop: 8 },
  methodOptions: { flexDirection: 'column', gap: 10 },
  methodOption: { flex: 1, minHeight: 48, borderWidth: 1,
    borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  curatedSection: { gap: SPACING.xs, marginTop: 16 },
  curatedSearchSection: { marginTop: 16 },
  smartSuggestionSection: { gap: SPACING.sm, marginTop: 16 },
  smartSuggestionHeading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  smartSuggestionFullWidthButton: { alignSelf: 'stretch', width: '100%', alignItems: 'center', minHeight: 50 },
  smartSuggestionButtonLabel: { textAlign: 'center' },
  dividedRows: { borderTopWidth: StyleSheet.hairlineWidth },
  sectionHeading: { marginTop: 24 },
  previewAction: { marginTop: 0 },
  previewButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  previewButtonText: { textAlign: 'center' },
  titleDescriptionGroup: { gap: 8 },
  subsectionGap: { marginTop: 8 },
  input: { borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 50 },
  clearableInputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, minHeight: 50 },
  clearableInputField: { flex: 1, minWidth: 0, paddingRight: 0 },
  clearSearchButton: { width: 48, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  editorHeadingRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm, marginTop: 16 },
  editorHeadingTitle: { flexShrink: 1 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  smallButton: { borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  centeredSmallButton: { alignSelf: 'center' },
  destructiveButton: { width: '100%', minHeight: 52, borderWidth: 1, borderRadius: RADIUS.xl, paddingHorizontal: SPACING.xl, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md },
  destructiveButtonText: { textAlign: 'center' },
  pressed: { opacity: 0.68 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  previewRow: { borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  poster: { width: 42, height: 64, borderRadius: 6 },
  actions: { gap: 12, marginTop: 24 },
  flex: { flex: 1 },
  busy: { marginVertical: 18 },
  disabled: { opacity: 0.4 },
});
