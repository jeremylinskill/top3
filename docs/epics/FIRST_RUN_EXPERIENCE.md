# Epic EPIC-001 — First Run Experience

Version: 1.0
Status: Implemented / V1
Owner: Jeremy Linskill
Priority: Launch Critical (P0)
Last Updated: September 16, 2026

---

# Overview

The First Run Experience is the user's introduction to Top3.

Its purpose is not to teach the entire interface.

Its purpose is to let someone experience the core product before asking them to create an account, then carry that momentum through authentication and into the community.

The current V1 journey is built around one principle:

> **Show the product before asking for commitment.**

A new user can build their first Top 3 List while signed out.

Authentication is required only when the user reaches the publish boundary.

After the first List is published, onboarding explains how personal Lists contribute to community Overall rankings and introduces Taste Match before the user continues into the main application.

---

# Objective

Enable a brand-new user to:

- understand what Top3 is;
- choose something they care about;
- build a first Top 3 List while signed out;
- preserve that List through authentication;
- create an account or sign in at the publish boundary;
- publish the first List;
- understand the relationship between Lists and Overall rankings;
- understand the idea of Taste Match;
- continue into the main Top3 experience.

The first-run flow should feel like using Top3, not completing setup.

---

# Product Goals

The First Run Experience should:

- communicate the core idea quickly;
- reduce setup friction;
- encourage self-expression before account creation;
- preserve user work through authentication;
- make publishing feel meaningful;
- explain why personal Lists matter to the community;
- introduce Taste Match without over-explaining it;
- distinguish new-user account creation from returning-user sign in;
- hand off cleanly into the main application.

---

# Experience Principles

## Product Before Profile

A user should understand Top3 by creating a List rather than by reading onboarding copy or completing profile fields first.

## Authentication at the Publish Boundary

Account creation should happen only after the user has built something worth saving.

## Preserve Momentum

The signed-out onboarding List must survive:

- Create Account;
- Sign In;
- email confirmation;
- browser → app handoff;
- session establishment.

The user should never need to rebuild the first List because authentication interrupted the flow.

## One Category Source of Truth

Onboarding categories are derived from `TOP3_CATEGORIES`.

They are sorted alphabetically for presentation.

The onboarding flow does not maintain a separate manually curated category registry.

## Returning Users Are Different

A returning user who chooses Sign In should return to their existing account experience rather than continue through new-user onboarding.

## Education After Value

Lists → Overall and Taste Match education occurs after the user has already published something personal.

This gives the concepts context.

---

# Non-Goals

This Epic does not require the first-run flow to:

- force profile customization before publishing;
- force the user to follow someone during onboarding;
- force the user to complete every supported category;
- teach every Feed, Discover, notification, sharing, moderation, or Settings feature;
- import contacts;
- sync an address book;
- introduce messaging;
- introduce premium features;
- guarantee a specific Taste Match with another real user during onboarding.

Those experiences belong in the main product once onboarding has established the core mental model.

---

# Current User Journey

```text
Native Splash
    ↓
Branded Intro
    ↓
Choose Category
    ↓
Choose Topic / Genre where applicable
    ↓
Build First Top 3 List while signed out
    ↓
Tap Publish
    ↓
Choose Create Account or Sign In
    ↓
Apple / Google / Email
    ↓
Establish authenticated session
    ↓
Publish pending onboarding List
    ↓
Lists → Overall education
    ↓
Taste Match education
    ↓
Continue into main Top3 experience
```

---

# Current Categories

The first-run category chooser is generated from the shared category registry.

Current categories:

- Albums
- Artists
- Books
- Movies
- Podcasts
- Songs
- TV Shows
- Video Games

The presentation is alphabetical.

The layout adapts to the number of categories rather than relying on a fixed hard-coded category sequence.

---

# Onboarding Presentation

## Native Splash → Intro

The native Expo splash hands off directly into the onboarding intro.

The branded intro is already present behind the native splash so the transition does not introduce a generic loading screen or white flash.

## Intro Icon

The Top3 icon is rendered inside the onboarding intro stage.

It:

- remains stationary during the opening presentation;
- fades with the intro content;
- does not remain floating over the category-selection screen.

## Theme

The onboarding flow participates in the shared light / dark application theme.

The app follows device appearance automatically.

---

# First List Creation

The signed-out user can experience the real List-building workflow before authentication.

Supported behaviour includes:

- category selection;
- topic / genre selection where applicable;
- content search;
- curated or popular suggestions;
- media previews where supported;
- adding ranked items;
- reordering;
- removing / replacing items;
- preserving the onboarding List locally.

The first List is not a mock onboarding object.

It becomes the real collection that is published after authentication.

---

# Publish Boundary

Publishing is the transition from private local onboarding work into the authenticated community.

When the signed-out user reaches Publish, Top3 preserves the pending List and asks for authentication.

The user can choose:

- Create Account;
- Sign In.

Provider options include:

- Apple;
- Google;
- Email.

The provider-choice presentation is shared across Sign In and Create Account.

Provider-specific authentication logic remains separate from button presentation.

---

# Email Confirmation Journey

Email account creation may require confirmation before the pending first List can be published.

The current flow supports:

```text
Create Account
    ↓
Email Sign Up
    ↓
Confirmation Email
    ↓
top3taste.com HTTPS confirmation bridge
    ↓
Open Top 3
    ↓
Auth Callback
    ↓
Authenticated Session
    ↓
Publish Pending List
```

The pending onboarding List and authentication intent remain available throughout this handoff.

---

# Returning-User Journey

If a user already has an account, they can choose Sign In from the onboarding publish flow.

The application preserves the distinction between:

