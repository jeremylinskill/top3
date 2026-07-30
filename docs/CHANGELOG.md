# Changelog

This document records significant milestones in the evolution of Top3.

Unlike `CURRENT_STATE.md`, which describes the application's current implementation, this document captures the major architectural and product milestones that shaped the application over time.

---

# v1.1 — Social Foundation Complete

**Released:** July 30, 2026

This release completes the migration of Top3's core social interactions to Supabase. Authentication, collections, profiles, likes, and comments are now persisted through the backend, establishing the application's social foundation.

---

## Added

### Comments

- Migrated comments from AsyncStorage to Supabase.
- Added optimistic comment updates.
- Added live database-backed comment counts.
- Added comment persistence across sessions.

### Likes

- Completed Supabase-backed Like system.
- Added optimistic Like updates.
- Added shared Like counts across users.

### Database

- Verified Row Level Security (RLS) policies.
- Added and verified foreign key relationships.
- Added database indexes for Like and Comment queries.
- Added unique Like constraint (`user_id`, `collection_id`).

### Quality

- Completed application stability pass.
- Verified TypeScript (`npm run typecheck`).
- Verified ESLint (`npm run lint`).
- Removed temporary debugging code.
- Updated project documentation.

---

## Improved

- Comment responsiveness.
- Like responsiveness.
- Feed synchronization.
- Overall application stability.

---

## Fixed

- Corrected comment counts to reference `collection.id` instead of the synthetic `post.id`.
- Fixed comment persistence after application restart.
- Fixed comment count synchronization across the application.

---

# v1.0 — Platform Foundation

**Released:** July 2026

This milestone established the core architecture of Top3 as a persistent social application.

---

## Added

### Platform

- Supabase authentication
- Persistent user sessions
- User onboarding

### Profiles

- User profiles
- Public profiles
- Profile editing
- Privacy controls

### Collections

- Collection creation
- Draft collections
- Draft persistence
- Resume draft workflow
- Collection editing
- Drag-and-drop ranking
- Collection publishing
- Published collections

### Discovery

- Personalized Feed
- Discover experience
- Category browsing
- Community Top3
- Overall Top3
- Taste Match
- Recommendation engine

### Social

- Following (prototype)
- Comments (prototype)
- Likes (prototype)
- Shared highlights

### External Content

- TMDB integration
- Google Books integration
- RAWG integration
- MusicBrainz integration

### Infrastructure

- EAS Development Build
- Context-based architecture
- Supabase service layer

---

## Improved

- Feed personalization.
- Recommendation quality.
- Collection editing workflow.
- Publishing workflow.
- Metadata enrichment.

---

## Fixed

- Collection publishing reliability.
- Draft persistence.
- Feed reload after restart.
- Profile reload after restart.
- Collection editing reliability.

---

# v0.8

## Added

- Public profiles.
- Taste Match.
- Shared highlights.
- Recommendation engine.

## Improved

- Follow button consistency.
- Feed recommendations.

## Fixed

- Recommendation eligibility.
- Shared pick highlighting.

---

# v0.7

## Added

- Likes (prototype).
- Comments (prototype).

## Improved

- Feed experience.

---

# v0.6

## Added

- User profiles.

---

# Next Milestone

The next milestone will be determined after architectural review and product prioritization.

Likely candidates include:

- Following migration to Supabase.
- Replacing mock community users with real users.
- Realtime social updates.
- Notifications.
- Community and recommendation improvements.