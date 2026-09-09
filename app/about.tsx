import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import * as Application from 'expo-application';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
      <Text style={styles.infoValue}>
        {source.name}
      </Text>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
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

          <Text style={styles.appName}>
            Top 3
          </Text>

          <View style={styles.betaBadge}>
            <Text style={styles.betaBadgeText}>
              Beta
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Version
            </Text>

            <Text style={styles.infoValue}>
              {version}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Build
            </Text>

            <Text style={styles.infoValue}>
              {buildNumber}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Environment
            </Text>

            <Text style={styles.infoValue}>
              {environment}
            </Text>
          </View>
        </View>

        <View style={styles.dataSourcesSection}>
          <Text style={styles.sectionTitle}>
            Data Sources
          </Text>

          <View style={styles.dataSourcesCard}>
            {DATA_SOURCES.map((source, index) => (
              <View key={source.name}>
                {index > 0 ? (
                  <View style={styles.divider} />
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
                    <Text style={styles.infoLabel}>
                      {source.label}
                    </Text>

                    {source.name === 'TMDB' ? (
                      <Text style={styles.tmdbNoticeText}>
                        This product uses the TMDB API but is
                        not endorsed or certified by TMDB.
                      </Text>
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
          <Text style={styles.attributionTitle}>
            Designed and developed by
          </Text>

          <Text style={styles.attributionName}>
            Jeremy Linskill
          </Text>

          <Text style={styles.copyright}>
            © {currentYear} Top 3
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    ...TYPOGRAPHY.pageTitle,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },

  betaBadge: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  betaBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.secondaryText,
  },

  infoCard: {
    marginTop: 32,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
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

  infoLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.secondaryText,
  },

  infoValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    textAlign: 'right',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: SPACING.lg,
    backgroundColor: COLORS.border,
  },

  dataSourcesSection: {
    marginTop: 32,
  },

  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: SPACING.md,
  },

  dataSourcesCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    ...TYPOGRAPHY.metadata,
    marginTop: 5,
    maxWidth: 310,
    color: COLORS.tertiaryText,
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
    ...TYPOGRAPHY.label,
    fontWeight: '400',
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  attributionName: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 4,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },

  copyright: {
    ...TYPOGRAPHY.metadata,
    marginTop: SPACING.lg,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },
});
