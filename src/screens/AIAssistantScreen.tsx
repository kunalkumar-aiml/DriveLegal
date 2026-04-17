import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GlassCard } from '../components/GlassCard';
import { calculateFineForEntities } from '../services/fines/fineCalculator';
import { initializeFineDatabase } from '../services/fines/localFineDatabase';
import {
  disposeOfflineNlpSession,
  extractOffenseEntities,
  loadLocalInt4Model,
  translateToEnglishText,
} from '../services/offlineNlp/offlineNlpService';
import {
  disposeSpeechToText,
  startSpeechToText,
  stopSpeechToText,
  SUPPORTED_STT_LANGUAGES,
  type SupportedSttLocale,
} from '../services/stt/localSttService';
import { colors, gradients } from '../theme/colors';
import { typography } from '../theme/typography';

export function AIAssistantScreen() {
  const [scenario, setScenario] = useState('A truck crossed 95 km/h in Maharashtra and skipped a seatbelt check.');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<SupportedSttLocale>('hi-IN');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const pulse = useRef(new Animated.Value(1)).current;

  const selectedLanguageLabel = useMemo(
    () => SUPPORTED_STT_LANGUAGES.find((item) => item.locale === selectedLocale)?.label ?? 'Hindi',
    [selectedLocale]
  );

  useEffect(() => {
    void initializeFineDatabase();
    void loadLocalInt4Model();

    return () => {
      void disposeSpeechToText();
      void disposeOfflineNlpSession();
    };
  }, []);

  useEffect(() => {
    if (!recording) {
      pulse.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => {
      animation.stop();
      pulse.setValue(1);
    };
  }, [recording, pulse]);

  const processScenarioText = async (scenarioText: string) => {
    const userText = scenarioText.trim();
    if (!userText) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessages((current) => [...current, { role: 'user', text: userText }]);

    try {
      const entities = await extractOffenseEntities(userText);
      const fineBreakdown = await calculateFineForEntities({
        offense: entities.Offense,
        state: entities.State,
        vehicleType: entities['Vehicle Type'],
        countryCode: 'IN',
      });

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: JSON.stringify(entities, null, 2),
        },
        {
          role: 'assistant',
          text: JSON.stringify(
            {
              exactFineAmount: fineBreakdown.exactFineAmount,
              legalSection: fineBreakdown.legalSection,
              legalConsequences: fineBreakdown.legalConsequences,
              applied: {
                basePenalty: fineBreakdown.basePenalty,
                stateAdjustedPenalty: fineBreakdown.stateAdjustedPenalty,
                multiplierApplied: fineBreakdown.multiplierApplied,
                vehicleEscalation: fineBreakdown.vehicleEscalation,
              },
            },
            null,
            2
          ),
        },
      ]);
      setScenario('');
    } catch {
      setError('Failed to process extraction or fine calculation. Check model and local DB setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    try {
      await processScenarioText(scenario);
    } catch {
      setError('Failed to process extraction or fine calculation. Check model and local DB setup.');
    }
  };

  const handleMicrophonePress = async () => {
    if (loading) {
      return;
    }

    setError(null);

    try {
      if (!recording) {
        await startSpeechToText(selectedLocale);
        setRecording(true);
        return;
      }

      const transcript = await stopSpeechToText();
      setRecording(false);

      if (!transcript.trim()) {
        setError('No voice detected. Please try again in a quieter environment.');
        return;
      }

      const translated = await translateToEnglishText(transcript, selectedLocale);

      setMessages((current) => [
        ...current,
        { role: 'assistant', text: `Voice (${selectedLanguageLabel}): ${transcript}` },
        { role: 'assistant', text: `Translated (English): ${translated}` },
      ]);
      setScenario(translated);
      await processScenarioText(translated);
    } catch {
      setRecording(false);
      setError('Voice transcription failed. Ensure speech model/permissions are available on device.');
    }
  };

  return (
    <LinearGradient colors={gradients.page} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>Offline NLP extractor powered by on-device model inference.</Text>

        <GlassCard glow={false}>
          <View style={styles.row}>
            <Ionicons name="sparkles" color={colors.accentStrong} size={18} />
            <Text style={styles.cardTitle}>Structured Entity Extraction</Text>
          </View>

          <Text style={styles.body}>Enter a scenario and extract exactly three JSON entities:</Text>
          <Text style={styles.schema}>{'{"Offense":"...","Vehicle Type":"...","State":"..."}'}</Text>

          <View style={styles.languageRow}>
            {SUPPORTED_STT_LANGUAGES.map((language) => (
              <Pressable
                key={language.locale}
                onPress={() => setSelectedLocale(language.locale)}
                style={[
                  styles.languageChip,
                  selectedLocale === language.locale ? styles.languageChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.languageChipText,
                    selectedLocale === language.locale ? styles.languageChipTextActive : null,
                  ]}
                >
                  {language.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            multiline
            value={scenario}
            onChangeText={setScenario}
            placeholder="Describe traffic scenario..."
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />

          <View style={styles.actionRow}>
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Pressable
                onPress={handleMicrophonePress}
                style={[styles.micButton, recording ? styles.micButtonActive : null]}
              >
                <Ionicons name={recording ? 'mic' : 'mic-outline'} size={20} color={colors.textPrimary} />
              </Pressable>
            </Animated.View>
            <Text style={styles.micHint}>{recording ? `Listening (${selectedLanguageLabel})... tap to stop` : `Tap mic to speak in ${selectedLanguageLabel}`}</Text>
          </View>

          <Pressable
            onPress={handleExtract}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
              loading ? styles.buttonDisabled : null,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.buttonText}>Extract & Calculate Fine</Text>
            )}
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </GlassCard>

        {messages.map((message, index) => (
          <GlassCard key={`${message.role}-${index}`} glow={false}>
            <Text style={styles.messageRole}>{message.role === 'user' ? 'Scenario' : 'AI Result'}</Text>
            <Text style={styles.messageText}>{message.text}</Text>
          </GlassCard>
        ))}
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
    paddingBottom: 32,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  schema: {
    color: colors.textPrimary,
    fontFamily: typography.medium,
    marginTop: 8,
    marginBottom: 10,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  languageChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceSoft,
  },
  languageChipActive: {
    borderColor: colors.accentStrong,
    backgroundColor: 'rgba(34, 211, 238, 0.16)',
  },
  languageChipText: {
    color: colors.textSecondary,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  languageChipTextActive: {
    color: colors.textPrimary,
  },
  input: {
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceSoft,
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  micButtonActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.25)',
    borderColor: colors.accentStrong,
  },
  micHint: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 12,
    flex: 1,
  },
  button: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accentStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.background,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  error: {
    marginTop: 10,
    color: '#FCA5A5',
    fontFamily: typography.body,
    fontSize: 13,
  },
  messageRole: {
    color: colors.accent,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  messageText: {
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
});
