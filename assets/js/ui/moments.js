/**
 * AquaThrust — the key moments of a flight, shown on the charts as numbered event lines
 * (click one for its card) and as a list under the timeline. English and Mexican Spanish.
 *
 *   tube    leaves the launch tube            (only with a launch tube)
 *   stable  static margin becomes positive    (only if it starts negative and ends positive)
 *   fog     the air cools below its dew point (only with humidity)
 *   water   the last water leaves; air thrust starts
 *   vmax    maximum speed: thrust < drag + weight from here on
 *   apogee  highest point
 *   land    back on the ground
 */
import { getLang, loc } from '../i18n.js?v=1.7.1';
import { stabilityReport } from '../physics/stability.js?v=1.7.1';
import { UNITS } from './format.js?v=1.7.1';

const EN = {
  tube: 'Leaves the launch tube',
  stable: 'Becomes stable',
  fog: 'Fog forms',
  water: 'Water gone',
  vmax: 'Maximum speed',
  apogee: 'Highest point',
  land: 'Landing',
  'why.tube': 'The tube stops guiding the rocket. Until now the push came from the air pressing on the end of the tube; from here the water jet takes over. Static margin here: {m} cal.',
  'why.stable': 'As the water leaves, the centre of mass moves forward past the centre of pressure. From here the fins turn the rocket back into line if it tilts.',
  'why.fog': 'The expanding air has cooled to {T} °C, below its dew point, so its moisture condenses into the white cloud you see in real launches.',
  'why.water': 'The last water has left. The compressed air still inside ({p} left) now blasts out for a short, weaker push.',
  'why.vmax': 'The fastest point of the flight: the thrust has dropped below drag + weight, so from here the rocket slows down. Drag is at its largest: {D}, {r}× the empty rocket’s weight.',
  'why.apogee': 'For an instant the speed is zero. Without air it would have reached {hv}: drag cost {loss} ({pct}%).',
  'why.land': 'Back on the ground at {v}. The fall is slower than in a vacuum because drag grows with speed; its terminal speed is {vt}.',
  t: 'time',
  h: 'height',
  v: 'speed',
  a: 'accel.',
  w: 'water',
  listH: 'Key moments of the flight',
  listNote: 'The numbers match the dashed lines on the charts. Click a name here, or a numbered circle on a chart, to see its details and highlight it on every chart. Drag across a chart to zoom in; double-click to zoom out.',
};
const ES = {
  tube: 'Sale del tubo de lanzamiento',
  stable: 'Se vuelve estable',
  fog: 'Se forma la niebla',
  water: 'Se acaba el agua',
  vmax: 'Velocidad máxima',
  apogee: 'Punto más alto',
  land: 'Aterrizaje',
  'why.tube': 'El tubo deja de guiar al cohete. Hasta ahora el empuje venía del aire apretando la punta del tubo; desde aquí manda el chorro de agua. Margen estático aquí: {m} cal.',
  'why.stable': 'Conforme sale el agua, el centro de masa avanza y rebasa al centro de presión. Desde aquí las aletas regresan el cohete a su línea si se inclina.',
  'why.fog': 'El aire, al expandirse, se enfrió hasta {T} °C, por debajo de su punto de rocío, así que su humedad se condensa en la nube blanca que se ve en los lanzamientos reales.',
  'why.water': 'Salió la última agua. El aire comprimido que queda adentro ({p} todavía) sale de golpe y da un empujón corto y más débil.',
  'why.vmax': 'El punto más rápido del vuelo: el empuje ya es menor que el arrastre + el peso, así que desde aquí el cohete frena. El arrastre está en su máximo: {D}, {r} veces el peso del cohete vacío.',
  'why.apogee': 'Por un instante la velocidad es cero. Sin aire habría llegado a {hv}: el arrastre le costó {loss} ({pct}%).',
  'why.land': 'De vuelta en el suelo a {v}. Cae más despacio que en el vacío porque el arrastre crece con la velocidad; su velocidad terminal es {vt}.',
  t: 'tiempo',
  h: 'altura',
  v: 'velocidad',
  a: 'acel.',
  w: 'agua',
  listH: 'Momentos clave del vuelo',
  listNote: 'Los números coinciden con las líneas punteadas de las gráficas. Haz clic en un nombre de aquí, o en un círculo numerado de una gráfica, para ver sus detalles y resaltarlo en todas las gráficas. Arrastra sobre una gráfica para acercar; doble clic para alejar.',
};
const TXT = { en: EN, es: ES };
export const MT = (k, vars) => {
  let s = (TXT[getLang()] || EN)[k] ?? EN[k] ?? k;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, n) => (n in vars ? vars[n] : m));
  return s;
};

export const MOMENT_COLORS = {
  tube: '#9887ef',
  stable: '#7ee787',
  fog: '#c9d4e0',
  water: '#338ced',
  vmax: '#ffd166',
  apogee: '#ff8c42',
  land: '#e86fb3',
};

const nf = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');
const fu = (units, kind, v, d) => {
  const u = UNITS[units][kind];
  return `${nf(v * u.f, d ?? u.d)} ${u.u}`;
};

/** Linear interpolation of a series column at time t. */
export function seriesAt(res, key, t) {
  const s = res.series;
  const n = s.t.length;
  if (t <= s.t[0]) return s[key][0];
  let lo = 0;
  let hi = n - 1;
  if (t >= s.t[hi]) return s[key][hi];
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (s.t[m] <= t) lo = m;
    else hi = m;
  }
  const k = (t - s.t[lo]) / (s.t[hi] - s.t[lo] || 1);
  return s[key][lo] + (s[key][hi] - s[key][lo]) * k;
}

