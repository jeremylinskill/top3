Top 3 --- V1 App Store Launch-Blocker Checklist

Document purpose: Single source of truth for requirements that must be
implemented, verified, or completed before submitting Top 3 V1 to Apple
App Review.

Audit baseline: Apple App Review Guidelines rechecked September 16,
2026. Apple continues to list the guidelines as last updated June 8,
2026. September 2026 App Store Connect submission changes are tracked
separately below where they affect Top 3.

Status key

🔴 BLOCKER --- known requirement that is not yet satisfied; must be
resolved before submission.

🟡 VERIFY --- likely implemented or planned, but must be explicitly
audited/tested before submission.

🟢 VERIFIED --- implementation has been inspected/tested and is
considered V1-ready.

⚪ SUBMISSION TASK --- App Store Connect/release preparation rather than
an app-code defect.

User-Generated Content & Social Safety --- Guideline 1.2

Top 3 is a social/UGC app. Apple requires apps with user-generated
content or social networking services to provide objectionable-content
filtering, reporting with timely response, abusive-user blocking, and
published contact information.

🟢 1.1 User blocking --- VERIFIED

Status: Implemented and tested end-to-end.

Verified behaviour

Users can block another user from that user's profile.

Successful profile blocking returns the blocker to the previous screen.

Blocking removes follow relationships between the two users.

Blocked users are excluded from Discover/New Members.

Blocked users are excluded from Taste Match/recommendations.

Blocked users and their published lists are excluded from the relevant
audited Feed, category-feed, list/ranking, and Overall-ranking surfaces.

Blocked users are absent from Followers/Following relationships after
the block.

Blocked users' comments are hidden from the blocker.

Hidden comments no longer contribute to the blocker's visible comment
counts.

Blocked users' likes disappear from the blocker's visible like
state/counts as expected.

Blocked users' notifications are hidden.

Hidden unread notifications immediately stop contributing to the
notification badge.

Pending follow requests from blocked users are hidden/excluded by the
shared notification layer.

Settings includes Blocked Users so users can review and unblock
accounts.

Unblocking restores applicable existing comments, likes, notifications,
and other visible content without deleting the underlying records.

Existing notification read/unread state is preserved through
block/unblock.

Block-state changes update relevant UI locally without requiring an app
restart.

Architecture verified/implemented

Supabase blocks persistence exists.

Blocking is persisted through the server-side block_user() path.

Block creation removes follow relationships.

Shared BlockProvider exposes block state to dependent social contexts.

Provider ordering places BlockProvider above block-aware
notification/comment consumers.

Discover filtering is performed locally against already-loaded data
rather than refetching the full published-post dataset whenever block
state changes.

Comment visibility is block-aware in the shared comment layer.

Visible comment counts use the server-side get_visible_comment_counts()
RPC.

Notifications and notification badge counts are block-aware in the
shared notification layer.

V1 conclusion

Closed. The V1 blocking review is complete across the audited Top 3
surfaces. No known user-facing blocking launch blocker remains.

🟢 1.2 Prohibited-content filtering --- VERIFIED

Apple requires a method for filtering objectionable material from being
posted to the app.

Status: Implemented and tested end-to-end for the V1 free-form public
UGC surfaces identified in the audit.

Verified V1 surfaces

Comments

Profile display name

Username

Profile bio

Collection/list titles and topics are generated from controlled
category/type/topic data rather than entered as unrestricted free-form
public text in the current V1 creation flow.

Implementation verified

Supabase provides the server-side enforcement point so prohibited
content cannot be bypassed by relying only on client-side validation.

A shared public.content_filter_terms table stores the production
hard-block vocabulary.

The temporary top3filtertest proof-of-concept term was removed after
verification.

The V1 production starter list contains 49 deliberately conservative
high-confidence terms and phrases.

The list focuses on severe identity-based slurs, explicit sexualized
threats, direct killing/murder threats, encouragement of
self-harm/death, and unmistakable calls for violence against protected
groups.

Ordinary profanity and broad/context-dependent words are intentionally
not treated as automatic hard blocks in V1 to reduce false positives in
legitimate discussion of movies, TV, books, music, games, people, and
titles.

The public.contains_blocked_content(text) function normalizes case and
punctuation and performs normalized whole-term/phrase matching rather
than unsafe raw substring matching.

Database enforcement rejects prohibited comments before publication.

Database profile validation rejects prohibited display names, usernames,
and bios on insert/update.

Expected moderation rejections are classified separately from unexpected
application failures and do not produce Expo red-screen errors.

