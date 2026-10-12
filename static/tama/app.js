// Tama · atelier de perles — portage de la maquette Claude Design "Tama - App.dc.html".
// React 18 + htm (sans build). Les donnees viennent de /api/bootstrap et chaque
// modification passe par l'API Flask (routes/tama.py). null = quantite inconnue.
(function () {
'use strict';

// ---------- rendu : htm + styles en chaine ----------
const hoverRules = new Map();
let hoverSheet = null;
function hashStr(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function splitDecls(css) {
  const out = []; let depth = 0, quote = null, cur = '';
  for (const ch of css) {
    if (quote) { if (ch === quote) quote = null; }
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ';' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(d => d.trim()).filter(Boolean);
}
function parseStyle(css) {
  const obj = {};
  for (const decl of splitDecls(css)) {
    const i = decl.indexOf(':'); if (i < 0) continue;
    let prop = decl.slice(0, i).trim(); const val = decl.slice(i + 1).trim();
    if (!prop.startsWith('--')) prop = prop.replace(/^-(webkit|moz|ms)-/, (m, p) => p.charAt(0).toUpperCase() + p.slice(1) + '-').replace(/-([a-z])/g, (m, c) => c.toUpperCase());
    obj[prop] = val;
  }
  return obj;
}
// Equivalent des attributs style-hover / style-focus de la maquette : une classe CSS generee.
function stateClass(css, pseudo) {
  const key = pseudo + css;
  if (!hoverRules.has(key)) {
    const cls = 'dc-' + pseudo.slice(1, 3) + hashStr(key);
    hoverRules.set(key, cls);
    if (!hoverSheet) { hoverSheet = document.createElement('style'); document.head.appendChild(hoverSheet); }
    const body = splitDecls(css).map(d => d + ' !important').join(';');
    hoverSheet.appendChild(document.createTextNode(`.${cls}${pseudo}{${body}}`));
  }
  return hoverRules.get(key);
}
function h(type, props, ...children) {
  if (props) {
    props = { ...props };
    const classes = props.className ? [props.className] : [];
    if (typeof props.style === 'string') props.style = parseStyle(props.style);
    if (props['style-hover']) { classes.push(stateClass(props['style-hover'], ':hover')); delete props['style-hover']; }
    if (props['style-focus']) { classes.push(stateClass(props['style-focus'], ':focus')); delete props['style-focus']; }
    if (props.class) { classes.push(props.class); delete props.class; }
    if (classes.length) props.className = classes.join(' ');
  }
  return React.createElement(type, props, ...children);
}
const html = htm.bind(h);

// ---------- palettes ----------
const ROOT = document.getElementById('root');
const LOGOUT_URL = ROOT.dataset.logout, LOGIN_URL = ROOT.dataset.login;
const rgbOf = hx => [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)];
const codeNum = code => parseInt(String(code).replace(/\D/g, ''), 10);
const natural = (a, b) => codeNum(a) - codeNum(b) || (a < b ? -1 : a > b ? 1 : 0);
function hsl(hex) { const [r, g, b] = rgbOf(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); let hh = 0; if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h:(hh * 60 + 360) % 360, s, l, d }; }
function family(hex) {
  const { h: hu, s, l, d } = hsl(hex);
  if (d < .08 || s < .18 || (l > .8 && s < .45)) return 'neutral';
  const redish = hu < 50 || hu >= 345;
  if (redish && l < .5 && s < .45) return 'brown';
  if (hu >= 10 && hu < 50 && (l < .36 || s < .6)) return 'brown';
  if (hu < 15 || hu >= 345) return (l > .62 || (s < .45 && l >= .5)) ? 'pink' : 'red';
  if (hu < 45) return 'orange'; if (hu < 65) return 'yellow'; if (hu < 170) return 'green'; if (hu < 245) return 'blue'; if (hu < 290) return 'violet'; return 'pink';
}
const FAMS = [['neutral', '白', 'Blancs & gris'], ['yellow', '黄', 'Jaunes'], ['orange', '橙', 'Oranges'], ['red', '赤', 'Rouges'], ['pink', '桃', 'Roses'], ['violet', '紫', 'Violets'], ['blue', '青', 'Bleus'], ['green', '緑', 'Verts'], ['brown', '茶', 'Bruns']];
const FAM_ORDER = Object.fromEntries(FAMS.map((f, i) => [f[0], i]));

// Remplis par initPalettes() a partir des donnees serveur.
let PALS = [], PAL_BY_ID = {}, COLORS = [], REF_BY = {}, ALL_CODES = [], BYNUM = {};
function initPalettes(pals) {
  PALS = pals.map(p => {
    const colors = p.colors.slice().sort((a, b) => natural(a.code, b.code)).map(c => ({ ...c, n:codeNum(c.code), rgb:rgbOf(c.hex) }));
    const by = {}; colors.forEach(c => by[c.code] = c);
    return { ...p, colors, by };
  });
  PAL_BY_ID = Object.fromEntries(PALS.map(p => [p.id, p]));
  // Le stock est commun a toutes les palettes : on affiche chaque code avec la palette la plus complete.
  const ref = PALS.slice().sort((a, b) => b.colors.length - a.colors.length);
  REF_BY = {};
  ref.forEach(p => p.colors.forEach(c => { if (!REF_BY[c.code]) REF_BY[c.code] = { ...c }; }));
  COLORS = Object.values(REF_BY).sort((a, b) => natural(a.code, b.code));
  COLORS.forEach(c => { c.fam = family(c.hex); c.L = hsl(c.hex).l; });
  ALL_CODES = COLORS.map(c => c.code);
  BYNUM = {}; COLORS.forEach(c => BYNUM[c.n] = c.code);
}
const info = (code, pal) => { const p = pal != null && PAL_BY_ID[pal]; return (p && p.by[code]) || REF_BY[code] || { code, name:'?', en:'', hex:'#999999' }; };

function parseCmd(text) {
  const ops = [], re = /([+\-−]?)\s*(\d[\d\s.]*?)\s*[x×*]?\s*h\s?(\d+)|h\s?(\d+)\s*([=:+\-−x×*]?)\s*(\d[\d\s.]*)/gi; let m;
  while ((m = re.exec(text))) {
    let sign, qty, n;
    if (m[3] !== undefined) { sign = m[1]; qty = m[2]; n = m[3]; } else { n = m[4]; sign = m[5]; qty = m[6]; }
    qty = parseInt(String(qty).replace(/[\s.]/g, ''), 10); if (!(qty >= 0)) continue;
    const op = sign === '=' || sign === ':' ? 'set' : (sign === '-' || sign === '−') ? 'sub' : 'add';
    ops.push({ code:BYNUM[parseInt(n, 10)], raw:'H' + n, op, qty, valid:!!BYNUM[parseInt(n, 10)] });
  }
  return ops;
}
const DITHERS = [{ id:'none', label:'Aucun' }, { id:'atkinson', label:'Atkinson' }, { id:'floyd_steinberg', label:'Floyd-Steinberg' }, { id:'ordered', label:'Ordonné (Bayer)' }];
const dithLabel = id => (DITHERS.find(d => d.id === id) || { label:id }).label;
const palShort = id => (PAL_BY_ID[id] || { short:'?' }).short;
const ring = hex => `radial-gradient(circle, transparent 0 25%, ${hex} 27%)`;
const fmt = n => Number(n).toLocaleString('fr-FR');
const plates = (w, hh) => { const n = Math.ceil(w / 29) * Math.ceil(hh / 29); return n + (n > 1 ? ' plaques' : ' plaque'); };
const mk = (w, hh) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c; };
const readURL = f => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });

