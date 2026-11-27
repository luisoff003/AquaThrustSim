/**
 * AquaThrust — 3D launcher: base, launch pipe, optional launch tube, pressure chamber
 * (sized by the launcher volume), a live pressure gauge and the gas source
 * (foot pump for air, coloured cylinders for CO₂ / helium / nitrogen).
 */
import * as THREE from '../../vendor/three.module.js?v=1.7.1';
import { clamp, lerp, canvasTexture, textSprite, disposeObject } from './util.js?v=1.7.1';
import { GASES, bottleLimits } from '../physics/presets.js?v=1.7.1';

export const SEAT_HEIGHT = 0.3; // height of the nozzle seal above the slab

const pvc = () => new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.38, metalness: 0 });
const steel = () => new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.3, metalness: 0.85 });
const dark = () => new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.6, metalness: 0.3 });

function niceMax(p) {
  const opts = [4, 6, 10, 16, 25, 40, 60, 100, 160];
  for (const o of opts) if (o >= p * 1.2) return o;
  return 200;
}

function gaugeTexture(max, safe = 8, burst = 10) {
  return canvasTexture(512, 512, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#fbfbf7';
    g.beginPath();
    g.arc(c, c, c - 6, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 14;
    g.strokeStyle = '#30353c';
    g.stroke();
    const a0 = Math.PI * 0.75;
    const a1 = Math.PI * 2.25;
    const ang = (v) => a0 + (a1 - a0) * (v / max);
    // colour zones for the chosen bottle type: green = safe, amber = risky, red = burst
    const zone = (from, to, color) => {
      if (to <= from) return;
      g.strokeStyle = color;
      g.lineWidth = 26;
      g.beginPath();
      g.arc(c, c, c - 58, ang(Math.min(from, max)), ang(Math.min(to, max)));
      g.stroke();
    };
    zone(0, safe, 'rgba(30,160,70,0.85)');
    zone(safe, burst, 'rgba(230,160,20,0.9)');
    zone(burst, max, 'rgba(220,40,40,0.9)');
    const major = max <= 10 ? 1 : max <= 25 ? 5 : max <= 60 ? 10 : 20;
    g.fillStyle = '#1d2228';
    g.strokeStyle = '#1d2228';
    g.font = '700 40px system-ui, Segoe UI, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let v = 0; v <= max + 1e-6; v += major / 2) {
      const a = ang(v);
      const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6;
      const r0 = c - 30;
      const r1 = isMajor ? c - 82 : c - 62;
      g.lineWidth = isMajor ? 7 : 4;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
      g.stroke();
      if (isMajor) g.fillText(String(v), c + Math.cos(a) * (c - 122), c + Math.sin(a) * (c - 122));
    }
    g.font = '800 44px system-ui, Segoe UI, sans-serif';
    g.fillText('bar', c, c + 120);
  });
}

export class Launcher {
  constructor() {
    this.group = new THREE.Group();
    this.static = new THREE.Group();
    this.dynamic = new THREE.Group();
    this.group.add(this.static, this.dynamic);
    this.needleAngle = 0;
    this.needleTarget = 0;
    this.buildStatic();
  }

