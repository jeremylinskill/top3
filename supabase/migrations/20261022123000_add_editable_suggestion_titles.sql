-- Make collection suggestions easier to administer in Supabase.
-- Development first. Existing IDs and user Lists are unchanged.

alter table public.collection_option_suggestions
  add column suggestion_title text;

-- Populate the editable column from the existing JSON.
update public.collection_option_suggestions
set suggestion_title = nullif(item->>'title', '')
where item ? 'title';

-- Synchronize changes in either direction.
create function public.sync_collection_suggestion_title()
returns trigger
language plpgsql
as $function$
begin
  if TG_OP = 'INSERT' then
    if nullif(btrim(new.suggestion_title), '') is not null then
      new.item := jsonb_set(
        coalesce(new.item, '{}'::jsonb),
        '{title}',
        to_jsonb(new.suggestion_title),
        true
      );
    else
      new.suggestion_title := nullif(new.item->>'title', '');
    end if;

  elsif new.suggestion_title is distinct from old.suggestion_title then

    if new.suggestion_title is null
       or btrim(new.suggestion_title) = '' then
      raise exception 'Suggestion title cannot be empty';
    end if;

    new.item := jsonb_set(
      coalesce(new.item, '{}'::jsonb),
      '{title}',
      to_jsonb(new.suggestion_title),
      true
    );

  elsif new.item is distinct from old.item then
    new.suggestion_title := nullif(new.item->>'title', '');
  end if;

  return new;
end;
$function$;

create trigger sync_collection_suggestion_title_trigger
before insert or update of item, suggestion_title
on public.collection_option_suggestions
for each row
execute function public.sync_collection_suggestion_title();

comment on column
  public.collection_option_suggestions.suggestion_title
is 'Editable title automatically synchronized with item.title';

-- Verify all existing titles were copied correctly.
do $verify$
begin
  if exists (
    select 1
    from public.collection_option_suggestions
    where coalesce(suggestion_title, '')
      <> coalesce(item->>'title', '')
  ) then
    raise exception 'Suggestion title synchronization check failed';
  end if;
end;
$verify$;