// ---------- génération d'une recette depuis l'image d'origine ----------
const GEN_DEFAULT_W = 58, GEN_MIN_W = 4, GEN_MAX_W = 200;
const genWidth = v => Math.min(GEN_MAX_W, Math.max(GEN_MIN_W, parseInt(v, 10) || GEN_DEFAULT_W));
const TRANSLUCENT = /Transparent|Clear|Translucent/i;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
// Réduction par paliers de moitié : un seul drawImage d'une grande image vers 58 px crénèle beaucoup.
function sourcePixels(img, W, H) {
  let c = mk(img.naturalWidth, img.naturalHeight); c.getContext('2d').drawImage(img, 0, 0);
  while (c.width / 2 >= W && c.height / 2 >= H) {
    const n = mk(Math.round(c.width / 2), Math.round(c.height / 2)), x = n.getContext('2d');
    x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, n.width, n.height); c = n;
  }
  const o = mk(W, H), ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(c, 0, 0, W, H);
  return ox.getImageData(0, 0, W, H).data;
}
// Une perle par pixel ; les pixels transparents (alpha < 128) restent sans perle et ne diffusent pas d'erreur.
function ditherImage(data, W, H, colors, mode) {
  const n = W * H, buf = new Float32Array(n * 3), solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) { buf[i * 3] = data[i * 4]; buf[i * 3 + 1] = data[i * 4 + 1]; buf[i * 3 + 2] = data[i * 4 + 2]; solid[i] = data[i * 4 + 3] >= 128 ? 1 : 0; }
  const out = mk(W, H), ox = out.getContext('2d'), od = ox.createImageData(W, H), counts = {};
  const spread = (x, y, er, eg, eb, f) => { if (x < 0 || x >= W || y >= H) return; const j = y * W + x; if (!solid[j]) return; buf[j * 3] += er * f; buf[j * 3 + 1] += eg * f; buf[j * 3 + 2] += eb * f; };
  const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!solid[i]) continue;
    let r = buf[i * 3], g = buf[i * 3 + 1], b = buf[i * 3 + 2];
    if (mode === 'ordered') { const t = (BAYER[y % 4][x % 4] / 16 - .47) * 56; r += t; g += t; b += t; }
    r = clamp(r); g = clamp(g); b = clamp(b);
    let best = 0, bd = Infinity;
    for (let k = 0; k < colors.length; k++) { const c = colors[k].rgb, d = 2 * (r - c[0]) ** 2 + 4 * (g - c[1]) ** 2 + 3 * (b - c[2]) ** 2; if (d < bd) { bd = d; best = k; } }
    const c = colors[best]; counts[c.code] = (counts[c.code] || 0) + 1;
    od.data[i * 4] = c.rgb[0]; od.data[i * 4 + 1] = c.rgb[1]; od.data[i * 4 + 2] = c.rgb[2]; od.data[i * 4 + 3] = 255;
    if (mode === 'floyd_steinberg' || mode === 'atkinson') {
      const er = r - c.rgb[0], eg = g - c.rgb[1], eb = b - c.rgb[2];
      if (mode === 'floyd_steinberg') { spread(x + 1, y, er, eg, eb, 7 / 16); spread(x - 1, y + 1, er, eg, eb, 3 / 16); spread(x, y + 1, er, eg, eb, 5 / 16); spread(x + 1, y + 1, er, eg, eb, 1 / 16); }
      else [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]].forEach(([dx, dy]) => spread(x + dx, y + dy, er, eg, eb, 1 / 8));
    }
  }
  ox.putImageData(od, 0, 0);
  return { canvas:out, src:out.toDataURL(), counts };
}
const loadImg = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- API ----------
async function api(method, url, body) {
  const opts = { method, headers:{}, credentials:'same-origin' };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const r = await fetch(url, opts);
  if (r.status === 401) { location.href = LOGIN_URL; throw new Error('Non connecté'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}
function normalizeStock(stock) { const s = { ...stock }; ALL_CODES.forEach(c => { if (!(c in s)) s[c] = 0; }); return s; }

const LS = 'tama-app-v1';

function feas(r, stock) {
  let total = 0, have = 0, opt = 0, missing = 0, unknown = 0, missCols = 0; const rows = [];
  Object.keys(r.counts).sort(natural).forEach(code => {
    const need = r.counts[code], s = stock[code], known = s !== null && s !== undefined;
    total += need;
    if (known) { const m = Math.max(0, need - s); have += need - m; opt += need - m; missing += m; if (m) missCols++; rows.push({ code, need, have:s, miss:m, unknown:false }); }
    else { unknown++; opt += need; rows.push({ code, need, have:null, miss:0, unknown:true }); }
  });
  let pct = total ? Math.floor(have / total * 100) : 0, pctOpt = total ? Math.floor(opt / total * 100) : 0;
  if (pct === 100 && have < total) pct = 99; if (pctOpt === 100 && opt < total) pctOpt = 99;
  const ok = total > 0 && missing === 0 && unknown === 0;
  return { total, missing, unknown, missCols, rows, pct, pctOpt, ok, almost:!ok && total > 0 && (pctOpt >= 90 || missCols === 1) };
}
const THEMES = {
  light:{ bg:'#ECE5D8', ink:'#1A1714', muted:'#5E564B', line:'rgba(26,23,20,.12)', line2:'rgba(26,23,20,.35)', panel:'rgba(248,244,236,.80)', panelSolid:'#F6F1E7', barBg:'rgba(236,229,216,.82)', accent:'#B8322A', chip:'rgba(250,247,240,.92)', mat:'#F7F5EF', edge:'rgba(26,23,20,.22)', invBg:'#1A1714', invFg:'#ECE5D8', paperBlend:'multiply', paperOp:1 },
  dark:{ bg:'#1c1c1d', ink:'#EEEAE2', muted:'rgba(238,234,226,.62)', line:'rgba(238,234,226,.12)', line2:'rgba(238,234,226,.35)', panel:'rgba(26,26,27,.78)', panelSolid:'#202021', barBg:'rgba(28,28,29,.82)', accent:'#E26A55', chip:'rgba(38,38,40,.92)', mat:'#F3F0E8', edge:'rgba(238,234,226,.32)', invBg:'#EEEAE2', invFg:'#1c1c1d', paperBlend:'screen', paperOp:.45 }
};
const PAPER = 'url("data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .25 0 0 0 0 .2 0 0 0 0 .14 0 0 0 .11 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>") + '")';
const SHIPPO = 'radial-gradient(circle at 50% 100%, #B8322A 0 2px, #F4EFE4 2px 3.2px, #B8322A 3.2px 5px, #F4EFE4 5px 6.2px, #B8322A 6.2px 8px, #F4EFE4 8px 9.2px, #B8322A 9.2px 10px, transparent 10px), radial-gradient(circle at 50% 100%, #B8322A 0 2px, #F4EFE4 2px 3.2px, #B8322A 3.2px 5px, #F4EFE4 5px 6.2px, #B8322A 6.2px 8px, #F4EFE4 8px 9.2px, #B8322A 9.2px 10px, transparent 10px)';

function brushMask() {
  let sd = 3; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
  const pts = [], N = 48;
  pts.push([150 + r() * 40, 0]);
  for (let i = 0; i <= N; i++) { const y = i / N * 1000; pts.push([860 + Math.sin(i * .9) * 14 + (r() - .5) * 46, y]); }
  for (let i = N; i >= 0; i--) { const y = i / N * 1000; pts.push([140 + Math.sin(i * 1.3) * 16 + (r() - .5) * 50, y]); }
  const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z';
  let gaps = '', tails = '';
  for (let i = 0; i < 46; i++) { const y = r() * 1000, left = r() < .5, x = left ? 120 + r() * 120 : 760 + r() * 120, len = 40 + r() * 200; gaps += `<line x1='${x.toFixed(0)}' y1='${y.toFixed(1)}' x2='${(left ? x + len : x - len).toFixed(0)}' y2='${(y + (r() - .5) * 4).toFixed(1)}' stroke='black' stroke-width='${(1 + r() * 4).toFixed(1)}' stroke-opacity='${(.4 + r() * .6).toFixed(2)}'/>`; }
  for (let i = 0; i < 30; i++) { const y = r() * 1000, left = r() < .5, x = left ? 150 : 860, len = 30 + r() * 110; tails += `<line x1='${x}' y1='${y.toFixed(1)}' x2='${left ? x - len : x + len}' y2='${(y + (r() - .5) * 6).toFixed(1)}' stroke='white' stroke-width='${(1 + r() * 3).toFixed(1)}' stroke-opacity='${(.3 + r() * .7).toFixed(2)}' stroke-linecap='round'/>`; }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 1000' preserveAspectRatio='none'><mask id='m'><path d='${d}' fill='white'/>${gaps}${tails}</mask><rect width='1000' height='1000' fill='white' mask='url(#m)'/></svg>`;
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}
const BRUSH = brushMask();
const PAGE_KANJI = { home:'ようこそ', stock:'在庫', models:'図案', model:'図案', feas:'可能', count:'数' };

class App extends React.Component {
  constructor(p) {
    super(p);
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) {}
    const prefersDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
    const D = p.data;
    this.state = {
      user:D.user, screen:saved.screen || 'home', theme:saved.theme || (prefersDark ? 'dark' : 'light'), feasTab:saved.feasTab || 'ok',
      stock:normalizeStock(D.stock), hist:D.hist, models:D.models, recipes:D.recipes,
      stockFilter:'all', stockSort:'family', stockView:'grid', stockSel:null, inspTab:'color', cmd:'', histCode:'', histPeriod:'all',
      modelQ:'', modelTag:'', modelSort:'recent', modelId:null, delConfirm:false, tagDraft:'',
      feasPal:'all', feasSort:'pct', showCodes:true, feasColor:null, expanded:{}, sel:{},
      drawer:null, shop:null, copied:false, newOpen:false, nm:{ name:'', src:null, file:null }, busy:false,
      countImg:null, countPts:[], countSize:22, toast:null,
      genZoom:null, genGrid:false,
      genOpen:false, genW:String(saved.genW || GEN_DEFAULT_W), genStock:!!saved.genStock,
      genPal:PALS.slice().sort((a, b) => b.colors.length - a.colors.length)[0].id
    };
    this.pending = 0; this.queue = Promise.resolve();
    this.genImgs = {}; this.genCache = new Map();
  }
  componentDidMount() {
    this.onKey = e => {
      if (this.state.screen === 'count' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.countUndo(); }
      if (this.state.genZoom && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); this.stepZoom(e.key === 'ArrowRight' ? 1 : -1); return; }
      if (e.key === 'Escape') { this.setState({ shop:null, inspOpen:false, genZoom:null }); this.closeNM(); this.closeDrawer(); }
      const tag = (e.target && e.target.tagName) || '';
      if (this.state.screen === 'stock' && !/INPUT|TEXTAREA|SELECT/.test(tag) && !e.metaKey && !e.ctrlKey) {
        const order = this.stockOrder || [], cur = this.state.stockSel && order.includes(this.state.stockSel) ? this.state.stockSel : order[0];
        const i = order.indexOf(cur), s0 = this.state.stock[cur], v = s0 === null || s0 === undefined ? 0 : s0;
        if (e.key === 'ArrowRight' && order.length) { e.preventDefault(); this.setState({ stockSel:order[Math.min(order.length - 1, i + 1)], inspTab:'color' }); }
        else if (e.key === 'ArrowLeft' && order.length) { e.preventDefault(); this.setState({ stockSel:order[Math.max(0, i - 1)], inspTab:'color' }); }
        else if (e.key === 'ArrowUp' && cur) { e.preventDefault(); this.setQty(cur, v + (e.shiftKey ? 100 : 10)); }
        else if (e.key === 'ArrowDown' && cur) { e.preventDefault(); this.setQty(cur, Math.max(0, v - (e.shiftKey ? 100 : 10))); }
        else if (e.key === '?' && cur) { e.preventDefault(); this.setQty(cur, s0 === null ? 0 : null); }
        else if (e.key === '/') { e.preventDefault(); const el = document.querySelector('[data-cmd]'); el && el.focus(); }
      }
    };
    window.addEventListener('keydown', this.onKey);
    this.onResize = () => this.setState({ vw:window.innerWidth });
    window.addEventListener('resize', this.onResize); setTimeout(this.onResize, 0); requestAnimationFrame(this.onResize);
    this.syncBody();
  }
  componentWillUnmount() { window.removeEventListener('keydown', this.onKey); window.removeEventListener('resize', this.onResize); }
  componentDidUpdate() {
    const { screen, theme, feasTab, genW, genStock } = this.state;
    try { localStorage.setItem(LS, JSON.stringify({ screen:screen === 'model' ? 'models' : screen, theme, feasTab, genW:genWidth(genW), genStock })); } catch (e) {}
    this.syncBody();
  }
  syncBody() { const t = THEMES[this.state.theme]; document.body.style.background = t.bg; document.body.style.color = t.ink; }

  // ----- synchro serveur -----
  fail(err) { this.toastMsg(err && err.message ? err.message : 'Erreur serveur'); this.reload(); }
  async reload() {
    try { const D = await api('GET', '/api/bootstrap'); this.setState({ stock:normalizeStock(D.stock), hist:D.hist, models:D.models, recipes:D.recipes }); } catch (e) {}
  }
  // Les mises a jour de stock sont envoyees dans l'ordre ; l'etat serveur n'est repris
  // qu'une fois la file vide, pour ne pas ecraser une saisie locale plus recente.
  pushStock(changes, note) {
    if (!changes.length) return;
    this.pending++;
    this.queue = this.queue.then(() => api('POST', '/api/stock', { changes, note:note || '' })).then(res => {
      this.pending--;
      if (!this.pending) this.setState(s => ({ stock:{ ...s.stock, ...res.stock }, hist:res.hist }));
    }, err => { this.pending--; this.fail(err); });
  }

  openModel(id, e) {
    const src = e && e.currentTarget && e.currentTarget.querySelector('[data-morph]');
    if (reduced() || !src || this._pt || document.hidden) { this.go('model', { modelId:id }); return; }
    this._pt = true;
    const r0 = src.getBoundingClientRect(), clone = src.cloneNode(true);
    Object.assign(clone.style, { position:'fixed', left:r0.left + 'px', top:r0.top + 'px', width:r0.width + 'px', height:r0.height + 'px', margin:'0', zIndex:'50', transformOrigin:'0 0', transition:'none', pointerEvents:'none', boxShadow:'0 0 0 1.5px #B8322A, 0 24px 40px -24px rgba(40,30,20,.35)' });
    document.body.appendChild(clone);
    src.style.visibility = 'hidden';
    this.setState({ screen:'model', modelId:id, drawer:null, delConfirm:false, pt:'m0', morphing:true });
    try { window.scrollTo(0, 0); } catch (err) {}
    setTimeout(() => {
      const tgt = document.querySelector('[data-morph-target]');
      if (!tgt) { clone.remove(); this.setState({ pt:'idle', morphing:false }); this._pt = false; return; }
      const r1 = tgt.getBoundingClientRect();
      void clone.offsetWidth;
      clone.style.transition = 'transform .62s cubic-bezier(.16,1,.3,1)';
      clone.style.transform = `translate(${r1.left - r0.left}px, ${r1.top - r0.top}px) scale(${r1.width / r0.width}, ${r1.height / r0.height})`;
      this.setState({ pt:'m1' });
      setTimeout(() => { this.setState({ morphing:false }); clone.style.transition = 'opacity .2s ease'; clone.style.opacity = '0'; }, 640);
      setTimeout(() => clone.remove(), 880);
      setTimeout(() => { this.setState({ pt:'idle' }); this._pt = false; }, 760);
    }, 40);
  }
  modelMatch(m, tag, q) { return (!tag || m.tags.includes(tag)) && (!q || m.name.toLowerCase().includes(q) || m.tags.some(g => g.includes(q))); }
  setTag(v) {
    if (v === this.state.modelTag || this._tg) return;
    if (reduced() || document.hidden) { this.setState({ modelTag:v }); return; }
    this._tg = true;
    const q = this.state.modelQ.trim().toLowerCase();
    const keep = this.state.models.filter(m => this.modelMatch(m, v, q)).map(m => String(m.id));
    const shown = [...document.querySelectorAll('[data-mcard]')].map(el => el.dataset.mcard);
    const leave = {}; shown.forEach(id => { if (!keep.includes(id)) leave[id] = true; });
    this.setState({ mtLeave:leave });
    setTimeout(() => {
      const prev = {}; document.querySelectorAll('[data-mcard]').forEach(el => { if (!leave[el.dataset.mcard]) prev[el.dataset.mcard] = el.getBoundingClientRect(); });
      const fresh = {}; keep.forEach(id => { if (!prev[id]) fresh[id] = true; });
      this.setState({ modelTag:v, mtLeave:null, mtNew:fresh, mtPh:'in0' });
      setTimeout(() => {
        document.querySelectorAll('[data-mcard]').forEach(el => {
          const id = el.dataset.mcard, p = prev[id]; if (!p || fresh[id]) return;
          const r = el.getBoundingClientRect(), dx = p.left - r.left, dy = p.top - r.top; if (!dx && !dy) return;
          el.style.transition = 'none'; el.style.transform = `translate(${dx}px, ${dy}px)`; void el.offsetWidth;
          el.style.transition = 'transform .65s cubic-bezier(.16,1,.3,1)'; el.style.transform = '';
        });
        this.setState({ mtPh:'in' });
        setTimeout(() => { document.querySelectorAll('[data-mcard]').forEach(el => { el.style.transition = ''; el.style.transform = ''; }); this.setState({ mtNew:null, mtPh:'idle' }); this._tg = false; }, 1000);
      }, 20);
    }, 240);
  }
  switchFeas(tab) {
    if (tab === this.state.feasTab || this._ft) return;
    if (reduced()) { this.setState({ feasTab:tab }); return; }
    this._ft = true; const dir = tab === 'ko' ? 1 : -1;
    this.setState({ fa:'out', faDir:dir });
    setTimeout(() => {
      this.setState({ feasTab:tab, fa:'in0', expanded:{} });
      setTimeout(() => { this.setState({ fa:'in' }); setTimeout(() => { this.setState({ fa:'idle' }); this._ft = false; }, 1100); }, 30);
    }, 200);
  }
  openDrawer(id) {
    clearTimeout(this._dT);
    if (reduced() || document.hidden) { this.setState({ drawer:id, drPh:'open' }); return; }
    this.setState({ drawer:id, drPh:'enter' });
    this._dT = setTimeout(() => this.setState({ drPh:'open' }), 30);
  }
  closeDrawer() {
    if (!this.state.drawer || this.state.drPh === 'exit') return;
    clearTimeout(this._dT);
    if (document.hidden) { this.setState({ drawer:null, drPh:'closed' }); return; }
    this.setState({ drPh:'exit' });
    this._dT = setTimeout(() => this.setState({ drawer:null, drPh:'closed' }), 420);
  }
  openNM(e) {
    clearTimeout(this._nmT);
    const x = e && e.clientX ? e.clientX : window.innerWidth / 2, y = e && e.clientY ? e.clientY : window.innerHeight / 2;
    this.setState({ newOpen:true, nmPhase:'enter', nmOrigin:{ x, y }, nm:{ name:'', src:null, file:null } });
    this._nmT = setTimeout(() => this.setState({ nmPhase:'open' }), 30);
  }
  closeNM(after) {
    if (!this.state.newOpen || this.state.nmPhase === 'exit') return;
    clearTimeout(this._nmT);
    this.setState({ nmPhase:'exit' });
    this._nmT = setTimeout(() => { this.setState({ newOpen:false, nmPhase:'closed' }); after && after(); }, 620);
  }
  toastMsg(m) { clearTimeout(this._tt); this.setState({ toast:m }); this._tt = setTimeout(() => this.setState({ toast:null }), 2600); }
  go(screen, extra) {
    const apply = more => { this.setState({ screen, drawer:null, delConfirm:false, inspOpen:false, genZoom:null, ...extra, ...more }); try { window.scrollTo(0, 0); } catch (e) {} };
    if (screen === this.state.screen && screen !== 'model') { apply({}); return; }
    if (reduced() || this._pt) { apply({}); return; }
    this._pt = true;
    if ((this.state.screen === 'model' && screen === 'models') || (this.state.screen === 'models' && screen === 'model')) {
      this.setState({ pt:'f0' });
      setTimeout(() => { apply({ pt:'f0' }); setTimeout(() => { this.setState({ pt:'f1' }); setTimeout(() => { this.setState({ pt:'idle' }); this._pt = false; }, 520); }, 30); }, 170);
      return;
    }
    this.setState({ pt:'out', ptTo:screen });
    setTimeout(() => {
      apply({ pt:'in0' });
      setTimeout(() => {
        this.setState({ pt:'in' });
        setTimeout(() => { this.setState({ pt:'idle' }); this._pt = false; }, 460);
      }, 70);
    }, 280);
  }

  // ----- stock -----
  // Applique localement tout de suite (meme regle de fusion d'historique que le serveur), puis envoie.
  setStock(changes, note) {
    if (!changes.length) return;
    this.setState(s => {
      const stock = { ...s.stock }, hist = s.hist.slice(), now = Date.now();
      changes.forEach(({ code, to }) => {
        const from = stock[code] === undefined ? 0 : stock[code], last = hist[0];
        if (from === to) return;
        stock[code] = to;
        if (!note && changes.length === 1 && last && last.code === code && !last.note && !last.undone && now - last.date < 30000) hist[0] = { ...last, to, date:now };
        else hist.unshift({ id:'tmp' + now + code, code, from, to, date:now, note:note || '' });
      });
      return { stock, hist };
    });
    this.pushStock(changes, note);
  }
  setQty(code, val, note) { this.setStock([{ code, to:val }], note); }
  undoHist(h) {
    if (typeof h.id !== 'number') return;
    this.pending++;
    this.queue = this.queue.then(() => api('POST', `/api/history/${h.id}/undo`)).then(res => {
      this.pending--;
      this.setState(s => ({ stock:{ ...s.stock, ...res.stock }, hist:res.hist }));
      this.toastMsg(`${h.code} remis à ${h.from === null ? 'inconnu' : fmt(h.from)}`);
    }, err => { this.pending--; this.fail(err); });
  }
  markDone(r) {
    const m = this.state.models.find(x => x.id === r.modelId);
    const changes = Object.entries(r.counts).map(([c, n]) => { const s = this.state.stock[c]; return s === null || s === undefined ? null : { code:c, to:Math.max(0, s - n) }; }).filter(Boolean);
    this.setStock(changes, `Réalisé · ${m ? m.name : ''}`);
    this.closeDrawer();
    this.toastMsg(`« ${m ? m.name : ''} » réalisé. Perles déduites du stock.`);
  }
  // ----- recettes / modèles -----
  // exact : image déjà à une perle par pixel (recette générée), le serveur ne cherche pas d'agrandissement.
  async fileToRecipe(file, modelId, pal, dith, exact) {
    if (!file) return;
    const fd = new FormData(); fd.append('model_id', modelId); fd.append('list_id', pal); fd.append('dith', dith); fd.append('image', file);
    if (exact) fd.append('exact', '1');
    this.toastMsg('Analyse de la recette…');
    try {
      const rec = await api('POST', '/api/recipes', fd);
      this.setState(s => ({ recipes:s.recipes.filter(r => !(r.modelId === modelId && r.pal === pal && r.dith === dith)).concat(rec) }));
      this.toastMsg(`Recette ${dithLabel(dith)} enregistrée (${rec.w} × ${rec.h} perles)`);
    } catch (err) { this.fail(err); }
  }
  async removeRecipe(r) {
    try {
      const res = await api('DELETE', `/api/recipes/${r.id}`);
      this.setState(s => {
        const recipes = s.recipes.filter(x => x.id !== r.id);
        if (res.modelDeleted) return { recipes, models:s.models.filter(m => m.id !== r.modelId), screen:'models', modelId:null, drawer:null };
        return { recipes, drawer:null };
      });
      if (res.modelDeleted) this.toastMsg('Dernière recette supprimée : le modèle aussi.');
    } catch (err) { this.fail(err); }
  }
  updateModel(id, patch, persist) {
    this.setState(s => ({ models:s.models.map(x => x.id === id ? { ...x, ...patch } : x) }));
    const send = () => api('PATCH', `/api/models/${id}`, patch).then(m => this.setState(s => ({ models:s.models.map(x => x.id === id ? { ...x, tags:m.tags } : x) })), err => this.fail(err));
    if (persist === 'debounce') { clearTimeout(this._renT); this._renT = setTimeout(send, 500); } else send();
  }
  countUndo() { this.setState(s => ({ countPts:s.countPts.slice(0, -1) })); }
  // Image d'origine chargée une fois par URL ; le rendu suivant reprend dès qu'elle est prête.
  genImage(src) {
    const cur = this.genImgs[src];
    if (cur && cur !== 'loading') return cur;
    if (!cur) { this.genImgs[src] = 'loading'; loadImg(src).then(img => { this.genImgs[src] = img; this.setState({ genTick:Date.now() }); }, () => { delete this.genImgs[src]; this.toastMsg("Impossible de lire l'image d'origine"); }); }
    return null;
  }
  genPreview(img, src, W, H, colors, mode) {
    const key = [src, W, H, colors.map(c => c.code).join(','), mode].join('|');
    if (!this.genCache.has(key)) {
      if (this.genCache.size > 48) this.genCache.clear();
      this.genCache.set(key, ditherImage(sourcePixels(img, W, H), W, H, colors, mode));
    }
    return this.genCache.get(key);
  }
  stepZoom(dir) {
    const ids = DITHERS.map(d => d.id), i = ids.indexOf(this.state.genZoom);
    this.setState({ genZoom:ids[(i + dir + ids.length) % ids.length] });
  }
  saveGenerated(prev, modelId, pal, dith) {
    return new Promise(res => prev.canvas.toBlob(blob => res(this.fileToRecipe(new File([blob], `genere-${dith}.png`, { type:'image/png' }), modelId, pal, dith, true)), 'image/png'));
  }

  chips(defs, cur, key, t) {
    return defs.map(([v, label, n]) => ({ label, n:n === undefined ? '' : n, bg:cur === v ? t.invBg : t.chip, fg:cur === v ? t.invFg : t.ink, go:() => this.setState({ [key]:v }) }));
  }
  view(r, S, t) {
    const f = feas(r, S.stock), m = S.models.find(x => x.id === r.modelId) || { name:'?' };
    const rows = f.rows.map(n => { const c = info(n.code, r.pal); return { code:n.code, name:c.name, ring:ring(c.hex), needF:fmt(n.need), haveL:n.unknown ? '?' : fmt(n.have), col:n.miss ? t.accent : n.unknown ? t.muted : t.ink }; });
    const missRows = f.rows.filter(n => n.miss).sort((a, b) => b.miss - a.miss);
    return {
      id:r.id, src:r.src, ar:`${r.w} / ${r.h}`, modelName:m.name, palShort:palShort(r.pal), dithLabel:dithLabel(r.dith) + (PALS.length > 1 ? ' · ' + palShort(r.pal) : ''), dims:`${r.w} × ${r.h}`, plates:plates(r.w, r.h),
      ncolors:Object.keys(r.counts).length, totalF:fmt(f.total), total:f.total, pct:f.pct, pctW:f.pct + '%', pctOptW:f.pctOpt + '%', pctOpt:f.pctOpt,
      optL:f.unknown ? `jusqu'à ${f.pctOpt} % (${f.unknown} inconnue${f.unknown > 1 ? 's' : ''})` : '', ok:f.ok, almost:f.almost, missing:f.missing,
      missingL:f.missing ? '−' + fmt(f.missing) : (f.unknown ? '?' : '✓'), missSub:f.missing ? `${f.missCols} couleur${f.missCols > 1 ? 's' : ''}` : (f.unknown ? 'à vérifier' : 'complet'),
      missCol:f.missing ? t.accent : t.ink, barCol:f.ok ? t.ink : t.accent, borderCol:f.almost ? t.accent : t.line,
      missSummary:missRows.slice(0, 2).map(n => `${fmt(n.miss)} ${info(n.code, r.pal).name.toLowerCase()}`).join(', ') + (missRows.length > 2 ? '…' : '') || 'quantités inconnues à vérifier',
      rows, raw:r,
      open:() => this.openDrawer(r.id),
      markDone:() => this.markDone(r), shopOne:() => this.setState({ shop:[r.id], copied:false, drawer:null }),
      goModel:() => this.go('model', { modelId:r.modelId })
    };
  }
  shopData(ids, S) {
    const need = {}; ids.forEach(id => { const r = S.recipes.find(x => x.id === id); if (r) Object.entries(r.counts).forEach(([c, n]) => need[c] = (need[c] || 0) + n); });
    const rows = [], unk = []; let total = 0;
    Object.keys(need).sort(natural).forEach(c => { const s = S.stock[c]; if (s === null) unk.push(c); else if (need[c] > (s || 0)) { rows.push({ code:c, qty:need[c] - (s || 0) }); total += need[c] - (s || 0); } });
    return { rows, unk, total };
  }

  renderVals() {
    const S = this.state, t = THEMES[S.theme], stock = S.stock;
    const views = S.recipes.map(r => this.view(r, S, t));
    const okViews = views.filter(v => v.ok);
    const used = {}; S.recipes.forEach(r => Object.keys(r.counts).forEach(c => used[c] = (used[c] || 0) + 1));
    const totalBeads = ALL_CODES.reduce((a, c) => a + (stock[c] || 0), 0);
    const outCodes = ALL_CODES.filter(c => stock[c] === 0), unkCodes = ALL_CODES.filter(c => stock[c] === null);
    const d = new Date();
    const userName = S.user.login || '';
    const nav = [['home', '一', 'Accueil', 'tableau de bord'], ['stock', '二', 'Stock', `${ALL_CODES.length} codes`], ['models', '三', 'Modèles', `${S.models.length} modèle${S.models.length > 1 ? 's' : ''}`], ['feas', '四', 'Faisabilité', `${okViews.length} réalisable${okViews.length > 1 ? 's' : ''}`], ['count', '五', 'Comptage', 'outil libre']]
      .map(([id, jp, label, sub]) => { const on = S.screen === id || (id === 'models' && S.screen === 'model'); return { id, jp, label, sub, op:on ? 1 : .5, dot:on ? 1 : 0, fw:on ? 500 : 400, subCol:on ? t.accent : t.muted, go:() => this.go(id) }; });
    const ph0 = S.pt || 'idle', ph = ['out', 'in0', 'in'].includes(ph0) ? ph0 : 'idle', E = 'cubic-bezier(.72,0,.28,1)', EO = 'cubic-bezier(.16,1,.3,1)';
    const pt = {
      pe:ph === 'idle' ? 'none' : 'auto', kanji:PAGE_KANJI[S.ptTo] || '',
      tf:ph === 'idle' ? 'translateX(-112%)' : ph === 'in' ? 'translateX(112%)' : 'translateX(0)',
      tr:ph === 'out' ? `transform .28s ${E}` : ph === 'in' ? `transform .38s ${E}` : 'none',
      kOp:ph === 'out' || ph === 'in0' ? 1 : 0, kTf:ph === 'out' ? 'translateY(0) scale(1)' : ph === 'in0' ? 'translateY(0) scale(1)' : ph === 'in' ? 'translateY(-10px) scale(1.04)' : 'translateY(14px) scale(.96)',
      kTr:ph === 'out' ? `opacity .18s ease .12s, transform .4s ${EO} .12s` : ph === 'in' ? 'opacity .16s ease, transform .3s ease' : 'none'
    };
    const pg = {
      op:ph0 === 'out' || ph0 === 'in0' || ph0 === 'm0' || ph0 === 'f0' ? 0 : 1, tf:ph0 === 'in0' ? 'translateY(16px)' : ph0 === 'f0' ? 'translateY(10px)' : 'none',
      tr:ph0 === 'out' ? 'opacity .2s ease .05s' : ph0 === 'in' ? `opacity .35s ease .1s, transform .6s ${EO} .1s` : ph0 === 'm1' ? 'opacity .45s ease .22s' : ph0 === 'f1' ? `opacity .3s ease, transform .5s ${EO}` : ph0 === 'f0' ? 'opacity .16s ease' : 'none'
    };
    const V = {
      t, paper:PAPER, brush:BRUSH, pt, pg, shippo:SHIPPO, inkMode:S.theme === 'dark' ? 'mixDark' : 'mixLight', nav,
      userName, userInitial:(userName.charAt(0) || '?').toUpperCase(),
      themeChips:[['light', 'Washi'], ['dark', 'Nuit']].map(([v, l]) => ({ label:l, bg:S.theme === v ? t.invBg : 'transparent', fg:S.theme === v ? t.invFg : t.ink, go:() => this.setState({ theme:v }) })),
      isHome:S.screen === 'home', isStock:S.screen === 'stock', isModels:S.screen === 'models', isModel:S.screen === 'model', isFeas:S.screen === 'feas', isCount:S.screen === 'count',
      goHome:() => this.go('home'), goStock:() => this.go('stock', { stockFilter:'all' }), goStockOut:() => this.go('stock', { stockFilter:'out' }), goFeas:() => this.go('feas', { feasTab:'ok' }), goModels:() => this.go('models'),
      openBatch:() => { this.go('stock'); setTimeout(() => { const el = document.querySelector('[data-cmd]'); el && el.focus({ preventScroll:true }); }, 1400); },
      openNewModel:e => this.openNM(e), closeNewModel:() => this.closeNM(),
      toast:S.toast, hasToast:!!S.toast
    };
    // accueil
    if (V.isHome) {
      const almost = views.filter(v => v.almost).sort((a, b) => b.pctOpt - a.pctOpt).slice(0, 5);
      const watch = ALL_CODES.filter(c => used[c] && stock[c] !== null).map(c => ({ c, s:stock[c] || 0 })).sort((a, b) => a.s - b.s).slice(0, 6)
        .map(({ c, s }) => { const i = info(c); return { code:c, name:i.name, ring:ring(i.hex), qty:s === 0 ? 'épuisé' : fmt(s), col:s === 0 ? t.accent : t.muted }; });
      V.greeting = d.getHours() < 18 ? 'Bonjour' : 'Bonsoir';
      V.home = { total:fmt(totalBeads), unknown:unkCodes.length, out:outCodes.length, codes:ALL_CODES.length, ok:okViews.length, recCount:views.length, almost:views.filter(v => v.almost).length, ready:okViews.slice(0, 6), almostList:almost, watch,
        noReady:!okViews.length, noAlmost:!almost.length, noWatch:!watch.length };
    }
    // stock
    if (V.isStock) {
      const cols = COLORS, ops = parseCmd(S.cmd), isOps = ops.length > 0, q = isOps ? '' : S.cmd.trim().toLowerCase();
      const maxNeed = {}; S.recipes.forEach(r => Object.entries(r.counts).forEach(([c, n]) => maxNeed[c] = Math.max(maxNeed[c] || 0, n)));
      const st = c => stock[c] === null ? 'unk' : (stock[c] || 0) === 0 ? 'out' : 'in';
      const counts = { all:cols.length, in:0, out:0, unk:0 }; cols.forEach(c => counts[st(c.code)]++);
      const famLabel = Object.fromEntries(FAMS.map(f => [f[0], f[2]]));
      let list = cols.filter(c => (S.stockFilter === 'all' || st(c.code) === S.stockFilter || (S.stockFilter === 'short' && stock[c.code] !== null && maxNeed[c.code] > (stock[c.code] || 0)))
        && (!q || c.code.toLowerCase().includes(q) || ('h' + c.n) === q || c.name.toLowerCase().includes(q) || c.en.toLowerCase().includes(q) || famLabel[c.fam].toLowerCase().includes(q)));
      const byFam = (a, b) => FAM_ORDER[a.fam] - FAM_ORDER[b.fam] || b.L - a.L;
      if (S.stockSort === 'qty') list = list.slice().sort((a, b) => (stock[b.code] ?? -1) - (stock[a.code] ?? -1));
      else if (S.stockSort === 'family') list = list.slice().sort(byFam);
      const sel = (S.stockSel && REF_BY[S.stockSel]) ? S.stockSel : (list[0] || cols[0]).code;
      const lvl = v => Math.max(0, Math.min(100, Math.log10(v + 1) / Math.log10(5001) * 100));
      const item = c => {
        const s0 = stock[c.code], unk = s0 === null, v = unk ? 0 : (s0 || 0), zero = !unk && v === 0, n = (S.recipes.filter(r => r.counts[c.code])).length;
        const short = !unk && maxNeed[c.code] > v, L = lvl(v), gc = short ? t.accent : t.ink, on = c.code === sel;
        const set = x => this.setQty(c.code, x);
        return { code:c.code, name:c.name, ring:ring(c.hex), fam:c.fam,
          gauge:unk ? 'transparent' : `conic-gradient(${gc} 0 ${L}%, ${t.line2} ${L}% 100%)`, gaugeBorder:unk ? `1.5px dashed ${t.ink}` : 'none',
          outDot:zero ? 'block' : 'none', qtyShort:unk ? '?' : zero ? 'épuisé' : fmt(v), qtyCol:zero ? t.accent : unk ? t.muted : t.ink, qtyStyle:unk ? 'italic' : 'normal',
          cellBg:on ? t.panelSolid : 'transparent', cellShadow:on ? `0 0 0 1px ${t.ink}` : 'none', rowBg:on ? t.panelSolid : 'transparent',
          tag:unk ? 'quantité inconnue' : zero ? 'épuisé' : short ? 'insuffisant' : '',
          lvlW:L + '%', lvlCol:gc, barBorder:unk ? `1px dashed ${t.ink}` : 'none', usesShort:n ? n + ' recette' + (n > 1 ? 's' : '') : '—',
          inputVal:unk ? '' : String(v), ph:unk ? '?' : '0', unkBg:unk ? t.invBg : 'transparent', unkFg:unk ? t.invFg : t.ink,
          select:() => this.setState({ stockSel:c.code, inspTab:'color', inspOpen:true }),
          dec:e => { e.stopPropagation(); set(Math.max(0, v - (e.shiftKey ? 100 : 10))); }, inc:e => { e.stopPropagation(); set(v + (e.shiftKey ? 100 : 10)); },
          onInput:e => { const x = e.target.value; set(x === '' ? 0 : Math.max(0, parseInt(x, 10) || 0)); },
          stop:e => e.stopPropagation(),
          toggleUnk:e => { e && e.stopPropagation && e.stopPropagation(); set(unk ? 0 : null); } };
      };
      const items = list.map(item);
      this.stockOrder = items.map(i => i.code);
      V.isGrid = S.stockView === 'grid' && items.length > 0; V.isList = S.stockView === 'list' && items.length > 0; V.stockEmpty = !items.length;
      V.groups = S.stockSort === 'family'
        ? FAMS.map(([id, jp, label]) => { const its = items.filter(i => i.fam === id); return { id, jp, label, n:its.length + (its.length > 1 ? ' couleurs' : ' couleur'), items:its }; }).filter(g => g.items.length)
        : [{ id:S.stockSort, jp:S.stockSort === 'qty' ? '量' : '番', label:S.stockSort === 'qty' ? 'Par quantité' : 'Par code', n:items.length + ' couleurs', items }];
      V.listItems = items;
      const known = cols.filter(c => stock[c.code] !== null), total = known.reduce((a, c) => a + (stock[c.code] || 0), 0);
      const shortN = cols.filter(c => stock[c.code] !== null && maxNeed[c.code] > (stock[c.code] || 0)).length;
      V.stockKpis = [['all', fmt(total), 'perles en stock', t.ink], ['out', counts.out, 'couleurs épuisées', t.accent], ['unk', counts.unk, 'quantités inconnues', t.ink], ['short', shortN, 'insuffisantes pour une recette', t.accent]]
        .map(([k, v, label, col]) => ({ k, v, label, col, line:S.stockFilter === k ? t.ink : 'transparent', go:() => this.setState({ stockFilter:k }) }));
      V.band = cols.slice().sort(byFam).map(c => ({ code:c.code, hex:c.hex, flex:Math.max(stock[c.code] || 0, 0), title:`${c.code} ${c.name} · ${stock[c.code] === null ? '?' : fmt(stock[c.code] || 0)}`, sel:c.code === sel ? `inset 0 0 0 2px ${t.bg}` : 'none', go:() => this.setState({ stockSel:c.code, inspTab:'color' }) }));
      V.bandNote = `${known.length - counts.out} couleurs présentes sur ${cols.length}`;
      V.stockFilterChips = this.chips([['all', 'Tous', counts.all], ['in', 'En stock', counts.in], ['out', 'Épuisé', counts.out], ['unk', 'Inconnu', counts.unk]], S.stockFilter, 'stockFilter', t);
      V.stockSortChips = this.chips([['family', 'Famille'], ['code', 'Code'], ['qty', 'Quantité']], S.stockSort, 'stockSort', t);
      V.viewChips = this.chips([['grid', 'Nuancier'], ['list', 'Liste']], S.stockView, 'stockView', t);
      // saisie rapide
      V.cmd = S.cmd; V.setCmd = e => this.setState({ cmd:e.target.value });
      const opView = ops.map(o => { const c = o.valid ? info(o.code) : null, s0 = o.valid ? stock[o.code] : 0, base = s0 === null || s0 === undefined ? 0 : s0, to = o.op === 'set' ? o.qty : o.op === 'sub' ? Math.max(0, base - o.qty) : base + o.qty;
        return { ...o, to, code:o.valid ? o.code : o.raw, name:c ? c.name : 'code inconnu', ring:c ? ring(c.hex) : 'transparent', fromL:s0 === null ? '?' : fmt(base), toL:o.valid ? fmt(to) : '—', border:o.valid ? t.line2 : t.accent }; });
      V.ops = opView; V.hasOps = isOps;
      const validOps = opView.filter(o => o.valid);
      V.cmdHint = isOps ? (validOps.length ? `↵ ${validOps.length} mise${validOps.length > 1 ? 's' : ''} à jour` : 'code inconnu') : (q ? `${items.length} résultat${items.length > 1 ? 's' : ''}` : '/ pour écrire');
      V.cmdHintBg = isOps && validOps.length ? t.invBg : 'transparent'; V.cmdHintFg = isOps && validOps.length ? t.invFg : t.muted;
      V.cmdBorder = isOps ? t.ink : t.line2;
      V.cmdKey = e => {
        if (e.key === 'Escape') { this.setState({ cmd:'' }); e.target.blur(); }
        if (e.key === 'Enter' && validOps.length) {
          this.setStock(validOps.map(o => ({ code:o.code, to:o.to })), 'Saisie rapide');
          this.setState({ cmd:'', stockSel:validOps[validOps.length - 1].code, inspTab:'color' });
          this.toastMsg(validOps.length === 1 ? `${validOps[0].code} · ${validOps[0].fromL} → ${validOps[0].toL}` : `${validOps.length} couleurs mises à jour`);
        }
      };
      // inspecteur
      const nw = (S.vw || window.innerWidth) < 1240;
      V.ip = nw
        ? { narrow:true, cols:'minmax(0,1fr)', pos:'fixed', top:'0', right:'0', bottom:'0', w:'min(380px, 100vw)', z:25, mh:'100vh', r:'0', disp:S.inspOpen ? 'flex' : 'none', backdrop:!!S.inspOpen,
            famCols:'minmax(0,1fr)', famGap:'8px', famDir:'row', famAlign:'baseline', famLabelGap:'12px', famPadTop:'0', legendPad:'0', close:() => this.setState({ inspOpen:false }) }
        : { narrow:false, cols:'minmax(0,1fr) 340px', pos:'sticky', top:'96px', right:'auto', bottom:'auto', w:'auto', z:1, mh:'calc(100vh - 120px)', r:'6px', disp:'flex', backdrop:false,
            famCols:'76px minmax(0,1fr)', famGap:'14px', famDir:'column', famAlign:'flex-start', famLabelGap:'4px', famPadTop:'12px', legendPad:'90px', close:() => {} };
      V.inspTabs = [['color', 'Couleur'], ['hist', 'Historique']].map(([k, l]) => ({ k, label:l, fg:S.inspTab === k ? t.ink : t.muted, line:S.inspTab === k ? t.ink : 'transparent', go:() => this.setState({ inspTab:k }) }));
      V.inspColor = S.inspTab === 'color'; V.inspHist = S.inspTab === 'hist';
      const c = info(sel), s0 = stock[sel], unk = s0 === null, v = unk ? 0 : (s0 || 0), zero = !unk && v === 0, mx = maxNeed[sel] || 0;
      const set = x => this.setQty(sel, x);
      const usesR = S.recipes.filter(r => r.counts[sel]).map(r => { const m = S.models.find(x => x.id === r.modelId) || { name:'?' }, need = r.counts[sel], ok = !unk && v >= need;
        return { id:r.id, src:r.src, name:m.name, dith:dithLabel(r.dith), needL:unk ? fmt(need) + ' · ?' : ok ? fmt(need) + ' ✓' : `${fmt(need)} · −${fmt(need - v)}`, col:unk ? t.muted : ok ? t.ink : t.accent, need, open:() => this.openDrawer(r.id) }; }).sort((a, b) => b.need - a.need);
      const lab = x => x === null ? '?' : fmt(x || 0);
      const ih = S.hist.filter(hh => hh.code === sel).slice(0, 4).map(hh => ({ id:hh.id, fromL:lab(hh.from), toL:lab(hh.to), dateL:new Date(hh.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }), note:hh.note ? ' · ' + hh.note : '', op:hh.undone ? .45 : 1, undoLabel:hh.undone ? 'annulé' : 'Annuler', undo:() => !hh.undone && this.undoHist(hh) }));
      V.ins = { code:sel, name:c.name, en:c.en, hex:c.hex, ring:ring(c.hex), famL:famLabel[REF_BY[sel] ? REF_BY[sel].fam : 'neutral'],
        qtyL:unk ? '?' : fmt(v), qtyCol:zero ? t.accent : unk ? t.muted : t.ink, qtyStyle:unk ? 'italic' : 'normal',
        state:unk ? "J'en ai, mais je ne sais pas combien" : zero ? 'Épuisé' : mx > v ? `Il en faut ${fmt(mx)} pour la plus grosse recette` : mx ? 'Suffisant pour chaque recette' : 'perles',
        stateCol:zero || (!unk && mx > v) ? t.accent : t.muted,
        inputVal:unk ? '' : String(v), ph:unk ? '?' : '0', onInput:e => { const x = e.target.value; set(x === '' ? 0 : Math.max(0, parseInt(x, 10) || 0)); },
        minus:[100, 10].map(k => ({ label:'−' + k, go:() => set(Math.max(0, v - k)) })), plus:[10, 100].map(k => ({ label:'+' + k, go:() => set(v + k) })),
        bags:[1000, 3000].map(k => ({ label:'+' + fmt(k), go:() => { this.setQty(sel, v + k, 'Sachet de ' + fmt(k)); this.toastMsg(`${sel} ${c.name} · +${fmt(k)}`); } })),
        toggleUnk:() => set(unk ? 0 : null), unkTrack:unk ? t.ink : t.line2, unkKnob:unk ? '15px' : '2px',
        uses:usesR.slice(0, 5), noUses:!usesR.length, usesL:usesR.length ? `${usesR.length} recette${usesR.length > 1 ? 's' : ''} →` : '', goUses:() => usesR.length && this.go('feas', { feasColor:sel, feasTab:'ok' }),
        hist:ih, noHist:!ih.length };
      // historique global
      const lim = S.histPeriod === 'all' ? 0 : Date.now() - (+S.histPeriod) * 86400000;
      V.hist = S.hist.filter(hh => (!S.histCode || hh.code === S.histCode) && hh.date >= lim).slice(0, 80).map(hh => {
        const i = info(hh.code);
        return { id:hh.id, code:hh.code, ring:ring(i.hex), fromL:lab(hh.from), toL:lab(hh.to), dateL:new Date(hh.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) + ' · ' + new Date(hh.date).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }),
          note:hh.note ? ' · ' + hh.note : '', op:hh.undone ? .45 : 1, undoLabel:hh.undone ? 'annulé' : 'Annuler', undo:() => !hh.undone && this.undoHist(hh) };
      });
      V.noGlobalHist = !V.hist.length;
      V.histCodes = [...new Set(S.hist.map(hh => hh.code))].sort(natural).map(c2 => ({ code:c2, name:info(c2).name }));
      V.histCode = S.histCode; V.setHistCode = e => this.setState({ histCode:e.target.value });
      V.histPeriodChips = this.chips([['7', '7 j'], ['30', '30 j'], ['all', 'Tout']], S.histPeriod, 'histPeriod', t);
    }
    // modèles
    if (V.isModels) {
      const q = S.modelQ.trim().toLowerCase(), allTags = [...new Set(S.models.flatMap(m => m.tags))].sort();
      let ms = S.models.filter(m => this.modelMatch(m, S.modelTag, q));
      if (S.modelSort === 'name') ms = ms.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      else if (S.modelSort === 'size') ms = ms.slice().sort((a, b) => b.oh * b.ow - a.oh * a.ow);
      else ms = ms.slice().sort((a, b) => b.created - a.created);
      const lv = S.mtLeave || {}, nwm = S.mtNew || {}, mph = S.mtPh || 'idle'; let ni = 0;
      V.modelCards = ms.map(m => {
        const key = String(m.id), leaving = !!lv[key], fresh = !!nwm[key], dl = fresh ? (ni++) * .06 : 0;
        const anim = leaving ? { anOp:0, anTf:'scale(.9)', anTr:'opacity .2s ease, transform .24s ease' }
          : fresh && mph === 'in0' ? { anOp:0, anTf:'translateY(18px) scale(.96)', anTr:'none' }
          : fresh && mph === 'in' ? { anOp:1, anTf:'none', anTr:`opacity .45s ease ${dl + .12}s, transform .7s cubic-bezier(.16,1,.3,1) ${dl + .12}s` }
          : { anOp:1, anTf:'none', anTr:'transform .5s cubic-bezier(.2,.7,.2,1), opacity .3s ease' };
        const vs = views.filter(v => v.raw.modelId === m.id), best = vs.reduce((a, v) => Math.max(a, v.pct), 0);
        return { ...anim, id:m.id, name:m.name, src:m.src, ar:`${m.ow} / ${m.oh}`, tagsL:m.tags.join(' · ') || 'sans tag', recL:`${vs.length} recette${vs.length > 1 ? 's' : ''}`, bestL:vs.length ? `${best} %` : '—', open:e => this.openModel(m.id, e) };
      });
      V.noModels = !V.modelCards.length;
      V.mv = { count:S.models.length, recCount:S.recipes.length };
      V.tagChips = [['', 'Tous']].concat(allTags.map(g => [g, g])).map(([v, l]) => ({ v, label:l, bg:S.modelTag === v ? t.invBg : t.chip, fg:S.modelTag === v ? t.invFg : t.ink, go:() => this.setTag(v) }));
      V.modelSortChips = this.chips([['recent', 'Récents'], ['name', 'Nom'], ['size', 'Taille']], S.modelSort, 'modelSort', t);
      V.modelQ = S.modelQ; V.setModelQ = e => this.setState({ modelQ:e.target.value });
    }
    // modèle détail
    if (V.isModel) {
      const m = S.models.find(x => x.id === S.modelId) || S.models[0];
      if (m) {
        const vs = views.filter(v => v.raw.modelId === m.id);
        V.md = {
          morphOp:S.morphing ? 0 : 1,
          name:m.name, src:m.src, ar:`${m.ow} / ${m.oh}`, recL:`${vs.length} recette${vs.length > 1 ? 's' : ''} sur ${PALS.length * DITHERS.length} possibles`,
          rename:e => this.updateModel(m.id, { name:e.target.value }, 'debounce'),
          tags:m.tags.map(g => ({ label:g, remove:() => this.updateModel(m.id, { tags:m.tags.filter(x => x !== g) }) })),
          changeImg:async e => {
            const f = e.target.files[0]; e.target.value = ''; if (!f) return;
            const fd = new FormData(); fd.append('image', f);
            try { const nm = await api('POST', `/api/models/${m.id}/image`, fd); this.setState(s => ({ models:s.models.map(x => x.id === m.id ? nm : x) })); this.toastMsg("Image d'origine remplacée"); } catch (err) { this.fail(err); }
          },
          delLabel:S.delConfirm ? 'Confirmer la suppression' : 'Supprimer le modèle', delBg:S.delConfirm ? t.accent : 'transparent', delFg:S.delConfirm ? '#FFF6EC' : t.accent,
          del:async () => {
            if (!S.delConfirm) { this.setState({ delConfirm:true }); return; }
            try { await api('DELETE', `/api/models/${m.id}`); this.setState(s => ({ models:s.models.filter(x => x.id !== m.id), recipes:s.recipes.filter(r => r.modelId !== m.id), screen:'models', delConfirm:false })); this.toastMsg(`« ${m.name} » supprimé`); }
            catch (err) { this.fail(err); }
          },
          rows:PALS.map(p => ({ id:p.id, short:p.short, n:p.colors.length, cells:DITHERS.map(dd => {
            const v = vs.find(x => x.raw.pal === p.id && x.raw.dith === dd.id), onFile = e => { const f = e.target.files[0]; e.target.value = ''; this.fileToRecipe(f, m.id, p.id, dd.id); };
            return v ? { ...v, key:dd.id, filled:true, empty:false, onFile, remove:() => this.removeRecipe(v.raw) } : { key:dd.id, filled:false, empty:true, onFile };
          }) }))
        };
        const cmp = [['', vs.map(v => v.dithLabel)], ['Taille', vs.map(v => v.dims)], ['Plaques', vs.map(v => v.plates)], ['Couleurs', vs.map(v => String(v.ncolors))], ['Perles', vs.map(v => v.totalF)], ['Complétion', vs.map(v => v.pct + ' %')], ['Statut', vs.map(v => v.ok ? 'Réalisable' : v.missing ? `−${fmt(v.missing)}` : 'À vérifier')]];
        V.md.hasCmp = vs.length > 0;
        V.md.cmpCols = `110px repeat(${Math.max(1, vs.length)}, minmax(110px,1fr))`;
        V.md.cmpCells = cmp.flatMap(([lab, vals], ri) => [{ v:lab, font:"'Zen Kaku Gothic New'", col:t.muted, fw:400 }].concat(vals.map(x => ({ v:x, font:ri === 0 ? "'Zen Kaku Gothic New'" : "'DM Mono',monospace", col:ri === 6 && x !== 'Réalisable' ? t.accent : t.ink, fw:ri === 0 ? 500 : 400 }))));
        V.dithHeads = DITHERS;
        // générateur
        {
          const W = genWidth(S.genW), H = Math.max(1, Math.round(W * m.oh / m.ow));
          const pal = PAL_BY_ID[S.genPal] || PALS[0];
          const base = pal.colors.filter(c => !TRANSLUCENT.test(c.en));
          const colors = S.genStock ? base.filter(c => stock[c.code] !== 0 && stock[c.code] !== undefined) : base;
          const img = S.genOpen ? this.genImage(m.src) : null;
          const cards = DITHERS.map(dd => {
            const existing = vs.find(x => x.raw.pal === pal.id && x.raw.dith === dd.id);
            const card = { id:dd.id, label:dd.label, saveLabel:existing ? 'Remplacer' : 'Enregistrer', ready:false };
            if (!img || !colors.length) return card;
            const prev = this.genPreview(img, m.src, W, H, colors, dd.id), f = feas({ counts:prev.counts }, stock);
            return { ...card, ready:true, src:prev.src, statL:`${Object.keys(prev.counts).length} coul. · ${fmt(f.total)} perles`,
              pct:f.pct, pctW:f.pct + '%', barCol:f.ok ? t.ink : t.accent, ok:f.ok,
              save:() => this.saveGenerated(prev, m.id, pal.id, dd.id), zoom:() => this.setState({ genZoom:dd.id }) };
          });
          V.gen = {
            open:S.genOpen, toggle:() => this.setState(s => ({ genOpen:!s.genOpen })),
            w:S.genW, setW:e => this.setState({ genW:e.target.value }), fixW:() => this.setState({ genW:String(W) }),
            dimsL:`${W} × ${H} perles · ${plates(W, H)}`, ar:`${W} / ${H}`,
            palChips:PALS.length > 1 ? this.chips(PALS.map(p => [p.id, p.short]), pal.id, 'genPal', t) : [],
            stockOn:S.genStock, toggleStock:() => this.setState(s => ({ genStock:!s.genStock })),
            stockTrack:S.genStock ? t.ink : t.line2, stockKnob:S.genStock ? '15px' : '2px',
            stockL:S.genStock ? `${colors.length} couleur${colors.length > 1 ? 's' : ''} en stock sur ${base.length}` : `${base.length} couleurs opaques de la palette`,
            noColors:!colors.length, loading:S.genOpen && !img && colors.length > 0, cards,
            saveAll:async () => { for (const c of cards) if (c.ready) await c.save(); }
          };
          // visionneuse : agrandissement d'un facteur entier pour que toutes les perles aient la même taille
          const zc = S.genZoom && cards.find(c => c.id === S.genZoom && c.ready);
          if (zc) {
            const maxW = (S.vw || window.innerWidth) * .9, maxH = window.innerHeight - 190, fit = Math.min(maxW / W, maxH / H);
            const k = fit >= 1 ? Math.floor(fit) : fit;
            V.zoom = { ...zc, palShort:pal.short, dimsL:`${W} × ${H} perles`, w:Math.round(W * k) + 'px', h:Math.round(H * k) + 'px',
              cell:k + 'px', grid:S.genGrid && k >= 4, canGrid:k >= 4, gridOn:S.genGrid,
              toggleGrid:() => this.setState(s => ({ genGrid:!s.genGrid })),
              prev:() => this.stepZoom(-1), next:() => this.stepZoom(1), close:() => this.setState({ genZoom:null }),
              save:async () => { await zc.save(); } };
          }
        }
        V.tagDraft = S.tagDraft; V.setTagDraft = e => this.setState({ tagDraft:e.target.value });
        V.tagKey = e => { if (e.key === 'Enter' && S.tagDraft.trim()) { const g = S.tagDraft.trim().toLowerCase(); if (!m.tags.includes(g)) this.updateModel(m.id, { tags:m.tags.concat(g) }); this.setState({ tagDraft:'' }); } };
      } else { V.isModel = false; setTimeout(() => this.setState({ screen:'models', modelId:null }), 0); }
    }
    // faisabilité
    if (V.isFeas) {
      const pool = views.filter(v => (S.feasPal === 'all' || v.raw.pal === S.feasPal) && (!S.feasColor || v.raw.counts[S.feasColor]));
      const okN = pool.filter(v => v.ok).length;
      const list = pool.filter(v => S.feasTab === 'ok' ? v.ok : !v.ok);
      if (S.feasSort === 'pct') list.sort((a, b) => b.pct - a.pct || b.pctOpt - a.pctOpt);
      else if (S.feasSort === 'miss') list.sort((a, b) => a.missing - b.missing);
      else list.sort((a, b) => b.total - a.total);
      const fa = S.fa || 'idle', dir = S.faDir || 1, narrowScreen = (S.vw || window.innerWidth) <= 820;
      V.feasList = list.map((v, i) => ({ ...v,
        anOp:fa === 'out' || fa === 'in0' ? 0 : 1,
        anTf:fa === 'out' ? `translateX(${-dir * 28}px)` : fa === 'in0' ? `translateX(${dir * 36}px)` : 'none',
        anTr:fa === 'out' ? 'opacity .18s ease, transform .2s ease' : fa === 'in' ? `opacity .4s ease ${Math.min(i, 8) * .045}s, transform .6s cubic-bezier(.16,1,.3,1) ${Math.min(i, 8) * .045}s` : 'none', expanded:!!S.expanded[v.id], chev:S.expanded[v.id] ? '180deg' : '0deg', selBg:S.sel[v.id] ? t.ink : 'transparent', selMark:S.sel[v.id] ? '✓' : '',
        toggleExp:() => this.setState(s => ({ expanded:{ ...s.expanded, [v.id]:!s.expanded[v.id] } })),
        toggleSel:() => this.setState(s => { const sel = { ...s.sel }; if (sel[v.id]) delete sel[v.id]; else sel[v.id] = true; return { sel }; }) }));
      V.feasEmpty = !list.length;
      V.feasTabs = [['ok', 'Réalisables', okN], ['ko', 'Non réalisables', pool.length - okN]].map(([v, l, n]) => ({ v, label:l, n, op:S.feasTab === v ? 1 : .4, size:S.feasTab === v ? (narrowScreen ? '40px' : '72px') : (narrowScreen ? '26px' : '44px'), w:S.feasTab === v ? '100%' : '0%', go:() => this.switchFeas(v) }));
      V.feasSortChips = this.chips([['pct', 'Complétion'], ['miss', 'Perles manquantes'], ['size', 'Taille']], S.feasSort, 'feasSort', t);
      V.hasPalChips = PALS.length > 1;
      V.feasPalChips = this.chips([['all', 'Toutes']].concat(PALS.map(p => [p.id, p.short])), S.feasPal, 'feasPal', t);
      V.hasColorFilter = !!S.feasColor;
      if (S.feasColor) { const i = info(S.feasColor); V.colorFilter = { code:S.feasColor, ring:ring(i.hex) }; }
      V.clearColorFilter = () => this.setState({ feasColor:null });
      V.toggleCodes = () => this.setState(s => ({ showCodes:!s.showCodes }));
      V.codesTrack = S.showCodes ? t.ink : t.line2; V.codesKnob = S.showCodes ? '15px' : '2px'; V.codesDisp = S.showCodes ? 'inline' : 'none';
    }
    // sélection & liste de courses
    const selIds = Object.keys(S.sel).map(Number).filter(id => S.recipes.some(r => r.id === id));
    V.hasSel = selIds.length > 0 && V.isFeas; V.selN = selIds.length;
    V.selMissing = selIds.length ? fmt(this.shopData(selIds, S).total) : '0';
    V.clearSel = () => this.setState({ sel:{} });
    V.shopSel = () => this.setState({ shop:selIds, copied:false });
    V.shopOpen = !!S.shop; V.closeShop = () => this.setState({ shop:null });
    if (S.shop) {
      const sd = this.shopData(S.shop, S);
      const rows = sd.rows.map(r => { const i = info(r.code); return { code:r.code, name:i.name, ring:ring(i.hex), qtyL:fmt(r.qty), col:t.ink }; })
        .concat(sd.unk.map(c => { const i = info(c); return { code:c, name:i.name, ring:ring(i.hex), qtyL:'à vérifier', col:t.muted }; }));
      const names = S.shop.map(id => views.find(v => v.id === id)).filter(Boolean).map(v => `${v.modelName} (${v.dithLabel})`);
      V.shop = { rows, sub:names.join(', '), totalL:sd.rows.length ? `${fmt(sd.total)} perles à acheter` : 'Rien à acheter' };
      const text = `Liste de courses · ${names.join(', ')}\n\n` + sd.rows.map(r => `${r.code}\t${info(r.code).name}\t${r.qty}`).join('\n') + (sd.unk.length ? `\n\nÀ vérifier (quantité inconnue) : ${sd.unk.join(', ')}` : '') + `\n\nTotal : ${sd.total} perles`;
      V.shopCopy = () => { try { navigator.clipboard.writeText(text); } catch (e) {} this.setState({ copied:true }); };
      V.shopExport = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type:'text/plain' })); a.download = 'liste-de-courses.txt'; a.click(); };
      V.copyLabel = S.copied ? 'Copié ✓' : 'Copier';
    }
    // tiroir
    V.hasDrawer = !!S.drawer; V.closeDrawer = () => this.closeDrawer();
    {
      const dp = S.drPh || 'open', op = dp === 'open', ex = dp === 'exit';
      const c = dl => op ? `opacity .4s ease ${dl}s, transform .65s ${EO} ${dl}s` : 'opacity .18s ease, transform .25s ease';
      V.dA = {
        bOp:op ? 1 : 0, bTr:op ? 'opacity .45s ease' : 'opacity .35s ease .05s',
        tf:op ? 'translateX(0)' : 'translateX(104%)', tr:op ? `transform .6s ${EO}` : 'transform .38s cubic-bezier(.6,0,.8,.3)',
        op:op ? 1 : 0, up:op ? 'none' : ex ? 'translateY(6px)' : 'translateY(14px)', rowUp:op ? 'none' : 'translateX(18px)',
        tc1:c(.16), tc3:c(.34), tc5:c(.5),
        clip:op ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)', imgTf:op ? 'none' : 'translateY(10px)',
        tImg:op ? `clip-path .7s cubic-bezier(.65,0,.25,1) .22s, transform .8s ${EO} .22s` : 'clip-path .25s ease, transform .25s ease'
      };
      if (S.drawer) { const v = views.find(x => x.id === S.drawer); if (v) V.dr = { ...v, rows:v.rows.map((n, i) => ({ ...n, dTr:op ? `opacity .35s ease ${.4 + Math.min(i, 12) * .03}s, transform .55s ${EO} ${.4 + Math.min(i, 12) * .03}s` : 'opacity .15s ease, transform .2s ease' })) }; else V.hasDrawer = false; }
    }
    // nouveau modèle
    V.newOpen = S.newOpen;
    V.nm = { name:S.nm.name, src:S.nm.src, hasImg:!!S.nm.src, noImg:!S.nm.src, op:S.nm.name.trim() && S.nm.src && !S.busy ? 1 : .4 };
    V.setNmName = e => this.setState({ nm:{ ...S.nm, name:e.target.value } });
    V.nmFile = async e => { const f = e.target.files[0]; if (!f) return; const url = await readURL(f); this.setState(s => ({ nm:{ ...s.nm, src:url, file:f, name:s.nm.name || f.name.replace(/\.[^.]+$/, '') } })); };
    V.createModel = async () => {
      const n = S.nm; if (!n.name.trim() || !n.file || S.busy) return;
      const fd = new FormData(); fd.append('name', n.name.trim()); fd.append('image', n.file);
      this.setState({ busy:true });
      try {
        const m = await api('POST', '/api/models', fd);
        this.setState(s => ({ models:s.models.concat(m), busy:false }));
        this.closeNM(() => { this.go('model', { modelId:m.id }); this.toastMsg('Modèle créé. Dépose maintenant tes recettes.'); });
      } catch (err) { this.setState({ busy:false }); this.toastMsg(err.message); }
    };
    {
      const ph2 = S.nmPhase || 'closed', o = S.nmOrigin || { x:600, y:400 }, open = ph2 === 'open', exit = ph2 === 'exit';
      const still = reduced();
      const at = ` at ${o.x}px ${o.y}px)`, ease = 'cubic-bezier(.16,1,.3,1)', inkEase = 'cubic-bezier(.65,0,.25,1)';
      const c = (delay) => still ? 'none' : (open ? `opacity .45s ease ${delay}s, transform .7s ${ease} ${delay}s` : 'opacity .2s ease 0s, transform .3s ease 0s');
      V.nmA = {
        ink:S.theme === 'dark' ? 'rgba(0,0,0,.62)' : 'rgba(26,23,20,.52)', halo:S.theme === 'dark' ? 'rgba(0,0,0,.28)' : 'rgba(26,23,20,.18)',
        clip:open ? 'circle(150vmax' + at : 'circle(0px' + at, clip2:open ? 'circle(160vmax' + at : 'circle(0px' + at,
        t1:still ? '0s' : open ? `.85s ${inkEase} .06s` : `.55s ${inkEase} .05s`, t2:still ? '0s' : open ? `.75s ${inkEase} 0s` : `.6s ${inkEase} .1s`,
        op:open ? 1 : 0, tf:open ? 'none' : exit ? 'translateY(14px) scale(.98)' : 'translateY(30px) scale(.96)', blur:open ? 'blur(0px)' : 'blur(8px)',
        tModal:still ? 'none' : open ? `opacity .5s ease .2s, transform .8s ${ease} .2s, filter .6s ease .2s` : 'opacity .25s ease, transform .3s ease, filter .25s ease',
        up:open ? 'none' : 'translateY(12px)', tc1:c(.32), tc2:c(.4), tc3:c(.48), tc4:c(.56),
        stroke:open ? '100%' : '0%', tStroke:still ? 'none' : open ? `width .7s ${ease} .55s` : 'width .2s ease',
        sealOp:open ? 1 : 0, sealTf:open ? 'scale(1) rotate(-6deg)' : 'scale(1.9) rotate(-22deg)',
        tSeal:still ? 'none' : open ? 'opacity .15s ease .72s, transform .45s cubic-bezier(.3,1.7,.5,1) .72s' : 'opacity .15s ease, transform .2s ease'
      };
    }
    // comptage
    V.hasCountImg = !!S.countImg; V.noCountImg = !S.countImg; V.countImg = S.countImg; V.countN = S.countPts.length; V.countSize = S.countSize;
    V.countPts = S.countPts.map((p, i) => ({ l:p.x * 100 + '%', t:p.y * 100 + '%', s:S.countSize + 'px', m:(-S.countSize / 2) + 'px', fs:Math.max(8, Math.round(S.countSize * .45)) + 'px', n:i + 1 }));
    V.countFile = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; this.setState({ countImg:await readURL(f), countPts:[] }); };
    V.countDrop = async e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f && /^image\//.test(f.type)) this.setState({ countImg:await readURL(f), countPts:[] }); };
    V.countClick = e => { const r = e.currentTarget.getBoundingClientRect(); this._cw = r.width; this.setState(s => ({ countPts:s.countPts.concat({ x:(e.clientX - r.left) / r.width, y:(e.clientY - r.top) / r.height }) })); };
    V.countRight = e => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; let bi = -1, bd = S.countSize; S.countPts.forEach((p, i) => { const dd = Math.hypot(p.x * r.width - px, p.y * r.height - py); if (dd < bd) { bd = dd; bi = i; } }); if (bi >= 0) this.setState(s => ({ countPts:s.countPts.filter((_, i) => i !== bi) })); };
    V.countUndo = () => this.countUndo(); V.countClear = () => this.setState({ countPts:[] });
    V.setCountSize = e => this.setState({ countSize:+e.target.value });
    V.countExport = async () => {
      const img = await loadImg(S.countImg), W = img.naturalWidth, H = img.naturalHeight, c = mk(W, H), x = c.getContext('2d'), k = W / (this._cw || W), r = S.countSize / 2 * k;
      x.drawImage(img, 0, 0); x.textAlign = 'center'; x.textBaseline = 'middle';
      S.countPts.forEach((p, i) => { x.beginPath(); x.arc(p.x * W, p.y * H, r, 0, 7); x.fillStyle = '#B8322A'; x.fill(); x.lineWidth = 2 * k; x.strokeStyle = '#FFF6EC'; x.stroke(); x.fillStyle = '#FFF6EC'; x.font = `500 ${Math.round(r * .95)}px DM Mono, monospace`; x.fillText(String(i + 1), p.x * W, p.y * H + 1); });
      const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'comptage.png'; a.click();
    };
    return V;
  }

  render() { return tpl(this.renderVals()); }
}

