/**
 * AquaThrust — "How the simulation works" panel: simple explanation (illustrated,
 * with the visitor's own numbers), detailed model (engineering diagrams + equations)
 * and bottle safety (criticality graphics). English and Mexican Spanish.
 */
import { t, getLang, loc } from '../i18n.js?v=1.7.1';
import { bottleLimits } from '../physics/presets.js?v=1.7.1';
import { simple as S, detail as D, stab as ST, renderDynamic } from './diagrams.js?v=1.7.1';
import { stabilityReport } from '../physics/stability.js?v=1.7.1';

const v = (k) => `<b class="aqt-live" data-k="${k}">…</b>`;
const dyn = (k) => `<figure class="aqt-dg" data-dg="${k}"></figure>`;
const fig = (svgHTML, cap = '') => `<figure class="aqt-dgs">${svgHTML}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
const step = (nn, title, diagram, body) => `<article><h4><span>${nn}</span>${title}</h4>${diagram ? fig(diagram) : ''}${body}</article>`;
const eq = (s, left = false) => `<div class="aqt-eq${left ? ' aqt-eq-l' : ''}">${s}</div>`;
const where = (s) => `<p class="aqt-where">${s}</p>`;
const i = (s) => `<i>${s}</i>`;

/* ================================================================ ENGLISH */
const EN = {
  simple: () => `
    <p class="aqt-lead">A water rocket is a bottle that <b>throws water downwards very fast</b>. Throwing something one way pushes you the other way — Newton's third law. Water is about 800 times heavier than air, so throwing water gives a far bigger push than throwing air alone. <em>The numbers in blue are calculated from your current settings.</em></p>
    <div class="aqt-steps">
      ${step(1, 'The pump stores energy — like winding a spring', S.pump(), `<p>Pumping squeezes air into the space above the water. <b>Pressure</b> is how hard that squeezed air pushes on every bit of the bottle's inside.</p>${eq('pressure = force ÷ area')}<p>Your ${v('p')} bar means the air pushes with the weight of about ${v('pkg')} kg on every square centimetre.</p>`)}
      ${step(2, 'The water shoots out', S.jet(), `<p>The air pushes the water out of the nozzle — like water squirting from a hole at the bottom of a full tank, or a garden hose with your thumb over the end.</p>${eq(`${i('v')} ≈ √( 2 × ${i('p')} ÷ ${i('ρ')} )`)}${where(`${i('p')} = pressure (Pa), ${i('ρ')} = density of water (kg/m³)`)}<p>Yours: ${i('v')} ≈ √(2 × ${v('pPa')} ÷ ${v('rho')}) ≈ ${v('ve')} m/s — as fast as a ball dropped from ${v('hEq')} m!</p>`)}
      ${step(3, 'Thrust — the push', S.thrust(), `<p>Throw a heavy ball off a skateboard and you roll backwards. Thrust is <b>mass of water thrown each second × its speed</b>:</p>${eq(`${i('F')} = ${i('ṁ')} × ${i('v')} = ${i('ρ')}${i('A')}${i('v')}² ≈ 2 × ${i('p')} × ${i('A')}`)}${where(`${i('A')} = nozzle opening area`)}<p>Yours: ${i('F')} ≈ 2 × ${v('pPa')} × ${v('An')} m² ≈ ${v('F0')} N (simulated peak: ${v('Fpeak')} N) — like holding up ${v('Fkg')} kg!</p>`)}
      ${step(4, 'Push ÷ mass = acceleration', S.mass(), `<p>The same push moves a light rocket faster than a heavy one — like pushing an empty shopping trolley versus a full one. Gravity pulls down all the time.</p>${eq(`${i('a')} = ${i('F')} ÷ ${i('m')} − ${i('g')}`)}<p>At lift-off your rocket weighs ${v('m0')} g, so ${i('a')} ≈ ${v('a0')} m/s², about ${v('a0g')} g. As water leaves it gets lighter and accelerates even harder.</p>`)}
      ${step(5, 'The air expands, cools and makes fog', S.expand(), `<p>As water leaves, the air has more room and its pressure drops — like a spring relaxing. Expanding air also cools (a spray can gets cold) and its moisture turns into the fog cloud.</p>${eq(`${i('p')} × ${i('V')}<sup>1.4</sup> = constant`)}<p>Your air grows from ${v('Vair')} L to ${v('Vb')} L, so the pressure falls from ${v('p')} to ${v('pend')} bar when the water is gone; then the leftover air blasts out for a final kick.</p>`)}
      ${step(6, 'Air drag slows it down', '', `${dyn('s-drag')}<p>Put your hand out of a car window: <b>double the speed, four times the push</b>. Where the drag curve crosses the rocket's weight is the <i>terminal speed</i> it falls back at.</p>${eq(`${i('D')} = ½ × ${i('ρ')}<sub>air</sub> × ${i('v')}² × ${i('C')}<sub>d</sub> × ${i('A')}`)}<p>At top speed (${v('vmax')} m/s) drag is ${v('Dmax')} N — ${v('Dratio')}× the empty rocket's weight. Without air it would reach ${v('hvac')} m; with air: ${v('apo')} m.</p>`)}
      ${step(7, 'How the computer does it — a flip-book', S.flip(), `<p>The flight is cut into tiny time slices (${v('dt')} ms each, ${v('steps')} of them while powered). For each slice: work out the forces, then</p>${eq(`${i('v')}<sub>new</sub> = ${i('v')} + ${i('a')}·Δ${i('t')} &nbsp;&nbsp; ${i('h')}<sub>new</sub> = ${i('h')} + ${i('v')}·Δ${i('t')}`)}<p>The real code (Runge–Kutta 4) checks the forces 4 times per slice so the steps follow the true curve. It takes ${v('ms')} ms.</p>`)}
      ${step(8, 'Why is there a “best” amount of water?', S.seesaw(), `<p>It's a seesaw: more water = more to throw (longer push), but the rocket is heavier and there's less room for air. Usually the best is about one third full — see the chart after a launch.</p>`)}
      ${step(9, 'Flying straight — like a dart', ST.concept(), `<p>A dart has its weight at the front and its feathers at the back, so it always flies point-first. A rocket needs the same: its balance point, the <b>centre of mass (CM)</b>, must be ahead of the point where the air pushes, the <b>centre of pressure (CP)</b>. If a gust tilts it, the air pushes the tail back into line, like a weathervane.</p>${eq('margin = (CP − CM) ÷ diameter')}<p>Yours, with the rocket empty: CM at ${v('cmx')} cm and CP at ${v('cpx')} cm from the nose, so the margin is ${v('marg')} diameters (${v('mstate')}). Aim for at least 1.</p>`)}
      ${step(10, 'A longer rocket is more stable — but heavier', S.longer(), `<p>A long arrow flies steadier than a short one. Adding an empty tube between the bottle and the nose pushes the nose (and the CP) forward and opens the gap to the CM, without adding volume. But the tube has weight, and nose weight does too: more stability usually costs some height.</p><p>Your body extension: ${v('extcm')} cm (+${v('extg')} g). Margin: ${v('marg')} → apogee ${v('apo')} m. Try it in the Rocket tab, under <b>Nose, fins &amp; body</b>.</p>`)}
    </div>`,

  detailed: () => `
    <p class="aqt-lead">One-dimensional vertical flight in four phases. Powered phases are integrated with 4th-order Runge–Kutta; the coast is solved exactly. SI units throughout.</p>
    <h4>Phases and transitions</h4>${fig(D.flow(), 'State machine of the simulation: each box is integrated with its own state vector.')}
    <h4>Forces on the rocket</h4>
    <div class="aqt-two">${fig(D.fbd(), 'Free-body diagram (drag shown for upward motion).')}
      <div><table class="aqt-sym"><tbody>
        <tr><td>${i('p')}, ${i('p')}<sub>a</sub></td><td>gas pressure in the bottle, ambient pressure (Pa); ${i('p')}<sub>0</sub> = ${i('p')}<sub>gauge</sub> + ${i('p')}<sub>a</sub></td></tr>
        <tr><td>${i('T')}, ${i('ρ')}</td><td>gas temperature (K), gas density</td></tr>
        <tr><td>${i('γ')}, ${i('R')}</td><td>heat-capacity ratio, specific gas constant (air 1.4, 287 J/kg·K)</td></tr>
        <tr><td>${i('ρ')}<sub>l</sub></td><td>liquid density</td></tr>
        <tr><td>${i('A')}<sub>n</sub>, ${i('A')}<sub>b</sub>, ${i('A')}<sub>t</sub></td><td>nozzle, bottle and launch-tube areas</td></tr>
        <tr><td>${i('V')}<sub>b</sub>, ${i('V')}<sub>w</sub>, ${i('V')}<sub>L</sub></td><td>bottle, water, launcher volumes</td></tr>
        <tr><td>${i('h')}, ${i('v')}, ${i('a')}</td><td>altitude, velocity, acceleration</td></tr>
        <tr><td>${i('k')}</td><td>½ ${i('C')}<sub>d</sub> ${i('A')}<sub>b</sub> ${i('ρ')}<sub>air</sub>, drag = ${i('k v')}|${i('v')}|</td></tr>
        <tr><td>${i('η')}<sub>w</sub>, ${i('η')}<sub>g</sub></td><td>water / gas thrust efficiencies</td></tr>
      </tbody></table></div></div>

    <h4>How stability relates to the flight calculation</h4>
    ${fig(D.couple())}
    <p>The trajectory is computed for a <b>point mass that moves only along the vertical axis</b> (one degree of freedom). The equation of motion, <i>m·a = F − m·g − k·v|v|</i>, has no angle and no rotation in it. It <b>assumes</b> the rocket stays aligned with its path, which is only true for a stable rocket.</p>
    <ul class="aqt-rules">
      <li><b>What enters the flight:</b> the total mass <i>m</i> (nose weight and body extension are added in every phase), and, in Auto mode, the drag coefficient. Fin size, fin count, nose shape and the extension length change <i>C</i><sub>d</sub>, and with it <i>k</i> = ½ρ<i>C</i><sub>d</sub><i>A</i>.</li>
      <li><b>What does not:</b> where the CM and CP are, the static margin, rotation and wind. They are computed <b>separately</b> (Barrowman method, see the Stability tab) as a static check.</li>
      <li><b>How to read it:</b> margin ≥ 1 calibre: the assumption holds and the result is trustworthy. 0–1: it may wobble, which adds drag, so the real height will be somewhat lower. Below 0: a real rocket would tumble, drag would rise sharply and the real height would be far lower. Treat the result as invalid.</li>
    </ul>
    <p class="aqt-where">Modelling the tumbling itself would need a 2-D model with rotation (pitch angle, aerodynamic moment and moment of inertia), which this simulator does not include.</p>
    <h4>Bottle geometry — where the “Bottle shape” settings act</h4>
    ${dyn('d-bottle')}
    <p>The shoulder is a cubic Bézier curve with control points P0…P3. The three shape sliders s₁ (shoulder length), s₂ (neck curvature), s₃ (roundness) move them:</p>
    ${eq(`${i('r')} = [ ${i('D')}<sub>n</sub>/2, ${i('D')}<sub>n</sub>/2, (${i('D')}<sub>n</sub> + s₃(${i('D')}<sub>b</sub>−${i('D')}<sub>n</sub>))/2, ${i('D')}<sub>b</sub>/2 ] &nbsp;&nbsp; ${i('z')} = [ 0.8${i('D')}<sub>n</sub>, ${i('z')}₁, ${i('z')}₁, ${i('z')}₃ ]<br>${i('z')}₃ = 2.3${i('D')}<sub>n</sub> + s₁(1.8${i('D')}<sub>b</sub> − 2.3${i('D')}<sub>n</sub>) &nbsp;&nbsp; ${i('z')}₁ = 1.5${i('D')}<sub>n</sub> + s₂(${i('z')}₃ − 2${i('D')}<sub>n</sub>)`, true)}
    <p>In 13 slices the area is linear, ${i('A')}(${i('z')}) = ${i('a')}<sub>0</sub> + ${i('κ')}(${i('z')} − ${i('z')}<sub>0</sub>), giving exact water volume and water-column <b>inertia length</b>:</p>
    ${eq(`${i('V')}(${i('q')}) = ∫<sub>0</sub><sup>${i('q')}</sup> ${i('A')} d${i('z')} &nbsp;&nbsp;&nbsp; ${i('F')}(${i('q')}) = ∫<sub>0</sub><sup>${i('q')}</sup> ${i('A')}<sub>n</sub>/${i('A')}(${i('z')}) d${i('z')} &nbsp; (slice: (${i('A')}<sub>n</sub>/${i('κ')}) ln(1 + ${i('κ')}${i('b')}/${i('a')}<sub>0</sub>))`)}

    <h4>Phase 0 — launch tube</h4>
    ${eq(`${i('p')} = ${i('p')}<sub>0</sub>(${i('V')}<sub>0</sub>/(${i('V')}<sub>0</sub> + ${i('A')}<sub>t</sub>${i('h')}))<sup>${i('γ')}</sup> &nbsp;&nbsp; ${i('V')}<sub>0</sub> = ${i('V')}<sub>L</sub> + ${i('V')}<sub>b</sub> − ${i('V')}<sub>w</sub> − 0.4${i('L')}<sub>t</sub>${i('A')}<sub>t</sub><br>${i('F')} = (${i('p')} − ${i('p')}<sub>a</sub>)${i('A')}<sub>t</sub> &nbsp;&nbsp; ${i('a')} = (${i('F')} − ${i('k v')}|${i('v')}|)/${i('m')} − ${i('g')} &nbsp;&nbsp; ends at ${i('h')} = ${i('L')}<sub>t</sub>`, true)}

    <h4>Phase 1 — water thrust (unsteady Bernoulli)</h4>
    <div class="aqt-two">${dyn('d-pv')}<p>The gas above the water expands adiabatically (no time to exchange heat). The shaded area is the work the gas does pushing the water out — the energy that becomes thrust. An isothermal expansion (dashed) would keep more pressure; real expansion cools the gas and loses pressure faster.</p></div>
    ${eq(`${i('r')} = ${i('A')}<sub>n</sub>/${i('A')}(${i('q')}) &nbsp;&nbsp; ${i('m')} = ${i('m')}<sub>dry</sub> + ${i('ρ')}<sub>l</sub>${i('V')}(${i('q')}) &nbsp;&nbsp; ${i('p')} = ${i('p')}<sub>s</sub>(${i('V')}<sub>g0</sub>/(${i('V')}<sub>b</sub> − ${i('V')}(${i('q')})))<sup>${i('γ')}</sup><br>
      ${i('f')} = ${i('ρ')}<sub>l</sub>${i('A')}<sub>n</sub>(1 − ${i('r')})${i('u')}² − ${i('k v')}|${i('v')}|<br>
      d${i('u')}/d${i('t')} = [½(${i('r')}² − 1)${i('u')}²${i('m')} + ${i('f q')} + (${i('p')} − ${i('p')}<sub>a</sub>)${i('η')}<sub>w</sub>${i('m')}/${i('ρ')}<sub>l</sub>] / [${i('ρ')}<sub>l</sub>${i('A')}<sub>n</sub>${i('q')}² − ${i('F')}(${i('q')})${i('m')}]<br>
      ${i('a')} = (${i('f')} − ${i('ρ')}<sub>l</sub>${i('A')}<sub>n</sub>${i('q')}·d${i('u')}/d${i('t')})/${i('m')} − ${i('g')} &nbsp;&nbsp; d${i('q')}/d${i('t')} = ${i('r u')} &nbsp;&nbsp; thrust = ${i('ρ')}<sub>l</sub>${i('A')}<sub>n</sub>(1 − ${i('r')})${i('u')}²`, true)}

    <h4>Phase 2 — air thrust (choked → sub-sonic)</h4>
    <div class="aqt-two">${dyn('d-nozzle')}<p>While ${i('p')}/${i('p')}<sub>a</sub> is above the critical ratio the air leaves at the speed of sound (“choked”); below it the jet is sub-sonic. Per unit of nozzle area, water gives roughly <b>2(${i('p')} − ${i('p')}<sub>a</sub>)</b> of thrust, much more than air at the same pressure — that's why water matters.</p></div>
    ${eq(`choked: ${i('p')}<sub>e</sub> = ${i('p')}(2/(${i('γ')}+1))<sup>${i('γ')}/(${i('γ')}−1)</sup>, &nbsp; ${i('v')}<sub>e</sub> = −√(2${i('γ')}${i('RT')}/(${i('γ')}+1)), &nbsp; ${i('ρ')}<sub>e</sub> = ${i('ρ')}(2/(${i('γ')}+1))<sup>1/(${i('γ')}−1)</sup><br>
      sub-sonic: ${i('p')}<sub>e</sub> = ${i('p')}<sub>a</sub> &nbsp;&nbsp; ${i('ṁ')} = ${i('A')}<sub>n</sub>${i('ρ')}<sub>e</sub>${i('v')}<sub>e</sub> &nbsp;&nbsp; ${i('F')} = [${i('A')}<sub>n</sub>(${i('p')}<sub>e</sub> − ${i('p')}<sub>a</sub>) + ${i('ṁ v')}<sub>e</sub>]${i('η')}<sub>g</sub> &nbsp;&nbsp; d${i('ρ')}/d${i('t')} = ${i('ṁ')}/${i('V')}<sub>b</sub>`, true)}

    <h4>Condensation (fog)</h4>
    <div class="aqt-two">${fig(D.cond())}<p>Vapour fraction ${i('x')}<sub>0</sub> = ${i('φ')}${i('p')}<sub>sat</sub>/${i('p')}<sub>0</sub>, with ${i('p')}<sub>sat</sub> = e<sup>25.87 − 5310/${i('T')}<sub>0</sub></sup>. When the gas cools below the dew point ${i('T')}<sub>c</sub>, latent heat lifts ${i('T')} by Δ${i('T')} = 6165(${i('γ')}−1)${i('x')}<sub>0</sub> and the pressure by the same factor × (1 − ${i('x')}<sub>0</sub>)<sup>${i('γ')}</sup>.</p></div>

    <h4>Phase 3 — coast (exact)</h4>
    <div class="aqt-two">${dyn('d-coast')}<div>${eq(`${i('v')}<sub>t</sub> = √(${i('mg')}/${i('k')}) &nbsp; ${i('τ')} = ${i('v')}<sub>t</sub>/${i('g')} &nbsp; ${i('H')} = ${i('v')}<sub>t</sub>²/${i('g')}<br>${i('h')}<sub>apo</sub> = ${i('h')}<sub>b</sub> + (${i('H')}/2)ln(1 + ${i('v')}<sub>b</sub>²/${i('v')}<sub>t</sub>²)<br>up: ${i('h')} = ${i('h')}<sub>apo</sub> + ${i('H')} ln cos((${i('t')}<sub>apo</sub>−${i('t')})/${i('τ')})<br>down: ${i('h')} = ${i('h')}<sub>apo</sub> − ${i('H')} ln cosh((${i('t')}−${i('t')}<sub>apo</sub>)/${i('τ')})`, true)}<p>The dashed arc shows how much height air drag costs.</p></div></div>

    <h4>Drag coefficient (automatic estimate)</h4>
    <p>In <b>Auto</b> mode the drag coefficient is built up from the parts of your rocket (subsonic component method, as in model-rocket tools), all referred to the bottle's frontal area <i>A</i> = π<i>D</i>²/4:</p>
    ${eq(`<i>C</i><sub>d</sub> ≈ 1.1 × [ <i>C</i><sub>f</sub>(1 + 60/(<i>L</i>/<i>D</i>)³ + 0.0025 <i>L</i>/<i>D</i>)·<i>S</i><sub>wet</sub>/<i>A</i> + 2<i>C</i><sub>f</sub><i>N S</i><sub>fin</sub>/<i>A</i> + <i>C</i><sub>d,nose</sub> + <i>C</i><sub>d,tail</sub> + <i>C</i><sub>d,edges</sub> ]<br><i>C</i><sub>f</sub> = 0.074 / Re<sup>0.2</sup>, &nbsp; Re = <i>v L</i>/<i>ν</i> &nbsp; (<i>v</i> = 35 m/s; <i>ν</i> from air temperature and pressure)`, true)}
    <p>Nose: pointed ≈ 0.02, rounded ≈ 0.07, blunt ≈ 0.30. Tail: base drag on the neck plus the bottle shoulder. The +10 % covers joints, tape and misalignment. Estimates like this are usually within 10–20 % of a measured value; switch to <b>Custom</b> if you have a measured one.</p>
    <h4>Numerical method</h4>
    <div class="aqt-two">${fig(D.rk4())}<p>Runge–Kutta 4 samples the slope four times per step and averages them, so it follows the true curve far better than a single-slope (Euler) step. Step Δ${i('t')} = √(10⁻⁶/|${i('a')}<sub>0</sub>|), between 1 µs and 0.5 ms. Phase ends are found by predicting the remaining time and closing on the event. Impulse = ∫${i('F')} d${i('t')}; burn time = last moment thrust ≥ 5% of peak; motor class = letter of total impulse + average thrust.</p></div>
    <h4>Limits</h4><p>Straight vertical flight, no wind or wobble, no parachute, rigid bottle, clean jet. Real rockets usually fly 10–25% lower.</p>`,

  safety: () => `
    <p class="aqt-lead">A pressurised bottle stores a lot of energy. <b>Remember: a soda bottle should be launched at no more than about 7 bar (≈100 psi); new ones usually burst at 10–14 bar (150–200 psi). Thin still-water bottles are much weaker — keep them at about 3 bar or less.</b></p>
    ${dyn('s-risk')}
    <h4>Where your pressure sits compared with everyday things</h4>${dyn('s-ladder')}
    <h4>Why it is dangerous: stored energy grows with pressure</h4>${dyn('s-energy')}
    <p class="aqt-where">Compressed air stores energy that is released in milliseconds if the bottle fails. Water hardly compresses, so a hydro-test (bottle full of water) stores thousands of times less — a failure just leaks.</p>
    <ul class="aqt-rules">
      <li>Only use carbonated-drink (soda) bottles — never glass, metal or still-water bottles at high pressure.</li>
      <li>Throw away bottles that are scratched, creased, cloudy or have been heated or left in the sun.</li>
      <li>Pressurise from a distance (long hose), stand 5–10 m away, wear eye protection.</li>
      <li>Test new designs with water, not air (hydro-testing).</li>
      <li>Never stand over the rocket and never point it at people.</li>
    </ul>
    <p class="aqt-where">Values are typical for new, undamaged bottles at room temperature and vary by brand and size.</p>`,
  stability: () => `
    <p class="aqt-lead">Why do darts, arrows and badminton shuttlecocks always fly point-first? Their <b>weight is at the front</b> and their <b>feathers (fins) are at the back</b>. A rocket works the same way.</p>
    ${fig(ST.concept(), 'A gust tilts the rocket and the air pushes at the CP. If the CP is behind the CM, that push swings the nose back into line, like a weathervane.')}
    <div class="aqt-two"><div>
      <h4>Two special points</h4>
      <p><b>Centre of mass (CM)</b>: the balance point of all the weight — bottle, nose, fins, nose weight and water.</p>
      ${eq(`${i('x')}<sub>CM</sub> = Σ ${i('m')}<sub>i</sub>${i('x')}<sub>i</sub> ÷ Σ ${i('m')}<sub>i</sub>`)}
      <p><b>Centre of pressure (CP)</b>: where the air's sideways push acts when the rocket tilts. Big fins at the back pull it backwards.</p>
      ${eq(`margin = (${i('x')}<sub>CP</sub> − ${i('x')}<sub>CM</sub>) ÷ ${i('D')}`)}
      <p class="aqt-where">Distances are measured back from the nose tip; ${i('D')} is the bottle diameter (1 calibre).</p>
    </div>${dyn('st-scale')}</div>
    <h4>Your rocket</h4>${dyn('st-side')}
    <h4>Does stability change the computed flight?</h4>
    ${fig(D.couple())}
    <p>Not directly. The flight is computed assuming the rocket flies straight. The stability check tells you whether that assumption holds. Nose weight and a body extension still change the flight through the <b>mass</b>, and fins, nose shape and extension through the <b>drag coefficient</b> (Auto mode). If the margin is below 0, the real flight would be much lower than shown.</p>
    <h4>Why a water rocket is least stable at launch</h4>
    <div class="aqt-two">${dyn('st-drain')}<p>The water sits at the tail, next to the nozzle, so at launch it pulls the CM backwards. As it shoots out, the CM moves forward and the margin grows. The thrust lasts only a fraction of a second and the launcher guides the rocket, so the margin is judged <b>with the rocket empty</b>, which is how it spends almost all of its flight. A launch tube helps by giving it speed before it leaves the pad.</p></div>
    <h4>How to make it more stable</h4>
    <ul class="aqt-rules">
      <li><b>Weight in the nose</b> (modelling clay, coins): moves the CM forward. The cost is a heavier rocket.</li>
      <li><b>Bigger fins, further back</b>: move the CP back. Fins that reach past the nozzle work best.</li>
      <li><b>A longer rocket</b> (a second bottle, a longer nose) puts more distance between the CM and the CP.</li>
      <li>Don't go far above 3 calibres: an over-stable rocket turns into the wind.</li>
    </ul>
    <h4>Check it at home, no computer needed</h4>
    <ol class="aqt-rules">
      <li><b>CM — balance test:</b> balance the empty rocket on a finger or a ruler edge and mark the point.</li>
      <li><b>CP — cardboard cut-out:</b> trace the rocket's side outline (with fins) on cardboard, cut it out and balance it. That point is a rough, conservative CP.</li>
      <li><b>Swing test:</b> tie a string at the CM and swing the rocket in a circle around you. If it flies nose-first, it is stable.</li>
    </ol>
    <h4>How the CP is calculated (Barrowman method)</h4>
    <p>Each part adds a "lift slope" CN<sub>α</sub> acting at its own point; the CP is their weighted average:</p>
    ${eq(`${i('x')}<sub>CP</sub> = Σ CN<sub>α,i</sub>·${i('x')}<sub>i</sub> ÷ Σ CN<sub>α,i</sub>`)}
    ${eq(`nose: CN<sub>α</sub> = 2 &nbsp;&nbsp; shoulder: CN<sub>α</sub> = 2[(${i('D')}<sub>n</sub>/${i('D')})² − 1]<br>fins: CN<sub>α</sub> = ${i('K')}·4${i('N')}(${i('s')}/${i('D')})² ÷ (1 + √(1 + (2${i('l')}/(${i('c')}<sub>r</sub> + ${i('c')}<sub>t</sub>))²)), &nbsp; ${i('K')} = 1 + ${i('R')}/(${i('s')} + ${i('R')})`, true)}
    <div class="aqt-sttable" data-st="table"></div>
    <p class="aqt-where">The bottle shoulder narrows towards the tail, so it acts like a "boat-tail" with negative lift that pulls the CP forward. That is why plain bottles need big fins.</p>`,
};

/* ================================================================ ESPAÑOL */
const ES = {
  simple: () => `
    <p class="aqt-lead">Un cohete de agua es una botella que <b>avienta agua hacia abajo muy rápido</b>. Si aventamos algo hacia un lado, nos empuja hacia el otro — es la tercera ley de Newton. El agua pesa unas 800 veces más que el aire, por eso aventar agua empuja muchísimo más que aventar sólo aire. <em>Los números en azul se calculan con tus ajustes actuales.</em></p>
    <div class="aqt-steps">
      ${step(1, 'La bomba guarda energía — como cargar una resortera', S.pump(), `<p>Al bombear, aprietas aire en el espacio sobre el agua. La <b>presión</b> es qué tan fuerte empuja ese aire apretado contra cada parte de la botella por dentro.</p>${eq('presión = fuerza ÷ área')}<p>Tus ${v('p')} bar equivalen a tener ${v('pkg')} kg encima de cada centímetro cuadrado.</p>`)}
      ${step(2, 'Sale el chorro de agua', S.jet(), `<p>El aire empuja el agua por la tobera — como el agua que sale por un hoyo en la parte de abajo de un tinaco lleno, o la manguera del patio cuando le tapas la punta con el dedo.</p>${eq(`${i('v')} ≈ √( 2 × ${i('p')} ÷ ${i('ρ')} )`)}${where(`${i('p')} = presión (Pa), ${i('ρ')} = densidad del agua (kg/m³)`)}<p>La tuya: ${i('v')} ≈ √(2 × ${v('pPa')} ÷ ${v('rho')}) ≈ ${v('ve')} m/s — ¡tan rápido como una pelota que cae desde ${v('hEq')} m!</p>`)}
      ${step(3, 'El empuje', S.thrust(), `<p>Súbete a una patineta y avienta un balón pesado: tú te vas para atrás. Por eso a la manguera de los bomberos la sujetan entre varios. El empuje es <b>cuánta agua se avienta cada segundo × su velocidad</b>:</p>${eq(`${i('F')} = ${i('ṁ')} × ${i('v')} = ${i('ρ')}${i('A')}${i('v')}² ≈ 2 × ${i('p')} × ${i('A')}`)}${where(`${i('A')} = área de la boca de la tobera`)}<p>El tuyo: ${i('F')} ≈ 2 × ${v('pPa')} × ${v('An')} m² ≈ ${v('F0')} N (máximo simulado: ${v('Fpeak')} N) — ¡como cargar ${v('Fkg')} kg!</p>`)}
      ${step(4, 'Empuje ÷ masa = aceleración', S.mass(), `<p>El mismo empujón mueve más rápido algo ligero que algo pesado — como empujar un carrito del súper vacío o lleno de garrafones. Y la gravedad siempre jala hacia abajo.</p>${eq(`${i('a')} = ${i('F')} ÷ ${i('m')} − ${i('g')}`)}<p>Al despegar tu cohete pesa ${v('m0')} g, así que ${i('a')} ≈ ${v('a0')} m/s², unas ${v('a0g')} g. Conforme sale el agua se hace más ligero y acelera todavía más.</p>`)}
      ${step(5, 'El aire se expande, se enfría y hace niebla', S.expand(), `<p>Al salir el agua, el aire tiene más espacio y su presión baja — como un resorte que se va soltando. Al expandirse también se enfría: es la misma nubecita que ves cuando destapas un refresco bien frío.</p>${eq(`${i('p')} × ${i('V')}<sup>1.4</sup> = constante`)}<p>Tu aire pasa de ${v('Vair')} L a ${v('Vb')} L, así que la presión baja de ${v('p')} a ${v('pend')} bar cuando se acaba el agua; luego el aire que queda sale de golpe y da un último empujón.</p>`)}
      ${step(6, 'El aire lo frena', '', `${dyn('s-drag')}<p>Saca la mano por la ventana del coche en el Periférico: <b>al doble de velocidad, cuatro veces la fuerza</b>. Donde la curva de arrastre cruza el peso del cohete está la <i>velocidad terminal</i> con la que cae.</p>${eq(`${i('D')} = ½ × ${i('ρ')}<sub>aire</sub> × ${i('v')}² × ${i('C')}<sub>d</sub> × ${i('A')}`)}<p>A su velocidad máxima (${v('vmax')} m/s) el arrastre es de ${v('Dmax')} N — ${v('Dratio')} veces el peso del cohete vacío. Sin aire llegaría a ${v('hvac')} m; con aire llega a ${v('apo')} m.</p>`)}
      ${step(7, 'Cómo lo calcula la compu — un folioscopio', S.flip(), `<p>Es como los dibujitos en la esquina del cuaderno que se mueven al pasar las hojas: el vuelo se corta en rebanadas de tiempo diminutas (${v('dt')} ms cada una, ${v('steps')} sólo en la parte con empuje). En cada una se calculan las fuerzas y luego</p>${eq(`${i('v')}<sub>nueva</sub> = ${i('v')} + ${i('a')}·Δ${i('t')} &nbsp;&nbsp; ${i('h')}<sub>nueva</sub> = ${i('h')} + ${i('v')}·Δ${i('t')}`)}<p>El código real (Runge–Kutta 4) revisa las fuerzas 4 veces por rebanada para seguir la curva verdadera. Tarda ${v('ms')} ms.</p>`)}
      ${step(8, '¿Por qué hay una cantidad “óptima” de agua?', S.seesaw(), `<p>Es un subibaja: más agua = más que aventar (empuja más tiempo), pero el cohete pesa más y hay menos espacio para el aire. Normalmente lo mejor es llenar más o menos un tercio — mira la gráfica después de lanzar.</p>`)}
      ${step(9, 'Volar derecho — como un dardo', ST.concept(), `<p>Un dardo tiene el peso adelante y las plumas atrás, por eso siempre vuela con la punta por delante. El cohete necesita lo mismo: su punto de equilibrio, el <b>centro de masa (CM)</b>, debe estar delante del punto donde empuja el aire, el <b>centro de presión (CP)</b>. Si una ráfaga lo inclina, el aire empuja la cola de regreso, como una veleta.</p>${eq('margen = (CP − CM) ÷ diámetro')}<p>El tuyo, con el cohete vacío: CM a ${v('cmx')} cm y CP a ${v('cpx')} cm de la punta, así que el margen es de ${v('marg')} diámetros (${v('mstate')}). Busca al menos 1.</p>`)}
      ${step(10, 'Un cohete más largo es más estable — pero más pesado', S.longer(), `<p>Una flecha larga vuela más firme que una corta. Si agregas un tubo vacío entre la botella y la nariz, la nariz (y el CP) se van hacia adelante y crece la distancia al CM, sin agregar volumen. Pero el tubo pesa, y el peso en la nariz también: más estabilidad casi siempre cuesta algo de altura.</p><p>Tu extensión: ${v('extcm')} cm (+${v('extg')} g). Margen: ${v('marg')} → apogeo ${v('apo')} m. Pruébalo en la pestaña Cohete, en <b>Nariz, aletas y cuerpo</b>.</p>`)}
    </div>`,

  detailed: () => `
    <p class="aqt-lead">Vuelo vertical en una dimensión, en cuatro fases. Las fases con empuje se integran con Runge–Kutta de 4º orden; el vuelo libre se resuelve de forma exacta. Todo en unidades del SI.</p>
    <h4>Fases y transiciones</h4>${fig(D.flow(), 'Máquina de estados de la simulación: cada caja se integra con su propio vector de estado.')}
    <h4>Fuerzas sobre el cohete</h4>
    <div class="aqt-two">${fig(D.fbd(), 'Diagrama de cuerpo libre (arrastre dibujado subiendo).')}
      <div><table class="aqt-sym"><tbody>
        <tr><td>${i('p')}, ${i('p')}<sub>a</sub></td><td>presión del gas en la botella y presión ambiente (Pa); ${i('p')}<sub>0</sub> = ${i('p')}<sub>man</sub> + ${i('p')}<sub>a</sub></td></tr>
        <tr><td>${i('T')}, ${i('ρ')}</td><td>temperatura (K) y densidad del gas</td></tr>
        <tr><td>${i('γ')}, ${i('R')}</td><td>razón de calores específicos y constante del gas (aire 1.4, 287 J/kg·K)</td></tr>
        <tr><td>${i('ρ')}<sub>l</sub></td><td>densidad del líquido</td></tr>
        <tr><td>${i('A')}<sub>n</sub>, ${i('A')}<sub>b</sub>, ${i('A')}<sub>t</sub></td><td>áreas de la tobera, la botella y el tubo de lanzamiento</td></tr>
        <tr><td>${i('V')}<sub>b</sub>, ${i('V')}<sub>w</sub>, ${i('V')}<sub>L</sub></td><td>volúmenes de botella, agua y lanzador</td></tr>
        <tr><td>${i('h')}, ${i('v')}, ${i('a')}</td><td>altura, velocidad, aceleración</td></tr>
        <tr><td>${i('k')}</td><td>½ ${i('C')}<sub>d</sub> ${i('A')}<sub>b</sub> ${i('ρ')}<sub>aire</sub>; arrastre = ${i('k v')}|${i('v')}|</td></tr>
        <tr><td>${i('η')}<sub>w</sub>, ${i('η')}<sub>g</sub></td><td>eficiencias del empuje de agua y de gas</td></tr>
      </tbody></table></div></div>

    <h4>Cómo se relaciona la estabilidad con el cálculo del vuelo</h4>
    ${fig(D.couple())}
    <p>La trayectoria se calcula para una <b>masa puntual que sólo se mueve sobre el eje vertical</b> (un grado de libertad). La ecuación de movimiento, <i>m·a = F − m·g − k·v|v|</i>, no tiene ángulo ni rotación. <b>Supone</b> que el cohete se mantiene alineado con su trayectoria, y eso sólo es cierto si es estable.</p>
    <ul class="aqt-rules">
      <li><b>Lo que sí entra al vuelo:</b> la masa total <i>m</i> (el peso en la nariz y la extensión se suman en todas las fases) y, en modo Automático, el coeficiente de arrastre. El tamaño y número de aletas, la forma de la nariz y el largo de la extensión cambian <i>C</i><sub>d</sub>, y con él <i>k</i> = ½ρ<i>C</i><sub>d</sub><i>A</i>.</li>
      <li><b>Lo que no entra:</b> dónde están el CM y el CP, el margen estático, la rotación y el viento. Se calculan <b>aparte</b> (método de Barrowman, ver la pestaña Estabilidad) como una revisión estática.</li>
      <li><b>Cómo leerlo:</b> margen ≥ 1 calibre: la suposición se cumple y el resultado es confiable. Entre 0 y 1: puede bambolearse, lo que agrega arrastre, así que la altura real será algo menor. Abajo de 0: un cohete real daría vueltas, el arrastre subiría mucho y la altura real sería muchísimo menor. Toma el resultado como no válido.</li>
    </ul>
    <p class="aqt-where">Simular el giro en sí requeriría un modelo 2-D con rotación (ángulo de cabeceo, momento aerodinámico y momento de inercia), que este simulador no incluye.</p>
    <h4>Geometría de la botella — dónde actúan los ajustes de “Forma”</h4>
    ${dyn('d-bottle')}
    <p>El hombro es una curva de Bézier cúbica con puntos de control P0…P3. Los tres controles s₁ (largo del hombro), s₂ (curvatura del cuello) y s₃ (redondez) los mueven:</p>
    ${eq(`${i('r')} = [ ${i('D')}<sub>n</sub>/2, ${i('D')}<sub>n</sub>/2, (${i('D')}<sub>n</sub> + s₃(${i('D')}<sub>b</sub>−${i('D')}<sub>n</sub>))/2, ${i('D')}<sub>b</sub>/2 ] &nbsp;&nbsp; ${i('z')} = [ 0.8${i('D')}<sub>n</sub>, ${i('z')}₁, ${i('z')}₁, ${i('z')}₃ ]<br>${i('z')}₃ = 2.3${i('D')}<sub>n</sub> + s₁(1.8${i('D')}<sub>b</sub> − 2.3${i('D')}<sub>n</sub>) &nbsp;&nbsp; ${i('z')}₁ = 1.5${i('D')}<sub>n</sub> + s₂(${i('z')}₃ − 2${i('D')}<sub>n</sub>)`, true)}
    <p>En 13 rebanadas el área cambia en forma lineal, ${i('A')}(${i('z')}) = ${i('a')}<sub>0</sub> + ${i('κ')}(${i('z')} − ${i('z')}<sub>0</sub>), lo que da fórmulas exactas para el volumen de agua y la <b>longitud de inercia</b> de la columna:</p>
    ${eq(`${i('V')}(${i('q')}) = ∫<sub>0</sub><sup>${i('q')}</sup> ${i('A')} d${i('z')} &nbsp;&nbsp;&nbsp; ${i('F')}(${i('q')}) = ∫<sub>0</sub><sup>${i('q')}</sup> ${i('A')}<sub>n</sub>/${i('A')}(${i('z')}) d${i('z')} &nbsp; (rebanada: (${i('A')}<sub>n</sub>/${i('κ')}) ln(1 + ${i('κ')}${i('b')}/${i('a')}<sub>0</sub>))`)}

    <h4>Fase 0 — tubo de lanzamiento</h4>
    ${eq(`${i('p')} = ${i('p')}<sub>0</sub>(${i('V')}<sub>0</sub>/(${i('V')}<sub>0</sub> + ${i('A')}<sub>t</sub>${i('h')}))<sup>${i('γ')}</sup> &nbsp;&nbsp; ${i('V')}<sub>0</sub> = ${i('V')}<sub>L</sub> + ${i('V')}<sub>b</sub> − ${i('V')}<sub>w</sub> − 0.4${i('L')}<sub>t</sub>${i('A')}<sub>t</sub><br>${i('F')} = (${i('p')} − ${i('p')}<sub>a</sub>)${i('A')}<sub>t</sub> &nbsp;&nbsp; ${i('a')} = (${i('F')} − ${i('k v')}|${i('v')}|)/${i('m')} − ${i('g')} &nbsp;&nbsp; termina en ${i('h')} = ${i('L')}<sub>t</sub>`, true)}

    <h4>Fase 1 — empuje de agua (Bernoulli no estacionario)</h4>
    <div class="aqt-two">${dyn('d-pv')}<p>El gas sobre el agua se expande de forma adiabática (no le da tiempo de intercambiar calor). El área sombreada es el trabajo que hace el gas al empujar el agua — la energía que se vuelve empuje. Una expansión isotérmica (punteada) conservaría más presión; la real enfría el gas y pierde presión más rápido.</p></div>
    ${eq(`${i('r')} = ${i('A')}<sub>n</sub>/${i('A')}(${i('q')}) &nbsp;&nbsp; ${i('m')} = ${i('m')}<sub>seca</sub> + ${i('ρ')}<sub>l</sub>${i('V')}(${i('q')}) &nbsp;&nbsp; ${i('p')} = ${i('p')}<sub>s</sub>(${i('V')}<sub>g0</sub>/(${i('V')}<sub>b</sub> − ${i('V')}(${i('q')})))<sup>${i('γ')}</sup><br>
      ${i('f')} = ${i('ρ')}<sub>l</sub>${i('A')}<sub>n</sub>(1 − ${i('r')})${i('u')}² − ${i('k v')}|${i('v')}|<br>
      d${i('u')}/d${i('t')} = [½(${i('r')}² − 1)${i('u')}²${i('m')} + ${i('f q')} + (${i('p')} − ${i('p')}<sub>a</sub>)${i('η')}<sub>w</sub>${i('m')}/${i('ρ')}<sub>l</sub>] / [${i('ρ')}<sub>l</sub>${i('A')}<sub>n</sub>${i('q')}² − ${i('F')}(${i('q')})${i('m')}]<br>
      ${i('a')} = (${i('f')} − ${i('ρ')}<sub>l</sub>${i('A')}<sub>n</sub>${i('q')}·d${i('u')}/d${i('t')})/${i('m')} − ${i('g')} &nbsp;&nbsp; d${i('q')}/d${i('t')} = ${i('r u')} &nbsp;&nbsp; empuje = ${i('ρ')}<sub>l</sub>${i('A')}<sub>n</sub>(1 − ${i('r')})${i('u')}²`, true)}

    <h4>Fase 2 — empuje de aire (estrangulado → subsónico)</h4>
    <div class="aqt-two">${dyn('d-nozzle')}<p>Mientras ${i('p')}/${i('p')}<sub>a</sub> está arriba de la razón crítica, el aire sale a la velocidad del sonido (flujo “estrangulado”); abajo de ella el chorro es subsónico. Por cada unidad de área, el agua da cerca de <b>2(${i('p')} − ${i('p')}<sub>a</sub>)</b> de empuje, mucho más que el aire a la misma presión — por eso el agua es clave.</p></div>
    ${eq(`estrangulado: ${i('p')}<sub>e</sub> = ${i('p')}(2/(${i('γ')}+1))<sup>${i('γ')}/(${i('γ')}−1)</sup>, &nbsp; ${i('v')}<sub>e</sub> = −√(2${i('γ')}${i('RT')}/(${i('γ')}+1)), &nbsp; ${i('ρ')}<sub>e</sub> = ${i('ρ')}(2/(${i('γ')}+1))<sup>1/(${i('γ')}−1)</sup><br>
      subsónico: ${i('p')}<sub>e</sub> = ${i('p')}<sub>a</sub> &nbsp;&nbsp; ${i('ṁ')} = ${i('A')}<sub>n</sub>${i('ρ')}<sub>e</sub>${i('v')}<sub>e</sub> &nbsp;&nbsp; ${i('F')} = [${i('A')}<sub>n</sub>(${i('p')}<sub>e</sub> − ${i('p')}<sub>a</sub>) + ${i('ṁ v')}<sub>e</sub>]${i('η')}<sub>g</sub> &nbsp;&nbsp; d${i('ρ')}/d${i('t')} = ${i('ṁ')}/${i('V')}<sub>b</sub>`, true)}

    <h4>Condensación (niebla)</h4>
    <div class="aqt-two">${fig(D.cond())}<p>Fracción de vapor ${i('x')}<sub>0</sub> = ${i('φ')}${i('p')}<sub>sat</sub>/${i('p')}<sub>0</sub>, con ${i('p')}<sub>sat</sub> = e<sup>25.87 − 5310/${i('T')}<sub>0</sub></sup>. Cuando el gas se enfría por debajo del punto de rocío ${i('T')}<sub>c</sub>, el calor latente sube ${i('T')} en Δ${i('T')} = 6165(${i('γ')}−1)${i('x')}<sub>0</sub> y la presión por el mismo factor × (1 − ${i('x')}<sub>0</sub>)<sup>${i('γ')}</sup>.</p></div>

    <h4>Fase 3 — vuelo libre (solución exacta)</h4>
    <div class="aqt-two">${dyn('d-coast')}<div>${eq(`${i('v')}<sub>t</sub> = √(${i('mg')}/${i('k')}) &nbsp; ${i('τ')} = ${i('v')}<sub>t</sub>/${i('g')} &nbsp; ${i('H')} = ${i('v')}<sub>t</sub>²/${i('g')}<br>${i('h')}<sub>apo</sub> = ${i('h')}<sub>b</sub> + (${i('H')}/2)ln(1 + ${i('v')}<sub>b</sub>²/${i('v')}<sub>t</sub>²)<br>subida: ${i('h')} = ${i('h')}<sub>apo</sub> + ${i('H')} ln cos((${i('t')}<sub>apo</sub>−${i('t')})/${i('τ')})<br>bajada: ${i('h')} = ${i('h')}<sub>apo</sub> − ${i('H')} ln cosh((${i('t')}−${i('t')}<sub>apo</sub>)/${i('τ')})`, true)}<p>El arco punteado muestra cuánta altura le cuesta el arrastre del aire.</p></div></div>

    <h4>Coeficiente de arrastre (estimación automática)</h4>
    <p>En modo <b>Automático</b> el coeficiente de arrastre se arma con las partes de tu cohete (método de componentes subsónico, como en las herramientas de cohetería), todo referido al área frontal de la botella <i>A</i> = π<i>D</i>²/4:</p>
    ${eq(`<i>C</i><sub>d</sub> ≈ 1.1 × [ <i>C</i><sub>f</sub>(1 + 60/(<i>L</i>/<i>D</i>)³ + 0.0025 <i>L</i>/<i>D</i>)·<i>S</i><sub>moj</sub>/<i>A</i> + 2<i>C</i><sub>f</sub><i>N S</i><sub>aleta</sub>/<i>A</i> + <i>C</i><sub>d,nariz</sub> + <i>C</i><sub>d,cola</sub> + <i>C</i><sub>d,bordes</sub> ]<br><i>C</i><sub>f</sub> = 0.074 / Re<sup>0.2</sup>, &nbsp; Re = <i>v L</i>/<i>ν</i> &nbsp; (<i>v</i> = 35 m/s; <i>ν</i> según la temperatura y presión del aire)`, true)}
    <p>Nariz: puntiaguda ≈ 0.02, redondeada ≈ 0.07, chata ≈ 0.30. Cola: arrastre de base en el cuello más el hombro de la botella. El +10 % cubre uniones, cinta y desalineación. Estas estimaciones suelen quedar a 10–20 % de un valor medido; cambia a <b>Personalizado</b> si tienes uno medido.</p>
    <h4>Método numérico</h4>
    <div class="aqt-two">${fig(D.rk4())}<p>Runge–Kutta 4 mide la pendiente cuatro veces por paso y las promedia, así sigue la curva real mucho mejor que un paso de una sola pendiente (Euler). Paso Δ${i('t')} = √(10⁻⁶/|${i('a')}<sub>0</sub>|), entre 1 µs y 0.5 ms. El final de cada fase se encuentra prediciendo el tiempo que falta. Impulso = ∫${i('F')} d${i('t')}; tiempo de empuje = último instante con empuje ≥ 5% del máximo; clase de motor = letra del impulso total + empuje promedio.</p></div>
    <h4>Límites</h4><p>Vuelo vertical recto, sin viento ni bamboleo, sin paracaídas, botella rígida y chorro limpio. Los cohetes reales suelen volar entre 10 y 25% más bajo.</p>`,

  safety: () => `
    <p class="aqt-lead">Una botella con presión guarda mucha energía. <b>Recuerda: una botella de refresco se lanza a no más de unos 7 bar (≈100 psi); las nuevas suelen reventar entre 10 y 14 bar (150–200 psi). Las botellas delgadas de agua natural son mucho más débiles — mantenlas en unos 3 bar o menos.</b></p>
    ${dyn('s-risk')}
    <h4>Dónde queda tu presión comparada con cosas de todos los días</h4>${dyn('s-ladder')}
    <h4>Por qué es peligroso: la energía guardada crece con la presión</h4>${dyn('s-energy')}
    <p class="aqt-where">El aire comprimido guarda energía que se libera en milésimas de segundo si la botella falla. El agua casi no se comprime, así que una prueba hidrostática (botella llena de agua) guarda miles de veces menos energía — si falla, sólo gotea.</p>
    <ul class="aqt-rules">
      <li>Usa sólo botellas de refresco (con gas) — nunca de vidrio, metal o de agua natural a alta presión.</li>
      <li>Tira las botellas rayadas, dobladas, opacas o que se hayan calentado o dejado al sol.</li>
      <li>Infla desde lejos (manguera larga), quédate a 5–10 m y usa lentes de protección.</li>
      <li>Prueba los diseños nuevos con agua, no con aire (prueba hidrostática).</li>
      <li>Nunca te pongas encima del cohete ni lo apuntes hacia nadie.</li>
    </ul>
    <p class="aqt-where">Los valores son típicos para botellas nuevas y sin daños a temperatura ambiente; cambian según la marca y el tamaño.</p>`,
  stability: () => `
    <p class="aqt-lead">¿Por qué los dardos, las flechas y los gallitos de bádminton siempre vuelan con la punta por delante? Porque tienen <b>el peso adelante</b> y <b>las plumas (aletas) atrás</b>. Un cohete funciona igual.</p>
    ${fig(ST.concept(), 'Una ráfaga inclina el cohete y el aire empuja en el CP. Si el CP está detrás del CM, ese empujón regresa la nariz a su lugar, como una veleta.')}
    <div class="aqt-two"><div>
      <h4>Dos puntos especiales</h4>
      <p><b>Centro de masa (CM)</b>: el punto de equilibrio de todo el peso — botella, nariz, aletas, peso extra y agua.</p>
      ${eq(`${i('x')}<sub>CM</sub> = Σ ${i('m')}<sub>i</sub>${i('x')}<sub>i</sub> ÷ Σ ${i('m')}<sub>i</sub>`)}
      <p><b>Centro de presión (CP)</b>: donde actúa el empujón lateral del aire cuando el cohete se inclina. Las aletas grandes atrás lo jalan hacia la cola.</p>
      ${eq(`margen = (${i('x')}<sub>CP</sub> − ${i('x')}<sub>CM</sub>) ÷ ${i('D')}`)}
      <p class="aqt-where">Las distancias se miden desde la punta de la nariz; ${i('D')} es el diámetro de la botella (1 calibre).</p>
    </div>${dyn('st-scale')}</div>
    <h4>Tu cohete</h4>${dyn('st-side')}
    <h4>¿La estabilidad cambia el vuelo calculado?</h4>
    ${fig(D.couple())}
    <p>No directamente. El vuelo se calcula suponiendo que el cohete vuela derecho. La revisión de estabilidad te dice si esa suposición se cumple. El peso en la nariz y la extensión sí cambian el vuelo a través de la <b>masa</b>, y las aletas, la nariz y la extensión a través del <b>coeficiente de arrastre</b> (modo Automático). Si el margen es menor que 0, el vuelo real sería mucho más bajo que el mostrado.</p>
    <h4>Por qué un cohete de agua es menos estable al despegar</h4>
    <div class="aqt-two">${dyn('st-drain')}<p>El agua está en la cola, junto a la tobera, así que al despegar jala el CM hacia atrás. Conforme sale disparada, el CM avanza y el margen crece. El empuje dura una fracción de segundo y el lanzador guía al cohete, por eso el margen se revisa <b>con el cohete vacío</b>, que es como pasa casi todo su vuelo. Un tubo de lanzamiento ayuda porque le da velocidad antes de dejar la base.</p></div>
    <h4>Cómo hacerlo más estable</h4>
    <ul class="aqt-rules">
      <li><b>Peso en la nariz</b> (plastilina, monedas): mueve el CM hacia adelante. El costo es un cohete más pesado.</li>
      <li><b>Aletas más grandes y más atrás</b>: mueven el CP hacia la cola. Funcionan mejor las que llegan más allá de la tobera.</li>
      <li><b>Un cohete más largo</b> (otra botella, una nariz más larga) separa más el CM del CP.</li>
      <li>No te pases mucho de 3 calibres: un cohete sobre-estable se mete contra el viento.</li>
    </ul>
    <h4>Revísalo en casa, sin computadora</h4>
    <ol class="aqt-rules">
      <li><b>CM — prueba de equilibrio:</b> equilibra el cohete vacío sobre un dedo o el canto de una regla y marca el punto.</li>
      <li><b>CP — silueta de cartón:</b> dibuja el contorno lateral del cohete (con aletas) en cartón, recórtalo y equilíbralo. Ese punto es un CP aproximado y conservador.</li>
      <li><b>Prueba del columpio:</b> amarra un hilo en el CM y gira el cohete en círculo a tu alrededor. Si vuela con la nariz por delante, es estable.</li>
    </ol>
    <h4>Cómo se calcula el CP (método de Barrowman)</h4>
    <p>Cada parte aporta una "pendiente de sustentación" CN<sub>α</sub> que actúa en su propio punto; el CP es su promedio ponderado:</p>
    ${eq(`${i('x')}<sub>CP</sub> = Σ CN<sub>α,i</sub>·${i('x')}<sub>i</sub> ÷ Σ CN<sub>α,i</sub>`)}
    ${eq(`nariz: CN<sub>α</sub> = 2 &nbsp;&nbsp; hombro: CN<sub>α</sub> = 2[(${i('D')}<sub>n</sub>/${i('D')})² − 1]<br>aletas: CN<sub>α</sub> = ${i('K')}·4${i('N')}(${i('s')}/${i('D')})² ÷ (1 + √(1 + (2${i('l')}/(${i('c')}<sub>r</sub> + ${i('c')}<sub>t</sub>))²)), &nbsp; ${i('K')} = 1 + ${i('R')}/(${i('s')} + ${i('R')})`, true)}
    <div class="aqt-sttable" data-st="table"></div>
    <p class="aqt-where">El hombro de la botella se angosta hacia la cola, así que actúa como una "cola cónica" con sustentación negativa que adelanta el CP. Por eso las botellas solas necesitan aletas grandes.</p>`,
};

const CONTENT = { en: EN, es: ES };

export function learnTemplate() {
  const c = CONTENT[getLang()] || EN;
  const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`;
  return `
<section class="aqt-learn" data-id="learn" hidden aria-label="${t('learn.title')}">
  <div class="aqt-learn-head" data-id="learnHead" title="${t('learn.drag')}">
    <h3><span class="aqt-grip" aria-hidden="true">⠿</span>${t('learn.title')}</h3>
    <div class="aqt-seg" role="group" aria-label="${t('learn.level')}">
      <button type="button" data-learn="simple" aria-pressed="true">${t('learn.simple')}</button>
      <button type="button" data-learn="detailed" aria-pressed="false">${t('learn.detailed')}</button>
      <button type="button" data-learn="safety" aria-pressed="false">${t('learn.safety')}</button>
      <button type="button" data-learn="stability" aria-pressed="false">${t('learn.stab')}</button>
    </div>
    <div class="aqt-learn-tools">
      <button type="button" class="aqt-icon" data-id="learnFloat" title="${t('learn.detach')}" aria-label="${t('learn.detach')}">${icon('M4 4h10v2H6v8H4V4zm6 6h10v10H10V10zm2 2v6h6v-6h-6z')}</button>
      <button type="button" class="aqt-icon" data-id="learnDock" title="${t('learn.dock')}" aria-label="${t('learn.dock')}">${icon('M4 4h16v10H4V4zm2 2v6h12V6H6zm-2 10h16v4H4v-4z')}</button>
      <button type="button" class="aqt-icon" data-id="learnPop" title="${t('learn.popout')}" aria-label="${t('learn.popout')}">${icon('M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z')}</button>
      <button type="button" class="aqt-icon" data-id="learnClose" title="${t('learn.close')}" aria-label="${t('learn.close')}">✕</button>
    </div>
  </div>
  <div class="aqt-learn-body">
    <div class="aqt-learn-panel" data-learnpanel="simple">${c.simple()}</div>
    <div class="aqt-learn-panel aqt-detailed" data-learnpanel="detailed" hidden>${c.detailed()}</div>
    <div class="aqt-learn-panel aqt-detailed" data-learnpanel="safety" hidden>${c.safety()}</div>
    <div class="aqt-learn-panel aqt-detailed" data-learnpanel="stability" hidden>${c.stability()}</div>
  </div>
</section>`;
}

