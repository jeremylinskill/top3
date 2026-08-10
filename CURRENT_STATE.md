CURRENT_STATE.md

Project: Top3Version: 2.0Status: Active DevelopmentLast Updated: August 10, 2026Current Branch: main

Last Verified Commit

f833160

Polish discovery, recommendations, and social experience

Dashboard

Project Status

🟢 Active Development

Current Feature

Discovery, recommendations, search quality, and social experience polish complete.

Current Priority

Monitor startup authentication stability and continue improving discovery, feed relevance, recommendations, and overall product quality.

Architecture should always be discussed before implementation begins.

Typecheck

✅ Passing

Known Blocking Bugs

None

Project Summary

Top3 is a social discovery platform that helps people discover entertainment and connect with others through curated Top 3 collections.

Collections are the foundation of the application.

Everything else—including discovery, recommendations, community rankings, Taste Match, profiles, and social interaction—is derived from published collections.

Technology Stack

Framework

React Native

Expo SDK 54

Expo Router

TypeScript

Development

EAS Development Build

Metro configuration for SVG imports

React Native SVG

React Native SVG Transformer

Expo FileSystem

Expo Image Picker

Backend

Supabase Auth

Supabase Postgres

Supabase Storage

Supabase Edge Functions

Row Level Security

State Management

React Context

Local Storage

AsyncStorage

AsyncStorage is used only for temporary or local application state that does not yet require shared server persistence.

External Search Integrations

TMDB — Movies and TV Shows

Google Books — Books

Open Library — Book fallback provider

IGDB — Video Games

Twitch OAuth — Server-side IGDB authentication

Video game search is proxied through the authenticated Supabase Edge Function igdb-search. The Twitch Client Secret is stored only in Supabase Edge Function secrets and is never exposed to the mobile client.

Navigation

Bottom Tabs

Feed

Discover

Create

Notifications

Profile

Additional Screens

Authentication

Welcome

Create Account provider selection

Sign In provider selection

Email Sign Up

Email Sign In

Check Email

Collections and Discovery

Collection Creation

Collection Editing

Published Collection

Category Feed

Community Top3

Overall Top3

Search

Profiles and Social

Public Profile

Edit Profile

Taste Match

Followers

Following

Architecture

Application Providers

AuthProvider↓ProfileProvider↓NotificationProvider↓FollowProvider↓LikeProvider↓CommentProvider↓Top3Provider

Search Architecture

providers/search.ts defines the shared SearchProvider contract and maps application categories to provider implementations.

Movies → providers/tmdb.ts

TV Shows → providers/tmdb.ts

Books → providers/google-books.ts with Open Library fallback

Video Games → providers/games.ts → lib/supabase/igdb.ts → authenticated Supabase Edge Function igdb-search → IGDB

Provider-specific retry, fallback, filtering, ranking, and API behavior remains inside each provider rather than being forced into the shared registry.

The search screen uses a reusable 300 ms debounce hook and maintains an in-memory result cache.

Presentation Layer

Layout

ScreenHeader

PageHeader

ScreenHeader owns the top navigation bar, including the Top 3 brand, optional back navigation, and divider.

PageHeader owns the page title and optional subtitle below the navigation bar. It supports both left- and centre-aligned layouts.

Controls

Chip

PrimaryButton

AuthProviderButton

GoogleAuthButton

EmailAuthButton

Native AppleAuthenticationButton

Content

RankedItemCard

Top3Card

CommentsSheet

SearchInput

Card

SecondaryActionPill

SectionHeader

TasteMatchBadge

Profile avatar controls

Forms

CollectionForm

EmailSignUpForm

EmailSignInForm

Authentication

Authentication is implemented through a shared service layer and Supabase Auth.

The existing AuthProvider restores persisted sessions and responds to authentication state changes for email, Apple, and Google accounts.

During startup, the authentication service restores the persisted Supabase session and refreshes it before AuthGate releases the rest of the application. This is intended to reduce intermittent startup failures caused by stale or timing-sensitive JWTs.

Authentication Screen Flow

Welcome↓Create Account├─ Continue with Apple├─ Continue with Google└─ Continue with Email↓Email Sign Up

Already have an account?↓Sign In├─ Continue with Apple├─ Continue with Google└─ Continue with Email↓Email Sign In

Provider-choice screens use the shared ScreenHeader and PageHeader without a back button.

Email form screens use the shared ScreenHeader with a back button so users can return to provider selection.

Signing out routes users to the provider-choice Sign In screen rather than directly to the email form.

Email Authentication