// ---------- template (transcription de la maquette) ----------
const H1 = "font-family:'Shippori Mincho',serif; font-weight:500; font-size:88px; line-height:.92; letter-spacing:-.02em;";
const KICKER = "font-family:'Shippori Mincho',serif; font-size:14px; letter-spacing:.3em;";
const SEAL = 'width:20px; height:20px; background:#B8322A; color:#F3E9D8; border-radius:2px; display:flex; align-items:center; justify-content:center; font-family:\'Shippori Mincho\',serif; font-weight:700; font-size:12px; transform:rotate(-6deg);';

function tpl(V) {
  const t = V.t;
  const panel = `background:${t.panel}; backdrop-filter:blur(6px); border:1px solid ${t.line}; border-radius:4px;`;
  const dot = (r, size) => html`<div style="width:${size}px; height:${size}px; border-radius:50%; background:${r}; box-shadow:0 0 0 1px ${t.edge}; flex:none;"></div>`;
  return html`
<div style="min-height:100vh; position:relative; background:${t.bg}; color:${t.ink}; transition:background .6s, color .6s;">
  <ink-bg mode=${V.inkMode}></ink-bg>
  <div style="position:fixed; inset:0; background-image:${V.paper}; mix-blend-mode:${t.paperBlend}; opacity:${t.paperOp}; pointer-events:none; z-index:0;"></div>

  <div class="tm-shell" style="position:relative; z-index:1; display:grid; grid-template-columns:232px minmax(0,1fr); min-height:100vh;">
    <div class="tm-rail" style="position:sticky; top:0; height:100vh; padding:36px 0 28px 40px; display:flex; flex-direction:column; gap:48px;">
      <div onClick=${V.goHome} style="display:flex; align-items:center; gap:12px; cursor:pointer;">
        <div style="width:40px; height:40px; background:#B8322A; color:#F3E9D8; display:flex; align-items:center; justify-content:center; font-family:'Shippori Mincho',serif; font-weight:700; font-size:22px; border-radius:3px; transform:rotate(-5deg); box-shadow:inset 0 0 0 2px ${t.bg}, inset 0 0 0 3px #B8322A;">珠</div>
        <div style="display:flex; flex-direction:column;">
          <div style="font-family:'Shippori Mincho',serif; font-size:22px; font-weight:500; line-height:1;">Tama</div>
          <div style="font-size:11px; letter-spacing:.12em; color:${t.muted}; margin-top:4px;">ATELIER DE PERLES</div>
        </div>
      </div>
      <div class="tm-nav" style="display:flex; flex-direction:column; gap:20px;">
        ${V.nav.map(n => html`
          <div key=${n.id} onClick=${n.go} style="display:flex; flex-direction:column; gap:2px; position:relative; cursor:pointer; opacity:${n.op}; transition:opacity .25s;" style-hover="opacity:1;">
            <div class="tm-nav-dot" style="position:absolute; left:-18px; top:27px; width:8px; height:8px; border-radius:50% 40% 55% 45%; background:${t.ink}; opacity:${n.dot};"></div>
            <div class="tm-nav-sub" style="font-family:'DM Mono',monospace; font-size:11px; color:${n.subCol};">${n.jp} · ${n.sub}</div>
            <div class="tm-nav-label" style="font-family:'Shippori Mincho',serif; font-size:25px; font-weight:${n.fw};">${n.label}</div>
          </div>`)}
      </div>
      <div class="tm-rail-foot" style="margin-top:auto; display:flex; flex-direction:column; gap:16px; padding-right:28px;">
        <div style="display:flex; border:1px solid ${t.line2}; border-radius:999px; padding:3px; gap:2px; min-width:120px;">
          ${V.themeChips.map(c => html`<div key=${c.label} onClick=${c.go} style="flex:1; text-align:center; cursor:pointer; padding:6px 10px; border-radius:999px; font-size:12px; background:${c.bg}; color:${c.fg}; transition:background .3s;">${c.label}</div>`)}
        </div>
        <div style="display:flex; align-items:center; gap:10px; font-size:13px;">
          <div style="width:28px; height:28px; border-radius:50%; background:${t.invBg}; color:${t.invFg}; display:flex; align-items:center; justify-content:center; font-family:'Shippori Mincho',serif; font-size:13px;">${V.userInitial}</div>
          <div style="display:flex; flex-direction:column;"><div>${V.userName}</div><a href=${LOGOUT_URL} style="font-size:11px; color:${t.muted}; cursor:pointer;">Se déconnecter</a></div>
        </div>
      </div>
    </div>

    <div class="tm-main" style="padding:40px 56px 120px 24px; min-width:0; max-width:1240px; opacity:${V.pg.op}; transform:${V.pg.tf}; transition:${V.pg.tr};">
      ${V.isHome && tplHome(V, t, panel, dot)}
      ${V.isStock && tplStock(V, t, panel, dot)}
      ${V.isModels && tplModels(V, t)}
      ${V.isModel && tplModel(V, t, panel)}
      ${V.isFeas && tplFeas(V, t, panel, dot)}
      ${V.isCount && tplCount(V, t)}
    </div>
  </div>

  <div class="tm-pt" style="position:fixed; top:0; bottom:0; left:232px; right:0; z-index:15; overflow:hidden; pointer-events:${V.pt.pe};">
    <div style="position:absolute; top:-6%; bottom:-6%; left:-22%; width:144%; background:${t.ink}; -webkit-mask-image:${V.brush}; mask-image:${V.brush}; -webkit-mask-size:100% 100%; mask-size:100% 100%; transform:${V.pt.tf}; transition:${V.pt.tr};"></div>
    <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:'Shippori Mincho',serif; font-weight:500; font-size:clamp(64px, 12vw, 150px); letter-spacing:.06em; color:${t.bg}; opacity:${V.pt.kOp}; transform:${V.pt.kTf}; transition:${V.pt.kTr};">${V.pt.kanji}</div>
  </div>

  ${V.hasSel && html`
    <div style="position:fixed; left:50%; bottom:28px; transform:translateX(-50%); z-index:20; display:flex; align-items:center; gap:22px; padding:12px 14px 12px 24px; border-radius:999px; background:${t.invBg}; color:${t.invFg}; box-shadow:0 20px 40px -16px rgba(0,0,0,.5); max-width:calc(100vw - 32px);">
      <div style="font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${V.selN} recette${V.selN > 1 ? 's' : ''} sélectionnée${V.selN > 1 ? 's' : ''} · <span style="font-family:'DM Mono',monospace;">${V.selMissing}</span> perles manquantes</div>
      <div onClick=${V.clearSel} style="cursor:pointer; font-size:13px; opacity:.7; white-space:nowrap;">Désélectionner</div>
      <div onClick=${V.shopSel} style="cursor:pointer; white-space:nowrap; padding:9px 16px; border-radius:999px; font-size:13px; font-weight:500; background:${t.bg}; color:${t.ink};">Liste de courses</div>
    </div>`}

  ${V.hasDrawer && tplDrawer(V, t, dot)}
  ${V.shopOpen && tplShop(V, t, dot)}
  ${V.newOpen && tplNewModel(V, t)}
  ${V.zoom && tplZoom(V, t)}

  ${V.hasToast && html`<div style="position:fixed; top:24px; left:50%; transform:translateX(-50%); z-index:60; padding:11px 20px; border-radius:999px; background:${t.invBg}; color:${t.invFg}; font-size:13px; box-shadow:0 16px 30px -12px rgba(0,0,0,.45); max-width:calc(100vw - 32px);">${V.toast}</div>`}
</div>`;
}

