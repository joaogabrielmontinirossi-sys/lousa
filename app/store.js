'use strict';
/* Lousa — utilitários, ícones, sons e armazenamento local (IndexedDB) */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const lines = s => String(s ?? '').split('\n').map(x => x.trim()).filter(Boolean);
const pad = n => String(n).padStart(2, '0');
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/* Segundos como m:ss (ou h:mm:ss) */
const fmtT = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + pad(m) : m) + ':' + pad(s % 60); };
const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
function fmtRel(ts) {
  const diff = Date.now() - ts, min = 60000;
  if (diff < min) return 'agora';
  if (diff < 60 * min) return `há ${Math.floor(diff / min)} min`;
  if (dayKey(ts) === dayKey(Date.now())) return `há ${Math.floor(diff / (60 * min))} h`;
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const PAL = ['#e5484d', '#f76b15', '#ffc53d', '#46a758', '#12a594', '#0090ff', '#6e56cf', '#e93d82', '#8d8d8d', '#1c2024'];

const LOGO = '<svg viewBox="0 0 512 512"><rect width="512" height="512" rx="116" fill="#1f6f5c"/><rect x="92" y="120" width="328" height="230" rx="26" fill="#17574a" stroke="#fff" stroke-width="22"/><path d="M150 392h212" stroke="#ffd166" stroke-width="24" stroke-linecap="round"/><circle cx="200" cy="235" r="46" fill="none" stroke="#ffd166" stroke-width="18"/><path d="M200 208v29l19 13" fill="none" stroke="#ffd166" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="M286 205h82M286 245h82M286 285h50" stroke="#fff" stroke-width="16" stroke-linecap="round"/></svg>';

const IC = {
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  gear: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4',
  x: 'M6 6l12 12M18 6L6 18',
  dl: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  up: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  copy: 'M8 8h11v12H8zM5 16V4h10',
  img: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01',
  sync: 'M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 4v5h-5M4 20v-5h5',
  pen: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  lock: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
  unlock: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 5.6-1.5',
  full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6 6 0 0 1 3.5 5.5',
  screen: 'M3 5h18v12H3zM8 21h8M12 17v4',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z',
  snd: 'M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  mute: 'M4 10v4h4l5 4V6L8 10zM16 9l5 6M21 9l-5 6',
  down: 'M6 9l6 6 6-6',
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24"><path d="${IC[n] || ''}"/></svg>`;

/* Sons gerados na hora (sem arquivos de áudio) */
const Snd = {
  ctx: null,
  ac() { return this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)()); },
  tone(f = 880, dur = .2, type = 'sine', vol = .25, when = 0) {
    if (S.set.mute) return;
    try {
      const a = this.ac();
      if (a.state === 'suspended') a.resume();
      const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + when;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + .01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t); o.stop(t + dur + .05);
    } catch (e) { /* sem áudio neste aparelho */ }
  },
  click() { this.tone(1200, .04, 'square', .08); },
  alarm() { [0, .25, .5, .95, 1.2, 1.45].forEach((w, i) => this.tone(i % 3 === 2 ? 1320 : 1047, .2, 'square', .18, w)); },
  chime() { [784, 1047].forEach((f, i) => this.tone(f, .35, 'sine', .25, i * .18)); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .18, 'triangle', .25, i * .11)); },
  bad() { this.tone(160, .35, 'sawtooth', .18); },
};

const DB = (() => {
  const STORES = ['screens', 'lists', 'kv'];
  const SYNCED = ['screens', 'lists'];
  let db = null, mem = null, tomb = { id: 'tombstones', items: {} };
  const useMem = () => { mem = {}; STORES.forEach(s => mem[s] = new Map()); };
  const run = (store, mode, fn) => new Promise((res, rej) => {
    const t = db.transaction(store, mode), rq = fn(t.objectStore(store));
    t.oncomplete = () => res(rq && rq.result);
    t.onerror = t.onabort = () => rej(t.error);
  });
  return {
    STORES, SYNCED,
    onChange: () => {},
    tomb: () => tomb.items,
    setTomb: t => { tomb = t; },
    saveTomb: () => DB.put('kv', tomb),
    open: () => new Promise(res => {
      try {
        const rq = indexedDB.open('lousa', 1);
        rq.onupgradeneeded = () => STORES.forEach(s => rq.result.objectStoreNames.contains(s) || rq.result.createObjectStore(s, { keyPath: 'id' }));
        rq.onsuccess = () => { db = rq.result; res(); };
        rq.onerror = rq.onblocked = () => { useMem(); res(); };
      } catch (e) { useMem(); res(); }
    }),
    all: s => mem ? Promise.resolve([...mem[s].values()]) : run(s, 'readonly', o => o.getAll()),
    // raw = gravação vinda da sincronização: não carimba a data de modificação nem dispara novo envio
    put(s, v, raw) {
      if (!raw && SYNCED.includes(s)) { v.mod = Date.now(); DB.onChange(); }
      return mem ? Promise.resolve(mem[s].set(v.id, v)) : run(s, 'readwrite', o => o.put(v)).catch(e => { console.error(e); toast('Não foi possível salvar: armazenamento cheio?'); });
    },
    del(s, id, raw) {
      if (!raw && SYNCED.includes(s)) { tomb.items[s + ':' + id] = Date.now(); DB.saveTomb(); DB.onChange(); }
      return mem ? Promise.resolve(mem[s].delete(id)) : run(s, 'readwrite', o => o.delete(id));
    },
    clear: s => mem ? Promise.resolve(mem[s].clear()) : run(s, 'readwrite', o => o.clear()),
  };
})();

/* Estado em memória. Uma "tela" guarda o fundo e os widgets; uma "lista" é uma turma (nomes). */
const S = {
  screens: [],
  lists: [],
  set: { id: 'settings', cur: null, list: null, theme: 'light', mute: false, lock: false,
    favs: ['timer', 'clock', 'picker', 'groups', 'noise', 'light', 'work', 'text', 'draw', 'dice', 'poll', 'score', 'wheel', 'agenda'] },
};

/* Garante o formato do que vem de fora (sincronização, backup). */
function normScreen(s) {
  s.name = typeof s.name === 'string' && s.name ? s.name : 'Tela';
  s.bg = typeof s.bg === 'string' ? s.bg : '';
  s.widgets = (Array.isArray(s.widgets) ? s.widgets : []).filter(w => w && w.id && typeof w.t === 'string').map(w => {
    w.x = +w.x || 0; w.y = +w.y || 0; w.w = +w.w || 260; w.h = +w.h || 200; w.z = +w.z || 1;
    w.d = w.d && typeof w.d === 'object' ? w.d : {};
    return w;
  });
  s.created = +s.created || Date.now(); s.updated = +s.updated || s.created;
  return s;
}
function normList(l) {
  l.name = typeof l.name === 'string' && l.name ? l.name : 'Turma';
  l.names = typeof l.names === 'string' ? l.names : '';
  return l;
}

const Store = {
  async load() {
    await DB.open();
    S.screens = (await DB.all('screens')).map(normScreen);
    S.lists = (await DB.all('lists')).map(normList);
    const kv = await DB.all('kv');
    const st = kv.find(k => k.id === 'settings');
    if (st) Object.assign(S.set, st);
    const tb = kv.find(k => k.id === 'tombstones');
    if (tb) DB.setTomb(tb);
    return !st && !S.screens.length;
  },
  newScreen(name, bg) {
    const now = Date.now();
    const s = normScreen({ id: uid(), name, bg: bg || '', widgets: [], created: now, updated: now });
    S.screens.push(s);
    return s;
  },
  saveSet: () => DB.put('kv', S.set),
};