Status: ✅ Complete

Supports:

Email sign up

Email sign in

Email verification flow

Persistent Supabase sessions

Automatic session restoration

Startup session refresh before protected application queries

Dedicated email form screens

Friendly user-facing errors

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

Official native Apple authentication button

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

Google-compliant branded button using the approved colour G asset

Google Provider Configuration

Supabase Google authentication is configured with:

Web OAuth Client ID

iOS OAuth Client ID

Web OAuth Client Secret stored only in Supabase

Nonce checks skipped for compatibility with the native iOS Google Sign-In flow

The Google Client Secret must never be stored in the mobile application, committed to Git, or added to the app's public environment variables.

Profiles

Profile Notifications

Notification Status

Status: ✅ Complete

Notifications are fully persisted through Supabase.

Supported notification types:

• Likes• Comments• Follows

Implementation includes:

• NotificationProvider• Notifications tab• Bottom-tab unread badge• Relative timestamps• Actor profile enrichment• Collection title enrichment• Read / unread state• Mark all as read• Pull-to-refresh• Navigation to collections• Navigation to public profiles

Database automation includes:

• Like trigger• Comment trigger• Follow trigger

Persistence

Status: ✅ Complete

Profile records are stored in the Supabase profiles table.

Persisted fields include:

id

username

display_name

bio

avatar_url

is_public

created_at

updated_at

The ProfileProvider:

Loads the authenticated user's profile from Supabase

Creates a default profile when one does not exist

Handles fallback usernames when a generated username conflicts

Maps database fields into the application UserProfile type

Optimistically updates local profile state

Rolls back local state if persistence fails

Loads and persists avatar URLs

Profile Avatars

Status: ✅ Complete

Profile avatars are persisted through Supabase Storage.

Implementation includes:

Public avatars Storage bucket

User-specific folder structure based on the authenticated user ID

One replaceable avatar object per user

Public avatar URL stored in profiles.avatar_url

Avatar loading across sessions and devices

Avatar replacement through Storage upsert

Cache-busting query parameter after replacement

Local preview before save

Save flow waits for upload and profile persistence before navigating away

Loading state while the profile is being saved

Friendly failure alert if upload or persistence fails

“Tap photo to change” affordance

5 MB client-side avatar limit

5 MB bucket-level file-size limit

Restricted image MIME types

Verified persistence after app restart and sign out/sign in

Avatar Storage Policies

The avatars bucket uses scoped Storage policies:

Authenticated users can upload only to their own user-ID folder

Authenticated users can update only objects in their own folder

Authenticated users can delete only objects in their own folder

Authenticated users can select only their own avatar objects, which is required for replacing an existing object with upsert

Public URLs remain readable because the bucket is public

Broad public object-listing access has been removed

Avatar Storage Helper

lib/supabase/storage.ts provides:

uploadAvatar()

getAvatarPublicUrl()

deleteAvatar()

Avatar uploads use Expo FileSystem's File.arrayBuffer() API and Supabase Storage.

Persistence

Supabase

✅ Authentication

✅ Profiles

✅ Profile avatars

✅ Collections

✅ Likes

✅ Comments

✅ Following

✅ Notifications

AsyncStorage

Currently used for:

Realtime

✅ Notifications

✅ Likes

✅ Comments

✅ Following

Shared subscription helper: lib/supabase/realtime.ts

Draft collections

Recent searches

Onboarding state

UI preferences

Collection Flow

Recent improvements:

Shared PageHeader across Create, Search, Collection, authentication, and Edit Profile screens

PageHeader supports left- and centre-aligned layouts

Shared Chip component for categories, topics, and search suggestions

Standardized spacing, typography, and page hierarchy

Curated search suggestions remain until a category/topic reaches 50 published collections, then become community-driven

Shared search provider registry routes Movies, TV, Books, and Video Games through one application-level search contract

Reusable useDebouncedValue hook provides a 300 ms search debounce across all search categories

Video game search uses IGDB through a Supabase Edge Function, including prefix fallback and relevance scoring for partial-title searches

Book search includes improved edition deduplication and relevance handling so distinct titles are not incorrectly collapsed by partial title matches

Books use curated popular suggestions where appropriate rather than relying only on generic provider search results

Feed supports pull-to-refresh without returning to the full initial-loading state

Personalized feed recommendations include Taste Match recommendation explanations derived from shared ranked picks

Recommendation explanation blocks on Top3Card are tappable and navigate to the recommended user's Taste Match details

Taste Match details animate the match percentage on load with eased pacing near the final score

