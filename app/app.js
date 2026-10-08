'use strict';
const GSync = window.GSyncLib || { web: false, on: () => false, io: null, html: () => '', off() {}, onChange: null };
/* Lousa — barra, galeria de widgets, telas, turmas, fundos, anotação, backup e sincronização */
(() => {
  const VERSION = '1.0.0';
  const CATS = ['Tempo', 'Sorteios', 'Turma', 'Mídia e quadro', 'Matemática', 'Linguagem', 'Jogos e música'];
  /* Telas prontas: [widget, x e y em fração da janela, dados] */
  const TEMPLATES = [
    { name: 'Início da aula', bg: 0, w: [['today', .02, .1], ['agenda', .29, .1], ['objective', .55, .1], ['clock', .55, .48], ['text', .02, .56]] },
    { name: 'Trabalho em grupo', bg: 1, w: [['timer', .02, .1], ['groups', .3, .1], ['work', .68, .1], ['noise', .68, .5], ['queue', .3, .58]] },
    { name: 'Dia de prova', bg: 2, w: [['exam', .04, .12], ['work', .42, .12, { cur: 0 }], ['clock', .42, .58], ['pass', .68, .12]] },
    { name: 'Pausa ativa', bg: 5, w: [['brain', .04, .12], ['breathe', .36, .12], ['timer', .64, .12], ['mood', .04, .58]] },
    { name: 'Hora do jogo', bg: 6, w: [['velha', .02, .1], ['forca', .26, .1], ['memory', .62, .1], ['score', .02, .62]] },
    { name: 'Aula de matemática', bg: 17, w: [['numline', .02, .1], ['fraction', .02, .42], ['tabuada', .3, .42], ['mental', .56, .1], ['calc', .56, .46]] },
    { name: 'Roda de leitura', bg: 4, w: [['word', .03, .12], ['story', .34, .12], ['talk', .34, .5], ['picker', .03, .52], ['hourglass', .72, .12]] },
  ];

  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const Inst = { prompt: null };
  const Sync = { avail: false, on: false, folder: null, detected: null, drives: [], busy: false, again: false, last: 0, error: '' };
  const canInstall = () => !Sync.avail && !standalone() && location.protocol === 'https:' && (Inst.prompt || isIOS());
  const api = (path, opt = {}) => fetch('api/' + path, Object.assign({ cache: 'no-store' }, opt, { headers: { 'X-Lousa': '1' } }));

  /* ---------- Barra superior e doca ---------- */
  function renderChrome() {
    const s = cur(), l = curList();
    document.documentElement.dataset.theme = S.set.theme;
    document.body.classList.toggle('locked', !!S.set.lock);
    $('#top').innerHTML = `<div class="pill"><button class="tbtn brand" data-act="screens" title="Telas">${LOGO}<span>${esc(s ? s.name : 'Lousa')}</span>${ic('down')}</button></div><span class="grow"></span>
<div class="pill"><button class="tbtn" data-act="lists" title="Turmas">${ic('users')}<span class="hidesm">${esc(l ? l.name : 'Turmas')}</span></button>
<button class="tbtn" data-act="annot" title="Anotar por cima da tela">${ic('pen')}</button>
<button class="tbtn" data-act="bg" title="Fundo da tela">${ic('img')}</button>
<button class="tbtn${S.set.lock ? ' on' : ''}" data-act="lock" title="${S.set.lock ? 'Destravar' : 'Travar'} a posição dos widgets">${ic(S.set.lock ? 'lock' : 'unlock')}</button>
<button class="tbtn${S.set.mute ? ' on' : ''}" data-act="mute" title="${S.set.mute ? 'Ligar' : 'Desligar'} os sons">${ic(S.set.mute ? 'mute' : 'snd')}</button>
<button class="tbtn hidesm" data-act="full" title="Tela cheia">${ic('full')}</button>
<button class="tbtn${Sync.error ? ' warn' : ''}" data-act="settings" title="${Sync.on ? (Sync.error ? 'Falha na sincronização' : Sync.last ? 'Sincronizado ' + fmtRel(Sync.last) : 'Sincronizando…') : 'Ajustes'}">${ic(Sync.on ? 'sync' : 'gear')}</button></div>`;
    $('#dock').innerHTML = `<button class="dbtn all" data-act="gallery">${ic('grid')}<span>Widgets</span></button>${S.set.favs.filter(t => W.defs[t]).map(t => `<button class="dbtn" data-add="${t}" title="${esc(W.defs[t].name)}"><i>${W.defs[t].icon}</i><span>${esc(W.defs[t].name)}</span></button>`).join('')}`;
  }
  const chromeSoon = debounce(renderChrome, 300);

  function openScreen(id) {
    Dirty.flush();
    S.set.cur = id; Store.saveSet();
    Stage.render(); renderChrome();
  }
  function fromTemplate(t, name) {
    const s = Store.newScreen(name || t.name, BGS[t.bg]);
    s.widgets = t.w.map(([k, x, y, d]) => Stage.make(k, Math.round(x * VW()), Math.round(y * VH()), 0, 0, d));
    DB.put('screens', s);
    return s;
  }

  /* ---------- Galeria de widgets ---------- */
  function gallery() {
    const m = modal(`Widgets (${Object.keys(W.defs).length})`, '<input class="inp" placeholder="Buscar widget…"><div class="gbox"></div>', 'wide');
    const inp = $('.inp', m.el), box = $('.gbox', m.el);
    const draw = () => {
      const q = norm(inp.value);
      box.innerHTML = CATS.map(cat => {
        const it = Object.values(W.defs).filter(d => d.cat === cat && (!q || norm(d.name).includes(q) || norm(cat).includes(q)));
        return it.length ? `<h3>${cat}</h3><div class="ggrid">${it.map(d => `<div class="gitem"><button class="gadd" data-t="${d.id}"><i>${d.icon}</i><span>${esc(d.name)}</span></button><button class="gfav${S.set.favs.includes(d.id) ? ' on' : ''}" data-fav="${d.id}" title="Fixar na barra de baixo">${ic('star')}</button></div>`).join('')}</div>` : '';
      }).join('') || '<p class="muted">Nenhum widget com esse nome.</p>';
    };
    inp.oninput = draw;
    box.onclick = e => {
      const f = e.target.closest('[data-fav]'), a = e.target.closest('[data-t]');
      if (f) { const t = f.dataset.fav; S.set.favs = S.set.favs.includes(t) ? S.set.favs.filter(x => x !== t) : [...S.set.favs, t]; Store.saveSet(); renderChrome(); draw(); }
      else if (a) { m.close(); Stage.add(a.dataset.t); }
    };
    draw();
    if (!matchMedia('(pointer: coarse)').matches) inp.focus();
  }

  /* ---------- Telas ---------- */
  function screensBox() {
    const m = modal('Telas', '', 'wide');
    const draw = () => {
      m.body.innerHTML = `<div class="list">${S.screens.map(s => `<div class="lrow${s === cur() ? ' on' : ''}"><button class="lmain" data-k="open" data-id="${s.id}"><i class="thumb" style="background:${esc(bgCss(s.bg))}"></i><span><b>${esc(s.name)}</b><small>${count(s.widgets.length, 'widget', 'widgets')}</small></span></button><button class="icon" data-k="ren" data-id="${s.id}" title="Renomear">${ic('pen')}</button><button class="icon" data-k="dup" data-id="${s.id}" title="Duplicar">${ic('copy')}</button><button class="icon" data-k="del" data-id="${s.id}" title="Excluir">${ic('trash')}</button></div>`).join('')}</div>
<div class="row wrap"><button class="btn" data-k="new">${ic('plus')} Nova tela em branco</button></div><h3>Telas prontas</h3><div class="row wrap">${TEMPLATES.map((t, i) => `<button class="btn ghost" data-k="tpl" data-i="${i}">${esc(t.name)}</button>`).join('')}</div>`;
    };
    m.body.onclick = async e => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      const k = b.dataset.k, s = S.screens.find(x => x.id === b.dataset.id);
      if (k === 'open') { openScreen(s.id); m.close(); return; }
      if (k === 'new') { const n = await promptBox('Nome da nova tela', 'Tela ' + (S.screens.length + 1)); if (!n) return; const ns = Store.newScreen(n.trim() || 'Tela'); DB.put('screens', ns); openScreen(ns.id); m.close(); return; }
      if (k === 'tpl') { openScreen(fromTemplate(TEMPLATES[b.dataset.i]).id); m.close(); return; }
      if (k === 'ren') { const n = await promptBox('Nome da tela', s.name); if (n && n.trim()) { s.name = n.trim(); DB.put('screens', s); renderChrome(); } }
      if (k === 'dup') { Dirty.flush(); const c = normScreen(JSON.parse(JSON.stringify(s))); c.id = uid(); c.name = s.name + ' (cópia)'; delete c.seed; c.widgets.forEach(w => { w.id = uid() + rnd(99); }); S.screens.push(c); DB.put('screens', c); }
      if (k === 'del') {
        if (!await confirmBox('Excluir tela', `“${s.name}” e os seus widgets serão excluídos${Sync.on ? ' em todos os computadores sincronizados' : ''}.`, 'Excluir', true)) return;
        const was = s === cur();
        S.screens = S.screens.filter(x => x !== s); DB.del('screens', s.id);
        if (!S.screens.length) DB.put('screens', Store.newScreen('Minha tela'));
        if (was) openScreen(S.screens[0].id);
      }
      draw();
    };
    draw();
  }

  /* ---------- Turmas (listas de nomes) ---------- */
  function listsBox() {
    const m = modal('Turmas', '', 'wide');
    const save = debounce(l => DB.put('lists', l), 500);
    const draw = () => {
      m.body.innerHTML = `<p class="muted">Sorteador, grupos, chamada, pontos e os demais widgets de nomes usam a turma marcada como “em uso”.</p>${S.lists.map(l => `<div class="lcard${l === curList() ? ' on' : ''}" data-id="${l.id}"><div class="row"><input class="inp grow" data-k="name" value="${esc(l.name)}"><button class="btn${l === curList() ? '' : ' ghost'} sm" data-k="use">${l === curList() ? 'Em uso ✓' : 'Usar'}</button><button class="icon" data-k="file" title="Importar nomes de um arquivo .txt ou .csv">${ic('up')}</button><button class="icon" data-k="del" title="Excluir">${ic('trash')}</button></div><textarea class="inp" data-k="names" rows="6" placeholder="Um nome por linha">${esc(l.names)}</textarea><small class="muted">${count(lines(l.names).length, 'aluno', 'alunos')}</small></div>`).join('')}<button class="btn" data-k="new">${ic('plus')} Nova turma</button>`;
    };
    m.body.oninput = e => {
      const card = e.target.closest('.lcard'), l = card && S.lists.find(x => x.id === card.dataset.id);
      if (!l || !e.target.dataset.k) return;
      l[e.target.dataset.k] = e.target.value;
      delete l.seed;
      $('small', card).textContent = count(lines(l.names).length, 'aluno', 'alunos');
      save(l);
    };
    m.body.onclick = async e => {
      const b = e.target.closest('button[data-k]');
      if (!b) return;
      const card = b.closest('.lcard'), l = card && S.lists.find(x => x.id === card.dataset.id), k = b.dataset.k;
      if (k === 'new') { const nl = normList({ id: uid(), name: 'Turma ' + (S.lists.length + 1), names: '' }); S.lists.push(nl); DB.put('lists', nl); S.set.list = nl.id; Store.saveSet(); }
      if (k === 'use') { S.set.list = l.id; Store.saveSet(); }
      if (k === 'file') { const [f] = await pickFiles('.txt,.csv,text/plain'); if (!f) return; l.names = (await f.text()).split(/\r?\n/).map(x => x.split(/[;,\t]/)[0].replace(/^"|"$/g, '').trim()).filter(Boolean).join('\n'); DB.put('lists', l); }
      if (k === 'del') { if (!await confirmBox('Excluir turma', `A turma “${l.name}” será excluída.`, 'Excluir', true)) return; S.lists = S.lists.filter(x => x !== l); DB.del('lists', l.id); }
      draw();
    };
    m.onClose = () => { renderChrome(); Stage.render(); };
    draw();
  }

  /* ---------- Fundo ---------- */
  function bgBox() {
    const s = cur(), m = modal('Fundo da tela', `<div class="bggrid">${BGS.map((b, i) => `<button style="background:${b}" data-i="${i}"></button>`).join('')}</div><div class="row wrap"><button class="btn" data-k="img">${ic('img')} Usar uma imagem…</button><label class="btn ghost">Cor personalizada <input type="color" value="#1f6f5c"></label></div>`);
    const set = bg => { s.bg = bg; Stage.el.style.background = bgCss(bg); touchScreen(); };
    m.body.onclick = async e => {
      const b = e.target.closest('[data-i]');
      if (b) set(BGS[b.dataset.i]);
      else if (e.target.closest('[data-k=img]')) { const src = await pickImage(1920); if (src) { set('img:' + src); m.close(); } }
    };
    $('[type=color]', m.el).oninput = e => set(e.target.value);
  }

  /* ---------- Anotação por cima de tudo ---------- */
  function annotate() {
    const old = $('#annot');
    if (old) return old.remove();
    const w = document.createElement('div'), tool = { color: '#e5484d', size: 5, erase: false };
    w.id = 'annot';
    w.innerHTML = `<canvas></canvas><div class="abar pill">${['#e5484d', '#ffc53d', '#46a758', '#0090ff', '#ffffff', '#1c2024'].map((k, i) => `<button class="dot${i ? '' : ' on'}" style="background:${k}" data-c="${k}"></button>`).join('')}<button class="tbtn" data-k="size" title="Espessura">●</button><button class="tbtn" data-k="erase">Borracha</button><button class="tbtn" data-k="clear">Limpar</button><button class="tbtn" data-k="close">Fechar ${ic('x')}</button></div>`;
    document.body.append(w);
    const cv = $('canvas', w);
    cv.width = innerWidth; cv.height = innerHeight;
    sketch(cv, tool);
    $('.abar', w).onclick = e => {
      const c = e.target.closest('[data-c]'), b = e.target.closest('[data-k]');
      if (c) { tool.color = c.dataset.c; tool.erase = false; $$('.dot', w).forEach(o => o.classList.toggle('on', o === c)); $('[data-k=erase]', w).classList.remove('on'); }
      if (!b) return;
      if (b.dataset.k === 'size') { tool.size = tool.size >= 20 ? 3 : tool.size * 2; b.style.fontSize = 8 + tool.size + 'px'; }
      if (b.dataset.k === 'erase') { tool.erase = !tool.erase; b.classList.toggle('on', tool.erase); }
      if (b.dataset.k === 'clear') cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
      if (b.dataset.k === 'close') w.remove();
    };
  }

  /* ---------- Backup ---------- */
  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    toast('Salvo em Downloads: ' + name);
  }
  const backupData = () => JSON.stringify({ app: 'lousa', version: 1, exported: Date.now(), screens: S.screens, lists: S.lists });
  async function importBackup(files) {
    let total = 0;
    for (const f of files) {
      try {
        const j = JSON.parse(await f.text());
        if (j.app !== 'lousa' || !Array.isArray(j.screens)) throw new Error('não é um backup da Lousa');
        for (const st of DB.SYNCED) for (const o of j[st] || []) {
          if (!o || !o.id) continue;
          (st === 'screens' ? normScreen : normList)(o);
          const i = S[st].findIndex(x => x.id === o.id);
          if (i >= 0) S[st][i] = o; else S[st].push(o);
          DB.put(st, o); total++;
        }
      } catch (e) { toast(`Falha ao importar “${f.name}”: ${e.message}`); }
    }
    if (total) { toast(count(total, 'item importado', 'itens importados')); Stage.render(); renderChrome(); }
    return total > 0;
  }

  /* ---------- Sincronização com pasta do Google Drive (só no app de Windows) ---------- */
  async function syncInfo(r) {
    try {
      r = r || await api('sync/info');
      if (!r.ok) throw new Error('sem API');
      const j = await r.json();
      Object.assign(Sync, { avail: true, on: j.enabled, folder: j.folder, detected: j.detected, drives: j.drives || [] });
    } catch (e) { Sync.avail = Sync.on = false; }
  }
  const syncSig = d => DB.SYNCED.map(st => (d[st] || []).map(o => o.id + ':' + (o.mod || 0)).sort().join(',')).join('|') + '|' + Object.keys(d.tombstones || {}).sort().join(',');
  function mergeRemote(remote) {
    const tomb = DB.tomb(), changed = new Set();
    for (const [k, ts] of Object.entries(remote.tombstones || {})) {
      const [st, id] = k.split(':');
      if (DB.SYNCED.includes(st)) {
        const i = S[st].findIndex(o => o.id === id);
        if (i >= 0 && (S[st][i].mod || 0) <= ts) { S[st].splice(i, 1); DB.del(st, id, true); changed.add(id); }
      }
      if (!(tomb[k] >= ts)) tomb[k] = ts;
    }
    for (const st of DB.SYNCED) for (const o of remote[st] || []) {
      if (!o || !o.id || (tomb[st + ':' + o.id] || 0) >= (o.mod || 0)) continue;
      const i = S[st].findIndex(x => x.id === o.id);
      if (i >= 0 && (o.mod || 0) <= (S[st][i].mod || 0)) continue;
      (st === 'screens' ? normScreen : normList)(o);
      if (i < 0) S[st].push(o); else S[st][i] = o;
      DB.put(st, o, true); changed.add(o.id);
    }
    DB.saveTomb();
    return changed;
  }
  /* Primeira sincronização num computador novo: troca a tela e a turma de exemplo pelo que já está no Drive. */
  function dropSeed() {
    for (const st of DB.SYNCED) S[st].filter(o => o.seed).forEach(o => { S[st] = S[st].filter(x => x !== o); DB.del(st, o.id, true); });
  }
  async function syncNow(manual) {
    if (!Sync.on && !GSync.on()) return;
    if (Sync.busy) { Sync.again = true; return; }
    Sync.busy = true;
    try {
      Dirty.flush();
      const r = await (Sync.on ? api('sync') : GSync.io());
      if (!r.ok) throw new Error('não foi possível ler a pasta');
      const text = r.status === 200 ? await r.text() : '', remote = text.trim() ? JSON.parse(text) : null, before = cur() && cur().id;
      let changed = new Set();
      if (remote && remote.app === 'lousa') {
        if (!S.set.syncedOnce && (remote.screens || []).length) dropSeed();
        changed = mergeRemote(remote);
      }
      const local = { app: 'lousa', version: 1, exported: Date.now(), screens: S.screens, lists: S.lists, tombstones: DB.tomb() };
      if (!remote || syncSig(remote) !== syncSig(local)) {
        const w = await (Sync.on ? api('sync', { method: 'POST', body: JSON.stringify(local) }) : GSync.io({ method: 'POST', body: JSON.stringify(local) }));
        if (!w.ok) throw new Error('não foi possível gravar na pasta');
      }
      if (!S.set.syncedOnce) { S.set.syncedOnce = true; Store.saveSet(); }
      Sync.last = Date.now(); Sync.error = '';
      if (!S.screens.length) DB.put('screens', Store.newScreen('Minha tela'));
      if (!cur() || cur().id !== before || changed.has(before) || (curList() && changed.has(curList().id))) { S.set.cur = cur().id; Stage.render(); }
      chromeSoon();
      if (manual) toast(changed.size ? `Sincronizado: ${count(changed.size, 'item atualizado', 'itens atualizados')}` : 'Sincronizado com o Google Drive');
    } catch (e) {
      console.error(e); Sync.error = e.message; chromeSoon();
      if (manual) toast('Falha ao sincronizar: ' + e.message);
    }
    Sync.busy = false;
    if (Sync.again) { Sync.again = false; syncSoon(); }
  }
  const syncSoon = debounce(() => syncNow(), 4000);
  async function syncConfig(route, body) {
    await syncInfo(await api(route, { method: 'POST', body }));
    if (Sync.on) await syncNow(true); else renderChrome();
  }

  /* ---------- Ajustes ---------- */
  async function install() {
    if (Inst.prompt) { Inst.prompt.prompt(); await Inst.prompt.userChoice; Inst.prompt = null; }
    else modal('Instalar no iPhone ou iPad', '<p>No Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>', 'small');
  }
  function settings() {
    const m = modal('Ajustes', '');
    const draw = () => {
      m.body.innerHTML = `<label>Aparência dos widgets</label><div class="row wrap"><button class="btn${S.set.theme === 'light' ? '' : ' ghost'} sm" data-k="light">Claros</button><button class="btn${S.set.theme === 'dark' ? '' : ' ghost'} sm" data-k="dark">Escuros</button></div>
${Sync.avail ? `<label>Sincronização com o Google Drive</label>
<p>${Sync.on ? `Ativa em <b>${esc(Sync.folder)}</b>${Sync.error ? ` · <span class="err">${esc(Sync.error)}</span>` : Sync.last ? ` · última vez ${fmtRel(Sync.last)}` : ''}` : Sync.detected ? 'Desativada. Google Drive encontrado neste computador.' : 'Desativada. Não encontrei o Google Drive; escolha uma pasta sincronizada.'}</p>
<div class="row wrap">${Sync.on ? `<button class="btn ghost sm" data-k="syncnow">${ic('sync')} Sincronizar agora</button><button class="btn ghost sm" data-k="syncoff">Desativar</button>` : Sync.detected ? '<button class="btn sm" data-k="syncauto">Ativar no Google Drive</button>' : ''}<button class="btn ghost sm" data-k="syncpick">Escolher outra pasta…</button></div>
${Sync.drives.length > 1 ? `<p class="muted">Há mais de uma conta do Google Drive neste computador: cada unidade (G:, H:…) é uma conta.</p><div class="row wrap">${Sync.drives.map(d => `<button class="btn ghost sm" data-k="syncuse" data-path="${esc(d)}">${esc(d)}</button>`).join('')}</div>` : ''}
<p class="muted">A Lousa grava o arquivo lousa-sync.json na pasta e o Google Drive leva para os outros computadores.</p>`
        : GSync.web ? GSync.html() : '<label>Sincronização</label><p class="muted">A sincronização automática pelo Google Drive funciona no aplicativo de Windows (Lousa.exe). Aqui, as telas e turmas ficam guardadas neste aparelho: use o backup para levar a outro lugar.</p>'}
<label>Backup</label><div class="row wrap"><button class="btn ghost sm" data-k="export">${ic('dl')} Exportar backup</button><button class="btn ghost sm" data-k="import">${ic('up')} Importar…</button></div>
${canInstall() ? `<label>Aplicativo</label><div class="row"><button class="btn sm" data-k="install">${ic('dl')} Instalar o aplicativo</button></div>` : ''}
<label>Zona de perigo</label><div class="row"><button class="btn danger sm" data-k="wipe">${ic('trash')} Apagar tudo deste aparelho</button></div>
<p class="muted">Lousa ${VERSION} · ${Object.keys(W.defs).length} widgets · os dados ficam neste aparelho${Sync.on ? ' e na sua pasta do Drive' : ''}.</p>`;
    };
    m.body.onclick = async e => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      const k = b.dataset.k;
      if (k === 'light' || k === 'dark') { S.set.theme = k; Store.saveSet(); renderChrome(); }
      if (k === 'syncnow') await syncNow(true);
      if (k === 'syncoff') await syncConfig('sync/config', 'off');
      if (k === 'syncauto') await syncConfig('sync/config', 'auto');
      if (k === 'syncuse') await syncConfig('sync/config', b.dataset.path);
      if (k === 'syncpick') { toast('Escolha a pasta na janela que abriu'); await syncConfig('sync/choose', ''); }
      if (k === 'export') { Dirty.flush(); saveBlob(new Blob([backupData()], { type: 'application/json' }), `lousa-backup-${dayKey(Date.now())}.json`); }
      if (k === 'import') { if (await importBackup(await pickFiles('.json,application/json', true))) return m.close(); }
      if (k === 'install') return install();
      if (k === 'wipe') {
        if (!await confirmBox('Apagar tudo', 'Todas as telas e turmas deste aparelho serão apagadas. Isso não pode ser desfeito.' + (Sync.on ? ' A sincronização será desativada e a cópia no Google Drive continua lá.' : ''), 'Apagar tudo', true)) return;
        if (Sync.on) await api('sync/config', { method: 'POST', body: 'off' }); GSync.off();
        for (const st of DB.STORES) await DB.clear(st);
        location.reload();
        return;
      }
      draw();
    };
    draw();
  }

  /* ---------- Ações da barra ---------- */
  const ACT = {
    gallery, settings, screens: screensBox, lists: listsBox, bg: bgBox, annot: annotate,
    lock() { S.set.lock = !S.set.lock; Store.saveSet(); renderChrome(); toast(S.set.lock ? 'Widgets travados no lugar' : 'Widgets destravados'); },
    mute() { S.set.mute = !S.set.mute; Store.saveSet(); renderChrome(); if (!S.set.mute) Snd.chime(); },
    full() { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => toast('Tela cheia não disponível aqui')); },
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'), add = e.target.closest('[data-add]');
    if (a && ACT[a.dataset.act]) ACT[a.dataset.act]();
    else if (add) Stage.add(add.dataset.add);
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const m = $$('.modalwrap').pop();
    if (m) $('[data-x]', m).click(); else if ($('#annot')) $('#annot').remove();
  });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', async e => {
    e.preventDefault();
    for (const f of e.dataTransfer.files) {
      if (/\.json$/i.test(f.name)) await importBackup([f]);
      else if (/^image\//.test(f.type)) { try { Stage.add('image', { src: await shrinkImage(f, 1600) }); } catch (err) { toast('Não consegui abrir essa imagem'); } }
    }
  });
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); Inst.prompt = e; });

  async function init() {
    Stage.el = $('#stage');
    Stage.el.addEventListener('pointerdown', e => { if (e.target === Stage.el) $$('.win.active').forEach(w => w.classList.remove('active')); });
    await Store.load();
    if (!S.screens.length) {
      const l = normList({ id: uid(), name: 'Turma de exemplo', names: 'Ana\nBruno\nCarla\nDiego\nElisa\nFelipe\nGabi\nHugo\nIsa\nJoão\nLara\nMiguel', seed: true });
      if (!S.lists.length) { S.lists.push(l); DB.put('lists', l, true); S.set.list = l.id; }
      const s = fromTemplate(TEMPLATES[0], 'Minha tela');
      s.seed = true; s.mod = 0;
      DB.put('screens', s, true);
      Store.saveSet();
    }
    S.set.cur = cur().id;
    renderChrome(); Stage.render();
    if (location.protocol === 'https:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(e => console.warn('Sem modo offline:', e));
    if (/^https?:$/.test(location.protocol)) await syncInfo();
    if (Sync.avail || GSync.web) {
      GSync.onChange = () => syncNow(true);
      const first = Sync.on && !S.set.syncedOnce;
      DB.onChange = () => { if (Sync.on || GSync.on()) syncSoon(); };
      await syncNow();
      if (first && !Sync.error) toast('Sincronizando com o Google Drive: ' + Sync.folder);
      setInterval(() => syncNow(), 60000);
      addEventListener('focus', () => syncNow());
    }
    renderChrome();
  }
  init();
})();
