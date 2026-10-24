// Creative Hub — front-end (vanilla JS, sem build).
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ic = (name, size = 16) => {
  const p = {
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    wand: '<path d="m15 4 5 5L9 20H4v-5z"/><path d="M19 3v2M21 4h-2M5 3v2M6 4H4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-4.5-4.5L8 19"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 21 9.7C21 6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    brush: '<path d="M14 4 20 10l-8 8H6v-6z"/><path d="M4 20h4"/>',
    vector: '<circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M7 19c6 0 10-4 10-12"/>',
    cube: '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5"/>',
    type: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/>',
  }[name];
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
};

const STYLES = [
  { id: 'photo', label: 'Foto', icon: 'camera', prompt: 'professional photography, realistic, high detail' },
  { id: 'illustration', label: 'Ilustração', icon: 'brush', prompt: 'digital illustration, expressive, polished' },
  { id: 'vector', label: 'Vetor', icon: 'vector', prompt: 'flat vector illustration, clean shapes, crisp edges' },
  { id: '3d', label: '3D', icon: 'cube', prompt: '3d render, soft global illumination, octane quality' },
  { id: 'typography', label: 'Tipografia', icon: 'type', prompt: 'graphic design layout, bold readable typography, social media post' },
];
const ASPECTS = ['1:1', '4:5', '9:16', '16:9', '4:3'];

const state = {
  config: { hasKey: false, models: [] },
  clients: [],
  history: [],
  view: 'hub',
  clientId: null,
  folder: 'Geral',
  galleryFolder: null,
  threads: {},
  dsOpen: window.innerWidth > 1100,
  modelOpen: false,
  search: '',
  c: { prompt: '', style: 'photo', aspect: '1:1', num: 2, model: 'auto', useBrand: true, kwOff: new Set(), override: null },
};

