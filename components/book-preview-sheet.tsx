import { useBookPreview } from '@/context/book-preview-context';
import { usePreviewSheetColors } from '@/hooks/use-preview-sheet-colors';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BookPreviewSheet() {
  const {
    activeBookItem,
    activeBookDescription,
    activeBookDescriptionSource,
    isBookLoading,
    closeBookPreview,
  } = useBookPreview();

  const previewColors = usePreviewSheetColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const descriptionScrollRef =
    useRef<ScrollView>(null);

  useEffect(() => {
    if (
      !activeBookItem ||
      !activeBookDescription
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      descriptionScrollRef.current
        ?.flashScrollIndicators();
    }, 350);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    activeBookItem,
    activeBookDescription,
  ]);

  if (!activeBookItem) {
    return null;
  }

  const bookItem = activeBookItem;

  const sourceLabel =
    activeBookDescriptionSource ===
    'open-library'
      ? 'Description from Open Library'
      : 'Description from Google Books';

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
            height: Math.min(
              620,
              Math.max(
                460,
                height * 0.68
              )
            ),
            backgroundColor:
              previewColors.surface,
            borderColor:
              previewColors.border,
          },
        ]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text
              style={[
                styles.eyebrow,
                {
                  color:
                    previewColors.tertiaryText,
                },
              ]}>
              ABOUT THIS BOOK
            </Text>

            <Text
              style={[
                styles.title,
                {
                  color:
                    previewColors.primaryText,
                },
              ]}
              numberOfLines={2}>
              {bookItem.title}
            </Text>

            {bookItem.subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      previewColors.secondaryText,
                  },
                ]}
                numberOfLines={2}>
                {bookItem.subtitle}
              </Text>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor:
                  previewColors.control,
              },
              pressed &&
                styles.closeButtonPressed,
            ]}
            onPress={closeBookPreview}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Close details for ${bookItem.title}`}>
            <Ionicons
              name="close"
              size={20}
              color={
                previewColors.primaryText
              }
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                previewColors.border,
            },
          ]}
        />

        <View style={styles.body}>
          {bookItem.imageUrl ? (
            <Image
              source={{
                uri: bookItem.imageUrl,
              }}
              style={[
                styles.cover,
                {
                  backgroundColor:
                    previewColors.placeholder,
                },
              ]}
              resizeMode="cover"
              accessibilityLabel={`Cover of ${bookItem.title}`}
            />
          ) : null}

          {isBookLoading ? (
            <View style={styles.status}>
              <ActivityIndicator
                size="small"
                color={
                  previewColors.activity
                }
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      previewColors.secondaryText,
                  },
                ]}>
                Loading description…
              </Text>
            </View>
          ) : activeBookDescription ? (
            <ScrollView
              ref={descriptionScrollRef}
              style={styles.descriptionScroll}
              contentContainerStyle={
                styles.descriptionContent
              }
              showsVerticalScrollIndicator={true}
              indicatorStyle={
                previewColors.scrollIndicator
              }>
              <Text
                style={[
                  styles.description,
                  {
                    color:
                      previewColors.bodyText,
                  },
                ]}>
                {activeBookDescription}
              </Text>

              <Text
                style={[
                  styles.source,
                  {
                    color:
                      previewColors.sourceText,
                  },
                ]}>
                {sourceLabel}
              </Text>
            </ScrollView>
          ) : (
            <View style={styles.status}>
              <Text
                style={[
                  styles.unavailableTitle,
                  {
                    color:
                      previewColors.bodyText,
                  },
                ]}>
                Description unavailable
              </Text>
              <Text
                style={[
                  styles.unavailableText,
                  {
                    color:
                      previewColors.sourceText,
                  },
                ]}>
                No description is available for this book.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1001,
  },

  positioner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1002,
  },

  sheet: {
    overflow: 'hidden',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  eyebrow: {
    marginBottom: 4,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  title: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },

  closeButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonPressed: {
    opacity: 0.65,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
  },

  body: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },

  cover: {
    width: 76,
    height: 114,
    flexShrink: 0,
    marginRight: 16,
    borderRadius: 7,
  },

  descriptionScroll: {
    flex: 1,
    minHeight: 0,
    marginRight: -6,
  },

  descriptionContent: {
    paddingRight: 12,
    paddingBottom: 4,
  },

  description: {
    fontSize: 15,
    lineHeight: 22,
  },

  source: {
    marginTop: 16,
    fontSize: 11,
    lineHeight: 15,
  },

  status: {
    flex: 1,
    minHeight: 114,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  statusText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },

  unavailableTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },

  unavailableText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
});
