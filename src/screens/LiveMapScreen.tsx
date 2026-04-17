import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Easing,
} from 'react-native';

import { GlassCard } from '../components/GlassCard';
import { CircularSafetyScore } from '../components/CircularSafetyScore';
import { getRulesForState, getStateNameFromCode, INDIA_STATE_OPTIONS } from '../data/trafficRules';
import { useLocation } from '../hooks/useLocation';
import { calculateCommonFinesForState } from '../services/fines/fineCalculator';
import { triggerDeveloperGodModeStateJump } from '../services/backgroundStateTracking';
import { getDriverSafetySnapshot } from '../services/driverSafetyScore';
import { colors, gradients } from '../theme/colors';
import { typography } from '../theme/typography';

export function LiveMapScreen() {
  const { location, locationLabel, loading, error } = useLocation();
  const [manualState, setManualState] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<'2-Wheeler' | 'Car' | 'Truck' | 'Bus'>('2-Wheeler');
  const [challanLoading, setChallanLoading] = useState(false);
  const [challanError, setChallanError] = useState<string | null>(null);
  const [godModeBusy, setGodModeBusy] = useState(false);
  const [godModeStatus, setGodModeStatus] = useState<string | null>(null);
  const [safetyScore, setSafetyScore] = useState(100);
  const [lastSafetyEvent, setLastSafetyEvent] = useState<string | null>(null);
  const [challans, setChallans] = useState<Array<{
    offense: string;
    exactFineAmount: number;
    legalSection: string;
  }>>([]);

  const autoDetectedState = useMemo(() => {
    if (location?.region) {
      return location.region;
    }

    return getStateNameFromCode(location?.regionCode) ?? null;
  }, [location?.region, location?.regionCode]);

  const activeState = manualState ?? autoDetectedState ?? 'Delhi';
  const rules = getRulesForState(location?.regionCode);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const godModeTapTimestampsRef = useRef<number[]>([]);

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

  useEffect(() => {
    const loadSafetySnapshot = async () => {
      const snapshot = await getDriverSafetySnapshot();
      setSafetyScore(snapshot.score);

      const latestEvent = snapshot.events[0];
      if (!latestEvent) {
        setLastSafetyEvent(null);
        return;
      }

      const eventTime = new Date(latestEvent.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      setLastSafetyEvent(
        `Latest: ${latestEvent.stateCode} at ${eventTime} (${latestEvent.speedKmph} km/h, limit ${latestEvent.speedLimitKmph} km/h)`
      );
    };

    void loadSafetySnapshot();
    const interval = setInterval(() => {
      void loadSafetySnapshot();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const loadChallans = async () => {
      setChallanLoading(true);
      setChallanError(null);

      try {
        const result = await calculateCommonFinesForState({
          state: activeState,
          vehicleType,
          countryCode: 'IN',
        });

        setChallans(result);
      } catch {
        setChallanError('Unable to load challan amounts right now.');
      } finally {
        setChallanLoading(false);
      }
    };

    void loadChallans();
  }, [activeState, vehicleType]);

  const activateDeveloperGodMode = async () => {
    if (godModeBusy) {
      return;
    }

    setGodModeBusy(true);
    setGodModeStatus(null);

    try {
      await triggerDeveloperGodModeStateJump();
      setGodModeStatus('Developer God Mode: mock border crossing injected (MH → KA).');
    } catch {
      setGodModeStatus('Developer God Mode failed. Please retry.');
    } finally {
      setGodModeBusy(false);
    }
  };

  const handleGodModeTap = () => {
    const now = Date.now();
    const recent = godModeTapTimestampsRef.current.filter((value) => now - value < 900);
    recent.push(now);
    godModeTapTimestampsRef.current = recent;

    if (recent.length >= 3) {
      godModeTapTimestampsRef.current = [];
      void activateDeveloperGodMode();
    }
  };

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

            <View style={styles.safetySection}>
              <Text style={styles.safetyTitle}>Driver Safety Score</Text>
              <View style={styles.safetyScoreRow}>
                <CircularSafetyScore score={safetyScore} size={122} strokeWidth={10} />
                <View style={styles.safetyTextGroup}>
                  <Text style={styles.safetyBodyText}>
                    Score starts at 100 and drops by 5 for overspeeding in high-penalty zones.
                  </Text>
                  <Text style={styles.safetyBodyTextSecondary}>
                    {lastSafetyEvent ?? 'No recent violations detected. Keep it steady.'}
                  </Text>
                </View>
              </View>

              {safetyScore > 90 ? (
                <View style={styles.rewardCard}>
                  <Ionicons name="gift" size={16} color="#34D399" />
                  <Text style={styles.rewardText}>Reward unlocked: You are in the top safe-driver tier.</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.challanTitle}>Current State Challan Estimates</Text>
            <Text style={styles.challanSubtitle}>
              {manualState
                ? `Manual State: ${activeState}`
                : `Auto-detected State: ${activeState}`}
            </Text>

            <View style={styles.selectorRow}>
              <Pressable
                onPress={() => setManualState(null)}
                style={[styles.selectorPill, !manualState ? styles.selectorPillActive : null]}
              >
                <Text style={[styles.selectorText, !manualState ? styles.selectorTextActive : null]}>
                  Use My Location
                </Text>
              </Pressable>
              <Text style={styles.selectorLabel}>Set State:</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stateOptionsRow}>
              {INDIA_STATE_OPTIONS.map((item) => (
                <Pressable
                  key={item.code}
                  onPress={() => setManualState(item.name)}
                  style={[styles.selectorPill, manualState === item.name ? styles.selectorPillActive : null]}
                >
                  <Text style={[styles.selectorText, manualState === item.name ? styles.selectorTextActive : null]}>
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleOptionsRow}>
              {(['2-Wheeler', 'Car', 'Truck', 'Bus'] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setVehicleType(item)}
                  style={[styles.selectorPill, vehicleType === item ? styles.selectorPillActive : null]}
                >
                  <Text style={[styles.selectorText, vehicleType === item ? styles.selectorTextActive : null]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {challanLoading ? <Text style={styles.loadingText}>Calculating challan amounts…</Text> : null}
            {challanError ? <Text style={styles.errorText}>{challanError}</Text> : null}

            {!challanLoading && !challanError
              ? challans.map((item) => (
                  <View key={item.offense} style={styles.challanCard}>
                    <View style={styles.challanHeader}>
                      <Text style={styles.challanOffense}>{item.offense}</Text>
                      <Text style={styles.challanAmount}>₹{item.exactFineAmount}</Text>
                    </View>
                    <Text style={styles.challanSection}>{item.legalSection}</Text>
                  </View>
                ))
              : null}
          </GlassCard>
        </Animated.View>
      </ScrollView>

      <Pressable onPress={handleGodModeTap} style={styles.godModeFab}>
        <Ionicons name="flash" size={14} color="rgba(255, 255, 255, 0.18)" />
      </Pressable>

      {godModeStatus ? <Text style={styles.godModeStatus}>{godModeStatus}</Text> : null}
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
  safetySection: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 8,
    gap: 10,
  },
  safetyTitle: {
    color: colors.textPrimary,
    fontFamily: typography.semibold,
    fontSize: 15,
  },
  safetyScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  safetyTextGroup: {
    flex: 1,
    gap: 8,
  },
  safetyBodyText: {
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 17,
  },
  safetyBodyTextSecondary: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 17,
  },
  rewardCard: {
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardText: {
    color: '#D1FAE5',
    fontFamily: typography.medium,
    fontSize: 12,
    flex: 1,
  },
  challanTitle: {
    color: colors.textPrimary,
    fontFamily: typography.semibold,
    fontSize: 15,
    marginTop: 8,
    marginBottom: 6,
  },
  challanSubtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 12,
    marginBottom: 10,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  selectorLabel: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 12,
  },
  stateOptionsRow: {
    gap: 8,
    paddingRight: 12,
    marginBottom: 8,
  },
  vehicleOptionsRow: {
    gap: 8,
    paddingRight: 12,
    marginBottom: 10,
  },
  selectorPill: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceSoft,
  },
  selectorPillActive: {
    borderColor: colors.accentStrong,
    backgroundColor: 'rgba(34, 211, 238, 0.18)',
  },
  selectorText: {
    color: colors.textSecondary,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  selectorTextActive: {
    color: colors.textPrimary,
  },
  loadingText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#FCA5A5',
    fontFamily: typography.body,
    fontSize: 12,
    marginBottom: 8,
  },
  challanCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: colors.surfaceSoft,
  },
  challanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  challanOffense: {
    color: colors.textPrimary,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  challanAmount: {
    color: colors.accentStrong,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  challanSection: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 12,
  },
  godModeFab: {
    position: 'absolute',
    right: 16,
    bottom: 34,
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
  },
  godModeStatus: {
    position: 'absolute',
    left: 16,
    right: 56,
    bottom: 42,
    color: '#93C5FD',
    fontFamily: typography.medium,
    fontSize: 11,
  },
});
