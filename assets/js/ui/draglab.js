/**
 * AquaThrust — "Drag lab" floating window: where the drag coefficient comes from,
 * how the extras change it, how much it matters, and three experiments to measure
 * the real value (coast video, several launches, drop test) with calculators and
 * practice data. English and Mexican Spanish.
 */
import { getLang, loc } from '../i18n.js?v=1.7.1';
import { simulate } from '../physics/engine.js?v=1.7.1';
import { estimateCd, cdVsSpeed, V_REF } from '../physics/drag.js?v=1.7.1';
import { bodyExtMass } from '../physics/presets.js?v=1.7.1';
import { fitCoastVideo, fitLaunches, dropTest, dropPlan, airDensity, frontalArea, coastHeight } from '../physics/cdfit.js?v=1.7.1';

/* ------------------------------------------------------------------ texts */
const EN = {
  win: 'Drag lab: air drag coefficient',
  open: 'Drag lab: extras and experiments',
  intro:
    'The drag coefficient C<sub>d</sub> says how “slippery” the rocket is. Drag costs a water rocket a lot of height, and C<sub>d</sub> is the hardest number to know in advance. Here you can see where it comes from, how extras change it, and measure the real value of <b>your</b> rocket.',
  nowAuto: 'Used in the flight (Auto estimate)',
  nowCustom: 'Used in the flight (Custom value)',
  estimate: 'Automatic estimate',
  switchAuto: 'Use the estimate',
  'p.friction': 'Skin friction (body + nose)',
  'p.fins': 'Fin friction',
  'p.nose': 'Nose shape',
  'p.tail': 'Tail (shoulder + base)',
  'p.edges': 'Fin edges',
  'p.joint': 'Body-extension joint',
  'p.addons': 'Add-ons (lug, camera)',
  'p.extra': 'Joints & imperfections (+10%)',
  exH: 'Extras: how the build changes C<sub>d</sub>',
  surface: 'Surface finish',
  's.smooth': 'Smooth bare bottle',
  's.painted': 'Painted / stickers',
  's.tape': 'Lots of tape',
  's.rough': 'Rough (cardboard, glue lumps)',
  finEdge: 'Fin edges',
  'fe.square': 'Square (cut straight)',
  'fe.rounded': 'Rounded (sanded)',
  'fe.airfoil': 'Airfoil (rounded front, sharp back)',
  addons: 'Things stuck on the side',
  lug: 'Launch lug (straw)',
  cam: 'Key-chain camera',
  exNote:
    'These change only the Auto estimate. A body extension adds length (more skin friction) and a joint. Remember to add the mass of a camera to the empty mass.',
  exCustom: 'You are using a Custom C<sub>d</sub>, so the extras do not change the flight.',
  sensH: 'How much does C<sub>d</sub> matter?',
  sens: 'Apogee with C<sub>d</sub> {a}: <b>{h1}</b> · with {b}: <b>{h0}</b> · with {c}: <b>{h2}</b>. An error of 10% in C<sub>d</sub> changes the predicted height by about <b>±{d}</b> ({p}%).',
  speedNote:
    'C<sub>d</sub> is not quite constant: skin friction falls slowly as the speed (and the Reynolds number) grows. The simulation uses the value at {v} m/s for the whole flight; the band shows the speeds your rocket flies at.',
  speedAxis: 'speed (m/s)',
  flightBand: 'your flight',
  expH: 'Measure the real C<sub>d</sub>: three experiments',
  expIntro:
    'An estimate is usually within 10–20% of reality. To do better, measure. The best experiments isolate drag from everything else: after burnout only gravity and drag act on the rocket.',
  rankHead: ['Experiment', 'Accuracy', 'You need', 'Level'],
  rank: [
    ['1 · Video of the coast', '★★★', 'phone on a tripod, a reference of known size, free Tracker software', 'high school (guided) · university'],
    ['2 · Several launches', '★★ (effective C<sub>d</sub>)', 'measuring jug, pressure gauge, altimeter or clinometers', 'whole class'],
    ['3 · Drop test', '★ (needs a tall drop)', 'tape measure, stopwatch or video, a safe high place', 'everyone'],
  ],
  practice: 'Fill with practice data',
  practiceNote: 'Practice data are made by the simulator with a hidden C<sub>d</sub> and some measurement noise. Fit them, then compare.',
  reveal: 'The practice data were made with C<sub>d</sub> = <b>{cd}</b>.',
  fit: 'Calculate C<sub>d</sub>',
  calc: 'Calculating…',
  use: 'Use this C<sub>d</sub>',
  used: 'Custom C<sub>d</sub> set to {cd}.',
  mass: 'Empty rocket mass (g)',
  // video
  vT: '1 · Video of the coast (most accurate)',
  vSteps: [
    'Put the phone on a tripod <b>side-on</b>, 30–60 m from the pad, so the whole climb fits in the picture. Do not zoom or move it during the flight. Slow motion (120–240 fps) is even better.',
    'Put something of known size in the same plane as the rocket (a 2 m pole, or the launcher itself) to calibrate the scale.',
    'After the launch, open the video in <b>Tracker</b> (free, physlets.org/tracker). Set the calibration stick on the reference, the origin at the pad, and mark the nose in each frame (or use auto-tracker).',
    'Copy the time and height columns <b>from the moment the water jet ends up to the top</b>, and paste them below (one “t, h” pair per line).',
    'Weigh the empty rocket on a kitchen scale.',
  ],
  vWhy:
    'Why it works best: after burnout only gravity and drag act. At 30 m/s the drag is several times the weight, so the curve bends clearly away from the parabola it would follow in a vacuum. We fit the exact solution of m·a = −m·g − k·v² to your points.',
  vPts: 'Coast points: time (s), height (m)',
  vPh: '0.42, 18.3\n0.52, 21.1\n0.62, 23.6\n…',
  vRes:
    'C<sub>d</sub> = <b>{cd}</b> (range ≈ {lo}–{hi}) from {n} points. Terminal speed {vt} m/s, speed at the first point {v0} m/s. Fit error {rms} m, a parabola with no air would miss by {rv} m.',
  vFew: 'Paste at least 5 points of the coast (after the water jet, before the top).',
  // launches
  lT: '2 · Several launches (the whole class)',
  lSteps: [
    'Use the same rocket every time. Measure the water with a measuring jug and the pressure with the pump gauge.',
    'Do at least 5 launches on a calm day, changing the water or the pressure (for example 3 water amounts × 2 pressures).',
    'Measure the apogee: a small altimeter in the nose is best. Without one, two students with clinometers on opposite sides at a known distance d: h = d·tan θ + eye height (averaging both cancels the drift).',
    'Type each launch below. The rest of the settings (bottle, mass, launch tube, weather) are taken from the simulator, so set them first.',
  ],
  lWhy:
    'For each launch the simulator searches the C<sub>d</sub> that makes its apogee match yours, then the single best C<sub>d</sub> for all of them (least squares). This is an <b>effective</b> C<sub>d</sub>: errors in the thrust (nozzle losses, leaks, wobbling) also end up in it. If the values drift with the pressure, the thrust model is the problem, not the drag.',
  lKind: 'What you measured',
  kApo: 'apogee (m)',
  kTime: 'flight time (s)',
  kTimeNote: 'Flight time only works if the rocket comes down nose-first: a tumbling rocket falls with much more drag than it climbs with.',
  lCols: ['#', 'water (L)', 'pressure (bar)', 'measured', 'C<sub>d</sub>', 'model'],
  addRow: 'Add a launch',
  clear: 'Clear',
  lRes:
    'Best C<sub>d</sub> for all launches: <b>{cd}</b> (mean of each launch {m} ± {s}, {n} launches). With it the model misses your launches by {e}% on average.',
  lHigh: 'higher than possible',
  lLow: 'too low',
  lOut: 'Some launches cannot be matched with any C<sub>d</sub>: “higher than possible” means the model gives too little thrust or too much mass; “too low” usually means wobbling, a leak or wrong inputs.',
  lNone: 'Type at least one launch with water, pressure and the measured value.',
  // drop
  dT: '3 · Drop test (simple, needs height)',
  dSteps: [
    'Take the empty, dry rocket. Drop it <b>nose-down</b> from a measured height: a stairwell, bleachers or a balcony, with an adult, and with nobody underneath.',
    'For the drag to change the fall time by 10%, the drop must be at least about <b>{h} m</b> for your rocket. Lower drops still work, but the answer is less precise.',
    'Time it from release to impact, at least 5 times. A video (counting frames) is much more precise than a stopwatch.',
  ],
  dWhy:
    'From rest, with drag, the fall distance is h = (v<sub>t</sub>²/g)·ln cosh(g·t/v<sub>t</sub>). We solve it for the terminal speed v<sub>t</sub>, and then C<sub>d</sub> = 2·m·g / (ρ·A·v<sub>t</sub>²). The fall is slower than the flight, so C<sub>d</sub> may come out a little higher (see the speed chart).',
  dH: 'Drop height (m)',
  dNone: 'Type the drop height and at least one fall time.',
  lsq: 'least squares on',
  dTimes: 'Fall times (s), separated by spaces',
  dRes: 'Timing',
  dStop: 'stopwatch (±0.1 s)',
  dVideo: 'video (±0.03 s)',
  dOut:
    'C<sub>d</sub> = <b>{cd}</b> (range {lo}–{hi}). Mean time {t} s ± {e} s; with no air it would take {tf} s, so drag slowed it by {sl}%. It reached {fr}% of its terminal speed ({vt} m/s).',
  dShort: 'The fall is no slower than free fall ({tf} s): the drop is too short to see the drag, or the times are too short. Try a higher drop or a video.',
  dWide: 'The range is wide: a small timing error changes C<sub>d</sub> a lot on a short drop. Drop higher or use video.',
  // compare
  cmpH: 'Comparing your results',
  cmpEst: 'Automatic estimate',
  cmpRatio:
    'The launches need {r}× the drag that the video shows. A difference over ~15% points to the thrust: the model pushes harder than your real rocket (or the other way round). Lower or raise the water efficiency η<sub>w</sub> (Bottle shape → advanced) until the launch C<sub>d</sub> matches the video C<sub>d</sub>: that calibrates the whole model.',
  cmpOk: 'The launch C<sub>d</sub> and the video C<sub>d</sub> agree within 15%: the thrust model fits your rocket well.',
  learn: 'The physics of drag in detail',
};

