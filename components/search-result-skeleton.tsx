import { StyleSheet, View } from 'react-native';

export default function SearchResultSkeleton() {
  return (
    <View style={styles.row}>
      <View style={styles.image} />

      <View style={styles.details}>
        <View style={styles.titleLine} />
        <View style={styles.subtitleLine} />
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
    borderBottomColor: '#EEEEEE',
  },
  image: {
    width: 64,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#E8E8E8',
  },
  details: {
    flex: 1,
    marginLeft: 16,
  },
  titleLine: {
    width: '72%',
    height: 18,
    borderRadius: 6,
    backgroundColor: '#E8E8E8',
  },
  subtitleLine: {
    width: '48%',
    height: 14,
    borderRadius: 6,
    backgroundColor: '#EEEEEE',
    marginTop: 12,
  },
});