-- Limit manually written musician bylines to 100 characters.
-- Existing values are preserved; the migration fails if any exceed 100.

alter table public.musicians
  drop constraint musicians_byline_override_length_check,
  add constraint musicians_byline_override_length_check
    check (
      byline_override is null
      or char_length(byline_override) <= 100
    );

comment on column public.musicians.byline_override
  is 'Optional manually written musician byline, maximum 100 characters.';
