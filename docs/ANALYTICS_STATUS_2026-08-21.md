Top3 Analytics --- Current Status

Last updated: August 21, 2026
Checkpoint: Analytics foundation complete; pause analytics work
while Top3 sharing/deep-link functionality is implemented.

Platform

Analytics platform: Amplitude Analytics

Package: @amplitude/analytics-react-native

Central analytics helper: lib/analytics.ts

Authenticated Top3 users are identified in Amplitude using their
Supabase user ID.

The current implementation intentionally avoids sending unnecessary
personal or user-generated content to Amplitude, including:

usernames

display names

collection IDs

post IDs

item titles

search queries

comment text

Taste Match counterpart/user IDs

Verified Analytics Events

The following events have been implemented, passed TypeScript, and
verified in Amplitude Live Events:

Event                    Status     Custom properties

collection_started     Verified   category
search_performed       Verified   category
item_added             Verified   category, rank, source
collection_completed   Verified   category
collection_published   Verified   category, rankCount
collection_edited      Verified   category, rankCount
user_followed          Verified   none
collection_liked       Verified   none
comment_added          Verified   none
profile_viewed         Verified   none
taste_match_viewed     Verified   none
collection_viewed      Verified   none

Onboarding Event

onboarding_completed is implemented in
app/onboarding-taste-match.tsx.

It fires after the successful profile update:

await updateProfile({
  hasCompletedOnboarding: true,
});

trackAnalyticsEvent(
  'onboarding_completed'
);

This event has not been re-tested during the latest Live Events
verification sequence because doing so requires completing a fresh
onboarding flow.

Core Creation Funnel

Top3 can now measure the primary collection-creation journey:

collection_started → search_performed → item_added →
collection_completed → collection_published

This gives us the foundation to answer questions such as:

What percentage of started Top 3s receive at least one item?

Where do users abandon collection creation?

How often do users fill all three ranks?

What percentage of completed collections are published?

Which categories have the strongest creation/completion rates?

Discovery and Social Funnel

Top3 can now measure an important discovery-to-connection path:

collection_viewed → profile_viewed → taste_match_viewed →
user_followed

Engagement with published collections is additionally measured through:

collection_liked

comment_added

Together, these events begin to show whether Top3's collection discovery
and Taste Match mechanics lead to deeper social engagement.

Important Implementation Details

collection_started

Fires when a genuinely new collection is created.

It includes:

{
  category: savedList.category,
}

Existing collections that are reopened should not be counted as newly
started collections.

search_performed

Tracks completed search behaviour within the collection-building flow.

It currently includes the collection/category context rather than the
user's actual search query. Search text is deliberately not sent to
Amplitude.

item_added

Fires when an item is selected from search and added to a ranked
position.

Current properties:

{
  category,
  rank,
  source: 'search',
}

collection_completed

Fires when a collection transitions from incomplete to all three ranked
positions being filled.

Replacing an item in an already-complete collection should not
automatically create another completion event unless the collection
first becomes incomplete and then becomes complete again.

collection_published

Fires for the initial publication of a collection.

It includes:

{
  category,
  rankCount,
}

collection_edited

Used for subsequent saves/updates to an already-published collection
rather than counting those changes as additional publishes.

It includes:

{
  category,
  rankCount,
}

user_followed

Fires only after the Supabase follow write succeeds.

No target user ID or other profile information is sent as a custom
property.

collection_liked

Fires only after createLike(...) successfully persists the like to
Supabase.

No collection/post ID is sent as a custom property.

comment_added

Fires only after createComment(...) successfully persists the comment
to Supabase.

The comment text and other user-generated content are not sent to
Amplitude.

profile_viewed

Fires when another user's profile successfully loads.

It does not fire for the signed-in user's own profile.

A useRef guard prevents duplicate events caused by rerenders during
the same mounted screen visit.

No viewed-user ID, username, or other profile information is sent.

taste_match_viewed

