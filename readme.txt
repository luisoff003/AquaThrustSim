=== AquaThrust Water Rocket Simulator ===
Tags: simulator, physics, education, 3d, rocket
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.7.1
License: GPLv2 or later

Interactive 3D water rocket simulator with a full physics model, live landscape and easy-to-read charts.

== Description ==

Design a water rocket, set up the launcher and the weather, then launch it and watch it fly in 3D.

* The bottle, nozzle, nose cone, launcher and landscape all react to the settings.
* The physics model includes the launch tube, unsteady water flow through the bottle neck, choked and sub-sonic air flow, condensation fog and quadratic drag.
* Results are explained with everyday comparisons, interactive charts, a phase timeline, a comparison with the previous launch, an optimal-water sweep and CSV export.

Everything runs in the visitor's browser. No external services or CDNs are used.

== Installation ==

1. Upload the plugin zip from Plugins → Add New → Upload Plugin, then activate it.
2. Add the shortcode [aquathrust] to any page or post.

Shortcode options:

* preset = classic | beginner | tube | highpressure | longtube | mountain
* height = height of the 3D view, e.g. 680px or 70vh
* lang = en | es | auto (default auto)

Example: [aquathrust preset="tube" height="680px"]

== Frequently Asked Questions ==

= The simulator does not appear =
Exclude the plugin's /assets/ folder from JavaScript combining, minifying and "delay JS" in your optimisation plugin. The files are ES modules and must stay separate.

= Does it work on phones? =
Yes. The layout stacks on small screens, and the 3D view supports touch to orbit and pinch to zoom.

== Changelog ==

= 1.7.1 =
* Fin size help: simple trapezoid drawing with the real root, tip, span and sweep in mm (print template removed).

= 1.7.0 =
* Stability details now open in a draggable floating window (no more switching tabs); back to three settings tabs.
* Fin template: the fin-size help shows the real fin shape with dimensions (curved root matching the bottle, glue tab) and a printable 1:1 template with a scale ruler.

= 1.6.0 =
* All design settings in the Rocket tab (new \"Nose, fins & body\" and \"Air drag\" sections, with a stability badge); the Stability tab is now the analysis view.
* Detailed model and Stability chapter explain, with a diagram, how stability relates to the flight calculation (mass and Cd enter the 1-D flight; CM/CP are a separate validity check).

= 1.5.0 =
* Drag coefficient: Auto (estimated from length, fins, nose shape, air temperature and pressure, with a breakdown) or Custom (your own / measured value).
* New Nose shape setting (pointed, rounded, blunt), independent from the drag coefficient.

= 1.4.0 =
* Body extension (Stability tab): an empty tube between bottle and nose that makes the rocket longer without more volume; counts in stability, 3D and flight mass, with an Apply suggestion.
* Simple explanation: two new illustrated steps about stability (flying straight like a dart; longer = more stable but heavier) with live numbers.

= 1.3.0 =
* New "Bottle model" list (soda 500 mL to 3 L, still water 500 mL to 1.5 L): sets diameter, volume, nozzle, empty mass, water and bottle type in one click.

= 1.2.1 =
* Updates now always reach visitors: every JavaScript module and the stylesheet carry the plugin version in their URL (cache busting), plus an .htaccess that asks browsers to revalidate.

= 1.2.0 =
* New Stability tab: centre of mass (CM) and centre of pressure (CP, Barrowman method), static margin with the rocket empty and at launch, fin count / fin size / nose weight, suggestions with an "Apply" button, CM and CP markers on the 3D rocket (the CM moves as the water drains), stability tile in the results and a Stability chapter in "How it works".
* Removed the "Copy link" button.

= 1.1.0 =
* English / Spanish (Mexico) interface.
* Detachable "How it works" panel (floating, docked or separate window) with illustrated and engineering diagrams.
* Bottle-safety graphics: risk gauge, everyday pressure scale, stored energy.
* Fixed: launch tube now appears in 3D as soon as a length is set (a diameter is filled in automatically); warning when the tube is longer than the bottle.

= 1.0.0 =
* First release.
