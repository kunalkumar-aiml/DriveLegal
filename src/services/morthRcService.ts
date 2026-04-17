import {
  initializeVehicleCacheDatabase,
  lookupVehicleFromCache,
  upsertVehicleCache,
} from './vehicleCacheDatabase';
import {
  lookupVehicleByNumber,
  normalizeRegistrationNumber,
  type VehicleRecord,
} from './vehicleRegistry';

export type VehicleLookupSource = 'api-setu-live' | 'sqlite-fallback' | 'local-fallback';

export type VehicleLookupResult = {
  record: VehicleRecord;
  source: VehicleLookupSource;
  verifiedByApiSetu: boolean;
  message?: string;
};

const APISETU_RC_ENDPOINT = process.env.EXPO_PUBLIC_APISETU_RC_ENDPOINT;
const APISETU_API_KEY = process.env.EXPO_PUBLIC_APISETU_API_KEY;
const APISETU_CLIENT_ID = process.env.EXPO_PUBLIC_APISETU_CLIENT_ID;
const APISETU_CLIENT_SECRET = process.env.EXPO_PUBLIC_APISETU_CLIENT_SECRET;

const REQUEST_TIMEOUT_MS = 9000;

export async function fetchVehicleRcDetails(registrationNumber: string): Promise<VehicleLookupResult> {
  const normalizedRegistration = normalizeRegistrationNumber(registrationNumber);
  await initializeVehicleCacheDatabase();

  try {
    if (!APISETU_RC_ENDPOINT) {
      throw new Error('API Setu endpoint is not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const url = `${APISETU_RC_ENDPOINT}?vehicleNumber=${encodeURIComponent(normalizedRegistration)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(APISETU_API_KEY ? { 'x-api-key': APISETU_API_KEY } : {}),
        ...(APISETU_CLIENT_ID ? { 'x-client-id': APISETU_CLIENT_ID } : {}),
        ...(APISETU_CLIENT_SECRET ? { 'x-client-secret': APISETU_CLIENT_SECRET } : {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Setu RC request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const parsed = parseApiSetuResponse(payload, normalizedRegistration);

    await upsertVehicleCache(parsed);

    return {
      record: parsed,
      source: 'api-setu-live',
      verifiedByApiSetu: true,
    };
  } catch {
    const sqliteFallback = await lookupVehicleFromCache(normalizedRegistration);
    if (sqliteFallback) {
      return {
        record: sqliteFallback,
        source: 'sqlite-fallback',
        verifiedByApiSetu: false,
        message: 'Network/API issue detected. Showing cached RC record from local SQLite.',
      };
    }

    const localFallback = lookupVehicleByNumber(normalizedRegistration);
    if (localFallback) {
      return {
        record: localFallback,
        source: 'local-fallback',
        verifiedByApiSetu: false,
        message: 'Network/API unavailable. Showing local fallback record.',
      };
    }

    throw new Error('Vehicle details not found in API Setu response or local fallback sources.');
  }
}

function parseApiSetuResponse(payload: Record<string, unknown>, fallbackRegistration: string): VehicleRecord {
  const root = (payload.data as Record<string, unknown>) || (payload.result as Record<string, unknown>) || payload;

  const record: VehicleRecord = {
    registrationNumber: extractString(root, ['registrationNumber', 'reg_no', 'vehicle_no']) ?? fallbackRegistration,
    ownerName: extractString(root, ['ownerName', 'owner_name', 'owner']) ?? 'Not Available',
    vehicleClass: extractString(root, ['vehicleClass', 'vehicle_class', 'class']) ?? 'Not Available',
    makeModel: extractString(root, ['makeModel', 'make_model', 'maker_model']) ?? 'Not Available',
    fuelType: extractString(root, ['fuelType', 'fuel_type']) ?? 'Not Available',
    engineNumberMasked:
      maskValue(extractString(root, ['engineNumber', 'engine_no'])) ?? 'Not Available',
    chassisNumberMasked:
      maskValue(extractString(root, ['chassisNumber', 'chassis_no'])) ?? 'Not Available',
    registrationDate: extractString(root, ['registrationDate', 'reg_date']) ?? 'Not Available',
    rcValidUpto: extractString(root, ['rcValidUpto', 'rc_valid_upto']) ?? 'Not Available',
    insuranceValidUpto:
      extractString(root, ['insuranceValidUpto', 'insurance_valid_upto']) ?? 'Not Available',
    puccValidUpto: extractString(root, ['puccValidUpto', 'pucc_valid_upto']) ?? 'Not Available',
    roadTaxValidUpto:
      extractString(root, ['roadTaxValidUpto', 'road_tax_valid_upto']) ?? 'Not Available',
    fitnessValidUpto:
      extractString(root, ['fitnessValidUpto', 'fitness_valid_upto']) ?? 'Not Available',
    permitValidUpto: extractString(root, ['permitValidUpto', 'permit_valid_upto']) ?? 'Not Available',
    pendingChallans: Number(extractString(root, ['pendingChallans', 'pending_challans']) ?? 0),
  };

  return {
    ...record,
    registrationNumber: normalizeRegistrationNumber(record.registrationNumber),
  };
}

function extractString(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return null;
}

function maskValue(value: string | null) {
  if (!value) {
    return null;
  }

  const clean = value.replace(/\s+/g, '');
  if (clean.length <= 6) {
    return clean;
  }

  return `${clean.slice(0, 4)}******${clean.slice(-2)}`;
}
