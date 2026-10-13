-- Associate scheduled campaigns with one registered test device.
-- If the device is removed, the future worker must fail safely.

alter table public.notification_campaigns
  add column target_push_token_id uuid
    references public.push_tokens(id)
    on delete set null;

-- Broadcast scheduling is deliberately disabled.
-- Enabling it later requires a separately reviewed migration.

alter table public.notification_campaigns
  add constraint notification_campaigns_scheduled_test_only_check
    check (
      status <> 'scheduled'
      or audience = 'test'
    );
