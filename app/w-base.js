'use strict';
/* Lousa — widgets essenciais da sala de aula */

/* ---------- Tempo ---------- */
W.reg('clock', { name: 'Relógio', cat: 'Tempo', icon: '🕒', w: 300, h: 180,
  init: () => ({ mode: 'digital', sec: true, date: true }),
  fields: [['mode', 'Tipo', 'sel', [['digital', 'Digital'], ['analog', 'Ponteiros']]], ['sec', 'Mostrar segundos', 'check'], ['date', 'Mostrar a data', 'check']],
  render(el, d, c) {
    const draw = () => {
      const n = new Date(), h = n.getHours(), m = n.getMinutes(), s = n.getSeconds();
      const date = d.date ? `<div class="sub">${n.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>` : '';
      el.innerHTML = d.mode === 'analog' ? `<div class="center col">${clockSvg(h, m, d.sec ? s : null)}${date}</div>`
        : `<div class="center col"><div class="big mono" style="font-size:${d.sec ? 21 : 32}cqw">${pad(h)}:${pad(m)}${d.sec ? ':' + pad(s) : ''}</div>${date}</div>`;
    };
    draw(); c.every(1000, draw);
  } });

W.reg('timer', { name: 'Temporizador', cat: 'Tempo', icon: '⏱️', w: 330, h: 330,
  init: () => ({ dur: 300, left: 300, end: 0, run: false, snd: true }),
  fields: [['snd', 'Tocar o alarme ao terminar', 'check']],
  render(el, d, c) {
    const left = () => d.run ? Math.max(0, (d.end - Date.now()) / 1000) : d.left;
    el.innerHTML = `<div class="col fill"><div class="ringbox grow">${ringSvg()}<div class="ringtxt mono" data-t></div></div>
<div class="row wrap cen">${[1, 2, 3, 5, 10, 15, 20, 30].map(m => `<button class="chip" data-a="set" data-m="${m}">${m}</button>`).join('')}<span class="muted">min</span></div>
<div class="row cen"><button class="btn ghost" data-a="adj" data-s="-60">−1</button><button class="btn ghost" data-a="adj" data-s="-10">−10s</button><button class="btn" data-a="go">${d.run ? 'Pausar' : 'Iniciar'}</button><button class="btn ghost" data-a="adj" data-s="10">+10s</button><button class="btn ghost" data-a="adj" data-s="60">+1</button><button class="btn ghost" data-a="reset" title="Recomeçar">↺</button></div></div>`;
    const t = $('[data-t]', el), arc = $('.arc', el);
    const tick = () => {
      const l = left();
      t.textContent = fmtT(Math.ceil(l));
      arc.style.strokeDashoffset = 283 * (1 - (d.dur ? Math.min(1, l / d.dur) : 0));
      el.classList.toggle('over', l <= 0);
      if (d.run && l <= 0) { d.run = false; d.left = 0; if (d.snd) Snd.alarm(); c.up(); }
    };
    tick(); c.every(200, tick);
    return {
      set(b) { d.dur = d.left = b.dataset.m * 60; d.run = false; c.up(); },
      adj(b) { const l = Math.max(0, left() + +b.dataset.s); d.dur = Math.max(d.dur, l); if (d.run) d.end = Date.now() + l * 1000; else d.left = l; c.up(); },
      go() { if (d.run) { d.left = left(); d.run = false; } else { if (d.left <= 0) d.left = d.dur; d.end = Date.now() + d.left * 1000; d.run = true; Snd.click(); } c.up(); },
      reset() { d.run = false; d.left = d.dur; c.up(); },
    };
  } });

W.reg('stopwatch', { name: 'Cronômetro', cat: 'Tempo', icon: '⏲️', w: 300, h: 260,
  init: () => ({ acc: 0, start: 0, run: false, laps: [] }),
  render(el, d, c) {
    const val = () => d.acc + (d.run ? Date.now() - d.start : 0);
    const f = ms => fmtT(ms / 1000) + '.' + Math.floor(ms % 1000 / 100);
    el.innerHTML = `<div class="col fill"><div class="center grow"><div class="big mono" style="font-size:20cqw" data-t></div></div>
${d.laps.length ? `<div class="laps scroll">${d.laps.map((l, i) => `<div><span>Volta ${i + 1}</span><b>${f(l)}</b></div>`).join('')}</div>` : ''}
<div class="row cen"><button class="btn" data-a="go">${d.run ? 'Pausar' : 'Iniciar'}</button><button class="btn ghost" data-a="lap">Volta</button><button class="btn ghost" data-a="reset">Zerar</button></div></div>`;
    const t = $('[data-t]', el), tick = () => { t.textContent = f(val()); };
    tick(); c.every(100, tick);
    return {
      go() { if (d.run) { d.acc = val(); d.run = false; } else { d.start = Date.now(); d.run = true; } c.up(); },
      lap() { d.laps.push(val()); c.up(); },
      reset() { d.acc = 0; d.run = false; d.laps = []; c.up(); },
    };
  } });

