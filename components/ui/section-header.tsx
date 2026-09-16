import AppText from '@/components/app-text';
import { ReactNode } from 'react';
import {
  StyleSheet,
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
      <AppText variant="sectionTitle">
        {title}
      </AppText>

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
});