Rejected comments and profile edits use the established Top 3-styled
ActionSheet messaging.

User-entered text remains intact after rejection so it can be corrected
rather than re-entered.

Verification completed

The database function correctly allowed normal text and the legitimate
title "Kill Bill."

The database function correctly rejected a direct threat across
uppercase and punctuation variations.

An end-to-end iPhone comment test using a production prohibited phrase
was rejected before publication and displayed the expected Top 3-styled
"Comment not posted" ActionSheet.

Display name, username, and bio rejection paths were each tested
successfully on-device.

V1 moderation model

Automated prohibited-content filtering is one layer of the broader
moderation system. Contextual harassment or abuse that cannot be
reliably identified by a conservative phrase list is handled through
Top 3's reporting, user-blocking, and admin-moderation workflows.

V1 conclusion

Closed. No known prohibited-content-filtering launch blocker remains for
the audited V1 free-form public UGC surfaces.

🟢 1.3 Reporting & moderation --- VERIFIED

Status: Implemented, previously tested end-to-end, and audited for the
V1 UGC surfaces and moderation workflow.

Verified reporting coverage

Users can report lists/collections.

Users can report other users.

Users can report comments.

Report entry points are available across the relevant V1 UGC surfaces,
including feed/category-feed content, public profiles, published Top 3
detail views, and comments.

Users cannot report themselves or their own content where those
restrictions apply.

Reports are persisted through the shared Supabase reporting layer.

Verified moderation behaviour

Submitted reports appear in the admin Moderation workflow.

Moderators can identify the reported target and review the report
reason/context.

Moderators can dismiss reports that do not require removal.

Moderators can remove reported content.

A tested Remove Content action removed the report from Moderation and
removed the reported collection from the applicable profile.

A stale-feed issue after moderation removal was addressed during the
moderation work.

Report state is resolved/removed appropriately after moderation action.

V1 operational moderation process

Top 3 reports will be reviewed regularly after launch by an administrator
with access to the Moderation workflow.

Reports involving credible threats, severe harassment, hate, sexual
exploitation, self-harm encouragement, or other potentially urgent
safety concerns should be prioritized for review.

When reported content clearly violates Top 3's published Terms of Use or
Community Standards, the moderator should remove the violating content
and take any additional account-level action supported by the V1 product
where appropriate.

Reports that do not establish a violation should be dismissed.

Duplicate reports concerning the same underlying content should be
treated as additional signals rather than requiring duplicate moderation
action.

Moderation decisions should be applied consistently with Top 3's
published community/content standards.

The moderation queue should be checked frequently enough after launch to
provide a timely response to reports, with urgent safety-related reports
handled as soon as reasonably possible.

V1 conclusion

Closed. Reporting is available for the audited V1 UGC target types,
reports feed into the admin moderation workflow, removal/dismissal
behaviour has been tested, and a V1 operational review process is
documented. No known reporting/moderation launch blocker remains.

Release-candidate note

Reporting and moderation should remain part of the final
release-candidate regression test, including confirmation that removed
content disappears consistently from all applicable surfaces.

🟢 1.4 In-app support/contact information --- VERIFIED

Apple requires users of UGC/social apps to be able to easily reach the
developer.

Status: The V1 in-app support/contact path is implemented and tested
end-to-end.

Verified behaviour

Settings includes a Support row in the App section.

The Support row opens a dedicated Top 3-styled Support screen.

The Support screen provides clear guidance for users who need help or
want to report a problem.

Contact Support launches the device mail app with the configured Top 3
support address populated.

The support email is stored in a centralized SUPPORT_EMAIL constant so
it can be replaced later without changing the Support UI.

The current V1 support address is support@top3taste.com.

End-to-end verification on iPhone confirmed that tapping Contact Support
successfully opens the mail app.

V1 conclusion

Closed for the in-app support/contact requirement. No known app-side
support/contact blocker remains.

Remaining submission task

Before App Store submission, provide a live App Store Connect Support
URL with an easy way to contact Top 3 support and confirm that
developer/App Review contact information is current. These remain App
Store Connect / public-web submission tasks rather than an app-side
implementation blocker.

Account & Authentication

🟢 2.1 Account deletion --- VERIFIED

Status: Implemented, audited, and tested end-to-end on-device against
the production Supabase data model.

Verified user-facing behaviour

Account deletion can be initiated from inside Top 3 through Settings.

The deletion flow clearly communicates that account deletion is
permanent.

A real-device deletion test completed successfully without an
application or server error.

After deletion, the user was visibly signed out and returned to the
unauthenticated Get Started / Sign In experience.

