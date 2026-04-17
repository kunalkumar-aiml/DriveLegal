# DriveLegal

DriveLegal is a proactive road-safety assistant designed for Indian driving scenarios. It combines live location awareness, offline NLP, voice-first input, and a local fine calculation engine to help drivers quickly understand likely violations and compliance context.

## Highlights

- Dark-mode first mobile UI with modern glassmorphism cards
- Three-tab experience: `Live Map`, `AI Assistant`, `Vehicle Profile`
- GPS-aware state context and active traffic rule panel
- Battery-aware background location tracking for state-border transitions
- Local notifications on state change
- Offline NLP extraction with strict JSON entities:
	- `Offense`
	- `Vehicle Type`
	- `State`
- Multilingual voice input pipeline (`Hindi`, `Tamil`, `Telugu`, `Marathi`) with translation to English for downstream processing
- Offline SQLite fine backend with relational rule modeling and country-scoped structure

## Product Flow

1. User enters (or speaks) a driving scenario.
2. Input is translated to English when needed.
3. Local NLP extracts structured entities.
4. Fine engine resolves base offense + state overrides + vehicle multipliers.
5. App returns fine estimate + legal section + practical consequences.

## Tech Stack

- React Native + Expo
- React Navigation (bottom tabs)
- Expo Location + Task Manager + Notifications
- Expo SQLite
- Expo Speech Recognition
- TypeScript

## Project Structure

- `src/screens/` – main app screens
- `src/components/` – reusable UI blocks (`GlassCard` etc.)
- `src/hooks/` – location and state hooks
- `src/services/backgroundStateTracking.ts` – background geolocation flow
- `src/services/offlineNlp/` – local NLP + translation pipeline
- `src/services/stt/` – speech-to-text service and locale handling
- `src/services/fines/` – SQLite schema + fine calculator
- `src/data/` – traffic rule sets + simplified India boundary polygons

## Run Locally

```bash
npm install
npx expo start --clear
```

In the Expo terminal:

- `i` → iOS simulator
- `a` → Android emulator
- `w` → Web

## Native Build Notes

- Some native capabilities (speech recognition, notifications behavior, full background services) are limited in Expo Go.
- For full native testing, use a development build:

```bash
npx expo prebuild
npx expo run:ios
```

## Offline Fine Engine Model

Relational tables (country-extensible):

- `BaseFines` – offense, legal section, base penalty
- `StateRules` – state-level overrides and notes
- `VehicleMultipliers` – vehicle-class multipliers/escalation

Main API:

`calculateFineForEntities({ offense, state, vehicleType, countryCode })`

## Status

Current version is an actively evolving prototype focused on practical, on-device road-safety assistance.