const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');

/** Drag-vs-speed chart for the simple explanation (needs the result). */
function dragSVG(P, res) {
  const es = getLang() === 'es';
  const S = res && res.summary;
  if (!S) return '';
  const rhoAir = (0.028964 * P.pressAtm) / (8.31451 * P.aTemperature);
  const Ab = (Math.PI / 4) * P.diaBot * P.diaBot;
  const k = 0.5 * rhoAir * P.CDrag * Ab;
  const W = P.massBot * P.gravity;
  const vmax = Math.max(S.maxVelocity, 1);
  const vt = Math.sqrt(W / k);
  const xmax = Math.max(vmax, vt) * 1.12;
  const ymax = Math.max(k * xmax * xmax, W) * 1.05;
  const x0 = 46;
  const y0 = 16;
  const w = 290;
  const h = 130;
  const X = (x) => x0 + (x / xmax) * w;
  const Y = (y) => y0 + h - (y / ymax) * h;
  let s = `<line x1="${x0}" y1="${y0 + h}" x2="${x0 + w}" y2="${y0 + h}" stroke="rgba(255,255,255,0.35)"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + h}" stroke="rgba(255,255,255,0.35)"/>`;
  let d = '';
  for (let i = 0; i <= 50; i++) {
    const vv = (xmax * i) / 50;
    d += `${i ? 'L' : 'M'}${X(vv).toFixed(1)},${Y(k * vv * vv).toFixed(1)} `;
  }
  s += `<path d="${d}" fill="none" stroke="#f85149" stroke-width="2.6"/>`;
  s += `<line x1="${x0}" x2="${x0 + w}" y1="${Y(W)}" y2="${Y(W)}" stroke="#b9c3cf" stroke-dasharray="5 4"/>`;
  s += `<text x="${x0 + 4}" y="${Y(W) - 5}" font-size="10.5" fill="#b9c3cf">${es ? 'peso del cohete vacío' : 'empty-rocket weight'} ${fmt(W, 1)} N</text>`;
  s += `<circle cx="${X(vt)}" cy="${Y(W)}" r="4.5" fill="#ffd166"/><text x="${X(vt)}" y="${Y(W) + 16}" font-size="10.5" fill="#ffd166" text-anchor="middle">vₜ ${fmt(vt, 0)} m/s</text>`;
  if (vmax <= xmax) s += `<circle cx="${X(vmax)}" cy="${Y(k * vmax * vmax)}" r="5" fill="#fff"/><text x="${X(vmax) - 6}" y="${Y(k * vmax * vmax) - 8}" font-size="11" fill="#e8edf3" font-weight="700" text-anchor="end">${es ? 'vel. máx.' : 'top speed'}: ${fmt(k * vmax * vmax, 1)} N</text>`;
  s += `<text x="${x0 + w}" y="${y0 + h + 16}" font-size="10.5" fill="#9aa7b6" text-anchor="end">${es ? 'velocidad (m/s)' : 'speed (m/s)'}</text><text x="${x0}" y="${y0 - 4}" font-size="10.5" fill="#9aa7b6">${es ? 'fuerza (N)' : 'force (N)'}</text>`;
  s += `<text x="${x0 + 10}" y="${y0 + 14}" font-size="11" fill="#f85149">${es ? 'arrastre D ∝ v²' : 'drag D ∝ v²'}</text>`;
  return `<svg class="aqt-svg" viewBox="0 0 350 170" role="img">${s}</svg>`;
}

