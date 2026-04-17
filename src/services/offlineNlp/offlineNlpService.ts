import { NativeModules, Platform } from 'react-native';

import {
  LocalLlmConfig,
  OFFLINE_NLP_MODEL_PATH,
  StructuredOffenseEntities,
} from './types';

type DriveLegalNlpNativeModule = {
  createSession: (modelPath: string) => Promise<void>;
  runInference: (prompt: string) => Promise<string>;
  closeSession: () => Promise<void>;
};

const nativeBridge = NativeModules.DriveLegalNlp as DriveLegalNlpNativeModule | undefined;

let serializedOperation: Promise<void> = Promise.resolve();
let isSessionReady = false;

function withMutex<T>(task: () => Promise<T>): Promise<T> {
  const current = serializedOperation.then(task);
  serializedOperation = current.then(
    () => undefined,
    () => undefined
  );
  return current;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function fallbackExtract(input: string): StructuredOffenseEntities {
  const lowered = input.toLowerCase();

  const offense = lowered.includes('speed')
    ? 'Overspeeding'
    : lowered.includes('helmet')
      ? 'No Helmet'
      : lowered.includes('seatbelt')
        ? 'No Seatbelt'
        : 'Traffic Violation';

  const vehicleType = lowered.includes('truck')
    ? 'Truck'
    : lowered.includes('bike') || lowered.includes('motorcycle')
      ? 'Motorcycle'
      : lowered.includes('bus')
        ? 'Bus'
        : lowered.includes('car')
          ? 'Car'
          : 'Unknown';

  const stateMatch = input.match(/\b(Maharashtra|Gujarat|Karnataka|Tamil Nadu|Delhi|Uttar Pradesh|West Bengal|Rajasthan|Telangana|Andhra Pradesh)\b/i);

  return {
    Offense: offense,
    'Vehicle Type': vehicleType,
    State: stateMatch ? stateMatch[0] : 'Unknown',
  };
}

function parseStrictEntities(raw: string): StructuredOffenseEntities {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const keys = Object.keys(parsed).sort();
  const expected = ['Offense', 'State', 'Vehicle Type'];

  if (keys.length !== expected.length || !expected.every((key) => keys.includes(key))) {
    throw new Error('LLM response must contain exactly: Offense, Vehicle Type, State');
  }

  const offense = parsed.Offense;
  const vehicleType = parsed['Vehicle Type'];
  const state = parsed.State;

  if (
    typeof offense !== 'string' ||
    typeof vehicleType !== 'string' ||
    typeof state !== 'string'
  ) {
    throw new Error('LLM JSON fields must all be strings');
  }

  return {
    Offense: normalizeWhitespace(offense),
    'Vehicle Type': normalizeWhitespace(vehicleType),
    State: normalizeWhitespace(state),
  };
}

function buildStructuredExtractionPrompt(userScenario: string) {
  return [
    'You are an offline traffic-law extraction engine.',
    'Extract entities from the user scenario.',
    'Return ONLY strict JSON with exactly these keys and no extras:',
    '{"Offense":"...","Vehicle Type":"...","State":"..."}',
    'If unknown, use "Unknown".',
    `Scenario: ${userScenario}`,
  ].join('\n');
}

function buildTranslationPrompt(text: string, sourceLocale: string) {
  return [
    'You are an offline translation engine for road safety scenarios.',
    `Source language locale: ${sourceLocale}`,
    'Translate the following text to plain English and return only the translated sentence.',
    `Text: ${text}`,
  ].join('\n');
}

function fallbackTranslateToEnglish(text: string): string {
  let output = text;

  const dictionary: Array<[RegExp, string]> = [
    [/बिना\s*पीयूसीसी|नो\s*पीयूसीसी|pucc\s*नहीं/gi, 'No PUCC'],
    [/बिना\s*हेलमेट|हेलमेट\s*नहीं/gi, 'No Helmet'],
    [/ओवरस्पीडिंग|तेज\s*रफ्तार/gi, 'Overspeeding'],
    [/ट्रक/gi, 'truck'],
    [/कार/gi, 'car'],
    [/बाइक|मोटरसाइकिल/gi, 'motorcycle'],
    [/महाराष्ट्र/gi, 'Maharashtra'],
    [/दिल्ली/gi, 'Delhi'],
    [/तमिलनाडु|तमिल\s*नाडु/gi, 'Tamil Nadu'],
    [/தமிழ்\s*நாடு|தமிழ்நாடு/gi, 'Tamil Nadu'],
    [/ஹெல்மெட்\s*இல்லை/gi, 'No Helmet'],
    [/வேகமாக|அதிக\s*வேகம்/gi, 'Overspeeding'],
    [/తెలంగాణ/gi, 'Telangana'],
    [/హెల్మెట్\s*లేదు/gi, 'No Helmet'],
    [/అధిక\s*వేగం/gi, 'Overspeeding'],
    [/महाराष्ट्र/gi, 'Maharashtra'],
    [/हेल्मेट\s*नाही/gi, 'No Helmet'],
  ];

  for (const [pattern, replacement] of dictionary) {
    output = output.replace(pattern, replacement);
  }

  return normalizeWhitespace(output);
}

async function ensureSessionReadyUnlocked(config?: Partial<LocalLlmConfig>) {
  if (isSessionReady) {
    return;
  }

  if (!nativeBridge || Platform.OS !== 'android') {
    isSessionReady = true;
    return;
  }

  await nativeBridge.createSession(config?.modelPath ?? OFFLINE_NLP_MODEL_PATH);
  isSessionReady = true;
}

export async function loadLocalInt4Model(config?: Partial<LocalLlmConfig>) {
  return withMutex(async () => {
    await ensureSessionReadyUnlocked(config);
  });
}

export async function translateToEnglishText(inputText: string, sourceLocale: string) {
  return withMutex(async () => {
    await ensureSessionReadyUnlocked();

    if (!nativeBridge || Platform.OS !== 'android') {
      return fallbackTranslateToEnglish(inputText);
    }

    const prompt = buildTranslationPrompt(inputText, sourceLocale);
    const translated = await nativeBridge.runInference(prompt);
    return normalizeWhitespace(translated);
  });
}

export async function extractOffenseEntities(userScenario: string): Promise<StructuredOffenseEntities> {
  return withMutex(async () => {
    await ensureSessionReadyUnlocked();

    if (!nativeBridge || Platform.OS !== 'android') {
      return fallbackExtract(userScenario);
    }

    const prompt = buildStructuredExtractionPrompt(userScenario);
    const llmResponse = await nativeBridge.runInference(prompt);

    return parseStrictEntities(llmResponse);
  });
}

export async function disposeOfflineNlpSession() {
  return withMutex(async () => {
    if (!isSessionReady) {
      return;
    }

    if (nativeBridge && Platform.OS === 'android') {
      await nativeBridge.closeSession();
    }

    isSessionReady = false;
  });
}
