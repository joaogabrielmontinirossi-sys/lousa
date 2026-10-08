'use strict';
/* Lousa — widgets extras: matemática, linguagem, jogos e música */

/* ---------- Matemática ---------- */
W.reg('calc', { name: 'Calculadora', cat: 'Matemática', icon: '🧮', w: 280, h: 380,
  init: () => ({ e: '' }),
  render(el, d, c) {
    const K = ['C', '(', ')', '⌫', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', ',', '=', '+'];
    el.innerHTML = `<div class="col fill"><div class="cdisp mono">${esc(d.e) || '0'}</div><div class="ckeys grow">${K.map(k => `<button data-a="k" class="${/[0-9,]/.test(k) ? '' : k === '=' ? 'eq' : 'op'}">${k}</button>`).join('')}</div></div>`;
    return { k(b) {
      const k = b.textContent;
      if (k === 'C') d.e = '';
      else if (k === '⌫') d.e = d.e.slice(0, -1);
      else if (k === '=') {
        const x = d.e.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '.');
        try { if (!/^[\d+\-*/(). ]+$/.test(x)) throw 0; const v = Function('"use strict";return (' + x + ')')(); d.e = isFinite(v) ? String(Math.round(v * 1e10) / 1e10).replace('.', ',') : 'Erro'; } catch (e) { d.e = 'Erro'; }
      } else d.e = (d.e === 'Erro' ? '' : d.e) + k;
      Snd.click(); c.up();
    } };
  } });

W.reg('numline', { name: 'Reta numérica', cat: 'Matemática', icon: '📏', w: 620, h: 190,
  init: () => ({ min: 0, max: 20, step: 1, marks: [] }),
  fields: [['min', 'Começa em', 'num'], ['max', 'Termina em', 'num'], ['step', 'De quanto em quanto', 'num']],
  onEdit(d) { d.marks = []; },
  render(el, d, c) {
    const st = Math.abs(+d.step) || 1, lo = +d.min || 0, n = Math.round((+d.max - lo) / st);
    if (!(n > 0 && n <= 60)) { el.innerHTML = '<div class="center muted">Ajuste o intervalo na engrenagem (até 60 marcas).</div>'; return; }
    const X = i => 40 + i * 920 / n, val = i => Math.round((lo + i * st) * 1000) / 1000, m = [...d.marks].sort((a, b) => a - b);
    let s = '';
    for (let k = 0; k < m.length - 1; k++) { const a = X(m[k]), b = X(m[k + 1]); s += `<path d="M${a} 96Q${(a + b) / 2} ${96 - Math.min(80, (b - a) * .6)} ${b} 96" fill="none" stroke="#e5484d" stroke-width="3"/><text x="${(a + b) / 2}" y="${Math.max(16, 84 - Math.min(80, (b - a) * .6) / 2)}" text-anchor="middle" font-size="18" fill="#e5484d" font-weight="700">+${Math.round((val(m[k + 1]) - val(m[k])) * 1000) / 1000}</text>`; }
    for (let i = 0; i <= n; i++) s += `<g data-a="tog" data-i="${i}" class="nl${d.marks.includes(i) ? ' on' : ''}"><rect x="${X(i) - 460 / n}" y="60" width="${920 / n}" height="90" fill="transparent"/><line x1="${X(i)}" y1="88" x2="${X(i)}" y2="112" stroke="currentColor" stroke-width="2.5"/><circle cx="${X(i)}" cy="100" r="9"/><text x="${X(i)}" y="140" text-anchor="middle" font-size="${n > 30 ? 13 : 20}" fill="currentColor">${String(val(i)).replace('.', ',')}</text></g>`;
    el.innerHTML = `<div class="col fill"><svg class="grow" viewBox="0 0 1000 160" style="width:100%"><line x1="15" y1="100" x2="985" y2="100" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>${s}</svg><div class="row"><span class="muted grow">Toque nos números para marcar os saltos.</span><button class="btn ghost sm" data-a="clear">Limpar</button></div></div>`;
    return { tog(b) { const i = +b.dataset.i; d.marks = d.marks.includes(i) ? d.marks.filter(x => x !== i) : [...d.marks, i]; c.up(); }, clear() { d.marks = []; c.up(); } };
  } });

