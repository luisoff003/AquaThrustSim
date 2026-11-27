/**
 * AquaThrust — visual effects: the water jet (simulation-time particles that fall
 * under gravity and splash on the ground), the air blast / condensation cloud and
 * landing dust (wall-time sprites).
 */
import * as THREE from '../../vendor/three.module.js?v=1.7.1';
import { softDotTexture, cloudTexture, rng } from './util.js?v=1.7.1';

export class WaterJet {
  constructor(max = 4000) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.splash = new Uint8Array(max);
    this.next = 0;
    this.r = rng(5);
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aSize', this.sizeAttr);
    geo.setAttribute('aAlpha', this.alphaAttr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.uniforms = {
      uMap: { value: softDotTexture() },
      uColor: { value: new THREE.Color(0xbfe6ff) },
      uScale: { value: 600 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vA = aAlpha;
          gl_PointSize = aSize * uScale / max(0.05, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform vec3 uColor; varying float vA;
        void main(){ vec4 t = texture2D(uMap, gl_PointCoord); if (vA <= 0.0) discard;
          gl_FragColor = vec4(uColor, t.a * vA); }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.active = 0;
  }

  setColor(c) {
    this.uniforms.uColor.value.copy(c).lerp(new THREE.Color(0xffffff), 0.45);
  }

  setViewport(heightPx, fov) {
    this.uniforms.uScale.value = heightPx / (2 * Math.tan((fov * Math.PI) / 360));
  }

  emit(n, origin, vy, speed, spread, size) {
    const r = this.r;
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      const a = r() * Math.PI * 2;
      const s = spread * Math.sqrt(r());
      this.pos[i * 3] = origin.x + Math.cos(a) * size * 0.3;
      this.pos[i * 3 + 1] = origin.y - r() * speed * 0.0006;
      this.pos[i * 3 + 2] = origin.z + Math.sin(a) * size * 0.3;
      this.vel[i * 3] = Math.cos(a) * s * speed;
      this.vel[i * 3 + 1] = vy - speed * (0.92 + 0.08 * r());
      this.vel[i * 3 + 2] = Math.sin(a) * s * speed;
      this.life[i] = 1;
      this.size[i] = size * (0.6 + 0.8 * r());
      this.alpha[i] = 0.85;
      this.splash[i] = 0;
    }
  }

  /** Advance particles by simulation time dt (seconds). */
  update(dt) {
    if (dt <= 0) return;
    const g = 9.81;
    let active = 0;
    const r = this.r;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      active++;
      const j = i * 3;
      // air drag on droplets
      const drag = Math.exp(-dt * (this.splash[i] ? 3 : 0.6));
      this.vel[j] *= drag;
      this.vel[j + 1] = (this.vel[j + 1] - g * dt) * (this.splash[i] ? drag : 1);
      this.vel[j + 2] *= drag;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < 0.02) {
        if (!this.splash[i] && this.vel[j + 1] < -1) {
          // splash: bounce sideways with spray
          const sp = Math.min(Math.abs(this.vel[j + 1]) * 0.25, 9);
          const a = r() * Math.PI * 2;
          this.vel[j] = Math.cos(a) * sp * (0.4 + r());
          this.vel[j + 2] = Math.sin(a) * sp * (0.4 + r());
          this.vel[j + 1] = sp * (0.3 + 0.6 * r());
          this.pos[j + 1] = 0.03;
          this.splash[i] = 1;
          this.size[i] *= 0.7;
        } else {
          this.pos[j + 1] = 0.02;
          this.life[i] -= dt * 4;
        }
      }
      if (this.splash[i]) this.life[i] -= dt * 1.4;
      this.alpha[i] = Math.max(0, Math.min(0.85, this.life[i]));
    }
    this.active = active;
    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }

  clear() {
    this.life.fill(0);
    this.alpha.fill(0);
    this.alphaAttr.needsUpdate = true;
  }
}

export class Puffs {
  constructor(max = 70) {
    this.group = new THREE.Group();
    this.items = [];
    const tex = cloudTexture(21);
    for (let i = 0; i < max; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
      const s = new THREE.Sprite(m);
      s.visible = false;
      this.group.add(s);
      this.items.push({ s, age: 0, life: 0, v: new THREE.Vector3(), grow: 1, base: 0.1, op: 0.6 });
    }
    this.next = 0;
    this.r = rng(9);
  }

  emit(pos, vel, { size = 0.2, grow = 1.5, life = 2.5, opacity = 0.7, color = 0xffffff } = {}) {
    const it = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;
    it.s.position.copy(pos);
    it.v.copy(vel);
    it.age = 0;
    it.life = life * (0.8 + 0.4 * this.r());
    it.base = size;
    it.grow = grow;
    it.op = opacity;
    it.s.material.color.set(color);
    it.s.material.rotation = this.r() * 6.28;
    it.s.visible = true;
  }

  /** wall-time update */
  update(dt) {
    for (const it of this.items) {
      if (!it.s.visible) continue;
      it.age += dt;
      const t = it.age / it.life;
      if (t >= 1) {
        it.s.visible = false;
        continue;
      }
      it.v.multiplyScalar(Math.exp(-dt * 2.2));
      it.s.position.addScaledVector(it.v, dt);
      const sc = it.base * (1 + it.grow * Math.sqrt(t) * 3);
      it.s.scale.set(sc * 1.6, sc, 1);
      it.s.material.opacity = it.op * (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9);
    }
  }

  clear() {
    for (const it of this.items) it.s.visible = false;
  }
}