- **new-account intent**;
- **returning-user sign-in intent**.

After returning-user authentication succeeds, the user should return to the authenticated application rather than continue through new-user education intended for a newly created account.

---

# Post-Publish Education

## Lists → Overall

After the first successful publish, onboarding demonstrates how an individual's Top 3 List contributes to a community Overall ranking.

The transition uses related card presentation so the user sees the relationship rather than encountering an unrelated explanation screen.

The product idea is:

```text
My List
   ↓
Community participation
   ↓
Overall ranking
```

## Taste Match

After Overall education, onboarding introduces Taste Match.

The goal is not to explain the full algorithm.

The goal is to establish the mental model:

> Shared ranked taste can help you discover people whose preferences overlap with yours.

The Taste Match percentage is presented with an animated count-up.

---

# Implementation Areas

The current Epic spans the following major implementation areas:

- `app/onboarding.tsx`
- signed-out onboarding collection state
- category / topic registry integration
- collection creation and search
- publish-boundary authentication intent
- Create Account
- Sign In
- Apple authentication
- Google authentication
- Email authentication
- email confirmation / auth callback
- pending onboarding publish
- post-publish onboarding
- Lists → Overall education
- Taste Match education
- application-entry routing

---

# Dependencies

The First Run Experience depends on:

- authentication;
- Supabase Auth session restoration;
- profile creation / loading;
- category registry;
- provider search architecture;
- onboarding collection persistence;
- publishing;
- email confirmation callback infrastructure;
- Apple authentication;
- Google authentication;
- post-publish List presentation;
- Overall ranking presentation;
- Taste Match presentation;
- Expo Router entry routing.

---

# Analytics

The broader Top3 analytics implementation includes events relevant to first run such as:

- `account_created`
- `onboarding_completed`
- `collection_started`
- `collection_completed`
- `collection_published`
- `search_performed`
- `item_added`
- `taste_match_viewed`
- `user_followed`

Analytics should measure product behaviour without becoming a requirement that delays or complicates the first-use experience.

---

# Verified Behaviour

The current first-run implementation has been verified for:

- native splash → onboarding handoff;
- branded onboarding intro;
- onboarding category presentation;
- automatic category derivation from `TOP3_CATEGORIES`;
- alphabetical category order;
- signed-out first-List creation;
- authentication at the publish boundary;
- preservation of onboarding state through authentication;
- new-account versus returning-user intent;
- Apple / Google / Email provider-choice presentation;
- pending first-List publish after authentication;
- Lists → Overall education;
- Taste Match onboarding;
- physical iPhone onboarding category presentation after Podcasts was added;
- `npm run typecheck` after the current onboarding / authentication changes.

---

# Current Acceptance Checklist

## Product

- [x] Core value is experienced before account creation.
- [x] User can build the first List while signed out.
- [x] Authentication occurs at Publish.
- [x] Pending List survives authentication.
- [x] New-account and returning-user intent are distinct.
- [x] First List can be published after authentication.
- [x] Lists → Overall relationship is introduced.
- [x] Taste Match is introduced.
- [x] User can continue into the main application.

## Engineering

- [x] Authentication
- [x] Navigation
- [x] Onboarding persistence
- [x] Pending publish state
- [x] Auth intent state
- [x] Email confirmation callback
- [x] Apple authentication
- [x] Google authentication
- [x] Error handling
- [x] Loading / routing guards
- [x] TypeScript validation

## Design

- [x] Branded splash handoff
- [x] Intro staging
- [x] Automatic category layout
- [x] Shared authentication buttons
- [x] Light / dark mode support
- [x] Post-publish Lists → Overall education
- [x] Taste Match presentation
- [x] Shared semantic typography / colours

## QA

- [x] New-user onboarding flow
- [x] Returning-user sign-in intent
- [x] Physical-device category presentation
- [x] Podcast category added without manual onboarding-list maintenance
- [x] Typecheck passes

Additional regression testing remains part of normal release-candidate validation rather than an unfinished Epic requirement.

---

# Definition of Done

EPIC-001 is considered implemented for V1 because:

- the new user can experience the core product before account creation;
- the onboarding List persists through authentication;
- account creation / sign in works at the publish boundary;
- the first List can be published after authentication;
- the user receives post-publish product education;
- returning users are handled separately;
- the flow participates in the shared light / dark design system;
- the current flow has passed physical-device and TypeScript verification.

---

# Remaining Release Validation

The Epic itself is implemented.

Before a new release candidate is created, normal regression validation should continue to confirm that the first-run experience still works after surrounding product changes.

Particular attention should remain on:

- native splash → onboarding transition;
- category layout after category additions;
- signed-out search;
- pending List preservation;
- Apple authentication;
- Google authentication;
- email confirmation callback;
- returning-user Sign In;
- pending publish;
- post-publish navigation;
- Lists → Overall transition;
- Taste Match education;
- light / dark appearance.

---

# Future Enhancements

Possible post-V1 enhancements include:

- richer recommendation seeding immediately after onboarding;
- suggested people to follow;
- stronger personalization as more real user data becomes available;
- additional content categories;
- refined onboarding analytics;
- contextual onboarding experiments;
- Universal Link / web handoff improvements where they affect account confirmation or shared content.

These enhancements should reinforce the current architecture rather than restore account-first onboarding.

---

# Definition of Success

A new user opens Top3 and quickly understands the product by doing the thing Top3 is built around:

> **Creating a Top 3 List.**

By the time authentication is requested, the user has already invested in something personal.

By the time onboarding ends, the user understands that their List contributes to the community and that shared ranked taste can connect them with other people.

The intended emotional outcome remains:

> **“I found my kind of people.”**
