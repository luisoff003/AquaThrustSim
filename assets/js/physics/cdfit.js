/**
 * AquaThrust — measuring the real drag coefficient from experiments.
 *
 *  1. fitCoastVideo   height-vs-time points of the coast (from a video, e.g. Tracker):
 *                     least-squares fit of the exact quadratic-drag solution. Drag is
 *                     the only unknown force here, so this isolates Cd best.
 *  2. fitLaunches     several launches with known water / pressure and a measured
 *                     apogee or flight time: the Cd that makes the simulation match.
 *                     Thrust-model errors also end up in this Cd ("effective Cd").
 *  3. dropTest        drop the empty rocket nose-down from a known height and time
 *                     the fall: solve the drag fall equation for the terminal speed.
 *
 * Quadratic drag D = k v², k = ½ ρ Cd A, terminal speed vt = √(m g / k), τ = vt / g.
 *   going up:   h(t) = h0 + vt τ ln[ cos(φ0 − (t − t0)/τ) / cos φ0 ],  φ0 = atan(v0/vt)
 *   falling:    h(t) = h_top − vt τ ln cosh((t − t_top)/τ)
 */
import { simulate } from './engine.js?v=1.7.1';

export const airDensity = (P) => (0.028964 * P.pressAtm) / (8.31451 * P.aTemperature);
const frontal = (P) => (Math.PI / 4) * P.diaBot * P.diaBot;
const cdFromVt = (m, g, rho, A, vt) => (2 * m * g) / (rho * A * vt * vt);

/** Golden-section minimisation of f on [a, b]. */
function golden(f, a, b, iters = 50) {
  const r = (Math.sqrt(5) - 1) / 2;
  let c = b - r * (b - a);
  let d = a + r * (b - a);
  let fc = f(c);
  let fd = f(d);
  for (let i = 0; i < iters; i++) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - r * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + r * (b - a);
      fd = f(d);
    }
  }
  const x = (a + b) / 2;
  return { x, f: f(x) };
}

/** Grid search followed by golden refinement around the best grid point. */
function minimise(f, a, b, n = 36, log = false) {
  const tx = log ? Math.log : (x) => x;
  const ix = log ? Math.exp : (x) => x;
  const A = tx(a);
  const B = tx(b);
  let best = 0;
  let bestF = Infinity;
  for (let i = 0; i <= n; i++) {
    const fx = f(ix(A + ((B - A) * i) / n));
    if (fx < bestF) {
      bestF = fx;
      best = i;
    }
  }
  const lo = A + ((B - A) * Math.max(0, best - 1)) / n;
  const hi = A + ((B - A) * Math.min(n, best + 1)) / n;
  const g = golden((u) => f(ix(u)), lo, hi, 40);
  return { x: ix(g.x), f: g.f };
}

/* ---------------------------------------------------------------- video */

/** Height at time t of a coasting rocket (up, then down) with quadratic drag. */
export function coastHeight(t, t0, h0, v0, vt, g) {
  const s = t - t0;
  if (!Number.isFinite(vt) || vt > 1e5) return h0 + v0 * s - 0.5 * g * s * s;
  const tau = vt / g;
  const H = vt * tau;
  const phi0 = Math.atan(Math.max(0, v0) / vt);
  const tTop = tau * phi0;
  const hTop = h0 - H * Math.log(Math.cos(phi0));
  if (s <= tTop) return h0 + H * Math.log(Math.cos(phi0 - s / tau) / Math.cos(phi0));
  return hTop - H * Math.log(Math.cosh((s - tTop) / tau));
}

/**
 * Fit Cd to coast points.
 * @param {Array<[number, number]>} pts  [t (s), h (m)] pairs, any order
 * @param {{m:number, A:number, rho:number, g:number, ascentOnly?:boolean}} o
 */
