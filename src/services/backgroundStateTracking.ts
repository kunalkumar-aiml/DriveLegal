import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { indiaStateBoundaries } from '../data/indiaStateBoundaries';
import {
  evaluateSpeedViolationDeduction,
  getSpeedLimitKmphForState,
} from './driverSafetyScore';

const BACKGROUND_LOCATION_TASK = 'drivelegal-background-state-tracker';
const LAST_STATE_KEY = 'drivelegal:last-detected-state';
const GOD_MODE_OVERRIDE_DURATION_MS = 20 * 1000;

const MAHARASHTRA_DEMO_COORDINATES: LocationPoint = {
  latitude: 19.076,
  longitude: 72.8777,
};

const KARNATAKA_DEMO_COORDINATES: LocationPoint = {
  latitude: 12.9716,
  longitude: 77.5946,
};

const backgroundUpdatePolicy = {
  notificationResponsivenessMs: 5 * 60 * 1000,
  maxUpdateDelayMs: 10 * 60 * 1000,
};

function setNotificationResponsiveness(milliseconds: number) {
  backgroundUpdatePolicy.notificationResponsivenessMs = milliseconds;
}

function setMaxUpdateDelayMillis(milliseconds: number) {
  backgroundUpdatePolicy.maxUpdateDelayMs = milliseconds;
}

type LocationPoint = {
  latitude: number;
  longitude: number;
};

type EffectiveLocationUpdate = {
  latitude: number;
  longitude: number;
  speedMetersPerSecond: number | null;
};

let locationOverrideExpiresAt = 0;
let locationOverridePoint: LocationPoint | null = null;

function isPointInPolygon(point: LocationPoint, polygon: Array<[number, number]>) {
  let intersects = false;

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const [currentLon, currentLat] = polygon[current];
    const [previousLon, previousLat] = polygon[previous];

    const hasCrossedEdge =
      currentLat > point.latitude !== previousLat > point.latitude &&
      point.longitude <
        ((previousLon - currentLon) * (point.latitude - currentLat)) /
          (previousLat - currentLat + Number.EPSILON) +
          currentLon;

    if (hasCrossedEdge) {
      intersects = !intersects;
    }
  }

  return intersects;
}

function getStateForCoordinates(latitude: number, longitude: number) {
  const point: LocationPoint = { latitude, longitude };

  return (
    indiaStateBoundaries.find((state) => isPointInPolygon(point, state.polygon)) ??
    null
  );
}

async function handleStateTransition(latitude: number, longitude: number) {
  const state = getStateForCoordinates(latitude, longitude);
  if (!state) {
    return null;
  }

  const previousStateCode = await AsyncStorage.getItem(LAST_STATE_KEY);
  if (previousStateCode === state.code) {
    return state;
  }

  await AsyncStorage.setItem(LAST_STATE_KEY, state.code);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'State Border Crossed - Rules Updated',
      body: `Entered ${state.name}. Local traffic rules are now active.`,
      sound: true,
      data: { stateCode: state.code, stateName: state.name },
    },
    trigger: null,
  });

  return state;
}

function setTemporaryLocationOverride(point: LocationPoint, durationMs: number) {
  locationOverridePoint = point;
  locationOverrideExpiresAt = Date.now() + durationMs;
}

function clearTemporaryLocationOverride() {
  locationOverridePoint = null;
  locationOverrideExpiresAt = 0;
}

function getEffectiveLocationUpdate(latest: Location.LocationObject): EffectiveLocationUpdate {
  const hasActiveOverride =
    locationOverridePoint !== null && locationOverrideExpiresAt > Date.now();

  if (hasActiveOverride) {
    return {
      latitude: locationOverridePoint.latitude,
      longitude: locationOverridePoint.longitude,
      speedMetersPerSecond: latest.coords.speed ?? null,
    };
  }

  if (locationOverridePoint && locationOverrideExpiresAt <= Date.now()) {
    clearTemporaryLocationOverride();
  }

  return {
    latitude: latest.coords.latitude,
    longitude: latest.coords.longitude,
    speedMetersPerSecond: latest.coords.speed ?? null,
  };
}

async function processLocationUpdate(update: EffectiveLocationUpdate) {
  const detectedState = await handleStateTransition(update.latitude, update.longitude);
  const stateCode = detectedState?.code ?? (await AsyncStorage.getItem(LAST_STATE_KEY));
  const speedKmph =
    typeof update.speedMetersPerSecond === 'number' && Number.isFinite(update.speedMetersPerSecond)
      ? update.speedMetersPerSecond * 3.6
      : null;

  const deduction = await evaluateSpeedViolationDeduction({
    stateCode,
    speedKmph,
    speedLimitKmph: getSpeedLimitKmphForState(stateCode),
  });

  if (deduction) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Safety Score Updated',
        body: `Overspeeding detected in ${deduction.event.stateCode}. -5 points from your Driver Safety Score.`,
        sound: true,
        data: {
          type: 'driver-safety-deduction',
          stateCode: deduction.event.stateCode,
          speedKmph: deduction.event.speedKmph,
          speedLimitKmph: deduction.event.speedLimitKmph,
          score: deduction.score,
        },
      },
      trigger: null,
    });
  }
}

TaskManager.defineTask(
  BACKGROUND_LOCATION_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
  if (error) {
    return;
  }

    const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
    if (!locations || locations.length === 0) {
      return;
    }

    const latest = locations[locations.length - 1];
    const effectiveUpdate = getEffectiveLocationUpdate(latest);
    await processLocationUpdate(effectiveUpdate);
  }
);

export async function triggerDeveloperGodModeStateJump() {
  setTemporaryLocationOverride(MAHARASHTRA_DEMO_COORDINATES, GOD_MODE_OVERRIDE_DURATION_MS);

  await AsyncStorage.setItem(LAST_STATE_KEY, 'MH');

  await processLocationUpdate({
    latitude: KARNATAKA_DEMO_COORDINATES.latitude,
    longitude: KARNATAKA_DEMO_COORDINATES.longitude,
    speedMetersPerSecond: 0,
  });
}

export async function initializeBackgroundStateTracking() {
  setNotificationResponsiveness(5 * 60 * 1000);
  setMaxUpdateDelayMillis(10 * 60 * 1000);

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const notificationsPermission = await Notifications.getPermissionsAsync();
  if (!notificationsPermission.granted) {
    await Notifications.requestPermissionsAsync();
  }

  await Notifications.setNotificationChannelAsync('drivelegal-state-alerts', {
    name: 'State Border Alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 120, 220],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    return;
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') {
    return;
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (hasStarted) {
    return;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    activityType: Location.ActivityType.AutomotiveNavigation,
    pausesUpdatesAutomatically: true,
    distanceInterval: 2000,
    timeInterval: backgroundUpdatePolicy.notificationResponsivenessMs,
    deferredUpdatesInterval: backgroundUpdatePolicy.maxUpdateDelayMs,
    deferredUpdatesDistance: 3000,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: 'DriveLegal is monitoring route changes',
      notificationBody: 'State border checks are running with battery-optimized updates.',
      notificationColor: '#0EA5E9',
    },
  });
}

export { BACKGROUND_LOCATION_TASK };
