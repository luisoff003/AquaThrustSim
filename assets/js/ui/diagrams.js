/**
 * AquaThrust — SVG diagrams for "How the simulation works".
 *  • simple.*   illustrated explanations (static, with live numbers in <tspan class="aqt-live">)
 *  • detail.*   engineering diagrams (some are drawn from the current design)
 *  • safety.*   pressure-criticality graphics (drawn from the current design)
 */
import { getLang, loc } from '../i18n.js?v=1.7.1';
import { BottleProfile } from '../physics/bottle.js?v=1.7.1';
import { bottleLimits } from '../physics/presets.js?v=1.7.1';
import { rocketGeometry } from '../physics/stability.js?v=1.7.1';

const C = {
  line: '#cfe3ff',
  muted: '#9aa7b6',
  text: '#e8edf3',
  accent: '#338ced',
  water: '#2f9ff0',
  waterFill: 'rgba(47,159,240,0.55)',
  air: 'rgba(207,227,255,0.07)',
  thrust: '#ff7a3d',
  drag: '#f85149',
  grav: '#b9c3cf',
  good: '#3fb950',
  warn: '#d29922',
  bad: '#f85149',
  grid: 'rgba(255,255,255,0.08)',
  axis: 'rgba(255,255,255,0.35)',
  yellow: '#ffd166',
  violet: '#9887ef',
};

let uid = 0;
const n = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ------------------------------------------------------------------ labels */
const LB = {
  en: {
    air: 'compressed air', water: 'water', spring: 'squeezed air = wound-up spring', pump: 'pump',
    jet: 'water jet', fall: 'same speed as falling from', ball: 'ball', push: 'push', throw: 'throw',
    rocket: 'rocket', heavy: 'heavy', light: 'light', sameF: 'same push F', start: 'start', mid: 'half-way', end: 'water gone',
    time: 'time', fog: 'fog!', speed: 'speed (m/s)', force: 'force (N)', drag: 'air drag D', weight: 'weight of the empty rocket',
    topSpeed: 'top speed', terminal: 'terminal speed', real: 'real flight', steps: 'computer steps', page: 'Δt',
    height: 'height', more: 'more water: longer push', heavier: 'but heavier & less air', best: 'best ≈ ⅓ full', fill: 'water fill', apogee: 'apogee',
    nozzleExit: 'nozzle exit', neck: 'neck', shoulder: 'shoulder (Bézier)', body: 'cylinder', dome: 'dome', gas: 'gas', ctrl: 'control polygon',
    slices: '13 slices: A(z) linear', section: 'Half-section of your bottle (to scale)', centre: 'centre line',
    thrustF: 'thrust F', weightW: 'weight mg', dragD: 'drag k·v|v|', vel: 'velocity v', exit: 'exit velocity u', ground: 'ground',
    eqm: 'm·a = F − m·g − k·v|v|', ph0: 'Phase 0', ph1: 'Phase 1', ph2: 'Phase 2', ph3: 'Phase 3', tube: 'Launch tube', wthrust: 'Water thrust',
    athrust: 'Air thrust', coast: 'Coast', landing: 'Landing', noTube: 'no tube', waterGone: 'water gone', pa: 'p = pₐ', hLt: 'h = Lₜ', h0: 'h = 0',
    airFirst: 'air runs out first', closed: 'closed form', gasVol: 'gas volume V (L)', pAbs: 'pressure (bar, absolute)', adiab: 'adiabatic p·V^γ',
    iso: 'isothermal p·V (for comparison)', work: 'work done on the water',
    ratio: 'pressure ratio p / pₐ', thrustA: 'thrust per nozzle area (× pₐ)', sub: 'sub-sonic', choked: 'choked (sonic)', waterJet: 'water jet 2(p−pₐ)',
    airJet: 'air jet', you: 'your launch', tAxis: 'time (s)', hAxis: 'height (m)', noDrag: 'without air drag', withDrag: 'with drag (simulated)',
    burnout: 'burnout', apo: 'apogee', euler: 'Euler (1 slope)', rk4: 'RK4 (4 slopes, averaged)', exact: 'exact', tC: 'dew point T_c',
    temp: 'gas temperature', jump: 'latent heat: T jumps up', tsec: 'time',
    pressCooker: 'pressure cooker', carTyre: 'car tyre', soda: 'sealed soda', bike: 'road-bike tyre', espresso: 'espresso machine',
    extinguisher: 'fire extinguisher', scuba: 'scuba tank', still: 'still-water bottle', sodaB: 'soda bottle', tested: 'your tested rocket',
    safe: 'safe', caution: 'caution', burst: 'burst range', youAre: 'you', bar: 'bar (gauge, log scale)', energy: 'stored energy (J)',
    eAxis: 'launch pressure (bar)', eqDrop: 'like lifting 1 kg up', pitches: 'baseball pitches (145 km/h)', airE: 'air (launch)', waterE: 'water (hydro-test)',
    ofBurst: 'of the typical burst pressure', risk: 'Risk for your bottle', hydro: 'Same bottle, same pressure:',
    cmFull: 'CM with water', cmEmpty: 'CM empty', cp: 'CP', margin: 'margin', cal: 'cal', unstable: 'unstable', marginal: 'marginal',
    stable: 'stable', over: 'over-stable', launchM: 'at launch', emptyM: 'empty', waterLeft: 'water left in the bottle (L)', calAxis: 'static margin (calibres)',
    noseTipL: 'nose tip', wind: 'wind / gust', restoring: 'turns back: stable', flips: 'turns away: tumbles', stableT: 'CM ahead of CP', unstableT: 'CP ahead of CM',
    airForce: 'air force at CP', target: 'target ≥ 1',
  },
  es: {
    air: 'aire comprimido', water: 'agua', spring: 'aire apretado = resorte cargado', pump: 'bomba',
    jet: 'chorro de agua', fall: 'misma velocidad que al caer desde', ball: 'balón', push: 'empuje', throw: 'lanzar',
    rocket: 'cohete', heavy: 'pesado', light: 'ligero', sameF: 'mismo empuje F', start: 'inicio', mid: 'a la mitad', end: 'sin agua',
    time: 'tiempo', fog: '¡niebla!', speed: 'velocidad (m/s)', force: 'fuerza (N)', drag: 'arrastre del aire D', weight: 'peso del cohete vacío',
    topSpeed: 'vel. máxima', terminal: 'velocidad terminal', real: 'vuelo real', steps: 'pasos de la compu', page: 'Δt',
    height: 'altura', more: 'más agua: empuja más tiempo', heavier: 'pero pesa más y hay menos aire', best: 'óptimo ≈ ⅓ lleno', fill: 'llenado de agua', apogee: 'apogeo',
    nozzleExit: 'salida de la tobera', neck: 'cuello', shoulder: 'hombro (Bézier)', body: 'cilindro', dome: 'domo', gas: 'gas', ctrl: 'polígono de control',
    slices: '13 rebanadas: A(z) lineal', section: 'Media sección de tu botella (a escala)', centre: 'eje',
    thrustF: 'empuje F', weightW: 'peso mg', dragD: 'arrastre k·v|v|', vel: 'velocidad v', exit: 'velocidad de salida u', ground: 'suelo',
    eqm: 'm·a = F − m·g − k·v|v|', ph0: 'Fase 0', ph1: 'Fase 1', ph2: 'Fase 2', ph3: 'Fase 3', tube: 'Tubo de lanzamiento', wthrust: 'Empuje de agua',
    athrust: 'Empuje de aire', coast: 'Vuelo libre', landing: 'Aterrizaje', noTube: 'sin tubo', waterGone: 'se acaba el agua', pa: 'p = pₐ', hLt: 'h = Lₜ', h0: 'h = 0',
    airFirst: 'se acaba el aire antes', closed: 'solución exacta', gasVol: 'volumen del gas V (L)', pAbs: 'presión (bar, absoluta)', adiab: 'adiabática p·V^γ',
    iso: 'isotérmica p·V (para comparar)', work: 'trabajo hecho sobre el agua',
    ratio: 'razón de presiones p / pₐ', thrustA: 'empuje por área de tobera (× pₐ)', sub: 'subsónico', choked: 'estrangulado (sónico)', waterJet: 'chorro de agua 2(p−pₐ)',
    airJet: 'chorro de aire', you: 'tu lanzamiento', tAxis: 'tiempo (s)', hAxis: 'altura (m)', noDrag: 'sin arrastre del aire', withDrag: 'con arrastre (simulado)',
    burnout: 'fin del empuje', apo: 'apogeo', euler: 'Euler (1 pendiente)', rk4: 'RK4 (4 pendientes, promedio)', exact: 'exacta', tC: 'punto de rocío T_c',
    temp: 'temperatura del gas', jump: 'calor latente: T sube de golpe', tsec: 'tiempo',
    pressCooker: 'olla exprés', carTyre: 'llanta de coche', soda: 'refresco cerrado', bike: 'llanta de bici de ruta', espresso: 'cafetera espresso',
    extinguisher: 'extintor', scuba: 'tanque de buceo', still: 'botella de agua natural', sodaB: 'botella de refresco', tested: 'tu cohete probado',
    safe: 'seguro', caution: 'precaución', burst: 'rango de reventón', youAre: 'tú', bar: 'bar (manométrica, escala log)', energy: 'energía guardada (J)',
    eAxis: 'presión de lanzamiento (bar)', eqDrop: 'como subir 1 kg a', pitches: 'lanzamientos de béisbol (145 km/h)', airE: 'aire (lanzamiento)', waterE: 'agua (prueba hidrostática)',
    ofBurst: 'de la presión típica de reventón', risk: 'Riesgo para tu botella', hydro: 'Misma botella, misma presión:',
    cmFull: 'CM con agua', cmEmpty: 'CM vacío', cp: 'CP', margin: 'margen', cal: 'cal', unstable: 'inestable', marginal: 'al límite',
    stable: 'estable', over: 'sobre-estable', launchM: 'al despegar', emptyM: 'vacío', waterLeft: 'agua que queda en la botella (L)', calAxis: 'margen estático (calibres)',
    noseTipL: 'punta', wind: 'viento / ráfaga', restoring: 'regresa: estable', flips: 'se voltea: da vueltas', stableT: 'CM delante del CP', unstableT: 'CP delante del CM',
    airForce: 'fuerza del aire en el CP', target: 'meta ≥ 1',
  },
};
const L = () => LB[getLang()] || LB.en;

/* ----------------------------------------------------------------- helpers */
const svg = (w, h, body, label = '') =>
  `<svg class="aqt-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;

function txt(x, y, s, { size = 12, color = C.text, anchor = 'start', weight = 400, italic = false, base = 'auto' } = {}) {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}" dominant-baseline="${base}"${italic ? ' font-style="italic"' : ''}>${s}</text>`;
}
const live = (k) => `<tspan class="aqt-live" data-k="${k}">…</tspan>`;

