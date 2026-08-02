import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
};

export default function PageHeader({
  title,
  subtitle,
  align = 'left',
}: PageHeaderProps) {
  const isCentered = align === 'center';

  return (
    <View
      style={[
        styles.container,
        isCentered && styles.containerCentered,
      ]}>
      <Text
        style={[
          styles.title,
          isCentered && styles.textCentered,
        ]}>
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            isCentered && styles.textCentered,
          ]}>
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

  containerCentered: {
    alignItems: 'center',
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

  textCentered: {
    textAlign: 'center',
  },
});