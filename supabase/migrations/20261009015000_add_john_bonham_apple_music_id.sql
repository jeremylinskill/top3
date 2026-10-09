-- Link John Bonham to his own verified Apple Music artist profile.
-- Preserve the canonical Top 3 musician identity.

update public.musicians
set
  apple_music_artist_id = '649167',
  updated_at = now()
where id = 'musician-john-bonham'
  and apple_music_artist_id is distinct from '649167';