Implemented centrally in app/taste-match.tsx rather than separately at
each Taste Match entry point.

It fires only once a real Taste Match has successfully resolved.

A useRef guard prevents duplicate events from rerenders and resets
when the viewed user changes.

No Taste Match score or counterpart user ID is currently sent.

collection_viewed

Implemented centrally in app/published-top3.tsx.

It fires only after the requested published collection successfully
resolves. Missing, deleted, unavailable, or failed collection loads are
therefore not counted.

A per-post useRef guard prevents duplicate events from rerenders.

No collection ID, post ID, author ID, title, or other content is sent.

Current Typed Analytics Schema

The current AnalyticsEvent union in lib/analytics.ts contains:

export type AnalyticsEvent =
  | 'account_created'
  | 'onboarding_completed'
  | 'collection_started'
  | 'collection_completed'
  | 'collection_published'
  | 'collection_edited'
  | 'search_performed'
  | 'item_added'
  | 'discover_viewed'
  | 'profile_viewed'
  | 'user_followed'
  | 'collection_liked'
  | 'comment_added'
  | 'taste_match_viewed'
  | 'collection_viewed'
  | 'notification_opened';

The current analytics property type supports:

export type AnalyticsEventProperties = {
  category?: string;
  source?: string;
  rank?: number;
  rankCount?: number;
};

Events Still To Address

The following events are already represented in the analytics schema but
still need implementation and/or verification:

account_created

discover_viewed

notification_opened

onboarding_completed is implemented but should eventually be verified
again through a fresh onboarding flow.

Sharing --- Deliberately Deferred Analytics Event

We discussed adding:

collection_shared

We correctly decided not to add this analytics event until Top3 has
actual collection-sharing functionality.

The product functionality should be designed and implemented first. Once
the final sharing behaviour is known, collection_shared can be
instrumented at the correct successful action point.

Sharing Functionality --- Current Investigation

Before pausing analytics, we searched the codebase for existing sharing
and deep-link infrastructure.

The search found:

no Share.share(...) implementation

no expo-sharing usage

no existing shareCollection, sharePost, or equivalent flow

no existing collection-sharing UI

existing Linking.createURL(...) usage only for
authentication-related flows in services/auth-service.ts

The current auth-related links include:

/auth-callback

/reset-password

No published-collection sharing/deep-link implementation has yet been
established.

Where To Resume Product Work

The next planned step is to inspect the Expo application configuration:

cat app.json

The purpose is to determine the existing app scheme/configuration and
establish the correct deep-link architecture before adding sharing UI.

Recommended sharing implementation sequence:

Inspect app.json.

Establish a stable deep link for a published Top 3.

Verify that opening the link routes to the correct published
collection.

Add a native Share action/share sheet to the appropriate published
Top 3 UI.

Test sharing on the physical iPhone.

Decide what should happen when a recipient does not yet have Top3
installed.

Once the final sharing behaviour works, return to analytics.

Add collection_shared at the successful share-action point.

Add collection_shared to the typed AnalyticsEvent union.

Typecheck.

Verify collection_shared in Amplitude Live Events.

Analytics Resume Point After Sharing

Once sharing functionality is finalized and collection_shared has been
implemented and verified, resume the remaining analytics work with:

account_created

discover_viewed

notification_opened

re-verification of onboarding_completed through a fresh onboarding
flow

After those events are complete, the next phase should be to build
useful Amplitude funnels/charts from the event data rather than
continuing to add events without a clear measurement purpose.

Current Checkpoint

As of August 21, 2026:

Core analytics infrastructure is working.

TypeScript is passing.

Twelve behavioural events have been verified in Amplitude Live
Events.

onboarding_completed is additionally implemented in code.

Core creation behaviour is measurable.

Published collection engagement is measurable.

Profile/Taste Match/social behaviour is measurable.

collection_shared is intentionally deferred until sharing
functionality exists.

The immediate next task is sharing/deep-link functionality,
beginning with inspection of app.json.