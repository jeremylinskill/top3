# Top3 Product Architecture

**Version:** 0.1 (Draft)  
**Status:** Active  
**Owner:** Jeremy Linskill  
**Last Updated:** July 28, 2026

---

## Document Purpose

This document describes the structure of the Top3 product.

It documents the application's major features, reusable systems, user flows, and supporting services.

Unlike technical documentation, this document focuses on **what the product does**, not how it is implemented.

It should evolve whenever major functionality is added or significantly changed.

---

## Revision History

| Version | Date | Author | Summary |
|----------|------------|------------------|--------------------------------------------------------------|
| 0.1 | July 28, 2026 | Jeremy Linskill | Initial architecture document describing the major product systems and user flows. |

---

# Product Overview

Top3 is composed of several interconnected systems.

```
Authentication

↓

Profile

↓

Publish Top3

↓

Feed

↓

Discovery

↓

Taste Match

↓

Connection

↓

Conversation
```

Each system contributes toward one primary goal:

> **Helping people discover one another through shared taste.**

---

# Product Maturity

| Feature | Status |
|---------|----------|
| Publishing Top3s | ✅ Mature |
| Feed | ✅ Mature |
| Public Profiles | ✅ Mature |
| Following | ✅ Mature |
| Taste Match | ✅ Mature |
| Likes | ✅ Mature |
| Comments | ✅ Mature |
| Recommendations | ✅ Mature |
| Category Browsing | 🟡 Growing |
| Search | 🟡 Growing |
| Discover | 🟡 Growing |
| Notifications | ⬜ Planned |
| Messaging | ⬜ Future |

---

# Core Product Systems

---

# Feed

## Purpose

The personalized home experience.

Displays content from people the user follows while introducing new people through recommendations.

## Features

- Personalized feed
- Following posts
- Recommendation cards
- Shared taste highlights
- Like posts
- Comment on posts
- Follow users directly
- Recommendation reasoning

## Depends On

- Follow System
- Taste Match
- Publishing
- Profile Visibility

---

# Publishing

## Purpose

Allow users to create and publish Top3 collections.

## Features

- Create Top3 collections
- Edit collections
- Publish
- Draft support
- Category selection
- Topic support
- Search for items

## Depends On

- User Profile
- Categories
- Search

---

# Profiles

## Purpose

Represent a user's identity through their tastes.

## Features

- Public profile
- Private profile
- Avatar
- Display name
- Username
- Bio
- Published Top3s
- Followers
- Following
- Taste Match summary
- Edit Profile

## Depends On

- Publishing
- Following
- Taste Match

---

# Following

## Purpose

Allow users to build a personalized network.

## Features

- Follow
- Following
- Followers
- Following counts
- Reusable Follow button

## Used By

- Feed
- Public Profile
- Taste Match
- Recommendations

---

# Taste Match

## Purpose

Measure compatibility between two people.

## Features

- Match score
- Shared ranked picks
- Shared #1 picks
- Shared categories
- Shared topics
- Shared highlights
- Comparison screen
- Recommendation ranking

## Used By

- Feed recommendations
- Public profiles
- Taste Match screen

---

# Recommendations

## Purpose

Introduce users with similar tastes.

## Eligibility Rules

A recommendation:

- Must be public
- Cannot be yourself
- Cannot already be followed
- Must share at least one ranked item

## Ordering

Recommendations prioritize:

1. Highest Taste Match
2. Most shared picks
3. Most shared collections
4. Shared #1 picks
5. Alphabetical fallback

---

# Discovery

## Purpose

Help users explore people and interests beyond their network.

## Current Features

- Category browsing
- Topic browsing
- Published collections

## Planned

- Trending
- Popular
- Suggested users
- Search improvements

---

# Likes

## Purpose

Provide lightweight appreciation.

## Features

- Like Top3
- Like count

---

# Comments

## Purpose

Encourage conversation around Top3s.

## Features

- Comment sheet
- View comments
- Add comments

---

# Search

## Purpose

Help users build collections efficiently.

## Current Features

- Search while creating Top3s

## Future

- Search users
- Search collections
- Search items
- Global discovery

---

# Reusable Components

## Top3Card

Displays every published Top3.

Used throughout the application.

Used In

- Feed
- Profiles
- Recommendations
- Category Feed

---

## FollowButton

Standard follow interaction.

States

- Follow
- Following

Used In

- Recommendation cards
- Public profiles
- Taste Match

---

## TasteMatchBadge

Displays compatibility.

Used In

- Feed
- Profiles
- Taste Match

---

## PrimaryButton

Standard primary action.

---

## ScreenHeader

Standard navigation header.

---

## CommentsSheet

Reusable comments interface.

---

# Context Providers

## ProfileContext

Responsible For

- Current profile
- Bio
- Avatar
- Visibility

---

## FollowContext

Responsible For

- Following
- Followers
- Follow state

---

## Top3Context

Responsible For

- Collections
- Publishing
- Editing
- Feed data

---

# Core Services

## TasteRecommendationService

Responsible For

- Taste Match
- Recommendation eligibility
- Recommendation ordering

---

## PostService

Responsible For

- Feed hydration
- Mock users
- Published posts

---

# User Flow

## New User

```
Create Profile

↓

Publish Top3

↓

View Feed

↓

Discover Similar People

↓

Follow

↓

Compare Taste

↓

Comment

↓

Return
```

---

## Existing User

```
Open App

↓

View Feed

↓

Discover Recommendations

↓

Open Profile

↓

Taste Match

↓

Follow

↓

Browse More Top3s

↓

Return
```

---

# Product Relationships

```
Profile
      │
      │
      ▼
Published Top3
      │
      ▼
Taste Match
      │
      ▼
Recommendations
      │
      ▼
Following
      │
      ▼
Personalized Feed
```

Everything ultimately contributes toward improving discovery.

---

# Architectural Principles

Every feature should:

- Support discovery.
- Encourage connection.
- Build upon reusable systems.
- Avoid duplicate functionality.
- Prefer extension over replacement.

Before creating a new feature ask:

> Can an existing system be extended instead?

---

# Current Strengths

The strongest parts of Top3 today are:

- Publishing
- Feed
- Public Profiles
- Following
- Taste Match
- Recommendation engine

These systems should be considered stable foundations.

---

# Current Growth Areas

The next major areas of investment are:

- Discover
- Search
- Notifications
- Conversation
- Community

These systems should build upon the existing architecture rather than introducing parallel experiences.

---

# Document Maintenance

Whenever a significant feature is added or modified:

- Update the relevant product system.
- Update product maturity.
- Add new reusable components.
- Document new services or contexts.
- Record significant architectural decisions in `DECISIONS.md`.

This document should always represent the current state of the product.