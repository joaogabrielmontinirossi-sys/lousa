'use strict';
/* Lousa — widgets extras: tempo, sorteios e gestão da turma */

/* Contagem regressiva reaproveitada pelos widgets de tempo: d.left (s), d.end (ms) e d.run */
const leftOf = d => d.run ? Math.max(0, (d.end - Date.now()) / 1000) : d.left;
const startStop = (d, c) => { if (d.run) { d.left = leftOf(d); d.run = false; } else { d.end = Date.now() + d.left * 1000; d.run = true; Snd.click(); } c.up(); };

/* ---------- Tempo ---------- */
W.reg('pomodoro', { name: 'Pomodoro', cat: 'Tempo', icon: '🍅', w: 300, h: 300,
  init: () => ({ work: 25, rest: 5, phase: 'work', left: 1500, end: 0, run: false, n: 0 }),
  fields: [['work', 'Minutos de foco', 'num'], ['rest', 'Minutos de pausa', 'num']],
  onEdit(d) { d.run = false; d.phase = 'work'; d.left = (+d.work || 25) * 60; },
  render(el, d, c) {
    const total = () => (d.phase === 'work' ? +d.work || 25 : +d.rest || 5) * 60;
    el.innerHTML = `<div class="col fill"><div class="cen"><b style="color:${d.phase === 'work' ? '#e5484d' : '#46a758'}">${d.phase === 'work' ? '🍅 Foco' : '☕ Pausa'}</b> <span class="muted">· ${count(d.n, 'ciclo', 'ciclos')}</span></div><div class="ringbox grow${d.phase === 'work' ? ' red' : ''}">${ringSvg()}<div class="ringtxt mono" data-t></div></div><div class="row cen"><button class="btn" data-a="go">${d.run ? 'Pausar' : 'Iniciar'}</button><button class="btn ghost" data-a="skip">Pular</button><button class="btn ghost" data-a="reset">↺</button></div></div>`;
    const t = $('[data-t]', el), arc = $('.arc', el);
    const flip = () => { if (d.phase === 'work') d.n++; d.phase = d.phase === 'work' ? 'rest' : 'work'; d.left = total(); d.end = Date.now() + d.left * 1000; };
    const tick = () => { const l = leftOf(d); t.textContent = fmtT(Math.ceil(l)); arc.style.strokeDashoffset = 283 * (1 - l / total()); if (d.run && l <= 0) { Snd.alarm(); flip(); c.up(); } };
    tick(); c.every(250, tick);
    return { go() { startStop(d, c); }, skip() { flip(); c.up(); }, reset() { d.run = false; d.phase = 'work'; d.left = total(); d.n = 0; c.up(); } };
  } });

W.reg('hourglass', { name: 'Ampulheta', cat: 'Tempo', icon: '⏳', w: 240, h: 340,
  init: () => ({ min: 3, left: 180, end: 0, run: false }),
  fields: [['min', 'Minutos', 'num']],
  onEdit(d) { d.run = false; d.left = (+d.min || 1) * 60; },
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><svg class="hg grow" viewBox="0 0 100 100"><defs><clipPath id="ht${c.wi.id}"><path d="M22 10h56L50 50z"/></clipPath><clipPath id="hb${c.wi.id}"><path d="M50 50l28 40H22z"/></clipPath></defs><rect data-top clip-path="url(#ht${c.wi.id})" x="20" width="60" fill="#f5b83d"/><rect data-bot clip-path="url(#hb${c.wi.id})" x="20" width="60" fill="#f5b83d"/><path data-fall d="M50 50v40" stroke="#f5b83d" stroke-width="1.5"/><path d="M18 8h64M18 92h64M22 10l28 40 28-40M22 90l28-40 28 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="cen big mono" data-t style="font-size:12cqmin"></div><div class="row cen"><button class="btn" data-a="go">${d.run ? 'Pausar' : 'Virar'}</button><button class="btn ghost" data-a="reset">↺</button></div></div>`;
    const top = $('[data-top]', el), bot = $('[data-bot]', el), fall = $('[data-fall]', el), t = $('[data-t]', el), total = (+d.min || 1) * 60;
    const tick = () => {
      const l = leftOf(d), f = clamp(l / total, 0, 1);
      top.setAttribute('y', 10 + 40 * (1 - f)); top.setAttribute('height', 40 * f);
      bot.setAttribute('y', 90 - 40 * (1 - f)); bot.setAttribute('height', 40 * (1 - f));
      fall.style.display = d.run && f > 0 ? '' : 'none';
      t.textContent = fmtT(Math.ceil(l));
      if (d.run && l <= 0) { d.run = false; d.left = 0; Snd.alarm(); c.up(); }
    };
    tick(); c.every(200, tick);
    return { go() { if (d.left <= 0) d.left = total; startStop(d, c); }, reset() { d.run = false; d.left = total; c.up(); } };
  } });

