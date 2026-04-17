import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type CircularSafetyScoreProps = {
  score: number;
  size?: number;
  strokeWidth?: number;
};

const ANIMATION_DURATION_MS = 700;

export function CircularSafetyScore({ score, size = 132, strokeWidth = 12 }: CircularSafetyScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(Math.max(0, Math.min(100, Math.round(score))));
  const previousScoreRef = useRef(Math.max(0, Math.min(100, Math.round(score))));

  useEffect(() => {
    const start = previousScoreRef.current;
    const end = Math.max(0, Math.min(100, Math.round(score)));

    if (start === end) {
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / ANIMATION_DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(start + (end - start) * eased);

      setAnimatedScore(nextValue);

      if (progress >= 1) {
        previousScoreRef.current = end;
        clearInterval(timer);
      }
    }, 16);

    return () => {
      clearInterval(timer);
    };
  }, [score]);

  const boundedScore = Math.max(0, Math.min(100, animatedScore));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - boundedScore / 100);

  const scoreColor = useMemo(() => {
    if (boundedScore >= 90) {
      return '#34D399';
    }

    if (boundedScore >= 70) {
      return colors.accentStrong;
    }

    if (boundedScore >= 50) {
      return '#FBBF24';
    }

    return '#F87171';
  }, [boundedScore]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.borderSoft}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>

      <View style={styles.centerContent}>
        <Text style={styles.scoreValue}>{boundedScore}</Text>
        <Text style={styles.scoreLabel}>Safety</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    color: colors.textPrimary,
    fontFamily: typography.heading,
    fontSize: 34,
    lineHeight: 38,
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontFamily: typography.medium,
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
