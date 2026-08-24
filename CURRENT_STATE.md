CURRENT_STATE.md

Project: Top3Version: 2.7Status: Active DevelopmentLast Updated: August
24, 2026Current Branch: main

Last Verified Commit

f8c62c3

Ignore local privacy audit artifacts

Dashboard

Project Status

🟢 Active Development

Current Feature

The redesigned onboarding and account flow is implemented end-to-end.

New signed-out users can begin by creating their first Top 3 list before
account creation. Email confirmation preserves the pending list,
establishes the authenticated session through the auth callback,
publishes the list, and continues into onboarding education for Lists,
Overall rankings, and Taste Match.

Account deletion is implemented through a Supabase Edge Function and
resets local onboarding / welcome state so a deleted user returns to the
beginning of the onboarding experience. Sign in with Apple accounts also
capture the Apple authorization code during sign-in, exchange it server-side
for an Apple refresh token, and store that token in the protected
apple_auth_tokens table. The permanent delete-account Edge Function revokes
the stored Apple authorization with Apple before deleting the Top3 account.

User-generated-content moderation is implemented for reported lists and
comments. Moderators can review reports and remove reported content
through the moderation workflow. Removed collections are excluded from
normal collection / published-post queries through removed_at filtering.

V1 prohibited-content filtering is implemented and verified for comments
and the free-form profile fields display name, username, and bio.
Enforcement is server-side in Supabase. A shared content_filter_terms table
contains a conservative 49-term production hard-block list, and
contains_blocked_content(text) normalizes case and punctuation before
whole-term / phrase matching. Expected content rejections use the
established Top3-styled ActionSheet experience and preserve entered text
for correction.

Creator-side moderation removal propagation is implemented through the
shared Supabase Realtime helper and the moderation_content_removals
event table. Authenticated users can select only their own removal-event
rows through RLS. When one of the authenticated user's published lists
is removed by moderation, Top3Provider evicts that collection and its
corresponding post from local state and clears currentListId when
necessary, preventing removed content from being reopened through stale
Create state.

Current Priority

Prioritize V1 launch readiness and App Store preparation while
continuing to monitor startup authentication stability and fixing
launch-blocking issues in safety, privacy, security, moderation,
reliability, and data integrity.

The current Feed architecture is acceptable for initial low-volume
launch and real-user validation, but it is not the intended large-scale
production architecture. Cursor-paginated, server-generated Feed work is
deliberately deferred until post-launch and should be treated as a
high-priority scalability initiative before published collection volume
becomes materially expensive for clients.

Architecture should always be discussed before implementation begins.
Scalability must be considered explicitly for new architecture and
data-access patterns because Top3 is intended to support a very large
user base.

Typecheck

✅ Passing

Known Blocking Bugs

None

Project Summary

Top3 is a social discovery platform that helps people discover
entertainment and connect with others through curated Top 3 lists.

Lists are the foundation of the user experience.

Everything else---including discovery, recommendations, community
rankings, Taste Match, profiles, and social interaction---is derived
from published lists.

Implementation note: existing code, types, database helpers, and
persistence architecture may continue to use collection terminology
internally. "List" is the preferred user-facing product term.

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

Analytics

Amplitude Analytics for React Native

State Management

React Context

Local Storage

AsyncStorage

AsyncStorage is used only for temporary or local application state that
does not yet require shared server persistence.

External Search Integrations

TMDB --- Movies and TV Shows

Google Books --- Books

Open Library --- Book fallback provider

IGDB --- Video Games

Apple Music --- Music / Songs, Albums, and Artists

Twitch OAuth --- Server-side IGDB authentication

Video game search is proxied through the Supabase Edge Function
video-game-search. The function accepts the app's publishable key so
Video Games search works during signed-out onboarding as well as for
authenticated users. The Twitch Client Secret is stored only in Supabase
Edge Function secrets and is never exposed to the mobile client.

Music search for Songs, Albums, and Artists is proxied through the
authenticated Supabase Edge Function apple-music-search. Apple Music
developer-token credentials, including the private key, Key ID, and Team
ID, are stored only as Supabase Edge Function secrets and are never
exposed to the mobile client.

Navigation

Bottom Tabs

Feed

Discover

Create

Notifications

Profile

Additional Screens

Authentication

Onboarding

Create Account provider selection

Sign In provider selection

Email Sign Up

Email Sign In

Forgot Password

Reset Password

Check Email

Auth Callback

Onboarding Published / Lists → Overall

Onboarding Taste Match

Lists and Discovery

List Creation

List Editing

Published List

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

AuthProvider↓AuthGate↓OnboardingCollectionProvider↓ProfileProvider↓NotificationProvider↓FollowProvider↓LikeProvider↓CommentProvider↓Top3Provider↓AudioPreviewProvider

Search Architecture

providers/search.ts defines the shared SearchProvider contract and maps
application categories to provider implementations.

Movies → providers/movies-and-tv.ts

TV Shows → providers/movies-and-tv.ts

Books → providers/books.ts → Google Books with Open Library fallback

Video Games → providers/video-games.ts → lib/supabase/video-games.ts →
Supabase Edge Function video-game-search → IGDB

Music / Songs, Albums, and Artists → providers/music.ts →
lib/supabase/apple-music.ts → authenticated Supabase Edge Function
apple-music-search → Apple Music

Music results include Apple Music artwork and metadata. Songs include
track preview URLs; Albums and Artists are enriched with representative
track preview URLs where available.

Provider-specific retry, fallback, filtering, ranking, and API behavior
remains inside each provider rather than being forced into the shared
registry.

The search screen uses a reusable 300 ms debounce hook and maintains an
in-memory result cache.

Audio Preview Architecture

Song preview playback is centralized through
context/audio-preview-context.tsx and AudioPreviewProvider.

The shared audio preview controller uses Expo Audio and allows only one
preview to play at a time across the application.

Audio is configured with playsInSilentMode enabled so previews can play
through the iPhone speaker while the device is in silent mode.

Preview controls are currently integrated into:

Search results

RankedItemCard

Top3Card

Overall ranking rows in Category Feed

Community / Overall Top3 ranking rows

Preview controls are shown only when the Top3Item contains a previewUrl.

Existing song collections created before previewUrl support do not
automatically gain preview controls; newly selected and published songs
persist previewUrl with the collection item.

Movie & TV Trailer Architecture

Movie and TV trailer discovery is provided by
providers/movies-and-tv.ts.

TMDb video results are ranked to prefer official YouTube trailers, then
other YouTube trailers, then YouTube teasers.

