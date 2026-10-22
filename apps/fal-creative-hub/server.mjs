// Creative Hub — servidor local sem dependências.
// Guarda a FAL_KEY no servidor (nunca vai para o navegador), faz proxy para a
// fila da fal.ai, salva as imagens em outputs/<cliente>/<pasta>/ e mantém o histórico.
import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync, readFileSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const OUTPUTS = path.join(ROOT, 'outputs');
const CLIENTS_FILE = path.join(ROOT, 'data', 'clients.json');
const HISTORY_FILE = path.join(ROOT, 'data', 'history.json');

loadEnv(path.join(ROOT, '.env'));
const FAL_KEY = process.env.FAL_KEY || '';
const PORT = Number(process.env.PORT || 5173);
// DEMO=1 simula a fila e gera imagens de placeholder — útil para testar a UX sem gastar créditos.
const DEMO = process.env.DEMO === '1';

// Modelos de imagem disponíveis. `build` traduz a entrada genérica do app
// (prompt, formato, cores do design system...) para o schema de cada endpoint.
const SIZE_BY_ASPECT = {
  '1:1': 'square_hd', '4:5': 'portrait_4_3', '3:4': 'portrait_4_3',
  '9:16': 'portrait_16_9', '4:3': 'landscape_4_3', '16:9': 'landscape_16_9',
};
const rgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const MODELS = {
  'fal-ai/flux/schnell': {
    label: 'FLUX Schnell', tag: 'Rascunho rápido', speed: 5, quality: 2, text: 1,
    best: 'Explorar ideias e variações em segundos',
    build: (i) => ({ prompt: i.prompt, image_size: SIZE_BY_ASPECT[i.aspect], num_images: i.numImages }),
  },
  'fal-ai/flux/dev': {
    label: 'FLUX Dev', tag: 'Equilíbrio', speed: 4, quality: 3, text: 2,
    best: 'Cenas, produtos e lifestyle com boa fidelidade',
    build: (i) => ({ prompt: i.prompt, image_size: SIZE_BY_ASPECT[i.aspect], num_images: i.numImages }),
  },
  'fal-ai/flux-pro/v1.1-ultra': {
    label: 'FLUX 1.1 Pro Ultra', tag: 'Fotorrealismo', speed: 3, quality: 5, text: 3,
    best: 'Fotografia publicitária e key visuals em alta resolução',
    build: (i) => ({ prompt: i.prompt, aspect_ratio: i.aspect, num_images: i.numImages }),
  },
  'fal-ai/recraft/v3/text-to-image': {
    label: 'Recraft V3', tag: 'Vetor & cores da marca', speed: 3, quality: 4, text: 4,
    best: 'Ilustração, ícones e peças vetoriais respeitando a paleta',
    brandColors: true,
    build: (i) => ({
      prompt: i.prompt, image_size: SIZE_BY_ASPECT[i.aspect],
      style: { photo: 'realistic_image', illustration: 'digital_illustration', vector: 'vector_illustration' }[i.style] || 'any',
      colors: i.useBrand ? i.palette.map(rgb) : [],
    }),
  },
  'fal-ai/ideogram/v3': {
    label: 'Ideogram V3', tag: 'Tipografia', speed: 3, quality: 4, text: 5,
    best: 'Posts e banners com texto legível dentro da imagem',
    brandColors: true, negative: true,
    build: (i) => ({
      prompt: i.prompt, image_size: SIZE_BY_ASPECT[i.aspect], num_images: i.numImages,
      negative_prompt: i.negative || '',
      style: { photo: 'REALISTIC', typography: 'DESIGN', vector: 'DESIGN', illustration: 'GENERAL' }[i.style] || 'AUTO',
      ...(i.useBrand && i.palette.length
        ? { color_palette: { members: i.palette.map((c) => ({ rgb: rgb(c), color_weight: 0.5 })) } }
        : {}),
    }),
  },
  'fal-ai/nano-banana': {
    label: 'Nano Banana', tag: 'Versátil', speed: 4, quality: 4, text: 4,
    best: 'Composições criativas e conceitos com boa coerência',
    build: (i) => ({ prompt: i.prompt, aspect_ratio: i.aspect, num_images: i.numImages }),
  },
};

