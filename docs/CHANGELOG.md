CHANGELOG.md

This document records significant milestones in the evolution of Top3.

Unlike CURRENT_STATE.md, which describes the application's current implementation, this document captures the major architectural and product milestones that shaped the application over time.

v2.1 — Movie & TV Trailer Playback

Released: August 12, 2026

This release adds in-app Movie and TV trailer playback throughout Top3, extends the existing media-control pattern beyond Apple Music previews, and adds availability-aware trailer controls so play buttons are hidden when TMDb does not provide a usable trailer.

Added

Movie & TV Trailer Discovery

Added Movie trailer lookup through TMDb video metadata.

Added TV Show trailer lookup through TMDb video metadata.

Trailer selection prioritizes official YouTube trailers, then other YouTube trailers, then YouTube teasers.

In-App Trailer Playback

Added react-native-webview.

Added YouTube embed playback inside Top3 rather than opening the external YouTube app.

Added a black full-screen trailer presentation with a vertically centered 16:9 player.

Added a subtle circular close control positioned above the trailer player.

Delayed the close control until the trailer WebView finishes loading and fades it in for a more polished transition.

Trailer Controls

Added Movie and TV trailer controls to:

Search results

RankedItemCard

Top3Card

Community / Overall Top3 ranking rows

Category Feed Overall ranking rows

Because Feed, Profile, Published Top 3, and Category Feed Lists reuse Top3Card, trailer playback is available across those surfaces as well.

Trailer Availability

Added an in-memory trailer URL cache in providers/tmdb.ts.

Cached both successful trailer URLs and null results when TMDb returns no usable trailer.

Added getCachedTrailerAvailability() to expose confirmed available, confirmed unavailable, and not-yet-checked states.

Added availability pre-checks before Movie / TV play buttons are rendered.

Movie / TV play buttons are now hidden when TMDb has no usable trailer.

Cached trailer URLs are reused when the user taps play.

Improved

Media Playback Coordination

Starting a Movie or TV trailer stops any active Apple Music preview.

Preserved the existing one-at-a-time shared Music preview behavior.

Preserved Song, Album, and Artist preview controls across Search, RankedItemCard, Top3Card, Category Feed Overall, and Community / Overall Top3.

Overall Ranking Presentation

Refined Category Feed Overall ranking rows to better align with the existing Top3Card / RankedItemCard visual language.

Kept the approved compact row treatment, shared artwork sizing, ranking hierarchy, and right-side media controls.

Known Limitation

Some YouTube trailers may still be unavailable in a specific country or region even when TMDb identifies a usable trailer.

The current availability check confirms that TMDb returns a usable YouTube trailer but does not guarantee country-specific playback.

Regional validation is deferred because Top3 does not currently maintain a reliable user country / location value.

Future work could validate YouTube embeddability and regional restrictions if Top3 later introduces an appropriate country / region source.

Verified

Verified Movie trailer playback on device.

Verified TV Show trailer playback on device.

Verified in-app YouTube playback rather than external YouTube-app playback.

Verified the refined delayed circular close control.

Verified trailer availability behavior in Search.

Verified trailer availability behavior in RankedItemCard.

Verified trailer availability behavior across Top3Card surfaces, including Feed, Profile, Published Top 3, and Category Feed Lists.

Verified trailer availability behavior in Community Top3.

Verified trailer availability behavior in Category Feed Overall.

Verified music previews remain functional across the supported surfaces.

Verified Category Feed Overall presentation after the media-control layout refinement.

Verified npm run typecheck passes after the completed rollout.

Documentation

Updated CURRENT_STATE.md with the completed Movie / TV trailer architecture, availability cache, supported surfaces, and regional playback limitation.

Updated ROADMAP.md to record Movie / TV trailers as a completed discovery foundation and defer regional YouTube validation as a future provider-resiliency enhancement.

v2.0 — Apple Music Expansion & Music Discovery Refinement

Released: August 11, 2026

This release expands Top3's Music experience beyond Songs to support Albums and Artists, improves Apple Music suggestions toward more evergreen and canonical results, and extends preview playback so Albums and Artists can surface representative music directly in search results.

Added

Music Topics

Added Albums as a supported Music topic.

Added Artists as a supported Music topic.

Added Apple Music Album search and Artist search through the existing authenticated apple-music-search Supabase Edge Function.

Album Previews

Added representative track preview URLs to Album search results.

Album preview enrichment selects a representative track from the album so users can preview music directly from an Album result.

Artist Previews

Added representative song preview URLs to Artist search results.

Artist preview enrichment allows users to preview music directly from an Artist result.

Artist Canonical Enrichment

