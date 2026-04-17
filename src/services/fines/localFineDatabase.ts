import { Platform } from 'react-native';

type FineDatabase = {
  execAsync: (query: string) => Promise<void>;
  runAsync: (query: string, params?: Array<string | number | null>) => Promise<void>;
  getFirstAsync: <T>(query: string, params?: Array<string | number | null>) => Promise<T | null>;
};

type BaseFineRecord = {
  id: number;
  country_code: string;
  offense_key: string;
  offense_name: string;
  legal_section: string;
  base_penalty: number;
  legal_consequences: string;
};

type StateRuleRecord = {
  id: number;
  base_fine_id: number;
  state_name: string;
  override_penalty: number | null;
  local_fine_overrides: number;
  legal_note: string | null;
};

type VehicleMultiplierRecord = {
  id: number;
  country_code: string;
  vehicle_class: string;
  multiplier: number;
  escalation_amount: number;
  legal_note: string | null;
};

let fineDatabase: FineDatabase | null = null;

let initialized = false;

export function normalizeLookupValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function initializeFineDatabase() {
  if (initialized) {
    return;
  }

  const database = getFineDatabase();

  await database.execAsync('PRAGMA foreign_keys = ON;');

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS BaseFines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL,
      offense_key TEXT NOT NULL,
      offense_name TEXT NOT NULL,
      legal_section TEXT NOT NULL,
      base_penalty INTEGER NOT NULL,
      legal_consequences TEXT NOT NULL,
      UNIQUE(country_code, offense_key)
    );

    CREATE TABLE IF NOT EXISTS StateRules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_fine_id INTEGER NOT NULL,
      state_name TEXT NOT NULL,
      override_penalty INTEGER,
      local_fine_overrides INTEGER NOT NULL DEFAULT 0,
      legal_note TEXT,
      UNIQUE(base_fine_id, state_name),
      FOREIGN KEY (base_fine_id) REFERENCES BaseFines(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS VehicleMultipliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL,
      vehicle_class TEXT NOT NULL,
      multiplier REAL NOT NULL DEFAULT 1,
      escalation_amount INTEGER NOT NULL DEFAULT 0,
      legal_note TEXT,
      UNIQUE(country_code, vehicle_class)
    );
  `);

  await seedIndiaFineData();
  initialized = true;
}

async function seedIndiaFineData() {
  const database = getFineDatabase();

  const countResult = await database.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM BaseFines WHERE country_code = ?;',
    ['IN']
  );

  if ((countResult?.total ?? 0) > 0) {
    return;
  }

  const baseFines = [
    {
      offenseName: 'No PUCC',
      legalSection: 'Central Motor Vehicles Rules - Emission Compliance',
      basePenalty: 1000,
      legalConsequences: 'Possible challan with pollution compliance direction and retest requirement.',
    },
    {
      offenseName: 'No Helmet',
      legalSection: 'MVA Section 129/177',
      basePenalty: 1000,
      legalConsequences: 'Challan issuance and possible driving license scrutiny for repeat violations.',
    },
    {
      offenseName: 'Overspeeding',
      legalSection: 'MVA Section 183',
      basePenalty: 1500,
      legalConsequences: 'Fine with potential enhanced penalty for repeated overspeed violations.',
    },
    {
      offenseName: 'No Seatbelt',
      legalSection: 'MVA Section 194B',
      basePenalty: 1000,
      legalConsequences: 'Fine for seatbelt non-compliance; repeat offenses can attract stricter checks.',
    },
  ];

  for (const row of baseFines) {
    await database.runAsync(
      `INSERT INTO BaseFines (country_code, offense_key, offense_name, legal_section, base_penalty, legal_consequences)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        'IN',
        normalizeLookupValue(row.offenseName),
        row.offenseName,
        row.legalSection,
        row.basePenalty,
        row.legalConsequences,
      ]
    );
  }

  const noPuccFine = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM BaseFines WHERE country_code = ? AND offense_key = ?;',
    ['IN', normalizeLookupValue('No PUCC')]
  );

  if (noPuccFine?.id) {
    await database.runAsync(
      `INSERT INTO StateRules (base_fine_id, state_name, override_penalty, local_fine_overrides, legal_note)
       VALUES (?, ?, ?, ?, ?);`,
      [
        noPuccFine.id,
        'Delhi',
        1500,
        200,
        'Delhi NCR enforcement may include stricter pollution compliance directives.',
      ]
    );
  }

  const noHelmetFine = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM BaseFines WHERE country_code = ? AND offense_key = ?;',
    ['IN', normalizeLookupValue('No Helmet')]
  );

  if (noHelmetFine?.id) {
    await database.runAsync(
      `INSERT INTO StateRules (base_fine_id, state_name, override_penalty, local_fine_overrides, legal_note)
       VALUES (?, ?, ?, ?, ?);`,
      [
        noHelmetFine.id,
        'Karnataka',
        1200,
        100,
        'Helmet drives in major city corridors may involve spot document checks.',
      ]
    );
  }

  const vehicleRows = [
    {
      vehicleClass: '2-Wheeler',
      multiplier: 1,
      escalationAmount: 100,
      legalNote: 'Secondary safety compliance review may be triggered for repeat 2-wheeler offenses.',
    },
    {
      vehicleClass: 'Car',
      multiplier: 1,
      escalationAmount: 250,
      legalNote: 'Passenger vehicle penalty slab includes standard escalation.',
    },
    {
      vehicleClass: 'Truck',
      multiplier: 1.25,
      escalationAmount: 500,
      legalNote: 'Commercial vehicle offense can invite escalated scrutiny and permit checks.',
    },
    {
      vehicleClass: 'Bus',
      multiplier: 1.2,
      escalationAmount: 600,
      legalNote: 'Public transport violations can involve additional departmental reporting.',
    },
  ];

  for (const row of vehicleRows) {
    await database.runAsync(
      `INSERT INTO VehicleMultipliers (country_code, vehicle_class, multiplier, escalation_amount, legal_note)
       VALUES (?, ?, ?, ?, ?);`,
      ['IN', normalizeLookupValue(row.vehicleClass), row.multiplier, row.escalationAmount, row.legalNote]
    );
  }
}

