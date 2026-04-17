type RulesByState = Record<string, string[]>;

const rulesByState: RulesByState = {
  CA: [
    'Hands-free only while driving; avoid touching your phone.',
    'Move over or slow down for emergency and utility vehicles.',
    'Maximum freeway speeds are typically 65–70 mph.',
  ],
  TX: [
    'Seatbelts are required for all front-seat occupants.',
    'Move over or slow down for stopped emergency vehicles.',
    'School zone speeds and signs are strictly enforced.',
  ],
  NY: [
    'No handheld mobile device use while driving.',
    'Yield to pedestrians in crosswalks at all times.',
    'Move over for stopped emergency and hazard vehicles.',
  ],
  FL: [
    'Texting while driving is prohibited as a primary offense.',
    'Hands-free required in school and work zones.',
    'Move over for law enforcement, emergency, and sanitation vehicles.',
  ],
  MH: [
    'Wear seatbelts at all times and keep documents accessible for checks.',
    'Avoid lane discipline violations and unsafe overtakes on expressways.',
    'Do not use handheld phones while driving in city corridors.',
  ],
  GJ: [
    'Helmets and seatbelts are mandatory for riders and occupants.',
    'Maintain speed discipline on state highways and urban roads.',
    'Yield at intersections and obey traffic signal timings.',
  ],
  KA: [
    'Use indicators before lane changes and turns.',
    'Avoid honking in no-honking and hospital zones.',
    'Follow strict no-phone-while-driving compliance checks.',
  ],
  TN: [
    'Seatbelts are mandatory for front and rear occupants.',
    'Speed monitoring is strict on highways and city bypass roads.',
    'Stop before zebra crossings and yield to pedestrians.',
  ],
  DL: [
    'Carry valid PUC and registration records while driving.',
    'Use seatbelts for all passengers and avoid signal jumping.',
    'Follow no-entry and odd-even advisories when announced.',
  ],
  UP: [
    'Avoid overspeeding and maintain safe distance in mixed traffic.',
    'Helmets and seatbelts are mandatory for compliance checks.',
    'Follow school-zone speed restrictions and marked crossings.',
  ],
  WB: [
    'Respect pedestrian right-of-way at major intersections.',
    'Avoid distracted driving and handheld phone usage.',
    'Observe lane markings and traffic marshals’ instructions.',
  ],
  RJ: [
    'Use headlights responsibly in low-visibility desert corridors.',
    'Observe speed control zones near towns and villages.',
    'Keep emergency lane access clear on highways.',
  ],
  TS: [
    'Wear seatbelts and avoid abrupt lane weaving in urban traffic.',
    'Obey speed cameras and automated challan zones.',
    'Give way to ambulances and emergency response vehicles.',
  ],
  AP: [
    'Follow lane discipline on coastal and national highways.',
    'Do not park in no-parking corridors and junction approaches.',
    'Always carry valid insurance and emission documents.',
  ],
};

const indianRegionNameToCode: Record<string, string> = {
  andhrapradesh: 'AP',
  delhi: 'DL',
  gujarat: 'GJ',
  karnataka: 'KA',
  maharashtra: 'MH',
  rajasthan: 'RJ',
  tamilnadu: 'TN',
  telangana: 'TS',
  uttarpradesh: 'UP',
  westbengal: 'WB',
};

const defaultRules = [
  'Obey posted speed limits and weather-adjusted safe speeds.',
  'Keep a safe following distance (minimum 3-second rule).',
  'Always use seatbelts and avoid distracted driving.',
];

export function getRulesForState(stateCode?: string | null): string[] {
  if (!stateCode) {
    return defaultRules;
  }

  return rulesByState[stateCode.toUpperCase()] ?? defaultRules;
}

export function resolveRegionCode(region?: string | null): string | undefined {
  if (!region) {
    return undefined;
  }

  const normalized = region.toLowerCase().replace(/[^a-z]/g, '');
  return indianRegionNameToCode[normalized];
}
