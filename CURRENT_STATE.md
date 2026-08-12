CURRENT_STATE.md

Project: Top3Version: 2.1Status: Active DevelopmentLast Updated: August 12, 2026Current Branch: main

Last Verified Commit

6e59f6d

Improve music suggestions and overall rankings

Dashboard

Project Status

🟢 Active Development

Current Feature

Media preview playback is implemented across Music, Movies, and TV Shows.

Music uses Apple Music preview audio for Songs, Albums, and Artists. Movies and TV Shows use TMDb trailer metadata with in-app YouTube playback.

Trailer availability is checked and cached before Movie / TV play buttons are shown. If TMDb does not provide a usable trailer, the play button is hidden.

Current Priority

Continue improving discovery, feed relevance, recommendations, media experience, and overall product quality while monitoring startup authentication stability.

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

Expo Audio

React Native WebView

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

Apple Music — Music / Songs, Albums, and Artists

Twitch OAuth — Server-side IGDB authentication

Video game search is proxied through the authenticated Supabase Edge Function igdb-search. The Twitch Client Secret is stored only in Supabase Edge Function secrets and is never exposed to the mobile client.

Music search for Songs, Albums, and Artists is proxied through the authenticated Supabase Edge Function apple-music-search. Apple Music developer-token credentials, including the private key, Key ID, and Team ID, are stored only as Supabase Edge Function secrets and are never exposed to the mobile client.

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

AuthProvider↓ProfileProvider↓NotificationProvider↓FollowProvider↓LikeProvider↓CommentProvider↓Top3Provider↓AudioPreviewProvider

Search Architecture

providers/search.ts defines the shared SearchProvider contract and maps application categories to provider implementations.

Movies → providers/tmdb.ts

TV Shows → providers/tmdb.ts

Books → providers/google-books.ts with Open Library fallback

Video Games → providers/games.ts → lib/supabase/igdb.ts → authenticated Supabase Edge Function igdb-search → IGDB

Music / Songs, Albums, and Artists → providers/music.ts → lib/supabase/apple-music.ts → authenticated Supabase Edge Function apple-music-search → Apple Music

Music results include Apple Music artwork and metadata. Songs include track preview URLs; Albums and Artists are enriched with representative track preview URLs where available.

Provider-specific retry, fallback, filtering, ranking, and API behavior remains inside each provider rather than being forced into the shared registry.

The search screen uses a reusable 300 ms debounce hook and maintains an in-memory result cache.

Audio Preview Architecture

Song preview playback is centralized through context/audio-preview-context.tsx and AudioPreviewProvider.

The shared audio preview controller uses Expo Audio and allows only one preview to play at a time across the application.

Audio is configured with playsInSilentMode enabled so previews can play through the iPhone speaker while the device is in silent mode.

Preview controls are currently integrated into:

Search results

RankedItemCard

Top3Card

Overall ranking rows in Category Feed

Community / Overall Top3 ranking rows

Preview controls are shown only when the Top3Item contains a previewUrl.

Existing song collections created before previewUrl support do not automatically gain preview controls; newly selected and published songs persist previewUrl with the collection item.

Movie & TV Trailer Architecture

Movie and TV trailer discovery is provided by providers/tmdb.ts.

TMDb video results are ranked to prefer official YouTube trailers, then other YouTube trailers, then YouTube teasers.

The selected YouTube trailer URL is cached in memory by category and TMDb item ID. A null cache entry records that TMDb returned no usable trailer.

getCachedTrailerAvailability() exposes three states to the UI:

true — a usable trailer is cached

false — TMDb was checked and no usable trailer was found

undefined — trailer availability has not yet been checked

Movie / TV surfaces pre-check trailer availability before rendering the play button. Play buttons are hidden when TMDb has no usable trailer.

Trailer controls are integrated into:

Search results

RankedItemCard

Top3Card

Overall ranking rows in Category Feed

Community / Overall Top3 ranking rows

Trailer playback uses react-native-webview and YouTube embed URLs so playback remains inside Top3 instead of opening the YouTube app.

