# Top 3 — Release 1.1.2 Status and Handoff

**Snapshot:** November 1, 2026 (Toronto local date)\
**Branch:** `main` (latest Git commit not reverified; several release changes were uncommitted when builds were prepared)\
**Release status:** Store submissions under review; **not publicly released**.\
**Source of truth:** This checkpoint supersedes conflicting release-status statements in October 21 historical documentation. It does not retroactively mark older feature-by-feature validation checklists complete.

## Store/build matrix

| Platform | Build | Service / channel | Submission at this checkpoint | Public status |
| --- | --- | --- | --- | --- |
| iOS | `1.1.2` build `17` | EAS `production`; Production Supabase; OTA channel `production` | **Submitted November 1, 2026; Waiting for Review** in App Store Connect | **Not yet released**; *Manually release this version* selected |
| Android | `1.1.2` versionCode `6` | EAS `closed-test`; Development Supabase; OTA channel `closed-test` | **In review** on Google Play **Closed testing – Alpha** | **Not public**; approval rolls out to closed testers with managed publishing off |

- iOS EAS build ID: `28f9dd96-3630-4a17-950d-ee39193b42fd`.
- Android EAS build ID: `3ffc5106-282f-4a12-9dfa-9b4082fc9903`.
- iOS new binary is required for its OTA support; existing released iOS binaries were not retroactively updated.
- The app uses an app-version-based OTA runtime policy. Version `1.1.2` updates cannot target `1.1.1` binaries; Android closed testers need the updated store build. Do not make a JavaScript OTA publication without confirming the correct channel and runtime.
- New Android **public/Production** build must use Production EAS environment and Production Supabase. Do **not** promote the Development-connected closed-test binary to public Production.
- Google Play Production eligibility (including the required opted-in testing window and any application for access) **was not verified at this checkpoint**.

## Implemented in the 1.1.2 application source

- **People discovery:** Discover More People preview stays at three entries, with conditional **See all** when more eligible accounts exist; dedicated paged screen with community search, profile navigation, Follow controls and current connection status.
- **Similar Taste:** Discover preview stays at three matches; conditional **See all** leads to a scrollable Taste Match ranking screen with percentages and shared-pick explanations. See-all card alignment matches the Discover preview.
- **Navigation:** Discover tab icon changed from compass variants to Ionicons `search` / `search-outline`. New discovery screens use the existing collapsible Top 3/back-button header style and shared section typography.
- **Onboarding:** Updated onboarding and Taste Match onboarding, including `app/onboarding-create-topic.tsx`; included in the built 1.1.2 source. A complete fresh-account walkthrough on both release builds was **not** recorded here.
- **Notification badges:** App-icon badge synchronizes from the visible unread count on foreground/notification refresh; sign-out clears. Push server includes unread badge counts for social notifications and in-app announcements. Notifications from blocked actors are excluded; actor-less announcements count. Test-only pushes do not increment unread counts. iOS closed-app badge delivery and Android launcher badge presentation need device confirmation when a suitable new notification occurs; do **not** claim those were tested.
- **Admin notification management:** Delete Draft with confirmation, removing it from Manage after success. Backend enforces administrator, creator and `draft`-only deletion. The new delete flow was **functionally checked in Development**. Scheduled/sent/failed/cancelled/sending campaigns cannot be deleted by this action.
- **Music:** Updated Apple Music search/ranking/genre-filtering function aligned to Production.
- **Notifications:** Scheduled announcement in-app records are created before corresponding pushes; delivery is suppressed if announcement creation fails, without relaxing broadcast safeguards.

All local TypeScript checks reported for these changes passed. This is **static validation**, not proof of every iOS/Android visual or fresh-account behaviour.

## Backend alignment and safety

- At the November 1 alignment audit, Development and Production reported **79 matching migration versions**. Matching history does **not** independently prove every live schema object, RLS policy or data row is identical.
- Reviewed shared Edge Functions were aligned for the release; targeted Production deployments verified the newer `apple-music-search`, both badge-enabled push/broadcast functions, and `manage-notification-campaigns` (Delete Draft). Other previously identical shared functions were deliberately left untouched.
- The older `send-broadcast-notification` function is **Development-only** and intentionally **not** promoted: its immediate all-user path is disabled in the UI and its delivery model bypasses newer safeguards.
- Production scheduled-broadcast delivery was disabled after the successful restricted canary. Production-wide audience and general claims remained disabled. **Do not enable delivery, full-audience or general claims as part of the store release**. The canary does not authorize a broad send.
- A Production canary demonstrated one accepted push and one stored in-app announcement; the currently published 1.1.1 client did not yet include the in-app announcement display. The updated client has not yet been publicly released.
- Keep separate Development/Production Supabase projects, Auth users, content, push tokens, analytics and privileged secrets. **Production is authoritative** for overlapping accounts, profiles, collections and interactions. A later Android Development-to-Production import must include only genuinely new, nonconflicting records, preserve relationships, back up first, and never overwrite Production.
- No secret values, API keys, private signing credentials or recovery codes are recorded in this document.

## Actions remaining

1. **iOS:** Await review; release manually only when ready. Monitor review feedback and ensure correct reviewer access.
2. **Android closed testing:** Await approval and confirm testers can update to versionCode 6. Do not assume testing-period eligibility merely because a new test build is approved.
3. **Android public launch:** Confirm Google Play Production access; coordinate a separate Production-connected Android build and submissions. Review any new-only Development data migration as a distinct, backed-up operation.
4. **Focused client checks:** Confirm new people-discovery navigation and follow interactions, onboarding entry path, and home-screen badges on actual iOS/Android devices as applicable. Reuse existing passed test evidence; do not rerun unchanged backend tests.
5. **Release completion:** Record actual approvals, first public-availability dates, any new build IDs, and the Git release commit. Update this document only with verified results.

## Operational links

- [Release checklist](RELEASE_CHECKLIST.md)
- [Current state](../CURRENT_STATE.md)
- [Changelog](CHANGELOG.md)
- [Roadmap](ROADMAP.md)
- [Notification deployment and safeguards](NOTIFICATION_1_1_2_STATUS.md)