function emptyNote(t, text) {
  return html`<div style="font-size:13px; color:${t.muted}; padding:8px 0;">${text}</div>`;
}

function tplHome(V, t, panel, dot) {
  const H = V.home;
  return html`
<div style="display:flex; flex-direction:column; gap:44px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:32px; flex-wrap:wrap;">
    <div style="display:flex; flex-direction:column; gap:14px; min-width:0;">
      <div style="${KICKER} color:${t.accent};">ようこそ</div>
      <div class="tm-h1" style="${H1} overflow-wrap:anywhere;">${V.greeting}, ${V.userName}.</div>
    </div>
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <div onClick=${V.openBatch} style="cursor:pointer; white-space:nowrap; padding:12px 20px; border-radius:999px; font-size:14px; font-weight:500; background:${t.invBg}; color:${t.invFg};">+ Ajouter du stock</div>
      <div onClick=${V.openNewModel} style="cursor:pointer; white-space:nowrap; padding:12px 20px; border-radius:999px; font-size:14px; font-weight:500; border:1px solid ${t.ink}; background:${t.panelSolid};">+ Nouveau modèle</div>
    </div>
  </div>
  <div class="tm-3" style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px;">
    <div onClick=${V.goStock} style="cursor:pointer; ${panel} padding:22px 24px; display:flex; flex-direction:column; gap:6px;">
      <div style="font-size:13px; color:${t.muted};">Perles en stock</div>
      <div style="font-family:'Shippori Mincho',serif; font-size:48px; line-height:1;">${H.total}</div>
      <div style="font-size:13px; color:${t.muted};">+ ${H.unknown} couleur${H.unknown > 1 ? 's' : ''} en quantité inconnue</div>
    </div>
    <div onClick=${V.goStockOut} style="cursor:pointer; ${panel} padding:22px 24px; display:flex; flex-direction:column; gap:6px;">
      <div style="font-size:13px; color:${t.muted};">Couleurs épuisées</div>
      <div style="font-family:'Shippori Mincho',serif; font-size:48px; line-height:1; color:${t.accent};">${H.out}<span style="font-size:22px; color:${t.muted};"> / ${H.codes}</span></div>
      <div style="font-size:13px; color:${t.muted};">Voir lesquelles →</div>
    </div>
    <div onClick=${V.goFeas} style="cursor:pointer; ${panel} padding:22px 24px; display:flex; flex-direction:column; gap:6px;">
      <div style="font-size:13px; color:${t.muted};">Recettes réalisables</div>
      <div style="font-family:'Shippori Mincho',serif; font-size:48px; line-height:1;">${H.ok}<span style="font-size:22px; color:${t.muted};"> / ${H.recCount}</span></div>
      <div style="font-size:13px; color:${t.muted};">${H.almost} presque prête${H.almost > 1 ? 's' : ''}</div>
    </div>
  </div>
  <div style="display:flex; flex-direction:column; gap:18px;">
    <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px;">
      <div style="font-family:'Shippori Mincho',serif; font-size:28px;">Prêtes à réaliser</div>
      <div onClick=${V.goFeas} style="cursor:pointer; white-space:nowrap; font-size:13px; color:${t.ink}; padding:8px 16px; border-radius:999px; background:${t.chip}; border:1px solid ${t.line2}; backdrop-filter:blur(6px);">Toutes les recettes →</div>
    </div>
    ${H.noReady && emptyNote(t, H.recCount ? "Aucune recette n'est réalisable avec le stock actuel." : 'Pas encore de recette : crée un modèle puis dépose ses recettes.')}
    <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:24px; align-items:end;">
      ${H.ready.map(r => html`
        <div key=${r.id} onClick=${r.open} style="cursor:pointer; display:flex; flex-direction:column; gap:8px; transition:transform .5s cubic-bezier(.2,.7,.2,1);" style-hover="transform:translateY(-6px);">
          <div style="padding:8px; background-color:#B8322A; background-image:${V.shippo}; background-size:20px 10px; background-position:0 0, 10px 5px; box-shadow:0 0 0 1.5px #B8322A, 0 18px 30px -18px rgba(20,15,10,.6);">
            <div style="background:#FBFAF6; aspect-ratio:${r.ar}; box-shadow:0 0 0 1.5px #B8322A;"><img src=${r.src} alt=${r.modelName} style="width:100%; height:100%; display:block; image-rendering:pixelated;" /></div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <div style="font-family:'Shippori Mincho',serif; font-size:16px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.modelName}</div>
            <div style="flex:none; ${SEAL}">可</div>
          </div>
          <div style="font-size:12px; color:${t.muted}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.dithLabel}</div>
        </div>`)}
    </div>
  </div>
  <div class="tm-2" style="display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr); gap:20px;">
    <div style="${panel} padding:22px 24px; display:flex; flex-direction:column; gap:14px;">
      <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap;"><div style="font-family:'Shippori Mincho',serif; font-size:22px;">Presque réalisables</div><div style="font-size:12px; color:${t.muted};">≥ 90 % ou une seule couleur manquante</div></div>
      ${H.noAlmost && emptyNote(t, 'Rien en vue pour le moment.')}
      ${H.almostList.map(r => html`
        <div key=${r.id} onClick=${r.open} style="cursor:pointer; display:grid; grid-template-columns:40px minmax(0,1fr) 120px; gap:14px; align-items:center; padding:8px 0; border-top:1px solid ${t.line};">
          <div style="width:40px; height:40px; background:#FBFAF6; box-shadow:0 0 0 1px #B8322A; display:flex; align-items:center; justify-content:center;"><img src=${r.src} alt="" style="max-width:36px; max-height:36px; image-rendering:pixelated;" /></div>
          <div style="display:flex; flex-direction:column; min-width:0;">
            <div style="font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.modelName} <span style="font-weight:400; color:${t.muted};">· ${r.dithLabel}</span></div>
            <div style="font-size:12px; color:${t.accent}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Manque ${r.missSummary}</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:5px; align-items:flex-end;">
            <div style="font-family:'DM Mono',monospace; font-size:13px;">${r.pct} %</div>
            <div style="width:100%; height:3px; background:${t.line};"><div style="height:3px; width:${r.pctW}; background:${t.ink};"></div></div>
          </div>
        </div>`)}
    </div>
    <div style="${panel} padding:22px 24px; display:flex; flex-direction:column; gap:12px;">
      <div style="font-family:'Shippori Mincho',serif; font-size:22px;">À surveiller</div>
      ${H.noWatch && emptyNote(t, 'Les couleurs utilisées par tes recettes apparaîtront ici.')}
      ${H.watch.map(c => html`
        <div key=${c.code} style="display:grid; grid-template-columns:20px 48px minmax(0,1fr) auto; gap:10px; align-items:center; font-size:13px;">
          ${dot(c.ring, 20)}
          <div style="font-family:'DM Mono',monospace; font-size:12px;">${c.code}</div>
          <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.name}</div>
          <div style="font-family:'DM Mono',monospace; font-size:12px; color:${c.col};">${c.qty}</div>
        </div>`)}
    </div>
  </div>
</div>`;
}

