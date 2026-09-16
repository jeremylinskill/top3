import { useAppColors } from '@/hooks/use-app-colors';
import {
  StyleSheet,
  View,
} from 'react-native';

type SearchResultSkeletonProps = {
  artworkWidth?: number;
  artworkHeight?: number;
};

export default function SearchResultSkeleton({
  artworkWidth = 64,
  artworkHeight = 96,
}: SearchResultSkeletonProps) {
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor:
            colors.skeletonSubtle,
        },
      ]}>
      <View
        style={[
          styles.image,
          {
            width: artworkWidth,
            height: artworkHeight,
            backgroundColor:
              colors.skeleton,
          },
        ]}
      />

      <View style={styles.details}>
        <View
          style={[
            styles.titleLine,
            {
              backgroundColor:
                colors.skeleton,
            },
          ]}
        />
        <View
          style={[
            styles.subtitleLine,
            {
              backgroundColor:
                colors.skeletonSubtle,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  image: {
    width: 64,
    height: 96,
    borderRadius: 8,
  },

  details: {
    flex: 1,
    marginLeft: 16,
  },

  titleLine: {
    width: '72%',
    height: 18,
    borderRadius: 6,
  },

  subtitleLine: {
    width: '48%',
    height: 14,
    borderRadius: 6,
    marginTop: 12,
  },
});
