/**
 * AquaThrust — Water rocket flight engine.
 *
 * One-dimensional (vertical) flight model in four phases:
 *
 *   0. Launch tube   – the rocket slides up a tube that seals the nozzle; the gas
 *                      (bottle + launcher volume) expands adiabatically and pushes
 *                      on the tube's cross-section.
 *   1. Water thrust  – unsteady Bernoulli flow of the liquid through the real neck /
 *                      shoulder geometry, driven by adiabatically expanding gas.
 *   2. Gas thrust    – the remaining compressed gas blows down through the nozzle,
 *                      first choked (sonic) then sub-sonic.
 *   3. Coast         – closed-form ballistic flight with quadratic air drag.
 *
 * Water-vapour condensation (fog) is modelled: when the expanding gas cools below the
 * dew point the latent heat released raises its temperature and pressure.
 * Integration: classical 4th-order Runge–Kutta with an acceleration-scaled step.
 *
 * All inputs are SI (m, m³, kg, K, Pa) except gPressure (bar, gauge).
 */

import { BottleProfile } from './bottle.js?v=1.7.1';
import { bottleLimits, bodyExtMass } from './presets.js?v=1.7.1';

export const PHASES = ['Launch tube', 'Water thrust', 'Air thrust', 'Coast'];
export const PHASE_TUBE = 0;
export const PHASE_WATER = 1;
export const PHASE_GAS = 2;
export const PHASE_COAST = 3;

const MAX_STEPS = 2_000_000;
const R_UNIVERSAL = 8.31451;
const M_AIR = 0.028964;

/** Saturation / dew-point model of the humid gas. */
function condensationModel(p0, T0, humidity, gam) {
  const psat = Math.exp(25.87 - 5310 / T0); // Pa
  const x0 = (humidity * psat) / p0; // vapour mole fraction at fill pressure
  if (!(x0 > 0)) return { Tcond: 0, deltaT: 0, Pratio: 1, x0: 0 };
  let Tc = T0;
  for (let i = 0; i < 30; i++) {
    Tc = 5425.2 / (28.99 - Math.log(humidity * psat) - (gam / (gam - 1)) * Math.log(Tc / T0));
  }
  return {
    Tcond: Tc,
    Pcond: p0 * Math.pow(Tc / T0, gam / (gam - 1)),
    deltaT: 6165 * (gam - 1) * x0,
    Pratio: Math.pow(1 - x0, gam),
    x0,
  };
}

/* ------------------------------------------------------------------ phase systems */

function launchTubeSystem(c) {
  const V0 = c.lVol + c.volBot - c.volWat - 0.4 * c.ltLength * c.Alt;
  const mass = c.massBot + (c.p0 / (c.R * c.T0)) * (c.volBot - c.volWat) + c.rhoL * c.volWat;
  let P0 = c.p0;
  let T0 = c.T0;
  const s = {
    mass,
    derivs(y, out) {
      const ratio = V0 / (V0 + c.Alt * y[0]);
      s.press = P0 * Math.pow(ratio, c.gam);
      s.temp = T0 * Math.pow(ratio, c.gam - 1);
      s.thrust = (s.press - c.pa) * c.Alt;
      let acc = (s.thrust - c.kD * y[1] * Math.abs(y[1])) / mass - c.g;
      if (y[0] <= 0 && y[1] <= 0 && acc < 0) acc = 0; // resting on the pad
      s.acc = acc;
      s.water = c.volWat;
      out[0] = y[1];
      out[1] = acc;
      return out;
    },
    remaining(y) {
      return s.acc > 0
        ? (Math.sqrt(y[1] * y[1] + 2 * s.acc * (c.ltLength - y[0])) - y[1]) / s.acc
        : 10;
    },
    scalePT(fp, ft) {
      P0 *= fp;
      T0 *= ft;
    },
  };
  return s;
}

