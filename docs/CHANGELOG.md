Changelog

This document records significant milestones in the evolution of Top3.

Unlike CURRENT_STATE.md, which describes the application's currentimplementation, this document captures the major architectural andproduct milestones that shaped the application over time.

v1.2 --- Design System & Collection Flow Refinement

Released: July 31, 2026

This release focused on improving consistency, maintainability, and theoverall collection creation experience. The application now has thebeginnings of a reusable design system, reducing duplicated UI codewhile creating a stronger foundation for future development.

Added

Design System

Introduced reusable PageHeader component.

Introduced reusable Chip component.

Established a shared page layout architecture.

Standardized navigation (ScreenHeader) and page identity(PageHeader) responsibilities.

Search

Added curated search suggestions that automatically transition tocommunity-driven suggestions after a category/topic reaches 50published collections.

Improved

Collection Flow

Standardized Create, Search and Collection screen layouts.

Unified page spacing and typography.

Unified category, topic and search suggestion chips.

Improved overall visual consistency.

Architecture

Reduced duplicated UI implementations.

Expanded reusable component library.

Continued migration away from mock UI implementations.

Documentation

Updated DESIGN_SYSTEM.md.

Updated CURRENT_STATE.md.

Updated project architecture documentation.

Fixed

Eliminated inconsistent page title layouts.

Eliminated duplicated chip implementations across the collectionflow.

v1.1 --- Social Foundation Complete

Released: July 30, 2026

This release completes the migration of Top3's core social interactionsto Supabase. Authentication, collections, profiles, likes, and commentsare now persisted through the backend, establishing the application'ssocial foundation.

Added

Comments

Migrated comments from AsyncStorage to Supabase.

Added optimistic comment updates.

Added live database-backed comment counts.

Added comment persistence across sessions.

Likes

Completed Supabase-backed Like system.

Added optimistic Like updates.

Added shared Like counts across users.

Database

Verified Row Level Security (RLS) policies.

Added and verified foreign key relationships.

Added database indexes for Like and Comment queries.

Added unique Like constraint (user_id, collection_id).

Quality

Completed application stability pass.

Verified TypeScript (npm run typecheck).

Verified ESLint (npm run lint).

Removed temporary debugging code.

Updated project documentation.

Improved

Comment responsiveness.

Like responsiveness.

Feed synchronization.

Overall application stability.

Fixed

Corrected comment counts to reference collection.id instead of thesynthetic post.id.

Fixed comment persistence after application restart.

Fixed comment count synchronization across the application.

v1.0 --- Platform Foundation

Released: July 2026

This milestone established the core architecture of Top3 as a persistentsocial application.

Added

Platform

Supabase authentication

Persistent user sessions

User onboarding

Profiles

User profiles

Public profiles

Profile editing

Privacy controls

Collections

Collection creation

Draft collections

Draft persistence

Resume draft workflow

Collection editing

Drag-and-drop ranking

Collection publishing

Published collections

Discovery

Personalized Feed

Discover experience

Category browsing

Community Top3

Overall Top3

Taste Match

Recommendation engine

Social

Following (prototype)

Comments (prototype)

Likes (prototype)

Shared highlights

External Content

TMDB integration

Google Books integration

RAWG integration

MusicBrainz integration

Infrastructure

EAS Development Build

Context-based architecture

Supabase service layer

Improved

Feed personalization.

Recommendation quality.

Collection editing workflow.

Publishing workflow.

Metadata enrichment.

Fixed

Collection publishing reliability.

Draft persistence.

Feed reload after restart.

Profile reload after restart.

Collection editing reliability.

v0.8

Added

Public profiles.

Taste Match.

Shared highlights.

Recommendation engine.

Improved

Follow button consistency.

Feed recommendations.

Fixed

Recommendation eligibility.

Shared pick highlighting.

v0.7

Added

Likes (prototype).

Comments (prototype).

Improved

Feed experience.

v0.6

Added

User profiles.

Next Milestone

Current focus:

Polish the collection creation experience.

Continue replacing remaining mock community data.

Migrate Following to Supabase.

Add Supabase Realtime for social interactions.

Strengthen discovery and recommendation experiences.