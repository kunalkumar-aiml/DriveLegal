export type FineEntityInput = {
  offense: string;
  state: string;
  vehicleType: string;
  countryCode?: string;
};

export type FineBreakdown = {
  countryCode: string;
  offense: string;
  state: string;
  vehicleType: string;
  legalSection: string;
  basePenalty: number;
  stateAdjustedPenalty: number;
  multiplierApplied: number;
  vehicleEscalation: number;
  exactFineAmount: number;
  legalConsequences: string;
  notes: string[];
};

export type BaseFineRow = {
  id: number;
  country_code: string;
  offense_key: string;
  offense_name: string;
  legal_section: string;
  base_penalty: number;
  legal_consequences: string;
};

export type StateRuleRow = {
  id: number;
  base_fine_id: number;
  state_name: string;
  override_penalty: number | null;
  local_fine_overrides: number;
  legal_note: string | null;
};

export type VehicleMultiplierRow = {
  id: number;
  country_code: string;
  vehicle_class: string;
  multiplier: number;
  escalation_amount: number;
  legal_note: string | null;
};