function arrow(x1, y1, x2, y2, color, w = 3, head = 9, dash = '') {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = x2 - Math.cos(a) * head;
  const hy = y2 - Math.sin(a) * head;
  const px = Math.sin(a) * head * 0.55;
  const py = -Math.cos(a) * head * 0.55;
  return `<line x1="${x1}" y1="${y1}" x2="${hx}" y2="${hy}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>
    <polygon points="${x2},${y2} ${hx + px},${hy + py} ${hx - px},${hy - py}" fill="${color}"/>`;
}

/** Dimension line with arrows on both ends and a centred label. */
function dim(x1, y1, x2, y2, label, { color = C.muted, size = 11, off = -6 } = {}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `${arrow(mx, my, x1, y1, color, 1, 6)}${arrow(mx, my, x2, y2, color, 1, 6)}${txt(mx, my + off, label, { size, color, anchor: 'middle' })}`;
}

/** Upright bottle (nozzle at the bottom), with optional water level (0–1 of height) and air dots. */
function bottle(cx, yTop, yBot, R, rn, { water = 0, dots = 0, fog = false, stroke = C.line, rocket = false } = {}) {
  const id = `b${++uid}`;
  const neckH = (yBot - yTop) * 0.1;
  const shH = (yBot - yTop) * 0.2;
  const ys = yBot - neckH - shH;
  const d = `M${cx - rn},${yBot} L${cx - rn},${yBot - neckH} Q${cx - R},${yBot - neckH} ${cx - R},${ys} L${cx - R},${yTop + R * 0.7} C${cx - R},${yTop - R * 0.15} ${cx + R},${yTop - R * 0.15} ${cx + R},${yTop + R * 0.7} L${cx + R},${ys} Q${cx + R},${yBot - neckH} ${cx + rn},${yBot - neckH} L${cx + rn},${yBot} Z`;
  let s = `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><path d="${d}" fill="${C.air}"/>`;
  const yw = yBot - (yBot - yTop) * water;
  if (water > 0) s += `<rect x="${cx - R - 2}" y="${yw}" width="${2 * R + 4}" height="${yBot - yw + 2}" fill="${C.waterFill}" clip-path="url(#${id})"/>`;
  if (dots) {
    let k = 0;
    const r = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    for (let i = 0; i < dots; i++) {
      const x = cx - R * 0.85 + r(++k + uid) * R * 1.7;
      const y = yTop + 6 + r(++k + uid * 3) * (yw - yTop - 10);
      s += `<circle cx="${x}" cy="${y}" r="1.6" fill="#dbe9ff" opacity="0.85" clip-path="url(#${id})"/>`;
    }
  }
  if (fog) s += `<rect x="${cx - R}" y="${yTop}" width="${2 * R}" height="${yBot - yTop}" fill="rgba(255,255,255,0.45)" clip-path="url(#${id})"/>`;
  s += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.8"/>`;
  if (rocket) {
    // nose + fins
    s += `<path d="M${cx - R * 1.05},${yTop + R * 0.75} Q${cx},${yTop - R * 2.6} ${cx + R * 1.05},${yTop + R * 0.75} Z" fill="#e63946"/>`;
    s += `<path d="M${cx - R},${ys + 6} L${cx - R * 1.9},${yBot} L${cx - R},${yBot - neckH * 0.5} Z" fill="#ffb703"/><path d="M${cx + R},${ys + 6} L${cx + R * 1.9},${yBot} L${cx + R},${yBot - neckH * 0.5} Z" fill="#ffb703"/>`;
  }
  return s;
}

/** Axes for a plot. Returns { X, Y, s }. */
function plot(x0, y0, w, h, xmin, xmax, ymin, ymax, { xt = [], yt = [], xl = '', yl = '', xfmt = (v) => n(v, 0), yfmt = (v) => n(v, 0), logx = false } = {}) {
  const lx = (v) => (logx ? Math.log10(v) : v);
  const X = (v) => x0 + ((lx(v) - lx(xmin)) / (lx(xmax) - lx(xmin))) * w;
  const Y = (v) => y0 + h - ((v - ymin) / (ymax - ymin)) * h;
  let s = '';
  for (const v of yt) s += `<line x1="${x0}" x2="${x0 + w}" y1="${Y(v)}" y2="${Y(v)}" stroke="${C.grid}"/>${txt(x0 - 6, Y(v), yfmt(v), { size: 10, color: C.muted, anchor: 'end', base: 'middle' })}`;
  for (const v of xt) s += `<line x1="${X(v)}" x2="${X(v)}" y1="${y0}" y2="${y0 + h}" stroke="${C.grid}"/>${txt(X(v), y0 + h + 14, xfmt(v), { size: 10, color: C.muted, anchor: 'middle' })}`;
  s += `<line x1="${x0}" y1="${y0 + h}" x2="${x0 + w}" y2="${y0 + h}" stroke="${C.axis}"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + h}" stroke="${C.axis}"/>`;
  if (xl) s += txt(x0 + w, y0 + h + 28, xl, { size: 11, color: C.muted, anchor: 'end' });
  if (yl) s += txt(x0, y0 - 8, yl, { size: 11, color: C.muted });
  return { X, Y, s };
}

function path(pts) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}

