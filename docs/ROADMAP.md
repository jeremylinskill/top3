Top3 Product Roadmap

Version: 2.5Status: Active DevelopmentOwner: Jeremy LinskillLast
Updated: August 24, 2026Last Verified Commit: f8c62c3 --- Ignore local privacy
audit artifacts

Purpose

This roadmap outlines the long-term evolution of the Top3 product
experience.

Unlike CURRENT_STATE.md, which documents the application's current
implementation, this roadmap focuses on the future direction of the
product and the experiences we want to create for users.

Every initiative should strengthen one or more of Top3's four core
pillars.

Product Vision

Help people discover one another through shared taste.

Top3 isn't simply a place to rank favourites. It's a platform that helps
people express who they are, discover new entertainment, and connect
with others through the things they love.

Core Pillars

Identity --- Express who you are through your lists.

Discovery --- Find new entertainment, ideas, and people.

Connection --- Build meaningful relationships through shared taste.

Conversation --- Encourage discussion rather than passive consumption.

Current Milestone

V1 Launch Readiness

Status: Current Focus 🚧

Top3's core community platform is now in place.

Authentication, profiles, list persistence, social interactions, private
accounts, follow requests, notifications, realtime synchronization,
Settings, search providers, Feed, Discover, Taste Match, Apple Music
previews, Movie / TV trailer playback, and the redesigned first-list
onboarding and account lifecycle, including email password recovery,
provide a stable foundation for the next stage of the product.

Recent work has also completed important moderation-removal foundations,
published-list and Overall ranking sharing, deep-link access to shared public
content, the current V1 product-analytics instrumentation, and the Sign in
with Apple account-lifecycle path required for reliable account deletion.
Apple authorization codes are exchanged server-side for refresh tokens, and
Apple authorization is revoked before an Apple-authenticated Top3 account is
deleted. The architectural changes required for Top3's Feed to scale well
beyond the initial launch population have also been identified.

The current milestone is to prepare a stable, safe, polished V1 for App
Store release and begin gathering real-user behaviour before investing
in larger post-launch architecture migrations or speculative
recommendation work.

Discovery & Personalization remains a core product direction, but
additional large-scale Feed and recommendation infrastructure is
deliberately deferred until after V1 launch unless it becomes necessary
for launch reliability.

Foundation Completed

• Signed-out first-list onboarding• Lists → Overall onboarding
education• Taste Match onboarding education• Account deletion• Email
confirmation callback and pending-list publishing• Email authentication•
Forgot-password and password-reset recovery• Sign in with Apple• Server-side
Apple authorization-code exchange and protected refresh-token storage• Apple
authorization revocation before account deletion• Sign in with Google• Persistent Supabase sessions• Stable authentication
initialization• User profiles• Profile avatars• Profile editing• Privacy
settings• Public and private accounts• Follow requests• Following /
Followers• List persistence• Shared Likes• Shared Comments• In-app
notifications• Settings• About• Supabase Realtime for Notifications,
Likes, Comments, and Following• Feed• Discover• Community Top3• Overall
Top3• Taste Match• Personalized Feed recommendations• Taste Match
recommendation explanations• Shared search-provider architecture• TMDb
search for Movies and TV Shows• TMDb Movie / TV trailer playback inside
Top3• Availability-aware Movie / TV trailer controls• Google Books
search with Open Library fallback• IGDB search for Video Games through a
Supabase Edge Function• Apple Music search for Songs, Albums, and
Artists through a Supabase Edge Function• Apple Music audio previews for
Songs, Albums, and Artists• Genre-aware and evergreen Apple Music
suggestions• Feed pull-to-refresh• Reported-list and reported-comment
moderation workflow• Moderator Remove Content action• Removed-content
filtering through removed_at• Creator-scoped moderation removal Realtime
propagation• collections_published_feed_idx for the future published
Feed path• Published List sharing from Feed, Profile, Category Feed, and
Published Top 3• Overall ranking sharing• Deep-link routing to published
Lists and Overall rankings• Logged-out read access to shared published,
non-removed collections• V1 Amplitude product analytics• Successful-share
tracking with source attribution

