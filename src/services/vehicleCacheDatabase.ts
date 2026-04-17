import { Platform } from 'react-native';

import {
  getAllLocalVehicleRecords,
  normalizeRegistrationNumber,
  type VehicleRecord,
} from './vehicleRegistry';

type VehicleCacheDb = {
  execAsync: (query: string) => Promise<void>;
  runAsync: (query: string, params?: Array<string | number | null>) => Promise<void>;
  getFirstAsync: <T>(query: string, params?: Array<string | number | null>) => Promise<T | null>;
};

type VehicleCacheRow = {
  registration_number: string;
  owner_name: string;
  vehicle_class: string;
  make_model: string;
  fuel_type: string;
  engine_number_masked: string;
  chassis_number_masked: string;
  registration_date: string;
  rc_valid_upto: string;
  insurance_valid_upto: string;
  pucc_valid_upto: string;
  road_tax_valid_upto: string;
  fitness_valid_upto: string;
  permit_valid_upto: string | null;
  pending_challans: number;
  last_synced_at: string;
};

let dbInstance: VehicleCacheDb | null = null;
let initialized = false;

export async function initializeVehicleCacheDatabase() {
  if (initialized) {
    return;
  }

  const db = getVehicleCacheDb();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS VehicleRcCache (
      registration_number TEXT PRIMARY KEY,
      owner_name TEXT NOT NULL,
      vehicle_class TEXT NOT NULL,
      make_model TEXT NOT NULL,
      fuel_type TEXT NOT NULL,
      engine_number_masked TEXT NOT NULL,
      chassis_number_masked TEXT NOT NULL,
      registration_date TEXT NOT NULL,
      rc_valid_upto TEXT NOT NULL,
      insurance_valid_upto TEXT NOT NULL,
      pucc_valid_upto TEXT NOT NULL,
      road_tax_valid_upto TEXT NOT NULL,
      fitness_valid_upto TEXT NOT NULL,
      permit_valid_upto TEXT,
      pending_challans INTEGER NOT NULL,
      last_synced_at TEXT NOT NULL
    );
  `);

  await seedVehicleCacheFromLocalRegistry();
  initialized = true;
}

export async function upsertVehicleCache(record: VehicleRecord) {
  await initializeVehicleCacheDatabase();

  await writeVehicleCacheRow(record);
}

async function writeVehicleCacheRow(record: VehicleRecord) {

  const db = getVehicleCacheDb();

  await db.runAsync(
    `INSERT OR REPLACE INTO VehicleRcCache (
      registration_number,
      owner_name,
      vehicle_class,
      make_model,
      fuel_type,
      engine_number_masked,
      chassis_number_masked,
      registration_date,
      rc_valid_upto,
      insurance_valid_upto,
      pucc_valid_upto,
      road_tax_valid_upto,
      fitness_valid_upto,
      permit_valid_upto,
      pending_challans,
      last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      normalizeRegistrationNumber(record.registrationNumber),
      record.ownerName,
      record.vehicleClass,
      record.makeModel,
      record.fuelType,
      record.engineNumberMasked,
      record.chassisNumberMasked,
      record.registrationDate,
      record.rcValidUpto,
      record.insuranceValidUpto,
      record.puccValidUpto,
      record.roadTaxValidUpto,
      record.fitnessValidUpto,
      record.permitValidUpto ?? null,
      record.pendingChallans,
      new Date().toISOString(),
    ]
  );
}

