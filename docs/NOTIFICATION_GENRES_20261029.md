# Notification Composer: Genres (local candidate)

> **Historical implementation/checklist snapshot.** Some "local-only" or
> "not yet deployed" statements below describe the time this was written,
> not the November 1 backend status. See
> [Notification operations (1.1.2)](NOTIFICATION_1_1_2_STATUS.md) and
> [Release status (1.1.2)](RELEASE_1_1_2_STATUS.md). Keep the safety rules.


Adds all 84 existing `TOP3_CATEGORIES.topics` genre choices across the 7 supported
categories (excludes Podcasts, which is not enabled as a notification category).
Genres are a separate destination `kind: "genre"`; `optionId` is the canonical
category topic ID. Types and Themes remain unchanged.

## Local-only installation

The guarded installer checks exact original file SHA-256 values before replacing
anything, backs up originals inside `.git`, verifies the generated server-side
allowlist against `TOP3_CATEGORIES`, and adds one new migration. It never
connects to Supabase, deploys code, schedules notifications, or builds apps.

## Rollout — do not skip

1. Check local TypeScript and review the diff. Apply the **new** SQL migration
   `20261029223000_allow_notification_genre_destinations.sql` to Development
   only after a fresh backup/preflight.
2. Deploy together to Development: `manage-notification-campaigns`,
   `send-campaign-notification`, `process-scheduled-test-notifications`, and
   `process-scheduled-broadcast-notifications`. The worker's fail-closed
   canary/full-audience protections are retained. Keep broadcast delivery OFF.
3. Test one admin-only immediate test send and one scheduled test send with a
   genre destination. Verify tapping a notification opens the corresponding
   existing or new genre Top 3 collection on **both** iOS and Android.
4. Once Development checks pass, plan a separately guarded Production migration
   and matching Edge Function deploy; do not enable automatic broadcast delivery.
5. **Compatibility:** Older published mobile app versions don't parse `genre`
   destinations and will not open a genre Top 3 from a push tap. Wait for
   updated iOS/Android clients to be broadly adopted before all-user genre
   notifications, or provide a backwards-compatible route through a separate
   reviewed change.

The existing experimental immediate **all-user** broadcast path
(`send-broadcast-notification`) is *not* enabled/deployed by this patch. This
change covers immediate **test-device** notifications and scheduled test/all-
user campaigns through the existing guarded workers.