W.reg('stations', { name: 'Rotação de estações', cat: 'Tempo', icon: '🔁', w: 340, h: 300,
  init: () => ({ steps: 'Leitura 10\nEscrita 10\nJogos 5\nRoda de conversa 5', i: 0, left: 600, end: 0, run: false }),
  fields: [['steps', 'Uma etapa por linha: nome e minutos', 'area', 6]],
  onEdit(d) { d.i = 0; d.run = false; d.left = -1; },
  render(el, d, c) {
    const st = lines(d.steps).map(l => { const m = /^(.*?)\s+(\d+(?:[.,]\d+)?)$/.exec(l); return m ? [m[1], parseFloat(m[2].replace(',', '.')) * 60] : [l, 300]; });
    if (!st.length) { el.innerHTML = '<div class="center muted">Adicione etapas na engrenagem.</div>'; return; }
    d.i = clamp(d.i, 0, st.length - 1);
    if (d.left < 0) d.left = st[d.i][1];
    el.innerHTML = `<div class="col fill"><div class="row wrap">${st.map((s, i) => `<span class="chip${i === d.i ? ' on' : ''}${i < d.i ? ' past' : ''}">${esc(s[0])}</span>`).join('')}</div><div class="center col grow"><div class="big" style="font-size:9cqmin">${esc(st[d.i][0])}</div><div class="big mono" data-t style="font-size:22cqmin"></div><div class="muted">${st[d.i + 1] ? 'Depois: ' + esc(st[d.i + 1][0]) : 'Última etapa'}</div></div><div class="row cen"><button class="btn" data-a="go">${d.run ? 'Pausar' : 'Iniciar'}</button><button class="btn ghost" data-a="next">Próxima</button><button class="btn ghost" data-a="reset">↺</button></div></div>`;
    const t = $('[data-t]', el);
    const go = k => { d.i = k; d.left = st[k][1]; d.end = Date.now() + d.left * 1000; };
    const tick = () => { const l = leftOf(d); t.textContent = fmtT(Math.ceil(l)); if (d.run && l <= 0) { Snd.alarm(); if (d.i < st.length - 1) go(d.i + 1); else { d.run = false; d.left = 0; } c.up(); } };
    tick(); c.every(250, tick);
    return { go() { if (d.left <= 0) go(0); startStop(d, c); }, next() { go((d.i + 1) % st.length); c.up(); }, reset() { d.run = false; go(0); c.up(); } };
  } });