W.reg('fraction', { name: 'Frações', cat: 'Matemática', icon: '🍕', w: 320, h: 360,
  init: () => ({ num: 3, den: 4, shape: 'pizza' }),
  render(el, d, c) {
    const den = clamp(+d.den || 1, 1, 24), num = clamp(+d.num || 0, 0, den), a = 360 / den;
    const pt = deg => `${50 + 46 * Math.sin(deg * Math.PI / 180)} ${50 - 46 * Math.cos(deg * Math.PI / 180)}`;
    const pizza = den === 1 ? `<circle cx="50" cy="50" r="46" class="${num ? 'on' : ''}"/>` : Array.from({ length: den }, (_, i) => `<path class="${i < num ? 'on' : ''}" d="M50 50L${pt(i * a)}A46 46 0 0 1 ${pt((i + 1) * a)}Z"/>`).join('');
    const bar = Array.from({ length: den }, (_, i) => `<rect class="${i < num ? 'on' : ''}" x="${4 + i * 92 / den}" y="30" width="${92 / den}" height="40"/>`).join('');
    el.innerHTML = `<div class="col fill"><svg class="frac grow" viewBox="0 0 100 100">${d.shape === 'bar' ? bar : pizza}</svg><div class="row cen"><div class="fr"><b>${num}</b><b>${den}</b></div><span class="big" style="font-size:20px">= ${String(Math.round(num / den * 1000) / 1000).replace('.', ',')} = ${Math.round(num / den * 1000) / 10}%</span></div>
<div class="row cen wrap"><span class="muted">Partes pintadas</span><button class="chip" data-a="adj" data-k="num" data-v="-1">−</button><button class="chip" data-a="adj" data-k="num" data-v="1">+</button><span class="muted">Total de partes</span><button class="chip" data-a="adj" data-k="den" data-v="-1">−</button><button class="chip" data-a="adj" data-k="den" data-v="1">+</button><button class="chip" data-a="shape">${d.shape === 'bar' ? '🍕' : '▭'}</button></div></div>`;
    return { adj(b) { d[b.dataset.k] = (b.dataset.k === 'num' ? num : den) + +b.dataset.v; d.den = clamp(d.den, 1, 24); d.num = clamp(d.num, 0, d.den); c.up(); }, shape() { d.shape = d.shape === 'bar' ? 'pizza' : 'bar'; c.up(); } };
  } });

W.reg('tabuada', { name: 'Tabuada', cat: 'Matemática', icon: '✖️', w: 300, h: 420,
  init: () => ({ n: 7, hide: true, shown: [] }),
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><div class="row wrap cen">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="chip${n === d.n ? ' on' : ''}" data-a="n" data-n="${n}">${n}</button>`).join('')}</div><div class="tab grow">${Array.from({ length: 10 }, (_, i) => `<button data-a="show" data-i="${i + 1}"><span>${d.n} × ${i + 1} =</span><b>${!d.hide || d.shown.includes(i + 1) ? d.n * (i + 1) : '?'}</b></button>`).join('')}</div><div class="row cen"><label class="chk"><input type="checkbox" data-f="hide" data-r ${d.hide ? 'checked' : ''}> Esconder respostas</label><button class="btn ghost sm" data-a="reset">Esconder de novo</button></div></div>`;
    return { n(b) { d.n = +b.dataset.n; d.shown = []; c.up(); }, show(b) { const i = +b.dataset.i; if (!d.shown.includes(i)) { d.shown.push(i); Snd.click(); c.up(); } }, reset() { d.shown = []; c.up(); } };
  } });

W.reg('mental', { name: 'Cálculo mental', cat: 'Matemática', icon: '🧠', w: 320, h: 270,
  init: () => ({ ops: '+−', max: 20, q: '', a: 0, show: false, n: 0 }),
  fields: [['ops', 'Operações', 'sel', [['+−', 'Adição e subtração'], ['×÷', 'Multiplicação e divisão'], ['+−×÷', 'Todas']]], ['max', 'Maior número (em + e −)', 'num']],
  onEdit(d) { d.q = ''; d.n = 0; },
  render(el, d, c) {
    const next = () => {
      const op = pick([...d.ops]), mx = Math.max(2, +d.max || 20);
      let a = rnd(mx + 1), b = rnd(mx + 1);
      if (op === '−' && b > a) [a, b] = [b, a];
      if (op === '×') { a = 1 + rnd(10); b = 1 + rnd(10); }
      if (op === '÷') { b = 1 + rnd(10); a = b * (1 + rnd(10)); }
      d.q = `${a} ${op} ${b}`; d.a = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b; d.show = false;
    };
    if (!d.q) next();
    el.innerHTML = `<div class="col fill"><div class="muted cen">Desafio nº ${d.n + 1}</div><div class="center grow"><div class="big mono" style="font-size:17cqw">${d.q} = ${d.show ? `<span style="color:#46a758">${d.a}</span>` : '?'}</div></div><div class="row cen"><button class="btn ghost" data-a="show">Mostrar resposta</button><button class="btn" data-a="next">Próximo</button></div></div>`;
    return { show() { d.show = true; Snd.chime(); c.up(); }, next() { d.n++; next(); c.up(); } };
  } });

