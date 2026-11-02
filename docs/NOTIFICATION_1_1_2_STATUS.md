# Top 3 — Notification Operations / 1.1.2 Checkpoint

**As of November 1, 2026.** This is an operational snapshot, not permission to send or enable live broadcasts. See [1.1.2 release status](RELEASE_1_1_2_STATUS.md) and retain the historical [canary safeguards](SCHEDULED_BROADCAST_CANARY_SAFETY.md).

## What is deployed

- `send-push-notification`: Deployed in both Development and Production with badge support counting **visible unread** notifications, excluding blocked `actor_user_id` senders while retaining actor-less announcement records. On count-query failure it omits the badge rather than sending an invented count.
- `process-scheduled-broadcast-notifications`: Deployed in both environments with the same badge calculation. Creates in-app announcement recipients **before** push delivery. If in-app creation fails for a claimed campaign, corresponding pushes are not sent. Existing no-automatic-retry, canary and all-audience protection remains.
- `manage-notification-campaigns`: Deployed in both environments with draft-only deletion. Authorizes the administrator and verifies the draft belongs to the caller; rejects statuses other than `draft`.
- Client `context/notification-context.tsx`: App-icon badge follows unread notification state while running/returning to foreground and clears on sign-out. Included in the 1.1.2 mobile builds, **not** retrofitted to the currently published iOS 1.1.1 binary.
- The 1.1.2 app includes in-app announcements; their appearance in the live App Store app awaits the new client release.

## Badge semantics and known limits

1. One source of truth is the visible unread in-app notification count, not the number of pushes accepted by Expo.
2. Notifications from blocked actors are excluded. Announcements without an actor remain eligible.
3. A test-only push does not create an unread notification and should not increment the app-icon badge.
4. On iOS, a server-provided numeric push `badge` can refresh the home-screen icon while the app is not open. A recipient who disables notifications or badge permission may not see it; this behaviour has not yet been confirmed on the new store binary.
5. Android icon dots/counts vary with launcher, OS version and notification permission; the app cannot guarantee iOS-style numeric badges on every launcher.
6. Push acceptance by Expo is **not** proof that the message appeared on a device; do not add redundant delivery cycles absent a specific new regression risk.

## Draft deletion

- Location: administrator Notification Composer → Manage → Delete Draft, with explicit confirmation.
- Only draft campaigns created by the authenticated administrator are eligible; not scheduled, sending, sent, cancelled or failed campaigns.
- Development UI workflow was verified once with a disposable draft; Production function source was then guarded, backed up and verified identical to the reviewed Development implementation.
- This action is **permanent** for a draft. Cancellation or future archiving are separate product operations.

## Production scheduled broadcast restrictions

- An earlier single-device Production canary succeeded: one accepted push and one in-app announcement.
- Following that check, delivery was disabled again; full-audience and general-claims settings stayed disabled. Canary configuration may still be present. Do not infer any permission to operate from presence of deployed function code.
- **Do not run broad delivery, enable cron, change secret values, or toggle guard flags** as part of 1.1.2 launch preparation.
- The historical implementation candidate documents may refer to work as "not yet deployed"; those statements describe the time they were written. This current operational checkpoint supersedes them for **deployment status only**, not their safeguard rules.
- Production and Development have separate secrets/tokens, user accounts and notification records; never copy these across environments to enforce superficial parity.

## Remaining verification

- Physical-device presentation and permissions for home-screen badges after installing the new binary (iOS/Android as supported).
- Correct in-app announcement display in the released client, without triggering an additional broadcast solely for testing.
- Any later change to scheduled delivery requires separate user approval and a focused, reviewed operational plan.
