import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string | null;
  showBackButton?: boolean;
};

export default function ScreenHeader({
  title,
  subtitle,
  showBackButton = false,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.topBar}>
        {showBackButton ? (
          <Pressable
            style={styles.sideSlot}
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <Ionicons
              name="chevron-back"
              size={28}
              color="#222222"
            />
          </Pressable>
        ) : (
          <View style={styles.sideSlot} />
        )}

        <Text style={styles.brand}>Top 3</Text>

        <View style={styles.sideSlot} />
      </View>

      {title ? (
        <View style={styles.titleArea}>
          <Text style={styles.title}>{title}</Text>

          {subtitle ? (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FAFAFA',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDDD',
  },

  topBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  sideSlot: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brand: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: 0.2,
  },

  titleArea: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  title: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    color: '#222222',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#777777',
    lineHeight: 18,
  },
});