The selected YouTube trailer URL is cached in memory by category and
TMDb item ID. A null cache entry records that TMDb returned no usable
trailer.

getCachedTrailerAvailability() exposes three states to the UI:

true --- a usable trailer is cached

false --- TMDb was checked and no usable trailer was found

undefined --- trailer availability has not yet been checked

Movie / TV surfaces pre-check trailer availability before rendering the
play button. Play buttons are hidden when TMDb has no usable trailer.

Trailer controls are integrated into:

Search results

RankedItemCard

Top3Card

Overall ranking rows in Category Feed

Community / Overall Top3 ranking rows

Trailer playback uses react-native-webview and YouTube embed URLs so
playback remains inside Top3 instead of opening the YouTube app.

The trailer player uses a black full-screen modal with a vertically
centered 16:9 player and a subtle circular close control positioned
above the player. The close control appears after the trailer WebView
finishes loading and fades in.

Starting trailer playback stops any active Music audio preview.

Known limitation: a trailer can still be blocked by YouTube for a
specific country or region even when TMDb returns a usable trailer. Top3
does not currently maintain user country / location information, so
regional YouTube validation is deferred.

Category Artwork Architecture

constants/category-artwork-rules.ts is the shared source of truth for
collection-item artwork dimensions.

Current rules:

Movies --- 64 × 96

Books --- 64 × 96

TV Shows --- 64 × 96

Video Games --- 64 × 96

Music --- 64 × 64

Search, SearchResultSkeleton, RankedItemCard, Top3Card, Overall ranking
rows in Category Feed, and Community / Overall Top3 ranking rows use the
shared artwork rules so Music artwork remains square while the other
current categories retain portrait artwork.

Presentation Layer

Layout

ScreenHeader

PageHeader

ScreenHeader owns the top navigation bar, including the Top 3 brand,
optional back navigation, and divider.

PageHeader owns the page title and optional subtitle below the
navigation bar. It supports both left- and centre-aligned layouts.

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

Authentication is implemented through a shared service layer and
Supabase Auth.

The existing AuthProvider restores persisted sessions and responds to
authentication state changes for email, Apple, and Google accounts.

During startup, the authentication service restores the persisted
Supabase session and refreshes it before AuthGate releases the rest of
the application. This is intended to reduce intermittent startup
failures caused by stale or timing-sensitive JWTs.

Authentication & Onboarding Screen Flow

New signed-out user↓Onboarding intro↓Choose category / topic↓Build first
Top 3 list↓Publish↓Create Account├─ Continue with Apple├─ Continue with
Google└─ Continue with Email↓Email Sign Up↓Check Email↓Auth
Callback↓Pending list published↓Published / Lists → Overall
onboarding↓Taste Match onboarding↓Feed

Already have an account?↓Sign In├─ Continue with Apple├─ Continue with
Google└─ Continue with Email↓Email Sign In├─ Sign In└─ Forgot
Password↓Send Reset Link↓Check Email / Open Email App↓Recovery Deep
Link↓Reset Password↓Return to Sign In

The obsolete standalone Welcome route and WelcomeScreen component have
been removed. app/onboarding.tsx is the entry experience for new users.

Provider-choice screens use the shared ScreenHeader and PageHeader
without a back button.

Email form screens use the shared ScreenHeader with a back button so
users can return to provider selection.

Signing out routes users to the provider-choice Sign In screen rather
than directly to the email form.

Email confirmation deep links are handled by
app/(auth)/auth-callback.tsx. The callback establishes the Supabase
session and returns through app/index.tsx, which completes any pending
onboarding publish before routing forward.

The callback and pending-publish handoff use a consistent verification
presentation so the browser → app transition does not expose an
unrelated generic loading state.

Onboarding authentication intent distinguishes new-account creation from
returning-user sign in so an existing user does not accidentally
continue through new-user onboarding.

Password Recovery

Email password recovery is implemented through the shared authentication
service and Supabase Auth.

Email Sign In includes a Forgot password? action that opens
app/(auth)/forgot-password.tsx.

The Forgot Password screen validates the email address, requests a
Supabase password-reset email, and then presents a Check your email
state with an Open Email App action using the same message:// pattern as
the onboarding confirmation flow.

Password-reset deep links return to Top3 and establish the recovery
session before app/(auth)/reset-password.tsx allows the user to choose
and confirm a new password.

The reset form validates password length and matching confirmation
values. If Supabase reports that the submitted password is the same as
the current password, Top3 presents a friendly Choose a different
password alert without triggering the Expo development error overlay.

The recovery flow has been verified end-to-end on device, including
changing to a new password, signing in with the changed password,
reusing a previously used password in a later reset, and rejecting only
the password that is current at the time of the reset.

Email Authentication

Status: ✅ Complete

Supports:

Email sign up

Email sign in

Email verification flow

Email confirmation deep-link callback

Forgot-password entry from Email Sign In

Password-reset email request through Supabase Auth

Open Email App action after requesting a reset

Password-recovery deep-link session handling

Dedicated Reset Password screen

Friendly same-password validation without a development error overlay

Pending onboarding-list publishing after verification

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

Apple account-lifecycle support:

The native Apple credential's authorization code is sent to the authenticated
apple-auth-token Supabase Edge Function after successful sign-in. The Edge
Function generates the Apple client secret server-side, exchanges the
authorization code with Apple, and stores the resulting refresh token in the
protected apple_auth_tokens table keyed by Supabase user ID.

Apple Team ID, Key ID, Client ID, and private signing key are stored only as
Supabase Edge Function secrets. The private key is never exposed to the
mobile client.

When an Apple-authenticated user deletes their Top3 account, the permanent
delete-account Edge Function loads the stored refresh token and calls Apple's
token revocation endpoint before deleting the Supabase Auth user. Revocation
failure stops account deletion rather than silently leaving the Apple
authorization active.

The Apple revocation flow was verified end-to-end using a temporary
verification Edge Function. That temporary function and its Settings test UI
were removed after verification. The admin account was subsequently
re-authorized and a fresh stored Apple refresh token was confirmed.

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

Nonce checks skipped for compatibility with the native iOS Google
Sign-In flow

The Google Client Secret must never be stored in the mobile application,
committed to Git, or added to the app's public environment variables.

Profiles

Profile Notifications

Notification Status

Status: ✅ Complete

Notifications are fully persisted through Supabase.

Supported notification types:

• Likes• Comments• Follows

Implementation includes:

