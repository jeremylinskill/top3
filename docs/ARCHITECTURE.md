# Top3 Architecture

Version: 1.3
Status: Active
Owner: Jeremy Linskill
Last Updated: September 16, 2026

## Purpose

This document describes the long-term architectural principles that shape Top3.

Unlike `CURRENT_STATE.md`, which captures the application's implementation today, this document explains why the application is structured the way it is and the architectural rules that should remain stable as the product evolves.

## Architectural Philosophy

Top3 is a social platform built around one central idea:

**Lists are the primary product object.**

Users do not create generic posts.

They create thoughtfully curated Top 3 lists.

Internally, the existing persisted domain model continues to use `Collection` terminology in types, database structures, helpers, and filenames. User-facing product language should use **List** unless an intentional architectural migration changes the internal model.

Everything else in the application—Feed, recommendations, discovery, community rankings, likes, comments, following, notifications, and Taste Match—exists because published lists exist.

The architecture intentionally reinforces thoughtful curation over continuous content creation.

## Core Domain Model

```text
User
   │
   ▼
Collection (Draft)
   │
   ▼
Publish
   │
   ▼
Collection (Published)
   │
   ├── Feed
   ├── Discover
   ├── Profiles
   ├── Community Top3
   ├── Overall Top3
   ├── Taste Match
   ├── Recommendations
   ├── Likes
   ├── Comments
   ├── Following
   └── Notifications
```

Published collections are the source of truth for nearly every social experience.

A feed post is therefore a presentation of a published collection, not a separate persisted content type.

## Architectural Principles

### Lists / Collections are Primary

Lists are the primary product object.

Collections are the current persisted implementation of that object.

Collections exist independently of the Feed.

Publishing changes visibility and community participation—not the identity of the underlying collection.

### Feed Posts are Projections

Feed posts are UI representations of published collections.

The Feed should never become an independent content model.

The application may build different Feed projections—chronological, followed-user, recommended, or future server-generated pages—but those projections must continue to reference published collection identity.

### One Source of Truth

Every important piece of information should have a single authoritative owner.

Examples:

Authentication → Supabase Auth

Profiles → `profiles`

Collections → `collections`

Likes → `likes`

Comments → `comments`

Following → `follows` and `follow_requests`

Notifications → `notifications`

Push-token registrations → `push_tokens`

Apple account-lifecycle tokens → `apple_auth_tokens`

Moderation-removal events → `moderation_content_removals`

Server-side prohibited-content vocabulary → `content_filter_terms`

Category definitions and topics → `constants/top3-categories.ts`

Category artwork dimensions → `constants/category-artwork-rules.ts`

Application semantic colours → `hooks/use-app-colors.ts`

Shared semantic text presentation → `components/app-text.tsx`

Preview-sheet theme inversion → `hooks/use-preview-sheet-colors.ts`

### Domain-Oriented Provider Abstraction

Application-facing provider modules should be named for the Top3 content domain they serve rather than the external API currently supplying the data.

Current provider layer:

```text
providers/books.ts
providers/movies-and-tv.ts
providers/music.ts
providers/podcasts.ts
providers/video-games.ts
providers/search.ts
```

External-provider terminology should remain inside integration code where it accurately describes the underlying service.

Examples:

- Books are exposed to the application through `providers/books.ts`, while Google Books and Open Library remain implementation details.

- Movies and TV Shows are exposed through `providers/movies-and-tv.ts`, while TMDB-specific types, video lookup, and requests remain inside that implementation.

- Albums, Artists, and Songs are exposed through `providers/music.ts`, while Apple Music-specific communication remains in `lib/supabase/apple-music.ts` and the `apple-music-search` Edge Function.

- Podcasts are exposed through `providers/podcasts.ts`, while Apple's iTunes Search / Lookup APIs and Apple Podcasts chart feed remain implementation details.

- Video Games are exposed through `providers/video-games.ts` and `lib/supabase/video-games.ts`, while IGDB and Twitch OAuth remain implementation details inside the `video-game-search` Edge Function.

This separation allows Top3 to replace or supplement metadata providers without forcing provider-specific naming throughout the application.

### Category Registry is Authoritative

`constants/top3-categories.ts` is the application-level source of truth for supported categories and topics.

Screens and flows should derive category availability from that registry rather than maintain independent category lists.

In particular:

- Create uses the shared category registry.
- Onboarding derives its categories from `TOP3_CATEGORIES`.
- Onboarding sorts those categories alphabetically at presentation time.
- Adding a category should not require a second manually maintained onboarding category-order list.

