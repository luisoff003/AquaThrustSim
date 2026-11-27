/** AquaThrust — units, number formatting and everyday comparisons (EN / ES-MX). */
import { getLang, loc, t } from '../i18n.js?v=1.7.1';

export const UNITS = {
  metric: {
    alt: { u: 'm', f: 1, d: 1 },
    speed: { u: 'm/s', f: 1, d: 1 },
    force: { u: 'N', f: 1, d: 1 },
    press: { u: 'bar', f: 1e-5, d: 2 },
    impulse: { u: 'N·s', f: 1, d: 1 },
    vol: { u: 'L', f: 1000, d: 2 },
    mass: { u: 'g', f: 1000, d: 0 },
  },
  imperial: {
    alt: { u: 'ft', f: 3.28084, d: 0 },
    speed: { u: 'mph', f: 2.23694, d: 1 },
    force: { u: 'lbf', f: 0.224809, d: 2 },
    press: { u: 'psi', f: 1 / 6894.757, d: 1 },
    impulse: { u: 'lbf·s', f: 0.224809, d: 2 },
    vol: { u: 'fl oz', f: 33814.0227, d: 1 },
    mass: { u: 'oz', f: 35.274, d: 1 },
  },
};

export function conv(system, kind, v) {
  return v * UNITS[system][kind].f;
}

export function fmtU(system, kind, v, digits) {
  const u = UNITS[system][kind];
  const d = digits ?? u.d;
  return `${(v * u.f).toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d })} ${u.u}`;
}

export const num = (v, d = 1) => v.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d });

/* ----------------------------------------------------------- comparisons */
const HEIGHTS = {
  en: [
    [2.0, 'a front door'],
    [3.05, 'a basketball hoop'],
    [5.5, 'a giraffe'],
    [8, 'a two-storey house'],
    [12, 'a telephone pole'],
    [18, 'a blue whale stood on its tail'],
    [30, 'a 10-storey building'],
    [56, 'the Leaning Tower of Pisa'],
    [93, 'the Statue of Liberty (with pedestal)'],
    [139, 'the Great Pyramid of Giza'],
    [169, 'the Washington Monument'],
    [330, 'the Eiffel Tower'],
    [443, 'the Empire State Building'],
    [828, 'the Burj Khalifa'],
  ],
  es: [
    [2.0, 'una puerta'],
    [3.05, 'un aro de básquetbol'],
    [5.5, 'una jirafa'],
    [8, 'una casa de dos pisos'],
    [12, 'un poste de luz'],
    [30, 'El Castillo de Chichén Itzá'],
    [45, 'el Ángel de la Independencia'],
    [65, 'la Pirámide del Sol en Teotihuacan'],
    [67, 'el Monumento a la Revolución'],
    [182, 'la Torre Latinoamericana'],
    [246, 'la Torre Reforma'],
    [279, 'la Torre KOI de Monterrey'],
    [330, 'la Torre Eiffel'],
    [828, 'el Burj Khalifa'],
  ],
};

export function heightComparison(h) {
  const es = getLang() === 'es';
  if (h < 0.5) return es ? 'Apenas se despegó del lanzador.' : 'It barely left the launcher.';
  const list = HEIGHTS[es ? 'es' : 'en'];
  let best = list[0];
  for (const c of list) if (c[0] <= h * 1.15) best = c;
  const ratio = h / best[0];
  const floors = Math.round(h / 3);
  let what;
  if (es) what = ratio > 1.3 ? `${num(ratio, 1)} veces la altura de ${best[1]}` : ratio < 0.87 ? `casi tan alto como ${best[1]}` : `tan alto como ${best[1]}`;
  else what = ratio > 1.3 ? `${num(ratio, 1)}× as high as ${best[1]}` : ratio < 0.87 ? `almost as high as ${best[1]}` : `about as high as ${best[1]}`;
  const tail = h >= 6 ? (es ? ` — como un edificio de ${floors} pisos.` : ` — roughly a ${floors}-storey building.`) : '.';
  return `${what[0].toUpperCase() + what.slice(1)}${tail}`;
}

const SPEEDS = {
  en: [
    [6, 'a jogger'],
    [25, 'a cyclist'],
    [50, 'a car in town'],
    [110, 'a car on the motorway'],
    [120, 'a cheetah at full sprint'],
    [200, 'a racing car on a straight'],
    [300, 'a high-speed train'],
    [400, 'a Formula 1 car at top speed'],
    [900, 'a passenger jet'],
  ],
  es: [
    [6, 'alguien trotando'],
    [25, 'un ciclista'],
    [50, 'un coche en la ciudad'],
    [80, 'el Metro de la CDMX a toda velocidad'],
    [110, 'un coche en la autopista México–Querétaro'],
    [120, 'un guepardo corriendo'],
    [160, 'el Tren Maya'],
    [200, 'un coche de carreras en la recta'],
    [300, 'un tren bala'],
    [350, 'un Fórmula 1 en el Autódromo Hermanos Rodríguez'],
    [900, 'un avión de pasajeros'],
  ],
};

export function speedComparison(ms) {
  const es = getLang() === 'es';
  const kmh = ms * 3.6;
  const list = SPEEDS[es ? 'es' : 'en'];
  let best = list[0];
  for (const s of list) if (s[0] <= kmh * 1.1) best = s;
  return es
    ? `${num(kmh, 0)} km/h (${num(ms * 2.23694, 0)} mph) — más rápido que ${best[1]}.`
    : `${num(kmh, 0)} km/h (${num(ms * 2.23694, 0)} mph) — faster than ${best[1]}.`;
}

export function accelComparison(g) {
  if (getLang() === 'es') {
    if (g < 2) return 'Un empujón suave.';
    if (g < 4) return `Como el momento más intenso de una montaña rusa de Six Flags México (${num(g, 1)} g).`;
    if (g < 10) return 'Más de lo que un piloto de avión de combate aguanta mucho tiempo.';
    if (g < 50) return `${num(g / 3, 0)} veces el empuje que sienten los astronautas al despegar (≈ 3 g).`;
    return `${num(g / 3, 0)} veces lo de un astronauta al despegar — ¡ninguna persona lo resistiría!`;
  }
  if (g < 2) return 'A gentle push.';
  if (g < 4) return `Like a roller coaster's strongest moment (${num(g, 1)} g).`;
  if (g < 10) return 'More than a fighter-jet pilot can stand for long.';
  if (g < 50) return `${num(g / 3, 0)}× the push astronauts feel at launch (≈ 3 g).`;
  return `${num(g / 3, 0)}× an astronaut's launch — far beyond what a person could survive!`;
}

export function liquidName(rho) {
  const d = rho / 1000;
  const i = d < 0.75 ? 0 : d < 0.95 ? 1 : d < 1.015 ? 2 : d < 1.06 ? 3 : d < 1.5 ? 4 : d < 3 ? 5 : d < 12 ? 6 : 7;
  return t('liq.' + i);
}
