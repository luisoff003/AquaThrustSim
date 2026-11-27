/**
 * AquaThrust — default parameters, presets, gases, liquids and UI ranges.
 * Internal units are SI; `gPressure` is gauge pressure in bar.
 */

export const GASES = {
  air: { gamma: 1.4, molar: 0.028964, color: 0x3b82f6, short: 'AIR' },
  co2: { gamma: 1.31, molar: 0.0441, color: 0x9aa3ad, short: 'CO₂' },
  helium: { gamma: 1.67, molar: 0.004, color: 0x8b5a2b, short: 'He' },
  nitrogen: { gamma: 1.4013, molar: 0.0280134, color: 0x22262b, short: 'N₂' },
};

const R = 8.31451;

/**
 * Typical pressure limits by bottle type (gauge pressure, bar). These are typical
 * values for new, undamaged bottles at room temperature — real bottles vary, and
 * scratches, sunlight, heat, age and previous launches all lower them.
 *   safe:  recommended maximum launch pressure
 *   burst: pressure from which a typical bottle of that kind can burst (low end of
 *          the typical range, so warnings err on the safe side)
 */
export const BOTTLE_TYPES = {
  still: {
    safe: 3,
    burst: 4, // lower end of the typical range, used for the warnings
    burstRange: [4, 6],
  },
  soda: {
    safe: 7,
    burst: 10,
    burstRange: [10, 14],
  },
  tested: {
    safe: null, // uses P.ratedPressure
    burst: null,
  },
};

/**
 * Typical commercial PET bottles (approximate, they vary by brand):
 *   vol   brim-full internal volume (m³, slightly above the label)
 *   dia   body outside diameter (m)
 *   noz   neck bore (m) — PCO 1881 / 28 mm necks ≈ 21.7 mm
 *   mass  empty bottle mass (kg)
 * Picking a model also adds ~45 g for fins and nose cone to the empty rocket mass and
 * fills the bottle one third with water.
 */
export const BOTTLE_MODELS = [
  { id: 'soda500', type: 'soda', vol: 0.00053, dia: 0.065, noz: 0.0217, mass: 0.02 },
  { id: 'soda600', type: 'soda', vol: 0.00063, dia: 0.068, noz: 0.0217, mass: 0.022 },
  { id: 'soda1000', type: 'soda', vol: 0.00105, dia: 0.081, noz: 0.0217, mass: 0.032 },
  { id: 'soda1500', type: 'soda', vol: 0.00157, dia: 0.092, noz: 0.0217, mass: 0.04 },
  { id: 'soda2000', type: 'soda', vol: 0.0021, dia: 0.105, noz: 0.0217, mass: 0.048 },
  { id: 'soda2500', type: 'soda', vol: 0.00262, dia: 0.11, noz: 0.0217, mass: 0.055 },
  { id: 'soda3000', type: 'soda', vol: 0.00315, dia: 0.12, noz: 0.0217, mass: 0.065 },
  { id: 'still500', type: 'still', vol: 0.00052, dia: 0.064, noz: 0.0217, mass: 0.011 },
  { id: 'still1000', type: 'still', vol: 0.00104, dia: 0.08, noz: 0.0217, mass: 0.02 },
  { id: 'still1500', type: 'still', vol: 0.00156, dia: 0.088, noz: 0.0217, mass: 0.026 },
];
export const ROCKET_EXTRAS = 0.045; // kg: fins + nose cone added to the bottle mass

/** Areal density of the body-extension sleeve (light cardboard / PET), kg/m². */
export const EXT_AREAL = 0.5;
/** Mass (kg) of the body extension: a tube of the bottle diameter and length bodyExt. */
export function bodyExtMass(P) {
  return Math.PI * P.diaBot * (P.bodyExt || 0) * EXT_AREAL;
}

/** Safe / burst limits (bar) for the current parameters. */
export function bottleLimits(P) {
  const t = BOTTLE_TYPES[P.bottleType] || BOTTLE_TYPES.soda;
  if (P.bottleType === 'tested') {
    const rated = P.ratedPressure || 10;
    return { type: t, safe: rated, burst: rated * 1.25, rated };
  }
  return { type: t, safe: t.safe, burst: t.burst };
}

