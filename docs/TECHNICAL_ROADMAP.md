# Top3 Technical Roadmap

Version: 1.2
Status: Active
Owner: Jeremy Linskill
Last Updated: October 5, 2026
Last Verified Commit: `d70def4` — Separate dev Supabase infrastructure

## Purpose

Track significant engineering foundations, provider architecture, technical constraints, and post-launch infrastructure direction.

This document should remain concise.

Detailed implementation state belongs in `CURRENT_STATE.md`.

Long-term architectural principles belong in `ARCHITECTURE.md`.

Product sequencing belongs in `ROADMAP.md`.

## Current Technical Milestone

### Post-Launch Active Development

**Status**

Current focus

Top3 is live in Production.

Development and Production backend and analytics environments are now separated.
Routine local development, EAS development builds, test accounts, backend
changes, push testing, and analytics validation use Development rather than the
live Production environment.

The Development infrastructure separation is implemented and verified through
`d70def4` — Separate dev Supabase infrastructure.

The active `feature/create-flow-rework` branch contains ongoing Movie Themes,
Search, Discover, and creation-flow work that remains uncommitted and should not
yet be treated as completed product state.

Current engineering priorities are:

- complete and verify the active Movie Themes / Search / Discover work;
- keep routine backend development isolated to Development;
- avoid Production mutations unless performing an intentional promotion;
- verify environment-specific dependencies before any Production promotion;
- update feature documentation only after the current feature work is tested
  and committed.

## Search Providers

### Movies

**Provider**

TMDb

**Status**

Complete

**Application-facing integration**

`providers/movies-and-tv.ts`

**Current capabilities**

- search
- suggestions
- artwork
- ratings
- trailer lookup
- cached trailer availability
- in-app YouTube trailer playback

### TV Shows

**Provider**

TMDb

**Status**

Complete

**Application-facing integration**

`providers/movies-and-tv.ts`

**Current capabilities**

- search
- suggestions
- artwork
- ratings
- trailer lookup
- cached trailer availability
- in-app YouTube trailer playback

### Books

**Providers**

Google Books

Open Library fallback

**Status**

Complete

**Application-facing integration**

`providers/books.ts`

**Current capabilities**

- relevance-aware search
- edition deduplication
- fallback lookup
- curated suggestions
- book preview support

### Video Games

**Provider**

IGDB via Supabase Edge Function

**Status**

Complete

**Application-facing integration**

- `providers/video-games.ts`
- `lib/supabase/video-games.ts`

**Server-side integration**

`video-game-search`

**Notes**

- Server-side Twitch OAuth authentication
- Signed-out onboarding search supported through the app publishable key
- Prefix matching and relevance scoring
- Filtering of secondary content where possible
- Cover art, release year, and normalized ratings
- IGDB-specific terminology remains inside the integration layer

### Songs

**Provider**

Apple Music via Supabase Edge Function

**Status**

Complete

**Application-facing integration**

`providers/music.ts`

**Server-side integration**

`apple-music-search`

**Current capabilities**

- search
- genre-aware suggestions
- evergreen-oriented suggestion ranking
- artwork and artist metadata
- preview audio where available

### Albums

**Provider**

Apple Music via Supabase Edge Function

**Status**

Complete

**Application-facing integration**

`providers/music.ts`

**Current capabilities**

- album search
- square artwork
- representative-track previews
- evergreen-oriented suggestions

### Artists

**Provider**

Apple Music via Supabase Edge Function

**Status**

Complete

**Application-facing integration**

`providers/music.ts`

**Current capabilities**

- artist search
- canonical-result enrichment
- ranking and deduplication
- artwork and genre metadata
- representative-track previews

### Podcasts

**Providers**

Apple iTunes Search API

Apple iTunes Lookup API

Apple Podcasts chart feed

**Status**

Complete

**Application-facing integration**

`providers/podcasts.ts`

**Current capabilities**

- podcast search
- topic-aware matching
- popular podcast suggestions
- Apple Podcasts show URLs
- artwork and creator metadata
- recent playable episode lookup for audio previews

## Shared Search Architecture

**Status**

Complete

Current foundations:

- `providers/search.ts` category-to-provider registry
- domain-oriented provider naming
- shared debounced search behaviour
- provider-specific relevance ranking
- provider-specific fallback handling
- provider-specific deduplication
- active-session caching where implemented
- `Top3Item` normalization across providers

Search-quality logic should remain inside providers rather than accumulate in screen components.

## Category Architecture

**Status**

Complete

`constants/top3-categories.ts` is the application-level source of truth for supported categories and topics.

Onboarding derives its categories from `TOP3_CATEGORIES` and sorts them alphabetically for presentation.

Category artwork dimensions are centralized in:

`constants/category-artwork-rules.ts`

Current artwork rules:

