Top3 Feature Inventory

Version: 1.1Status: Active DevelopmentOwner: Jeremy LinskillLast Updated: August 10, 2026Last Verified Commit: f833160 — Polish discovery, recommendations, and social experience

Purpose

This document serves as the complete inventory of user-facing functionality within Top3.

Unlike CURRENT_STATE.md, which documents the application's current architecture, and ROADMAP.md, which describes future direction, FEATURES.md documents what users can do today.

This document should always reflect the current product experience.

Product Summary

Top3 is a social platform built around ranked collections.

Users express themselves through curated Top 3 collections, discover people and entertainment through shared taste, and build connections through shared interests.

The application currently supports:

• Authentication• Profiles• Private and public accounts• Collection creation• Publishing• Feed• Discovery• Search• Personalized recommendations• Taste Match• Following and follow requests• Likes• Comments• Notifications• Realtime synchronization• Settings and privacy controls

Feature Status

Feature

Status

Authentication

✅ Production Ready

User Profiles

✅ Production Ready

Collections

✅ Production Ready

Publishing

✅ Production Ready

Feed

✅ Production Ready

Discover

✅ Production Ready

Search

✅ Production Ready

Personalized Recommendations

✅ Production Ready

Taste Match

✅ Production Ready

Following

✅ Production Ready

Private Accounts / Follow Requests

✅ Production Ready

Likes

✅ Production Ready

Comments

✅ Production Ready

Notifications

✅ Production Ready

Realtime

✅ Production Ready

Settings / Privacy

✅ Production Ready

Push Notifications

🚧 Planned

AI Recommendations

💡 Future

Application Navigation

Bottom Navigation

• Feed• Discover• Create• Notifications• Profile

Additional User-Facing Screens

• Settings• Edit Profile• Privacy• About• Search• Public Profile• Published Collection• Taste Match• Followers• Following

Feed

Purpose

The Feed helps users discover published collections from the community while providing opportunities to interact with them and surface recommendations based on shared taste.

Current Capabilities

Browse

• View published collections• View author information• View ranked items• View artwork• View ratings• Pull down to refresh the Feed

Personalized Recommendations

• Surface personalized collection recommendations• Show a recommendation label• Explain recommendations using shared ranked picks• Tap the recommendation explanation to open the recommended user's Taste Match details

Social

• Like collections• Unlike collections• Comment• View comment count• View like count

Navigation

• Open collection• Open public profile• Open Taste Match from personalized recommendations• Edit own collection

Realtime

✅ Likes

✅ Comments

Discover

Purpose

Help users discover people, entertainment, categories, topics, and collections through shared taste and community activity.

People

• Similar Taste• Taste Match percentage• Shared picks• Follow users• Request to follow private users• Open profiles

Discovery

• Featured discovery content• Trending Topics• Trending Categories• Category counts• Community Top3• Overall Top3

Search

• Search users

Navigation

• Public Profile• Category pages• Taste Match

Realtime

N/A

Create

Purpose

Create and publish Top 3 collections.

Capabilities

• Choose category• Choose topic• Search external content providers• View curated suggestions• Rank items• Reorder ranked items• Remove ranked items• Save draft• Resume draft• Edit draft• Publish• Edit published collection• Prevent duplicate collections for the same category/topic identity

Notifications

Purpose

Surface important social activity and follow requests.

Notification Types

• Likes• Comments• New followers• Follow requests

User Actions

• View notifications• Mark notifications as read• Mark all notifications as read• Open collection• Open profile• Accept follow request• Decline follow request• Pull down to refresh

Presentation

• Unread notification badge in bottom navigation• Relative timestamps• Actor names and avatars• Contextual collection titles where applicable

Realtime

✅ Live updates

Profile

Purpose

Present the user's identity and published Top 3 collections.

Capabilities

• View profile information• View profile avatar• View published collections• View followers• View following• Open published collections• Open Settings

Settings

Purpose

Provide a centralized place for account and profile controls.

Capabilities

• Open Edit Profile• Open Privacy settings• Open About• Sign out

Edit Profile

Purpose

Manage personal profile information.

Capabilities

