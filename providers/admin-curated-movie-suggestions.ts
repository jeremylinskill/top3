import type { Top3Item } from '@/types/top3-item';

/**
 * Admin-only, on-demand, editorial discovery. Nothing here is persisted.
 * A small, transparent concept lexicon interprets the title/description;
 * relevant TMDB keyword tags, genres and optional existing movie seeds
 * provide candidates. This is a heuristic, not generative AI.
 */
const API = 'https://api.themoviedb.org/3';
const ART = 'https://image.tmdb.org/t/p/w500';
const MAX_KEYWORD_QUERIES = 8;
const MAX_DISCOVERED_KEYWORDS = 6;
const COMFORT_MIN_SCORE = 7.25;
const EMOTIONAL_MIN_SCORE = 7.25;
const MAX_SELECTION_EXAMPLES = 6;
const MAX_SELECTION_KEYWORD_LANES = 4;


type ThemeProfile = 'comfort' | 'emotional' | 'first-viewing' | 'rewatchable' | 'general';

export type CuratedSmartMovieSuggestion = {
  item: Top3Item;
  reason: string;
};
export type CuratedSmartMovieResponse = {
  suggestions: CuratedSmartMovieSuggestion[];
  concepts: string[];
  keywords: string[];
  note?: string;
  // Editorial hints used only for this refresh; no persisted state.
  selectionExamples: number;
  selectedCount: number;
};

type Movie = {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
  vote_count?: number;
  vote_average?: number;
  popularity?: number;
  adult?: boolean;
  genre_ids?: number[];
  overview?: string;
};

type Concept = {
  label: string;
  matches: RegExp;
  keywordTerms: string[];
  genreIds?: number[];
};

const CONCEPTS: Concept[] = [
  {
    label: 'feel-good and comforting',
    matches: /\b(comfort|comforting|cozy|cosy|feel good|feelgood|heartwarm\w*|uplift\w*|reassur\w*|wholesome|warm and fuzzy)\b/,
    keywordTerms: ['feel good', 'heartwarming', 'friendship', 'family'],
    genreIds: [35, 10751],
  },
  {
    label: 'emotional and moving',
    matches: /\b(cry|cried|crying|tear\w*|emotional|moving|heartbreak\w*|sad|grief|tragic|touching)\b/,
    keywordTerms: ['tearjerker', 'grief', 'tragedy', 'loss of loved one'],
    genreIds: [18],
  },
  {
    label: 'rewatchable and nostalgic',
    matches: /\b(rewatch\w*|watch again|over and over|never get tired|never tire|rewind|repeat viewing|nostalg\w*|childhood favorite|childhood favourite)\b/,
    keywordTerms: ['nostalgia', 'friendship', 'coming of age'],
  },
  {
    label: 'unforgettable first viewing',
    matches: /\b(first time|wish i could|mind blow\w*|unforgettable|twist ending|plot twist|big reveal|surpris\w*)\b/,
    keywordTerms: ['plot twist', 'twist ending', 'surprise ending', 'mind bending'],
    genreIds: [9648, 878],
  },
  {
    label: 'comedy',
    matches: /\b(comed\w*|funny|hilarious|laugh\w*|humou?r)\b/,
    keywordTerms: ['comedy', 'humor'], genreIds: [35],
  },
  {
    label: 'romance',
    matches: /\b(romanc\w*|love story|romantic|falling in love)\b/,
    keywordTerms: ['love', 'romance', 'first love'], genreIds: [10749],
  },
  {
    label: 'suspense and mysteries',
    matches: /\b(thrill\w*|suspense|myster\w*|whodunnit|detective|crime)\b/,
    keywordTerms: ['mystery', 'murder mystery', 'investigation'], genreIds: [9648, 53],
  },
  {
    label: 'horror',
    matches: /\b(horror|scary|terrifying|frightening|haunted|monster\w*|ghost\w*)\b/,
    keywordTerms: ['supernatural', 'haunted house', 'monster'], genreIds: [27],
  },
  {
    label: 'adventure',
    matches: /\b(adventure|journey|quest|explor\w*|epic)\b/,
    keywordTerms: ['adventure', 'journey', 'quest'], genreIds: [12],
  },
  {
    label: 'science fiction',
    matches: /\b(sci fi|science fiction|space|alien\w*|future|time travel|dystopi\w*)\b/,
    keywordTerms: ['time travel', 'space travel', 'dystopia'], genreIds: [878],
  },
  {
    label: 'family and friendship',
    matches: /\b(family|families|friendship|friend\w*|parent\w*|kids|children)\b/,
    keywordTerms: ['family', 'friendship', 'parent child relationship'], genreIds: [10751],
  },
  {
    label: 'music',
    matches: /\b(music\w*|singing|song\w*|musical|band\w*|concert\w*)\b/,
    keywordTerms: ['music', 'musician', 'singing'], genreIds: [10402],
  },
  {
    label: 'sports and underdogs',
    matches: /\b(sports?|athlete\w*|underdog\w*|winning|comeback|teamwork)\b/,
    keywordTerms: ['underdog', 'sports', 'competition'],
  },
  {
    label: 'animation',
    matches: /\b(animat\w*|cartoon\w*|pixar)\b/,
    keywordTerms: ['animation', 'friendship'], genreIds: [16],
  },
];

