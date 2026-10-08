'use strict';
/* Lousa — janelas dos widgets (arrastar, redimensionar, configurar) e peças de interface compartilhadas */

/* Registro dos widgets. Cada um declara: name, cat, icon, w, h, init() (dados iniciais),
   fields (formulário do botão de engrenagem) e render(el, d, c), que devolve as ações dos botões [data-a]. */
const W = { defs: {}, reg(id, def) { def.id = id; this.defs[id] = def; } };
const NAMES_F = ['names', 'Nomes, um por linha (vazio = usa a turma selecionada)', 'area'];

/* ---------- Avisos, janelas de diálogo e arquivos ---------- */
function toast(msg, action) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  if (action) $('button', t).onclick = () => { t.classList.remove('on'); action.fn(); };
  t.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('on'), action ? 6000 : 3200);
}
function modal(title, html, cls = '') {
  const w = document.createElement('div');
  w.className = 'modalwrap';
  w.innerHTML = `<div class="modal ${cls}"><div class="mhead"><h2>${esc(title)}</h2><button class="icon" data-x title="Fechar">${ic('x')}</button></div><div class="mbody">${html}</div></div>`;
  document.body.append(w);
  const m = { el: w, body: $('.mbody', w), onClose: null, close() { w.remove(); if (m.onClose) m.onClose(); } };
  w.addEventListener('pointerdown', e => { m.out = e.target === w; });
  w.addEventListener('click', e => { if ((e.target === w && m.out) || e.target.closest('[data-x]')) m.close(); });
  return m;
}
function confirmBox(title, text, ok = 'OK', danger) {
  return new Promise(res => {
    const m = modal(title, `<p>${esc(text)}</p><div class="row end"><button class="btn ghost" data-x>Cancelar</button><button class="btn${danger ? ' danger' : ''}" data-ok>${esc(ok)}</button></div>`, 'small');
    let v = false;
    $('[data-ok]', m.el).onclick = () => { v = true; m.close(); };
    m.onClose = () => res(v);
  });
}
function promptBox(title, value = '', hint = '') {
  return new Promise(res => {
    const m = modal(title, `${hint ? `<p class="muted">${esc(hint)}</p>` : ''}<input class="inp" value="${esc(value)}"><div class="row end"><button class="btn ghost" data-x>Cancelar</button><button class="btn" data-ok>OK</button></div>`, 'small');
    const i = $('input', m.el);
    let v = null;
    const ok = () => { v = i.value; m.close(); };
    $('[data-ok]', m.el).onclick = ok;
    i.onkeydown = e => { if (e.key === 'Enter') ok(); };
    m.onClose = () => res(v);
    i.focus(); i.select();
  });
}
function pickFiles(accept, multiple) {
  return new Promise(res => {
    const i = $('#filepick');
    i.accept = accept || ''; i.multiple = !!multiple; i.value = '';
    i.onchange = () => res([...i.files]);
    i.click();
  });
}
/* Lê uma imagem e a reduz para caber na sincronização (lado maior até max px). */
function shrinkImage(file, max = 1280) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      res(cv.toDataURL('image/webp', .85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('imagem inválida')); };
    img.src = url;
  });
}
async function pickImage(max) {
  const [f] = await pickFiles('image/*');
  if (!f) return null;
  try { return await shrinkImage(f, max); } catch (e) { toast('Não consegui abrir essa imagem'); return null; }
}
/* Texto formatado vindo de backup ou sincronização: tira tudo que executa código. */
function clean(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html || '');
  t.content.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,svg').forEach(n => n.remove());
  t.content.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name); }));
  return t.innerHTML;
}
const safeUrl = u => { u = String(u || '').trim(); if (u && !/^[a-z]+:/i.test(u)) u = 'https://' + u; return /^https?:\/\//i.test(u) ? u : ''; };

/* ---------- Peças visuais usadas por vários widgets ---------- */
function confetti(el) {
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('i');
    s.style.cssText = `left:${rnd(100)}%;background:${pick(PAL)};animation-delay:${rnd(400)}ms;animation-duration:${900 + rnd(900)}ms`;
    box.append(s);
  }
  el.append(box);
  setTimeout(() => box.remove(), 2400);
}
/* Efeito de sorteio: troca o texto rapidamente e para no escolhido. */
function spin(c, o, items, final, done, n = 14) {
  if (c.rt.busy) return;
  c.rt.busy = true;
  let i = 0;
  const t = setInterval(() => {
    o.textContent = i < n ? pick(items) : final;
    Snd.tone(500 + i * 30, .03, 'square', .05);
    if (i++ >= n) { clearInterval(t); c.rt.busy = false; done(); }
  }, 70);
}
function clockSvg(h, m, s) {
  let nums = '', ticks = '';
  for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6; nums += `<text x="${50 + 37 * Math.sin(a)}" y="${53.2 - 37 * Math.cos(a)}" text-anchor="middle" font-size="9" font-weight="700">${i}</text>`; }
  for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30, r1 = i % 5 ? 46 : 44.5; ticks += `<line x1="${50 + r1 * Math.sin(a)}" y1="${50 - r1 * Math.cos(a)}" x2="${50 + 47.5 * Math.sin(a)}" y2="${50 - 47.5 * Math.cos(a)}" stroke-width="${i % 5 ? .4 : 1}"/>`; }
  const hand = (deg, len, w, col) => `<line x1="50" y1="50" x2="${50 + len * Math.sin(deg * Math.PI / 180)}" y2="${50 - len * Math.cos(deg * Math.PI / 180)}" stroke-width="${w}" stroke="${col}" stroke-linecap="round"/>`;
  return `<svg class="clk" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48.5" fill="var(--card2)" stroke="currentColor" stroke-width="1.6"/><g stroke="currentColor">${ticks}</g><g fill="currentColor">${nums}</g>${hand((h % 12 + m / 60) * 30, 24, 3, 'currentColor')}${hand((m + (s || 0) / 60) * 6, 35, 2, 'currentColor')}${s == null ? '' : hand(s * 6, 38, .8, '#e5484d')}<circle cx="50" cy="50" r="2.2" fill="#e5484d"/></svg>`;
}
const ringSvg = () => '<svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" class="trk"/><circle cx="50" cy="50" r="45" class="arc" stroke-dasharray="283" transform="rotate(-90 50 50)"/></svg>';
/* Desenho à mão num canvas. tool = { color, size, erase, before() } */
function sketch(cv, tool, onEnd) {
  const x = cv.getContext('2d');
  let on = false, lx, ly;
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  const seg = (px, py) => {
    x.globalCompositeOperation = tool.erase ? 'destination-out' : 'source-over';
    x.strokeStyle = tool.color; x.lineWidth = tool.erase ? tool.size * 5 : tool.size; x.lineCap = x.lineJoin = 'round';
    x.beginPath(); x.moveTo(lx, ly); x.lineTo(px + .01, py + .01); x.stroke();
    lx = px; ly = py;
  };
  cv.style.touchAction = 'none';
  cv.onpointerdown = e => { on = true; cv.setPointerCapture(e.pointerId); [lx, ly] = pos(e); if (tool.before) tool.before(); seg(lx, ly); };
  cv.onpointermove = e => { if (on) { const [px, py] = pos(e); seg(px, py); } };
  cv.onpointerup = cv.onpointercancel = () => { if (on) { on = false; if (onEnd) onEnd(); } };
}

