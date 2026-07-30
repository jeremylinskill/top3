# Changelog

This document records significant milestones in the evolution of Top3.

Unlike `CURRENT_STATE.md`, which describes the application's current implementation, the changelog provides a historical record of how the product has evolved over time.

---

# v1.0 — Foundation Complete

**Released:** July 30, 2026

Top3 reaches its first major product milestone.

The application has evolved from an early prototype into a persistent social platform with real authentication, profile management, collection publishing, community discovery, and personalized recommendations.

### Added

#### Core Platform

* Supabase authentication
* Persistent user sessions
* User onboarding
* User profiles
* Public profiles
* Profile editing
* Profile privacy

#### Collections

* Collection creation
* Draft collections
* Draft persistence
* Resume existing drafts
* Collection editing
* Drag-and-drop ranking
* Collection publishing
* Published collection viewing

#### Discovery

* Personalized Feed
* Discover experience
* Category browsing
* Category feeds
* Trending collections
* Trending topics
* Community Top3
* Overall Top3
* Taste Match
* Recommendation engine
* Recommendation explanations

#### Social

* Public profile browsing
* Following
* Likes
* Comments
* Shared highlights

#### External Content

* TMDB integration
* Google Books integration
* RAWG integration
* Music provider integration
* Metadata hydration
* Artwork enrichment

#### Infrastructure

* Supabase collection persistence
* Feed persistence
* Profile persistence
* EAS Development Build
* Improved application architecture
* Context-based state management

### Improved

* Feed personalization
* Recommendation quality
* Collection editing workflow
* Publishing workflow
* Collection persistence
* Metadata loading
* Feed hydration
* User experience throughout the publishing flow

### Fixed

* Published collections now persist correctly to Supabase
* Draft collections survive application restart
* Feed reload after restart
* Profile reload after restart
* Collection editing reliability
* Publish synchronization
* Various TypeScript improvements and stability fixes

---

# v0.8

### Added

* Public profiles
* Taste Match
* Shared highlights
* Recommendation engine

### Improved

* Follow button consistency
* Feed recommendations

### Fixed

* Recommendation eligibility
* Shared pick highlighting

---

# v0.7

### Added

* Comments
* Likes

### Improved

* Feed experience

---

# v0.6

### Added

* User Profiles

---

# Looking Ahead

The next major milestone (v1.1) will focus on strengthening the community by migrating social interactions from local prototype storage to fully shared Supabase-backed experiences.

Planned areas of focus include:

* Shared likes
* Shared comments
* Shared follow relationships
* Community notifications
* Richer social interactions
* Improved community discovery
