import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { indiaStateBoundaries } from '../data/indiaStateBoundaries';

const BACKGROUND_LOCATION_TASK = 'drivelegal-background-state-tracker';
const LAST_STATE_KEY = 'drivelegal:last-detected-state';

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
    return;
  }

  const previousStateCode = await AsyncStorage.getItem(LAST_STATE_KEY);
  if (previousStateCode === state.code) {
    return;
  }

  await AsyncStorage.setItem(LAST_STATE_KEY, state.code);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'DriveLegal',
      body: `Welcome to ${state.name}. Traffic rules have updated.`,
      sound: true,
      data: { stateCode: state.code, stateName: state.name },
    },
    trigger: null,
  });
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
    await handleStateTransition(latest.coords.latitude, latest.coords.longitude);
  }
);

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
