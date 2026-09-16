import AppText from '@/components/app-text';
import ScreenHeader from '@/components/screen-header';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useAppColors } from '@/hooks/use-app-colors';
import * as Application from 'expo-application';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DataSource = {
  label: string;
  name: string;
  url: string;
};

const DATA_SOURCES: DataSource[] = [
  {
    label: 'Movie and TV data',
    name: 'TMDB',
    url: 'https://www.themoviedb.org/',
  },
  {
    label: 'Music data and previews',
    name: 'Apple Music',
    url: 'https://music.apple.com/',
  },
  {
    label: 'Podcast data and previews',
    name: 'Apple Podcasts',
    url: 'https://podcasts.apple.com/',
  },
  {
    label: 'Book data',
    name: 'Google Books',
    url: 'https://books.google.com/',
  },
  {
    label: 'Additional book data',
    name: 'Open Library',
    url: 'https://openlibrary.org/',
  },
  {
    label: 'Video game data',
    name: 'IGDB',
    url: 'https://www.igdb.com/',
  },
];

export default function AboutScreen() {
  const colors = useAppColors();

  const version =
    Application.nativeApplicationVersion ??
    '0.1.0';

  const buildNumber =
    Application.nativeBuildVersion ??
    'Development';

  const environment = __DEV__
    ? 'Development'
    : 'Production';

  const currentYear = new Date().getFullYear();

  async function openExternalUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      if (__DEV__) {
        console.log(
          'Failed to open external URL:',
          error
        );
      }
    }
  }

  function renderSourceValue(source: DataSource) {
    if (source.name === 'TMDB') {
      return (
        <Image
          source={require('../assets/images/tmdb-logo.png')}
          style={styles.tmdbLogo}
          resizeMode="contain"
          accessibilityLabel="The Movie Database logo"
        />
      );
    }

    if (source.name === 'Apple Music') {
      return (
        <Image
          source={require('../assets/images/apple-music-logo.png')}
          style={styles.appleMusicLogo}
          resizeMode="contain"
          accessibilityLabel="Apple Music logo"
        />
      );
    }

    if (source.name === 'Google Books') {
      return (
        <Image
          source={require('../assets/images/google-play-books-logo.png')}
          style={styles.googleBooksLogo}
          resizeMode="contain"
          accessibilityLabel="Google Books logo"
        />
      );
    }

    if (source.name === 'Open Library') {
      return (
        <Image
          source={require('../assets/images/open-library-logo.png')}
          style={styles.openLibraryLogo}
          resizeMode="contain"
          accessibilityLabel="Open Library logo"
        />
      );
    }

    if (source.name === 'IGDB') {
      return (
        <Image
          source={require('../assets/images/igdb-logo.png')}
          style={styles.igdbLogo}
          resizeMode="contain"
          accessibilityLabel="IGDB logo"
        />
      );
    }

    return (
      <AppText
        variant="bodyBold"
        tone="primary"
        style={styles.infoValue}>
        {source.name}
      </AppText>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
            accessibilityLabel="Top 3 app icon"
          />

          <AppText
            variant="pageTitle"
            style={styles.appName}>
            Top 3
          </AppText>

          <View
            style={[
              styles.betaBadge,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <AppText
              variant="caption"
              tone="secondary"
              emphasis="strong">
              Beta
            </AppText>
          </View>
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
            },
          ]}>
          <View style={styles.infoRow}>
            <AppText
              variant="body"
              tone="secondary">
              Version
            </AppText>

            <AppText
              variant="bodyBold"
              tone="primary"
              style={styles.infoValue}>
              {version}
            </AppText>
          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor: colors.border,
              },
            ]}
          />

          <View style={styles.infoRow}>
            <AppText
              variant="body"
              tone="secondary">
              Build
            </AppText>

            <AppText
              variant="bodyBold"
              tone="primary"
              style={styles.infoValue}>
              {buildNumber}
            </AppText>
          </View>

          <View
            style={[
              styles.divider,
              {
                backgroundColor: colors.border,
              },
            ]}
          />

          <View style={styles.infoRow}>
            <AppText
              variant="body"
              tone="secondary">
              Environment
            </AppText>

            <AppText
              variant="bodyBold"
              tone="primary"
              style={styles.infoValue}>
              {environment}
            </AppText>
          </View>
        </View>

        <View style={styles.dataSourcesSection}>
          <AppText
            variant="sectionTitle"
            style={styles.sectionTitle}>
            Data Sources
          </AppText>

          <View
            style={[
              styles.dataSourcesCard,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            {DATA_SOURCES.map((source, index) => (
              <View key={source.name}>
                {index > 0 ? (
                  <View
                    style={[
                      styles.divider,
                      {
                        backgroundColor: colors.border,
                      },
                    ]}
                  />
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.sourceRow,
                    source.name === 'TMDB' &&
                      styles.tmdbRow,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    void openExternalUrl(source.url);
                  }}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${source.name} website`}>
                  <View style={styles.sourceLabelContainer}>
                    <AppText
                      variant="body"
                      tone="secondary">
                      {source.label}
                    </AppText>

                    {source.name === 'TMDB' ? (
                      <AppText
                        variant="metadata"
                        tone="tertiary"
                        style={styles.tmdbNoticeText}>
                        This product uses the TMDB API but is
                        not endorsed or certified by TMDB.
                      </AppText>
                    ) : null}
                  </View>

                  <View style={styles.sourceValue}>
                    {renderSourceValue(source)}
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.attribution}>
          <AppText
            variant="label"
            tone="tertiary"
            emphasis="regular"
            style={styles.attributionTitle}>
            Designed and developed by
          </AppText>

          <AppText
            variant="bodyLarge"
            tone="primary"
            emphasis="strong"
            style={styles.attributionName}>
            Jeremy Linskill
          </AppText>

          <AppText
            variant="metadata"
            tone="tertiary"
            style={styles.copyright}>
            © {currentYear} Top 3
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: 40,
  },

  hero: {
    alignItems: 'center',
  },

  appIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
  },

  appName: {
    marginTop: SPACING.lg,
    textAlign: 'center',
  },

  betaBadge: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },

  infoCard: {
    marginTop: 32,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },

  infoRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  infoValue: {
    textAlign: 'right',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: SPACING.lg,
  },

  dataSourcesSection: {
    marginTop: 32,
  },

  sectionTitle: {
    marginBottom: SPACING.md,
  },

  dataSourcesCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },

  sourceRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  tmdbRow: {
    minHeight: 104,
    alignItems: 'center',
  },

  sourceLabelContainer: {
    flex: 1,
    minWidth: 0,
    paddingRight: SPACING.lg,
  },

  sourceValue: {
    flexShrink: 0,
    marginLeft: 'auto',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  tmdbLogo: {
    width: 118,
    height: 38,
  },

  appleMusicLogo: {
    width: 96,
    height: 31,
  },

  googleBooksLogo: {
    width: 108,
    height: 36,
  },

  openLibraryLogo: {
    width: 108,
    height: 36,
  },

  igdbLogo: {
    width: 72,
    height: 41,
  },

  tmdbNoticeText: {
    marginTop: 5,
    maxWidth: 310,
  },

  pressed: {
    opacity: 0.68,
  },

  attribution: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 48,
  },

  attributionTitle: {
    textAlign: 'center',
  },

  attributionName: {
    marginTop: 4,
    textAlign: 'center',
  },

  copyright: {
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
});
