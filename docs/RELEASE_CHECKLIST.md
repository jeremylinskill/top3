# Top 3 — Release Checklist

Status: Active preparation
Last Updated: October 21, 2026
Baseline Commit: `76d4836`
Release Scope: Next iOS update and initial Android / Google Play release

## Purpose

This is the source of truth for work required to move completed
development changes into production and publish app-store releases.

It tracks release readiness, not general product development.

- Current implementation: `../CURRENT_STATE.md`
- Product priorities: `ROADMAP.md`
- Technical priorities: `TECHNICAL_ROADMAP.md`
- Completed milestones: `CHANGELOG.md`
- Historical iOS V1 launch gate: `V1_LAUNCH_BLOCKERS.md`

A feature is not considered released merely because its code has
been committed or its migration has been applied to Development.

Each platform may be released independently. Completing an iOS
requirement does not automatically complete the Android requirement.

## Status Conventions

- [x] Completed and verified at the specified stage
- [ ] Outstanding, unverified, or not yet applicable

Never check off a Production deployment, release build, store
submission, or store publication without confirming that specific
action was successful.

## Environment Separation

Development Supabase:
`kkltzygebomopysklaqq`

Production Supabase:
`nxtowcheatxouypzqkzc`

The locally linked Supabase CLI normally targets Development.

Before any backend mutation, explicitly confirm the target project.
Never promote changes to Production as part of routine development.

Do not store credentials, signing keys, or privileged secrets
in this document.

## Completed in Development — Not Yet Released

- [x] Implement Album Type: Soundtracks.
- [x] Remove Soundtrack from the standard Album Genre choices.
- [x] Preserve legacy Soundtrack list compatibility in application logic.
- [x] Apply `20261020203848_add_album_soundtracks_type.sql`
      to Development.
- [x] Apply `20261021121008_seed_album_soundtracks_suggestions.sql`
      to Development.
- [x] Add 20 curated Soundtracks search suggestions.
- [x] Add Soundtracks-specific album search filtering.
- [x] Correct long search-query field behaviour on iOS.
- [x] Typecheck and test the completed Soundtracks changes.
- [x] Commit and push the completed work (`76d4836`).

These entries do not imply that Production has been updated or
that the currently published App Store binary includes these changes.

## Album Themes — Development and Release Tracking

**Status:** Nine Themes, Featured discovery, and suggestions verified in Development; Trending qualification QA and Production release pending.

### Agreed Themes

- No-Skip Albums
- Albums That Changed My Life
- Most Underrated Albums
- Albums That Defined My Youth
- Best Album Artwork
- Guilty Pleasure Albums
- Perfect Road Trip Albums
- Albums That Got Me Through Tough Times
- Albums I Wish I Could Hear Again for the First Time

### Development

- [x] Define all nine Album Themes.
- [x] Add collection-option fallbacks.
- [x] Preserve unrestricted album search for Themes.
- [x] Avoid generic, potentially misleading Album suggestions.
- [x] Define five editorial Featured Album Themes.
- [x] Enable Trending eligibility for all nine Album Themes.
- [x] Extend Featured selection to mix editorial and eligible Trending Themes.
- [x] Prepare 135 curated search suggestions (15 per Theme).
- [x] Replace the song-only suggestion with a valid album using a corrective migration.
- [x] Verify all 135 Development suggestion records.
- [x] Pass all eight Album Themes in-app QA checks.
- [ ] Test qualified Trending Theme promotion with real or controlled activity.
- [ ] Verify the saved Theme association persists through List editing.
- [x] Create the Featured/suggestions migration.
- [x] Apply Featured/suggestions migration to Development.
- [x] Verify five editorial Featured and nine Browse Themes.
- [x] Verify 15 suggestions per Theme and initial five-chip display.
- [x] Verify suggestion shuffling and normal album searching.
- [x] Connect Trending to server-driven Theme options across categories.
- [x] Remove the requirement for three different Themes to qualify.
- [x] Validate unique-creator ranking and 30-day expiry using controlled tests.
- [x] Validate the seven-day distinct-creator ranking tiebreaker.
- [x] Add a dedicated paginated published Theme activity query.
- [x] Verify 1,203 simulated activity records across three pages.
- [x] Validate inactive, disabled and cross-category exclusions.
- [ ] Verify end-to-end Featured promotion with qualifying published activity.
- [ ] Evaluate server-side Trending aggregation as usage grows.
- [ ] Verify editorial fallback with insufficient activity.
- [x] Document the Overall-vs-Theme product rule.
- [x] Create `20261021231750_add_album_themes.sql`.
- [x] Apply Album Themes migration to Development.
- [x] Verify nine active Themes in Development.
- [x] Test Theme selection and full Create flow.
- [ ] Verify normal album search within every Theme.
- [ ] Verify saved List Theme association and editing.
- [x] Regression-test Album Types and Overall Albums.
- [x] Complete documentation and commit to GitHub.

### Production — separate approval required