/* ---------- Tela atual e gravação ---------- */
const cur = () => S.screens.find(s => s.id === S.set.cur) || S.screens[0];
const curList = () => S.lists.find(l => l.id === S.set.list) || S.lists[0];
const curNames = () => { const l = curList(); return l ? lines(l.names) : []; };
const Dirty = {
  ids: new Set(), t: 0,
  mark(s) { if (!s) return; this.ids.add(s.id); clearTimeout(this.t); this.t = setTimeout(() => this.flush(), 500); },
  flush() { clearTimeout(this.t); this.ids.forEach(id => { const s = S.screens.find(x => x.id === id); if (s) { s.updated = Date.now(); DB.put('screens', s); } }); this.ids.clear(); },
};
const touchScreen = () => Dirty.mark(cur());
addEventListener('pagehide', () => Dirty.flush());

const BGS = [
  'linear-gradient(135deg,#1f6f5c,#124a3d)', 'linear-gradient(135deg,#2b5876,#4e4376)', 'linear-gradient(135deg,#0f2027,#203a43 50%,#2c5364)',
  'linear-gradient(135deg,#ff9a8b,#ff6a88 55%,#ff99ac)', 'linear-gradient(135deg,#f6d365,#fda085)', 'linear-gradient(135deg,#84fab0,#8fd3f4)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)', 'linear-gradient(180deg,#89f7fe,#66a6ff)', 'linear-gradient(135deg,#fddb92,#d1fdff)',
  '#f4f1ea', '#ffffff', '#1c2024', '#0b3d2e', '#5b47d6', '#c2410c',
  'radial-gradient(#c9c9d6 1.5px,transparent 1.5px) 0 0/24px 24px #f7f7fb',
  'linear-gradient(#d6e3f3 1px,transparent 1px) 0 0/100% 32px #fffef8',
  'linear-gradient(#cfd8e6 1px,transparent 1px) 0 0/28px 28px,linear-gradient(90deg,#cfd8e6 1px,transparent 1px) 0 0/28px 28px #fff',
];
const bgCss = bg => !bg ? BGS[0] : bg.startsWith('img:') ? `center/cover no-repeat url("${bg.slice(4).replace(/["\\\n]/g, '')}") #1c2024` : bg;