/** Fill live numbers and redraw the design-dependent diagrams. */
export function fillLearn(root, P, res) {
  const g = P.gravity;
  const pPa = P.gPressure * 1e5;
  const rho = P.liquidDensity;
  const An = (Math.PI / 4) * P.diaNoz * P.diaNoz;
  const Ab = (Math.PI / 4) * P.diaBot * P.diaBot;
  const ve = Math.sqrt((2 * pPa) / rho);
  const F0 = 2 * pPa * An;
  const p0 = pPa + P.pressAtm;
  const airMass = (p0 / (P.Rgas * P.aTemperature)) * (P.volBot - P.volWat);
  const m0 = P.massBot + P.volWat * rho + airMass;
  const a0 = F0 / m0 - g;
  const Vair = P.volBot - P.volWat;
  const pAt = (V) => Math.max(0, p0 * Math.pow(Vair / V, P.gasGamma) - P.pressAtm) / 1e5;
  const rhoAir = (0.028964 * P.pressAtm) / (8.31451 * P.aTemperature);
  const S = res && res.summary;
  const vmax = S ? S.maxVelocity : NaN;
  const Dmax = 0.5 * rhoAir * vmax * vmax * P.CDrag * Ab;
  const vals = {
    p: fmt(P.gPressure, 1),
    pkg: fmt(pPa / 9.81 / 1e4, 1),
    pPa: Math.round(pPa).toLocaleString(loc()),
    rho: fmt(rho, 0),
    ve: fmt(ve, 1),
    vekmh: fmt(ve * 3.6, 0),
    hEq: fmt((ve * ve) / (2 * g), 0),
    An: An.toFixed(6),
    F0: fmt(F0, 0),
    Fpeak: S ? fmt(S.peakThrust, 0) : '–',
    Fkg: fmt(F0 / 9.81, 0),
    m0: fmt(m0 * 1000, 0),
    m0kg: fmt(m0, 3),
    a0: fmt(a0, 0),
    a0g: fmt(a0 / g, 1),
    Vair: fmt(Vair * 1000, 2),
    Vb: fmt(P.volBot * 1000, 2),
    pmid: fmt(pAt(Vair + P.volWat / 2), 1),
    pend: fmt(pAt(P.volBot), 1),
    vmax: fmt(vmax, 1),
    Dmax: fmt(Dmax, 1),
    Dratio: fmt(Dmax / (P.massBot * g), 0),
    hvac: S ? fmt(S.burnoutAltitude + (S.burnoutVelocity * S.burnoutVelocity) / (2 * g), 0) : '–',
    apo: S ? fmt(S.apogeeAltitude, 1) : '–',
    dt: S && S.steps ? fmt((S.burnoutTime / S.steps) * 1000, 3) : '–',
    steps: S && S.steps ? S.steps.toLocaleString(loc()) : '–',
    ms: res ? fmt(res.computeMs, 1) : '–',
  };
  const sr = stabilityReport(P, res);
  if (sr) {
    vals.cmx = fmt(sr.empty.cm.x * 100, 1);
    vals.cpx = fmt(sr.cp.x * 100, 1);
    vals.marg = fmt(sr.empty.margin, 2);
    vals.mstate = t('stab.s.' + sr.state);
    vals.extcm = fmt((P.bodyExt || 0) * 100, 0);
    vals.extg = fmt(Math.PI * P.diaBot * (P.bodyExt || 0) * 0.5 * 1000, 0);
  }
  root.querySelectorAll('.aqt-live').forEach((el) => {
    const k = el.dataset.k;
    if (k in vals) el.textContent = vals[k];
  });
  root.querySelectorAll('[data-dg="s-drag"]').forEach((el) => (el.innerHTML = dragSVG(P, res)));
  const rep = sr;
  renderDynamic(root, P, res, rep);
  root.querySelectorAll('[data-st="table"]').forEach((el) => {
    if (!rep) return (el.innerHTML = '');
    const cm = (x) => fmt(x * 100, 1) + ' cm';
    el.innerHTML = `<table class="aqt-sym aqt-sttab"><thead><tr><th>${t('st.col.part')}</th><th>${t('st.col.cna')}</th><th>${t('st.col.x')}</th></tr></thead><tbody>${rep.cp.parts
      .map((p) => `<tr><td>${t('st.part.' + p.k)}</td><td>${fmt(p.cna, 2)}</td><td>${cm(p.x)}</td></tr>`)
      .join('')}<tr class="aqt-sttot"><td>${t('st.part.total')}</td><td>${fmt(rep.cp.cna, 2)}</td><td>${cm(rep.cp.x)}</td></tr></tbody></table>`;
  });
}

