CHANGELOG.md

This document records significant milestones in the evolution of Top3.

Unlike CURRENT_STATE.md, which describes the application's current implementation, this document captures the major architectural and product milestones that shaped the application over time.

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

Expanded reusable component library.

Continued migration away from duplicated UI.

Fixed

Eliminated inconsistent page title layouts.

Eliminated duplicated chip implementations.

v1.1 — Social Foundation Complete

Released: July 30, 2026

Completed migration of comments and likes to Supabase, establishing the application's backend social foundation.

Added

Supabase-backed comments.

Supabase-backed likes.

Optimistic updates.

Verified RLS policies.

Database indexes and constraints.

Stability validation and documentation updates.

Improved

Comment responsiveness.

Like responsiveness.

Feed synchronization.

Overall stability.

Fixed

Comment count synchronization.

Persistence after restart.

Collection ID mapping.

v1.0 — Platform Foundation

Released: July 2026

Established the core architecture of Top3 as a persistent social application.

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

Before beginning the next major feature, review:

CURRENT_STATE.md

ROADMAP.md

Then agree on the next architectural direction before implementation begins.