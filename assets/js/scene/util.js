import * as THREE from '../../vendor/three.module.js?v=1.7.1';

/* ------------------------------------------------------------------ math helpers */

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Deterministic PRNG (mulberry32). */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0,1]. */
export function noise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, oct = 5) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += amp * noise2(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}

export function ridge(x, y, oct = 5) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(noise2(x * f, y * f) * 2 - 1);
    s += amp * n * n;
    f *= 2.1;
    amp *= 0.5;
  }
  return s;
}

/* -------------------------------------------------------------------- textures */

export function canvasTexture(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.anisotropy = 4;
  return t;
}

/** Soft round particle sprite. */
export function softDotTexture() {
  return canvasTexture(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.8)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
}

/** Puffy cloud sprite built from overlapping blobs. */
export function cloudTexture(seed = 3) {
  const r = rng(seed);
  return canvasTexture(256, 160, (g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = w * (0.18 + 0.64 * r());
      const y = h * (0.42 + 0.3 * r() * (1 - Math.abs(x / w - 0.5)));
      const rad = 22 + 38 * r();
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const shade = 225 + Math.floor(30 * r());
      gr.addColorStop(0, `rgba(${shade},${shade},${shade + 3},0.55)`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** Fine ground detail (grass/soil speckle), greyscale so the biome tint shows through. */
export function groundDetailTexture() {
  const r = rng(11);
  return canvasTexture(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#d8d8d8';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5200; i++) {
        const v = 150 + Math.floor(r() * 105);
        g.fillStyle = `rgb(${v},${v},${v})`;
        const x = r() * w;
        const y = r() * h;
        g.fillRect(x, y, 1 + r() * 2, 1 + r() * 3);
      }
      for (let i = 0; i < 40; i++) {
        const v = 190 + Math.floor(r() * 60);
        g.fillStyle = `rgba(${v},${v},${v},0.35)`;
        g.beginPath();
        g.arc(r() * w, r() * h, 6 + r() * 18, 0, Math.PI * 2);
        g.fill();
      }
    },
    { repeat: [1, 1] },
  );
}

/** Text label sprite (canvas texture). Height in world units. */
export function textSprite(text, { height = 0.5, color = '#ffffff', bg = 'rgba(10,20,35,0.72)', font = 600, pad = 14 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const fs = 44;
  g.font = `${font} ${fs}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  const tw = Math.ceil(g.measureText(text).width);
  c.width = tw + pad * 2;
  c.height = fs + pad * 1.4;
  g.font = `${font} ${fs}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  if (bg) {
    g.fillStyle = bg;
    const r = 14;
    g.beginPath();
    g.roundRect(0, 0, c.width, c.height, r);
    g.fill();
  }
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.fillText(text, pad, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false });
  const s = new THREE.Sprite(mat);
  s.scale.set((height * c.width) / c.height, height, 1);
  s.userData.aspect = c.width / c.height;
  return s;
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}

export const col = (hex) => new THREE.Color(hex);