W.reg('metronome', { name: 'Metrônomo', cat: 'Tempo', icon: '🎼', w: 280, h: 240,
  init: () => ({ bpm: 90, beats: 4 }),
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><div class="center col grow"><div class="row cen beats">${Array.from({ length: clamp(+d.beats || 4, 1, 8) }, () => '<i></i>').join('')}</div><div class="big mono" style="font-size:20cqmin"><span data-b>${d.bpm}</span> <small>bpm</small></div></div><input type="range" min="40" max="208" data-f="bpm" value="${d.bpm}"><div class="row cen"><button class="btn" data-a="go">Iniciar</button><select data-f="beats" data-r>${[2, 3, 4, 6].map(n => `<option ${+d.beats === n ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="muted">tempos</span></div></div>`;
    let t = 0, k = 0;
    const dots = $$('.beats i', el), stop = () => { clearTimeout(t); t = 0; };
    const beat = () => { dots.forEach((o, i) => o.classList.toggle('on', i === k)); Snd.tone(k ? 880 : 1320, .05, 'square', .2); k = (k + 1) % dots.length; t = setTimeout(beat, 60000 / clamp(+d.bpm || 90, 40, 208)); };
    $('[type=range]', el).oninput = e => { $('[data-b]', el).textContent = e.target.value; };
    c.end(stop);
    return { go(b) { if (t) { stop(); b.textContent = 'Iniciar'; } else { k = 0; beat(); b.textContent = 'Parar'; } } };
  } });

const CLIMA = ['☀️', '⛅', '☁️', '🌧️', '⛈️', '🌬️', '❄️'];
W.reg('today', { name: 'Hoje é', cat: 'Tempo', icon: '🌤️', w: 340, h: 280,
  init: () => ({ clima: 0, n: 1, msg: '' }),
  fields: [['msg', 'Recado do dia'], ['n', 'Dia letivo nº', 'num']],
  render(el, d, c) {
    const n = new Date();
    el.innerHTML = `<div class="col fill"><div class="center col grow"><div class="sub">Hoje é</div><div class="big cap" style="font-size:14cqmin">${n.toLocaleDateString('pt-BR', { weekday: 'long' })}</div><div class="sub">${n.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</div><div style="font-size:20cqmin;line-height:1.1">${CLIMA[d.clima] || CLIMA[0]}</div>${d.msg ? `<div class="q">${esc(d.msg)}</div>` : ''}</div>
<div class="row cen">${CLIMA.map((e, i) => `<button class="chip emo${i === d.clima ? ' on' : ''}" data-a="clima" data-i="${i}">${e}</button>`).join('')}</div><div class="row cen muted"><button class="chip" data-a="dia" data-v="-1">−</button>${d.n}º dia letivo<button class="chip" data-a="dia" data-v="1">+</button></div></div>`;
    return { clima(b) { d.clima = +b.dataset.i; c.up(); }, dia(b) { d.n = Math.max(1, (+d.n || 1) + +b.dataset.v); c.up(); } };
  } });

W.reg('exam', { name: 'Modo prova', cat: 'Tempo', icon: '📄', w: 380, h: 330,
  init: () => ({ title: 'Prova', mins: 50, start: 0, end: 0, left: 3000, run: false, rules: 'Silêncio\nCelulares guardados\nSó o material da prova na mesa' }),
  fields: [['title', 'Título'], ['mins', 'Duração em minutos', 'num'], ['rules', 'Combinados, um por linha', 'area', 4]],
  onEdit(d) { d.run = false; d.start = 0; d.left = (+d.mins || 50) * 60; },
  render(el, d, c) {
    const total = (+d.mins || 50) * 60;
    el.innerHTML = `<div class="col fill"><div class="row"><b class="q grow">${esc(d.title)}</b>${d.start ? `<span class="muted">${hm(new Date(d.start))} → ${hm(new Date(d.run ? d.end : Date.now() + d.left * 1000))}</span>` : ''}</div><div class="center grow"><div class="big mono" data-t style="font-size:24cqmin"></div></div><div class="prog"><i data-p></i></div><ul class="rules">${lines(d.rules).map(r => `<li>${esc(r)}</li>`).join('')}</ul><div class="row cen"><button class="btn" data-a="go">${d.run ? 'Pausar' : d.start ? 'Continuar' : 'Começar a prova'}</button><button class="btn ghost" data-a="plus">+5 min</button><button class="btn ghost" data-a="reset">↺</button></div></div>`;
    const t = $('[data-t]', el), p = $('[data-p]', el);
    const tick = () => {
      const l = leftOf(d);
      t.textContent = fmtT(Math.ceil(l)); p.style.width = clamp(100 - l / total * 100, 0, 100) + '%';
      el.classList.toggle('over', l <= 300 && d.start > 0);
      if (d.run) for (const w of [600, 300, 60]) if (l <= w && l > w - 1 && c.rt.warn !== w) { c.rt.warn = w; Snd.chime(); toast(`${d.title}: faltam ${w / 60} min`); }
      if (d.run && l <= 0) { d.run = false; d.left = 0; Snd.alarm(); c.up(); }
    };
    tick(); c.every(250, tick);
    return {
      go() { if (d.left <= 0) return; if (!d.start) d.start = Date.now(); startStop(d, c); },
      plus() { d.left = leftOf(d) + 300; if (d.run) d.end = Date.now() + d.left * 1000; c.up(); },
      reset() { d.run = false; d.start = 0; d.left = total; c.up(); },
    };
  } });

/* ---------- Sorteios ---------- */
W.reg('wheel', { name: 'Roleta', cat: 'Sorteios', icon: '🎡', w: 360, h: 420,
  init: () => ({ items: 'Leitura\nDesenho\nMúsica\nJogo\nHistória\nDesafio', names: false, rot: 0, win: '', remove: false }),
  fields: [['items', 'Opções, uma por linha', 'area', 7], ['names', 'Usar os nomes da turma em vez das opções', 'check'], ['remove', 'Tirar o sorteado da roleta', 'check']],
  onEdit(d) { d.out = []; d.win = ''; },
  render(el, d, c) {
    const all = d.names ? curNames() : lines(d.items), it = all.filter(x => !(d.out || []).includes(x)), n = it.length, a = 360 / (n || 1);
    const pt = (deg, r) => `${50 + r * Math.sin(deg * Math.PI / 180)} ${50 - r * Math.cos(deg * Math.PI / 180)}`;
    const wedges = n === 1 ? `<circle cx="50" cy="50" r="48" fill="${PAL[5]}"/><text x="50" y="30" text-anchor="middle" font-size="6" fill="#fff">${esc(it[0])}</text>`
      : it.map((t, i) => `<path d="M50 50L${pt(i * a, 48)}A48 48 0 ${a > 180 ? 1 : 0} 1 ${pt((i + 1) * a, 48)}Z" fill="${PAL[i % 8]}"/><text transform="rotate(${(i + .5) * a - 90} 50 50)" x="${n > 12 ? 82 : 78}" y="51.5" text-anchor="middle" font-size="${n > 16 ? 3 : n > 8 ? 4.2 : 5.5}" font-weight="700" fill="#fff">${esc(t.length > 14 ? t.slice(0, 13) + '…' : t)}</text>`).join('');
    el.innerHTML = `<div class="col fill"><div class="wheelbox grow"><svg viewBox="0 0 100 100"><g class="wheel" style="transform:rotate(${d.rot}deg)">${wedges}</g><circle cx="50" cy="50" r="5" fill="#fff" stroke="#1c2024" stroke-width="1"/><path d="M50 9l-4-9h8z" fill="#1c2024" stroke="#fff" stroke-width=".8"/></svg></div><div class="cen big" data-o style="font-size:8cqmin;min-height:1.2em">${esc(d.win)}</div><div class="row cen"><button class="btn" data-a="go">Girar</button>${(d.out || []).length ? '<button class="btn ghost" data-a="reset">Repor todos</button>' : ''}</div></div>`;
    return {
      go() {
        if (!n || c.rt.busy) return;
        c.rt.busy = true;
        const i = rnd(n);
        d.rot = Math.ceil(d.rot / 360) * 360 + 360 * 5 + (360 - (i + .15 + Math.random() * .7) * a);
        const g = $('.wheel', el);
        g.style.transition = 'transform 4s cubic-bezier(.12,.6,.1,1)';
        g.style.transform = `rotate(${d.rot}deg)`;
        setTimeout(() => { c.rt.busy = false; d.win = it[i]; if (d.remove) (d.out = d.out || []).push(it[i]); Snd.win(); c.up(); }, 4100);
      },
      reset() { d.out = []; c.up(); },
    };
  } });

W.reg('coin', { name: 'Cara ou coroa', cat: 'Sorteios', icon: '🪙', w: 240, h: 280,
  init: () => ({ v: 'Cara', cara: 0, coroa: 0 }),
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><div class="center grow"><div class="coin${c.rt.flip ? ' flip' : ''}">${d.v === 'Cara' ? '🙂' : '👑'}</div></div><div class="cen big" style="font-size:10cqmin">${d.v}</div><div class="muted cen">Cara ${d.cara} · Coroa ${d.coroa}</div><div class="row cen"><button class="btn" data-a="go">Lançar</button><button class="btn ghost sm" data-a="reset">Zerar</button></div></div>`;
    c.rt.flip = false;
    return { go() { d.v = rnd(2) ? 'Cara' : 'Coroa'; d[d.v.toLowerCase()]++; c.rt.flip = true; Snd.chime(); c.up(); }, reset() { d.cara = d.coroa = 0; c.up(); } };
  } });

W.reg('number', { name: 'Número aleatório', cat: 'Sorteios', icon: '🔢', w: 280, h: 260,
  init: () => ({ min: 1, max: 30, cur: '', noRep: false, used: [] }),
  fields: [['min', 'De', 'num'], ['max', 'Até', 'num'], ['noRep', 'Não repetir números', 'check']],
  onEdit(d) { d.used = []; d.cur = ''; },
  render(el, d, c) {
    const lo = Math.min(+d.min, +d.max) || 0, hi = Math.max(+d.min, +d.max) || 0, all = Array.from({ length: Math.min(hi - lo + 1, 5000) }, (_, i) => lo + i), pool = d.noRep ? all.filter(n => !d.used.includes(n)) : all;
    el.innerHTML = `<div class="col fill"><div class="center grow"><div class="big mono" data-o style="font-size:36cqmin">${d.cur === '' ? '?' : d.cur}</div></div><div class="muted cen">De ${lo} a ${hi}${d.noRep ? ` · restam ${pool.length}` : ''}</div><div class="row cen"><button class="btn" data-a="go">Sortear</button>${d.noRep ? '<button class="btn ghost" data-a="reset">Recomeçar</button>' : ''}</div></div>`;
    return {
      go() { if (!pool.length) return toast('Todos os números já saíram'); const v = pick(pool); spin(c, $('[data-o]', el), all, v, () => { d.cur = v; if (d.noRep) d.used.push(v); Snd.chime(); c.up(); }); },
      reset() { d.used = []; d.cur = ''; c.up(); },
    };
  } });

W.reg('letter', { name: 'Letra aleatória', cat: 'Sorteios', icon: '🔤', w: 260, h: 260,
  init: () => ({ kind: 'all', cur: '' }),
  fields: [['kind', 'Sortear', 'sel', [['all', 'Todas as letras'], ['vog', 'Só vogais'], ['con', 'Só consoantes']]]],
  render(el, d, c) {
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), pool = abc.filter(l => d.kind === 'all' || ('AEIOU'.includes(l) === (d.kind === 'vog')));
    el.innerHTML = `<div class="col fill"><div class="center grow"><div class="big" data-o style="font-size:44cqmin">${d.cur ? d.cur + '<small>' + d.cur.toLowerCase() + '</small>' : '?'}</div></div><div class="row cen"><button class="btn" data-a="go">Sortear letra</button></div></div>`;
    return { go() { const v = pick(pool); spin(c, $('[data-o]', el), pool, v, () => { d.cur = v; Snd.chime(); c.up(); }); } };
  } });

W.reg('order', { name: 'Ordem de apresentação', cat: 'Sorteios', icon: '🔀', w: 280, h: 360,
  init: () => ({ names: '', list: [], at: 0 }),
  fields: [NAMES_F],
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><ol class="olist grow scroll">${d.list.map((n, i) => `<li class="${i < d.at ? 'past' : i === d.at ? 'now' : ''}">${esc(n)}</li>`).join('') || '<div class="muted">Sorteie para definir a ordem.</div>'}</ol><div class="row cen"><button class="btn" data-a="go">Sortear ordem</button>${d.list.length ? '<button class="btn ghost" data-a="next">Próximo</button>' : ''}</div></div>`;
    return { go() { const n = c.names(); if (!n.length) return toast('Adicione nomes ou escolha uma turma'); d.list = shuffle(n); d.at = 0; Snd.win(); c.up(); }, next() { d.at = (d.at + 1) % (d.list.length + 1); c.up(); } };
  } });