/* ---------- Janelas ---------- */
const RT = new Map(); // id do widget → { el, body, wi, timers, ends, edit, rt, acts }
let topZ = 1;
const kill = r => { r.timers.forEach(clearInterval); r.ends.forEach(f => { try { f(); } catch (e) { console.error(e); } }); r.timers = []; r.ends = []; };
/* A janela pode ainda não ter tamanho quando o app abre em segundo plano. */
const VW = () => innerWidth > 200 ? innerWidth : 1280, VH = () => innerHeight > 200 ? innerHeight : 720;
const fit = wi => {
  const vw = VW(), vh = VH(), w = Math.min(wi.w, vw - 8), h = Math.min(wi.h, vh - 8);
  return { x: clamp(wi.x, 0, Math.max(0, vw - w)), y: clamp(wi.y, 0, Math.max(0, vh - h)), w, h };
};
const place = (el, wi) => { const f = fit(wi); el.style.cssText = `left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px;z-index:${wi.z}`; };

const Stage = {
  el: null,
  clear() { RT.forEach(kill); RT.clear(); Stage.el.innerHTML = ''; },
  render() {
    Stage.clear();
    const s = cur();
    if (!s) return;
    Stage.el.style.background = bgCss(s.bg);
    [...s.widgets].sort((a, b) => a.z - b.z).forEach((w, i) => { w.z = i + 1; });
    topZ = s.widgets.length + 1;
    s.widgets.forEach(Stage.mount);
  },
  make(t, x, y, w, h, over) {
    const def = W.defs[t];
    return { id: uid(), t, x, y, w: w || def.w, h: h || def.h, z: ++topZ, d: Object.assign(def.init ? def.init() : {}, over) };
  },
  add(t, over, from) {
    const def = W.defs[t], s = cur();
    if (!def || !s) return;
    const n = s.widgets.length % 8, w = Math.min(from ? from.w : def.w, VW() - 16), h = Math.min(from ? from.h : def.h, VH() - 130);
    const wi = Stage.make(t, from ? from.x + 28 : Math.max(8, (VW() - w) / 2 - 90 + n * 28), from ? from.y + 28 : Math.max(56, (VH() - h) / 2 - 90 + n * 22), w, h, over);
    s.widgets.push(wi);
    touchScreen();
    Stage.mount(wi);
    Stage.activate(wi);
    return wi;
  },
  remove(wi) {
    const s = cur(), r = RT.get(wi.id);
    if (r) { kill(r); r.el.remove(); RT.delete(wi.id); }
    s.widgets = s.widgets.filter(x => x !== wi);
    touchScreen();
    toast(`${W.defs[wi.t].name} fechado`, { label: 'Desfazer', fn: () => { if (cur() !== s) return; s.widgets.push(wi); touchScreen(); Stage.mount(wi); } });
  },
  activate(wi) {
    const r = RT.get(wi.id);
    $$('.win.active', Stage.el).forEach(e => e !== (r && r.el) && e.classList.remove('active'));
    if (!r) return;
    r.el.classList.add('active');
    if (wi.z !== topZ) { wi.z = ++topZ; r.el.style.zIndex = wi.z; touchScreen(); }
  },
  mount(wi) {
    const def = W.defs[wi.t];
    if (!def) return; // widget de uma versão mais nova: fica guardado, só não aparece
    const el = document.createElement('div');
    el.className = 'win' + (def.bare ? ' bare' : '');
    el.innerHTML = `<div class="whead"><span class="wico">${def.icon}</span><span class="wname">${esc(def.name)}</span>${def.fields || def.edit ? `<button class="wb" data-w="edit" title="Configurar">${ic('gear')}</button>` : ''}<button class="wb" data-w="dup" title="Duplicar">${ic('copy')}</button><button class="wb" data-w="close" title="Fechar">${ic('x')}</button></div><div class="wbody"></div><div class="wres" title="Redimensionar"></div>`;
    place(el, wi);
    Stage.el.append(el);
    const r = { el, body: $('.wbody', el), wi, timers: [], ends: [], edit: false, rt: {}, acts: null };
    RT.set(wi.id, r);

    el.addEventListener('pointerdown', () => Stage.activate(wi), true);
    const drag = (handle, resize) => handle.addEventListener('pointerdown', e => {
      if (S.set.lock || e.button > 0 || e.target.closest('.wb,button,input,textarea,select,[contenteditable],canvas,a')) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop, ow = el.offsetWidth, oh = el.offsetHeight;
      el.classList.add('moving');
      const mv = ev => {
        if (resize) { wi.w = clamp(ow + ev.clientX - sx, 130, innerWidth); wi.h = clamp(oh + ev.clientY - sy, 80, innerHeight); wi.x = ox; wi.y = oy; el.style.width = wi.w + 'px'; el.style.height = wi.h + 'px'; }
        else { wi.x = clamp(ox + ev.clientX - sx, 60 - ow, innerWidth - 60); wi.y = clamp(oy + ev.clientY - sy, 0, innerHeight - 36); el.style.left = wi.x + 'px'; el.style.top = wi.y + 'px'; }
      };
      const end = () => {
        handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', end); handle.removeEventListener('pointercancel', end);
        el.classList.remove('moving');
        touchScreen();
        if (resize && def.rz && !r.edit) Stage.draw(wi);
      };
      handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    });
    drag($('.whead', el));
    drag($('.wres', el), true);
    if (def.dragBody) drag(r.body);

    $('.whead', el).addEventListener('click', e => {
      const b = e.target.closest('.wb');
      if (!b) return;
      if (b.dataset.w === 'edit') { r.edit = !r.edit; Stage.draw(wi); }
      if (b.dataset.w === 'dup') Stage.add(wi.t, JSON.parse(JSON.stringify(wi.d)), wi);
      if (b.dataset.w === 'close' && !S.set.lock) Stage.remove(wi);
    });
    r.body.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (b && r.acts && r.acts[b.dataset.a]) r.acts[b.dataset.a](b, e);
    });
    const onIn = e => {
      const t = e.target, k = t.dataset && t.dataset.f;
      if (!k) return;
      wi.d[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' || t.type === 'range' ? +t.value : t.value;
      touchScreen();
      if (e.type === 'change' && t.dataset.r != null) Stage.draw(wi);
    };
    r.body.addEventListener('input', onIn);
    r.body.addEventListener('change', onIn);
    Stage.draw(wi);
  },
  draw(wi) {
    const r = RT.get(wi.id), def = W.defs[wi.t];
    if (!r) return;
    kill(r);
    const c = {
      el: r.body, rt: r.rt, wi,
      save: touchScreen,
      redraw: () => Stage.draw(wi),
      up: () => { touchScreen(); Stage.draw(wi); },
      done: () => { r.edit = false; touchScreen(); Stage.draw(wi); },
      every: (ms, fn) => { const t = setInterval(fn, ms); r.timers.push(t); return t; },
      end: fn => r.ends.push(fn),
      names: () => { const n = lines(wi.d.names); return n.length ? n : curNames(); },
    };
    r.body.className = 'wbody' + (r.edit ? ' editing' : '');
    r.body.removeAttribute('style');
    try { r.acts = (r.edit ? (def.edit ? def.edit(r.body, wi.d, c) : renderFields(r.body, def, wi.d, c)) : def.render(r.body, wi.d, c)) || {}; }
    catch (e) { console.error(wi.t, e); r.body.innerHTML = '<div class="center muted">Não foi possível mostrar este widget.</div>'; r.acts = {}; }
  },
};
addEventListener('resize', debounce(() => RT.forEach(r => { place(r.el, r.wi); if (W.defs[r.wi.t].rz && !r.edit) Stage.draw(r.wi); }), 200));

