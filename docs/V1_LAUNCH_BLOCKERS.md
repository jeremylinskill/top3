Top3 — V1 App Store Launch-Blocker Checklist

Document purpose: Single source of truth for requirements that must be implemented, verified, or completed before submitting Top3 V1 to Apple App Review.

Audit baseline: Apple App Review Guidelines current as of August 20, 2026 (Apple lists the guidelines as last updated June 8, 2026).

Status key

🔴 BLOCKER — known requirement that is not yet satisfied; must be resolved before submission.

🟡 VERIFY — likely implemented or planned, but must be explicitly audited/tested before submission.

🟢 VERIFIED — implementation has been inspected/tested and is considered V1-ready.

⚪ SUBMISSION TASK — App Store Connect/release preparation rather than an app-code defect.

User-Generated Content & Social Safety — Guideline 1.2

Top3 is a social/UGC app. Apple requires apps with user-generated content or social networking services to provide objectionable-content filtering, reporting with timely response, abusive-user blocking, and published contact information.

🟢 1.1 User blocking — VERIFIED

Status: Implemented and tested end-to-end.

Verified behaviour

Users can block another user from that user's profile.

Successful profile blocking returns the blocker to the previous screen.

Blocking removes follow relationships between the two users.

Blocked users are excluded from Discover/New Members.

Blocked users are excluded from Taste Match/recommendations.

Blocked users are absent from Followers/Following relationships after the block.

Blocked users' comments are hidden from the blocker.

Hidden comments no longer contribute to the blocker's visible comment counts.

Blocked users' likes disappear from the blocker's visible like state/counts as expected.

Blocked users' notifications are hidden.

Hidden unread notifications immediately stop contributing to the notification badge.

Pending follow requests from blocked users are hidden/excluded by the shared notification layer.

Settings includes Blocked Users so users can review and unblock accounts.

Unblocking restores applicable existing comments, likes, notifications, and other visible content without deleting the underlying records.

Existing notification read/unread state is preserved through block/unblock.

Block-state changes update relevant UI locally without requiring an app restart.

Architecture verified/implemented

Supabase blocks persistence exists.

Blocking is persisted through the server-side block_user() path.

Block creation removes follow relationships.

Shared BlockProvider exposes block state to dependent social contexts.

Provider ordering places BlockProvider above block-aware notification/comment consumers.

Discover filtering is performed locally against already-loaded data rather than refetching the full published-post dataset whenever block state changes.

Comment visibility is block-aware in the shared comment layer.

Visible comment counts use the server-side get_visible_comment_counts() RPC.

Notifications and notification badge counts are block-aware in the shared notification layer.

V1 conclusion

Closed. No known user-facing blocking launch blocker remains from the surfaces audited to date.

🟢 1.2 Prohibited-content filtering — VERIFIED

Apple requires a method for filtering objectionable material from being posted to the app.

Status: Implemented and tested end-to-end for the V1 free-form public UGC surfaces identified in the audit.

Verified V1 surfaces

Comments

Profile display name

Username

Profile bio

Collection/list titles and topics are generated from controlled category/type/topic data rather than entered as unrestricted free-form public text in the current V1 creation flow.

Implementation verified

Supabase provides the server-side enforcement point so prohibited content cannot be bypassed by relying only on client-side validation.

A shared public.content_filter_terms table stores the production hard-block vocabulary.

The temporary top3filtertest proof-of-concept term was removed after verification.

The V1 production starter list contains 49 deliberately conservative high-confidence terms and phrases.

The list focuses on severe identity-based slurs, explicit sexualized threats, direct killing/murder threats, encouragement of self-harm/death, and unmistakable calls for violence against protected groups.

Ordinary profanity and broad/context-dependent words are intentionally not treated as automatic hard blocks in V1 to reduce false positives in legitimate discussion of movies, TV, books, music, games, people, and titles.

The public.contains_blocked_content(text) function normalizes case and punctuation and performs normalized whole-term/phrase matching rather than unsafe raw substring matching.