const RPS = [['✊', 'Pedra'], ['✋', 'Papel'], ['✌️', 'Tesoura']];
W.reg('rps', { name: 'Pedra, papel, tesoura', cat: 'Sorteios', icon: '✌️', w: 320, h: 300,
  init: () => ({ me: -1, pc: -1, w: 0, l: 0 }),
  render(el, d, c) {
    const res = d.me < 0 ? 'Escolha a sua jogada' : d.me === d.pc ? 'Empate!' : (d.me - d.pc + 3) % 3 === 1 ? 'A turma venceu! 🎉' : 'A Lousa venceu!';
    el.innerHTML = `<div class="col fill"><div class="row grow cen"><div class="center col grow"><div style="font-size:30cqmin;line-height:1">${d.me < 0 ? '❔' : RPS[d.me][0]}</div><span class="muted">Turma ${d.w}</span></div><b>×</b><div class="center col grow"><div style="font-size:30cqmin;line-height:1">${d.pc < 0 ? '❔' : RPS[d.pc][0]}</div><span class="muted">Lousa ${d.l}</span></div></div><div class="cen big" style="font-size:7cqmin">${res}</div><div class="row cen">${RPS.map((r, i) => `<button class="btn ghost" data-a="go" data-i="${i}">${r[0]} ${r[1]}</button>`).join('')}</div></div>`;
    return { go(b) { d.me = +b.dataset.i; d.pc = rnd(3); const k = (d.me - d.pc + 3) % 3; if (k === 1) { d.w++; Snd.win(); } else if (k === 2) { d.l++; Snd.bad(); } else Snd.click(); c.up(); } };
  } });

