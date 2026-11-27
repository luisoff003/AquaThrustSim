/**
 * AquaThrust — static stability: centre of mass (CM), centre of pressure (CP) and the
 * static margin (in calibres = body diameters).
 *
 * Coordinates: `z` is measured up from the nozzle exit (as in bottle.js); stability
 * results are reported as distances `x` back from the nose tip (rocketry convention).
 *
 * CP uses the Barrowman equations (subsonic, small angle of attack):
 *   nose cone       CNα = 2
 *   shoulder        boat-tail from Db down to the neck Dn → negative CNα (destabilising)
 *   fins            CNα = K·4N(s/d)² / (1 + √(1 + (2l/(cr+ct))²)),  K = 1 + R/(s+R)
 * CM is the mass-weighted average of the empty rocket (shell, nose, fins), the nose
 * ballast and the liquid, which sits at the tail and moves the CM back at launch.
 */
import { BottleProfile } from './bottle.js?v=1.7.1';
import { bodyExtMass } from './presets.js?v=1.7.1';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

export const NOSE_SHAPES = {
  ogive: { sharp: 1, squash: 1 },
  round: { sharp: 0.6, squash: 1 },
  blunt: { sharp: 0, squash: 0.55 },
};

/** Rocket outer geometry shared by the 3D model and the stability maths. */
export function rocketGeometry(P, bottle) {
  const Db = P.diaBot;
  const R = Db / 2;
  const Dn = P.diaNoz;
  const sT = bottle.shoulderTop;
  const cylTop = Math.max(bottle.cylinderTop, sT);
  // nose shape: explicit setting (pointed / rounded / blunt); older designs fall back to Cd
  const shape = NOSE_SHAPES[P.noseShape];
  const sharp = shape ? shape.sharp : clamp((0.85 - P.CDrag) / 0.55, 0, 1);
  const squash = shape ? shape.squash : P.CDrag > 1 ? lerp(1, 0.5, clamp((P.CDrag - 1) / 0.5, 0, 1)) : 1;
  const L = Db * lerp(0.55, 2.2, sharp) * squash;
  const ext = Math.max(0, P.bodyExt || 0);
  const z0 = cylTop - 0.06 * Db + ext; // nose base, pushed up by the body extension
  const span = Db * (P.finSpan ?? 0.62);
  const zr0 = Math.max(sT * 0.35, Dn * 1.2);
  const zr1 = Math.max(zr0 + 0.15 * Db, Math.min(sT + Db * 0.8, cylTop));
  return {
    Db, R, Dn, sT, cylTop, sharp, squash, L, z0, ext,
    noseTip: z0 + L,
    span,
    finCount: P.finCount || 4,
    zr0,
    zr1,
    tipBot: -Db * 0.05,
    tipTop: zr0 + Db * 0.18,
  };
}

/** Height (z) of the centroid of the liquid when the bottle holds volume V. */
function liquidCentroid(bottle, V) {
  if (V <= 1e-9) return 0;
  const hw = bottle.heightForVolume(V);
  const n = 48;
  let m = 0;
  let mz = 0;
  for (let i = 0; i < n; i++) {
    const za = (hw * i) / n;
    const zb = (hw * (i + 1)) / n;
    const dv = bottle.volume(zb) - bottle.volume(za);
    m += dv;
    mz += dv * 0.5 * (za + zb);
  }
  return m > 0 ? mz / m : 0;
}

/** Barrowman centre of pressure. Returns { x, parts } with x from the nose tip. */
export function centerOfPressure(P, bottle, g = rocketGeometry(P, bottle)) {
  const X = (z) => g.noseTip - z;
  const parts = [];
  // nose cone: CNα = 2, position depends on the shape (blunt ellipsoid → ogive)
  parts.push({ k: 'nose', cna: 2, x: g.L * lerp(0.333, 0.466, g.sharp) });
  // shoulder = boat-tail from the body (Db) down to the neck (Dn)
  const zf = g.sT;
  const za = 0.8 * g.Dn;
  const Lt = Math.max(1e-4, zf - za);
  const ratio = g.Db / g.Dn;
  const cnaT = 2 * ((g.Dn / g.Db) ** 2 - 1);
  const xT = X(zf) + (Lt / 3) * (1 + (1 - ratio) / (1 - ratio * ratio));
  parts.push({ k: 'shoulder', cna: cnaT, x: xT });
  // fins
  const N = g.finCount;
  const cr = g.zr1 - g.zr0;
  const ct = g.tipTop - g.tipBot;
  const rRoot = bottle.radiusAt((g.zr0 + g.zr1) / 2);
  const s = Math.max(1e-4, g.R + g.span - rRoot);
  const xR = g.zr1 - g.tipTop; // sweep of the leading edge
  const lm = Math.sqrt(s * s + (xR + ct / 2 - cr / 2) ** 2);
  const K = 1 + rRoot / (s + rRoot);
  const cnaF = (K * 4 * N * (s / g.Db) ** 2) / (1 + Math.sqrt(1 + ((2 * lm) / (cr + ct)) ** 2));
  const xB = X(g.zr1);
  const xF = xB + (xR / 3) * ((cr + 2 * ct) / (cr + ct)) + (1 / 6) * (cr + ct - (cr * ct) / (cr + ct));
  parts.push({ k: 'fins', cna: cnaF, x: xF });
  let sum = 0;
  let mom = 0;
  for (const p of parts) {
    sum += p.cna;
    mom += p.cna * p.x;
  }
  return { x: sum > 0 ? mom / sum : g.noseTip, cna: sum, parts };
}