Added Apple Music top-results enrichment for Artist searches.

Canonical Apple Music artist data can provide artist artwork and genre metadata when the standard search result is incomplete or points to a weaker duplicate.

Improved

Music Suggestions

Refined Album suggestions to favour evergreen, long-term popular albums rather than relying primarily on what is currently popular.

Refined Artist suggestions to favour evergreen, canonical artists rather than relying primarily on current popularity.

Refined Song suggestions using the same evergreen-oriented approach.

Preserved the existing five-at-a-time suggestion and Shuffle experience.

Album Search

Enriched Album search results with representative track previews where Apple Music provides preview audio.

Preserved Album artwork and artist metadata while adding preview playback support.

Artist Search

Improved Artist search ranking and deduplication so canonical exact-name matches rank ahead of weaker or duplicate results.

Improved exact artist searches such as Nirvana so the canonical Apple Music artist result is selected and enriched with the correct artwork and genre metadata.

Preserved representative preview playback for enriched canonical Artist results.

Music Search Presentation

Updated music-related search loading artwork placeholders to use square proportions instead of the portrait proportions used by Movies, Books, TV Shows, and Video Games.

Kept music artwork presentation aligned with the shared square Music artwork treatment.

Changed

Apple Music Search Enrichment

Extended apple-music-search so Album and Artist results can be enriched after the initial Apple Music search response.

Artist canonical-result enrichment now uses Apple Music top-results data to resolve stronger canonical matches.

Artist ranking and deduplication now prefer the canonical enriched result when duplicate or competing exact-name results are returned.

Verified

Verified Album preview playback on device.

Verified Artist preview playback on device.

Verified canonical Nirvana Artist search result displays the correct artist artwork and Alternative genre metadata.

Verified Artist ranking and deduplication on device.

Verified square music search loading placeholders on device.

Verified the updated apple-music-search Edge Function with Deno validation.

Deployed the updated apple-music-search Supabase Edge Function after each validated server-side change.

Verified npm run typecheck passes after the client-side music search presentation changes.

Documentation

Updated CURRENT_STATE.md to reflect Albums and Artists as active Music topics.

Recorded evergreen Music suggestion improvements.

Recorded Album and Artist preview enrichment.

Recorded Artist canonical-result enrichment, ranking, and deduplication improvements.

v1.9 — Discovery, Search & Recommendation Refinement

Released: August 10, 2026

This release strengthens Top3's discovery experience across Books, Video Games, the Home Feed, and Taste Match. It completes the migration from RAWG to IGDB, establishes a shared search-provider architecture, improves search and suggestion quality, and refines how personalized Taste Match recommendations are presented and explored.

Added

Video Game Search

Added IGDB as the active Video Games data provider.

Added the authenticated Supabase Edge Function igdb-search.

Added server-side Twitch OAuth authentication for IGDB.

Added in-memory Twitch access-token caching in the Edge Function.

Added IGDB cover art, release year, and normalized five-star ratings.

Added prefix fallback searching for partial game titles.

Added search aliases where required to improve common-title matching.

Shared Search Architecture

Added providers/search.ts as the shared category-to-provider registry.

Added providers/games.ts.

Added lib/supabase/igdb.ts.

Added reusable hooks/use-debounced-value.ts.

Standardized search debounce at 300 ms across Movies, TV Shows, Books, and Video Games.

Discovery & Suggestions

Added curated book suggestions.

Added reusable SearchInput.

Added reusable Card.

Added reusable SecondaryActionPill.

Added reusable SectionHeader.

Feed

Added native pull-to-refresh to the Home feed.

Improved

Video Game Search

Improved game-title relevance scoring so exact and stronger title matches rank ahead of loosely related results.

Improved partial-title searches through prefix fallback.

Filtered secondary IGDB content such as DLC, expansions, bundles, and mods where possible.

Improved generic Video Games suggestions.

Book Search

Improved Google Books result relevance.

Improved edition deduplication so alternate editions can be consolidated without incorrectly removing distinct books that share title words.

Improved handling of searches where query terms appear within longer, distinct book titles.

Improved default Books discovery through curated popular suggestions.

Personalized Feed & Recommendations

Refined personalized Feed recommendation presentation.

Added Taste Match recommendation explanations based on shared ranked picks.

Made the full recommendation explanation block tappable.

Connected recommendation explanations directly to the recommended user's Taste Match screen.

Preserved recommendation styling as a compact two-line treatment.

Taste Match

Added an animated count-up for the Taste Match percentage on screen load.

Refined animation pacing so the count slows naturally as it approaches the final score.

Updated the Taste Match summary area to use a white background.

