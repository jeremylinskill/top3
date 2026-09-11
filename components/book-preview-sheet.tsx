import { useBookPreview } from '@/context/book-preview-context';
import { Ionicons } from '@expo/vector-icons';
import {
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

function getGoogleBooksEmbedHtml(
  volumeId: string
): string {
  const serializedVolumeId =
    JSON.stringify(volumeId);

  return `
<!doctype html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <meta charset="utf-8" />
    <script
      type="text/javascript"
      src="https://www.google.com/books/jsapi.js">
    </script>
    <style>
      html,
      body,
      #viewerCanvas {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #FFFFFF;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #viewerError {
        display: none;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 24px;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #777777;
        font-size: 14px;
        line-height: 20px;
      }
    </style>
  </head>
  <body>
    <div id="viewerCanvas"></div>
    <div id="viewerError">
      This preview is currently unavailable.
    </div>

    <script type="text/javascript">
      function showError() {
        document.getElementById('viewerCanvas').style.display = 'none';
        document.getElementById('viewerError').style.display = 'flex';
      }

      function initialize() {
        try {
          var viewer = new google.books.DefaultViewer(
            document.getElementById('viewerCanvas')
          );

          viewer.load(
            ${serializedVolumeId},
            null,
            showError
          );
        } catch (error) {
          showError();
        }
      }

      if (
        window.google &&
        google.books
      ) {
        google.books.load();
        google.books.setOnLoadCallback(initialize);
      } else {
        showError();
      }
    </script>
  </body>
</html>
  `.trim();
}

export default function BookPreviewSheet() {
  const {
    activeBookItem,
    activeBookVolumeId,
    closeBookPreview,
  } = useBookPreview();

  const insets = useSafeAreaInsets();
  const { height: windowHeight } =
    useWindowDimensions();

  if (
    !activeBookItem ||
    !activeBookVolumeId
  ) {
    return null;
  }

  const readerHeight =
    Math.min(
      Math.max(
        Math.round(windowHeight * 0.58),
        360
      ),
      560
    );

  return (
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
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.details}>
            <Text
              style={styles.eyebrow}
              numberOfLines={1}>
              READ PREVIEW
            </Text>

            <Text
              style={styles.title}
              numberOfLines={1}>
              {activeBookItem.title}
            </Text>

            {activeBookItem.subtitle ? (
              <Text
                style={styles.subtitle}
                numberOfLines={1}>
                {activeBookItem.subtitle}
              </Text>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed &&
                styles.closeButtonPressed,
            ]}
            onPress={closeBookPreview}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Close preview of ${activeBookItem.title}`}>
            <Ionicons
              name="close"
              size={20}
              color="#555555"
            />
          </Pressable>
        </View>

        <View style={styles.readerInset}>
          <View
            style={[
              styles.reader,
              {
                height: readerHeight,
              },
            ]}>
            <WebView
              source={{
                html: getGoogleBooksEmbedHtml(
                  activeBookVolumeId
                ),
                baseUrl:
                  'https://books.google.com',
              }}
              style={styles.webView}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={[
                'https://*',
              ]}
              setSupportMultipleWindows={false}
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
    zIndex: 1002,
  },

  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E2E2',
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
    marginBottom: 3,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: '#888888',
  },

  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },

  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#777777',
  },

  closeButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
  },

  closeButtonPressed: {
    opacity: 0.65,
  },

  readerInset: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 14,
  },

  reader: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E2E2',
    backgroundColor: '#FFFFFF',
  },

  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