const api = async (url, opts = {}) => {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts, body: opts.body && JSON.stringify(opts.body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
};
const client = () => state.clients.find((c) => c.id === state.clientId);
const threadKey = () => `${state.clientId}::${state.folder}`;
const toast = (msg) => {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
};

// ---------- inteligência local: recomendação de modelo + prompt de marca ----------
function recommend(prompt, style) {
  const p = prompt.toLowerCase();
  const wantsText = /["“”']|texto|escrito|tipograf|headline|t[ií]tulo|banner|post com|frase|logo/.test(p) || style === 'typography';
  if (wantsText) return { id: 'fal-ai/ideogram/v3', why: 'Pedido com texto na imagem — Ideogram renderiza tipografia legível e aceita a paleta da marca.' };
  if (style === 'vector' || /[ií]cone|vetor|sticker|mascote|flat/.test(p)) return { id: 'fal-ai/recraft/v3/text-to-image', why: 'Peça vetorial/ilustrada — Recraft recebe as cores do design system como restrição.' };
  if (style === 'illustration') return { id: 'fal-ai/recraft/v3/text-to-image', why: 'Ilustração digital com cores da marca — Recraft V3.' };
  if (style === '3d') return { id: 'fal-ai/nano-banana', why: 'Render 3D/conceitual com boa coerência de composição — Nano Banana.' };
  if (/rascunho|r[aá]pido|ideias|varia[cç]/.test(p)) return { id: 'fal-ai/flux/schnell', why: 'Exploração rápida e barata — FLUX Schnell.' };
  return { id: 'fal-ai/flux-pro/v1.1-ultra', why: 'Fotografia publicitária — FLUX 1.1 Pro Ultra entrega o maior realismo.' };
}
const activeModel = () => (state.c.model === 'auto' ? recommend(state.c.prompt, state.c.style).id : state.c.model);
const modelInfo = (id) => state.config.models.find((m) => m.id === id) || { label: id };

function brandPrompt() {
  const c = client(); const s = STYLES.find((x) => x.id === state.c.style);
  const base = state.c.prompt.trim().replace(/[.\s]+$/, '') || '(descreva a peça)';
  if (!c || !state.c.useBrand) return `${base}. ${s.prompt}.`;
  const ds = c.designSystem;
  const kws = ds.keywords.filter((k) => !state.c.kwOff.has(k));
  return [
    `${base}.`,
    `${s.prompt}.`,
    kws.length ? `Visual language: ${kws.join(', ')}.` : '',
    `Brand color palette: ${ds.palette.join(', ')}.`,
    `Mood: ${ds.tone}.`,
    state.c.style === 'typography' ? `Typography inspired by ${ds.fonts.join(' and ')}.` : '',
    !modelInfo(activeModel()).negative && ds.avoid?.length ? `Avoid ${ds.avoid.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
}
const finalPrompt = () => state.c.override ?? brandPrompt();

// ---------- sidebar ----------
function renderSidebar() {
  const c = client();
  const counts = state.history.reduce((a, h) => ((a[h.clientId + h.folder] = (a[h.clientId + h.folder] || 0) + 1), a), {});
  $('#sidebar').innerHTML = `
    <div class="brand">
      <div class="orb"></div><span class="brand-name">Creative Hub</span>
      <button class="icon-btn" data-action="nav" data-view="hub" title="Buscar cliente">${ic('search')}</button>
      <button class="icon-btn" data-action="toggle-side" title="Fechar menu">${ic('panel')}</button>
    </div>
    <button class="btn-new" data-action="new-creation">${ic('spark')} Nova criação</button>
    <button class="nav-item ${state.view === 'hub' ? 'active' : ''}" data-action="nav" data-view="hub">${ic('users', 18)} Clientes <span class="count">${state.clients.length}</span></button>
    <button class="nav-item ${state.view === 'studio' ? 'active' : ''}" data-action="nav" data-view="studio" ${c ? '' : 'disabled'}>${ic('chat', 18)} Estúdio</button>
    <button class="nav-item ${state.view === 'gallery' ? 'active' : ''}" data-action="nav" data-view="gallery" ${c ? '' : 'disabled'}>${ic('grid', 18)} Galeria</button>
    <div class="side-sep"></div>
    <div class="side-label"><span>Clientes</span><button data-action="add-client" title="Novo cliente">${ic('plus', 14)}</button></div>
    ${state.clients.map((cl) => `
      <button class="client-row ${cl.id === state.clientId ? 'active' : ''}" data-action="open-client" data-id="${cl.id}">
        <span class="dot" style="background:linear-gradient(135deg,${cl.designSystem.palette[0]},${cl.designSystem.palette[1]})"></span>
        <span class="name">${esc(cl.name)}</span>
      </button>
      ${cl.id === state.clientId ? cl.folders.map((f) => `
        <button class="client-row folder-row ${f === state.folder && state.view === 'studio' ? 'active' : ''}" data-action="open-folder" data-folder="${esc(f)}">
          ${ic('folder', 14)}<span class="name">${esc(f)}</span><span class="count">${counts[cl.id + f] || ''}</span>
        </button>`).join('') + `
        <button class="client-row folder-row" data-action="add-folder">${ic('plus', 14)}<span class="name">Nova pasta</span></button>` : ''}
    `).join('')}
    <div class="side-spacer"></div>
    <div class="api-card">
      <strong><span class="status-dot ${state.config.hasKey ? '' : 'off'}"></span>${state.config.demo ? 'Modo demo' : state.config.hasKey ? 'fal.ai conectada' : 'Chave fal.ai ausente'}</strong>
      ${state.config.demo ? 'Imagens de placeholder, sem custo. Rode <code>npm start</code> para gerar de verdade.' : state.config.hasKey ? `${state.config.models.length} modelos de imagem + LLM para refinar prompts.` : 'Crie o arquivo <code>.env</code> com <code>FAL_KEY</code> e reinicie o servidor.'}
    </div>
    <div class="user-row"><span class="avatar">GO</span><span>Agência</span></div>`;
}

// ---------- hub ----------
function renderHub() {
  const q = state.search.toLowerCase();
  const list = state.clients.filter((c) => !q || (c.name + c.segment).toLowerCase().includes(q));
  return `
    <div class="topbar"><button class="icon-btn menu-btn" data-action="toggle-side">${ic('menu', 18)}</button></div>
    <div class="scroll"><div class="hub">
      <div class="hub-hero">
        <p class="eyebrow">Hub criativo da agência · fal.ai</p>
        <h1>Para qual cliente vamos criar hoje?</h1>
        <label class="search">${ic('search')}<input id="search" placeholder="Buscar cliente ou segmento…" value="${esc(state.search)}" /></label>
      </div>
      <div class="client-grid">
        ${list.map((c) => {
          const ds = c.designSystem; const hist = state.history.filter((h) => h.clientId === c.id);
          const thumbs = hist.flatMap((h) => h.images).slice(0, 3);
          return `
          <button class="client-card" data-action="open-client" data-id="${c.id}" style="--c1:${ds.palette[0]};--c2:${ds.palette[1]};--c3:${ds.palette[2]}">
            <div class="cc-cover">
              <div class="monogram">${esc(c.monogram || c.name.slice(0, 2))}</div>
              <div class="cc-thumbs">${thumbs.map((t) => `<img src="${t.src}" alt="" loading="lazy">`).join('')}</div>
            </div>
            <div class="cc-body">
              <div><h3>${esc(c.name)}</h3><p>${esc(c.segment)}</p></div>
              <div class="swatches">${ds.palette.map((p) => `<span style="background:${p}" title="${p}"></span>`).join('')}</div>
              <div class="meta-row"><span>${ic('type', 13)} ${esc(ds.fonts.join(' · '))}</span></div>
              <div class="meta-row"><span>${ic('folder', 13)} ${c.folders.length} pastas</span><span>${ic('image', 13)} ${hist.length} criações</span></div>
              <div class="cc-foot"><span>${esc(ds.tone)}</span><span class="go">Abrir ${ic('arrow', 14)}</span></div>
            </div>
          </button>`;
        }).join('')}
        <button class="client-card add" data-action="add-client">${ic('plus', 22)}<span>Novo cliente</span><small style="color:var(--faint)">Cores, fontes e linguagem visual</small></button>
      </div>
      <div class="flow">
        <div><span class="n">01 · CLIENTE</span><b>Escolha a marca</b><small>Carrega design system, pastas e histórico.</small></div>
        <div><span class="n">02 · BRIEFING</span><b>Descreva a peça</b><small>Em português, do jeito que você falaria.</small></div>
        <div><span class="n">03 · LINGUAGEM</span><b>Estilo + modelo</b><small>Recomendamos o modelo certo para o pedido.</small></div>
        <div><span class="n">04 · ENTREGA</span><b>Gera e salva</b><small>Direto na pasta do cliente, pronto para baixar.</small></div>
      </div>
    </div></div>`;
}

// ---------- studio ----------
function resultCard(t) {
  const ratio = t.aspect.replace(':', ' / ');
  const stateHtml = {
    queue: `<span class="state"><span class="spinner"></span>Na fila${t.position != null ? ` · posição ${t.position + 1}` : ''}</span>`,
    run: `<span class="state"><span class="spinner"></span>Gerando…</span>`,
    done: `<span class="state" style="color:var(--ok)">Salvo em ${esc(t.folder)}</span>`,
    error: `<span class="state err">Falhou</span>`,
  }[t.status];
  const imgs = t.result?.images || [];
  return `
  <div class="turn" data-turn="${t.id}">
    <div class="bubble">${esc(t.userPrompt)}</div>
    <div class="result">
      <div class="result-head"><span class="mini"></span><b style="color:var(--text);font-weight:500">${esc(modelInfo(t.model).label)}</b>
        <span>· ${t.aspect}</span><span>· ${esc(STYLES.find((s) => s.id === t.style)?.label)}</span>${stateHtml}</div>
      ${t.status === 'error' ? `<p class="err">${esc(t.error)}</p>` : `
      <div class="images">
        ${imgs.length ? imgs.map((im, i) => `
          <div class="img-tile" style="aspect-ratio:${ratio}">
            <img src="${im.src}" alt="${esc(t.userPrompt)}" data-action="lightbox" data-entry="${t.result.id}" data-i="${i}">
            <div class="actions">
              <a href="${im.src}" download title="Baixar">${ic('down')}</a>
              <button data-action="lightbox" data-entry="${t.result.id}" data-i="${i}" title="Detalhes">${ic('layers')}</button>
            </div>
          </div>`).join('')
        : Array.from({ length: t.num }, () => `<div class="img-tile skeleton" style="aspect-ratio:${ratio}"></div>`).join('')}
      </div>`}
      <details class="final-prompt"><summary>Prompt enviado à fal.ai</summary><p>${esc(t.prompt)}</p></details>
      ${t.status === 'done' || t.status === 'error' ? `<div class="result-foot">
        <button class="chip" data-action="rerun" data-turn="${t.id}">${ic('refresh', 14)} Gerar de novo</button>
        <button class="chip" data-action="reuse" data-turn="${t.id}">${ic('copy', 14)} Editar prompt</button>
      </div>` : ''}
    </div>
  </div>`;
}

function renderStudio() {
  const c = client(); const ds = c.designSystem;
  const turns = state.threads[threadKey()] || [];
  const recent = state.history.filter((h) => h.clientId === c.id && h.folder === state.folder).slice(0, 8);
  const rec = recommend(state.c.prompt, state.c.style);
  const mid = activeModel(); const m = modelInfo(mid);
  return `
  <div class="studio">
    <div class="topbar">
      <button class="icon-btn menu-btn" data-action="toggle-side">${ic('menu', 18)}</button>
      <div class="crumbs">
        <button class="hide-sm" data-action="nav" data-view="hub">Clientes</button><span class="hide-sm">/</span>
        <b>${esc(c.name)}</b><span>/</span>
        <label class="chip">${ic('folder', 14)}<select id="folderSel" aria-label="Pasta de destino">${c.folders.map((f) => `<option ${f === state.folder ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
      </div>
      <span class="spacer"></span>
      <button class="chip hide-sm" data-action="nav" data-view="gallery">${ic('grid', 14)} Galeria</button>
      <button class="chip ${state.dsOpen ? 'on' : ''}" data-action="toggle-ds">${ic('palette', 14)}<span class="hide-sm">Design system</span></button>
    </div>
    <div class="feed" id="feed"><div class="feed-inner">
      ${turns.length ? turns.map(resultCard).join('') : `
      <div class="hero">
        <div class="big-orb">${esc(c.monogram || c.name.slice(0, 2))}</div>
        <p class="eyebrow">Criando para ${esc(c.name)}</p>
        <h1>O que vamos criar hoje?</h1>
        <div class="suggestions">
          ${(c.suggestions || []).slice(0, 3).map((s) => `
            <button class="suggestion" data-action="suggest" data-text="${esc(s)}"><span>${esc(s)}</span>${ic(/texto|"/.test(s) ? 'type' : 'image', 20)}</button>`).join('')}
        </div>
        ${recent.length ? `<div class="recent-strip"><h4>Últimas criações em ${esc(state.folder)}</h4><div class="row">
          ${recent.flatMap((h) => h.images.map((im, i) => `<img src="${im.src}" alt="" data-action="lightbox" data-entry="${h.id}" data-i="${i}" loading="lazy">`)).join('')}
        </div></div>` : ''}
      </div>`}
    </div></div>
    <div class="composer-wrap">
      <div class="composer">
        <div class="composer-top">${ic('wand', 20)}
          <textarea id="prompt" rows="1" placeholder="Descreva a peça para ${esc(c.name)}… (ex: post de lançamento com o texto &quot;Novidade&quot;)">${esc(state.c.prompt)}</textarea>
        </div>
        <div class="context-chips">
          <button class="chip ctx ${state.c.useBrand ? 'on' : ''}" data-action="toggle-brand" title="Aplicar design system ao prompt">
            ${ds.palette.slice(0, 3).map((p) => `<span class="sw" style="background:${p}"></span>`).join('')} DS ${esc(c.name)} ${state.c.useBrand ? 'ativo' : 'desligado'}
          </button>
          <span class="chip ctx">${ic('folder', 12)} ${esc(state.folder)}</span>
          ${state.c.override != null ? `<button class="chip ctx on" data-action="clear-override" title="Voltar ao prompt automático">${ic('spark', 12)} Prompt refinado pela IA ${ic('close', 12)}</button>` : ''}
        </div>
        <div class="composer-bar">
          <div class="seg" role="group" aria-label="Linguagem visual">
            ${STYLES.map((s) => `<button class="${state.c.style === s.id ? 'on' : ''}" data-action="style" data-id="${s.id}" title="${s.label}">${ic(s.icon, 15)}<span class="hide-sm">${state.c.style === s.id ? s.label : ''}</span></button>`).join('')}
          </div>
          <label class="chip"><select id="aspectSel" aria-label="Formato">${ASPECTS.map((a) => `<option ${a === state.c.aspect ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
          <label class="chip hide-sm"><select id="numSel" aria-label="Quantidade">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${n === state.c.num ? 'selected' : ''}>${n} img</option>`).join('')}</select></label>
          <div class="bar-right">
          <button class="chip" data-action="enhance" title="Reescrever o prompt com IA usando o design system">${ic('spark', 14)}<span class="lbl">Refinar com IA</span></button>
          <div class="model-btn">
            <button class="chip" data-action="toggle-models">${state.c.model === 'auto' ? '<span class="badge">Auto</span>' : ''} ${esc(m.label)} ${ic('chev', 14)}</button>
            ${state.modelOpen ? `<div class="popover">
              <button class="model-opt ${state.c.model === 'auto' ? 'on' : ''}" data-action="pick-model" data-id="auto"><b>Automático <span class="badge">Recomendado</span></b><span></span><small>Escolhe o melhor modelo para o pedido e a linguagem visual.</small></button>
              ${state.config.models.map((x) => `
                <button class="model-opt ${state.c.model === x.id ? 'on' : ''}" data-action="pick-model" data-id="${x.id}">
                  <b>${esc(x.label)} ${x.id === rec.id ? '<span class="badge">Ideal agora</span>' : ''}</b><small style="grid-column:auto">${esc(x.tag)}</small>
                  <small>${esc(x.best)}</small>
                  <span class="meters">${[['Velocidade', x.speed], ['Qualidade', x.quality], ['Texto', x.text]].map(([l, v]) => `<span class="meter">${l}&nbsp;${Array.from({ length: 5 }, (_, i) => `<i class="${i < v ? 'f' : ''}"></i>`).join('')}</span>`).join('')}</span>
                </button>`).join('')}
              <div class="why">${ic('spark', 12)} ${esc(rec.why)}</div>
            </div>` : ''}
          </div>
          <button class="send" data-action="generate" title="Gerar (Ctrl+Enter)" ${state.config.hasKey ? '' : 'disabled'}>${ic('up', 18)}</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ---------- design system panel ----------
function renderDS() {
  const panel = $('#dsPanel'); const c = client();
  panel.classList.toggle('open', state.view === 'studio' && state.dsOpen && !!c);
  if (!c || state.view !== 'studio') { panel.innerHTML = ''; return; }
  const ds = c.designSystem; const m = modelInfo(activeModel());
  panel.innerHTML = `<div class="ds-inner">
    <div class="ds-head"><span class="dot" style="width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,${ds.palette[0]},${ds.palette[1]})"></span><h3>Design system · ${esc(c.name)}</h3>
      <button class="icon-btn" data-action="toggle-ds" title="Fechar">${ic('close')}</button></div>
    <div class="toggle"><span>Aplicar marca no prompt</span><button class="switch ${state.c.useBrand ? 'on' : ''}" data-action="toggle-brand" aria-label="Aplicar marca"></button></div>
    <div class="ds-section"><h5>Paleta ${m.brandColors ? '<span style="color:var(--accent)">enviada ao modelo</span>' : '<span>descrita no prompt</span>'}</h5>
      <div class="palette">${ds.palette.map((p) => `<div style="background:${p};color:${luma(p) > 150 ? '#111' : '#fff'}">${p}</div>`).join('')}</div></div>
    <div class="ds-section"><h5>Tipografia</h5>
      ${ds.fonts.map((f, i) => `<div class="font-sample"><big style="font-family:'${esc(f)}',serif;font-weight:${i ? 400 : 600}">Aa ${esc(c.name.split(' ')[0])}</big><small>${esc(f)} · ${i ? 'texto' : 'títulos'}</small></div>`).join('')}</div>
    <div class="ds-section"><h5>Linguagem visual <span>clique para ligar/desligar</span></h5>
      <div class="kw">${ds.keywords.map((k) => `<button class="chip ${state.c.kwOff.has(k) ? '' : 'on'}" data-action="kw" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div></div>
    <div class="ds-section"><h5>Tom</h5><p style="margin:0;color:var(--muted)">${esc(ds.tone)}</p></div>
    ${ds.avoid?.length ? `<div class="ds-section"><h5>Evitar ${m.negative ? '<span style="color:var(--accent)">negative prompt</span>' : ''}</h5><div class="kw">${ds.avoid.map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</div></div>` : ''}
    <div class="ds-section"><h5>Prompt final <span>${state.c.override != null ? 'editado' : 'automático'}</span></h5>
      <textarea id="finalPrompt" aria-label="Prompt final">${esc(finalPrompt())}</textarea>
      <p class="hint">É exatamente isto que vai para a fal.ai. Edite à vontade ou use “Refinar com IA”.</p></div>
  </div>`;
}
const luma = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };

// ---------- gallery ----------
function renderGallery() {
  const c = client();
  const items = state.history.filter((h) => h.clientId === c.id && (!state.galleryFolder || h.folder === state.galleryFolder));
  return `
    <div class="topbar">
      <button class="icon-btn menu-btn" data-action="toggle-side">${ic('menu', 18)}</button>
      <div class="crumbs"><b>${esc(c.name)}</b><span>/</span><span>Galeria</span></div><span class="spacer"></span>
      <button class="btn primary" data-action="nav" data-view="studio">${ic('spark', 15)} Criar</button>
    </div>
    <div class="scroll"><div class="gallery">
      <div class="filters">
        <button class="chip ${!state.galleryFolder ? 'on' : ''}" data-action="gfolder" data-folder="">Todas</button>
        ${c.folders.map((f) => `<button class="chip ${state.galleryFolder === f ? 'on' : ''}" data-action="gfolder" data-folder="${esc(f)}">${ic('folder', 13)} ${esc(f)}</button>`).join('')}
      </div>
      ${items.length ? `<div class="masonry">${items.flatMap((h) => h.images.map((im, i) => `
        <figure data-action="lightbox" data-entry="${h.id}" data-i="${i}">
          <img src="${im.src}" alt="${esc(h.prompt)}" loading="lazy">
          <figcaption><span>${esc(h.prompt)}</span><span style="white-space:nowrap">${esc(h.modelLabel)}</span></figcaption>
        </figure>`)).join('')}</div>` : `<div class="empty">Nada por aqui ainda. Gere a primeira peça no Estúdio.</div>`}
    </div></div>`;
}

// ---------- render ----------
function render() {
  const c = client();
  const root = document.documentElement.style;
  root.setProperty('--brand-a', c && state.view !== 'hub' ? c.designSystem.palette[0] : '#c084fc');
  root.setProperty('--brand-b', c && state.view !== 'hub' ? c.designSystem.palette[1] : '#7c3aed');
  renderSidebar();
  $('#view').innerHTML = state.view === 'hub' || !c ? renderHub() : state.view === 'gallery' ? renderGallery() : renderStudio();
  renderDS();
  const ta = $('#prompt'); if (ta) autosize(ta);
  const feed = $('#feed'); if (feed) feed.scrollTop = feed.scrollHeight;
}
const autosize = (ta) => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'; };
// Atualizações leves que não podem roubar o foco do textarea
function refreshLive() {
  const fp = $('#finalPrompt'); if (fp && document.activeElement !== fp) fp.value = finalPrompt();
}

function openClient(id) {
  const c = state.clients.find((x) => x.id === id);
  state.clientId = id; state.folder = c.folders[0]; state.view = 'studio';
  state.c = { ...state.c, prompt: '', style: c.designSystem.defaultStyle || 'photo', aspect: c.designSystem.defaultAspect || '1:1', override: null, kwOff: new Set() };
  $('#sidebar').classList.remove('open');
  render();
}

// ---------- generation ----------
async function generate(fromTurn) {
  const c = client();
  const userPrompt = fromTurn?.userPrompt ?? state.c.prompt.trim();
  if (!userPrompt) { $('#prompt')?.focus(); return toast('Escreva o que você quer criar'); }
  const turn = fromTurn ? { ...fromTurn, id: crypto.randomUUID(), status: 'queue', result: null, error: null } : {
    id: crypto.randomUUID(), userPrompt, prompt: finalPrompt(), model: activeModel(), aspect: state.c.aspect,
    style: state.c.style, num: state.c.num, folder: state.folder, useBrand: state.c.useBrand, status: 'queue',
  };
  (state.threads[threadKey()] ||= []).push(turn);
  if (!fromTurn) { state.c.prompt = ''; state.c.override = null; }
  render();
  try {
    const { jobId } = await api('/api/generate', { method: 'POST', body: {
      clientId: c.id, folder: turn.folder, userPrompt: turn.userPrompt, prompt: turn.prompt, model: turn.model,
      aspect: turn.aspect, style: turn.style, numImages: turn.num, useBrand: turn.useBrand,
      palette: c.designSystem.palette, negative: (c.designSystem.avoid || []).join(', '),
    } });
    for (;;) {
      await new Promise((r) => setTimeout(r, 1200));
      const j = await api(`/api/jobs/${jobId}`);
      turn.position = j.position;
      if (j.state === 'IN_PROGRESS') turn.status = 'run';
      if (j.state === 'FAILED') throw new Error(j.error);
      if (j.state === 'COMPLETED' && j.result) {
        turn.status = 'done'; turn.result = j.result;
        state.history.unshift(j.result);
        break;
      }
      updateTurn(turn);
    }
  } catch (e) {
    turn.status = 'error'; turn.error = e.message;
  }
  updateTurn(turn); renderSidebar();
}
function updateTurn(turn) {
  const el = document.querySelector(`[data-turn="${turn.id}"]`);
  if (el) el.outerHTML = resultCard(turn);
}

async function enhance() {
  const c = client();
  if (!state.c.prompt.trim()) return toast('Escreva uma ideia primeiro');
  const btn = document.querySelector('[data-action="enhance"]');
  btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Refinando…`;
  try {
    const { prompt } = await api('/api/enhance', { method: 'POST', body: { clientId: c.id, prompt: state.c.prompt, style: STYLES.find((s) => s.id === state.c.style).label, model: activeModel() } });
    state.c.override = prompt; state.dsOpen = true;
    toast('Prompt refinado com o design system — revise no painel');
  } catch (e) { toast(e.message); }
  render();
}

// ---------- modals ----------
function lightbox(entryId, i) {
  const h = state.history.find((x) => x.id === entryId) || Object.values(state.threads).flat().find((t) => t.result?.id === entryId)?.result;
  if (!h) return;
  const im = h.images[i]; const m = $('#modal');
  m.className = 'wide';
  m.innerHTML = `<div class="light"><img src="${im.src}" alt="${esc(h.prompt)}">
    <div class="info">
      <div style="display:flex;align-items:center"><b style="font-weight:500;flex:1">${esc(h.modelLabel)} · ${h.aspect}</b><button class="icon-btn" data-close>${ic('close')}</button></div>
      <p>${esc(h.folder)} · ${new Date(h.createdAt).toLocaleString('pt-BR')}${h.seed != null ? ` · seed ${h.seed}` : ''}</p>
      <div><p style="margin-bottom:6px">Briefing</p><pre>${esc(h.prompt)}</pre></div>
      <div><p style="margin-bottom:6px">Prompt enviado</p><pre>${esc(h.finalPrompt)}</pre></div>
      <div class="modal-actions" style="justify-content:flex-start">
        <a class="btn primary" href="${im.src}" download>${ic('down', 15)} Baixar</a>
        <button class="btn" data-reuse>${ic('copy', 15)} Reusar briefing</button>
      </div>
    </div></div>`;
  m.showModal();
  m.querySelector('[data-close]').onclick = () => m.close();
  m.querySelector('[data-reuse]').onclick = () => {
    m.close(); state.clientId = h.clientId; state.folder = h.folder; state.view = 'studio';
    state.c.prompt = h.prompt; state.c.override = null; render(); $('#prompt').focus();
  };
}

function clientModal() {
  const m = $('#modal'); m.className = '';
  m.innerHTML = `<form class="modal-body" method="dialog" id="clientForm">
    <h2>Novo cliente</h2>
    <label class="field">Nome<input name="name" required placeholder="Ex: Café Serra Azul"></label>
    <label class="field">Segmento<input name="segment" placeholder="Ex: Cafeteria artesanal"></label>
    <div class="field">Paleta (principal, secundária, fundo, neutra)
      <div class="colors">${['#7c3aed', '#f472b6', '#14141a', '#f5f5f5'].map((c, i) => `<input type="color" name="c${i}" value="${c}" aria-label="Cor ${i + 1}">`).join('')}</div></div>
    <label class="field">Fontes (títulos, texto)<input name="fonts" placeholder="Ex: Fraunces, Inter"></label>
    <label class="field">Linguagem visual (separe por vírgula, em inglês funciona melhor)<textarea name="keywords" placeholder="warm natural light, rustic textures, cozy"></textarea></label>
    <label class="field">Tom de voz<input name="tone" placeholder="Ex: Acolhedor e artesanal"></label>
    <label class="field">Evitar<input name="avoid" placeholder="Ex: plastic cups, neon colors"></label>
    <label class="field">Linguagem padrão<select name="style">${STYLES.map((s) => `<option value="${s.id}">${s.label}</option>`).join('')}</select></label>
    <div class="modal-actions"><button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="ok">Criar cliente</button></div>
  </form>`;
  m.showModal();
  $('#clientForm').onsubmit = async (e) => {
    if (e.submitter?.value !== 'ok') return;
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);
    try {
      const c = await api('/api/clients', { method: 'POST', body: {
        name: f.name.trim(), segment: f.segment || '', monogram: f.name.trim().slice(0, 2),
        folders: ['Geral'], suggestions: [],
        designSystem: { palette: [f.c0, f.c1, f.c2, f.c3], fonts: list(f.fonts).length ? list(f.fonts) : ['Inter'],
          keywords: list(f.keywords), tone: f.tone || 'Profissional', avoid: list(f.avoid), defaultStyle: f.style, defaultAspect: '1:1' },
      } });
      state.clients.push(c); m.close(); openClient(c.id); toast(`${c.name} adicionado`);
    } catch (err) { toast(err.message); }
  };
}

function addFolder() {
  const m = $('#modal'); m.className = '';
  m.innerHTML = `<form class="modal-body" method="dialog" id="folderForm">
    <h2>Nova pasta em ${esc(client().name)}</h2>
    <label class="field">Nome<input id="folderName" name="name" required placeholder="Ex: Campanha de Natal"></label>
    <div class="modal-actions"><button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="ok">Criar pasta</button></div>
  </form>`;
  m.showModal();
  $('#folderForm').onsubmit = async (e) => {
    if (e.submitter?.value !== 'ok') return;
    e.preventDefault();
    const name = $('#folderName').value.trim();
    try {
      const c = await api(`/api/clients/${state.clientId}/folders`, { method: 'POST', body: { name } });
      Object.assign(client(), c); state.folder = name; state.view = 'studio'; m.close(); render();
    } catch (err) { toast(err.message); }
  };
}

// ---------- events ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) {
    if (state.modelOpen && !e.target.closest('.popover')) { state.modelOpen = false; render(); }
    return;
  }
  const a = el.dataset.action;
  const actions = {
    nav: () => { if (el.dataset.view !== 'hub' && !client()) return; state.view = el.dataset.view; $('#sidebar').classList.remove('open'); render(); },
    'open-client': () => openClient(el.dataset.id),
    'open-folder': () => { state.folder = el.dataset.folder; state.view = 'studio'; $('#sidebar').classList.remove('open'); render(); },
    'add-folder': addFolder,
    'add-client': clientModal,
    'new-creation': () => (client() ? (state.view = 'studio', (state.threads[threadKey()] = []), render(), $('#prompt').focus()) : (state.view = 'hub', render(), toast('Escolha um cliente para começar'))),
    'toggle-side': () => $('#sidebar').classList.toggle('open'),
    'toggle-ds': () => { state.dsOpen = !state.dsOpen; render(); },
    'toggle-brand': () => { state.c.useBrand = !state.c.useBrand; state.c.override = null; render(); },
    'clear-override': () => { state.c.override = null; render(); },
    style: () => { state.c.style = el.dataset.id; state.c.override = null; render(); },
    'toggle-models': () => { state.modelOpen = !state.modelOpen; render(); },
    'pick-model': () => { state.c.model = el.dataset.id; state.modelOpen = false; state.c.override = null; render(); },
    kw: () => { const k = el.dataset.k; state.c.kwOff.has(k) ? state.c.kwOff.delete(k) : state.c.kwOff.add(k); state.c.override = null; render(); },
    suggest: () => { state.c.prompt = el.dataset.text; if (/"/.test(el.dataset.text)) state.c.style = 'typography'; render(); $('#prompt').focus(); },
    generate: () => generate(),
    enhance,
    rerun: () => generate(state.threads[threadKey()].find((t) => t.id === el.dataset.turn)),
    reuse: () => { const t = state.threads[threadKey()].find((x) => x.id === el.dataset.turn); state.c.prompt = t.userPrompt; state.c.override = t.prompt; render(); $('#prompt').focus(); },
    lightbox: () => lightbox(el.dataset.entry, Number(el.dataset.i)),
    gfolder: () => { state.galleryFolder = el.dataset.folder || null; render(); },
  };
  actions[a]?.();
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'prompt') {
    state.c.prompt = e.target.value; autosize(e.target);
    if (state.c.override == null) refreshLive();
    // atualiza o rótulo do modelo automático sem re-renderizar o textarea
    const btn = document.querySelector('[data-action="toggle-models"]');
    if (btn && state.c.model === 'auto') btn.innerHTML = `<span class="badge">Auto</span> ${esc(modelInfo(activeModel()).label)} ${ic('chev', 14)}`;
  }
  if (e.target.id === 'finalPrompt') state.c.override = e.target.value;
  if (e.target.id === 'search') {
    state.search = e.target.value; const pos = e.target.selectionStart; render();
    const s = $('#search'); s.focus(); s.setSelectionRange(pos, pos);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'folderSel') { state.folder = e.target.value; render(); }
  if (e.target.id === 'aspectSel') state.c.aspect = e.target.value;
  if (e.target.id === 'numSel') state.c.num = Number(e.target.value);
});
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'prompt' && e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) { e.preventDefault(); generate(); }
  if (e.key === 'Escape' && state.modelOpen) { state.modelOpen = false; render(); }
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') e.target.close(); });

// ---------- boot ----------
(async () => {
  [state.config, state.clients, state.history] = await Promise.all([api('/api/config'), api('/api/clients'), api('/api/history')]);
  render();
})();
