# Top3 User Journey

Version: 0.2
Status: Active
Owner: Jeremy Linskill
Last Updated: September 16, 2026

---

# Document Purpose

This document describes the intended experience of a Top3 user from first discovery through becoming an engaged member of the community.

Unlike the Product Vision, which defines **why** Top3 exists, this document defines **how users experience that vision**.

Unlike `FEATURES.md`, which inventories what the product can do today, this document focuses on the sequence, expectations, emotions, and transitions that make the experience feel coherent.

Every major feature should help move users naturally from one meaningful stage to the next.

---

## Revision History

| Version | Date | Author | Summary |
| --- | --- | --- | --- |
| 0.1 | July 28, 2026 | Jeremy Linskill | Initial user journey documenting the ideal end-to-end experience for a Top3 user. |
| 0.2 | September 16, 2026 | Jeremy Linskill | Updated the journey to reflect signed-out first-List onboarding, authentication at the publish boundary, post-publish Overall education, Taste Match onboarding, current discovery and social loops, sharing, notifications, and returning-user behaviour. |

---

# Journey Overview

```text
Hear about Top3
      ↓
Download / Open
      ↓
Understand the idea
      ↓
Choose a category
      ↓
Build first Top 3 List while signed out
      ↓
Reach Publish
      ↓
Create account or sign in
      ↓
Publish first List
      ↓
Understand Lists → Overall
      ↓
Understand Taste Match
      ↓
Explore people, Lists, categories and recommendations
      ↓
Follow / Like / Comment / Share
      ↓
Receive social activity
      ↓
Return
      ↓
Publish more Lists
      ↓
Build trusted connections through shared taste
```

Every stage should naturally encourage the next.

The journey should demonstrate the product before asking the user to invest heavily in setup.

---

# Stage 1 — Awareness

## Goal

Help someone immediately understand what Top3 is.

### User Thoughts

> “This sounds different.”

> “I’d love to compare my favourites.”

> “I wonder who has similar taste.”

### Product Goal

Communicate one simple idea:

> **Discover people through shared taste.**

The product should feel social, personal, and entertainment-focused without requiring a long explanation.

---

# Stage 2 — Installation / First Open

## Goal

Reduce friction and reach the product experience quickly.

The user should not be forced through profile setup before understanding what Top3 does.

The native splash should hand off directly into the branded onboarding experience without a generic loading interruption.

### Experience Principle

**Show the product before asking for commitment.**

---

# Stage 3 — Branded Introduction

## Goal

Create curiosity and confidence within seconds.

The opening should establish the Top3 identity and transition quickly into choosing something the user already has opinions about.

The user does not need to understand every social feature yet.

They only need to understand:

> **Pick something you care about. Rank your Top 3.**

---

# Stage 4 — Choose a Category

## Goal

Make the first action obvious and low-risk.

The user chooses from the current Top3 category set:

- Albums
- Artists
- Books
- Movies
- Podcasts
- Songs
- TV Shows
- Video Games

Categories are derived from the shared product registry and displayed alphabetically.

Where a category uses topics or genres, the user chooses one before building the List.

### User Thought

> “I already know what I’d pick.”

### Product Goal

Move the user from curiosity into self-expression as quickly as possible.

---

# Stage 5 — Build the First Top 3

## Goal

Let the user experience the core product before authentication.

The signed-out user can:

- search for items;
- browse suggestions;
- preview supported media;
- add three items;
- rank them;
- reorder them;
- remove and replace them.

The first List should feel like making a choice, not filling out a form.

### Important Product Rule

The user may **create** the first List while signed out.

They may not **publish** it until authenticated.

The List must survive the authentication handoff.

### User Thought

> “This is already mine.”

---

# Stage 6 — Publish Boundary

## Goal

Ask for authentication only when the user has something worth saving.

When the user chooses to publish, Top3 explains that an account is required to publish the List and participate in the community.

The user can choose:

- Apple
- Google
- Email

Returning users can choose Sign In instead of creating a new account.

### Product Goal

Make authentication feel like the natural next step in preserving and publishing work the user has already created.

### Experience Principle

**Authentication should protect momentum, not interrupt it.**

---

# Stage 7 — Account Creation / Sign In

## Goal

Establish identity with minimal friction.

### Account Creation

The account system supports:

- Apple
- Google
- Email

Email users may need to confirm their email before the first List can be published.

The pending first List remains intact while authentication completes.

### Profile Identity

Top3 can establish the account before requiring extensive profile customization.

Profile information can be refined later through Edit Profile.

### Returning Users

A returning user who chooses Sign In should return to their existing account experience rather than continue through new-user product education.

---

# Stage 8 — First Publish

## Goal

Deliver the first meaningful commitment to the community.

After authentication succeeds, the pending onboarding List is published.

The user should understand that their personal Top 3 now contributes to the community.

### Emotional Goal

**Pride.**

The user has expressed something personal and made it part of the product.

---

# Stage 9 — Lists → Overall Education

## Goal

