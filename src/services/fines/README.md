# Local Fine Engine (SQLite)

This module provides an offline, country-extensible fine calculation backend.

## Tables

- `BaseFines` (`Offense`, `Legal Section`, `Base Penalty`)
- `StateRules` (`State Name`, `Local Fine Overrides`)
- `VehicleMultipliers` (`Vehicle Class`, escalation and multiplier)

## Calculation flow

1. Resolve base fine by offense + country.
2. Apply state override and local add-on fine.
3. Apply vehicle multiplier and escalation amount.
4. Return exact fine amount with legal consequences.

## Country swap support

All table lookups are scoped by `country_code`. To support another country:

1. Seed `BaseFines` and `VehicleMultipliers` with the new country code.
2. Add related `StateRules` rows.
3. Pass `countryCode` into `calculateFineForEntities`.