- [ ] Review and approve all three Album Themes migrations.
- [ ] Apply all three approved Album Themes migrations to Production.
- [ ] Verify Production collection-option records.
- [ ] Include and test Themes in upcoming iOS and Android releases.

Themes are subjective prompts, not independently verifiable
album classifications. They intentionally do not narrow
Apple Music results.

---

## Live Albums — Development and Release Tracking

**Status:** Implemented, deployed and tested in Development; Production release pending.

### Development

- [x] Add Live Albums Type fallback and search routing.
- [x] Add conservative live title/genre classification.
- [x] Add 20 initial curated search prompts.
- [x] Create `20261021221527_add_album_live_type.sql`.
- [x] Create `20261021221528_seed_album_live_suggestions.sql`.
- [x] Apply both Live Albums migrations to Development.
- [x] Deploy updated `apple-music-search` to Development.
- [x] Verify sampled Live Albums search results and classification.
- [x] Verify suggestions, shuffling and suggestion selection.
- [ ] Verify empty-result messaging for unsuccessful Live Albums searches.
- [x] Test selecting, ranking, saving, publishing and editing Live Albums.
- [x] Complete all seven Live Albums in-app checks.
- [x] Verify regular Albums, Soundtracks and Compilations regressions.

### Production — pending separate approval

- [ ] Review and approve both Live Albums migrations.
- [ ] Apply the approved migrations to Production.
- [ ] Deploy the compatible Apple Music Edge Function.
- [ ] Verify production-connected release candidates.
- [ ] Include the tested feature in the next store releases.

Apple Music album resources do not provide a direct `isLive`
Boolean. Title/genre evidence may miss live recordings whose
names don't identify them. Artist Live Albums views may provide
a future source for improved classification.

## Compilation Albums — Development and Release Tracking

**Status:** Core feature implemented, deployed, and tested in Development; Production release pending.

### Local implementation

- [x] Add Compilations to Album Type fallbacks.
- [x] Create `20261021184317_add_album_compilations_type.sql`.
- [x] Preserve Apple Music `isCompilation` metadata.
- [x] Add compilation-only album search handling.
- [x] Pass TypeScript and whitespace checks.

### Development validation

- [x] Confirm the upstream Apple Music search candidate limit (25).
- [x] Verify compilation metadata survives album enrichment.
- [x] Test various-artists collections and greatest-hits albums.
- [x] Confirm useful results after filtering and deduplication.
- [x] Verify Compilation suggestion display, shuffling, and search selection.
- [ ] Verify empty-result messaging when no Compilations match.
- [x] Evaluate curated search terms before seeding suggestions.
- [x] Create `20261021213702_seed_album_compilations_suggestions.sql` with 20 search suggestions.
- [x] Apply Compilations suggestion migration to Development.
- [x] Verify the 20 suggestions appear and initiate correct searches.

Initial Development search findings:
- `Greatest Hits`: 10 compilation results.
- `Motown`: 10 compilation results.
- `NOW`: 4 compilation results.
- `NOW That's What I Call Music`: 0 compilation results.
- `Various Artists`: 3 compilation results.
- Regular `Abbey Road` search: 10 results returned.
- Some various-artists albums have `isCompilation=false`;
  retain Apple's classification rather than including them automatically.
- [x] Confirm the target Supabase project is Development.
- [x] Apply the Compilations Type migration to Development.
- [x] Deploy initial `apple-music-search` changes to Development.
- [x] Re-deploy `apple-music-search` to Development after
      excluding identifiable Soundtracks from Compilations.
- [x] Verify Soundtracks are excluded from Compilations while
      general Album and Soundtracks searches remain unchanged.
- [x] Test Create, search, ranking, saving, and editing.
- [x] Pass all nine in-app Compilations regression tests.

### Production release dependencies

- [ ] Review and approve both Compilations migrations for Production.
- [ ] Apply both approved Compilations migrations to Production.
- [ ] Deploy the compatible `apple-music-search` Edge Function
      to Production after verification.
- [ ] Confirm Compilations search works in release candidates.
- [ ] Verify regular Album and Soundtracks searches remain unaffected.
- [ ] Confirm the published iOS update and initial Android release
      include the tested functionality.

Do not mark Development deployment complete based solely on
local implementation. Production promotion requires separate approval.

## Production Database and Backend

- [ ] Inventory every migration added since the last confirmed
      Production database promotion.
- [ ] Confirm Production migration history and current schema.
- [ ] Confirm which backend changes are already present in Production.
- [ ] Audit all outstanding migrations for compatibility and safety.
- [ ] Review how existing Soundtrack Genre lists are stored.
- [ ] Design and test migration of those lists to Soundtracks Type.
- [ ] Preserve original list IDs, rankings, ownership, social
      interactions, and historical references.
