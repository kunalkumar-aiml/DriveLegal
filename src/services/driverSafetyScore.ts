import AsyncStorage from '@react-native-async-storage/async-storage';

const SCORE_KEY = 'drivelegal:driver-safety-score';
const EVENTS_KEY = 'drivelegal:driver-safety-events';
const LAST_DEDUCTION_KEY = 'drivelegal:driver-safety-last-deduction';

const DEFAULT_SCORE = 100;
const SPEED_DEDUCTION_POINTS = 5;
const DEDUCTION_COOLDOWN_MS = 3 * 60 * 1000;

const HIGH_PENALTY_STATE_CODES = new Set(['DL', 'MH', 'KA', 'TN', 'TS', 'GJ']);

const SPEED_LIMITS_KMPH_BY_STATE_CODE: Record<string, number> = {
  DL: 50,
  MH: 65,
  KA: 60,
  TN: 60,
  TS: 60,
  GJ: 65,
  UP: 60,
  WB: 55,
  RJ: 70,
  AP: 65,
  CA: 105,
  TX: 110,
  NY: 90,
  FL: 100,
};

export type DriverSafetyEvent = {
  id: string;
  timestamp: number;
  type: 'overspeed';
  stateCode: string;
  speedKmph: number;
  speedLimitKmph: number;
  pointsDelta: number;
};

export type DriverSafetySnapshot = {
  score: number;
  events: DriverSafetyEvent[];
};

function toSafeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseEvents(value: string | null): DriverSafetyEvent[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as DriverSafetyEvent[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((event) =>
      Boolean(
        event &&
          typeof event.id === 'string' &&
          typeof event.timestamp === 'number' &&
          event.type === 'overspeed' &&
          typeof event.stateCode === 'string' &&
          typeof event.speedKmph === 'number' &&
          typeof event.speedLimitKmph === 'number' &&
          typeof event.pointsDelta === 'number'
      )
    );
  } catch {
    return [];
  }
}

export function getSpeedLimitKmphForState(stateCode?: string | null) {
  if (!stateCode) {
    return 60;
  }

  return SPEED_LIMITS_KMPH_BY_STATE_CODE[stateCode.toUpperCase()] ?? 60;
}

export function isHighPenaltyState(stateCode?: string | null) {
  if (!stateCode) {
    return false;
  }

  return HIGH_PENALTY_STATE_CODES.has(stateCode.toUpperCase());
}

export async function initializeDriverSafetyScore() {
  const existing = await AsyncStorage.getItem(SCORE_KEY);
  if (existing === null) {
    await AsyncStorage.setItem(SCORE_KEY, String(DEFAULT_SCORE));
  }
}

export async function getDriverSafetySnapshot(): Promise<DriverSafetySnapshot> {
  await initializeDriverSafetyScore();

  const [scoreValue, eventsValue] = await Promise.all([
    AsyncStorage.getItem(SCORE_KEY),
    AsyncStorage.getItem(EVENTS_KEY),
  ]);

  const score = toSafeScore(Number(scoreValue ?? DEFAULT_SCORE));
  const events = parseEvents(eventsValue).sort((left, right) => right.timestamp - left.timestamp);

  return {
    score,
    events,
  };
}

export async function evaluateSpeedViolationDeduction(input: {
  stateCode?: string | null;
  speedKmph?: number | null;
  speedLimitKmph?: number;
}) {
  const stateCode = input.stateCode?.toUpperCase() ?? null;
  const speedKmph = typeof input.speedKmph === 'number' ? input.speedKmph : null;

  if (!stateCode || speedKmph === null || speedKmph <= 0 || !isHighPenaltyState(stateCode)) {
    return null;
  }

  const effectiveLimit = input.speedLimitKmph ?? getSpeedLimitKmphForState(stateCode);
  if (speedKmph <= effectiveLimit) {
    return null;
  }

  const now = Date.now();
  const lastDeductionValue = await AsyncStorage.getItem(LAST_DEDUCTION_KEY);
  const lastDeductionTimestamp = Number(lastDeductionValue ?? 0);

  if (Number.isFinite(lastDeductionTimestamp) && now - lastDeductionTimestamp < DEDUCTION_COOLDOWN_MS) {
    return null;
  }

  const snapshot = await getDriverSafetySnapshot();
  const nextScore = toSafeScore(snapshot.score - SPEED_DEDUCTION_POINTS);

  const event: DriverSafetyEvent = {
    id: `${now}-${stateCode}`,
    timestamp: now,
    type: 'overspeed',
    stateCode,
    speedKmph: Number(speedKmph.toFixed(1)),
    speedLimitKmph: effectiveLimit,
    pointsDelta: -SPEED_DEDUCTION_POINTS,
  };

  const nextEvents = [event, ...snapshot.events].slice(0, 50);

  await Promise.all([
    AsyncStorage.setItem(SCORE_KEY, String(nextScore)),
    AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(nextEvents)),
    AsyncStorage.setItem(LAST_DEDUCTION_KEY, String(now)),
  ]);

  return {
    score: nextScore,
    event,
  };
}