Current Priorities

• Complete a V1 launch-readiness audit• Fix App Store launch blockers
before adding major new product scope• Continue validating onboarding
completion and authentication reliability• Treat the verified Sign in with
Apple revocation path as the production account-deletion foundation• Verify
remaining reporting, moderation, blocking, privacy, security, and
account-deletion requirements• Continue performance and stability optimization where it
affects launch quality• Preserve the current Feed and Taste Match
experience for initial real-user validation• Defer cursor-paginated Feed
migration, server-side recommendation candidate generation, and other
large-scale Feed infrastructure until post-launch• Continue
search-quality and provider-resiliency improvements when they affect
launch reliability• Prepare architecture for push notifications without
making push a V1 launch dependency unless product requirements change

V1 Launch Readiness

Status: Current Focus

Goal

Release a stable, safe, polished version of Top3 through the App Store
so the product can begin gathering real-user behaviour and validate
which discovery, social, and recommendation experiences deserve the next
investments.

Before Launch

• Complete an App Store readiness audit• Resolve crash, data-loss,
security, privacy, authentication, account-lifecycle, and moderation
blockers• Verify user-generated-content safety requirements, including
reporting, moderation, and blocking• Preserve the verified Apple authorization
revocation path and complete final account-deletion regression testing for the
release candidate•
Verify core onboarding, Create, publish, Feed, Profile, Discover,
Search, Likes, Comments, Following, notifications, Taste Match, and
media-preview flows on device• Confirm production configuration and
provider credentials• Review App Store metadata, privacy disclosures,
permissions, and required support / policy surfaces• Perform final
performance and reliability testing• Update project documentation to
match the release candidate

Launch Decision --- Feed Scalability

Top3 will intentionally launch V1 with the existing client-side Feed
architecture so the product can gather real usage data before a larger
Feed rewrite.

The current implementation retrieves the complete published-post
dataset, hydrates posts client-side where required, and constructs
followed-user and Taste Match personalization on the client. This is
acceptable for initial low-volume launch but is not the intended
architecture for a very large community.

The post-launch target is a cursor-paginated, server-generated Feed that
returns small pages of ready-to-render entries. Follow relationships and
recommendation candidate selection should increasingly be handled
server-side / database-side.

Taste Match ranking behaviour should be preserved, but candidate
generation must become bounded at scale rather than comparing against an
unbounded global post/user dataset.

The partial Postgres index collections_published_feed_idx has already
been added for published, non-removed collections using published_at
DESC, user_id, and id to support the future paginated Feed path.

This work is deliberately deferred until after V1 launch. It is a
conscious product and architecture decision, not forgotten technical
debt.

Success Looks Like

Top3 reaches real users with the existing core experience stable and
safe, without delaying launch for scale infrastructure that is not yet
required.

Real usage informs the next discovery, recommendation, retention, and
scalability priorities.

Initiative 1 --- Strengthen Discovery

Status: Active / Post-Launch Continuation

Improve the discovery experiences that already exist so users
consistently encounter relevant people, lists, and entertainment without
needing to search for them directly.

Completed Foundations

• Personalized Feed recommendations• Taste Match recommendation
explanations• Navigation from Feed recommendations into Taste Match•
Community Top3• Overall Top3• Similar Taste discovery• Trending topics
and categories• Shared search-provider architecture• Improved Google
Books relevance and edition deduplication• Curated Books suggestions•
IGDB Video Games integration• Apple Music integration for Songs, Albums,
and Artists• Evergreen Apple Music suggestion pools• Artist
canonical-result ranking and deduplication• Album and Artist
representative-track previews• TMDb Movie and TV trailer playback inside
Top3• Availability-aware Movie / TV trailer controls• Improved
partial-title and relevance-ranked game search• Feed pull-to-refresh

Near-Term Priorities

• Improve Feed relevance and ranking• Improve recommendation quality
signals• Expand Discover browsing and filtering• Improve profile
discovery• Refine recommendation explanations where useful• Continue
improving search relevance across providers• Gracefully handle external
API failures across TMDb, Google Books, Open Library, IGDB, and Apple
Music• Continue improving trailer resiliency without introducing
unnecessary location permissions• Expand conversation tools around
discovered content• Continue performance optimization• Prepare
architecture for push notifications