The deleted authentication account no longer appeared in auth.users
after the deletion completed.

Verified server-side implementation

The client invokes the authenticated delete-account Supabase Edge
Function.

For Sign in with Apple accounts, the native Apple authorization code is
sent after successful sign-in to the authenticated apple-auth-token Edge
Function, which exchanges it server-side for an Apple refresh token and
stores that token in the protected apple_auth_tokens table keyed by
Supabase user ID.

Apple Team ID, Key ID, Client ID, and private signing key are stored
only as Supabase Edge Function secrets.

Before deleting an Apple-authenticated account, delete-account loads the
stored Apple refresh token and revokes the user's Apple authorization
through Apple's revocation endpoint.

If Apple authorization revocation fails, account deletion stops rather
than deleting the Top 3 account while leaving the Apple authorization
active.

The Edge Function then identifies the authenticated user and deletes the
account through Supabase Auth admin.deleteUser().

The client treats deletion as successful only when the Edge Function
explicitly returns success.

After successful deletion, Top 3 resets local welcome/onboarding state
and signs the user out.

Verified database deletion architecture

public.profiles.id references auth.users.id with ON DELETE CASCADE.

A complete public-schema foreign-key audit returned 18 relevant
relationships, all using ON DELETE CASCADE.

The audited cascade graph covers profiles, collections, comments, likes,
follows, follow requests, blocks, notifications, and reports.

Collection-dependent comments, likes, and notifications also cascade
through their collection/content relationships.

Direct user relationships in blocks, notifications, and reports cascade
from auth.users.

Apple authorization verification

Apple authorization-code exchange and refresh-token persistence were
verified end-to-end.

Apple authorization revocation was verified end-to-end using temporary
test infrastructure that exercised the same revocation path now used by
the permanent delete-account function.

The temporary apple-auth-revoke-test Edge Function and Settings test UI
were removed after verification.

The admin Apple account was re-authorized after testing and a fresh
stored Apple refresh token was confirmed.

Post-deletion integrity verification

A database-wide orphan audit was run after the real-device deletion
test.

All 12 audited orphan checks returned 0.

No orphaned profiles, collections, comments, likes, follows, blocks,
notifications, or reports were detected.

V1 conclusion

Closed. Account deletion is implemented and verified end-to-end for V1,
including the Sign in with Apple authorization lifecycle required to
revoke Apple authorization before permanent deletion. No known
account-deletion launch blocker remains.

Release-candidate note

Account deletion should still be included in the final release-candidate
regression test. For an Apple-authenticated test account, confirm the
production deletion path continues to revoke Apple authorization before
deleting the Top 3 account. No additional account-deletion implementation
work is currently required.

🟢 2.2 Sign-out/session lifecycle --- VERIFIED

Status: Implemented and tested on-device with sequential account
switching.

Previously resolved issue

A Discover sign-out race that produced permission denied for table
collections was fixed and subsequently tested successfully.

Verified behaviour

Sign-out completes cleanly and returns the user to the unauthenticated
experience.

Signing out does not trigger the previously observed Discover
collections-permission error.

No Supabase or permission errors were observed after session removal
during the verification test.

A different existing account can sign in on the same iPhone immediately
after the first account signs out.

The second account receives its own profile and private/user-specific
state.

No stale private or user-specific state from the first account remained
visible after the account switch.

Feed, Discover, Notifications, and Profile were checked after switching
accounts.

V1 conclusion

Closed for the development-side session lifecycle. No known
sign-out/account-switching launch blocker remains.

Release-candidate note

Repeat sign-out/sign-in and sequential account switching once on the
final release-candidate build to guard against build/configuration
regressions. This is a regression check rather than unresolved
implementation work.

🟢 2.3 Authentication --- VERIFIED

Status: The V1 authentication functionality is implemented and has been
tested successfully on-device.

Verified V1 authentication flows

Email/password account creation works.

Email verification works, including the verification callback/deep-link
flow.

Email/password sign-in works.

Forgot Password successfully sends the password-reset email.

The password-reset link/deep-link opens the Top 3 reset-password flow and
allows the user to choose a new password.

Logged-in users can change their password through Settings.

Native Sign in with Apple works and its server-side authorization-code /
refresh-token lifecycle has been verified as part of account deletion
under 2.1.

Sign-out/session handling and sequential account switching have been
independently verified under 2.2.

Account deletion has been independently verified under 2.1.

Implementation audit

The current codebase contains the email sign-up, email
verification/check-email, authentication callback, email/password
sign-in, Forgot Password, reset-password, and authenticated Change
Password flows.