Applied the shared purple accent to Taste Match summary and recommendation messaging.

Matched the summary-card keyline treatment to the ranked-picks card.

Tightened spacing within the ranked-picks presentation.

Refined recommendation-message line spacing.

Feed Refresh

Pull-to-refresh reloads published posts and author data.

Refreshing preserves the existing feed instead of returning to the full initial Loading feed… state.

Product & UI

Added and refined Settings, About, and Privacy screens.

Continued consolidation of shared colours, spacing, and reusable presentation patterns.

Refined follow-request and notification presentation.

Changed

Video Game Provider

Replaced RAWG with IGDB after repeated RAWG Cloudflare HTTP 522 origin failures.

Removed providers/rawg.ts from the active application.

Removed RAWG-specific genre IDs from constants/top3-categories.ts.

Removed the RAWG API key from the application environment.

Search Routing

Moved application search routing to the shared provider registry.

Moved post hydration to the shared searchByCategory() path.

Preserved provider-specific ranking, fallback, filtering, and API behaviour within each provider.

Verified

Verified improved Books search and suggestion behaviour on device.

Verified improved Video Games search and suggestion behaviour on device.

Verified Taste Match percentage animation and visual refinements on device.

Verified recommendation explanation navigation to Taste Match.

Verified Home feed pull-to-refresh.

Verified TypeScript with npm run typecheck.

Deployed the updated igdb-search Supabase Edge Function.

Committed and pushed checkpoint f833160 — Polish discovery, recommendations, and social experience.

Documentation

Updated CURRENT_STATE.md to version 2.0.

Recorded the completed discovery, search, recommendation, Taste Match, and Feed-refresh work.

Preserved startup authentication monitoring as active technical debt.

v1.8 — Private Accounts, Settings & Authentication Stability

Released: August 6, 2026

This release completes Top3's first implementation of private accounts while refining the profile, settings, authentication, and notification experiences. It also focuses on stability improvements around authentication lifecycle events and overall application polish.

Added

Private Accounts

Added dedicated Privacy screen.

Moved account visibility controls from Edit Profile into Settings.

Added follow request notifications with Accept and Decline actions.

Added support for resending follow requests after they are declined.

Added follow request state handling across public profiles.

Settings

Added dedicated Settings entry points for Edit Profile and Privacy.

Added standalone Sign Out action.

Improved

Authentication

Improved AuthProvider initialization to eliminate session restoration race conditions.

Prevented authenticated screens from querying Supabase before authentication state is fully established.

Improved sign-out experience by preventing post-logout data requests.

Updated email sign-in to provide friendly authentication errors instead of development error overlays for expected invalid credentials.

User Experience

Removed Edit Profile action from the Profile screen in favour of the centralized Settings experience.

Refined Settings layout and sign-out treatment.

Refined Privacy screen layout and spacing.

Simplified follow request presentation.

Improved notification action styling for follow requests.

Stability

Added additional guards around authenticated Supabase queries.

Improved profile loading during authentication transitions.

Verified

Verified authentication initialization after cold launch.

Verified sign-out navigation.

Verified Settings and Privacy navigation.

Verified follow request lifecycle.

Verified TypeScript with npm run typecheck.

Documentation

Updated CURRENT_STATE.md.

Updated ROADMAP.md progress.

Recorded authentication and private account refinements.

v1.7 — Supabase Realtime

Released: August 4, 2026

This release completes Top3's first phase of live multi-user synchronization by introducing a shared Supabase Realtime architecture. Notifications, likes, comments, and follows now synchronize automatically across connected users without requiring manual refreshes.

Added

Realtime Architecture

Added shared lib/supabase/realtime.ts subscription helper.

Added reusable realtime subscription pattern across context providers.

Added realtime subscriptions for Notifications.

Added realtime subscriptions for Likes.

Added realtime subscriptions for Comments.

Added realtime subscriptions for Following.

Improved

Social Experience

Live synchronization of likes.

Live synchronization of comments.

Live synchronization of follows.

Automatic notification updates.

Unified realtime architecture across the application.

Verified

Verified notification INSERT and UPDATE synchronization.

Verified like INSERT and DELETE synchronization.

Verified comment INSERT and DELETE synchronization.

Verified follow INSERT and DELETE synchronization.

Verified optimistic updates continue to work correctly with realtime.

Verified TypeScript with npm run typecheck.

Documentation

Updated CURRENT_STATE.md to version 1.7.

Updated ROADMAP.md to reflect completed realtime milestone.

Recorded commit a3c2225 as the last verified milestone.

v1.6 — In-App Notifications

Released: August 2, 2026