Success Looks Like

Users consistently discover interesting people, lists, and entertainment
without needing to search for them directly.

Recommendations feel relevant and understandable rather than arbitrary.

Discovery leads naturally into profiles, Taste Match, lists, follows,
and conversations.

Initiative 2 --- Smarter Discovery

Status: Planned

Build more advanced intelligence on top of the existing discovery
foundation.

The goal is not simply to generate more recommendations. It is to use
community taste, list behaviour, and meaningful signals to make
discovery increasingly useful and personal.

Opportunities

• Community-derived recommendation signals• Trending lists• Trending
creators• Richer Taste Match analysis• More sophisticated personalized
recommendations• AI-assisted recommendation explanations• Better topic
exploration• Recommendation quality feedback signals• Cross-category
taste insights• Spotify integration• Additional entertainment providers

Guiding Principle

AI should strengthen human discovery---not replace it.

Recommendation intelligence should help users understand connections
between people and content while keeping human taste and curation at the
centre of the experience.

Initiative 3 --- Richer Identity

Status: Planned

Help people express themselves more completely through their profile and
lists.

Top3 lists already create a strong taste identity. Future identity
features should make that identity easier to understand and share
without turning profiles into overly complex social-media pages.

Opportunities

• Profile customization• Featured lists• Pinned lists• List history•
Richer sharing / web presentation• User achievements• Activity summaries• Taste summaries

Success Looks Like

A user's profile quickly communicates what they care about, what they
recommend, and how their taste connects with the wider community.

Initiative 4 --- Conversation & Engagement

Status: Planned

Build on Likes, Comments, Following, Notifications, and recommendations
to encourage meaningful interaction around shared interests.

Opportunities

• Richer comment experiences• Conversation prompts around shared picks•
Recommendation-driven discussion• Improved social activity context• Friend
invitations• Push notifications• Re-engagement experiences

Guiding Principle

Top3 should encourage conversation because users discovered something
meaningful in common---not because the product is optimizing for passive
engagement.

Initiative 5 --- Platform Growth

Status: Future

Expand Top3 into a mature, scalable community platform after the core
discovery, identity, and conversation experiences are strong.

Opportunities

• Broader activity experiences• Collaborative lists• Creator tools•
Expanded moderation and safety tooling beyond the V1 reporting / removal
foundation• Admin dashboard enhancements• Community
events• Additional content categories• Additional entertainment
providers• Large-scale Feed and recommendation infrastructure as usage
requires

Authentication & Account Lifecycle

Status: V1 Foundation Complete

Top3 supports Email, native Sign in with Apple, and native Google Sign-In
through the shared Supabase authentication architecture.

For Sign in with Apple, the authorization code returned by the native Apple
credential is sent to the authenticated apple-auth-token Supabase Edge
Function. The function generates Apple's client secret server-side, exchanges
the authorization code for a refresh token, and stores that refresh token in
the protected apple_auth_tokens table keyed by Supabase user ID.

Apple Team ID, Key ID, Client ID, and private signing key remain server-side
as Supabase Edge Function secrets.

The permanent delete-account Edge Function checks for a stored Apple refresh
token and revokes the user's Apple authorization before deleting the Supabase
Auth user. If Apple revocation fails, account deletion stops rather than
leaving an active Apple authorization behind.

The Apple refresh-token acquisition, persistence, and revocation paths have
been verified end-to-end. Temporary revocation-test infrastructure was removed
after validation, and the test admin account was re-authorized successfully.

Launch Direction

• Preserve the current server-side Apple token architecture• Do not expose
Apple signing credentials or refresh tokens to the mobile client• Include
account deletion in final release-candidate regression testing• Re-check
App Store account-deletion and Sign in with Apple requirements if Apple's
review guidance changes before submission

Sharing & Product Analytics

Status: V1 Foundation Complete

Top3 supports native sharing of individual published Lists and community
Overall rankings.

