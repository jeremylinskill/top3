-- Remove the abandoned musician audio preview cache.
-- Preserve the original migration for Supabase history.
-- Refuse to remove the table if any records exist.

do $$
begin
  if to_regclass('public.musician_audio_previews') is not null then
    if exists (
      select 1
      from public.musician_audio_previews
    ) then
      raise exception
        'Refusing to drop musician_audio_previews: table contains records';
    end if;

    drop table public.musician_audio_previews;
  end if;
end;
$$;
