# Top3 Feature Inventory

Version: 1.2
Status: V1 Launch Readiness
Owner: Jeremy Linskill
Last Updated: September 16, 2026
Last Verified Commit: `92106eb` — Unify Discover search result cards

## Purpose

This document serves as the complete inventory of user-facing functionality within Top3.

Unlike `CURRENT_STATE.md`, which documents the application's current implementation and architecture, and `ROADMAP.md`, which describes future direction, `FEATURES.md` documents what users can do today.

This document should reflect the current product experience rather than historical implementation details.

## Product Summary

Top3 is a social discovery platform built around ranked **Top 3 Lists**.

Users express themselves through curated lists, discover entertainment and people through shared taste, compare preferences through Taste Match, and interact with the community through follows, likes, comments, notifications, and sharing.

User-facing product language uses **List**. Existing code, database structures, helpers, and filenames may continue to use `Collection` internally.

The application currently supports:

- signed-out first-list onboarding;
- Email, Apple, and Google authentication;
- password recovery;
- public and private profiles;
- profile avatars;
- List creation, editing, drafts, and publishing;
- Movies, TV Shows, Books, Video Games, Songs, Albums, Artists, and Podcasts;
- media previews for Movies, TV Shows, Apple Music, Apple Podcasts, and Books;
- Feed;
- Discover;
- Search;
- Overall community rankings;
- personalized Taste Match recommendations;
- following and follow requests;
- likes;
- comments;
- in-app notifications;
- push notifications;
- realtime synchronization;
- List and Overall sharing;
- blocking and reporting;
- moderation-aware content removal;
- system-aware light / dark mode;
- Settings, privacy, account deletion, and profile controls.

## Feature Status

| Feature | Status |
| --- | --- |
| Authentication | ✅ Production Ready |
| Signed-Out First-List Onboarding | ✅ Production Ready |
| Password Recovery | ✅ Production Ready |
| User Profiles | ✅ Production Ready |
| Profile Avatars | ✅ Production Ready |
| Public / Private Accounts | ✅ Production Ready |
| Lists / Publishing | ✅ Production Ready |
| Feed | ✅ Production Ready for V1 |
| Discover | ✅ Production Ready |
| Search | ✅ Production Ready |
| Movies / TV Trailers | ✅ Production Ready |
| Apple Music Previews | ✅ Production Ready |
| Podcasts / Podcast Previews | ✅ Production Ready |
| Book Previews | ✅ Production Ready |
| Personalized Recommendations | ✅ Production Ready |
| Taste Match | ✅ Production Ready |
| Following | ✅ Production Ready |
| Follow Requests | ✅ Production Ready |
| Likes | ✅ Production Ready |
| Comments | ✅ Production Ready |
| In-App Notifications | ✅ Production Ready |
| Push Notifications | ✅ Production Ready |
| Realtime Synchronization | ✅ Production Ready |
| List / Overall Sharing | ✅ Production Ready |
| Blocking / Reporting | ✅ Production Ready |
| Settings / Privacy | ✅ Production Ready |
| Account Deletion | ✅ Production Ready |
| Light / Dark Mode | ✅ Production Ready |
| Universal Links / Public Share Web Fallback | ➡️ Post-Launch |
| Large-Scale Paginated Feed | ➡️ Post-Launch |
| AI-Assisted Recommendations | 💡 Future |

## Application Navigation

### Bottom Navigation

- Feed
- Discover
- Create
- Notifications
- Profile

### Additional User-Facing Screens

- Onboarding
- Create Account
- Sign In
- Email Sign Up
- Email Sign In
- Forgot Password
- Reset Password
- Check Email
- Search
- List / Collection
- Published Top 3
- Category Feed
- Community Top3
- Overall Top3
- Public Profile
- Taste Match
- Followers
- Following
- Settings
- Edit Profile
- Privacy
- About

## Onboarding & First Run

### Purpose

Introduce Top3 by letting a new user experience the core product before account creation.

### Current Capabilities