• NotificationProvider• Notifications tab• Bottom-tab unread badge•
Relative timestamps• Actor profile enrichment• Collection title
enrichment• Read / unread state• Mark all as read• Pull-to-refresh•
Navigation to collections• Navigation to public profiles

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

Save flow waits for upload and profile persistence before navigating
away

Loading state while the profile is being saved

Friendly failure alert if upload or persistence fails

"Tap photo to change" affordance

5 MB client-side avatar limit

5 MB bucket-level file-size limit

Restricted image MIME types

Verified persistence after app restart and sign out/sign in

Avatar Storage Policies

The avatars bucket uses scoped Storage policies:

Authenticated users can upload only to their own user-ID folder

Authenticated users can update only objects in their own folder

Authenticated users can delete only objects in their own folder

Authenticated users can select only their own avatar objects, which is
required for replacing an existing object with upsert

Public URLs remain readable because the bucket is public

Broad public object-listing access has been removed

Avatar Storage Helper

lib/supabase/storage.ts provides:

uploadAvatar()

getAvatarPublicUrl()

deleteAvatar()

Avatar uploads use Expo FileSystem's File.arrayBuffer() API and Supabase
Storage.

Supabase

✅ Authentication

✅ Profiles

✅ Profile avatars

✅ Lists / collections persistence

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

✅ Creator-scoped moderation content removals

Shared subscription helper: lib/supabase/realtime.ts

The shared Realtime helper passes Postgres change payloads to
subscribers so callers can react to a specific changed row without
automatically re-querying an entire table.

Top3Provider subscribes to moderation_content_removals with a
server-side user_id filter for the authenticated user. The table has RLS
enabled and authenticated users can select only rows where user_id =
auth.uid(). This avoids exposing global moderation-removal activity to
clients and prevents the creator-side removal flow from requiring a full
collections reload.

List Flow

User-facing terminology uses "Lists." Internal implementation may retain
collection naming where it represents existing types, database
structures, helpers, or file names.

Recent improvements:

New users can create their first list while signed out before creating
an account.

The onboarding list and pending-publish state survive the authentication
handoff.

After publishing, onboarding introduces the relationship between
individual Lists and the community Overall ranking using a synchronized
Lists → Overall toggle, headline, and card transition.

The Overall onboarding card preserves the same category-specific artwork
proportions and media-preview controls as the published-list card, and
explains how many published posts contribute to the ranking.

Taste Match onboarding follows the Overall explanation and uses an
animated percentage that begins counting as the card fades in.

Account deletion removes the authenticated account through the
delete-account Supabase Edge Function, signs the user out, and resets
local welcome state so a deleted user returns to onboarding. For accounts
with a stored Apple refresh token, the Edge Function revokes the user's
Sign in with Apple authorization before deleting the Supabase Auth user.

The obsolete standalone Welcome screen has been removed.

Recent improvements:

Shared PageHeader across Create, Search, Collection, authentication, and
Edit Profile screens

PageHeader supports left- and centre-aligned layouts

Shared Chip component for categories, topics, and search suggestions

Standardized spacing, typography, and page hierarchy

Curated search suggestions remain until a category/topic reaches 50
published collections, then become community-driven

Shared search provider registry routes Movies, TV, Books, Video Games,
and Music through one application-level search contract

Music is available as an application category with Songs, Albums, and
Artists search experiences

Music search for Songs, Albums, and Artists uses Apple Music through a
Supabase Edge Function with server-side developer-token authentication

Song suggestions use Apple Music genre-specific chart data when a Song
topic is selected, with evergreen ranking improvements that reduce
over-reliance on what is currently popular.

The Music suggestion provider builds a larger popular-song pool for the
existing five-at-a-time suggestion / Shuffle experience.

Genre-specific popular suggestions trust the selected Apple Music genre
chart rather than applying a second genreNames metadata filter that
could incorrectly remove valid chart songs.

Create List keeps all supported topics visible even when the user has
already published a list for that topic.

Apple Music search results are normalized into the shared Top3Item shape
and variant grouping reduces duplicate recordings while preserving
meaningful variants.

Album suggestions were refined toward long-term / evergreen records
rather than primarily current popularity.

Artist suggestions were refined toward long-term / canonical artists
rather than primarily current popularity.

Album search results are enriched with a representative track preview
URL where Apple Music provides a usable preview.

Artist search results are enriched with a representative popular-song
preview URL where Apple Music provides a usable preview.

Artist canonical-result enrichment uses Apple Music topResults
suggestions to recover authoritative artist artwork and genre metadata
when generic search returns a weaker same-name result.

Artist ranking and deduplication prioritize the canonical exact-match
Apple Music artist result and remove weaker duplicate exact-name
entries.

Music-related SearchResultSkeleton artwork uses the same square
presentation as Music search-result artwork.

Expanded Song topic coverage with Blues, Classical, Folk, Latin, Metal,
and Reggae, while keeping Soundtrack out of Songs.

Added Apple Music genre aliases to improve matching between Top3 Song
topics and Apple Music genre naming.

Top3Item supports previewUrl so Apple Music song previews can travel
with selected and persisted collection items.

Added shared song preview playback through AudioPreviewProvider and Expo
Audio.

Song previews support play/pause controls in Search, RankedItemCard,
Top3Card, Overall ranking rows in Category Feed, and Community / Overall
Top3 ranking rows, with one active preview at a time across the app.

Configured song previews to play in iOS silent mode.

Added shared category artwork rules and standardized Music artwork as 64
× 64 while preserving a 64 px artwork width across current categories,
including Overall ranking presentations.

Added Movie and TV trailer playback through TMDb video metadata and
in-app YouTube WebView playback.

Added Movie / TV trailer controls to Search, RankedItemCard, Top3Card,
Overall ranking rows in Category Feed, and Community / Overall Top3
ranking rows.

Added trailer URL caching and availability-aware play buttons so
controls are hidden when TMDb has no usable trailer.

Starting a trailer stops any active Music audio preview.

Collection title generation is centralized in
utils/build-collection-title.ts and uses the shared Top 3 Category •
Topic format for topic-specific collections.

Reusable useDebouncedValue hook provides a 300 ms search debounce across
all search categories.

Video game search uses IGDB through a Supabase Edge Function, including
prefix fallback and relevance scoring for partial-title searches.

Book search includes improved edition deduplication and relevance
handling so distinct titles are not incorrectly collapsed by partial
title matches.

Books use curated popular suggestions where appropriate rather than
relying only on generic provider search results.

Feed supports pull-to-refresh without returning to the full
initial-loading state.

