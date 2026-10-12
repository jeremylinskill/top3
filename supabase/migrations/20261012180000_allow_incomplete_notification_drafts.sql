-- Allow administrators to save incomplete notification drafts.
-- All non-draft campaigns must remain fully populated.

alter table public.notification_campaigns
  alter column title drop not null,
  alter column message drop not null,
  alter column category_id drop not null,
  alter column destination_kind drop not null;

alter table public.notification_campaigns
  drop constraint notification_campaigns_title_check,
  drop constraint notification_campaigns_message_check,
  drop constraint notification_campaigns_category_check,
  drop constraint notification_campaigns_destination_check;

-- Empty or missing copy is allowed only for drafts.
-- Character limits continue to apply to all campaigns.

alter table public.notification_campaigns
  add constraint notification_campaigns_title_check
  check (
    (
      status = 'draft'
      and (
        title is null
        or length(btrim(title)) <= 100
      )
    )
    or
    (
      status <> 'draft'
      and title is not null
      and length(btrim(title)) between 1 and 100
    )
  ),

  add constraint notification_campaigns_message_check
  check (
    (
      status = 'draft'
      and (
        message is null
        or length(btrim(message)) <= 220
      )
    )
    or
    (
      status <> 'draft'
      and message is not null
      and length(btrim(message)) between 1 and 220
    )
  ),

  add constraint notification_campaigns_category_check
  check (
    (
      status = 'draft'
      and category_id is null
    )
    or
    (
      category_id is not null
      and category_id in (
        'albums',
        'artists',
        'books',
        'games',
        'movies',
        'songs',
        'tv'
      )
    )
  ),

  -- A draft may have no destination, or a complete
  -- valid destination. Partial destination identities
  -- are never stored.
  add constraint notification_campaigns_destination_check
  check (
    (
      status = 'draft'
      and category_id is null
      and destination_kind is null
      and option_id is null
    )
    or
    (
      category_id is not null
      and destination_kind is not null
      and (
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
      )
    )
  );