Category-specific behaviour that cannot be represented by the registry should live in a clearly named domain helper rather than duplicated screen logic.

### Shared Presentation Before Screen-Specific UI

Reusable components should become the default solution whenever the same visual pattern appears in more than one place.

Examples include:

- `AppText`
- `ScreenHeader`
- `PageHeader`
- `Chip`
- `PrimaryButton`
- `AuthProviderButton`
- `GoogleAuthButton`
- `EmailAuthButton`
- `DiscoverListCard`
- `RankedItemCard`
- `Top3Card`
- `CommentsSheet`
- `CollectionForm`

Search-result cards and Discover suggestion cards should share presentation components when their product role is the same. Visual differences should be intentional product decisions, not duplicated screen-local styling.

### Semantic Theme Architecture

Light and dark appearance should be semantic rather than screen-specific.

`hooks/use-app-colors.ts` owns application colour roles.

`components/app-text.tsx` owns shared semantic text roles.

Screens and shared components should consume semantic roles instead of reintroducing legacy global colour constants or isolated hard-coded text colours.

The application follows the device appearance automatically.

A small number of exact black / white literals may remain where they are part of a deliberate native splash bridge or media presentation rather than ordinary application theming.

### Preview Themes are Intentionally Inverted

Book, trailer, and audio preview sheets intentionally use the opposite visual theme from the surrounding application:

```text
App Light → Preview Dark
App Dark  → Preview Light
```

`hooks/use-preview-sheet-colors.ts` is the shared owner of that inversion.

This is an intentional product treatment, not a dark-mode inconsistency.

Trailer video itself remains black.

### Media Playback is Coordinated

Audio and trailer playback are separate media implementations but must behave as one coordinated application system.

`AudioPreviewProvider` owns shared Apple Music and Apple Podcasts audio-preview state.

`context/audio-preview-context.tsx` is the shared audio controller.

`components/audio-preview-sheet.tsx` is the shared Apple Music / Apple Podcasts preview presentation.

Movie and TV trailers remain owned by the Movies & TV provider and trailer preview UI.

Shared media coordination must prevent conflicting previews from playing simultaneously.

Do not introduce independent Expo Audio players or unrelated media state inside individual cards or screens.

### Progressive Enhancement

Prototype locally when appropriate.

Move functionality to Supabase once the behaviour is validated and shared persistence is required.

This approach allows rapid iteration without compromising long-term architecture.

### Scalability is a Standing Requirement

New architecture must be evaluated for large-user and large-content-volume behaviour.

Avoid introducing patterns that depend on:

- unbounded global reads;
- client-side processing of the complete global dataset;
- global Realtime fan-out when user-scoped subscriptions are possible;
- repeated view-time metadata hydration from external providers;
- duplicated provider requests that could be cached or persisted.

The current V1 Feed is a deliberate temporary exception: it retrieves the published-post corpus and builds personalization client-side for initial low-volume launch validation.

The intended post-launch Feed architecture is cursor-paginated and server-generated, returning only bounded pages of ready-to-render entries.

Taste Match recommendation candidate generation must also become bounded and server-side as usage grows.

## Application Architecture

```text
                         External Metadata Providers

 TMDB • Google Books • Open Library • Apple Music • Apple Podcasts • IGDB
                                  │
                                  ▼
                            Integration Layer

        Direct metadata requests + Supabase Edge Functions + OAuth
                                  │
                                  ▼
                              Provider Layer

          Books • Movies & TV • Music • Podcasts • Video Games
                                  │
                                  ▼
                             Search Registry

                         providers/search.ts
                                  │
                                  ▼
                         Service / Backend Layer

 Supabase Auth • Postgres • Storage • Realtime • Edge Functions • Push
                                  │
                                  ▼
                            Context Providers

 Auth • Onboarding Collection • Profile • Notifications • Follow • Like
             • Comment • Top3 • Audio Preview
                                  │
                                  ▼
                          Presentation Components

 AppText • ScreenHeader • PageHeader • Chip • PrimaryButton • Auth Buttons
 DiscoverListCard • RankedItemCard • Top3Card • CollectionForm • CommentsSheet
                   • Book / Trailer / Audio Preview Sheets
                                  │
                                  ▼
                                Screens

 Feed • Discover • Search • Create / Collection • Profile • Community
         Onboarding • Taste Match • Notifications • Authentication
                                  │
                                  ▼
                              Expo Router
```