Taste Match presentation uses the shared purple accent for match information and recommendation messaging

Current Source of Truth

Shared Supabase-backed data

✅ Authentication

✅ Profiles

✅ Profile avatars

✅ Collections

✅ Likes

✅ Comments

✅ Following

✅ Notifications

Real community experiences

✅ Feed

✅ Discover

✅ Community

✅ Taste Match

Recent Milestones

August 4, 2026

Notifications

Added Supabase-backed notifications.

Added NotificationProvider.

Added Notifications tab.

Added unread badge.

Added relative timestamps.

Added actor profile enrichment.

Added collection enrichment.

Added "Mark all as read".

Added navigation from notifications.

Added automatic database triggers for Likes, Comments, and Follows.

Verified end-to-end notification flow.

Profile Avatars

Added avatar_url to the Supabase profiles table

Created the public avatars Storage bucket

Added scoped upload, update, delete, and authenticated select policies

Removed broad public object-listing access

Added bucket-level file-size and MIME type restrictions

Added lib/supabase/storage.ts

Added persistent avatar uploads using Expo FileSystem and Supabase Storage

Added avatar URL persistence through ProfileProvider

Added avatar loading across sessions and devices

Added cache-busting when replacing an avatar

Added rollback behaviour when avatar upload or profile persistence fails

Added a saving state to Edit Profile

Added client-side 5 MB validation

Added “Tap photo to change”

Verified avatar persistence after app restart and sign out/sign in

Authentication Experience

Added a dedicated provider-choice Sign In screen

Standardized Apple, Google, and Email options across account creation and sign in

Added the official native Apple authentication button

Added a Google-compliant branded authentication button

Added a reusable Email authentication button

Routed signed-out users to the provider-choice Sign In screen

Preserved dedicated Email Sign In and Email Sign Up forms

Standardized authentication screens with ScreenHeader and PageHeader

Removed unnecessary back navigation from top-level provider-choice screens

Retained back navigation on secondary email form screens

Design System

Expanded PageHeader to support left and centre alignment

Applied PageHeader to authentication and Edit Profile screens

Clarified the responsibilities of ScreenHeader and PageHeader

Continued migration away from duplicated title and subtitle implementations

Tooling

Added the approved Google colour G SVG asset

Added React Native SVG Transformer support

Added metro.config.js

Added SVG TypeScript declarations

Added Expo FileSystem for avatar uploads

July 31, 2026

Authentication

Completed native Sign in with Apple

Completed native Sign in with Google

Configured Apple Developer and Google Cloud authentication requirements

Configured Apple and Google providers in Supabase

Added persistent Supabase sessions for Apple and Google users

Integrated both providers into the existing authentication service

Preserved the existing email authentication and verification flow

Added silent cancellation handling for Apple and Google sign-in

Replaced technical authentication alerts with friendly user-facing messages

Google Sign In

Added @react-native-google-signin/google-signin

Added Google Sign-In Expo config plugin

Added the reversed iOS client ID URL scheme

Added public iOS and Web Google Client IDs to the application environment

Created separate Google Cloud iOS and Web OAuth clients

Added both accepted Google OAuth audiences to Supabase

Enabled Supabase nonce-check compatibility for the native iOS flow

Built and installed a new EAS iOS development client

Feed

Added an authentication guard before loading published collections

Eliminated the first-login authentication race condition

Prevented anonymous collection queries during session initialization

Preserved secure Row Level Security policies

Design System

Introduced reusable PageHeader

Introduced reusable Chip

Standardized Create, Search, and Collection layouts

Unified category, topic, and search suggestion chips

Continued migration away from duplicated UI components

August 10, 2026

Discovery, Recommendations & Search Quality

Improved Google Books search relevance and edition deduplication so distinct books with overlapping title words remain discoverable.

Added curated book suggestions for stronger default discovery.

Completed the shared Video Games search path through IGDB and improved generic game suggestions and partial-title search quality.

Refined personalized Feed recommendations and Taste Match recommendation explanations.

Made the full recommendation explanation block on Top3Card tappable and connected it to the recommended user's Taste Match screen.

Taste Match

Added an animated count-up for the Taste Match percentage.

Refined the animation pacing so it slows naturally as it approaches the final score.

Updated Taste Match presentation with a white summary card, shared purple accent treatment, matching keylines, and tighter ranked-pick spacing.

Refined recommendation messaging styling and spacing.

Feed

Added native pull-to-refresh to the Home feed.

Refresh reloads published posts and author data without showing the full initial-loading state.

