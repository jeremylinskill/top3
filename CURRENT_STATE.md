CURRENT_STATE.md

Project: Top3

Version: 1.4

Status: Active Development

Last Updated: July 31, 2026

Current Branch: main

Last Verified Commit

927fdda

Add native Sign in with Google support

Dashboard

Project Status

🟢 Active Development

Current Feature

Authentication milestone complete.

Current Priority

Review the current product state and determine the next focused milestone before beginning implementation.

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

AsyncStorage is used only for temporary or local application state that does not yet require shared server persistence.

Navigation

Bottom Tabs

Feed

Discover

Create

Profile

Additional Screens

Authentication

Welcome

Create Account

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

Authentication is implemented through a shared service layer and Supabase Auth.

The existing AuthProvider restores persisted sessions and responds to authentication state changes for email, Apple, and Google accounts.

Email Authentication

Status: ✅ Complete

Supports:

Email sign up

Email sign in

Email verification flow

Persistent Supabase sessions

Automatic session restoration

Apple Sign In

Status: ✅ Complete

Supports:

Native iOS authentication

Apple Developer capability integration

Expo Apple Authentication

Supabase identity-token exchange

Persistent Supabase sessions

Existing-user sign in

New-user account creation

Silent handling of user cancellation

Friendly user-facing error messages

Google Sign In

Status: ✅ Complete

Supports:

Native Google account selection on iOS

Google Cloud OAuth configuration

Separate iOS and Web OAuth clients

Expo Google Sign-In configuration and iOS URL scheme

Supabase identity-token exchange

Persistent Supabase sessions

Existing-user sign in

New-user account creation

Silent handling of user cancellation

Friendly user-facing error messages

Google Provider Configuration

Supabase Google authentication is configured with:

Web OAuth Client ID

iOS OAuth Client ID

Web OAuth Client Secret stored only in Supabase

Nonce checks skipped for compatibility with the native iOS Google Sign-In flow

The Google Client Secret must never be stored in the mobile application, committed to Git, or added to the app's public environment variables.

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

Shared PageHeader across Create, Search, and Collection.

Shared Chip component for categories, topics, and search suggestions.

Standardized spacing, typography, and page hierarchy.

Curated search suggestions remain until a category/topic reaches 50 published collections, then become community-driven.

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

⚠ Following

Following is functional but currently persists through AsyncStorage.

Recent Milestones

July 31, 2026

Authentication

Completed native Sign in with Apple.

Completed native Sign in with Google.

Configured Apple Developer and Google Cloud authentication requirements.

Configured Apple and Google providers in Supabase.

Added persistent Supabase sessions for Apple and Google users.

Integrated both providers into the existing authentication service.

Preserved the existing email authentication and verification flow.

Added silent cancellation handling for Apple and Google sign-in.

Replaced technical authentication alerts with friendly user-facing messages.

Google Sign In

Added @react-native-google-signin/google-signin.

Added Google Sign-In Expo config plugin.

Added the reversed iOS client ID URL scheme.

Added public iOS and Web Google Client IDs to the application environment.

Created separate Google Cloud iOS and Web OAuth clients.

Added both accepted Google OAuth audiences to Supabase.

Enabled Supabase nonce-check compatibility for the native iOS flow.

Built and installed a new EAS iOS development client.

Feed

Added an authentication guard before loading published collections.

Eliminated the first-login authentication race condition.

Prevented anonymous collection queries during session initialization.

Preserved secure Row Level Security policies.

Design System

Introduced reusable PageHeader.

Introduced reusable Chip.

Standardized Create, Search, and Collection layouts.

Unified category, topic, and search suggestion chips.

Continued migration away from duplicated UI components.

Known Technical Debt

High Priority

Migrate Following to Supabase.

Replace remaining mock community users with real users.

Medium Priority

Verify avatar persistence.

Scope AsyncStorage keys by authenticated user where appropriate.

Improve optimistic rollback behaviour.

Add Supabase Realtime for Likes, Comments, and Following.

Review whether the Google nonce compatibility setting should be hardened in a future authentication pass.

Low Priority

Review legacy Expo template files.

Remove placeholder services and unused routes.

Development Workflow

Every feature should follow this process:

Discuss architecture.

Build one complete vertical slice.

Modify as few files as practical.

Prefer complete file replacements.

Run npm run typecheck.

Run npm run lint.

Test thoroughly.

Commit.

Push.

Update documentation when the application state has materially changed.

Notes for Future Chats

Before making recommendations:

Read this document first.

Treat the current codebase as the source of truth.

Do not recommend rebuilding implemented features.

Ask before assuming functionality is missing.

Discuss architecture before implementation.

Proceed one focused step at a time.

Do not automatically choose the next major feature without reviewing the roadmap and current product state.

Document Purpose

CURRENT_STATE.md provides an accurate snapshot of the application's current architecture and implementation.

Strategic direction belongs in ROADMAP.md.

Historical milestones belong in CHANGELOG.md.