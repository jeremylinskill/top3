do $$
begin
  if to_regclass('public.saved_items') is null then
    create table public.saved_items (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      category text not null,
      item_id text not null,
      item_snapshot jsonb not null,
      source_collection_id uuid,
      source_user_id uuid,
      created_at timestamp with time zone not null default now(),
      source_topic text,

      constraint saved_items_user_category_item_unique
        unique (user_id, category, item_id),

      constraint saved_items_category_check
        check (
          category = any (
            array[
              'albums'::text,
              'artists'::text,
              'books'::text,
              'games'::text,
              'movies'::text,
              'podcasts'::text,
              'songs'::text,
              'tv'::text
            ]
          )
        ),

      constraint saved_items_snapshot_id_check
        check (
          item_snapshot ->> 'id' = item_id
        ),

      constraint saved_items_snapshot_object_check
        check (
          jsonb_typeof(item_snapshot) = 'object'
        ),

      constraint saved_items_snapshot_title_check
        check (
          nullif(
            btrim(
              item_snapshot ->> 'title'
            ),
            ''
          ) is not null
        ),

      constraint saved_items_source_collection_id_fkey
        foreign key (source_collection_id)
        references public.collections(id)
        on delete set null,

      constraint saved_items_source_user_id_fkey
        foreign key (source_user_id)
        references public.profiles(id)
        on delete set null,

      constraint saved_items_user_id_fkey
        foreign key (user_id)
        references public.profiles(id)
        on delete cascade
    );
  end if;
end
$$;

alter table public.saved_items
  enable row level security;

create index if not exists saved_items_user_category_created_at_idx
  on public.saved_items (
    user_id,
    category,
    created_at desc
  );

create index if not exists saved_items_user_created_at_idx
  on public.saved_items (
    user_id,
    created_at desc
  );

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_items'
      and policyname = 'Users can delete their own saved items'
  ) then
    create policy "Users can delete their own saved items"
      on public.saved_items
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_items'
      and policyname = 'Users can read their own saved items'
  ) then
    create policy "Users can read their own saved items"
      on public.saved_items
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'saved_items'
      and policyname = 'Users can save their own items'
  ) then
    create policy "Users can save their own items"
      on public.saved_items
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end
$$;

grant references, trigger, truncate, maintain
  on table public.saved_items
  to anon;

grant select, insert, references, delete, trigger, truncate, maintain
  on table public.saved_items
  to authenticated;

grant select, references, trigger, truncate, maintain, update
  on table public.saved_items
  to service_role;