/** Centre of mass with `water` m³ of liquid on board. Returns { x, mass, items }. */
export function centerOfMass(P, bottle, water, g = rocketGeometry(P, bottle)) {
  const X = (z) => g.noseTip - z;
  const mb = P.massBot;
  const items = [
    { k: 'shell', m: 0.7 * mb, z: bottle.totalHeight * 0.5 },
    { k: 'nose', m: 0.15 * mb, z: g.z0 + g.L * 0.33 },
    { k: 'fins', m: 0.15 * mb, z: (g.zr0 + g.zr1 + g.tipBot + g.tipTop) / 4 },
    { k: 'ballast', m: P.noseMass || 0, z: g.z0 + g.L * 0.3 },
    { k: 'ext', m: bodyExtMass(P), z: g.cylTop - 0.06 * g.Db + g.ext / 2 },
    { k: 'water', m: Math.max(0, water) * P.liquidDensity, z: liquidCentroid(bottle, water) },
  ];
  let m = 0;
  let mz = 0;
  for (const it of items) {
    m += it.m;
    mz += it.m * it.z;
  }
  const z = m > 0 ? mz / m : 0;
  return { x: X(z), z, mass: m, items };
}

export const TARGET = 1.0; // recommended minimum static margin (calibres), rocket empty

export function marginState(cal) {
  if (cal < 0) return 'unstable';
  if (cal < 1) return 'marginal';
  if (cal <= 3) return 'stable';
  return 'over';
}

/**
 * Full stability report.
 * @param {object} P   parameters (uses noseMass, finCount, finSpan)
 * @param {object} [res] simulation result: if given, the margin is also traced over
 *                       the powered flight as the water drains.
 */
export function stabilityReport(P, res) {
  let bottle;
  try {
    bottle = new BottleProfile(P);
  } catch {
    return null;
  }
  if (!(bottle.totalHeight > 0) || P.diaNoz >= P.diaBot) return null;
  const g = rocketGeometry(P, bottle);
  const cp = centerOfPressure(P, bottle, g);
  const at = (V) => {
    const cm = centerOfMass(P, bottle, V, g);
    return { cm, margin: (cp.x - cm.x) / g.Db };
  };
  const launch = at(P.volWat);
  const empty = at(0);
  const fill = [];
  for (let i = 0; i <= 24; i++) {
    const V = (P.volWat * i) / 24;
    fill.push({ V, margin: at(V).margin });
  }
  let trace = null;
  if (res && res.series) {
    const s = res.series;
    const n = res.boostCount;
    const step = Math.max(1, Math.floor(n / 80));
    trace = [];
    for (let i = 0; i < n; i += step) trace.push({ t: s.t[i], margin: at(s.w[i]).margin });
    trace.push({ t: s.t[n - 1], margin: empty.margin });
  }
  // Stability is judged with the rocket EMPTY (the coast is ~99 % of the flight; during the
  // ~0.1 s of thrust the launcher guides the rocket and the water sits at the tail).
  const target = TARGET;
  const worstV = 0;
  const worst = empty;
  let needBallast = 0;
  if (worst.margin < target) {
    const Xt = cp.x - target * g.Db;
    const Xb = g.noseTip - (g.z0 + g.L * 0.3);
    if (Xt > Xb) needBallast = (worst.cm.mass * (worst.cm.x - Xt)) / (Xt - Xb);
  }
  let needSpan = null;
  if (worst.margin < target) {
    let lo = P.finSpan ?? 0.62;
    let hi = 3;
    const f = (sp) => {
      const Q = { ...P, finSpan: sp };
      const gg = rocketGeometry(Q, bottle);
      return (centerOfPressure(Q, bottle, gg).x - centerOfMass(Q, bottle, worstV, gg).x) / g.Db;
    };
    if (f(hi) >= target) {
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) >= target) hi = mid;
        else lo = mid;
      }
      needSpan = hi;
    }
  }
  // body extension that reaches the target (bisection, up to 1.5 m)
  let needExt = null;
  if (worst.margin < target) {
    const f = (e) => {
      const Q = { ...P, bodyExt: e };
      const gg = rocketGeometry(Q, bottle);
      return (centerOfPressure(Q, bottle, gg).x - centerOfMass(Q, bottle, 0, gg).x) / g.Db;
    };
    let lo = P.bodyExt || 0;
    let hi = 1.5;
    if (f(hi) >= target) {
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) >= target) hi = mid;
        else lo = mid;
      }
      needExt = hi;
    }
  }
  return {
    needExt,
    g,
    bottle,
    cp,
    launch,
    empty,
    fill,
    trace,
    target,
    state: marginState(empty.margin),
    launchState: marginState(launch.margin),
    needBallast: needBallast > 0 ? needBallast : 0,
    needSpan,
    caliber: g.Db,
    length: g.noseTip - g.tipBot,
  };
}
