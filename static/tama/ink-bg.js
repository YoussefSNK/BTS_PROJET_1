// Fond anime "encre" (custom element <ink-bg mode="mixLight|mixDark|night|wash">), repris de la maquette Claude Design.
(function(){
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const R_ = (a, b) => a + Math.random() * (b - a);
function blurred(src, px) { const c = mk(src.width, src.height), x = c.getContext('2d'); x.filter = `blur(${px}px)`; x.drawImage(src, 0, 0); return c; }
function strokeSprite(w, h, col) {
  const c = mk(w, h), x = c.getContext('2d'), n = Math.floor(h * .7), f = R_(.0015, .004), ph = R_(0, 6.28), amp = h * .12;
  x.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    const off = h / 2 + (Math.random() + Math.random() + Math.random() - 1.5) / 1.5 * h * .38;
    const s = Math.random() * w * .22, e = w - Math.random() * w * .25;
    x.globalAlpha = R_(.08, .45); x.lineWidth = R_(.6, 2.6);
    x.setLineDash(Math.random() < .35 ? [R_(40, 220), R_(4, 40)] : []);
    x.beginPath();
    for (let px = s; px <= e; px += 8) { const y = off + Math.sin(px * f + ph) * amp + Math.sin(px * .02 + i) * 1.2; px === s ? x.moveTo(px, y) : x.lineTo(px, y); }
    x.stroke();
  }
  x.globalAlpha = 1; x.setLineDash([]); x.globalCompositeOperation = 'destination-in';
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.18, '#000'); g.addColorStop(.75, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  return c;
}
function blotSprite(size, rgb, k, bl) {
  const c = mk(size, size), x = c.getContext('2d'), m = size / 2;
  for (let i = 0; i < k; i++) {
    const cx = m + R_(-.22, .22) * size, cy = m + R_(-.22, .22) * size, r = R_(.08, .26) * size;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${rgb},${R_(.25, .6)})`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.29); x.fill();
  }
  return blurred(c, bl);
}
function mountainSprite() {
  const w = 900, h = 420, c = mk(w, h), x = c.getContext('2d');
  const ridge = (peak, ph, base, col1) => {
    x.beginPath(); x.moveTo(0, h);
    for (let px = 0; px <= w; px += 6) {
      const d = Math.abs(px - peak) / w;
      const y = base + Math.pow(d, .9) * ph + Math.sin(px * .05) * 4 + Math.sin(px * .013) * 10 + Math.random() * 3;
      x.lineTo(px, y);
    }
    x.lineTo(w, h); x.closePath();
    const g = x.createLinearGradient(0, base, 0, h); g.addColorStop(0, col1); g.addColorStop(.7, 'rgba(60,50,40,0)');
    x.fillStyle = g; x.fill();
  };
  ridge(560, 520, 40, 'rgba(70,58,46,.55)');
  ridge(250, 400, 230, 'rgba(30,26,22,.6)');
  return blurred(c, 2.5);
}

const MODES = {
  night:{bg:'#1c1c1d', strokes:'dark', vign:1},
  wash:{bg:'#ECE5D8', wash:1, bamboo:'ink'},
  mixDark:{bg:'#1c1c1d', strokes:'dark', bamboo:'night', vign:1},
  mixLight:{bg:'#ECE5D8', wash:1, strokes:'light', bamboo:'ink'}
};
function leafSpriteC(rgb, a, bl) {
  const c = mk(170, 40), x = c.getContext('2d');
  x.fillStyle = `rgba(${rgb},${a})`;
  x.beginPath(); x.moveTo(4, 20); x.quadraticCurveTo(50, 4, 165, 20); x.quadraticCurveTo(55, 31, 4, 20); x.fill();
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) { x.globalAlpha = R_(.1, .4); x.fillRect(R_(20, 160), R_(12, 26), R_(8, 30), .8); }
  return bl ? blurred(c, bl) : c;
}
class InkBG {
  constructor(cv, mode) {
    this.cv = cv; this.x = cv.getContext('2d'); this.W = cv.width; this.H = cv.height;
    const o = this.o = MODES[mode]; this.t0 = performance.now();
    if (o.strokes) this.initStrokes(o.strokes);
    if (o.wash) this.initWash();
    if (o.bamboo) this.initBamboo(o.bamboo);
    if (o.vign) this.initVign();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loop = now => { this.frame((now - this.t0) / 1000); if (!still) this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { cancelAnimationFrame(this.raf); }
  initStrokes(kind) {
    this.strokes = [];
    const n = kind === 'dark' ? 20 : 13;
    for (let i = 0; i < n; i++) {
      const dark = i % 3 !== 0, w = R_(700, 1500), h = R_(50, 150);
      const col = kind === 'dark' ? (dark ? '#080808' : '#3c3c3f') : (dark ? '#4a443c' : '#8f877b');
      const a = kind === 'dark' ? (dark ? .8 : .45) : (dark ? .2 : .26);
      this.strokes.push({ c:strokeSprite(w, h, col), x0:R_(0, 3000), y0:R_(-60, this.H), v:R_(5, 16), ph:R_(0, 6.28), a, rot:R_(-.07, .05), w, h });
    }
  }
  initVign() {
    const v = mk(this.W, this.H), vx = v.getContext('2d'), g = vx.createRadialGradient(this.W / 2, this.H * .45, 200, this.W / 2, this.H / 2, 900);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); vx.fillStyle = g; vx.fillRect(0, 0, this.W, this.H);
    this.vign = v;
  }
  initWash() {
    this.clouds = [[-160, 520, 1.7, .5], [880, 560, 1.5, .32], [1020, -200, 1.1, .3], [260, 700, 1.3, .38], [560, -260, 1.0, .18], [-200, -120, 1.2, .3]]
      .map(([x, y, s, a]) => ({ x, y, s, a, ph:R_(0, 6.28), c:blotSprite(520, '38,34,30', 30, 26) }));
    this.mist = [0, 1, 2].map(i => ({ c:blotSprite(520, '236,229,216', 26, 30), y:R_(560, 720), ph:i * 2.1, v:R_(8, 14) }));
    this.mtn = mountainSprite();
  }
  initBamboo(kind) {
    if (kind === 'night') {
      this.leaf = [leafSpriteC('4,4,4', .96), leafSpriteC('62,62,66', .75), leafSpriteC('82,82,88', .5, 3)];
      this.stem = ['rgba(4,4,4,.95)', 'rgba(62,62,66,.7)', 'rgba(82,82,88,.45)'];
    } else {
      this.leaf = [leafSpriteC('16,16,14', .92), leafSpriteC('16,16,14', .6), leafSpriteC('16,16,14', .35, 3)];
      this.stem = ['rgba(18,18,16,.85)', 'rgba(18,18,16,.55)', 'rgba(18,18,16,.3)'];
    }
    this.branches = [];
    const defs = [[1210, -20, 2.3, 300, 0], [1110, -30, 1.95, 360, 1], [1270, 60, 2.75, 220, 2], [980, -20, 1.75, 240, 2]];
    for (const [sx, sy, ang, len, layer] of defs) {
      const leaves = [];
      for (const t of [.35, .55, .75, .97]) {
        const k = 2 + Math.floor(Math.random() * 3);
        for (let j = 0; j < k; j++) leaves.push({ t, a:R_(.9, 2.3), L:R_(.55, 1), ph:R_(0, 6.28) });
      }
      this.branches.push({ sx, sy, ang, len, layer, leaves, ph:R_(0, 6.28) });
    }
  }
  drawStrokes(t) {
    const x = this.x, W = this.W;
    for (const s of this.strokes) {
      const span = W + s.w, px = ((s.x0 + t * s.v) % span) - s.w, py = s.y0 + Math.sin(t * .22 + s.ph) * 16;
      x.save(); x.globalAlpha = s.a; x.translate(px + s.w / 2, py + s.h / 2); x.rotate(s.rot + Math.sin(t * .13 + s.ph) * .012);
      x.drawImage(s.c, -s.w / 2, -s.h / 2); x.restore();
    }
    x.globalAlpha = 1;
  }
  drawBamboo(t) {
    const x = this.x;
    for (const layer of [2, 1, 0]) for (const b of this.branches) {
      if (b.layer !== layer) continue;
      const sway = Math.sin(t * .55 + b.ph) * .035, ang = b.ang + sway;
      x.save(); x.translate(b.sx, b.sy);
      x.strokeStyle = this.stem[layer]; x.lineWidth = [3.2, 2.4, 1.8][layer]; x.lineCap = 'round';
      const ex = Math.cos(ang) * b.len, ey = Math.sin(ang) * b.len, cx = ex * .5 + 30, cy = ey * .5 - 20;
      x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(cx, cy, ex, ey); x.stroke();
      for (const l of b.leaves) {
        const u = l.t, px = 2 * (1 - u) * u * cx + u * u * ex, py = 2 * (1 - u) * u * cy + u * u * ey, sc = l.L * [1, .85, .7][layer];
        x.save(); x.translate(px, py); x.rotate(l.a + sway * 2 + Math.sin(t * 1.1 + l.ph) * .07); x.scale(sc, sc);
        x.drawImage(this.leaf[layer], -4, -20); x.restore();
      }
      x.restore();
    }
  }
  frame(t) {
    const x = this.x, W = this.W, H = this.H, o = this.o;
    x.globalAlpha = 1; x.fillStyle = o.bg; x.fillRect(0, 0, W, H);
    if (o.wash) for (const c of this.clouds) {
      const s = c.s * (1 + Math.sin(t * .09 + c.ph) * .05);
      x.globalAlpha = c.a; x.drawImage(c.c, c.x + Math.sin(t * .045 + c.ph) * 50, c.y + Math.cos(t * .04 + c.ph) * 24, 520 * s, 520 * s);
    }
    x.globalAlpha = 1;
    if (o.strokes) this.drawStrokes(t);
    if (o.wash) {
      x.globalAlpha = .8; x.drawImage(this.mtn, W - 860, H - 380);
      for (const m of this.mist) { x.globalAlpha = .9; x.drawImage(m.c, ((t * m.v + m.ph * 300) % (W + 900)) - 600, m.y - 260, 900, 520); }
      x.globalAlpha = 1;
    }
    if (o.bamboo) this.drawBamboo(t);
    if (o.vign) x.drawImage(this.vign, 0, 0);
  }
}


class InkBgEl extends HTMLElement {
  static get observedAttributes() { return ['mode']; }
  connectedCallback() {
    if (!this.cv) {
      this.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;display:block;';
      this.cv = document.createElement('canvas'); this.cv.width = 1280; this.cv.height = 860;
      this.cv.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:80% 0;display:block;';
      this.appendChild(this.cv);
    }
    this.start();
  }
  disconnectedCallback() { if (this.eng) this.eng.stop(); this.eng = null; this.cur = null; }
  attributeChangedCallback() { if (this.cv && this.isConnected) this.start(); }
  start() {
    const m = this.getAttribute('mode') || 'mixLight';
    if (this.eng && this.cur === m) return;
    if (this.eng) this.eng.stop();
    this.eng = new InkBG(this.cv, m); this.cur = m;
  }
}
if (!customElements.get('ink-bg')) customElements.define('ink-bg', InkBgEl);
})();