function waterSystem(c, bottle, pStart, TStart) {
  const Vb = c.volBot;
  const Vgas0 = Vb - bottle.volume(bottle.zWat);
  const dryMass = c.massBot + (Vgas0 * pStart) / (c.R * TStart);
  let P0 = pStart;
  let T0 = TStart;
  const s = {
    t: 0,
    derivs(y, out) {
      const vel = y[1];
      const ue = y[2]; // nozzle exit velocity (negative = downward)
      const q = y[3]; // height of the water surface above the nozzle exit
      const ratio = c.An / bottle.area(q);
      const wv = bottle.volume(q);
      const mtot = dryMass + c.rhoL * wv;
      const vr = Vgas0 / (Vb - wv);
      let press = P0 * Math.pow(vr, c.gam);
      if (press < c.pa) press = c.pa;
      s.press = press;
      s.temp = T0 * Math.pow(vr, c.gam - 1);
      s.mass = mtot;
      s.water = wv;
      const den = c.rhoL * c.An * q * q - bottle.inertia(q) * mtot;
      const uTerm = 0.5 * (ratio * ratio - 1) * ue * ue * mtot;
      const momentum = c.rhoL * c.An * (1 - ratio) * ue * ue;
      const fNet = momentum - c.kD * vel * Math.abs(vel);
      const due = (uTerm + fNet * q + ((press - c.pa) * c.effWat * mtot) / c.rhoL) / den;
      let acc = (fNet - c.rhoL * c.An * q * due) / mtot - c.g;
      if (y[0] <= 0 && vel <= 0 && acc < 0) acc = 0;
      s.acc = acc;
      // reported thrust = momentum flux of the jet (as in the original simulator).
      // The rocket's acceleration also includes the water-column reaction term.
      s.thrust = momentum;
      s.q = q;
      s.ue = ue;
      s.ratio = ratio;
      s.due = due;
      out[0] = vel;
      out[1] = acc;
      out[2] = due;
      out[3] = ue * ratio;
      return out;
    },
    remaining(y, tl) {
      const q = y[3];
      const ue = y[2];
      if (tl === 0) {
        const r = 3 * Math.sqrt(-q / (s.ratio * s.due));
        return Number.isFinite(r) ? r : 0;
      }
      if (s.press > c.pa) {
        const t = (c.pa - s.press) / (c.rhoL * q);
        const r = (-Math.sqrt(ue * ue - (2 * t * q) / s.ratio) - ue) / t;
        return Number.isFinite(r) && r > 0 ? r : 0;
      }
      return 0;
    },
    scalePT(fp, ft) {
      P0 *= fp;
      T0 *= ft;
    },
  };
  return s;
}

function gasSystem(c, pStart, TStart) {
  const gam = c.gam;
  const Vb = c.volBot;
  const critP = Math.pow(2 / (gam + 1), gam / (gam - 1));
  const critRho = Math.pow(2 / (gam + 1), 1 / (gam - 1));
  const N = Math.sqrt((gam + 1) / (gam - 1));
  const I = (gam - 1) / gam;
  const X = ((2 * gam) / (gam + 1)) * c.R;
  let P0 = pStart;
  let T0 = TStart;
  const rho0 = P0 / (c.R * T0);
  let rhoAmb = rho0 * Math.pow(c.pa / P0, 1 / gam);
  const G = Math.sqrt(gam * c.R * T0);
  const K =
    ((2 * Vb) / ((gam - 1) * c.An * G)) * Math.pow((gam + 1) / 2, (gam + 1) / (2 * (gam - 1)));
  let estimate = 1.17 * K * (Math.pow(P0 / c.pa, (gam - 1) / (2 * gam)) - 1);
  const s = {
    rho0,
    transTime: 0,
    derivs(y, out, tl) {
      const vel = y[1];
      const rho = y[2];
      const mass = c.massBot + rho * Vb;
      const press = P0 * Math.pow(rho / rho0, gam);
      const temp = T0 * Math.pow(rho / rho0, gam - 1);
      let pe = press * critP;
      let ve = -Math.sqrt(X * temp);
      let rhoE = rho * critRho;
      s.choked = true;
      if (pe < c.pa) {
        s.choked = false;
        pe = c.pa;
        const r = press > c.pa ? Math.sqrt(1 - Math.pow(c.pa / press, I)) : 0;
        ve = ve * N * r - 0.1;
        rhoE = rhoAmb;
      } else if (tl !== undefined) {
        s.transTime = tl;
      }
      const mdot = c.An * rhoE * ve; // negative (mass leaving)
      const thrust = (c.An * (pe - c.pa) + mdot * ve) * c.effGas;
      let acc = (thrust - c.kD * vel * Math.abs(vel)) / mass - c.g;
      if (y[0] <= 0 && vel <= 0 && acc < 0) acc = 0;
      s.press = press;
      s.temp = temp;
      s.mass = mass;
      s.thrust = thrust;
      s.acc = acc;
      s.mdot = mdot;
      s.water = 0;
      out[0] = vel;
      out[1] = acc;
      out[2] = mdot / Vb;
      return out;
    },
    remaining(y, tl) {
      if (tl > 0) estimate = ((c.pa - s.press) * Vb) / (gam * c.R * s.temp * s.mdot);
      return Number.isFinite(estimate) && estimate > 0 ? estimate : 0;
    },
    scalePT(fp, ft) {
      P0 *= fp;
      T0 *= ft;
      rhoAmb = rho0 * Math.pow(c.pa / P0, 1 / gam);
    },
  };
  return s;
}

