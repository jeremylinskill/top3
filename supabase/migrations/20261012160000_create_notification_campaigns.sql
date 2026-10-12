-- Administrative notification campaigns.
-- Drafts, scheduling, test history, and future broadcasts.
-- Access is restricted to privileged server-side functions.

create table public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),

  created_by uuid
    references auth.users(id)
    on delete set null,

  title text not null,
  message text not null,

  category_id text not null,
  destination_kind text not null,
  option_id text,

  audience text not null default 'test',
  status text not null default 'draft',

  scheduled_at timestamptz,
  started_at timestamptz,
  sent_at timestamptz,

  target_count integer not null default 0,
  accepted_count integer not null default 0,
  failed_count integer not null default 0,

  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_campaigns_title_check
    check (length(btrim(title)) between 1 and 100),

  constraint notification_campaigns_message_check
    check (length(btrim(message)) between 1 and 220),

  constraint notification_campaigns_category_check
    check (
      category_id in (
        'albums',
        'artists',
        'books',
        'games',
        'movies',
        'songs',
        'tv'
      )
    ),

  constraint notification_campaigns_destination_check
    check (
      (
        destination_kind = 'overall'
        and option_id is null
      )
      or
      (
        destination_kind in ('type', 'theme')
        and option_id is not null
        and length(btrim(option_id)) between 1 and 128
      )
    ),

  constraint notification_campaigns_audience_check
    check (audience in ('test', 'all')),

  constraint notification_campaigns_status_check
    check (
      status in (
        'draft',
        'scheduled',
        'sending',
        'sent',
        'failed',
        'cancelled'
      )
    ),

  constraint notification_campaigns_schedule_check
    check (
      status <> 'scheduled'
      or scheduled_at is not null
    ),

  constraint notification_campaigns_sent_check
    check (
      status <> 'sent'
      or sent_at is not null
    ),

  constraint notification_campaigns_counts_check
    check (
      target_count >= 0
      and accepted_count >= 0
      and failed_count >= 0
    ),

  constraint notification_campaigns_error_check
    check (
      last_error is null
      or length(last_error) <= 1000
    )
);

-- History browsing: newest campaigns first.

create index notification_campaigns_created_idx
  on public.notification_campaigns (
    created_at desc,
    id desc
  );

-- Future scheduler: quickly find campaigns ready to send.

create index notification_campaigns_schedule_idx
  on public.notification_campaigns (
    scheduled_at,
    id
  )
  where status = 'scheduled';

-- No direct access for ordinary app users.
-- Administrator access will be checked by Edge Functions.

alter table public.notification_campaigns
  enable row level security;

revoke all on public.notification_campaigns
  from anon, authenticated;

grant select, insert, update, delete
  on public.notification_campaigns
  to service_role;