• Update display name• Update username• Update bio• Update profile avatar• Preview a new avatar before saving• Persist profile changes across sessions and devices

Privacy

Purpose

Control account visibility.

Capabilities

• Set account visibility• Use a public account• Use a private account• Require follow requests for private accounts

Public Profile

Purpose

View another user's profile and collections.

Capabilities

• View profile information• View avatar• Browse published collections• Follow / Unfollow public users• Request to follow private users• View follow-request state• View Taste Match• View followers• View following

Taste Match

Purpose

Show how closely two users' ranked collections align and explain the shared taste behind recommendations.

Capabilities

• View Taste Match percentage• View animated percentage count-up on screen load• View number of shared ranked picks• View shared movies and other ranked items used in the comparison• View recommendation context based on shared picks• Open Taste Match from a public profile• Open Taste Match directly from a personalized Feed recommendation

Published Collection

Purpose

Display an individual published collection.

Capabilities

• View creator• View collection title and category• View ranked items• View artwork and metadata• Like• Unlike• Comment• View like count• View comment count

Search

Purpose

Help users find people and content when building collections.

Current Capabilities

Users

• Search by username• Search by display name

Collection Creation

Movies

• TMDb• Category/topic-aware search• Popular suggestions

TV Shows

• TMDb• Category/topic-aware search• Popular suggestions

Books

• Google Books• Open Library fallback• Improved relevance handling• Intelligent edition deduplication• Preserve distinct books that share words or partial titles• Curated popular suggestions

Video Games

• IGDB• Cover artwork• Release year• Normalized ratings• Partial-title matching• Prefix fallback• Relevance-ranked results• Filtering of secondary content such as DLC, expansions, bundles, and mods where possible• Improved generic suggestions

Search Experience

• Shared search behaviour across all four entertainment categories• Debounced search input• In-memory result caching during the active search experience

Social Features

Following

• Follow public users• Unfollow users• View follower count• View following count• View followers• View following

Private Accounts & Follow Requests

• Request to follow a private user• View pending request state• Accept incoming follow requests• Decline incoming follow requests• Resend a follow request after a declined request

Likes

• Like• Unlike• View like count• Live updates

Comments

• Add comment• Delete own comment• View comment count• Live updates

Notifications

• Like notifications• Comment notifications• Follow notifications• Follow-request notifications• Accept / Decline follow requests• Read / unread state• Mark all as read• Live updates

Realtime

Implemented:

✅ Likes

✅ Comments

✅ Following

✅ Notifications

Realtime synchronization keeps supported social activity current across connected users while preserving optimistic interactions in the application.

External Providers

Provider

Purpose

Supabase

Authentication

Supabase

Database

Supabase

Storage

Supabase

Realtime

Supabase Edge Functions

Secure server-side integrations

TMDb

Movies

TMDb

TV Shows

Google Books

Books

Open Library

Book fallback

IGDB

Video Games

Twitch OAuth

Server-side IGDB authentication

Product Principles

Every feature should reinforce one or more of these principles.

• Help people express themselves.

• Help people discover others.

• Help people discover entertainment.

• Encourage conversation.

• Reward thoughtful curation.

• Use shared taste to make discovery more relevant.

• Keep the interface simple.

• Maintain a content-first experience.

Future Opportunities

This section intentionally captures ideas rather than committed roadmap items.

Examples include:

• Push notifications

• Better recommendation ranking

• AI-assisted recommendations

• Collection sharing

• Featured creators

• Enhanced profile customization

• Richer collection analytics

• Spotify integration

Revision History

Version 1.1 — August 10, 2026

Updated the feature inventory through commit f833160.

Added and updated:

• IGDB Video Games integration• Improved Books search and edition deduplication• Curated Books suggestions• Personalized Feed recommendations• Taste Match recommendation navigation• Taste Match percentage animation and presentation refinements• Feed pull-to-refresh• Private accounts and follow requests• Settings, Privacy, and About experiences• Current notification capabilities• Current external provider inventory

Removed RAWG from the active provider inventory.

Removed unverified Infinite Scrolling from the Feed inventory.

Version 1.0 — August 5, 2026

Initial feature inventory.