The trailer player uses a black full-screen modal with a vertically centered 16:9 player and a subtle circular close control positioned above the player. The close control appears after the trailer WebView finishes loading and fades in.

Starting trailer playback stops any active Music audio preview.

Known limitation: a trailer can still be blocked by YouTube for a specific country or region even when TMDb returns a usable trailer. Top3 does not currently maintain user country / location information, so regional YouTube validation is deferred.

Category Artwork Architecture

constants/category-artwork-rules.ts is the shared source of truth for collection-item artwork dimensions.

Current rules:

Movies — 64 × 96

Books — 64 × 96

TV Shows — 64 × 96

Video Games — 64 × 96

Music — 64 × 64

Search, SearchResultSkeleton, RankedItemCard, Top3Card, Overall ranking rows in Category Feed, and Community / Overall Top3 ranking rows use the shared artwork rules so Music artwork remains square while the other current categories retain portrait artwork.

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

Profile Persistence

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

Draft collections

Recent searches

Onboarding state

UI preferences

Realtime

✅ Notifications

✅ Likes

✅ Comments

✅ Following

Shared subscription helper: lib/supabase/realtime.ts

Collection Flow

Recent improvements:

Shared PageHeader across Create, Search, Collection, authentication, and Edit Profile screens

PageHeader supports left- and centre-aligned layouts

Shared Chip component for categories, topics, and search suggestions

Standardized spacing, typography, and page hierarchy

Curated search suggestions remain until a category/topic reaches 50 published collections, then become community-driven

Shared search provider registry routes Movies, TV, Books, Video Games, and Music through one application-level search contract

Music is available as an application category with Songs, Albums, and Artists search experiences

Music search for Songs, Albums, and Artists uses Apple Music through a Supabase Edge Function with server-side developer-token authentication

Song suggestions use Apple Music genre-specific chart data when a Song topic is selected, with evergreen ranking improvements that reduce over-reliance on what is currently popular.

The Music suggestion provider builds a larger popular-song pool for the existing five-at-a-time suggestion / Shuffle experience.

Genre-specific popular suggestions trust the selected Apple Music genre chart rather than applying a second genreNames metadata filter that could incorrectly remove valid chart songs.

Create Collection keeps all supported topics visible even when the user has already published a collection for that topic.

Apple Music search results are normalized into the shared Top3Item shape and variant grouping reduces duplicate recordings while preserving meaningful variants.

Album suggestions were refined toward long-term / evergreen records rather than primarily current popularity.

Artist suggestions were refined toward long-term / canonical artists rather than primarily current popularity.

Album search results are enriched with a representative track preview URL where Apple Music provides a usable preview.

Artist search results are enriched with a representative popular-song preview URL where Apple Music provides a usable preview.

Artist canonical-result enrichment uses Apple Music topResults suggestions to recover authoritative artist artwork and genre metadata when generic search returns a weaker same-name result.

Artist ranking and deduplication prioritize the canonical exact-match Apple Music artist result and remove weaker duplicate exact-name entries.

Music-related SearchResultSkeleton artwork uses the same square presentation as Music search-result artwork.

Expanded Song topic coverage with Blues, Classical, Folk, Latin, Metal, and Reggae, while keeping Soundtrack out of Songs.

Added Apple Music genre aliases to improve matching between Top3 Song topics and Apple Music genre naming.

Top3Item supports previewUrl so Apple Music song previews can travel with selected and persisted collection items.

Added shared song preview playback through AudioPreviewProvider and Expo Audio.

Song previews support play/pause controls in Search, RankedItemCard, Top3Card, Overall ranking rows in Category Feed, and Community / Overall Top3 ranking rows, with one active preview at a time across the app.

Configured song previews to play in iOS silent mode.

Added shared category artwork rules and standardized Music artwork as 64 × 64 while preserving a 64 px artwork width across current categories, including Overall ranking presentations.

Added Movie and TV trailer playback through TMDb video metadata and in-app YouTube WebView playback.