export function fitCoastVideo(pts, o) {
  let data = pts.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])).sort((a, b) => a[0] - b[0]);
  if (o.ascentOnly !== false && data.length) {
    let iMax = 0;
    for (let i = 1; i < data.length; i++) if (data[i][1] > data[iMax][1]) iMax = i;
    data = data.slice(0, iMax + 1);
  }
  if (data.length < 5) return { error: 'few' };
  const t0 = data[0][0];
  const { m, A, rho, g } = o;
  const vtOf = (cd) => Math.sqrt((2 * m * g) / (rho * cd * A));
  // residual with the best h0 for a given (vt, v0): h0 is the mean offset
  const resid = (vt, v0) => {
    let off = 0;
    const f = data.map(([t]) => coastHeight(t, t0, 0, v0, vt, g));
    for (let i = 0; i < data.length; i++) off += data[i][1] - f[i];
    off /= data.length;
    let ss = 0;
    for (let i = 0; i < data.length; i++) ss += (data[i][1] - f[i] - off) ** 2;
    return { ss, h0: off };
  };
  const span = data[data.length - 1][0] - t0;
  const rise = Math.max(1, data[data.length - 1][1] - data[0][1]);
  const vMax = Math.max(20, (4 * rise) / Math.max(span, 0.05) + g * span * 2);
  const bestV0 = (vt) => minimise((v0) => resid(vt, v0).ss, 0, vMax, 30);
  const fit = minimise((cd) => bestV0(vtOf(cd)).f, 0.02, 4, 32, true);
  const cd = fit.x;
  const vt = vtOf(cd);
  const v0 = bestV0(vt).x;
  const { ss, h0 } = resid(vt, v0);
  const n = data.length;
  const rms = Math.sqrt(ss / n);
  // the same points with no air (a parabola): how much better does drag explain them?
  const vac = minimise((u) => resid(Infinity, u).ss, 0, vMax, 30);
  const rmsVac = Math.sqrt(vac.f / n);
  // rough ±: the Cd change that raises the residual by one "point's worth" of noise
  const thr = ss * (1 + 4 / Math.max(1, n - 3)) + 1e-9; // ≈ 2σ on Cd
  const edge = (dir) => {
    let lo = cd;
    let hi = dir > 0 ? cd * 4 : cd / 4;
    for (let i = 0; i < 30; i++) {
      const mid = Math.sqrt(lo * hi);
      if (bestV0(vtOf(mid)).f > thr) hi = mid;
      else lo = mid;
    }
    return lo;
  };
  const curve = [];
  const tEnd = data[n - 1][0];
  for (let i = 0; i <= 60; i++) {
    const t = t0 + ((tEnd - t0) * i) / 60;
    curve.push([t, coastHeight(t, t0, h0, v0, vt, g)]);
  }
  return { cd, lo: edge(-1), hi: edge(1), vt, v0, h0, t0, rms, rmsVac, n, data, curve };
}

/* -------------------------------------------------------------- launches */

const CD_GRID = (() => {
  const a = [];
  for (let i = 0; i <= 14; i++) a.push(0.04 * Math.pow(3 / 0.04, i / 14));
  return a;
})();

function simValue(P, row, cd, kind) {
  const r = simulate({ ...P, cdMode: 'custom', CDrag: cd, volWat: row.water, gPressure: row.press }, { boostSamples: 40, coastSamples: 8 });
  if (!r.ok) return NaN;
  return kind === 'time' ? r.summary.impactTime : r.summary.apogeeAltitude;
}

/** Piecewise-linear interpolation of (log cd → log value), value decreasing with cd. */
function curveFn(vals) {
  const lx = CD_GRID.map(Math.log);
  const ly = vals.map((v) => Math.log(Math.max(v, 1e-6)));
  const at = (cd) => {
    const x = Math.log(cd);
    let i = 0;
    while (i < lx.length - 2 && x > lx[i + 1]) i++;
    const u = (x - lx[i]) / (lx[i + 1] - lx[i]);
    return Math.exp(ly[i] + u * (ly[i + 1] - ly[i]));
  };
  const inv = (y) => {
    const v = Math.log(y);
    if (v > ly[0]) return { cd: CD_GRID[0], out: 'high' };
    if (v < ly[ly.length - 1]) return { cd: CD_GRID[CD_GRID.length - 1], out: 'low' };
    let i = 0;
    while (i < ly.length - 2 && v < ly[i + 1]) i++;
    const u = (v - ly[i]) / (ly[i + 1] - ly[i]);
    return { cd: Math.exp(lx[i] + u * (lx[i + 1] - lx[i])), out: '' };
  };
  return { at, inv };
}

/**
 * Cd from several launches.
 * @param {object} P current parameters (everything else: bottle, mass, launch tube…)
 * @param {Array<{water:number, press:number, value:number}>} rows water m³, gauge bar, apogee m or flight time s
 * @param {'apogee'|'time'} kind
 */