const LLM_MODEL = 'google/gemini-2.5-flash';
const jobs = new Map(); // jobId -> { statusUrl, responseUrl, meta, state, result, error }

// ---------- helpers ----------
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const readJson = async (file, fallback) => {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
};
const writeJson = (file, data) => fs.writeFile(file, JSON.stringify(data, null, 2));
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
const send = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};
const body = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
});

async function fal(url, init = {}) {
  if (!FAL_KEY) throw new Error('FAL_KEY não configurada. Crie o arquivo .env (veja .env.example).');
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join('; ') : data.detail;
    if (res.status === 403 && /balance|TOP_UP/i.test(String(detail))) {
      throw new Error('Saldo da fal.ai esgotado. Recarregue em fal.ai/dashboard/billing e tente de novo.');
    }
    if (res.status === 401) throw new Error('FAL_KEY inválida. Confira a chave no arquivo .env.');
    throw new Error(`fal.ai ${res.status}: ${detail || data.raw || res.statusText}`);
  }
  return data;
}

// ---------- prompt enhancement (LLM via fal) ----------
async function enhancePrompt({ prompt, client, style, model }) {
  const ds = client.designSystem;
  const system = [
    'You are a senior art director writing prompts for text-to-image models.',
    'Rewrite the user idea (any language) as ONE vivid English prompt (max 90 words).',
    'Respect the brand design system strictly. Mention composition, lighting, materials and mood.',
    'If the idea asks for text in the image, keep that exact text in quotes and in its original language.',
    'Return only the prompt, no preamble.',
  ].join(' ');
  const user = [
    `Brand: ${client.name} (${client.segment}).`,
    `Palette: ${ds.palette.join(', ')}.`,
    `Typography: ${ds.fonts.join(' / ')}.`,
    `Visual language: ${ds.keywords.join(', ')}.`,
    `Tone: ${ds.tone}.`,
    ds.avoid?.length ? `Avoid: ${ds.avoid.join(', ')}.` : '',
    `Requested style: ${style}. Target model: ${MODELS[model]?.label || model}.`,
    `Idea: ${prompt}`,
  ].filter(Boolean).join('\n');
  if (DEMO) return `${prompt}. ${style}, ${ds.keywords.join(', ')}, brand palette ${ds.palette.join(' ')}, ${ds.tone.toLowerCase()} mood, art-directed composition.`;
  const out = await fal('https://fal.run/fal-ai/any-llm', {
    method: 'POST',
    body: JSON.stringify({ model: LLM_MODEL, system_prompt: system, prompt: user }),
  });
  if (out.error) throw new Error(out.error);
  return String(out.output || '').trim().replace(/^"|"$/g, '');
}

// ---------- generation ----------
async function submit(input) {
  const model = MODELS[input.model];
  if (!model) throw new Error(`Modelo desconhecido: ${input.model}`);
  const payload = model.build(input);
  if (DEMO) {
    const jobId = crypto.randomUUID();
    jobs.set(jobId, { demo: Date.now(), state: 'IN_QUEUE', meta: { ...input, payload, createdAt: new Date().toISOString() } });
    return jobId;
  }
  const q = await fal(`https://queue.fal.run/${input.model}`, { method: 'POST', body: JSON.stringify(payload) });
  const jobId = crypto.randomUUID();
  jobs.set(jobId, {
    statusUrl: q.status_url, responseUrl: q.response_url, state: 'IN_QUEUE',
    meta: { ...input, payload, requestId: q.request_id, createdAt: new Date().toISOString() },
  });
  return jobId;
}