Database enforcement rejects prohibited comments before publication.

Database profile validation rejects prohibited display names, usernames, and bios on insert/update.

Expected moderation rejections are classified separately from unexpected application failures and do not produce Expo red-screen errors.

Rejected comments and profile edits use the established Top3-styled ActionSheet messaging.

User-entered text remains intact after rejection so it can be corrected rather than re-entered.

Verification completed

The database function correctly allowed normal text and the legitimate title “Kill Bill.”

The database function correctly rejected a direct threat across uppercase and punctuation variations.

An end-to-end iPhone comment test using a production prohibited phrase was rejected before publication and displayed the expected Top3-styled “Comment not posted” ActionSheet.

Display name, username, and bio rejection paths were each tested successfully on-device.

V1 moderation model

Automated prohibited-content filtering is one layer of the broader moderation system. Contextual harassment or abuse that cannot be reliably identified by a conservative phrase list is handled through Top3's reporting, user-blocking, and admin-moderation workflows.

V1 conclusion

Closed. No known prohibited-content-filtering launch blocker remains for the audited V1 free-form public UGC surfaces.

🟢 1.3 Reporting & moderation — VERIFIED

Status: Implemented, previously tested end-to-end, and audited for the V1 UGC surfaces and moderation workflow.

Verified reporting coverage

Users can report lists/collections.

Users can report other users.

Users can report comments.

Report entry points are available across the relevant V1 UGC surfaces, including feed/category-feed content, public profiles, published Top 3 detail views, and comments.

Users cannot report themselves or their own content where those restrictions apply.

Reports are persisted through the shared Supabase reporting layer.

Verified moderation behaviour

Submitted reports appear in the admin Moderation workflow.

Moderators can identify the reported target and review the report reason/context.

Moderators can dismiss reports that do not require removal.

Moderators can remove reported content.

A tested Remove Content action removed the report from Moderation and removed the reported collection from the applicable profile.

A stale-feed issue after moderation removal was addressed during the moderation work.

Report state is resolved/removed appropriately after moderation action.

V1 operational moderation process

Top3 reports will be reviewed regularly after launch by an administrator with access to the Moderation workflow.

Reports involving credible threats, severe harassment, hate, sexual exploitation, self-harm encouragement, or other potentially urgent safety concerns should be prioritized for review.

When reported content clearly violates Top3's published Terms of Use or Community Standards, the moderator should remove the violating content and take any additional account-level action supported by the V1 product where appropriate.

Reports that do not establish a violation should be dismissed.

Duplicate reports concerning the same underlying content should be treated as additional signals rather than requiring duplicate moderation action.

Moderation decisions should be applied consistently with Top3's published community/content standards.

The moderation queue should be checked frequently enough after launch to provide a timely response to reports, with urgent safety-related reports handled as soon as reasonably possible.

V1 conclusion

Closed. Reporting is available for the audited V1 UGC target types, reports feed into the admin moderation workflow, removal/dismissal behaviour has been tested, and a V1 operational review process is documented. No known reporting/moderation launch blocker remains.

Release-candidate note

Reporting and moderation should remain part of the final release-candidate regression test, including confirmation that removed content disappears consistently from all applicable surfaces.

🟢 1.4 In-app support/contact information — VERIFIED

Apple requires users of UGC/social apps to be able to easily reach the developer.

Status: The V1 in-app support/contact path is implemented and tested end-to-end.

Verified behaviour

Settings includes a Support row in the App section.

The Support row opens a dedicated Top3-styled Support screen.

The Support screen provides clear guidance for users who need help or want to report a problem.

Contact Support launches the device mail app with the configured Top3 support address populated.

The support email is stored in a centralized SUPPORT_EMAIL constant so it can be replaced later without changing the Support UI.

The current temporary V1 support address is jeremylinskill@gmail.com.

End-to-end verification on iPhone confirmed that tapping Contact Support successfully opens the mail app.

V1 conclusion

Closed for the in-app support/contact requirement. No known app-side support/contact blocker remains.

Remaining submission task

