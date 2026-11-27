/**
 * AquaThrust — the 3D world: renderer, sky, terrain, vegetation, clouds and light.
 * Everything here reacts smoothly to the environment parameters:
 *   temperature  → season (snow ↔ green ↔ dry/desert), tree foliage
 *   humidity     → haze, fog distance, cloud cover
 *   air pressure → altitude: taller snowy mountains, deeper blue sky
 *   gravity      → latitude → height of the sun
 */
import * as THREE from '../../vendor/three.module.js?v=1.7.1';
import { OrbitControls } from '../../vendor/OrbitControls.js?v=1.7.1';
import { clamp, lerp, smoothstep, rng, fbm, ridge, noise2, cloudTexture, groundDetailTexture } from './util.js?v=1.7.1';
import { pressureToAltitude } from '../physics/engine.js?v=1.7.1';
import { gravityToLatitude } from '../physics/presets.js?v=1.7.1';

const C = (h) => new THREE.Color(h);

/* palettes (sRGB hex → converted to linear by THREE.Color) */
const PAL = {
  grassLush: C(0x4d8a2f),
  grassLush2: C(0x6c9e3a),
  grassDry: C(0xb39a58),
  sand: C(0xd9c18c),
  snow: C(0xf1f5fa),
  rock: C(0x7c7670),
  rockCold: C(0x8d939c),
  dirt: C(0x8a7458),
  treeGreen: C(0x2f6b2a),
  treeAutumn: C(0xc8742a),
  treeDry: C(0x7b7d3c),
  treeSnow: C(0xdfe7ee),
};

export class World {
  constructor(container) {
    this.container = container;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.02, 9000);
    this.camera.position.set(2.2, 1.2, 3.2);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 1500;
    this.controls.target.set(0, 0.6, 0);
    this.userInteracting = false;
    this.lastInteraction = -1e9;
    this.controls.addEventListener('start', () => {
      this.userInteracting = true;
      this.lastInteraction = performance.now();
    });
    this.controls.addEventListener('end', () => {
      this.userInteracting = false;
      this.lastInteraction = performance.now();
    });

    // environment state: current (lerped) and target
    this.env = null;
    this.envTarget = null;

    this.buildSky();
    this.buildLights();
    this.buildTerrain();
    this.buildTrees();
    this.buildClouds();
    this.buildPadArea();

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envDirty = true;
    this.envTimer = 0;