function tplStock(V, t, panel, dot) {
  const ip = V.ip, ins = V.ins;
  const pill = 'cursor:pointer; white-space:nowrap; padding:6px 12px; border-radius:999px; font-size:12px;';
  return html`
<div style="display:flex; flex-direction:column; gap:26px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:32px; flex-wrap:wrap;">
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div style="${KICKER} color:${t.accent};">在庫</div>
      <div class="tm-h1" style="${H1}">Stock</div>
    </div>
    <div class="tm-kpis" style="display:flex; gap:40px; padding-bottom:6px;">
      ${V.stockKpis.map(k => html`
        <div key=${k.k} onClick=${k.go} style="cursor:pointer; display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
          <div style="font-family:'Shippori Mincho',serif; font-size:44px; line-height:1; color:${k.col};">${k.v}</div>
          <div style="font-size:12px; color:${t.muted}; white-space:nowrap; border-bottom:1px solid ${k.line}; padding-bottom:2px;">${k.label}</div>
        </div>`)}
    </div>
  </div>

  <div style="display:flex; flex-direction:column; gap:8px;">
    <div style="display:flex; height:20px; border-radius:2px; overflow:hidden; box-shadow:0 0 0 1px ${t.line2};">
      ${V.band.map(b => html`<div key=${b.code} onClick=${b.go} title=${b.title} style="flex:${b.flex} 1 0px; min-width:0; background:${b.hex}; cursor:pointer; box-shadow:${b.sel}; transition:flex .6s cubic-bezier(.2,.7,.2,1);"></div>`)}
    </div>
    <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; font-size:12px; color:${t.muted};"><div>La composition de ton stock, couleur par couleur. Clique une bande pour la sélectionner.</div><div style="font-family:'DM Mono',monospace;">${V.bandNote}</div></div>
  </div>

  <div style="position:sticky; top:0; z-index:3; padding:14px 0; background:${t.barBg}; backdrop-filter:blur(8px); border-bottom:1px solid ${t.line}; display:flex; flex-direction:column; gap:10px;">
    <div style="display:flex; align-items:center; gap:18px; flex-wrap:wrap;">
      <div style="flex:1 1 380px; display:flex; align-items:center; gap:12px; border:1px solid ${V.cmdBorder}; border-radius:999px; padding:4px 6px 4px 16px; background:${t.panel}; transition:border-color .2s; min-width:0;">
        <div style="font-family:'Shippori Mincho',serif; font-size:18px; color:${t.accent};">筆</div>
        <input data-cmd="1" value=${V.cmd} onChange=${V.setCmd} onKeyDown=${V.cmdKey} placeholder="Chercher « bleu »… ou écrire « +1000 H18 », « -200 H05 », « H09 = 450 »" style="flex:1; min-width:0; background:transparent; border:none; outline:none; font-size:14px; color:${t.ink}; padding:9px 0;" />
        <div style="font-family:'DM Mono',monospace; font-size:11px; padding:6px 12px; border-radius:999px; background:${V.cmdHintBg}; color:${V.cmdHintFg}; white-space:nowrap;">${V.cmdHint}</div>
      </div>
      <div style="display:flex; gap:4px; flex-wrap:wrap;">
        ${V.stockFilterChips.map(c => html`<div key=${c.label} onClick=${c.go} style="${pill} background:${c.bg}; color:${c.fg};">${c.label} <span style="font-family:'DM Mono',monospace; opacity:.7;">${c.n}</span></div>`)}
      </div>
      <div style="display:flex; gap:4px; align-items:center;">
        ${V.stockSortChips.map(c => html`<div key=${c.label} onClick=${c.go} style="${pill} background:${c.bg}; color:${c.fg};">${c.label}</div>`)}
      </div>
      <div style="display:flex; border:1px solid ${t.line2}; border-radius:999px; padding:2px;">
        ${V.viewChips.map(c => html`<div key=${c.label} onClick=${c.go} style="cursor:pointer; white-space:nowrap; padding:5px 12px; border-radius:999px; font-size:12px; background:${c.bg}; color:${c.fg};">${c.label}</div>`)}
      </div>
    </div>
    ${V.hasOps && html`
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        ${V.ops.map((o, i) => html`
          <div key=${i} style="display:flex; align-items:center; gap:8px; white-space:nowrap; padding:5px 12px 5px 6px; border-radius:999px; border:1px solid ${o.border}; background:${t.panelSolid}; font-size:12px;">
            ${dot(o.ring, 18)}
            <span style="font-family:'DM Mono',monospace; font-weight:500;">${o.code}</span><span style="color:${t.muted};">${o.name}</span>
            <span style="font-family:'DM Mono',monospace;">${o.fromL} → <b>${o.toL}</b></span>
          </div>`)}
        <div style="font-size:12px; color:${t.muted};">Entrée pour appliquer · Échap pour annuler</div>
      </div>`}
  </div>

  <div style="display:grid; grid-template-columns:${ip.cols}; gap:28px; align-items:start;">
    <div style="min-width:0;">
      ${V.isGrid && html`
        <div style="display:flex; flex-direction:column; gap:26px;">
          ${V.groups.map(g => html`
            <div key=${g.id} style="display:grid; grid-template-columns:${ip.famCols}; gap:${ip.famGap};">
              <div style="display:flex; flex-direction:${ip.famDir}; align-items:${ip.famAlign}; gap:${ip.famLabelGap}; padding-top:${ip.famPadTop};">
                <div style="font-family:'Shippori Mincho',serif; font-size:36px; line-height:1;">${g.jp}</div>
                <div style="font-size:12px; line-height:1.3;">${g.label}</div>
                <div style="font-family:'DM Mono',monospace; font-size:11px; color:${t.muted};">${g.n}</div>
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(86px,1fr)); gap:4px; border-top:1px solid ${t.line2}; padding-top:10px;">
                ${g.items.map(c => html`
                  <div key=${c.code} onClick=${c.select} title=${c.name} style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px; padding:10px 4px 9px; border-radius:6px; background:${c.cellBg}; box-shadow:${c.cellShadow}; transition:background .2s, transform .35s cubic-bezier(.2,.7,.2,1);" style-hover="transform:translateY(-3px);">
                    <div style="position:relative; width:60px; height:60px; border-radius:50%; background:${c.gauge}; border:${c.gaugeBorder}; display:flex; align-items:center; justify-content:center;">
                      <div style="width:52px; height:52px; border-radius:50%; background:${t.bg}; display:flex; align-items:center; justify-content:center;">
                        <div style="width:46px; height:46px; border-radius:50%; background:${c.ring}; box-shadow:0 0 0 1px ${t.edge};"></div>
                      </div>
                      <div style="position:absolute; top:1px; right:1px; width:11px; height:11px; border-radius:50%; background:#B8322A; border:2px solid ${t.bg}; display:${c.outDot};"></div>
                    </div>
                    <div style="font-family:'DM Mono',monospace; font-size:12px; font-weight:500;">${c.code}</div>
                    <div style="font-family:'DM Mono',monospace; font-size:11px; color:${c.qtyCol}; font-style:${c.qtyStyle};">${c.qtyShort}</div>
                  </div>`)}
              </div>
            </div>`)}
          <div style="display:flex; gap:22px; flex-wrap:wrap; align-items:center; font-size:12px; color:${t.muted}; padding-left:${ip.legendPad};">
            <div style="display:flex; align-items:center; gap:8px;"><div style="width:16px; height:16px; border-radius:50%; background:conic-gradient(${t.ink} 0 65%, ${t.line2} 65% 100%);"></div>Anneau = niveau du stock (0 → 5 000)</div>
            <div style="display:flex; align-items:center; gap:8px;"><div style="width:16px; height:16px; border-radius:50%; background:conic-gradient(${t.accent} 0 40%, ${t.line2} 40% 100%);"></div>Insuffisant pour au moins une recette</div>
            <div style="display:flex; align-items:center; gap:8px;"><div style="width:16px; height:16px; border-radius:50%; border:1.5px dashed ${t.ink};"></div>Quantité inconnue</div>
            <div style="display:flex; align-items:center; gap:8px;"><div style="width:10px; height:10px; border-radius:50%; background:#B8322A;"></div>Épuisé</div>
          </div>
        </div>`}
      ${V.isList && html`
        <div style="${panel}">
          <div class="tm-list-row" style="display:grid; grid-template-columns:28px 52px minmax(0,1fr) 120px 170px 34px 96px; gap:14px; align-items:center; padding:10px 16px; font-size:11px; letter-spacing:.06em; color:${t.muted}; border-bottom:1px solid ${t.line2};">
            <div></div><div>CODE</div><div>NOM</div><div class="tm-hide-sm">NIVEAU</div><div style="text-align:center;">QUANTITÉ</div><div></div><div class="tm-hide-sm" style="text-align:right;">RECETTES</div>
          </div>
          ${V.listItems.map(c => html`
            <div key=${c.code} class="tm-list-row" onClick=${c.select} style="display:grid; grid-template-columns:28px 52px minmax(0,1fr) 120px 170px 34px 96px; gap:14px; align-items:center; padding:7px 16px; border-bottom:1px solid ${t.line}; background:${c.rowBg}; cursor:pointer;">
              ${dot(c.ring, 24)}
              <div style="font-family:'DM Mono',monospace; font-size:12px; font-weight:500;">${c.code}</div>
              <div style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.name} <span style="color:${t.muted}; font-size:11px;">${c.tag}</span></div>
              <div class="tm-hide-sm" style="height:4px; background:${t.line}; border-radius:2px; border:${c.barBorder};"><div style="height:4px; width:${c.lvlW}; background:${c.lvlCol}; border-radius:2px;"></div></div>
              <div style="display:flex; align-items:center; gap:6px;">
                <div onClick=${c.dec} style="cursor:pointer; width:26px; height:26px; flex:none; border:1px solid ${t.line2}; border-radius:50%; display:flex; align-items:center; justify-content:center;">−</div>
                <input type="number" min="0" value=${c.inputVal} onChange=${c.onInput} onClick=${c.stop} placeholder=${c.ph} style="min-width:0; width:100%; flex:1; text-align:center; background:transparent; border:none; border-bottom:1px solid ${t.line2}; padding:4px 0; font-family:'DM Mono',monospace; font-size:13px; color:${c.qtyCol}; outline:none;" />
                <div onClick=${c.inc} style="cursor:pointer; width:26px; height:26px; flex:none; border:1px solid ${t.line2}; border-radius:50%; display:flex; align-items:center; justify-content:center;">+</div>
              </div>
              <div onClick=${c.toggleUnk} title="Quantité inconnue" style="cursor:pointer; width:26px; height:26px; border:1px dashed ${t.ink}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Shippori Mincho',serif; font-size:13px; background:${c.unkBg}; color:${c.unkFg};">?</div>
              <div class="tm-hide-sm" style="text-align:right; font-size:12px; color:${t.muted};">${c.usesShort}</div>
            </div>`)}
        </div>`}
      ${V.stockEmpty && html`<div style="padding:60px 0; text-align:center; font-family:'Shippori Mincho',serif; font-size:20px; color:${t.muted};">Aucune couleur ne correspond.</div>`}
    </div>

    ${ip.backdrop && html`<div onClick=${ip.close} style="position:fixed; inset:0; z-index:24; background:rgba(10,8,6,.3);"></div>`}
    <div style="position:${ip.pos}; top:${ip.top}; right:${ip.right}; bottom:${ip.bottom}; width:${ip.w}; z-index:${ip.z}; max-height:${ip.mh}; border-radius:${ip.r}; display:${ip.disp}; background:${t.panelSolid}; border:1px solid ${t.line}; flex-direction:column; box-shadow:0 30px 50px -36px rgba(0,0,0,.5);">
      <div style="display:flex; align-items:center; border-bottom:1px solid ${t.line};">
        ${V.inspTabs.map(c => html`<div key=${c.k} onClick=${c.go} style="flex:1; cursor:pointer; text-align:center; padding:12px 0 10px; font-size:13px; color:${c.fg}; border-bottom:2px solid ${c.line}; margin-bottom:-1px;">${c.label}</div>`)}
        ${ip.narrow && html`<div onClick=${ip.close} style="cursor:pointer; padding:0 16px; font-size:20px; color:${t.muted};">×</div>`}
      </div>
      ${V.inspColor && html`
        <div style="padding:22px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; min-height:0;">
          <div style="display:flex; gap:18px; align-items:center;">
            <div style="flex:none; width:108px; height:108px; border-radius:50%; background-color:#B8322A; background-image:${V.shippo}; background-size:20px 10px; background-position:0 0, 10px 5px; box-shadow:0 0 0 1.5px #B8322A, 0 14px 24px -14px rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center;">
              <div style="width:76px; height:76px; border-radius:50%; background:${t.mat}; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 1.5px #B8322A;">
                <div style="width:64px; height:64px; border-radius:50%; background:${ins.ring}; box-shadow:0 0 0 1px rgba(26,23,20,.2);"></div>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:3px; min-width:0;">
              <div style="font-family:'DM Mono',monospace; font-size:13px; font-weight:500; color:${t.accent};">${ins.code}</div>
              <div style="font-family:'Shippori Mincho',serif; font-size:26px; line-height:1.1;">${ins.name}</div>
              <div style="font-size:12px; color:${t.muted};">${ins.en} · <span style="font-family:'DM Mono',monospace;">${ins.hex}</span></div>
              <div style="font-size:12px; color:${t.muted};">${ins.famL}</div>
            </div>
          </div>
          <div style="display:flex; align-items:baseline; justify-content:space-between; gap:12px; border-top:1px solid ${t.line}; padding-top:16px;">
            <div style="font-family:'Shippori Mincho',serif; font-size:64px; line-height:.9; color:${ins.qtyCol}; font-style:${ins.qtyStyle};">${ins.qtyL}</div>
            <div style="font-size:12px; color:${ins.stateCol}; text-align:right;">${ins.state}</div>
          </div>
          <div style="display:grid; grid-template-columns:auto auto minmax(0,1fr) auto auto; gap:6px; align-items:center;">
            ${ins.minus.map(b => html`<div key=${b.label} onClick=${b.go} style="cursor:pointer; padding:7px 9px; border-radius:999px; border:1px solid ${t.line2}; font-family:'DM Mono',monospace; font-size:12px; text-align:center;" style-hover="background:rgba(127,127,127,.12);">${b.label}</div>`)}
            <input type="number" min="0" value=${ins.inputVal} onChange=${ins.onInput} placeholder=${ins.ph} style="min-width:0; width:100%; text-align:center; background:transparent; border:none; border-bottom:1px solid ${t.line2}; padding:6px 0; font-family:'DM Mono',monospace; font-size:15px; color:${t.ink}; outline:none;" />
            ${ins.plus.map(b => html`<div key=${b.label} onClick=${b.go} style="cursor:pointer; padding:7px 9px; border-radius:999px; border:1px solid ${t.line2}; font-family:'DM Mono',monospace; font-size:12px; text-align:center;" style-hover="background:rgba(127,127,127,.12);">${b.label}</div>`)}
          </div>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <div style="font-size:12px; color:${t.muted}; margin-right:2px;">Sachet</div>
            ${ins.bags.map(b => html`<div key=${b.label} onClick=${b.go} style="cursor:pointer; padding:6px 12px; border-radius:999px; background:${t.invBg}; color:${t.invFg}; font-family:'DM Mono',monospace; font-size:12px;">${b.label}</div>`)}
            <div onClick=${ins.toggleUnk} style="margin-left:auto; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:12px;">
              <div style="width:30px; height:17px; border-radius:999px; background:${ins.unkTrack}; position:relative; transition:background .25s;"><div style="position:absolute; top:2px; left:${ins.unkKnob}; width:13px; height:13px; border-radius:50%; background:${t.panelSolid}; transition:left .25s;"></div></div>
              Quantité inconnue
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; border-top:1px solid ${t.line}; padding-top:16px;">
            <div style="display:flex; justify-content:space-between; align-items:baseline;"><div style="font-family:'Shippori Mincho',serif; font-size:18px;">Utilisée dans</div><div onClick=${ins.goUses} style="cursor:pointer; font-size:12px; color:${t.muted};">${ins.usesL}</div></div>
            ${ins.uses.map(u => html`
              <div key=${u.id} onClick=${u.open} style="cursor:pointer; display:grid; grid-template-columns:34px minmax(0,1fr) auto; gap:10px; align-items:center;">
                <div style="width:34px; height:34px; background:#FBFAF6; box-shadow:0 0 0 1px #B8322A; display:flex; align-items:center; justify-content:center;"><img src=${u.src} alt="" style="max-width:30px; max-height:30px; image-rendering:pixelated;" /></div>
                <div style="display:flex; flex-direction:column; min-width:0;"><div style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.name}</div><div style="font-size:11px; color:${t.muted};">${u.dith}</div></div>
                <div style="font-family:'DM Mono',monospace; font-size:12px; color:${u.col}; white-space:nowrap;">${u.needL}</div>
              </div>`)}
            ${ins.noUses && html`<div style="font-size:12px; color:${t.muted};">Aucune recette n'utilise cette couleur.</div>`}
          </div>
          <div style="display:flex; flex-direction:column; gap:6px; border-top:1px solid ${t.line}; padding-top:16px;">
            <div style="font-family:'Shippori Mincho',serif; font-size:18px;">Derniers mouvements</div>
            ${ins.hist.map(hh => html`
              <div key=${hh.id} style="display:flex; justify-content:space-between; gap:10px; font-size:12px; opacity:${hh.op};">
                <div><span style="font-family:'DM Mono',monospace;">${hh.fromL} → ${hh.toL}</span> <span style="color:${t.muted};">· ${hh.dateL}${hh.note}</span></div>
                <div onClick=${hh.undo} style="cursor:pointer; color:${t.accent}; white-space:nowrap;">${hh.undoLabel}</div>
              </div>`)}
            ${ins.noHist && html`<div style="font-size:12px; color:${t.muted};">Pas encore de mouvement.</div>`}
          </div>
          <div style="font-family:'DM Mono',monospace; font-size:10.5px; color:${t.muted}; line-height:1.7; border-top:1px solid ${t.line}; padding-top:12px;">← → couleur suivante · ↑ ↓ ±10 (Maj ±100)<br />? quantité inconnue · / saisie rapide</div>
        </div>`}
      ${V.inspHist && html`
        <div style="padding:18px 20px; display:flex; flex-direction:column; gap:12px; min-height:0;">
          <div style="display:flex; gap:8px; align-items:center;">
            <select value=${V.histCode} onChange=${V.setHistCode} style="flex:1; min-width:0; background:transparent; color:${t.ink}; border:1px solid ${t.line2}; border-radius:999px; padding:6px 10px; font-size:12px;">
              <option value="">Toutes les couleurs</option>
              ${V.histCodes.map(o => html`<option key=${o.code} value=${o.code}>${o.code} · ${o.name}</option>`)}
            </select>
            <div style="display:flex; gap:2px;">
              ${V.histPeriodChips.map(c => html`<div key=${c.label} onClick=${c.go} style="cursor:pointer; white-space:nowrap; padding:5px 9px; border-radius:999px; font-size:11px; background:${c.bg}; color:${c.fg};">${c.label}</div>`)}
            </div>
          </div>
          <div style="display:flex; flex-direction:column; overflow-y:auto; min-height:0;">
            ${V.noGlobalHist && html`<div style="font-size:12px; color:${t.muted}; padding:9px 0;">Aucun mouvement sur cette période.</div>`}
            ${V.hist.map(hh => html`
              <div key=${hh.id} style="display:grid; grid-template-columns:16px minmax(0,1fr) auto; gap:10px; align-items:center; padding:9px 0; border-top:1px solid ${t.line}; opacity:${hh.op};">
                ${dot(hh.ring, 16)}
                <div style="display:flex; flex-direction:column; min-width:0;">
                  <div style="font-size:13px;"><span style="font-family:'DM Mono',monospace; font-weight:500;">${hh.code}</span> <span style="font-family:'DM Mono',monospace;">${hh.fromL} → ${hh.toL}</span></div>
                  <div style="font-size:11px; color:${t.muted}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${hh.dateL}${hh.note}</div>
                </div>
                <div onClick=${hh.undo} style="cursor:pointer; font-size:12px; color:${t.accent};">${hh.undoLabel}</div>
              </div>`)}
          </div>
        </div>`}
    </div>
  </div>
</div>`;
}