function niceTicks(max, count = 5) {
  const raw = max / count;
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) || p * 10;
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/* ===================================================== SIMPLE (illustrated) */
export const simple = {
  pump() {
    const l = L();
    let s = bottle(150, 30, 160, 34, 9, { water: 0.32, dots: 70 });
    // pump and hose
    s += `<rect x="40" y="70" width="22" height="88" rx="4" fill="#1d4ed8" stroke="${C.line}" stroke-width="1"/><line x1="51" y1="70" x2="51" y2="48" stroke="${C.grav}" stroke-width="3"/><line x1="36" y1="46" x2="66" y2="46" stroke="${C.grav}" stroke-width="6" stroke-linecap="round"/>`;
    s += `<path d="M51,158 C51,180 150,182 150,162" fill="none" stroke="#111" stroke-width="4"/>${txt(51, 186, l.pump, { size: 11, color: C.muted, anchor: 'middle' })}`;
    // labels with leader lines
    s += `<line x1="176" y1="70" x2="196" y2="70" stroke="${C.muted}"/>` + txt(200, 74, l.air, { size: 11, color: C.muted });
    s += `<line x1="180" y1="140" x2="196" y2="140" stroke="${C.water}"/>` + txt(200, 144, l.water, { size: 11, color: C.water });
    // spring
    const sx = 330;
    let z = `M${sx},62`;
    for (let i = 0; i < 8; i++) z += ` L${i % 2 ? sx - 14 : sx + 14},${68 + i * 7}`;
    z += ` L${sx},128`;
    s += `<path d="${z}" fill="none" stroke="${C.yellow}" stroke-width="2.5"/><line x1="${sx - 18}" y1="60" x2="${sx + 18}" y2="60" stroke="${C.yellow}" stroke-width="3"/><line x1="${sx - 18}" y1="130" x2="${sx + 18}" y2="130" stroke="${C.yellow}" stroke-width="3"/>`;
    s += arrow(sx, 58, sx, 34, C.yellow, 2, 8) + arrow(sx, 132, sx, 156, C.yellow, 2, 8);
    s += txt(sx + 20, 182, l.spring, { size: 11, color: C.yellow, anchor: 'end' });
    s += txt(150, 22, `${live('p')} bar`, { size: 13, anchor: 'middle', weight: 700 });
    return svg(370, 192, s, l.spring);
  },
  jet() {
    const l = L();
    let s = bottle(80, 62, 140, 26, 7, { water: 0.45, dots: 22, rocket: true });
    for (let i = -3; i <= 3; i++) s += `<line x1="${80 + i * 1.5}" y1="142" x2="${80 + i * 7}" y2="${200 - Math.abs(i) * 4}" stroke="${C.water}" stroke-width="${3 - Math.abs(i) * 0.3}" opacity="${1 - Math.abs(i) * 0.12}" stroke-linecap="round"/>`;
    s += arrow(130, 144, 130, 200, C.water, 3, 10);
    s += txt(142, 168, `v ≈ ${live('ve')} m/s`, { size: 14, weight: 700 });
    s += txt(142, 186, `(${live('vekmh')} km/h)`, { size: 12, color: C.muted });
    // falling-ball equivalence
    s += txt(372, 18, l.fall, { size: 10.5, color: C.muted, anchor: 'end' });
    s += `<circle cx="340" cy="44" r="8" fill="${C.yellow}"/>` + arrow(340, 56, 340, 196, C.yellow, 2, 8, '4 4');
    s += `<line x1="322" y1="202" x2="358" y2="202" stroke="${C.muted}"/>`;
    s += txt(330, 124, `${live('hEq')} m`, { size: 14, weight: 700, anchor: 'end' });
    return svg(380, 212, s, l.jet);
  },
  thrust() {
    const l = L();
    // skateboarder
    let s = `<circle cx="70" cy="58" r="10" fill="none" stroke="${C.line}" stroke-width="2"/><line x1="70" y1="68" x2="70" y2="112" stroke="${C.line}" stroke-width="2.5"/>
      <line x1="70" y1="80" x2="98" y2="74" stroke="${C.line}" stroke-width="2.5"/><line x1="70" y1="82" x2="52" y2="96" stroke="${C.line}" stroke-width="2.5"/>
      <line x1="70" y1="112" x2="58" y2="140" stroke="${C.line}" stroke-width="2.5"/><line x1="70" y1="112" x2="84" y2="140" stroke="${C.line}" stroke-width="2.5"/>
      <rect x="40" y="141" width="62" height="6" rx="3" fill="#8a6a46"/><circle cx="50" cy="152" r="4" fill="#ccc"/><circle cx="92" cy="152" r="4" fill="#ccc"/>
      <circle cx="122" cy="72" r="11" fill="#e76624"/>`;
    s += arrow(138, 72, 178, 72, C.thrust, 3) + txt(158, 62, l.throw, { size: 11, anchor: 'middle', color: C.thrust });
    s += arrow(36, 150, 6, 150, C.accent, 3) + txt(20, 170, l.push, { size: 11, anchor: 'middle', color: C.accent });
    s += `<line x1="200" y1="20" x2="200" y2="180" stroke="${C.grid}" stroke-width="2"/>`;
    // rocket
    s += bottle(270, 50, 140, 22, 6, { water: 0.35, rocket: true });
    for (let i = -2; i <= 2; i++) s += `<line x1="${270 + i}" y1="142" x2="${270 + i * 6}" y2="186" stroke="${C.water}" stroke-width="2.5" opacity="0.8"/>`;
    s += arrow(318, 140, 318, 40, C.thrust, 5, 12) + txt(328, 78, `F ≈ ${live('F0')} N`, { size: 13, weight: 700 });
    s += txt(298, 182, l.water, { size: 11, color: C.water });
    return svg(400, 196, s, l.push);
  },
  mass() {
    const l = L();
    let s = bottle(90, 60, 160, 26, 7, { water: 0.75, rocket: true });
    s += arrow(140, 150, 140, 120, C.accent, 4) + txt(150, 140, 'a', { size: 14, italic: true, weight: 700 });
    s += txt(90, 186, `${l.heavy}`, { size: 12, anchor: 'middle', color: C.muted });
    s += bottle(270, 60, 160, 26, 7, { water: 0.1, rocket: true });
    s += arrow(320, 160, 320, 40, C.accent, 4) + txt(330, 100, 'a', { size: 18, italic: true, weight: 700 });
    s += txt(270, 186, `${l.light}`, { size: 12, anchor: 'middle', color: C.muted });
    s += txt(180, 22, l.sameF, { size: 12, anchor: 'middle', color: C.thrust });
    s += txt(180, 110, 'a = F ÷ m − g', { size: 15, anchor: 'middle', italic: true });
    return svg(360, 196, s, 'a = F / m');
  },
  expand() {
    const l = L();
    const xs = [60, 175, 290];
    const wat = [0.42, 0.2, 0];
    const dots = [90, 50, 26];
    const keys = ['p', 'pmid', 'pend'];
    const lab = [l.start, l.mid, l.end];
    let s = '';
    xs.forEach((x, i) => {
      s += bottle(x, 30, 132, 28, 8, { water: wat[i], dots: dots[i], fog: i === 2 });
      s += `<rect x="${x - 34}" y="150" width="68" height="8" rx="4" fill="rgba(255,255,255,0.08)"/><rect x="${x - 34}" y="150" width="${68 * [1, 0.78, 0.62][i]}" height="8" rx="4" fill="${C.thrust}"/>`;
      s += txt(x, 176, `${live(keys[i])} bar`, { size: 12, anchor: 'middle', weight: 700 });
      s += txt(x, 192, lab[i], { size: 10.5, anchor: 'middle', color: C.muted });
    });
    s += txt(320, 26, l.fog, { size: 12, color: '#fff', weight: 700, anchor: 'middle' });
    s += arrow(100, 14, 260, 14, C.muted, 1.5, 7) + txt(180, 10, l.time, { size: 10.5, color: C.muted, anchor: 'middle' });
    return svg(350, 198, s, 'p·V^1.4');
  },
  flip() {
    const l = L();
    const { X, Y, s: ax } = plot(40, 20, 290, 130, 0, 10, 0, 10, { xl: l.time, yl: l.height });
    let s = ax;
    const f = (tt) => 10 * Math.sin((tt / 10) * Math.PI * 0.95);
    const pts = [];
    for (let i = 0; i <= 60; i++) pts.push([X(i / 6), Y(f(i / 6))]);
    s += `<path d="${path(pts)}" fill="none" stroke="${C.accent}" stroke-width="2.5"/>`;
    // Euler-like staircase
    let h = 0;
    let st = `M${X(0)},${Y(0)}`;
    for (let k = 0; k < 10; k++) {
      const slope = (f(k + 0.001) - f(k)) / 0.001;
      st += ` L${X(k + 1)},${Y(h)} L${X(k + 1)},${Y(h + slope)}`;
      h += slope;
    }
    s += `<path d="${st}" fill="none" stroke="${C.yellow}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
    s += dim(X(2), Y(0) - 8, X(3), Y(0) - 8, 'Δt', { color: C.yellow });
    s += `<line x1="44" y1="186" x2="64" y2="186" stroke="${C.accent}" stroke-width="2.5"/>${txt(68, 190, l.real, { size: 10.5, color: C.muted })}`;
    s += `<line x1="170" y1="186" x2="190" y2="186" stroke="${C.yellow}" stroke-width="1.6" stroke-dasharray="4 3"/>${txt(194, 190, l.steps, { size: 10.5, color: C.muted })}`;
    return svg(360, 198, s, l.steps);
  },
  /** Short vs long rocket: same fins, the longer body separates CM and CP. */
  longer() {
    const es = getLang() === 'es';
    const row = (y, len, cmX, cpX, label, good) => {
      const x0 = 40;
      let s = `<polygon points="${x0},${y} ${x0 + 34},${y - 13} ${x0 + 34},${y + 13}" fill="#e63946"/>`;
      s += `<rect x="${x0 + 34}" y="${y - 13}" width="${len}" height="26" fill="#1e2b40" stroke="${C.line}"/>`;
      if (len > 120) s += `<rect x="${x0 + 34}" y="${y - 13}" width="${len - 110}" height="26" fill="rgba(223,231,241,0.18)" stroke="#dfe7f1" stroke-dasharray="4 3"/>`;
      const xe = x0 + 34 + len;
      s += `<polygon points="${xe - 30},${y - 13} ${xe + 4},${y - 34} ${xe + 4},${y - 13}" fill="#ffb703"/><polygon points="${xe - 30},${y + 13} ${xe + 4},${y + 34} ${xe + 4},${y + 13}" fill="#ffb703"/>`;
      s += cmSymbol(cmX, y, 8) + cpSymbol(cpX, y, 8);
      s += dim(cmX, y + 44, cpX, y + 44, '', { color: good ? C.good : C.warn });
      s += txt((cmX + cpX) / 2, y + 60, label, { size: 11, anchor: 'middle', weight: 700, color: good ? C.good : C.warn });
      return s;
    };
    let s = row(44, 110, 112, 128, es ? 'corto: CM y CP muy juntos' : 'short: CM and CP close together', false);
    s += row(150, 230, 168, 244, es ? 'largo: más separación = más estable' : 'long: bigger gap = more stable', true);
    s += txt(352, 150, es ? '+ extensión' : '+ body extension', { size: 10.5, color: C.muted });
    s += txt(352, 166, es ? '(pero pesa más)' : '(but heavier)', { size: 10.5, color: C.muted });
    return svg(470, 222, s, 'longer rocket');
  },
  seesaw() {
    const l = L();
    let s = `<polygon points="90,96 74,124 106,124" fill="${C.muted}"/><line x1="20" y1="104" x2="160" y2="88" stroke="${C.line}" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="M34,96 q8,-16 16,0 a8,8 0 1 1 -16,0Z" fill="${C.water}"/>`;
    s += `<rect x="132" y="66" width="22" height="18" rx="3" fill="${C.grav}"/>${txt(143, 79, 'kg', { size: 10, anchor: 'middle', color: '#111', weight: 700 })}`;
    s += txt(40, 146, l.more, { size: 10.5, color: C.water }) + txt(40, 162, l.heavier, { size: 10.5, color: C.grav });
    const { X, Y, s: ax } = plot(210, 26, 160, 110, 0, 100, 0, 1, { xt: [0, 33, 66, 100], xfmt: (v) => v + '%', xl: l.fill, yl: l.apogee });
    s += ax;
    const pts = [];
    for (let i = 0; i <= 50; i++) {
      const fr = i / 50;
      pts.push([X(fr * 100), Y(Math.max(0, 1.08 * Math.sin(Math.min(1, fr / 0.9) * Math.PI) * Math.exp(-0.6 * fr) * (fr < 0.05 ? fr / 0.05 * 0.5 + 0.5 : 1)))]);
    }
    s += `<path d="${path(pts)}" fill="none" stroke="${C.accent}" stroke-width="2.5"/>`;
    s += `<circle cx="${X(33)}" cy="${Y(0.86)}" r="5" fill="${C.good}"/>${txt(X(33) + 8, Y(0.86) - 6, l.best, { size: 11, weight: 700 })}`;
    return svg(390, 180, s, l.best);
  },
};

/* ============================================ DETAILED (engineering style) */
export const detail = {
  /** Half-section of the current bottle, nozzle on the left, z to the right. */
  bottle(P) {
    const l = L();
    let b;
    try {
      b = new BottleProfile(P);
    } catch {
      return '';
    }
    const W = 680;
    const H = 300;
    const H0 = b.totalHeight;
    const R = P.diaBot / 2;
    const sc = Math.min(560 / H0, 95 / R);
    const x0 = 70;
    const cy = 150;
    const X = (z) => x0 + z * sc;
    const Yu = (r) => cy - r * sc;
    const Yd = (r) => cy + r * sc;
    const pts = b.outline(1.6);
    const up = pts.map(([r, z]) => [X(z), Yu(r)]);
    const dn = pts.map(([r, z]) => [X(z), Yd(r)]).reverse();
    let s = `<defs><pattern id="hw${++uid}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="${C.water}" stroke-width="1.4"/></pattern></defs>`;
    const hid = `hw${uid}`;
    // water
    const wp = b.liquidOutline(b.zWat, 1.4).filter(([, z]) => z <= b.zWat + 1e-9);
    const wu = wp.map(([r, z]) => [X(z), Yu(r)]);
    const wd = wp.map(([r, z]) => [X(z), Yd(r)]).reverse();
    s += `<path d="${path([...wu, ...wd])}Z" fill="rgba(47,159,240,0.18)"/><path d="${path([...wu, ...wd])}Z" fill="url(#${hid})" opacity="0.55"/>`;
    // shoulder slices (lower half)
    for (let i = 1; i <= 13; i++) {
      const [r, z] = b.bezier(i / 13);
      s += `<line x1="${X(z)}" y1="${cy}" x2="${X(z)}" y2="${Yd(r)}" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>`;
    }
    // wall
    s += `<path d="${path(up)}" fill="none" stroke="${C.line}" stroke-width="2.2"/><path d="${path(dn)}" fill="none" stroke="${C.line}" stroke-width="2.2"/>`;
    // centre line
    s += `<line x1="${x0 - 30}" y1="${cy}" x2="${X(H0) + 20}" y2="${cy}" stroke="${C.muted}" stroke-dasharray="14 4 3 4" stroke-width="1"/>${txt(x0 - 34, cy - 4, '℄', { size: 12, color: C.muted, anchor: 'end' })}`;
    // Bézier control polygon (upper half)
    const cpts = b.cx.map((r, i) => [X(b.cz[i]), Yu(r)]);
    s += `<path d="${path(cpts)}" fill="none" stroke="${C.yellow}" stroke-dasharray="4 3" stroke-width="1.2"/>`;
    cpts.forEach(([x, y], i) => {
      s += `<circle cx="${x}" cy="${y}" r="4" fill="#0b1220" stroke="${C.yellow}" stroke-width="1.8"/>${txt(x + 2, y - 8, `P${i}`, { size: 11, color: C.yellow, weight: 700 })}`;
    });
    // z-axis dimensions (top)
    const zs = [
      [0, '0'],
      [0.8 * P.diaNoz, '0.8Dₙ'],
      [b.shoulderTop, 'z₃'],
      [Math.max(b.cylinderTop, b.shoulderTop), ''],
    ];
    const yAx = 26;
    s += `<line x1="${X(0)}" y1="${yAx}" x2="${X(H0)}" y2="${yAx}" stroke="${C.muted}"/>`;
    for (const [z, lab] of zs) s += `<line x1="${X(z)}" y1="${yAx - 4}" x2="${X(z)}" y2="${yAx + 4}" stroke="${C.muted}"/>${lab ? txt(X(z), yAx - 8, lab, { size: 10.5, color: C.muted, anchor: 'middle' }) : ''}`;
    s += txt(X(H0) + 6, yAx + 4, 'z', { size: 12, italic: true, color: C.muted });
    // section labels
    s += txt(X(0.4 * P.diaNoz), Yu(P.diaNoz / 2) - 14, l.neck, { size: 10.5, color: C.muted, anchor: 'middle' });
    s += txt(X((b.shoulderTop + Math.max(b.cylinderTop, b.shoulderTop)) / 2), Yu(R) - 10, l.body, { size: 10.5, color: C.muted, anchor: 'middle' });
    s += txt(X(H0 - b.domeHeight / 2), Yu(R * 0.6) - 4, l.dome, { size: 10.5, color: C.muted, anchor: 'middle' });
    // water level q
    s += `<line x1="${X(b.zWat)}" y1="${Yu(R) - 4}" x2="${X(b.zWat)}" y2="${Yd(R) + 22}" stroke="${C.water}" stroke-width="1.5" stroke-dasharray="5 3"/>`;
    s += txt(X(b.zWat) + 4, Yd(R) + 20, `q = ${n(b.zWat * 1000, 0)} mm`, { size: 11, color: C.water, weight: 700 });
    s += txt(X(b.zWat / 2), cy + 4, l.water, { size: 11, color: '#cfe8ff', anchor: 'middle', weight: 700 });
    s += txt(X((b.zWat + H0) / 2), cy - 6, `${l.gas}: p, T, V_g`, { size: 11, color: C.text, anchor: 'middle' });
    // diameters
    const xD = X(Math.max(b.cylinderTop, b.shoulderTop) - (Math.max(b.cylinderTop, b.shoulderTop) - b.shoulderTop) * 0.25);
    s += dim(xD, Yu(R), xD, Yd(R), '', {}) + txt(xD + 6, cy + 18, `D_b = ${n(P.diaBot * 1000, 0)} mm`, { size: 11, color: C.text });
    s += `<line x1="${X(0)}" y1="${Yu(P.diaNoz / 2)}" x2="${X(0) - 22}" y2="${Yu(P.diaNoz / 2)}" stroke="${C.muted}"/><line x1="${X(0)}" y1="${Yd(P.diaNoz / 2)}" x2="${X(0) - 22}" y2="${Yd(P.diaNoz / 2)}" stroke="${C.muted}"/>`;
    s += dim(X(0) - 16, Yu(P.diaNoz / 2), X(0) - 16, Yd(P.diaNoz / 2), '');
    s += txt(X(0) - 20, Yd(R) + 22, `Dₙ = ${n(P.diaNoz * 1000, 1)} mm`, { size: 11, color: C.text, anchor: 'start' });
    s += txt(X(0) - 6, cy + 4, l.nozzleExit, { size: 9.5, color: C.muted, anchor: 'end' });
    // legend
    s += txt(W - 10, H - 26, `— — ${l.ctrl} (P0…P3)`, { size: 10.5, color: C.yellow, anchor: 'end' });
    s += txt(W - 10, H - 10, `│ ${l.slices}`, { size: 10.5, color: C.muted, anchor: 'end' });
    s += txt(10, H - 10, `${l.section} · ${n(H0 * 100, 0)} cm × Ø ${n(P.diaBot * 100, 1)} cm`, { size: 10.5, color: C.muted });
    return svg(W, H, s, l.section);
  },

  /** How the design feeds the 1-D flight model vs the separate stability check. */
  couple() {
    const es = getLang() === 'es';
    const T = es
      ? { design: 'Tu diseño', d1: 'botella, agua, presión', d2: 'nariz, aletas, extensión,', d3: 'peso en la nariz', mass: 'masa m', cd: 'Cd (modo Auto)', geo: 'posiciones de las piezas', flight: 'Trayectoria 1-D', f2: 'masa puntual, sube y baja', f3: 'm·a = F − m·g − k·v|v|', stab: 'Revisión de estabilidad', s2: 'CM, CP (Barrowman)', s3: 'margen en calibres', check: '¿vale la suposición', check2: '“vuela derecho”?', ok: '≥ 1: sí, resultado válido', bad: '< 0: daría vueltas, la altura real sería mucho menor', note: 'no entra en las ecuaciones' }
      : { design: 'Your design', d1: 'bottle, water, pressure', d2: 'nose, fins, extension,', d3: 'nose weight', mass: 'mass m', cd: 'Cd (Auto mode)', geo: 'positions of the parts', flight: '1-D trajectory', f2: 'point mass, up and down', f3: 'm·a = F − m·g − k·v|v|', stab: 'Stability check', s2: 'CM, CP (Barrowman)', s3: 'margin in calibres', check: 'is the “flies straight”', check2: 'assumption valid?', ok: '≥ 1: yes, result is valid', bad: '< 0: it would tumble, real height far lower', note: 'not in the equations' };
    const box = (x, y, w, h, color, l1, l2, l3) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="rgba(255,255,255,0.03)" stroke="${color}" stroke-width="1.8"/>` +
      txt(x + w / 2, y + 22, l1, { size: 12.5, weight: 700, anchor: 'middle', color }) +
      txt(x + w / 2, y + 40, l2, { size: 10.5, anchor: 'middle', color: C.muted }) +
      (l3 ? txt(x + w / 2, y + 56, l3, { size: 10.5, anchor: 'middle', color: C.muted }) : '');
    let s = box(10, 70, 150, 76, C.text, T.design, T.d1, T.d2) + txt(85, 141, T.d3, { size: 10.5, anchor: 'middle', color: C.muted });
    s += box(300, 14, 170, 72, C.accent, T.flight, T.f2, T.f3);
    s += box(300, 132, 170, 72, C.violet, T.stab, T.s2, T.s3);
    s += arrow(160, 96, 298, 50, C.accent, 2.2) + txt(230, 60, `${T.mass} + ${T.cd}`, { size: 10.5, anchor: 'middle', color: C.accent, weight: 700 });
    s += arrow(160, 122, 298, 168, C.violet, 2.2) + txt(230, 166, T.geo, { size: 10.5, anchor: 'middle', color: C.violet, weight: 700 });
    s += `<line x1="470" y1="168" x2="520" y2="168" stroke="${C.violet}" stroke-width="2"/><line x1="520" y1="168" x2="520" y2="50" stroke="${C.violet}" stroke-width="2" stroke-dasharray="5 4"/>` + arrow(520, 50, 472, 50, C.violet, 2, 8, '5 4');
    s += txt(528, 96, T.check, { size: 10.5, color: C.violet }) + txt(528, 110, T.check2, { size: 10.5, color: C.violet }) + txt(528, 126, `(${T.note})`, { size: 10, color: C.muted });
    s += txt(300, 222, `✓ ${T.ok}`, { size: 11, color: C.good, weight: 700 }) + txt(300, 238, `✗ ${T.bad}`, { size: 11, color: C.bad, weight: 700 });
    return svg(680, 248, s, 'model coupling');
  },
  fbd() {
    const l = L();
    let s = bottle(180, 80, 230, 30, 8, { water: 0.25, rocket: true });
    s += `<line x1="40" y1="300" x2="330" y2="300" stroke="${C.muted}" stroke-width="2"/>`;
    for (let x = 44; x < 330; x += 12) s += `<line x1="${x}" y1="300" x2="${x - 8}" y2="310" stroke="${C.muted}"/>`;
    s += txt(46, 294, l.ground, { size: 10.5, color: C.muted });
    // h dimension
    s += dim(70, 300, 70, 232, 'h', { color: C.muted, off: 0 });
    // forces
    s += arrow(180, 234, 180, 296, C.water, 2.5, 9, '5 3') + txt(186, 282, `u (${l.exit})`, { size: 10.5, color: C.water });
    s += arrow(140, 226, 140, 120, C.thrust, 5, 13) + txt(130, 150, l.thrustF, { size: 12, color: C.thrust, anchor: 'end', weight: 700 });
    s += arrow(180, 160, 180, 205, C.grav, 3.5, 11) + `<line x1="186" y1="200" x2="222" y2="214" stroke="${C.grav}" stroke-width="1"/>` + txt(226, 218, l.weightW, { size: 11.5, color: C.grav, weight: 700 });
    s += arrow(180, 6, 180, 46, C.drag, 3, 10);
    s += txt(190, 24, l.dragD, { size: 11.5, color: C.drag, weight: 700 });
    s += arrow(262, 190, 262, 100, C.accent, 2, 9, '4 3') + txt(270, 146, l.vel, { size: 11, color: C.accent });
    s += `<circle cx="180" cy="160" r="4" fill="${C.text}"/>${txt(170, 166, 'CG', { size: 9.5, color: C.muted, anchor: 'end' })}`;
    s += txt(196, 118, 'p, T', { size: 11, color: C.text });
    s += `<rect x="20" y="320" width="320" height="30" rx="8" fill="rgba(51,140,237,0.12)" stroke="rgba(51,140,237,0.35)"/>`;
    s += txt(180, 340, l.eqm, { size: 14, anchor: 'middle', italic: true });
    return svg(360, 360, s, 'free-body diagram');
  },

  flow() {
    const l = L();
    const box = (x, y, w, h, title, sub, state, color) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="rgba(255,255,255,0.03)" stroke="${color}" stroke-width="1.8"/>
       ${txt(x + w / 2, y + 18, title, { size: 10.5, color, anchor: 'middle', weight: 700 })}
       ${txt(x + w / 2, y + 36, sub, { size: 12, anchor: 'middle', weight: 700 })}
       ${txt(x + w / 2, y + 54, state, { size: 10.5, color: C.muted, anchor: 'middle' })}`;
    const y = 50;
    const w = 128;
    const h = 66;
    const xs = [10, 172, 334, 496];
    let s = box(xs[0], y, w, h, l.ph0, l.tube, '[h, v]', C.violet);
    s += box(xs[1], y, w, h, l.ph1, l.wthrust, '[h, v, u, q]', '#00a888');
    s += box(xs[2], y, w, h, l.ph2, l.athrust, '[h, v, ρ]', C.warn);
    s += box(xs[3], y, w, h, l.ph3, l.coast, l.closed, C.accent);
    s += arrow(xs[0] + w, y + h / 2, xs[1] - 2, y + h / 2, C.line, 2) + txt((xs[0] + w + xs[1]) / 2, y + h / 2 - 8, l.hLt, { size: 10.5, anchor: 'middle', color: C.muted });
    s += arrow(xs[1] + w, y + h / 2, xs[2] - 2, y + h / 2, C.line, 2) + txt((xs[1] + w + xs[2]) / 2, y + h / 2 - 8, 'q → 0', { size: 10.5, anchor: 'middle', color: C.muted });
    s += arrow(xs[2] + w, y + h / 2, xs[3] - 2, y + h / 2, C.line, 2) + txt((xs[2] + w + xs[3]) / 2, y + h / 2 - 8, l.pa, { size: 10.5, anchor: 'middle', color: C.muted });
    // start
    s += `<circle cx="74" cy="18" r="7" fill="${C.text}"/>` + arrow(74, 26, 74, y - 2, C.line, 2);
    s += `<path d="M82,18 C150,14 236,14 236,${y - 4}" fill="none" stroke="${C.line}" stroke-width="1.6" stroke-dasharray="5 4"/>` + arrow(236, y - 14, 236, y - 2, C.line, 1.6);
    s += txt(160, 12, l.noTube, { size: 10, color: C.muted, anchor: 'middle' });
    // air runs out first
    s += `<path d="M236,${y + h + 2} C236,${y + h + 46} 560,${y + h + 46} 560,${y + h + 4}" fill="none" stroke="${C.line}" stroke-width="1.6" stroke-dasharray="5 4"/>` + arrow(560, y + h + 16, 560, y + h + 3, C.line, 1.6);
    s += txt(398, y + h + 44, `${l.airFirst} (p = pₐ, q > 0)`, { size: 10, color: C.muted, anchor: 'middle' });
    // end
    s += arrow(560, y, 560, 14, C.line, 2) + `<circle cx="560" cy="10" r="7" fill="none" stroke="${C.text}" stroke-width="2"/><circle cx="560" cy="10" r="3.5" fill="${C.text}"/>`;
    s += txt(574, 14, `${l.landing}: ${l.h0}`, { size: 10.5, color: C.muted });
    return svg(640, 180, s, 'phases');
  },

  /** Pressure–volume during the water phase (from the current design). */
  pv(P) {
    const l = L();
    const pa = P.pressAtm / 1e5;
    const p0 = P.gPressure + pa;
    const V0 = (P.volBot - P.volWat) * 1000;
    const V1 = P.volBot * 1000;
    const g = P.gasGamma;
    const pEnd = p0 * Math.pow(V0 / V1, g);
    const ymax = p0 * 1.12;
    const xmax = V1 * 1.08;
    const xmin = Math.max(0, V0 * 0.85);
    const { X, Y, s: ax } = plot(56, 30, 500, 190, xmin, xmax, 0, ymax, {
      xt: niceTicks(xmax, 6).filter((v) => v >= xmin),
      yt: niceTicks(ymax, 5),
      xl: l.gasVol,
      yl: l.pAbs,
      xfmt: (v) => n(v, v < 10 ? 1 : 0),
      yfmt: (v) => n(v, v < 10 ? 1 : 0),
    });
    let s = ax;
    const ad = [];
    const iso = [];
    for (let i = 0; i <= 60; i++) {
      const V = V0 + ((V1 - V0) * i) / 60;
      ad.push([X(V), Y(p0 * Math.pow(V0 / V, g))]);
      iso.push([X(V), Y((p0 * V0) / V)]);
    }
    // work area (above ambient)
    s += `<path d="${path(ad)} L${X(V1)},${Y(pa)} L${X(V0)},${Y(pa)} Z" fill="rgba(51,140,237,0.18)"/>`;
    s += `<line x1="${X(xmin)}" x2="${X(xmax)}" y1="${Y(pa)}" y2="${Y(pa)}" stroke="${C.muted}" stroke-dasharray="3 3"/>${txt(X(xmax), Y(pa) - 5, 'pₐ', { size: 11, color: C.muted, anchor: 'end' })}`;
    s += `<path d="${path(iso)}" fill="none" stroke="${C.muted}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
    s += `<path d="${path(ad)}" fill="none" stroke="${C.accent}" stroke-width="2.6"/>`;
    s += `<circle cx="${X(V0)}" cy="${Y(p0)}" r="5" fill="${C.thrust}"/>${txt(X(V0) + 8, Y(p0) - 6, `${l.start}: ${n(p0, 2)} bar`, { size: 11, weight: 700 })}`;
    s += `<circle cx="${X(V1)}" cy="${Y(pEnd)}" r="5" fill="${C.water}"/>${txt(X(V1) - 8, Y(pEnd) - 10, `${l.end}: ${n(pEnd, 2)} bar`, { size: 11, weight: 700, anchor: 'end' })}`;
    // work done
    const W = ((p0 * 1e5 * V0 * 1e-3) / (g - 1)) * (1 - Math.pow(V0 / V1, g - 1)) - P.pressAtm * (V1 - V0) * 1e-3;
    s += txt(X((V0 + V1) / 2), Y(pa + (pEnd - pa) * 0.4), `${l.work} ≈ ${n(W, 0)} J`, { size: 11.5, anchor: 'middle', color: '#cfe8ff' });
    s += `<line x1="380" y1="44" x2="404" y2="44" stroke="${C.accent}" stroke-width="2.6"/>${txt(410, 48, l.adiab, { size: 10.5, color: C.muted })}`;
    s += `<line x1="380" y1="60" x2="404" y2="60" stroke="${C.muted}" stroke-width="1.6" stroke-dasharray="6 4"/>${txt(410, 64, l.iso, { size: 10.5, color: C.muted })}`;
    return svg(580, 250, s, 'p-V');
  },

  /** Thrust per nozzle area vs pressure ratio: choked / sub-sonic air vs water. */
  nozzle(P) {
    const l = L();
    const g = P.gasGamma;
    const crit = Math.pow(2 / (g + 1), g / (g - 1));
    const critRho = Math.pow(2 / (g + 1), 1 / (g - 1));
    const I = (g - 1) / g;
    const air = (r) => {
      // r = p / pa, result in units of pa
      if (r * crit >= 1) return r * crit + r * critRho * ((2 * g) / (g + 1)) - 1;
      const x = Math.pow(1 / r, 1 / g) * ((2 * g) / (g - 1)) * r * (1 - Math.pow(1 / r, I));
      return x;
    };
    const rmax = Math.max(10, Math.min(60, (P.gPressure * 1e5 + P.pressAtm) / P.pressAtm * 1.15));
    const ymax = 2 * (rmax - 1) * 1.05;
    const { X, Y, s: ax } = plot(56, 26, 500, 200, 1, rmax, 0, ymax, {
      xt: niceTicks(rmax, 6).filter((v) => v >= 1),
      yt: niceTicks(ymax, 5),
      xl: l.ratio,
      yl: l.thrustA,
    });
    let s = ax;
    const rc = 1 / crit;
    s += `<rect x="${X(1)}" y="26" width="${X(rc) - X(1)}" height="200" fill="rgba(0,168,136,0.10)"/><rect x="${X(rc)}" y="26" width="${X(rmax) - X(rc)}" height="200" fill="rgba(210,142,5,0.08)"/>`;
    s += txt((X(1) + X(rc)) / 2, 42, l.sub, { size: 10.5, color: C.muted, anchor: 'middle' });
    s += txt((X(rc) + X(rmax)) / 2, 42, l.choked, { size: 10.5, color: C.muted, anchor: 'middle' });
    s += `<line x1="${X(rc)}" x2="${X(rc)}" y1="26" y2="226" stroke="${C.warn}" stroke-dasharray="4 3"/>${txt(X(rc) + 4, 220, `p/pₐ = ${n(rc, 3)}`, { size: 10.5, color: C.warn })}`;
    const pa = [];
    const pw = [];
    for (let i = 0; i <= 80; i++) {
      const r = 1 + ((rmax - 1) * i) / 80;
      pa.push([X(r), Y(air(r))]);
      pw.push([X(r), Y(2 * (r - 1))]);
    }
    const rw = 1 + (rmax - 1) * 0.45;
    const ra = 1 + (rmax - 1) * 0.62;
    s += `<path d="${path(pw)}" fill="none" stroke="${C.water}" stroke-width="2.4"/>${txt(X(rw) - 6, Y(2 * (rw - 1)) - 8, l.waterJet, { size: 11, color: C.water, anchor: 'end', weight: 700 })}`;
    s += `<path d="${path(pa)}" fill="none" stroke="${C.thrust}" stroke-width="2.4"/>${txt(X(ra) + 6, Y(air(ra)) + 16, `${l.airJet} (γ = ${n(g, 2)})`, { size: 11, color: C.thrust, weight: 700 })}`;
    const r0 = (P.gPressure * 1e5 + P.pressAtm) / P.pressAtm;
    if (r0 <= rmax) s += `<line x1="${X(r0)}" x2="${X(r0)}" y1="26" y2="226" stroke="${C.text}" stroke-width="1" stroke-dasharray="2 3"/>${txt(X(r0) - 4, 216, l.you, { size: 10.5, anchor: 'end' })}`;
    return svg(580, 256, s, 'nozzle regimes');
  },

  /** Coast: simulated height vs. no-drag ballistic arc from burnout. */
  coast(P, res) {
    const l = L();
    if (!res) return '';
    const S = res.summary;
    const sr = res.series;
    const g = P.gravity;
    const tB = S.burnoutTime;
    const hB = S.burnoutAltitude;
    const vB = S.burnoutVelocity;
    const tVac = tB + (vB + Math.sqrt(vB * vB + 2 * g * hB)) / g;
    const hVac = hB + (vB * vB) / (2 * g);
    const xmax = Math.max(S.impactTime, tVac) * 1.03;
    const ymax = Math.max(hVac, S.apogeeAltitude, 1) * 1.1;
    const { X, Y, s: ax } = plot(56, 26, 500, 190, 0, xmax, 0, ymax, {
      xt: niceTicks(xmax, 6),
      yt: niceTicks(ymax, 5),
      xl: l.tAxis,
      yl: l.hAxis,
    });
    let s = ax;
    const vac = [];
    for (let i = 0; i <= 80; i++) {
      const tt = tB + ((tVac - tB) * i) / 80;
      const d = tt - tB;
      vac.push([X(tt), Y(Math.max(0, hB + vB * d - 0.5 * g * d * d))]);
    }
    s += `<path d="${path(vac)}" fill="none" stroke="${C.muted}" stroke-width="1.8" stroke-dasharray="6 4"/>`;
    const sim = [];
    for (let i = 0; i < sr.t.length; i++) sim.push([X(sr.t[i]), Y(sr.h[i])]);
    s += `<path d="${path(sim)}" fill="none" stroke="${C.accent}" stroke-width="2.6"/>`;
    s += `<circle cx="${X(tB)}" cy="${Y(hB)}" r="4.5" fill="${C.thrust}"/>${txt(X(tB) + 6, Y(hB) + 14, l.burnout, { size: 10.5, color: C.thrust })}`;
    s += `<circle cx="${X(S.apogeeTime)}" cy="${Y(S.apogeeAltitude)}" r="5" fill="${C.yellow}"/>${txt(X(S.apogeeTime), Y(S.apogeeAltitude) - 10, `${l.apo} ${n(S.apogeeAltitude, 1)} m`, { size: 11, anchor: 'middle', weight: 700 })}`;
    s += txt(X(tB + (tVac - tB) / 2), Y(hVac) - 8, `${n(hVac, 0)} m`, { size: 10.5, color: C.muted, anchor: 'middle' });
    s += `<line x1="56" y1="262" x2="80" y2="262" stroke="${C.accent}" stroke-width="2.6"/>${txt(86, 266, l.withDrag, { size: 10.5, color: C.muted })}`;
    s += `<line x1="250" y1="262" x2="274" y2="262" stroke="${C.muted}" stroke-width="1.8" stroke-dasharray="6 4"/>${txt(280, 266, l.noDrag, { size: 10.5, color: C.muted })}`;
    if (Number.isFinite(S.terminalVelocity)) s += txt(56, 284, `${l.terminal}: vₜ = ${n(S.terminalVelocity, 1)} m/s`, { size: 10.5, color: C.muted });
    return svg(580, 292, s, 'coast');
  },

  rk4() {
    const l = L();
    const { X, Y, s: ax } = plot(50, 20, 330, 170, 0, 1.25, 0, 1.25, { xl: 't', yl: 'y' });
    let s = ax;
    const f = (x) => 0.15 + 0.9 * x * x;
    const fp = (x) => 1.8 * x;
    const cur = [];
    for (let i = 0; i <= 50; i++) cur.push([X((i / 50) * 1.15), Y(f((i / 50) * 1.15))]);
    s += `<path d="${path(cur)}" fill="none" stroke="${C.accent}" stroke-width="2.4"/>`;
    const t0 = 0.2;
    const h = 0.8;
    const y0 = f(t0);
    const seg = (x, y, slope, len, color, lab) => {
      const x2 = x + len;
      return arrow(X(x), Y(y), X(x2), Y(y + slope * len), color, 2, 8) + txt(X(x2) + 4, Y(y + slope * len), lab, { size: 11, color, weight: 700, base: 'middle' });
    };
    s += `<line x1="${X(t0)}" x2="${X(t0)}" y1="${Y(0)}" y2="${Y(y0)}" stroke="${C.grid}"/><line x1="${X(t0 + h)}" x2="${X(t0 + h)}" y1="${Y(0)}" y2="${Y(f(t0 + h))}" stroke="${C.grid}"/>`;
    s += dim(X(t0), Y(0) - 10, X(t0 + h), Y(0) - 10, 'Δt', { color: C.muted });
    s += seg(t0, y0, fp(t0), 0.28, C.yellow, 'k₁');
    s += seg(t0 + h / 2, f(t0 + h / 2) - 0.05, fp(t0 + h / 2) * 0.92, 0.2, C.thrust, 'k₂');
    s += seg(t0 + h / 2, f(t0 + h / 2) + 0.02, fp(t0 + h / 2), 0.2, C.good, 'k₃');
    s += seg(t0 + h, f(t0 + h), fp(t0 + h), 0.12, C.violet, 'k₄');
    const euler = y0 + fp(t0) * h;
    s += `<circle cx="${X(t0 + h)}" cy="${Y(euler)}" r="5" fill="none" stroke="${C.yellow}" stroke-width="2"/>${txt(X(t0 + h) + 8, Y(euler) + 4, l.euler, { size: 10.5, color: C.yellow })}`;
    s += `<circle cx="${X(t0 + h)}" cy="${Y(f(t0 + h))}" r="5" fill="${C.good}"/>${txt(X(t0 + h) - 8, Y(f(t0 + h)) - 8, l.rk4, { size: 10.5, color: C.good, anchor: 'end' })}`;
    s += `<circle cx="${X(t0)}" cy="${Y(y0)}" r="4" fill="${C.text}"/>`;
    s += txt(215, 226, 'yₙ₊₁ = yₙ + Δt·(k₁ + 2k₂ + 2k₃ + k₄)/6', { size: 13, anchor: 'middle', italic: true });
    return svg(430, 236, s, 'RK4');
  },

  cond() {
    const l = L();
    const { X, Y, s: ax } = plot(50, 24, 330, 150, 0, 10, 0, 10, { xl: l.tsec, yl: l.temp });
    let s = ax;
    const tc = 4.2;
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const tt = (i / 30) * 4.6;
      pts.push([X(tt), Y(9 - tt * 1.05)]);
    }
    const tCross = (9 - tc) / 1.05;
    const pts2 = [];
    for (let i = 0; i <= 30; i++) {
      const tt = tCross + (i / 30) * (10 - tCross);
      pts2.push([X(tt), Y(tc + 1.3 - (tt - tCross) * 0.55)]);
    }
    s += `<line x1="${X(0)}" x2="${X(10)}" y1="${Y(tc)}" y2="${Y(tc)}" stroke="${C.water}" stroke-dasharray="5 4"/>${txt(X(0) + 4, Y(tc) + 14, l.tC, { size: 10.5, color: C.water })}`;
    s += `<path d="${path(pts.filter((p, i) => i / 30 * 4.6 <= tCross))}" fill="none" stroke="${C.thrust}" stroke-width="2.4"/>`;
    s += `<line x1="${X(tCross)}" x2="${X(tCross)}" y1="${Y(tc)}" y2="${Y(tc + 1.3)}" stroke="${C.thrust}" stroke-width="2.4"/>`;
    s += `<path d="${path(pts2)}" fill="none" stroke="${C.thrust}" stroke-width="2.4"/>`;
    s += arrow(X(tCross) + 50, Y(tc + 3.4), X(tCross) + 6, Y(tc + 0.9), C.text, 1.2, 6) + txt(X(tCross) + 54, Y(tc + 3.6), l.jump, { size: 10.5 });
    for (let i = 0; i < 6; i++) s += `<circle cx="${X(tCross + 1 + i * 0.8)}" cy="${Y(tc - 2 - (i % 2) * 0.6)}" r="${7 + (i % 3) * 2}" fill="rgba(255,255,255,0.16)"/>`;
    s += txt(X(tCross + 3), Y(tc - 3.6), l.fog, { size: 11, color: '#fff', anchor: 'middle', weight: 700 });
    return svg(400, 206, s, 'condensation');
  },
};

/* ===================================================== SAFETY (criticality) */
export const safety = {
  ladder(P) {
    const l = L();
    const W = 660;
    const x0 = 40;
    const w = 590;
    const pmin = 0.5;
    const pmax = 250;
    const X = (p) => x0 + ((Math.log10(Math.max(p, pmin)) - Math.log10(pmin)) / (Math.log10(pmax) - Math.log10(pmin))) * w;
    let s = '';
    const axY = 110;
    s += `<line x1="${x0}" x2="${x0 + w}" y1="${axY}" y2="${axY}" stroke="${C.axis}" stroke-width="1.5"/>`;
    for (const v of [0.5, 1, 2, 5, 10, 20, 50, 100, 200]) s += `<line x1="${X(v)}" x2="${X(v)}" y1="${axY - 4}" y2="${axY + 4}" stroke="${C.axis}"/>${txt(X(v), axY + 17, n(v, v < 1 ? 1 : 0), { size: 10, color: C.muted, anchor: 'middle' })}`;
    s += txt(x0 + w, axY + 32, l.bar, { size: 10.5, color: C.muted, anchor: 'end' });
    const refs = [
      [1, l.pressCooker],
      [2.2, l.carTyre],
      [3.5, l.soda],
      [7, l.bike],
      [9, l.espresso],
      [14, l.extinguisher],
      [200, l.scuba],
    ];
    refs.forEach(([p, name], i) => {
      const yy = [22, 46, 70][i % 3];
      const last = i === refs.length - 1;
      s += `<line x1="${X(p)}" x2="${X(p)}" y1="${yy + 4}" y2="${axY}" stroke="${C.muted}" stroke-dasharray="2 3"/><circle cx="${X(p)}" cy="${axY}" r="3.5" fill="${C.text}"/>`;
      s += txt(last ? X(p) + 12 : X(p), yy, `${name} ≈ ${n(p, p < 3 ? 1 : 0)}`, { size: 10.5, anchor: last ? 'end' : 'middle' });
    });
    // bottle bands
    const band = (y, name, safe, b0, b1) => {
      let r = txt(x0, y - 6, name, { size: 11, weight: 700 });
      r += `<rect x="${X(pmin)}" y="${y}" width="${X(safe) - X(pmin)}" height="14" fill="${C.good}" opacity="0.85"/>`;
      r += `<rect x="${X(safe)}" y="${y}" width="${X(b0) - X(safe)}" height="14" fill="${C.warn}" opacity="0.9"/>`;
      r += `<rect x="${X(b0)}" y="${y}" width="${X(b1) - X(b0)}" height="14" fill="${C.bad}"/>`;
      r += `<rect x="${X(b1)}" y="${y}" width="${X(pmax) - X(b1)}" height="14" fill="${C.bad}" opacity="0.35"/>`;
      r += txt(X(b0) + 3, y + 11, `${n(b0, 0)}–${n(b1, 0)}`, { size: 9.5, color: '#fff', weight: 700 });
      return r;
    };
    s += band(164, l.still, 3, 4, 6);
    s += band(210, l.sodaB, 7, 10, 14);
    let y = 256;
    if (P.bottleType === 'tested') {
      const r = P.ratedPressure || 10;
      s += band(y, `${l.tested} (${n(r, 0)} bar)`, r, r, r * 1.25);
      y += 46;
    }
    // legend
    const lg = (x, color, label) => `<rect x="${x}" y="${y - 6}" width="12" height="10" fill="${color}"/>${txt(x + 16, y + 3, label, { size: 10.5, color: C.muted })}`;
    s += lg(x0, C.good, l.safe) + lg(x0 + 90, C.warn, l.caution) + lg(x0 + 200, C.bad, l.burst);
    // you
    const p = P.gPressure;
    s += `<line x1="${X(p)}" x2="${X(p)}" y1="${axY - 10}" y2="${y - 14}" stroke="#fff" stroke-width="2.5"/><polygon points="${X(p) - 6},${axY - 16} ${X(p) + 6},${axY - 16} ${X(p)},${axY - 6}" fill="#fff"/>`;
    s += txt(X(p) + 6, axY - 18, `${l.youAre}: ${n(p, 1)} bar`, { size: 11.5, weight: 700 });
    return svg(W, y + 14, s, 'pressure ladder');
  },

  energy(P) {
    const l = L();
    const g = P.gasGamma;
    const pa = P.pressAtm;
    const Vair = Math.max(1e-6, P.volBot - P.volWat);
    const E = (bar) => {
      const p = bar * 1e5 + pa;
      return ((p * Vair) / (g - 1)) * (1 - Math.pow(pa / p, (g - 1) / g));
    };
    const lim = bottleLimits(P);
    const pmax = Math.max(16, P.gPressure * 1.25, lim.burst * 1.3);
    const ymax = E(pmax) * 1.08;
    const { X, Y, s: ax } = plot(64, 26, 380, 180, 0, pmax, 0, ymax, {
      xt: niceTicks(pmax, 6),
      yt: niceTicks(ymax, 5),
      xl: l.eAxis,
      yl: l.energy,
    });
    let s = ax;
    // zones
    s += `<rect x="${X(0)}" y="26" width="${X(Math.min(lim.safe, pmax)) - X(0)}" height="180" fill="rgba(63,185,80,0.10)"/>`;
    if (lim.burst > lim.safe) s += `<rect x="${X(lim.safe)}" y="26" width="${X(Math.min(lim.burst, pmax)) - X(lim.safe)}" height="180" fill="rgba(210,153,34,0.12)"/>`;
    s += `<rect x="${X(Math.min(lim.burst, pmax))}" y="26" width="${X(pmax) - X(Math.min(lim.burst, pmax))}" height="180" fill="rgba(248,81,73,0.12)"/>`;
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const b = (pmax * i) / 60;
      pts.push([X(b), Y(E(b))]);
    }
    s += `<path d="${path(pts)}" fill="none" stroke="${C.thrust}" stroke-width="2.6"/>`;
    const e0 = E(P.gPressure);
    s += `<circle cx="${X(P.gPressure)}" cy="${Y(e0)}" r="5.5" fill="#fff"/>${txt(X(P.gPressure) - 8, Y(e0) - 10, `${n(e0, 0)} J`, { size: 12, weight: 700, anchor: 'end' })}`;
    // equivalents
    const x2 = 470;
    s += txt(x2, 44, `${n(e0, 0)} J =`, { size: 15, weight: 700 });
    s += txt(x2, 66, `${l.eqDrop} ${n(e0 / 9.81, 0)} m`, { size: 11.5, color: C.muted });
    s += txt(x2, 84, `≈ ${n(e0 / 117, 1)} ×`, { size: 11.5, color: C.muted });
    s += txt(x2, 100, l.pitches, { size: 10.5, color: C.muted });
    // air vs water (hydro test)
    const Ew = Math.pow(P.gPressure * 1e5, 2) * P.volBot / (2 * 2.2e9);
    s += txt(x2, 126, l.hydro, { size: 11, weight: 700 });
    const bar = (y, val, color, label) => {
      const wv = Math.max(2, (Math.log10(Math.max(val, 0.01)) + 2) / (Math.log10(Math.max(e0, 1)) + 2) * 150);
      return `<rect x="${x2}" y="${y}" width="${wv}" height="12" rx="3" fill="${color}"/>${txt(x2, y + 26, `${label}: ${n(val, val < 10 ? 2 : 0)} J`, { size: 10.5, color: C.muted })}`;
    };
    s += bar(136, e0, C.thrust, l.airE) + bar(176, Ew, C.water, l.waterE);
    return svg(640, 240, s, 'stored energy');
  },

  risk(P) {
    const l = L();
    const lim = bottleLimits(P);
    const top = Math.max(lim.burst * 1.4, P.gPressure * 1.1);
    const cx = 150;
    const cy = 140;
    const r = 110;
    const ang = (p) => Math.PI * (1 - Math.min(1, p / top));
    const arc = (p0, p1, color) => {
      const a0 = ang(p0);
      const a1 = ang(Math.min(p1, top));
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy - r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy - r * Math.sin(a1);
      return `<path d="M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}" fill="none" stroke="${color}" stroke-width="22"/>`;
    };
    let s = arc(0, lim.safe, C.good) + arc(lim.safe, lim.burst, C.warn) + arc(lim.burst, top, C.bad);
    const a = ang(P.gPressure);
    s += `<line x1="${cx}" y1="${cy}" x2="${cx + (r - 6) * Math.cos(a)}" y2="${cy - (r - 6) * Math.sin(a)}" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="8" fill="#fff"/>`;
    for (const [p, lab] of [[lim.safe, n(lim.safe, 0)], [lim.burst, n(lim.burst, 0)]]) {
      const aa = ang(p);
      s += txt(cx + (r + 22) * Math.cos(aa), cy - (r + 22) * Math.sin(aa), lab, { size: 11, color: C.muted, anchor: 'middle', base: 'middle' });
    }
    const pct = (P.gPressure / lim.burst) * 100;
    const color = P.gPressure >= lim.burst ? C.bad : P.gPressure > lim.safe ? C.warn : C.good;
    s += txt(320, 70, `${n(pct, 0)}%`, { size: 34, weight: 800, color });
    s += txt(320, 92, l.ofBurst, { size: 11.5, color: C.muted });
    s += txt(320, 120, `${n(P.gPressure, 1)} bar · ${Math.round(P.gPressure * 14.5)} psi`, { size: 13, weight: 700 });
    s += txt(320, 30, l.risk, { size: 12, weight: 700, color: C.muted });
    return svg(560, 160, s, l.risk);
  },
};


/* ======================================================= STABILITY (CM / CP) */
const ZONE = [
  [-99, 0, 'rgba(248,81,73,0.16)', C.bad],
  [0, 1, 'rgba(210,153,34,0.16)', C.warn],
  [1, 3, 'rgba(63,185,80,0.16)', C.good],
  [3, 99, 'rgba(51,140,237,0.14)', C.accent],
];
export const zoneColor = (m) => (ZONE.find((z) => m >= z[0] && m < z[1]) || ZONE[0])[3];
const lerpN = (a, b, t) => a + (b - a) * t;

export function cmSymbol(x, y, r, hollow = false) {
  const q = (a) => `M${x},${y} L${x + r * Math.cos(a)},${y + r * Math.sin(a)} A${r},${r} 0 0 1 ${x + r * Math.cos(a + Math.PI / 2)},${y + r * Math.sin(a + Math.PI / 2)} Z`;
  if (hollow) return `<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(0,0,0,0.3)" stroke="#fff" stroke-width="2" stroke-dasharray="3 2"/>`;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#111" stroke-width="1.5"/><path d="${q(0)}" fill="#111"/><path d="${q(Math.PI)}" fill="#111"/>`;
}
export function cpSymbol(x, y, r) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#e5383b" stroke="#fff" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="${r * 0.3}" fill="#fff"/>`;
}

