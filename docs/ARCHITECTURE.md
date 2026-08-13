# Top3 Architecture

Version: 1.2  
Status: Active  
Owner: Jeremy Linskill  
Last Updated: August 13, 2026

## Purpose

This document describes the long-term architectural principles that shape Top3.

Unlike `CURRENT_STATE.md`, which captures the application's implementation today, this document explains why the application is structured the way it is and the architectural rules that should remain stable as the product evolves.

## Architectural Philosophy

Top3 is a social platform built around one central idea:

**Collections are the primary object.**

Users do not create posts.

They create thoughtfully curated Top 3 collections.

Everything else in the application—feed, recommendations, discovery, community rankings, likes, comments, following, notifications, and Taste Match—exists because collections exist.

The architecture intentionally reinforces thoughtful curation over continuous content creation.

## Core Domain Model

```text
User
   │
   ▼
Collection (Draft)
   │
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

Published collections are the single source of truth for nearly every social experience.

## Architectural Principles

### Collections are Primary

Collections exist independently of the feed.

Publishing changes visibility—not identity.

### Feed Posts are Projections

Feed posts are UI representations of published collections.

The feed should never become an independent data model.

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

### Domain-Oriented Provider Abstraction

Application-facing provider modules should be named for the Top3 content domain they serve rather than the external API currently supplying the data.

Current provider layer:

```text
providers/books.ts
providers/movies-and-tv.ts
providers/music.ts
providers/video-games.ts
providers/search.ts
```

External-provider terminology should remain inside integration code where it accurately describes the underlying service.

Examples:

- Books are exposed to the application through `providers/books.ts`, while Google Books and Open Library remain implementation details.
- Movies and TV Shows are exposed through `providers/movies-and-tv.ts`, while TMDB-specific types and requests remain inside that implementation.
- Albums, Artists, and Songs are exposed through `providers/music.ts`, while Apple Music-specific communication remains in `lib/supabase/apple-music.ts` and the `apple-music-search` Edge Function.
- Video Games are exposed through `providers/video-games.ts` and `lib/supabase/video-games.ts`, while IGDB and Twitch OAuth remain implementation details inside the `video-game-search` Edge Function.

This separation allows Top3 to replace or supplement metadata providers without forcing provider-specific naming throughout the application.

### Progressive Enhancement

Prototype locally when appropriate.

Move functionality to Supabase once the behaviour is validated.

This approach allows rapid iteration without compromising long-term architecture.

## Application Architecture

```text
                 External Metadata Providers
       TMDB • Google Books • Open Library • Apple Music • IGDB
                              │
                              ▼
                       Integration Layer
          Direct metadata requests + Supabase Edge Functions
                              │
                              ▼
                        Provider Layer
          Books • Movies & TV • Music • Video Games
                              │
                              ▼
                       Search Registry
                       providers/search.ts
                              │
                              ▼
                       Service Layer
              Supabase persistence + realtime
                              │
                              ▼
                      Context Providers
 Auth • Profile • Follow • Like • Comment • Notifications • Top3
                              │
                              ▼
                     Reusable Components
 ScreenHeader • PageHeader • Chip • PrimaryButton • RankedItemCard
            Top3Card • CollectionForm • CommentsSheet
                              │
                              ▼
                           Screens
 Feed • Discover • Search • Collection • Profile • Community
              Onboarding • Taste Match • Notifications
                              │
                              ▼
                         Expo Router
```

Each layer owns a clear responsibility. Provider-specific concerns should not leak unnecessarily into application-facing modules or UI.

### External Provider Paths

```text
Books
providers/books.ts
   ├── Google Books
   └── Open Library fallback

Movies & TV
providers/movies-and-tv.ts
   └── TMDB

Music
providers/music.ts
   └── lib/supabase/apple-music.ts
       └── Supabase Edge Function: apple-music-search
           └── Apple Music

Video Games
providers/video-games.ts
   └── lib/supabase/video-games.ts
       └── Supabase Edge Function: video-game-search
           └── IGDB + Twitch OAuth
```

The Video Games Edge Function supports signed-out onboarding search through the app's publishable key while keeping Twitch credentials and the IGDB client secret server-side.

## Layer Responsibilities

### Integration & Service Layer

Responsible for:

- Supabase reads and writes
- Supabase Edge Function communication
- External metadata providers
- Provider-specific authentication
- Data mapping
- Hydration
- Network concerns
- Realtime subscriptions

UI should never communicate directly with persistence or external APIs when an established provider or service abstraction exists.

### Provider Layer

Responsible for:

- Presenting domain-oriented search interfaces to the application
- Hiding external-provider implementation details
- Coordinating primary and fallback metadata sources
- Normalizing external results into `Top3Item`

The shared `providers/search.ts` registry routes Top3 categories to the appropriate domain provider.

### Context Layer

Responsible for:

- Shared application state
- Optimistic updates
- Business logic
- Session-aware behaviour
- Coordinating persistence and realtime updates

Providers and contexts should coordinate data, not render UI.

### Presentation Layer

Responsible for reusable UI building blocks.

Current foundation:

**Layout**

- ScreenHeader
- PageHeader

**Controls**

- Chip
- PrimaryButton

**Content**

- RankedItemCard
- Top3Card
- CommentsSheet

**Forms**

- CollectionForm

Reusable components should become the default solution whenever duplication appears.

### Screen Layer

Screens compose reusable components into complete user experiences.

Screens should contain minimal business logic.

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
- Storage-backed profile assets

Supabase Realtime synchronizes social data where realtime behaviour has been implemented, including Likes, Comments, Following, and Notifications.

### AsyncStorage

Reserved for local-only or device-specific state such as:

- Draft workflow
- Onboarding collection state
- Pending onboarding publish/authentication intent
- Recent searches
- UI preferences
- Temporary prototype features

Persistent product data should move to Supabase once its behaviour and data model are established.

## Product Flow

```text
Create Collection
        │
        ▼
Publish Collection
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

Publishing is the gateway to every community experience.

For signed-out users, onboarding can begin with collection creation before authentication. Authentication is required when the user reaches the publish boundary, preserving the collection while the user creates an account or signs in.

## Design System Architecture

The design system is a core architectural layer rather than a collection of isolated components.

Hierarchy:

```text
ScreenHeader
      │
PageHeader
      │
Section
      │
Chip / Card / Button
      │
Content
```

New screens should assemble existing components before introducing new ones.

## Architectural Decisions

- Collections remain the primary domain object.
- Published collections drive community experiences.
- Likes and comments reference `collection.id`, not synthetic feed identifiers.
- Drafts resume through the Create flow.
- Signed-out onboarding may create a Top 3 before authentication; authentication occurs at the publish boundary.
- Application-facing metadata providers are named for Top3 domains rather than third-party services.
- Provider-specific credentials and secrets belong server-side when an Edge Function boundary is required.
- There is intentionally no separate "My Collections" screen.
- Prefer complete vertical slices over partially implemented systems.
- Reuse before creating new components.

## Future Direction

Future enhancements should extend the existing architecture rather than replacing it.

Planned areas include:

- AI-assisted recommendations
- Personalized discovery
- Continued discovery and recommendation improvements
- Remaining mock community replacement where applicable
- Additional metadata-provider fallbacks where they improve resilience or coverage

## Document Maintenance

Update this document only when architectural principles or system structure change.

Routine implementation work belongs in:

`CURRENT_STATE.md`

`CHANGELOG.md`

Product planning belongs in:

`ROADMAP.md`

Design evolution belongs in:

`DESIGN_SYSTEM.md`
