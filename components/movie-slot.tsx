import { Pressable, StyleSheet, Text } from 'react-native';

type MovieSlotProps = {
  rank: number;
  title: string;
  onPress: () => void;
};

export default function MovieSlot({
  rank,
  title,
  onPress,
}: MovieSlotProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Text style={styles.rank}>{rank}</Text>
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    padding: 20,
    marginTop: 32,
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    color: '#777777',
  },
});