V1 conclusion

Closed for app-side authentication functionality. No known
authentication implementation blocker remains for V1.

Release-candidate note

Production authentication should still be included in the final
release-candidate regression test to guard against build, deep-link,
email-template, or environment/configuration regressions.

Remaining App Review preparation

Creating/maintaining a stable reviewer/demo account and supplying Apple
with credentials and concise reviewer instructions are
submission-preparation tasks. They are tracked under 6.2 App Review
information rather than treated as unfinished authentication
implementation.

Privacy, Legal & Data Handling

🟢 3.1 Privacy policy --- VERIFIED

Status: The V1 Privacy Policy has been reviewed against the current
Podcasts implementation and is synchronized across the repository,
in-app policy screen, and public website.

Verified September 16, 2026

The repository policy at docs/PRIVACY_POLICY.md was updated to describe:

Apple iTunes Search and Lookup services used for podcast discovery;

Apple Podcasts chart data used for podcast suggestions;

podcast preview media identified through Apple's podcast services; and

the possibility that podcast preview audio is delivered by the podcast
publisher or another media host.

The native policy at app/privacy-policy.tsx was updated with the same
September 16 disclosures.

npm run typecheck passes after the in-app policy update.

The public Privacy Policy was updated and deployed through Wrangler at:

https://top3taste.com/privacy

Live verification confirmed:

Last Updated: September 16, 2026;

the Apple iTunes Search / Lookup and Apple Podcasts chart disclosure; and

the podcast-preview publisher / media-host disclosure.

The public, repository, and in-app copies are therefore synchronized for
the current provider set.

Release-candidate note

Re-open Settings → Privacy Policy once on the final release-candidate build
to guard against a presentation or build regression. This is a regression
check rather than unresolved policy content.

Remaining submission task

Enter / reconfirm the live Privacy Policy URL in App Store Connect:

https://top3taste.com/privacy

V1 conclusion

Closed. The Privacy Policy now reflects the current Podcasts implementation
and no known app-side or public-policy launch blocker remains.

🟢 3.2 App Privacy disclosures --- VERIFIED

Status: The existing App Store Connect App Privacy disclosures have been
re-reviewed against the current Podcasts implementation and remain
appropriate for V1.

Verified September 16, 2026

The current App Store Connect configuration contains eight collected data
types, all classified as Data Linked to You:

Name --- App Functionality.

Email Address --- App Functionality.

Contacts --- Product Personalization and App Functionality.

Photos or Videos --- App Functionality.

Other User Content --- App Functionality and Product Personalization.

User ID --- App Functionality, Product Personalization, and Analytics.

Device ID --- Analytics.

Product Interaction --- Analytics.

Podcasts audit

Podcast search requests are sent directly to Apple's public iTunes Search
services to retrieve results.

Top 3 does not persist raw podcast search queries in its backend.

The search_performed Amplitude event records only the applicable category
and does not send the user's raw search text.

The analytics event-property schema does not include a search-query or
search-term property.

Top 3's limited recent-search history remains stored locally on the device.

The Podcasts provider uses in-memory preview caching and does not introduce
server-side search-history persistence.

Based on the audited implementation, Podcasts does not introduce a new
App Store Connect data type or collection purpose.

The existing Amplitude and installed native privacy-manifest review remains
applicable because the Podcasts work did not add a new analytics SDK or
native provider SDK.

Release-candidate note

Reconfirm the App Privacy questionnaire against the final submitted binary
if analytics, search persistence, provider SDKs, or other data-handling
behaviour changes before submission.

V1 conclusion

Closed. No additional App Privacy disclosure is required based on the
current Podcasts implementation, and the existing eight disclosed data
types remain appropriate for the audited V1 implementation.

🟢 3.3 Terms / community standards --- VERIFIED

Status: Terms of Use and Community Standards are implemented, published,
accessible, and verified for the V1 social/UGC and moderation experience.

Verified implementation

The V1 Terms of Use are maintained in docs/TERMS_OF_USE.md.

The V1 Community Standards are maintained in docs/COMMUNITY_STANDARDS.md.

Native Terms of Use and Community Standards screens are available in the app.

Settings includes a dedicated Legal section containing Privacy Policy,
Terms of Use, and Community Standards.

The Terms of Use and Community Standards screens were tested successfully
on iPhone, including navigation, scrolling, and back navigation.

Published public pages

Privacy Policy:
https://top3taste.com/privacy

Terms of Use:
https://top3taste.com/terms

Community Standards:
https://top3taste.com/community-standards

