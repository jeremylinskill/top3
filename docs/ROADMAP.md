Top3 Product Roadmap

Version: 1.7Status: Active DevelopmentOwner: Jeremy LinskillLast Updated: August 6, 2026

Purpose

This roadmap outlines the long-term evolution of the Top3 productexperience.

Unlike CURRENT_STATE.md, which documents the application's currentimplementation, this roadmap focuses on the future direction of theproduct and the experiences we want to create for users.

Every initiative should strengthen one or more of Top3's four corepillars.

Product Vision

Help people discover one another through shared taste.

Top3 isn't simply a place to rank favourites. It's a platform that helpspeople express who they are, discover new entertainment, and connectwith others through the things they love.

Core Pillars

Identity --- Express who you are through your collections.

Discovery --- Find new entertainment, ideas, and people.

Connection --- Build meaningful relationships through sharedtaste.

Conversation --- Encourage discussion rather than passiveconsumption.

Current Milestone

Shared Community Platform

Status: Core Platform Complete ✅

Top3 now has a stable social foundation built on Supabase.Authentication, persistence, realtime synchronization, private accounts,follow requests, notifications, and the new Settings experience are inplace. The next phase shifts toward improving discovery, engagement, andlong-term retention.

Completed

Email authentication

Sign in with Apple

Sign in with Google

Persistent Supabase sessions

Stable authentication initialization

User profiles

Profile editing

Privacy settings

Public & private accounts

Follow requests

Following / Followers

Collection persistence

Shared Likes

Shared Comments

In-app notifications

Settings

About

Supabase Realtime (Notifications, Likes, Comments, Following)

Next Focus

Complete the follow request workflow

Improve feed ranking and personalization

Expand Discover experiences

Improve profile discovery

Prepare push notifications

Improve search reliability and provider resiliency

Initiative 1 --- Strengthen Discovery

Status: Current Focus

Build richer discovery experiences on top of the completed socialplatform.

Near-Term Priorities

Improve feed relevance and ranking

Expand Discover browsing and filtering

Improve profile discovery

Expand conversation tools

Continue performance optimization

Gracefully handle external API failures (TMDB, Google Books, RAWG)

Prepare architecture for push notifications

Success Looks Like

Users consistently discover interesting people, collections, andentertainment without needing to search for them directly.

Initiative 2 --- Smarter Discovery

Status: Planned

Use community collections to make discovering entertainment effortless.

Opportunities

Trending collections

Trending creators

Enhanced Taste Match

AI-assisted recommendation explanations

Personalized recommendations

Better topic exploration

Spotify integration

Additional entertainment providers

Recommendation quality signals

Guiding Principle

AI should strengthen human discovery---not replace it.

Initiative 3 --- Richer Identity

Status: Planned

Help people express themselves more completely.

Opportunities

Profile customization

Featured collections

Pinned collections

Collection history

Collection sharing

User achievements

Activity summaries

Initiative 4 --- Platform Growth

Status: Future

Expand Top3 into a mature community platform.

Opportunities

Activity feed

Collaborative collections

Friend invitations

Push notifications

Creator tools

Moderation

Admin dashboard

Analytics

Community events

Product Principles

Every future feature should:

Make publishing effortless.

Help users discover something unexpected.

Encourage authentic conversation.

Reward thoughtful curation over volume.

Build community through shared interests.

Keep the experience simple.

Maintain a content-first design philosophy.

Use AI to strengthen human discovery---not replace it.

Prioritize quality and reliability before adding new features.

Technical Strategy

Continue evolving through small, complete vertical slices.

For every milestone:

Discuss architecture.

Build one complete vertical slice.

Run npm run typecheck.

Test end-to-end on device.

Commit.

Update CURRENT_STATE.md, CHANGELOG.md, and ROADMAP.md.

Selecting the Next Milestone

After each completed milestone:

Review CURRENT_STATE.md.

Review ROADMAP.md.

Identify the highest-value product problem.

Implement one complete vertical slice.

Stabilize and verify.

Update project documentation.

Success Metrics

Top3 succeeds when users:

Publish collections regularly.

Discover entertainment they genuinely enjoy.

Find people with similar taste.

Build trusted communities.

Return to continue conversations.

Build lasting collections that reflect who they are.

The long-term goal is not to maximize content creation, but to createmeaningful connections through shared taste.