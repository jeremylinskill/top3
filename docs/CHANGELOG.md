CHANGELOG.md

This document records significant milestones in the evolution of Top3.

Unlike CURRENT_STATE.md, which describes the application's current implementation, this document captures the major architectural and product milestones that shaped the application over time.

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

Next Milestone

The next product milestone has intentionally not been selected.

Before beginning the next major feature:

Review CURRENT_STATE.md.

Review ROADMAP.md.

Confirm which current implementation areas remain real, hybrid, or prototype.

Agree on the next architectural direction before implementation begins.

Current high-priority candidates include:

Migrating Following from AsyncStorage to Supabase.

Replacing remaining mock community users with real users.

Adding Supabase Realtime after shared community data is complete.