Personalized feed recommendations include Taste Match recommendation
explanations derived from shared ranked picks.

Recommendation explanation blocks on Top3Card are tappable and navigate
to the recommended user's Taste Match details.

Taste Match details animate the match percentage on load with eased
pacing near the final score.

Taste Match presentation uses the shared purple accent for match
information and recommendation messaging.

Sharing & Analytics

Status: ✅ Complete for current V1 scope

Published individual Lists can be shared through the native iOS Share Sheet from Feed, Profile, Category Feed list cards, and Published Top 3 detail.

Overall community rankings can also be shared from Category Feed. Shared Overall deep links preserve category, topic, and view=overall so recipients land directly on the Overall ranking.

Deep links currently use the Top3 custom URL scheme. Logged-out recipients who already have Top3 installed can open shared published Lists and Overall rankings.

Supabase anonymous access to collections is deliberately limited to SELECT access for published, non-removed collections through table grants plus Row Level Security. Drafts remain inaccessible to anonymous users.

Universal Links and a public web fallback for recipients who do not have Top3 installed are deferred until the production Top3 domain is confirmed.

Amplitude analytics is implemented for the current V1 event scope. The collection_shared event is recorded only when the native Share Sheet reports a completed share; dismissing the Share Sheet does not record collection_shared.

collection_shared includes source attribution for:

• feed
• profile
• category_feed
• published_detail
• overall

The current analytics event set covers account creation and onboarding, collection lifecycle actions, search and item activity, discovery and profile activity, follows, likes, comments, Taste Match, collection views, notification opens, and successful collection shares.

Feed Architecture & Scalability

Current V1 implementation:

• services/post-service.ts retrieves the complete published-post dataset
through getPublishedPosts().

• Published posts are hydrated client-side. If a persisted item is
missing artwork, hydration can fall back to searchByCategory(), with an
in-memory hydrated-item cache reducing repeated provider lookups during
the session.

• utils/build-personalized-feed.ts constructs the personalized Feed on
the client from the available published posts.

• The main chronological portion contains the current user's posts and
posts from followed users.

• Taste Match recommendations are also calculated client-side. The
current recommendation service groups the available post dataset by
author and uses calculateTasteMatch() to compare eligible users.

• Recommendations currently insert one suggested post after every three
priority posts when recommendations are available.

Scalability decision:

The current architecture is intentionally retained for V1 launch so Top3
can begin gathering real-user usage data before a larger Feed migration.
It is considered suitable for initial low-volume usage, not for a very
large published-post corpus.

The target post-launch architecture is a cursor-paginated,
server-generated Feed that returns only a small page of ready-to-render
entries at a time. Follow relationships and recommendation candidate
selection should be handled server-side / database-side rather than
requiring the phone to download the global published-post dataset.

Taste Match ranking rules should be preserved, but candidate generation
must be bounded at scale. Longer-term optimization may include
incrementally precomputed taste relationships rather than comparing the
current user with every author when the Feed opens.

Persisted collection items should normally contain the artwork and
metadata needed to render them. View-time external-provider hydration
should not become a dependency of the large-scale Feed path.

A partial Postgres index named collections_published_feed_idx has been
added for published, non-removed collections using published_at DESC,
user_id, and id. It supports the planned cursor-paginated Feed while
avoiding index entries for drafts and removed collections.

Future Feed pagination and server-side recommendation work is
deliberately deferred until after V1 launch. This is an explicit product
/ architecture decision, not forgotten technical debt.

Current Source of Truth

User-facing product terminology

✅ Lists is the preferred product term

Internal collection naming remains valid where it describes existing
implementation architecture

Onboarding & account lifecycle

✅ Signed-out first-list creation

✅ Persistent onboarding collection and authentication intent

✅ Email confirmation callback

✅ Pending first-list publish after authentication

✅ Lists → Overall onboarding education

✅ Taste Match onboarding education

✅ Account deletion

✅ Sign in with Apple authorization-code capture and server-side refresh-token storage

✅ Apple authorization revocation before deletion for Apple-authenticated accounts

✅ Local onboarding reset after account deletion

Authentication & account recovery

✅ Forgot-password entry from Email Sign In

✅ Supabase password-reset email request

✅ Open Email App recovery handoff

✅ Password-recovery deep-link session handling

✅ Dedicated Reset Password flow

✅ Friendly same-password validation

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

Sharing & analytics

✅ Published List sharing

✅ Overall ranking sharing

✅ Deep-link routing to shared Lists and Overall rankings

✅ Logged-out access to published, non-removed shared content for installed-app recipients

✅ Amplitude analytics implemented for current V1 scope

✅ Successful-share tracking with source attribution

➡️ Universal Links / public web fallback deferred until the production domain is confirmed

Moderation

✅ Reported-list and reported-comment moderation workflow

✅ Moderator Remove Content action

✅ Removed collections excluded by removed_at filtering

✅ moderation_content_removals event table with authenticated
user-scoped RLS

✅ Creator-side Realtime eviction of moderated collections / posts from
Top3Provider local state

✅ V1 prohibited-content filtering for comments, display name, username,
and bio

✅ Server-side Supabase enforcement using content_filter_terms and
contains_blocked_content(text)

✅ Conservative 49-term production hard-block list installed and verified

✅ Top3-styled rejection messaging with entered text preserved for
correction

Feed scalability

⚠️ V1 Feed currently retrieves the complete published-post dataset and
builds personalization / Taste Match recommendations client-side

✅ collections_published_feed_idx added for the future published Feed
query

➡️ Cursor-paginated, server-generated Feed intentionally deferred until
post-launch and classified as a high-priority scalability initiative

Recent Milestones

August 24, 2026

Apple Account Deletion & Authorization Revocation

Added the authenticated apple-auth-token Supabase Edge Function to exchange
the authorization code returned by native Sign in with Apple for an Apple
refresh token.

Added protected server-side persistence of Apple refresh tokens in
apple_auth_tokens, keyed by the authenticated Supabase user ID.

Configured Apple Team ID, Key ID, Client ID, and private signing key as
Supabase Edge Function secrets.

Extended the permanent delete-account Edge Function so Apple authorization is
revoked through Apple's /auth/revoke endpoint before the Supabase Auth user is
deleted.

Made Apple revocation failure stop account deletion so Top3 does not silently
delete the local account while leaving the Apple authorization active.

Verified Apple refresh-token acquisition and persistence end-to-end.