Before App Store submission, provide a live App Store Connect Support URL with an easy way to contact Top3 support and confirm that developer/App Review contact information is current. These remain App Store Connect / public-web submission tasks rather than an app-side implementation blocker.

Account & Authentication

🟢 2.1 Account deletion — VERIFIED

Status: Implemented, audited, and tested end-to-end on-device against the production Supabase data model.

Verified user-facing behaviour

Account deletion can be initiated from inside Top3 through Settings.

The deletion flow clearly communicates that account deletion is permanent.

A real-device deletion test completed successfully without an application or server error.

After deletion, the user was visibly signed out and returned to the unauthenticated Get Started / Sign In experience.

The deleted authentication account no longer appeared in auth.users after the deletion completed.

Verified server-side implementation

The client invokes the authenticated delete-account Supabase Edge Function.

The Edge Function identifies the authenticated user and deletes the account through Supabase Auth admin.deleteUser().

The client treats deletion as successful only when the Edge Function explicitly returns success.

After successful deletion, Top3 resets local welcome/onboarding state and signs the user out.

Verified database deletion architecture

public.profiles.id references auth.users.id with ON DELETE CASCADE.

A complete public-schema foreign-key audit returned 18 relevant relationships, all using ON DELETE CASCADE.

The audited cascade graph covers profiles, collections, comments, likes, follows, follow requests, blocks, notifications, and reports.

Collection-dependent comments, likes, and notifications also cascade through their collection/content relationships.

Direct user relationships in blocks, notifications, and reports cascade from auth.users.

Post-deletion integrity verification

A database-wide orphan audit was run after the real-device deletion test.

All 12 audited orphan checks returned 0.

No orphaned profiles, collections, comments, likes, follows, blocks, notifications, or reports were detected.

V1 conclusion

Closed. Account deletion is implemented and verified end-to-end for V1. No known account-deletion launch blocker remains.

Release-candidate note

Account deletion should still be included in the final release-candidate regression test, but no additional account-deletion implementation work is currently required.

🟢 2.2 Sign-out/session lifecycle — VERIFIED

Status: Implemented and tested on-device with sequential account switching.

Previously resolved issue

A Discover sign-out race that produced permission denied for table collections was fixed and subsequently tested successfully.

Verified behaviour

Sign-out completes cleanly and returns the user to the unauthenticated experience.

Signing out does not trigger the previously observed Discover collections-permission error.

No Supabase or permission errors were observed after session removal during the verification test.

A different existing account can sign in on the same iPhone immediately after the first account signs out.

The second account receives its own profile and private/user-specific state.

No stale private or user-specific state from the first account remained visible after the account switch.

Feed, Discover, Notifications, and Profile were checked after switching accounts.

V1 conclusion

Closed for the development-side session lifecycle. No known sign-out/account-switching launch blocker remains.

Release-candidate note

Repeat sign-out/sign-in and sequential account switching once on the final release-candidate build to guard against build/configuration regressions. This is a regression check rather than unresolved implementation work.

🟢 2.3 Authentication — VERIFIED

Status: The V1 authentication functionality is implemented and has been tested successfully on-device.

Verified V1 authentication flows

Email/password account creation works.

Email verification works, including the verification callback/deep-link flow.

Email/password sign-in works.

Forgot Password successfully sends the password-reset email.

The password-reset link/deep-link opens the Top3 reset-password flow and allows the user to choose a new password.

Logged-in users can change their password through Settings.

Sign-out/session handling and sequential account switching have been independently verified under 2.2.

Account deletion has been independently verified under 2.1.

Implementation audit

The current codebase contains the email sign-up, email verification/check-email, authentication callback, email/password sign-in, Forgot Password, reset-password, and authenticated Change Password flows.

V1 conclusion

Closed for app-side authentication functionality. No known authentication implementation blocker remains for V1.

Release-candidate note

Production authentication should still be included in the final release-candidate regression test to guard against build, deep-link, email-template, or environment/configuration regressions.

Remaining App Review preparation