This release introduces Top3's in-app notification system, completing the core social engagement loop. Notifications are now generated automatically for likes, comments, and follows through Supabase database triggers and surfaced through a dedicated Notifications experience.

Added

Notifications

Added Supabase-backed notifications.

Added NotificationProvider.

Added Notifications tab.

Added bottom-tab unread badge.

Added relative timestamps.

Added actor profile enrichment.

Added collection title enrichment.

Added read / unread state.

Added “Mark all as read”.

Added pull-to-refresh support.

Added navigation to published collections from like and comment notifications.

Added navigation to public profiles from follow notifications.

Database Automation

Added automatic notification trigger for likes.

Added automatic notification trigger for comments.

Added automatic notification trigger for follows.

Improved

Social Experience

Completed the in-app notification experience for likes, comments, and follows.

Unified notification loading through a shared context provider.

Improved notification readability with actor names, avatars, and contextual collection titles.

Verified

Verified end-to-end like notifications.

Verified end-to-end comment notifications.

Verified end-to-end follow notifications.

Verified unread badge updates.

Verified notification navigation.

Verified TypeScript with npm run typecheck.

Documentation

Updated CURRENT_STATE.md to version 1.6.

Recorded commit b2dad2c as the last verified milestone.

v1.5 — Persistent Profile Avatars & Authentication Experience

Released: August 2, 2026

This release adds persistent profile avatars through Supabase Storage and completes a broader refinement of the authentication and profile experience.

Added

Profile Avatars

Added an avatar_url column to the Supabase profiles table.

Added a public Supabase Storage bucket named avatars.

Added user-specific avatar storage paths based on the authenticated user ID.

Added persistent avatar uploads through lib/supabase/storage.ts.

Added public avatar URL generation.

Added support for replacing an existing avatar.

Added avatar loading across sessions and devices.

Added a local avatar preview before saving.

Added a saving state while profile updates are in progress.

Added a “Tap photo to change” affordance.

Added client-side avatar file-size validation.

Added a 5 MB bucket-level file-size restriction.

Added image MIME-type restrictions.

Storage Security

Added authenticated upload policies scoped to each user's own avatar folder.

Added authenticated update policies scoped to each user's own avatar folder.

Added authenticated delete policies scoped to each user's own avatar folder.

Added authenticated select access scoped to each user's own avatar folder to support Storage upsert.

Removed broad public object-listing access while preserving public avatar URLs.

Authentication Experience

Added a dedicated provider-choice Sign In screen.

Added Apple, Google, and Email options to both account creation and sign in.

Added a reusable GoogleAuthButton.

Added a reusable EmailAuthButton.

Added Google's approved colour G SVG asset.

Added the official native Apple authentication button.

Added dedicated Email Sign In and Email Sign Up form screens.

Routed users who sign out to the provider-choice Sign In screen.

Design System

Expanded PageHeader to support left- and centre-aligned layouts.

Applied PageHeader to authentication screens.

Applied PageHeader to Edit Profile.

Clarified the role of ScreenHeader as the top navigation bar.

Clarified the role of PageHeader as the page title and optional subtitle below the navigation bar.

Standardized page-title placement across authentication, collection, and profile screens.

Tooling

Added react-native-svg.

Added react-native-svg-transformer.

Added metro.config.js for SVG imports.

Added svg.d.ts for SVG TypeScript declarations.

Added Expo FileSystem support for avatar uploads.

Improved

Profile Persistence

Updated ProfileProvider to load and persist avatar_url.

Updated profile mapping between Supabase rows and the application UserProfile type.

Updated profile saving to wait for avatar upload and database persistence before navigating away.

Added optimistic profile updates with rollback on failure.

Added cache-busting when replacing an avatar.

Disabled profile editing while a save is in progress.

Added friendly failure feedback when a profile update cannot be completed.

Authentication Navigation

Standardized provider-selection flow for account creation and returning-user sign in.

Removed unnecessary back buttons from top-level provider-choice screens.

Preserved back navigation on Email Sign In and Email Sign Up screens.

Updated sign-out navigation so users return to the full Sign In provider-choice screen instead of the email-only form.

User Interface

Standardized authentication-screen backgrounds and shared colour tokens.

Standardized title and subtitle layouts with PageHeader.

Improved the visual consistency of Apple, Google, and Email authentication buttons.

Improved Edit Profile avatar discoverability and pressed-state feedback.

Fixed

Fixed avatar persistence after app restart.

Fixed avatar persistence after sign out and sign in.

Fixed replacement of an existing avatar by adding the scoped authenticated select policy required by Storage upsert.

Fixed profile navigation occurring before avatar upload completed.

Fixed inconsistent title placement across authentication and profile screens.