W.reg('countdown', { name: 'Contagem para evento', cat: 'Tempo', icon: '🎉', w: 340, h: 200,
  init: () => ({ name: 'Férias', date: `${new Date().getFullYear()}-12-18`, time: '00:00' }),
  fields: [['name', 'Evento'], ['date', 'Data', 'date'], ['time', 'Hora', 'time']],
  render(el, d, c) {
    const draw = () => {
      const ms = new Date(`${d.date}T${d.time || '00:00'}`) - Date.now();
      if (!(ms > 0)) { el.innerHTML = `<div class="center col"><div class="big" style="font-size:16cqmin">🎉 ${esc(d.name)}</div><div class="sub">${isNaN(ms) ? 'Escolha a data na engrenagem' : 'Chegou o dia!'}</div></div>`; return; }
      const s = Math.floor(ms / 1000), parts = [[Math.floor(s / 86400), 'dias'], [Math.floor(s % 86400 / 3600), 'horas'], [Math.floor(s % 3600 / 60), 'min'], [s % 60, 'seg']];
      el.innerHTML = `<div class="center col"><div class="sub">Faltam para <b>${esc(d.name)}</b></div><div class="row cen">${parts.map(([v, l]) => `<div class="cdbox"><b class="mono">${v}</b><span>${l}</span></div>`).join('')}</div></div>`;
    };
    draw(); c.every(1000, draw);
  } });

W.reg('calendar', { name: 'Calendário', cat: 'Tempo', icon: '📅', w: 320, h: 340,
  init: () => ({ marks: {} }),
  render(el, d, c) {
    const off = c.rt.off || 0, now = new Date(), first = new Date(now.getFullYear(), now.getMonth() + off, 1), y = first.getFullYear(), m = first.getMonth();
    const days = new Date(y, m + 1, 0).getDate(), marks = d.marks || {};
    let cells = '<span></span>'.repeat(first.getDay());
    const notes = [];
    for (let k = 1; k <= days; k++) {
      const key = `${y}-${pad(m + 1)}-${pad(k)}`, note = marks[key];
      if (note) notes.push(`<div><b>${k}</b> ${esc(note)}</div>`);
      cells += `<button class="cday${key === dayKey(now) ? ' today' : ''}${note ? ' mark' : ''}" data-a="day" data-k="${key}" title="${esc(note || 'Anotar')}">${k}</button>`;
    }
    el.innerHTML = `<div class="col fill"><div class="row"><button class="chip" data-a="nav" data-n="-1">‹</button><b class="grow cen cap">${first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b><button class="chip" data-a="nav" data-n="1">›</button></div>
<div class="cal grow">${'DSTQQSS'.split('').map(x => `<i>${x}</i>`).join('')}${cells}</div>${notes.length ? `<div class="laps scroll">${notes.join('')}</div>` : ''}</div>`;
    return {
      nav(b) { c.rt.off = off + +b.dataset.n; c.redraw(); },
      async day(b) {
        const k = b.dataset.k, v = await promptBox('Anotação de ' + k.split('-').reverse().join('/'), marks[k] || '', 'Deixe em branco para apagar.');
        if (v == null) return;
        d.marks = marks;
        if (v.trim()) marks[k] = v.trim(); else delete marks[k];
        c.up();
      },
    };
  } });