export const BASE = {
  gPressure: 7.0, // bar (gauge)
  aTemperature: 298.15, // K
  ltDia: 0.0, // m
  diaNoz: 0.022, // m
  diaBot: 0.105, // m
  CDrag: 0.5,
  ltLength: 0.0, // m
  massBot: 0.1, // kg (empty rocket)
  volWat: 0.0005, // m³
  volBot: 0.0021, // m³
  lVol: 0.0005, // m³ (launcher dead volume, only matters with a launch tube)
  effWat: 0.97,
  effGas: 0.97,
  humidity: 1.0, // 0-1
  noz0: 0.28,
  noz1: 0.32,
  noz2: 0.88,
  pressAtm: 101325.0, // Pa
  gravity: 9.807, // m/s²
  gas: 'air',
  gasGamma: 1.4,
  Rgas: R / 0.028964,
  liquidDensity: 997.0, // kg/m³
  bottleType: 'soda', // still | soda | tested  (pressure safety warnings only)
  ratedPressure: 10, // bar, test rating when bottleType = 'tested'
  noseMass: 0, // kg, extra weight (ballast) in the nose — adds to the flight mass
  finCount: 4, // 3 or 4 fins
  finSpan: 1.0, // fin span as a fraction of the bottle diameter
  bottleModel: '', // id from BOTTLE_MODELS, '' = custom
  bodyExt: 0, // m, unpressurised body extension between bottle and nose (longer, not bigger)
  noseShape: 'round', // ogive | round | blunt
  cdMode: 'auto', // auto: CDrag estimated from the geometry (physics/drag.js) | custom
  surface: 'smooth', // smooth | painted | tape | rough (skin-friction factor, Auto Cd)
  finEdge: 'square', // square | rounded | airfoil (fin-edge drag, Auto Cd)
  addons: '', // '' | 'lug' | 'cam' | 'lug+cam' (things stuck on the side, Auto Cd)
};

export function withGas(P, gasKey) {
  const g = GASES[gasKey] || GASES.air;
  return { ...P, gas: gasKey, gasGamma: g.gamma, Rgas: R / g.molar };
}

export const PRESETS = [
  {
    id: 'classic',
    params: { ...BASE, bottleModel: '' },
  },
  {
    id: 'beginner',
    params: { ...BASE, gPressure: 4, diaBot: 0.09, volBot: 0.0015, volWat: 0.0005, massBot: 0.085, CDrag: 0.45 },
  },
  {
    id: 'tube',
    params: { ...BASE, ltDia: 0.018, ltLength: 0.3, lVol: 0.0005, massBot: 0.11 },
  },
  {
    id: 'highpressure',
    params: {
      ...BASE, gPressure: 68.95, diaNoz: 0.015, diaBot: 0.0634, CDrag: 0.69, massBot: 1.57,
      volWat: 0.002, volBot: 0.00732, lVol: 0, noz0: 0.54, noz1: 0.38, noz2: 0.7,
      bottleType: 'tested', ratedPressure: 85, finSpan: 0.6, noseMass: 0.05, cdMode: 'custom',
    },
  },
  {
    id: 'longtube',
    params: {
      ...BASE, gPressure: 51.1, ltDia: 0.0155, diaNoz: 0.0155, diaBot: 0.063, CDrag: 0.68,
      ltLength: 1.45, massBot: 1.68, volWat: 0.0018, volBot: 0.00706, lVol: 0,
      noz0: 0.54, noz1: 0.38, noz2: 0.7, bottleType: 'tested', ratedPressure: 65, finSpan: 0.6, noseMass: 0.05, cdMode: 'custom',
    },
  },
  {
    id: 'mountain',
    params: { ...BASE, aTemperature: 270.15, pressAtm: 74700, humidity: 0.6 },
  },
];

/**
 * UI definitions. `toUI`/`fromUI` convert between internal SI values and what the
 * user sees. `scale: 'log'` uses a logarithmic slider. Labels and help texts live
 * in i18n.js under 'f.<key>' and 'h.<key>'.
 */