  buildStatic() {
    const g = this.static;
    // base plate on feet
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x2f5d3a, roughness: 0.55, metalness: 0.4 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.52), plateMat);
    plate.position.y = 0.075;
    const feetMat = dark();
    for (const [x, z] of [[-0.31, -0.22], [0.31, -0.22], [-0.31, 0.22], [0.31, 0.22]]) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.06, 16), feetMat);
      f.position.set(x, 0.03, z);
      g.add(f);
    }
    g.add(plate);
    // vertical launch pipe
    this.pipeMat = pvc();
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, SEAT_HEIGHT - 0.12, 32), this.pipeMat);
    pipe.position.y = 0.09 + (SEAT_HEIGHT - 0.12) / 2;
    g.add(pipe);
    // tee & horizontal manifold to chamber
    const tee = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 24), this.pipeMat);
    tee.rotation.z = Math.PI / 2;
    tee.position.set(-0.02, 0.135, 0);
    g.add(tee);
    // release clamp ring (the "trigger")
    const clampRing = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.007, 12, 40), steel());
    clampRing.rotation.x = Math.PI / 2;
    clampRing.position.y = SEAT_HEIGHT - 0.035;
    g.add(clampRing);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.07, 0.014), steel());
      finger.position.set(Math.cos(a) * 0.036, SEAT_HEIGHT - 0.035, Math.sin(a) * 0.036);
      finger.rotation.y = -a;
      g.add(finger);
    }
    // gauge on a post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 12), steel());
    post.position.set(0.24, 0.2, -0.12);
    g.add(post);
    const gaugeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 48), new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.9, roughness: 0.25 }));
    gaugeBody.rotation.x = Math.PI / 2;
    this.gauge = new THREE.Group();
    this.gauge.position.set(0.24, 0.36, -0.12);
    this.gauge.rotation.y = 0.45;
    this.gauge.rotation.x = -0.25;
    this.gauge.add(gaugeBody);
    this.dialMat = new THREE.MeshStandardMaterial({ roughness: 0.4, map: gaugeTexture(10) });
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.066, 48), this.dialMat);
    dial.position.z = 0.0181;
    this.gauge.add(dial);
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.068, 48),
      new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.12, roughness: 0, clearcoat: 1, color: 0xffffff }),
    );
    glass.position.z = 0.021;
    this.gauge.add(glass);
    const needleShape = new THREE.Shape();
    needleShape.moveTo(-0.003, -0.008);
    needleShape.lineTo(0.003, -0.008);
    needleShape.lineTo(0.0008, 0.056);
    needleShape.lineTo(-0.0008, 0.056);
    needleShape.closePath();
    this.needle = new THREE.Mesh(new THREE.ShapeGeometry(needleShape), new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.4 }));
    this.needle.position.z = 0.0195;
    this.gauge.add(this.needle);
    const hub = new THREE.Mesh(new THREE.CircleGeometry(0.007, 20), dark());
    hub.position.z = 0.02;
    this.gauge.add(hub);
    g.add(this.gauge);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  /** Rebuild the parts that depend on parameters. */
  update(P) {
    disposeObject(this.dynamic);
    this.group.remove(this.dynamic);
    this.dynamic = new THREE.Group();
    this.group.add(this.dynamic);
    const d = this.dynamic;

    // seal head sized to the nozzle
    const seal = new THREE.Mesh(
      new THREE.CylinderGeometry(clamp(P.diaNoz * 0.45, 0.004, 0.06), 0.022, 0.03, 32),
      dark(),
    );
    seal.position.y = SEAT_HEIGHT - 0.015;
    d.add(seal);

    // launch tube (inside the bottle)
    if (P.ltLength > 0 && P.ltDia > 0) {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(P.ltDia / 2, P.ltDia / 2, P.ltLength, 32),
        new THREE.MeshStandardMaterial({ color: 0x8e99a6, roughness: 0.35, metalness: 0.2 }),
      );
      tube.position.y = SEAT_HEIGHT + P.ltLength / 2;
      d.add(tube);
    }

    // pressure chamber (launcher volume)
    const r = 0.045;
    const len = clamp(P.lVol / (Math.PI * r * r), 0.1, 2.2);
    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 32), pvc());
    chamber.rotation.z = Math.PI / 2;
    chamber.position.set(-0.07 - len / 2, 0.135, 0);
    d.add(chamber);
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.025, 32), pvc());
      cap.rotation.z = Math.PI / 2;
      cap.position.set(-0.07 - len / 2 + (s * len) / 2, 0.135, 0);
      d.add(cap);
    }
    if (P.lVol > 0) {
      const vlabel = textSprite(`${(P.lVol * 1000).toFixed(1)} L`, { height: 0.05 });
      vlabel.position.set(-0.07 - len / 2, 0.22, 0);
      d.add(vlabel);
    }

    // gauge face scaled to the pressure
    const lim = bottleLimits(P);
    const max = niceMax(Math.max(P.gPressure, lim.safe));
    const key = `${max}|${lim.safe}|${lim.burst}`;
    if (key !== this.gaugeKey) {
      this.dialMat.map?.dispose();
      this.dialMat.map = gaugeTexture(max, lim.safe, lim.burst);
      this.dialMat.needsUpdate = true;
      this.gaugeMax = max;
      this.gaugeKey = key;
    }
    this.setPressure(P.gPressure, true);

    // gas source + hose
    const src = new THREE.Group();
    const gas = GASES[P.gas] || GASES.air;
    let inlet;
    if (P.gas === 'air' || !P.gas) {
      // stand (foot) pump
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.11), dark());
      base.position.y = 0.01;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.62, 32), new THREE.MeshPhysicalMaterial({ color: 0x1d4ed8, roughness: 0.3, metalness: 0.5, clearcoat: 0.7 }));
      barrel.position.y = 0.33;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 12), steel());
      rod.position.y = 0.69;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 16), dark());
      handle.rotation.z = Math.PI / 2;
      handle.position.y = 0.75;
      const pg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 32), steel());
      pg.rotation.x = Math.PI / 2;
      pg.position.set(0, 0.12, 0.036);
      src.add(base, barrel, rod, handle, pg);
      inlet = new THREE.Vector3(0, 0.05, 0);
    } else {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 1.05, 40),
        new THREE.MeshPhysicalMaterial({ color: gas.color, roughness: 0.35, metalness: 0.4, clearcoat: 0.6 }),
      );
      body.position.y = 0.525;
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.11, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), body.material);
      shoulder.position.y = 1.05;
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.12, 20), steel());
      valve.position.y = 1.2;
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 24), dark());
      wheel.rotation.x = Math.PI / 2;
      wheel.position.y = 1.27;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.08, 40), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 }));
      band.position.y = 0.85;
      src.add(body, shoulder, valve, wheel, band);
      const lbl = textSprite(gas.short, { height: 0.12 });
      lbl.position.set(0, 1.45, 0);
      src.add(lbl);
      inlet = new THREE.Vector3(0, 1.18, 0);
    }
    src.position.set(1.35, 0, 0.75);
    src.rotation.y = -0.6;
    d.add(src);
    src.updateMatrixWorld(true);
    const inletW = inlet.clone().applyMatrix4(src.matrixWorld);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, 0.135, 0.0),
      new THREE.Vector3(0.25, 0.03, 0.1),
      new THREE.Vector3(0.7, 0.02, 0.45),
      new THREE.Vector3(inletW.x - 0.15, 0.02, inletW.z - 0.05),
      inletW,
    ]);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.008, 10), new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.7 }));
    d.add(hose);

    d.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  setPressure(bar, immediate = false) {
    const max = this.gaugeMax || 10;
    const frac = clamp(bar / max, 0, 1);
    this.needleTarget = lerp(Math.PI * 0.75, -Math.PI * 0.75, frac);
    if (immediate) this.needleAngle = this.needleTarget;
  }

  tick(dt) {
    this.needleAngle += (this.needleTarget - this.needleAngle) * (1 - Math.exp(-dt * 10));
    this.needle.rotation.z = this.needleAngle;
  }
}