function tplModels(V, t) {
  return html`
<div style="display:flex; flex-direction:column; gap:28px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:24px; flex-wrap:wrap;">
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div style="${KICKER} color:${t.accent};">図案</div>
      <div class="tm-h1" style="${H1}">Modèles</div>
      <div style="font-size:15px; color:${t.muted};">${V.mv.count} modèle${V.mv.count > 1 ? 's' : ''} · ${V.mv.recCount} recette${V.mv.recCount > 1 ? 's' : ''}</div>
    </div>
    <div onClick=${V.openNewModel} style="cursor:pointer; white-space:nowrap; padding:12px 20px; border-radius:999px; font-size:14px; font-weight:500; background:${t.invBg}; color:${t.invFg};">+ Nouveau modèle</div>
  </div>
  <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap; padding-bottom:12px; border-bottom:1px solid ${t.line};">
    <input value=${V.modelQ} onChange=${V.setModelQ} placeholder="Rechercher un modèle ou un tag…" style="width:260px; max-width:100%; background:transparent; border:none; border-bottom:1px solid ${t.line2}; padding:8px 0; font-size:14px; color:${t.ink}; outline:none;" />
    <div style="display:flex; gap:4px; flex-wrap:wrap;">
      ${V.tagChips.map(c => html`<div key=${c.v || '_all'} onClick=${c.go} style="cursor:pointer; white-space:nowrap; padding:6px 12px; border-radius:999px; font-size:12px; background:${c.bg}; color:${c.fg}; border:1px solid ${t.line2}; transition:background .35s ease, color .35s ease;">${c.label}</div>`)}
    </div>
    <div style="margin-left:auto; display:flex; gap:4px; align-items:center; padding:4px 4px 4px 16px; border-radius:999px; background:${t.chip}; border:1px solid ${t.line}; backdrop-filter:blur(6px);">
      <div style="font-size:12px; color:${t.ink}; margin-right:6px;">Trier</div>
      ${V.modelSortChips.map(c => html`<div key=${c.label} onClick=${c.go} style="cursor:pointer; white-space:nowrap; padding:6px 12px; border-radius:999px; font-size:12px; background:${c.bg}; color:${c.fg};">${c.label}</div>`)}
    </div>
  </div>
  ${V.noModels && html`<div style="padding:48px; text-align:center; font-family:'Shippori Mincho',serif; font-size:20px; color:${t.muted};">${V.mv.count ? 'Aucun modèle ne correspond.' : 'Aucun modèle pour l’instant. Commence par « + Nouveau modèle ».'}</div>`}
  <div class="tm-cols" style="column-count:4; column-gap:32px;">
    ${V.modelCards.map(m => html`
      <div key=${m.id} data-mcard=${String(m.id)} style="break-inside:avoid; margin-bottom:32px;"><div onClick=${m.open} style="display:flex; flex-direction:column; gap:9px; cursor:pointer; opacity:${m.anOp}; transform:${m.anTf}; transition:${m.anTr};" style-hover="transform:translateY(-6px);">
        <div data-morph="1" style="padding:10px; background-color:#B8322A; background-image:${V.shippo}; background-size:20px 10px; background-position:0 0, 10px 5px; box-shadow:0 0 0 1.5px #B8322A, 0 20px 34px -20px rgba(20,15,10,.6);">
          <div style="background:#FBFAF6; aspect-ratio:${m.ar}; box-shadow:0 0 0 1.5px #B8322A;"><img src=${m.src} alt=${m.name} style="width:100%; height:100%; display:block;" /></div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div style="font-family:'Shippori Mincho',serif; font-size:19px; font-weight:500; min-width:0; overflow-wrap:anywhere;">${m.name}</div>
          <div style="font-family:'DM Mono',monospace; font-size:12px; color:${t.muted}; white-space:nowrap;">${m.bestL}</div>
        </div>
        <div style="font-size:12px; color:${t.muted};">${m.recL} · ${m.tagsL}</div>
      </div></div>`)}
  </div>
</div>`;
}

