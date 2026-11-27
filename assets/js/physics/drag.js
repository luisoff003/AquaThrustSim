/**
 * AquaThrust — automatic drag-coefficient estimate (component build-up, subsonic),
 * in the spirit of the methods used by model-rocket tools (Barrowman / OpenRocket):
 *
 *   Cd = Cd_friction,body + Cd_friction,fins + Cd_nose + Cd_tail + Cd_fin-edges
 *
 * all referred to the frontal area of the bottle, A = πD²/4.
 *   • Skin friction:  Cf = 0.074 / Re^0.2 (turbulent flat plate), Re = v·L/ν
 *       body: Cf·(1 + 60/(L/D)³ + 0.0025·L/D)·S_wet/A      (slenderness correction)
 *       fins: 2·Cf·(1 + 2t/c)·N·S_fin/A                    (both faces, thickness)
 *   • Nose pressure drag: pointed ogive ≈ 0.02, rounded ≈ 0.07, blunt ≈ 0.30
 *   • Tail: base drag 0.12 on the remaining base (neck) + shoulder (boat-tail) drag
 *   • Fin leading/trailing edges: ≈ 1.0 × frontal area of the square-edged fins
 * plus 10 % for joints, tape, imperfect alignment. Reference speed: 35 m/s (typical
 * mid-flight speed of a water rocket). Viscosity follows the air temperature
 * (Sutherland) and density the air pressure.
 */
import { BottleProfile } from './bottle.js?v=1.7.1';
import { rocketGeometry } from './stability.js?v=1.7.1';
const NOSE_CD = { ogive: 0.02, round: 0.07, blunt: 0.3 };
const V_REF = 35;

export function estimateCd(P) {
  let bottle;
  try {
    bottle = new BottleProfile(P);
  } catch {
    return null;
  }
  if (!(bottle.totalHeight > 0) || P.diaNoz >= P.diaBot) return null;
  const g = rocketGeometry(P, bottle);
  const D = g.Db;
  const A = (Math.PI / 4) * D * D;
  const len = g.noseTip - g.tipBot;

  // air properties
  const T = P.aTemperature;
  const rho = (0.028964 * P.pressAtm) / (8.31451 * T);
  const mu = 1.716e-5 * Math.pow(T / 273.15, 1.5) * (383.55 / (T + 110.4));
  const nu = mu / rho;
  const Re = (V_REF * len) / nu;
  const Cf = 0.074 / Math.pow(Re, 0.2);

  // wetted area of body + nose (cylinder approximation of the profile + nose slant)
  const bodyLen = Math.max(0.01, g.z0 - 0);
  const sWetBody = Math.PI * D * bodyLen * 0.92 + Math.PI * g.R * Math.sqrt(g.L * g.L + g.R * g.R);
  const fr = len / D;
  const friction = Cf * (1 + 60 / Math.pow(fr, 3) + 0.0025 * fr) * (sWetBody / A);

  // fins
  const cr = g.zr1 - g.zr0;
  const ct = g.tipTop - g.tipBot;
  const s = g.span;
  const sFin = ((cr + ct) / 2) * s;
  const tFin = Math.min(Math.max(D * 0.025, 0.0015), 0.008);
  const cMean = (cr + ct) / 2;
  const finFriction = 2 * Cf * (1 + (2 * tFin) / cMean) * g.finCount * (sFin / A);
  const finEdges = (1.0 * g.finCount * tFin * s) / A;

  // nose and tail
  const nose = NOSE_CD[P.noseShape] ?? NOSE_CD.round;
  const baseRatio = (P.diaNoz / D) ** 2;
  const shoulderLen = Math.max(1e-3, g.sT - 0.8 * P.diaNoz);
  const tail = 0.12 * baseRatio + 0.1 * (1 - baseRatio) * Math.min(1, (0.6 * D) / shoulderLen);

  const parts = {
    friction,
    fins: finFriction,
    nose,
    tail,
    edges: finEdges,
  };
  let sum = 0;
  for (const k in parts) sum += parts[k];
  const extra = sum * 0.1;
  parts.extra = extra;
  const total = sum + extra;
  return { total, parts, Re, Cf, vRef: V_REF };
}