const ES = {
  win: 'Laboratorio de arrastre: coeficiente de arrastre',
  open: 'Laboratorio de arrastre: extras y experimentos',
  intro:
    'El coeficiente de arrastre C<sub>d</sub> dice qué tan “resbaloso” es el cohete. El arrastre le cuesta mucha altura a un cohete de agua, y C<sub>d</sub> es el número más difícil de conocer de antemano. Aquí puedes ver de dónde sale, cómo lo cambian los extras y medir el valor real de <b>tu</b> cohete.',
  nowAuto: 'Usado en el vuelo (estimación automática)',
  nowCustom: 'Usado en el vuelo (valor personalizado)',
  estimate: 'Estimación automática',
  switchAuto: 'Usar la estimación',
  'p.friction': 'Fricción (cuerpo y nariz)',
  'p.fins': 'Fricción de las aletas',
  'p.nose': 'Forma de la nariz',
  'p.tail': 'Cola (hombro y base)',
  'p.edges': 'Bordes de las aletas',
  'p.joint': 'Unión de la extensión',
  'p.addons': 'Extras pegados (guía, cámara)',
  'p.extra': 'Uniones e imperfecciones (+10%)',
  exH: 'Extras: cómo cambia C<sub>d</sub> según la construcción',
  surface: 'Acabado de la superficie',
  's.smooth': 'Botella lisa, sin nada',
  's.painted': 'Pintada / con calcomanías',
  's.tape': 'Mucha cinta',
  's.rough': 'Rugosa (cartón, grumos de pegamento)',
  finEdge: 'Bordes de las aletas',
  'fe.square': 'Cuadrados (corte recto)',
  'fe.rounded': 'Redondeados (lijados)',
  'fe.airfoil': 'Perfil alar (frente redondo, atrás afilado)',
  addons: 'Cosas pegadas al costado',
  lug: 'Guía de lanzamiento (popote)',
  cam: 'Cámara de llavero',
  exNote:
    'Esto sólo cambia la estimación automática. Una extensión del cuerpo agrega largo (más fricción) y una unión. Acuérdate de sumar la masa de la cámara a la masa vacía.',
  exCustom: 'Estás usando un C<sub>d</sub> personalizado, así que los extras no cambian el vuelo.',
  sensH: '¿Qué tanto importa C<sub>d</sub>?',
  sens: 'Apogeo con C<sub>d</sub> {a}: <b>{h1}</b> · con {b}: <b>{h0}</b> · con {c}: <b>{h2}</b>. Un error de 10% en C<sub>d</sub> cambia la altura calculada en unos <b>±{d}</b> ({p}%).',
  speedNote:
    'C<sub>d</sub> no es del todo constante: la fricción baja poco a poco al subir la velocidad (y el número de Reynolds). La simulación usa el valor a {v} m/s en todo el vuelo; la franja marca las velocidades a las que vuela tu cohete.',
  speedAxis: 'velocidad (m/s)',
  flightBand: 'tu vuelo',
  expH: 'Mide el C<sub>d</sub> real: tres experimentos',
  expIntro:
    'Una estimación suele quedar a 10–20% de la realidad. Para hacerlo mejor, hay que medir. Los mejores experimentos separan el arrastre de todo lo demás: cuando se acaba el empuje, sobre el cohete sólo actúan la gravedad y el arrastre.',
  rankHead: ['Experimento', 'Precisión', 'Necesitas', 'Nivel'],
  rank: [
    ['1 · Video del vuelo libre', '★★★', 'celular en tripié, una referencia de tamaño conocido, el programa gratuito Tracker', 'prepa (guiado) · universidad'],
    ['2 · Varios lanzamientos', '★★ (C<sub>d</sub> efectivo)', 'jarra medidora, manómetro, altímetro o clinómetros', 'todo el grupo'],
    ['3 · Prueba de caída', '★ (necesita altura)', 'cinta métrica, cronómetro o video, un lugar alto y seguro', 'todos'],
  ],
  practice: 'Llenar con datos de práctica',
  practiceNote: 'Los datos de práctica los genera el simulador con un C<sub>d</sub> escondido y algo de ruido de medición. Ajústalos y luego compara.',
  reveal: 'Los datos de práctica se hicieron con C<sub>d</sub> = <b>{cd}</b>.',
  fit: 'Calcular C<sub>d</sub>',
  calc: 'Calculando…',
  use: 'Usar este C<sub>d</sub>',
  used: 'C<sub>d</sub> personalizado: {cd}.',
  mass: 'Masa del cohete vacío (g)',
  vT: '1 · Video del vuelo libre (el más preciso)',
  vSteps: [
    'Pon el celular en un tripié <b>de lado</b>, a 30–60 m de la base, para que quepa toda la subida. No hagas zoom ni lo muevas durante el vuelo. La cámara lenta (120–240 fps) es todavía mejor.',
    'Pon algo de tamaño conocido en el mismo plano que el cohete (un palo de 2 m, o el mismo lanzador) para calibrar la escala.',
    'Después del lanzamiento, abre el video en <b>Tracker</b> (gratis, physlets.org/tracker). Coloca la vara de calibración sobre la referencia, el origen en la base, y marca la nariz en cada cuadro (o usa el seguimiento automático).',
    'Copia las columnas de tiempo y altura <b>desde que se acaba el chorro de agua hasta el punto más alto</b>, y pégalas abajo (un par “t, h” por renglón).',
    'Pesa el cohete vacío en una báscula de cocina.',
  ],
  vWhy:
    'Por qué es el mejor: después del empuje sólo actúan la gravedad y el arrastre. A 30 m/s el arrastre es varias veces el peso, así que la curva se separa claramente de la parábola que seguiría sin aire. Ajustamos la solución exacta de m·a = −m·g − k·v² a tus puntos.',
  vPts: 'Puntos del vuelo libre: tiempo (s), altura (m)',
  vPh: '0.42, 18.3\n0.52, 21.1\n0.62, 23.6\n…',
  vRes:
    'C<sub>d</sub> = <b>{cd}</b> (rango ≈ {lo}–{hi}) con {n} puntos. Velocidad terminal {vt} m/s, velocidad en el primer punto {v0} m/s. Error del ajuste {rms} m; una parábola sin aire fallaría por {rv} m.',
  vFew: 'Pega al menos 5 puntos del vuelo libre (después del chorro, antes del punto más alto).',
  lT: '2 · Varios lanzamientos (todo el grupo)',
  lSteps: [
    'Usa siempre el mismo cohete. Mide el agua con una jarra medidora y la presión con el manómetro de la bomba.',
    'Haz al menos 5 lanzamientos en un día sin viento, cambiando el agua o la presión (por ejemplo 3 cantidades de agua × 2 presiones).',
    'Mide el apogeo: lo mejor es un altímetro pequeño en la nariz. Si no hay, dos alumnos con clinómetros en lados opuestos a una distancia d conocida: h = d·tan θ + altura de los ojos (el promedio de los dos cancela la deriva).',
    'Escribe cada lanzamiento abajo. Los demás ajustes (botella, masa, tubo de lanzamiento, clima) se toman del simulador, así que ponlos primero.',
  ],
  lWhy:
    'Para cada lanzamiento el simulador busca el C<sub>d</sub> con el que su apogeo coincide con el tuyo, y luego el mejor C<sub>d</sub> único para todos (mínimos cuadrados). Es un C<sub>d</sub> <b>efectivo</b>: los errores del empuje (pérdidas en la tobera, fugas, bamboleo) también quedan dentro. Si los valores cambian con la presión, el problema es el modelo de empuje, no el arrastre.',
  lKind: 'Qué mediste',
  kApo: 'apogeo (m)',
  kTime: 'tiempo de vuelo (s)',
  kTimeNote: 'El tiempo de vuelo sólo sirve si el cohete baja con la nariz por delante: un cohete que da vueltas cae con mucho más arrastre del que tiene al subir.',
  lCols: ['#', 'agua (L)', 'presión (bar)', 'medido', 'C<sub>d</sub>', 'modelo'],
  addRow: 'Agregar lanzamiento',
  clear: 'Borrar',
  lRes:
    'Mejor C<sub>d</sub> para todos los lanzamientos: <b>{cd}</b> (promedio de cada lanzamiento {m} ± {s}, {n} lanzamientos). Con él, el modelo falla en tus lanzamientos por {e}% en promedio.',
  lHigh: 'más alto de lo posible',
  lLow: 'demasiado bajo',
  lOut: 'Algunos lanzamientos no coinciden con ningún C<sub>d</sub>: “más alto de lo posible” quiere decir que el modelo da poco empuje o mucha masa; “demasiado bajo” casi siempre es bamboleo, una fuga o datos mal puestos.',
  lNone: 'Escribe al menos un lanzamiento con agua, presión y el valor medido.',
  dT: '3 · Prueba de caída (sencilla, necesita altura)',
  dSteps: [
    'Toma el cohete vacío y seco. Suéltalo <b>con la nariz hacia abajo</b> desde una altura medida: un cubo de escaleras, unas gradas o un balcón, con un adulto, y sin nadie abajo.',
    'Para que el arrastre cambie el tiempo de caída en 10%, la caída debe ser de al menos unos <b>{h} m</b> para tu cohete. Desde más bajo también funciona, pero el resultado es menos preciso.',
    'Toma el tiempo desde que lo sueltas hasta que llega al suelo, al menos 5 veces. Un video (contando cuadros) es mucho más preciso que un cronómetro.',
  ],
  dWhy:
    'Partiendo del reposo y con arrastre, la distancia de caída es h = (v<sub>t</sub>²/g)·ln cosh(g·t/v<sub>t</sub>). La resolvemos para la velocidad terminal v<sub>t</sub>, y luego C<sub>d</sub> = 2·m·g / (ρ·A·v<sub>t</sub>²). La caída es más lenta que el vuelo, así que C<sub>d</sub> puede salir un poco más alto (mira la gráfica de velocidad).',
  dH: 'Altura de la caída (m)',
  dNone: 'Escribe la altura de la caída y al menos un tiempo.',
  lsq: 'mínimos cuadrados en',
  dTimes: 'Tiempos de caída (s), separados por espacios',
  dRes: 'Medición',
  dStop: 'cronómetro (±0.1 s)',
  dVideo: 'video (±0.03 s)',
  dOut:
    'C<sub>d</sub> = <b>{cd}</b> (rango {lo}–{hi}). Tiempo promedio {t} s ± {e} s; sin aire tardaría {tf} s, así que el arrastre lo frenó {sl}%. Llegó al {fr}% de su velocidad terminal ({vt} m/s).',
  dShort: 'La caída no es más lenta que una caída libre ({tf} s): la altura es muy poca para notar el arrastre, o los tiempos son muy cortos. Prueba más alto o con video.',
  dWide: 'El rango es amplio: en una caída corta, un pequeño error en el tiempo cambia mucho C<sub>d</sub>. Suéltalo desde más alto o usa video.',
  cmpH: 'Comparando tus resultados',
  cmpEst: 'Estimación automática',
  cmpRatio:
    'Los lanzamientos necesitan {r}× el arrastre que muestra el video. Una diferencia de más de ~15% apunta al empuje: el modelo empuja más fuerte que tu cohete real (o al revés). Baja o sube la eficiencia del agua η<sub>w</sub> (Forma de la botella → avanzado) hasta que el C<sub>d</sub> de los lanzamientos coincida con el del video: así calibras todo el modelo.',
  cmpOk: 'El C<sub>d</sub> de los lanzamientos y el del video coinciden dentro de 15%: el modelo de empuje describe bien tu cohete.',
  learn: 'La física del arrastre a detalle',
};