Added Movie / TV trailer controls to Search, RankedItemCard, Top3Card, Overall ranking rows in Category Feed, and Community / Overall Top3 ranking rows.

Added trailer URL caching and availability-aware play buttons so controls are hidden when TMDb has no usable trailer.

Starting a trailer stops any active Music audio preview.

Collection title generation is centralized in utils/build-collection-title.ts and uses the shared Top 3 Category • Topic format for topic-specific collections.

Reusable useDebouncedValue hook provides a 300 ms search debounce across all search categories.

Video game search uses IGDB through a Supabase Edge Function, including prefix fallback and relevance scoring for partial-title searches.

Book search includes improved edition deduplication and relevance handling so distinct titles are not incorrectly collapsed by partial title matches.

Books use curated popular suggestions where appropriate rather than relying only on generic provider search results.

Feed supports pull-to-refresh without returning to the full initial-loading state.

Personalized feed recommendations include Taste Match recommendation explanations derived from shared ranked picks.

Recommendation explanation blocks on Top3Card are tappable and navigate to the recommended user's Taste Match details.

Taste Match details animate the match percentage on load with eased pacing near the final score.

Taste Match presentation uses the shared purple accent for match information and recommendation messaging.

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

August 12, 2026

Movie & TV Trailer Playback

Added TMDb Movie and TV trailer lookup.

Added in-app YouTube playback through react-native-webview.

Added Movie and TV trailer controls to Search, RankedItemCard, Top3Card, Community / Overall Top3, and Category Feed Overall.

Preserved Apple Music preview controls across the same shared item surfaces.

Added a black full-screen trailer modal with a vertically centered 16:9 player.

Added the refined subtle circular close control positioned above the trailer player.

Delayed and faded in the close control after the trailer WebView finishes loading.

Added Movie / TV trailer URL caching in providers/tmdb.ts.

Added getCachedTrailerAvailability() for read-only trailer availability state.

Added availability pre-checks so Movie / TV play buttons are hidden when TMDb has no usable YouTube trailer.

Verified Search trailer availability behavior on device.

Verified RankedItemCard trailer availability behavior on device.

Verified Top3Card trailer availability behavior across Feed, Profile, Published Top 3, and Category Feed Lists.

Verified Community Top3 trailer availability behavior.

Verified Category Feed Overall trailer availability behavior and approved the refined Overall card layout.

Verified Movie, TV, and Music media controls continue to work across the supported surfaces.

Verified npm run typecheck passes after the completed rollout.

Known limitation: some YouTube trailers may still be blocked by country / region even when TMDb identifies a trailer as available. Regional YouTube validation is deferred because Top3 does not currently maintain user country / location information.

August 11, 2026

Music / Albums & Artists

Expanded the Apple Music integration beyond Songs to support Album and Artist search and suggestion experiences.

Refined Album and Artist suggestions to favor evergreen / canonical choices rather than over-weighting current popularity.

Updated Song suggestion logic to use the same more evergreen discovery philosophy.

Added representative track preview enrichment to Album results.

Added representative popular-song preview enrichment to Artist results.

Added Apple Music topResults canonical Artist enrichment so authoritative artist artwork and genre metadata can replace weaker generic-search exact-name matches.

Added Artist ranking and deduplication so canonical exact matches rank first and duplicate same-name results are removed.

Verified the canonical Nirvana Artist result now resolves correctly with Apple Music artwork, Alternative genre metadata, and preview playback.

Updated music-related SearchResultSkeleton artwork to square dimensions while preserving portrait skeleton artwork for non-Music categories.

Validated the Apple Music Edge Function repeatedly with Deno and deployed the updated apple-music-search function to Supabase.

Verified npm run typecheck passes.

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

Music / Songs

Added Music as an application category with Songs as the initial topic.

Added providers/music.ts and lib/supabase/apple-music.ts.

Added the authenticated Supabase Edge Function apple-music-search.

Added server-side Apple Music developer-token generation using Supabase Edge Function secrets.

Added Apple Music song search, artwork, artist metadata, and normalized Top3Item results.

Added variant grouping to reduce duplicate song recordings while preserving meaningful versions and covers.