/** Small "safety bar" under the launch pressure slider. */
export function safetyBarHTML(P) {
  const lim = bottleLimits(P);
  const p = P.gPressure;
  const top = Math.max(lim.burst * 1.35, p * 1.1);
  const pct = (x) => `${Math.min(100, (x / top) * 100).toFixed(1)}%`;
  const psi = (b) => Math.round(b * 14.5038);
  const state = p >= lim.burst ? 'danger' : p > lim.safe ? 'warn' : 'ok';
  const msg =
    P.bottleType === 'tested'
      ? t('safety.rated', { r: lim.rated, psi: psi(lim.rated) })
      : t('safety.typical', {
          b: t('bts.' + P.bottleType),
          s: lim.safe,
          spsi: psi(lim.safe),
          x: lim.burst,
          xpsi: psi(lim.burst),
          r0: lim.type.burstRange[0],
          r1: lim.type.burstRange[1],
        });
  return `
    <div class="aqt-sbar aqt-sbar-${state}">
      <div class="aqt-sbar-track" style="--safe:${pct(lim.safe)};--burst:${pct(lim.burst)}">
        <i class="aqt-sbar-mark" style="left:${pct(p)}"></i>
      </div>
      <div class="aqt-sbar-legend"><span>${t('safety.safe')}</span><span style="left:${pct(lim.safe)}">${lim.safe} bar</span>${P.bottleType === 'tested' ? '' : `<span style="left:${pct(lim.burst)}">${t('safety.burst', { b: lim.burst })}</span>`}</div>
      <p>${state === 'ok' ? '✓ ' : state === 'warn' ? '⚠ ' : '⛔ '}${msg}</p>
    </div>`;
}