Verified Apple authorization revocation end-to-end with a temporary
apple-auth-revoke-test Edge Function, then removed the temporary deployed
function, local function folder, and Settings test UI.

Re-authorized the admin Apple account after testing and confirmed a fresh
refresh token was stored successfully.

Verified deno check passes for apple-auth-token and delete-account.

Verified npm run typecheck passes.

Committed and pushed the completed application checkpoint e285efc and
housekeeping checkpoint f8c62c3. The working tree was verified clean.

August 22, 2026

Sharing, Deep Links & Analytics

Added native iOS sharing for published individual Lists across Feed, Profile, Category Feed list cards, and Published Top 3 detail.

Added sharing for Overall community rankings from Category Feed.

Added deep-link routing for Overall rankings using category, topic, and view=overall parameters and verified shared Overall links land on the Overall view.

Enabled logged-out recipients with Top3 installed to load shared public content by adding deliberately restricted anonymous SELECT access for published, non-removed collections. Drafts remain protected by Row Level Security.

Completed the current V1 Amplitude analytics instrumentation.

Added collection_shared tracking that fires only after a completed native Share Sheet action and does not fire when the Share Sheet is dismissed.

Added collection_shared source attribution for feed, profile, category_feed, published_detail, and overall.

Verified the share events and source properties in Amplitude Live Events.

Verified npm run typecheck passes after the sharing analytics rollout.

Universal Links / public web fallback remain deferred until the production Top3 domain is confirmed.

August 21, 2026

V1 Prohibited-Content Filtering

Completed and verified the V1 automated prohibited-content filtering layer
for comments and the free-form profile fields display name, username, and
bio.

Added server-side Supabase enforcement and the shared content_filter_terms
table with a conservative 49-term production hard-block list.

Verified contains_blocked_content(text) normalizes case and punctuation and
matches normalized whole terms / phrases rather than unsafe raw substrings.

Removed the temporary top3filtertest proof-of-concept term after production
verification.

Verified database acceptance tests for normal text, direct threats, case
and punctuation variations, embedded prohibited phrases, and the legitimate
title “Kill Bill.”

Verified end-to-end on iPhone that prohibited comments are not published,
the Top3-styled “Comment not posted” ActionSheet appears, and entered text
remains available for correction.

Verified prohibited-content rejection for profile display name, username,
and bio.

Consolidated Published Top 3 comments onto the shared CommentsSheet:
removed the inline comments section / bottom composer and made the comment
icon open CommentsSheet consistently with other list surfaces.

August 20, 2026

Moderation Removal & Feed Scalability Review

Completed and verified the moderator Remove Content flow for reported
lists.

Removed collections are filtered from collection and published-post
reads using removed_at.

Added moderation_content_removals as the event source for creator-side
moderation removal propagation.

Granted authenticated SELECT access to moderation_content_removals,
enabled RLS, and added a policy restricting users to rows where user_id
= auth.uid().

Updated the shared Realtime helper to pass Postgres change payloads to
subscribers.

Added a user-scoped moderation_content_removals subscription to
Top3Provider. INSERT events for removed posts evict the affected
collection from lists, remove its corresponding post from posts, and
clear currentListId when necessary without reloading the full
collections dataset.

Verified on device that moderated creator content is removed from
Profile / local list state and does not remain available as stale
published content in the Create flow.

Reviewed Feed scalability and confirmed that the current V1 Feed
retrieves the complete published-post dataset, hydrates posts
client-side, and performs personalized Feed / Taste Match selection
client-side.

Decided to retain the current Feed architecture for initial V1 launch
and real-user validation rather than completing a speculative
large-scale Feed rewrite before App Store release.

Defined cursor-paginated, server-generated Feed delivery with bounded
server-side recommendation candidate generation as a high-priority
post-launch scalability direction.

Added collections_published_feed_idx, a partial index over published,
non-removed collections using published_at DESC, user_id, and id, to
support the future paginated Feed path.

Verified npm run typecheck passes after the Realtime moderation-removal
changes.

August 17, 2026

Password Recovery

Added Forgot password? to Email Sign In.

Added a dedicated Forgot Password screen that validates the user's email
address and requests a Supabase password-reset email.

Added a Check your email success state with an Open Email App action
that reuses the existing message:// email-client pattern.

Added a dedicated Reset Password screen that establishes the recovery
session from the password-reset deep link and lets the user choose and
confirm a new password.

Added friendly handling when the submitted password matches the
account's current password so the expected validation case does not
trigger the Expo development error overlay.

Verified the complete forgot-password flow end-to-end on device,
including successful password changes, sign-in with the changed
password, reuse of a previously used password in a later reset, and
clean same-password validation.

Verified npm run typecheck passes.

Committed and pushed checkpoint db8b367 --- Add forgot password flow.

August 17, 2026

Onboarding & Account Flow

Completed and polished the redesigned signed-out onboarding flow.

New users can build their first Top 3 list before account creation, with
the list preserved while authentication is completed.

Added the email confirmation auth callback and pending-publish handoff
so the first list is published after the authenticated session is
established.

Added the post-publish onboarding sequence that transforms from Lists to
Overall and then introduces Taste Match.

Synchronized the Lists → Overall toggle, heading, supporting copy, and
card crossfade.

Refined the Overall onboarding card to match the published-list card
layout, preserve category-specific artwork sizing, and retain applicable
media preview controls.

Refined the Taste Match onboarding score so it begins counting from 0
while the card fades into view.

Removed the obsolete standalone Welcome route and WelcomeScreen
component.

Added account deletion through the delete-account Supabase Edge Function
and reset local welcome state after deletion.

Standardized "Lists" as the preferred user-facing term while preserving
existing collection terminology where it remains part of the internal
implementation.

Improved the browser → app email-confirmation handoff by keeping the
verification presentation consistent while the pending onboarding list
is published.

Verified the complete staged working state with npm run typecheck.

Committed and pushed checkpoint 85d2794 --- Complete onboarding and
account flow.

August 13, 2026

Onboarding & Video Games Search

Enabled Video Games search during signed-out onboarding by changing the
Video Games Edge Function wrapper from user authentication to
publishable-key authentication.

Renamed application-facing Video Games integration paths from
providers/games.ts and lib/supabase/igdb.ts to providers/video-games.ts
and lib/supabase/video-games.ts.

Renamed the Supabase Edge Function from igdb-search to video-game-search
and updated supabase/config.toml and the client invocation accordingly.

Kept IGDB-specific naming inside the Edge Function implementation where
it accurately describes the external provider.

