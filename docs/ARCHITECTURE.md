Top3 Architecture

Version: 1.1Status: ActiveOwner: Jeremy LinskillLast Updated: July 31, 2026

Purpose

This document describes the long-term architectural principles thatshape Top3.

Unlike CURRENT_STATE.md, which captures the application'simplementation today, this document explains why the application isstructured the way it is and the architectural rules that should remainstable as the product evolves.

Architectural Philosophy

Top3 is a social platform built around one central idea:

Collections are the primary object.

Users do not create posts.

They create thoughtfully curated Top 3 collections.

Everything else in the application---feed, recommendations, discovery,community rankings, likes, comments and Taste Match---exists becausecollections exist.

The architecture intentionally reinforces thoughtful curation overcontinuous content creation.

Core Domain Model

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
   └── Comments

Published collections are the single source of truth for nearly everysocial experience.

Architectural Principles

Collections are Primary

Collections exist independently of the feed.

Publishing changes visibility---not identity.

Feed Posts are Projections

Feed posts are UI representations of published collections.

The feed should never become an independent data model.

One Source of Truth

Every important piece of information should have a single authoritativeowner.

Examples:

Authentication → Supabase Auth

Profiles → profiles

Collections → collections

Likes → likes

Comments → comments

Progressive Enhancement

Prototype locally when appropriate.

Move functionality to Supabase once the behaviour is validated.

This approach allows rapid iteration without compromising long-termarchitecture.

Application Architecture

                 External Providers
         TMDB • Google Books • RAWG • MusicBrainz
                         │
                         ▼
                     Service Layer
         Supabase Services + Metadata Providers
                         │
                         ▼
                  Context Providers
 Auth • Profile • Follow • Like • Comment • Top3
                         │
                         ▼
                 Reusable Components
 ScreenHeader • PageHeader • Chip
 PrimaryButton • RankedItemCard
 CollectionForm • CommentsSheet
                         │
                         ▼
                       Screens
 Feed • Discover • Search • Collection
 Profile • Community • Taste Match
                         │
                         ▼
                     Expo Router

Each layer owns a single responsibility and should communicate only withadjacent layers.

Layer Responsibilities

Service Layer

Responsible for:

Supabase reads and writes

External metadata providers

Data mapping

Hydration

Network concerns

UI should never communicate directly with external APIs when a serviceexists.

Context Layer

Responsible for:

Shared application state

Optimistic updates

Business logic

Session-aware behaviour

Providers should coordinate data, not render UI.

Presentation Layer

Responsible for reusable UI building blocks.

Current foundation:

Layout

ScreenHeader

PageHeader

Controls

Chip

PrimaryButton

Content

RankedItemCard

Top3Card

CommentsSheet

Forms

CollectionForm

Reusable components should become the default solution wheneverduplication appears.

Screen Layer

Screens compose reusable components into complete user experiences.

Screens should contain minimal business logic.

Persistence Strategy

Supabase

System of record for:

Authentication

Profiles

Collections

Likes

Comments

AsyncStorage

Reserved for local-only state such as:

Draft workflow

Recent searches

UI preferences

Temporary prototype features

Product Flow

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
        └── Taste Match
                │
                ▼
      Recommendations & Discovery

Publishing is the gateway to every community experience.

Design System Architecture

The design system is now a core architectural layer rather than acollection of isolated components.

Hierarchy:

ScreenHeader
      │
PageHeader
      │
Section
      │
Chip / Card / Button
      │
Content

New screens should assemble existing components before introducing newones.

Architectural Decisions

Collections remain the primary domain object.

Published collections drive community experiences.

Likes and comments reference collection.id, not synthetic feedidentifiers.

Drafts resume through the Create flow.

There is intentionally no separate "My Collections" screen.

Prefer complete vertical slices over partially implemented systems.

Reuse before creating new components.

Future Direction

Future enhancements should extend the existing architecture rather thanreplacing it.

Planned areas include:

Following migration to Supabase

Supabase Realtime

Notifications

AI-assisted recommendations

Personalized discovery

Remaining mock community replacement

Document Maintenance

Update this document only when architectural principles or systemstructure change.

Routine implementation work belongs in:

CURRENT_STATE.md

CHANGELOG.md

Product planning belongs in:

ROADMAP.md

Design evolution belongs in:

DESIGN_SYSTEM.md