All three public legal pages were confirmed to load normally without
authentication.

The published legal pages use the official user-facing product name Top 3.

Community Standards / moderation alignment

The Community Standards define rules for the V1 user-generated-content
surfaces, including profiles, usernames, bios, Lists, comments, and social
interactions.

The standards address harassment, hate/dehumanizing content, violence and
threats, self-harm encouragement, sexual exploitation and minor safety,
sexually explicit content, privacy/personal information, impersonation,
spam/manipulation, intellectual property, and illegal or harmful activity.

The standards explain reporting, blocking, moderation, context, and
enforcement.

The published rules distinguish legitimate discussion of mature or
controversial entertainment from promotion of prohibited harmful conduct,
which is appropriate for Top 3's movies, television, books, music, games,
and related discovery content.

The reporting/removal practices verified under 1.3 are consistent with the
published Terms of Use and Community Standards.

V1 conclusion

Closed. Terms of Use and Community Standards are implemented in-app,
published on the public web, accessible without authentication, and aligned
with the V1 reporting, blocking, prohibited-content filtering, and
moderation model. No known Terms/community-standards launch blocker remains.

App Completeness & Reliability --- Guideline 2.1

🟡 4.1 Release-candidate regression test --- FINAL BUILD VERIFY

Apple specifically emphasizes crashes, bugs, incomplete information, and
unfinished experiences during review.

Current release-candidate status

Production iOS Build 8 remains the current TestFlight release candidate.

The current feature/dark-mode branch is ahead of Build 8 by five verified
application commits:

c5362d8 --- Add dark mode and inverted preview themes.

dca2bab --- Refine auth buttons and restore onboarding flow.

6b2acfa --- Add podcast category and previews.

ccee6d7 --- Improve Discover search matching.

92106eb --- Unify Discover search result cards.

Build 9 has not been created.

Build 8 remains the release candidate while documentation and regression
review continue. If the five post-Build-8 changes are intended for the V1
App Store binary, a replacement build must complete the full release-
candidate regression before replacing Build 8.

Required device test

Fresh install

Native splash → onboarding handoff

New account / signed-out first-List onboarding

Onboarding category layout, including Podcasts

Existing account sign-in

Apple authentication

Google authentication

Email authentication / confirmation callback

Password recovery / reset

Sign-out / sign-in

Sequential account switching

Create List

Search each supported V1 category:

Albums

Artists

Books

Movies

Podcasts

Songs

TV Shows

Video Games

Rank / reorder items

Save / resume draft

Publish List

Edit published List where supported

Feed rendering

Discover

Discover category and genre search matching

Category feeds

Public profiles

Follow / unfollow

Private-profile / follow-request flow

Likes

Comments: create / delete as applicable

In-app notifications

Push-notification permission and tap routing

Taste Match

User search

Report content

Block / unblock

Settings

Delete account, including Apple authorization revocation where applicable

Apple Music previews

Apple Podcasts previews

Movie / TV trailers

Book previews

Verify preview-sheet theme inversion:

Light app → Dark preview

Dark app → Light preview

Verify normal application surfaces in both light and dark appearance

Share an individual published List from each supported sharing surface

Share a community Overall ranking

Open a shared published-List deep link and confirm the intended List opens

Open a shared Overall-ranking deep link and confirm the intended Overall
ranking opens

While signed out, open shared public published content and confirm it
remains viewable without exposing draft or removed content

App relaunch / session persistence

Poor / failed network behaviour for critical flows

Acceptance

No reproducible crash.

No blocking error alert during ordinary use.

No placeholder / unfinished screens accessible in V1.

No test / debug content exposed unintentionally.

No light / dark mode regression that makes content unreadable or controls
inaccessible.

No Podcasts category, search, preview, or Discover regression.

Completed pre-release UI consistency audit

The V1 popup review remains complete across app, components, context, and
services.

Reviewed confirmation, destructive, success, error, validation,
authentication, collection, reporting, blocking, and moderation popup
flows use the shared Top 3 ActionSheet pattern.

The existing zero-Alert.alert audit remains a completed foundation but
should be rechecked only if final pre-submission changes touch popup paths.

npm run typecheck passes on the current feature/dark-mode application
checkpoint.

V1 conclusion

Build 8 remains the current TestFlight release candidate. Final release-
candidate regression is not considered closed for any post-Build-8 code
until that code is included in a submitted build and the complete device
regression above passes.

🟢 4.2 Empty/error/loading states --- VERIFIED

