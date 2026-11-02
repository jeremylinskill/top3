# Top 3 v1.1.0 — guarded scheduled broadcasts

> **Historical implementation/checklist snapshot.** Some "local-only" or
> "not yet deployed" statements below describe the time this was written,
> not the November 1 backend status. See
> [Notification operations (1.1.2)](NOTIFICATION_1_1_2_STATUS.md) and
> [Release status (1.1.2)](RELEASE_1_1_2_STATUS.md). Keep the safety rules.


## Scope

Adds an administrator-only **All Users** scheduling option alongside **My Test Device**, a read-only audience preview, confirmed scheduled campaign creation, and a **separate** background broadcast worker. The legacy immediate-send experimental function is **not included or enabled**. The existing scheduled-test worker and its database claim functions are unchanged.

## Hard delivery safeguards

- Defaults **OFF**: `SCHEDULED_BROADCAST_CREATION_ENABLED`, `SCHEDULED_BROADCAST_DELIVERY_ENABLED`, `SCHEDULED_BROADCAST_ALLOW_GENERAL_CLAIMS`.
- A new, independent `SCHEDULED_BROADCAST_WORKER_SECRET` of at least 32 characters is mandatory; calls without the matching `x-scheduled-broadcast-worker-secret` header fail.
- Administrator identity is verified against `profiles.is_admin` on the server. A draft must belong to the administrator before scheduling. Broadcast preview checks registered tokens, uniqueness, and size; scheduling checks the same device count to detect audience changes.
- SQL claims due broadcasts **atomically**, one at a time, with `FOR UPDATE SKIP LOCKED` for general claims. The targeted QA route uses a separate exact-campaign claim function. It cannot substitute a different campaign.
- The worker checks administrator authorization again before delivery, refuses stale messages (more than 5 minutes late), invalid destinations, duplicate/invalid tokens, empty audiences or >500 registered devices.
- Sends in batches of 100 Expo push requests. Stops on uncertain HTTP responses and **never automatically retries** a claimed campaign. Failed/unconfirmed outcomes are recorded. `accepted_count` is Expo acceptance, **not device delivery**.
- Only registered push tokens are targeted. Opted-out devices should have their token deregistered by the existing settings workflow. An OS-level permission change after registration cannot be determined from this list alone.
- All-user target set is the set of registered devices at **delivery time**, which may differ from the preview at scheduling time.

## Not yet deployed or released

This local installer only adds code and a migration file. It does **not** migrate a database, deploy Edge Functions, configure secrets, configure cron, build apps, publish to stores, or send push messages.

1. Review and dry-run the migration against Development; back up database/schema before applying. **Do not apply Production automatically.**
2. Deploy the updated admin management function and the new broadcast worker to Development with JWT verification settings reviewed. Keep the three broadcast enable flags disabled while validating 401/403/503 access control and wrong-secret behavior.
3. For the first live Development canary, enable **creation** and **delivery** only after security checks; keep **general claims disabled**. Schedule a campaign against test-registered devices and call the worker with its exact `x-scheduled-broadcast-campaign-id` and secret. Check the database and physical device.
4. Test editing, rescheduling, cancelling and duplicate-claim suppression. Verify cancelled campaigns never get claimed, and a claimed campaign cannot be cancelled or resent. Test stale and invalid tokens without contacting Expo using safe fixtures.
5. Enable general claims and add a periodic scheduler **only after** the targeted Development canary is verified. Ensure no unintended Development audience is registered before enabling the scheduler.
6. Review `components/notification-history.tsx` (not included in the provided review archive) for full Manage/History UI parity, particularly cancellation and editing of audience `all`.
7. Audit push-token consent and cleanup/receipt tracking; Expo acceptance is not delivery. Scale to a durable queued worker **before** exceeding 500 registered devices. No broadcasts should be queued above that cap.
8. After Development QA and explicit user approval, separately back up/reconcile Production, deploy, and test against a **restricted Production canary**, **never a full-audience test**. Enable full Production scheduling only after sign-off.
9. Recheck TypeScript/lint on the actual project and regenerate EAS build archives before starting iOS Build 14 or updated Android closed-test build. Commit and push only after explicit review.

## Manual setup reminder

New worker function: `process-scheduled-broadcast-notifications`. It requires the matching `supabase/config.toml` section with `verify_jwt = false` because it uses an **independent secret header** (never a public invoke). The installer appends this section after validating the file. The new worker is **never** registered as a cron job by the installer.

**Release decision:** this is an implementation candidate, not proof of Production readiness or end-to-end delivery.