- View the branded onboarding intro.
- Choose from the current Top3 categories.
- Categories are presented alphabetically.
- Choose a topic where applicable.
- Build a first Top 3 while signed out.
- Search content providers before creating an account.
- Preserve the first List through the authentication handoff.
- Publish the pending first List after authentication succeeds.
- Learn the relationship between individual Lists and community Overall rankings.
- See Taste Match introduced after the first publish.
- Choose Apple, Google, or Email when creating an account.
- Return to Sign In if the user already has an account.

### Current Categories

- Albums
- Artists
- Books
- Movies
- Podcasts
- Songs
- TV Shows
- Video Games

## Authentication

### Account Creation

Users can create an account with:

- Sign in with Apple
- Google
- Email

### Sign In

Returning users can sign in with:

- Apple
- Google
- Email

### Email Authentication

Supports:

- email signup;
- email verification;
- branded confirmation email;
- branded `top3taste.com` confirmation bridge;
- account confirmation callback into Top3;
- common-domain typo suggestions during signup;
- persistent sessions;
- friendly authentication errors.

### Password Recovery

Users can:

- choose **Forgot password?** from Email Sign In;
- request a password-reset email;
- open their email app directly;
- return to Top3 through the recovery link;
- enter and confirm a new password;
- return to Sign In after recovery.

### Account Deletion

Users can permanently delete their Top3 account from Settings.

For Apple-authenticated accounts, Top3 revokes the stored Sign in with Apple authorization before deleting the account.

After deletion, local onboarding state is reset so the user returns to the new-user experience.

## Feed

### Purpose

Help users browse published Lists from themselves, followed users, and relevant Taste Match recommendations.

### Browse

Users can:

- view published Top 3 Lists;
- view creator information and avatar;
- view ranked items;
- view artwork and metadata;
- use supported media-preview controls;
- pull down to refresh;
- open the creator's profile;
- open the full published List.

### Personalized Recommendations

The Feed can:

- surface Taste Match-based recommendations;
- show recommendation context;
- explain recommendations using shared ranked picks;
- let users tap the recommendation explanation to open Taste Match details.

### Social

Users can:

- like Lists;
- unlike Lists;
- comment;
- view like counts;
- view comment counts;
- share Lists.

### Navigation

Users can:

- open a published List;
- open a public profile;
- open Taste Match from a personalized recommendation;
- edit their own List where applicable.

### Realtime

- ✅ Likes
- ✅ Comments
- ✅ Follow-related state through shared social providers

### V1 Scalability Note

The current Feed is suitable for initial V1 usage and release validation.

The planned post-launch architecture is cursor-paginated and server-generated so the client does not need to retrieve the complete published-post dataset at larger scale.

## Discover

### Purpose

Help users explore categories, topics / genres, community activity, Lists, and people through shared taste.

### Discovery

Users can browse:

- featured discovery content;
- Trending Categories;
- topic / genre discovery;
- category publication counts;
- Community Top3;
- Overall Top3;
- category-specific Lists.

### Search Within Discover

Users can search Discover for:

- categories;
- topics / genres;
- relevant published content.

Category and genre search results use the same shared card presentation as the equivalent default Discover rows.

Podcasts participate in Discover category and genre matching.

### People

Users can discover people through:

- Similar Taste;
- Taste Match percentage;
- shared picks;
- public profiles;
- follow actions;
- private-account follow requests.

### Navigation

Users can open:

- Public Profile;
- Category Feed;
- Community Top3;
- Overall Top3;
- Taste Match.

## Create

### Purpose

Create, edit, rank, save, and publish Top 3 Lists.

### Capabilities

Users can:

- choose a category;
- choose a topic;
- search external content providers;
- view curated / popular suggestions;
- shuffle suggestions where supported;
- add ranked items;
- reorder ranked items;
- remove ranked items;
- preview supported media;
- save a draft;
- resume a draft;
- edit a draft;
- publish;
- edit a published List.

All supported topics remain available in Create even if a matching topic List has already been published.

## Supported Content Categories

### Movies

Provider:

- TMDb

Capabilities:

- category / topic-aware search;
- popular suggestions;
- poster artwork;
- rating metadata where available;
- in-app trailer playback where a usable trailer is available.

### TV Shows

Provider:

- TMDb

Capabilities:

