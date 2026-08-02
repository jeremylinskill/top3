Top3 Product Roadmap

Version: 1.3Status: Active DevelopmentOwner: Jeremy LinskillLast Updated: July 31, 2026

Purpose

This roadmap outlines the long-term evolution of the Top3 product experience.

Unlike CURRENT_STATE.md, which documents the application's current implementation, this roadmap focuses on the future direction of the product and the experiences we want to create for users.

Every initiative should strengthen one or more of Top3's four core pillars.

Product Vision

Help people discover one another through shared taste.

Top3 isn't simply a place to rank favourites. It's a platform that helps people express who they are, discover new entertainment, and connect with others through the things they love.

Every product decision should reinforce one or more of these pillars:

Identity — Express who you are through your collections.

Discovery — Find new entertainment, ideas, and people.

Connection — Build meaningful relationships through shared taste.

Conversation — Encourage discussion rather than passive consumption.

Current Milestone

Shared Community Foundation

Status: In Progress

Top3 now has a production-ready authentication system and a solid backend foundation. The current milestone is completing the transition from prototype community features to fully shared experiences.

Completed

Email authentication

Native Sign in with Apple

Native Sign in with Google

Persistent Supabase sessions

User profiles

Collection persistence

Shared Likes

Shared Comments

Feed authentication guard

Remaining

Shared Following

Replace remaining mock community users

Realtime synchronization

Community notifications

Initiative 1 — Complete the Community

Status: Current Focus

Deliver a fully shared social experience backed by real users.

Near-Term Priorities

Migrate Following to Supabase.

Replace remaining mock community users.

Add Supabase Realtime for Likes, Comments, and Following.

Improve profile discovery.

Expand conversation tools.

Introduce notifications where they genuinely improve the experience.

Success looks like:

Every meaningful social interaction is shared, persistent, and updates naturally across all users.

Initiative 2 — Smarter Discovery

Status: Planned

Use community collections to improve entertainment discovery.

Opportunities

Better recommendations.

AI-assisted recommendation explanations.

Personalized discovery summaries.

Trending creators.

Trending collections.

Better topic exploration.

Improved Taste Match.

Recommendation refinement.

Spotify integration and music categories.

Additional entertainment data providers.

Guiding Principle

Artificial intelligence should enhance human discovery—not replace it.

Initiative 3 — Richer Identity

Status: Planned

Help people express themselves more completely.

Opportunities

Profile customization.

Collection history.

Featured collections.

Pinned collections.

Personal milestones.

User achievements.

Collection sharing.

Initiative 4 — Platform Growth

Status: Future

Expand Top3 into a mature community platform.

Opportunities

Activity feed.

Collaborative collections.

Friend invitations.

Creator features.

Moderation tools.

Admin dashboard.

Analytics.

Platform operations.

Product Principles

Every future feature should support one or more of these goals.

Make publishing effortless.

Help users discover something unexpected.

Encourage authentic conversation.

Reward thoughtful curation over volume.

Build community through shared interests.

Keep the experience simple.

Prioritize quality over feature quantity.

Maintain a content-first design philosophy.

Use AI to strengthen human discovery, not replace it.

If a proposed feature does not strengthen one or more of these principles, it should be reconsidered before development begins.

Technical Strategy

The product should continue evolving through small, complete vertical slices.

For every major initiative:

Discuss the architecture.

Build one complete vertical slice.

Validate with npm run typecheck.

Validate with npm run lint.

Test end-to-end.

Commit.

Push.

Update project documentation.

Selecting the Next Milestone

After each completed milestone:

Review CURRENT_STATE.md.

Review this roadmap.

Identify the most important product problem to solve next.

Discuss the architecture before implementation.

Complete one vertical slice.

Update all project documentation.

Success Metrics

Top3 succeeds when users:

Publish collections regularly.

Discover entertainment they genuinely enjoy.

Find people with similar taste.

Return to continue conversations.

Build lasting collections that reflect who they are.

The long-term goal is not to maximize content creation, but to create meaningful connections through shared taste.