import IconButton from '@/components/icon-button';
import PreviewSaveButton from '@/components/preview-save-button';
import { useTrailerPreview } from '@/context/trailer-preview-context';
import { usePreviewSheetColors } from '@/hooks/use-preview-sheet-colors';
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
    activeSaveContext,
    activeTrailerEmbedUrl,
    closeTrailer,
  } = useTrailerPreview();

  const previewColors =
    usePreviewSheetColors();
  const insets = useSafeAreaInsets();

  if (
    !activeTrailerItem ||
    !activeTrailerEmbedUrl
  ) {
    return null;
  }

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.backdrop,
          {
            backgroundColor:
              previewColors.backdrop,
          },
        ]}
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.positioner,
        {
          bottom: Math.max(
            insets.bottom - 2,
            4
          ),
        },
      ]}>
      <View
        style={[
          styles.sheet,
          {
            backgroundColor:
              previewColors.surface,
            borderColor:
              previewColors.border,
          },
        ]}>
        <View style={styles.header}>
          <View style={styles.details}>
            <Text
              style={[
                styles.eyebrow,
                {
                  color:
                    previewColors.tertiaryText,
                },
              ]}
              numberOfLines={1}>
              TRAILER PLAYING
            </Text>

            <Text
              style={[
                styles.title,
                {
                  color:
                    previewColors.primaryText,
                },
              ]}
              numberOfLines={1}>
              {activeTrailerItem.title}
            </Text>

            {activeTrailerItem.subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      previewColors.secondaryText,
                  },
                ]}
                numberOfLines={1}>
                {activeTrailerItem.subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.headerActions}>
            {activeSaveContext ? (
              <PreviewSaveButton
                item={activeTrailerItem}
                saveContext={
                  activeSaveContext
                }
              />
            ) : null}

            <IconButton
              backgroundColor={
                previewColors.control
              }
              onPress={closeTrailer}
              accessibilityLabel={`Close trailer for ${activeTrailerItem.title}`}>
              <Ionicons
                name="close"
                size={20}
                color={
                  previewColors.primaryText
                }
              />
            </IconButton>
          </View>
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
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },

  positioner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1001,
  },

  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
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

  headerActions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 3,
  },

  title: {
    fontSize: 14,
    fontWeight: '700',
  },

  subtitle: {
    marginTop: 2,
    fontSize: 12,
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