- category / topic-aware search;
- popular suggestions;
- poster artwork;
- rating metadata where available;
- in-app trailer playback where a usable trailer is available.

### Books

Providers:

- Google Books
- Open Library fallback

Capabilities:

- relevance-aware search;
- edition deduplication;
- preservation of distinct titles that share partial wording;
- curated popular suggestions;
- cover artwork;
- in-app book preview where supported.

### Video Games

Provider:

- IGDB

Capabilities:

- cover artwork;
- release year;
- normalized ratings;
- partial-title matching;
- prefix fallback;
- relevance-ranked results;
- filtering of DLC, expansions, bundles, mods, and other secondary content where possible;
- generic / popular suggestions;
- signed-out onboarding search.

### Songs

Provider:

- Apple Music

Capabilities:

- genre-aware search;
- artwork;
- artist metadata;
- preview audio where available;
- genre-aware suggestions;
- evergreen-oriented suggestion ranking.

### Albums

Provider:

- Apple Music

Capabilities:

- album search;
- square artwork;
- artist metadata;
- representative track preview where available;
- evergreen-oriented suggestions.

### Artists

Provider:

- Apple Music

Capabilities:

- artist search;
- square artwork;
- canonical exact-match enrichment;
- deduplication;
- representative song preview where available;
- evergreen-oriented suggestions.

### Podcasts

Providers:

- Apple iTunes Search API
- Apple iTunes Lookup API
- Apple Podcasts chart feed

Capabilities:

- podcast search;
- topic-aware ranking;
- popular podcast suggestions;
- square artwork;
- creator / publisher metadata;
- Apple Podcasts show links;
- playable recent-episode preview lookup where available.

## Search

### Purpose

Help users find people and media while browsing or building Lists.

### User Search

Users can search people by:

- username;
- display name.

### Content Search

Top3 routes category search through shared provider architecture for:

- Movies
- TV Shows
- Books
- Video Games
- Songs
- Albums
- Artists
- Podcasts

### Search Experience

Current behaviour includes:

- shared provider routing;
- delayed search trigger to avoid unnecessary requests;
- in-memory result caching during the session;
- provider-specific relevance ranking;
- provider-specific deduplication;
- provider-specific retry / fallback behaviour;
- category-appropriate artwork;
- supported media previews;
- keyboard dismissal when starting supported media playback.

## Media Preview Features

### Apple Music

Supported for:

- Songs
- Albums
- Artists

Users can:

- play / pause preview audio;
- see artwork and metadata;
- use the shared preview sheet;
- open the corresponding Apple Music destination where available.

Only one audio preview plays at a time.

### Apple Podcasts

Users can:

- request an episode preview from a Podcast item;
- play / pause preview audio;
- see Podcast artwork and metadata;
- use the shared audio preview sheet;
- open the Podcast in Apple Podcasts.

Apple Music and Apple Podcasts share the same application-level audio-preview system.

### Movie & TV Trailers

Users can:

- play available Movie trailers;
- play available TV trailers;
- watch inside Top3 through the in-app trailer player.

Trailer controls are hidden when Top3 has confirmed that TMDb has no usable trailer.

A YouTube trailer may still be unavailable in a specific country even when TMDb reports it.

### Book Preview

Supported Books can open the in-app book preview experience.

### Preview Theme

Book, trailer, and audio preview sheets intentionally invert the application theme:

- light app → dark preview;
- dark app → light preview.

## Published Top 3

### Purpose

Display an individual published List and its social activity.

### Capabilities

Users can:

- view the creator;
- view List title, category, and topic;
- view the three ranked items;
- view artwork and metadata;
- use supported media previews;
- like;
- unlike;
- open comments;
- add comments;
- view like count;
- view comment count;
- share the List;
- open the creator's profile.

Comments use the shared CommentsSheet experience.

## Category Feed, Community & Overall

### Category Feed

Users can browse published Lists for a category / topic.

### Community Top3

Users can view community ranking presentations derived from published Lists.

### Overall Top3

Users can view the aggregated Overall ranking for supported category / topic combinations.

Overall rows preserve:

- ranking;
- category-appropriate artwork;
- applicable media previews;
- community publication context.

