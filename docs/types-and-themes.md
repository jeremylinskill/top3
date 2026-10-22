# Top 3 — Types and Themes Guidelines

## Purpose

Establish consistent definitions for Genres, Topics, Types and Themes
across all Top 3 categories.

These guidelines should inform both content development and the
user experience.

## Types

**Definition:** Specific kinds of things or people to rank, defined
by an identifiable format, role or classification.

**Guiding question:** What or who are you ranking?

### Examples

| Category | Types |
| --- | --- |
| Movies | Actors, Directors |
| TV Shows | Limited Series, Anthology Series, Animated Series, Reality Competition Shows |
| Books | Novels, Short Story Collections, Graphic Novels |
| Video Games | Single-Player Games, Multiplayer Games, Indie Games, Remakes |
| Albums | Soundtracks, Compilations, Live Albums |
| Artists | Vocalists, Guitarists, Drummers, Bassists, DJs, MCs |
| Songs | Duets, Cover Songs, Instrumentals |

### Guidelines

- Types should describe recognizable, reasonably objective classifications.
- They can narrow the existing category or change the kind of person or thing being ranked.
- They should be distinct from Genres and Topics wherever possible.
- Search functionality must support the entity being ranked.
- If a Type requires filtering, the app must be able to identify suitable results reliably.

## Themes

**Definition:** Creative ranking prompts based on feelings, experiences,
situations or personal opinions.

**Guiding question:** What's the idea behind your ranking?

### Examples

| Category | Themes |
| --- | --- |
| Movies | Movies I Can Watch Over and Over, Underrated Movies, Movies That Made Me Cry |
| TV Shows | Comfort Shows, Shows I Wish Had Another Season, Most Underrated Shows |
| Books | Books That Changed My Perspective, Books I Couldn't Put Down, Childhood Favourites |
| Video Games | Games I Couldn't Put Down, Games Worth Replaying, Games That Defined My Childhood |
| Albums | No-Skip Albums, Most Underrated Albums, Albums That Changed My Life, Best Album Artwork |
| Artists | Artists Who Changed My Taste in Music, Most Underrated Artists |
| Songs | Songs That Remind Me of Summer, Songs That Give Me Goosebumps, Songs I Never Skip |

### Guidelines

- Themes should encourage personal opinions, memories or experiences.
- They should make ranking more interesting and encourage discovery or conversation.
- They do not need to be objectively verifiable.
- They should describe a clear idea that someone can apply to three favourites.
- A Theme should give someone a meaningful reason to choose three different items than they would for their Overall Top 3.
- The prompt must introduce distinct selection criteria; the actual ranked items may still overlap with an Overall list.
- Avoid Themes that merely rephrase "favourites", "best of all time", or "essential picks" without adding a new perspective.
- Subjective Themes should not require objective provider filtering or imply that suggested items are definitively correct.
- Target 15 curated, searchable suggestions per Theme, with five initially displayed and the ability to explore more.
- Suggestions provide inspiration, not authoritative or automatically ranked picks.
- Featured Themes combine editorial defaults with eligible Trending Themes.
- Trending eligibility is category-specific and requires three unique creators publishing eligible Lists within 30 days.
- A single qualifying Theme can enter Featured; multiple qualifying Themes are not required.
- Rank using distinct creators over 30 days, then distinct creators within seven days.
- Repeated Lists by one creator must not improve a Theme's ranking.
- Use the active, Trending-enabled server-driven Theme catalogue.
- When publishing activity is insufficient, editorial choices fill Featured positions.
- Every active Theme remains available through Browse.

## Classification Framework

| Classification | Guiding question |
| --- | --- |
| Genre | What style does it belong to? |
| Topic | What subject is it about? |
| Type | What kind of thing or person is being ranked? |
| Theme | What personal idea or experience shapes the ranking? |

## Content Principles

- Avoid unnecessary overlap between Genres, Topics, Types and Themes.
- Use straightforward, recognizable language.
- Make each option specific enough to inspire a meaningful Top 3 list.
- Prioritize quality and variety over quantity.
- Ensure Types can be supported by appropriate search results or reliable classifications.
- Use Themes to encourage personal expression and conversation.
- Apply the same definitions consistently across all categories.
- Treat example options as candidates until their search and filtering behaviour is verified.

## Shared In-App Card and Selection Screen Subtitles

### Types

Choose what or who to rank.

### Themes

Rank around an idea or experience.

### Consistency rule

The By type and By theme selection screens must display the
same instructional subtitles as their corresponding Create
cards, across every supported category.

Use one shared text value per selection mode rather than
maintaining category-specific copies.

Category-specific controls may use contextual terminology,
such as Genres, Formats, People, or Types.

### Song Types — initial four

- Acoustic Versions
- Duets & Collaborations
- Live Performances
- Remixes

Each Type starts with 15 curated Apple Music search prompts,
with five initially displayed and available for shuffling.

Live Performances, Acoustic Versions and Remixes use
conservative title/album evidence in the Apple Music Edge
Function before the final result limit.

Duets & Collaborations uses curated discovery and unrestricted
Apple Music search because artist credits are not a reliable
exclusion filter.

Cover Songs and Instrumentals are deferred.

### Song Type suggestion display convention

Song Type suggestions use the existing Top 3 single-line
chips, without artist names or separate artist subtitles.

For curated Song Type suggestions:

- `item.title` is both the visible chip label and search text.
- Recording versions include their identifying qualifier,
  such as `Everlong (Acoustic)` or `Layla (Unplugged)`.
- Collaborations generally use the song title alone.
- There is no hidden `searchQuery` override.
- Actual recording matches must be verified in Development.

### Song Type suggestion quality audit

Before release, validate curated Song Type suggestions in
batches against the Development Apple Music search function.

The initial automated audit checked 60 Song Type suggestions.
The first pass found 45 matching expected song/artist pairs,
14 results requiring review, and one empty result set.

A follow-up candidate audit identified replacements. Sixteen
suggestions were refined, including Everlong (Acoustic Version).

Use one matching chip/search title, with no artist subtitle or
hidden search-query substitution. Matching an artist alone does
not prove the correct acoustic/live recording or specific remix.


### Manual suggestion administration

Suggestion titles can be edited directly in the Supabase
Table Editor using public.collection_option_suggestions.

- Filter by option_id to find a Type or Theme.
- Edit suggestion_title, display_order or active.
- suggestion_title automatically synchronizes with item.title.
- Keep item_id stable when changing a suggestion title.
- The app continues reading item.title.
- No app build or Edge Function deployment is required.

Manual Development edits are not automatically captured
by Git migrations. Export and reconcile finalized suggestion
values before deploying to Production.

### Song Themes — initial nine

Song Themes are subjective prompts intended to encourage
different rankings from a user's Overall Top 3 Songs.

- Songs That Defined My Youth
- Songs That Remind Me of Someone
- Songs That Got Me Through Tough Times
- Songs That Always Lift My Mood
- Songs That Give Me Goosebumps
- Most Underrated Songs
- Best Sing-Along Songs
- Perfect Road Trip Songs
- Songs with the Best Lyrics

All nine Themes are active and Trending-enabled.
Five are editorially Featured initially: Defined My Youth,
Remind Me of Someone, Always Lift My Mood, Most Underrated,
and Best Lyrics.

Each Theme has 15 curated suggestions, five initially shown,
with shuffling. Suggestion chips show song titles only and
use identical text for search.

Song Theme search is unrestricted; users decide which
recordings fit the selected Theme. These Themes do not apply
the recording-version filters used by Song Types.

The existing editable suggestion_title column supports
manual adjustments in the Development Supabase Table Editor.