W.reg('hundred', { name: 'Quadro de cem', cat: 'Matemática', icon: '💯', w: 400, h: 460,
  init: () => ({ on: {}, k: 3 }),
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><div class="hgrid grow">${Array.from({ length: 100 }, (_, i) => `<button class="${d.on[i + 1] ? 'on' : ''}" data-a="tog">${i + 1}</button>`).join('')}</div><div class="row wrap cen"><button class="chip" data-a="set" data-m="2" data-r="0">Pares</button><button class="chip" data-a="set" data-m="2" data-r="1">Ímpares</button><button class="chip" data-a="mult">Múltiplos de</button><select data-f="k">${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option ${+d.k === n ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="chip" data-a="clear">Limpar</button></div></div>`;
    const fill = (m, r) => { d.on = {}; for (let i = 1; i <= 100; i++) if (i % m === r) d.on[i] = 1; c.up(); };
    return { tog(b) { const n = b.textContent; if (d.on[n]) delete d.on[n]; else d.on[n] = 1; c.up(); }, set(b) { fill(+b.dataset.m, +b.dataset.r); }, mult() { fill(+d.k || 2, 0); }, clear() { d.on = {}; c.up(); } };
  } });

W.reg('learnclock', { name: 'Relógio de aprender', cat: 'Matemática', icon: '🕰️', w: 300, h: 400,
  init: () => ({ h: 3, m: 30, show: true }),
  render(el, d, c) {
    const words = () => { const h = d.h % 12 || 12; return d.m === 0 ? `${h} hora${h > 1 ? 's' : ''} em ponto` : d.m === 30 ? `${h} e meia` : `${h} e ${d.m}`; };
    el.innerHTML = `<div class="col fill"><div class="center grow">${clockSvg(d.h, d.m, null)}</div><div class="cen big mono" style="font-size:26px">${d.show ? `${pad(d.h)}:${pad(d.m)} <small class="muted">${words()}</small>` : '?? : ??'}</div><div class="row cen wrap"><button class="chip" data-a="adj" data-v="-60">−1 h</button><button class="chip" data-a="adj" data-v="-5">−5 min</button><button class="chip" data-a="adj" data-v="5">+5 min</button><button class="chip" data-a="adj" data-v="60">+1 h</button></div><div class="row cen"><button class="btn" data-a="rand">Hora surpresa</button><button class="btn ghost" data-a="show">${d.show ? 'Esconder' : 'Mostrar'} resposta</button></div></div>`;
    return {
      adj(b) { const t = ((d.h * 60 + d.m + +b.dataset.v) % 1440 + 1440) % 1440; d.h = Math.floor(t / 60); d.m = t % 60; c.up(); },
      rand() { d.h = 1 + rnd(12); d.m = rnd(12) * 5; d.show = false; Snd.click(); c.up(); },
      show() { d.show = !d.show; c.up(); },
    };
  } });

const UNITS = { Comprimento: { mm: .001, cm: .01, m: 1, km: 1000 }, Massa: { mg: 1e-6, g: .001, kg: 1, t: 1000 }, Capacidade: { ml: .001, l: 1 }, Tempo: { s: 1, min: 60, h: 3600, dia: 86400, semana: 604800 } };
W.reg('convert', { name: 'Conversor de medidas', cat: 'Matemática', icon: '⚖️', w: 340, h: 230,
  init: () => ({ cat: 'Comprimento', v: 1, from: 'm', to: 'cm' }),
  render(el, d, c) {
    const u = UNITS[d.cat] || UNITS.Comprimento, ks = Object.keys(u);
    if (!u[d.from]) d.from = ks[0];
    if (!u[d.to]) d.to = ks[1] || ks[0];
    const opt = sel => ks.map(k => `<option ${k === sel ? 'selected' : ''}>${k}</option>`).join('');
    const res = () => { const r = (+d.v || 0) * u[d.from] / u[d.to]; return (Math.abs(r) >= 1e9 || (r && Math.abs(r) < 1e-6) ? r.toExponential(3) : String(Math.round(r * 1e6) / 1e6)).replace('.', ','); };
    el.innerHTML = `<div class="col fill"><select data-f="cat" data-r>${Object.keys(UNITS).map(k => `<option ${k === d.cat ? 'selected' : ''}>${k}</option>`).join('')}</select><div class="row"><input type="number" class="inp grow" data-f="v" value="${d.v}"><select data-f="from" data-r>${opt(d.from)}</select></div><div class="center grow"><div class="big mono" style="font-size:13cqw">= <span data-o>${res()}</span> ${d.to}</div></div><div class="row cen"><span class="muted">Converter para</span><select data-f="to" data-r>${opt(d.to)}</select></div></div>`;
    $('.inp', el).oninput = () => setTimeout(() => { $('[data-o]', el).textContent = res(); });
  } });

const REAIS = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 25, 10, 5];
const brl = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
W.reg('money', { name: 'Dinheiro', cat: 'Matemática', icon: '💵', w: 440, h: 380,
  init: () => ({ sel: [], goal: 0 }),
  render(el, d, c) {
    const total = d.sel.reduce((a, b) => a + b, 0), lab = v => v >= 100 ? 'R$ ' + v / 100 : v + '¢';
    el.innerHTML = `<div class="col fill"><div class="row"><b class="big mono grow" style="font-size:26px">${brl(total)}</b>${d.goal ? `<span class="${total === d.goal ? 'okc' : 'muted'}">Desafio: formar ${brl(d.goal)} ${total === d.goal ? '✓' : ''}</span>` : ''}</div><div class="mtable grow scroll">${d.sel.map((v, i) => `<button class="${v >= 200 ? 'note' : 'coinm'} v${v}" data-a="rem" data-i="${i}">${lab(v)}</button>`).join('') || '<span class="muted">Toque nas notas e moedas abaixo para colocar na mesa.</span>'}</div><div class="row wrap cen">${REAIS.map(v => `<button class="${v >= 200 ? 'note' : 'coinm'} v${v} sm" data-a="add" data-v="${v}">${lab(v)}</button>`).join('')}</div><div class="row cen"><button class="btn ghost sm" data-a="goal">Novo desafio</button><button class="btn ghost sm" data-a="clear">Limpar a mesa</button></div></div>`;
    return {
      add(b) { d.sel.push(+b.dataset.v); if (d.goal && total + +b.dataset.v === d.goal) Snd.win(); else Snd.click(); c.up(); },
      rem(b) { d.sel.splice(b.dataset.i, 1); c.up(); },
      goal() { d.goal = (1 + rnd(40)) * 25 + rnd(2) * 500; d.sel = []; c.up(); },
      clear() { d.sel = []; d.goal = 0; c.up(); },
    };
  } });

W.reg('chart', { name: 'Gráfico rápido', cat: 'Matemática', icon: '📈', w: 420, h: 320,
  init: () => ({ title: 'Fruta preferida da turma', data: 'Maçã 6\nBanana 9\nUva 4\nMorango 11', type: 'bar' }),
  fields: [['title', 'Título'], ['data', 'Uma linha por item: nome e valor', 'area', 6], ['type', 'Tipo', 'sel', [['bar', 'Barras'], ['pie', 'Pizza']]]],
  render(el, d) {
    const it = lines(d.data).map(l => { const m = /^(.*?)\s+(-?\d+(?:[.,]\d+)?)$/.exec(l); return m ? [m[1], Math.max(0, parseFloat(m[2].replace(',', '.')))] : null; }).filter(Boolean);
    const max = Math.max(1, ...it.map(x => x[1])), sum = it.reduce((s, x) => s + x[1], 0) || 1;
    let body;
    if (d.type === 'pie') {
      let a = 0;
      const pt = deg => `${50 + 46 * Math.sin(deg * Math.PI / 180)} ${50 - 46 * Math.cos(deg * Math.PI / 180)}`;
      const sl = it.map(([, v], i) => { const s = a, e = a += v / sum * 360; return e - s >= 359.99 ? `<circle cx="50" cy="50" r="46" fill="${PAL[i % 8]}"/>` : `<path d="M50 50L${pt(s)}A46 46 0 ${e - s > 180 ? 1 : 0} 1 ${pt(e)}Z" fill="${PAL[i % 8]}"/>`; }).join('');
      body = `<div class="row grow"><svg viewBox="0 0 100 100" class="grow" style="height:100%">${sl}</svg><div class="col tight">${it.map(([n, v], i) => `<span><i class="sw" style="background:${PAL[i % 8]}"></i>${esc(n)} · <b>${Math.round(v / sum * 100)}%</b></span>`).join('')}</div></div>`;
    } else body = `<div class="bars grow">${it.map(([n, v], i) => `<div><b>${String(v).replace('.', ',')}</b><i style="--v:${v / max};background:${PAL[i % 8]}"></i><span>${esc(n)}</span></div>`).join('')}</div>`;
    el.innerHTML = `<div class="col fill"><b class="q cen">${esc(d.title)}</b>${it.length ? body : '<div class="center muted grow">Adicione os dados na engrenagem.</div>'}</div>`;
  } });

/* ---------- Linguagem ---------- */
W.reg('word', { name: 'Palavra do dia', cat: 'Linguagem', icon: '📖', w: 340, h: 250,
  init: () => ({ word: 'Resiliência', cls: 'substantivo feminino', mean: 'Capacidade de se recuperar depois de uma dificuldade.', ex: 'Com resiliência, ela tentou de novo até conseguir.' }),
  fields: [['word', 'Palavra'], ['cls', 'Classe gramatical'], ['mean', 'Significado', 'area', 3], ['ex', 'Exemplo de uso', 'area', 2]],
  render(el, d) {
    el.innerHTML = `<div class="col fill scroll"><span class="muted">Palavra do dia</span><div class="big" style="font-size:clamp(22px,11cqw,64px)">${esc(d.word)}</div><i class="muted">${esc(d.cls)}</i><div>${esc(d.mean)}</div>${d.ex ? `<div class="objc" style="--c:#6e56cf"><b style="font-weight:500">“${esc(d.ex)}”</b></div>` : ''}</div>`;
  } });

W.reg('anagram', { name: 'Palavra embaralhada', cat: 'Linguagem', icon: '🔡', w: 380, h: 250,
  init: () => ({ words: 'ESCOLA\nCADERNO\nAMIGO\nPLANETA\nFLORESTA\nMÚSICA\nJANELA\nBRASIL', cur: '', scr: '', show: false }),
  fields: [['words', 'Palavras, uma por linha', 'area', 8]],
  onEdit(d) { d.cur = ''; },
  render(el, d, c) {
    const next = () => { const w = lines(d.words); if (!w.length) return; let v = pick(w).toUpperCase(); if (w.length > 1) while (v === d.cur) v = pick(w).toUpperCase(); d.cur = v; let s = v; for (let i = 0; i < 20 && s === v && v.length > 1; i++) s = shuffle([...v]).join(''); d.scr = s; d.show = false; };
    if (!d.cur) next();
    el.innerHTML = `<div class="col fill"><div class="center grow"><div class="tiles">${[...(d.show ? d.cur : d.scr)].map(l => `<i class="${d.show ? 'ok' : ''}">${esc(l)}</i>`).join('')}</div></div><div class="row cen"><button class="btn ghost" data-a="show">${d.show ? 'Esconder' : 'Mostrar a palavra'}</button><button class="btn" data-a="next">Próxima</button></div></div>`;
    return { show() { d.show = !d.show; if (d.show) Snd.chime(); c.up(); }, next() { next(); Snd.click(); c.up(); } };
  } });

W.reg('wordsearch', { name: 'Caça-palavras', cat: 'Linguagem', icon: '🔎', w: 520, h: 440,
  init: () => ({ words: 'ESCOLA\nLIVRO\nLÁPIS\nAMIGO\nRECREIO\nLOUSA\nCADERNO\nMOCHILA', size: 11, grid: [], pos: {}, mark: [], show: false }),
  fields: [['words', 'Palavras, uma por linha', 'area', 8], ['size', 'Tamanho da grade', 'sel', [8, 10, 11, 12, 14]]],
  onEdit(d) { d.grid = []; },
  render(el, d, c) {
    const N = +d.size || 11;
    const gen = () => {
      const g = Array.from({ length: N }, () => Array(N).fill(''));
      d.pos = {};
      for (const raw of lines(d.words)) {
        const w = norm(raw).toUpperCase().replace(/[^A-Z]/g, '');
        if (w.length < 2 || w.length > N) continue;
        for (let t = 0; t < 200; t++) {
          const [dr, dc] = pick([[0, 1], [1, 0], [1, 1], [-1, 1]]), r = rnd(N), k = rnd(N), cells = [];
          let ok = true;
          for (let i = 0; i < w.length && ok; i++) { const rr = r + dr * i, cc = k + dc * i; if (rr < 0 || rr >= N || cc >= N || (g[rr][cc] && g[rr][cc] !== w[i])) ok = false; else cells.push(rr * N + cc); }
          if (!ok) continue;
          cells.forEach((p, i) => { g[Math.floor(p / N)][p % N] = w[i]; });
          d.pos[w] = cells;
          break;
        }
      }
      d.grid = g.map(r => r.map(x => x || String.fromCharCode(65 + rnd(26))).join(''));
      d.mark = []; d.show = false;
    };
    if (d.grid.length !== N) gen();
    const ans = new Set(d.show ? Object.values(d.pos).flat() : []), found = w => d.pos[w].every(p => d.mark.includes(p));
    el.innerHTML = `<div class="row fill"><div class="wsg grow" style="--n:${N}">${d.grid.map((r, i) => [...r].map((l, j) => `<button class="${d.mark.includes(i * N + j) ? 'on' : ''}${ans.has(i * N + j) ? ' ans' : ''}" data-a="tog" data-p="${i * N + j}">${l}</button>`).join('')).join('')}</div><div class="col wsl"><div class="col grow scroll tight">${Object.keys(d.pos).map(w => `<span class="${found(w) ? 'found' : ''}">${w}</span>`).join('')}</div><button class="btn ghost sm" data-a="show">${d.show ? 'Esconder' : 'Respostas'}</button><button class="btn sm" data-a="new">Novo</button></div></div>`;
    return {
      tog(b) { const p = +b.dataset.p; d.mark = d.mark.includes(p) ? d.mark.filter(x => x !== p) : [...d.mark, p]; if (Object.keys(d.pos).some(w => d.pos[w].includes(p) && found(w))) Snd.chime(); c.up(); },
      show() { d.show = !d.show; c.up(); },
      new() { gen(); c.up(); },
    };
  } });

W.reg('tts', { name: 'Leitor em voz alta', cat: 'Linguagem', icon: '🗨️', w: 380, h: 280,
  init: () => ({ text: 'Era uma vez uma turma muito curiosa, que adorava aprender coisas novas.', rate: 1, hide: false }),
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><textarea class="inp grow${d.hide ? ' blur' : ''}" data-f="text" placeholder="Digite ou cole o texto">${esc(d.text)}</textarea><div class="row"><span class="muted">Devagar</span><input type="range" class="grow" min="0.5" max="1.5" step="0.1" data-f="rate" value="${d.rate}"><span class="muted">Rápido</span></div><div class="row cen"><button class="btn" data-a="go">▶ Ler</button><button class="btn ghost" data-a="stop">Parar</button><label class="chk"><input type="checkbox" data-f="hide" data-r ${d.hide ? 'checked' : ''}> Ditado (esconder o texto)</label></div></div>`;
    const stop = () => { try { speechSynthesis.cancel(); } catch (e) { /* sem voz */ } };
    c.end(stop);
    return { go() {
      if (!('speechSynthesis' in window)) return toast('Este aparelho não tem leitura em voz alta');
      stop();
      const u = new SpeechSynthesisUtterance(d.text);
      u.lang = 'pt-BR'; u.rate = +d.rate || 1;
      const v = speechSynthesis.getVoices().find(x => /^pt[-_]BR/i.test(x.lang)) || speechSynthesis.getVoices().find(x => /^pt/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    }, stop };
  } });

const STORY = ['🧒 👧 🧙 🦸 👩‍🚀 🤖 🐉 🦊 🐢 👑 🧜 🕵️', '🏫 🏰 🌋 🏝️ 🌌 🌳 🏜️ 🏙️ ⛰️ 🚀 🎪 🏠', '🗝️ 📦 🗺️ 🔦 🎈 📕 🪄 💎 🧲 ☂️ 🎸 🧪', '🏃 🛌 🎣 🍳 🚴 🧗 🏊 🎨 🔍 💃 🪁 ✈️', '☀️ 🌧️ ⛈️ ❄️ 🌪️ 🌈 🌙 🌫️ 🔥 🌊 ⭐ 🍂'].map(s => s.split(' '));
W.reg('story', { name: 'Dados de história', cat: 'Linguagem', icon: '📚', w: 460, h: 220,
  init: () => ({ v: STORY.map(s => pick(s)) }),
  render(el, d, c) {
    const L = ['Quem', 'Onde', 'Objeto', 'Ação', 'Clima'];
    el.innerHTML = `<div class="col fill"><div class="row grow sdice">${d.v.map((e, i) => `<div><span>${e}</span><small>${L[i]}</small></div>`).join('')}</div><div class="row cen"><span class="muted">Invente uma história usando os cinco dados.</span><button class="btn" data-a="go">Jogar</button></div></div>`;
    return { go() { if (c.rt.busy) return; c.rt.busy = true; let i = 0; const t = setInterval(() => { d.v = STORY.map(s => pick(s)); $$('.sdice span', el).forEach((o, k) => { o.textContent = d.v[k]; }); Snd.tone(300 + rnd(300), .03, 'square', .05); if (++i > 8) { clearInterval(t); c.rt.busy = false; c.save(); } }, 80); } };
  } });

W.reg('flash', { name: 'Flashcards', cat: 'Linguagem', icon: '🃏', w: 360, h: 280,
  init: () => ({ cards: 'Capital do Brasil | Brasília\nMaior planeta do Sistema Solar | Júpiter\n7 × 8 | 56\nAutor de Dom Casmurro | Machado de Assis', i: 0 }),
  fields: [['cards', 'Um cartão por linha: frente | verso', 'area', 8]],
  onEdit(d) { d.i = 0; },
  render(el, d, c) {
    const cards = lines(d.cards).map(l => l.split('|').map(x => x.trim()));
    if (!cards.length) { el.innerHTML = '<div class="center muted">Adicione cartões na engrenagem.</div>'; return; }
    d.i = clamp(d.i, 0, cards.length - 1);
    const [f, b] = cards[d.i], back = c.rt.flip;
    el.innerHTML = `<div class="col fill"><button class="fcard grow${back ? ' back' : ''}" data-a="flip"><small>${back ? 'Verso' : 'Frente'} · toque para virar</small><b>${esc(back ? b || '' : f)}</b></button><div class="row cen"><button class="btn ghost" data-a="nav" data-v="-1">‹</button><span class="muted">${d.i + 1} de ${cards.length}</span><button class="btn ghost" data-a="nav" data-v="1">›</button><button class="btn ghost sm" data-a="mix">Embaralhar</button></div></div>`;
    return {
      flip() { c.rt.flip = !back; Snd.click(); c.redraw(); },
      nav(b2) { d.i = (d.i + +b2.dataset.v + cards.length) % cards.length; c.rt.flip = false; c.up(); },
      mix() { d.cards = shuffle(lines(d.cards)).join('\n'); d.i = 0; c.rt.flip = false; c.up(); },
    };
  } });

W.reg('talk', { name: 'Cartões de conversa', cat: 'Linguagem', icon: '💬', w: 360, h: 240,
  init: () => ({ items: 'Se você pudesse ter um superpoder, qual seria?\nQual foi a melhor parte do seu fim de semana?\nQue lugar do mundo você gostaria de conhecer?\nQual é a sua comida preferida e por quê?\nO que você quer aprender este ano?\nSe pudesse inventar algo, o que inventaria?\nQual livro ou filme você recomendaria a um amigo?\nO que faz você dar risada?', cur: '' }),
  fields: [['items', 'Perguntas, uma por linha', 'area', 8]],
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><div class="center grow"><div class="big" style="font-size:clamp(16px,8cqmin,44px);line-height:1.2">${esc(d.cur || 'Toque em “Nova pergunta”')}</div></div><div class="row cen"><button class="btn" data-a="go">Nova pergunta</button></div></div>`;
    return { go() { const it = lines(d.items).filter(x => x !== d.cur); if (it.length) { d.cur = pick(it); Snd.chime(); c.up(); } } };
  } });

/* ---------- Jogos e música ---------- */
W.reg('piano', { name: 'Piano', cat: 'Jogos e música', icon: '🎹', w: 460, h: 220,
  init: () => ({ names: true }),
  render(el, d) {
    const white = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16], names = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si', 'Dó', 'Ré', 'Mi'], black = [0, 1, 3, 4, 5, 7, 8];
    el.innerHTML = `<div class="piano">${white.map((s, i) => `<button class="wk" data-s="${s}"><span>${names[i]}</span></button>`).join('')}${black.map(i => `<button class="bk" data-s="${white[i] + 1}" style="left:${(i + 1) * 10 - 3}%"></button>`).join('')}</div>`;
    $('.piano', el).onpointerdown = e => {
      const k = e.target.closest('[data-s]');
      if (!k) return;
      e.preventDefault();
      const f = 261.63 * 2 ** (k.dataset.s / 12);
      Snd.tone(f, 1.1, 'triangle', .3); Snd.tone(f * 2, .5, 'sine', .08);
      k.classList.add('hit'); setTimeout(() => k.classList.remove('hit'), 180);
    };
  } });

const MEMO = '🐶 🐱 🦊 🐸 🐵 🐼 🦁 🐷 🐙 🦋 🐢 🐝 🍎 🍌 🍇 🍓 ⚽ 🚀'.split(' ');
W.reg('memory', { name: 'Jogo da memória', cat: 'Jogos e música', icon: '🧩', w: 380, h: 420,
  init: () => ({ pairs: 8, cards: [], moves: 0 }),
  fields: [['pairs', 'Número de pares', 'sel', [6, 8, 10, 12, 15, 18]]],
  onEdit(d) { d.cards = []; },
  render(el, d, c) {
    const n = +d.pairs || 8;
    if (d.cards.length !== n * 2) { const e = shuffle(MEMO).slice(0, n); d.cards = shuffle([...e, ...e]).map(x => ({ e: x, ok: false })); d.moves = 0; c.rt.open = []; }
    const open = c.rt.open || (c.rt.open = []), done = d.cards.every(x => x.ok);
    el.innerHTML = `<div class="col fill"><div class="memo grow" style="--n:${n > 12 ? 6 : n > 8 ? 5 : 4}">${d.cards.map((x, i) => `<button class="${x.ok ? 'ok' : ''}${x.ok || open.includes(i) ? ' up' : ''}" data-a="flip" data-i="${i}">${x.ok || open.includes(i) ? x.e : ''}</button>`).join('')}</div><div class="row"><span class="grow">${done ? `🎉 Completo em ${d.moves} jogadas!` : `Jogadas: ${d.moves}`}</span><button class="btn ghost sm" data-a="new">Novo jogo</button></div></div>`;
    return {
      flip(b) {
        const i = +b.dataset.i;
        if (open.length >= 2 || open.includes(i) || d.cards[i].ok) return;
        open.push(i); Snd.click();
        if (open.length === 2) {
          d.moves++;
          const [a, k] = open;
          if (d.cards[a].e === d.cards[k].e) { d.cards[a].ok = d.cards[k].ok = true; c.rt.open = []; d.cards.every(x => x.ok) ? Snd.win() : Snd.chime(); }
          else setTimeout(() => { c.rt.open = []; c.redraw(); }, 900);
        }
        c.up();
      },
      new() { d.cards = []; c.up(); },
    };
  } });

W.reg('quiz', { name: 'Quiz', cat: 'Jogos e música', icon: '❓', w: 420, h: 340,
  init: () => ({ qs: 'Quanto é 9 × 6? | 54 | 56 | 45 | 63\nQual é a capital do Brasil? | Brasília | Rio de Janeiro | São Paulo | Salvador\nQual planeta é conhecido como planeta vermelho? | Marte | Vênus | Júpiter | Saturno\nQuantos lados tem um hexágono? | 6 | 5 | 8 | 7', i: 0, ok: 0 }),
  fields: [['qs', 'Uma pergunta por linha: pergunta | resposta certa | erradas…', 'area', 8]],
  onEdit(d) { d.i = 0; d.ok = 0; },
  render(el, d, c) {
    const qs = lines(d.qs).map(l => l.split('|').map(x => x.trim())).filter(q => q.length > 2);
    if (!qs.length) { el.innerHTML = '<div class="center muted">Adicione perguntas na engrenagem.</div>'; return; }
    if (d.i >= qs.length) { el.innerHTML = `<div class="center col"><div style="font-size:48px">🏁</div><b class="q">Fim do quiz: ${d.ok} de ${qs.length} acertos</b><button class="btn" data-a="again">Jogar de novo</button></div>`; return { again() { d.i = 0; d.ok = 0; c.rt.q = null; c.up(); } }; }
    const q = qs[d.i];
    if (!c.rt.q || c.rt.q.i !== d.i) c.rt.q = { i: d.i, opts: shuffle(q.slice(1)), pick: null };
    const st = c.rt.q;
    el.innerHTML = `<div class="col fill"><div class="row"><span class="muted grow">Pergunta ${d.i + 1} de ${qs.length}</span><b>Acertos: ${d.ok}</b></div><b class="q">${esc(q[0])}</b><div class="qopts grow">${st.opts.map((o, i) => `<button class="${st.pick == null ? '' : o === q[1] ? 'ok' : st.pick === i ? 'no' : ''}" data-a="ans" data-i="${i}" style="--c:${PAL[(i * 2 + 5) % 8]}">${esc(o)}</button>`).join('')}</div><div class="row cen">${st.pick != null ? '<button class="btn" data-a="next">Próxima</button>' : ''}</div></div>`;
    return {
      ans(b) { if (st.pick != null) return; st.pick = +b.dataset.i; if (st.opts[st.pick] === q[1]) { d.ok++; Snd.win(); } else Snd.bad(); c.up(); },
      next() { d.i++; c.up(); },
    };
  } });

W.reg('curtain', { name: 'Cortina', cat: 'Mídia e quadro', icon: '🎭', w: 480, h: 320, dragBody: true,
  init: () => ({ color: '#124a3d', text: '' }),
  fields: [['color', 'Cor', 'color'], ['text', 'Texto na cortina (opcional)']],
  render(el, d) {
    el.style.background = d.color;
    el.innerHTML = `<div class="center" style="color:#fff;opacity:.85"><div class="big" style="font-size:8cqmin">${esc(d.text) || '<span style="font-weight:400;font-size:13px;opacity:.7">Arraste e redimensione para esconder parte da tela</span>'}</div></div>`;
  } });

const NOTE_C = ['#fff3a3', '#ffd1dc', '#c8f0d0', '#cfe6ff', '#e6d6ff', '#ffe0b8'];
W.reg('sticky', { name: 'Post-it', cat: 'Mídia e quadro', icon: '🗒️', w: 230, h: 230,
  init: () => ({ text: '', color: NOTE_C[0] }),
  render(el, d, c) {
    el.style.background = d.color;
    el.innerHTML = `<div class="col fill"><textarea class="stickyt grow" data-f="text" placeholder="Escreva um lembrete…">${esc(d.text)}</textarea><div class="row cen">${NOTE_C.map(k => `<button class="dot${k === d.color ? ' on' : ''}" style="background:${k}" data-a="col" data-k="${k}"></button>`).join('')}</div></div>`;
    return { col(b) { d.color = b.dataset.k; c.up(); } };
  } });