Overall rankings can be shared from Category Feed.

## Notifications

### Purpose

Surface important social activity and follow requests.

### Notification Types

- Likes
- Comments
- New followers
- Follow requests
- Follow-request acceptance

### User Actions

Users can:

- view notifications;
- mark notifications as read;
- mark all notifications as read;
- open a published List;
- open a profile;
- accept follow requests;
- decline follow requests;
- pull down to refresh.

### Presentation

- unread badge in bottom navigation;
- relative timestamps;
- actor names and avatars;
- contextual List titles where applicable.

### Realtime

- ✅ Live notification updates

## Push Notifications

### Purpose

Deliver supported social activity when the user is away from the relevant Top3 screen.

### Supported Push Events

- Likes
- Comments
- Follows

### Capabilities

Users can:

- choose whether to allow notifications during onboarding;
- enable / disable Notifications from Settings;
- receive push notifications on registered devices;
- tap Like / Comment pushes to open the relevant published List;
- tap Follow pushes to open the relevant public profile.

Push-token state is managed per device and account.

Sign-out removes the current device token.

## Profile

### Purpose

Present the authenticated user's identity and published Lists.

### Capabilities

Users can:

- view profile information;
- view profile avatar;
- view published Lists;
- view followers;
- view following;
- open published Lists;
- open Settings.

## Settings

### Purpose

Provide centralized account, profile, privacy, notification, and session controls.

### Capabilities

Users can:

- open Edit Profile;
- open Privacy;
- open About;
- enable / disable push notifications;
- sign out;
- permanently delete the account.

## Edit Profile

### Purpose

Manage personal profile information.

### Capabilities

Users can:

- update display name;
- update username;
- update bio;
- update profile avatar;
- preview a new avatar before saving;
- persist profile changes across sessions and devices.

Profile text fields use the V1 prohibited-content filter.

## Privacy

### Purpose

Control account visibility.

### Capabilities

Users can:

- use a public account;
- use a private account;
- require follow requests before private-profile access is granted.

## Public Profile

### Purpose

View another user's profile and published Lists.

### Capabilities

Users can:

- view profile information;
- view avatar;
- browse published Lists;
- follow / unfollow public users;
- request to follow private users;
- view follow-request state;
- view Taste Match;
- view followers;
- view following.

Blocked relationships are respected across supported profile and social surfaces.

## Taste Match

### Purpose

Show how closely two users' ranked Lists align and explain shared taste.

### Capabilities

Users can:

- view Taste Match percentage;
- view animated percentage count-up;
- view number of shared ranked picks;
- view the ranked items used in the comparison;
- understand recommendation context based on shared picks;
- open Taste Match from a public profile;
- open Taste Match from a personalized Feed recommendation.

## Social Features

### Following

Users can:

- follow public users;
- unfollow users;
- view follower count;
- view following count;
- view followers;
- view following.

### Private Accounts & Follow Requests

Users can:

- request to follow a private user;
- view pending request state;
- accept incoming follow requests;
- decline incoming follow requests;
- resend a follow request after a previous request is declined.

### Likes

Users can:

- like;
- unlike;
- view like counts;
- receive live updates.

A later unlike → relike can generate a new notification.

### Comments

Users can:

- add a comment;
- delete their own comment;
- view comment count;
- receive live updates.

### Blocking

Blocking is respected across supported:

- content;
- discovery;
- social;
- Taste Match;
- notification;
- profile surfaces.

### Reporting & Moderation

Users can report supported content.

Moderation can remove reported Lists.

When a creator's List is removed through moderation, Top3 updates the creator-side application state without requiring a complete List reload.

## Content Safety

### Prohibited-Content Filtering

V1 automated filtering applies to:

- comments;
- display name;
- username;
- bio.

Expected rejection uses the Top3 ActionSheet experience rather than a development error overlay.

Entered text remains available so the user can correct it.

Broader context-dependent abuse continues to be handled through reporting, blocking, and moderation rather than broad automatic word blocking.

## Realtime

Implemented:

- ✅ Likes
- ✅ Comments
- ✅ Following
- ✅ Notifications
- ✅ Creator-scoped moderation removals

