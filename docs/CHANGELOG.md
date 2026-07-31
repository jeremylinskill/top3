Changelog

This document records significant milestones in the evolution of Top3.

Unlike CURRENT_STATE.md, which describes the application's current implementation, this document captures the major architectural and product milestones that shaped the application over time.

v1.3 — Native Apple Authentication

Released: July 31, 2026

This release adds native Sign in with Apple and completes the first production-ready social authentication provider for Top3.

Added

Authentication

Added native Sign in with Apple using expo-apple-authentication.

Added Apple identity token exchange through Supabase Auth.

Added support for both new-user registration and returning-user sign-in.

Added persistent Apple-authenticated Supabase sessions.

Added Apple name metadata preservation when available during first authorization.

Platform Configuration

Enabled the Sign in with Apple capability for the iOS bundle identifier.

Added ios.usesAppleSignIn to Expo configuration.

Added the expo-apple-authentication config plugin.

Created and installed a new EAS iOS development build.

Enabled the Apple provider in Supabase.

Added com.jeremylinskillsteam.top3 as the Apple Client ID.

Feed

Added an authentication guard before loading published collections.

Improved

Authentication Flow

Integrated Apple authentication into the existing auth-service.ts architecture.

Reused the existing AuthProvider and onAuthStateChange session flow.

Routed successful Apple authentication through the existing application entry point.

Preserved email authentication and email verification behaviour.

Session Handling

Improved first-login session initialization.

Improved session restoration after reinstalling or reopening the app.

Prevented authenticated screens from querying Supabase before auth initialization completes.

Fixed

Fixed the Feed permission error that could occur immediately after a user's first successful Apple sign-in.

Fixed the authentication timing race that caused the Feed to query collections before the Supabase session was ready.

Improved handling of cancelled Apple authorization attempts so cancellations do not display as authentication failures.

Documentation

Updated CURRENT_STATE.md to version 1.3.

Recorded native Apple authentication as complete.

Added Google Sign-In as the next planned authentication provider.

v1.2 — Design System & Collection Flow Refinement

Released: July 31, 2026

This release focused on improving consistency, maintainability, and the overall collection creation experience. The application now has the beginnings of a reusable design system, reducing duplicated UI code while creating a stronger foundation for future development.

Added

Design System

Introduced reusable PageHeader component.

Introduced reusable Chip component.

Established a shared page layout architecture.

Standardized navigation (ScreenHeader) and page identity (PageHeader) responsibilities.

Search

Added curated search suggestions that automatically transition to community-driven suggestions after a category/topic reaches 50 published collections.

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

Eliminated duplicated chip implementations across the collection flow.

v1.1 — Social Foundation Complete

Released: July 30, 2026

This release completes the migration of Top3's core social interactions to Supabase. Authentication, collections, profiles, likes, and comments are now persisted through the backend, establishing the application's social foundation.

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

Corrected comment counts to reference collection.id instead of the synthetic post.id.

Fixed comment persistence after application restart.

Fixed comment count synchronization across the application.

v1.0 — Platform Foundation

Released: July 2026

This milestone established the core architecture of Top3 as a persistent social application.

Added

Platform

Supabase authentication.

Persistent user sessions.

User onboarding.

Profiles

User profiles.

Public profiles.

Profile editing.

Privacy controls.

Collections

Collection creation.

Draft collections.

Draft persistence.

Resume draft workflow.

Collection editing.

Drag-and-drop ranking.

Collection publishing.

Published collections.

Discovery

Personalized Feed.

Discover experience.

Category browsing.

Community Top3.

Overall Top3.

Taste Match.

Recommendation engine.

Social

Following (prototype).

Comments (prototype).

Likes (prototype).

Shared highlights.

External Content

TMDB integration.

Google Books integration.

RAWG integration.

MusicBrainz integration.

Infrastructure

EAS Development Build.

Context-based architecture.

Supabase service layer.

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

Complete Google Sign-In integration.

Continue polishing authentication and onboarding.

Migrate Following to Supabase.

Replace remaining mock community users with real users.

Add Supabase Realtime for Likes, Comments and Following.

Strengthen discovery and recommendation experiences.