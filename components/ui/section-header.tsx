import { TYPOGRAPHY } from '@/constants/typography';
import { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

type SectionHeaderProps = {
  title: string;
  action?: ReactNode;
};

export default function SectionHeader({
  title,
  action,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title}
      </Text>

      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  title: {
    ...TYPOGRAPHY.sectionTitle,
  },
});