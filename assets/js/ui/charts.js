/**
 * AquaThrust — lightweight, dependency-free canvas line chart.
 * Features: phase bands, crosshair + tooltip on hover/touch, an animation playhead,
 * event markers, multiple series (current vs previous run) and a legend.
 */

import { t as tr, loc } from '../i18n.js?v=1.7.1';

const THEME = {
  text: '#e8edf3',
  muted: '#9aa7b6',
  grid: 'rgba(255,255,255,0.07)',
  axis: 'rgba(255,255,255,0.22)',
  playhead: 'rgba(255,255,255,0.55)',
  surface: '#111a27',
};

function niceStep(range, target) {
  const raw = range / Math.max(1, target);
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return n * p;
}

function ticks(min, max, target) {
  if (!(max > min)) {
    max = min + 1;
  }
  const step = niceStep(max - min, target);
  const t0 = Math.ceil(min / step - 1e-9) * step;
  const out = [];
  for (let v = t0; v <= max + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return { out, step };
}

function fmt(v, step) {
  const d = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step)));
  const a = Math.abs(v);
  if (a >= 10000) return (v / 1000).toFixed(a >= 100000 ? 0 : 1) + 'K';
  return v.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d });
}

function interp(xs, ys, x) {
  let lo = 0;
  let hi = xs.length - 1;
  if (hi < 0) return NaN;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[hi]) return x - xs[hi] < 1e-9 ? ys[hi] : NaN;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (xs[m] <= x) lo = m;
    else hi = m;
  }
  const t = (x - xs[lo]) / (xs[hi] - xs[lo] || 1);
  return ys[lo] + (ys[hi] - ys[lo]) * t;
}

