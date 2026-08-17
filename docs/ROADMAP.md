Top3 Product Roadmap

Version: 2.1Status: Active DevelopmentOwner: Jeremy LinskillLast
Updated: August 17, 2026Last Verified Commit: 85d2794 --- Complete
onboarding and account flow

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

Discovery & Personalization

Status: Current Focus 🚧

Top3's core community platform is now in place.

Authentication, profiles, list persistence, social interactions, private
accounts, follow requests, notifications, realtime synchronization,
Settings, search providers, Feed, Discover, Taste Match, Apple Music
previews, Movie / TV trailer playback, and the redesigned first-list
onboarding and account lifecycle provide a stable foundation for the
next stage of the product.

Recent work has begun shifting Top3 from simply surfacing community
content toward making discovery more relevant to each user. Personalized
Feed recommendations can now use Taste Match and shared ranked picks to
explain why another user's list may be interesting.

The current milestone is to strengthen that discovery system before
expanding into more advanced recommendation intelligence or major new
platform features.

Foundation Completed

• Signed-out first-list onboarding• Lists → Overall onboarding
education• Taste Match onboarding education• Account deletion• Email
confirmation callback and pending-list publishing• Email authentication•
Sign in with Apple• Sign in with Google• Persistent Supabase sessions•
Stable authentication initialization• User profiles• Profile avatars•
Profile editing• Privacy settings• Public and private accounts• Follow
requests• Following / Followers• List persistence• Shared Likes• Shared
Comments• In-app notifications• Settings• About• Supabase Realtime for
Notifications, Likes, Comments, and Following• Feed• Discover• Community
Top3• Overall Top3• Taste Match• Personalized Feed recommendations•
Taste Match recommendation explanations• Shared search-provider
architecture• TMDb search for Movies and TV Shows• TMDb Movie / TV
trailer playback inside Top3• Availability-aware Movie / TV trailer
controls• Google Books search with Open Library fallback• IGDB search
for Video Games through a Supabase Edge Function• Apple Music search for
Songs, Albums, and Artists through a Supabase Edge Function• Apple Music
audio previews for Songs, Albums, and Artists• Genre-aware and evergreen
Apple Music suggestions• Feed pull-to-refresh

Current Priorities

• Continue validating onboarding completion and account-lifecycle
reliability• Improve Feed relevance and ranking• Improve personalized
recommendation quality• Expand Discover browsing and filtering• Improve
profile discovery• Continue refining Taste Match as a discovery signal•
Continue search-quality and provider-resiliency improvements• Continue
refining Apple Music search, suggestions, ranking, previews, and
metadata quality• Continue improving Movie / TV trailer resiliency where
practical• Expand conversation and engagement opportunities• Continue
performance and stability optimization• Prepare architecture for push
notifications

Initiative 1 --- Strengthen Discovery

Status: Current Focus

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
List sharing• User achievements• Activity summaries• Taste summaries

Success Looks Like

A user's profile quickly communicates what they care about, what they
recommend, and how their taste connects with the wider community.

Initiative 4 --- Conversation & Engagement

Status: Planned

Build on Likes, Comments, Following, Notifications, and recommendations
to encourage meaningful interaction around shared interests.

Opportunities

• Richer comment experiences• Conversation prompts around shared picks•
Recommendation-driven discussion• Improved social activity context• List
sharing• Friend invitations• Push notifications• Re-engagement
experiences

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
Moderation• Reporting and safety tools• Admin dashboard• Product
analytics• Community events• Additional content categories• Additional
entertainment providers

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

The long-term goal is not to maximize content creation or passive
engagement, but to create meaningful connections through shared taste.

Revision History

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