export function getFineDatabase() {
  if (fineDatabase) {
    return fineDatabase;
  }

  fineDatabase = Platform.OS === 'web' ? createInMemoryWebDatabase() : createNativeSqliteDatabase();
  return fineDatabase;
}

function createNativeSqliteDatabase(): FineDatabase {
  const runtimeRequire = eval('require') as (id: string) => {
    openDatabaseSync: (name: string) => FineDatabase;
  };

  const sqliteModuleName = ['expo', 'sqlite'].join('-');
  const sqliteModule = runtimeRequire(sqliteModuleName);
  return sqliteModule.openDatabaseSync('drivelegal_fines.db');
}

function createInMemoryWebDatabase(): FineDatabase {
  const baseFines: BaseFineRecord[] = [];
  const stateRules: StateRuleRecord[] = [];
  const vehicleMultipliers: VehicleMultiplierRecord[] = [];

  let baseFineId = 1;
  let stateRuleId = 1;
  let vehicleMultiplierId = 1;

  return {
    async execAsync() {
      return;
    },

    async runAsync(query, params = []) {
      if (query.includes('INSERT INTO BaseFines')) {
        const [country_code, offense_key, offense_name, legal_section, base_penalty, legal_consequences] = params;

        baseFines.push({
          id: baseFineId++,
          country_code: String(country_code),
          offense_key: String(offense_key),
          offense_name: String(offense_name),
          legal_section: String(legal_section),
          base_penalty: Number(base_penalty),
          legal_consequences: String(legal_consequences),
        });
        return;
      }

      if (query.includes('INSERT INTO StateRules')) {
        const [base_fine_id, state_name, override_penalty, local_fine_overrides, legal_note] = params;

        stateRules.push({
          id: stateRuleId++,
          base_fine_id: Number(base_fine_id),
          state_name: String(state_name),
          override_penalty: override_penalty === null ? null : Number(override_penalty),
          local_fine_overrides: Number(local_fine_overrides),
          legal_note: legal_note == null ? null : String(legal_note),
        });
        return;
      }

      if (query.includes('INSERT INTO VehicleMultipliers')) {
        const [country_code, vehicle_class, multiplier, escalation_amount, legal_note] = params;

        vehicleMultipliers.push({
          id: vehicleMultiplierId++,
          country_code: String(country_code),
          vehicle_class: String(vehicle_class),
          multiplier: Number(multiplier),
          escalation_amount: Number(escalation_amount),
          legal_note: legal_note == null ? null : String(legal_note),
        });
      }
    },

    async getFirstAsync<T>(query: string, params: Array<string | number | null> = []) {
      if (query.includes('COUNT(*) as total FROM BaseFines WHERE country_code = ?')) {
        const [countryCode] = params;
        const total = baseFines.filter((row) => row.country_code === String(countryCode)).length;
        return { total } as T;
      }

      if (query.includes('SELECT id FROM BaseFines WHERE country_code = ? AND offense_key = ?')) {
        const [countryCode, offenseKey] = params;
        const found = baseFines.find(
          (row) => row.country_code === String(countryCode) && row.offense_key === String(offenseKey)
        );
        return found ? ({ id: found.id } as T) : null;
      }

      if (query.includes('FROM BaseFines') && query.includes('offense_key = ?')) {
        const [countryCode, offenseKey] = params;
        const found = baseFines.find(
          (row) => row.country_code === String(countryCode) && row.offense_key === String(offenseKey)
        );
        return found ? (found as T) : null;
      }

      if (query.includes('FROM StateRules') && query.includes('base_fine_id = ? AND state_name = ?')) {
        const [baseFineIdParam, stateName] = params;
        const found = stateRules.find(
          (row) => row.base_fine_id === Number(baseFineIdParam) && row.state_name === String(stateName)
        );
        return found ? (found as T) : null;
      }

      if (query.includes('FROM VehicleMultipliers') && query.includes('country_code = ? AND vehicle_class = ?')) {
        const [countryCode, vehicleClass] = params;
        const found = vehicleMultipliers.find(
          (row) => row.country_code === String(countryCode) && row.vehicle_class === String(vehicleClass)
        );
        return found ? (found as T) : null;
      }

      return null;
    },
  };
}
