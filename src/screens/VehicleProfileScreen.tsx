import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '../components/GlassCard';
import { colors, gradients } from '../theme/colors';
import { typography } from '../theme/typography';

const vehicleData = [
  { label: 'Vehicle', value: 'Tesla Model 3' },
  { label: 'Registration', value: 'Active • Expires Nov 2026' },
  { label: 'Insurance', value: 'Compliant • Policy on file' },
  { label: 'Safety Score', value: '94 / 100' },
];

export function VehicleProfileScreen() {
  return (
    <LinearGradient colors={gradients.page} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Vehicle Profile</Text>
        <Text style={styles.subtitle}>Compliance snapshot and readiness status.</Text>

        <GlassCard>
          <View style={styles.headerRow}>
            <Ionicons name="car-sport" size={18} color={colors.accentStrong} />
            <Text style={styles.cardTitle}>DriveLegal Record</Text>
          </View>

          {vehicleData.map((item) => (
            <View key={item.label} style={styles.itemRow}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemValue}>{item.value}</Text>
            </View>
          ))}
        </GlassCard>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 22,
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.heading,
    fontSize: 28,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  itemRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingVertical: 12,
    gap: 6,
  },
  itemLabel: {
    color: colors.textSecondary,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  itemValue: {
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 14,
  },
});
