import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, gradients } from '../theme/colors';

type GlassCardProps = PropsWithChildren<{
  glow?: boolean;
}>;

export function GlassCard({ children, glow = true }: GlassCardProps) {
  return (
    <View style={styles.wrapper}>
      {glow ? (
        <LinearGradient
          colors={gradients.cardGlow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glow}
        />
      ) : null}

      <BlurView intensity={35} tint="dark" style={styles.card}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