function tplModel(V, t, panel) {
  const md = V.md;
  return html`
<div style="display:flex; flex-direction:column; gap:30px;">
  <div onClick=${V.goModels} style="cursor:pointer; font-size:13px; color:${t.muted};">← Tous les modèles</div>
  <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:24px; flex-wrap:wrap;">
    <div style="display:flex; flex-direction:column; gap:12px; min-width:0; flex:1;">
      <div style="${KICKER} color:${t.accent};">図案</div>
      <input class="tm-h1" value=${md.name} onChange=${md.rename} title="Renommer" style="background:transparent; border:none; border-bottom:1px dashed transparent; font-family:'Shippori Mincho',serif; font-weight:500; font-size:72px; line-height:1; letter-spacing:-.02em; color:${t.ink}; outline:none; padding:0; width:100%;" style-focus="border-bottom-color:currentColor;" />
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        ${md.tags.map(g => html`<div key=${g.label} style="display:flex; gap:6px; align-items:center; padding:4px 6px 4px 12px; border-radius:999px; font-size:12px; border:1px solid ${t.line2};">${g.label}<span onClick=${g.remove} style="cursor:pointer; opacity:.6; padding:0 4px;">×</span></div>`)}
        <input value=${V.tagDraft} onChange=${V.setTagDraft} onKeyDown=${V.tagKey} placeholder="+ tag (Entrée)" style="width:120px; background:transparent; border:none; border-bottom:1px solid ${t.line2}; padding:4px 0; font-size:12px; color:${t.ink}; outline:none;" />
      </div>
    </div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <label style="position:relative; cursor:pointer; white-space:nowrap; padding:9px 16px; border-radius:999px; font-size:13px; border:1px solid ${t.ink};">Changer l'image<input type="file" accept="image/*" onChange=${md.changeImg} style="position:absolute; inset:0; opacity:0; cursor:pointer; width:100%;" /></label>
      <div onClick=${md.del} style="cursor:pointer; white-space:nowrap; padding:9px 16px; border-radius:999px; font-size:13px; border:1px solid ${t.accent}; color:${md.delFg}; background:${md.delBg};">${md.delLabel}</div>
    </div>
  </div>
  <div class="tm-md" style="display:grid; grid-template-columns:260px minmax(0,1fr); gap:40px; align-items:start;">
    <div class="tm-md-side" style="display:flex; flex-direction:column; gap:10px; position:sticky; top:24px;">
      <div data-morph-target="1" style="opacity:${md.morphOp}; padding:12px; background-color:#B8322A; background-image:${V.shippo}; background-size:20px 10px; background-position:0 0, 10px 5px; box-shadow:0 0 0 1.5px #B8322A, 0 20px 34px -20px rgba(20,15,10,.6);">
        <div style="background:#FBFAF6; aspect-ratio:${md.ar}; box-shadow:0 0 0 1.5px #B8322A;"><img src=${md.src} alt=${md.name} style="width:100%; height:100%; display:block;" /></div>
      </div>
      <div style="font-size:12px; color:${t.muted};">Image d'origine · ${md.recL}</div>
    </div>
    <div style="display:flex; flex-direction:column; gap:28px; min-width:0;">
      ${tplGenerator(V, t, panel)}
      <div class="tm-cells" style="display:grid; grid-template-columns:96px repeat(4,minmax(0,1fr)); gap:12px;">
        <div></div>
        ${V.dithHeads.map(d => html`<div key=${d.id} style="font-size:12px; letter-spacing:.06em; color:${t.muted}; padding-bottom:2px;">${d.label}</div>`)}
        ${md.rows.map(row => [
          html`<div key=${'h' + row.id} style="display:flex; flex-direction:column; justify-content:center; gap:2px;">
            <div style="font-family:'Shippori Mincho',serif; font-size:17px;">${row.short}</div>
            <div style="font-size:11px; color:${t.muted};">${row.n} couleurs</div>
          </div>`,
          ...row.cells.map(c => html`
            <div key=${row.id + c.key} style="min-height:250px; display:flex;">
              ${c.filled && html`
                <div style="flex:1; ${panel} padding:10px; display:flex; flex-direction:column; gap:8px; min-width:0;">
                  <div onClick=${c.open} style="cursor:pointer; height:120px; background:#FBFAF6; box-shadow:0 0 0 1px #B8322A; display:flex; align-items:center; justify-content:center;"><img src=${c.src} alt="" style="width:100%; height:100%; padding:4px; object-fit:contain; image-rendering:pixelated;" /></div>
                  <div style="font-family:'DM Mono',monospace; font-size:11px; color:${t.muted}; line-height:1.5;">${c.dims} · ${c.plates}<br />${c.ncolors} coul. · ${c.totalF} perles</div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div style="flex:1; height:3px; background:${t.line};"><div style="height:3px; width:${c.pctW}; background:${c.barCol};"></div></div>
                    <div style="font-family:'DM Mono',monospace; font-size:11px;">${c.pct}%</div>
                  </div>
                  <div style="margin-top:auto; display:flex; justify-content:space-between; gap:6px; font-size:11px;">
                    <div onClick=${c.open} style="cursor:pointer; color:${t.ink};">Détail</div>
                    <label style="position:relative; cursor:pointer; color:${t.muted};">Remplacer<input type="file" accept="image/png,image/*" onChange=${c.onFile} style="position:absolute; inset:0; opacity:0; cursor:pointer; width:100%;" /></label>
                    <div onClick=${c.remove} style="cursor:pointer; color:${t.accent};">Supprimer</div>
                  </div>
                </div>`}
              ${c.empty && html`
                <label style="flex:1; position:relative; cursor:pointer; border:1.5px dashed ${t.line2}; border-radius:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; text-align:center; padding:12px; color:${t.muted}; transition:background .2s;" style-hover="background:rgba(127,127,127,.06);">
                  <div style="font-family:'Shippori Mincho',serif; font-size:26px; opacity:.6;">＋</div>
                  <div style="font-size:12px;">Déposer une image</div>
                  <div style="font-size:11px; opacity:.7;">ou cliquer</div>
                  <input type="file" accept="image/png,image/*" onChange=${c.onFile} style="position:absolute; inset:0; opacity:0; cursor:pointer; width:100%;" />
                </label>`}
            </div>`)
        ])}
      </div>
      ${md.hasCmp && html`
        <div style="${panel} padding:20px 22px; display:flex; flex-direction:column; gap:12px; overflow-x:auto;">
          <div style="font-family:'Shippori Mincho',serif; font-size:22px;">Comparer les recettes</div>
          <div style="display:grid; grid-template-columns:${md.cmpCols}; font-size:13px; min-width:0;">
            ${md.cmpCells.map((x, i) => html`<div key=${i} style="padding:9px 10px 9px 0; border-top:1px solid ${t.line}; font-family:${x.font}; color:${x.col}; font-weight:${x.fw}; white-space:nowrap;">${x.v}</div>`)}
          </div>
        </div>`}
    </div>
  </div>
</div>`;
}

function tplGenerator(V, t, panel) {
  const g = V.gen;
  const pill = 'cursor:pointer; white-space:nowrap; padding:6px 12px; border-radius:999px; font-size:12px;';
  return html`
<div style="${panel} padding:18px 22px; display:flex; flex-direction:column; gap:16px;">
  <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
    <div style="display:flex; flex-direction:column; gap:2px;">
      <div style="font-family:'Shippori Mincho',serif; font-size:22px;">Générer depuis l'image d'origine</div>
      <div style="font-size:12px; color:${t.muted};">Réduit l'image à la taille voulue et la traduit en perles de la palette, avec chaque dithering.</div>
    </div>
    <div onClick=${g.toggle} style="cursor:pointer; white-space:nowrap; padding:9px 16px; border-radius:999px; font-size:13px; ${g.open ? `border:1px solid ${t.line2};` : `background:${t.invBg}; color:${t.invFg};`}">${g.open ? 'Fermer' : 'Générer les recettes →'}</div>
  </div>
  ${g.open && html`
    <div style="display:flex; align-items:center; gap:18px; flex-wrap:wrap; border-top:1px solid ${t.line}; padding-top:14px;">
      <label style="display:flex; align-items:baseline; gap:8px; font-size:13px;">Largeur
        <input type="number" min=${GEN_MIN_W} max=${GEN_MAX_W} value=${g.w} onChange=${g.setW} onBlur=${g.fixW} style="width:64px; text-align:center; background:transparent; border:none; border-bottom:1px solid ${t.line2}; padding:4px 0; font-family:'DM Mono',monospace; font-size:15px; color:${t.ink}; outline:none;" />
        <span style="font-family:'DM Mono',monospace; font-size:12px; color:${t.muted};">${g.dimsL}</span>
      </label>
      ${g.palChips.length > 0 && html`<div style="display:flex; gap:4px;">${g.palChips.map(c => html`<div key=${c.label} onClick=${c.go} style="${pill} background:${c.bg}; color:${c.fg};">${c.label}</div>`)}</div>`}
      <div onClick=${g.toggleStock} style="cursor:pointer; display:flex; align-items:center; gap:8px; font-size:12px;">
        <div style="width:30px; height:17px; border-radius:999px; background:${g.stockTrack}; position:relative; transition:background .25s; flex:none;"><div style="position:absolute; top:2px; left:${g.stockKnob}; width:13px; height:13px; border-radius:50%; background:${t.panelSolid}; transition:left .25s;"></div></div>
        <div style="display:flex; flex-direction:column;"><span>Seulement les couleurs en stock</span><span style="color:${t.muted}; font-size:11px;">${g.stockL}</span></div>
      </div>
      <div onClick=${g.saveAll} style="margin-left:auto; cursor:pointer; white-space:nowrap; padding:8px 14px; border-radius:999px; font-size:12px; font-weight:500; background:${t.invBg}; color:${t.invFg}; opacity:${g.noColors || g.loading ? .4 : 1};">Tout enregistrer</div>
    </div>
    ${g.noColors && html`<div style="font-size:13px; color:${t.accent};">Aucune couleur de cette palette n'est en stock.</div>`}
    ${g.loading && html`<div style="font-size:13px; color:${t.muted};">Chargement de l'image…</div>`}
    <div class="tm-gen" style="display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px;">
      ${g.cards.map(c => html`
        <div key=${c.id} style="display:flex; flex-direction:column; gap:8px; min-width:0;">
          <div style="font-size:12px; letter-spacing:.06em; color:${t.muted};">${c.label}</div>
          <div onClick=${c.zoom} title="Agrandir" style="height:150px; background:#FBFAF6; box-shadow:0 0 0 1px #B8322A; display:flex; align-items:center; justify-content:center; cursor:${c.ready ? 'zoom-in' : 'default'};">
            ${c.ready && html`<img src=${c.src} alt=${'Aperçu ' + c.label} style="width:100%; height:100%; padding:4px; object-fit:contain; image-rendering:pixelated;" />`}
          </div>
          ${c.ready && html`<div style="font-family:'DM Mono',monospace; font-size:11px; color:${t.muted};">${c.statL}</div>`}
          ${c.ready && html`
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="flex:1; height:3px; background:${t.line};"><div style="height:3px; width:${c.pctW}; background:${c.barCol};"></div></div>
              <div style="font-family:'DM Mono',monospace; font-size:11px;">${c.pct}%</div>
            </div>`}
          ${c.ready && html`<div onClick=${c.save} style="cursor:pointer; text-align:center; padding:7px 10px; border-radius:999px; font-size:12px; border:1px solid ${t.ink};">${c.saveLabel}</div>`}
        </div>`)}
    </div>`}
</div>`;
}

function tplZoom(V, t) {
  const z = V.zoom;
  const btn = 'cursor:pointer; white-space:nowrap; padding:9px 16px; border-radius:999px; font-size:13px;';
  const arrow = 'cursor:pointer; flex:none; width:44px; height:44px; border-radius:50%; border:1px solid rgba(243,233,216,.4); color:#F3E9D8; display:flex; align-items:center; justify-content:center; font-size:20px;';
  return html`
<div onClick=${e => { if (e.target === e.currentTarget) z.close(); }} style="position:fixed; inset:0; z-index:45; background:rgba(10,8,6,.86); backdrop-filter:blur(4px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:20px;">
  <div style="width:min(100%, max(${z.w}, 520px)); display:flex; justify-content:space-between; align-items:flex-end; gap:16px; color:#F3E9D8;">
    <div style="display:flex; flex-direction:column; gap:4px; min-width:0;">
      <div style="font-size:12px; opacity:.7;">${z.palShort} · ${z.dimsL}</div>
      <div style="font-family:'Shippori Mincho',serif; font-size:30px; line-height:1.05;">${z.label}</div>
    </div>
    <div onClick=${z.close} title="Fermer (Échap)" style="cursor:pointer; font-size:28px; line-height:1; opacity:.8;">×</div>
  </div>
  <div style="display:flex; align-items:center; gap:16px; max-width:100%;">
    <div onClick=${z.prev} title="Dithering précédent (←)" style="${arrow}">‹</div>
    <div style="position:relative; flex:none; width:${z.w}; height:${z.h}; background:#FBFAF6; box-shadow:0 0 0 2px #B8322A, 0 30px 60px -20px rgba(0,0,0,.7);">
      <img src=${z.src} alt=${'Aperçu ' + z.label} style="width:100%; height:100%; display:block; image-rendering:pixelated;" />
      ${z.grid && html`<div style="position:absolute; inset:0; pointer-events:none; background-image:linear-gradient(to right, rgba(26,23,20,.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,23,20,.28) 1px, transparent 1px); background-size:${z.cell} ${z.cell};"></div>`}
    </div>
    <div onClick=${z.next} title="Dithering suivant (→)" style="${arrow}">›</div>
  </div>
  <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap; justify-content:center; color:#F3E9D8; font-size:13px;">
    <span style="font-family:'DM Mono',monospace; font-size:12px; opacity:.8;">${z.statL} · ${z.pct} % en stock</span>
    ${z.canGrid && html`<div onClick=${z.toggleGrid} style="${btn} border:1px solid rgba(243,233,216,.4); background:${z.gridOn ? '#F3E9D8' : 'transparent'}; color:${z.gridOn ? '#1A1714' : '#F3E9D8'};">Grille</div>`}
    <div onClick=${z.save} style="${btn} font-weight:500; background:#F3E9D8; color:#1A1714;">${z.saveLabel}</div>
  </div>
</div>`;
}

