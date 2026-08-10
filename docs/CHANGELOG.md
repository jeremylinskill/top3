CHANGELOG.md

This document records significant milestones in the evolution of Top3.

Unlike CURRENT_STATE.md, which describes the application's current implementation, this document captures the major architectural and product milestones that shaped the application over time.

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

v1.8 --- Private Accounts, Settings & Authentication Stability

Released: August 6, 2026

This release completes Top3's first implementation of private accountswhile refining the profile, settings, authentication, and notificationexperiences. It also focuses on stability improvements aroundauthentication lifecycle events and overall application polish.

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

Improved AuthProvider initialization to eliminate session restorationrace conditions.

Prevented authenticated screens from querying Supabase beforeauthentication state is fully established.

Improved sign-out experience by preventing post-logout data requests.

Updated email sign-in to provide friendly authentication errors insteadof development error overlays for expected invalid credentials.

User Experience

Removed Edit Profile action from the Profile screen in favour of thecentralized Settings experience.

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

v1.7 --- Supabase Realtime

Released: August 4, 2026

This release completes Top3's first phase of live multi-usersynchronization by introducing a shared Supabase Realtime architecture.Notifications, likes, comments, and follows now synchronizeautomatically across connected users without requiring manual refreshes.

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

v1.6 --- In-App Notifications

Released: August 2, 2026

This release introduces Top3's in-app notification system, completingthe core social engagement loop. Notifications are now generatedautomatically for likes, comments, and follows through Supabase databasetriggers and surfaced through a dedicated Notifications experience.

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

Added "Mark all as read".

Added pull-to-refresh support.

Added navigation to published collections from like and commentnotifications.

Added navigation to public profiles from follow notifications.

Database Automation

Added automatic notification trigger for likes.

Added automatic notification trigger for comments.

Added automatic notification trigger for follows.

Improved

Social Experience

Completed the in-app notification experience for likes, comments, andfollows.

Unified notification loading through a shared context provider.

Improved notification readability with actor names, avatars, andcontextual collection titles.

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

v1.5 --- Persistent Profile Avatars & Authentication Experience

Released: August 2, 2026

This release adds persistent profile avatars through Supabase Storageand completes a broader refinement of the authentication and profileexperience.

Added

Profile Avatars

Added an avatar_url column to the Supabase profiles table.

Added a public Supabase Storage bucket named avatars.

Added user-specific avatar storage paths based on the authenticated userID.

Added persistent avatar uploads through lib/supabase/storage.ts.

Added public avatar URL generation.

Added support for replacing an existing avatar.

Added avatar loading across sessions and devices.

Added a local avatar preview before saving.

Added a saving state while profile updates are in progress.

Added a "Tap photo to change" affordance.

Added client-side avatar file-size validation.

Added a 5 MB bucket-level file-size restriction.

Added image MIME-type restrictions.

Storage Security

Added authenticated upload policies scoped to each user's own avatarfolder.

Added authenticated update policies scoped to each user's own avatarfolder.

Added authenticated delete policies scoped to each user's own avatarfolder.

Added authenticated select access scoped to each user's own avatarfolder to support Storage upsert.

Removed broad public object-listing access while preserving publicavatar URLs.

Authentication Experience

Added a dedicated provider-choice Sign In screen.

Added Apple, Google, and Email options to both account creation and signin.

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

Clarified the role of PageHeader as the page title and optional subtitlebelow the navigation bar.

Standardized page-title placement across authentication, collection, andprofile screens.

Tooling

Added react-native-svg.

Added react-native-svg-transformer.

Added metro.config.js for SVG imports.

Added svg.d.ts for SVG TypeScript declarations.

Added Expo FileSystem support for avatar uploads.

Improved

Profile Persistence

Updated ProfileProvider to load and persist avatar_url.

Updated profile mapping between Supabase rows and the applicationUserProfile type.

Updated profile saving to wait for avatar upload and databasepersistence before navigating away.

Added optimistic profile updates with rollback on failure.

Added cache-busting when replacing an avatar.