Explain how individual taste becomes community insight.

Immediately after the first publish, Top3 shows the relationship between:

1. the user’s personal Top 3 List;
2. the community’s aggregated Overall Top 3.

The transition should feel like a transformation of the same information rather than a separate feature explanation.

### User Thought

> “My List is part of something bigger.”

### Product Goal

Help the user understand why publishing matters beyond their own profile.

---

# Stage 10 — Taste Match Education

## Goal

Introduce the social value of ranked taste.

After Lists → Overall education, Top3 introduces Taste Match.

The user learns that shared ranked picks can be used to compare taste with other people.

The percentage animation and shared-pick presentation should make the concept understandable without requiring a detailed explanation of the calculation.

### User Thought

> “There are people here who like the same things I do.”

### Emotional Goal

**Recognition and connection.**

---

# Stage 11 — The Magic Moment

This is the central emotional payoff of Top3.

The user encounters another person whose ranked taste meaningfully overlaps with their own.

The product should make the connection explainable through actual shared picks.

Examples:

```text
Sarah
86% Taste Match
3 shared ranked picks
```

The user should think:

> **“Wait…there are people like me.”**

This moment can occur through onboarding, a public profile, Similar Taste, Discover, or a personalized Feed recommendation.

The exact surface may evolve.

The emotional outcome should remain the same.

---

# Stage 12 — Explore

## Goal

Turn the initial Taste Match idea into curiosity.

The user begins exploring:

- Feed Lists;
- Discover;
- Trending Categories;
- genres / topics;
- Category Feed;
- Community Top3;
- Overall Top3;
- public profiles;
- Similar Taste;
- personalized recommendations;
- published Lists.

Supported media previews reduce the friction of remembering or evaluating an item.

Examples include:

- Movie and TV trailers;
- Apple Music previews;
- Apple Podcasts previews;
- Book previews.

### User Thought

> “What else do people like me recommend?”

---

# Stage 13 — Connect

## Goal

Turn discovery into a trusted personal network.

Users follow people whose Lists and recommendations consistently resonate.

Following is about relevance, not popularity.

### Public Accounts

The user can follow immediately.

### Private Accounts

The user sends a follow request.

The private user can accept or decline it.

### Experience Principle

**Privacy should never be bypassed for discovery.**

Private profiles should not be exposed through recommendation behaviour that ignores their visibility settings.

---

# Stage 14 — Compare

## Goal

Reinforce why the relationship is interesting.

Taste Match allows users to compare:

- shared ranked picks;
- different rankings;
- overlap across Lists;
- the percentage representation of shared taste.

Recommendation explanations should be grounded in shared ranked items.

### User Thought

> “We agree on these, but rank them differently.”

That difference can be as interesting as agreement.

---

# Stage 15 — Participate

## Goal

Move from browsing into community participation.

Users can:

- like Lists;
- unlike Lists;
- comment;
- follow;
- accept or decline follow requests;
- publish more Lists;
- edit their own Lists;
- share Lists;
- share Overall rankings.

Participation should feel attached to real content and taste rather than generic engagement mechanics.

---

# Stage 16 — Share

## Goal

Let users take meaningful Top3 content outside the app.

Users can share:

- published Lists;
- community Overall rankings.

For V1, installed-app recipients can open supported shared content through the current Top3 link flow.

A broader Universal Link / public web fallback remains a later enhancement.

### User Thought

> “You need to see this List.”

Sharing should extend discovery without making sharing a prerequisite for product value.

---

# Stage 17 — Receive Activity

## Goal

Make social participation feel alive.

Users may receive:

- Like notifications;
- Comment notifications;
- Follow notifications;
- Follow-request notifications;
- follow-request acceptance notifications in-app.

Supported social events may also generate push notifications when the user has enabled them.

### Product Goal

Bring the user back because something meaningful happened around their content or relationships.

Notifications should not become noise.

---

# Stage 18 — Return

## Goal

Give the user a worthwhile reason to reopen Top3.

Examples:

- new Lists from people they follow;
- new comments or Likes;
- new followers;
- new Taste Match recommendations;
- new Discover activity;
- a new category or topic they want to rank;
- a shared List they want to revisit.

The app should reward curiosity rather than manufacture habitual checking.

---

# Stage 19 — Publish More Lists

## Goal

Deepen the user’s taste profile over time.

The user creates Lists across more categories and topics.

Each new published List:

- expresses more of the user’s identity;
- contributes to community Overall rankings;
- creates more opportunities for shared picks;
- improves the richness of Taste Match;
- gives followers more to discover.

The user should not need to manage a separate “collection library” to understand their content.

Published Lists remain visible through the appropriate profile and discovery experiences.

---

# Stage 20 — Build Trusted Connections

Over time, the user should:

- publish across more interests;
- refine their profile;
- follow people whose taste they trust;
- become recognizable through their Lists;
- participate in conversations;
- share discoveries;
- revisit people with strong Taste Match;
- discover entertainment through the community.

