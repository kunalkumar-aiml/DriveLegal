import type {
  ExpoSpeechRecognitionNativeEventMap,
  ExpoSpeechRecognitionResultEvent,
  ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';

export const SUPPORTED_STT_LANGUAGES = [
  { label: 'Hindi', locale: 'hi-IN' },
  { label: 'Tamil', locale: 'ta-IN' },
  { label: 'Telugu', locale: 'te-IN' },
  { label: 'Marathi', locale: 'mr-IN' },
] as const;

export type SupportedSttLocale = (typeof SUPPORTED_STT_LANGUAGES)[number]['locale'];

type SpeechModule = {
  addListener: <K extends keyof ExpoSpeechRecognitionNativeEventMap>(
    eventName: K,
    listener: (event: ExpoSpeechRecognitionNativeEventMap[K]) => void
  ) => { remove: () => void };
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    requiresOnDeviceRecognition: boolean;
    addsPunctuation: boolean;
    maxAlternatives: number;
  }) => void;
  stop: () => void;
  abort: () => void;
};

let listenersInitialized = false;
let latestTranscript = '';
let recording = false;
let stopResolver: ((transcript: string) => void) | null = null;
let stopRejecter: ((error: Error) => void) | null = null;
let stopTimeout: ReturnType<typeof setTimeout> | null = null;

let cachedSpeechModule: SpeechModule | null | undefined;

function getSpeechModule(): SpeechModule | null {
  if (cachedSpeechModule !== undefined) {
    return cachedSpeechModule;
  }

  try {
    const speechPackage = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: SpeechModule;
    };

    cachedSpeechModule = speechPackage.ExpoSpeechRecognitionModule ?? null;
  } catch {
    cachedSpeechModule = null;
  }

  return cachedSpeechModule;
}

function assertSpeechModuleAvailable(): SpeechModule {
  const speechModule = getSpeechModule();

  if (!speechModule) {
    throw new Error(
      'Speech recognition module is unavailable in this runtime. Use a development build (not Expo Go) after native prebuild.'
    );
  }

  return speechModule;
}

function clearStopPromiseState() {
  if (stopTimeout) {
    clearTimeout(stopTimeout);
    stopTimeout = null;
  }

  stopResolver = null;
  stopRejecter = null;
}

function initializeListeners() {
  if (listenersInitialized) {
    return;
  }

  const speechModule = assertSpeechModuleAvailable();

  speechModule.addListener('result', (event: ExpoSpeechRecognitionResultEvent) => {
    const first = event.results[0]?.transcript?.trim();
    if (first) {
      latestTranscript = first;
    }
  });

  speechModule.addListener('error', (event: ExpoSpeechRecognitionErrorEvent) => {
    recording = false;

    if (stopRejecter) {
      stopRejecter(new Error(event.message || event.error));
      clearStopPromiseState();
    }
  });

  speechModule.addListener('end', () => {
    recording = false;

    if (stopResolver) {
      stopResolver(latestTranscript);
      clearStopPromiseState();
    }
  });

  listenersInitialized = true;
}

export async function startSpeechToText(locale: SupportedSttLocale) {
  const speechModule = assertSpeechModuleAvailable();
  initializeListeners();

  const permission = await speechModule.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Microphone or speech-recognition permission not granted');
  }

  latestTranscript = '';

  speechModule.start({
    lang: locale,
    interimResults: true,
    continuous: true,
    requiresOnDeviceRecognition: true,
    addsPunctuation: true,
    maxAlternatives: 1,
  });

  recording = true;
}

export async function stopSpeechToText(): Promise<string> {
  const speechModule = assertSpeechModuleAvailable();

  if (!recording) {
    return latestTranscript;
  }

  return new Promise((resolve, reject) => {
    stopResolver = resolve;
    stopRejecter = reject;

    stopTimeout = setTimeout(() => {
      resolve(latestTranscript);
      clearStopPromiseState();
    }, 2500);

    speechModule.stop();
  });
}

export function isSpeechRecordingActive() {
  return recording;
}

export async function disposeSpeechToText() {
  try {
    const speechModule = getSpeechModule();

    if (recording) {
      await stopSpeechToText();
    }
    speechModule?.abort();
  } catch {
    clearStopPromiseState();
  }
}
