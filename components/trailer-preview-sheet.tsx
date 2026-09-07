import { useTrailerPreview } from '@/context/trailer-preview-context';
import { Ionicons } from '@expo/vector-icons';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

function getYouTubeEmbedHtml(
  embedUrl: string
): string {
  return `
<!doctype html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000000;
      }

      iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: #000000;
      }
    </style>
  </head>
  <body>
    <iframe
      src="${embedUrl}"
      title="Trailer"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
  </body>
</html>
  `.trim();
}

export default function TrailerPreviewSheet() {
  const {
    activeTrailerItem,
    activeTrailerEmbedUrl,
    closeTrailer,
  } = useTrailerPreview();

  const insets = useSafeAreaInsets();

  if (
    !activeTrailerItem ||
    !activeTrailerEmbedUrl
  ) {
    return null;
  }

  return (
    <View
  pointerEvents="box-none"
  style={[
    styles.positioner,
    {
      bottom: Math.max(insets.bottom - 2, 4),
    },
  ]}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.details}>
            <Text
              style={styles.eyebrow}
              numberOfLines={1}>
              TRAILER PLAYING
            </Text>

            <Text
              style={styles.title}
              numberOfLines={1}>
              {activeTrailerItem.title}
            </Text>

            {activeTrailerItem.subtitle ? (
              <Text
                style={styles.subtitle}
                numberOfLines={1}>
                {activeTrailerItem.subtitle}
              </Text>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed &&
                styles.closeButtonPressed,
            ]}
            onPress={closeTrailer}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Close trailer for ${activeTrailerItem.title}`}>
            <Ionicons
              name="close"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        <View style={styles.playerInset}>
          <View style={styles.player}>
            <WebView
              source={{
                html: getYouTubeEmbedHtml(
                  activeTrailerEmbedUrl
                ),
                baseUrl:
                  'https://com.jeremylinskillsteam.top3',
              }}
              style={styles.webView}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1001,
  },

  sheet: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.20,
    shadowRadius: 18,
    elevation: 12,
  },

  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  details: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: '#B8B8B8',
    marginBottom: 3,
  },

  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#D0D0D0',
  },

  closeButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
  },

  closeButtonPressed: {
    opacity: 0.65,
  },

  playerInset: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 14,
  },

  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#000000',
  },

  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