The goal is not to maximize time spent in Top3.

The goal is to make each visit feel worthwhile.

---

# Returning-User Journey

A returning user should not replay first-time onboarding.

The typical returning flow is:

```text
Open Top3
   ↓
Restore authenticated session
   ↓
Feed / primary app experience
   ↓
Browse new activity
   ↓
Discover / Search / Profile / Notifications / Create
```

If signed out, a returning user should be able to reach Sign In directly.

The app should preserve the distinction between:

- a new user creating a first List before account creation;
- an existing user returning to their account.

---

# Private-Account Journey

A user may choose a private account from Privacy settings.

For private accounts:

```text
Another user opens profile
        ↓
Requests to follow
        ↓
Private user receives request
        ↓
Accept or Decline
        ↓
Accepted relationship unlocks appropriate private-profile access
```

The pending request state should remain visible and understandable.

Declined requests may be sent again later.

Privacy rules should remain consistent across profiles, recommendations, followers, following, and related discovery experiences.

---

# Safety / Moderation Journey

Users should be able to participate without being forced to manage every problem themselves.

Available safety mechanisms include:

- blocking;
- reporting;
- prohibited-content filtering for supported free-form fields;
- moderation removal of reported Lists.

Expected content-filter rejection should explain what happened without losing the user’s typed input.

If moderation removes a creator’s published List, the app should reflect that removal without leaving stale local content visible.

---

# Appearance Journey

Top3 follows the device’s light / dark appearance automatically.

The experience should feel like the same product in both themes.

Users should not need to configure a separate in-app appearance setting.

Book, trailer, and audio preview sheets intentionally invert the surrounding application theme to create a distinct media-preview layer.

The inversion should feel deliberate rather than inconsistent.

---

# Emotional Journey

| Stage | Intended Emotion |
| --- | --- |
| Discover | Curious |
| First Open | Interested |
| Choose Category | Confident |
| Build First List | Engaged |
| Publish Boundary | Invested |
| First Publish | Proud |
| Lists → Overall | Surprised |
| First Taste Match | Excited |
| Explore | Curious Again |
| Follow | Connected |
| Compare | Recognized |
| Comment / Like | Participating |
| Share | Enthusiastic |
| Notification | Acknowledged |
| Return | Curious Again |
| More Lists | Expressive |
| Long-Term Community | Belonging |

The emotional journey is as important as the functional journey.

---

# Product Principles

Every stage should answer one question before introducing the next.

Avoid overwhelming users.

Avoid unnecessary forms.

Avoid asking for information before the user understands why it matters.

Preserve work across authentication.

Use real shared taste to explain recommendations.

Respect private-account boundaries.

Prefer recognition over instruction.

Make social participation contextual to Lists.

Let content remain the hero.

Progress should feel natural.

---

# Success Metrics

A successful first-use journey should enable a user to:

- ✓ understand the Top3 concept;
- ✓ choose a category;
- ✓ build a first List before account creation;
- ✓ complete authentication at the publish boundary;
- ✓ successfully publish the first List;
- ✓ understand the relationship between Lists and Overall;
- ✓ understand what Taste Match means;
- ✓ encounter at least one meaningful person / taste connection;
- ✓ continue into the main product.

Longer-term success includes:

- following another user;
- receiving or creating meaningful social activity;
- publishing additional Lists;
- returning to discover something worthwhile.

---

# Journey Bottlenecks

Potential areas of friction include:

- authentication interrupting the first List;
- email confirmation failing to return cleanly to the app;
- losing the pending onboarding List;
- weak first-item search results;
- poor media-provider coverage;
- empty or low-volume discovery surfaces;
- too few meaningful Taste Matches;
- unclear distinction between personal Lists and Overall rankings;
- private-account states that are difficult to understand;
- notification overload;
- shared links that do not work for recipients without Top3 installed;
- Feed architecture that becomes too slow as content volume grows.

Future iterations should reduce these points of friction without adding unnecessary onboarding steps.

---

# Future Journey Enhancements

Possible enhancements include:

- Universal Links and public web fallback for shared content;
- stronger personalized discovery;
- improved recommendation ranking;
- server-generated paginated Feed delivery;
- richer new-user recommendation seeding;
- more contextual re-engagement;
- additional content categories;
- carefully scoped AI-assisted discovery.

These should reinforce—not replace—the core journey.

---

# The North Star Experience

When someone recommends Top3 to a friend, we hope they say:

> “It’s like finding people who already love the same things you do.”

That sentence captures the experience Top3 is trying to create.

Every improvement should make that statement feel more true.

---

# Document Maintenance

The user journey should evolve as the product evolves.

Whenever a major stage changes—particularly onboarding, authentication, publishing, discovery, social connection, or returning-user behaviour—this document should be updated.

The journey should remain simple, intentional, and aligned with the Product Vision.

Current feature availability belongs in `FEATURES.md`.

Implementation detail belongs in `CURRENT_STATE.md`.

Durable product rules belong in `DECISIONS.md`.
