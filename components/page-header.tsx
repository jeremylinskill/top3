import { StyleSheet, Text, View } from 'react-native';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({
  title,
  subtitle,
}: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {subtitle ? (
        <Text style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#222222',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 18,
    color: '#7A7A7A',
    lineHeight: 24,
  },
});