Status: The V1 empty, error, loading, offline, and retry-state review is
complete for the audited release-candidate experience. Feed, Discover,
Notifications, search, comments, blocked-user, provider-failure, and
network-failure states were reviewed and corrected where required.

Confirm production-quality behaviour for:

Empty feed

Empty Discover sections

No search results

No comments

No notifications

No blocked users

API/provider failure

Supabase/network failure

Image/artwork failure

Media-preview failure

🟢 4.3 Production configuration/secrets --- VERIFIED

Status: The V1 production Supabase/RLS/secrets review is complete. Production
configuration, client-visible credentials, Edge Function secrets, anonymous
published-content access, and relevant RLS boundaries were audited with no
known launch-blocking configuration issue remaining.

Verify

Production Supabase configuration is correct.

No service-role/private secrets are bundled into the client.

Edge Function secrets are configured server-side.

Apple Team ID, Key ID, Client ID, and private signing key used for Apple
token exchange/revocation are configured as Supabase Edge Function
secrets and are not exposed to the mobile client.

API keys intended to remain private are not exposed in the shipped
bundle.

Development/test endpoints and debug logging are removed or acceptable
for production.

RLS is enabled and appropriate on user/social/UGC tables.

The collections table intentionally grants SELECT to the Supabase anon
role to support signed-out viewing of shared public content. Verify the
associated RLS policy remains constrained to published collections with
a non-null published_at value and removed_at IS NULL, and that anonymous
INSERT, UPDATE, and DELETE access is not granted.

Content, Metadata & Third-Party Services

🟢 5.1 Third-party content/API compliance --- VERIFIED

Status: The V1 provider-by-provider compliance review now includes the
current Podcasts implementation. No known provider-compliance launch
blocker remains for the audited V1 implementation.

Verified provider areas

TMDb --- Movies / TV

Google Books --- Books

Open Library --- Book fallback

IGDB / Twitch --- Video Games

Apple Music --- Albums / Artists / Songs

Apple iTunes Search API --- Podcasts

Apple iTunes Lookup API --- Podcasts

Apple Podcasts chart data --- Podcast suggestions / charts

YouTube --- embedded Movie / TV trailer playback

Podcasts verification

The Podcasts implementation uses Apple's public search / lookup services
for podcast metadata and discovery.

Podcast episode preview URLs are identified through Apple's podcast lookup
data and played from the publisher or media host rather than downloaded or
persistently redistributed by Top 3.

Podcast preview information is cached only in memory for the active
application session.

Apple Podcasts show destinations use the provider-supplied or canonical
Apple Podcasts show URL.

Physical-device verification confirmed that:

podcast audio preview playback works normally;

the Apple Podcasts action opens the correct show in Apple Podcasts; and

no dead-link, wrong-show, or external-navigation error was observed.

Existing provider requirements remain applicable

Required attribution must remain present where required.

Artwork and metadata usage must remain consistent with provider terms.

Private provider credentials must remain server-side where applicable.

Deep links and external playback must continue to use supported provider
destinations.

Top 3 must not persist or redistribute provider content beyond what the
app's provider integrations permit.

Release-candidate note

Repeat representative provider search / preview checks on the final
release-candidate build to guard against build or configuration
regressions.

V1 conclusion

Closed. The current Podcasts provider implementation and external Apple
Podcasts navigation have been reviewed and physically verified, and no
known third-party content/API compliance blocker remains for V1.

🟢 5.2 App name, icon, screenshots and metadata --- VERIFIED

Status: The V1 product name, production icon, screenshots, App Store
description, promotional text, subtitle, keywords, age-rating information,
and copyright information have been prepared/reviewed for the current
submission.

Verify

Final V1 product name is decided before submission.

App icon is final and production-ready.

App Store screenshots represent the actual release build.

Description and promotional text accurately describe shipped
functionality.

Keywords/subtitle do not make unsupported claims.

Age rating reflects social/UGC functionality and accessible content.

Copyright/rights statements are accurate.

Separate business/legal note: Top 3 naming/trademark clearance remains a
product/business consideration and should be resolved to an acceptable
risk level before broad public launch, even though trademark clearance
itself is not simply an App Review code requirement.

App Store Connect Submission Readiness

⚪ 6.1 Required URLs and contact details --- PREPARED

Current production values:

Privacy Policy URL --- https://top3taste.com/privacy

Support URL --- https://top3taste.com/support

Marketing URL --- https://top3taste.com

Current App Review contact information --- prepared in App Store Connect

All required public URLs are live and functional.

⚪ 6.2 App Review information --- PREPARED

Prepared:

Reviewer/demo account credentials --- stable App Review account prepared

Clear instructions for testing Top 3's social functionality

Notes describing any content moderation/reporting flows that are not
immediately obvious

Any required configuration or test data

Contact person who can respond promptly to App Review

⚪ 6.3 Store listing --- PREPARED

Prepared/reviewed:

App name

Subtitle

Description

Keywords

Category/categories

Age rating questionnaire

Screenshots

App icon

Copyright

Version/release notes

App Privacy questionnaire

⚪ 6.4 September 2026 Social Media age-rating question --- SUBMISSION TASK

Apple's September 2026 App Store submission flow requires developers to
indicate whether an app includes social media capabilities.

Top 3 includes a social Feed and allows users to interact with user-
generated content through Likes, Comments, Follows, and Shares.

Before final submission:

Answer the Social Media capability question accurately in App Store
Connect.

Confirm the resulting age-rating configuration remains consistent with
Top 3's intended minimum age of 13.

Reconfirm the completed age-rating questionnaire after the final
release-candidate feature set is selected.

This is an App Store Connect submission task. No new app-code blocker has
been identified from this requirement.

Current V1 Gate Summary

Area

Status

Current conclusion

User blocking

🟢 VERIFIED

Complete for V1 based on audited / tested social surfaces

Prohibited-content filtering

🟢 VERIFIED

Implemented and tested for comments, display name, username, and bio;
49-term production hard-block list installed

Reporting & moderation

🟢 VERIFIED

Lists, users, and comments are reportable; admin moderation
removal / dismissal tested; V1 operational review process documented

In-app support/contact info

🟢 VERIFIED

Settings → Support → Contact Support verified end-to-end on iPhone;
App Store Connect contact fields remain submission tasks

Account deletion

🟢 VERIFIED

End-to-end deletion, Auth removal, cascade architecture, zero-orphan
database audit, Apple refresh-token persistence, and Apple authorization
revocation verified

Sign-out/session lifecycle

🟢 VERIFIED

Clean sign-out and sequential account switching verified; repeat on final
release candidate

Authentication

🟢 VERIFIED

Email, Apple, Google, password recovery, and session lifecycle verified;
reviewer/demo credentials remain a submission task

Privacy policy

🟢 VERIFIED

Reviewed and synchronized for the current Podcasts provider/data flow;
repository, in-app, and public copies verified September 16, 2026

App Privacy disclosures

🟢 VERIFIED

Re-audited against the current Podcasts data flow; no additional App Store
Connect data type or collection purpose is required

Terms/community standards

🟢 VERIFIED

In-app and public-web copies remain aligned with the V1 moderation model

Popup standardization

🟢 VERIFIED

Shared Top 3 ActionSheet foundation complete; zero Alert.alert audit was
completed for the audited application state

Release regression testing

🟡 VERIFY

Build 8 remains the current TestFlight release candidate; the branch has
five verified post-Build-8 application commits. Any replacement build
must pass the complete regression before becoming the final candidate

Error/empty/loading states

🟢 VERIFIED

V1 UX/error-state pass completed

Production security/config

🟢 VERIFIED

Production Supabase / RLS / secrets audit completed

Third-party API/content compliance

🟢 VERIFIED

Provider audit extended to Apple iTunes Search / Lookup, Apple Podcasts
chart data, podcast preview playback, and external Apple Podcasts
navigation; physical-device verification completed

App metadata/assets

🟢 VERIFIED

Current V1 App Store metadata and production assets prepared / reviewed;
reconfirm screenshots and copy against the selected final binary

September 2026 Social Media age-rating question

⚪ SUBMISSION TASK

Answer the new App Store Connect Social Media capability question
accurately and reconfirm the resulting 13+ age-rating configuration

App Store Connect submission data

⚪ SUBMISSION TASK

Required URLs, reviewer access / instructions, listing data, and final
submission remain pending

Latest verification checkpoint

August 25, 2026

Blocked-user filtering review completed across the relevant audited Top 3
surfaces.

Commit 61ef627 --- Apply blocked user filtering across Top 3.

V1 popup standardization review completed.

Commit c3d3b7f --- Standardize popups with Top 3 action sheets.

Final verification: npm run typecheck passes and the project-wide
Alert.alert audit returns zero matches across app, components, context,
and services.

V1 Privacy Policy implementation completed and verified.

Commit 5d9f1d4 --- Add V1 privacy policy.

Commit cbb9925 --- Add in-app privacy policy.

docs/PRIVACY_POLICY.md contains the implementation-audited V1 policy.