- Movies — 64 × 96
- TV Shows — 64 × 96
- Books — 64 × 96
- Video Games — 64 × 96
- Songs — 64 × 64
- Albums — 64 × 64
- Artists — 64 × 64
- Podcasts — 64 × 64

## Theme Architecture

### System-Aware Light / Dark Mode

**Status**

Complete

Current foundation:

- `hooks/use-app-colors.ts`
- `components/app-text.tsx`
- `app.json` with automatic device appearance support

Application screens should use semantic colour and text roles instead of maintaining separate light / dark implementations.

### Preview Theme Inversion

**Status**

Complete

Current foundation:

`hooks/use-preview-sheet-colors.ts`

Book, trailer, and audio preview sheets intentionally invert the application theme:

```text
Light app → Dark preview
Dark app  → Light preview
```

Trailer video itself remains black.

## Media Preview Architecture

### Audio

**Status**

Complete

Current foundation:

- `context/audio-preview-context.tsx`
- `components/audio-preview-sheet.tsx`

Supports:

- Apple Music previews
- Apple Podcasts episode previews
- one active audio preview at a time
- provider-aware external destinations
- shared inverted preview presentation

Do not introduce independent card-level audio players.

### Movie / TV Trailers

**Status**

Complete

Current foundation:

- TMDb video lookup in `providers/movies-and-tv.ts`
- cached trailer availability
- in-app WebView playback
- shared playback coordination with audio previews

### Books

**Status**

Complete

Book preview presentation participates in the shared inverted preview-theme architecture.

## Environment Architecture

Top3 uses separate Development and Production runtime environments.

Development is the normal target for:

- local application development;
- EAS development builds;
- Supabase CLI database work;
- test users and authentication;
- Storage testing;
- Edge Function development;
- push-notification testing;
- Amplitude development analytics.

Production remains isolated for live users and intentional release operations.

Application code, migrations, and Edge Function source are shared, but URLs,
keys, secrets, Auth configuration, Storage state, Vault values, push
credentials, and analytics configuration remain environment-specific.

Privileged credentials must never be exposed through `EXPO_PUBLIC_*` variables.

A successful Development change is not automatically ready for Production.
Production changes require deliberate promotion after environment-specific
dependencies have been verified.

## Backend

### Authentication

**Status**

Complete

Supported:

- Email
- Sign in with Apple
- Google Sign-In
- persistent Supabase sessions
- email confirmation
- password recovery
- returning-user routing
- signed-out first-List onboarding
- authentication at the publish boundary

Development and Production use separate Supabase Auth stores and
environment-specific provider configuration. Development testing must not reuse
Production users, sessions, Apple refresh tokens, or private Apple signing
credentials.

### Sign in with Apple Account Lifecycle

**Status**

Complete

Current server-side foundation:

- `apple-auth-token` Edge Function
- protected Apple refresh-token persistence
- server-side client-secret generation
- Apple authorization revocation before permanent account deletion

Apple signing credentials remain server-side.

### Profiles

**Status**

Complete

Includes:

- profile persistence
- avatar storage
- public / private accounts
- profile editing
- blocked-user handling
- prohibited-content filtering on supported profile fields

### Lists / Collections

**Status**

Complete

Includes:

- drafts
- signed-out onboarding collection state
- pending publish
- authenticated persistence
- publishing
- editing
- sharing
- moderation removal handling

User-facing terminology is **List**.

The persisted implementation continues to use `Collection`.

### Likes

**Status**

Complete

Includes:

- persistence
- optimistic updates
- Realtime synchronization
- repeat unlike → relike notification behaviour

### Comments

**Status**

Complete

Includes:

- persistence
- deletion
- Realtime synchronization
- shared CommentsSheet
- prohibited-content filtering

### Following

**Status**

Complete

Includes:

- public follows
- private-account follow requests
- accept / decline
- repeat request behaviour
- Realtime synchronization
- blocked-user filtering

### Notifications

**Status**

Complete

Includes:

- Likes
- Comments
- Follows
- Follow requests
- Follow-request acceptance
- read / unread state
- Realtime synchronization

### Push Notifications

**Status**

Complete for current scope

Development architecture:

    public.notifications INSERT
            ↓
    Postgres trigger
            ↓
    Supabase Vault
    project_url + push_notification_webhook
            ↓
    pg_net
            ↓
    send-push-notification Edge Function
            ↓
    Expo Push Service
            ↓
    Registered device

The Development trigger is defined by
`20261003161535_add_push_notification_webhook.sql`.

The trigger resolves the project URL and dedicated webhook credential from
Vault rather than embedding Production-specific values in the migration.

`send-push-notification` uses `verify_jwt = false` for the database-triggered
request path and validates the dedicated named `push_notification_webhook`
secret inside the function.

Production retains its established push configuration until this architecture
is intentionally promoted.