Deployed video-game-search with JWT gateway verification disabled and
verified Video Games search works on device while signed out during
onboarding.

Removed the old deployed igdb-search Edge Function after verifying the
renamed endpoint.

Verified npm run typecheck and the Video Games Edge Function Deno check
pass.

August 12, 2026

Movie & TV Trailer Playback

Added TMDb Movie and TV trailer lookup.

Added in-app YouTube playback through react-native-webview.

Added Movie and TV trailer controls to Search, RankedItemCard, Top3Card,
Community / Overall Top3, and Category Feed Overall.

Preserved Apple Music preview controls across the same shared item
surfaces.

Added a black full-screen trailer modal with a vertically centered 16:9
player.

Added the refined subtle circular close control positioned above the
trailer player.

Delayed and faded in the close control after the trailer WebView
finishes loading.

Added Movie / TV trailer URL caching in providers/movies-and-tv.ts.

Added getCachedTrailerAvailability() for read-only trailer availability
state.

Added availability pre-checks so Movie / TV play buttons are hidden when
TMDb has no usable YouTube trailer.

Verified Search trailer availability behavior on device.

Verified RankedItemCard trailer availability behavior on device.

Verified Top3Card trailer availability behavior across Feed, Profile,
Published Top 3, and Category Feed Lists.

Verified Community Top3 trailer availability behavior.

Verified Category Feed Overall trailer availability behavior and
approved the refined Overall card layout.

Verified Movie, TV, and Music media controls continue to work across the
supported surfaces.

Verified npm run typecheck passes after the completed rollout.

Known limitation: some YouTube trailers may still be blocked by country
/ region even when TMDb identifies a trailer as available. Regional
YouTube validation is deferred because Top3 does not currently maintain
user country / location information.

August 11, 2026

Music / Albums & Artists

Expanded the Apple Music integration beyond Songs to support Album and
Artist search and suggestion experiences.

Refined Album and Artist suggestions to favor evergreen / canonical
choices rather than over-weighting current popularity.

Updated Song suggestion logic to use the same more evergreen discovery
philosophy.

Added representative track preview enrichment to Album results.

Added representative popular-song preview enrichment to Artist results.

Added Apple Music topResults canonical Artist enrichment so
authoritative artist artwork and genre metadata can replace weaker
generic-search exact-name matches.

Added Artist ranking and deduplication so canonical exact matches rank
first and duplicate same-name results are removed.

Verified the canonical Nirvana Artist result now resolves correctly with
Apple Music artwork, Alternative genre metadata, and preview playback.

Updated music-related SearchResultSkeleton artwork to square dimensions
while preserving portrait skeleton artwork for non-Music categories.

Validated the Apple Music Edge Function repeatedly with Deno and
deployed the updated apple-music-search function to Supabase.

Verified npm run typecheck passes.

August 10, 2026

Discovery, Recommendations & Search Quality

Improved Google Books search relevance and edition deduplication so
distinct books with overlapping title words remain discoverable.

Added curated book suggestions for stronger default discovery.

Completed the shared Video Games search path through IGDB and improved
generic game suggestions and partial-title search quality.

Refined personalized Feed recommendations and Taste Match recommendation
explanations.

Made the full recommendation explanation block on Top3Card tappable and
connected it to the recommended user's Taste Match screen.

Taste Match

Added an animated count-up for the Taste Match percentage.

Refined the animation pacing so it slows naturally as it approaches the
final score.

Updated Taste Match presentation with a white summary card, shared
purple accent treatment, matching keylines, and tighter ranked-pick
spacing.

Refined recommendation messaging styling and spacing.

Feed

Added native pull-to-refresh to the Home feed.

Refresh reloads published posts and author data without showing the full
initial-loading state.

Product & UI

Added and refined Settings, About, and Privacy screens.

Added reusable SearchInput, Card, SecondaryActionPill, and SectionHeader
UI components.

Continued consolidation of shared colours, spacing, and presentation
patterns.

Checkpoint

Verified npm run typecheck passes.

Committed and pushed checkpoint f833160 --- Polish discovery,
recommendations, and social experience.

Music / Songs

Added Music as an application category with Songs as the initial topic.

Added providers/music.ts and lib/supabase/apple-music.ts.

Added the authenticated Supabase Edge Function apple-music-search.

Added server-side Apple Music developer-token generation using Supabase
Edge Function secrets.

Added Apple Music song search, artwork, artist metadata, and normalized
Top3Item results.

Added variant grouping to reduce duplicate song recordings while
preserving meaningful versions and covers.

Integrated Music into the shared providers/search.ts registry and Search
screen.

Centralized collection-title generation in
utils/build-collection-title.ts.

Standardized topic-specific titles as Top 3 Category • Topic.

Verified the Music → Songs create, search, select, and publish flow in
the app.

Verified npm run typecheck passes.

Committed and pushed checkpoint 0fb9fb6 --- Add Apple Music song
collections.

Apple Music Search & Song Previews

Expanded Song topic coverage with Blues, Classical, Folk, Latin, Metal,
and Reggae.

Kept Soundtrack out of the Songs topic set.

Added genre aliases to improve Apple Music search behavior across the
supported Song topics.

Added previewUrl to Top3Item and preserved preview URLs through
collection selection and persistence.

Added Expo Audio and a shared AudioPreviewProvider.

Configured preview playback to work while iOS is in silent mode.

Added shared play/pause preview controls to Search results,
RankedItemCard, and Top3Card.

Enforced one active song preview at a time across the application.

Added constants/category-artwork-rules.ts as the shared artwork sizing
source of truth.

Standardized Music artwork as square 64 × 64 across Search,
RankedItemCard, and Top3Card while preserving 64 × 96 portrait artwork
for Movies, Books, TV Shows, and Video Games.

Verified newly created and published Songs collections retain preview
URLs and display working preview controls.

Confirmed older development collections created before previewUrl
support do not display preview controls because that field was not
persisted in their historical item data.

Verified npm run typecheck passes.

Committed and pushed checkpoint a492204 --- Add Apple Music search and
song previews.

Music Suggestions & Overall Rankings

Added Apple Music popular song suggestions to the shared
popular-suggestions provider registry.

Added genre-aware Apple Music chart suggestions for Song topics.

Popular song suggestions use a larger result pool that feeds the
existing five-at-a-time suggestion and Shuffle experience.

Removed the secondary genreNames filter from genre-chart suggestions so
valid songs from Apple Music's selected genre chart are not incorrectly
discarded.

Updated Create Collection so all supported topics remain visible
regardless of whether the user has already published a collection for
that topic.

