# AquaThrust — 3D Water Rocket Simulator

A browser-based water rocket simulator with a full physics model, a 3D scene and
charts that a general audience can read. It runs entirely in the visitor's browser,
with no server code and no external CDN. It works as a WordPress plugin, inside an
iframe, or as a plain static page.

* **Design the rocket**: the bottle you see in 3D is built from the same geometry the
  physics uses (diameter, volume, nozzle, shoulder shape). The drag coefficient shapes
  the nose cone, and the liquid density changes the liquid's colour.
* **Set up the launcher**: pressure gauge, optional launch tube, launcher volume, and
  gas source (foot pump, or CO₂ / helium / nitrogen cylinders).
* **Set the weather**: the landscape reacts live.
  * Temperature controls the season (snow, green, dry, desert).
  * Humidity controls haze, fog and clouds.
  * Air pressure sets the altitude, shown as alpine mountains and a deeper sky.
  * Gravity sets the latitude, which moves the sun.
* **Launch**: countdown, then a slow-motion water jet with splashes, the air blast
  with its fog cloud, and a follow camera. An altitude ruler and apogee marker show
  the height, and the rocket noses over before landing.
* **Understand the results**:
  * everyday comparisons ("as high as the Leaning Tower of Pisa")
  * phase timelines and six interactive charts
  * a comparison with your previous launch
  * a "best amount of water" sweep
  * a data table with CSV export
* **Pressure safety**: choose a still-water bottle, a soda bottle or a pressure-tested
  rocket. A safety bar under the pressure slider, colour zones on the 3D gauge and
  graded warnings tell you when you exceed the typical safe or burst pressure (for
  example, a soda bottle is safe up to about 7 bar and bursts around 10–14 bar).
* **English and Spanish**: switch with the EN / ES buttons. The Spanish version uses
  Mexican references (Pirámide del Sol, Ángel de la Independencia, Metro de la CDMX,
  refresco, tinaco, subibaja…). It defaults to the visitor's last choice, then to the
  browser language.
* **How it works** button: opens a **detachable** explanation panel. You can float and
  drag it, dock it below the simulator, or pop it out into its own window (handy on a
  second screen or projector). It has three tabs:
  * **Simple explanation**: eight illustrated steps with analogies and simple
    equations, filled in with the visitor's own numbers.
  * **Detailed model**: engineering diagrams with every equation. These include the
    phase state machine, a free-body diagram, a to-scale section of the visitor's
    bottle with Bézier control points, a p–V diagram, choked vs sub-sonic nozzle flow,
    condensation, the coast with and without drag, and RK4 slopes.
  * **Bottle safety**: a risk gauge, the visitor's pressure on a scale of everyday
    pressures, and stored energy compared with a hydro-test.
* **Drag coefficient, Auto or Custom**: in Auto, Cd is estimated from the design with the
  standard component build-up method: skin friction from the Reynolds number, fin
  friction, nose shape, shoulder and base, and fin edges. The Rocket tab shows the
  breakdown. Custom uses your own value, e.g. a measured one. The nose shape (pointed /
  rounded / blunt) is now its own setting.
* **Stability (CM / CP)**: a Stability tab computes the centre of mass and centre of
  pressure (Barrowman method), and from them the static margin in calibres:
  * The margin is given with the rocket empty (the main criterion) and at launch
    with water, which is always worse because the water sits at the tail.
  * Settings: number of fins, fin size, nose weight and a body extension (an empty
    tube between the bottle and the nose: longer, not bigger; about 0.5 kg/m² of tube). The nose weight adds to the
    flight mass, so the stability-vs-height trade-off is real.
  * Concrete suggestions, e.g. "add 230 g to the nose", with an Apply button that
    also shows the new apogee.
  * CM and CP markers on the 3D rocket; the CM moves during the flight as the water
    drains.
  * A results tile, plus a Stability chapter in "How it works" with diagrams, the
    dart / shuttlecock / weathervane analogies and home tests (balance, cardboard
    cut-out, swing test).
* Metric / imperial units, full screen, and a mobile layout.

## Folder layout

