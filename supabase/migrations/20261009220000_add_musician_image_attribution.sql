-- Optional photo attribution for musician editorial images.
-- Keep existing musician photos and overrides unchanged.

alter table public.musicians
  add column image_credit text,
  add column image_source_url text,
  add column image_license text,
  add column image_license_url text,
  add column image_modifications text;

comment on column public.musicians.image_credit
  is 'Photographer and other required contributor credits.';

comment on column public.musicians.image_source_url
  is 'Original photograph source or attribution page.';

comment on column public.musicians.image_license
  is 'Image copyright licence or permission description.';

comment on column public.musicians.image_license_url
  is 'Link to the image licence or permission terms.';

comment on column public.musicians.image_modifications
  is 'Description of modifications made to the source photograph.';
