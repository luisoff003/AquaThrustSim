# AquaThrust — the physics model

This document describes the flight model implemented in
[`assets/js/physics/engine.js`](../assets/js/physics/engine.js) and
[`assets/js/physics/bottle.js`](../assets/js/physics/bottle.js).

The model was extracted from the minified JavaScript of the web simulator published at
aircommandrockets.com (`compressed.js`, classes `Engine`, `LaunchTube`, `Water`, `Gas`,
`Nozzle`, `Condensation`, `RK4`). It was rewritten from scratch as readable, documented
code. A few bugs were corrected; they are listed at the end.

All quantities are SI. Flight is one-dimensional (straight up and down).

The same explanations, in both a simple and a detailed version, also appear inside the
simulator under **How the simulation works**. The simple version fills in the
visitor's own numbers.

---

## Part 1: the simple explanation

A water rocket is a bottle that **throws water downwards very fast**. When you throw
something one way, you are pushed the other way (Newton's third law). If you stand on a
skateboard and throw a heavy ball forwards, you roll backwards. A garden hose kicks in
your hand for the same reason. Water is about 800 times heavier than air, so throwing
water gives a far bigger push than throwing air alone.

| Step | What happens | Simple equation | Analogy |
|---|---|---|---|
| 1 | The pump squeezes air above the water and stores energy | pressure = force ÷ area | winding a spring |
| 2 | The air pushes the water out of the nozzle | v ≈ √(2·p ÷ ρ) | water squirting from a hole at the bottom of a full tank |
| 3 | Throwing water creates thrust | F = ṁ·v = ρ·A·v² ≈ 2·p·A | the kick of a garden hose |
| 4 | Thrust accelerates the rocket | a = F ÷ m − g | a light cart is easier to push than a heavy one |
| 5 | The air expands, its pressure drops and it cools (fog) | p·V^1.4 = constant | a spring pushing less as it relaxes; a spray can getting cold |
| 6 | Gravity and air drag slow the coasting rocket | D = ½·ρ_air·v²·C_d·A | a hand out of a car window: double the speed, four times the push |
| 7 | The computer adds up tiny time slices | v_new = v + a·Δt, h_new = h + v·Δt | the pages of a flip-book |

**Worked example** (classic 2 L soda bottle, 7 bar, 0.5 L water, 22 mm nozzle):

* 7 bar pushes with the weight of about 7.1 kg on every square centimetre.
* Water speed: v ≈ √(2 × 700,000 ÷ 997) ≈ 37.5 m/s, or 135 km/h.
* Thrust: F ≈ 2 × 700,000 Pa × 0.00038 m² ≈ 532 N. The full simulation peaks at
  541 N, which is like holding up 54 kg.
* Lift-off mass is 0.61 kg, so a ≈ 532 ÷ 0.61 − 9.8 ≈ 860 m/s², about 88 g.
* The air grows from 1.6 L to 2.1 L, so the pressure falls from 7.0 to about 4.5 bar
  by the time the water is gone. The leftover air then gives a short extra kick.
* At the top speed of 79 m/s, drag is about 16 N, roughly 16 times the empty rocket's
  weight. Without air the rocket would climb about 311 m (h = v²/2g). With air it
  reaches 59 m.
* The computer cuts the powered flight into about 3,500 slices of 0.024 ms each.

**Why there is a best amount of water.** It works like a seesaw. More water gives the
rocket more mass to throw, but it also makes the rocket heavier and leaves less room
for compressed air. For most bottles the best fill is about one third. The "How much
water is best?" chart in the app computes it exactly.

## Where each setting is used

| Setting | Used in | Effect |
|---|---|---|
| Bottle diameter, volume | geometry, drag area, gas volume | bigger = more air and water, but more drag |
| Water | mass, gas volume, water height `q` | the "propellant" (best ≈ ⅓ full) |
| Nozzle diameter | `A_n` in phases 1–2 | wider = more thrust for a shorter time |
| Empty mass | all phases, coast | lighter = higher, but more affected by drag |
| Drag coefficient | `k = ½C_d A_b ρ_air` | how much the air slows the rocket |
| **Shoulder length / neck curvature / shoulder roundness** | Bézier control points of the bottle shoulder → `V(q)`, `F(q)`, `A(q)` in phase 1 | changes how high the water stands, the water-column inertia, and the 3D bottle shape |
| **Water / air thrust efficiency** | `η_w` multiplies the pressure term driving the water; `η_g` multiplies the air thrust | allow for friction, turbulence and a spread-out jet (0.97 is typical) |
| Launch pressure | `p₀` | the stored energy |
| Launch tube length / diameter, launcher volume | phase 0 | a "free" piston push before the water flows |
| Gas | `γ`, `R` | CO₂, helium and nitrogen expand differently from air |
| Temperature, air pressure | `ρ_air`, `T₀`, `p_a` | thinner, warmer air means less drag |
| Humidity | condensation model | when and whether fog forms (small effect on flight) |
| Gravity, liquid density | `g`, `ρ_l` | latitude effect; heavier liquids give more thrust per litre |
| Bottle type / tested rating | safety warnings only | does not change the physics |

## Bottle pressure safety (used for the warnings)

| Bottle type | Recommended max | Typical burst |
|---|---|---|
| Still-water bottle (thin PET) | ≤ 3 bar (≈ 44 psi) | ≈ 4–6 bar (warnings from 4 bar) |
| Soda / fizzy-drink bottle (PET) | ≤ 7 bar (≈ 100 psi) | ≈ 10–14 bar (150–200 psi) when new (warnings from 10 bar) |
| Pressure-tested / reinforced rocket | ≤ its hydro-test rating | — |

These are typical values for new, undamaged bottles at room temperature. Real bottles
vary. Scratches, sunlight, heat, age and every previous launch make a bottle weaker.

The app grades the launch pressure for the chosen bottle type:

* **Green:** at or below the recommended maximum.
* **Amber "Careful":** above the recommended maximum but below the typical burst
  pressure.
* **Red "Danger":** at or above the typical burst pressure. For a tested rocket, red
  means above its rating.

The warnings never block the simulation, but they appear next to the slider, on the
3D gauge and in the results.

---

## Part 2: the detailed model

## Inputs

| Symbol | Parameter | Unit |
|---|---|---|
| `p_g` | launch pressure (gauge) | bar |
| `T₀` | air temperature | K |
| `p_a` | ambient pressure | Pa |
| `φ` | relative humidity | 0–1 |
| `g` | gravity | m/s² |
| `D_b`, `D_n` | bottle / nozzle diameter | m |
| `V_b`, `V_w` | bottle volume / water volume | m³ |
| `m_0` | empty rocket mass | kg |
| `C_d` | drag coefficient | – |
| `L_t`, `D_t` | launch-tube length / diameter | m |
| `V_L` | launcher (dead) volume | m³ |
| `η_w`, `η_g` | water / gas thrust efficiency | – |
| `noz0..2` | shoulder shape (0–1) | – |
| `γ`, `R` | gas heat-capacity ratio, specific gas constant | –, J/(kg·K) |
| `ρ_l` | liquid density | kg/m³ |

Derived: `p₀ = p_g·10⁵ + p_a`, `A_n = πD_n²/4`, `A_b = πD_b²/4`,
`A_t = πD_t²/4`, air density `ρ_air = M_air·p_a/(R_u·T₀)` and the drag constant
`k = ½·C_d·A_b·ρ_air`, so that drag `= k·v|v|`.

## Bottle geometry

The inside of the bottle (nozzle at z = 0, pointing down) is:

1. a straight **neck** of diameter `D_n` and height `0.8·D_n`
2. a **shoulder**: a cubic Bézier curve with control points
   `r = [D_n/2, D_n/2, (D_n + noz2·(D_b−D_n))/2, D_b/2]` and
   `z = [0.8D_n, z₁, z₁, z₃]`, where `z₃ = 2.3D_n + noz0·(1.8D_b − 2.3D_n)` and
   `z₁ = 1.5D_n + noz1·(z₃ − 2D_n)`
3. a **cylinder** of diameter `D_b`
4. a **dome** on top, of height `D_b/4` and volume ≈ `A_b·D_b/6`.

The shoulder is split into 13 segments. In each segment the area varies linearly with
height, `A(z) = a₀ + κ(z − z₀)`. This gives closed forms for:

* water volume below height `h`: `V(h) = V₀ + (a₀ + ½κb)·b`, with `b = h − z₀`
* the **inertia length** `F(h) = ∫₀ʰ A_n/A(z) dz`. Per segment, its increment is
  `(A_n/κ)·ln(1 + κb/a₀)`, or `A_n·b/a₀` when `κ = 0`.

## Phase 0 — launch tube (optional)

The rocket slides up the tube, which plugs the nozzle. The gas volume is
`V₀ = V_L + V_b − V_w − 0.4·L_t·A_t`. The rocket mass `m` is the empty mass plus the
air mass plus the water mass. With adiabatic expansion:

```
ratio = V₀ / (V₀ + A_t·z)
p = p₀·ratio^γ          T = T₀·ratio^(γ−1)
F = (p − p_a)·A_t
a = (F − k·v|v|)/m − g
```

The phase ends when `z = L_t`. If `a ≤ 0` on the pad, the rocket never lifts off.

## Phase 1 — water thrust

State: `[height, velocity, u_e (nozzle exit velocity, negative), q (water surface height)]`.
`ρ_r = A_n/A(q)` is the area ratio. The gas follows `p = p_s·(V_g0/(V_b − V(q)))^γ`
(clamped at `p_a`), and the total mass is `m = m_dry + ρ_l·V(q)`. Unsteady Bernoulli
through the variable-section bottle, coupled to the accelerating rocket:

```
D      = ρ_l·A_n·q² − F(q)·m
U      = ½(ρ_r² − 1)·u_e²·m
f      = ρ_l·A_n·(1 − ρ_r)·u_e² − k·v|v|          (momentum thrust − drag)
du_e/dt = (U + f·q + (p − p_a)·η_w·m/ρ_l) / D
a      = (f − ρ_l·A_n·q·du_e/dt)/m − g
dq/dt  = u_e·ρ_r
thrust = ρ_l·A_n·(1 − ρ_r)·u_e²
```

The phase ends when the water is gone. If the gas pressure drops to ambient first,
the leftover water becomes part of the coasting mass.

## Phase 2 — gas (air) thrust

State: `[height, velocity, ρ (gas density)]`. Isentropic blow-down:
`p = p_s(ρ/ρ_s)^γ` and `T = T_s(ρ/ρ_s)^(γ−1)`.

* **Choked** while `p·(2/(γ+1))^(γ/(γ−1)) ≥ p_a`:
  `p_e = p·crit`, `v_e = −√(2γRT/(γ+1))`, `ρ_e = ρ·(2/(γ+1))^(1/(γ−1))`
* **Sub-sonic** after that:
  `p_e = p_a`, `v_e = v_e*·√((γ+1)/(γ−1))·√(1 − (p_a/p)^((γ−1)/γ)) − 0.1`,
  `ρ_e = ρ_s(p_a/p_s)^(1/γ)`

```
ṁ  = A_n·ρ_e·v_e
F  = (A_n·(p_e − p_a) + ṁ·v_e)·η_g
a  = (F − k·v|v|)/(m₀ + ρV_b) − g
dρ/dt = ṁ / V_b
```

## Condensation (fog)

The saturation vapour pressure is `p_sat = exp(25.87 − 5310/T₀)` and the vapour mole
fraction is `x₀ = φ·p_sat/p₀`. The dew temperature `T_c` of the expanding gas is found
by fixed-point iteration:
`T_c = 5425.2 / (28.99 − ln(φ·p_sat) − γ/(γ−1)·ln(T_c/T₀))`.

When the gas first cools below `T_c`, latent heat is released. The temperature is
multiplied by `1 + ΔT/T`, where `ΔT = 6165·(γ−1)·x₀`. The pressure is multiplied by the
same factor times `(1 − x₀)^γ`. In the 3D view this is the moment the bottle fills
with fog.

## Phase 3 — coast (closed form)

With terminal velocity `v_t = √(m g / k)`, `τ = v_t/g` and `H = v_t²/g`:

* rising: `h(t) = h_apo + H·ln cos((t_apo − t)/τ)`, `v = v_t·tan((t_apo − t)/τ)`
* falling: `h(t) = h_apo − H·ln cosh((t − t_apo)/τ)`, `v = −v_t·tanh((t − t_apo)/τ)`
* apogee: `t_apo = t_b + τ·atan(v_b/v_t)`, `h_apo = h_b + (H/2)·ln(1 + (v_b/v_t)²)`
* impact: `t_imp = t_apo + τ·acosh(e^(h_apo/H))`, `v_imp = −v_t·√(1 − e^(−2h_apo/H))`

With no drag (`k = 0`), ordinary ballistic formulas are used.

## Drag coefficient: estimate, extras and measurement

### Automatic estimate (`physics/drag.js`)

In Auto mode `C_d` is a component build-up referred to the bottle frontal area
`A = πD²/4`, evaluated at `v_ref = 35 m/s`:

```
C_d = 1.1 · [ C_f·(1 + 60/(L/D)³ + 0.0025·L/D)·S_wet/A      body + nose friction
            + 2·C_f·(1 + 2t/c)·N·S_fin/A                  fin friction
            + C_d,nose + C_d,tail                         pressure drag
            + k_e·N·t·s/A                                 fin edges
            + C_d,joint + Σ C_d,i·A_i/A ]                 extras
C_f = f_surface · 0.074 / Re^0.2,   Re = v·L/ν  (ν from Sutherland's law and ρ_air)
```

| Extra | Parameter | Effect |
|---|---|---|
| Surface finish | `surface`: smooth / painted / tape / rough | `f_surface` = 1.00 / 1.12 / 1.25 / 1.5 on `C_f` |
| Fin edges | `finEdge`: square / rounded / airfoil | `k_e` = 1.0 / 0.5 / 0.15 |
| Body extension | `bodyExt` | longer `L` (more `S_wet`, higher Re) plus `C_d,joint` = 0.015 |
| Add-ons | `addons`: `lug`, `cam` | launch lug 1.0 × 35 mm², side camera 0.6 × 6 cm² |

Only the friction terms depend on speed (`C_f ∝ Re^−0.2`, about −13 % per doubling of
speed). `cdVsSpeed()` gives `C_d(v)` for the Drag lab chart; the flight itself uses the
single value at `v_ref`.

**Sensitivity.** The coast gain is `(H/2)·ln(1 + v_b²/v_t²)` with `v_t² ∝ 1/C_d`, so for
`v_b ≫ v_t` a relative error ε in `C_d` gives roughly a relative error ε in the coast
height. The Drag lab shows the apogee at `0.8·C_d`, `C_d` and `1.2·C_d`.

### Measuring `C_d` (`physics/cdfit.js`, Drag lab window)

1. **Coast video**, `fitCoastVideo`. Points `(t, h)` from burnout to apogee are fitted
   with the exact solution of `m·a = −m·g − k·v²`:
   `h(t) = h₀ + (v_t²/g)·ln[cos(φ₀ − g(t−t₀)/v_t) / cos φ₀]`, `φ₀ = atan(v₀/v_t)`.
   The unknowns are `C_d`, `v₀` and `h₀`. `h₀` is solved in closed form (mean offset),
   and `v₀` and `C_d` by nested grid + golden-section searches (`C_d` on a log scale,
   0.02–4). The error is reported as RMS, next to the RMS of the best vacuum parabola.
   The range (about ±2σ) is where the residual sum grows by a factor `1 + 4/(n−3)`.
   This isolates drag from the thrust model, so it is the recommended experiment.
2. **Several launches**, `fitLaunches`. For each launch the apogee (or flight time) is
   simulated on a 15-point log grid of `C_d` (0.04–3) and inverted by log–log
   interpolation, which works because the apogee decreases monotonically with `C_d`. A
   single best `C_d` minimises `Σ((h_model − h_meas)/h_meas)²`. A launch flagged
   `high` (higher than any `C_d` allows) or `low` is excluded. The result is an
   *effective* `C_d` that also absorbs thrust-model errors.
3. **Drop test**, `dropTest`. From rest, `h = (v_t²/g)·ln cosh(g·t/v_t)` is solved for
   `v_t` by bisection, then `C_d = 2mg/(ρ·A·v_t²)`. The uncertainty uses
   `max(s/√n, resolution/√n)`, with a resolution of 0.1 s for a stopwatch and 0.03 s
   for video. `dropPlan()` gives the drop height at which drag lengthens the fall by
   10 %.

Each calculator has **practice data**: the simulator generates measurements from a
hidden `C_d` (the estimate × 1.05–1.40, the same for the three experiments) with noise (σ = 4 % on apogee, 0.25 m on video
heights, 0.02–0.07 s on drop times), and shows the hidden value after the fit.

**Calibrating the model.** If the launch `C_d` differs from the video `C_d` by more
than about 15 %, the difference is in the thrust model. Fix `C_d` to the video value,
then adjust `η_w` until the launches match.

## Numerical method

The equations are integrated with classical 4th-order Runge–Kutta. The step is
`Δt = √(10⁻⁶ / |a₀|)` (clamped to 1 µs–0.5 ms). Each phase is closed with the
original's look-ahead: once the predicted remaining time drops below one step, the
solver takes that remaining time as a final step and repeats once to converge on the
event. Every step is recorded. Impulse is integrated with the trapezoidal rule.

**Note on "thrust".** During the water phase, the reported thrust is the jet's
momentum flux `ρ_l·A_n·(1 − ρ_r)·u_e²`, as in the original. The rocket's acceleration
also contains the water-column term `−ρ_l·A_n·q·du_e/dt`. That term is small for
normal bottles, but it matters when the nozzle is almost as wide as the bottle. In that
case the reported impulse understates what the rocket actually receives. Altitudes and
velocities are unaffected, because they come from the full equation.

## Stability: centre of mass and centre of pressure

`physics/stability.js` evaluates static stability. It doesn't change the 1-D
trajectory, which always assumes the rocket flies straight. Distances `x` are measured
back from the nose tip, and `D` is the bottle diameter (1 calibre).

**Centre of mass**: `x_CM = Σ mᵢ·xᵢ / Σ mᵢ`. The parts are:

* the empty rocket, split into the bottle shell (70 %), the nose cone (15 %) and the
  fins (15 %)
* the nose weight (`noseMass`)
* the liquid, placed at the centroid of its real shape in the bottle, computed from
  the bottle profile

The nose weight also adds to the flight mass.

**Centre of pressure** (Barrowman): `x_CP = Σ CNα,ᵢ·xᵢ / Σ CNα,ᵢ`, with three parts:

* nose: `CNα = 2`, at 0.33–0.47 of the nose length depending on its shape
* bottle shoulder (a boat-tail from `D` to `Dₙ`): `CNα = 2[(Dₙ/D)² − 1]`. This is
  negative, which moves the CP forward.
* fins: `CNα = K·4N(s/D)² / (1 + √(1 + (2l/(c_r + c_t))²))`, with `K = 1 + R/(s + R)`,
  at Barrowman's fin CP

**Static margin** = `(x_CP − x_CM) / D`:

| Margin | Rating |
|---|---|
| < 0 | unstable |
| 0–1 | marginal |
| 1–3 | stable |
| > 3 | over-stable |

The margin is judged **with the rocket empty**. The coast is about 99 % of the
flight, while during the ~0.1 s of thrust the launcher guides the rocket and the
water sits at the tail. The margin at launch, with water, is also reported, and
it is always lower.

**Suggestions**: the app gives the nose weight, or the fin span, that reaches 1 calibre
with the rocket empty. The nose weight is solved directly from the CM equation, and the
fin span by bisection. Bigger fins alone can't push the CP behind the fins'
own position. That is why a plain 2 L bottle usually needs nose weight: about 230 g for
the classic preset. That weight lowers its apogee from 59 m to 51 m.

## Summary values

* **Burn time**: last instant with thrust ≥ 5 % of peak.
* **Average thrust**: impulse up to burn time ÷ burn time.
* **Motor class**: model-rocket letter by total impulse (A ≤ 2.5 N·s, each next letter
  doubles), followed by the average thrust in N (e.g. `D284`).

## Validation against the original

The original engine and this one were run side by side in a browser on the same
inputs. In "legacy" mode (`simulate(P, {legacy: true})`), the original's quirks are
reproduced, and apogee matches as follows:

| Preset | Original apogee | AquaThrust (legacy) | AquaThrust (corrected) |
|---|---|---|---|
| Classic 2 L | 59.55 m | 59.61 m | 59.25 m |
| 2 L + launch tube | 66.24 m | 66.31 m | 65.93 m |
| High pressure 69 bar | 693.92 m | 694.00 m | 686.36 m |
| Long tube 51 bar | 610.44 m | 610.61 m | 603.50 m |
| Mountain winter | 71.66 m | 71.73 m | 70.00 m |
| Beginner 1.5 L | 47.18 m | 46.51 m | 46.11 m |

The original's *total impulse* reads 1–5 % high. It sums sparse samples with a
rectangle rule, whereas AquaThrust integrates every step. The burnout velocities agree,
which confirms that the momentum delivered is the same.

## Corrections made to the original

1. **Pressure units**: the original converts the gauge pressure with
   `101325·(p+1)` (atmospheres, labelled bar). AquaThrust uses `p·10⁵ + p_a`.
2. **Inertia integral**: the original tested the wrong segment's slope (`B[0]`
   instead of `B[l]`), so the shoulder's `∫A_n/A dz` used a rectangle approximation.
   The exact logarithmic form is now used.
3. **Ambient temperature text box**: the original stored `°C − 273.15` instead of
   `°C + 273.15` when typing a value.
4. **Launch tube with zero diameter**: the original made the rocket fail to fly.
   A tube is now ignored unless both length and diameter are > 0.
5. **Heavy rockets**: the original could loop forever or abort when thrust < weight.
   AquaThrust keeps the rocket on the pad and reports "no lift-off".
6. **Condensation check**: the original checked it only at plotting samples.
   AquaThrust checks it every integration step.
