CURRENT_STATE.md

Project: Top3

Version: 1.3

Status: Active Development

Last Updated: July 31, 2026

Current Branch: main

Last Verified Commit

2a3828f

Add native Sign in with Apple support

Dashboard

Project Status

🟢 Active Development

Current Feature

Native authentication and onboarding.

Current Priority

Complete the authentication experience before expanding content categories.

Architecture should always be discussed before implementation begins.

Typecheck

✅ Passing

Known Blocking Bugs

None

Project Summary

Top3 is a social discovery platform that helps people discover entertainment and connect with others through curated Top 3 collections.

Collections are the foundation of the application.

Everything else—including discovery, recommendations, community rankings, Taste Match, and user interaction—is derived from published collections.

Technology Stack

Framework

React Native

Expo SDK 54

Expo Router

TypeScript

Development

EAS Development Build

Backend

Supabase

State Management

React Context

Local Storage

AsyncStorage

Used only for temporary/local application state.

Navigation

Bottom Tabs

Feed

Discover

Create

Profile

Additional Screens

Authentication

Welcome

Email Sign Up

Email Sign In

Check Email

Collection Creation

Collection Editing

Published Collection

Category Feed

Community Top3

Overall Top3

Search

Public Profile

Taste Match

Followers

Following

Edit Profile

Architecture

Application Providers

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

Presentation Layer

Layout

ScreenHeader

PageHeader

Controls

Chip

PrimaryButton

AuthProviderButton

Content

RankedItemCard

Top3Card

CommentsSheet

Forms

CollectionForm

EmailSignUpForm

Authentication

Email Authentication

Status: ✅ Complete

Supports:

Email sign up

Email sign in

Session persistence

Email verification flow

Apple Sign In

Status: ✅ Complete

Supports:

Native iOS authentication

Apple Developer integration

Supabase identity token exchange

Persistent Supabase sessions

Existing account sign in

New account creation

Google Sign In

Status: 🚧 Planned

Persistence

Supabase

✅ Authentication

✅ Profiles

✅ Collections

✅ Likes

✅ Comments

AsyncStorage

Currently used for:

Following (temporary)

Draft collections

Recent searches

Onboarding state

UI preferences

Collection Flow

Recent improvements:

Shared PageHeader across Create, Search and Collection.

Shared Chip component for categories, topics and search suggestions.

Standardized spacing, typography and page hierarchy.

Curated search suggestions remain until a category/topic reaches 50 published collections before switching to community-driven suggestions.

Current Source of Truth

Real

✅ Authentication

✅ Profiles

✅ Collections

✅ Likes

✅ Comments

Hybrid

⚠ Feed

⚠ Discover

⚠ Community

⚠ Taste Match

Community experiences currently combine real authenticated users with mock community data.

Prototype

⚠ Following (AsyncStorage)

Recent Milestones

July 31, 2026

Authentication

Native Sign in with Apple completed.

Apple Developer capability enabled.

Supabase Apple provider configured.

Persistent Apple sessions implemented.

Authentication integrated into the existing provider architecture.

Feed

Added authentication guard before loading published collections.

Eliminated first-launch authentication race condition.

Preserved secure RLS policies.

Design System

Introduced reusable PageHeader.

Introduced reusable Chip component.

Standardized Create, Search and Collection layouts.

Unified category, topic and search suggestion chips.

Continued migration away from duplicated UI components.

Known Technical Debt

High Priority

Migrate Following to Supabase.

Replace remaining mock community users with real users.

Complete Google Sign-In integration.

Medium Priority

Verify avatar persistence.

Scope AsyncStorage keys by authenticated user.

Improve optimistic rollback behaviour.

Add Supabase Realtime for Likes, Comments and Following.

Low Priority

Review legacy Expo template files.

Remove placeholder services and unused routes.

Development Workflow

Discuss architecture.

Build one complete vertical slice.

Modify as few files as practical.

Prefer complete file replacements.

Run npm run typecheck.

Run npm run lint.

Test thoroughly.

Commit.

Push.

Update documentation.

Notes for Future Chats

Read this document first.

Treat the codebase as the source of truth.

Do not recommend rebuilding implemented features.

Ask before assuming functionality is missing.

Discuss architecture before implementation.

Document Purpose

CURRENT_STATE.md provides an accurate snapshot of the application's current architecture and implementation.

Strategic direction belongs in ROADMAP.md.

Historical milestones belong in CHANGELOG.md.