Integrated Music into the shared providers/search.ts registry and Search screen.

Centralized collection-title generation in utils/build-collection-title.ts.

Standardized topic-specific titles as Top 3 Category • Topic.

Verified the Music → Songs create, search, select, and publish flow in the app.

Verified npm run typecheck passes.

Committed and pushed checkpoint 0fb9fb6 — Add Apple Music song collections.

Apple Music Search & Song Previews

Expanded Song topic coverage with Blues, Classical, Folk, Latin, Metal, and Reggae.

Kept Soundtrack out of the Songs topic set.

Added genre aliases to improve Apple Music search behavior across the supported Song topics.

Added previewUrl to Top3Item and preserved preview URLs through collection selection and persistence.

Added Expo Audio and a shared AudioPreviewProvider.

Configured preview playback to work while iOS is in silent mode.

Added shared play/pause preview controls to Search results, RankedItemCard, and Top3Card.

Enforced one active song preview at a time across the application.

Added constants/category-artwork-rules.ts as the shared artwork sizing source of truth.

Standardized Music artwork as square 64 × 64 across Search, RankedItemCard, and Top3Card while preserving 64 × 96 portrait artwork for Movies, Books, TV Shows, and Video Games.

Verified newly created and published Songs collections retain preview URLs and display working preview controls.

Confirmed older development collections created before previewUrl support do not display preview controls because that field was not persisted in their historical item data.

Verified npm run typecheck passes.

Committed and pushed checkpoint a492204 — Add Apple Music search and song previews.

Music Suggestions & Overall Rankings

Added Apple Music popular song suggestions to the shared popular-suggestions provider registry.

Added genre-aware Apple Music chart suggestions for Song topics.

Popular song suggestions use a larger result pool that feeds the existing five-at-a-time suggestion and Shuffle experience.

Removed the secondary genreNames filter from genre-chart suggestions so valid songs from Apple Music's selected genre chart are not incorrectly discarded.

Updated Create Collection so all supported topics remain visible regardless of whether the user has already published a collection for that topic.

Extended shared category artwork rules to Overall ranking rows in Category Feed and Community / Overall Top3.

Extended shared AudioPreviewProvider playback controls to those Overall ranking rows.

Removed temporary Community Top3 debugging output while preserving its ranking functionality and shared artwork / audio integrations.

Verified the updated Apple Music Edge Function with Deno validation and deployed apple-music-search to Supabase.

Verified npm run typecheck passes.

Committed and pushed checkpoint 6e59f6d — Improve music suggestions and overall rankings.

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

Updated follow request copy to “requested to follow you”.

Removed usernames from request cards.

Replaced the decline button with a compact close icon.

August 4, 2026

Notifications

Added Supabase-backed notifications.

Added NotificationProvider.

Added Notifications tab.

Added unread badge.

Added relative timestamps.

Added actor profile enrichment.

Added collection enrichment.

Added “Mark all as read”.

Added navigation from notifications.

Added automatic database triggers for Likes, Comments, and Follows.

Verified end-to-end notification flow.

Profile Avatars

Added avatar_url to the Supabase profiles table.

Created the public avatars Storage bucket.

Added scoped upload, update, delete, and authenticated select policies.

Removed broad public object-listing access.

Added bucket-level file-size and MIME type restrictions.

Added lib/supabase/storage.ts.

Added persistent avatar uploads using Expo FileSystem and Supabase Storage.

Added avatar URL persistence through ProfileProvider.

Added avatar loading across sessions and devices.

Added cache-busting when replacing an avatar.

Added rollback behaviour when avatar upload or profile persistence fails.

Added a saving state to Edit Profile.

Added client-side 5 MB validation.

Added “Tap photo to change”.

Verified avatar persistence after app restart and sign out/sign in.

Authentication Experience

Added a dedicated provider-choice Sign In screen.

Standardized Apple, Google, and Email options across account creation and sign in.

Added the official native Apple authentication button.

Added a Google-compliant branded authentication button.

Added a reusable Email authentication button.

