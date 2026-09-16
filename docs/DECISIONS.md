# Product Decisions

Version: 1.1
Status: Active
Owner: Jeremy Linskill
Last Updated: September 16, 2026

## Purpose

This document records durable product decisions that shape Top3.

It is not a feature inventory or implementation log. Decisions should be added when a product rule, interaction principle, terminology choice, or release-direction choice is expected to remain meaningful over time.

Historical decisions that are later replaced should remain in this document and be marked **Superseded** rather than deleted.

---

## Decision 001

### Title

Top3 exists to help people discover one another through shared taste.

### Decision

Top3 is a social discovery product built around the idea that ranked taste can help people express themselves, discover entertainment, and connect with people who share meaningful preferences.

### Rationale

This defines the product.

### Status

Active

---

## Decision 002

### Title

Use “Following” instead of “Followed.”

### Decision

Use **Following** to describe the people a user currently follows.

### Rationale

“Following” represents an ongoing relationship rather than a completed action.

### Status

Active

---

## Decision 003

### Title

Recommendations require shared ranked taste.

### Decision

A personalized recommendation should require at least one meaningful shared ranked item.

### Rationale

Recommendations should feel explainable and grounded in actual shared taste rather than arbitrary similarity.

### Status

Active

---

## Decision 004

### Title

Private profiles do not appear in recommendations.

### Decision

Private profiles must not be surfaced as personalized recommendations to people who do not already have appropriate access.

### Rationale

Respect privacy settings and avoid exposing private accounts through discovery.

### Status

Active

---

## Decision 005

### Title

Shared picks use the Taste Match highlight treatment.

### Decision

Shared ranked picks use the established Taste Match highlight treatment rather than a competitive or winner / loser visual treatment.

### Rationale

Shared picks should reinforce connection through common taste.

### Status

Active

---

## Decision 006

### Title

Follow interactions use a shared component.

### Decision

Follow / request-follow presentation should use the shared `FollowButton` pattern rather than independent screen-specific implementations.

### Rationale

Following is a core social action and should behave consistently across profiles and discovery surfaces.

### Status

Active

---

## Decision 007

### Title

Account Required Before First Top3

### Decision

Users must create an account before creating or publishing their first Top3.

### Rationale

Top3 is a community centered around identity and shared taste. Requiring an account simplifies the product, ensures every published Top3 belongs to a real profile, and provides a solid foundation for social features such as Following, Taste Match, Likes, and Comments.

### Date

July 28, 2026

### Status

**Superseded**

This decision was replaced by Decision 008 after the onboarding model was redesigned.

The requirement that every **published** List belongs to an authenticated account remains valid, but account creation no longer occurs before the user creates their first List.

---

## Decision 008

### Title

Let new users create their first List before authentication.

### Decision

A signed-out new user may choose a category, build their first Top 3 List, and experience the core product before creating an account.

Authentication is required at the **publish boundary**.

The pending onboarding List must be preserved through account creation or sign-in and published after a valid authenticated session is established.

### Rationale

The strongest introduction to Top3 is the product itself.

Letting people rank something before asking them to create an account gives them immediate context for what Top3 does while preserving the community requirement that every published List belongs to an authenticated profile.

### Date

August 17, 2026

### Status

Active

---

## Decision 009

### Title

Use “List” as the user-facing product term.

### Decision

User-facing copy should use **List** or **Top 3 List** rather than **Collection**.

Existing internal code, database structures, types, helpers, and filenames may continue to use `Collection` where changing the implementation terminology would add risk without improving the product.

### Rationale

“List” is clearer and more natural for users while the existing `Collection` domain model is already deeply established internally.

This separates product language from implementation language without requiring a disruptive technical rename.

### Date

August 17, 2026

### Status

Active

---

## Decision 010

### Title

Supported categories come from one shared registry.

### Decision

`TOP3_CATEGORIES` is the authoritative application-level source for supported Top3 categories and topics.

Screens should derive category availability from that registry rather than maintain independent category lists.

Onboarding should derive its category choices from the shared registry and sort them alphabetically for presentation.

### Rationale

A new category should not require multiple manually maintained lists across Create, onboarding, Discover, and other surfaces.

This reduces drift and makes category expansion safer.

### Date

September 16, 2026

### Status

Active

---

## Decision 011

### Title

Top3 follows the device appearance automatically.

### Decision

Top3 supports both light and dark appearance and follows the user’s device appearance automatically.

Application colour and text treatment should come from shared semantic theme roles rather than separate per-screen light / dark implementations.

### Rationale

Dark mode should behave like a system-level product capability, not a collection of screen-specific overrides.

A semantic theme system improves consistency and reduces the risk of visual drift as the application evolves.

### Date

September 16, 2026

### Status

Active

---

## Decision 012

### Title

Preview sheets intentionally invert the application theme.

### Decision

Book, trailer, and audio preview sheets use the opposite visual theme from the surrounding application:

```text
Light app → Dark preview
Dark app  → Light preview
```

Trailer video itself remains black.

### Rationale

The preview experience is intentionally treated as a distinct media layer rather than simply another app surface.

The inversion creates separation between browsing and immersive previewing while remaining consistent across supported preview types.

### Date

September 16, 2026

### Status

Active

---

## Decision 013

### Title

Reuse one shared presentation when the product role is the same.

### Decision

When two surfaces represent the same product concept, they should use the same shared presentation component unless there is an intentional product reason to differ.

Current examples include:

- Discover category suggestions and category search results → `DiscoverListCard`
- Discover genre suggestions and genre search results → `DiscoverListCard`
- Apple Music and Apple Podcasts previews → shared Audio Preview Sheet
- profile photo / fallback presentation → `UserAvatar`
- semantic application text → `AppText`

### Rationale

Visual consistency should come from shared ownership rather than repeated attempts to make duplicated implementations look alike.

### Date

September 16, 2026

### Status

Active

---

## Decision 014

### Title

Launch V1 before replacing the Feed with its large-scale architecture.

### Decision

The current client-generated Feed architecture is acceptable for initial V1 launch and real-user validation.

A speculative large-scale Feed rewrite should not block V1 release unless real launch reliability requires it.

The intended post-launch direction is a cursor-paginated, server-generated Feed with bounded recommendation candidate generation.

### Rationale

The current architecture is sufficient for initial low-volume validation.

Delaying launch to solve scale problems that have not yet materialized would introduce significant implementation risk without real usage data.

Scalability remains a standing architectural requirement, but the migration should be informed by actual product behaviour after launch.

### Date

August 20, 2026

### Status

Active

---

## Decision 015

### Title

Published Lists remain the source of truth for social content.

### Decision

A published List remains the underlying product object for Feed, Profile, Discover, likes, comments, sharing, recommendations, community rankings, and related social experiences.

Feed posts should remain projections of published Lists rather than become an independent persisted content model.

### Rationale

Keeping one content identity avoids duplicated state and keeps editing, social interactions, moderation, sharing, and discovery attached to the same underlying object.

### Date

September 16, 2026

### Status

Active

---

## Document Maintenance

Add a decision when a durable product rule or principle is established.

Do not use this file for routine implementation changes.

When a decision changes:

1. keep the original decision;
2. mark it **Superseded**;
3. identify the replacement decision;
4. add the new decision with its rationale and date.

Implementation status belongs in `CURRENT_STATE.md`.

User-facing capabilities belong in `FEATURES.md`.

Historical development milestones belong in `CHANGELOG.md`.

Architecture belongs in `ARCHITECTURE.md`.

Design-system rules belong in `DESIGN_SYSTEM.md`.
