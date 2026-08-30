import { LinearGradient } from 'expo-linear-gradient';
import {
    Image,
    StyleSheet,
    Text,
} from 'react-native';

type UserAvatarProps = {
  displayName: string;
  avatarUrl?: string;
  size: number;
  fontSize?: number;
};

export default function UserAvatar({
  displayName,
  avatarUrl,
  size,
  fontSize,
}: UserAvatarProps) {
  const initial =
    displayName.trim().charAt(0).toUpperCase() || '?';

  const borderRadius = size / 2;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[
          styles.avatarImage,
          {
            width: size,
            height: size,
            borderRadius,
          },
        ]}
        resizeMode="cover"
      />
    );
  }

  return (
    <LinearGradient
      colors={['#00D89A', '#00D2FD']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        styles.avatarGradient,
        {
          width: size,
          height: size,
          borderRadius,
        },
      ]}>
      <Text
        style={[
          styles.initial,
          {
            fontSize:
              fontSize ?? Math.round(size * 0.42),
          },
        ]}>
        {initial}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    overflow: 'hidden',
  },

  avatarGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  initial: {
    color: '#000000',
    fontWeight: '700',
    textAlign: 'center',
  },
});