W.reg('bingo', { name: 'Bingo', cat: 'Sorteios', icon: '🎱', w: 440, h: 380,
  init: () => ({ max: 75, out: [] }),
  fields: [['max', 'Maior número', 'sel', [30, 50, 60, 75, 90]]],
  onEdit(d) { d.out = []; },
  render(el, d, c) {
    const max = +d.max || 75, last = d.out[d.out.length - 1];
    el.innerHTML = `<div class="col fill"><div class="row"><div class="ball mono">${last || '–'}</div><div class="col grow"><span class="muted">${d.out.length} de ${max} sorteados</span><span>Anteriores: <b>${d.out.slice(-6, -1).reverse().join(' · ') || '—'}</b></span></div><button class="btn" data-a="go">Sortear</button><button class="btn ghost sm" data-a="reset">Novo jogo</button></div><div class="bgrid grow" style="--n:${max > 60 ? 15 : 10}">${Array.from({ length: max }, (_, i) => `<i class="${d.out.includes(i + 1) ? 'on' : ''}${last === i + 1 ? ' last' : ''}">${i + 1}</i>`).join('')}</div></div>`;
    return { go() { const pool = Array.from({ length: max }, (_, i) => i + 1).filter(n => !d.out.includes(n)); if (!pool.length) return toast('Todos os números já saíram'); d.out.push(pick(pool)); Snd.chime(); c.up(); }, reset() { d.out = []; c.up(); } };
  } });

W.reg('helpers', { name: 'Ajudantes do dia', cat: 'Sorteios', icon: '🧹', w: 320, h: 300,
  init: () => ({ jobs: 'Ajudante do dia\nLíder da fila\nDistribui o material\nApaga a lousa', names: '', off: 0 }),
  fields: [['jobs', 'Funções, uma por linha', 'area'], NAMES_F],
  render(el, d, c) {
    const jobs = lines(d.jobs), names = c.names();
    el.innerHTML = `<div class="col fill"><div class="col grow scroll tight">${jobs.map((j, i) => `<div class="jobrow"><span>${esc(j)}</span><b>${names.length ? esc(names[(d.off + i) % names.length]) : '—'}</b></div>`).join('')}</div><div class="row cen"><button class="btn" data-a="next">Rodízio</button><button class="btn ghost" data-a="rand">Sortear</button></div></div>`;
    return { next() { d.off = (d.off + jobs.length) % Math.max(1, names.length); c.up(); }, rand() { d.off = rnd(Math.max(1, names.length)); Snd.win(); c.up(); } };
  } });

/* ---------- Turma ---------- */
W.reg('attendance', { name: 'Chamada', cat: 'Turma', icon: '🙋', w: 420, h: 340,
  init: () => ({ names: '', abs: [] }),
  fields: [NAMES_F],
  render(el, d, c) {
    const names = c.names(), out = names.filter(n => d.abs.includes(n)).length;
    el.innerHTML = `<div class="col fill"><div class="row"><b class="grow">Presentes: ${names.length - out} · Faltas: ${out}</b><button class="btn ghost sm" data-a="reset">Todos presentes</button></div><div class="chips grow scroll">${names.map(n => `<button class="nchip${d.abs.includes(n) ? ' off' : ''}" data-a="tog">${esc(n)}</button>`).join('') || '<div class="muted">Adicione nomes na engrenagem ou escolha uma turma.</div>'}</div><div class="muted">Toque no nome de quem faltou.</div></div>`;
    return { tog(b) { const n = b.textContent; d.abs = d.abs.includes(n) ? d.abs.filter(x => x !== n) : [...d.abs, n]; c.up(); }, reset() { d.abs = []; c.up(); } };
  } });

W.reg('points', { name: 'Pontos por aluno', cat: 'Turma', icon: '🌟', w: 340, h: 380,
  init: () => ({ names: '', pts: {}, sort: false }),
  fields: [NAMES_F, ['sort', 'Ordenar por pontuação', 'check']],
  render(el, d, c) {
    let names = c.names();
    if (d.sort) names = [...names].sort((a, b) => (d.pts[b] || 0) - (d.pts[a] || 0));
    el.innerHTML = `<div class="col fill"><div class="col grow scroll tight">${names.map(n => `<div class="jobrow"><span class="grow">${esc(n)}</span><button class="chip" data-a="pt" data-n="${esc(n)}" data-v="-1">−</button><b class="mono pts">${d.pts[n] || 0}</b><button class="chip plus" data-a="pt" data-n="${esc(n)}" data-v="1">+</button></div>`).join('') || '<div class="muted">Adicione nomes na engrenagem ou escolha uma turma.</div>'}</div><div class="row"><span class="muted grow">Total da turma: ${names.reduce((s, n) => s + (d.pts[n] || 0), 0)}</span><button class="btn ghost sm" data-a="all">+1 para todos</button><button class="btn ghost sm" data-a="reset">Zerar</button></div></div>`;
    return {
      pt(b) { const n = b.dataset.n; d.pts[n] = (d.pts[n] || 0) + +b.dataset.v; +b.dataset.v > 0 ? Snd.chime() : Snd.click(); c.up(); },
      all() { names.forEach(n => { d.pts[n] = (d.pts[n] || 0) + 1; }); Snd.win(); c.up(); },
      reset() { d.pts = {}; c.up(); },
    };
  } });