Creating/maintaining a stable reviewer/demo account and supplying Apple with credentials and concise reviewer instructions are submission-preparation tasks. They are tracked under 6.2 App Review information rather than treated as unfinished authentication implementation.

Privacy, Legal & Data Handling

🟡 3.1 Privacy policy — VERIFY

Verify

A publicly accessible privacy policy exists.

The privacy-policy URL is entered correctly in App Store Connect.

The policy accurately describes the data Top3 actually collects and processes.

Supabase/auth/profile/social data practices are represented accurately.

Any third-party APIs/SDKs that receive user or device data are accounted for where required.

Account deletion/data-retention behaviour matches the policy.

🟡 3.2 App Privacy disclosures — VERIFY

Verify in App Store Connect

App Privacy answers accurately reflect the release build.

Data linked to identity is classified correctly.

Analytics/diagnostics disclosures match the SDKs actually shipped.

Amplitude is included in the V1 application for product analytics. Confirm
that the App Privacy questionnaire accurately reflects the Amplitude data and
event properties actually collected by the release build.

No undeclared tracking is present.

Third-party SDK privacy manifests/reason APIs are compliant where applicable.

🟡 3.3 Terms / community standards — VERIFY

Because Top3 includes social UGC and moderation, users should have accessible rules governing acceptable behaviour/content.

Verify

Terms of Use are published and accessible.

Community/content standards are sufficiently clear to support moderation decisions.

Reporting/removal practices are consistent with the published rules.

Links work in the production build and on the public web.

App Completeness & Reliability — Guideline 2.1

🟡 4.1 Release-candidate regression test — REQUIRED

Apple specifically emphasizes crashes, bugs, incomplete information, and unfinished experiences during review.

Required device test

Fresh install

New account/onboarding

Existing account sign-in

Sign-out/sign-in

Create collection

Search each supported V1 category

Rank/reorder items

Save/resume draft

Publish collection

Edit published collection where supported

Feed rendering

Discover

Category feeds

Public profiles

Follow/unfollow

Private-profile/follow-request flow if included in V1

Likes

Comments: create/edit/delete as applicable

Notifications

Taste Match

User search

Report content

Block/unblock

Settings

Delete account

External media previews/trailers/music previews included in V1

Share an individual published List from each supported sharing surface

Share a community Overall ranking

Open a shared published-List deep link and confirm the intended List opens

Open a shared Overall-ranking deep link and confirm the intended Overall
ranking opens

While signed out, open shared public published content and confirm it remains
viewable without exposing draft or removed content

App relaunch/session persistence

Poor/failed network behaviour for critical flows

Acceptance

No reproducible crash.

No blocking error alert during ordinary use.

No placeholder/unfinished screens accessible in V1.

No test/debug content exposed unintentionally.

🟡 4.2 Empty/error/loading states — VERIFY

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

🟡 4.3 Production configuration/secrets — VERIFY

Verify

Production Supabase configuration is correct.

No service-role/private secrets are bundled into the client.

Edge Function secrets are configured server-side.

API keys intended to remain private are not exposed in the shipped bundle.

Development/test endpoints and debug logging are removed or acceptable for production.

RLS is enabled and appropriate on user/social/UGC tables.

The collections table intentionally grants SELECT to the Supabase anon role
to support signed-out viewing of shared public content. Verify the associated
RLS policy remains constrained to published collections with a non-null
published_at value and removed_at IS NULL, and that anonymous INSERT, UPDATE,
and DELETE access is not granted.

Content, Metadata & Third-Party Services

🟡 5.1 Third-party content/API compliance — VERIFY

Top3 uses external data/media providers for ranked-item metadata and previews. Verify the V1 implementation complies with each provider's current terms and attribution requirements.

Known V1 provider areas to audit

TMDB — Movies / TV

Google Books — Books

IGDB/Twitch — Video Games, if this is the final V1 provider

Apple Music — Albums / Artists / Songs

YouTube/external trailer playback where used

Verify

Required attribution is present.

Artwork/image usage complies with provider terms.