const STOP_WORDS = new Set([
  'top', 'three', 'movies', 'movie', 'film', 'films', 'the', 'a', 'an', 'and',
  'or', 'but', 'with', 'without', 'that', 'which', 'when', 'where', 'what',
  'this', 'those', 'these', 'them', 'they', 'you', 'your', 'our', 'its',
  'from', 'there', 'their', 'before', 'after', 'every', 'always', 'never',
  'been', 'being', 'into', 'over', 'under', 'that', 'because', 'about',
  'really', 'again', 'once', 'more', 'could', 'would', 'should', 'just',
  'made', 'make', 'makes', 'feel', 'feels', 'felt', 'wish', 'first', 'time',
  'watch', 'watched', 'watching', 'see', 'seen', 'get', 'got', 'tired',
  'like', 'love', 'best', 'favorite', 'favourite', 'all', 'for', 'in', 'of',
  'at', 'is', 'are', 'was', 'were', 'my', 'me', 'we', 'i', 'to', 'on', 'it',
  'as', 'by', 'be', 'not', 'can', 'will', 'have', 'has', 'had', 'do', 'does',
]);

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function apiKey(): string {
  const key = process.env.EXPO_PUBLIC_TMDB_API_KEY;
  if (!key) throw new Error('TMDB API key is not configured.');
  return key;
}

