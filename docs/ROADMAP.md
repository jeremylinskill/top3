# Top3 Product Roadmap

**Version:** 1.0  
**Status:** Active Development  
**Owner:** Jeremy Linskill  
**Last Updated:** July 30, 2026

---

# Purpose

This roadmap outlines the long-term evolution of the Top3 product experience.

Unlike `CURRENT_STATE.md`, which documents the application's current implementation, this roadmap focuses on the future of the product and the experiences we want to create for users.

Every roadmap item should strengthen one or more of Top3's four core pillars.

---

# Product Vision

Help people discover one another through shared taste.

Top3 isn't simply a place to rank favourites. It's a platform that helps people understand themselves, discover new entertainment, and connect with others through the things they love.

Every product decision should reinforce one or more of these pillars:

- **Identity** — Express who you are through your collections.
- **Discovery** — Find new entertainment, ideas, and people.
- **Connection** — Build meaningful relationships through shared taste.
- **Conversation** — Encourage discussion rather than passive consumption.

---

# Current Milestone

## Community Platform

**Status:** In Progress

Top3 has successfully transitioned from a prototype to a persistent application.

The current milestone focuses on completing the migration from local social features to fully shared, real-time community experiences.

### Completed

- Supabase Authentication
- User Profiles
- Collection Persistence
- Shared Likes

### In Progress

- Shared Comments

### Next

- Shared Following
- Supabase Realtime
- Community Notifications

---

# Phase 1 — Identity ✅

**Status:** Complete

Established the foundation for expressing personal taste.

### Completed

- User authentication
- User profiles
- Public profiles
- Profile privacy
- Collection creation
- Collection editing
- Draft collections
- Collection publishing
- Published collection viewing
- Personal profile experience

---

# Phase 2 — Discovery ✅

**Status:** Complete

Expanded the experience beyond personal collections into a discovery platform.

### Completed

- Personalized Feed
- Discover experience
- Category browsing
- Category feeds
- Trending collections
- Trending topics
- Community Top3
- Overall Top3
- Taste Match
- Recommendation engine
- Recommendation explanations
- External content search
- Published collection browsing

The application now helps users discover both entertainment and people through community-generated collections.

---

# Phase 3 — Community 🚧

**Status:** Current Focus

Build meaningful interaction between real users.

### Completed

- Shared likes
- Optimistic social interactions
- Database-backed community engagement

### Remaining

- Shared comments
- Shared follow relationships
- Realtime synchronization
- Community notifications
- Richer profile discovery
- Conversation improvements

Success for this phase is reached when every social interaction is shared across all users in real time.

---

# Phase 4 — Intelligence

**Status:** Planned

Leverage the growing collection graph to create increasingly personalized experiences.

### Opportunities

- AI-powered recommendations
- Weekly discovery summaries
- Taste evolution over time
- Similarity clusters
- Smart collection suggestions
- Personalized community insights
- Trend forecasting
- Better recommendation explanations

Artificial intelligence should enhance human discovery—not replace it.

---

# Phase 5 — Platform Growth

**Status:** Future

Expand Top3 into a mature social platform.

### Opportunities

- Push notifications
- Activity feed
- User achievements
- Featured creators
- Collection sharing
- Collaborative collections
- Friend invitations
- Collection history
- Moderation tools
- Admin dashboard

---

# Guiding Principles

Every future feature should support at least one of these goals.

- Make publishing effortless.
- Help users discover something unexpected.
- Encourage authentic conversation.
- Reward thoughtful curation over volume.
- Build community through shared interests.
- Keep the experience simple.
- Prioritize quality over feature quantity.
- Maintain a content-first design philosophy.

If a proposed feature doesn't strengthen one or more of these principles, it should be reconsidered before development begins.

---

# Technical Strategy

The product should continue evolving through small, complete vertical slices.

For every major feature:

1. Design the architecture.
2. Implement one complete vertical slice.
3. Validate with `npm run typecheck`.
4. Test end-to-end.
5. Commit.
6. Update project documentation.

This approach has consistently produced stable, incremental progress while minimizing regressions.

---

# Success Metrics

Top3 succeeds when users:

- Publish collections regularly.
- Discover entertainment they genuinely enjoy.
- Find people with similar taste.
- Return to continue conversations.
- Build lasting collections that reflect who they are.

The long-term goal is not to maximize content creation, but to create meaningful connections through shared taste.