/* ---------------------------------------------------------------------- recorder */

class Recorder {
  constructor() {
    this.cols = { t: [], h: [], v: [], a: [], F: [], p: [], T: [], w: [], m: [], ph: [] };
  }
  push(t, h, v, a, F, p, T, w, m, ph) {
    const c = this.cols;
    c.t.push(t);
    c.h.push(h);
    c.v.push(v);
    c.a.push(a);
    c.F.push(F);
    c.p.push(p);
    c.T.push(T);
    c.w.push(w);
    c.m.push(m);
    c.ph.push(ph);
  }
  get length() {
    return this.cols.t.length;
  }
}

/* ----------------------------------------------------------- generic phase runner */

function runPhase(sys, y, phase, tOffset, rec, ctx) {
  const n = y.length;
  const k1 = new Array(n);
  const k2 = new Array(n);
  const k3 = new Array(n);
  const k4 = new Array(n);
  const tmp = new Array(n);
  let tl = 0;
  sys.derivs(y, k1, tl);
  const accRef = Math.max(Math.abs(sys.acc), 1);
  const dt0 = Math.min(Math.max(Math.sqrt(1e-6 / accRef), 1e-6), 5e-4);

  const record = () =>
    rec.push(tOffset + tl, y[0], y[1], sys.acc, sys.thrust, sys.press, sys.temp, sys.water, sys.mass ?? sys.massTotal, phase);

  const step = (dt) => {
    if (!(dt > 0)) {
      sys.derivs(y, k1, tl);
      return;
    }
    const hdt = dt / 2;
    for (let i = 0; i < n; i++) tmp[i] = y[i] + hdt * k1[i];
    sys.derivs(tmp, k2, tl + hdt);
    for (let i = 0; i < n; i++) tmp[i] = y[i] + hdt * k2[i];
    sys.derivs(tmp, k3, tl + hdt);
    for (let i = 0; i < n; i++) tmp[i] = y[i] + dt * k3[i];
    sys.derivs(tmp, k4, tl + dt);
    for (let i = 0; i < n; i++) y[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    tl += dt;
    sys.derivs(y, k1, tl);
    if (y[0] < 0) {
      y[0] = 0;
      if (y[1] < 0) y[1] = 0;
      sys.derivs(y, k1, tl);
    }
  };

  record();
  let h = sys.remaining(y, tl);
  if (!(h > 0)) return tl;
  let steps = 0;
  let done = false;
  while (!done) {
    if (dt0 < h) {
      step(dt0);
      h = sys.remaining(y, tl);
    } else {
      step(h);
      h = sys.remaining(y, tl);
      step(Math.max(0, Math.min(h, dt0)));
      done = true;
    }
    // condensation (fog) – happens once, when the gas cools below the dew point
    if (!ctx.condensed && ctx.cond.Tcond > 0 && sys.temp < ctx.cond.Tcond) {
      const ft = 1 + ctx.cond.deltaT / sys.temp;
      sys.scalePT(ft * ctx.cond.Pratio, ft);
      sys.derivs(y, k1, tl);
      ctx.condensed = { t: tOffset + tl, phase, h: y[0] };
    }
    record();
    if (++steps > MAX_STEPS) {
      ctx.warnings.push({ k: 'warn.steps' });
      break;
    }
    if (phase === PHASE_TUBE && sys.acc <= 0 && y[0] <= 0 && y[1] <= 0) {
      ctx.noLiftoff = true;
      break;
    }
  }
  return tl;
}

/* ------------------------------------------------------------------------- coast */

function coast(h0, v0, t0, mass, kD, g, samples = 320) {
  const out = { t: [], h: [], v: [], a: [] };
  let tApo;
  let hApo;
  let tImp;
  let vImp;
  if (h0 <= 0 && v0 <= 0) {
    return { ...out, tApo: t0, hApo: Math.max(h0, 0), tImp: t0, vImp: 0 };
  }
  if (kD > 0) {
    const r = Math.sqrt((mass * g) / kD); // terminal velocity
    const d = Math.max(v0 / r, -0.999999);
    const l = r / g;
    const p = l * r;
    if (v0 > 0) {
      tApo = t0 + l * Math.atan(d);
      hApo = h0 + (p / 2) * Math.log(1 + d * d);
    } else {
      tApo = t0 + (l / 2) * Math.log((1 + d) / (1 - d));
      hApo = h0 - (p / 2) * Math.log(1 - d * d);
    }
    const y = Math.exp(hApo / p);
    tImp = tApo + l * Math.log(y + Math.sqrt(y * y - 1));
    vImp = -r * Math.sqrt(1 - 1 / (y * y));
    for (let i = 0; i < samples; i++) {
      const t = t0 + ((tImp - t0) * i) / (samples - 1);
      const f = (tApo - t) / l;
      let hh;
      let vv;
      let aa;
      if (t <= tApo) {
        hh = hApo + p * Math.log(Math.cos(f));
        vv = r * Math.tan(f);
        aa = -g * (1 + (vv * vv) / (r * r));
      } else {
        hh = hApo - p * Math.log(Math.cosh(f));
        vv = r * Math.tanh(f);
        aa = -g * (1 - (vv * vv) / (r * r));
      }
      out.t.push(t);
      out.h.push(Math.max(0, hh));
      out.v.push(vv);
      out.a.push(aa);
    }
  } else {
    const tu = v0 / g;
    hApo = h0 + (tu * v0) / 2;
    tApo = t0 + tu;
    tImp = tApo + Math.sqrt(Math.max(0, (2 * hApo) / g));
    vImp = -Math.sqrt(v0 * v0 + 2 * h0 * g);
    for (let i = 0; i < samples; i++) {
      const dt = ((tImp - t0) * i) / (samples - 1);
      out.t.push(t0 + dt);
      out.h.push(Math.max(0, h0 + v0 * dt - (g * dt * dt) / 2));
      out.v.push(v0 - g * dt);
      out.a.push(-g);
    }
  }
  return { ...out, tApo, hApo, tImp, vImp };
}

/* --------------------------------------------------------------------- utilities */

export function motorClass(impulse) {
  let limit = 2.5;
  let letter = 'A';
  while (limit < impulse) {
    limit += limit;
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return letter;
}

/** Barometric altitude (m) equivalent to an ambient pressure (Pa). */
export function pressureToAltitude(pa) {
  return 44330 * (1 - Math.pow(pa / 101325, 1 / 5.255));
}

function decimate(cols, maxPoints) {
  const n = cols.t.length;
  if (n <= maxPoints) return cols;
  const out = {};
  for (const k in cols) out[k] = [];
  const stride = (n - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    const j = Math.round(i * stride);
    for (const k in cols) out[k].push(cols[k][j]);
  }
  return out;
}

/**
 * Validate a parameter set.
 * Returns { errors: [] (cannot simulate), dangers: [] (unsafe in real life), warnings: [] }.
 */
export function checkParameters(P) {
  const errors = [];
  const warnings = [];
  const dangers = [];
  // messages are { k: i18n key, v: variables } so the UI can translate them
  if (P.diaNoz >= P.diaBot) errors.push({ k: 'err.nozzleWide' });
  if (P.volWat >= P.volBot) errors.push({ k: 'err.waterFull' });
  if (P.diaNoz < P.diaBot) {
    const b = new BottleProfile(P);
    if (P.volBot < b.minVolume * 1.02) errors.push({ k: 'err.volSmall' });
    else if (P.ltDia > 0 && P.ltLength > 0 && P.ltLength > b.totalHeight * 0.97)
      warnings.push({ k: 'warn.tubeLong', v: { l: (P.ltLength * 100).toFixed(0), b: (b.totalHeight * 100).toFixed(0) } });
  }
  if (P.ltDia > 0 && P.ltLength > 0 && P.ltDia > P.diaNoz) warnings.push({ k: 'warn.tubeWide' });
  const lim = bottleLimits(P);
  const psi = (b) => Math.round(b * 14.5038);
  const p = P.gPressure;
  if (P.bottleType === 'tested') {
    if (p > lim.rated) dangers.push({ k: 'danger.overRating', v: { p: p.toFixed(1), r: lim.rated } });
    else if (p > lim.rated * 0.9) warnings.push({ k: 'warn.nearRating', v: { r: lim.rated } });
  } else if (p >= lim.burst) {
    dangers.push({
      k: 'danger.burst',
      v: { bt: P.bottleType, x: lim.burst, psi: psi(lim.burst), r0: lim.type.burstRange[0], r1: lim.type.burstRange[1], p: p.toFixed(1) },
    });
  } else if (p > lim.safe) {
    warnings.push({ k: 'warn.overSafe', v: { bt: P.bottleType, s: lim.safe, psi: psi(lim.safe), x: lim.burst } });
  }
  return { errors, warnings, dangers };
}

/* -------------------------------------------------------------------------- main */

/**
 * Run a full simulation.
 * @param {object} P   parameter set (see presets.js for fields and units)
 * @param {object} [opts] { legacy: boolean, samples: number }
 */
export function simulate(P, opts = {}) {
  const t0 = performance.now();
  const legacy = !!opts.legacy;
  const c = {
    g: P.gravity,
    gam: P.gasGamma,
    R: P.Rgas,
    rhoL: P.liquidDensity,
    pa: P.pressAtm,
    T0: P.aTemperature,
    p0: legacy ? 101325 * (P.gPressure + 1) : P.gPressure * 1e5 + P.pressAtm,
    Alt: (Math.PI / 4) * P.ltDia * P.ltDia,
    An: (Math.PI / 4) * P.diaNoz * P.diaNoz,
    Ab: (Math.PI / 4) * P.diaBot * P.diaBot,
    massBot: P.massBot + (P.noseMass || 0) + bodyExtMass(P), // empty rocket + nose ballast + body extension
    volBot: P.volBot,
    volWat: P.volWat,
    lVol: P.lVol,
    ltLength: P.ltLength,
    effWat: P.effWat,
    effGas: P.effGas,
  };
  const rhoAir = (M_AIR * c.pa) / (R_UNIVERSAL * c.T0);
  c.kD = 0.5 * P.CDrag * c.Ab * rhoAir;

  const bottle = new BottleProfile(P, legacy);
  const ctx = {
    cond: condensationModel(c.p0, c.T0, P.humidity, c.gam),
    condensed: null,
    warnings: [],
    noLiftoff: false,
  };
  const rec = new Recorder();
  const events = {};

  // ---- Phase 0: launch tube
  const y = [0, 0];
  let p = c.p0;
  let T = c.T0;
  let tNow = 0;
  const tubeActive = P.ltLength > 0 && P.ltDia > 0;
  if (tubeActive) {
    const tube = launchTubeSystem(c);
    tNow += runPhase(tube, y, PHASE_TUBE, 0, rec, ctx);
    p = tube.press;
    T = tube.temp;
    events.tubeExit = { t: tNow, h: y[0], v: y[1] };
  }

  // ---- Phase 1: water
  let coastMass = c.massBot;
  if (!ctx.noLiftoff) {
    const wsys = waterSystem(c, bottle, p, T);
    const yw = [y[0], y[1], 0, bottle.zWat];
    tNow += runPhase(wsys, yw, PHASE_WATER, tNow, rec, ctx);
    y[0] = yw[0];
    y[1] = yw[1];
    p = wsys.press;
    T = wsys.temp;
    events.waterEnd = { t: tNow, h: y[0], v: y[1], water: Math.max(0, wsys.water) };
    if (p <= c.pa) {
      coastMass = wsys.mass;
      if (wsys.water > 1e-6) ctx.warnings.push({ k: 'warn.airOut' });
    }
  }

  // ---- Phase 2: gas
  if (!ctx.noLiftoff && p > c.pa) {
    const gsys = gasSystem(c, p, T);
    const yg = [y[0], y[1], gsys.rho0];
    const tStart = tNow;
    tNow += runPhase(gsys, yg, PHASE_GAS, tNow, rec, ctx);
    y[0] = yg[0];
    y[1] = yg[1];
    events.gasEnd = { t: tNow, h: y[0], v: y[1] };
    if (gsys.transTime > 0) events.chokeEnd = { t: tStart + gsys.transTime };
  }

  const boost = rec.cols;
  const nb = rec.length;
  const last = nb - 1;

  // ---- thrust statistics (on full-resolution data)
  let impulse = 0;
  let peak = 0;
  let peakT = 0;
  for (let i = 0; i < nb; i++) {
    if (boost.F[i] > peak) {
      peak = boost.F[i];
      peakT = boost.t[i];
    }
    if (i > 0) impulse += 0.5 * (boost.F[i] + boost.F[i - 1]) * (boost.t[i] - boost.t[i - 1]);
  }
  let burnIdx = 0;
  for (let i = nb - 1; i >= 0; i--) {
    if (boost.F[i] >= 0.05 * peak) {
      burnIdx = i;
      break;
    }
  }
  let impulseBurn = 0;
  for (let i = 1; i <= burnIdx; i++) impulseBurn += 0.5 * (boost.F[i] + boost.F[i - 1]) * (boost.t[i] - boost.t[i - 1]);
  const burnTime = boost.t[burnIdx] || 0;
  const avgThrust = burnTime > 0 ? impulseBurn / burnTime : 0;

  let maxV = 0;
  let maxA = 0;
  for (let i = 0; i < nb; i++) {
    if (boost.v[i] > maxV) maxV = boost.v[i];
    if (boost.a[i] > maxA) maxA = boost.a[i];
  }

  // ---- Phase 3: coast
  const hB = boost.h[last];
  const vB = boost.v[last];
  const tB = boost.t[last];
  const cst = coast(hB, vB, tB, coastMass, c.kD, c.g, opts.coastSamples || 320);
  if (ctx.noLiftoff || cst.hApo < 0.01) ctx.noLiftoff = true;

  // ---- assemble output series
  const dec = decimate(boost, opts.boostSamples || 900);
  const series = { t: [], h: [], v: [], a: [], F: [], p: [], T: [], w: [], m: [], ph: [] };
  for (const k in series) series[k] = dec[k].slice();
  for (let k = 0; k < series.p.length; k++) series.p[k] -= c.pa; // gauge pressure
  const boostCount = series.t.length;
  const coastAirT = c.T0;
  for (let i = 1; i < cst.t.length; i++) {
    series.t.push(cst.t[i]);
    series.h.push(cst.h[i]);
    series.v.push(cst.v[i]);
    series.a.push(cst.a[i]);
    series.F.push(0);
    series.p.push(0);
    series.T.push(coastAirT);
    series.w.push(Math.max(0, (coastMass - c.massBot) / c.rhoL));
    series.m.push(coastMass);
    series.ph.push(PHASE_COAST);
  }
  // clamp water volume display
  for (let i = 0; i < series.w.length; i++) if (series.w[i] < 0) series.w[i] = 0;

  const summary = {
    burnoutTime: tB,
    burnoutAltitude: hB,
    burnoutVelocity: vB,
    burnoutAccel: cst.a.length ? cst.a[0] / c.g : -1,
    apogeeTime: cst.tApo,
    apogeeAltitude: cst.hApo,
    impactTime: cst.tImp,
    impactVelocity: cst.vImp,
    totalImpulse: impulse,
    burnTime,
    peakThrust: peak,
    peakThrustTime: peakT,
    averageThrust: avgThrust,
    motorClass: motorClass(impulse) + Math.floor(avgThrust),
    maxVelocity: Math.max(maxV, vB),
    maxAccel: maxA,
    initialPressure: c.p0 - c.pa,
    coastMass,
    liftoffMass: boost.m[0],
    terminalVelocity: c.kD > 0 ? Math.sqrt((coastMass * c.g) / c.kD) : Infinity,
    steps: nb,
  };

  events.apogee = { t: cst.tApo, h: cst.hApo };
  events.impact = { t: cst.tImp, v: cst.vImp };
  if (ctx.condensed) events.condensation = ctx.condensed;

  return {
    ok: !ctx.noLiftoff,
    noLiftoff: ctx.noLiftoff,
    warnings: ctx.warnings,
    series,
    boostCount,
    summary,
    events,
    bottle,
    params: { ...P },
    computeMs: performance.now() - t0,
  };
}

/**
 * Sweep the amount of water (as a fraction of the bottle) and return apogee for each.
 * Answers the classic question: "how much water should I put in?"
 */
export function sweepWater(P, n = 36) {
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const frac = 0.02 + (0.8 * i) / n;
    const Q = { ...P, volWat: P.volBot * frac };
    if (checkParameters(Q).errors.length) continue;
    const r = simulate(Q, { boostSamples: 50, coastSamples: 4 });
    pts.push({ frac, water: Q.volWat, apogee: r.summary.apogeeAltitude });
  }
  let best = pts[0];
  for (const p of pts) if (p.apogee > best.apogee) best = p;
  return { pts, best };
}