API credentials are handled correctly.

Deep links/external playback comply with provider rules.

No unsupported content is being cached or redistributed.

🟡 5.2 App name, icon, screenshots and metadata — VERIFY

Verify

Final V1 product name is decided before submission.

App icon is final and production-ready.

App Store screenshots represent the actual release build.

Description and promotional text accurately describe shipped functionality.

Keywords/subtitle do not make unsupported claims.

Age rating reflects social/UGC functionality and accessible content.

Copyright/rights statements are accurate.

Separate business/legal note: Top3 naming/trademark clearance remains a product/business consideration and should be resolved to an acceptable risk level before broad public launch, even though trademark clearance itself is not simply an App Review code requirement.

App Store Connect Submission Readiness

⚪ 6.1 Required URLs and contact details

Before submission:

Privacy Policy URL

Support URL

Marketing URL, if used

Current App Review contact information

All URLs must be live and functional.

⚪ 6.2 App Review information

Prepare:

Reviewer/demo account credentials

Clear instructions for testing Top3's social functionality

Notes describing any content moderation/reporting flows that are not immediately obvious

Any required configuration or test data

Contact person who can respond promptly to App Review

⚪ 6.3 Store listing

Complete and proof:

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

Current V1 Gate Summary

Area

Status

Current conclusion

User blocking

🟢 VERIFIED

Complete for V1 based on audited/tested social surfaces

Prohibited-content filtering

🟢 VERIFIED

Implemented and tested for comments, display name, username, and bio; 49-term production hard-block list installed

Reporting & moderation

🟢 VERIFIED

Lists, users, and comments are reportable; admin moderation removal/dismissal tested; V1 operational review process documented

In-app support/contact info

🟢 VERIFIED

Settings → Support → Contact Support verified end-to-end on iPhone; external Support URL/App Review contact remain submission tasks

Account deletion

🟢 VERIFIED

End-to-end iPhone deletion, Auth removal, cascade architecture, and zero-orphan database audit verified

Sign-out/session lifecycle

🟢 VERIFIED

Clean sign-out and sequential account switching verified on iPhone with no stale user state or Supabase/permission errors; repeat on release candidate

Authentication

🟢 VERIFIED

Email sign-up/verification/sign-in, password recovery/reset/change, and session lifecycle verified; reviewer/demo credentials remain a 6.2 submission task

Privacy policy

🟡 VERIFY

Audit against actual V1 data practices

App Privacy disclosures

🟡 VERIFY

Complete against release build, including Amplitude product analytics

Terms/community standards

🟡 VERIFY

Confirm published and accessible

Release regression testing

🟡 VERIFY

Required on final build

Error/empty/loading states

🟡 VERIFY

Final UX pass required

Production security/config

🟡 VERIFY

Final Supabase/RLS/secrets audit required

Third-party API/content compliance

🟡 VERIFY

Provider-by-provider audit required

App metadata/assets

🟡 VERIFY

Finalize before submission

App Store Connect submission data

⚪ SUBMISSION TASK

Complete after app-side blockers are closed

Immediate Next Step

Audit and prepare Top3's V1 Privacy Policy against the app's actual data practices.

Document the personal/profile/social/UGC data Top3 collects and processes, account and deletion behaviour, Supabase usage, applicable third-party APIs/SDKs, retention/deletion practices, and user contact/support information. Then publish the policy at a stable public URL for use in-app and in App Store Connect.

Definition of V1 Launch-Ready

Top3 is ready to enter final App Store submission preparation when:

No item in this document remains 🔴 BLOCKER.

Every app-side 🟡 VERIFY item that could cause rejection has been explicitly tested/audited and converted to 🟢 VERIFIED or consciously resolved.

A release-candidate build passes the complete device regression test.

Production privacy/legal/support URLs and App Store Connect disclosures are complete and accurate.

App Review can sign in and exercise the complete V1 experience using the supplied review credentials/instructions.

This checklist should be updated as each requirement is verified. It is the release gate for Top3 V1, not the long-term product roadmap.