Each layer owns a clear responsibility.

Provider-specific concerns should not leak unnecessarily into application-facing modules or UI.

Presentation components should not become alternate data-access layers.

## External Provider Paths

```text
Books
providers/books.ts
   ├── Google Books
   └── Open Library fallback

Movies & TV
providers/movies-and-tv.ts
   ├── TMDB metadata
   └── TMDB video lookup → YouTube trailer embed

Songs / Albums / Artists
providers/music.ts
   └── lib/supabase/apple-music.ts
       └── Supabase Edge Function: apple-music-search
           └── Apple Music

Podcasts
providers/podcasts.ts
   ├── Apple iTunes Search API
   ├── Apple iTunes Lookup API
   └── Apple Podcasts chart feed

Video Games
providers/video-games.ts
   └── lib/supabase/video-games.ts
       └── Supabase Edge Function: video-game-search
           └── IGDB + Twitch OAuth
```

The Video Games Edge Function supports signed-out onboarding search through the app's publishable key while keeping Twitch credentials and the IGDB client secret server-side.

Apple Music credentials remain server-side behind `apple-music-search`.

The Podcasts provider currently uses Apple's public search / lookup and chart endpoints directly and normalizes those results into `Top3Item`.

## Backend & Edge Function Boundaries

Supabase Edge Functions are used when server-side credentials, account-lifecycle authority, or trusted backend actions are required.

Current architectural examples include:

```text
apple-music-search
    Apple Music developer-token generation and search

video-game-search
    IGDB access + Twitch OAuth

send-push-notification
    Trusted push delivery from database notification events

apple-auth-token
    Sign in with Apple authorization-code exchange and refresh-token storage

delete-account
    Permanent account deletion and Apple authorization revocation where required
```

Secrets must remain in server-side configuration and must never be moved into the mobile application for convenience.

## Layer Responsibilities

### Integration & Service Layer

Responsible for:

- Supabase reads and writes
- Supabase Auth
- Supabase Edge Function communication
- external metadata providers
- provider-specific authentication
- push-token registration and cleanup
- data mapping
- hydration
- network concerns
- Realtime subscriptions
- account-lifecycle operations

UI should never communicate directly with persistence or external APIs when an established provider or service abstraction exists.

### Provider Layer

Responsible for:

- presenting domain-oriented search interfaces to the application;
- hiding external-provider implementation details;
- coordinating primary and fallback metadata sources;
- provider-specific retry, ranking, deduplication, and fallback logic;
- normalizing external results into `Top3Item`.

The shared `providers/search.ts` registry routes Top3 categories to the appropriate domain provider.

Provider-specific search quality should remain inside the relevant provider rather than accumulate in screen code.

### Context Layer

Responsible for:

- shared application state;
- optimistic updates;
- cross-screen business logic;
- session-aware behaviour;
- coordinating persistence and Realtime updates;
- cross-surface media playback state.

Current application-level context responsibilities include:

- authentication;
- signed-out onboarding collection state and authentication intent;
- current profile;
- follows and follow requests;
- likes;
- comments;
- notifications;
- lists / collections;
- audio preview playback.

Providers and contexts should coordinate data, not render UI.

### Presentation Layer

Responsible for reusable UI building blocks and semantic presentation.

Current foundation:

**Layout**

- ScreenHeader
- PageHeader

**Typography & theme**

- AppText
- `useAppColors()`
- `usePreviewSheetColors()`

**Controls**

- Chip
- PrimaryButton
- AuthProviderButton
- GoogleAuthButton
- EmailAuthButton

**Content**

- DiscoverListCard
- RankedItemCard
- Top3Card
- CommentsSheet
- SearchInput
- TasteMatchBadge
- UserAvatar

**Forms**

- CollectionForm
- EmailSignUpForm
- EmailSignInForm

**Preview presentation**

- Book preview sheet
- Trailer preview sheet
- Audio preview sheet

Reusable components should become the default solution whenever duplication appears.

### Screen Layer

Screens compose reusable components into complete user experiences.

Screens should contain minimal business logic.

Screen-local code should primarily coordinate route state, user interaction, and composition.

## Persistence Strategy

### Supabase

System of record for:

- Authentication
- Profiles
- Collections
- Likes
- Comments
- Following
- Follow requests
- Notifications
- Push-token registrations
- Storage-backed profile assets
- Apple refresh tokens used for account lifecycle
- Moderation-removal events
- Prohibited-content filtering terms

