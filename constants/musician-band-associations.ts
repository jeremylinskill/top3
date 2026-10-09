export type VerifiedMusicianBand = {
  appleMusicArtistId: string;
  bandName: string;
  evidenceUrl: string;
};

export const VERIFIED_MUSICIAN_BANDS: Readonly<
  Record<string, VerifiedMusicianBand>
> = {
  'musician-john-bonham': {
    appleMusicArtistId: '994656',
    bandName: 'Led Zeppelin',
    evidenceUrl:
      'https://music.apple.com/us/artist/led-zeppelin/994656',
  },
  'musician-black-thought': {
    appleMusicArtistId: '43680',
    bandName: 'The Roots',
    evidenceUrl:
      'https://music.apple.com/us/artist/the-roots/43680',
  },
};