async function getJson<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams({ api_key: apiKey(), language: 'en-US', ...params });
  const response = await fetch(`${API}${path}?${query}`, { signal });
  if (!response.ok) throw new Error(`TMDB suggestion request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

function toItem(movie: Movie): Top3Item {
  const releaseYear = movie.release_date?.slice(0, 4);
  return {
    id: `movie-${movie.id}`,
    title: movie.title ?? '',
    subtitle: releaseYear,
    releaseYear,
    imageUrl: movie.poster_path ? `${ART}${movie.poster_path}` : undefined,
    rating: movie.vote_average,
  };
}

function termsForTheme(name: string, description: string) {
  const normalized = normalize(`${name} ${description}`);
  const concepts = CONCEPTS.filter((entry) => entry.matches.test(normalized));
  const termScores = new Map<string, number>();
  for (const concept of concepts) {
    concept.keywordTerms.forEach((keyword, index) => {
      const previous = termScores.get(keyword) ?? 0;
      termScores.set(keyword, Math.max(previous, 6 - Math.min(index, 3)));
    });
  }
  // Fallback for themes not yet described in our concept lexicon: use only
  // meaningful title/description words, never unrestricted popular movies.
  const words = normalized.split(' ')
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
  for (const word of [...new Set(words)].slice(0, 5)) {
    termScores.set(word, Math.max(termScores.get(word) ?? 0, 2));
  }
  // Interpret the theme's main purpose first. A description of comfort films
  // may mention rewatching; that must NOT give 'nostalgia' equal weight to warmth.
  const profile: ThemeProfile = /\b(comfort|comforting|cozy|cosy|feel good|feelgood|heartwarm\w*|uplift\w*|reassur\w*|wholesome)\b/.test(normalized)
    ? 'comfort'
    : /\b(cry|cried|crying|tear\w*|heartbreak\w*|grief|tragic|sad|moving|emotional)\b/.test(normalized)
      ? 'emotional'
      : /\b(first time|wish i could|mind blow\w*|unforgettable|plot twist|twist ending)\b/.test(normalized)
        ? 'first-viewing'
        : /\b(rewatch\w*|watch again|never get tired|never tire|nostalg\w*|over and over)\b/.test(normalized)
          ? 'rewatchable' : 'general';
  return {
    profile,
    concepts: concepts.map((concept) => concept.label),
    genres: [...new Set(concepts.flatMap((concept) => concept.genreIds ?? []))].slice(0, 4),
    terms: [...termScores].sort((a, b) => b[1] - a[1])
      .slice(0, MAX_KEYWORD_QUERIES),
  };
}

type Candidate = { movie: Movie; relevance: number; reasons: Set<string> };

const COMFORT_KEYWORD_POINTS: Record<string, number> = {
  'feel good': 5.4, 'heartwarming': 5.4, 'wholesome': 5.4, 'uplifting': 5.4,
  'friendship': 1.4, 'family': 1.1, 'nostalgia': 0.5, 'coming of age': 1,
  'love': 1.4, 'romance': 1.4,
};
const EMOTIONAL_KEYWORD_POINTS: Record<string, number> = {
  'tearjerker': 5.8,
  'loss of loved one': 5.8,
  'grief': 4.6,
  'tragedy': 2.1,
  'sadness': 2.5,
  'heartbreak': 4,
};
// The presence of these words is supporting evidence, not proof that a movie
// will elicit a particular emotion. Avoid pretending to perform sentiment AI.
const EMOTIONAL_STORY_SIGNALS = [
  /\b(grief|grieving|mourning|bereave\w*|loss of|lost (his|her|their) (mother|father|wife|husband|child|daughter|son|family))\b/i,
  /\b(dying|terminal(ly)? ill|cancer|illness|farewell|goodbye|heartbreak|heartbroken|separation)\b/i,
  /\b(reunite\w*|reconcil\w*|estranged|sacrifice|loved one|family bond|unrequited|forbidden love)\b/i,
  /\b(touching|poignant|bittersweet|deeply moving|heart.?wrenching|tearful|emotionally powerful|tragic love|love and loss)\b/i,
];
const DISASTER_PLOT = /\b(tsunami|earthquake|nuclear reactor|disaster|catastroph\w*|natural calamity|mass destruction)\b/i;
// A loss-related plot detail does not necessarily make a crime/adventure film
// a film about grief. These are soft relevance penalties, never genre bans.
const EMOTIONAL_ACTION_FOCUS = /\b(organized crime|crime family|crime syndicate|mafia|mob boss|gangster|criminal underworld|hitman|assassin|drug cartel|wizard|dark lord|superhero|secret mission|save the world)\b/i;
const GENRE_LABELS: Record<number, string> = {
  12: 'Adventure', 16: 'Animation', 28: 'Action', 35: 'Comedy',
  18: 'Drama', 80: 'Crime', 99: 'Documentary', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science fiction',
  10770: 'TV movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};
function matchedKeywords(candidate: Candidate): string[] {
  return [...candidate.reasons]
    .filter((reason) => reason.startsWith('Keyword: '))
    .map((reason) => reason.slice('Keyword: '.length).toLowerCase());
}
function voteBackedQuality(movie: Movie): number {
  const votes = Math.max(0, movie.vote_count ?? 0);
  const average = Math.max(0, Math.min(10, movie.vote_average ?? 0));
  // Reviews only carry substantial weight when there are enough votes.
  const confidence = Math.min(1, votes / 1000);
  const ratingScore = average > 0 ? Math.max(-3, Math.min(3.2, (average - 6.7) * 2)) * confidence : 0;
  const established = votes >= 5000 ? 1.8 : votes >= 1500 ? 1.2 : votes >= 500 ? 0.4 : votes < 150 ? -2.4 : -0.8;
  const weakReception = votes >= 300 && average > 0 && average < 6.1 ? -1.8 : 0;
  return Math.max(-5, Math.min(5, ratingScore + established + weakReception));
}
function synopsisSignals(movie: Movie): number {
  const description = movie.overview ?? '';
  return Math.min(3.6, EMOTIONAL_STORY_SIGNALS.reduce(
    (total, pattern) => total + (pattern.test(description) ? 1.2 : 0), 0));
}
function emotionalScore(candidate: Candidate): number {
  const { movie, reasons } = candidate;
  const genres = new Set(movie.genre_ids ?? []);
  const keywordWeights = matchedKeywords(candidate)
    .map((word) => EMOTIONAL_KEYWORD_POINTS[word] ?? 1);
  const strongKeyword = keywordWeights.length ? Math.max(...keywordWeights) : 0;
  // Multiple distinct, theme-specific matches corroborate a film, but should
  // never turn an unrelated film into a top result by pure keyword addition.
  const corroboration = keywordWeights.filter((weight) => weight >= 3).length > 1 ? 1.5 : 0;
  const story = synopsisSignals(movie);
  const related = [...reasons].some((reason) => reason.startsWith('Similar to ')) ? 0.8 : 0;
  let score = strongKeyword + corroboration + story + related;
  if (genres.has(18)) score += 1.8;
  if (genres.has(10749)) score += 0.7;
  if (genres.has(10751)) score += 0.5;
  if (genres.has(80)) score -= 3.8;
  if (genres.has(53) || genres.has(28)) score -= genres.has(18) ? 2.5 : 3.4;
  if (genres.has(27)) score -= 3;
  if (DISASTER_PLOT.test(`${movie.title ?? ''} ${movie.overview ?? ''}`)) score -= 4;
  if (EMOTIONAL_ACTION_FOCUS.test(movie.overview ?? '') && story < 1.2) score -= 2.5;
  // A high-profile adventure that contains a loss is not automatically a
  // primarily emotional film. Family-oriented adventures remain eligible.
  if (genres.has(12) && !genres.has(18) && !genres.has(10749) &&
      !genres.has(10751) && story < 1.2) score -= 3;
  if (genres.has(14) && !genres.has(10751) && story < 1.2) score -= 1.4;
  // One keyword alone should not be reinforced purely by audience popularity.
  if (strongKeyword < 3 && story < 1.2) score -= 4;
  return score + voteBackedQuality(movie);
}
const COMFORT_NEGATIVE_GENRES: Record<number, number> = {
  27: 17, // Horror
  53: 10, // Thriller
  80: 8,  // Crime
  10752: 8, // War
  9648: 5, // Mystery
};
const COMFORT_POSITIVE_TONE = /\b(heartwarm\w*|uplift\w*|feel.good|wholesome|joyful|joyous|cheerful|lighthearted|charming|sweethearted|reassur\w*|feel.better|beloved|hilarious|happiness|funny|comedic|laughs?|fun.filled)\b/gi;
// Complement keyword discovery with several intentionally different live-action
// genres. TMDB treats comma-separated with_genres as AND. The negative genre
// filter is only for these comfort-specific discovery routes, not other themes.
const COMFORT_DISCOVERY_LANES: { label: string; genres: string }[] = [
  { label: 'Romantic comedy', genres: '35,10749' },
  { label: 'Comedy-drama', genres: '35,18' },
  { label: 'Adventure comedy', genres: '12,35' },
  { label: 'Live-action comedy', genres: '35' },
];
const COMFORT_EXCLUDED_DISCOVERY_GENRES = '16,27,53,80,10752';
const COMFORT_NEGATIVE_TONE = /\b(murder\w*|serial killer|horrif\w*|nightmare\w*|terrify\w*|trauma\w*|suicid\w*|depress\w*|tragic|tragedy|grief|grieving|devastat\w*|bloodshed|brutal|violent|death|dies|died|revenge|disturbing|sinister|psychological horror)\b/gi;
// A warm/comedic genre label can coexist with extremely distressing subject
// matter. Only use clearly indicated synopsis topics; don't infer tone from
// a movie's title or dismiss every drama.
const COMFORT_HEAVY_SUBJECT = /\b(holocaust|concentration camp|genocide|ethnic cleansing|deport\w*|nazi(?:s|sm)?|world war (?:i|ii|one|two|1|2)|war crime\w*|torture|execution|terminal illness|terminally ill|massacre|enslavement|forced labou?r)\b/gi;

/**
 * The theme's emotional intent must outrank any single plot keyword.
 * In particular, 'nostalgia' and 'friendship' are discovery hints, not
 * proof that the movie is comforting. Genres and synopsis reduce false hits.
 * This function never writes to the database or changes curated selections.
 */
/**
 * Rank independently of the TMDB discovery lane. A lane gives us candidates,
 * not evidence that a film fulfils the theme's emotional intent.
 */
function rankCandidate(candidate: Candidate, profile: ThemeProfile): number {
  const { movie, relevance, reasons } = candidate;
  const genres = new Set(movie.genre_ids ?? []);
  const overview = movie.overview ?? '';
  const quality = voteBackedQuality(movie);
  if (profile === 'emotional') return emotionalScore(candidate);
  if (profile === 'comfort') {
    const tags = matchedKeywords(candidate);
    const specific = tags.map((tag) => COMFORT_KEYWORD_POINTS[tag] ?? 1)
      .sort((a, b) => b - a);
    let score = Math.min(7, specific.reduce((sum, points) => sum + points, 0));
    const cheerful = Math.min(2.8, (overview.match(COMFORT_POSITIVE_TONE)?.length ?? 0) * 1.4);
    const distressing = Math.min(9, (`${movie.title ?? ''} ${overview}`.match(COMFORT_NEGATIVE_TONE)?.length ?? 0) * 3);
    const heavySubject = Math.min(18, (overview.match(COMFORT_HEAVY_SUBJECT)?.length ?? 0) * 9);
    score += cheerful;
    if (genres.has(10751)) score += 1.6;
    if (genres.has(35)) score += 1.6;
    if (genres.has(10749)) score += 0.8;
    if (!genres.has(16) && genres.has(35) && genres.has(10749)) score += 2.7;
    if (!genres.has(16) && genres.has(35) && genres.has(18)) score += 2.2;
    if (!genres.has(16) && genres.has(35) && genres.has(12)) score += 2.4;
    if (genres.has(16) && genres.has(10751) && genres.has(35)) score += 1;
    if ([...reasons].some((reason) => reason.startsWith('Similar to '))) score += 1.2;
    if (genres.has(18) && !genres.has(35) && !genres.has(10751)) score -= 2;
    for (const [genre, deduction] of Object.entries(COMFORT_NEGATIVE_GENRES)) {
      if (genres.has(Number(genre))) score -= deduction;
    }
    score -= distressing + heavySubject;
    // In a nostalgic/rewatchable context, a newly released movie should not
    // outrank established titles merely because TMDB tagged it heartwarming.
    const releaseYear = Number(movie.release_date?.slice(0, 4));
    const currentYear = new Date().getFullYear();
    if (Number.isFinite(releaseYear) && releaseYear >= currentYear - 1) score -= 3;
    else if (Number.isFinite(releaseYear) && releaseYear >= currentYear - 3) score -= 1;
    if (genres.has(16) && (movie.vote_average ?? 0) < 6.8) score -= 2;
    return score + quality;
  }
  // The remaining profiles use a common evidence/quality framework without
  // forcing the emotionally themed genre balance onto other kinds of lists.
  const keywords = matchedKeywords(candidate);
  let score = Math.min(12, relevance * 1.15) + quality;
  if (keywords.length > 1) score += Math.min(2, keywords.length - 1);
  if (profile === 'first-viewing') {
    if (genres.has(9648) || genres.has(878) || genres.has(53)) score += 1.6;
    if (genres.has(27)) score -= 0.5;
  } else if (profile === 'rewatchable') {
    const releaseYear = Number(movie.release_date?.slice(0, 4));
    if (Number.isFinite(releaseYear) && releaseYear >= new Date().getFullYear() - 1) score -= 2;
    if (genres.has(35) || genres.has(12)) score += 0.6;
  }
  return score;
}

/** Label verified TMDB data rather than naming the discovery lane as a genre. */
function reasonFor(candidate: Candidate, profile: ThemeProfile): string {
  const genreNames = (candidate.movie.genre_ids ?? [])
    .map((id) => GENRE_LABELS[id])
    .filter((label): label is string => Boolean(label));
  const genreText = genreNames.slice(0, 2).join(' · ');
  const tags = matchedKeywords(candidate);
  const weights = profile === 'emotional' ? EMOTIONAL_KEYWORD_POINTS
    : profile === 'comfort' ? COMFORT_KEYWORD_POINTS : undefined;
  const strongest = tags.slice().sort((a, b) =>
    (weights?.[b] ?? 1) - (weights?.[a] ?? 1))[0];
  if (strongest && (weights?.[strongest] ?? 2) >= 3) {
    const formatted = strongest.replace(/^\w/, (letter) => letter.toUpperCase());
    return genreText ? `${formatted} · ${genreNames[0]}` : `TMDB keyword: ${formatted}`;
  }
  // If the match was discovered by genre rather than a theme-specific tag,
  // show its actual genre(s) instead of claiming it was a romantic comedy.
  const selectedKeyword = [...candidate.reasons]
    .find((reason) => reason.startsWith('Selected keyword: '))
    ?.slice('Selected keyword: '.length);
  if (selectedKeyword) {
    return genreText ? `${selectedKeyword} · ${genreNames[0]}` : `TMDB keyword: ${selectedKeyword}`;
  }
  if (genreText) return genreText;
  if (strongest) return `TMDB keyword: ${strongest}`;
  return [...candidate.reasons].find((reason) => reason.startsWith('Similar to '))
    ?? 'Related movie';
}

type ScoredCandidate = { candidate: Candidate; score: number };

/**
 * Conservative title-based family grouping for recommendation diversity.
 * It handles same-title remakes and obvious numbered sequels, plus a few
 * consistently titled film series. It is not a TMDB collection lookup, so
 * unrelated sequels with completely different names can still appear.
 */
function movieFamilyKey(title: string): string {
  const normalized = normalize(title.replace(/\s*\(\d{4}\)\s*$/, ''));
  const sharedPrefix = normalized.match(
    /^(harry potter)(?: and\b|$)|^(star wars)(?: episode\b|$)|^(the lord of the rings)(?: the\b|$)|^(the hunger games)(?: catching\b| mockingjay\b|$)|^(pirates of the caribbean)(?:\b|$)/,
  );
  if (sharedPrefix) return sharedPrefix.slice(1).find(Boolean) ?? normalized;
  const withoutPart = normalized.replace(/\s+(?:part|chapter|episode|volume|vol)\s+(?:[ivx]+|\d+)(?:\s.*)?$/, '');
  // Only trim a trailing standalone sequel numeral. Keep years and titles
  // beginning with numbers (e.g. '2046', '20th Century Girl') untouched.
  return withoutPart.replace(/\s+(?:[2-9]|1\d)(?:\s.*)?$/, '');
}

function withoutRelatedStories(
  ranked: ScoredCandidate[], selectedMovies: Top3Item[],
): ScoredCandidate[] {
  const selectedFamilies = new Set(selectedMovies.map((movie) => movieFamilyKey(movie.title)));
  const seen = new Set<string>();
  return ranked.filter(({ candidate }) => {
    const family = movieFamilyKey(candidate.movie.title ?? '');
    if (!family || selectedFamilies.has(family) || seen.has(family)) return false;
    seen.add(family);
    return true;
  });
}

type ComfortLane = 'romance' | 'comedy-drama' | 'adventure' |
  'live-comedy' | 'animation' | 'family' | 'other';

function comfortLane(movie: Movie): ComfortLane {
  const genres = new Set(movie.genre_ids ?? []);
  if (genres.has(16)) return 'animation';
  if (genres.has(35) && genres.has(10749)) return 'romance';
  if (genres.has(35) && genres.has(12)) return 'adventure';
  if (genres.has(35) && genres.has(18)) return 'comedy-drama';
  if (genres.has(35)) return 'live-comedy';
  if (genres.has(10751)) return 'family';
  return 'other';
}

/**
 * Theme-aware selection: preserve relevance first, but avoid handing an admin
 * 12 animated movies as a "Comfort Movies" shortlist. We do not fill gaps
 * with weak matches merely to reach the requested number of suggestions.
 */
function diversifySuggestions(
  ranked: ScoredCandidate[], limit: number, profile: ThemeProfile,
): ScoredCandidate[] {
  if (profile === 'general' || limit < 3) return ranked.slice(0, limit);
  const remaining = [...ranked];
  const selected: ScoredCandidate[] = [];
  const counts = new Map<string, number>();
  const comfortCaps: Record<ComfortLane, number> = {
    animation: Math.max(1, Math.ceil(limit * 0.18)),
    romance: Math.max(2, Math.ceil(limit * 0.26)),
    'comedy-drama': Math.max(2, Math.ceil(limit * 0.26)),
    adventure: Math.max(2, Math.ceil(limit * 0.26)),
    'live-comedy': Math.max(2, Math.ceil(limit * 0.26)),
    family: Math.max(1, Math.ceil(limit * 0.19)),
    other: Math.max(1, Math.ceil(limit * 0.13)),
  };
  const lane = (movie: Movie): string => {
    if (profile === 'comfort') return comfortLane(movie);
    const genres = new Set(movie.genre_ids ?? []);
    // Different themes should get a different distribution. Emotional movies
    // legitimately skew toward drama; first-viewing titles can skew to mystery
    // or sci-fi. Soft penalties only, and no categorical exclusions.
    if (profile === 'emotional') {
      if (genres.has(10749)) return 'romance';
      if (genres.has(16)) return 'animation';
      if (genres.has(10402)) return 'music';
      if (genres.has(10751)) return 'family';
      if (genres.has(18)) return 'drama';
    } else if (profile === 'first-viewing') {
      if (genres.has(9648)) return 'mystery';
      if (genres.has(878)) return 'sci-fi';
      if (genres.has(53)) return 'thriller';
      if (genres.has(12)) return 'adventure';
    } else if (profile === 'rewatchable') {
      if (genres.has(35)) return 'comedy';
      if (genres.has(12)) return 'adventure';
      if (genres.has(16)) return 'animation';
      if (genres.has(18)) return 'drama';
    }
    return 'other';
  };
  while (selected.length < limit && remaining.length) {
    let bestIndex = -1;
    let bestAdjusted = -Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const entry = remaining[index];
      const group = lane(entry.candidate.movie);
      const used = counts.get(group) ?? 0;
      if (profile === 'comfort' && used >= comfortCaps[group as ComfortLane]) continue;
      const repeatPenalty = profile === 'comfort' ? 2 : 0.45;
      const consecutivePenalty = selected.length &&
        lane(selected[selected.length - 1].candidate.movie) === group
        ? (profile === 'comfort' ? 0.8 : 0.25) : 0;
      const adjusted = entry.score - used * repeatPenalty - consecutivePenalty;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) break;
    const [picked] = remaining.splice(bestIndex, 1);
    selected.push(picked);
    const group = lane(picked.candidate.movie);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return selected;
}

/**
 * A deterministic, evenly spaced sample prevents the first few movies from
 * dominating when an editor has built a larger catalogue. Never mutate items.
 */
function selectionExamples(selected: Top3Item[]): Top3Item[] {
  const unique = selected.filter((item, index, items) => item.title.trim() &&
    items.findIndex((other) => normalize(other.title) === normalize(item.title)) === index);
  if (unique.length <= MAX_SELECTION_EXAMPLES) return unique;
  const indexes = new Set<number>();
  for (let i = 0; i < MAX_SELECTION_EXAMPLES; i += 1) {
    indexes.add(Math.round(i * (unique.length - 1) / (MAX_SELECTION_EXAMPLES - 1)));
  }
  return [...indexes].map((index) => unique[index]);
}

type SeedKeyword = { id: number; name: string };
type ResolvedSeed = { item: Top3Item; movieId: number; keywords: SeedKeyword[] };

/**
 * TMDB IDs are used directly. For legacy title-only suggestions, match an
 * exact TMDB title, optionally preferring its recorded release year. This
 * remains read-only and never replaces the legacy entry in the catalogue.
 */
async function resolveSelectedExample(item: Top3Item, signal?: AbortSignal): Promise<ResolvedSeed | null> {
  const idMatch = /^movie-([1-9]\d{0,8})$/.exec(item.id);
  let movieId = idMatch ? Number(idMatch[1]) : 0;
  if (!movieId) {
    const found = await getJson<{ results?: Movie[] }>('/search/movie', {
      query: item.title, page: '1', include_adult: 'false',
    }, signal);
    const exact = (found.results ?? []).filter((movie) =>
      movie.title && normalize(movie.title) === normalize(item.title));
    const year = item.releaseYear || (item.subtitle?.match(/\b(19|20)\d{2}\b/)?.[0]);
    exact.sort((a, b) => {
      const aYear = year && a.release_date?.startsWith(year) ? 1 : 0;
      const bYear = year && b.release_date?.startsWith(year) ? 1 : 0;
      return bYear - aYear || (b.vote_count ?? 0) - (a.vote_count ?? 0);
    });
    movieId = exact[0]?.id ?? 0;
  }
  if (!Number.isSafeInteger(movieId) || movieId <= 0) return null;
  // Metadata is optional: a failed keyword fetch must not suppress related
  // movie discovery or the normal title/description discovery routes.
  let keywords: SeedKeyword[] = [];
  try {
    const result = await getJson<{ keywords?: SeedKeyword[] }>(
      `/movie/${movieId}/keywords`, {}, signal);
    keywords = (result.keywords ?? []).filter((keyword) =>
      Number.isSafeInteger(keyword.id) && keyword.id > 0 && Boolean(keyword.name?.trim()));
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  return { item, movieId, keywords };
}

// Subject-based themes need evidence of their subject, not a generic 'winning'
// or 'competition' storyline. This conservative guard currently covers sports;
// other theme types continue using the v5 relevance framework unchanged.
const SPORTS_SUBJECT = /\b(sports?|athletics?|athletes?|boxing|boxer(?:s)?|wrestl\w*|baseball|basketball|football|hockey|soccer|tennis|golf|rugby|cricket|dodgeball|volleyball|swimm\w*|surfer(?:s)?|surfing|skating|skater(?:s)?|figure skating|bobsle\w*|olympic\w*|marathon|sprinter(?:s)?|gymnast\w*|martial arts|mixed martial arts|mma|race ?car(?:s)?|car racing|auto racing|motorcycle racing|racing driver(?:s)?|race ?driver(?:s)?|formula (?:one|1)|f1|nascar|motorsport\w*|motor racing|race ?track|le mans|cycling|cyclist(?:s)?|bicycle racing|horse racing|jockey(?:s)?)\b/i;
const SPORTS_DISCIPLINE = /\b(boxing|boxer(?:s)?|wrestl\w*|baseball|basketball|football|hockey|soccer|tennis|golf|rugby|cricket|dodgeball|volleyball|swimm\w*|surfing|figure skating|bobsle\w*|marathon|gymnast\w*|martial arts|mma|motorsport\w*|motor racing|car racing|auto racing|formula (?:one|1)|f1|nascar|cycling|horse racing)\b/i;
const GENERIC_SEED_KEYWORDS = new Set([
  'friendship', 'family', 'love', 'competition', 'rivalry', 'underdog',
  'coming of age', 'based on true story', 'biography', 'based on novel',
  'father son relationship', 'mother daughter relationship', 'dream',
  'murder', 'revenge', 'loss', 'death', 'redemption', 'inspirational',
  'drama', 'teamwork', 'life', 'history', 'hope', 'romance', 'marriage',
]);

function belongsToSportsTheme(movie: Movie, reasons: Set<string>): boolean {
  const description = `${movie.title ?? ''} ${movie.overview ?? ''}`;
  if (SPORTS_SUBJECT.test(description)) return true;
  // Direct sports metadata on a TMDB discover result is also evidence, even
  // when the short synopsis leaves the specific sport unstated.
  return [...reasons].some((reason) =>
    (reason.startsWith('Keyword: ') || reason.startsWith('Selected keyword: ')) &&
    SPORTS_DISCIPLINE.test(reason));
}

/**
 * Candidate-discovery keywords are grounded in the *selected* movies' TMDB
 * keywords. Prefer specific topic words or keywords corroborated by multiple
 * independently chosen movies; reject generic motifs. One keyword per seed
 * on the first pass prevents a boxing-heavy catalogue from dominating.
 */
function selectedKeywordLanes(
  seeds: ResolvedSeed[], themeTerms: [string, number][], sportsTheme: boolean,
): { id: number; name: string; from: string }[] {
  const themeWords = new Set(themeTerms.map(([term]) => normalize(term)));
  const counts = new Map<number, number>();
  for (const seed of seeds) for (const keyword of seed.keywords) {
    counts.set(keyword.id, (counts.get(keyword.id) ?? 0) + 1);
  }
  const picked: { id: number; name: string; from: string }[] = [];
  const usedIds = new Set<number>();
  for (const seed of seeds) {
    const matches = seed.keywords.map((keyword) => {
      const text = normalize(keyword.name);
      if (GENERIC_SEED_KEYWORDS.has(text) || text.length < 4) return null;
      if (sportsTheme && !SPORTS_SUBJECT.test(text)) return null;
      const direct = themeWords.has(text);
      const shared = (counts.get(keyword.id) ?? 0) >= 2;
      if (!sportsTheme && !direct && !shared) return null;
      return { keyword, score: (direct ? 5 : 0) +
        (sportsTheme ? 4 : 0) + (shared ? 3 : 0) + Math.min(text.length, 24) / 24 };
    }).filter((entry): entry is { keyword: SeedKeyword; score: number } => Boolean(entry));
    matches.sort((a, b) => b.score - a.score || a.keyword.id - b.keyword.id);
    const next = matches.find(({ keyword }) => !usedIds.has(keyword.id));
    if (next) {
      usedIds.add(next.keyword.id);
      picked.push({ id: next.keyword.id, name: next.keyword.name, from: seed.item.title });
      if (picked.length >= MAX_SELECTION_KEYWORD_LANES) break;
    }
  }
  return picked;
}

export async function getAdminCuratedSmartSuggestions({
  name, description, selectedMovies, signal, limit = 16,
}: {
  name: string;
  description: string;
  selectedMovies: Top3Item[];
  signal?: AbortSignal;
  limit?: number;
}): Promise<CuratedSmartMovieResponse> {
  const theme = termsForTheme(name, description);
  if (!theme.terms.length && !theme.genres.length) {
    return { suggestions: [], concepts: [], keywords: [],
      selectionExamples: 0, selectedCount: selectedMovies.length,
      note: 'Add a descriptive theme name or description to find related movies.' };
  }

  const examples = selectionExamples(selectedMovies);
  const sportsTheme = /\b(sports?|athletics?|athletes?)\b/i.test(name);
  const selectedIds = new Set(selectedMovies.map((item) => item.id));
  const selectedTitles = new Set(selectedMovies.map((item) => normalize(item.title)));
  const candidates = new Map<number, Candidate>();
  const today = new Date().toISOString().slice(0, 10);
  const consider = (movie: Movie, relevance: number, reason: string) => {
    if (!Number.isSafeInteger(movie.id) || movie.id <= 0 || !movie.title?.trim() ||
      !movie.poster_path || !movie.release_date || movie.release_date > today ||
      movie.adult === true || (movie.vote_count ?? 0) < 80 ||
      selectedIds.has(`movie-${movie.id}`) || selectedTitles.has(normalize(movie.title))) return;
    const existing = candidates.get(movie.id);
    if (existing) {
      // Different evidence sources improve relevance; repeated pages do not.
      if (!existing.reasons.has(reason)) existing.relevance += relevance;
      existing.reasons.add(reason);
    } else {
      candidates.set(movie.id, { movie, relevance, reasons: new Set([reason]) });
    }
  };

  // Find EXACT TMDB keyword names, never automatically choose the first fuzzy
  // result from /search/keyword (which often represents unrelated concepts).
  const searches = await Promise.allSettled(theme.terms.map(async ([term, score]) => {
    const data = await getJson<{ results?: { id: number; name: string }[] }>(
      '/search/keyword', { query: term, page: '1' }, signal);
    const match = (data.results ?? []).find((entry) =>
      Number.isSafeInteger(entry.id) && entry.id > 0 && normalize(entry.name) === normalize(term));
    return match ? { id: match.id, name: match.name, score } : null;
  }));
  const keywords = searches.flatMap((result) =>
    result.status === 'fulfilled' && result.value ? [result.value] : []);
  const distinctKeywords = [...new Map(keywords.map((k) => [k.id, k])).values()]
    .slice(0, MAX_DISCOVERED_KEYWORDS);

  const tasks: Promise<void>[] = distinctKeywords.map(({ id, name, score }) => (async () => {
    const data = await getJson<{ results?: Movie[] }>('/discover/movie', {
      include_adult: 'false', include_video: 'false',
      sort_by: 'vote_count.desc', 'vote_count.gte': '80',
      with_keywords: String(id), page: '1',
    }, signal);
    (data.results ?? []).forEach((movie) => consider(movie, score, `Keyword: ${name}`));
  })());

  // A second page for the top two theme keywords broadens candidates
  // beyond the same popular first-page TMDB titles. No extra requests for
  // unrelated profiles or unspecified keywords.
  if (theme.profile === 'emotional') {
    distinctKeywords.slice(0, 2).forEach(({ id, name, score }) => {
      tasks.push((async () => {
        const data = await getJson<{ results?: Movie[] }>('/discover/movie', {
          include_adult: 'false', include_video: 'false',
          sort_by: 'vote_count.desc', 'vote_count.gte': '80',
          with_keywords: String(id), page: '2',
        }, signal);
        (data.results ?? []).forEach((movie) => consider(movie, score, `Keyword: ${name}`));
      })());
    });
  }

  // Genre results provide a weaker second signal; never become a generic
  // popularity-only fallback when the theme can't be interpreted.
  if (theme.genres.length) {
    tasks.push((async () => {
      const data = await getJson<{ results?: Movie[] }>('/discover/movie', {
        include_adult: 'false', include_video: 'false',
        sort_by: 'vote_count.desc', 'vote_count.gte': '300',
        with_genres: theme.genres.join('|'), page: '1',
      }, signal);
      (data.results ?? []).forEach((movie) => consider(movie, 1, 'Related genre'));
    })());
  }

  // Broad family/animation matches crowded out live-action comfort films in
  // v2. These four targeted *read-only* discovery calls bring in more varied
  // candidates. Exclusions apply only to this comfort profile, not other themes.
  if (theme.profile === 'comfort') {
    for (const lane of COMFORT_DISCOVERY_LANES) {
      tasks.push((async () => {
        const data = await getJson<{ results?: Movie[] }>('/discover/movie', {
          include_adult: 'false', include_video: 'false',
          sort_by: 'vote_count.desc', 'vote_count.gte': '400',
          with_genres: lane.genres,
          without_genres: COMFORT_EXCLUDED_DISCOVERY_GENRES,
          page: '1',
        }, signal);
        (data.results ?? []).forEach((movie) => consider(movie, 1.5, `Genre match: ${lane.label}`));
      })());
    }
  }

  // Emotional themes deserve more than one keyword's first 20 results.
  // Genre-led candidates must still clear the emotional relevance threshold;
  // the extra routes never auto-accept a generic popular drama.
  if (theme.profile === 'emotional') {
    for (const lane of ['18,10749', '18,10751', '18,16']) {
      tasks.push((async () => {
        const data = await getJson<{ results?: Movie[] }>('/discover/movie', {
          include_adult: 'false', include_video: 'false',
          sort_by: 'vote_count.desc', 'vote_count.gte': '300',
          with_genres: lane, page: '1',
        }, signal);
        (data.results ?? []).forEach((movie) => consider(movie, 0.75, 'Related genre'));
      })());
    }
  }

  // Build on *up to six* well-spaced editorial selections rather than just
  // the first two. Legacy text-only entries are resolved temporarily through
  // TMDB; no selected movie, order, or saved catalogue is ever modified.
  const resolvedResults = await Promise.allSettled(
    examples.map((item) => resolveSelectedExample(item, signal)));
  if (signal?.aborted) throw new Error('Suggestion search cancelled.');
  const resolved = resolvedResults.flatMap((result) =>
    result.status === 'fulfilled' && result.value ? [result.value] : []);

  for (const seed of resolved) {
    tasks.push((async () => {
      const data = await getJson<{ results?: Movie[] }>(
        `/movie/${seed.movieId}/recommendations`, { page: '1' }, signal);
      (data.results ?? []).forEach((movie) =>
        consider(movie, 1.5, `Similar to ${seed.item.title}`));
    })());
  }

  // The theme remains the primary guide. Specific keywords observed in the
  // selected catalogue add a few bounded retrieval lanes, not a replacement
  // theme. For sports, these might be boxing, baseball and motor racing.
  const derivedKeywords = selectedKeywordLanes(resolved, theme.terms, sportsTheme);
  for (const keyword of derivedKeywords) {
    tasks.push((async () => {
      const data = await getJson<{ results?: Movie[] }>('/discover/movie', {
        include_adult: 'false', include_video: 'false',
        sort_by: 'vote_count.desc', 'vote_count.gte': '80',
        with_keywords: String(keyword.id), page: '1',
      }, signal);
      (data.results ?? []).forEach((movie) =>
        consider(movie, 2.3, `Selected keyword: ${keyword.name}`));
    })());
  }

  const settled = await Promise.allSettled(tasks);
  if (signal?.aborted) throw new Error('Suggestion search cancelled.');
  const succeeded = settled.some((entry) => entry.status === 'fulfilled');
  if (!succeeded && searches.every((entry) => entry.status === 'rejected')) {
    throw new Error('Could not contact TMDB. Check your connection and try again.');
  }
  if (tasks.length > 0 && !succeeded) {
    throw new Error('TMDB discovery is unavailable. Please try again.');
  }

  const maxResults = Math.max(0, Math.min(24, limit));
  const ranked = [...candidates.values()]
    .filter((candidate) => !sportsTheme || belongsToSportsTheme(candidate.movie, candidate.reasons))
    .map((candidate) => ({ candidate, score: rankCandidate(candidate, theme.profile) }))
    // Both subjective emotional profiles require evidence beyond one broad
    // keyword or a single genre. Other profiles remain discovery-friendly.
    .filter(({ score }) => {
      if (theme.profile === 'comfort') return score >= COMFORT_MIN_SCORE;
      if (theme.profile === 'emotional') return score >= EMOTIONAL_MIN_SCORE;
      return true;
    })
    .sort((a, b) => b.score - a.score || a.candidate.movie.id - b.candidate.movie.id);
  const suggestions = diversifySuggestions(
    withoutRelatedStories(ranked, selectedMovies), maxResults, theme.profile,
  ).map(({ candidate }) => ({
      item: toItem(candidate.movie),
      reason: reasonFor(candidate, theme.profile),
    }));

  return {
    suggestions,
    concepts: theme.concepts,
    keywords: distinctKeywords.map(({ name }) => name),
    selectionExamples: resolved.length,
    selectedCount: selectedMovies.length,
    note: !distinctKeywords.length && !theme.genres.length && !resolved.length
      ? 'No matching TMDB keywords found. Try a more descriptive title or use manual search.'
      : undefined,
  };
}