export class LineChart {
  /**
   * @param {object} o
   * @param {(e: object|null) => void} [o.onEvent] called when a key moment is clicked (null when closed)
   */
  constructor(host, { title, subtitle = '', unit = '', xUnit = 's', xName = 't', digits = 2, xDigits = 3, zeroBased = true, onEvent = null } = {}) {
    this.opts = { title, subtitle, unit, xUnit, xName, digits, xDigits, zeroBased, onEvent };
    this.el = document.createElement('figure');
    this.el.className = 'aqt-chart';
    this.el.innerHTML = `
      <figcaption><span class="aqt-chart-title"></span><span class="aqt-chart-sub"></span><button type="button" class="aqt-btn aqt-btn-sm aqt-chart-reset" hidden>${tr('ch.resetZoom')}</button></figcaption>
      <div class="aqt-chart-legend" hidden></div>
      <div class="aqt-chart-plot"><canvas title="${tr('ch.zoomHint')}"></canvas><div class="aqt-tip" hidden></div><div class="aqt-chart-pop" hidden></div></div>`;
    host.appendChild(this.el);
    this.titleEl = this.el.querySelector('.aqt-chart-title');
    this.subEl = this.el.querySelector('.aqt-chart-sub');
    this.legendEl = this.el.querySelector('.aqt-chart-legend');
    this.plot = this.el.querySelector('.aqt-chart-plot');
    this.canvas = this.el.querySelector('canvas');
    this.tip = this.el.querySelector('.aqt-tip');
    this.pop = this.el.querySelector('.aqt-chart-pop');
    this.resetBtn = this.el.querySelector('.aqt-chart-reset');
    this.ctx = this.canvas.getContext('2d');
    this.setTitle(title, subtitle);
    this.data = null;
    this.hoverX = null;
    this.cursor = null;
    this.zoom = null; // { x0, x1 } when zoomed in
    this.brush = null; // { a, b } pixels while drag-selecting
    this.selected = null; // number of the highlighted key moment
    this.hits = []; // clickable key moments from the last render
    this.canvas.setAttribute('role', 'img');
    this.ro = new ResizeObserver(() => this.draw());
    this.ro.observe(this.plot);

    const local = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return { px: e.clientX - r.left, py: e.clientY - r.top };
    };
    const move = (e) => {
      const { px } = local(e);
      this.hoverPx = px;
      this.hoverX = this.pxToX(px);
      if (this.down && Math.abs(px - this.down.px) > 6) this.brush = { a: this.down.px, b: px };
      this.canvas.style.cursor = !this.down && this.hitAt(px, local(e).py) ? 'pointer' : 'crosshair';
      this.draw();
    };
    const leave = () => {
      this.hoverX = null;
      this.tip.hidden = true;
      this.draw();
    };
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.down = local(e);
      this.canvas.setPointerCapture?.(e.pointerId);
      move(e);
    });
    this.canvas.addEventListener('pointerup', (e) => {
      const d = this.down;
      this.down = null;
      if (!d) return;
      if (this.brush && Math.abs(this.brush.b - this.brush.a) > 8) {
        // drag-select: zoom into the selected time range
        const xa = this.pxToX(Math.min(this.brush.a, this.brush.b));
        const xb = this.pxToX(Math.max(this.brush.a, this.brush.b));
        this.brush = null;
        this.setZoom(xa, xb);
        return;
      }
      this.brush = null;
      const { px, py } = local(e);
      const hit = this.hitAt(px, py);
      if (hit) this.openPop(hit.e, hit.px);
      else if (!this.pop.hidden) this.closePop(true);
      this.draw();
    });
    this.canvas.addEventListener('pointercancel', () => {
      this.down = null;
      this.brush = null;
      this.draw();
    });
    this.canvas.addEventListener('pointerleave', leave);
    this.canvas.addEventListener('dblclick', () => this.setZoom(null));
    // Ctrl / ⌘ + wheel zooms around the pointer (plain wheel keeps scrolling the page)
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        if (!(e.ctrlKey || e.metaKey) || !this.layout) return;
        e.preventDefault();
        const { x0, x1 } = this.layout;
        const c = this.pxToX(local(e).px);
        const k = Math.exp(Math.sign(e.deltaY) * 0.18);
        this.setZoom(c - (c - x0) * k, c + (x1 - c) * k);
      },
      { passive: false },
    );
    this.resetBtn.addEventListener('click', () => this.setZoom(null));
    this.pop.addEventListener('click', (e) => {
      if (e.target.closest('[data-pop-close]')) this.closePop(true);
    });
  }

  /** Zoom the time axis to [x0, x1] (clamped to the data); null resets. */
  setZoom(x0, x1) {
    const f = this.full;
    if (x0 == null || !f) this.zoom = null;
    else {
      const minW = (f.x1 - f.x0) * 0.002;
      let a = Math.max(f.x0, Math.min(x0, x1));
      let b = Math.min(f.x1, Math.max(x0, x1));
      if (b - a < minW) {
        const c = (a + b) / 2;
        a = Math.max(f.x0, c - minW / 2);
        b = Math.min(f.x1, a + minW);
      }
      this.zoom = b - a >= (f.x1 - f.x0) * 0.999 ? null : { x0: a, x1: b };
    }
    this.resetBtn.hidden = !this.zoom;
    this.closePop();
    this.draw();
  }

  hitAt(px, py) {
    let best = null;
    for (const h of this.hits) {
      const onBadge = Math.hypot(px - h.px, py - h.by) <= 10;
      const onLine = Math.abs(px - h.px) <= 4;
      if (onBadge) return h;
      if (onLine && (!best || Math.abs(px - h.px) < Math.abs(px - best.px))) best = h;
    }
    return best;
  }

  openPop(e, px) {
    this.selected = e.n;
    this.pop.innerHTML = `<button type="button" class="aqt-icon aqt-pop-x" data-pop-close aria-label="✕">✕</button>${e.html || `<b>${e.n} · ${e.label}</b>`}`;
    this.pop.style.setProperty('--mc', e.color);
    this.pop.hidden = false;
    const W = this.plot.clientWidth;
    const pw = Math.min(300, W - 8);
    this.pop.style.width = `${pw}px`;
    this.pop.style.left = `${Math.max(4, Math.min(W - pw - 4, px > W / 2 ? px - pw - 10 : px + 10))}px`;
    this.tip.hidden = true;
    this.opts.onEvent?.(e);
  }

  /** Close the details card; `notify` tells the owner (so other charts drop the highlight). */
  closePop(notify = false) {
    if (this.pop.hidden) return;
    this.pop.hidden = true;
    if (notify) {
      this.selected = null;
      this.opts.onEvent?.(null);
    }
    this.draw();
  }

  /** Highlight a key moment (by number) without opening its card. */
  setSelected(n) {
    this.selected = n;
    this.pop.hidden = true;
    this.draw();
  }

  setTitle(t, sub = '') {
    this.titleEl.textContent = t;
    this.subEl.textContent = sub;
  }

  setData(d) {
    this.data = d;
    // a new flight or new units: start un-zoomed and with no card open
    this.zoom = null;
    this.resetBtn.hidden = true;
    this.pop.hidden = true;
    this.selected = null;
    const s = d.series || [];
    this.canvas.setAttribute('aria-label', `${this.opts.title} chart`);
    if (s.length > 1) {
      this.legendEl.hidden = false;
      this.legendEl.innerHTML = s
        .map((x) => `<span><i style="background:${x.color};${x.dash ? 'height:0;border-top:2px dashed ' + x.color + ';background:none' : ''}"></i>${x.name}</span>`)
        .join('');
    } else {
      this.legendEl.hidden = true;
    }
    this.draw();
  }

  setCursor(x) {
    this.cursor = x;
    this.draw();
  }

  pxToX(px) {
    if (!this.layout) return null;
    const { l, w, x0, x1 } = this.layout;
    return x0 + ((px - l) / w) * (x1 - x0);
  }

  draw() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.render();
    });
  }

  render() {
    const cv = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = this.plot.clientWidth;
    const H = this.plot.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px';
      cv.style.height = H + 'px';
    }
    const g = this.ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const d = this.data;
    if (!d || !d.series || !d.series.length) {
      g.fillStyle = THEME.muted;
      g.font = '13px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(tr('ch.empty'), W / 2, H / 2);
      return;
    }

    // ranges
    let x0 = d.xMin ?? Infinity;
    let x1 = d.xMax ?? -Infinity;
    let y0 = this.opts.zeroBased ? 0 : Infinity;
    let y1 = -Infinity;
    for (const s of d.series) {
      if (d.xMin === undefined) x0 = Math.min(x0, s.x[0]);
      if (d.xMax === undefined) x1 = Math.max(x1, s.x[s.x.length - 1]);
    }
    this.full = { x0, x1 };
    if (this.zoom) {
      x0 = this.zoom.x0;
      x1 = this.zoom.x1;
    }
    for (const s of d.series) {
      for (let i = 0; i < s.y.length; i++) {
        if (s.x[i] < x0 || s.x[i] > x1) continue;
        const v = s.y[i];
        if (v < y0) y0 = v;
        if (v > y1) y1 = v;
      }
    }
    if (!(y1 > y0)) y1 = y0 + 1;
    const pad = (y1 - y0) * 0.08;
    if (!(this.opts.zeroBased && y0 === 0)) y0 -= pad;
    y1 += pad;
    const yt = ticks(y0, y1, Math.max(3, Math.round(H / 46)));
    y0 = Math.min(y0, yt.out[0]);
    y1 = Math.max(y1, yt.out[yt.out.length - 1]);

    g.font = '11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    let labelW = 0;
    for (const v of yt.out) labelW = Math.max(labelW, g.measureText(fmt(v, yt.step)).width);
    const l = Math.ceil(labelW) + 12;
    const r = 12;
    const t = 8;
    const b = 26;
    const w = W - l - r;
    const h = H - t - b;
    this.layout = { l, w, x0, x1 };
    const X = (v) => l + ((v - x0) / (x1 - x0 || 1)) * w;
    const Y = (v) => t + h - ((v - y0) / (y1 - y0 || 1)) * h;

    // bands
    for (const band of d.bands || []) {
      const a = Math.max(X(band.x0), l);
      const c = Math.min(X(band.x1), l + w);
      if (c <= a) continue;
      g.fillStyle = band.color;
      g.fillRect(a, t, c - a, h);
      if (c - a > 34) {
        g.fillStyle = THEME.muted;
        g.textAlign = 'left';
        g.textBaseline = 'bottom';
        const txt = band.label;
        if (g.measureText(txt).width < c - a - 8) g.fillText(txt, a + 4, t + h - 4);
      }
    }

    // grid + y labels
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (const v of yt.out) {
      const y = Math.round(Y(v)) + 0.5;
      g.strokeStyle = v === 0 ? THEME.axis : THEME.grid;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(l, y);
      g.lineTo(l + w, y);
      g.stroke();
      g.fillStyle = THEME.muted;
      g.fillText(fmt(v, yt.step), l - 6, y);
    }
    // x labels
    const xt = ticks(x0, x1, Math.max(3, Math.round(w / 80)));
    g.textAlign = 'center';
    g.textBaseline = 'top';
    for (const v of xt.out) {
      const x = X(v);
      if (x < l - 1 || x > l + w + 1) continue;
      g.fillStyle = THEME.muted;
      g.fillText(fmt(v, xt.step), x, t + h + 7);
    }
    g.textAlign = 'right';
    g.fillText(this.opts.xUnit, l + w, t + h + 7 + 0);

    // series
    g.save();
    g.beginPath();
    g.rect(l, t - 2, w, h + 4);
    g.clip();
    d.series.forEach((s, si) => {
      // area wash for the main series
      if (si === 0 && !s.dash) {
        g.beginPath();
        let started = false;
        for (let i = 0; i < s.x.length; i++) {
          const px = X(s.x[i]);
          const py = Y(s.y[i]);
          if (!started) {
            g.moveTo(px, Y(Math.max(y0, 0)));
            g.lineTo(px, py);
            started = true;
          } else g.lineTo(px, py);
        }
        g.lineTo(X(s.x[s.x.length - 1]), Y(Math.max(y0, 0)));
        g.closePath();
        g.fillStyle = s.color + '1f';
        g.fill();
      }
      g.beginPath();
      for (let i = 0; i < s.x.length; i++) {
        const px = X(s.x[i]);
        const py = Y(s.y[i]);
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokeStyle = s.color;
      g.lineWidth = s.width || 2;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.setLineDash(s.dash ? [5, 4] : []);
      g.stroke();
      g.setLineDash([]);
    });
    g.restore();

    // key moments: numbered dashed vertical lines
    const evs = (d.events || []).filter((e) => e.x >= x0 && e.x <= x1);
    let lastBadge = -Infinity;
    let row = 0;
    const badges = []; // drawn after the markers so their labels never cover them
    for (const e of evs) {
      const px = Math.round(X(e.x)) + 0.5;
      const sel = this.selected === e.n;
      g.strokeStyle = e.color;
      g.globalAlpha = sel ? 1 : 0.75;
      g.lineWidth = sel ? 2 : 1;
      g.setLineDash(sel ? [] : [3, 3]);
      g.beginPath();
      g.moveTo(px, t + 9);
      g.lineTo(px, t + h);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      // badges that would overlap go one row down
      row = px - lastBadge < 15 ? row + 1 : 0;
      lastBadge = px;
      badges.push({ px, by: t + 7 + row * 15, e });
    }

    // markers (events)
    for (const m of d.markers || []) {
      if (m.x < x0 || m.x > x1) continue;
      const px = X(m.x);
      const py = Y(m.y);
      g.fillStyle = THEME.surface;
      g.beginPath();
      g.arc(px, py, 6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = m.color || d.series[0].color;
      g.beginPath();
      g.arc(px, py, 4, 0, Math.PI * 2);
      g.fill();
      if (m.label) {
        g.font = '600 11px system-ui, sans-serif';
        g.fillStyle = THEME.text;
        const tw = g.measureText(m.label).width;
        let lx = px + 8;
        if (lx + tw > l + w) lx = px - 8 - tw;
        const ly = Math.max(t + 8, Math.min(t + h - 8, m.below ? py + 14 : py - 10));
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.fillText(m.label, lx, ly);
        g.font = '11px system-ui, sans-serif';
      }
    }

    // key-moment badges (numbered circles at the top of each event line)
    this.hits = badges;
    for (const { px, by, e } of badges) {
      const sel = this.selected === e.n;
      g.fillStyle = sel ? '#ffffff' : THEME.surface;
      g.beginPath();
      g.arc(px, by, sel ? 9.5 : 8.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = e.color;
      g.beginPath();
      g.arc(px, by, 7, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0b1220';
      g.font = '700 10px system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(e.n), px, by + 0.5);
      g.font = '11px system-ui, sans-serif';
    }

    // drag-to-zoom selection
    if (this.brush) {
      const a = Math.max(l, Math.min(this.brush.a, this.brush.b));
      const b = Math.min(l + w, Math.max(this.brush.a, this.brush.b));
      g.fillStyle = 'rgba(51, 140, 237, 0.18)';
      g.fillRect(a, t, b - a, h);
      g.strokeStyle = 'rgba(120, 180, 255, 0.8)';
      g.lineWidth = 1;
      g.strokeRect(a + 0.5, t + 0.5, b - a - 1, h - 1);
    }

    // playhead
    if (this.cursor != null && this.cursor >= x0 && this.cursor <= x1) {
      const px = Math.round(X(this.cursor)) + 0.5;
      g.strokeStyle = THEME.playhead;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(px, t);
      g.lineTo(px, t + h);
      g.stroke();
      const s = d.series[0];
      const v = interp(s.x, s.y, this.cursor);
      if (Number.isFinite(v)) {
        g.fillStyle = THEME.surface;
        g.beginPath();
        g.arc(px, Y(v), 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = s.color;
        g.beginPath();
        g.arc(px, Y(v), 4, 0, Math.PI * 2);
        g.fill();
      }
    }

    // hover crosshair + tooltip
    if (this.hoverX != null && this.hoverX >= x0 && this.hoverX <= x1 && !this.brush && this.pop.hidden) {
      const px = Math.round(X(this.hoverX)) + 0.5;
      g.strokeStyle = THEME.axis;
      g.beginPath();
      g.moveTo(px, t);
      g.lineTo(px, t + h);
      g.stroke();
      const rows = [];
      for (const s of d.series) {
        const v = interp(s.x, s.y, this.hoverX);
        if (!Number.isFinite(v)) continue;
        g.fillStyle = THEME.surface;
        g.beginPath();
        g.arc(px, Y(v), 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = s.color;
        g.beginPath();
        g.arc(px, Y(v), 4, 0, Math.PI * 2);
        g.fill();
        rows.push(`<div><i style="background:${s.color}"></i>${d.series.length > 1 ? s.name + ': ' : ''}<b>${v.toLocaleString(loc(), { maximumFractionDigits: this.opts.digits })}</b> ${this.opts.unit}</div>`);
      }
      const band = (d.bands || []).find((b2) => this.hoverX >= b2.x0 && this.hoverX <= b2.x1);
      const near = (d.events || []).filter((e) => Math.abs(X(e.x) - px) <= 6);
      this.tip.innerHTML =
        `<div class="aqt-tip-h">${this.opts.xName} = ${this.hoverX.toFixed(this.opts.xDigits)} ${this.opts.xUnit}${band ? ' · ' + band.label : ''}</div>` +
        near.map((e) => `<div class="aqt-tip-ev" style="color:${e.color}">${e.n} · ${e.label} <small>(${tr('ch.clickInfo')})</small></div>`).join('') +
        rows.join('');
      this.tip.hidden = false;
      const tw = this.tip.offsetWidth;
      let lx = px + 12;
      if (lx + tw > W) lx = px - 12 - tw;
      this.tip.style.left = `${Math.max(0, lx)}px`;
      this.tip.style.top = `${t + 4}px`;
    }
  }

  dispose() {
    this.ro.disconnect();
    this.el.remove();
  }
}