Supabase Realtime synchronizes social data where Realtime behaviour has been implemented, including Likes, Comments, Following, Notifications, and creator-scoped moderation removals.

Realtime subscriptions should be user-scoped or relationship-scoped whenever possible.

`moderation_content_removals` is intentionally protected by Row Level Security and subscribed to with a server-side user filter so creators receive only their own removal events.

### AsyncStorage

Reserved for local-only or device-specific state such as:

- draft workflow;
- onboarding collection state;
- pending onboarding publish / authentication intent;
- recent searches;
- UI preferences;
- temporary prototype features.

Persistent shared product data should move to Supabase once its behaviour and data model are established.

AsyncStorage should not become a parallel source of truth for server-owned data.

## Authentication & Account Lifecycle

Authentication is implemented through the shared authentication service and Supabase Auth.

Email, Apple, and Google are presentation choices around one shared account model.

Provider-choice screens use shared button components for consistent light- and dark-mode presentation; the visual component does not own provider authentication logic.

### Email

Email account confirmation uses the production `top3taste.com` HTTPS bridge before returning to the app's auth callback.

The application preserves any signed-out onboarding collection through the authentication handoff and publishes it after a valid session is established.

Password recovery remains a separate recovery-session path.

### Sign in with Apple

Native iOS Apple authentication remains the provider implementation.

After successful Apple authentication, the authorization code is sent to the `apple-auth-token` Edge Function so the server can exchange it for an Apple refresh token.

Apple private-key material and client-secret generation remain server-side.

Permanent account deletion uses the `delete-account` Edge Function. When an Apple refresh token exists, Apple's authorization is revoked before the Supabase Auth user is deleted.

Account deletion must fail safely rather than silently deleting the local account while leaving an Apple authorization active.

### Google

Native Google account selection remains the provider implementation.

The app exchanges the provider identity token with Supabase Auth.

Google client secrets remain server-side.

## Product Flow

```text
Create List
   │
   ▼
Collection Draft
   │
   ▼
Publish Boundary
   │
   ├── Authenticated → Publish
   │
   └── Signed out → Authenticate → Publish pending collection
   │
   ▼
Published Collection
   │
   ▼
Community Discovery
   │
   ├── Likes
   ├── Comments
   ├── Following
   ├── Notifications
   └── Taste Match
          │
          ▼
 Recommendations & Discovery
```

Publishing is the gateway to community participation.

For signed-out users, onboarding can begin with list creation before authentication.

Authentication is required when the user reaches the publish boundary, preserving the collection while the user creates an account or signs in.

After the first publish, onboarding explains the relationship between individual Lists and community Overall rankings, then introduces Taste Match.

Onboarding category choices are derived from `TOP3_CATEGORIES`; the onboarding screen owns only presentation order and layout, not a separate category registry.

## Media Preview Architecture

### Audio

`AudioPreviewProvider` owns application-wide audio-preview state.

Apple Music items carry or resolve track preview URLs.

Apple Podcasts items resolve episode audio through `providers/podcasts.ts` when preview playback is requested.

`components/audio-preview-sheet.tsx` presents both providers and chooses provider-specific external destinations and labels.

Only one audio preview may play at a time.

### Trailers

Movie and TV trailer lookup belongs to `providers/movies-and-tv.ts`.

Trailer availability is checked before exposing trailer controls.

Playback uses the in-app WebView trailer experience rather than handing the user to an external YouTube app.

### Cross-Media Coordination

Starting one media experience should stop conflicting media playback.

Cards and screens should delegate playback to the shared media architecture rather than create their own players.

### Preview Presentation Theme

Book, trailer, and audio preview sheets use `usePreviewSheetColors()` and intentionally invert the surrounding application theme.

That inversion is part of the product design and should remain centralized.

## Design System Architecture

The design system is a core architectural layer rather than a collection of isolated components.

Application UI hierarchy:

```text
Semantic colour + typography
        │
        ├── useAppColors
        └── AppText
                │
                ▼
           ScreenHeader
                │
                ▼
            PageHeader
                │
                ▼
              Section
                │
                ▼
      Chip / Card / Button / List Card
                │
                ▼
              Content
```

`AppText` should be preferred for semantic application text.

`useAppColors()` should be preferred for application colour roles.

Shared components should own common spacing, type hierarchy, dark-mode behaviour, and interaction treatment where appropriate.

New screens should assemble existing components before introducing new ones.

Preview-sheet theming is intentionally separate from normal application theming and is owned by `usePreviewSheetColors()`.

## Discover Architecture