export const stab = {
  /** Side view of the rocket (nose on the left) with CM (with water / empty) and CP. */
  side(P, rep, { W = 640, H = 300, compact = false } = {}) {
    const l = L();
    if (!rep) return '';
    const g = rep.g;
    const b = rep.bottle;
    const len = g.noseTip - g.tipBot;
    const halfH = g.R + g.span;
    const sc = Math.min((W - (compact ? 40 : 60)) / len, (H - (compact ? 80 : 104)) / (2 * halfH));
    const x0 = 30;
    const cy = compact ? H / 2 - 12 : H / 2 - 14;
    const X = (z) => x0 + (g.noseTip - z) * sc;
    const Yu = (r) => cy - r * sc;
    const Yd = (r) => cy + r * sc;
    let s = '';
    const hw = b.zWat;
    const wp = b.liquidOutline(hw, 1).filter(([, z]) => z <= hw + 1e-9);
    s += `<path d="${path([...wp.map(([r, z]) => [X(z), Yu(r)]), ...wp.map(([r, z]) => [X(z), Yd(r)]).reverse()])}Z" fill="rgba(47,159,240,0.35)"/>`;
    const fin = (sgn) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const z = g.zr1 + ((g.zr0 - g.zr1) * i) / 8;
        pts.push([X(z), cy - sgn * b.radiusAt(z) * sc]);
      }
      pts.push([X(g.tipBot), cy - sgn * (g.R + g.span) * sc], [X(g.tipTop), cy - sgn * (g.R + g.span) * sc]);
      return `<path d="${path(pts)}Z" fill="rgba(255,183,3,0.85)" stroke="#ffb703"/>`;
    };
    s += fin(1) + fin(-1);
    const pts = b.outline(1.2);
    s += `<path d="${path(pts.map(([r, z]) => [X(z), Yu(r)]))}" fill="none" stroke="${C.line}" stroke-width="1.8"/><path d="${path(pts.map(([r, z]) => [X(z), Yd(r)]))}" fill="none" stroke="${C.line}" stroke-width="1.8"/>`;
    if (g.ext > 0.001) {
      const z1 = g.cylTop - 0.06 * g.Db;
      s += `<rect x="${X(g.z0)}" y="${Yu(g.R)}" width="${X(z1) - X(g.z0)}" height="${2 * g.R * sc}" fill="rgba(223,231,241,0.18)" stroke="#dfe7f1" stroke-width="1.4" stroke-dasharray="5 3"/>`;
    }
    const nose = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const r = g.R * 1.035 * lerpN(Math.sqrt(Math.max(0, 1 - t * t)), 1 - Math.pow(t, 1.75), g.sharp);
      nose.push([X(g.z0 + g.L * t), Yu(r)]);
    }
    const noseB = nose.map(([x, y]) => [x, 2 * cy - y]).reverse();
    s += `<path d="${path([...nose, ...noseB])}Z" fill="#e63946" stroke="#ff8a8c" stroke-width="1"/>`;
    s += `<line x1="${x0 - 10}" x2="${X(g.tipBot) + 10}" y1="${cy}" y2="${cy}" stroke="${C.muted}" stroke-dasharray="10 3 2 3"/>`;
    const xcp = x0 + rep.cp.x * sc;
    const xcmL = x0 + rep.launch.cm.x * sc;
    const xcmE = x0 + rep.empty.cm.x * sc;
    const r = compact ? 8 : 10;
    s += cmSymbol(xcmL, cy, r, true) + cmSymbol(xcmE, cy, r) + cpSymbol(xcp, cy, r);
    const fs = compact ? 10 : 11;
    const yTop = Yu(halfH) - 8;
    const yBot = Yd(halfH) + 16;
    s += txt(xcmE, yTop, l.cmEmpty, { size: fs, weight: 700, anchor: 'middle' });
    s += txt(xcp, yTop - (Math.abs(xcp - xcmE) < 60 ? 14 : 0), l.cp, { size: fs, weight: 700, anchor: 'middle', color: '#ff8a8c' });
    s += txt(xcmL, yBot, l.cmFull, { size: fs, weight: 700, anchor: 'middle', color: C.muted });
    const ym = yBot + (compact ? 14 : 18);
    const m = rep.empty.margin;
    s += `<line x1="${xcmE}" x2="${xcmE}" y1="${cy + r}" y2="${ym + 4}" stroke="${C.muted}" stroke-dasharray="2 2"/><line x1="${xcp}" x2="${xcp}" y1="${cy + r}" y2="${ym + 4}" stroke="${C.muted}" stroke-dasharray="2 2"/>`;
    s += dim(xcmE, ym, xcp, ym, '', { color: zoneColor(m) });
    s += txt((xcmE + xcp) / 2, ym + 16, `${l.margin} (${l.emptyM}): ${n(m, 2)} ${l.cal}`, { size: compact ? 10.5 : 11.5, anchor: 'middle', weight: 700, color: zoneColor(m) });
    if (!compact) {
      const xs = W - 30 - g.Db * sc;
      s += `<line x1="${xs}" x2="${W - 30}" y1="${H - 12}" y2="${H - 12}" stroke="${C.text}" stroke-width="3"/>${txt(W - 30, H - 18, `1 ${l.cal} = Ø ${n(g.Db * 1000, 0)} mm`, { size: 10.5, color: C.muted, anchor: 'end' })}`;
      s += txt(x0 - 4, cy - 8, l.noseTipL, { size: 10, color: C.muted });
    }
    return svg(W, H, s, 'CM CP');
  },

  /** Horizontal margin scale with zones and markers for launch / empty. */
  scale(rep, { W = 620 } = {}) {
    const l = L();
    if (!rep) return '';
    const lo = -2;
    const hi = 5;
    const x0 = 20;
    const w = W - 40;
    const X = (m) => x0 + ((Math.min(hi, Math.max(lo, m)) - lo) / (hi - lo)) * w;
    let s = '';
    const names = [l.unstable, l.marginal, l.stable, l.over];
    ZONE.forEach(([a, b, , col], i) => {
      const xa = X(Math.max(a, lo));
      const xb = X(Math.min(b, hi));
      s += `<rect x="${xa}" y="30" width="${xb - xa}" height="16" fill="${col}" opacity="0.85"/>${txt((xa + xb) / 2, 42, names[i], { size: 10, color: '#fff', anchor: 'middle', weight: 700 })}`;
    });
    for (let v = lo; v <= hi; v++) s += `<line x1="${X(v)}" x2="${X(v)}" y1="46" y2="51" stroke="${C.axis}"/>${txt(X(v), 62, v === hi ? `${v} ${l.cal}` : String(v), { size: 9.5, color: C.muted, anchor: v === hi ? 'end' : 'middle' })}`;
    const mk = (m, label, up) =>
      `<polygon points="${X(m) - 6},${up ? 20 : 74} ${X(m) + 6},${up ? 20 : 74} ${X(m)},${up ? 29 : 65}" fill="#fff"/>` +
      txt(X(m), up ? 14 : 90, `${label}: ${n(m, 2)}`, { size: 11, anchor: 'middle', weight: 700, color: zoneColor(m) });
    s += mk(rep.empty.margin, l.emptyM, true) + mk(rep.launch.margin, l.launchM, false);
    return svg(W, 98, s, 'margin');
  },

  /** Margin while the water drains (right = empty). */
  drain(P, rep) {
    const l = L();
    if (!rep) return '';
    const pts = rep.fill;
    const Vmax = Math.max(P.volWat * 1000, 0.01);
    const ys = pts.map((p) => p.margin);
    const ymin = Math.min(-1, Math.floor(Math.min(...ys)));
    const ymax = Math.max(3, Math.ceil(Math.max(...ys)) + 0.5);
    const { X, Y, s: ax } = plot(56, 24, 480, 170, Vmax, 0, ymin, ymax, {
      xt: niceTicks(Vmax, 5),
      yt: Array.from({ length: Math.floor(ymax) - ymin + 1 }, (_, i) => ymin + i),
      xl: l.waterLeft,
      yl: l.calAxis,
      xfmt: (v) => n(v, 2),
    });
    let s = '';
    ZONE.forEach(([a, b, fill]) => {
      const ya = Y(Math.min(Math.max(b, ymin), ymax));
      const yb = Y(Math.max(Math.min(a, ymax), ymin));
      if (yb > ya) s += `<rect x="56" y="${ya}" width="480" height="${yb - ya}" fill="${fill}"/>`;
    });
    s += ax;
    s += `<line x1="56" x2="536" y1="${Y(1)}" y2="${Y(1)}" stroke="${C.good}" stroke-dasharray="5 4"/>${txt(62, Y(1) - 5, l.target, { size: 10.5, color: C.good })}`;
    s += `<path d="${path(pts.map((p) => [X(p.V * 1000), Y(p.margin)]))}" fill="none" stroke="#fff" stroke-width="2.6"/>`;
    s += `<circle cx="${X(Vmax)}" cy="${Y(rep.launch.margin)}" r="5" fill="${zoneColor(rep.launch.margin)}"/>${txt(X(Vmax) + 8, Y(rep.launch.margin) + 4, l.launchM, { size: 11, weight: 700 })}`;
    s += `<circle cx="${X(0)}" cy="${Y(rep.empty.margin)}" r="5" fill="${zoneColor(rep.empty.margin)}"/>${txt(X(0) - 8, Y(rep.empty.margin) - 8, l.emptyM, { size: 11, weight: 700, anchor: 'end' })}`;
    return svg(570, 230, s, 'margin vs water');
  },

  /** Concept: stable vs unstable rocket hit by a gust. */
  concept() {
    const l = L();
    const rocket = (cx, cy, ang, cmAhead) => {
      const a = (ang * Math.PI) / 180;
      const T = (x, y) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
      const poly = (arr) => arr.map(([x, y]) => T(x, y).join(',')).join(' ');
      let s = `<polygon points="${poly([[-70, -12], [40, -12], [70, 0], [40, 12], [-70, 12]])}" fill="#1e2b40" stroke="${C.line}" stroke-width="1.5"/>`;
      s += `<polygon points="${poly([[40, -12], [70, 0], [40, 12]])}" fill="#e63946"/>`;
      s += `<polygon points="${poly([[-70, -12], [-88, -30], [-52, -12]])}" fill="#ffb703"/><polygon points="${poly([[-70, 12], [-88, 30], [-52, 12]])}" fill="#ffb703"/>`;
      const cm = T(cmAhead ? 12 : -40, 0);
      const cp = T(cmAhead ? -40 : 12, 0);
      s += cmSymbol(cm[0], cm[1], 7) + cpSymbol(cp[0], cp[1], 7);
      s += arrow(cp[0], cp[1] - 44, cp[0], cp[1] - 10, C.accent, 2.5, 8);
      return s;
    };
    let s = rocket(130, 112, -14, true) + rocket(420, 112, -14, false);
    s += `<path d="M78,150 A60,60 0 0 0 64,104" fill="none" stroke="${C.good}" stroke-width="2.5"/><polygon points="64,104 58,116 70,114" fill="${C.good}"/>`;
    s += `<path d="M352,104 A60,60 0 0 0 366,150" fill="none" stroke="${C.bad}" stroke-width="2.5"/><polygon points="366,150 356,142 368,138" fill="${C.bad}"/>`;
    s += txt(130, 192, `${l.stableT} → ${l.restoring}`, { size: 12, anchor: 'middle', color: C.good, weight: 700 });
    s += txt(420, 192, `${l.unstableT} → ${l.flips}`, { size: 12, anchor: 'middle', color: C.bad, weight: 700 });
    s += cmSymbol(26, 20, 6) + txt(36, 24, 'CM', { size: 10.5 }) + cpSymbol(80, 20, 6) + txt(90, 24, l.cp, { size: 10.5 });
    s += arrow(130, 12, 130, 28, C.accent, 2, 6) + txt(138, 24, `${l.airForce} (${l.wind})`, { size: 10.5, color: C.muted });
    return svg(560, 202, s, 'stability');
  },
};

