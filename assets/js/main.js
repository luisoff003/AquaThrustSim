/**
 * AquaThrust entry point. Mounts the simulator into every element carrying the
 * `data-aquathrust` attribute, e.g.
 *   <div data-aquathrust data-preset="classic" data-height="620px" data-lang="es"></div>
 * data-lang: en | es (optional; otherwise the visitor's last choice or browser language)
 * and exposes window.AquaThrust.mount(element, options) for manual use.
 */
import { mount } from './app.js?v=1.7.1';

function mountAll() {
  document.querySelectorAll('[data-aquathrust]').forEach((el) => {
    if (el.__aquathrust) return;
    mount(el, { preset: el.dataset.preset || '', height: el.dataset.height || '', lang: el.dataset.lang || '' });
  });
}

window.AquaThrust = { mount, mountAll };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
else mountAll();