```
AquaThrustSimulator/
├── aquathrust-simulator.php   WordPress plugin (shortcode [aquathrust])
├── readme.txt                 WordPress plugin readme
├── index.html                 standalone page (also usable in an iframe)
├── assets/
│   ├── css/aquathrust.css
│   ├── js/
│   │   ├── main.js            entry point (auto-mounts [data-aquathrust])
│   │   ├── app.js             UI, playback, camera, results
│   │   ├── physics/           engine.js, bottle.js, presets.js, stability.js  ← the model
│   │   ├── scene/             world.js, rocket.js, launcher.js, effects.js, util.js
│   │   ├── i18n.js            all interface texts, English + Mexican Spanish
│   │   └── ui/                controls.js, charts.js, format.js, learn.js, diagrams.js
│   └── vendor/                three.js r170 (MIT) + OrbitControls
└── docs/MODEL.md              the physics, equations and validation
```

## Option A: WordPress plugin (recommended)

1. Zip the `AquaThrustSimulator` folder, or use the ready-made
   `aquathrust-simulator-wordpress.zip`.
2. In WordPress, go to **Plugins → Add New → Upload Plugin**, choose the zip, then
   click **Install** and **Activate**.
3. On any page or post, add a **Shortcode** block containing:

   ```
   [aquathrust]
   ```

   Options:

   ```
   [aquathrust preset="tube" height="680px" lang="es"]
   ```

   `lang` is `en`, `es` or `auto` (the default). Visitors can always switch
   language with the EN / ES buttons.

   The available presets are `classic`, `beginner`, `tube`, `highpressure`, `longtube`
   and `mountain`.

The simulator runs inside a Shadow DOM, so your theme's CSS cannot break it and its
CSS cannot leak into your theme. Choose a **full-width** page template for the best
result.

> If you use a caching or optimisation plugin (WP Rocket, LiteSpeed, Autoptimize,
> SiteGround Optimizer…), the plugin already asks it not to combine or minify these
> files. If the simulator does not appear, exclude `/AquaThrustSimulator/assets/` from
> JS combining, minifying and "delay JS".

## Option B: iframe (any website, including WordPress.com without plugins)

Upload the folder to your hosting, for example to `https://yoursite.com/aquathrust/`.
Then add a **Custom HTML** block:

```html
<iframe src="https://yoursite.com/aquathrust/index.html?embed=1"
        style="width:100%;height:1400px;border:0;border-radius:18px"
        allow="fullscreen" loading="lazy" title="Water rocket simulator"></iframe>
```

## Option C: static page / your own HTML

```html
<div data-aquathrust data-preset="classic" data-height="620px"></div>
<script type="module" src="/path/to/AquaThrustSimulator/assets/js/main.js"></script>
```

Or mount it manually with `window.AquaThrust.mount(element, { preset: 'classic' })`.

## Updating the plugin on WordPress

1. In WordPress go to **Plugins → Add New → Upload Plugin**, choose the new zip and
   click **Install Now**.
2. WordPress detects that AquaThrust is already installed. Click
   **Replace current with uploaded**.
3. Clear every cache:
   * your caching plugin (WP Rocket, LiteSpeed, W3 Total Cache… → *Purge all*)
   * your hosting cache
   * your CDN, if you use one (e.g. Cloudflare → *Purge everything*)
4. Reload the page with **Ctrl + F5** (**Cmd + Shift + R** on a Mac). The footer of the
   simulator shows the installed version, e.g. *AquaThrust v1.2.1*.

## Making a new release (for developers)

Run `python tools/set_version.py X.Y.Z --zip`. It stamps the version onto every
module import and the CSS URL, the plugin header, readme.txt and the footer, then
builds `../aquathrust-simulator-wordpress.zip`, leaving out `tools/`. Always bump the
version: the new URLs are what make browsers, caching plugins and CDNs fetch the new
files.

## Testing locally

ES modules do not load from `file://`. Serve the folder over HTTP instead:

```
cd AquaThrustSimulator
python -m http.server 8000
# open http://localhost:8000
```

## Using the physics on its own

```js
import { simulate } from './assets/js/physics/engine.js';
import { BASE } from './assets/js/physics/presets.js';
const r = simulate({ ...BASE, gPressure: 6, volWat: 0.0007 });
console.log(r.summary.apogeeAltitude, r.summary.maxVelocity);
```

A simulation takes about 2–15 ms, so the app re-runs it every time a slider moves
(the "Predicted apogee" badge).

## Requirements

A modern browser with WebGL (Chrome, Edge, Firefox or Safari from 2021 onwards) on
desktop or mobile. The total download is about 1.5 MB, which most servers gzip to
about 350 KB.

## Credits and licence

* The physics model is derived from the water rocket simulator at
  aircommandrockets.com. See `docs/MODEL.md`.
* 3D rendering uses [three.js](https://threejs.org) (MIT licence, see
  `assets/vendor/three-LICENSE.txt`).