Discover is a presentation and aggregation layer over published collection data.

Category and topic / genre navigation should resolve back to the same published collection source of truth rather than create a second Discover-specific content model.

`DiscoverListCard` is the shared presentation for category and genre list rows used by both suggestion / trending sections and search results.

Search-result matching may evolve, but category and topic identity should remain grounded in the shared category registry and published collection data.

## Moderation & Safety Architecture

Client presentation is not the authoritative enforcement layer for prohibited free-form content.

Server-side filtering uses shared database-backed terms and normalized matching.

Blocking, reporting, and moderation removal remain separate mechanisms with distinct purposes.

Creator-side moderation removal propagation uses `moderation_content_removals` as a user-scoped Realtime event source rather than requiring the app to reload the complete collection dataset.

Expected moderation rejection should use the shared Top3 ActionSheet presentation rather than native alerts or development error overlays.

## Notifications & Push Architecture

Notification rows in Supabase are the authoritative event records for in-app notification state.

Push delivery is a consequence of those notification events, not a parallel client-generated notification model.

Database notification inserts trigger the trusted `send-push-notification` Edge Function through the configured Database Webhook.

The mobile client is responsible for push-token registration, reassignment, cleanup, and tap routing—not for independently generating social push events.

Historical notification rows must not permanently suppress legitimate future relikes or refollows.

## Feed Scalability Direction

The V1 Feed currently uses a client-generated architecture suitable for initial low-volume launch validation.

That implementation is not the intended large-scale design.

The target architecture is:

```text
Client
   │
   ▼
Cursor request
   │
   ▼
Server / database Feed generation
   │
   ├── followed-user entries
   ├── current-user entries
   └── bounded recommendation candidates
   │
   ▼
Small page of render-ready Feed entries
```

The client should not eventually need to download the global published-post dataset to construct the Feed.

Recommendation candidate generation must be bounded.

Persisted collection items should contain the metadata needed to render normal Feed rows wherever practical.

External metadata hydration may remain a repair / compatibility path, but it should not become a required view-time dependency at scale.

Realtime architecture should similarly avoid global subscriptions when user-scoped event sources can satisfy the product need.

## Architectural Decisions

- Lists remain the primary user-facing product object; `Collection` remains the current internal persisted domain model.

- Published collections drive community experiences.

- Feed posts are projections of published collections rather than independent persisted posts.

- Likes and comments reference `collection.id`, not synthetic Feed identifiers.

- Drafts resume through the Create flow.

- Signed-out onboarding may create a Top 3 before authentication; authentication occurs at the publish boundary.

- The shared category registry is authoritative. Onboarding should derive from it rather than maintain a second category list.

- Application-facing metadata providers are named for Top3 domains rather than third-party services.

- Provider-specific credentials and secrets belong server-side when an Edge Function boundary is required.

- Provider-specific search ranking, fallback, retry, and normalization logic belongs inside providers rather than screens.

- Audio playback is application-wide shared state. Do not create card-specific audio players.

- Book, trailer, and audio preview sheets intentionally invert the application theme.

- Application light / dark mode should use semantic shared colours and typography rather than per-screen hard-coded variants.

- Shared UI components should be reused before screen-specific duplicates are created.

- Realtime subscriptions should be scoped to the smallest appropriate user / relationship domain.

- Push notifications derive from authoritative notification events rather than client-generated social push logic.

- The current complete-dataset client Feed is a V1 launch exception, not the intended large-scale architecture.

- Large-scale Feed delivery should become cursor-paginated and server-generated.

- There is intentionally no separate "My Collections" screen.

- Prefer complete vertical slices over partially implemented systems.

- Reuse before creating new components.

## Future Direction

Future enhancements should extend the existing architecture rather than replace it.

Planned areas include:

- cursor-paginated, server-generated Feed delivery;
- bounded / server-side Taste Match recommendation candidate generation;
- Universal Links and a public web fallback for shared Lists and Overall rankings;
- AI-assisted recommendations where they strengthen discovery rather than replace curated user lists;
- continued discovery and recommendation improvements;
- additional metadata-provider fallbacks where they improve resilience or coverage;
- metadata persistence improvements that reduce view-time external hydration.

## Document Maintenance

Update this document only when architectural principles or system structure change.

Routine implementation status belongs in:

`CURRENT_STATE.md`

Historical milestones belong in:

`CHANGELOG.md`

Product planning belongs in:

`ROADMAP.md`

Design-system specifics belong in:

`DESIGN_SYSTEM.md`