W.reg('timetable', { name: 'Horário semanal', cat: 'Tempo', icon: '🗓️', w: 520, h: 300,
  init: () => ({ txt: 'Hora;Seg;Ter;Qua;Qui;Sex\n07:30;Português;Matemática;Ciências;História;Arte\n08:20;Português;Matemática;Ciências;Geografia;Ed. Física\n09:10;Recreio;Recreio;Recreio;Recreio;Recreio\n09:30;Matemática;Inglês;Português;Matemática;Português' }),
  fields: [['txt', 'Uma linha por horário, colunas separadas por ponto e vírgula', 'area', 9]],
  render(el, d) {
    const rows = lines(d.txt).map(l => l.split(';').map(x => x.trim())), day = new Date().getDay(); // coluna 1 = segunda
    el.innerHTML = `<div class="scroll fill"><table class="tt">${rows.map((r, i) => `<tr>${r.map((x, j) => `<${i ? 'td' : 'th'} class="${j && j === day ? 'now' : ''}">${esc(x)}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table></div>`;
  } });

/* ---------- Sorteios ---------- */
W.reg('picker', { name: 'Sorteador de nomes', cat: 'Sorteios', icon: '🎯', w: 320, h: 250,
  init: () => ({ names: '', noRep: true, used: [], cur: '' }),
  fields: [NAMES_F, ['noRep', 'Não repetir até todos serem sorteados', 'check']],
  render(el, d, c) {
    const all = c.names(), pool = d.noRep ? all.filter(n => !d.used.includes(n)) : all;
    el.innerHTML = `<div class="col fill"><div class="center grow"><div class="big" data-o style="font-size:15cqmin">${esc(d.cur || '?')}</div></div>
<div class="muted cen">${all.length ? (d.noRep ? `${pool.length} de ${all.length} ainda não sorteados` : count(all.length, 'nome', 'nomes')) : 'Adicione nomes na engrenagem ou escolha uma turma'}</div>
<div class="row cen"><button class="btn" data-a="go">Sortear</button>${d.noRep ? '<button class="btn ghost" data-a="reset">Recomeçar</button>' : ''}</div></div>`;
    return {
      go() {
        if (!all.length) return;
        if (d.noRep && !pool.length) d.used = [];
        const win = pick(pool.length ? pool : all);
        spin(c, $('[data-o]', el), all, win, () => { d.cur = win; if (d.noRep) d.used.push(win); Snd.win(); c.up(); });
      },
      reset() { d.used = []; d.cur = ''; c.up(); },
    };
  } });

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
W.reg('dice', { name: 'Dados', cat: 'Sorteios', icon: '🎲', w: 300, h: 240,
  init: () => ({ n: 2, sides: 6, vals: [3, 5] }),
  fields: [['n', 'Quantidade de dados', 'sel', [1, 2, 3, 4, 5, 6]], ['sides', 'Lados', 'sel', [4, 6, 8, 10, 12, 20, 100]]],
  render(el, d, c) {
    const n = +d.n || 1, sides = +d.sides || 6;
    const face = v => sides === 6 ? `<div class="die">${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[v].includes(i) ? 'on' : ''}"></i>`).join('')}</div>` : `<div class="die num"><b>${v}</b></div>`;
    const show = vals => { $('[data-o]', el).innerHTML = vals.map(face).join(''); $('[data-s]', el).textContent = n > 1 ? 'Soma: ' + vals.reduce((a, b) => a + b, 0) : ''; };
    el.innerHTML = `<div class="col fill"><div class="dicebox grow" data-o style="--n:${n}"></div><div class="row cen"><b data-s></b><button class="btn" data-a="go">Jogar</button></div></div>`;
    const roll = () => Array.from({ length: n }, () => 1 + rnd(sides));
    show(d.vals.length === n && d.vals.every(v => v <= sides) ? d.vals : (d.vals = roll()));
    return { go() {
      if (c.rt.busy) return;
      c.rt.busy = true;
      let i = 0;
      const t = setInterval(() => { d.vals = roll(); show(d.vals); Snd.tone(300 + rnd(300), .03, 'square', .05); if (++i > 8) { clearInterval(t); c.rt.busy = false; c.save(); } }, 70);
    } };
  } });

W.reg('groups', { name: 'Formador de grupos', cat: 'Sorteios', icon: '👥', w: 460, h: 340,
  init: () => ({ names: '', mode: 'size', n: 4, groups: [] }),
  fields: [NAMES_F, ['mode', 'Dividir por', 'sel', [['size', 'Alunos por grupo'], ['count', 'Número de grupos']]], ['n', 'Quantidade', 'num']],
  render(el, d, c) {
    const names = c.names();
    el.innerHTML = `<div class="col fill"><div class="row"><select data-f="mode" data-r><option value="size" ${d.mode === 'size' ? 'selected' : ''}>Alunos por grupo</option><option value="count" ${d.mode === 'count' ? 'selected' : ''}>Nº de grupos</option></select><input type="number" min="1" class="num" data-f="n" value="${d.n}"><span class="grow"></span><button class="btn" data-a="go">Formar grupos</button></div>
<div class="gridg grow scroll">${d.groups.map((g, i) => `<div class="gcard" style="--c:${PAL[i % 8]}"><b>Grupo ${i + 1}</b>${g.map(n => `<span>${esc(n)}</span>`).join('')}</div>`).join('') || `<div class="muted">${names.length ? count(names.length, 'aluno', 'alunos') + ' na lista.' : 'Adicione nomes na engrenagem ou escolha uma turma.'}</div>`}</div></div>`;
    return { go() {
      if (!names.length) return;
      const n = Math.max(1, +d.n || 1), k = clamp(d.mode === 'count' ? n : Math.ceil(names.length / n), 1, names.length);
      d.groups = Array.from({ length: k }, () => []);
      shuffle(names).forEach((nm, i) => d.groups[i % k].push(nm));
      Snd.win(); c.up();
    } };
  } });

W.reg('seats', { name: 'Mapa de lugares', cat: 'Sorteios', icon: '🪑', w: 480, h: 360,
  init: () => ({ names: '', cols: 5, seats: [] }),
  fields: [NAMES_F, ['cols', 'Carteiras por fileira', 'num']],
  render(el, d, c) {
    const names = c.names(), cols = clamp(+d.cols || 5, 1, 12);
    el.innerHTML = `<div class="col fill"><div class="board cen muted">Quadro</div><div class="seats grow scroll" style="--n:${cols}">${d.seats.map((n, i) => `<button class="seat${c.rt.sel === i ? ' sel' : ''}${n ? '' : ' empty'}" data-a="swap" data-i="${i}">${esc(n)}</button>`).join('')}</div>
<div class="row cen"><span class="muted">${d.seats.length ? 'Toque em duas carteiras para trocar' : ''}</span><button class="btn" data-a="go">Sortear lugares</button></div></div>`;
    return {
      go() { if (!names.length) return toast('Adicione nomes ou escolha uma turma'); const s = shuffle(names); while (s.length % cols) s.push(''); d.seats = s; c.rt.sel = null; Snd.win(); c.up(); },
      swap(b) {
        const i = +b.dataset.i;
        if (c.rt.sel == null) { c.rt.sel = i; c.redraw(); return; }
        [d.seats[i], d.seats[c.rt.sel]] = [d.seats[c.rt.sel], d.seats[i]];
        c.rt.sel = null; c.up();
      },
    };
  } });

/* ---------- Turma ---------- */
W.reg('noise', { name: 'Nível de ruído', cat: 'Turma', icon: '🔊', w: 260, h: 340,
  init: () => ({ limit: 60, sens: 5, snd: true }),
  fields: [['limit', 'Limite (0 a 100)', 'num'], ['sens', 'Sensibilidade (1 a 10)', 'num'], ['snd', 'Avisar com som ao passar do limite', 'check']],
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><div class="meter grow"><div class="mfill"></div><div class="mlim" style="bottom:${clamp(d.limit, 0, 100)}%"></div></div><div class="muted cen" data-s>Microfone desligado</div><div class="row cen"><button class="btn" data-a="go">Ligar microfone</button></div></div>`;
    let stream = null, ac = null, raf = 0, over = 0, last = 0, lvl = 0;
    const fill = $('.mfill', el), st = $('[data-s]', el);
    const stop = () => { cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); if (ac) ac.close(); stream = ac = null; };
    c.end(stop);
    return { async go(b) {
      if (stream) { stop(); b.textContent = 'Ligar microfone'; st.textContent = 'Microfone desligado'; fill.style.height = 0; return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Não consegui acessar o microfone'); return; }
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const an = ac.createAnalyser(), buf = new Uint8Array(1024);
      an.fftSize = 1024;
      ac.createMediaStreamSource(stream).connect(an);
      b.textContent = 'Desligar';
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let s = 0;
        for (const v of buf) s += (v - 128) ** 2;
        lvl += (clamp(Math.sqrt(s / buf.length) / 128 * 80 * (+d.sens || 5), 0, 100) - lvl) * .2;
        const hot = lvl > d.limit;
        fill.style.height = lvl + '%';
        fill.classList.toggle('hot', hot);
        if (hot && Date.now() - last > 3000) { last = Date.now(); over++; if (d.snd) Snd.tone(300, .4, 'square', .2); }
        st.textContent = over ? `Passou do limite ${over}×` : 'Ouvindo a sala…';
        raf = requestAnimationFrame(loop);
      };
      loop();
    } };
  } });