Extended shared category artwork rules to Overall ranking rows in
Category Feed and Community / Overall Top3.

Extended shared AudioPreviewProvider playback controls to those Overall
ranking rows.

Removed temporary Community Top3 debugging output while preserving its
ranking functionality and shared artwork / audio integrations.

Verified the updated Apple Music Edge Function with Deno validation and
deployed apple-music-search to Supabase.

Verified npm run typecheck passes.

Committed and pushed checkpoint 6e59f6d --- Improve music suggestions
and overall rankings.

August 7, 2026

Video Game Search

Replaced RAWG with IGDB after RAWG repeatedly returned Cloudflare HTTP
522 origin failures.

Created the authenticated Supabase Edge Function igdb-search.

Stored Twitch Client ID and Client Secret as Supabase Edge Function
secrets.

Added server-side Twitch OAuth token acquisition and in-memory token
caching.

Added IGDB search filtering to exclude secondary content such as DLC,
expansions, bundles, and mods where possible.

Added title relevance scoring so exact matches rank above loosely
related results.

Added prefix fallback search so partial queries such as Valo can return
Valorant.

Added IGDB cover art, release year, and normalized five-star ratings.

Removed the RAWG provider from the active application.

Removed the RAWG API key from .env.

Removed RAWG-specific genre IDs from constants/top3-categories.ts.

Search Architecture

Added providers/search.ts as the shared category-to-provider registry.

Moved app/search.tsx to the shared provider registry.

Moved services/post-service.ts hydration to searchByCategory().

Added reusable hooks/use-debounced-value.ts.

Standardized search debounce at 300 ms across Movies, TV, Books, and
Video Games.

Preserved provider-specific behavior inside TMDB, Google Books, Open
Library, and IGDB integrations.

Tooling

Initialized Supabase CLI support in the project.

Added Supabase Edge Function development configuration.

Installed and configured Deno for Edge Function validation in VS Code.

Separated Expo TypeScript validation from Deno Edge Function validation.

Authentication Stabilization

Added an explicit Supabase session refresh during startup authentication
initialization.

The intermittent JWT issued at future startup error is being monitored
to confirm whether the refresh fully resolves it.

August 6, 2026

Stabilization

Fixed authentication initialization race conditions.

Added authentication guards before profile and collection queries.

Prevented anonymous Supabase requests during sign out.

Improved sign-out flow.

Replaced technical sign-in errors with friendly user-facing
authentication messages.

Settings & Profile

Moved Edit Profile into Settings.

Moved Privacy into Settings.

Removed the Edit Profile button from the Profile screen.

Redesigned Sign Out as a standalone action.

Refined Settings, Profile and Privacy layouts.

Follow Requests

Updated follow request copy to "requested to follow you".

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

Added "Mark all as read".

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

Added persistent avatar uploads using Expo FileSystem and Supabase
Storage.

Added avatar URL persistence through ProfileProvider.

Added avatar loading across sessions and devices.

Added cache-busting when replacing an avatar.

Added rollback behaviour when avatar upload or profile persistence
fails.

Added a saving state to Edit Profile.

Added client-side 5 MB validation.

Added "Tap photo to change".

Verified avatar persistence after app restart and sign out/sign in.

Authentication Experience

Added a dedicated provider-choice Sign In screen.

Standardized Apple, Google, and Email options across account creation
and sign in.

Added the official native Apple authentication button.

Added a Google-compliant branded authentication button.

Added a reusable Email authentication button.

Routed signed-out users to the provider-choice Sign In screen.

Preserved dedicated Email Sign In and Email Sign Up forms.

Standardized authentication screens with ScreenHeader and PageHeader.

Removed unnecessary back navigation from top-level provider-choice
screens.

Retained back navigation on secondary email form screens.

Design System

Expanded PageHeader to support left and centre alignment.

Applied PageHeader to authentication and Edit Profile screens.

Clarified the responsibilities of ScreenHeader and PageHeader.

Continued migration away from duplicated title and subtitle
implementations.

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

Replaced technical authentication alerts with friendly user-facing
messages.

Google Sign In

Added @react-native-google-signin/google-signin.

Added Google Sign-In Expo config plugin.

Added the reversed iOS client ID URL scheme.

Added public iOS and Web Google Client IDs to the application
environment.

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

Monitor the intermittent Supabase JWT issued at future startup error
after adding an explicit session refresh during authentication
initialization.

Post-launch Feed scalability: replace complete published-post retrieval
and client-side Feed construction with cursor-paginated,
server-generated Feed pages before published collection volume makes the
current approach materially expensive.

Post-launch recommendation scalability: bound Taste Match candidate
generation server-side and evaluate incremental / precomputed taste
relationships as usage grows. Do not design the large-scale
recommendation path around downloading every user's published posts to
the client.

Post-launch metadata scalability: avoid making view-time external search
provider hydration a dependency of Feed rendering; persist render-ready
collection-item metadata wherever practical.

Medium Priority

Add Universal Links and a public web fallback for shared Lists / Overall rankings after the production Top3 domain is confirmed, so recipients without the app installed have a useful destination.

Scope AsyncStorage keys by authenticated user where appropriate.

Improve optimistic rollback behaviour where needed.

✅ Supabase Realtime implemented for Likes, Comments, Following, and
Notifications.

Review whether the Google nonce compatibility setting should be hardened
in a future authentication pass.

Add avatar removal from the Edit Profile experience if required.

Consider image resizing or compression beyond Image Picker quality
settings if avatar storage or bandwidth becomes significant.

Low Priority

Review legacy Expo template files.

Remove placeholder services and unused routes.

Remove packages that are no longer required after implementation review.

Continue migrating hard-coded colours and spacing into shared design
tokens.

Consider regional YouTube trailer validation if Top3 later introduces a
reliable user country / region source. Current trailer availability
checks only confirm that TMDb returns a usable YouTube trailer and do
not guarantee country-specific playback.

Development Workflow

Every feature should follow this process:

Discuss architecture.

Build one complete vertical slice.

Modify as few files as practical.

Prefer complete file replacements.

Run npm run typecheck.

For Supabase Edge Functions, run the function-specific Deno validation
command, for example:

deno check --config supabase/functions/video-game-search/deno.json
supabase/functions/video-game-search/index.ts

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

Do not automatically choose the next major feature without reviewing the
roadmap and current product state.

Remember that Authentication, Profiles, Profile Avatars, Lists /
collections, Likes, Comments, Following, and Notifications are fully
persisted through Supabase.