Settings → Privacy Policy was tested successfully on iPhone, including
navigation, full-policy scrolling, back navigation, and visual presentation.

npm run typecheck passes after the in-app Privacy Policy implementation.

September 3, 2026

Privacy Policy updated for push notifications and synchronized across the
public website, docs/PRIVACY_POLICY.md, and app/privacy-policy.tsx.

Public URL confirmed live:

https://top3taste.com/privacy

Updated in-app Privacy Policy verified successfully on iPhone.

npm run typecheck passes after the updated policy implementation.

Commit 83aafa7 --- Update privacy policy for push notifications.

Commit 83aafa7 pushed successfully to origin/main.

September 3, 2026

App Privacy disclosure review completed.

The eight currently published App Store Connect data types were verified against the audited Top 3 V1 implementation.

Amplitude @amplitude/analytics-react-native@1.6.9 configuration was reviewed in lib/analytics.ts, including disabled automatic tracking fields, identified-user handling, event names, and event properties.

Installed PrivacyInfo.xcprivacy manifests were inspected for Expo, React Native, and AsyncStorage dependencies. Required Reason API declarations were present for the applicable audited native dependencies, and no additional custom privacy manifest was identified as necessary.

Push notifications were reviewed and do not require a new App Privacy data-type disclosure for the audited V1 implementation.

No undeclared tracking was identified.

September 4, 2026

Terms of Use and Community Standards implementation and publication review completed.

Native Terms of Use and Community Standards screens and the Settings Legal
section were verified successfully on iPhone.

Public Privacy Policy, Terms of Use, and Community Standards pages were
confirmed to load normally without authentication.

The published Community Standards were confirmed to support the implemented
V1 reporting, blocking, prohibited-content filtering, and moderation model.

September 10, 2026

V1 launch-readiness checkpoint updated.

Production Build 6 remains the current TestFlight release candidate and has
been submitted for external TestFlight Beta App Review.

The production Top 3 site is live at top3taste.com, including Support,
Privacy, Terms, Community Standards, and the branded
https://top3taste.com/auth-callback/ email-confirmation bridge.

Supabase custom SMTP is configured through Resend using the verified
email.top3taste.com sending domain. Branded account-confirmation,
password-reset, and password-changed security email templates are installed.

The account-confirmation flow has been verified through email → Supabase
verification → branded web callback → Open Top 3 → app auth callback.

Two app-side fixes exist on main after Build 6:
150726b --- Add email domain typo suggestions.
fa8353a --- Dismiss keyboard when playing audio previews.
Both pass npm run typecheck and were verified on a physical iPhone.

Build 7 is intentionally on hold until the remaining launch-critical checks
are complete.

September 16, 2026

Documentation and post-Build-8 checkpoint review.

Production Build 8 remains the current TestFlight release candidate.

The feature/dark-mode branch contains five verified application commits
after Build 8 through 92106eb.

Post-Build-8 work includes system-aware light / dark mode, intentional
preview-sheet theme inversion, authentication-button refinement,
restored onboarding presentation, Podcasts, Discover search matching,
and shared Discover search-result cards.

Podcasts was added after the previous privacy, App Privacy, and external-
provider compliance audits. All three audits were subsequently completed
on September 16, 2026 and returned to VERIFIED status.

Apple's September 2026 App Store Connect submission requirements now
include a Social Media capability question. Top 3 must answer that
question accurately before final submission.

Immediate Next Step

Complete the documentation checkpoint and prepare a replacement
release-candidate build containing the five post-Build-8 application
commits.

The five post-Build-8 changes are confirmed for inclusion in the V1 App
Store submission binary.

The Privacy Policy, App Privacy, and Podcasts provider-compliance audits
are complete.

Complete the September 2026 App Store Connect Social Media age-rating
question before final submission.

Create the replacement release-candidate build only after the application
and documentation checkpoint is committed and pushed, then repeat the full
device regression before replacing Build 8 as the V1 release candidate.

Definition of V1 Launch-Ready

Top 3 is ready to enter final App Store submission preparation when:

No item in this document remains 🔴 BLOCKER.

Every app-side 🟡 VERIFY item that could cause rejection has been
explicitly tested/audited and converted to 🟢 VERIFIED or consciously
resolved.

A release-candidate build passes the complete device regression test.

Production privacy/legal/support URLs and App Store Connect disclosures
are complete and accurate.

App Review can sign in and exercise the complete V1 experience using the
supplied review credentials/instructions.

This checklist should be updated as each requirement is verified. It is
the release gate for Top 3 V1, not the long-term product roadmap.