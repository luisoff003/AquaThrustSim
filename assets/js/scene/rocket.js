/**
 * AquaThrust — 3D rocket. The bottle is a lathe of the exact profile used by the
 * physics (neck + Bézier shoulder + cylinder + dome), so changing the nozzle,
 * diameter, volume or shoulder sliders reshapes the bottle you see.
 * The drag coefficient shapes the nose cone (low Cd → long pointy ogive).
 */
import * as THREE from '../../vendor/three.module.js?v=1.7.1';
import { clamp, lerp, canvasTexture, disposeObject } from './util.js?v=1.7.1';
import { rocketGeometry } from '../physics/stability.js?v=1.7.1';

/** Rocketry symbols: CM = quartered black/white circle, CP = red circle with a dot. */
function markerTexture(kind) {
  return canvasTexture(128, 128, (g, w) => {
    const c = w / 2;
    const r = 48;
    if (kind === 'cm') {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#111111';
      for (const a of [0, Math.PI]) {
        g.beginPath();
        g.moveTo(c, c);
        g.arc(c, c, r, a, a + Math.PI / 2);
        g.closePath();
        g.fill();
      }
      g.lineWidth = 8;
      g.strokeStyle = '#111111';
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.stroke();
    } else {
      g.fillStyle = '#e5383b';
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = '#ffffff';
      g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(c, c, 14, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function labelTex(text, color) {
  return canvasTexture(128, 64, (g, w, h) => {
    g.font = '800 40px system-ui, Segoe UI, sans-serif';
    g.fillStyle = 'rgba(10,20,35,0.75)';
    g.beginPath();
    g.roundRect(4, 6, w - 8, h - 12, 12);
    g.fill();
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

const RADIAL = 72;

function lathe(pts, scaleR = 1, segs = RADIAL) {
  const v = pts.map(([r, z]) => new THREE.Vector2(Math.max(0, r * scaleR), z));
  const g = new THREE.LatheGeometry(v, segs);
  g.computeVertexNormals();
  return g;
}

export function liquidLook(density) {
  const d = density / 1000;
  if (d > 3) return { color: new THREE.Color(0xc9ced6), metal: 1, opacity: 0.97, rough: 0.12 };
  const water = new THREE.Color(0x2f9ff0);
  if (d < 0.96) return { color: new THREE.Color(0xd9a12e).lerp(water, clamp((d - 0.6) / 0.36, 0, 1) * 0.5), metal: 0, opacity: 0.8, rough: 0.05 };
  const t = clamp((d - 1.0) / 2.0, 0, 1);
  return { color: water.lerp(new THREE.Color(0x19a38a), t), metal: 0, opacity: 0.74 + 0.15 * t, rough: 0.05 };
}

function labelTexture() {
  return canvasTexture(1024, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0b3d91');
    gr.addColorStop(1, '#1565c0');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd166';
    g.fillRect(0, 10, w, 6);
    g.fillRect(0, h - 16, w, 6);
    g.font = '800 62px system-ui, Segoe UI, Roboto, sans-serif';
    g.fillStyle = '#ffffff';
    g.textBaseline = 'middle';
    for (let i = 0; i < 2; i++) g.fillText('AQUATHRUST', 40 + i * 512, h / 2 + 2);
  });
}

export class RocketModel {
  constructor() {
    this.group = new THREE.Group();
    this.body = new THREE.Group(); // rotates for nose-over during descent
    this.group.add(this.body);
    this.mats = {
      bottle: new THREE.MeshPhysicalMaterial({
        color: 0xe8f6ff,
        metalness: 0,
        roughness: 0.04,
        transparent: true,
        opacity: 0.26,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMapIntensity: 1.6,
        specularIntensity: 1,
        ior: 1.57,
      }),
      water: new THREE.MeshPhysicalMaterial({
        color: 0x2f9ff0,
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity: 0.75,
        clearcoat: 0.6,
        envMapIntensity: 1.2,
      }),
      fog: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
      nose: new THREE.MeshPhysicalMaterial({ color: 0xe63946, roughness: 0.32, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
      fin: new THREE.MeshPhysicalMaterial({ color: 0xffb703, roughness: 0.4, metalness: 0.05, clearcoat: 0.6, side: THREE.DoubleSide }),
      label: new THREE.MeshStandardMaterial({ map: labelTexture(), roughness: 0.45, metalness: 0.05 }),
      collar: new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.5, metalness: 0.3 }),
      ext: new THREE.MeshPhysicalMaterial({ color: 0xdfe7f1, roughness: 0.45, metalness: 0.05, clearcoat: 0.4, side: THREE.DoubleSide }),
    };
    this.height = 0.4;
    this.waterLevel = -1;
    // centre of mass / centre of pressure markers (always drawn on top)
    this.markers = new THREE.Group();
    const mk = (tex) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, fog: false }));
    this.cmMark = mk(markerTexture('cm'));
    this.cpMark = mk(markerTexture('cp'));
    this.cmLabel = mk(labelTex('CM', '#ffffff'));
    this.cpLabel = mk(labelTex('CP', '#ff8a8c'));
    for (const s of [this.cmMark, this.cpMark, this.cmLabel, this.cpLabel]) {
      s.renderOrder = 20;
      this.markers.add(s);
    }
    this.markers.visible = false;
  }

  /** Place the CM / CP markers (z measured up from the nozzle, body coordinates). */
  setMarkers(cmZ, cpZ, size) {
    this.cmMark.position.set(0, cmZ, 0);
    this.cpMark.position.set(0, cpZ, 0);
    this.cmMark.scale.setScalar(size);
    this.cpMark.scale.setScalar(size);
    this.cmLabel.scale.set(size * 1.3, size * 0.65, 1);
    this.cpLabel.scale.set(size * 1.3, size * 0.65, 1);
    this.cmLabel.position.set(-size * 1.2, cmZ, 0);
    this.cpLabel.position.set(size * 1.2, cpZ, 0);
  }

  build(P, bottle) {
    for (const c of [...this.body.children]) {
      this.body.remove(c);
      if (c !== this.markers) c.geometry?.dispose();
    }
    this.body.add(this.markers);
    this.bottle = bottle;
    const Db = P.diaBot;
    const R = Db / 2;
    const sT = bottle.shoulderTop;
    const cylTop = Math.max(bottle.cylinderTop, sT);

    // bottle shell
    const shell = new THREE.Mesh(lathe(bottle.outline(1.4)), this.mats.bottle);
    shell.renderOrder = 3;
    this.body.add(shell);

    // neck collar / thread ring
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(P.diaNoz * 0.62, P.diaNoz * 0.62, P.diaNoz * 0.45, 40),
      this.mats.collar,
    );
    collar.position.y = P.diaNoz * 0.35;
    collar.castShadow = true;
    this.body.add(collar);

    // water
    this.water = new THREE.Mesh(new THREE.BufferGeometry(), this.mats.water);
    this.water.renderOrder = 1;
    this.body.add(this.water);
    this.waterLevel = -1;
    this.setWaterVolume(P.volWat);
    this.setLiquid(P.liquidDensity);

    // condensation fog inside the bottle
    this.fog = new THREE.Mesh(lathe(bottle.outline(0.8), 0.96, 40), this.mats.fog);
    this.fog.renderOrder = 2;
    this.fog.visible = false;
    this.body.add(this.fog);

    // label band in the middle of the straight body
    const cylLen = cylTop - sT;
    if (cylLen > Db * 0.45) {
      const bandH = Math.min(Db * 0.32, cylLen * 0.3);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.006, R * 1.006, bandH, RADIAL, 1, true), this.mats.label);
      band.position.y = sT + cylLen * 0.55;
      band.castShadow = true;
      this.body.add(band);
      this.mats.label.map.repeat.set(Math.max(1, Math.round((Math.PI * Db) / (bandH * 4))), 1);
      this.mats.label.map.wrapS = THREE.RepeatWrapping;
    }

    // nose cone, shape from the drag coefficient (same geometry as the stability maths)
    const G = rocketGeometry(P, bottle);
    const sharp = G.sharp;
    const L = G.L;
    const Rn = R * 1.035;
    const z0 = G.z0;
    const nosePts = [[Rn, z0 - 0.12 * Db], [Rn, z0]];
    const n = 32;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const blunt = Math.sqrt(Math.max(0, 1 - t * t));
      const ogive = 1 - Math.pow(t, 1.75);
      let r = Rn * lerp(blunt, ogive, sharp);
      if (G.squash < 1) r = Rn * Math.sqrt(Math.max(0, 1 - Math.pow(t, 6)));
      nosePts.push([r, z0 + L * t]);
    }
    if (G.ext > 0.001) {
      const z1 = G.cylTop - 0.06 * Db;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(Rn, Rn, G.z0 - z1 + 0.002, RADIAL, 1, true), this.mats.ext);
      tube.position.y = (z1 + G.z0) / 2;
      tube.castShadow = true;
      this.body.add(tube);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(Rn * 1.01, Rn * 1.01, Math.min(0.012, G.ext * 0.2), RADIAL, 1, true), this.mats.collar);
      ring.position.y = z1 + 0.004;
      this.body.add(ring);
    }
    const nose = new THREE.Mesh(lathe(nosePts), this.mats.nose);
    nose.castShadow = true;
    this.body.add(nose);
    this.noseTip = nosePts[nosePts.length - 1][1];

    // fins (3 or 4), swept, following the bottle wall
    const span = G.span;
    const zr0 = G.zr0;
    const zr1 = G.zr1;
    const shape = new THREE.Shape();
    const steps = 10;
    shape.moveTo(bottle.radiusAt(zr1) - 0.001, zr1);
    for (let i = 1; i <= steps; i++) {
      const z = zr1 + ((zr0 - zr1) * i) / steps;
      shape.lineTo(bottle.radiusAt(z) - 0.001, z);
    }
    shape.lineTo(R + span, G.tipBot);
    shape.lineTo(R + span, G.tipTop);
    shape.closePath();
    const thick = clamp(Db * 0.025, 0.0015, 0.008);
    const finGeo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.3, bevelSize: thick * 0.3, bevelSegments: 2 });
    finGeo.translate(0, 0, -thick / 2);
    const nf = G.finCount;
    for (let i = 0; i < nf; i++) {
      const fin = new THREE.Mesh(finGeo, this.mats.fin);
      fin.rotation.y = (i / nf) * Math.PI * 2 + Math.PI / 4;
      fin.castShadow = true;
      this.body.add(fin);
    }
    this.finBottom = G.tipBot;
    this.height = this.noseTip - this.finBottom;
    this.top = this.noseTip;
  }

  setLiquid(density) {
    const l = liquidLook(density);
    const m = this.mats.water;
    m.color.copy(l.color);
    m.metalness = l.metal;
    m.opacity = l.opacity;
    m.roughness = l.rough;
  }

  setWaterVolume(V) {
    if (!this.bottle) return;
    const hw = V > 1e-7 ? this.bottle.heightForVolume(V) : 0;
    if (Math.abs(hw - this.waterLevel) < 0.0004) return;
    this.waterLevel = hw;
    this.water.geometry.dispose();
    if (hw <= 0.0005) {
      this.water.visible = false;
      this.water.geometry = new THREE.BufferGeometry();
      return;
    }
    this.water.visible = true;
    this.water.geometry = lathe(this.bottle.liquidOutline(hw, 1), 0.975, 56);
  }

  setFog(amount) {
    this.fog.visible = amount > 0.01;
    this.mats.fog.opacity = clamp(amount, 0, 1) * 0.75;
  }

  dispose() {
    disposeObject(this.group);
  }
}