const TXT = { en: EN, es: ES };
const T = (k, vars) => {
  const d = TXT[getLang()] || EN;
  let s = d[k] ?? EN[k] ?? k;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, n) => (n in vars ? vars[n] : m));
  return s;
};
const f = (x, d = 2) => (Number.isFinite(x) ? x.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');
const parseNum = (s) => {
  if (s == null) return NaN;
  const v = Number(String(s).trim().replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
};
const esc = (s) => String(s ?? '').replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]);
const gauss = () => {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};

const COLORS = { friction: '#338ced', fins: '#00a888', nose: '#e63946', tail: '#d29922', edges: '#9887ef', joint: '#ff8c42', addons: '#e86fb3', extra: '#6b7a8f' };
const BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5a1.5 1.5 0 0 0 0 3H20v-2h0v2H6.5A2.5 2.5 0 0 1 4 19.5v-15z"/></svg>';

export function dragLabTemplate() {
  return `
  <section class="aqt-learn aqt-learn-float aqt-stabwin aqt-dragwin" data-id="dragWin" hidden aria-label="${T('win').replace(/<[^>]+>/g, '')}">
    <div class="aqt-learn-head" data-id="dragHead">
      <h3><span class="aqt-grip" aria-hidden="true">⠿</span>${T('win')}</h3>
      <div class="aqt-learn-tools"><button type="button" class="aqt-icon" data-id="dragClose" aria-label="✕">✕</button></div>
    </div>
    <div class="aqt-learn-body aqt-dl">
      <p class="aqt-note">${T('intro')}</p>
      <div data-dl="now"></div>
      <h5 class="aqt-subhead">${T('exH')}</h5>
      <label class="aqt-selectrow"><span>${T('surface')}</span><select data-dl="surface">${['smooth', 'painted', 'tape', 'rough'].map((k) => `<option value="${k}">${T('s.' + k)}</option>`).join('')}</select></label>
      <label class="aqt-selectrow"><span>${T('finEdge')}</span><select data-dl="finEdge">${['square', 'rounded', 'airfoil'].map((k) => `<option value="${k}">${T('fe.' + k)}</option>`).join('')}</select></label>
      <div class="aqt-selectrow"><span>${T('addons')}</span><span class="aqt-dlchecks"><label class="aqt-check"><input type="checkbox" data-dl="lug"> ${T('lug')}</label><label class="aqt-check"><input type="checkbox" data-dl="cam"> ${T('cam')}</label></span></div>
      <p class="aqt-typenote" data-dl="exNote"></p>
      <h5 class="aqt-subhead">${T('sensH')}</h5>
      <div data-dl="sens"></div>
      <h5 class="aqt-subhead">${T('expH')}</h5>
      <p class="aqt-typenote">${T('expIntro')}</p>
      <div class="aqt-dlscroll"><table class="aqt-sym aqt-dlrank"><thead><tr>${T('rankHead').map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${T('rank')
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>
      <p class="aqt-typenote">${T('practiceNote')}</p>

      <details class="aqt-adv aqt-dlexp" data-exp="video">
        <summary>${T('vT')}</summary>
        <ol class="aqt-rules">${T('vSteps').map((s) => `<li>${s}</li>`).join('')}</ol>
        <p class="aqt-dlwhy">${T('vWhy')}</p>
        <div class="aqt-eq aqt-eq-l"><i>h</i>(<i>t</i>) = <i>h</i><sub>0</sub> + (<i>v</i><sub>t</sub>²/<i>g</i>)·ln[cos(φ<sub>0</sub> − <i>g</i>(<i>t</i>−<i>t</i><sub>0</sub>)/<i>v</i><sub>t</sub>) / cos φ<sub>0</sub>], &nbsp; φ<sub>0</sub> = atan(<i>v</i><sub>0</sub>/<i>v</i><sub>t</sub>)<br><i>v</i><sub>t</sub> = √(2<i>mg</i> / (ρ<i>C</i><sub>d</sub><i>A</i>)) &nbsp; → ${T('lsq')} (<i>C</i><sub>d</sub>, <i>v</i><sub>0</sub>, <i>h</i><sub>0</sub>)</div>
        <label class="aqt-dllabel">${T('mass')} <input class="aqt-dlin" data-dl="vMass" inputmode="decimal"></label>
        <label class="aqt-dllabel aqt-dlblock">${T('vPts')}<textarea class="aqt-dlin aqt-dlta" data-dl="vPts" rows="6" placeholder="${T('vPh')}"></textarea></label>
        <div class="aqt-dlbtns"><button type="button" class="aqt-btn" data-dla="vFit">${T('fit')}</button><button type="button" class="aqt-btn aqt-btn-ghost" data-dla="vPractice">${T('practice')}</button></div>
        <div data-dl="vOut"></div>
      </details>

      <details class="aqt-adv aqt-dlexp" data-exp="launch">
        <summary>${T('lT')}</summary>
        <ol class="aqt-rules">${T('lSteps').map((s) => `<li>${s}</li>`).join('')}</ol>
        <p class="aqt-dlwhy">${T('lWhy')}</p>
        <label class="aqt-selectrow"><span>${T('lKind')}</span><select data-dl="lKind"><option value="apogee">${T('kApo')}</option><option value="time">${T('kTime')}</option></select></label>
        <p class="aqt-typenote" data-dl="lKindNote" hidden>${T('kTimeNote')}</p>
        <div class="aqt-dlscroll" data-dl="lTable"></div>
        <div class="aqt-dlbtns"><button type="button" class="aqt-btn aqt-btn-ghost" data-dla="lAdd">${T('addRow')}</button><button type="button" class="aqt-btn aqt-btn-ghost" data-dla="lClear">${T('clear')}</button><button type="button" class="aqt-btn" data-dla="lFit">${T('fit')}</button><button type="button" class="aqt-btn aqt-btn-ghost" data-dla="lPractice">${T('practice')}</button></div>
        <div data-dl="lOut"></div>
      </details>

      <details class="aqt-adv aqt-dlexp" data-exp="drop">
        <summary>${T('dT')}</summary>
        <ol class="aqt-rules" data-dl="dSteps"></ol>
        <p class="aqt-dlwhy">${T('dWhy')}</p>
        <div class="aqt-dlrow">
          <label class="aqt-dllabel">${T('mass')} <input class="aqt-dlin" data-dl="dMass" inputmode="decimal"></label>
          <label class="aqt-dllabel">${T('dH')} <input class="aqt-dlin" data-dl="dH" inputmode="decimal"></label>
        </div>
        <label class="aqt-dllabel aqt-dlblock">${T('dTimes')} <input class="aqt-dlin" data-dl="dTimes" placeholder="2.31 2.28 2.35 2.30 2.33"></label>
        <label class="aqt-selectrow"><span>${T('dRes')}</span><select data-dl="dRes"><option value="0.1">${T('dStop')}</option><option value="0.03">${T('dVideo')}</option></select></label>
        <div class="aqt-dlbtns"><button type="button" class="aqt-btn" data-dla="dFit">${T('fit')}</button><button type="button" class="aqt-btn aqt-btn-ghost" data-dla="dPractice">${T('practice')}</button></div>
        <div data-dl="dOut"></div>
      </details>

      <div data-dl="cmp"></div>
      <button type="button" class="aqt-btn aqt-learnbtn" data-dla="learn">${BOOK}<span>${T('learn')}</span></button>
    </div>
  </section>`;
}