    this.clock = new THREE.Clock();
    this.callbacks = [];
    this.visible = true;
    this.running = false;
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.io = new IntersectionObserver((e) => {
      this.visible = e[0].isIntersecting;
    });
    this.io.observe(container);
  }

  /* ------------------------------------------------------------------- sky */
  buildSky() {
    this.skyUniforms = {
      uTop: { value: C(0x2b68c9) },
      uHorizon: { value: C(0xbcd6ee) },
      uGround: { value: C(0x9aa7b2) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.6, -0.5).normalize() },
      uSunColor: { value: C(0xfff1d6) },
      uHaze: { value: 0.3 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGround; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uHaze;
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          float k = pow(clamp(h, 0.0, 1.0), mix(0.55, 0.9, uHaze));
          vec3 col = mix(uHorizon, uTop, k);
          col = mix(col, uGround, smoothstep(0.0, -0.08, h));
          float s = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunColor * (pow(s, 1400.0) * 30.0 + pow(s, 90.0) * 0.9 + pow(s, 8.0) * (0.12 + 0.35 * uHaze));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    // separate scene used to render reflections (PMREM)
    this.skyScene = new THREE.Scene();
    this.skyScene.add(new THREE.Mesh(this.sky.geometry, mat));
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5c5236, 0.9);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = -4;
    s.right = 4;
    s.top = 4;
    s.bottom = -4;
    s.near = 0.5;
    s.far = 60;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    this.sun = sun;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.scene.fog = new THREE.Fog(0xbcd6ee, 200, 2600);
  }

  /* --------------------------------------------------------------- terrain */
  buildTerrain() {
    const rings = 200;
    const segs = 220;
    const Rmax = 3200;
    const verts = (rings + 1) * segs + 1;
    const pos = new Float32Array(verts * 3);
    const uv = new Float32Array(verts * 2);
    const aHill = new Float32Array(verts);
    const aMount = new Float32Array(verts);
    const aGradH = new Float32Array(verts * 2);
    const aGradM = new Float32Array(verts * 2);
    const aVar = new Float32Array(verts);

    const hill = (x, z) => {
      const r = Math.hypot(x, z);
      const f = smoothstep(30, 160, r);
      return (fbm(x / 220 + 5, z / 220 + 9, 5) - 0.45) * 26 * f + (fbm(x / 40, z / 40, 3) - 0.5) * 1.2 * smoothstep(8, 40, r);
    };
    const mount = (x, z) => {
      const r = Math.hypot(x, z);
      const f = smoothstep(520, 1300, r);
      const n = ridge(x / 520 + 3, z / 520 + 7, 6);
      return Math.max(0, n * 1.35 - 0.12) * f;
    };

    let k = 0;
    const put = (x, z) => {
      pos[k * 3] = x;
      pos[k * 3 + 1] = 0;
      pos[k * 3 + 2] = z;
      uv[k * 2] = x / 6;
      uv[k * 2 + 1] = z / 6;
      const e = 1.5;
      aHill[k] = hill(x, z);
      aMount[k] = mount(x, z);
      aGradH[k * 2] = (hill(x + e, z) - hill(x - e, z)) / (2 * e);
      aGradH[k * 2 + 1] = (hill(x, z + e) - hill(x, z - e)) / (2 * e);
      const em = 6;
      aGradM[k * 2] = (mount(x + em, z) - mount(x - em, z)) / (2 * em);
      aGradM[k * 2 + 1] = (mount(x, z + em) - mount(x, z - em)) / (2 * em);
      aVar[k] = fbm(x / 55 + 1, z / 55 + 2, 4);
      k++;
    };
    put(0, 0);
    for (let i = 1; i <= rings + 1; i++) {
      const t = (i - 1) / rings;
      const r = 1.2 + (Rmax - 1.2) * Math.pow(t, 2.6);
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        put(Math.cos(a) * r, Math.sin(a) * r);
      }
    }
    const idx = [];
    for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
    for (let i = 0; i < rings; i++) {
      const b0 = 1 + i * segs;
      const b1 = 1 + (i + 1) * segs;
      for (let j = 0; j < segs; j++) {
        const j1 = (j + 1) % segs;
        idx.push(b0 + j, b0 + j1, b1 + j);
        idx.push(b0 + j1, b1 + j1, b1 + j);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('aHill', new THREE.BufferAttribute(aHill, 1));
    geo.setAttribute('aMount', new THREE.BufferAttribute(aMount, 1));
    geo.setAttribute('aGradH', new THREE.BufferAttribute(aGradH, 2));
    geo.setAttribute('aGradM', new THREE.BufferAttribute(aGradM, 2));
    geo.setAttribute('aVar', new THREE.BufferAttribute(aVar, 1));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), Rmax * 1.1);
    this.hillAt = hill;

    this.terrainUniforms = {
      uMount: { value: 120 },
      uGrass: { value: PAL.grassLush.clone() },
      uGrass2: { value: PAL.grassLush2.clone() },
      uDry: { value: PAL.grassDry.clone() },
      uDryness: { value: 0 },
      uSnow: { value: 0 },
      uSnowLine: { value: 600 },
      uSnowCol: { value: PAL.snow.clone() },
      uRock: { value: PAL.rock.clone() },
      uDirt: { value: PAL.dirt.clone() },
    };
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0,
      map: groundDetailTexture(),
    });
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.terrainUniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aHill; attribute float aMount; attribute vec2 aGradH; attribute vec2 aGradM; attribute float aVar;
          uniform float uMount;
          varying float vHeight; varying float vSlope; varying float vVar; varying float vDist;`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `vec3 objectNormal = normalize(vec3(-(aGradH.x + uMount * aGradM.x), 1.0, -(aGradH.y + uMount * aGradM.y)));`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position.x, aHill + uMount * aMount, position.z);
           vHeight = transformed.y; vSlope = objectNormal.y; vVar = aVar; vDist = length(position.xz);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uGrass; uniform vec3 uGrass2; uniform vec3 uDry; uniform float uDryness; uniform float uSnow;
          uniform float uSnowLine; uniform vec3 uSnowCol; uniform vec3 uRock; uniform vec3 uDirt;
          varying float vHeight; varying float vSlope; varying float vVar; varying float vDist;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec3 g = mix(uGrass, uGrass2, smoothstep(0.35, 0.65, vVar));
          g = mix(g, uDry, clamp(uDryness * (0.6 + vVar), 0.0, 1.0));
          float pad = 1.0 - smoothstep(2.2, 5.5, vDist + vVar * 2.0);
          g = mix(g, uDirt, pad * 0.75);
          float rock = smoothstep(0.86, 0.6, vSlope) + smoothstep(uSnowLine * 0.55, uSnowLine * 0.9, vHeight) * 0.6;
          g = mix(g, uRock, clamp(rock, 0.0, 1.0));
          float snowLine = smoothstep(uSnowLine - 30.0, uSnowLine + 30.0, vHeight + (vVar - 0.5) * 120.0);
          float snow = max(uSnow * (0.85 + 0.15 * vVar), snowLine) * smoothstep(0.45, 0.7, vSlope);
          g = mix(g, uSnowCol, clamp(snow, 0.0, 1.0));
          diffuseColor.rgb *= g;`,
        );
    };
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  /* ------------------------------------------------------------------ trees */
  buildTrees() {
    const N = 900;
    const foliageGeo = new THREE.ConeGeometry(1.5, 4.6, 7, 1);
    foliageGeo.translate(0, 4.2, 0);
    const foliage2 = new THREE.ConeGeometry(1.15, 3.4, 7, 1);
    foliage2.translate(0, 6.0, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 2.2, 6);
    trunkGeo.translate(0, 1.1, 0);
    this.treeMat = new THREE.MeshStandardMaterial({ color: PAL.treeGreen.clone(), roughness: 0.9, flatShading: true });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 });
    this.trees = [
      new THREE.InstancedMesh(foliageGeo, this.treeMat, N),
      new THREE.InstancedMesh(foliage2, this.treeMat, N),
      new THREE.InstancedMesh(trunkGeo, trunkMat, N),
    ];
    const r = rng(42);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const colr = new THREE.Color();
    let placed = 0;
    let tries = 0;
    while (placed < N && tries < N * 30) {
      tries++;
      const ang = r() * Math.PI * 2;
      const rad = 28 + Math.pow(r(), 0.7) * 520;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      if (fbm(x / 90, z / 90, 3) < 0.47) continue; // clustered forests
      const y = this.hillAt(x, z);
      const sc = 0.6 + r() * 0.9;
      p.set(x, y - 0.1, z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28);
      s.set(sc, sc * (0.85 + r() * 0.4), sc);
      m.compose(p, q, s);
      for (const t of this.trees) t.setMatrixAt(placed, m);
      const v = 0.75 + r() * 0.5;
      colr.setRGB(v, v * (0.92 + r() * 0.16), v);
      this.trees[0].setColorAt(placed, colr);
      this.trees[1].setColorAt(placed, colr);
      placed++;
    }
    for (const t of this.trees) {
      t.count = placed;
      t.castShadow = false;
      t.receiveShadow = false;
      t.instanceMatrix.needsUpdate = true;
      if (t.instanceColor) t.instanceColor.needsUpdate = true;
      t.computeBoundingSphere();
      this.scene.add(t);
    }
    this.treeTotal = placed;
  }

  /* ----------------------------------------------------------------- clouds */
  buildClouds() {
    const r = rng(7);
    const texs = [cloudTexture(3), cloudTexture(9), cloudTexture(17)];
    this.clouds = [];
    this.cloudGroup = new THREE.Group();
    for (let i = 0; i < 46; i++) {
      const mat = new THREE.SpriteMaterial({ map: texs[i % 3], transparent: true, depthWrite: false, opacity: 0.8, fog: false });
      const sp = new THREE.Sprite(mat);
      const ang = r() * Math.PI * 2;
      const rad = 150 + r() * 2200;
      const w = 220 + r() * 420;
      sp.position.set(Math.cos(ang) * rad, 260 + r() * 380, Math.sin(ang) * rad);
      sp.scale.set(w, w * 0.55, 1);
      sp.userData = { order: r(), speed: 1.5 + r() * 3, baseY: sp.position.y };
      this.cloudGroup.add(sp);
      this.clouds.push(sp);
    }
    this.scene.add(this.cloudGroup);
  }

  /* ------------------------------------------------------- around the pad */
  buildPadArea() {
    // concrete launch slab
    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.32, 0.06, 48),
      new THREE.MeshStandardMaterial({ color: 0xa9a59d, roughness: 0.92 }),
    );
    slab.position.y = 0.0;
    slab.receiveShadow = true;
    this.scene.add(slab);
    // safety cones
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.6 });
    const stripe = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const g = new THREE.Group();
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 16), coneMat);
      c.position.y = 0.24;
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.06, 16), stripe);
      s.position.y = 0.26;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3), coneMat);
      b.position.y = 0.03;
      g.add(c, s, b);
      g.traverse((o) => (o.castShadow = true));
      g.position.set(Math.cos(a) * 3.4, this.hillAt(Math.cos(a) * 3.4, Math.sin(a) * 3.4), Math.sin(a) * 3.4);
      this.scene.add(g);
    }
  }

  /* -------------------------------------------------------- environment API */
  /** Compute the look of the world for a parameter set. */
  static computeEnv(P) {
    const T = P.aTemperature - 273.15;
    const H = clamp(P.humidity, 0, 1);
    const alt = clamp(pressureToAltitude(P.pressAtm), -500, 9000);
    const lat = gravityToLatitude(P.gravity);
    const snow = smoothstep(4, -3, T);
    const dryness = clamp(smoothstep(24, 44, T) * (1 - 0.55 * H) + (1 - H) * smoothstep(12, 30, T) * 0.5, 0, 1);
    const autumn = smoothstep(3, 9, T) * (1 - smoothstep(12, 18, T));
    const altK = clamp(alt / 4000, 0, 1.3);

    const grass = PAL.grassLush.clone().lerp(C(0x3f7a3a), altK * 0.4);
    const grass2 = PAL.grassLush2.clone().lerp(PAL.grassDry, autumn * 0.4);
    const dry = PAL.grassDry.clone().lerp(PAL.sand, smoothstep(34, 50, T));
    const tree = PAL.treeGreen
      .clone()
      .lerp(PAL.treeAutumn, autumn * 0.7)
      .lerp(PAL.treeDry, dryness * 0.8)
      .lerp(PAL.treeSnow, snow * 0.75);
    const treeDensity = clamp(1 - dryness * 0.95, 0.05, 1) * clamp(1 - altK * 0.6, 0.25, 1);

    const top = C(0x2f6fd0).lerp(C(0x0f2f78), clamp(altK * 0.8, 0, 1)).lerp(C(0x8d9fb5), Math.pow(H, 3) * 0.8);
    const horizon = C(0xc4dcf0).lerp(C(0xe9ecee), H * 0.6).lerp(C(0xf0dfc0), dryness * 0.35).lerp(C(0xa8c4e6), altK * 0.3);
    const elev = clamp(90 - lat * 0.95, 12, 72);
    const sunElev = (elev * Math.PI) / 180;
    const sunDir = new THREE.Vector3(Math.cos(sunElev) * 0.6, Math.sin(sunElev), -Math.cos(sunElev) * 0.8).normalize();
    const sunColor = C(0xfff3dc).lerp(C(0xffc890), smoothstep(30, 12, elev) * 0.8);

    return {
      T, H, alt, lat, elev,
      snow, dryness, autumn,
      grass, grass2, dry, tree, treeDensity,
      top, horizon, sunDir, sunColor,
      haze: clamp(H * 0.9 + dryness * 0.2, 0, 1),
      fogFar: lerp(3200, 420, Math.pow(H, 2.2)) * (1 + altK * 0.3),
      clouds: clamp(H * 1.15 - 0.1, 0.04, 1),
      mount: 70 + alt * 0.17,
      snowLine: clamp(380 + T * 28 + (1 - altK) * 200, 120, 2400),
    };
  }

  setEnvironment(P, immediate = false) {
    this.envTarget = World.computeEnv(P);
    if (!this.env || immediate) this.env = World.computeEnv(P);
    this.envDirty = true;
  }

  updateEnvironment(dt) {
    if (!this.envTarget) return;
    const e = this.env;
    const t = this.envTarget;
    const k = 1 - Math.exp(-dt * 4.5);
    for (const key of ['grass', 'grass2', 'dry', 'tree', 'top', 'horizon', 'sunColor']) e[key].lerp(t[key], k);
    e.sunDir.lerp(t.sunDir, k).normalize();
    for (const key of ['snow', 'dryness', 'treeDensity', 'haze', 'fogFar', 'clouds', 'mount', 'snowLine', 'elev']) e[key] = lerp(e[key], t[key], k);

    const u = this.terrainUniforms;
    u.uGrass.value.copy(e.grass);
    u.uGrass2.value.copy(e.grass2);
    u.uDry.value.copy(e.dry);
    u.uDryness.value = e.dryness;
    u.uSnow.value = e.snow;
    u.uMount.value = e.mount;
    u.uSnowLine.value = e.snowLine;
    u.uRock.value.copy(PAL.rock).lerp(PAL.rockCold, e.snow);

    this.treeMat.color.copy(e.tree);
    const n = Math.round(this.treeTotal * e.treeDensity);
    for (const tr of this.trees) tr.count = n;

    const s = this.skyUniforms;
    s.uTop.value.copy(e.top);
    s.uHorizon.value.copy(e.horizon);
    s.uGround.value.copy(e.horizon).multiplyScalar(0.85);
    s.uSunDir.value.copy(e.sunDir);
    s.uSunColor.value.copy(e.sunColor);
    s.uHaze.value = e.haze;

    this.scene.fog.color.copy(e.horizon);
    this.scene.fog.far = e.fogFar;
    this.scene.fog.near = Math.min(250, e.fogFar * 0.15);

    const sunI = lerp(1.2, 2.8, smoothstep(8, 45, e.elev)) * (1 - e.haze * 0.35);
    this.sun.intensity = sunI;
    this.sun.color.copy(e.sunColor);
    this.hemi.intensity = 0.65 + e.haze * 0.45;
    this.hemi.color.copy(e.top).lerp(C(0xffffff), 0.55);
    this.hemi.groundColor.copy(e.grass).multiplyScalar(0.6);
    this.renderer.toneMappingExposure = 0.95 + e.snow * -0.12 + e.haze * 0.05;

    for (const c of this.clouds) {
      const vis = c.userData.order < e.clouds;
      c.visible = vis;
      c.material.opacity = 0.55 + e.haze * 0.35;
      c.position.y = c.userData.baseY * lerp(1, 0.55, Math.max(0, e.haze - 0.5) * 2);
      c.material.color.copy(C(0xffffff)).lerp(C(0xb9c0c8), Math.max(0, e.haze - 0.6) * 1.5);
    }

    // re-bake reflections occasionally while things change
    this.envTimer -= dt;
    if (this.envDirty && this.envTimer <= 0) {
      this.bakeReflections();
      this.envTimer = 0.35;
      const converged =
        Math.abs(e.top.r - t.top.r) + Math.abs(e.top.g - t.top.g) + Math.abs(e.top.b - t.top.b) +
        Math.abs(e.horizon.r - t.horizon.r) + Math.abs(e.horizon.g - t.horizon.g) + Math.abs(e.horizon.b - t.horizon.b) +
        Math.abs(e.haze - t.haze) < 0.003;
      if (converged) this.envDirty = false;
    }
  }

  bakeReflections() {
    const rt = this.pmrem.fromScene(this.skyScene, 0, 0.1, 6000);
    if (this.envRT) this.envRT.dispose();
    this.envRT = rt;
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 0.9;
  }

  /** Point the sun shadow camera at a location (keeps rocket shadows crisp). */
  focusShadow(x, y, z) {
    const d = this.env ? this.env.sunDir : new THREE.Vector3(0.4, 0.7, -0.5);
    this.sun.target.position.set(x, y, z);
    this.sun.position.set(x + d.x * 30, y + d.y * 30, z + d.z * 30);
  }

  /** Move the canvas observers to a new container (used after re-rendering the UI). */
  setContainer(el) {
    this.ro.disconnect();
    this.io.disconnect();
    this.container = el;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.io = new IntersectionObserver((e) => {
      this.visible = e[0].isIntersecting;
    });
    this.io.observe(el);
    this.resize();
  }

  /* -------------------------------------------------------------- render loop */
  onFrame(cb) {
    this.callbacks.push(cb);
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.1);
      if (!this.visible || document.hidden) return;
      this.updateEnvironment(dt);
      for (const c of this.clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 2600) c.position.x = -2600;
      }
      for (const cb of this.callbacks) cb(dt);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    this.running = false;
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    this.io.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export { noise2 };