Product & UI

Added and refined Settings, About, and Privacy screens.

Added reusable SearchInput, Card, SecondaryActionPill, and SectionHeader UI components.

Continued consolidation of shared colours, spacing, and presentation patterns.

Checkpoint

Verified npm run typecheck passes.

Committed and pushed checkpoint f833160 — Polish discovery, recommendations, and social experience.

Known Technical Debt

High Priority

Monitor the intermittent Supabase JWT issued at future startup error after adding an explicit session refresh during authentication initialization

Medium Priority

Scope AsyncStorage keys by authenticated user where appropriate

Improve optimistic rollback behaviour where needed

✅ Supabase Realtime implemented for Likes, Comments, Following, and Notifications

Review whether the Google nonce compatibility setting should be hardened in a future authentication pass

Add avatar removal from the Edit Profile experience if required

Consider image resizing or compression beyond Image Picker quality settings if avatar storage or bandwidth becomes significant

Low Priority

Review legacy Expo template files

Remove placeholder services and unused routes

Remove packages that are no longer required after implementation review

Continue migrating hard-coded colours and spacing into shared design tokens

Development Workflow

Every feature should follow this process:

Discuss architecture.

Build one complete vertical slice.

Modify as few files as practical.

Prefer complete file replacements.

Run npm run typecheck.

For Supabase Edge Functions, run the function-specific Deno validation command, for example:

deno check --config supabase/functions/igdb-search/deno.json supabase/functions/igdb-search/index.ts

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

Remember that Authentication, Profiles, Profile Avatars, Collections, Likes, Comments, Following, and Notifications are fully persisted through Supabase.

Remember that RAWG has been removed from the active application. Video game search now uses IGDB through an authenticated Supabase Edge Function.

Remember that search routing is centralized in providers/search.ts, and app/search.tsx uses a reusable 300 ms debounce hook.

Do not recommend migrating Following again—it has already been completed.

Document Purpose

CURRENT_STATE.md provides an accurate snapshot of the application's current architecture and implementation.

Strategic direction belongs in ROADMAP.md.

Historical milestones belong in CHANGELOG.md.

August 6, 2026

Stabilization

Fixed authentication initialization race conditions.

Added authentication guards before profile and collection queries.

Prevented anonymous Supabase requests during sign out.

Improved sign-out flow.

Replaced technical sign-in errors with friendly user-facing authentication messages.

Settings & Profile

Moved Edit Profile into Settings.

Moved Privacy into Settings.

Removed the Edit Profile button from the Profile screen.

Redesigned Sign Out as a standalone action.

Refined Settings, Profile and Privacy layouts.

Follow Requests

Updated follow request copy to 'requested to follow you'.

Removed usernames from request cards.

Replaced the decline button with a compact close icon.

August 7, 2026

Video Game Search

Replaced RAWG with IGDB after RAWG repeatedly returned Cloudflare HTTP 522 origin failures.

Created the authenticated Supabase Edge Function igdb-search.

Stored Twitch Client ID and Client Secret as Supabase Edge Function secrets.

Added server-side Twitch OAuth token acquisition and in-memory token caching.

Added IGDB search filtering to exclude secondary content such as DLC, expansions, bundles, and mods where possible.

Added title relevance scoring so exact matches rank above loosely related results.

Added prefix fallback search so partial queries such as Valo can return Valorant.

Added IGDB cover art, release year, and normalized five-star ratings.

Removed the RAWG provider from the active application.

Removed the RAWG API key from .env.

Removed RAWG-specific genre IDs from constants/top3-categories.ts.

Search Architecture

Added providers/search.ts as the shared category-to-provider registry.

Moved app/search.tsx to the shared provider registry.

Moved services/post-service.ts hydration to searchByCategory().

Added reusable hooks/use-debounced-value.ts.

Standardized search debounce at 300 ms across Movies, TV, Books, and Video Games.

Preserved provider-specific behavior inside TMDB, Google Books, Open Library, and IGDB integrations.

Tooling

Initialized Supabase CLI support in the project.

Added Supabase Edge Function development configuration.

Installed and configured Deno for Edge Function validation in VS Code.

Separated Expo TypeScript validation from Deno Edge Function validation.

Authentication Stabilization

Added an explicit Supabase session refresh during startup authentication initialization.

The intermittent JWT issued at future startup error is being monitored to confirm whether the refresh fully resolves it.

Current Investigation

Monitor intermittent startup authentication failures reporting JWT issued at future.

No blocking issue is currently confirmed; the application continues to typecheck successfully.