async function poll(jobId) {
  const job = jobs.get(jobId);
  if (!job) throw new Error('Job não encontrado');
  if (job.state === 'COMPLETED' || job.state === 'FAILED' || job.finishing) return job;
  const st = job.demo ? demoStatus(job) : await fal(`${job.statusUrl}?logs=1`);
  job.state = st.status;
  job.position = st.queue_position;
  job.logs = (st.logs || []).slice(-3).map((l) => l.message);
  if (st.status === 'COMPLETED') {
    job.finishing = true;
    try {
      const out = job.demo ? demoImages(job.meta) : await fal(job.responseUrl);
      job.result = await persist(job.meta, out);
      job.state = 'COMPLETED';
    } catch (e) {
      job.state = 'FAILED'; job.error = e.message;
    } finally { job.finishing = false; }
  }
  return job;
}

function demoStatus(job) {
  const t = Date.now() - job.demo;
  return { status: t < 1500 ? 'IN_QUEUE' : t < 4500 ? 'IN_PROGRESS' : 'COMPLETED', queue_position: t < 1500 ? 0 : undefined };
}
function demoImages(meta) {
  const [w, h] = { '1:1': [1024, 1024], '4:5': [896, 1120], '3:4': [896, 1195], '9:16': [768, 1365], '16:9': [1365, 768], '4:3': [1195, 896] }[meta.aspect];
  const pal = meta.palette.length ? meta.palette : ['#c084fc', '#7c3aed', '#111111', '#ffffff'];
  const images = Array.from({ length: meta.numImages }, (_, n) => {
    const rot = (n * 47) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><radialGradient id="a" cx="${20 + n * 25}%" cy="25%" r="80%"><stop offset="0" stop-color="${pal[0]}"/><stop offset="1" stop-color="${pal[2] || '#111'}"/></radialGradient>
<linearGradient id="b" gradientTransform="rotate(${rot})"><stop offset="0" stop-color="${pal[1]}" stop-opacity=".9"/><stop offset="1" stop-color="${pal[0]}" stop-opacity="0"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#a)"/><circle cx="${w * (0.3 + n * 0.15)}" cy="${h * 0.6}" r="${Math.min(w, h) * 0.32}" fill="url(#b)"/>
<rect x="${w * 0.08}" y="${h * 0.08}" width="${w * 0.84}" height="${h * 0.84}" rx="28" fill="none" stroke="${pal[3] || '#fff'}" stroke-opacity=".25" stroke-width="3"/>
<text x="50%" y="${h - 60}" text-anchor="middle" font-family="Inter, sans-serif" font-size="30" fill="${pal[3] || '#fff'}" fill-opacity=".7">DEMO · ${MODELS[meta.model].label}</text></svg>`;
    return { url: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'), content_type: 'image/svg+xml', width: w, height: h };
  });
  return { images, seed: Math.floor(Math.random() * 1e6) };
}

async function persist(meta, out) {
  const clients = await readJson(CLIENTS_FILE, []);
  const client = clients.find((c) => c.id === meta.clientId);
  const dir = path.join(OUTPUTS, slug(client?.id || meta.clientId), slug(meta.folder || 'geral'));
  await fs.mkdir(dir, { recursive: true });
  const images = [];
  for (const [n, img] of (out.images || []).entries()) {
    const ext = (img.content_type || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const file = `${Date.now()}-${n}.${ext}`;
    try {
      const buf = Buffer.from(await (await fetch(img.url)).arrayBuffer());
      await fs.writeFile(path.join(dir, file), buf);
      images.push({ src: '/' + path.relative(ROOT, path.join(dir, file)).split(path.sep).join('/'), remote: img.url, width: img.width, height: img.height });
    } catch {
      images.push({ src: img.url, remote: img.url, width: img.width, height: img.height });
    }
  }
  const entry = {
    id: crypto.randomUUID(), clientId: meta.clientId, folder: meta.folder || 'Geral',
    prompt: meta.userPrompt, finalPrompt: meta.prompt, model: meta.model, modelLabel: MODELS[meta.model].label,
    aspect: meta.aspect, style: meta.style, seed: out.seed, images, createdAt: new Date().toISOString(),
  };
  const history = await readJson(HISTORY_FILE, []);
  history.unshift(entry);
  await writeJson(HISTORY_FILE, history.slice(0, 2000));
  return entry;
}

// ---------- routes ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' };

async function serveStatic(res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base)) return send(res, 403, { error: 'forbidden' });
  try {
    const stat = await fs.stat(file);
    if (stat.isDirectory()) return serveStatic(res, base, path.join(rel, 'index.html'));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch { send(res, 404, { error: 'not found' }); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === '/api/config') {
      return send(res, 200, {
        hasKey: Boolean(FAL_KEY) || DEMO, demo: DEMO,
        models: Object.entries(MODELS).map(([id, m]) => ({ id, ...m, build: undefined })),
      });
    }
    if (p === '/api/clients' && req.method === 'GET') return send(res, 200, await readJson(CLIENTS_FILE, []));
    if (p === '/api/clients' && req.method === 'POST') {
      const data = await body(req);
      const clients = await readJson(CLIENTS_FILE, []);
      const id = slug(data.name);
      if (clients.some((c) => c.id === id)) return send(res, 409, { error: 'Já existe um cliente com esse nome' });
      const client = { id, folders: ['Geral'], ...data };
      clients.push(client);
      await writeJson(CLIENTS_FILE, clients);
      return send(res, 201, client);
    }
    const folderRoute = p.match(/^\/api\/clients\/([^/]+)\/folders$/);
    if (folderRoute && req.method === 'POST') {
      const { name } = await body(req);
      const clients = await readJson(CLIENTS_FILE, []);
      const client = clients.find((c) => c.id === folderRoute[1]);
      if (!client || !name?.trim()) return send(res, 400, { error: 'Cliente ou nome inválido' });
      if (!client.folders.includes(name.trim())) client.folders.push(name.trim());
      await writeJson(CLIENTS_FILE, clients);
      return send(res, 200, client);
    }
    if (p === '/api/history') {
      const all = await readJson(HISTORY_FILE, []);
      const c = url.searchParams.get('client'); const f = url.searchParams.get('folder');
      return send(res, 200, all.filter((h) => (!c || h.clientId === c) && (!f || h.folder === f)));
    }
    if (p === '/api/enhance' && req.method === 'POST') {
      const data = await body(req);
      const clients = await readJson(CLIENTS_FILE, []);
      const client = clients.find((c) => c.id === data.clientId);
      if (!client) return send(res, 404, { error: 'Cliente não encontrado' });
      return send(res, 200, { prompt: await enhancePrompt({ ...data, client }) });
    }
    if (p === '/api/generate' && req.method === 'POST') {
      const d = await body(req);
      const input = {
        clientId: d.clientId, folder: d.folder, userPrompt: d.userPrompt || d.prompt, prompt: d.prompt,
        negative: d.negative, model: d.model, aspect: SIZE_BY_ASPECT[d.aspect] ? d.aspect : '1:1',
        style: d.style, useBrand: d.useBrand !== false, palette: d.palette || [],
        numImages: Math.min(Math.max(Number(d.numImages) || 1, 1), 4),
      };
      return send(res, 202, { jobId: await submit(input) });
    }
    const jobRoute = p.match(/^\/api\/jobs\/([\w-]+)$/);
    if (jobRoute) {
      const j = await poll(jobRoute[1]);
      return send(res, 200, { state: j.state, position: j.position, logs: j.logs, result: j.result, error: j.error });
    }
    if (p.startsWith('/api/')) return send(res, 404, { error: 'rota inexistente' });
    if (p.startsWith('/outputs/')) return serveStatic(res, OUTPUTS, p.slice('/outputs/'.length));
    return serveStatic(res, PUBLIC, p === '/' ? 'index.html' : p.slice(1));
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n  ✦ Creative Hub rodando em http://localhost:${PORT}`);
  if (DEMO) console.log('  ◌  Modo DEMO: nenhuma chamada paga é feita à fal.ai.\n');
  else if (!FAL_KEY) console.log('  ⚠  FAL_KEY ausente — copie .env.example para .env e cole sua chave.\n');
});
