# Top3 Architecture

**Version:** 1.0  
**Status:** Active  
**Owner:** Jeremy Linskill  
**Last Updated:** July 30, 2026

---

# Purpose

This document describes the enduring architectural principles that shape Top3.

Unlike `CURRENT_STATE.md`, which documents the application's current implementation, this document explains **why** the application is structured the way it is.

Architectural principles should change infrequently.

---

# Architectural Philosophy

Top3 is a social platform built around one central idea:

> **Collections are the primary object.**

Users do not create posts.

They create curated collections.

Everything else in the application derives from those collections.

This keeps the product focused on thoughtful curation rather than continuous content creation.

---

# Core Domain Model

```
User

↓

Collection (Draft)

↓

Collection (Published)

↓

Community Experience

├── Feed
├── Discover
├── Profiles
├── Community Top3
├── Overall Top3
├── Taste Match
├── Recommendations
├── Likes
└── Comments
```

Collections are the single source of truth for nearly every experience.

---

# Domain Principles

## Collections are primary

Collections exist independently of the Feed.

Publishing simply makes a collection visible.

Collections always remain the authoritative record.

---

## Feed posts are projections

A feed post is not a separate entity.

It is a presentation of a published collection.

This avoids duplicate data and synchronization problems.

---

## Publishing is one-way

Draft

↓

Published Collection

Publishing changes visibility.

It does not create a second object.

---

## Social interactions belong to Collections

Likes

Comments

Following

All interactions ultimately reference the published collection.

The synthetic `post.id` exists only for UI rendering.

---

# Application Layers

```
Supabase

↓

Context Providers

↓

Reusable Components

↓

Screens

↓

Navigation
```

Each layer has a single responsibility.

---

# Context Responsibilities

## AuthProvider

Authentication

Current session

Current user

---

## ProfileProvider

User profile

Profile updates

Visibility

---

## FollowProvider

Following relationships

Follow actions

---

## LikeProvider

Likes

Optimistic updates

Shared counts

---

## CommentProvider

Comments

Comment counts

Optimistic updates

---

## Top3Provider

Collections

Publishing

Editing

Feed hydration

Metadata

---

# Persistence Strategy

## Supabase

Source of truth for:

- Authentication
- Profiles
- Collections
- Likes
- Comments

---

## AsyncStorage

Used only where shared persistence is unnecessary.

Current examples:

- Following (temporary)
- Draft workflow
- Recent searches
- Onboarding state
- UI preferences

---

# Product Flow

```
Create Collection

↓

Publish

↓

Community Discovery

↓

Likes

↓

Comments

↓

Connections

↓

Future Recommendations
```

Publishing is the gateway to every community experience.

---

# Design Principles

Every new feature should strengthen one or more of these goals.

- Collections remain central.
- Content before decoration.
- Simplicity over feature count.
- Reuse existing systems whenever possible.
- Extend architecture instead of duplicating it.
- Build complete vertical slices.
- Prefer one source of truth.

---

# Architectural Decisions

## No My Collections screen

Published collections are managed directly from the user's profile and feed.

Drafts resume naturally through the Create flow.

---

## Collections drive everything

Community rankings

Taste Match

Recommendations

Feed

Discover

All derive from published collections.

---

## Shared interactions

Likes and comments are persisted in Supabase.

Interactions reference `collection.id`, not the synthetic feed `post.id`.

---

## Progressive enhancement

Prototype functionality may begin locally before migrating to shared persistence.

This allows rapid iteration while preserving architectural consistency.

---

# Future Architectural Direction

The following enhancements should build upon—not replace—the existing architecture.

- Shared Following
- Supabase Realtime
- Notifications
- AI-assisted recommendations
- Community insights

Future features should continue extending the existing collection-centric model.

---

# Document Maintenance

Update this document only when architectural decisions change.

Routine feature additions should instead update:

- CURRENT_STATE.md
- CHANGELOG.md
- ROADMAP.md