/**
 * AquaThrust Water Rocket Simulator — application.
 * Mounts into a Shadow DOM so WordPress theme styles can't interfere.
 */
import * as THREE from '../vendor/three.module.js?v=1.7.1';
import { simulate, sweepWater, checkParameters, pressureToAltitude, PHASE_TUBE, PHASE_WATER, PHASE_GAS, PHASE_COAST } from './physics/engine.js?v=1.7.1';
import { BottleProfile } from './physics/bottle.js?v=1.7.1';
import { PRESETS, FIELDS, GASES, BASE, BOTTLE_TYPES, BOTTLE_MODELS, ROCKET_EXTRAS, bodyExtMass, withGas, gravityToLatitude } from './physics/presets.js?v=1.7.1';
import { t, setLang, getLang, detectLang, rememberLang, LANGS } from './i18n.js?v=1.7.1';
import { learnTemplate, fillLearn, safetyBarHTML } from './ui/learn.js?v=1.7.1';
import { stabilityReport, centerOfMass } from './physics/stability.js?v=1.7.1';
import { estimateCd } from './physics/drag.js?v=1.7.1';
import { stab as ST, zoneColor, finTemplate } from './ui/diagrams.js?v=1.7.1';
import { World } from './scene/world.js?v=1.7.1';
import { RocketModel } from './scene/rocket.js?v=1.7.1';
import { Launcher, SEAT_HEIGHT } from './scene/launcher.js?v=1.7.1';
import { WaterJet, Puffs } from './scene/effects.js?v=1.7.1';
import { textSprite, clamp, smoothstep, lerp, disposeObject } from './scene/util.js?v=1.7.1';
import { FieldGroup } from './ui/controls.js?v=1.7.1';
import { LineChart } from './ui/charts.js?v=1.7.1';
import { UNITS, fmtU, num, heightComparison, speedComparison, accelComparison, liquidName } from './ui/format.js?v=1.7.1';

const VERSION = '1.7.1';
const COLORS = {
  current: '#338ced',
  previous: '#e76624',
  bandTube: 'rgba(152,135,239,0.16)',
  bandWater: 'rgba(0,168,136,0.16)',
  bandGas: 'rgba(210,142,5,0.16)',
};
const PHASE_CLASS = ['tube', 'water', 'gas', 'coast'];

const ICON_ROCKET = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c3.2 2.3 5 5.9 5 10.2V16l2.4 2.6c.3.3.1.9-.4.9H15l-1 2h-4l-1-2H5c-.5 0-.7-.6-.4-.9L7 16v-3.8C7 7.9 8.8 4.3 12 2zm0 6.2a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6z"/></svg>`;
const ICON_BOOK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4.5A2.5 2.5 0 016.5 2H20v16H6.5a.5.5 0 000 1H20v3H6.5A2.5 2.5 0 014 19.5v-15zM8 6v2h8V6H8zm0 4v2h6v-2H8z"/></svg>`;

function bodyTemplate(units) {
  const presetOpts = PRESETS.map((p) => `<option value="${p.id}">${t('pr.' + p.id)}</option>`).join('');
  const gasOpts = Object.keys(GASES).map((k) => `<option value="${k}">${t('gas.' + k)}</option>`).join('');
  const bottleOpts = Object.keys(BOTTLE_TYPES).map((k) => `<option value="${k}">${t('bt.' + k)}</option>`).join('');
  const grp = (type) => BOTTLE_MODELS.filter((m) => m.type === type).map((m) => `<option value="${m.id}">${t('bm.' + m.id)}</option>`).join('');
  const modelOpts = `<option value="">${t('bm.custom')}</option><optgroup label="${t('bm.soda')}">${grp('soda')}</optgroup><optgroup label="${t('bm.still')}">${grp('still')}</optgroup>`;
  const langBtns = Object.keys(LANGS)
    .map((l) => `<button type="button" data-lang="${l}" aria-pressed="${l === getLang()}" title="${LANGS[l]}">${l.toUpperCase()}</button>`)
    .join('');
  return `
<div class="aqt" data-units="${units}" lang="${getLang() === 'es' ? 'es-MX' : 'en'}">
  <header class="aqt-top">
    <div class="aqt-brand">
      <span class="aqt-logo">${ICON_ROCKET}</span>
      <div><h2>AquaThrust</h2><p>${t('app.subtitle')}</p></div>
    </div>
    <div class="aqt-top-actions">
      <button type="button" class="aqt-btn aqt-learnbtn" data-id="learnBtn" aria-expanded="false">${ICON_BOOK}<span>${t('learnBtn')}</span></button>
      <label class="aqt-select"><span>${t('preset')}</span><select data-id="preset"><option value="">${t('custom')}</option>${presetOpts}</select></label>
      <div class="aqt-seg" role="group" aria-label="${t('units')}">
        <button type="button" data-units="metric" aria-pressed="${units === 'metric'}">${t('metric')}</button>
        <button type="button" data-units="imperial" aria-pressed="${units === 'imperial'}">${t('imperial')}</button>
      </div>
      <div class="aqt-seg aqt-lang" role="group" aria-label="${t('language')}">${langBtns}</div>
    </div>
  </header>

  <div class="aqt-main">
    <aside class="aqt-panel" aria-label="${t('tab.rocket')}">
      <div class="aqt-tabs" role="tablist">
        <button role="tab" type="button" data-tab="rocket" aria-selected="true"><span>1</span>${t('tab.rocket')}</button>
        <button role="tab" type="button" data-tab="launcher" aria-selected="false"><span>2</span>${t('tab.launcher')}</button>
        <button role="tab" type="button" data-tab="environment" aria-selected="false"><span>3</span>${t('tab.env')}</button>
      </div>
      <div class="aqt-tabpanels">
        <div role="tabpanel" data-panel="rocket">
          <label class="aqt-selectrow"><span>${t('bottleType')}</span><select data-id="bottleType">${bottleOpts}</select></label>
          <div class="aqt-rated" data-id="ratedRow" hidden>
            <label for="aqt-rated">${t('testedTo')}</label>
            <span class="aqt-num"><input type="number" id="aqt-rated" data-id="rated" min="1" max="200" step="1"><em>bar</em></span>
          </div>
          <p class="aqt-typenote" data-id="typeNote"></p>
          <label class="aqt-selectrow"><span>${t('bottleModel')}</span><select data-id="bottleModel">${modelOpts}</select></label>
          <p class="aqt-typenote" data-id="modelNote" hidden></p>
          <div data-fields="rocket"></div>
          <h5 class="aqt-subhead">${t('sec.nosefins')}</h5>
          <label class="aqt-selectrow"><span>${t('noseShape')}</span><select data-id="noseShape"><option value="ogive">${t('ns.ogive')}</option><option value="round">${t('ns.round')}</option><option value="blunt">${t('ns.blunt')}</option></select></label>
          <label class="aqt-selectrow"><span>${t('stab.fins')}</span><select data-id="finCount"><option value="3">3</option><option value="4">4</option></select></label>
          <div data-fields="stability"></div>
          <div class="aqt-stabmini" data-id="stabMini"></div>
          <h5 class="aqt-subhead">${t('sec.drag')}</h5>
          <label class="aqt-selectrow"><span>${t('cdMode')}</span><select data-id="cdMode"><option value="auto">${t('cd.auto')}</option><option value="custom">${t('cd.custom')}</option></select></label>
          <div class="aqt-cdcard" data-id="cdCard"></div>
          <div data-fields="drag"></div>
          <details class="aqt-adv">
            <summary>${t('adv.shape')}</summary>
            <div class="aqt-advintro">${t('adv.intro')}</div>
            <div class="aqt-profile" data-id="profile"></div>
            <div data-fields="rocketAdvanced"></div>
          </details>
        </div>
        <div role="tabpanel" data-panel="launcher" hidden>
          <label class="aqt-selectrow"><span>${t('gas')}</span><select data-id="gas">${gasOpts}</select></label>
          <div data-fields="launcher"></div>
          <div class="aqt-safety" data-id="safety" aria-live="polite"></div>
          <details class="aqt-adv"><summary>${t('adv.plumbing')}</summary><div data-fields="launcherAdvanced"></div></details>
        </div>
        <div role="tabpanel" data-panel="environment" hidden>
          <p class="aqt-note">${t('env.note')}</p>
          <div data-fields="environment"></div>
          <details class="aqt-adv"><summary>${t('adv.gravity')}</summary><div data-fields="environmentAdvanced"></div></details>
        </div>
      </div>
      <div hidden>

      </div>
      <div class="aqt-msgs" data-id="msgs" aria-live="polite"></div>
      <div class="aqt-panel-foot">
        <button type="button" class="aqt-btn" data-id="reset">${t('btn.reset')}</button>
      </div>
    </aside>

    <section class="aqt-stage" data-id="stage" tabindex="0" aria-label="${t('stage.aria')}">
      <div class="aqt-canvas" data-id="canvas"></div>
      <div class="aqt-hud">
        <div class="aqt-hud-tl">
          <div class="aqt-phase" data-id="phase"><i></i><span>${t('hud.ready')}</span></div>
          <div class="aqt-stats" data-id="stats" hidden>
            <div><span>${t('hud.time')}</span><b data-s="t">0.00 s</b></div>
            <div><span>${t('hud.alt')}</span><b data-s="h">0</b></div>
            <div><span>${t('hud.speed')}</span><b data-s="v">0</b></div>
            <div><span>${t('hud.accel')}</span><b data-s="a">0</b></div>
            <div><span>${t('hud.thrust')}</span><b data-s="F">0</b></div>
          </div>
          <div class="aqt-slowmo" data-id="slowmo" hidden></div>
        </div>
        <div class="aqt-hud-tr">
          <div class="aqt-predict" data-id="predict"><span>${t('hud.predicted')}</span><b>–</b><small></small></div>
        </div>
        <div class="aqt-altbar" data-id="altbar" hidden><div class="aqt-altbar-fill"></div><span></span></div>
        <div class="aqt-hud-bl">
          <div class="aqt-seg aqt-seg-sm" role="group" aria-label="${t('cam.label')}">
            <button type="button" data-view="chase" aria-pressed="true">${t('cam.chase')}</button>
            <button type="button" data-view="ground" aria-pressed="false">${t('cam.ground')}</button>
            <button type="button" data-view="free" aria-pressed="false">${t('cam.free')}</button>
          </div>
          <div class="aqt-seg aqt-seg-sm" role="group" aria-label="${t('speed.label')}">
            <button type="button" data-speed="auto" aria-pressed="true">${t('speed.auto')}</button>
            <button type="button" data-speed="0.1" aria-pressed="false">0.1×</button>
            <button type="button" data-speed="1" aria-pressed="false">1×</button>
          </div>
        </div>
        <div class="aqt-hud-br">
          <button type="button" class="aqt-icon" data-id="fullscreen" aria-label="${t('fullscreen')}" title="${t('fullscreen')}"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"/></svg></button>
        </div>
        <div class="aqt-launchbar">
          <button type="button" class="aqt-launch" data-id="launch">${ICON_ROCKET}<span>${t('btn.launch')}</span></button>
          <button type="button" class="aqt-btn aqt-btn-ghost" data-id="replay" hidden>${t('btn.replay')}</button>
          <button type="button" class="aqt-btn aqt-btn-ghost" data-id="back" hidden>${t('btn.back')}</button>
        </div>
        <div class="aqt-countdown" data-id="countdown" hidden></div>
        <div class="aqt-envchip" data-id="envchip"></div>
      </div>
    </section>
  </div>

  <section class="aqt-results" data-id="results" hidden aria-label="${t('res.title')}">
    <div class="aqt-results-head">
      <h3>${t('res.title')}</h3>
      <label class="aqt-check"><input type="checkbox" data-id="compare" checked> ${t('res.compare')}</label>
    </div>
    <div class="aqt-alert" data-id="alert" hidden></div>
    <div class="aqt-tiles" data-id="tiles"></div>
    <div class="aqt-timeline" data-id="timeline"></div>
    <div class="aqt-charts" data-id="charts"></div>
    <div class="aqt-optim">
      <div class="aqt-optim-text">
        <h4>${t('opt.h')}</h4>
        <p>${t('opt.p')}</p>
        <p class="aqt-optim-best" data-id="best"></p>
        <button type="button" class="aqt-btn" data-id="usebest">${t('opt.use')}</button>
      </div>
      <div class="aqt-optim-chart" data-id="sweep"></div>
    </div>
    <div class="aqt-data-actions">
      <button type="button" class="aqt-btn" data-id="table">${t('data.table')}</button>
      <button type="button" class="aqt-btn" data-id="csv">${t('data.csv')}</button>
      <button type="button" class="aqt-btn" data-id="learnBtn2">${ICON_BOOK}<span>${t('learnBtn')}</span></button>
    </div>
  </section>

  ${learnTemplate()}

  <section class="aqt-learn aqt-learn-float aqt-stabwin" data-id="stabWin" hidden aria-label="${t('stab.win')}">
    <div class="aqt-learn-head" data-id="stabHead">
      <h3><span class="aqt-grip" aria-hidden="true">⠿</span>${t('stab.win')}</h3>
      <div class="aqt-learn-tools"><button type="button" class="aqt-icon" data-id="stabClose" aria-label="${t('learn.close')}">✕</button></div>
    </div>
    <div class="aqt-learn-body">
      <p class="aqt-note">${t('stab.intro')}</p>
      <p class="aqt-typenote">${t('stab.where')}</p>
      <div class="aqt-stabcard" data-id="stabCard"></div>
      <label class="aqt-check aqt-stabshow"><input type="checkbox" data-id="showCG" checked> ${t('stab.show3d')}</label>
      <div class="aqt-stabtips" data-id="stabTips"></div>
      <button type="button" class="aqt-btn aqt-learnbtn" data-id="stabLearn">${ICON_BOOK}<span>${t('stab.learn')}</span></button>
    </div>
  </section>

  <dialog class="aqt-dialog" data-id="dialog">
    <div class="aqt-dialog-head"><h3>${t('data.title')}</h3><button type="button" class="aqt-icon" data-id="closeDialog" aria-label="${t('close')}">✕</button></div>
    <div class="aqt-table-wrap" data-id="tableWrap"></div>
  </dialog>

  <div class="aqt-toast" data-id="toast" hidden></div>

  <footer class="aqt-foot">
    <span>AquaThrust v${VERSION}</span>
    <span>${t('foot.safety')}</span>
  </footer>
</div>`;
}

