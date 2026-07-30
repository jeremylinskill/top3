# Changelog

This document records significant milestones in the evolution of Top3.

Unlike `CURRENT_STATE.md`, which describes the application's current implementation, the changelog provides a historical record of how the product has evolved over time.

---

# v1.0 — Foundation Complete

**Released:** July 30, 2026

Top3 has evolved from an early prototype into a persistent social platform with authentication, user profiles, collection publishing, community discovery, and database-backed social interactions.

---

## Added

### Core Platform

- Supabase authentication
- Persistent user sessions
- User onboarding
- User profiles
- Public profiles
- Profile editing
- Profile privacy controls

### Collections

- Collection creation
- Draft collections
- Draft persistence
- Resume existing drafts
- Collection editing
- Drag-and-drop ranking
- Collection publishing
- Published collection viewing
- Persistent Supabase-backed collections

### Discovery

- Personalized Feed
- Discover experience
- Category browsing
- Category feeds
- Trending collections
- Trending topics
- Community Top3
- Overall Top3
- Taste Match
- Recommendation engine
- Recommendation explanations

### Social

- Public profile browsing
- Following (prototype)
- Comments (prototype)
- Shared highlights

### Likes

- Supabase-backed likes
- Shared likes between users
- Optimistic UI updates
- Like persistence
- Like count persistence
- Like service layer
- Row Level Security policies
- Foreign key validation

### External Content

- TMDB integration
- Google Books integration
- RAWG integration
- MusicBrainz integration
- Metadata hydration
- Artwork enrichment

### Infrastructure

- Supabase authentication
- Profile persistence
- Collection persistence
- Like persistence
- Feed persistence
- EAS Development Build
- Context-based architecture
- Feature-specific Supabase service layer

---

## Improved

- Feed personalization
- Recommendation quality
- Collection editing workflow
- Publishing workflow
- Metadata loading
- Feed hydration
- User experience throughout the publishing flow
- Like responsiveness through optimistic updates
- Separation of UI state from persistence layer

---

## Fixed

- Published collections persist correctly to Supabase
- Draft collections survive application restart
- Feed reload after restart
- Profile reload after restart
- Collection editing reliability
- Publish synchronization
- Like persistence across application restarts
- Like counts remain synchronized with the database
- Corrected Like persistence to reference `collection.id` rather than the synthetic `post.id`
- Various TypeScript improvements and stability fixes

---

# v0.8

## Added

- Public profiles
- Taste Match
- Shared highlights
- Recommendation engine

## Improved

- Follow button consistency
- Feed recommendations

## Fixed

- Recommendation eligibility
- Shared pick highlighting

---

# v0.7

## Added

- Likes (prototype)
- Comments (prototype)

## Improved

- Feed experience

---

# v0.6

## Added

- User profiles

---

# Next Milestone — v1.1

The next milestone focuses on completing the migration from local prototype data to fully shared Supabase-backed social features.

### Planned

- Comments persisted to Supabase
- Following relationships persisted to Supabase
- Replace mock community users with real users
- Supabase Realtime subscriptions
- Live like counts
- Live comments
- Live follow updates
- Community notifications
- Richer social interactions