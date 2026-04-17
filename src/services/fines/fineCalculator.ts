import {
  BaseFineRow,
  FineBreakdown,
  FineEntityInput,
  StateRuleRow,
  VehicleMultiplierRow,
} from './types';
import { getFineDatabase, initializeFineDatabase, normalizeLookupValue } from './localFineDatabase';

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function normalizeVehicleType(value: string) {
  const normalized = normalizeLookupValue(value);

  if (normalized === '2wheeler' || normalized === 'twowheeler' || normalized === 'motorcycle' || normalized === 'bike') {
    return '2-Wheeler';
  }

  if (normalized === 'truck' || normalized === 'lorry') {
    return 'Truck';
  }

  if (normalized === 'bus') {
    return 'Bus';
  }

  if (normalized === 'car' || normalized === 'sedan' || normalized === 'suv') {
    return 'Car';
  }

  return toTitleCase(value);
}

function normalizeOffense(value: string) {
  const lowered = value.toLowerCase().trim();

  if (lowered.includes('pucc') || lowered.includes('pollution')) {
    return 'No PUCC';
  }

  if (lowered.includes('helmet')) {
    return 'No Helmet';
  }

  if (lowered.includes('seatbelt') || lowered.includes('seat belt')) {
    return 'No Seatbelt';
  }

  if (lowered.includes('speed')) {
    return 'Overspeeding';
  }

  return toTitleCase(value);
}

export async function calculateFineForEntities(input: FineEntityInput): Promise<FineBreakdown> {
  await initializeFineDatabase();

  const countryCode = (input.countryCode ?? 'IN').toUpperCase();
  const offense = normalizeOffense(input.offense);
  const state = toTitleCase(input.state);
  const vehicleType = normalizeVehicleType(input.vehicleType);

  const database = getFineDatabase();

  const baseFineFromDb = await database.getFirstAsync<BaseFineRow>(
    `SELECT id, country_code, offense_key, offense_name, legal_section, base_penalty, legal_consequences
     FROM BaseFines
     WHERE country_code = ? AND offense_key = ?;`,
    [countryCode, normalizeLookupValue(offense)]
  );

  const baseFine: BaseFineRow =
    baseFineFromDb ??
    {
      id: -1,
      country_code: countryCode,
      offense_key: normalizeLookupValue(offense),
      offense_name: offense,
      legal_section: 'Local Motor Vehicles Act (Provisional)',
      base_penalty: 500,
      legal_consequences:
        'Exact schedule not found for this offense. Provisional estimate shown; verify with local authority.',
    };

  const stateRule =
    baseFine.id > 0
      ? await database.getFirstAsync<StateRuleRow>(
          `SELECT id, base_fine_id, state_name, override_penalty, local_fine_overrides, legal_note
           FROM StateRules
           WHERE base_fine_id = ? AND state_name = ?;`,
          [baseFine.id, state]
        )
      : null;

  const vehicleRule = await database.getFirstAsync<VehicleMultiplierRow>(
    `SELECT id, country_code, vehicle_class, multiplier, escalation_amount, legal_note
     FROM VehicleMultipliers
     WHERE country_code = ? AND vehicle_class = ?;`,
    [countryCode, normalizeLookupValue(vehicleType)]
  );

  const stateAdjustedPenalty = (stateRule?.override_penalty ?? baseFine.base_penalty) +
    (stateRule?.local_fine_overrides ?? 0);

  const multiplierApplied = vehicleRule?.multiplier ?? 1;
  const vehicleEscalation = vehicleRule?.escalation_amount ?? 0;

  const exactFineAmount = Math.round(stateAdjustedPenalty * multiplierApplied + vehicleEscalation);

  const notes = [
    baseFineFromDb ? null : 'Using provisional penalty fallback due to missing offense mapping.',
    stateRule?.legal_note,
    vehicleRule?.legal_note,
  ].filter((value): value is string => Boolean(value));

  const legalConsequences = [baseFine.legal_consequences, ...notes].join(' ');

  return {
    countryCode,
    offense,
    state,
    vehicleType,
    legalSection: baseFine.legal_section,
    basePenalty: baseFine.base_penalty,
    stateAdjustedPenalty,
    multiplierApplied,
    vehicleEscalation,
    exactFineAmount,
    legalConsequences,
    notes,
  };
}