Routed signed-out users to the provider-choice Sign In screen.

Preserved dedicated Email Sign In and Email Sign Up forms.

Standardized authentication screens with ScreenHeader and PageHeader.

Removed unnecessary back navigation from top-level provider-choice screens.

Retained back navigation on secondary email form screens.

Design System

Expanded PageHeader to support left and centre alignment.

Applied PageHeader to authentication and Edit Profile screens.

Clarified the responsibilities of ScreenHeader and PageHeader.

Continued migration away from duplicated title and subtitle implementations.

Tooling

Added the approved Google colour G SVG asset.

Added React Native SVG Transformer support.

Added metro.config.js.

Added SVG TypeScript declarations.

Added Expo FileSystem for avatar uploads.

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

Monitor the intermittent Supabase JWT issued at future startup error after adding an explicit session refresh during authentication initialization.

Medium Priority

Scope AsyncStorage keys by authenticated user where appropriate.

Improve optimistic rollback behaviour where needed.

✅ Supabase Realtime implemented for Likes, Comments, Following, and Notifications.

Review whether the Google nonce compatibility setting should be hardened in a future authentication pass.

Add avatar removal from the Edit Profile experience if required.

Consider image resizing or compression beyond Image Picker quality settings if avatar storage or bandwidth becomes significant.

Low Priority

Review legacy Expo template files.

Remove placeholder services and unused routes.

Remove packages that are no longer required after implementation review.

Continue migrating hard-coded colours and spacing into shared design tokens.

Consider regional YouTube trailer validation if Top3 later introduces a reliable user country / region source. Current trailer availability checks only confirm that TMDb returns a usable YouTube trailer and do not guarantee country-specific playback.

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

Remember that Music is an active application category. Songs, Albums, and Artists use Apple Music through the authenticated apple-music-search Supabase Edge Function, with Apple Music credentials stored only server-side.

Remember that Top3Item supports previewUrl for Music items. Songs use their track previews; Albums and Artists can be enriched with representative track previews. Shared preview playback is owned by AudioPreviewProvider / context/audio-preview-context.tsx.

Remember that Search, RankedItemCard, Top3Card, Overall ranking rows in Category Feed, and Community / Overall Top3 ranking rows use the shared preview controller; do not implement separate Expo Audio players in those surfaces.

Remember that Movie and TV trailer lookup is owned by providers/tmdb.ts. Trailer URLs and unavailable results are cached in memory, and the UI pre-checks availability before displaying Movie / TV play controls.

Remember that Movie / TV trailer playback is embedded in Top3 through react-native-webview; do not revert trailer controls to Linking.openURL() or external YouTube-app playback.

Remember that the refined trailer modal uses a centered 16:9 player on a black screen and a delayed subtle circular close control positioned above the player.

Remember that regional YouTube restrictions are a known limitation. Top3 does not currently maintain user country / location information, so country-specific trailer validation is deferred.

Remember that category artwork sizing is centralized in constants/category-artwork-rules.ts. Music uses 64 × 64 square artwork; Movies, Books, TV Shows, and Video Games currently use 64 × 96 portrait artwork. The shared rules are used by Search, RankedItemCard, Top3Card, and the Overall ranking presentations.

Remember that Apple Music Song suggestions use genre-specific chart data for Song topics and trust the selected chart without applying a second genreNames metadata filter. Songs, Albums, and Artists have also been tuned toward more evergreen discovery rather than simply mirroring current popularity.

Remember that Create Collection intentionally keeps all supported topics visible even when a matching topic collection has already been published.

Remember that collection titles are generated centrally by utils/build-collection-title.ts and topic-specific titles use Top 3 Category • Topic.

Remember that search routing is centralized in providers/search.ts, and app/search.tsx uses a reusable 300 ms debounce hook.

Do not recommend migrating Following again—it has already been completed.

Document Purpose

CURRENT_STATE.md provides an accurate snapshot of the application's current architecture and implementation.

Strategic direction belongs in ROADMAP.md.

Historical milestones belong in CHANGELOG.md.