/* Formulário da engrenagem: [chave, rótulo, tipo, opções] */
function renderFields(el, def, d, c) {
  el.innerHTML = `<div class="wform">${def.fields.map(([k, label, type, opt]) => {
    const v = d[k] ?? '';
    if (type === 'area') return `<label>${esc(label)}<textarea data-f="${k}" rows="${opt || 5}">${esc(v)}</textarea></label>`;
    if (type === 'check') return `<label class="chk"><input type="checkbox" data-f="${k}" ${v ? 'checked' : ''}> ${esc(label)}</label>`;
    if (type === 'sel') return `<label>${esc(label)}<select data-f="${k}">${opt.map(o => { const [val, txt] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(txt)}</option>`; }).join('')}</select></label>`;
    return `<label>${esc(label)}<input type="${type === 'num' ? 'number' : type || 'text'}" data-f="${k}" value="${esc(v)}"></label>`;
  }).join('')}<button class="btn" data-a="done">Pronto</button></div>`;
  return { done() { if (def.onEdit) def.onEdit(d); c.done(); } };
}

/* ---------- Código QR (modo byte, correção L, versões 1 a 10: até 271 bytes) ---------- */
const QR = (() => {
  // [bytes de dados por bloco, bytes de correção por bloco, blocos, blocos com 1 byte a mais]
  const VER = [null, [19, 7, 1, 0], [34, 10, 1, 0], [55, 15, 1, 0], [80, 20, 1, 0], [108, 26, 1, 0], [68, 18, 2, 0], [78, 20, 2, 0], [97, 24, 2, 0], [116, 30, 2, 0], [68, 18, 2, 2]];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
  function ecc(data, n) {
    let g = [1];
    for (let i = 0; i < n; i++) { const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); } g = ng; }
    const r = new Array(n).fill(0);
    for (const b of data) { const f = b ^ r.shift(); r.push(0); for (let j = 0; j < n; j++) r[j] ^= mul(g[j + 1], f); }
    return r;
  }
  const MASK = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => x * y % 2 + x * y % 3 === 0, (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
  function penalty(m) {
    const n = m.length;
    let p = 0, dark = 0;
    for (let k = 0; k < 2; k++) for (let a = 0; a < n; a++) {
      let s = '', run = 1;
      for (let b = 0; b < n; b++) {
        const v = k ? m[b][a] : m[a][b];
        s += v ? '1' : '0';
        if (b && v === (k ? m[b - 1][a] : m[a][b - 1])) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
      }
      for (const pat of ['10111010000', '00001011101']) for (let i = s.indexOf(pat); i >= 0; i = s.indexOf(pat, i + 1)) p += 40;
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (m[y][x]) dark++;
      if (x < n - 1 && y < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    }
    return p + Math.max(0, Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1) * 10;
  }
  /* Devolve a matriz (true = módulo escuro) ou null se o texto não couber. force = máscara fixa (para testes). */
  function encode(text, force) {
    const bytes = [...new TextEncoder().encode(String(text))];
    let v = 1;
    for (; v <= 10; v++) { const [dc, , b1, b2] = VER[v]; if (bytes.length + (v < 10 ? 2 : 3) <= dc * b1 + (dc + 1) * b2) break; }
    if (v > 10) return null;
    const [dc, ec, b1, b2] = VER[v], cap = dc * b1 + (dc + 1) * b2, bits = [];
    const put = (val, k) => { for (let i = k - 1; i >= 0; i--) bits.push(val >> i & 1); };
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, cap * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const cw = [];
    for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let i = 0; cw.length < cap; i++) cw.push(i % 2 ? 0x11 : 0xec);
    const blocks = [], eccs = [], out = [];
    for (let i = 0, p = 0; i < b1 + b2; i++) { const k = dc + (i >= b1 ? 1 : 0), blk = cw.slice(p, p + k); p += k; blocks.push(blk); eccs.push(ecc(blk, ec)); }
    for (let i = 0; i <= dc; i++) for (const b of blocks) if (i < b.length) out.push(b[i]);
    for (let i = 0; i < ec; i++) for (const e of eccs) out.push(e[i]);

    const n = 17 + 4 * v, m = Array.from({ length: n }, () => new Array(n).fill(false)), fn = Array.from({ length: n }, () => new Array(n).fill(false));
    const set = (x, y, val) => { m[y][x] = val; fn[y][x] = true; };
    const finder = (fx, fy) => {
      for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
        const x = fx + dx, y = fy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        set(x, y, inside && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)));
      }
    };
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    for (const ay of ALIGN[v]) for (const ax of ALIGN[v]) {
      if (fn[ay][ax]) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    for (let i = 8; i < n - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
    const format = mask => {
      const data = 1 << 3 | mask;
      let rem = data;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const b = (data << 10 | rem) ^ 0x5412, bit = i => (b >>> i & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, n - 15 + i, bit(i));
      set(8, n - 8, true);
    };
    format(0);
    if (v >= 7) {
      let rem = v;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const b = v << 12 | rem;
      for (let i = 0; i < 18; i++) { const bit = (b >>> i & 1) === 1, a = n - 11 + i % 3, k = Math.floor(i / 3); set(a, k, bit); set(k, a, bit); }
    }
    let i = 0;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, y = ((right + 1) & 2) === 0 ? n - 1 - vert : vert;
        if (!fn[y][x] && i < out.length * 8) { m[y][x] = (out[i >>> 3] >>> (7 - (i & 7)) & 1) === 1; i++; }
      }
    }
    const apply = k => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fn[y][x] && MASK[k](x, y)) m[y][x] = !m[y][x]; };
    let best = force ?? 0, low = Infinity;
    if (force == null) for (let k = 0; k < 8; k++) { apply(k); format(k); const p = penalty(m); if (p < low) { low = p; best = k; } apply(k); }
    apply(best); format(best);
    return m;
  }
  function svg(text) {
    const m = encode(text);
    if (!m) return null;
    const n = m.length;
    let p = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) p += `M${x + 4} ${y + 4}h1v1h-1z`;
    return `<svg class="qr" viewBox="0 0 ${n + 8} ${n + 8}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${p}" fill="#000"/></svg>`;
  }
  return { encode, svg };
})();