Realtime synchronization keeps supported social activity current across connected users while preserving optimistic interactions.

## Sharing

### Published Lists

Users can share published Lists from:

- Feed;
- Profile;
- Category Feed;
- Published Top 3.

### Overall Rankings

Users can share Overall community rankings from Category Feed.

### Current Link Behaviour

V1 sharing uses the Top3 custom app URL scheme for installed-app recipients.

Logged-out users with Top3 installed can open published, non-removed shared content.

Universal Links and a public web fallback for recipients without the app remain post-launch work.

## Light & Dark Mode

Top3 follows the device appearance automatically.

Supported presentation includes:

- light application theme;
- dark application theme;
- semantic text and surface colours;
- theme-aware shared components;
- theme-aware authentication screens;
- theme-aware Discover cards;
- theme-aware profile / social surfaces;
- intentional preview-sheet theme inversion.

## External Providers & Services

| Provider / Service | Purpose |
| --- | --- |
| Supabase Auth | Authentication and sessions |
| Supabase Postgres | Product data |
| Supabase Storage | Profile avatars |
| Supabase Realtime | Live social updates |
| Supabase Edge Functions | Trusted server-side integrations |
| Expo Notifications / Expo Push Service | Push notifications |
| Amplitude | Product analytics |
| TMDb | Movies, TV Shows, trailer metadata |
| Google Books | Books |
| Open Library | Book fallback |
| IGDB | Video Games |
| Twitch OAuth | Server-side IGDB authentication |
| Apple Music | Songs, Albums, Artists |
| Apple iTunes Search / Lookup | Podcasts |
| Apple Podcasts chart feed | Podcast suggestions |
| YouTube | Embedded Movie / TV trailer playback |
| Resend | Supabase authentication email delivery |
| top3taste.com | Public support / legal site and email-confirmation bridge |

## Product Principles

Every feature should reinforce one or more of these principles.

- Help people express themselves.
- Help people discover others.
- Help people discover entertainment.
- Encourage conversation.
- Reward thoughtful curation.
- Use shared taste to make discovery more relevant.
- Keep the interface simple.
- Maintain a content-first experience.
- Prefer reusable product patterns over one-off UI.
- Preserve user trust through clear privacy, moderation, and account controls.

## Future Opportunities

This section captures possible product directions rather than committed release promises.

Examples include:

- cursor-paginated server-generated Feed;
- bounded server-side recommendation candidate generation;
- Universal Links and public share web fallback;
- AI-assisted recommendations;
- featured creators;
- enhanced profile customization;
- richer List analytics;
- additional content categories;
- additional metadata-provider fallbacks.

## Revision History

### Version 1.2 — September 16, 2026

Updated the feature inventory through commit `92106eb`.

Added or updated:

- signed-out first-list onboarding;
- Email, Apple, and Google authentication flow;
- password recovery;
- account deletion;
- push notifications;
- List and Overall sharing;
- blocking, reporting, and moderation-aware content removal;
- prohibited-content filtering;
- system-aware light / dark mode;
- inverted preview-sheet themes;
- Movies / TV trailer playback;
- Apple Music Songs, Albums, and Artists;
- Apple Music preview audio;
- Podcasts;
- Apple Podcasts episode previews and show links;
- current Discover search / card behaviour;
- current reusable media-preview capabilities;
- current external provider inventory;
- current Feed scalability note.

Updated user-facing terminology from **Collections** to **Lists** while preserving internal `Collection` terminology where it remains part of the implementation.

### Version 1.1 — August 10, 2026

Updated the feature inventory through commit `f833160`.

Added and updated:

- IGDB Video Games integration;
- improved Books search and edition deduplication;
- curated Books suggestions;
- personalized Feed recommendations;
- Taste Match recommendation navigation;
- Taste Match percentage animation and presentation refinements;
- Feed pull-to-refresh;
- private accounts and follow requests;
- Settings, Privacy, and About experiences;
- current notification capabilities;
- current external provider inventory.

Removed RAWG from the active provider inventory.

Removed unverified Infinite Scrolling from the Feed inventory.

### Version 1.0 — August 5, 2026

Initial feature inventory.
