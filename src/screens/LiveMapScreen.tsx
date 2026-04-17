import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Easing,
} from 'react-native';

import { GlassCard } from '../components/GlassCard';
import { getRulesForState } from '../data/trafficRules';
import { useLocation } from '../hooks/useLocation';
import { colors, gradients } from '../theme/colors';
import { typography } from '../theme/typography';

export function LiveMapScreen() {
  const { location, locationLabel, loading, error } = useLocation();
  const rules = getRulesForState(location?.regionCode);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 4,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeIn, translateY, floatAnim]);

  return (
    <LinearGradient colors={gradients.page} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>DriveLegal</Text>
        <Text style={styles.subtitle}>Live road awareness dashboard</Text>

        <Animated.View
          style={[
            styles.animatedCard,
            {
              opacity: fadeIn,
              transform: [{ translateY }, { translateY: floatAnim }],
            },
          ]}
        >
          <GlassCard>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Current GPS & Traffic Rules</Text>
              <Ionicons name="navigate" size={20} color={colors.accentStrong} />
            </View>

            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={22} color={colors.accent} />
              <Text style={styles.mapPlaceholderText}>Live Map Preview</Text>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={colors.success} />
              <Text style={styles.locationText}>
                {loading ? 'Fetching GPS location…' : error ?? locationLabel}
              </Text>
            </View>

            <Text style={styles.rulesTitle}>Active State Traffic Rules</Text>
            {rules.map((rule) => (
              <View key={rule} style={styles.ruleItem}>
                <View style={styles.ruleDot} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.heading,
    fontSize: 30,
    letterSpacing: 0.4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    marginBottom: 8,
  },
  animatedCard: {
    marginTop: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  mapPlaceholder: {
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  mapPlaceholderText: {
    color: colors.textSecondary,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  locationText: {
    color: colors.textPrimary,
    fontFamily: typography.medium,
    fontSize: 14,
    flex: 1,
  },
  rulesTitle: {
    color: colors.textPrimary,
    fontFamily: typography.semibold,
    fontSize: 14,
    marginBottom: 10,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginTop: 6,
    backgroundColor: colors.accent,
  },
  ruleText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