/**
 * @returns {Array<{ids:string[], t:number, n:number, color:string, title:string, why:string, stats:Array<[string,string]>}>}
 */
export function keyMoments(res, units = 'metric') {
  if (!res || !res.series || res.noLiftoff) return [];
  const P = res.params;
  const S = res.summary;
  const ev = res.events;
  const s = res.series;
  const g = P.gravity;
  const raw = [];
  const add = (id, t, vars = {}) => {
    if (Number.isFinite(t)) raw.push({ id, t, vars });
  };
  let rep = null;
  try {
    rep = stabilityReport(P, res);
  } catch {
    rep = null;
  }
  if (ev.tubeExit && P.ltLength > 0 && P.ltDia > 0) add('tube', ev.tubeExit.t, { m: rep && rep.freeFlight ? nf(rep.freeFlight.margin, 2) : '–' });
  // the static margin crosses zero (negative at launch, positive once empty)
  if (rep && rep.trace && rep.launch.margin < 0 && rep.empty.margin > 0) {
    const tr = rep.trace;
    for (let i = 1; i < tr.length; i++) {
      if (tr[i - 1].margin < 0 && tr[i].margin >= 0) {
        const k = -tr[i - 1].margin / (tr[i].margin - tr[i - 1].margin || 1);
        add('stable', tr[i - 1].t + k * (tr[i].t - tr[i - 1].t));
        break;
      }
    }
  }
  if (ev.condensation && P.humidity > 0.05) {
    const Tc = ev.condensation.Tc;
    add('fog', ev.condensation.t, { T: Number.isFinite(Tc) ? nf(Tc - 273.15, 0) : '–' });
  }
  if (ev.waterEnd) add('water', ev.waterEnd.t, { p: fu(units, 'press', Math.max(0, seriesAt(res, 'p', ev.waterEnd.t))) });
  let im = 0;
  for (let i = 0; i < s.v.length; i++) if (s.v[i] > s.v[im]) im = i;
  {
    const rho = (0.028964 * P.pressAtm) / (8.31451 * P.aTemperature);
    const k = 0.5 * rho * P.CDrag * (Math.PI / 4) * P.diaBot * P.diaBot;
    const D = k * s.v[im] * s.v[im];
    add('vmax', s.t[im], { D: fu(units, 'force', D, 1), r: nf(D / (S.coastMass * g), 0) });
  }
  const hv = S.burnoutAltitude + (S.burnoutVelocity * S.burnoutVelocity) / (2 * g);
  add('apogee', S.apogeeTime, {
    hv: fu(units, 'alt', hv),
    loss: fu(units, 'alt', hv - S.apogeeAltitude),
    pct: nf((100 * (hv - S.apogeeAltitude)) / Math.max(hv, 1e-6), 0),
  });
  add('land', S.impactTime, { v: fu(units, 'speed', Math.abs(S.impactVelocity)), vt: fu(units, 'speed', S.terminalVelocity) });

  raw.sort((a, b) => a.t - b.t);
  // merge moments that are too close to tell apart
  const tol = Math.max(0.002, 0.01 * (S.burnoutTime || 0));
  const groups = [];
  for (const m of raw) {
    const last = groups[groups.length - 1];
    if (last && m.t - last.t < tol && m.id !== 'land' && m.id !== 'apogee') last.items.push(m);
    else groups.push({ t: m.t, items: [m] });
  }
  return groups.map((gr, i) => {
    const t = gr.t;
    const h = seriesAt(res, 'h', t);
    const v = seriesAt(res, 'v', t);
    const a = seriesAt(res, 'a', t);
    const w = seriesAt(res, 'w', t);
    const ids = gr.items.map((m) => m.id);
    const stats = [
      [MT('t'), t < 1 ? `${nf(t * 1000, 0)} ms` : `${nf(t, 2)} s`],
      [MT('h'), fu(units, 'alt', h)],
      [MT('v'), fu(units, 'speed', v)],
      [MT('a'), `${nf(a / g, 1)} g`],
    ];
    if (t <= S.burnoutTime + 1e-6 && ids.some((x) => x === 'tube' || x === 'stable')) stats.push([MT('w'), fu(units, 'vol', w)]);
    return {
      ids,
      t,
      n: i + 1,
      color: MOMENT_COLORS[ids[0]],
      title: gr.items.map((m) => MT(m.id)).join(' · '),
      why: gr.items.map((m) => MT('why.' + m.id, m.vars)).join(' '),
      stats,
    };
  });
}

/** HTML of a moment's details card (opened by clicking its line on a chart). */
export function momentCardHTML(m) {
  return `<div class="aqt-mom-head" style="--mc:${m.color}"><i>${m.n}</i><b>${m.title}</b></div>
    <div class="aqt-mom-stats">${m.stats.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
    <p>${m.why}</p>`;
}

/**
 * HTML of the list under the timeline: one chip per moment (number + name only). The
 * details of a moment appear below the chips only once its chip is clicked.
 */
export function momentListHTML(list) {
  if (!list.length) return '';
  return `<div class="aqt-momlist"><h5>${MT('listH')}</h5><ol>${list
    .map((m) => `<li data-mn="${m.n}" style="--mc:${m.color}" role="button" tabindex="0" aria-expanded="false"><i>${m.n}</i><b>${m.title}</b></li>`)
    .join('')}</ol>${list
    .map((m) => `<div class="aqt-momdetail" data-md="${m.n}" style="--mc:${m.color}" hidden>${momentCardHTML(m)}</div>`)
    .join('')}<p class="aqt-tl-note">${MT('listNote')}</p></div>`;
}
