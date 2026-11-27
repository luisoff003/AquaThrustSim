/**
 * AquaThrust — parameter controls: slider + number box + unit + help, generated from
 * the FIELDS definitions. Logarithmic sliders for quantities spanning decades.
 */

import { t } from '../i18n.js?v=1.7.1';

const RES = 1000;
let uid = 0;

function toPos(f, v) {
  const t = f.scale === 'log' ? Math.log(v / f.min) / Math.log(f.max / f.min) : (v - f.min) / (f.max - f.min);
  return Math.round(Math.min(1, Math.max(0, t)) * RES);
}

function fromPos(f, pos) {
  const t = pos / RES;
  const v = f.scale === 'log' ? f.min * Math.pow(f.max / f.min, t) : f.min + (f.max - f.min) * t;
  return Math.round(v / f.step) * f.step;
}

export class FieldGroup {
  /**
   * @param {HTMLElement} host
   * @param {Array} fields
   * @param {() => object} getP  returns current parameters
   * @param {(key, value) => void} onChange
   * @param {Object<string,Function>} altText  per-key extra readouts (uiValue, P) => string
   */
  constructor(host, fields, getP, onChange, altText = {}) {
    this.fields = fields;
    this.getP = getP;
    this.onChange = onChange;
    this.altText = altText;
    this.rows = {};
    for (const f of fields) this.rows[f.key] = this.buildRow(host, f);
    this.refresh();
  }

  buildRow(host, f) {
    const id = `aqt-f-${f.key}-${++uid}`;
    const label = t('f.' + f.key);
    const helpText = t('h.' + f.key);
    const row = document.createElement('div');
    row.className = 'aqt-field';
    row.innerHTML = `
      <div class="aqt-field-head">
        <label for="${id}">${label}</label>
        <button type="button" class="aqt-help" aria-label="? ${label}" aria-expanded="false">?</button>
        <span class="aqt-alt" aria-live="polite"></span>
        <span class="aqt-num"><input type="number" inputmode="decimal" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}"><em>${f.unit}</em></span>
      </div>
      <input type="range" min="0" max="${RES}" step="1" aria-label="${label}">
      <div class="aqt-helptext" hidden><p>${helpText}</p><div class="aqt-helpextra"></div></div>`;
    host.appendChild(row);
    const num = row.querySelector('input[type=number]');
    const range = row.querySelector('input[type=range]');
    const alt = row.querySelector('.aqt-alt');
    const helpBtn = row.querySelector('.aqt-help');
    const help = row.querySelector('.aqt-helptext');
    helpBtn.addEventListener('click', () => {
      help.hidden = !help.hidden;
      helpBtn.setAttribute('aria-expanded', String(!help.hidden));
    });
    range.addEventListener('input', () => {
      const v = fromPos(f, Number(range.value));
      num.value = v.toFixed(f.digits);
      this.paintRange(range);
      this.onChange(f.key, f.fromUI(v));
      this.updateAlt(f, v);
    });
    num.addEventListener('change', () => {
      let v = Number(num.value);
      if (!Number.isFinite(v)) {
        num.classList.add('aqt-bad');
        return;
      }
      num.classList.remove('aqt-bad');
      v = Math.min(f.max, Math.max(f.min, v));
      num.value = v.toFixed(f.digits);
      range.value = toPos(f, v);
      this.paintRange(range);
      this.onChange(f.key, f.fromUI(v));
      this.updateAlt(f, v);
    });
    return { row, num, range, alt, f, extra: row.querySelector('.aqt-helpextra'), helpBtn, help };
  }

  paintRange(range) {
    const pct = (Number(range.value) / RES) * 100;
    range.style.setProperty('--pct', `${pct}%`);
  }

  updateAlt(f, v) {
    const r = this.rows[f.key];
    const fn = this.altText[f.key] || f.alt;
    r.alt.textContent = fn ? fn(v, this.getP()) : '';
  }

  refresh() {
    const P = this.getP();
    for (const key in this.rows) {
      const { num, range, f } = this.rows[key];
      const v = f.toUI(P[key]);
      num.value = v.toFixed(f.digits);
      range.value = toPos(f, v);
      this.paintRange(range);
      this.updateAlt(f, v);
    }
  }

  refreshAlts() {
    const P = this.getP();
    for (const key in this.rows) {
      const { f } = this.rows[key];
      this.updateAlt(f, f.toUI(P[key]));
    }
  }

  setDisabled(key, on) {
    const r = this.rows[key];
    if (!r) return;
    r.row.classList.toggle('aqt-disabled', on);
    r.num.disabled = on;
    r.range.disabled = on;
  }

  setInvalid(keys) {
    for (const key in this.rows) this.rows[key].row.classList.toggle('aqt-invalid', keys.includes(key));
  }
}
