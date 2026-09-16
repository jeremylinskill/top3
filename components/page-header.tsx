import AppText from '@/components/app-text';
import {
  StyleSheet,
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
      <AppText
        variant="heroTitle"
        style={
          isCentered
            ? styles.textCentered
            : undefined
        }>
        {title}
      </AppText>

      {subtitle ? (
        <AppText
          variant="bodyLarge"
          tone="secondary"
          style={[
            styles.subtitle,
            isCentered &&
              styles.textCentered,
          ]}>
          {subtitle}
        </AppText>
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

  subtitle: {
    marginTop: 8,
    fontSize: 18,
    lineHeight: 24,
  },

  textCentered: {
    textAlign: 'center',
  },
});