W.reg('light', { name: 'Semáforo', cat: 'Turma', icon: '🚦', w: 170, h: 380,
  init: () => ({ cur: 'r' }),
  render(el, d, c) {
    el.innerHTML = `<div class="tlight">${[['r', '#e5484d'], ['y', '#ffc53d'], ['g', '#46a758']].map(([k, col]) => `<button class="${d.cur === k ? 'on' : ''}" style="--c:${col}" data-a="set" data-k="${k}"></button>`).join('')}</div>`;
    return { set(b) { d.cur = d.cur === b.dataset.k ? '' : b.dataset.k; Snd.click(); c.up(); } };
  } });

const WORK = [['🤫', 'Silêncio'], ['🤏', 'Sussurro'], ['🙋', 'Pergunte ao colega'], ['🤝', 'Trabalho em grupo']];
W.reg('work', { name: 'Modo de trabalho', cat: 'Turma', icon: '🤫', w: 300, h: 280,
  init: () => ({ cur: 0 }),
  render(el, d, c) {
    const [e, t] = WORK[d.cur] || WORK[0];
    el.innerHTML = `<div class="col fill"><div class="center col grow"><div style="font-size:38cqmin;line-height:1">${e}</div><div class="big" style="font-size:9cqmin">${t}</div></div><div class="row cen">${WORK.map((w, i) => `<button class="chip emo${i === d.cur ? ' on' : ''}" data-a="set" data-i="${i}" title="${w[1]}">${w[0]}</button>`).join('')}</div></div>`;
    return { set(b) { d.cur = +b.dataset.i; c.up(); } };
  } });