function tplFeas(V, t, panel, dot) {
  const pill = 'cursor:pointer; white-space:nowrap; padding:6px 12px; border-radius:999px; font-size:12px;';
  return html`
<div style="display:flex; flex-direction:column; gap:26px;">
  <div style="display:flex; flex-direction:column; gap:14px;">
    <div style="${KICKER} color:${t.accent};">可能</div>
    <div style="display:flex; align-items:flex-end; gap:36px; flex-wrap:wrap;">
      ${V.feasTabs.map(c => html`
        <div key=${c.v} onClick=${c.go} style="cursor:pointer; display:flex; flex-direction:column; gap:8px; opacity:${c.op}; transition:opacity .4s ease;">
          <div style="font-family:'Shippori Mincho',serif; font-weight:500; font-size:${c.size}; line-height:.95; letter-spacing:-.02em; white-space:nowrap; transition:font-size .55s cubic-bezier(.16,1,.3,1);">${c.label} <span style="font-family:'DM Mono',monospace; font-size:16px; letter-spacing:0;">${c.n}</span></div>
          <div style="height:3px; width:${c.w}; background:${t.ink}; border-radius:2px 6px 3px 8px; transform:rotate(-1deg); transition:width .4s;"></div>
        </div>`)}
    </div>
  </div>
  <div style="display:flex; align-items:center; gap:14px; flex-wrap:nowrap; overflow-x:auto; position:sticky; top:12px; z-index:3; padding:8px 18px 8px 8px; border-radius:999px; background:${t.barBg}; backdrop-filter:blur(10px); border:1px solid ${t.line2}; box-shadow:0 12px 28px -18px rgba(0,0,0,.4);">
    <div style="display:flex; gap:4px; align-items:center;">
      <div style="font-size:12px; color:${t.ink}; margin:0 6px 0 10px;">Trier</div>
      ${V.feasSortChips.map(c => html`<div key=${c.label} onClick=${c.go} style="${pill} background:${c.bg}; color:${c.fg};">${c.label}</div>`)}
    </div>
    ${V.hasPalChips && html`
      <div style="display:flex; gap:4px; align-items:center; padding-left:10px; border-left:1px solid ${t.line2};">
        ${V.feasPalChips.map(c => html`<div key=${c.label} onClick=${c.go} style="${pill} background:${c.bg}; color:${c.fg};">${c.label}</div>`)}
      </div>`}
    ${V.hasColorFilter && html`
      <div onClick=${V.clearColorFilter} style="cursor:pointer; flex:none; white-space:nowrap; display:flex; align-items:center; gap:8px; padding:5px 10px 5px 6px; border-radius:999px; font-size:12px; border:1px solid ${t.ink};">${dot(V.colorFilter.ring, 16)}Contient ${V.colorFilter.code} ×</div>`}
    <div onClick=${V.toggleCodes} style="margin-left:auto; flex:none; white-space:nowrap; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:12px;">
      <div style="width:30px; height:17px; border-radius:999px; background:${V.codesTrack}; position:relative; transition:background .25s;"><div style="position:absolute; top:2px; left:${V.codesKnob}; width:13px; height:13px; border-radius:50%; background:${t.bg}; transition:left .25s;"></div></div>
      Afficher les codes
    </div>
  </div>
  <div style="display:flex; flex-direction:column; gap:10px;">
    ${V.feasList.map(r => html`
      <div key=${r.id} style="background:${t.panel}; backdrop-filter:blur(6px); border:1px solid ${r.borderCol}; border-radius:4px; opacity:${r.anOp}; transform:${r.anTf}; transition:${r.anTr};">
        <div class="tm-feasrow" style="display:grid; grid-template-columns:20px 56px minmax(160px,1fr) minmax(110px,200px) 76px 18px; gap:14px; align-items:center; padding:12px 18px;">
          <div onClick=${r.toggleSel} style="cursor:pointer; width:18px; height:18px; border:1.5px solid ${t.ink}; border-radius:3px; background:${r.selBg}; color:${t.invFg}; display:flex; align-items:center; justify-content:center; font-size:12px;">${r.selMark}</div>
          <div onClick=${r.open} style="cursor:pointer; width:56px; height:56px; background:#FBFAF6; box-shadow:0 0 0 1px #B8322A; display:flex; align-items:center; justify-content:center;"><img src=${r.src} alt="" style="max-width:50px; max-height:50px; image-rendering:pixelated;" /></div>
          <div onClick=${r.toggleExp} style="cursor:pointer; display:flex; flex-direction:column; gap:3px; min-width:0;">
            <div style="display:flex; align-items:center; gap:10px; min-width:0;">
              <div style="font-family:'Shippori Mincho',serif; font-size:19px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;">${r.modelName}</div>
              ${r.almost && html`<div style="font-size:11px; padding:2px 8px; border-radius:999px; background:${t.accent}; color:#FFF6EC;">Presque</div>`}
              ${r.ok && html`<div style="flex:none; ${SEAL}">可</div>`}
            </div>
            <div style="font-size:12px; color:${t.muted}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.dithLabel} · ${r.dims} · ${r.plates}</div>
          </div>
          <div class="tm-feasbar" style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px; font-size:12px;">
              <div style="font-family:'DM Mono',monospace; font-size:15px;">${r.pct} %</div>
              <div style="color:${t.muted}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; text-align:right;" title=${r.optL}>${r.optL}</div>
            </div>
            <div style="height:4px; background:${t.line}; position:relative;">
              <div style="position:absolute; left:0; top:0; height:4px; width:${r.pctOptW}; background:${t.ink}; opacity:.25;"></div>
              <div style="position:absolute; left:0; top:0; height:4px; width:${r.pctW}; background:${r.barCol};"></div>
            </div>
          </div>
          <div style="text-align:right; display:flex; flex-direction:column; gap:2px;">
            <div style="font-family:'DM Mono',monospace; font-size:14px; color:${r.missCol};">${r.missingL}</div>
            <div style="font-size:11px; color:${t.muted};">${r.missSub}</div>
          </div>
          <div onClick=${r.toggleExp} style="cursor:pointer; font-size:14px; transform:rotate(${r.chev}); transition:transform .3s; text-align:center;">⌄</div>
        </div>
        ${r.expanded && html`
          <div class="tm-feasexp" style="border-top:1px solid ${t.line}; padding:16px 18px 18px 108px; display:flex; flex-direction:column; gap:14px;">
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:6px 18px;">
              ${r.rows.map(n => html`
                <div key=${n.code} style="display:grid; grid-template-columns:16px minmax(0,1fr) auto; gap:9px; align-items:center; font-size:13px; padding:3px 0;">
                  ${dot(n.ring, 16)}
                  <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:${n.col};"><span style="font-family:'DM Mono',monospace; font-size:12px; display:${V.codesDisp};">${n.code} </span>${n.name}</div>
                  <div style="font-family:'DM Mono',monospace; font-size:12px; color:${n.col}; white-space:nowrap;">${n.needF}<span style="opacity:.5;"> / ${n.haveL}</span></div>
                </div>`)}
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <div onClick=${r.markDone} style="cursor:pointer; white-space:nowrap; padding:8px 14px; border-radius:999px; font-size:12px; font-weight:500; background:${t.invBg}; color:${t.invFg};">Marquer comme réalisée</div>
              <div onClick=${r.shopOne} style="cursor:pointer; white-space:nowrap; padding:8px 14px; border-radius:999px; font-size:12px; border:1px solid ${t.ink};">Liste de courses</div>
              <div onClick=${r.goModel} style="cursor:pointer; white-space:nowrap; padding:8px 14px; font-size:12px; color:${t.muted};">Ouvrir le modèle →</div>
            </div>
          </div>`}
      </div>`)}
    ${V.feasEmpty && html`<div style="padding:48px; text-align:center; font-family:'Shippori Mincho',serif; font-size:20px; color:${t.muted};">Aucune recette ici pour l'instant.</div>`}
  </div>
</div>`;
}

function tplCount(V, t) {
  const btn = `cursor:pointer; white-space:nowrap; padding:8px 14px; border-radius:999px; font-size:13px; border:1px solid ${t.ink};`;
  return html`
<div style="display:flex; flex-direction:column; gap:26px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:24px; flex-wrap:wrap;">
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div style="${KICKER} color:${t.accent};">数</div>
      <div class="tm-h1" style="${H1}">Comptage</div>
      <div style="font-size:15px; color:${t.muted};">Clique pour poser un point, clic droit pour l'enlever. Rien n'est enregistré.</div>
    </div>
    ${V.hasCountImg && html`<div style="font-family:'Shippori Mincho',serif; font-size:80px; line-height:.9;">${V.countN}<span style="font-size:20px; color:${t.muted};"> point${V.countN > 1 ? 's' : ''}</span></div>`}
  </div>
  ${V.noCountImg && html`
    <label onDragOver=${e => e.preventDefault()} onDrop=${V.countDrop} style="position:relative; cursor:pointer; height:420px; border:1.5px dashed ${t.line2}; border-radius:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; background:${t.panel}; backdrop-filter:blur(6px); text-align:center; padding:16px;">
      <div style="font-family:'Shippori Mincho',serif; font-size:36px;">Dépose une photo ici</div>
      <div style="font-size:14px; color:${t.muted};">ou clique pour choisir un fichier</div>
      <input type="file" accept="image/*" onChange=${V.countFile} style="position:absolute; inset:0; opacity:0; cursor:pointer; width:100%;" />
    </label>`}
  ${V.hasCountImg && html`
    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <div onClick=${V.countUndo} style="${btn}">Annuler <span style="font-family:'DM Mono',monospace; font-size:11px; opacity:.6;">Ctrl+Z</span></div>
      <div onClick=${V.countClear} style="${btn}">Tout effacer</div>
      <div style="display:flex; align-items:center; gap:10px; font-size:13px; margin-left:12px;">Taille<input type="range" min="10" max="48" value=${V.countSize} onChange=${V.setCountSize} style="width:120px; accent-color:#B8322A;" /><span style="font-family:'DM Mono',monospace; font-size:12px;">${V.countSize}px</span></div>
      <div style="margin-left:auto; display:flex; gap:8px;">
        <label style="position:relative; cursor:pointer; white-space:nowrap; padding:8px 14px; border-radius:999px; font-size:13px; color:${t.muted};">Changer d'image<input type="file" accept="image/*" onChange=${V.countFile} style="position:absolute; inset:0; opacity:0; cursor:pointer; width:100%;" /></label>
        <div onClick=${V.countExport} style="cursor:pointer; white-space:nowrap; padding:8px 16px; border-radius:999px; font-size:13px; font-weight:500; background:${t.invBg}; color:${t.invFg};">Exporter l'image</div>
      </div>
    </div>
    <div style="display:flex; justify-content:center; background:${t.panel}; border:1px solid ${t.line}; border-radius:4px; padding:20px;">
      <div onClick=${V.countClick} onContextMenu=${V.countRight} style="position:relative; cursor:crosshair; line-height:0; max-width:100%;">
        <img src=${V.countImg} alt="Image à compter" style="max-width:100%; max-height:70vh; display:block; user-select:none;" draggable="false" />
        ${V.countPts.map(p => html`<div key=${p.n} style="position:absolute; left:${p.l}; top:${p.t}; width:${p.s}; height:${p.s}; margin-left:${p.m}; margin-top:${p.m}; border-radius:50%; background:#B8322A; color:#FFF6EC; border:2px solid #FFF6EC; display:flex; align-items:center; justify-content:center; font-family:'DM Mono',monospace; font-size:${p.fs}; line-height:1; font-weight:500; pointer-events:none; box-shadow:0 2px 6px rgba(0,0,0,.35);">${p.n}</div>`)}
      </div>
    </div>`}
</div>`;
}

function tplDrawer(V, t, dot) {
  const dA = V.dA, dr = V.dr;
  return html`
<div>
  <div onClick=${V.closeDrawer} style="position:fixed; inset:0; z-index:30; background:rgba(10,8,6,.35); opacity:${dA.bOp}; transition:${dA.bTr};"></div>
  <div style="position:fixed; top:0; right:0; bottom:0; width:440px; max-width:100vw; z-index:31; background:${t.panelSolid}; border-left:1px solid ${t.line}; padding:28px 30px; display:flex; flex-direction:column; gap:18px; overflow-y:auto; box-shadow:-30px 0 60px -30px rgba(0,0,0,.5); transform:${dA.tf}; transition:${dA.tr};">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; opacity:${dA.op}; transform:${dA.up}; transition:${dA.tc1};">
      <div style="display:flex; flex-direction:column; gap:4px; min-width:0;">
        <div style="font-size:12px; color:${t.muted};">Dithering · ${dr.dithLabel}</div>
        <div style="font-family:'Shippori Mincho',serif; font-size:34px; font-weight:500; line-height:1.05; overflow-wrap:anywhere;">${dr.modelName}</div>
      </div>
      <div onClick=${V.closeDrawer} style="cursor:pointer; font-size:22px; color:${t.muted};">×</div>
    </div>
    <div style="padding:10px; background-color:#B8322A; background-image:${V.shippo}; background-size:20px 10px; background-position:0 0, 10px 5px; box-shadow:0 0 0 1.5px #B8322A; align-self:center; width:220px; flex:none; clip-path:${dA.clip}; transform:${dA.imgTf}; transition:${dA.tImg};">
      <div style="background:#FBFAF6; aspect-ratio:${dr.ar}; box-shadow:0 0 0 1.5px #B8322A;"><img src=${dr.src} alt="" style="width:100%; height:100%; display:block; image-rendering:pixelated;" /></div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; text-align:center; opacity:${dA.op}; transform:${dA.up}; transition:${dA.tc3};">
      <div style="display:flex; flex-direction:column; gap:2px;"><div style="font-family:'Shippori Mincho',serif; font-size:22px;">${dr.dims}</div><div style="font-size:11px; color:${t.muted};">${dr.plates}</div></div>
      <div style="display:flex; flex-direction:column; gap:2px;"><div style="font-family:'Shippori Mincho',serif; font-size:22px;">${dr.totalF}</div><div style="font-size:11px; color:${t.muted};">perles · ${dr.ncolors} coul.</div></div>
      <div style="display:flex; flex-direction:column; gap:2px;"><div style="font-family:'Shippori Mincho',serif; font-size:22px; color:${dr.missCol};">${dr.pct} %</div><div style="font-size:11px; color:${t.muted};">${dr.optL}</div></div>
    </div>
    <div style="display:flex; flex-direction:column; border-top:1px solid ${t.line};">
      ${dr.rows.map(n => html`
        <div key=${n.code} style="display:grid; grid-template-columns:18px 50px minmax(0,1fr) auto; gap:10px; align-items:center; font-size:13px; padding:7px 0; border-bottom:1px solid ${t.line}; opacity:${dA.op}; transform:${dA.rowUp}; transition:${n.dTr};">
          ${dot(n.ring, 18)}
          <div style="font-family:'DM Mono',monospace; font-size:12px;">${n.code}</div>
          <div style="color:${n.col}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${n.name}</div>
          <div style="font-family:'DM Mono',monospace; font-size:12px; color:${n.col}; white-space:nowrap;">${n.needF}<span style="opacity:.5;"> / ${n.haveL}</span></div>
        </div>`)}
    </div>
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto; opacity:${dA.op}; transform:${dA.up}; transition:${dA.tc5};">
      <div onClick=${dr.markDone} style="cursor:pointer; text-align:center; padding:12px; border-radius:999px; font-size:14px; font-weight:500; background:${t.invBg}; color:${t.invFg};">Marquer comme réalisée · déduire du stock</div>
      <div style="display:flex; gap:8px;">
        <div onClick=${dr.shopOne} style="flex:1; cursor:pointer; text-align:center; padding:10px; border-radius:999px; font-size:13px; border:1px solid ${t.ink};">Liste de courses</div>
        <div onClick=${dr.goModel} style="flex:1; cursor:pointer; text-align:center; padding:10px; border-radius:999px; font-size:13px; border:1px solid ${t.line2};">Ouvrir le modèle</div>
      </div>
    </div>
  </div>
</div>`;
}

function tplShop(V, t, dot) {
  const sh = V.shop;
  return html`
<div style="position:fixed; inset:0; z-index:40; background:rgba(10,8,6,.45); display:flex; align-items:center; justify-content:center; padding:24px;" onClick=${e => { if (e.target === e.currentTarget) V.closeShop(); }}>
  <div style="width:520px; max-width:100%; max-height:86vh; background:${t.panelSolid}; border:1px solid ${t.line}; border-radius:6px; padding:28px; display:flex; flex-direction:column; gap:14px; box-shadow:0 40px 80px -30px rgba(0,0,0,.6);">
    <div style="display:flex; justify-content:space-between; align-items:baseline;"><div style="font-family:'Shippori Mincho',serif; font-size:30px;">Liste de courses</div><div onClick=${V.closeShop} style="cursor:pointer; font-size:22px; color:${t.muted};">×</div></div>
    <div style="font-size:13px; color:${t.muted};">${sh.sub}</div>
    <div style="display:flex; flex-direction:column; overflow-y:auto; min-height:0; border-top:1px solid ${t.line};">
      ${sh.rows.map(n => html`
        <div key=${n.code} style="display:grid; grid-template-columns:18px 50px minmax(0,1fr) auto; gap:10px; align-items:center; font-size:13px; padding:8px 0; border-bottom:1px solid ${t.line};">
          ${dot(n.ring, 18)}
          <div style="font-family:'DM Mono',monospace; font-size:12px;">${n.code}</div>
          <div>${n.name}</div>
          <div style="font-family:'DM Mono',monospace; font-size:13px; font-weight:500; color:${n.col};">${n.qtyL}</div>
        </div>`)}
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
      <div style="font-family:'Shippori Mincho',serif; font-size:18px;">${sh.totalL}</div>
      <div style="display:flex; gap:8px;">
        <div onClick=${V.shopCopy} style="cursor:pointer; padding:10px 16px; border-radius:999px; font-size:13px; border:1px solid ${t.ink};">${V.copyLabel}</div>
        <div onClick=${V.shopExport} style="cursor:pointer; padding:10px 18px; border-radius:999px; font-size:13px; font-weight:500; background:${t.invBg}; color:${t.invFg};">Exporter .txt</div>
      </div>
    </div>
  </div>
</div>`;
}

function tplNewModel(V, t) {
  const A = V.nmA, nm = V.nm;
  return html`
<div style="position:fixed; inset:0; z-index:40; display:flex; align-items:center; justify-content:center; padding:24px;">
  <div onClick=${V.closeNewModel} style="position:absolute; inset:0; background:${A.halo}; clip-path:${A.clip2}; transition:clip-path ${A.t2};"></div>
  <div onClick=${V.closeNewModel} style="position:absolute; inset:0; background:${A.ink}; clip-path:${A.clip}; transition:clip-path ${A.t1}; backdrop-filter:blur(2px);"></div>
  <div style="position:relative; width:520px; max-width:100%; background:${t.panelSolid}; border:1px solid ${t.line}; border-radius:6px; padding:28px; display:flex; flex-direction:column; gap:16px; box-shadow:0 40px 80px -30px rgba(0,0,0,.6); opacity:${A.op}; transform:${A.tf}; filter:${A.blur}; transition:${A.tModal};">
    <div style="position:absolute; top:-14px; right:26px; width:44px; height:44px; background:#B8322A; color:#F3E9D8; border-radius:3px; display:flex; align-items:center; justify-content:center; font-family:'Shippori Mincho',serif; font-weight:700; font-size:24px; box-shadow:inset 0 0 0 2px ${t.panelSolid}, inset 0 0 0 3px #B8322A, 0 8px 16px -8px rgba(0,0,0,.4); opacity:${A.sealOp}; transform:${A.sealTf}; transition:${A.tSeal};">新</div>
    <div style="display:flex; flex-direction:column; gap:8px; opacity:${A.op}; transform:${A.up}; transition:${A.tc1};">
      <div style="display:flex; justify-content:space-between; align-items:baseline; padding-right:60px;"><div style="font-family:'Shippori Mincho',serif; font-size:30px;">Nouveau modèle</div></div>
      <div style="height:3px; width:${A.stroke}; background:${t.ink}; border-radius:2px 6px 3px 8px; transform:rotate(-1deg); transition:${A.tStroke};"></div>
    </div>
    <input value=${nm.name} onChange=${V.setNmName} placeholder="Nom du modèle" style="background:transparent; border:none; border-bottom:1px solid ${t.line2}; padding:10px 0; font-family:'Shippori Mincho',serif; font-size:22px; color:${t.ink}; outline:none; opacity:${A.op}; transform:${A.up}; transition:${A.tc2};" />
    <label style="position:relative; cursor:pointer; height:220px; border:1.5px dashed ${t.line2}; border-radius:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; color:${t.muted}; overflow:hidden; opacity:${A.op}; transform:${A.up}; transition:${A.tc3};">
      ${nm.hasImg && html`<img src=${nm.src} alt="" style="max-width:100%; max-height:200px;" />`}
      ${nm.noImg && html`<div style="font-family:'Shippori Mincho',serif; font-size:22px; color:${t.ink};">Image d'origine</div>`}
      ${nm.noImg && html`<div style="font-size:13px;">Glisse-la ici ou clique pour choisir</div>`}
      <input type="file" accept="image/*" onChange=${V.nmFile} style="position:absolute; inset:0; opacity:0; cursor:pointer; width:100%;" />
    </label>
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; opacity:${A.op}; transform:${A.up}; transition:${A.tc4};">
      <div style="font-size:12px; color:${t.muted}; max-width:260px;">Tu ajouteras ensuite les recettes (une par dithering) depuis la fiche du modèle.</div>
      <div style="display:flex; gap:8px;">
        <div onClick=${V.closeNewModel} style="cursor:pointer; padding:10px 16px; font-size:13px; color:${t.muted};">Annuler</div>
        <div onClick=${V.createModel} style="cursor:pointer; white-space:nowrap; padding:10px 20px; border-radius:999px; font-size:13px; font-weight:500; background:${t.invBg}; color:${t.invFg}; opacity:${nm.op}; transition:opacity .3s;">Créer le modèle</div>
      </div>
    </div>
  </div>
</div>`;
}

// ---------- démarrage ----------
api('GET', '/api/bootstrap').then(data => {
  initPalettes(data.pals);
  ReactDOM.createRoot(ROOT).render(React.createElement(App, { data }));
}).catch(err => {
  ROOT.innerHTML = '';
  const box = document.createElement('div'); box.id = 'tama-loading'; box.textContent = 'Impossible de charger les données : ' + err.message;
  ROOT.appendChild(box);
});
})();