export function fitLaunches(P, rows, kind = 'apogee') {
  const ok = rows.filter((r) => r.water > 0 && r.press > 0 && r.value > 0);
  if (!ok.length) return { error: 'none' };
  const per = ok.map((row) => {
    const vals = CD_GRID.map((cd) => simValue(P, row, cd, kind));
    if (vals.some((v) => !Number.isFinite(v))) return { row, error: 'sim' };
    const fn = curveFn(vals);
    const r = fn.inv(row.value);
    return { row, fn, cd: r.cd, out: r.out };
  });
  const good = per.filter((p) => !p.error && !p.out);
  let best = null;
  if (good.length) {
    const cost = (cd) => good.reduce((s, p) => s + ((p.fn.at(cd) - p.row.value) / p.row.value) ** 2, 0);
    best = minimise(cost, 0.04, 3, 40, true).x;
  }
  const cds = good.map((p) => p.cd);
  const mean = cds.length ? cds.reduce((a, b) => a + b, 0) / cds.length : NaN;
  const std = cds.length > 1 ? Math.sqrt(cds.reduce((s, c) => s + (c - mean) ** 2, 0) / (cds.length - 1)) : NaN;
  const rows2 = per.map((p) => ({
    ...p.row,
    cd: p.cd,
    out: p.out || p.error || '',
    pred: best && p.fn ? p.fn.at(best) : NaN,
    predNow: p.fn ? p.fn.at(Math.max(0.04, Math.min(3, P.CDrag))) : NaN,
  }));
  const errs = rows2.filter((r) => Number.isFinite(r.pred) && !r.out).map((r) => (r.pred - r.value) / r.value);
  const rmsPct = errs.length ? 100 * Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / errs.length) : NaN;
  return { best, mean, std, n: cds.length, rows: rows2, rmsPct, kind };
}

/* ------------------------------------------------------------- drop test */

/** Fall distance in time t from rest with terminal speed vt. */
export const fallDistance = (t, vt, g) => ((vt * vt) / g) * Math.log(Math.cosh((g * t) / vt));

function vtForFall(h, t, g) {
  if (h >= 0.5 * g * t * t * 0.9995) return Infinity; // no slower than free fall: drag too small to see
  let lo = 0.05;
  let hi = 1e4;
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    if (fallDistance(t, mid, g) > h) hi = mid;
    else lo = mid;
  }
  return Math.sqrt(lo * hi);
}

/**
 * @param {{h:number, times:number[], m:number, A:number, rho:number, g:number, res?:number}} o
 *   res = timing resolution (s): ~0.1 hand stopwatch, ~0.03 video
 */
export function dropTest(o) {
  const ts = o.times.filter((x) => x > 0);
  if (!(o.h > 0) || !ts.length) return { error: 'none' };
  const n = ts.length;
  const tm = ts.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(ts.reduce((s, x) => s + (x - tm) ** 2, 0) / (n - 1)) : 0;
  const err = Math.max(sd / Math.sqrt(n), (o.res ?? 0.1) / Math.sqrt(n));
  const tFree = Math.sqrt((2 * o.h) / o.g);
  const cdAt = (t) => {
    const vt = vtForFall(o.h, t, o.g);
    return Number.isFinite(vt) ? cdFromVt(o.m, o.g, o.rho, o.A, vt) : 0;
  };
  const vt = vtForFall(o.h, tm, o.g);
  const cd = cdAt(tm);
  const lo = cdAt(tm - err);
  const hi = cdAt(tm + err);
  // the speed it reaches at the ground compared with its terminal speed
  const vImpact = Number.isFinite(vt) ? vt * Math.tanh((o.g * tm) / vt) : o.g * tm;
  return { tm, sd, err, n, tFree, slow: (tm - tFree) / tFree, vt, cd, lo, hi, vImpact, frac: Number.isFinite(vt) ? vImpact / vt : 0 };
}

/**
 * Drop height needed so that drag changes the fall time by `pct` (for planning):
 * returns { h, t } for the rocket's expected terminal speed.
 */
export function dropPlan(vt, g, pct = 0.1) {
  let lo = 0.5;
  let hi = 2000;
  for (let i = 0; i < 60; i++) {
    const h = Math.sqrt(lo * hi);
    // fall time with drag: invert fallDistance in t
    let a = 0;
    let b = 200;
    for (let j = 0; j < 60; j++) {
      const m = (a + b) / 2;
      if (fallDistance(m, vt, g) > h) b = m;
      else a = m;
    }
    const t = (a + b) / 2;
    if ((t - Math.sqrt((2 * h) / g)) / Math.sqrt((2 * h) / g) > pct) hi = h;
    else lo = h;
  }
  return Math.sqrt(lo * hi);
}

export { frontal as frontalArea, cdFromVt };