Remember that RAWG has been removed from the active application. Video
game search now uses IGDB internally through the video-game-search
Supabase Edge Function. Application-facing Video Games code uses generic
naming, while IGDB-specific terminology remains inside the provider
integration. The Edge Function accepts the app's publishable key so
signed-out onboarding search is supported.

Remember that Music is an active application category. Songs, Albums,
and Artists use Apple Music through the authenticated apple-music-search
Supabase Edge Function, with Apple Music credentials stored only
server-side.

Remember that Top3Item supports previewUrl for Music items. Songs use
their track previews; Albums and Artists can be enriched with
representative track previews. Shared preview playback is owned by
AudioPreviewProvider / context/audio-preview-context.tsx.

Remember that Search, RankedItemCard, Top3Card, Overall ranking rows in
Category Feed, and Community / Overall Top3 ranking rows use the shared
preview controller; do not implement separate Expo Audio players in
those surfaces.

Remember that Movie and TV trailer lookup is owned by
providers/movies-and-tv.ts. Trailer URLs and unavailable results are
cached in memory, and the UI pre-checks availability before displaying
Movie / TV play controls.

Remember that Movie / TV trailer playback is embedded in Top3 through
react-native-webview; do not revert trailer controls to
Linking.openURL() or external YouTube-app playback.

Remember that the refined trailer modal uses a centered 16:9 player on a
black screen and a delayed subtle circular close control positioned
above the player.

Remember that regional YouTube restrictions are a known limitation. Top3
does not currently maintain user country / location information, so
country-specific trailer validation is deferred.

Remember that category artwork sizing is centralized in
constants/category-artwork-rules.ts. Music uses 64 × 64 square artwork;
Movies, Books, TV Shows, and Video Games currently use 64 × 96 portrait
artwork. The shared rules are used by Search, RankedItemCard, Top3Card,
and the Overall ranking presentations.

Remember that Apple Music Song suggestions use genre-specific chart data
for Song topics and trust the selected chart without applying a second
genreNames metadata filter. Songs, Albums, and Artists have also been
tuned toward more evergreen discovery rather than simply mirroring
current popularity.

Remember that Create List intentionally keeps all supported topics
visible even when a matching topic list has already been published.

Remember that V1 prohibited-content filtering is implemented server-side
for comments, display name, username, and bio. content_filter_terms stores
the production hard-block vocabulary and contains_blocked_content(text)
performs normalized whole-term / phrase matching. Do not replace this with
a second client-only filtering architecture.

Remember that the production hard-block list currently contains 49
deliberately conservative terms / phrases. Ordinary profanity and
context-dependent language are intentionally not automatic hard blocks;
contextual abuse is handled through reporting, blocking, and admin
moderation.

Remember that expected prohibited-content rejection uses the established
Top3-styled ActionSheet experience and preserves entered text for
correction. Do not introduce native Alert.alert() for these moderation
rejections.

Remember that Published Top 3 uses the shared CommentsSheet opened from the
comment icon rather than a separate inline comments section / composer.

Remember that moderation removal uses moderation_content_removals as a
user-scoped Realtime event source. Authenticated users may select only
their own removal-event rows. Top3Provider uses INSERT payloads to evict
the affected creator collection / post from local state without a full
collections reload.

Remember that the V1 Feed currently retrieves the complete
published-post dataset and builds followed-user / Taste Match
personalization client-side. This is accepted for initial launch only
and is not the intended large-scale architecture.

Remember that the planned post-launch Feed architecture is
cursor-paginated and server-generated. The client should eventually
request small pages of ready-to-render Feed entries rather than download
the global published-post dataset. Taste Match candidate generation must
also become bounded / server-side at scale.

Remember that collections_published_feed_idx has already been added to
support published, non-removed Feed retrieval. Do not recreate the index
unnecessarily.

Remember that scalability is a standing architecture requirement. Flag
new patterns that depend on unbounded global reads, client-side
processing of global datasets, global Realtime fan-out, or repeated
view-time external API hydration before extending them.

Remember that list titles are generated centrally by
utils/build-collection-title.ts and topic-specific titles use Top 3
Category • Topic. The helper retains its existing implementation
filename.

Remember that search routing is centralized in providers/search.ts, and
app/search.tsx uses a reusable 300 ms debounce hook.

Remember that "Lists" is the preferred user-facing term. Do not rename
internal collection types, database structures, helpers, or files solely
for terminology consistency unless that architectural migration is
intentionally planned.

Remember that the signed-out onboarding flow can create a first list
before account creation. OnboardingCollectionProvider preserves that
list, authentication intent, and pending-publish state through
authentication.

Remember that email confirmation returns through
app/(auth)/auth-callback.tsx and app/index.tsx completes any pending
onboarding publish before routing to onboarding-published.

Remember that Email Sign In includes a complete forgot-password flow.
app/(auth)/forgot-password.tsx requests the Supabase reset email and
offers Open Email App; app/(auth)/reset-password.tsx establishes the
recovery session and updates the password. Expected same-password
validation is shown as a friendly alert rather than a development error.

Remember that Sign in with Apple now has a server-side account-lifecycle
path. services/auth-service.ts sends Apple's authorization code to the
apple-auth-token Edge Function after successful Apple sign-in. The function
exchanges it for an Apple refresh token and stores that token in
apple_auth_tokens. Do not move Apple private-key or client-secret generation
into the mobile application.

Remember that delete-account revokes a stored Apple refresh token with Apple
before deleting the Supabase Auth user. If Apple revocation fails, deletion
stops. The temporary apple-auth-revoke-test function and Settings test UI
were removed after successful verification; do not recreate them as
production functionality.

Remember that account deletion is implemented through
lib/supabase/account.ts and the delete-account Supabase Edge Function,
and Settings resets local welcome state after successful deletion.

Remember that sharing uses the native iOS Share Sheet and custom Top3 deep links. Published Lists are shareable from Feed, Profile, Category Feed, and Published Top 3; Overall rankings are shareable from Category Feed. Anonymous collection reads are restricted to published, non-removed rows. collection_shared is tracked only for completed shares and includes feed, profile, category_feed, published_detail, or overall source attribution. Universal Links / public web fallback remain deferred until the production domain is confirmed.

Do not recommend migrating Following again---it has already been
completed.

Document Purpose

CURRENT_STATE.md provides an accurate snapshot of the application's
current architecture and implementation.

Strategic direction belongs in ROADMAP.md.

Historical milestones belong in CHANGELOG.md.