const VOZ = [['0', 'Silêncio', '#6e56cf'], ['1', 'Sussurro', '#0090ff'], ['2', 'Voz de dupla', '#46a758'], ['3', 'Voz de apresentação', '#f76b15'], ['4', 'Voz de pátio', '#e5484d']];
W.reg('voice', { name: 'Nível de voz', cat: 'Turma', icon: '🗣️', w: 280, h: 340,
  init: () => ({ cur: 1 }),
  render(el, d, c) {
    el.innerHTML = `<div class="col fill tight">${VOZ.map(([n, t, col], i) => `<button class="vrow${i === d.cur ? ' on' : ''}" style="--c:${col}" data-a="set" data-i="${i}"><b>${n}</b><span>${t}</span></button>`).reverse().join('')}</div>`;
    return { set(b) { d.cur = +b.dataset.i; Snd.click(); c.up(); } };
  } });

W.reg('goal', { name: 'Meta da turma', cat: 'Turma', icon: '🫙', w: 280, h: 360,
  init: () => ({ name: 'Sessão de cinema', target: 20, n: 0 }),
  fields: [['name', 'Recompensa'], ['target', 'Estrelas para conquistar', 'num']],
  render(el, d, c) {
    const tg = Math.max(1, +d.target || 1), f = clamp(d.n / tg, 0, 1);
    el.innerHTML = `<div class="col fill"><div class="cen"><b class="q">${esc(d.name)}</b></div><div class="jar grow"><div class="jfill" style="height:${f * 100}%"></div><span>${'⭐'.repeat(Math.min(d.n, 40))}</span></div><div class="cen"><b>${d.n} de ${tg}</b>${d.n >= tg ? ' · Meta alcançada! 🎉' : ''}</div><div class="row cen"><button class="chip" data-a="pt" data-v="-1">−</button><button class="btn" data-a="pt" data-v="1">+ ⭐</button><button class="btn ghost sm" data-a="reset">Zerar</button></div></div>`;
    return { pt(b) { d.n = Math.max(0, d.n + +b.dataset.v); if (d.n === tg && +b.dataset.v > 0) { Snd.win(); c.up(); confetti(el); return; } Snd.click(); c.up(); }, reset() { d.n = 0; c.up(); } };
  } });

W.reg('pass', { name: 'Passe de saída', cat: 'Turma', icon: '🚪', w: 400, h: 340,
  init: () => ({ names: '', out: {}, max: 2 }),
  fields: [NAMES_F, ['max', 'Quantos podem sair ao mesmo tempo', 'num']],
  render(el, d, c) {
    const names = c.names(), outs = Object.keys(d.out);
    const draw = () => { $('[data-o]', el).innerHTML = outs.map(n => `<button class="nchip out" data-a="back" data-n="${esc(n)}">🚶 ${esc(n)} · ${fmtT((Date.now() - d.out[n]) / 1000)}</button>`).join('') || '<span class="muted">Ninguém fora da sala.</span>'; };
    el.innerHTML = `<div class="col fill"><div class="chips" data-o></div><hr><div class="chips grow scroll">${names.filter(n => !d.out[n]).map(n => `<button class="nchip" data-a="go">${esc(n)}</button>`).join('')}</div><div class="muted">Toque no nome para registrar a saída e de novo para a volta.</div></div>`;
    draw(); c.every(1000, draw);
    return {
      go(b) { if (outs.length >= (+d.max || 1)) return toast(`Só ${count(+d.max || 1, 'pessoa', 'pessoas')} por vez`); d.out[b.textContent] = Date.now(); c.up(); },
      back(b) { delete d.out[b.dataset.n]; c.up(); },
    };
  } });

W.reg('queue', { name: 'Fila de ajuda', cat: 'Turma', icon: '🆘', w: 400, h: 340,
  init: () => ({ names: '', q: [] }),
  fields: [NAMES_F],
  render(el, d, c) {
    const names = c.names();
    el.innerHTML = `<div class="row fill"><div class="col grow"><b>Preciso de ajuda</b><ol class="olist grow scroll">${d.q.map((n, i) => `<li class="${i ? '' : 'now'}">${esc(n)}</li>`).join('') || '<div class="muted">Fila vazia.</div>'}</ol><button class="btn" data-a="next">Atendido ✓</button></div><div class="chips grow scroll">${names.filter(n => !d.q.includes(n)).map(n => `<button class="nchip" data-a="add">${esc(n)}</button>`).join('')}</div></div>`;
    return { add(b) { d.q.push(b.textContent); Snd.click(); c.up(); }, next() { d.q.shift(); c.up(); } };
  } });