function profileSVG(b, P) {
  const pts = b.outline(1.2);
  const H = b.totalHeight;
  const R = P.diaBot / 2;
  const sc = 200 / Math.max(H, R * 2.4);
  const w = 2 * R * sc + 60;
  const h = H * sc + 30;
  const cx = w / 2;
  const toY = (z) => h - 15 - z * sc;
  const side = (s) => pts.map(([r, z]) => `${cx + s * r * sc},${toY(z)}`);
  const outline = [...side(1), ...side(-1).reverse()].join(' ');
  const hw = b.zWat;
  const wp = b.liquidOutline(hw, 1).filter(([, z]) => z <= hw + 1e-9);
  const wside = (s) => wp.map(([r, z]) => `${cx + s * r * sc},${toY(Math.min(z, hw))}`);
  const water = [...wside(1), ...wside(-1).reverse()].join(' ');
  let tube = '';
  if (P.ltLength > 0 && P.ltDia > 0) {
    const tr = (P.ltDia / 2) * sc;
    tube = `<rect x="${cx - tr}" y="${toY(Math.min(P.ltLength, H))}" width="${2 * tr}" height="${Math.min(P.ltLength, H) * sc}" fill="rgba(142,153,166,0.6)" stroke="#8e99a6"/>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" style="max-height:220px">
    <polygon points="${water}" fill="rgba(51,140,237,0.55)"/>${tube}
    <polygon points="${outline}" fill="none" stroke="#cfe3ff" stroke-width="1.5"/>
    <line x1="${cx - R * sc}" x2="${cx + R * sc}" y1="${toY(b.shoulderTop)}" y2="${toY(b.shoulderTop)}" stroke="rgba(255,255,255,0.18)" stroke-dasharray="3 3"/>
    <text x="${cx}" y="${toY(hw) - 5}" text-anchor="middle" fill="#9fd0ff" font-size="11">${t('prof.water', { v: num(P.volWat * 1000, 2) })}</text>
    <text x="${cx}" y="${h - 2}" text-anchor="middle" fill="#9aa7b6" font-size="10">${t('prof.nozzle', { d: num(P.diaNoz * 1000, 1) })}</text>
    <text x="${cx}" y="${toY(H) + 14}" text-anchor="middle" fill="#9aa7b6" font-size="10">${t('prof.size', { D: num(P.diaBot * 1000, 0), h: num(b.totalHeight * 100, 0) })}</text>
  </svg>`;
}

/* --------------------------------------------------------------------------- */

class App {
  constructor(root, host, opts) {
    this.root = root;
    this.host = host;
    this.opts = opts;
    this.$ = (id) => this.root.querySelector(`[data-id="${id}"]`);
    this.units = 'metric';
    this.mode = 'design';
    this.view = 'chase';
    this.speedSetting = 'auto';
    this.activeTab = 'rocket';
    this.learn = { open: false, mode: 'float', tab: 'simple', x: null, y: null };
    this.P = { ...BASE };
    this.result = null;
    this.prev = null;
    this.flight = null;
    this.charts = {};

    const fromHash = this.readHash();
    if (fromHash) this.P = { ...this.P, ...fromHash };
    else if (opts.preset) {
      const pr = PRESETS.find((p) => p.id === opts.preset);
      if (pr) this.P = { ...pr.params };
    }
    this.P = withGas(this.P, this.P.gas || 'air');

    this.initScene();
    this.initUI(true);
    this.world.start();
  }

  /** Build (or rebuild after a language change) everything that is DOM / text. */
  initUI(first = false) {
    this.learnEl = this.$('learn');
    this.charts = {};
    this.chartsBuilt = false;
    this.sweepChart = null;
    this.initControls(first);
    this.bindUI();
    this.applyLearn();
    this.paramsChanged(first);
    if (!first && this.lastLaunched) this.showResults();
  }

  /** Switch language: re-render the interface, keep the 3D scene and all state. */
  switchLang(lang) {
    if (lang === getLang()) return;
    if (this.mode !== 'design') this.backToPad();
    setLang(lang);
    rememberLang(lang);
    const canvas = this.world.renderer.domElement;
    const popped = this.learn.mode === 'popup' && this.popup && !this.popup.closed;
    const oldLearn = this.learnEl;
    for (const c of Object.values(this.charts)) c.chart.dispose();
    this.sweepChart?.dispose();
    const tmp = document.createElement('div');
    tmp.innerHTML = bodyTemplate(this.units);
    const fresh = tmp.firstElementChild;
    this.root.querySelector('.aqt').replaceWith(fresh);
    if (this.opts.height) fresh.style.setProperty('--aqt-stage-h', this.opts.height);
    const host = this.$('canvas');
    host.appendChild(canvas);
    this.world.setContainer(host);
    this.initUI(false);
    if (popped) {
      oldLearn.replaceWith(this.learnEl);
      this.popup.document.title = t('learn.title');
      this.applyLearn();
    } else oldLearn.remove?.();
  }

  /* ------------------------------------------------------------- scene */
  initScene() {
    const canvasHost = this.$('canvas');
    this.world = new World(canvasHost);
    this.rocket = new RocketModel();
    this.world.scene.add(this.rocket.group);
    this.launcher = new Launcher();
    this.world.scene.add(this.launcher.group);
    this.jet = new WaterJet();
    this.world.scene.add(this.jet.points);
    this.puffs = new Puffs();
    this.world.scene.add(this.puffs.group);
    this.ruler = new THREE.Group();
    this.world.scene.add(this.ruler);
    this.rocket.group.traverse((o) => (o.castShadow = true));
    const ringTex = document.createElement('canvas');
    ringTex.width = ringTex.height = 128;
    const rg = ringTex.getContext('2d');
    rg.strokeStyle = 'rgba(255,209,102,0.95)';
    rg.lineWidth = 9;
    rg.beginPath();
    rg.arc(64, 64, 50, 0, Math.PI * 2);
    rg.stroke();
    const tex = new THREE.CanvasTexture(ringTex);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, sizeAttenuation: false, depthTest: false, transparent: true, fog: false }));
    this.beacon.scale.set(0.05, 0.05, 1);
    this.beacon.renderOrder = 10;
    this.beacon.visible = false;
    this.world.scene.add(this.beacon);
    this.world.onFrame((dt) => this.frame(dt));
    this.camGoal = null;
  }

  rebuildRocket() {
    const P = this.P;
    let b;
    try {
      b = new BottleProfile(P);
    } catch {
      return;
    }
    if (!(b.totalHeight > 0) || P.diaNoz >= P.diaBot) return;
    this.bottle = b;
    this.rocket.build(P, b);
    this.cg = Math.max(0.05, this.rocket.top * 0.5);
    this.placeRocket(0, 0);
    this.launcher.update(P);
    this.jet.setColor(this.rocket.mats.water.color);
    this.$('profile').innerHTML = profileSVG(b, P);
    this.stabRep = stabilityReport(P);
    this.updateMarkers();
    if (this.mode === 'design' && this.activeTab !== 'environment') this.frameDesign();
  }

  placeRocket(h, flip) {
    const r = this.rocket;
    r.body.position.y = -this.cg;
    r.body.rotation.z = flip * Math.PI;
    const yc = h + (1 - flip) * (SEAT_HEIGHT + this.cg) + flip * (r.top - this.cg);
    r.group.position.set(0, yc, 0);
    r.group.rotation.x = Math.sin(flip * Math.PI) * 0.15;
  }

  frameDesign(immediate = false) {
    const top = SEAT_HEIGHT + (this.rocket.top || 0.4);
    const target = new THREE.Vector3(0, top * 0.52, 0);
    const dist = Math.max(1.7, top * 2.3);
    const dir = new THREE.Vector3(0.62, 0.28, 1).normalize();
    this.camGoal = { target, pos: target.clone().addScaledVector(dir, dist), immediate };
  }

  /* ---------------------------------------------------------- controls */
  initControls(first) {
    const get = () => this.P;
    const set = (k, v) => {
      this.P[k] = v;
      if (['diaBot', 'volBot', 'diaNoz'].includes(k) && this.P.bottleModel) {
        this.P.bottleModel = '';
        this.$('bottleModel').value = '';
      }
      // a launch tube needs both a length and a diameter: fill in the missing one
      if (k === 'ltLength' && v > 0 && !(this.P.ltDia > 0)) {
        this.P.ltDia = Math.max(0.004, Math.round(this.P.diaNoz * 0.82 * 2000) / 2000);
        this.refreshControls();
        this.toast(t('toast.tubeDia', { d: num(this.P.ltDia * 1000, 1) }));
      }
      if (k === 'ltDia' && v > 0 && !(this.P.ltLength > 0)) {
        this.P.ltLength = 0.2;
        this.refreshControls();
      }
      this.$('preset').value = '';
      this.paramsChanged();
    };
    const alts = {
      volWat: (v, P) => t('alt.full', { p: Math.round((P.volWat / P.volBot) * 100) }),
      pressAtm: (v) => t('alt.asl', { m: num(Math.max(0, pressureToAltitude(v * 100)), 0) }),
      humidity: (v) => t('hum.' + (v < 25 ? 0 : v < 50 ? 1 : v < 75 ? 2 : v < 95 ? 3 : 4)),
      gravity: (v) => t('alt.lat', { d: num(gravityToLatitude(v), 0) }),
      liquidDensity: (v) => liquidName(v * 1000),
      massBot: (v, P) => t('alt.liftoff', { g: num((P.massBot + (P.noseMass || 0) + bodyExtMass(P) + P.volWat * P.liquidDensity) * 1000, 0) }),
      bodyExt: (v, P) => t('alt.bodyExt', { g: num(bodyExtMass(P) * 1000, 0) }),
      finSpan: (v, P) => t('alt.finSpan', { mm: num(P.diaBot * v * 1000, 0) }),
      noseMass: (v, P) => t('alt.noseMass', { g: num((P.massBot + (P.noseMass || 0) + bodyExtMass(P)) * 1000, 0) }),
      CDrag: (v) => t('cd.' + (v < 0.35 ? 0 : v < 0.6 ? 1 : v < 0.9 ? 2 : 3)),
      ltLength: (v) => (v <= 0 ? t('alt.noTube') : ''),
      volBot: () => (this.bottle ? t('alt.tall', { c: num(this.bottle.totalHeight * 100, 0) }) : ''),
    };
    this.groups = [];
    for (const key of Object.keys(FIELDS)) {
      const host = this.root.querySelector(`[data-fields="${key}"]`);
      this.groups.push(new FieldGroup(host, FIELDS[key], get, set, alts));
    }
    this.$('gas').value = this.P.gas || 'air';
    this.$('bottleType').value = this.P.bottleType || 'soda';
    this.$('rated').value = this.P.ratedPressure;
    this.$('finCount').value = String(this.P.finCount || 4);
    this.$('bottleModel').value = this.P.bottleModel || '';
    this.$('noseShape').value = this.P.noseShape || 'round';
    this.$('cdMode').value = this.P.cdMode || 'custom';
    if (first) this.presetValue = this.readHash() ? '' : this.opts.preset || 'classic';
    this.$('preset').value = this.presetValue ?? '';
  }

  refreshControls() {
    for (const g of this.groups) g.refresh();
    this.$('noseShape').value = this.P.noseShape || 'round';
    this.$('cdMode').value = this.P.cdMode || 'custom';
    this.$('bottleModel').value = this.P.bottleModel || '';
    this.$('finCount').value = String(this.P.finCount || 4);
    this.$('gas').value = this.P.gas || 'air';
    this.$('bottleType').value = this.P.bottleType || 'soda';
    this.$('rated').value = this.P.ratedPressure;
  }

  /* ---------------------------------------------------------------- UI */
  bindUI() {
    const R = this.root;
    R.querySelectorAll('.aqt-tabs [role=tab]').forEach((tab) =>
      tab.addEventListener('click', () => {
        R.querySelectorAll('.aqt-tabs [role=tab]').forEach((x) => x.setAttribute('aria-selected', String(x === tab)));
        R.querySelectorAll('[role=tabpanel]').forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
        const was = this.activeTab;
        this.activeTab = tab.dataset.tab;
        this.updateMarkers();
        if (this.mode !== 'design') return;
        if (tab.dataset.tab === 'environment') this.lookAtLandscape();
        else if (was === 'environment') this.frameDesign();
      }),
    );
    this.$('preset').addEventListener('change', (e) => {
      this.presetValue = e.target.value;
      const pr = PRESETS.find((p) => p.id === e.target.value);
      if (!pr) return;
      this.P = withGas({ ...pr.params }, pr.params.gas || 'air');
      this.refreshControls();
      this.paramsChanged();
      this.toast(t('prb.' + pr.id));
    });
    this.$('bottleType').addEventListener('change', (e) => {
      this.P.bottleType = e.target.value;
      this.clearPreset();
      this.paramsChanged();
    });
    this.$('noseShape').addEventListener('change', (e) => {
      this.P.noseShape = e.target.value;
      this.clearPreset();
      this.paramsChanged();
    });
    this.$('cdMode').addEventListener('change', (e) => {
      this.P.cdMode = e.target.value;
      this.clearPreset();
      this.paramsChanged();
    });
    this.$('bottleModel').addEventListener('change', (e) => {
      const m = BOTTLE_MODELS.find((x) => x.id === e.target.value);
      this.P.bottleModel = m ? m.id : '';
      if (m) {
        Object.assign(this.P, {
          bottleType: m.type,
          volBot: m.vol,
          diaBot: m.dia,
          diaNoz: m.noz,
          massBot: Math.round((m.mass + ROCKET_EXTRAS) * 1000) / 1000,
          volWat: Math.round((m.vol / 3) * 1e5) / 1e5,
        });
        if (this.P.ltDia > m.noz) this.P.ltDia = Math.round(m.noz * 0.82 * 2000) / 2000;
        this.refreshControls();
      }
      this.clearPreset();
      this.paramsChanged();
    });
    this.$('rated').addEventListener('change', (e) => {
      const v = Math.min(200, Math.max(1, Number(e.target.value) || 10));
      e.target.value = v;
      this.P.ratedPressure = v;
      this.paramsChanged();
    });
    this.$('gas').addEventListener('change', (e) => {
      this.P = withGas(this.P, e.target.value);
      this.clearPreset();
      this.paramsChanged();
    });
    R.querySelectorAll('button[data-units]').forEach((b) =>
      b.addEventListener('click', () => {
        this.units = b.dataset.units;
        R.querySelectorAll('button[data-units]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        R.querySelector('.aqt').dataset.units = this.units;
        this.updateEnvChip();
        this.updatePrediction();
        if (this.lastLaunched && !this.$('results').hidden) this.showResults();
        if (this.flight) this.buildRuler(this.flight.res);
      }),
    );
    R.querySelectorAll('button[data-lang]').forEach((b) => b.addEventListener('click', () => this.switchLang(b.dataset.lang)));
    R.querySelectorAll('[data-view]').forEach((b) =>
      b.addEventListener('click', () => {
        this.view = b.dataset.view;
        R.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      }),
    );
    R.querySelectorAll('[data-speed]').forEach((b) =>
      b.addEventListener('click', () => {
        this.speedSetting = b.dataset.speed;
        R.querySelectorAll('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      }),
    );
    this.$('launch').addEventListener('click', () => this.launch());
    this.$('replay').addEventListener('click', () => this.launch(true));
    this.$('back').addEventListener('click', () => this.backToPad());
    this.$('reset').addEventListener('click', () => {
      this.P = withGas({ ...BASE }, 'air');
      this.presetValue = 'classic';
      this.$('preset').value = 'classic';
      this.refreshControls();
      this.paramsChanged();
    });
    this.$('finCount').addEventListener('change', (e) => {
      this.P.finCount = Number(e.target.value);
      this.clearPreset();
      this.paramsChanged();
    });
    this.$('showCG').addEventListener('change', () => this.updateMarkers());
    this.$('stabMini').addEventListener('click', (e) => {
      if (e.target.closest('[data-goto]')) this.openStabWin(true);
    });
    this.$('stabClose').addEventListener('click', () => this.openStabWin(false));
    this.makeDraggable(this.$('stabWin'), this.$('stabHead'));
    this.setupFinTemplate();
    this.$('stabLearn').addEventListener('click', () => {
      this.learn.tab = 'stability';
      this.applyLearnTab();
      this.toggleLearn(true);
    });
    this.$('stabTips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-apply]');
      if (!b) return;
      if (b.dataset.apply === 'ballast') this.P.noseMass = Number(b.dataset.v);
      if (b.dataset.apply === 'fins') this.P.finSpan = Number(b.dataset.v);
      if (b.dataset.apply === 'ext') this.P.bodyExt = Number(b.dataset.v);
      this.clearPreset();
      this.refreshControls();
      this.paramsChanged();
    });
    this.$('fullscreen').addEventListener('click', () => {
      const st = this.$('stage');
      if (document.fullscreenElement) document.exitFullscreen();
      else st.requestFullscreen?.();
    });
    this.$('compare').addEventListener('change', () => this.showResults());
    this.$('usebest').addEventListener('click', () => {
      if (!this.best) return;
      this.P.volWat = Math.round(this.best.water * 1e5) / 1e5;
      this.clearPreset();
      this.refreshControls();
      this.paramsChanged();
      this.toast(t('toast.best'));
    });
    this.$('table').addEventListener('click', () => this.openTable());
    this.$('closeDialog').addEventListener('click', () => this.$('dialog').close());
    this.$('csv').addEventListener('click', () => this.downloadCSV());
    this.$('learnBtn').addEventListener('click', () => this.toggleLearn());
    this.$('learnBtn2').addEventListener('click', () => this.toggleLearn(true));
    this.$('stage').addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.mode === 'design') {
        e.preventDefault();
        this.launch();
      }
    });
    this.bindLearnPanel();
  }

  clearPreset() {
    this.presetValue = '';
    this.$('preset').value = '';
  }

  toast(msg) {
    const el = this.$('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (el.hidden = true), 3600);
  }

  /** Translate an engine message { k, v }. */
  msg(m) {
    if (typeof m === 'string') return m;
    const vars = { ...(m.v || {}) };
    if (vars.bt) vars.b = t('bts.' + vars.bt);
    return t(m.k, vars);
  }

  /* ------------------------------------------------- learn (detachable) */
  bindLearnPanel() {
    const el = this.learnEl;
    const q = (id) => el.querySelector(`[data-id="${id}"]`);
    el.querySelectorAll('[data-learn]').forEach((b) =>
      b.addEventListener('click', () => {
        this.learn.tab = b.dataset.learn;
        this.applyLearnTab();
      }),
    );
    q('learnFloat').addEventListener('click', () => this.setLearnMode('float'));
    q('learnDock').addEventListener('click', () => this.setLearnMode('dock'));
    q('learnPop').addEventListener('click', () => this.setLearnMode('popup'));
    q('learnClose').addEventListener('click', () => this.toggleLearn(false));
    // drag (floating mode)
    const head = q('learnHead');
    head.addEventListener('pointerdown', (e) => {
      if (this.learn.mode !== 'float' || e.target.closest('button')) return;
      const r = el.getBoundingClientRect();
      const ox = e.clientX - r.left;
      const oy = e.clientY - r.top;
      head.setPointerCapture(e.pointerId);
      const move = (ev) => {
        this.learn.x = clamp(ev.clientX - ox, -r.width + 80, window.innerWidth - 80);
        this.learn.y = clamp(ev.clientY - oy, 0, window.innerHeight - 40);
        el.style.left = `${this.learn.x}px`;
        el.style.top = `${this.learn.y}px`;
      };
      const up = () => {
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
    });
    this.applyLearnTab();
  }

  applyLearnTab() {
    const el = this.learnEl;
    el.querySelectorAll('[data-learn]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.learn === this.learn.tab)));
    el.querySelectorAll('[data-learnpanel]').forEach((p) => (p.hidden = p.dataset.learnpanel !== this.learn.tab));
  }

  toggleLearn(force) {
    const open = force ?? !this.learn.open;
    if (!open && this.learn.mode === 'popup') this.closePopup();
    this.learn.open = open;
    if (open && this.learn.mode === 'popup' && !(this.popup && !this.popup.closed)) this.learn.mode = 'float';
    this.applyLearn();
    if (open && this.learn.mode === 'dock') this.learnEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  setLearnMode(mode) {
    if (mode === 'popup') {
      if (this.openPopup()) {
        this.learn.mode = 'popup';
        this.learn.open = true;
      } else {
        this.learn.mode = 'float';
      }
    } else {
      if (this.learn.mode === 'popup') this.closePopup();
      this.learn.mode = mode;
      this.learn.open = true;
    }
    this.applyLearn();
    if (this.learn.mode === 'dock') this.learnEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  applyLearn() {
    const el = this.learnEl;
    const L = this.learn;
    const inPopup = L.mode === 'popup' && this.popup && !this.popup.closed;
    el.hidden = !L.open && !inPopup;
    el.classList.toggle('aqt-learn-float', L.mode === 'float');
    el.classList.toggle('aqt-learn-dock', L.mode === 'dock');
    el.classList.toggle('aqt-learn-popup', !!inPopup);
    if (L.mode === 'float') {
      const w = Math.min(980, window.innerWidth - 24);
      if (L.x == null) {
        L.x = Math.max(12, window.innerWidth - w - 24);
        L.y = 70;
      }
      el.style.left = `${L.x}px`;
      el.style.top = `${L.y}px`;
      el.style.width = el.style.width || `${w}px`;
    } else {
      el.style.left = el.style.top = el.style.width = el.style.height = '';
    }
    const btn = this.$('learnBtn');
    if (btn) btn.setAttribute('aria-expanded', String(L.open || inPopup));
    if (L.open || inPopup) fillLearn(el, this.P, this.result);
  }

  openPopup() {
    if (this.popup && !this.popup.closed) {
      this.popup.focus();
      return true;
    }
    const w = window.open('', 'aquathrust-learn', 'width=1000,height=860,resizable=yes,scrollbars=yes');
    if (!w) {
      this.toast(t('toast.popup'));
      return false;
    }
    const cssHref = new URL('../css/aquathrust.css?v=1.7.1', import.meta.url).href;
    w.document.open();
    w.document.write(`<!DOCTYPE html><html lang="${getLang()}"><head><meta charset="utf-8"><title>${t('learn.title')}</title><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${cssHref}"><style>html,body{margin:0;background:#0b1220}.aqt{border-radius:0;border:0;min-height:100vh}</style></head><body><div class="aqt" data-id="popwrap"></div></body></html>`);
    w.document.close();
    const wrap = w.document.querySelector('[data-id="popwrap"]');
    wrap.appendChild(this.learnEl);
    this.popup = w;
    // the visitor closed the pop-up window: bring the panel home
    const restore = () => {
      if (this.popup !== w) return;
      clearInterval(this.popTimer);
      this.popup = null;
      this.returnLearn();
      this.learn.mode = 'float';
      this.learn.open = false;
      this.applyLearn();
    };
    w.addEventListener('pagehide', restore);
    clearInterval(this.popTimer);
    this.popTimer = setInterval(() => {
      if (w.closed) restore();
    }, 800);
    return true;
  }

  /** Put the learn panel back inside the simulator. */
  returnLearn() {
    if (!this.root.contains(this.learnEl)) this.root.querySelector('.aqt-dialog').before(this.learnEl);
  }

  /** App-initiated: close the pop-up window and bring the panel back. */
  closePopup() {
    clearInterval(this.popTimer);
    const w = this.popup;
    this.popup = null;
    this.returnLearn();
    if (w && !w.closed) {
      try {
        w.close();
      } catch {
        /* ignore */
      }
    }
  }

  /* ------------------------------------------------------- parameters */
  paramsChanged(first = false) {
    if (this.mode === 'landed') this.backToPad();
    this.applyAutoCd();
    this.updateFinTemplate();
    const P = this.P;
    const { errors, warnings, dangers } = checkParameters(P);
    if (!errors.length) {
      const st = stabilityReport(P);
      if (st && st.empty.margin < 0) warnings.unshift({ k: 'warn.unstable', v: { m: num(st.empty.margin, 2) } });
    }
    this.errors = errors;
    this.dangers = dangers;
    this.$('msgs').innerHTML =
      errors.map((e) => `<p class="aqt-msg aqt-err"><b>${t('msg.cant')}</b> ${this.msg(e)}</p>`).join('') +
      dangers.map((e) => `<p class="aqt-msg aqt-danger"><b>⛔ ${t('msg.danger')}</b> ${this.msg(e)}</p>`).join('') +
      warnings.map((w) => `<p class="aqt-msg aqt-warn"><b>${t('msg.careful')}</b> ${this.msg(w)}</p>`).join('');
    this.$('safety').innerHTML = safetyBarHTML(P);
    this.$('typeNote').textContent = t('btn.' + (P.bottleType || 'soda'));
    this.$('ratedRow').hidden = P.bottleType !== 'tested';
    const bm = BOTTLE_MODELS.find((x) => x.id === P.bottleModel);
    const mn = this.$('modelNote');
    mn.hidden = !bm;
    if (bm) mn.textContent = t('bm.note', { d: num(bm.dia * 1000, 0), v: num(bm.vol * 1000, 2), n: num(bm.noz * 1000, 1), m: num(bm.mass * 1000, 0) });
    if (!this.rebuildQueued && this.mode === 'design') this.launcher.update(P);
    const bad = [];
    if (P.diaNoz >= P.diaBot) bad.push('diaNoz', 'diaBot');
    if (P.volWat >= P.volBot) bad.push('volWat', 'volBot');
    for (const g of this.groups) {
      g.setInvalid(bad);
      g.refreshAlts();
    }
    this.$('launch').disabled = errors.length > 0;

    this.world.setEnvironment(P, first);
    this.updateEnvChip();
    if (!errors.length && this.mode === 'design' && !this.rebuildQueued) {
      this.rebuildQueued = true;
      requestAnimationFrame(() => {
        this.rebuildQueued = false;
        this.rebuildRocket();
        if (first) this.frameDesign(true);
      });
    }
    this.rocket.setLiquid(P.liquidDensity);
    this.dirty = true;
    clearTimeout(this.predTimer);
    this.predTimer = setTimeout(() => this.updatePrediction(), first ? 0 : 70);
  }

  updateEnvChip() {
    const P = this.P;
    const T = P.aTemperature - 273.15;
    const alt = Math.max(0, pressureToAltitude(P.pressAtm));
    const season = t('season.' + (T < 2 ? 0 : T < 10 ? 1 : T < 26 ? 2 : T < 36 ? 3 : 4));
    const tStr = this.units === 'imperial' ? `${num(T * 1.8 + 32, 0)} °F` : `${num(T, 0)} °C`;
    const aStr = this.units === 'imperial' ? `${num(alt * 3.28084, 0)} ft` : `${num(alt, 0)} m`;
    this.$('envchip').innerHTML = `<span>${season} · ${tStr}</span><span>${t('env.hum')} ${num(P.humidity * 100, 0)}%</span><span>${t('env.alt')} ${aStr}</span>`;
  }

  updatePrediction() {
    const el = this.$('predict');
    if (this.errors && this.errors.length) {
      el.querySelector('b').textContent = '–';
      el.querySelector('small').textContent = t('hud.fixFirst');
      return;
    }
    const r = simulate(this.P, { boostSamples: 900 });
    this.result = r;
    this.dirty = false;
    if (this.learn.open || this.learn.mode === 'popup') fillLearn(this.learnEl, this.P, r);
    this.updateStability(r);
    el.querySelector('b').textContent = r.noLiftoff ? t('hud.noLift') : fmtU(this.units, 'alt', r.summary.apogeeAltitude);
    el.querySelector('small').textContent = r.noLiftoff
      ? t('hud.tooHeavy')
      : t('hud.predSub', { v: fmtU(this.units, 'speed', r.summary.maxVelocity), t: num(r.summary.impactTime, 1) });
    el.classList.remove('aqt-pulse');
    void el.offsetWidth;
    el.classList.add('aqt-pulse');
  }

  /* ----------------------------------------------------------- launch */
  launch(replay = false) {
    if (this.errors && this.errors.length) return;
    if (this.mode === 'countdown') {
      this.startFlight();
      return;
    }
    if (!replay && (this.dirty || !this.result)) this.updatePrediction();
    if (!replay || !this.flight) {
      if (this.lastLaunched && this.lastLaunched !== this.result) this.prev = this.lastLaunched;
      this.lastLaunched = this.result;
    }
    if (this.mode !== 'design') this.resetFlightVisuals();
    this.rebuildRocket();
    this.mode = 'countdown';
    this.countdown = 2.4;
    this.$('countdown').hidden = false;
    this.$('launch').hidden = true;
    this.$('replay').hidden = true;
    this.$('back').hidden = true;
    this.lockPanel(true);
    this.showResults();
  }

  startFlight() {
    const res = this.lastLaunched;
    this.mode = 'flight';
    this.$('countdown').hidden = true;
    this.flight = {
      res,
      t: 0,
      speed: 0.03,
      idx: 0,
      flip: 0,
      peakF: Math.max(1e-6, res.summary.peakThrust),
      cond: res.events.condensation,
      fog: 0,
    };
    this.$('stats').hidden = false;
    this.$('altbar').hidden = false;
    this.buildRuler(res);
    this.launcher.setPressure(0);
    this.updateMarkers();
    if (this.view !== 'free') this.camGoal = null;
  }

  backToPad() {
    this.resetFlightVisuals();
    this.mode = 'design';
    this.flight = null;
    this.$('launch').hidden = false;
    this.$('replay').hidden = true;
    this.$('back').hidden = true;
    this.$('stats').hidden = true;
    this.$('altbar').hidden = true;
    this.$('slowmo').hidden = true;
    this.$('countdown').hidden = true;
    this.setPhase(-1);
    this.lockPanel(false);
    this.rebuildRocket();
    this.launcher.setPressure(this.P.gPressure);
    this.frameDesign();
  }

  resetFlightVisuals() {
    this.jet.clear();
    this.puffs.clear();
    this.rocket.setFog(0);
    disposeObject(this.ruler);
    this.ruler.clear();
  }

  lockPanel(lock) {
    this.root.querySelector('.aqt-panel').classList.toggle('aqt-locked', lock);
  }

  setPhase(ph, label) {
    const el = this.$('phase');
    el.className = 'aqt-phase' + (ph >= 0 ? ' aqt-ph-' + PHASE_CLASS[ph] : '');
    el.querySelector('span').textContent = label || (ph >= 0 ? t('phase.' + ph) : t('hud.ready'));
  }

  buildRuler(res) {
    disposeObject(this.ruler);
    this.ruler.clear();
    const apo = Math.max(1, res.summary.apogeeAltitude);
    const f = UNITS[this.units].alt.f;
    const u = UNITS[this.units].alt.u;
    const raw = (apo * f) / 6;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const stepU = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) || p * 10;
    const step = stepU / f;
    const top = Math.ceil(apo / step) * step;
    const x = Math.max(1.4, apo * 0.06);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, fog: false });
    this.ruler.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, top, 0)]), lineMat));
    const tick = [];
    for (let h = step; h <= top + 1e-6; h += step) {
      tick.push(new THREE.Vector3(x - step * 0.05, h, 0), new THREE.Vector3(x + step * 0.05, h, 0));
      const s = textSprite(`${num(h * f, 0)} ${u}`, { height: Math.max(0.12, step * 0.13), bg: 'rgba(10,20,35,0.55)' });
      s.position.set(x + step * 0.28 + 0.1, h, 0);
      this.ruler.add(s);
    }
    this.ruler.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tick), lineMat));
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.6, apo * 0.04), Math.max(0.01, apo * 0.0015), 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85, fog: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = apo + SEAT_HEIGHT;
    this.ruler.add(ring);
    const lbl = textSprite(t('ruler.apogee', { x: fmtU(this.units, 'alt', apo) }), { height: Math.max(0.16, step * 0.16), color: '#ffd166' });
    lbl.position.set(-Math.max(0.6, apo * 0.04) - step * 0.5, apo + SEAT_HEIGHT, 0);
    this.ruler.add(lbl);
    this.apoRing = ring;
  }

  /* ------------------------------------------------------- per frame */
  frame(dt) {
    this.launcher.tick(dt);
    this.puffs.update(dt);
    if (this.mode === 'countdown') {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown / 0.8);
      const el = this.$('countdown');
      const txt = n > 0 ? String(n) : t('liftoff');
      if (el.textContent !== txt) {
        el.textContent = txt;
        el.classList.remove('aqt-pop');
        void el.offsetWidth;
        el.classList.add('aqt-pop');
      }
      if (this.countdown <= 0) this.startFlight();
      this.jet.update(dt);
    } else if (this.mode === 'flight' || this.mode === 'landed') {
      this.stepFlight(dt);
    } else {
      this.jet.update(dt);
    }
    this.updateCamera(dt);
    const rp = this.rocket.group.position;
    this.world.focusShadow(0, Math.min(rp.y * 0.5, 2), 0);
    const far = this.world.camera.position.distanceTo(rp);
    this.beacon.position.copy(rp);
    this.beacon.visible = this.mode !== 'design' && far > 14;
    this.beacon.material.opacity = clamp((far - 14) / 10, 0, 1);
    this.jet.setViewport(this.world.renderer.domElement.height, this.world.camera.fov);
  }

  sample(res, time) {
    const s = res.series;
    const n = s.t.length;
    let i = this.flight.idx;
    if (i >= n - 1 || s.t[i] > time) i = 0;
    while (i < n - 2 && s.t[i + 1] <= time) i++;
    this.flight.idx = i;
    const t0 = s.t[i];
    const t1 = s.t[Math.min(i + 1, n - 1)];
    const k = t1 > t0 ? clamp((time - t0) / (t1 - t0), 0, 1) : 0;
    const L = (a) => a[i] + (a[Math.min(i + 1, n - 1)] - a[i]) * k;
    return { h: L(s.h), v: L(s.v), a: L(s.a), F: L(s.F), p: L(s.p), w: L(s.w), ph: s.ph[i] };
  }

  stepFlight(dt) {
    const f = this.flight;
    const res = f.res;
    const S = res.summary;
    const tEnd = S.impactTime;
    if (this.speedSetting === 'auto') {
      const target = f.t < S.burnoutTime + 0.01 ? clamp(S.burnoutTime / 2.8, 0.012, 0.08) : 1;
      f.speed += (target - f.speed) * (1 - Math.exp(-dt * (target > f.speed ? 1.2 : 8)));
    } else {
      f.speed = Number(this.speedSetting);
    }
    const slow = f.speed < 0.5 && this.mode === 'flight';
    const sm = this.$('slowmo');
    sm.hidden = !slow;
    if (slow) sm.textContent = t('hud.slowmo', { x: f.speed < 0.1 ? f.speed.toFixed(2) : f.speed.toFixed(1) });

    const simDt = this.mode === 'flight' ? dt * f.speed : 0;
    if (this.mode === 'flight') f.t = Math.min(tEnd, f.t + simDt);
    const st = this.sample(res, f.t);
    const ph = st.ph;

    const apoT = S.apogeeTime;
    const flipDur = Math.max(0.4, Math.min(1.4, (tEnd - apoT) * 0.3));
    f.flip = res.noLiftoff ? 0 : smoothstep(apoT, apoT + flipDur, f.t);
    this.placeRocket(st.h, f.flip);

    if (ph <= PHASE_WATER) this.rocket.setWaterVolume(st.w);
    else this.rocket.setWaterVolume(ph === PHASE_COAST ? st.w : 0);
    if (this.rocket.markers.visible && this.stabRep) {
      const cm = centerOfMass(this.P, this.stabRep.bottle, ph <= PHASE_WATER ? st.w : 0, this.stabRep.g);
      this.rocket.cmMark.position.y = cm.z;
      this.rocket.cmLabel.position.y = cm.z;
    }
    if (ph === PHASE_TUBE) this.launcher.setPressure(st.p / 1e5);

    const nozzle = new THREE.Vector3();
    this.rocket.body.localToWorld(nozzle.set(0, 0, 0));
    if (this.mode === 'flight') {
      if (ph === PHASE_WATER && st.F > 0) {
        const ue = Math.sqrt(Math.max(0, (2 * st.p) / this.P.liquidDensity));
        const count = Math.min(90, Math.round((st.F / f.peakF) * 26000 * simDt + Math.random()));
        this.jet.emit(count, nozzle, st.v, Math.max(ue, 2), 0.045, clamp(this.P.diaNoz * 1.3, 0.018, 0.12));
      }
      if (ph === PHASE_GAS || (ph === PHASE_WATER && st.w < this.P.volWat * 0.05)) {
        const fogBoost = f.cond && f.t >= f.cond.t ? 0.55 : 0;
        const op = clamp(0.12 + 0.35 * this.P.humidity + fogBoost, 0.1, 0.9);
        for (let k = 0; k < 2; k++) {
          this.puffs.emit(nozzle, new THREE.Vector3((Math.random() - 0.5) * 2, -2.5 - Math.random() * 3, (Math.random() - 0.5) * 2), {
            size: this.P.diaBot * 2.2,
            grow: 2.2,
            life: 3,
            opacity: op,
          });
        }
      }
      if (f.cond && f.t >= f.cond.t && this.P.humidity > 0.05) f.fog = Math.min(1, f.fog + dt * 6);
      else if (ph === PHASE_COAST) f.fog = Math.max(0, f.fog - dt * 0.6);
      this.rocket.setFog(f.fog * clamp(this.P.humidity, 0.3, 1));
    }
    this.jet.update(this.mode === 'flight' ? simDt : dt);

    const U = this.units;
    const q = (k) => this.root.querySelector(`[data-s="${k}"]`);
    q('t').textContent = `${f.t.toFixed(f.t < 1 ? 3 : 2)} s`;
    q('h').textContent = fmtU(U, 'alt', st.h);
    q('v').textContent = fmtU(U, 'speed', st.v);
    q('a').textContent = `${num(st.a / this.P.gravity, 1)} g`;
    q('F').textContent = fmtU(U, 'force', st.F, U === 'metric' ? 0 : 1);
    if (this.mode === 'flight') {
      const label = ph === PHASE_COAST ? t(f.t < apoT ? 'st.coastUp' : f.t < tEnd - 1e-6 ? 'st.falling' : 'st.landed') : t('phase.' + ph);
      this.setPhase(ph, label);
    }
    const ab = this.$('altbar');
    const apo = Math.max(S.apogeeAltitude, 0.01);
    ab.querySelector('.aqt-altbar-fill').style.height = `${clamp(st.h / apo, 0, 1) * 100}%`;
    ab.querySelector('span').textContent = fmtU(U, 'alt', st.h, 0);
    if (this.apoRing) this.apoRing.material.color.set(f.t >= apoT ? 0x7ee787 : 0xffd166);
    for (const c of Object.values(this.charts)) c.chart.setCursor(f.t);

    if (this.mode === 'flight' && f.t >= tEnd - 1e-9) {
      this.mode = 'landed';
      this.setPhase(PHASE_COAST, t(res.noLiftoff ? 'st.noLift' : 'st.landed'));
      sm.hidden = true;
      if (!res.noLiftoff) {
        const p = this.rocket.group.position.clone();
        p.y = 0.05;
        for (let k = 0; k < 10; k++)
          this.puffs.emit(p, new THREE.Vector3((Math.random() - 0.5) * 4, 0.5 + Math.random(), (Math.random() - 0.5) * 4), {
            size: 0.25,
            grow: 1.4,
            life: 2.2,
            opacity: 0.55,
            color: 0xb59b7a,
          });
      }
      this.$('replay').hidden = false;
      this.$('back').hidden = false;
      this.lockPanel(false);
    }
  }

  lookAtLandscape() {
    this.camGoal = { target: new THREE.Vector3(0, 2.6, -20), pos: new THREE.Vector3(6, 2.2, 8) };
  }

  updateCamera(dt) {
    const w = this.world;
    const cam = w.camera;
    const ctl = w.controls;
    const recentUser = performance.now() - w.lastInteraction < 2500 || w.userInteracting;
    if (this.camGoal) {
      const k = this.camGoal.immediate ? 1 : 1 - Math.exp(-dt * 3.2);
      ctl.target.lerp(this.camGoal.target, k);
      cam.position.lerp(this.camGoal.pos, k);
      if (this.camGoal.immediate || cam.position.distanceTo(this.camGoal.pos) < 0.01 || w.userInteracting) this.camGoal = null;
      return;
    }
    if ((this.mode === 'flight' || this.mode === 'landed') && this.view !== 'free') {
      const rp = this.rocket.group.position;
      const h = rp.y;
      if (this.view === 'chase') {
        const prev = ctl.target.clone();
        ctl.target.lerp(rp, 1 - Math.exp(-dt * 7));
        cam.position.add(ctl.target.clone().sub(prev));
        if (!recentUser) {
          const off = cam.position.clone().sub(ctl.target);
          const want = Math.max(2.2, 1.6 + h * 0.55, this.rocket.top * 3);
          off.setLength(lerp(off.length(), want, 1 - Math.exp(-dt * 1.5)));
          off.y = lerp(off.y, clamp(-h * 0.12, -h + 0.5, 1.5), 1 - Math.exp(-dt * 0.8));
          cam.position.copy(ctl.target).add(off);
          if (cam.position.y < 0.4) cam.position.y = 0.4;
        }
      } else if (this.view === 'ground') {
        const apo = this.flight ? this.flight.res.summary.apogeeAltitude : 10;
        const d = Math.max(7, apo * 0.75);
        cam.position.lerp(new THREE.Vector3(d * 0.55, 1.6, d), 1 - Math.exp(-dt * 2));
        ctl.target.lerp(new THREE.Vector3(0, h, 0), 1 - Math.exp(-dt * 6));
      }
    }
  }

  /* ------------------------------------------------------------ results */
  showResults() {
    const res = this.lastLaunched || this.result;
    if (!res) return;
    this.$('results').hidden = false;
    const S = res.summary;
    const U = this.units;
    const alert = this.$('alert');
    const notes = [...(checkParameters(res.params).dangers || []).map((d) => '⛔ ' + this.msg(d)), ...res.warnings.map((w) => this.msg(w))];
    if (res.noLiftoff) notes.unshift(t('note.noLift'));
    alert.hidden = !notes.length;
    alert.innerHTML = notes.map((x) => `<p>${x}</p>`).join('');

    const tile = (label, value, note, accent) =>
      `<div class="aqt-tile${accent ? ' aqt-tile-accent' : ''}"><span>${label}</span><b>${value}</b><p>${note}</p></div>`;
    const prev = this.prev && this.$('compare').checked ? this.prev.summary : null;
    const delta = (cur, old) => {
      if (!old) return '';
      const d = cur - old;
      if (Math.abs(d) < 1e-9) return ` <em class="aqt-delta">${t('delta.same')}</em>`;
      const pctv = old !== 0 ? (d / Math.abs(old)) * 100 : 0;
      return ` <em class="aqt-delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${num(Math.abs(pctv), 0)}% ${t('delta.vs')}</em>`;
    };
    this.$('tiles').innerHTML = [
      tile(t('tile.apo'), fmtU(U, 'alt', S.apogeeAltitude) + delta(S.apogeeAltitude, prev?.apogeeAltitude), heightComparison(S.apogeeAltitude), true),
      tile(t('tile.speed'), fmtU(U, 'speed', S.maxVelocity) + delta(S.maxVelocity, prev?.maxVelocity), speedComparison(S.maxVelocity)),
      tile(t('tile.accel'), `${num(S.maxAccel / this.P.gravity, 1)} g`, accelComparison(S.maxAccel / this.P.gravity)),
      tile(
        t('tile.time'),
        `${num(S.impactTime, 1)} s` + delta(S.impactTime, prev?.impactTime),
        t('tile.timeNote', { u: num(S.apogeeTime, 1), d: num(S.impactTime - S.apogeeTime, 1), v: fmtU(U, 'speed', Math.abs(S.impactVelocity)) }),
      ),
      tile(
        t('tile.thrust'),
        t('tile.thrustVal', { f: fmtU(U, 'force', S.peakThrust, 0) }),
        t('tile.thrustNote', { a: fmtU(U, 'force', S.averageThrust, 0), b: num(S.burnTime * 1000, 0), k: num(S.peakThrust / 9.81, 0) }),
      ),
      tile(t('tile.impulse'), fmtU(U, 'impulse', S.totalImpulse), t('tile.impulseNote', { c: S.motorClass })),
      this.stabTile(res),
    ].join('');

    const ev = res.events;
    const tTube = ev.tubeExit ? ev.tubeExit.t : 0;
    const tWater = ev.waterEnd ? ev.waterEnd.t : tTube;
    const tGas = ev.gasEnd ? ev.gasEnd.t : tWater;
    const boost = Math.max(tGas, 1e-6);
    const seg = (cls, dur, total, label) =>
      dur > 0 ? `<div class="aqt-seg-${cls}" style="flex-grow:${dur / total}" title="${label}: ${num(dur * 1000, 1)} ms"><span>${label}</span><small>${dur < 1 ? num(dur * 1000, 0) + ' ms' : num(dur, 2) + ' s'}</small></div>` : '';
    const segF = (cls, dur, total, label) =>
      dur > 0 ? `<div class="aqt-seg-${cls}" style="flex-grow:${dur / total}"><span>${label}</span><small>${num(dur, 1)} s</small></div>` : '';
    this.$('timeline').innerHTML = `
      <div class="aqt-tl-row"><h5>${t('tl.powered')} <small>${t('tl.poweredTotal', { ms: num(boost * 1000, 0) })}</small></h5>
        <div class="aqt-tl">${seg('tube', tTube, boost, t('tl.tube'))}${seg('water', tWater - tTube, boost, t('tl.water'))}${seg('gas', tGas - tWater, boost, t('tl.air'))}</div></div>
      <div class="aqt-tl-row"><h5>${t('tl.whole')} <small>(${num(S.impactTime, 1)} s)</small></h5>
        <div class="aqt-tl">${segF('power', boost, S.impactTime, t('tl.thrust'))}${segF('up', S.apogeeTime - boost, S.impactTime, t('tl.up'))}${segF('down', S.impactTime - S.apogeeTime, S.impactTime, t('tl.down'))}</div></div>
      ${ev.condensation && res.params.humidity > 0.05 ? `<p class="aqt-tl-note">${t('tl.fog', { ms: num(ev.condensation.t * 1000, 0) })}</p>` : ''}`;

    this.renderCharts();
    clearTimeout(this.sweepTimer);
    this.sweepTimer = setTimeout(() => this.renderSweep(), 60);
  }

  bandsFor(res) {
    const ev = res.events;
    const b = [];
    const tTube = ev.tubeExit ? ev.tubeExit.t : 0;
    if (tTube > 0) b.push({ x0: 0, x1: tTube, label: t('band.tube'), color: COLORS.bandTube });
    if (ev.waterEnd) b.push({ x0: tTube, x1: ev.waterEnd.t, label: t('band.water'), color: COLORS.bandWater });
    if (ev.gasEnd) b.push({ x0: ev.waterEnd.t, x1: ev.gasEnd.t, label: t('band.air'), color: COLORS.bandGas });
    return b;
  }

  renderCharts() {
    const res = this.lastLaunched || this.result;
    if (!res) return;
    const host = this.$('charts');
    const U = this.units;
    const uu = UNITS[U];
    const prev = this.prev && this.$('compare').checked ? this.prev : null;
    const defs = [
      { key: 'h', title: t('ch.alt'), sub: t('ch.whole'), unit: uu.alt.u, f: uu.alt.f, boost: false },
      { key: 'v', title: t('ch.speed'), sub: t('ch.speedSub'), unit: uu.speed.u, f: uu.speed.f, boost: false, zero: false },
      { key: 'F', title: t('ch.thrust'), sub: t('ch.powered'), unit: uu.force.u, f: uu.force.f, boost: true },
      { key: 'a', title: t('ch.accel'), sub: t('ch.powered'), unit: 'g', f: 1 / res.params.gravity, boost: true, zero: false },
      { key: 'p', title: t('ch.press'), sub: t('ch.pressSub'), unit: uu.press.u, f: uu.press.f, boost: true },
      { key: 'w', title: t('ch.water'), sub: t('ch.powered'), unit: uu.vol.u, f: uu.vol.f, boost: true },
    ];
    if (!this.chartsBuilt) {
      host.innerHTML = '';
      for (const d of defs) this.charts[d.key] = { chart: new LineChart(host, { title: d.title, subtitle: d.sub, unit: d.unit, digits: 2, zeroBased: d.zero !== false }) };
      this.chartsBuilt = true;
    }
    const mk = (r, d, name, color, dash) => {
      const s = r.series;
      const count = d.boost ? r.boostCount : s.t.length;
      return { x: s.t.slice(0, count), y: s[d.key].slice(0, count).map((v) => v * d.f), name, color, dash };
    };
    const S = res.summary;
    for (const d of defs) {
      const c = this.charts[d.key].chart;
      c.opts.unit = d.unit;
      c.setTitle(d.title, d.sub);
      const series = [mk(res, d, t('ch.this'), COLORS.current, false)];
      if (prev) series.push(mk(prev, d, t('ch.prev'), COLORS.previous, true));
      const markers = [];
      if (d.key === 'h') markers.push({ x: S.apogeeTime, y: S.apogeeAltitude * d.f, label: t('mk.apogee', { x: fmtU(U, 'alt', S.apogeeAltitude) }) });
      if (d.key === 'v') {
        const s = res.series;
        let im = 0;
        for (let i = 0; i < s.v.length; i++) if (s.v[i] > s.v[im]) im = i;
        markers.push({ x: s.t[im], y: s.v[im] * d.f, label: t('mk.max', { x: fmtU(U, 'speed', s.v[im]) }) });
      }
      if (d.key === 'F') markers.push({ x: S.peakThrustTime, y: S.peakThrust * d.f, label: t('mk.peak', { x: fmtU(U, 'force', S.peakThrust, 0) }) });
      let xMax;
      if (d.boost) {
        xMax = res.series.t[res.boostCount - 1] * 1.04;
        if (prev) xMax = Math.max(xMax, prev.series.t[prev.boostCount - 1] * 1.04);
      }
      c.opts.xDigits = d.boost ? 3 : 2;
      c.setData({ series, bands: d.boost ? this.bandsFor(res) : [], markers, xMin: 0, xMax });
    }
  }

  renderSweep() {
    const res = this.lastLaunched || this.result;
    if (!res) return;
    const P = res.params;
    const sw = sweepWater(P, 34);
    this.best = sw.best;
    const U = this.units;
    const fv = UNITS[U].vol.f;
    const fa = UNITS[U].alt.f;
    if (!this.sweepChart) {
      this.$('sweep').innerHTML = '';
      this.sweepChart = new LineChart(this.$('sweep'), { title: t('sw.title'), subtitle: t('sw.sub'), unit: UNITS[U].alt.u, xUnit: UNITS[U].vol.u, xName: t('sw.x'), digits: 1, xDigits: 2 });
    }
    const ch = this.sweepChart;
    ch.opts.unit = UNITS[U].alt.u;
    ch.opts.xUnit = UNITS[U].vol.u;
    ch.setData({
      series: [{ x: sw.pts.map((p) => p.water * fv), y: sw.pts.map((p) => p.apogee * fa), name: t('mk.apogee', { x: '' }), color: COLORS.current }],
      markers: [
        { x: sw.best.water * fv, y: sw.best.apogee * fa, label: t('mk.best', { x: fmtU(U, 'vol', sw.best.water) }), color: '#7ee787' },
        { x: P.volWat * fv, y: res.summary.apogeeAltitude * fa, label: t('mk.you'), color: COLORS.previous, below: true },
      ],
    });
    const better = sw.best.apogee - res.summary.apogeeAltitude;
    this.$('best').innerHTML =
      better > 0.5
        ? t('opt.best', { w: fmtU(U, 'vol', sw.best.water), p: Math.round(sw.best.frac * 100), a: fmtU(U, 'alt', sw.best.apogee), d: fmtU(U, 'alt', better) })
        : t('opt.already');
    this.$('usebest').hidden = !(better > 0.5);
  }

  /* ---------------------------------------------------------------- data */
  rows() {
    const res = this.lastLaunched || this.result;
    const s = res.series;
    const out = [];
    for (let i = 0; i < s.t.length; i++) out.push([s.t[i], t('phase.' + s.ph[i]), s.h[i], s.v[i], s.a[i], s.a[i] / res.params.gravity, s.F[i], s.p[i] / 1e5, s.w[i] * 1000, s.m[i]]);
    return out;
  }

  openTable() {
    const head = ['th.t', 'th.ph', 'th.h', 'th.v', 'th.a', 'th.g', 'th.F', 'th.p', 'th.w', 'th.m'].map((k) => t(k));
    const fmtv = (v) => (typeof v === 'number' ? v.toFixed(Math.abs(v) < 10 ? 4 : 2) : v);
    this.$('tableWrap').innerHTML = `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${this.rows()
      .map((r) => `<tr>${r.map((v) => `<td>${fmtv(v)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
    this.$('dialog').showModal();
  }

  downloadCSV() {
    const head = 'time_s,phase,altitude_m,velocity_mps,accel_mps2,accel_g,thrust_N,pressure_bar,water_L,mass_kg';
    const body = this.rows()
      .map((r) => r.map((v) => (typeof v === 'number' ? v.toPrecision(7) : `"${v}"`)).join(','))
      .join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aquathrust-flight.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  /* ------------------------------------------- stability window + fins */
  openStabWin(open) {
    this.stabOpen = open;
    const w = this.$('stabWin');
    w.hidden = !open;
    if (open && !w.dataset.placed) {
      const ww = Math.min(440, window.innerWidth - 24);
      w.style.width = `${ww}px`;
      w.style.left = `${Math.max(12, window.innerWidth - ww - 30)}px`;
      w.style.top = '80px';
      w.dataset.placed = '1';
    }
    this.updateMarkers();
  }

  makeDraggable(el, head) {
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const r = el.getBoundingClientRect();
      const ox = e.clientX - r.left;
      const oy = e.clientY - r.top;
      head.setPointerCapture(e.pointerId);
      const move = (ev) => {
        el.style.left = `${clamp(ev.clientX - ox, -r.width + 80, window.innerWidth - 80)}px`;
        el.style.top = `${clamp(ev.clientY - oy, 0, window.innerHeight - 40)}px`;
      };
      const up = () => {
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
    });
  }

  setupFinTemplate() {
    const g = this.groups.find((x) => x.rows.finSpan);
    if (!g) return;
    const row = g.rows.finSpan;
    row.extra.innerHTML = `<h6>${t('fin.tplTitle')}</h6><div data-id="finTpl"></div><p class="aqt-typenote" data-id="finInfo"></p>`;
    this.updateFinTemplate();
  }

  updateFinTemplate() {
    const host = this.root.querySelector('[data-id="finTpl"]');
    if (!host) return;
    const { svg, dims } = finTemplate(this.P);
    host.innerHTML = svg;
    const info = this.root.querySelector('[data-id="finInfo"]');
    if (dims)
      info.innerHTML = t('fin.tplInfo', { n: dims.count, root: num(dims.root, 0), tip: num(dims.tip, 0), span: num(dims.span, 0), t: num(dims.thick, 0) });
  }

  /* ------------------------------------------------- drag coefficient */
  applyAutoCd() {
    const P = this.P;
    const est = estimateCd(P);
    this.cdEst = est;
    const auto = P.cdMode === 'auto';
    if (auto && est) P.CDrag = Math.round(Math.min(1.5, Math.max(0.05, est.total)) * 100) / 100;
    const g = this.groups?.find((x) => x.rows.CDrag);
    if (g) {
      g.setDisabled('CDrag', auto);
      if (auto) g.refresh();
    }
    const card = this.$('cdCard');
    if (!card) return;
    if (!est) {
      card.innerHTML = '';
      return;
    }
    if (!auto) {
      card.innerHTML = `<p class="aqt-typenote">${t('cd.customNote', { cd: num(est.total, 2) })}</p>`;
      return;
    }
    const keys = ['friction', 'fins', 'nose', 'tail', 'edges', 'extra'];
    const colors = ['#338ced', '#00a888', '#e63946', '#d29922', '#9887ef', '#6b7a8f'];
    const bar = keys.map((k, i) => `<i style="flex-grow:${est.parts[k]};background:${colors[i]}" title="${t('cd.' + k)}: ${num(est.parts[k], 3)}"></i>`).join('');
    const rows = keys.map((k, i) => `<li><i style="background:${colors[i]}"></i>${t('cd.' + k)}<b>${num(est.parts[k], 3)}</b></li>`).join('');
    card.innerHTML = `<div class="aqt-cdhead"><span>${t('cd.title')}</span><b>Cd ≈ ${num(est.total, 2)}</b></div>
      <div class="aqt-cdbar">${bar}</div><ul class="aqt-cdlist">${rows}</ul>
      <p class="aqt-typenote">${t('cd.note', { v: est.vRef, re: Math.round(est.Re).toLocaleString() })}</p>`;
  }

  /* ------------------------------------------------------- stability */
  updateMarkers() {
    const show = this.$('showCG')?.checked && (this.stabOpen || this.mode !== 'design');
    const r = this.stabRep;
    this.rocket.markers.visible = !!(show && r);
    if (!r) return;
    const cpZ = r.g.noseTip - r.cp.x;
    const cmZ = this.mode === 'design' ? r.launch.cm.z : this.rocket.cmMark.position.y || r.launch.cm.z;
    this.rocket.setMarkers(cmZ, cpZ, Math.max(0.035, r.g.Db * 0.42));
  }

  stabTile(res) {
    const r = stabilityReport(res.params);
    if (!r) return '';
    const m = r.empty.margin;
    return `<div class="aqt-tile aqt-tile-stab" style="--zc:${zoneColor(m)}"><span>${t('tile.stab')}</span><b>${num(m, 2)} cal</b><p>${t('tile.stabNote', {
      state: t('stab.s.' + r.state),
      l: num(r.launch.margin, 2),
      cm: num(r.empty.cm.x * 100, 1),
      cp: num(r.cp.x * 100, 1),
    })}</p></div>`;
  }

  updateStability(res) {
    const card = this.$('stabCard');
    const tips = this.$('stabTips');
    const P = this.P;
    const r = stabilityReport(P, res);
    this.stabRep = r;
    if (!r) {
      card.innerHTML = '';
      tips.innerHTML = '';
      return;
    }
    const mE = r.empty.margin;
    const mL = r.launch.margin;
    const burnMs = res ? num(res.summary.burnoutTime * 1000, 0) : '–';
    this.$('stabMini').innerHTML = `<div class="aqt-stabhead" style="--zc:${zoneColor(mE)}"><i></i><b>${t('stab.s.' + r.state)}</b><span>${num(mE, 2)} cal</span></div><button type="button" class="aqt-btn aqt-btn-sm" data-goto="stability">${t('stab.details')}</button>`;
    card.innerHTML = `
      <div class="aqt-stabhead" style="--zc:${zoneColor(mE)}"><i></i><b>${t('stab.s.' + r.state)}</b></div>
      ${ST.side(P, r, { W: 330, H: 230, compact: true })}
      ${ST.scale(r, { W: 330 })}
      <div class="aqt-stabnums">
        <div><span>${t('stab.empty')}</span><b style="color:${zoneColor(mE)}">${num(mE, 2)} cal</b></div>
        <div><span>${t('stab.launch')}</span><b style="color:${zoneColor(mL)}">${num(mL, 2)} cal</b></div>
        ${
          r.freeFlight && r.freeFlight.tube
            ? `<div><span>${t('stab.tubeExit')}</span><b style="color:${zoneColor(r.freeFlight.margin)}">${num(r.freeFlight.margin, 2)} cal</b><small>${fmtU(this.units, 'speed', r.freeFlight.v)}</small></div>`
            : ''
        }
        ${
          r.freeFlight
            ? `<div><span>${t('stab.negTime')}</span><b style="color:${r.freeFlight.negTime > 0 ? zoneColor(-1) : zoneColor(mE)}">${num(r.freeFlight.negTime * 1000, 0)} ms</b></div>`
            : ''
        }
      </div>`;
    const out = [];
    if (r.state === 'unstable' || r.state === 'marginal') {
      if (r.needBallast > 0 && r.needBallast < 2) {
        const add = Math.ceil((r.needBallast * 1000) / 5) * 5;
        const newMass = Math.min(0.6, (P.noseMass || 0) + add / 1000);
        let a1 = '–';
        try {
          a1 = fmtU(this.units, 'alt', simulate({ ...P, noseMass: newMass }, { boostSamples: 50, coastSamples: 4 }).summary.apogeeAltitude);
        } catch {
          /* ignore */
        }
        const a0 = res ? fmtU(this.units, 'alt', res.summary.apogeeAltitude) : '–';
        out.push(`<p>${t('tip.ballast', { g: add, a0, a1 })} <button type="button" class="aqt-btn aqt-btn-sm" data-apply="ballast" data-v="${newMass}">${t('tip.apply')}</button></p>`);
      }
      if (r.needExt) {
        const ext = Math.min(1, Math.ceil(r.needExt * 100) / 100);
        let a1 = '–';
        try {
          a1 = fmtU(this.units, 'alt', simulate({ ...P, bodyExt: ext }, { boostSamples: 50, coastSamples: 4 }).summary.apogeeAltitude);
        } catch {
          /* ignore */
        }
        out.push(`<p>${t('tip.ext', { cm: num(ext * 100, 0), g: num(bodyExtMass({ ...P, bodyExt: ext }) * 1000, 0), a1 })} <button type="button" class="aqt-btn aqt-btn-sm" data-apply="ext" data-v="${ext}">${t('tip.apply')}</button></p>`);
      }
      if (r.needSpan) out.push(`<p>${t('tip.fins', { s: num(r.needSpan, 2) })} <button type="button" class="aqt-btn aqt-btn-sm" data-apply="fins" data-v="${Math.min(2, Math.ceil(r.needSpan * 100) / 100)}">${t('tip.apply')}</button></p>`);
      else out.push(`<p>${t('tip.finsLimited')}</p>`);
      out.push(`<p class="aqt-tipnote">${t('tip.straight')}</p>`);
    } else if (r.state === 'over') {
      out.push(`<p>${t('tip.over')}</p>`);
    } else {
      out.push(`<p>${t('tip.stable', { d: num((r.cp.x - r.empty.cm.x) * 100, 1) })}</p>`);
    }
    out.push(`<p class="aqt-tipnote">${t('stab.launchNote', { m: num(mL, 2), ms: burnMs })}</p>`);
    const ff = r.freeFlight;
    if (ff && ff.negTime > 0) {
      const key = ff.tube ? 'stab.negAfterTube' : 'stab.negNoTube';
      out.push(`<p class="aqt-tipnote">${t(key, { ms: num(ff.negTime * 1000, 0), v: fmtU(this.units, 'speed', ff.v), m: num(ff.margin, 2) })}</p>`);
    }
    out.push(`<p class="aqt-tipnote">${t('tip.check')}</p>`);
    out.push(`<p class="aqt-tipnote">${t('tip.noDrag')}</p>`);
    tips.innerHTML = out.join('');
    this.updateMarkers();
  }

  readHash() {
    const m = /[#&]aqt=([^&]+)/.exec(location.hash);
    if (!m) return null;
    try {
      const o = JSON.parse(atob(decodeURIComponent(m[1])));
      const clean = {};
      for (const k of Object.keys(BASE)) if (k in o && typeof o[k] === typeof BASE[k]) clean[k] = o[k];
      return clean;
    } catch {
      return null;
    }
  }
}

/**
 * Mount the simulator into an element.
 * @param {HTMLElement} host
 * @param {{preset?: string, height?: string, lang?: string}} [opts]
 */
export function mount(host, opts = {}) {
  if (host.__aquathrust) return host.__aquathrust;
  setLang(detectLang(opts.lang));
  const root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  const cssHref = new URL('../css/aquathrust.css?v=1.7.1', import.meta.url).href;
  root.innerHTML = `<link rel="stylesheet" href="${cssHref}">` + bodyTemplate('metric');
  if (opts.height) root.querySelector('.aqt').style.setProperty('--aqt-stage-h', opts.height);
  const link = root.querySelector('link');
  const start = () => {
    try {
      host.__aquathrust = new App(root, host, opts);
    } catch (e) {
      console.error('[AquaThrust]', e);
      root.querySelector('.aqt-canvas').innerHTML = `<p class="aqt-fallback">${t('webgl.fail')} ${e.message}</p>`;
    }
  };
  if (link.sheet) start();
  else {
    link.addEventListener('load', start, { once: true });
    link.addEventListener('error', start, { once: true });
  }
  return host;
}
