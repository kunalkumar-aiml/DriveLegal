import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GlassCard } from '../components/GlassCard';
import { initializeVehicleCacheDatabase } from '../services/vehicleCacheDatabase';
import { fetchVehicleRcDetails, type VehicleLookupSource } from '../services/morthRcService';
import { lookupVehicleByNumber, type VehicleRecord } from '../services/vehicleRegistry';
import { colors, gradients } from '../theme/colors';
import { typography } from '../theme/typography';

export function VehicleProfileScreen() {
  const [registrationNumber, setRegistrationNumber] = useState('DL01AB1234');
  const [record, setRecord] = useState<VehicleRecord | null>(lookupVehicleByNumber('DL01AB1234'));
  const [lookupSource, setLookupSource] = useState<VehicleLookupSource>('local-fallback');
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void initializeVehicleCacheDatabase();
  }, []);

  const handleLookup = async () => {
    setLoading(true);
    setError(null);
    setSourceMessage(null);

    try {
      const result = await fetchVehicleRcDetails(registrationNumber);
      setRecord(result.record);
      setLookupSource(result.source);
      setSourceMessage(result.message ?? null);
    } catch {
      setRecord(null);
      setError('Vehicle number not found. Try: TN05BH9417, DL01AB1234, MH12XY7788, KA03TR9921');
    } finally {
      setLoading(false);
    }
  };

  const rows = record
    ? [
        { label: 'Vehicle Number', value: record.registrationNumber },
        { label: 'Owner Name', value: record.ownerName },
        { label: 'Vehicle Class', value: record.vehicleClass },
        { label: 'Make / Model', value: record.makeModel },
        { label: 'Fuel Type', value: record.fuelType },
        { label: 'Registration Date', value: record.registrationDate },
        { label: 'RC Valid Upto', value: record.rcValidUpto },
        { label: 'Insurance Valid Upto', value: record.insuranceValidUpto },
        { label: 'PUCC Valid Upto', value: record.puccValidUpto },
        { label: 'Road Tax Valid Upto', value: record.roadTaxValidUpto },
        { label: 'Fitness Valid Upto', value: record.fitnessValidUpto },
        { label: 'Permit Valid Upto', value: record.permitValidUpto ?? 'Not Applicable' },
        { label: 'Engine Number', value: record.engineNumberMasked },
        { label: 'Chassis Number', value: record.chassisNumberMasked },
        { label: 'Pending Challans', value: String(record.pendingChallans) },
      ]
    : [];

  return (
    <LinearGradient colors={gradients.page} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Vehicle Profile</Text>
        <Text style={styles.subtitle}>Enter your vehicle number to fetch RC and owner details.</Text>

        <GlassCard>
          <View style={styles.headerRow}>
            <Ionicons name="car-sport" size={18} color={colors.accentStrong} />
            <Text style={styles.cardTitle}>DriveLegal Record</Text>
            {lookupSource === 'api-setu-live' ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>Verified by API Setu</Text>
              </View>
            ) : null}
          </View>

          <TextInput
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            placeholder="e.g. DL01AB1234"
            autoCapitalize="characters"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />

          <Pressable style={[styles.lookupButton, loading ? styles.lookupButtonDisabled : null]} onPress={handleLookup}>
            <Text style={styles.lookupButtonText}>{loading ? 'Fetching...' : 'Fetch Vehicle Details'}</Text>
          </Pressable>

          {sourceMessage ? <Text style={styles.sourceInfoText}>{sourceMessage}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {rows.map((item) => (
            <View key={item.label} style={styles.itemRow}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemValue}>{item.value}</Text>
            </View>
          ))}
        </GlassCard>
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
    flex: 1,
  },
  verifiedBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  verifiedBadgeText: {
    color: '#34D399',
    fontFamily: typography.semibold,
    fontSize: 11,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontFamily: typography.medium,
    fontSize: 14,
    marginBottom: 10,
  },
  lookupButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.accentStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lookupButtonDisabled: {
    opacity: 0.7,
  },
  lookupButtonText: {
    color: colors.background,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  errorText: {
    color: '#FCA5A5',
    fontFamily: typography.body,
    fontSize: 12,
    marginBottom: 8,
  },
  sourceInfoText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 12,
    marginBottom: 8,
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