Disabled profile editing while a save is in progress.

Added friendly failure feedback when a profile update cannot becompleted.

Authentication Navigation

Standardized provider-selection flow for account creation andreturning-user sign in.

Removed unnecessary back buttons from top-level provider-choice screens.

Preserved back navigation on Email Sign In and Email Sign Up screens.

Updated sign-out navigation so users return to the full Sign Inprovider-choice screen instead of the email-only form.

User Interface

Standardized authentication-screen backgrounds and shared colour tokens.

Standardized title and subtitle layouts with PageHeader.

Improved the visual consistency of Apple, Google, and Emailauthentication buttons.

Improved Edit Profile avatar discoverability and pressed-state feedback.

Fixed

Fixed avatar persistence after app restart.

Fixed avatar persistence after sign out and sign in.

Fixed replacement of an existing avatar by adding the scopedauthenticated select policy required by Storage upsert.

Fixed profile navigation occurring before avatar upload completed.

Fixed inconsistent title placement across authentication and profilescreens.

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

Updated authentication, navigation, design-system, and technical-debtdocumentation.

v1.4 --- Native Authentication Complete

Released: July 31, 2026

This release completes Top3's native authentication experience. Userscan now authenticate using Email, Sign in with Apple, or Sign in withGoogle while sharing a common Supabase authentication architecture andpersistent session model.

Added

Google Authentication

Added native Google Sign-In using@react-native-google-signin/google-signin.

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

Added Google client IDs to the application's public environmentconfiguration.

Created and installed a new EAS iOS development build.

Improved

Authentication Flow

Expanded the shared authentication service to support Email, Apple, andGoogle.

Preserved the existing AuthProvider and session restorationarchitecture.

Routed successful Google authentication through the existing applicationentry point.

Preserved existing email and Apple authentication behaviour.

User Experience

Added silent handling of cancelled Google sign-in attempts.

Replaced technical Google authentication alerts with friendlyuser-facing messages.

Aligned Google authentication behaviour with the existing Appleexperience.

Documentation

Updated CURRENT_STATE.md to version 1.4.

Recorded native Google authentication as complete.

v1.3 --- Native Apple Authentication

Released: July 31, 2026

This release adds native Sign in with Apple and completes the firstproduction-ready social authentication provider for Top3.

Added

Authentication

Added native Sign in with Apple using expo-apple-authentication.

Added Apple identity-token exchange through Supabase Auth.

Added support for both new-user registration and returning-user sign-in.

Added persistent Apple-authenticated Supabase sessions.

Added Apple name metadata preservation when available during firstauthorization.

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

Integrated Apple authentication into the existing authenticationservice.

Reused the existing AuthProvider and session flow.

Routed successful Apple authentication through the existing applicationentry point.

Preserved email authentication and verification behaviour.

Session Handling

Improved first-login session initialization.

Improved session restoration.

Prevented authenticated screens from querying Supabase before authinitialization completed.

Fixed

Fixed the Feed permission error after first Apple sign-in.

Fixed the authentication timing race during session initialization.

Improved handling of cancelled Apple authorization attempts.

Documentation

Updated CURRENT_STATE.md to version 1.3.

v1.2 --- Design System & Collection Flow Refinement

Released: July 31, 2026

This release focused on improving consistency, maintainability, and theoverall collection creation experience while establishing reusable UIcomponents.

Added

Reusable PageHeader component.

Reusable Chip component.

Shared page layout architecture.

Curated search suggestions that transition to community-drivensuggestions.

Improved

Standardized Create, Search, and Collection layouts.

Unified spacing, typography, and chip styling.

Expanded the reusable component library.

Continued migration away from duplicated UI.

Fixed

Eliminated inconsistent page-title layouts.

Eliminated duplicated chip implementations.

v1.1 --- Social Foundation Complete

Released: July 30, 2026

This release completed the migration of comments and likes to Supabase,establishing the application's backend social foundation.

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

v1.0 --- Platform Foundation

Released: July 2026

This milestone established the core architecture of Top3 as a persistentsocial application.

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