W.reg('poll', { name: 'Enquete', cat: 'Turma', icon: '📊', w: 360, h: 300,
  init: () => ({ q: 'O que achou da aula?', opts: 'Adorei\nGostei\nMais ou menos\nNão gostei', votes: [] }),
  fields: [['q', 'Pergunta'], ['opts', 'Opções, uma por linha', 'area']],
  onEdit(d) { d.votes = []; },
  render(el, d, c) {
    const o = lines(d.opts), total = o.reduce((s, _, i) => s + (d.votes[i] || 0), 0);
    el.innerHTML = `<div class="col fill"><b class="q">${esc(d.q)}</b><div class="col grow scroll">${o.map((t, i) => { const v = d.votes[i] || 0; return `<button class="pbar" data-a="vote" data-i="${i}" style="--p:${total ? v / total * 100 : 0}%;--c:${PAL[(i + 5) % 8]}"><span>${esc(t)}</span><b>${v}${total ? ` · ${Math.round(v / total * 100)}%` : ''}</b></button>`; }).join('')}</div>
<div class="row"><span class="muted grow">${count(total, 'voto', 'votos')} · toque na opção para votar</span><button class="btn ghost sm" data-a="reset">Zerar</button></div></div>`;
    return { vote(b) { const i = +b.dataset.i; d.votes[i] = (d.votes[i] || 0) + 1; Snd.click(); c.up(); }, reset() { d.votes = []; c.up(); } };
  } });

W.reg('score', { name: 'Placar', cat: 'Turma', icon: '🏆', w: 400, h: 250,
  init: () => ({ teams: [{ n: 'Time A', s: 0 }, { n: 'Time B', s: 0 }] }),
  render(el, d, c) {
    const max = Math.max(...d.teams.map(t => t.s));
    el.innerHTML = `<div class="col fill"><div class="row grow teams">${d.teams.map((t, i) => `<div class="team${t.s === max && max > 0 ? ' lead' : ''}" style="--c:${PAL[(i * 3 + 5) % 8]}"><button class="tname" data-a="name" data-i="${i}">${esc(t.n)}</button><b class="mono">${t.s}</b><div class="row cen"><button class="chip" data-a="pt" data-i="${i}" data-v="-1">−</button><button class="chip plus" data-a="pt" data-i="${i}" data-v="1">+</button></div></div>`).join('')}</div>
<div class="row cen"><button class="btn ghost sm" data-a="add">+ Time</button><button class="btn ghost sm" data-a="rem">− Time</button><button class="btn ghost sm" data-a="reset">Zerar</button></div></div>`;
    return {
      pt(b) { d.teams[b.dataset.i].s += +b.dataset.v; Snd.click(); c.up(); },
      async name(b) { const t = d.teams[b.dataset.i], v = await promptBox('Nome do time', t.n); if (v && v.trim()) { t.n = v.trim(); c.up(); } },
      add() { if (d.teams.length < 8) { d.teams.push({ n: 'Time ' + String.fromCharCode(65 + d.teams.length), s: 0 }); c.up(); } },
      rem() { if (d.teams.length > 1) { d.teams.pop(); c.up(); } },
      reset() { d.teams.forEach(t => { t.s = 0; }); c.up(); },
    };
  } });

