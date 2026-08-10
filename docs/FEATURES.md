# Top3 Feature Inventory

Version: 1.0
Status: Active Development
Owner: Jeremy Linskill
Last Updated: August 5, 2026

---

# Purpose

This document serves as the complete inventory of user-facing functionality within Top3.

Unlike CURRENT_STATE.md, which documents the application's architecture, and ROADMAP.md, which describes future direction, FEATURES.md documents what users can do today.

This document should always reflect the current product experience.

---

# Product Summary

Top3 is a social platform built around ranked collections.

Users express themselves through curated Top 3 collections, discover people with similar taste, and build connections through shared interests.

The application currently supports:

• Authentication
• Profiles
• Collection creation
• Publishing
• Discovery
• Search
• Taste Match
• Following
• Likes
• Comments
• Notifications
• Realtime synchronization

---

# Feature Status

| Feature | Status |
|----------|--------|
| Authentication | ✅ Production Ready |
| User Profiles | ✅ Production Ready |
| Collections | ✅ Production Ready |
| Publishing | ✅ Production Ready |
| Feed | ✅ Production Ready |
| Discover | ✅ Production Ready |
| Search | ✅ Production Ready |
| Taste Match | ✅ Production Ready |
| Following | ✅ Production Ready |
| Likes | ✅ Production Ready |
| Comments | ✅ Production Ready |
| Notifications | ✅ Production Ready |
| Realtime | ✅ Production Ready |
| Push Notifications | 🚧 Planned |
| AI Recommendations | 💡 Future |

---

# Application Navigation

Bottom Navigation

• Feed
• Discover
• Create
• Notifications
• Profile

---

# Feed

## Purpose

The Feed helps users discover recently published collections from the community while providing opportunities to interact with them.

## Current Capabilities

### Browse

• View published collections
• Infinite scrolling
• Author information
• Ranked items
• Artwork
• Ratings

### Social

• Like collections
• Unlike collections
• Comment
• View comment count
• View like count

### Navigation

• Open collection
• Open public profile
• Edit own collection

### Realtime

✅ Likes

✅ Comments

---

# Discover

## Purpose

Help users discover people and entertainment through shared taste.

## People

• Similar Taste
• Taste Match percentage
• Shared picks
• Follow users
• Open profiles

## Trending

• Trending Topics
• Trending Categories
• Category counts

## Search

• Search users

## Navigation

• Public Profile
• Category pages

## Realtime

N/A

---

# Create

## Purpose

Create and publish Top 3 collections.

## Capabilities

• Choose category
• Topic support
• Search providers
• Rank items
• Save draft
• Edit draft
• Publish
• Edit published collection

---

# Notifications

## Purpose

Surface important social activity.

## Notification Types

• Likes
• Comments
• New followers

## User Actions

• View notifications
• Mark read
• Open collection
• Open profile

## Realtime

✅ Live updates

---

# Profile

## Purpose

Manage personal identity.

## Capabilities

• Edit profile
• Update avatar
• View collections
• View followers
• View following
• Open published collections

---

# Public Profile

## Purpose

View another user's profile.

## Capabilities

• Follow / Unfollow
• Taste Match
• Browse collections
• View profile details

---

# Published Collection

## Purpose

Display an individual published collection.

## Capabilities

• Like
• Comment
• View creator
• View ranked items

---

# Search

## Current Capabilities

### Users

• Search by username
• Search by display name

### Collection Creation

Movies

• TMDb

TV

• TMDb

Books

• Google Books

Games

• RAWG

---

# Social Features

## Following

• Follow users
• Unfollow users
• View follower count
• View following count

## Likes

• Like
• Unlike
• Live updates

## Comments

• Add comment
• Delete own comment
• Live updates

## Notifications

• Like notifications
• Comment notifications
• Follow notifications
• Read state
• Live updates

---

# Realtime

Implemented

✅ Likes

✅ Comments

✅ Following

✅ Notifications

---

# External Providers

| Provider | Purpose |
|-----------|----------|
| Supabase | Authentication |
| Supabase | Database |
| Supabase | Storage |
| Supabase | Realtime |
| TMDb | Movies |
| TMDb | TV Shows |
| Google Books | Books |
| RAWG | Games |

---

# Product Principles

Every feature should reinforce one or more of these principles.

• Help people express themselves.

• Help people discover others.

• Encourage conversation.

• Reward thoughtful curation.

• Keep the interface simple.

• Maintain a content-first experience.

---

# Future Opportunities

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

---

# Revision History

Version 1.0

Initial feature inventory.