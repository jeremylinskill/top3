# Top 3 — guarded Production single-device broadcast canary

> **Historical implementation/checklist snapshot.** Some "local-only" or
> "not yet deployed" statements below describe the time this was written,
> not the November 1 backend status. See
> [Notification operations (1.1.2)](NOTIFICATION_1_1_2_STATUS.md) and
> [Release status (1.1.2)](RELEASE_1_1_2_STATUS.md). Keep the safety rules.


This is a **local code candidate**, not a deployment or an authorized send.
The existing scheduled-test worker is unchanged. The new Production broadcast
worker remains inert without its independent secret and delivery flag.

## Fail-closed delivery modes

- `SCHEDULED_BROADCAST_SEND_MODE` is now **mandatory**. It must be `canary` or `full`.
- In `canary` mode, the worker requires three server-side exact UUIDs:
  `SCHEDULED_BROADCAST_CANARY_CAMPAIGN_ID`,
  `SCHEDULED_BROADCAST_CANARY_PUSH_TOKEN_ID`, and
  `SCHEDULED_BROADCAST_CANARY_USER_ID`.
- The request **must** specify the exact campaign UUID in the
  `x-scheduled-broadcast-campaign-id` header. General claims are refused.
- The exact `push_tokens.id` must belong to that user, and the scheduled
  campaign must have been created by that same user, who is an administrator.
  The worker queries exactly one token and sends to **only that token**.
- Canary mode refuses to operate if either the full-audience enable flag or
  general-claims flag is on.
- `full` mode requires the separate explicit
  `SCHEDULED_BROADCAST_FULL_AUDIENCE_ENABLED=true`, **in addition** to the
  existing secret, delivery flag and usual claim checks. Any leftover canary
  allowlist configuration also blocks full mode until deliberately removed.
- Missing or conflicting settings fail closed (HTTP 503/403). There is no
  default to full delivery and no automatic switch after the canary succeeds.

## Before a single-device Production test

1. Review and validate this source change in Development (including a targeted
   one-device delivery, with the same guard code deployed there).
2. Back up the currently deployed Production broadcast worker and verify that
   the broadcast flags and worker secret are still absent/disabled.
3. Deploy the modified worker **only** after reviewing the diff, with no new
   secrets, flags or cron jobs set during deployment. Confirm it stays inert.
4. Independently identify the intended admin user's `auth.users.id`, the
   matching registered `push_tokens.id`, and the exact scheduled campaign UUID
   using read-only queries. Do not disclose push token strings or secrets.
5. Only then configure the exact canary UUIDs, worker secret and delivery flag
   through a separately reviewed guarded procedure. Keep
   `SCHEDULED_BROADCAST_ALLOW_GENERAL_CLAIMS` and
   `SCHEDULED_BROADCAST_FULL_AUDIENCE_ENABLED` OFF.
6. Invoke only the specified due campaign. Expo ticket acceptance is not proof
   of physical-device receipt. Review History and the physical device.
7. Turn the delivery flag OFF after the canary and explicitly verify it.

**Operational note:** The saved campaign still has `audience = all` because it
exercises the broadcast RPC. In canary mode the actual recipient count is 1;
the UI's All Users label is not proof that all users received a message.
Never use a real user-facing broadcast for this verification.

This change does not configure a scheduler. It does not change the underlying
500-device full-audience limit, retry policy, database schema, or mobile UI.
