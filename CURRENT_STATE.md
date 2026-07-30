# CURRENT_STATE.md

**Project:** Top3

**Version:** 1.0

**Status:** Active Development

**Last Updated:** July 30, 2026

**Current Branch:** `main`

**Last Verified Commit:**

`6d21178`

**Persist published collections to Supabase**

---

# Dashboard

## Project Status

🟢 Active Development

## Current Feature

None

## Current Priority

To be determined.

Architecture should always be discussed before implementation begins.

## Typecheck

✅ Passing

## Known Blocking Bugs

None

---

# Project Summary

Top3 is a social discovery platform that helps people discover entertainment and connect with others through curated Top 3 collections.

Collections are the foundation of the application.

Everything else—including discovery, recommendations, community rankings, Taste Match and user interaction—is derived from published collections.

---

# Technology Stack

## Framework

* React Native
* Expo SDK 54
* Expo Router
* TypeScript

## Development

* EAS Development Build

## Backend

* Supabase

## State Management

* React Context

## Local Storage

* AsyncStorage

---

# Navigation

## Bottom Tabs

* Feed
* Discover
* Create
* Profile

## Additional Screens

* Authentication
* Collection Creation
* Collection Editing
* Published Collection
* Category Feed
* Community Top3
* Overall Top3
* Search
* Public Profile
* Taste Match
* Followers
* Following
* Edit Profile

---

# Architecture

Application Providers

```
AuthProvider

↓

ProfileProvider

↓

FollowProvider

↓

LikeProvider

↓

CommentProvider

↓

Top3Provider
```

---

# Provider Responsibilities

## AuthProvider

Responsible for:

* Authentication
* Session restoration
* Current user

---

## ProfileProvider

Responsible for:

* Loading profile
* Updating profile
* Profile visibility
* User information

---

## FollowProvider

Responsible for:

* Following state
* Follow actions

(Currently stored locally.)

---

## LikeProvider

Responsible for:

* Like state
* Like actions

(Currently stored locally.)

---

## CommentProvider

Responsible for:

* Comments
* Comment counts
* Comment actions

(Currently stored locally.)

---

## Top3Provider

Responsible for:

* Collections
* Drafts
* Publishing
* Feed generation
* Search state
* Collection editing
* Metadata hydration

---

# Persistence

## Supabase

### Authentication

✅ Complete

### Profiles

✅ Complete

### Collections

✅ Complete

Supports:

* Drafts
* Resume Draft
* Collection Editing
* Publishing
* Feed persistence
* Profile persistence

---

## AsyncStorage

Currently used for:

* Likes
* Comments
* Following
* Recent searches
* UI preferences
* Local cache

These features work locally but are not yet shared between users.

---

# Feature Inventory

## Authentication

Status

✅ Complete

Includes:

* Registration
* Login
* Logout
* Session persistence

Persistence

Supabase

---

## Profiles

Status

✅ Complete

Supports:

* Public profiles
* Private profiles
* Username
* Bio
* Profile editing
* Profile visibility

Persistence

Supabase

---

## Collections

Status

✅ Complete

Supports:

* Draft creation
* Draft persistence
* Resume draft
* Editing
* Publishing
* Drag-and-drop ordering
* Metadata enrichment
* External search

Persistence

Supabase

---

## Feed

Status

✅ Complete

Supports:

* Personalized feed
* Recommendation reasons
* Published collections
* Open profiles
* Edit owned collections

Source

Published collections

plus

Community mock content

---

## Discover

Status

✅ Complete

Supports:

* Trending
* Categories
* Topics
* Community browsing
* Search
* Taste Match
* Community rankings

---

## Community Top3

Status

✅ Complete

Supports:

* Community ranking
* Weighted scoring
* Aggregated Top3

Calculated locally.

---

## Overall Top3

Status

✅ Complete

Supports:

* Overall rankings
* Topic browsing
* Category browsing

Calculated locally.

---

## Taste Match

Status

✅ Complete

Supports:

* Match score
* Shared picks
* Rank comparison
* Collection similarity

Calculated locally.

---

## Likes

Status

✅ Complete (Prototype)

Persistence

AsyncStorage

---

## Comments

Status

✅ Complete (Prototype)

Persistence

AsyncStorage

---

## Following

Status

✅ Complete (Prototype)

Persistence

AsyncStorage

---

# External Data Providers

Movies

TMDB

Television

TMDB

Books

Google Books

Games

RAWG

Music

MusicBrainz

Additional metadata support exists through Open Library.

---

# Product Architecture

Collections are the single source of content.

Published collections become feed posts.

Community rankings derive from published collections.

Taste Match derives from published collections.

Recommendations derive from published collections.

Discovery derives from published collections.

There is intentionally no separate post creation workflow.

---

# Current Source of Truth

## Real

✅ Authentication

✅ Profiles

✅ Collections

---

## Hybrid

⚠ Feed

⚠ Discover

⚠ Community

⚠ Taste Match

Community experiences currently combine real authenticated users with mock community data.

---

## Prototype

⚠ Likes

⚠ Comments

⚠ Following

These experiences are fully functional but currently persist locally through AsyncStorage rather than being shared through Supabase.

---

# Architectural Decisions

Collections are edited from Feed and Profile.

There is intentionally no My Collections screen.

Drafts are resumed through the Create flow.

Publishing converts a draft collection into a published collection.

Community rankings are calculated client-side.

Feed personalization is calculated client-side.

Collections remain the primary object throughout the application.

---

# Known Technical Debt

High Priority

* Migrate Likes to Supabase.
* Migrate Comments to Supabase.
* Migrate Following relationships to Supabase.
* Replace mock community users with real database users.

Medium Priority

* Verify avatar persistence.
* Scope AsyncStorage keys by authenticated user where appropriate.
* Improve optimistic update rollback behaviour.

Low Priority

* Review legacy Expo template files.
* Review placeholder services and unused routes.

---

# Development Workflow

Every feature should follow this process.

1. Discuss architecture.

2. Build one complete vertical slice.

3. Modify as few files as practical.

4. Provide complete file replacements whenever possible.

5. Run:

`npm run typecheck`

6. Test the feature.

7. Commit.

8. Update CURRENT_STATE.md if the application state has materially changed.

---

# Notes for Future Chats

Before making recommendations:

1. Read this document.

2. Treat the current codebase as the source of truth.

3. Do not recommend rebuilding implemented features.

4. Ask before assuming functionality is missing.

5. Discuss architecture before implementation.

---

# Document Purpose

CURRENT_STATE.md exists to provide an accurate snapshot of the current application.

It is intentionally concise and should describe **what the application is today**, not future aspirations or historical decisions.

Strategic direction belongs in `ROADMAP.md`.

Historical milestones belong in `CHANGELOG.md`.
