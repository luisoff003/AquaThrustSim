/**
 * AquaThrust — Bottle / nozzle geometry.
 *
 * The bottle interior is described (bottom → top, nozzle pointing down, z = 0 at the
 * nozzle exit) as:
 *   1. a straight neck of nozzle diameter Dn, height 0.8·Dn
 *   2. a shoulder: cubic Bézier curve from the neck radius to the bottle radius,
 *      shaped by three 0…1 parameters (noz0, noz1, noz2)
 *   3. a straight cylinder of bottle diameter Db
 *   4. a rounded top dome (height Db/4) – its volume (≈ Ab·Db/6) is accounted for.
 *
 * The profile is split into 15 segments in which the cross-section area varies
 * linearly with height, so volume and the "inertia integral" ∫ An/A(z) dz used by the
 * unsteady-Bernoulli water model can be evaluated in closed form.
 */

const SHOULDER_SEGMENTS = 13;

export class BottleProfile {
  constructor(params, legacyIntegral = false) {
    this.legacyIntegral = legacyIntegral;
    this.update(params);
  }

  update({ volBot, volWat, diaBot, diaNoz, noz0, noz1, noz2 }) {
    this.volBot = volBot;
    this.volWat = volWat;
    this.diaBot = diaBot;
    this.diaNoz = diaNoz;

    const Db = diaBot;
    const Dn = diaNoz;
    const z3 = 2.3 * Dn + noz0 * (1.8 * Db - 2.3 * Dn);
    const z1 = 1.5 * Dn + noz1 * (z3 - 2 * Dn);
    this.cx = [0.5 * Dn, 0.5 * Dn, (Dn + noz2 * (Db - Dn)) / 2, 0.5 * Db];
    this.cz = [0.8 * Dn, z1, z1, z3];

    const An = (Math.PI / 4) * Dn * Dn;
    const Ab = (Math.PI / 4) * Db * Db;
    this.An = An;
    this.Ab = Ab;

    const segs = [];
    // Segment 0: straight neck.
    segs.push({ z0: 0, a0: An, k: 0, v0: 0, f0: 0 });
    let z = this.cz[0];
    let a = An;
    let v = An * z;
    let f = z;
    for (let l = 1; l <= SHOULDER_SEGMENTS; l++) {
      const [r1, z1b] = this.bezier(l / SHOULDER_SEGMENTS);
      const a1 = Math.PI * r1 * r1;
      const len = z1b - z;
      const k = Math.abs(len) > 1e-12 ? (a1 - a) / len : 0;
      segs.push({ z0: z, a0: a, k, v0: v, f0: f });
      v += 0.5 * (a + a1) * len;
      f += this.legacyIntegral ? (An / a) * len : integralInc(An, a, k, len);
      z = z1b;
      a = a1;
    }
    // Segment 14: cylinder (continues upward).
    segs.push({ z0: z, a0: Ab, k: 0, v0: v, f0: f });
    this.segs = segs;

    this.shoulderTop = z;
    this.shoulderVolume = v;
    this.domeHeight = Db / 4;
    // Height where the cylinder ends and the top dome starts.
    this.cylinderTop = z + (volBot - v) / Ab - Db / 6;
    this.minVolume = v + (Ab * Db) / 6;
    this.totalHeight = Math.max(this.cylinderTop, z) + this.domeHeight;
    this.zWat = this.heightForVolume(volWat);
  }

  /** Cubic Bézier of the shoulder: returns [radius, z]. */
  bezier(t) {
    const u = 1 - t;
    const b = [u * u * u, 3 * t * u * u, 3 * t * t * u, t * t * t];
    let r = 0;
    let z = 0;
    for (let i = 0; i < 4; i++) {
      r += b[i] * this.cx[i];
      z += b[i] * this.cz[i];
    }
    return [r, z];
  }

  seg(h) {
    const s = this.segs;
    let i = s.length - 1;
    while (i > 0 && h < s[i].z0) i--;
    return s[i];
  }

  /** Water volume contained below height h. */
  volume(h) {
    const s = this.seg(h);
    const b = h - s.z0;
    return s.v0 + (0.5 * s.k * b + s.a0) * b;
  }

  /** Cross-section area at height h. */
  area(h) {
    const s = this.seg(h);
    return s.a0 + s.k * (h - s.z0);
  }

  /** ∫0^h An / A(z) dz — the effective "inertia length" of the water column. */
  inertia(h) {
    const s = this.seg(h);
    const b = h - s.z0;
    return s.f0 + integralInc(this.An, s.a0, s.k, b);
  }

  /** Height of the free surface when the bottle holds volume V of liquid. */
  heightForVolume(V) {
    if (V <= 0) return 0;
    const s = this.segs;
    let i = s.length - 1;
    while (i > 0 && V < s[i].v0) i--;
    const g = s[i];
    const dv = V - g.v0;
    if (Math.abs(g.k) < 1e-12) return g.z0 + dv / g.a0;
    return g.z0 + (-g.a0 + Math.sqrt(Math.max(0, g.a0 * g.a0 + 2 * g.k * dv))) / g.k;
  }

  /** Radius at height h of the outer wall (for drawing). */
  radiusAt(h) {
    if (h >= this.shoulderTop) {
      if (h <= this.cylinderTop) return this.diaBot / 2;
      const t = Math.min(1, (h - this.cylinderTop) / this.domeHeight);
      return (this.diaBot / 2) * Math.sqrt(Math.max(0, 1 - t * t));
    }
    return Math.sqrt(Math.max(0, this.area(h)) / Math.PI);
  }

  /**
   * Smooth outline of the bottle, as [radius, z] pairs from the nozzle (z = 0) to the
   * tip of the dome. Used to build the 3D lathe geometry.
   */
  outline(detail = 1) {
    const pts = [];
    const rn = this.diaNoz / 2;
    pts.push([rn, 0]);
    pts.push([rn, this.cz[0]]);
    const n = Math.round(36 * detail);
    for (let i = 1; i <= n; i++) pts.push(this.bezier(i / n));
    const top = Math.max(this.cylinderTop, this.shoulderTop);
    pts.push([this.diaBot / 2, top]);
    const m = Math.round(14 * detail);
    for (let i = 1; i <= m; i++) {
      const a = (i / m) * (Math.PI / 2);
      pts.push([(this.diaBot / 2) * Math.cos(a), top + this.domeHeight * Math.sin(a)]);
    }
    // ensure monotonic z for the lathe (Bézier can backtrack for extreme sliders)
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][1] < pts[i - 1][1]) pts[i][1] = pts[i - 1][1];
    }
    return pts;
  }

  /** Outline of the liquid column (up to height hw), same convention as outline(). */
  liquidOutline(hw, detail = 1) {
    const pts = [[0, 0]];
    if (hw <= 0) return pts;
    const full = this.outline(detail);
    for (const p of full) {
      if (p[1] >= hw) break;
      pts.push(p);
    }
    pts.push([this.radiusAt(hw), hw]);
    pts.push([0, hw]);
    return pts;
  }
}

function integralInc(An, a0, k, len) {
  if (Math.abs(k) < 1e-12) return (An / a0) * len;
  return (An / k) * Math.log((k * len) / a0 + 1);
}