Published Lists can be shared from Feed, Profile, Category Feed, and the
Published Top 3 detail screen. Overall rankings can be shared directly from
Category Feed.

Shared links deep-link back to the appropriate Top3 destination. Public
published, non-removed collections can be read while signed out through
restricted Supabase anonymous access so a recipient with Top3 installed does
not need an account merely to view shared public content.

Amplitude provides the current V1 product-analytics foundation. The scoped
core events are implemented, including collection_shared. Share events are
recorded only after the native share action completes successfully and carry
source attribution for feed, profile, category_feed, published_detail, and
overall.

Future Sharing Work

Universal Links / HTTPS web fallback should be implemented once the
production Top3 domain is confirmed. This will allow recipients without the
app installed to receive a useful web destination instead of relying only on
the custom top3:// scheme.

Analytics should now be driven by real product questions and observed usage
rather than adding events speculatively before launch.

Push Notifications

Status: Planned

Top3 already has Supabase-backed in-app notifications with realtime
updates.

Push notifications should extend that system rather than introduce a
separate notification model.

Potential Notifications

• New follower• Follow request• Follow request accepted• Like• Comment•
Relevant social or recommendation activity where appropriate

Before Implementation

• Define which events genuinely deserve interruption• Establish
notification preferences• Review Expo / native push architecture•
Determine server-side delivery architecture• Preserve the existing
in-app notification system as the source of truth

Search & Provider Strategy

Status: Active Foundation

Search supports the list-creation and discovery experience across
multiple external content providers.

Current Providers

• TMDb --- Movies• TMDb --- TV Shows• Google Books --- Books• Open
Library --- Book fallback• IGDB --- Video Games• Twitch OAuth ---
Server-side IGDB authentication• Apple Music --- Songs, Albums, and
Artists

Current Direction

• Keep application-level search behaviour consistent• Keep
provider-specific ranking and fallback logic inside each provider•
Continue improving relevance rather than maximizing raw result volume•
Prefer useful, recognizable suggestions over generic provider results•
Prefer evergreen, long-term recognizable music suggestions over
short-term chart popularity where appropriate• Use canonical provider
results to improve exact artist matching, ranking, artwork, genre
metadata, and deduplication• Enrich music results with representative
preview audio where the provider supports it• Preserve distinct works
while intelligently deduplicating editions or duplicate records•
Gracefully handle provider outages and degraded responses• Avoid
exposing provider secrets to the mobile client• Keep Movie / TV trailer
discovery inside the TMDb provider• Reuse cached trailer availability
instead of repeatedly querying TMDb• Hide Movie / TV play buttons when
TMDb has no usable trailer• Treat regional YouTube restrictions as a
future resiliency enhancement unless Top3 gains a reliable country /
region source

Trailer Resiliency

Status: Future Enhancement

Top3 currently validates whether TMDb provides a usable YouTube trailer
before showing a Movie / TV play button.

This prevents most dead trailer controls caused by missing TMDb video
data.

A remaining limitation is that YouTube can still block a trailer for a
specific country or region.

Top3 does not currently request device location, store user country /
region, or otherwise maintain a reliable location source.

Do not add location permission solely for trailer playback.

If Top3 later introduces an appropriate country / region source for
broader product reasons, consider validating YouTube regional
availability and embeddability before marking a trailer as available.

Product Principles

Every future feature should:

• Make publishing effortless.

• Help users discover something unexpected.

• Help users understand why something is being recommended.

• Encourage authentic conversation.

• Reward thoughtful curation over volume.

• Build community through shared interests.

• Keep the experience simple.

• Maintain a content-first design philosophy.

• Use AI to strengthen human discovery---not replace it.

• Prioritize quality and reliability before adding new features.

• Design data access, Realtime subscriptions, and client computation
with a very large user base in mind; flag unbounded global reads or
fan-out before extending them.

• Extend existing product patterns before creating parallel systems.

Technical Strategy

Continue evolving through small, complete vertical slices.

For every milestone:

Discuss architecture.

Build one complete vertical slice.

Modify as few files as practical.