- [ ] Verify old published iOS builds remain compatible during rollout.
- [ ] Test the migration against representative Development data.
- [ ] Define a Production backup and recovery procedure.
- [ ] Explicitly approve Production migration scope and timing.
- [ ] Apply outstanding approved migrations to Production.
- [ ] Verify Soundtracks Type and all 20 curated suggestions in Production.
- [ ] Verify existing Soundtrack lists and their social activity.
- [ ] Inventory Edge Function differences between Development and Production.
- [ ] Deploy only Edge Function changes actually required by this release.
- [ ] Review any Vault-backed push migration before Production promotion.
- [ ] Verify required Production Vault values, function settings,
      webhook configuration, and environment secrets before changes.
- [ ] Confirm Production authentication, Storage, RLS, and push delivery.

Do not assume the Development and Production backend states match.

## Release Scope and Build Planning

- [ ] Establish the exact Git commit intended for each store release.
- [ ] Compare the release baseline with the currently published iOS build.
- [ ] Identify all newly introduced functionality needing regression tests.
- [ ] Identify changes requiring a native rebuild versus Metro refresh.
- [ ] Include the pending Android home-screen icon replacement.
- [ ] Review Android native configuration and final permission manifest.
- [ ] Confirm microphone permissions are absent unless intentionally required.
- [ ] Review Android navigation, system bars, keyboard and edge-to-edge UI.
- [ ] Batch native-requiring changes to conserve monthly EAS builds.
- [ ] Explicitly approve any EAS build before starting it.
- [ ] Confirm production EAS environment values and intended backend.
- [ ] Verify the actual published iOS app's Supabase environment;
      do not infer this solely from current EAS configuration.

## iOS App Store Update

- [ ] Confirm release version and iOS build number.
- [ ] Prepare a production-configured release candidate.
- [ ] Test the release candidate on a physical iPhone.
- [ ] Verify compatibility with Production backend.
- [ ] Verify new functionality and existing critical journeys.
- [ ] Review App Store privacy disclosures, age rating and metadata.
- [ ] Update release notes and screenshots if needed.
- [ ] Complete TestFlight verification.
- [ ] Submit the new version for App Review.
- [ ] Confirm approval and planned release timing.
- [ ] Confirm the updated version is live in the App Store.

## Android / Google Play Launch

- [ ] Verify application ID, signing credentials and Play Console setup.
- [ ] Confirm final app icon, splash assets and adaptive icon.
- [ ] Confirm Android permissions and privacy declarations.
- [ ] Test device navigation and safe-area handling.
- [ ] Test keyboard and search-field behaviour.
- [ ] Test notification permissions, delivery, display and tap routing.
- [ ] Test installation, startup, onboarding and account lifecycle.
- [ ] Verify Production Supabase connectivity.
- [ ] Produce and test the intended Android release build.
- [ ] Prepare listing content, screenshots and store assets.
- [ ] Complete Data safety, content rating and relevant policy forms.
- [ ] Check the account's actual Google Play testing eligibility
      and any required closed-testing process.
- [ ] Complete the required testing and production-access steps.
- [ ] Submit and verify the initial public Google Play release.

## Cross-Platform Regression

- [ ] Signed-out onboarding and creation of the first list.
- [ ] Email confirmation, sign-in and password recovery.
- [ ] Apple authentication on iOS and Google authentication where supported.
- [ ] Account deletion and associated authorization cleanup.
- [ ] Create, edit, save, publish and delete lists.
- [ ] Category, Type, Theme and search flows.
- [ ] Soundtracks filtering, suggestions and existing migrated lists.
- [ ] Feed, Discover, Overall rankings and Taste Match.
- [ ] Profiles, follows, likes, comments and blocking.
- [ ] Notifications, push-token lifecycle and deep-link navigation.
- [ ] Audio previews, trailers and external-provider errors.
- [ ] Light and dark mode and accessibility-relevant layouts.
- [ ] Privacy, moderation and reporting flows.
- [ ] Analytics and major app error monitoring.

Run and record the applicable automated checks, device testing
and any release-specific regression results.

## Rollout and Post-Release Checks

- [ ] Confirm deployment order and any required maintenance window.
- [ ] Verify Production database changes before dependent app features launch.
- [ ] Confirm rollback and incident-response options.
- [ ] Verify release builds on production-connected devices.
- [ ] Monitor authentication, crash reports, search and push behaviour.
- [ ] Verify migrated user lists and newly created Soundtracks lists.
- [ ] Record final store versions, release dates and Git commits.
- [ ] Update `CURRENT_STATE.md`, `CHANGELOG.md`, and relevant documentation.
- [ ] Close completed items only after verifying the release outcome.

## Release Notes and Maintenance Rules

Update this file whenever a feature creates a new production migration,
Edge Function dependency, native build requirement, store disclosure,
compatibility concern, testing requirement or release blocker.

Every new release task should identify the required action and remain
unchecked until verified.

Keep implementation details in the documents that already own them.
Do not duplicate entire feature specifications here.

Review this checklist at each release checkpoint, and distinguish
development completion from Production deployment and store publication.