W.reg('counter', { name: 'Contador', cat: 'Turma', icon: '➕', w: 240, h: 240,
  init: () => ({ label: 'Contagem', n: 0 }),
  fields: [['label', 'O que está contando']],
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><div class="muted cen">${esc(d.label)}</div><div class="center grow"><div class="big mono" style="font-size:40cqmin">${d.n}</div></div><div class="row cen"><button class="btn ghost" data-a="pt" data-v="-1">−</button><button class="btn" data-a="pt" data-v="1">+1</button><button class="btn ghost sm" data-a="reset">Zerar</button></div></div>`;
    return { pt(b) { d.n += +b.dataset.v; Snd.click(); c.up(); }, reset() { d.n = 0; c.up(); } };
  } });

W.reg('agenda', { name: 'Agenda do dia', cat: 'Turma', icon: '📋', w: 320, h: 340,
  init: () => ({ items: '07:30 Acolhida\n07:50 Leitura\n08:40 Matemática\n09:30 Recreio\n09:50 Ciências\n11:00 Arte\n11:45 Saída' }),
  fields: [['items', 'Uma atividade por linha, começando pela hora', 'area', 9]],
  render(el, d, c) {
    const it = lines(d.items).map(l => { const m = /^(\d{1,2})[:h](\d{2})\s+(.*)$/.exec(l); return m ? { t: +m[1] * 60 + +m[2], h: pad(m[1]) + ':' + m[2], s: m[3] } : { t: null, h: '', s: l }; });
    const draw = () => {
      const n = new Date(), now = n.getHours() * 60 + n.getMinutes();
      let curI = -1;
      it.forEach((x, i) => { if (x.t != null && x.t <= now) curI = i; });
      el.innerHTML = `<div class="col fill scroll tight">${it.map((x, i) => `<div class="ag${i === curI ? ' now' : i < curI ? ' past' : ''}"><span class="mono">${x.h}</span><b>${esc(x.s)}</b>${i === curI ? '<i>agora</i>' : ''}</div>`).join('')}</div>`;
    };
    draw(); c.every(20000, draw);
  } });

W.reg('objective', { name: 'Objetivo da aula', cat: 'Turma', icon: '🎯', w: 380, h: 240,
  init: () => ({ obj: 'resolver problemas com frações', ok: 'explico meu raciocínio para um colega' }),
  fields: [['obj', 'Hoje vamos aprender a…', 'area', 3], ['ok', 'Eu consigo quando…', 'area', 3]],
  render(el, d) {
    el.innerHTML = `<div class="col fill scroll"><div class="objc" style="--c:#0090ff"><span>Hoje vamos aprender a…</span><b>${esc(d.obj)}</b></div><div class="objc" style="--c:#46a758"><span>Eu consigo quando…</span><b>${esc(d.ok)}</b></div></div>`;
  } });

W.reg('birthdays', { name: 'Aniversariantes', cat: 'Turma', icon: '🎂', w: 300, h: 300,
  init: () => ({ list: 'Ana 12/03\nBruno 25/10\nCarla 07/06' }),
  fields: [['list', 'Um por linha: nome e dia/mês', 'area', 8]],
  render(el, d) {
    const now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const it = lines(d.list).map(l => { const m = /^(.*?)\s+(\d{1,2})\/(\d{1,2})$/.exec(l); if (!m) return null; let dt = new Date(t0.getFullYear(), m[3] - 1, +m[2]); if (dt < t0) dt = new Date(t0.getFullYear() + 1, m[3] - 1, +m[2]); return { n: m[1], d: pad(m[2]) + '/' + pad(m[3]), in: Math.round((dt - t0) / 864e5) }; }).filter(Boolean).sort((a, b) => a.in - b.in);
    const today = it.filter(x => x.in === 0);
    el.innerHTML = `<div class="col fill">${today.length ? `<div class="cen"><div style="font-size:18cqmin;line-height:1.1">🎂</div><b class="q">Parabéns, ${today.map(x => esc(x.n)).join(' e ')}!</b></div>` : ''}<div class="col grow scroll tight">${it.filter(x => x.in > 0).map(x => `<div class="jobrow"><span>${esc(x.n)}</span><b>${x.d} · ${x.in === 1 ? 'amanhã' : 'em ' + x.in + ' dias'}</b></div>`).join('') || (today.length ? '' : '<div class="muted">Adicione os aniversários na engrenagem.</div>')}</div></div>`;
  } });

W.reg('marquee', { name: 'Letreiro', cat: 'Turma', icon: '📣', w: 520, h: 120,
  init: () => ({ text: 'Lembrete: entregar o trabalho na sexta-feira!', sec: 12, color: '#ffd166' }),
  fields: [['text', 'Recado'], ['sec', 'Segundos por volta', 'num'], ['color', 'Cor do texto', 'color']],
  render(el, d) {
    el.style.background = '#1c2024';
    el.innerHTML = `<div class="mq"><span style="color:${esc(d.color)};animation-duration:${clamp(+d.sec || 12, 3, 120)}s">${esc(d.text)}</span></div>`;
  } });

const MOOD = [['😄', 'Ótimo'], ['🙂', 'Bem'], ['😐', 'Mais ou menos'], ['😟', 'Preocupado'], ['😢', 'Triste'], ['😴', 'Cansado']];
W.reg('mood', { name: 'Como estou hoje', cat: 'Turma', icon: '😊', w: 420, h: 240,
  init: () => ({ v: [] }),
  render(el, d, c) {
    const total = MOOD.reduce((s, _, i) => s + (d.v[i] || 0), 0);
    el.innerHTML = `<div class="col fill"><b class="q cen">Como você está se sentindo hoje?</b><div class="row grow moods">${MOOD.map(([e, t], i) => `<button data-a="tap" data-i="${i}"><span>${e}</span><small>${t}</small><b>${d.v[i] || 0}</b></button>`).join('')}</div><div class="row"><span class="muted grow">${count(total, 'resposta', 'respostas')}</span><button class="btn ghost sm" data-a="reset">Zerar</button></div></div>`;
    return { tap(b) { const i = +b.dataset.i; d.v[i] = (d.v[i] || 0) + 1; Snd.click(); c.up(); }, reset() { d.v = []; c.up(); } };
  } });

const EXIT = [['🟢', 'Entendi e consigo explicar'], ['🟡', 'Entendi, mas tenho dúvidas'], ['🔴', 'Preciso de ajuda']];
W.reg('exit', { name: 'Bilhete de saída', cat: 'Turma', icon: '🎟️', w: 360, h: 290,
  init: () => ({ q: 'Como foi a aula de hoje para você?', v: [] }),
  fields: [['q', 'Pergunta']],
  render(el, d, c) {
    const total = EXIT.reduce((s, _, i) => s + (d.v[i] || 0), 0);
    el.innerHTML = `<div class="col fill"><b class="q">${esc(d.q)}</b><div class="col grow">${EXIT.map(([e, t], i) => { const v = d.v[i] || 0; return `<button class="pbar" data-a="tap" data-i="${i}" style="--p:${total ? v / total * 100 : 0}%;--c:${['#46a758', '#ffc53d', '#e5484d'][i]}"><span>${e} ${t}</span><b>${v}</b></button>`; }).join('')}</div><div class="row"><span class="muted grow">${total ? Math.round((d.v[0] || 0) / total * 100) + '% da turma entendeu bem' : 'Cada aluno toca na sua resposta ao sair'}</span><button class="btn ghost sm" data-a="reset">Zerar</button></div></div>`;
    return { tap(b) { const i = +b.dataset.i; d.v[i] = (d.v[i] || 0) + 1; Snd.click(); c.up(); }, reset() { d.v = []; c.up(); } };
  } });

W.reg('breathe', { name: 'Respiração guiada', cat: 'Turma', icon: '🫧', w: 300, h: 320,
  init: () => ({ a: 4, b: 4, c: 6 }),
  fields: [['a', 'Inspirar (segundos)', 'num'], ['b', 'Segurar (segundos)', 'num'], ['c', 'Soltar (segundos)', 'num']],
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><div class="center grow"><div class="bubble"><span data-t>Respire</span></div></div><div class="muted cen" data-n></div><div class="row cen"><button class="btn" data-a="go">${c.rt.t0 ? 'Parar' : 'Começar'}</button></div></div>`;
    const ph = [['Inspire', +d.a || 4], ['Segure', +d.b || 0], ['Solte', +d.c || 6]], cyc = ph.reduce((s, p) => s + p[1], 0), bub = $('.bubble', el), t = $('[data-t]', el);
    const tick = () => {
      if (!c.rt.t0) { bub.style.transform = 'scale(.6)'; return; }
      const el2 = (Date.now() - c.rt.t0) / 1000;
      let x = el2 % cyc, i = 0;
      while (x >= ph[i][1]) { x -= ph[i][1]; i++; }
      const f = x / ph[i][1];
      bub.style.transform = `scale(${i === 0 ? .6 + .4 * f : i === 1 ? 1 : 1 - .4 * f})`;
      t.textContent = `${ph[i][0]} ${Math.ceil(ph[i][1] - x)}`;
      $('[data-n]', el).textContent = count(Math.floor(el2 / cyc), 'respiração completa', 'respirações completas');
    };
    tick(); c.every(100, tick);
    return { go() { c.rt.t0 = c.rt.t0 ? 0 : Date.now(); c.redraw(); } };
  } });

