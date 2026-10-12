-- User-submitted musician catalogue suggestions.
-- Submissions are created through a server-side Edge Function.
-- No direct client access is granted.

create table public.musician_suggestions (
  id uuid primary key default gen_random_uuid(),

  submitted_by uuid
    references auth.users(id)
    on delete set null,

  musician_name text not null,
  role text not null,
  known_for text,

  review_status text not null default 'pending',

  notification_status text not null default 'pending',
  notification_sent_at timestamptz,

  created_at timestamptz not null default now(),

  constraint musician_suggestions_name_check
    check (
      length(btrim(musician_name)) between 1 and 120
    ),

  constraint musician_suggestions_role_check
    check (
      role in (
        'vocalist',
        'guitarist',
        'drummer',
        'bassist',
        'mc',
        'dj'
      )
    ),

  constraint musician_suggestions_known_for_check
    check (
      known_for is null
      or length(known_for) <= 300
    ),

  constraint musician_suggestions_review_status_check
    check (
      review_status in (
        'pending',
        'approved',
        'rejected'
      )
    ),

  constraint musician_suggestions_notification_status_check
    check (
      notification_status in (
        'pending',
        'sent',
        'failed'
      )
    )
);

create index musician_suggestions_review_idx
  on public.musician_suggestions (
    review_status,
    created_at desc
  );

-- Prevent repeated pending submissions of the same
-- musician and role by the same user.

create unique index musician_suggestions_user_pending_key
  on public.musician_suggestions (
    submitted_by,
    role,
    lower(btrim(musician_name))
  )
  where
    submitted_by is not null
    and review_status = 'pending';

alter table public.musician_suggestions
  enable row level security;

-- Only the privileged server-side function can access
-- submissions. There are no user-facing RLS policies.

revoke all on public.musician_suggestions
  from anon, authenticated;

grant select, insert, update, delete
  on public.musician_suggestions
  to service_role;