Before applying the migration to Production, compatible Production
`project_url` and `push_notification_webhook` Vault values and Edge Function
configuration must already be in place.

Current push events:

- Likes
- Comments
- Follows

Push-token lifecycle includes:

- authenticated registration
- device/account reassignment
- sign-out cleanup
- Settings disable cleanup
- app-resume state refresh

### Storage

**Status**

Complete

Used for persistent profile avatars.

### Realtime Updates

**Status**

Complete for current V1 scope

Implemented for:

- Likes
- Comments
- Following
- Notifications
- creator-scoped moderation removals

Realtime subscriptions should remain as narrowly scoped as practical.

## Moderation & Safety

**Status**

Complete for V1 foundation

Current infrastructure includes:

- reporting
- blocking
- prohibited-content filtering
- moderation removal
- removed-content filtering
- creator-scoped Realtime removal propagation
- shared Top3 ActionSheet presentation for expected moderation errors

Server-side enforcement remains authoritative for supported prohibited free-form content.

## Sharing & Deep Links

**Status**

V1 foundation complete

Current behaviour:

- published List sharing
- Overall ranking sharing
- custom `top3://` deep links
- signed-out read access to public published, non-removed Lists

Post-launch work:

- Universal Links
- public HTTPS web fallback for recipients without Top3 installed

The production domain is already established at `top3taste.com`.

## Analytics

**Status**

V1 foundation complete with Development / Production isolation

Amplitude is the current product analytics platform.

Development and QA activity is sent to the dedicated Top3 - Dev Amplitude
project. Production analytics remain isolated for live Production usage.

Current tracking includes major onboarding, creation, publishing, discovery,
social, Taste Match, notification, and sharing events.

Development account deletion uses environment-specific
`AMPLITUDE_DELETE_FROM_ORG=False` behaviour so test-account cleanup does not
perform organization-wide Amplitude deletion.

New events should be added in response to real product questions rather than
speculatively.

## Feed Architecture

### Current V1

**Status**

Accepted for launch

The current Feed:

- retrieves the published-post corpus
- hydrates metadata where required
- builds followed-user and Taste Match recommendation logic client-side

This is acceptable for initial low-volume V1 validation.

### Existing Database Foundation

`collections_published_feed_idx`

supports future published, non-removed Feed queries using:

- `published_at DESC`
- `user_id`
- `id`

### Post-Launch Target

Replace the current architecture with:

- cursor-paginated Feed delivery
- server/database-generated Feed pages
- bounded Taste Match recommendation candidate generation
- server-side followed-user selection
- render-ready persisted metadata where practical
- less view-time external-provider hydration
- targeted Realtime propagation

This is an intentional post-launch migration, not a forgotten blocker.

## Infrastructure Goals

### Completed

- Configuration-driven categories ✅
- Shared category registry ✅
- Shared search provider registry ✅
- Domain-oriented provider abstraction ✅
- Supabase Edge Functions ✅
- Reusable search debounce architecture ✅
- Realtime synchronization ✅
- Shared semantic light / dark theme ✅
- Shared semantic text layer ✅
- Inverted preview theme architecture ✅
- Shared audio-preview architecture ✅
- Push notification architecture ✅
- Apple account-lifecycle infrastructure ✅
- Moderation-removal Realtime propagation ✅
- V1 analytics foundation ✅
- Database index foundation for future Feed pagination ✅
- Separate Development and Production Supabase environments ✅
- Separate Development and Production Amplitude environments ✅
- Development-specific Auth, Storage, Edge Function, and secret configuration ✅
- Vault-backed environment-neutral Development push delivery ✅
- Safe environment-variable template via `.env.example` ✅

### Active / Ongoing

- complete and verify Movie Themes / Search / Discover work
- maintain Development / Production configuration parity where required
- provider resiliency
- search relevance
- performance optimization
- documentation accuracy
- intentional Production promotion discipline

### Post-Launch

- formal Development → Production promotion runbook / tooling
- cursor-paginated server-generated Feed
- bounded server-side recommendation candidate generation
- Universal Links / public web share fallback
- additional provider fallbacks where valuable
- reduce required view-time metadata hydration
- evaluate precomputed Taste Match relationships as usage grows

## Engineering Principles

For each significant change:

1. confirm the intended environment before any backend mutation;
2. inspect the current architecture;
3. identify the actual source of truth;
4. modify as few files as practical;
5. prefer shared abstractions over duplicated behaviour;
6. run `npm run typecheck`;
7. run provider / Edge Function validation where required;
8. test end-to-end on a physical device where relevant;
9. commit a coherent vertical slice;
10. push the verified checkpoint;
11. update documentation when application state materially changes.

Do not prematurely rebuild working V1 systems solely for hypothetical scale.

Do flag architecture that depends on unbounded global reads, global Realtime fan-out, or repeated view-time external-provider hydration before extending those patterns.