export const FIELDS = {
  rocket: [
    { key: 'diaBot', unit: 'mm', min: 20, max: 280, step: 1, scale: 'log', toUI: (v) => v * 1000, fromUI: (v) => v / 1000, digits: 0 },
    { key: 'volBot', unit: 'L', min: 0.1, max: 30, step: 0.01, scale: 'log', toUI: (v) => v * 1000, fromUI: (v) => v / 1000, digits: 2 },
    { key: 'volWat', unit: 'L', min: 0.01, max: 30, step: 0.01, scale: 'log', toUI: (v) => v * 1000, fromUI: (v) => v / 1000, digits: 2 },
    { key: 'diaNoz', unit: 'mm', min: 2, max: 120, step: 0.1, scale: 'log', toUI: (v) => v * 1000, fromUI: (v) => v / 1000, digits: 1 },
    { key: 'massBot', unit: 'g', min: 30, max: 5800, step: 1, scale: 'log', toUI: (v) => v * 1000, fromUI: (v) => v / 1000, digits: 0 },
  ],
  drag: [
    { key: 'CDrag', unit: 'Cd', min: 0.05, max: 1.5, step: 0.01, scale: 'log', toUI: (v) => v, fromUI: (v) => v, digits: 2 },
  ],
  rocketAdvanced: [
    { key: 'noz0', unit: '', min: 0, max: 50, step: 1, toUI: (v) => v * 50, fromUI: (v) => v / 50, digits: 0 },
    { key: 'noz1', unit: '', min: 0, max: 50, step: 1, toUI: (v) => v * 50, fromUI: (v) => v / 50, digits: 0 },
    { key: 'noz2', unit: '', min: 0, max: 50, step: 1, toUI: (v) => v * 50, fromUI: (v) => v / 50, digits: 0 },
    { key: 'effWat', unit: '', min: 0.5, max: 1, step: 0.01, toUI: (v) => v, fromUI: (v) => v, digits: 2 },
    { key: 'effGas', unit: '', min: 0.5, max: 1, step: 0.01, toUI: (v) => v, fromUI: (v) => v, digits: 2 },
  ],
  launcher: [
    { key: 'gPressure', unit: 'bar', min: 0.5, max: 100, step: 0.05, scale: 'log', toUI: (v) => v, fromUI: (v) => v, digits: 2,
      alt: (v) => `${Math.round(v * 14.5038)} psi` },
    { key: 'ltLength', unit: 'mm', min: 0, max: 2500, step: 5, toUI: (v) => v * 1000, fromUI: (v) => v / 1000, digits: 0 },
    { key: 'ltDia', unit: 'mm', min: 0, max: 120, step: 0.5, toUI: (v) => v * 1000, fromUI: (v) => v / 1000, digits: 1 },
  ],
  launcherAdvanced: [
    { key: 'lVol', unit: 'L', min: 0, max: 30, step: 0.05, toUI: (v) => v * 1000, fromUI: (v) => v / 1000, digits: 2 },
  ],
  environment: [
    { key: 'aTemperature', unit: '°C', min: -5, max: 55, step: 0.5, toUI: (v) => v - 273.15, fromUI: (v) => v + 273.15, digits: 1,
      alt: (v) => `${Math.round(v * 1.8 + 32)} °F` },
    { key: 'pressAtm', unit: 'hPa', min: 337, max: 1079, step: 1, toUI: (v) => v / 100, fromUI: (v) => v * 100, digits: 0 },
    { key: 'humidity', unit: '%', min: 0, max: 100, step: 1, toUI: (v) => v * 100, fromUI: (v) => v / 100, digits: 0 },
  ],
  stability: [
    { key: 'finSpan', unit: '× D', min: 0.2, max: 2, step: 0.01, toUI: (v) => v, fromUI: (v) => v, digits: 2 },
    { key: 'noseMass', unit: 'g', min: 0, max: 600, step: 1, toUI: (v) => v * 1000, fromUI: (v) => v / 1000, digits: 0 },
    { key: 'bodyExt', unit: 'mm', min: 0, max: 1000, step: 5, toUI: (v) => v * 1000, fromUI: (v) => v / 1000, digits: 0 },
  ],
  environmentAdvanced: [
    { key: 'gravity', unit: 'm/s²', min: 9.78, max: 9.84, step: 0.001, toUI: (v) => v, fromUI: (v) => v, digits: 3 },
    { key: 'liquidDensity', unit: 'g/cm³', min: 0.6, max: 14, step: 0.01, scale: 'log', toUI: (v) => v / 1000, fromUI: (v) => v * 1000, digits: 2 },
  ],
};

/** Gravity → approximate latitude (degrees), International Gravity Formula inverse. */
export function gravityToLatitude(g) {
  const s2 = (g / 9.780327 - 1) / 0.0053024;
  return (Math.asin(Math.sqrt(Math.min(1, Math.max(0, s2)))) * 180) / Math.PI;
}
