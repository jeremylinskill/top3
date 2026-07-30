# Top3 Product Roadmap

**Version:** 1.1  
**Status:** Active Development  
**Owner:** Jeremy Linskill  
**Last Updated:** July 30, 2026

---

# Purpose

This roadmap outlines the long-term evolution of the Top3 product experience.

Unlike `CURRENT_STATE.md`, which documents the application's current implementation, this roadmap focuses on the future direction of the product and the experiences we want to create for users.

Every initiative should strengthen one or more of Top3's four core pillars.

---

# Product Vision

Help people discover one another through shared taste.

Top3 isn't simply a place to rank favourites. It's a platform that helps people express who they are, discover new entertainment, and connect with others through the things they love.

Every product decision should reinforce one or more of these pillars:

- **Identity** — Express who you are through your collections.
- **Discovery** — Find new entertainment, ideas, and people.
- **Connection** — Build meaningful relationships through shared taste.
- **Conversation** — Encourage discussion rather than passive consumption.

---

# Current Milestone

## Real Community

**Status:** In Progress

Top3's social foundation is now complete.

Authentication, collections, profiles, likes, and comments are fully persisted in Supabase.

The focus now shifts toward replacing the remaining prototype community features with fully shared experiences.

### Completed

- Supabase Authentication
- User Profiles
- Collection Persistence
- Shared Likes
- Shared Comments

### Remaining

- Shared Following
- Replace mock community users
- Realtime synchronization
- Community notifications

---

# Initiative 1 — Complete the Community

**Status:** Current Focus

Deliver a fully shared social experience.

### Planned

- Migrate Following to Supabase.
- Replace mock community users with real users.
- Add Supabase Realtime for Likes, Comments and Following.
- Improve profile discovery.
- Expand conversation tools.
- Add notifications where they improve engagement.

**Success looks like:**

Every meaningful social interaction is shared across all users and updates without requiring manual refresh.

---

# Initiative 2 — Smarter Discovery

**Status:** Planned

Use community collections to improve entertainment discovery.

### Opportunities

- Better recommendations.
- AI-assisted recommendation explanations.
- Personalized discovery summaries.
- Trending creators.
- Trending collections.
- Better topic exploration.
- Improved Taste Match.
- Recommendation refinement.

**Guiding principle:**

Artificial intelligence should enhance human discovery—not replace it.

---

# Initiative 3 — Richer Identity

**Status:** Planned

Help people express themselves more completely.

### Opportunities

- Profile customization.
- Collection history.
- Featured collections.
- Pinned collections.
- Personal milestones.
- User achievements.
- Collection sharing.

---

# Initiative 4 — Platform Growth

**Status:** Future

Expand Top3 into a mature community platform.

### Opportunities

- Activity feed.
- Collaborative collections.
- Friend invitations.
- Creator features.
- Moderation tools.
- Admin dashboard.
- Analytics.
- Platform operations.

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

For every major initiative:

1. Discuss the architecture.
2. Build one complete vertical slice.
3. Validate with `npm run typecheck`.
4. Validate with `npm run lint`.
5. Test end-to-end.
6. Commit.
7. Push.
8. Update project documentation.

---

# Success Metrics

Top3 succeeds when users:

- Publish collections regularly.
- Discover entertainment they genuinely enjoy.
- Find people with similar taste.
- Return to continue conversations.
- Build lasting collections that reflect who they are.

The long-term goal is not to maximize content creation, but to create meaningful connections through shared taste.