Fixed signed-out users being routed directly to the Email Sign In form.

Verified

Verified avatar upload to Supabase Storage.

Verified avatar URL persistence in the profiles table.

Verified avatar replacement.

Verified avatar persistence after force-closing and reopening the app.

Verified avatar persistence after signing out and signing back in.

Verified TypeScript with npm run typecheck.

Documentation

Updated CURRENT_STATE.md to version 1.5.

Recorded commit 32b5478 as the last verified milestone.

Recorded persistent profile avatars as complete.

Updated authentication, navigation, design-system, and technical-debt documentation.

v1.4 — Native Authentication Complete

Released: July 31, 2026

This release completes Top3's native authentication experience. Users can now authenticate using Email, Sign in with Apple, or Sign in with Google while sharing a common Supabase authentication architecture and persistent session model.

Added

Google Authentication

Added native Google Sign-In using @react-native-google-signin/google-signin.

Added Google identity-token exchange through Supabase Auth.

Added support for both new-user registration and returning-user sign-in.

Added persistent Google-authenticated Supabase sessions.

Added native Google account selection on iOS.

Platform Configuration

Created separate Google Cloud iOS and Web OAuth clients.

Configured the Google provider in Supabase.

Added both accepted Google OAuth client IDs to Supabase.

Added the Google Sign-In Expo config plugin.

Added the reversed iOS URL scheme to app.json.

Added Google client IDs to the application's public environment configuration.

Created and installed a new EAS iOS development build.

Improved

Authentication Flow

Expanded the shared authentication service to support Email, Apple, and Google.

Preserved the existing AuthProvider and session restoration architecture.

Routed successful Google authentication through the existing application entry point.

Preserved existing email and Apple authentication behaviour.

User Experience

Added silent handling of cancelled Google sign-in attempts.

Replaced technical Google authentication alerts with friendly user-facing messages.

Aligned Google authentication behaviour with the existing Apple experience.

Documentation

Updated CURRENT_STATE.md to version 1.4.

Recorded native Google authentication as complete.

v1.3 — Native Apple Authentication

Released: July 31, 2026

This release adds native Sign in with Apple and completes the first production-ready social authentication provider for Top3.

Added

Authentication

Added native Sign in with Apple using expo-apple-authentication.

Added Apple identity-token exchange through Supabase Auth.

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

Integrated Apple authentication into the existing authentication service.

Reused the existing AuthProvider and session flow.

Routed successful Apple authentication through the existing application entry point.

Preserved email authentication and verification behaviour.

Session Handling

Improved first-login session initialization.

Improved session restoration.

Prevented authenticated screens from querying Supabase before auth initialization completed.

Fixed

Fixed the Feed permission error after first Apple sign-in.

Fixed the authentication timing race during session initialization.

Improved handling of cancelled Apple authorization attempts.

Documentation

Updated CURRENT_STATE.md to version 1.3.

v1.2 — Design System & Collection Flow Refinement

Released: July 31, 2026

This release focused on improving consistency, maintainability, and the overall collection creation experience while establishing reusable UI components.

Added

Reusable PageHeader component.

Reusable Chip component.

Shared page layout architecture.

Curated search suggestions that transition to community-driven suggestions.

Improved

Standardized Create, Search, and Collection layouts.

Unified spacing, typography, and chip styling.

Expanded the reusable component library.

Continued migration away from duplicated UI.

Fixed

Eliminated inconsistent page-title layouts.

Eliminated duplicated chip implementations.

v1.1 — Social Foundation Complete

Released: July 30, 2026

This release completed the migration of comments and likes to Supabase, establishing the application's backend social foundation.

Added

Supabase-backed comments.

Supabase-backed likes.

Optimistic updates.

Verified Row Level Security policies.

Database indexes and constraints.

Stability validation and documentation updates.

Improved

Comment responsiveness.

Like responsiveness.

Feed synchronization.

Overall stability.

Fixed

Comment-count synchronization.

Persistence after restart.

Collection ID mapping.

v1.0 — Platform Foundation

Released: July 2026

This milestone established the core architecture of Top3 as a persistent social application.

Added

Supabase authentication.

Persistent sessions.

User profiles.

Collection publishing.

Personalized Feed.

Discover.

Community Top3.

Overall Top3.

Taste Match.

Prototype likes, comments, and following.

TMDB, Google Books, RAWG, and MusicBrainz integrations.

EAS Development Build.

Context-based architecture.

Improved

Feed personalization.

Recommendation quality.

Publishing workflow.

Metadata enrichment.

Fixed

Publishing reliability.

Draft persistence.

Feed and profile restoration.

Collection editing reliability.