W.reg('tasks', { name: 'Lista de tarefas', cat: 'Turma', icon: '✅', w: 300, h: 320,
  init: () => ({ title: 'Para hoje', items: [] }),
  fields: [['title', 'Título']],
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><b class="q">${esc(d.title)}</b><div class="col grow scroll tight">${d.items.map((t, i) => `<div class="task${t.done ? ' done' : ''}"><button class="tick" data-a="tog" data-i="${i}">${t.done ? '✓' : ''}</button><span class="grow">${esc(t.t)}</span><button class="mini" data-a="del" data-i="${i}">×</button></div>`).join('') || '<div class="muted">Nenhuma tarefa ainda.</div>'}</div><input class="inp" placeholder="Nova tarefa e Enter"></div>`;
    $('.inp', el).onkeydown = e => { if (e.key === 'Enter' && e.target.value.trim()) { d.items.push({ t: e.target.value.trim(), done: false }); c.rt.focus = true; c.up(); } };
    if (c.rt.focus) { c.rt.focus = false; $('.inp', el).focus(); }
    return { tog(b) { const t = d.items[b.dataset.i]; t.done = !t.done; if (t.done) Snd.chime(); c.up(); }, del(b) { d.items.splice(b.dataset.i, 1); c.up(); } };
  } });

/* ---------- Mídia e quadro ---------- */
W.reg('text', { name: 'Texto', cat: 'Mídia e quadro', icon: '📝', w: 380, h: 260,
  init: () => ({ html: '<h2>Bom dia, turma!</h2><p>Escreva aqui os recados da aula.</p>' }),
  render(el, d, c) {
    const B = [['bold', '<b>N</b>'], ['italic', '<i>I</i>'], ['underline', '<u>S</u>'], ['insertUnorderedList', '•'], ['insertOrderedList', '1.'], ['justifyLeft', '⇤'], ['justifyCenter', '↔']];
    el.innerHTML = `<div class="col fill"><div class="row wrap tbar">${B.map(([k, t]) => `<button class="chip" data-cmd="${k}">${t}</button>`).join('')}<button class="chip" data-cmd="fontSize" data-v="2">A−</button><button class="chip" data-cmd="fontSize" data-v="5">A+</button><button class="chip" data-cmd="fontSize" data-v="7">A++</button>${['#1c2024', '#e5484d', '#0090ff', '#46a758', '#f76b15'].map(k => `<button class="dot" style="background:${k}" data-cmd="foreColor" data-v="${k}"></button>`).join('')}</div><div class="rich grow scroll" contenteditable="true"></div></div>`;
    const ed = $('.rich', el);
    ed.innerHTML = clean(d.html);
    ed.oninput = () => { d.html = ed.innerHTML; c.save(); };
    $('.tbar', el).onpointerdown = e => { const b = e.target.closest('[data-cmd]'); if (!b) return; e.preventDefault(); ed.focus(); document.execCommand(b.dataset.cmd, false, b.dataset.v || null); d.html = ed.innerHTML; c.save(); };
  } });

W.reg('draw', { name: 'Desenho', cat: 'Mídia e quadro', icon: '🎨', w: 460, h: 340, rz: true,
  init: () => ({ img: '', color: '#1c2024', size: 4 }),
  render(el, d, c) {
    const tool = { color: d.color, size: d.size, erase: false };
    el.innerHTML = `<div class="col fill"><div class="row wrap tbar">${['#1c2024', '#e5484d', '#f76b15', '#ffc53d', '#46a758', '#0090ff', '#6e56cf', '#ffffff'].map(k => `<button class="dot${k === d.color ? ' on' : ''}" style="background:${k}" data-a="col" data-k="${k}"></button>`).join('')}${[2, 4, 8, 16].map(s => `<button class="chip${s === d.size ? ' on' : ''}" data-a="size" data-s="${s}"><i class="pt" style="width:${s + 2}px;height:${s + 2}px"></i></button>`).join('')}<button class="chip" data-a="erase">Borracha</button><button class="chip" data-a="undo">Desfazer</button><button class="chip" data-a="clear">Limpar</button><button class="chip" data-a="save">Salvar</button></div><div class="cvbox grow"><canvas></canvas></div></div>`;
    const box = $('.cvbox', el), cv = $('canvas', el), x = cv.getContext('2d');
    cv.width = Math.max(50, box.clientWidth); cv.height = Math.max(50, box.clientHeight);
    const load = src => { if (!src) return; const i = new Image(); i.onload = () => { x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(i, 0, 0, cv.width, cv.height); }; i.src = src; };
    load(d.img);
    tool.before = () => { c.rt.prev = cv.toDataURL(); };
    const keep = () => { d.img = cv.toDataURL(); c.save(); };
    sketch(cv, tool, keep);
    return {
      col(b) { d.color = tool.color = b.dataset.k; tool.erase = false; $$('.dot', el).forEach(o => o.classList.toggle('on', o === b)); c.save(); },
      size(b) { d.size = tool.size = +b.dataset.s; $$('[data-a=size]', el).forEach(o => o.classList.toggle('on', o === b)); c.save(); },
      erase(b) { tool.erase = !tool.erase; b.classList.toggle('on', tool.erase); },
      undo() { if (c.rt.prev) { d.img = c.rt.prev; c.rt.prev = null; load(d.img); c.save(); } },
      clear() { c.rt.prev = cv.toDataURL(); x.clearRect(0, 0, cv.width, cv.height); d.img = ''; c.save(); },
      save() { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'desenho.png'; a.click(); },
    };
  } });

W.reg('image', { name: 'Imagem', cat: 'Mídia e quadro', icon: '🖼️', w: 360, h: 280,
  init: () => ({ src: '', fit: 'contain' }),
  fields: [['fit', 'Ajuste', 'sel', [['contain', 'Mostrar inteira'], ['cover', 'Preencher a janela']]]],
  render(el, d, c) {
    el.innerHTML = d.src ? `<img class="fillimg" style="object-fit:${d.fit === 'cover' ? 'cover' : 'contain'}" src="${esc(d.src)}" alt=""><button class="chip float" data-a="pick">Trocar</button>` : '<div class="center col"><div style="font-size:40px">🖼️</div><button class="btn" data-a="pick">Escolher imagem</button></div>';
    return { async pick() { const s = await pickImage(1600); if (s) { d.src = s; c.up(); } } };
  } });

W.reg('video', { name: 'Vídeo', cat: 'Mídia e quadro', icon: '🎬', w: 480, h: 320,
  init: () => ({ url: '' }),
  fields: [['url', 'Link do YouTube, do Vimeo ou de um arquivo de vídeo']],
  render(el, d, c) {
    const u = safeUrl(d.url), yt = /(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/.exec(u), vm = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u);
    const src = yt ? 'https://www.youtube-nocookie.com/embed/' + yt[1] : vm ? 'https://player.vimeo.com/video/' + vm[1] : '';
    if (c.rt.file) el.innerHTML = `<video class="fillimg" src="${c.rt.file}" controls></video>`;
    else if (src) el.innerHTML = `<iframe class="fillimg" src="${src}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    else if (u) el.innerHTML = `<video class="fillimg" src="${esc(u)}" controls></video>`;
    else el.innerHTML = '<div class="center col"><div style="font-size:40px">🎬</div><div class="muted">Cole um link na engrenagem ou abra um arquivo do computador.</div><button class="btn" data-a="file">Abrir arquivo de vídeo</button></div>';
    return { async file() { const [f] = await pickFiles('video/*,audio/*'); if (f) { c.rt.file = URL.createObjectURL(f); c.redraw(); } } };
  } });