Run npm run typecheck.

Run function-specific validation where required.

Test end-to-end on device.

Commit.

Push.

Update project documentation when the application state has materially
changed.

New infrastructure should extend existing architecture wherever
practical rather than creating duplicate systems.

Scalability is a standing architecture requirement. New work should
avoid unbounded client-side global reads, client-side processing of
global datasets, global Realtime fan-out, and repeated view-time
external-provider hydration when those patterns would become material as
Top3 grows.

Do not prematurely rebuild working V1 systems solely for hypothetical
scale. Document known scale limits, create the supporting database
foundations where low-risk, and schedule larger migrations before usage
reaches those limits.

Post-Launch Scalability Priority

• Replace complete published-post retrieval with cursor-paginated,
server-generated Feed pages• Move followed-user Feed selection into
server/database queries• Bound Taste Match recommendation candidate
generation server-side• Evaluate incremental / precomputed taste
relationships as usage grows• Persist render-ready item artwork /
metadata where practical so Feed rendering does not depend on large
volumes of view-time provider hydration• Use targeted rather than global
Realtime propagation for moderation and other high-volume events

Selecting the Next Milestone

After each completed milestone:

Review CURRENT_STATE.md.

Review FEATURES.md.

Review ROADMAP.md.

Identify the highest-value product problem.

Confirm the architectural direction before implementation.

Implement one complete vertical slice.

Stabilize and verify.

Update CURRENT_STATE.md, CHANGELOG.md, FEATURES.md, and ROADMAP.md where
appropriate.

The roadmap should guide priorities without forcing implementation
simply because an idea appears here.

Success Metrics

Top3 succeeds when users:

• Publish lists regularly.

• Discover entertainment they genuinely enjoy.

• Find people with similar taste.

• Understand why recommendations are relevant to them.

• Build trusted communities.

• Return to continue conversations.

• Build lasting lists that reflect who they are.

• Share Lists and Overall rankings when they are useful to others.

The long-term goal is not to maximize content creation or passive
engagement, but to create meaningful connections through shared taste.

Revision History

Version 2.5 --- August 24, 2026

Updated the roadmap to reflect completion and end-to-end verification of the
Sign in with Apple account-lifecycle architecture required for reliable
account deletion.

Key changes:

• Recorded server-side Apple authorization-code exchange through the
apple-auth-token Edge Function.• Recorded protected Apple refresh-token
storage keyed by Supabase user ID.• Recorded Apple authorization revocation
before permanent deletion of Apple-authenticated Top3 accounts.• Recorded the
fail-safe that stops account deletion when Apple revocation fails.• Recorded
Apple signing credentials as server-side Supabase Edge Function secrets.•
Recorded successful end-to-end refresh-token acquisition, persistence, and
revocation verification.• Recorded removal of the temporary revocation-test
infrastructure after verification.• Updated the last verified repository
checkpoint to f8c62c3.• Preserved V1 Launch Readiness as the current product
milestone.

Version 2.4 --- August 22, 2026

Updated the roadmap to reflect completion of the current sharing, deep-link,
signed-out public-viewing, and V1 analytics milestone.

Key changes:

• Recorded native sharing for published Lists across Feed, Profile, Category
Feed, and Published Top 3.• Recorded direct sharing of Overall rankings.•
Recorded deep-link routing for published Lists and Overall rankings.•
Recorded restricted anonymous read access for published, non-removed
collections so shared public content can be viewed while signed out.•
Recorded the current V1 Amplitude analytics scope as complete.•
Recorded collection_shared as a successful-share event with source
attribution for feed, profile, category_feed, published_detail, and overall.•
Removed basic List sharing and Product analytics from future-opportunity
lists because their V1 foundations now exist.• Deferred Universal Links /
HTTPS web fallback until the production Top3 domain is confirmed.

Version 2.3 --- August 20, 2026

Shifted the active milestone from Discovery & Personalization to V1
Launch Readiness and documented the deliberate post-launch Feed
scalability direction.

Key changes:

• Established App Store / V1 launch readiness as the immediate product
priority.• Recorded reported-list and reported-comment moderation,
moderator content removal, removed_at filtering, and creator-scoped
Realtime removal propagation as completed foundations.• Documented that
the current V1 Feed retrieves the complete published-post dataset and
performs personalization / Taste Match selection client-side.•
Explicitly accepted the current Feed architecture for initial low-volume
launch and real-user validation.• Established cursor-paginated,
server-generated Feed delivery and bounded server-side Taste Match
candidate generation as high-priority post-launch scalability work.•
Recorded collections_published_feed_idx as an existing database
foundation for that future Feed path.• Added scalability as a standing
architecture requirement while explicitly avoiding premature pre-launch
infrastructure rewrites.

Version 2.2 --- August 17, 2026

Updated the roadmap to reflect the completed email password-recovery
flow through commit db8b367.

Key changes:

• Recorded Forgot Password and Reset Password as completed
authentication foundations.• Recorded Supabase password-reset email
delivery and recovery deep-link handling as complete.• Recorded the Open
Email App handoff as part of the recovery experience.• Preserved
Discovery & Personalization as the active product milestone rather than
creating a separate authentication initiative.

Version 2.1 --- August 17, 2026

Updated the roadmap to reflect the completed onboarding and account-flow
milestone through commit 85d2794.

Key changes:

• Recorded signed-out first-list creation as a completed foundation.•
Recorded email confirmation callback and pending-list publishing as
completed.• Recorded Lists → Overall and Taste Match onboarding
education as completed.• Recorded account deletion and local onboarding
reset as completed.• Standardized "Lists" as the preferred user-facing
product term in current and future roadmap language while preserving
historical revision entries.• Preserved Discovery & Personalization as
the active product milestone.

Version 2.0 --- August 12, 2026

Updated the roadmap to reflect the completed Movie / TV trailer rollout.

Key changes:

• Recorded TMDb Movie and TV trailer playback inside Top3 as a completed
discovery foundation.• Recorded availability-aware trailer controls and
shared in-memory trailer caching.• Added trailer resiliency as an active
provider-quality consideration.• Recorded country / region restrictions
as a known limitation rather than an incomplete core feature.•
Explicitly deferred location-aware YouTube validation because Top3 does
not currently maintain a reliable country / region source.• Added Apple
Music to the Current Providers list.• Preserved Discovery &
Personalization as the active product milestone.

Version 1.9 --- August 11, 2026

Updated the roadmap to reflect the completed Apple Music expansion and
refinement work.

Key changes:

• Recorded Apple Music as the active provider for Songs, Albums, and
Artists.• Recorded representative preview playback for Album and Artist
results in addition to Song previews.• Recorded evergreen suggestion
logic for Songs, Albums, and Artists.• Recorded canonical Apple Music
artist-result enrichment, ranking, and deduplication.• Added Apple Music
search, suggestion, ranking, preview, and metadata quality as an ongoing
discovery refinement priority.• Updated Search & Provider Strategy to
prefer recognizable evergreen music discovery over short-term popularity
where appropriate.• Preserved Discovery & Personalization as the active
product milestone rather than creating a separate music milestone.

Version 1.8 --- August 10, 2026

Updated the roadmap through commit f833160.

Key changes:

• Moved the active milestone from Shared Community Platform to Discovery
& Personalization.• Recorded the shared community platform as a
completed foundation.• Removed completion of the follow-request workflow
from future priorities.• Recognized personalized Feed recommendations
and Taste Match explanations as implemented foundations.• Updated Video
Games provider strategy from RAWG to IGDB.• Updated search priorities to
reflect the shared provider architecture and recent Books and Games
improvements.• Clarified the distinction between strengthening current
discovery and future smarter discovery.• Added Conversation & Engagement
as a distinct planned initiative.• Clarified push notifications as an
extension of the existing in-app notification architecture.• Added the
current Search & Provider Strategy.• Updated milestone-selection and
documentation workflow.

Version 1.7 --- August 6, 2026

Established Shared Community Platform as the completed core-platform
milestone and shifted the roadmap toward discovery, engagement,
retention, and future platform growth.