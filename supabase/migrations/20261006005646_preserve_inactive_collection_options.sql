drop policy if exists "Active collection options are readable"
  on public.collection_options;

create policy "Collection options are readable"
  on public.collection_options
  for select
  to public
  using (true);

drop policy if exists "Active collection option suggestions are readable"
  on public.collection_option_suggestions;

create policy "Active collection option suggestions are readable"
  on public.collection_option_suggestions
  for select
  to public
  using (active);
