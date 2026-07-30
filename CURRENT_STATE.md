# CURRENT_STATE.md

**Project:** Top3

**Version:** 1.1

**Status:** Active Development

**Last Updated:** July 30, 2026

**Current Branch:** `main`

**Last Verified Commit:**

`b37de99`

Complete comments migration to Supabase and stability pass.

---

# Dashboard

## Project Status

🟢 Active Development

## Current Feature

None

## Current Priority

Determine the next major product feature.

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

Used only for temporary/local application state that does not yet require server persistence.

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

Persistence

Supabase

---

## FollowProvider

Responsible for:

* Following state
* Follow actions

Persistence

AsyncStorage (temporary)

---

## LikeProvider

Responsible for:

* Like state
* Like actions
* Optimistic UI updates

Persistence

✅ Supabase

---

## CommentProvider

Responsible for:

* Comments
* Comment counts
* Comment actions
* Optimistic UI updates

Persistence

✅ Supabase

Supports

* Shared comments
* Live comment counts

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

Persistence

Supabase

---

# Persistence

## Supabase

### Authentication

✅ Complete

### Profiles

✅ Complete

### Collections

✅ Complete

### Likes

✅ Complete

Supports

* Shared likes
* Optimistic updates
* Database-backed counts

### Comments

✅ Complete

Supports

* Shared comments
* Optimistic updates
* Database-backed counts

---

## AsyncStorage

Currently used for:

* Following (temporary)
* Draft collections
* Recent searches
* Onboarding state
* UI preferences

---

# Feature Inventory

## Authentication

Status

✅ Complete

Persistence

Supabase

---

## Profiles

Status

✅ Complete

Persistence

Supabase

---

## Collections

Status

✅ Complete

Persistence

Supabase

---

## Feed

Status

✅ Complete

Source

Published collections

plus

Community mock content

---

## Discover

Status

✅ Complete

---

## Community Top3

Status

✅ Complete

Calculated locally.

---

## Overall Top3

Status

✅ Complete

Calculated locally.

---

## Taste Match

Status

✅ Complete

Calculated locally.

---

## Likes

Status

✅ Complete

Persistence

Supabase

Supports

* Shared between users
* Optimistic updates
* Insert/Delete
* Database-backed counts

---

## Comments

Status

✅ Complete

Persistence

Supabase

Supports

* Shared between users
* Optimistic updates
* Insert/Delete
* Database-backed counts

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

✅ Likes

✅ Comments

---

## Hybrid

⚠ Feed

⚠ Discover

⚠ Community

⚠ Taste Match

Community experiences currently combine real authenticated users with mock community data.

---

## Prototype

⚠ Following

Following is fully functional but currently persists locally through AsyncStorage.

---

# Architectural Decisions

Collections are edited from Feed and Profile.

There is intentionally no My Collections screen.

Drafts are resumed through the Create flow.

Publishing converts a draft collection into a published collection.

Community rankings are calculated client-side.

Feed personalization is calculated client-side.

Collections remain the primary object throughout the application.

Social interactions (likes, comments, follows) persist against `collection.id` (Supabase UUID), **not** the synthetic `post.id` used by the feed.

Likes and comments are persisted in Supabase and secured with Row Level Security (RLS). Foreign keys, indexes, and RLS policies are considered part of the application's architecture rather than optional implementation details.

---

# Known Technical Debt

## High Priority

* Migrate Following relationships to Supabase.
* Replace mock community users with real database users.

## Medium Priority

* Verify avatar persistence.
* Scope AsyncStorage keys by authenticated user where appropriate.
* Improve optimistic update rollback behaviour for failed Supabase writes.
* Add Supabase Realtime subscriptions for Likes, Comments and Following.

## Low Priority

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

6. Run:

`npm run lint`

7. Test the feature.

8. Commit.

9. Push.

10. Update CURRENT_STATE.md if the application state has materially changed.

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

CURRENT_STATE.md provides an accurate snapshot of the application today.

It intentionally documents the current architecture and implementation state.

Strategic direction belongs in `ROADMAP.md`.

Historical milestones belong in `CHANGELOG.md`.