export async function lookupVehicleFromCache(registrationNumber: string): Promise<VehicleRecord | null> {
  await initializeVehicleCacheDatabase();

  const db = getVehicleCacheDb();
  const normalized = normalizeRegistrationNumber(registrationNumber);

  const row = await db.getFirstAsync<VehicleCacheRow>(
    `SELECT
      registration_number,
      owner_name,
      vehicle_class,
      make_model,
      fuel_type,
      engine_number_masked,
      chassis_number_masked,
      registration_date,
      rc_valid_upto,
      insurance_valid_upto,
      pucc_valid_upto,
      road_tax_valid_upto,
      fitness_valid_upto,
      permit_valid_upto,
      pending_challans,
      last_synced_at
    FROM VehicleRcCache
    WHERE registration_number = ?;`,
    [normalized]
  );

  if (!row) {
    return null;
  }

  return {
    registrationNumber: row.registration_number,
    ownerName: row.owner_name,
    vehicleClass: row.vehicle_class,
    makeModel: row.make_model,
    fuelType: row.fuel_type,
    engineNumberMasked: row.engine_number_masked,
    chassisNumberMasked: row.chassis_number_masked,
    registrationDate: row.registration_date,
    rcValidUpto: row.rc_valid_upto,
    insuranceValidUpto: row.insurance_valid_upto,
    puccValidUpto: row.pucc_valid_upto,
    roadTaxValidUpto: row.road_tax_valid_upto,
    fitnessValidUpto: row.fitness_valid_upto,
    permitValidUpto: row.permit_valid_upto ?? undefined,
    pendingChallans: row.pending_challans,
  };
}

function getVehicleCacheDb() {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = Platform.OS === 'web' ? createInMemoryVehicleCacheDb() : createNativeVehicleCacheDb();
  return dbInstance;
}

function createNativeVehicleCacheDb(): VehicleCacheDb {
  const runtimeRequire = eval('require') as (id: string) => {
    openDatabaseSync: (name: string) => VehicleCacheDb;
  };

  const sqliteModule = runtimeRequire(['expo', 'sqlite'].join('-'));
  return sqliteModule.openDatabaseSync('drivelegal_vehicle_cache.db');
}

function createInMemoryVehicleCacheDb(): VehicleCacheDb {
  const store = new Map<string, VehicleCacheRow>();

  return {
    async execAsync() {
      return;
    },

    async runAsync(query: string, params: Array<string | number | null> = []) {
      if (!query.includes('INSERT OR REPLACE INTO VehicleRcCache')) {
        return;
      }

      const [
        registration_number,
        owner_name,
        vehicle_class,
        make_model,
        fuel_type,
        engine_number_masked,
        chassis_number_masked,
        registration_date,
        rc_valid_upto,
        insurance_valid_upto,
        pucc_valid_upto,
        road_tax_valid_upto,
        fitness_valid_upto,
        permit_valid_upto,
        pending_challans,
        last_synced_at,
      ] = params;

      store.set(String(registration_number), {
        registration_number: String(registration_number),
        owner_name: String(owner_name),
        vehicle_class: String(vehicle_class),
        make_model: String(make_model),
        fuel_type: String(fuel_type),
        engine_number_masked: String(engine_number_masked),
        chassis_number_masked: String(chassis_number_masked),
        registration_date: String(registration_date),
        rc_valid_upto: String(rc_valid_upto),
        insurance_valid_upto: String(insurance_valid_upto),
        pucc_valid_upto: String(pucc_valid_upto),
        road_tax_valid_upto: String(road_tax_valid_upto),
        fitness_valid_upto: String(fitness_valid_upto),
        permit_valid_upto: permit_valid_upto == null ? null : String(permit_valid_upto),
        pending_challans: Number(pending_challans),
        last_synced_at: String(last_synced_at),
      });
    },

    async getFirstAsync<T>(query: string, params: Array<string | number | null> = []) {
      if (!query.includes('FROM VehicleRcCache')) {
        return null;
      }

      const [registrationNumber] = params;
      const row = store.get(String(registrationNumber));
      return (row as T) ?? null;
    },
  };
}

async function seedVehicleCacheFromLocalRegistry() {
  const localVehicles = getAllLocalVehicleRecords();

  for (const record of localVehicles) {
    await writeVehicleCacheRow(record);
  }
}
