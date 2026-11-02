-- Add genre destinations to admin notification campaigns without changing
-- existing campaign content, audiences, scheduling, or send permissions.
-- Genre option_id stores a TOP3_CATEGORIES topic ID (not collection_options).
-- Server-side Edge Functions validate category/genre membership before writes.

alter table public.notification_campaigns
  drop constraint notification_campaigns_destination_check;

alter table public.notification_campaigns
  add constraint notification_campaigns_destination_check
  check (
    (status = 'draft' and category_id is null and destination_kind is null and option_id is null)
    or
    (category_id is not null and destination_kind is not null and (
      (destination_kind = 'overall' and option_id is null)
      or
      (destination_kind in ('type', 'theme') and option_id is not null
       and length(btrim(option_id)) between 1 and 128)
      or
      (destination_kind = 'genre' and option_id is not null
       and option_id ~ '^[a-z0-9][a-z0-9-]{0,127}$')
    ))
  );
