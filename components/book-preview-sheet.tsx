import { useBookPreview } from '@/context/book-preview-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
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
    closeBookPreview,
  } = useBookPreview();

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

  if (
    !activeBookItem ||
    !activeBookDescription
  ) {
    return null;
  }

  const bookItem = activeBookItem;

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
          },
        ]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              ABOUT THIS BOOK
            </Text>

            <Text
              style={styles.title}
              numberOfLines={2}>
              {bookItem.title}
            </Text>

            {bookItem.subtitle ? (
              <Text
                style={styles.subtitle}
                numberOfLines={2}>
                {bookItem.subtitle}
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
            accessibilityLabel={`Close details for ${bookItem.title}`}>
            <Ionicons
              name="close"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.body}>
          {bookItem.imageUrl ? (
            <Image
              source={{
                uri: bookItem.imageUrl,
              }}
              style={styles.cover}
              resizeMode="cover"
              accessibilityLabel={`Cover of ${bookItem.title}`}
            />
          ) : null}

          <ScrollView
            ref={descriptionScrollRef}
            style={styles.descriptionScroll}
            contentContainerStyle={
              styles.descriptionContent
            }
            showsVerticalScrollIndicator={true}
            indicatorStyle="white">
            <Text style={styles.description}>
              {activeBookDescription}
            </Text>

            <Text style={styles.source}>
              Description from Google Books
            </Text>
          </ScrollView>
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
    overflow: 'hidden',
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
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
    color: '#B8B8B8',
  },

  title: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
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

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2A2A2A',
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
    backgroundColor: '#2A2A2A',
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
    color: '#F2F2F2',
  },

  source: {
    marginTop: 16,
    fontSize: 11,
    lineHeight: 15,
    color: '#A8A8A8',
  },
});