W.reg('brain', { name: 'Pausa ativa', cat: 'Turma', icon: '🤸', w: 340, h: 280,
  init: () => ({ items: '10 polichinelos\nAlongue os braços bem para o alto\nCorrida parada por 20 segundos\nEquilibre-se em um pé só\nDance como um robô\nToque os pés sem dobrar os joelhos\nGire os ombros para trás 10 vezes\nRespire fundo 5 vezes\nEstátua! Ninguém se mexe\nImite um animal em silêncio', sec: 30, cur: '', left: 0, end: 0, run: false }),
  fields: [['items', 'Atividades, uma por linha', 'area', 8], ['sec', 'Segundos por atividade', 'num']],
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><div class="center col grow"><div class="big" data-o style="font-size:10cqmin">${esc(d.cur || 'Hora de se mexer!')}</div><div class="big mono" data-t style="font-size:18cqmin"></div></div><div class="row cen"><button class="btn" data-a="go">Sortear atividade</button></div></div>`;
    const t = $('[data-t]', el);
    const tick = () => { const l = leftOf(d); t.textContent = d.run ? Math.ceil(l) : ''; if (d.run && l <= 0) { d.run = false; d.left = 0; Snd.alarm(); c.up(); } };
    tick(); c.every(250, tick);
    return { go() { const it = lines(d.items); if (!it.length) return; const v = pick(it); spin(c, $('[data-o]', el), it, v, () => { d.cur = v; d.left = +d.sec || 30; d.end = Date.now() + d.left * 1000; d.run = true; c.up(); }); } };
  } });