/* ------------------------------------------------------------- the window */
export class DragLab {
  constructor(app) {
    this.app = app;
    this.state = {
      vMass: '',
      vPts: '',
      lKind: 'apogee',
      rows: null,
      dMass: '',
      dH: '',
      dTimes: '',
      dRes: '0.1',
    };
    this.results = {};
    this.practice = {};
    this.open = false;
    this.lastSensKey = '';
  }

  $(k) {
    return this.app.root.querySelector(`[data-dl="${k}"]`);
  }

  get win() {
    return this.app.$('dragWin');
  }

  dryMass() {
    const P = this.app.P;
    return P.massBot + (P.noseMass || 0) + bodyExtMass(P);
  }

  /** Called after every (re)render of the interface. */
  bind() {
    const app = this.app;
    const w = this.win;
    if (!w) return;
    app.makeDraggable(w, app.$('dragHead'));
    app.$('dragClose').addEventListener('click', () => this.show(false));
    app.$('dragOpen')?.addEventListener('click', () => this.show(true));
    const P = () => app.P;
    const setP = (k, v) => {
      app.P[k] = v;
      app.clearPreset();
      app.paramsChanged();
    };
    this.$('surface').addEventListener('change', (e) => setP('surface', e.target.value));
    this.$('finEdge').addEventListener('change', (e) => setP('finEdge', e.target.value));
    const addons = () => setP('addons', [this.$('lug').checked ? 'lug' : '', this.$('cam').checked ? 'cam' : ''].filter(Boolean).join('+'));
    this.$('lug').addEventListener('change', addons);
    this.$('cam').addEventListener('change', addons);
    // keep typed values across re-renders
    for (const k of ['vMass', 'vPts', 'dMass', 'dH', 'dTimes', 'dRes', 'lKind']) {
      const el = this.$(k);
      el.value = this.state[k];
      el.addEventListener('input', () => {
        this.state[k] = el.value;
        if (k === 'lKind') this.renderTable();
      });
      el.addEventListener('change', () => {
        this.state[k] = el.value;
        if (k === 'lKind') this.renderTable();
      });
    }
    if (!this.state.rows) {
      const p = P();
      this.state.rows = [0.7, 1, 1.3].map((x) => ({ water: f(p.volWat * 1000 * x, 2), press: f(p.gPressure, 1), value: '' }));
    }
    this.renderTable();
    w.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dla]');
      if (!b) return;
      const a = b.dataset.dla;
      if (a === 'auto') setP('cdMode', 'auto');
      else if (a === 'use') this.useCd(Number(b.dataset.v));
      else if (a === 'learn') {
        app.learn.tab = 'detailed';
        app.applyLearnTab();
        app.toggleLearn(true);
      } else if (a === 'vFit') this.fitVideo();
      else if (a === 'vPractice') this.practiceVideo();
      else if (a === 'lAdd') {
        this.readTable();
        const last = this.state.rows[this.state.rows.length - 1] || { water: '', press: '' };
        this.state.rows.push({ water: last.water, press: last.press, value: '' });
        this.renderTable();
      } else if (a === 'lClear') {
        this.state.rows = [{ water: '', press: '', value: '' }];
        delete this.results.launch;
        delete this.practice.launch;
        this.$('lOut').innerHTML = '';
        this.renderTable();
        this.renderCompare();
      } else if (a === 'lFit') this.fitLaunch();
      else if (a === 'lPractice') this.practiceLaunch();
      else if (a === 'dFit') this.fitDrop();
      else if (a === 'dPractice') this.practiceDrop();
    });
    // results survive a language switch
    if (this.results.video) this.fitVideo(true);
    if (this.results.launch) this.renderLaunch(this.results.launch);
    if (this.results.drop) this.fitDrop(true);
    if (this.open) this.show(true);
  }

  show(open) {
    this.open = open;
    const w = this.win;
    if (!w) return;
    w.hidden = !open;
    if (open && !w.dataset.placed) {
      const ww = Math.min(560, window.innerWidth - 24);
      w.style.width = `${ww}px`;
      w.style.left = `${Math.max(12, window.innerWidth - ww - 60)}px`;
      w.style.top = '70px';
      w.dataset.placed = '1';
    }
    if (open) this.update(this.app.result, true);
  }

  useCd(cd) {
    const app = this.app;
    if (!(cd > 0)) return;
    app.P.cdMode = 'custom';
    app.P.CDrag = Math.round(Math.min(1.5, Math.max(0.05, cd)) * 100) / 100;
    app.clearPreset();
    app.refreshControls();
    app.paramsChanged();
    app.toast(T('used', { cd: f(app.P.CDrag, 2) }).replace(/<[^>]+>/g, ''));
  }

  /** Refresh the parts that depend on the design (cheap; sims only when open). */
  update(res, force = false) {
    if (!this.win) return;
    const P = this.app.P;
    this.$('surface').value = P.surface || 'smooth';
    this.$('finEdge').value = P.finEdge || 'square';
    this.$('lug').checked = String(P.addons || '').includes('lug');
    this.$('cam').checked = String(P.addons || '').includes('cam');
    if (!this.open && !force) return;
    const est = estimateCd(P);
    const auto = P.cdMode === 'auto';
    // current Cd and breakdown
    let now = '';
    if (est) {
      const keys = Object.keys(COLORS).filter((k) => est.parts[k] > 1e-5);
      const bar = keys.map((k) => `<i style="flex-grow:${est.parts[k]};background:${COLORS[k]}" title="${T('p.' + k)}: ${f(est.parts[k], 3)}"></i>`).join('');
      const rows = keys
        .map((k) => `<li><i style="background:${COLORS[k]}"></i>${T('p.' + k)}<b>${f(est.parts[k], 3)}</b><em>${f((100 * est.parts[k]) / est.total, 0)}%</em></li>`)
        .join('');
      now = `<div class="aqt-stabnums aqt-dlnow">
          <div><span>${auto ? T('nowAuto') : T('nowCustom')}</span><b>C<sub>d</sub> = ${f(P.CDrag, 2)}</b></div>
          <div><span>${T('estimate')}</span><b>${f(est.total, 3)}</b>${auto ? '' : `<button type="button" class="aqt-btn aqt-btn-sm" data-dla="auto">${T('switchAuto')}</button>`}</div>
        </div>
        <div class="aqt-cdbar">${bar}</div><ul class="aqt-cdlist aqt-dllist">${rows}</ul>`;
    }
    this.$('now').innerHTML = now;
    this.$('exNote').innerHTML = auto ? T('exNote') : `${T('exCustom')} ${T('exNote')}`;
    // drop-test planning height
    const m = this.dryMass();
    const rho = airDensity(P);
    const A = frontalArea(P);
    const vtEst = Math.sqrt((2 * m * P.gravity) / (rho * Math.max(0.05, P.CDrag) * A));
    const hPlan = dropPlan(vtEst, P.gravity, 0.1);
    this.$('dSteps').innerHTML = T('dSteps')
      .map((s) => `<li>${s.replace('{h}', f(hPlan, 0))}</li>`)
      .join('');
    if (!this.state.vMass) this.$('vMass').placeholder = f(m * 1000, 0);
    if (!this.state.dMass) this.$('dMass').placeholder = f(m * 1000, 0);
    if (!this.state.dH) this.$('dH').placeholder = f(Math.max(5, Math.round(hPlan)), 0);
    this.renderSens(res, est);
    this.renderCompare();
  }

  renderSens(res, est) {
    const P = this.app.P;
    const el = this.$('sens');
    const key = JSON.stringify(P);
    if (key === this.lastSensKey && el.innerHTML) return;
    this.lastSensKey = key;
    const U = this.app.units;
    const apo = (cd) => {
      try {
        const r = simulate({ ...P, cdMode: 'custom', CDrag: cd }, { boostSamples: 40, coastSamples: 8 });
        return r.ok ? r.summary.apogeeAltitude : NaN;
      } catch {
        return NaN;
      }
    };
    const c0 = P.CDrag;
    const h0 = res && res.summary ? res.summary.apogeeAltitude : apo(c0);
    const h1 = apo(c0 * 0.8);
    const h2 = apo(c0 * 1.2);
    const fa = U === 'imperial' ? 3.28084 : 1;
    const ua = U === 'imperial' ? 'ft' : 'm';
    const hs = (h) => `${f(h * fa, 1)} ${ua}`;
    const d10 = Math.abs(h1 - h2) / 4;
    let html = `<p class="aqt-dlwhy">${T('sens', { a: f(c0 * 0.8, 2), b: f(c0, 2), c: f(c0 * 1.2, 2), h0: hs(h0), h1: hs(h1), h2: hs(h2), d: hs(d10), p: f((100 * d10) / h0, 0) })}</p>`;
    // Cd vs speed chart
    const pts = cdVsSpeed(P);
    if (pts.length > 1) {
      const vmax = res && res.summary ? res.summary.maxVelocity : NaN;
      const W = 360;
      const H = 140;
      const x0 = 40;
      const y0 = 12;
      const w = W - x0 - 12;
      const h = H - y0 - 28;
      const vMaxAx = 70;
      const cds = pts.map((p) => p.cd);
      const lo = Math.min(...cds) * 0.97;
      const hi = Math.max(...cds) * 1.03;
      const X = (v) => x0 + (v / vMaxAx) * w;
      const Y = (c) => y0 + h - ((c - lo) / (hi - lo)) * h;
      let s = '';
      if (Number.isFinite(vmax)) s += `<rect x="${X(0)}" y="${y0}" width="${X(Math.min(vmax, vMaxAx)) - X(0)}" height="${h}" fill="rgba(51,140,237,0.12)"/><text x="${X(Math.min(vmax, vMaxAx)) - 4}" y="${y0 + 12}" font-size="10" fill="#9fd0ff" text-anchor="end">${T('flightBand')}</text>`;
      s += `<line x1="${x0}" y1="${y0 + h}" x2="${x0 + w}" y2="${y0 + h}" stroke="rgba(255,255,255,0.3)"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + h}" stroke="rgba(255,255,255,0.3)"/>`;
      s += `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.v).toFixed(1)},${Y(p.cd).toFixed(1)}`).join(' ')}" fill="none" stroke="#ffd166" stroke-width="2.4"/>`;
      const eRef = pts.reduce((a, p) => (Math.abs(p.v - V_REF) < Math.abs(a.v - V_REF) ? p : a), pts[0]);
      s += `<line x1="${X(V_REF)}" x2="${X(V_REF)}" y1="${y0}" y2="${y0 + h}" stroke="#ffd166" stroke-dasharray="3 3" opacity="0.6"/><circle cx="${X(eRef.v)}" cy="${Y(eRef.cd)}" r="4" fill="#ffd166"/>`;
      for (const v of [0, 10, 20, 30, 40, 50, 60, 70]) s += `<text x="${X(v)}" y="${y0 + h + 13}" font-size="9.5" fill="#9aa7b6" text-anchor="middle">${v}</text>`;
      s += `<text x="${x0 - 4}" y="${Y(hi) + 8}" font-size="9.5" fill="#9aa7b6" text-anchor="end">${f(hi, 2)}</text><text x="${x0 - 4}" y="${Y(lo)}" font-size="9.5" fill="#9aa7b6" text-anchor="end">${f(lo, 2)}</text>`;
      s += `<text x="${x0 + w}" y="${H - 2}" font-size="10" fill="#9aa7b6" text-anchor="end">${T('speedAxis')}</text><text x="${x0 + 4}" y="${y0 + 10}" font-size="10" fill="#ffd166">C<tspan baseline-shift="sub" font-size="8">d</tspan> (Auto)</text>`;
      html += `<figure class="aqt-dg"><svg class="aqt-svg" viewBox="0 0 ${W} ${H}" role="img">${s}</svg></figure><p class="aqt-typenote">${T('speedNote', { v: V_REF })}</p>`;
    }
    el.innerHTML = html;
    void est;
  }

  /* ---------------------------------------------------------- video */
  massFrom(k) {
    const v = parseNum(this.state[k]);
    return v > 0 ? v / 1000 : this.dryMass();
  }

  fitVideo(silent = false) {
    const P = this.app.P;
    const pts = this.state.vPts
      .split(/\r?\n/)
      .map((line) => {
        const s = line.trim();
        if (!s) return null;
        let parts = s.split(/[\s;\t]+/).filter(Boolean);
        if (parts.length < 2) parts = s.split(',');
        else parts = parts.map((x) => x.replace(/,$/, ''));
        return [parseNum(parts[0]), parseNum(parts[1])];
      })
      .filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    const r = fitCoastVideo(pts, { m: this.massFrom('vMass'), A: frontalArea(P), rho: airDensity(P), g: P.gravity });
    const out = this.$('vOut');
    if (r.error) {
      delete this.results.video;
      if (!silent) out.innerHTML = `<p class="aqt-msg aqt-warn">${T('vFew')}</p>`;
      this.renderCompare();
      return;
    }
    this.results.video = { cd: r.cd, lo: r.lo, hi: r.hi };
    out.innerHTML = `${this.videoChart(r)}<p class="aqt-dlres">${T('vRes', { cd: f(r.cd, 2), lo: f(r.lo, 2), hi: f(r.hi, 2), n: r.n, vt: f(r.vt, 1), v0: f(r.v0, 1), rms: f(r.rms, 2), rv: f(r.rmsVac, 2) })} ${this.useBtn(r.cd)}</p>${this.revealHTML('video')}`;
    this.renderCompare();
  }

  videoChart(r) {
    const W = 360;
    const H = 150;
    const x0 = 40;
    const y0 = 10;
    const w = W - x0 - 12;
    const h = H - y0 - 26;
    const ts = r.data.map((p) => p[0]);
    const hs = r.data.map((p) => p[1]).concat(r.curve.map((p) => p[1]));
    const t0 = Math.min(...ts);
    const t1 = Math.max(...ts);
    const hLo = Math.min(...hs);
    const hHi = Math.max(...hs);
    const X = (t) => x0 + ((t - t0) / Math.max(1e-6, t1 - t0)) * w;
    const Y = (v) => y0 + h - ((v - hLo) / Math.max(1e-6, hHi - hLo)) * h;
    // the parabola a rocket with no air would follow from the same start
    const g = this.app.P.gravity;
    let vac = '';
    for (let i = 0; i <= 40; i++) {
      const t = t0 + ((t1 - t0) * i) / 40;
      const hv = coastHeight(t, r.t0, r.h0, r.v0, Infinity, g);
      if (hv <= hHi + (hHi - hLo) * 0.5) vac += `${vac ? 'L' : 'M'}${X(t).toFixed(1)},${Math.max(0, Y(hv)).toFixed(1)} `;
    }
    let s = `<line x1="${x0}" y1="${y0 + h}" x2="${x0 + w}" y2="${y0 + h}" stroke="rgba(255,255,255,0.3)"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + h}" stroke="rgba(255,255,255,0.3)"/>`;
    s += `<path d="${vac}" fill="none" stroke="#b9c3cf" stroke-dasharray="5 4" stroke-width="1.5"/>`;
    s += `<path d="${r.curve.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="#ffd166" stroke-width="2.4"/>`;
    s += r.data.map((p) => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.8" fill="#338ced"/>`).join('');
    s += `<text x="${x0 - 4}" y="${Y(hHi) + 9}" font-size="9.5" fill="#9aa7b6" text-anchor="end">${f(hHi, 0)} m</text><text x="${x0 - 4}" y="${Y(hLo)}" font-size="9.5" fill="#9aa7b6" text-anchor="end">${f(hLo, 0)}</text>`;
    s += `<text x="${x0}" y="${H - 4}" font-size="9.5" fill="#9aa7b6">${f(t0, 2)} s</text><text x="${x0 + w}" y="${H - 4}" font-size="9.5" fill="#9aa7b6" text-anchor="end">${f(t1, 2)} s</text>`;
    const es = getLang() === 'es';
    s += `<text x="${x0 + w}" y="${y0 + h - 6}" font-size="10" fill="#ffd166" text-anchor="end">${es ? 'ajuste con arrastre' : 'fit with drag'}</text><text x="${x0 + w}" y="${y0 + h - 18}" font-size="10" fill="#b9c3cf" text-anchor="end">${es ? 'sin aire (parábola)' : 'no air (parabola)'}</text>`;
    return `<figure class="aqt-dg"><svg class="aqt-svg" viewBox="0 0 ${W} ${H}" role="img">${s}</svg></figure>`;
  }

  practiceVideo() {
    const P = this.app.P;
    const est = estimateCd(P);
    const cdTrue = this.practiceCd(est);
    const r = simulate({ ...P, cdMode: 'custom', CDrag: cdTrue }, { boostSamples: 40, coastSamples: 8 });
    if (!r.ok) return;
    const S = r.summary;
    const m = S.coastMass;
    const k = 0.5 * airDensity(P) * cdTrue * frontalArea(P);
    const vt = Math.sqrt((m * P.gravity) / k);
    const lines = [];
    const dt = 1 / 15;
    for (let t = S.burnoutTime + 0.02; t <= S.apogeeTime; t += dt) {
      const hh = coastHeight(t, S.burnoutTime, S.burnoutAltitude, S.burnoutVelocity, vt, P.gravity) + gauss() * 0.25;
      lines.push(`${t.toFixed(3)}, ${hh.toFixed(2)}`);
    }
    this.state.vPts = lines.join('\n');
    this.state.vMass = String(Math.round(m * 1000));
    this.$('vPts').value = this.state.vPts;
    this.$('vMass').value = this.state.vMass;
    this.practice.video = cdTrue;
    this.$('vOut').innerHTML = '';
  }

  /* -------------------------------------------------------- launches */
  readTable() {
    const host = this.$('lTable');
    host.querySelectorAll('tr[data-i]').forEach((tr) => {
      const i = Number(tr.dataset.i);
      const row = this.state.rows[i];
      if (!row) return;
      tr.querySelectorAll('input').forEach((inp) => (row[inp.dataset.c] = inp.value));
    });
  }

  renderTable(res) {
    const host = this.$('lTable');
    if (!host || !this.state.rows) return;
    this.$('lKindNote').hidden = this.state.lKind !== 'time';
    const cols = T('lCols');
    const kindU = this.state.lKind === 'time' ? 's' : 'm';
    const rr = res ? res.rows : null;
    let j = 0;
    const body = this.state.rows
      .map((row, i) => {
        const filled = parseNum(row.water) > 0 && parseNum(row.press) > 0 && parseNum(row.value) > 0;
        const r = rr && filled ? rr[j++] : null;
        const cd = r ? (r.out === 'high' ? T('lHigh') : r.out === 'low' ? T('lLow') : r.out ? '–' : f(r.cd, 2)) : '';
        const pred = r && Number.isFinite(r.pred) ? `${f(r.pred, 1)} ${kindU}` : '';
        return `<tr data-i="${i}"><td>${i + 1}</td>
          <td><input class="aqt-dlin" data-c="water" inputmode="decimal" value="${esc(row.water)}"></td>
          <td><input class="aqt-dlin" data-c="press" inputmode="decimal" value="${esc(row.press)}"></td>
          <td><input class="aqt-dlin" data-c="value" inputmode="decimal" value="${esc(row.value)}" placeholder="${kindU}"></td>
          <td class="aqt-dlnum">${cd}</td><td class="aqt-dlnum">${pred}</td></tr>`;
      })
      .join('');
    host.innerHTML = `<table class="aqt-sym aqt-dltab"><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
    host.querySelectorAll('input').forEach((inp) =>
      inp.addEventListener('input', () => {
        const i = Number(inp.closest('tr').dataset.i);
        this.state.rows[i][inp.dataset.c] = inp.value;
      }),
    );
  }

  fitLaunch() {
    this.readTable();
    const rows = this.state.rows
      .map((r) => ({ water: parseNum(r.water) / 1000, press: parseNum(r.press), value: parseNum(r.value) }))
      .filter((r) => r.water > 0 && r.press > 0 && r.value > 0);
    const out = this.$('lOut');
    if (!rows.length) {
      out.innerHTML = `<p class="aqt-msg aqt-warn">${T('lNone')}</p>`;
      return;
    }
    out.innerHTML = `<p class="aqt-typenote">${T('calc')}</p>`;
    setTimeout(() => {
      let r;
      try {
        r = fitLaunches(this.app.P, rows, this.state.lKind);
      } catch (e) {
        out.innerHTML = `<p class="aqt-msg aqt-warn">${e.message}</p>`;
        return;
      }
      this.renderLaunch(r);
    }, 30);
  }

  renderLaunch(r) {
    const out = this.$('lOut');
    if (r.error) {
      out.innerHTML = `<p class="aqt-msg aqt-warn">${T('lNone')}</p>`;
      return;
    }
    this.results.launch = r;
    this.renderTable(r);
    const anyOut = r.rows.some((x) => x.out);
    out.innerHTML = r.best
      ? `<p class="aqt-dlres">${T('lRes', { cd: f(r.best, 2), m: f(r.mean, 2), s: Number.isFinite(r.std) ? f(r.std, 2) : '–', n: r.n, e: f(r.rmsPct, 1) })} ${this.useBtn(r.best)}</p>${anyOut ? `<p class="aqt-typenote">${T('lOut')}</p>` : ''}${this.revealHTML('launch')}`
      : `<p class="aqt-msg aqt-warn">${T('lOut')}</p>`;
    this.renderCompare();
  }

  practiceLaunch() {
    const P = this.app.P;
    const est = estimateCd(P);
    const cdTrue = this.practiceCd(est);
    const rows = [];
    for (const pf of [0.75, 1]) {
      for (const wf of [0.6, 1, 1.4]) {
        const water = Math.min(P.volBot * 0.8, P.volWat * wf);
        const press = Math.round(P.gPressure * pf * 10) / 10;
        const r = simulate({ ...P, cdMode: 'custom', CDrag: cdTrue, volWat: water, gPressure: press }, { boostSamples: 40, coastSamples: 8 });
        if (!r.ok) continue;
        const v = (this.state.lKind === 'time' ? r.summary.impactTime : r.summary.apogeeAltitude) * (1 + gauss() * 0.04);
        rows.push({ water: f(water * 1000, 2), press: f(press, 1), value: f(v, 1) });
      }
    }
    if (!rows.length) return;
    this.state.rows = rows;
    this.practice.launch = cdTrue;
    delete this.results.launch;
    this.$('lOut').innerHTML = '';
    this.renderTable();
    this.renderCompare();
  }

  /* ------------------------------------------------------------ drop */
  fitDrop(silent = false) {
    const P = this.app.P;
    const times = this.state.dTimes
      .split(/[\s;]+/)
      .map((x) => parseNum(x.replace(/,$/, '')))
      .filter((x) => x > 0);
    const h = parseNum(this.state.dH);
    const out = this.$('dOut');
    const r = dropTest({ h, times, m: this.massFrom('dMass'), A: frontalArea(P), rho: airDensity(P), g: P.gravity, res: Number(this.state.dRes) });
    if (r.error) {
      delete this.results.drop;
      if (!silent) out.innerHTML = `<p class="aqt-msg aqt-warn">${T('dNone')}</p>`;
      this.renderCompare();
      return;
    }
    if (!(r.cd > 0)) {
      delete this.results.drop;
      out.innerHTML = `<p class="aqt-msg aqt-warn">${T('dShort', { tf: f(r.tFree, 2) })}</p>`;
      this.renderCompare();
      return;
    }
    this.results.drop = { cd: r.cd, lo: r.lo, hi: r.hi };
    const wide = !(r.lo > 0) || r.hi / Math.max(r.lo, 1e-6) > 1.6;
    out.innerHTML = `<p class="aqt-dlres">${T('dOut', {
      cd: f(r.cd, 2),
      lo: r.lo > 0 ? f(r.lo, 2) : '0',
      hi: f(r.hi, 2),
      t: f(r.tm, 2),
      e: f(r.err, 2),
      tf: f(r.tFree, 2),
      sl: f(100 * r.slow, 1),
      fr: f(100 * r.frac, 0),
      vt: f(r.vt, 1),
    })} ${this.useBtn(r.cd)}</p>${wide ? `<p class="aqt-typenote">${T('dWide')}</p>` : ''}${this.revealHTML('drop')}`;
    this.renderCompare();
  }

  practiceDrop() {
    const P = this.app.P;
    const est = estimateCd(P);
    const cdTrue = this.practiceCd(est);
    const m = this.dryMass();
    const vt = Math.sqrt((2 * m * P.gravity) / (airDensity(P) * cdTrue * frontalArea(P)));
    const h = Math.max(8, Math.round(dropPlan(vt, P.gravity, 0.1)));
    // fall time from h with drag: t = (vt/g) acosh(exp(h g / vt²))
    const t = (vt / P.gravity) * Math.acosh(Math.exp((h * P.gravity) / (vt * vt)));
    const sd = Number(this.state.dRes) > 0.05 ? 0.07 : 0.02;
    const times = Array.from({ length: 6 }, () => (t + gauss() * sd).toFixed(2));
    this.state.dH = String(h);
    this.state.dTimes = times.join(' ');
    this.state.dMass = String(Math.round(m * 1000));
    this.$('dH').value = this.state.dH;
    this.$('dTimes').value = this.state.dTimes;
    this.$('dMass').value = this.state.dMass;
    this.practice.drop = cdTrue;
    this.$('dOut').innerHTML = '';
  }

  /* --------------------------------------------------------- helpers */
  useBtn(cd) {
    return `<button type="button" class="aqt-btn aqt-btn-sm" data-dla="use" data-v="${cd}">${T('use')}</button>`;
  }

  revealHTML(k) {
    return this.practice[k] ? `<p class="aqt-typenote aqt-dlreveal">${T('reveal', { cd: f(this.practice[k], 2) })}</p>` : '';
  }

  renderCompare() {
    const el = this.$('cmp');
    if (!el) return;
    const R = this.results;
    const have = ['video', 'launch', 'drop'].filter((k) => R[k]);
    if (!have.length) {
      el.innerHTML = '';
      return;
    }
    const est = estimateCd(this.app.P);
    const names = { video: T('vT'), launch: T('lT'), drop: T('dT') };
    const val = (k) => (k === 'launch' ? R.launch.best : R[k].cd);
    const range = (k) => (k === 'launch' ? (Number.isFinite(R.launch.std) ? `± ${f(R.launch.std, 2)}` : '') : `${f(R[k].lo, 2)}–${f(R[k].hi, 2)}`);
    const rows = have.map((k) => `<tr><td>${names[k]}</td><td class="aqt-dlnum"><b>${f(val(k), 2)}</b></td><td class="aqt-dlnum">${range(k)}</td><td>${this.useBtn(val(k))}</td></tr>`).join('');
    let note = '';
    if (R.video && R.launch && R.launch.best) {
      const ratio = R.launch.best / R.video.cd;
      note = `<p class="aqt-dlwhy">${Math.abs(ratio - 1) > 0.15 ? T('cmpRatio', { r: f(ratio, 2) }) : T('cmpOk')}</p>`;
    }
    el.innerHTML = `<h5 class="aqt-subhead">${T('cmpH')}</h5><div class="aqt-dlscroll"><table class="aqt-sym aqt-dltab"><tbody>
      <tr><td>${T('cmpEst')}</td><td class="aqt-dlnum"><b>${est ? f(est.total, 2) : '–'}</b></td><td></td><td></td></tr>${rows}</tbody></table></div>${note}`;
  }

  /** One hidden "real" Cd shared by all practice data sets, as if they all measured the same rocket. */
  practiceCd(est) {
    if (!this.hiddenCd) this.hiddenCd = Math.round((est ? est.total : 0.5) * (1.05 + Math.random() * 0.35) * 100) / 100;
    return this.hiddenCd;
  }
}

export const dragLabText = T;