W.reg('webcam', { name: 'Câmera', cat: 'Mídia e quadro', icon: '📷', w: 400, h: 320,
  init: () => ({ mirror: true }),
  render(el, d, c) {
    el.innerHTML = `<div class="col fill"><div class="cvbox grow dark"><video autoplay playsinline muted style="${d.mirror ? 'transform:scaleX(-1)' : ''}"></video></div><div class="row cen"><button class="btn" data-a="go">Ligar câmera</button><button class="btn ghost" data-a="freeze">Congelar</button><label class="chk"><input type="checkbox" data-f="mirror" data-r ${d.mirror ? 'checked' : ''}> Espelhar</label></div></div>`;
    const v = $('video', el);
    let stream = null;
    const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
    c.end(stop);
    return {
      async go(b) {
        if (stream) { stop(); v.srcObject = null; b.textContent = 'Ligar câmera'; return; }
        try { stream = await navigator.mediaDevices.getUserMedia({ video: true }); v.srcObject = stream; b.textContent = 'Desligar'; } catch (e) { toast('Não consegui acessar a câmera'); }
      },
      freeze(b) { if (!stream) return; if (v.paused) { v.play(); b.textContent = 'Congelar'; } else { v.pause(); b.textContent = 'Continuar'; } },
    };
  } });

W.reg('qr', { name: 'Código QR', cat: 'Mídia e quadro', icon: '🔳', w: 280, h: 330,
  init: () => ({ text: 'https://joaogabrielmontinirossi-sys.github.io/lousa/' }),
  render(el, d) {
    el.innerHTML = `<div class="col fill"><div class="qrbox grow"></div><input class="inp" data-f="text" value="${esc(d.text)}" placeholder="Link ou texto"></div>`;
    const box = $('.qrbox', el), draw = () => { box.innerHTML = d.text ? QR.svg(d.text) || '<div class="center muted">Texto longo demais para o código (máx. 271 caracteres).</div>' : ''; };
    $('.inp', el).oninput = () => setTimeout(draw);
    draw();
  } });

W.reg('embed', { name: 'Incorporar site', cat: 'Mídia e quadro', icon: '🌐', w: 520, h: 380,
  init: () => ({ url: '' }),
  fields: [['url', 'Endereço do site (alguns sites não permitem ser incorporados)']],
  render(el, d) {
    const u = safeUrl(d.url);
    el.innerHTML = u ? `<iframe class="fillimg" src="${esc(u)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerpolicy="no-referrer"></iframe>` : '<div class="center col"><div style="font-size:40px">🌐</div><div class="muted">Informe o endereço na engrenagem.</div></div>';
  } });

W.reg('link', { name: 'Link', cat: 'Mídia e quadro', icon: '🔗', w: 260, h: 130,
  init: () => ({ label: 'Abrir atividade', url: '' }),
  fields: [['label', 'Texto do botão'], ['url', 'Endereço']],
  render(el, d) {
    const u = safeUrl(d.url);
    el.innerHTML = `<div class="center col">${u ? `<a class="btn xl" href="${esc(u)}" target="_blank" rel="noopener">🔗 ${esc(d.label)}</a><div class="muted ell">${esc(u)}</div>` : '<div class="muted">Informe o endereço na engrenagem.</div>'}</div>`;
  } });