/**
 * One fin as a simple trapezoid with its real dimensions (mm):
 * root chord (glued edge), tip chord (outer edge), span and sweep.
 */
export function finTemplate(P) {
  const es = getLang() === 'es';
  let b;
  try {
    b = new BottleProfile(P);
  } catch {
    return { svg: '', dims: null };
  }
  const g = rocketGeometry(P, b);
  const cr = (g.zr1 - g.zr0) * 1000;
  const ct = (g.tipTop - g.tipBot) * 1000;
  const s = g.span * 1000;
  const sweep = (g.zr1 - g.tipTop) * 1000;
  const dims = { root: cr, tip: ct, span: s, sweep, count: g.finCount, thick: Math.min(Math.max(g.Db * 0.025, 0.0015), 0.008) * 1000, top: g.zr1 * 1000 };
  const L = es
    ? { root: 'raíz', tip: 'punta', span: 'ancho', sweep: 'flecha', body: 'botella' }
    : { root: 'root', tip: 'tip', span: 'span', sweep: 'sweep', body: 'bottle' };
  const H = Math.max(cr, sweep + ct);
  const sc = Math.min(200 / s, 190 / H);
  const ox = 70;
  const oy = 28;
  const X = (x) => ox + x * sc;
  const Y = (y) => oy + y * sc;
  const pts = [[0, 0], [s, sweep], [s, sweep + ct], [0, cr]];
  const muted = '#9aa7b6';
  const t = (x, y, str, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 11}" fill="${o.c || '#e8edf3'}" text-anchor="${o.a || 'middle'}" font-weight="${o.w || 700}" font-family="system-ui, sans-serif"${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ''}>${str}</text>`;
  const dimL = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${muted}" stroke-width="1" marker-start="url(#fa)" marker-end="url(#fa)"/>`;
  const ext = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${muted}" stroke-width="0.7" stroke-dasharray="2 2"/>`;
  const mm = (v) => `${Math.round(v)} mm`;
  let o = `<defs><marker id="fa" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${muted}"/></marker></defs>`;
  // bottle wall
  o += `<rect x="${X(0) - 16}" y="${Y(0) - 14}" width="16" height="${Y(H) - Y(0) + 28}" fill="rgba(207,227,255,0.12)" stroke="#cfe3ff" stroke-width="1"/>`;
  o += t(X(0) - 8, (Y(0) + Y(H)) / 2, L.body, { size: 10, c: muted, w: 400, rot: -90 });
  // fin
  o += `<polygon points="${pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="rgba(255,183,3,0.55)" stroke="#ffb703" stroke-width="1.8"/>`;
  // root chord (left)
  o += dimL(X(0) - 30, Y(0), X(0) - 30, Y(cr)) + ext(X(0) - 34, Y(0), X(0) - 16, Y(0)) + ext(X(0) - 34, Y(cr), X(0) - 16, Y(cr));
  o += t(X(0) - 36, (Y(0) + Y(cr)) / 2, `${L.root}: ${mm(cr)}`, { rot: -90, size: 10.5 });
  // tip chord (right)
  o += dimL(X(s) + 14, Y(sweep), X(s) + 14, Y(sweep + ct)) + ext(X(s), Y(sweep), X(s) + 18, Y(sweep)) + ext(X(s), Y(sweep + ct), X(s) + 18, Y(sweep + ct));
  o += t(X(s) + 22, (Y(sweep) + Y(sweep + ct)) / 2 + 4, `${L.tip}: ${mm(ct)}`, { a: 'start' });
  // span (top)
  o += dimL(X(0), Y(0) - 14, X(s), Y(0) - 14) + t((X(0) + X(s)) / 2, Y(0) - 18, `${L.span}: ${mm(s)}`);
  // sweep
  if (Math.abs(sweep) > 2) o += ext(X(0), Y(0), X(s) + 18, Y(0)) + dimL(X(s) + 50, Y(0), X(s) + 50, Y(sweep)) + t(X(s) + 56, (Y(0) + Y(sweep)) / 2 + 4, `${L.sweep}: ${mm(sweep)}`, { a: 'start', w: 400, c: muted });
  const W = X(s) + 150;
  const Ht = Y(H) + 22;
  return { svg: `<svg class="aqt-svg" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="fin dimensions">${o}</svg>`, dims };
}

/** Render every dynamic diagram placeholder inside root. */
export function renderDynamic(root, P, res, rep) {
  const map = {
    'st-side': () => stab.side(P, rep),
    'st-scale': () => stab.scale(rep),
    'st-drain': () => stab.drain(P, rep),
    'd-bottle': () => detail.bottle(P),
    'd-pv': () => detail.pv(P),
    'd-nozzle': () => detail.nozzle(P),
    'd-coast': () => detail.coast(P, res),
    's-ladder': () => safety.ladder(P),
    's-energy': () => safety.energy(P),
    's-risk': () => safety.risk(P),
  };
  root.querySelectorAll('[data-dg]').forEach((el) => {
    const f = map[el.dataset.dg];
    if (f) el.innerHTML = f();
  });
}