const STICKERS = '⭐ 🌟 👍 👏 🎉 ❤️ 😀 😎 🤔 🤫 ✋ 💡 📌 ✅ ❌ ⚠️ ➡️ ⬅️ ⬆️ ⬇️ 🏆 🥇 🔥 🌈 ☀️ 🌧️ 📚 ✏️ 🧠 🎵 🍎 🚀 🐶 🐱 🦉 🌻'.split(' ');
W.reg('sticker', { name: 'Adesivo', cat: 'Mídia e quadro', icon: '⭐', w: 150, h: 170, bare: true, dragBody: true,
  init: () => ({ e: pick(STICKERS) }),
  render(el, d) { el.innerHTML = `<div class="center" style="font-size:78cqmin;line-height:1">${esc(d.e)}</div>`; },
  edit(el, d, c) {
    el.innerHTML = `<div class="stk">${STICKERS.map(e => `<button data-a="set">${e}</button>`).join('')}</div>`;
    return { set(b) { d.e = b.textContent; c.done(); } };
  } });

/* ---------- Jogos ---------- */
const WINS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
W.reg('velha', { name: 'Jogo da velha', cat: 'Jogos e música', icon: '❌', w: 280, h: 340,
  init: () => ({ b: Array(9).fill(''), turn: 'X', sx: 0, so: 0 }),
  render(el, d, c) {
    const line = WINS.find(l => d.b[l[0]] && l.every(i => d.b[i] === d.b[l[0]])), full = d.b.every(Boolean);
    el.innerHTML = `<div class="col fill"><div class="row cen"><b style="color:#e5484d">X ${d.sx}</b><span class="muted grow cen">${line ? `Vitória de ${d.b[line[0]]}!` : full ? 'Deu velha!' : `Vez de ${d.turn}`}</span><b style="color:#0090ff">O ${d.so}</b></div>
<div class="ttt grow">${d.b.map((v, i) => `<button class="${v}${line && line.includes(i) ? ' hit' : ''}" data-a="play" data-i="${i}">${v}</button>`).join('')}</div><div class="row cen"><button class="btn ghost sm" data-a="again">Nova partida</button></div></div>`;
    return {
      play(b) {
        const i = +b.dataset.i;
        if (line || d.b[i]) return;
        d.b[i] = d.turn;
        if (WINS.some(l => l.every(k => d.b[k] === d.turn))) { d[d.turn === 'X' ? 'sx' : 'so']++; Snd.win(); } else Snd.click();
        d.turn = d.turn === 'X' ? 'O' : 'X';
        c.up();
      },
      again() { d.b = Array(9).fill(''); c.up(); },
    };
  } });

W.reg('forca', { name: 'Forca', cat: 'Jogos e música', icon: '🪢', w: 420, h: 380,
  init: () => ({ words: 'ESCOLA\nPROFESSORA\nCADERNO\nRECREIO\nBIBLIOTECA\nAMIZADE\nPLANETA\nGIRASSOL', word: '', tried: '' }),
  fields: [['words', 'Palavras, uma por linha', 'area', 8]],
  onEdit(d) { d.word = ''; d.tried = ''; },
  render(el, d, c) {
    if (!d.word) { d.word = norm(pick(lines(d.words)) || 'LOUSA').toUpperCase().replace(/[^A-Z ]/g, ''); d.tried = ''; }
    const miss = [...d.tried].filter(l => !d.word.includes(l)).length, won = [...d.word].every(l => l === ' ' || d.tried.includes(l)), lost = miss >= 6;
    const parts = ['<circle cx="70" cy="32" r="9"/>', '<path d="M70 41v26"/>', '<path d="M70 48l-12 10"/>', '<path d="M70 48l12 10"/>', '<path d="M70 67l-10 16"/>', '<path d="M70 67l10 16"/>'];
    el.innerHTML = `<div class="col fill"><div class="row grow"><svg class="gal" viewBox="0 0 100 100"><path d="M10 95h50M25 95V8h45v15"/>${parts.slice(0, miss).join('')}</svg><div class="col grow cen"><div class="hword">${[...d.word].map(l => l === ' ' ? '<i class="sp"></i>' : `<i>${won || lost || d.tried.includes(l) ? l : ''}</i>`).join('')}</div><div class="muted">${won ? 'Parabéns! 🎉' : lost ? 'Não foi dessa vez.' : `Erros: ${miss} de 6`}</div></div></div>
<div class="keys">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => `<button data-a="try" ${d.tried.includes(l) || won || lost ? 'disabled' : ''} class="${d.tried.includes(l) ? (d.word.includes(l) ? 'ok' : 'no') : ''}">${l}</button>`).join('')}</div><div class="row cen"><button class="btn ghost sm" data-a="next">Nova palavra</button></div></div>`;
    return {
      try(b) { const l = b.textContent; d.tried += l; const ok = d.word.includes(l); if (ok && [...d.word].every(x => x === ' ' || d.tried.includes(x))) Snd.win(); else ok ? Snd.chime() : Snd.bad(); c.up(); },
      next() { d.word = ''; c.up(); },
    };
  } });
