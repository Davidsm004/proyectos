/* Liberty Project Pipeline — GitHub Pages + datos cifrados en el mismo repositorio (ghdb.js) */
(() => {
'use strict';
const CFG = window.LPP_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
function h(t, a, ...ch) {
  const e = document.createElement(t);
  for (const [k, v] of Object.entries(a || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'svg') e.innerHTML = v; // solo íconos estáticos
    else if (k in e && k !== 'list' && k !== 'type') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of ch.flat(9)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const I = {
  grip: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="3" r="1.3"/><circle cx="11" cy="3" r="1.3"/><circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/><circle cx="5" cy="13" r="1.3"/><circle cx="11" cy="13" r="1.3"/></svg>',
  dots: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg>',
  caret: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3l5 5-5 5"/></svg>',
  plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v12M2 8h12"/></svg>',
  search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>',
  chat: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 3h12v8H6l-3 3v-3H2z"/></svg>',
  clip: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 4L5 9a1.8 1.8 0 002.5 2.5l5-5a3 3 0 00-4.3-4.3L3 7.5a4.2 4.2 0 006 6L13 9.5"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l10 10M13 3L3 13"/></svg>',
  up: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 13V3M4 7l4-4 4 4"/></svg>',
  down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v10M4 9l4 4 4-4"/></svg>',
  list: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4h12M2 8h12M2 12h12"/></svg>',
  book: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 2.5h7.5A2.5 2.5 0 0113 5v8.5H5.5A2.5 2.5 0 013 11z"/><path d="M3 11a2 2 0 012-2h8"/></svg>',
  lock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>',
  edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 2l3 3-8 8H3v-3z"/></svg>'
};
const PALETTE = ['#0080E8', '#47BFF9', '#003FF9', '#ED7F32', '#F0AE84', '#7E3628', '#60C69F', '#3F886B', '#9648D9', '#7128B7', '#F3BB40', '#6A6D76'];
const DONE = ['entregado', 'completado', 'done', 'listo', 'finalizado'];
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const S = { user: null, profile: null, groups: [], columns: [], projects: [], comments: [], attachments: [], settings: {}, view: 'board', q: '', f: { status: '', area: '', person: '' }, open: new Set(), collapsed: new Set() };
let sb, reloadTimer;

/* ---------- utils ---------- */
const canEdit = () => ['admin', 'editor'].includes(S.profile?.role);
const isAdmin = () => S.profile?.role === 'admin';
const byPos = (a, b) => (a.position - b.position) || String(a.created_at).localeCompare(String(b.created_at));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function num(v) { if (v === '' || v == null) return null; if (typeof v === 'number') return isFinite(v) ? v : null; const n = Number(String(v).replace(/[$,\s%]/g, '')); return isFinite(n) ? n : null; }
const fmtMoney = v => v == null ? '' : usd.format(v);
const initials = s => String(s || '?').replace(/@.*/, '').split(/[\s/,.y]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
function hashColor(s) { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) | 0; return PALETTE[Math.abs(x) % PALETTE.length]; }
function textOn(hex) { const c = (hex || '#888').replace('#', ''); const [r, g, b] = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.36 ? '#2F333C' : '#fff'; }
function tint(hex, a = .08) { return hex ? `color-mix(in srgb, ${hex} ${a * 100}%, white)` : ''; }
function toast(msg, kind = '') { const t = h('div', { class: 'toast ' + kind }, msg); $('#toasts').append(t); setTimeout(() => t.remove(), kind === 'err' ? 6000 : 3000); }
async function q(p) { const r = await p; if (r.error) { toast(r.error.message || 'Error', 'err'); throw r.error; } return r.data; }
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const cols = scope => S.columns.filter(c => c.scope === scope).sort(byPos);
const colByKey = (scope, key) => S.columns.find(c => c.scope === scope && c.key === key);
const byUserPos = (a, b) => { const x = num(a.data.pos), y = num(b.data.pos); if (x != null && y != null) return (x - y) || byPos(a, b); if (x != null) return -1; if (y != null) return 1; return byPos(a, b); };
const subsOf = id => S.projects.filter(p => p.parent_id === id).sort(byUserPos);
const topOf = gid => S.projects.filter(p => p.group_id === gid && !p.parent_id).sort(byUserPos);
const findP = id => S.projects.find(p => p.id === id);

/* ---------- cálculos ---------- */
function moneyOf(p, key) { // valor propio prevalece; si está vacío, suma subtareas (nunca ambos → sin duplicar)
  const own = num(p.data[key]); if (own != null) return { v: own, calc: false };
  const subs = subsOf(p.id); let t = null;
  for (const s of subs) { const v = num(s.data[key]); if (v != null) t = (t || 0) + v; }
  return { v: t, calc: t != null };
}
function subProgress(s) { const v = num(s.data.progress); if (v != null) return Math.max(0, Math.min(100, v)); return DONE.includes(norm(s.data.status)) ? 100 : 0; }
function progressOf(p) { // suma ponderada de aportes de subtareas (peso % o partes iguales)
  const subs = subsOf(p.id);
  if (!subs.length) return { v: Math.max(0, Math.min(100, num(p.data.progress) ?? (DONE.includes(norm(p.data.status)) ? 100 : 0))), calc: false };
  let tw = 0, acc = 0;
  for (const s of subs) { const w = num(s.data.weight) ?? (100 / subs.length); tw += w; acc += w * subProgress(s); }
  return { v: tw ? acc / tw : 0, calc: true };
}
function visibleTop(gid) {
  const qq = norm(S.q), f = S.f;
  return topOf(gid).filter(p => {
    if (f.status && norm(p.data.status) !== norm(f.status)) return false;
    if (f.area && norm(p.data.area) !== norm(f.area)) return false;
    if (f.person && ![p, ...subsOf(p.id)].some(x => S.columns.filter(c => c.type === 'person').some(c => personsOf(x.data[c.key]).some(n => norm(n) === norm(f.person))))) return false;
    if (!qq) return true;
    return [p, ...subsOf(p.id)].some(x => Object.values(x.data).some(v => norm(v).includes(qq)));
  });
}
function totals(list) {
  let ret = 0, cost = 0, prog = 0;
  for (const p of list) { ret += moneyOf(p, 'return').v || 0; cost += moneyOf(p, 'dev_cost').v || 0; prog += progressOf(p).v; }
  return { ret, cost, net: ret - cost, prog: list.length ? prog / list.length : 0, n: list.length };
}

/* ---------- popovers / modales ---------- */
let popEl = null;
function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
function pop(anchor, content) {
  closePop(); popEl = h('div', { class: 'pop' }, content); document.body.append(popEl);
  const r = anchor.getBoundingClientRect(), pw = popEl.offsetWidth, ph = popEl.offsetHeight;
  let x = Math.min(r.left, innerWidth - pw - 8), y = r.bottom + 4; if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 4);
  popEl.style.left = Math.max(8, x) + 'px'; popEl.style.top = y + 'px';
  return popEl;
}
document.addEventListener('mousedown', e => { if (popEl && !popEl.contains(e.target)) closePop(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePop(); const o = [...document.querySelectorAll('.overlay')].pop(); if (o) o.remove(); } });
function menu(anchor, items) {
  pop(anchor, h('div', { class: 'menu' }, items.filter(Boolean).map(it => it === '-' ? h('hr') : h('button', { class: it.danger ? 'danger' : '', onclick: () => { closePop(); it.run(); } }, it.label))));
}
function modal(title, body, actions = [], wide) {
  const ov = h('div', { class: 'overlay', onmousedown: e => { if (e.target === ov) ov.remove(); } });
  const close = () => ov.remove();
  ov.append(h('div', { class: 'modal', style: wide ? 'max-width:900px' : '', role: 'dialog', 'aria-label': title },
    h('header', {}, h('h3', {}, title), h('button', { class: 'icon-btn', svg: I.x, 'aria-label': 'Cerrar', onclick: close })),
    h('div', { class: 'body' }, body),
    actions.length ? h('footer', {}, actions.map(a => h('button', { class: 'btn ' + (a.cls || ''), onclick: () => a.run(close) }, a.label))) : null));
  document.body.append(ov); const f = ov.querySelector('input,select,textarea'); if (f) f.focus();
  return close;
}
function ask(title, fields, okLabel = 'Guardar') {
  return new Promise(res => {
    const els = {};
    const body = h('form', { onsubmit: e => { e.preventDefault(); done(); } }, fields.map(f => {
      let el;
      if (f.type === 'select') el = h('select', { class: 'input' }, f.options.map(o => h('option', { value: o.value ?? o, selected: (o.value ?? o) === f.value }, o.label ?? o)));
      else if (f.type === 'textarea') el = h('textarea', { class: 'input', value: f.value ?? '' });
      else el = h('input', { class: 'input', type: f.type || 'text', value: f.value ?? '', placeholder: f.placeholder || '', required: !!f.required });
      els[f.name] = el; return h('div', { class: 'field' }, h('label', {}, f.label), el);
    }), h('button', { type: 'submit', class: 'hidden' }));
    let closeFn, resolved = false;
    const done = () => { const out = {}; for (const [k, el] of Object.entries(els)) out[k] = el.value; if (fields.some(f => f.required && !String(out[f.name]).trim())) return toast('Completa los campos requeridos', 'err'); resolved = true; closeFn(); res(out); };
    closeFn = modal(title, body, [{ label: 'Cancelar', run: c => c() }, { label: okLabel, cls: 'primary', run: done }]);
    const ov = [...document.querySelectorAll('.overlay')].pop();
    new MutationObserver((m, o) => { if (!document.body.contains(ov)) { o.disconnect(); if (!resolved) res(null); } }).observe(document.body, { childList: true });
  });
}
const confirmBox = (title, msg, label = 'Eliminar') => new Promise(res => {
  let ok = false; const ov = () => [...document.querySelectorAll('.overlay')].pop();
  modal(title, h('p', {}, msg), [{ label: 'Cancelar', run: c => c() }, { label, cls: 'primary', run: c => { ok = true; c(); } }]);
  const o = ov(); new MutationObserver((m, ob) => { if (!document.body.contains(o)) { ob.disconnect(); res(ok); } }).observe(document.body, { childList: true });
});
function colorPicker(anchor, cur, cb) {
  pop(anchor, h('div', {}, h('div', { class: 'swatches' }, PALETTE.map(c => h('button', { style: `background:${c}`, title: c, 'aria-label': c, onclick: () => { closePop(); cb(c); } }))),
    h('button', { class: 'btn ghost', style: 'width:100%', onclick: () => { closePop(); cb(null); } }, 'Sin color')));
}

/* ---------- arranque / auth ---------- */
async function boot() {
  sb = window.GHDB.createClient({ ...CFG, columns: window.LPP_COLUMNS, onError: m => toast(m, 'err') });
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { S.user = null; clearTimeout(lockTimer); try { sessionStorage.removeItem('lpp-lock'); } catch (e) {} document.getElementById('lockscreen')?.remove(); S.view = 'board'; renderLogin(); } });
  if (await sb.status() === 'setup') return $('#app').replaceChildren(h('div', { class: 'empty-state' }, h('img', { src: 'logo.png', alt: 'Liberty', style: 'height:28px' }), h('h2', {}, 'Plataforma no disponible'), h('p', {}, 'Contacta al administrador.')));
  const { data } = await sb.auth.getSession();
  if (data?.session) await enter(data.session.user); else renderLogin();
}
function authLayout(title, sub, form, foot) {
  $('#app').replaceChildren(h('div', { class: 'auth' },
    h('section', { class: 'auth-hero' }, h('img', { src: 'logo-white.png', alt: 'Liberty', style: 'height:30px;width:auto;align-self:flex-start' }),
      h('div', { style: 'position:relative;z-index:1' }, h('h1', {}, 'Liberty Project Pipeline'), h('p', {}, 'Prioriza, da seguimiento y mide el retorno de cada iniciativa en un solo lugar.')),
      h('small', { style: 'opacity:.8;position:relative;z-index:1' }, 'Liberty Costa Rica')),
    h('section', { class: 'auth-form' }, h('div', { class: 'auth-card' }, h('h2', {}, title), h('p', { class: 'muted' }, sub), form, foot || null))));
}
function renderLogin() {
  const user = h('input', { class: 'input', type: 'text', autocomplete: 'off', name: 'lpp-u', required: true, id: 'email', autocapitalize: 'none', spellcheck: false});
  const pass = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', name: 'lpp-p', required: true, id: 'password'});
  let typed = false; [user, pass].forEach(i => i.addEventListener('input', e => { if (e.isTrusted !== false) typed = true; }));
  setTimeout(() => { if (!typed) { user.value = ''; pass.value = ''; } }, 400);
  const btn = h('button', { class: 'btn primary block', type: 'submit' }, 'Ingresar');
  const form = h('form', { autocomplete: 'off', onsubmit: async e => {
    e.preventDefault(); btn.disabled = true; btn.textContent = 'Verificando…';
    const { data, error } = await sb.auth.signInWithPassword({ email: user.value, password: pass.value });
    if (error) { toast(error.message === 'Invalid login credentials' ? 'Usuario o contraseña incorrectos' : error.message, 'err'); btn.disabled = false; btn.textContent = 'Ingresar'; return; }
    await enter(data.user);
  } }, h('div', { class: 'field' }, h('label', { for: 'email' }, 'Usuario'), user), h('div', { class: 'field' }, h('label', { for: 'password' }, 'Contraseña'), pass), btn);
  authLayout('Iniciar sesión', 'Usa tu usuario y contraseña. Si no tienes acceso, solicítalo al administrador.', form);
}
async function enter(user) {
  S.user = user; S.profile = sb.auth.profile(); resetLock();
  await loadAll(); renderShell(); subscribe();
  try { if (sessionStorage.getItem('lpp-lock')) lockScreen(); } catch (e) {}
  if (canEdit() && !sb.auth.hasToken()) {
    if (isAdmin()) { await tokenModal(true); } else toast('Modo solo lectura: el administrador debe activar el guardado', 'err');
    if (!sb.auth.hasToken()) S.profile = { ...S.profile, role: 'viewer' }; renderShell();
  }
  if (!S.projects.length && canEdit()) { S.view = 'new'; renderShell(); toast('Importa tu Excel de proyectos para comenzar', 'ok'); }
}
async function loadAll() {
  const [g, c, p, cm, at, st, nt, kc, kd] = await Promise.all([
    q(sb.from('groups').select('*').order('position')), q(sb.from('columns').select('*').order('position')),
    q(sb.from('projects').select('*').order('position')), q(sb.from('comments').select('*').order('created_at', { ascending: false })),
    q(sb.from('attachments').select('*').order('created_at', { ascending: false })), q(sb.from('settings').select('*')), q(sb.from('notes').select('*')), q(sb.from('kcols').select('*')), q(sb.from('kcards').select('*'))]);
  Object.assign(S, { groups: g, columns: c, projects: p.map(x => ({ ...x, data: x.data || {} })), comments: cm, attachments: at, settings: Object.fromEntries(st.map(s => [s.key, s.value])), notes: nt || [], kcols: kc || [], kcards: kd || [] });
}
function subscribe() {
  if (!sb.channel) return;
  sb.channel('lpp').on('changes', {}, () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => { const a = document.activeElement; if (a && a.closest && a.closest('.cell,.add-row,.overlay,.drawer,.diary')) return; await loadAll(); render(); }, 800);
  }).subscribe();
}

/* ---------- shell ---------- */
function renderShell() {
  const p = S.profile;
  $('#app').replaceChildren(h('div', { class: 'shell' },
    h('header', { class: 'topbar' },
      h('div', { class: 'brand' }, h('img', { src: 'logo.png', alt: 'Liberty' }), h('span', {}, 'Project Pipeline')),
      h('nav', { class: 'nav', 'aria-label': 'Principal' },
        h('button', { id: 'nav-new', class: S.view === 'new' ? 'on' : '', onclick: () => go('new') }, h('span', { svg: I.plus }), 'Ingresar proyectos'),
        h('button', { id: 'nav-board', class: S.view === 'board' ? 'on' : '', onclick: () => go('board') }, h('span', { svg: I.list }), 'Ver proyectos'),
        h('button', { id: 'nav-diary', class: S.view === 'diary' ? 'on' : '', onclick: () => go('diary') }, h('span', { svg: I.book }), 'Mis notas')),
      h('div', { class: 'right' }, h('span', { class: 'role-chip' }, p.role),
        h('button', { class: 'icon-btn', style: 'width:auto;height:auto', title: p.email, 'aria-label': 'Cuenta', onclick: e => menu(e.currentTarget, [
          { label: p.email, run: () => {} }, isAdmin() && { label: 'Usuarios y permisos', run: usersModal }, isAdmin() && { label: 'Actualizar token de GitHub', run: tokenModal }, canEdit() && { label: 'Cambiar contraseña', run: passwordModal }, '-', { label: 'Cerrar sesión', run: () => sb.auth.signOut() }]) },
          h('span', { class: 'avatar', style: `background:${hashColor(p.email)}` }, initials(p.email))))),
    h('main', { id: 'main' })));
  render();
}
function go(v) { S.view = v; renderShell(); scrollTo(0, 0); }
function render() {
  const m = $('#main'); if (!m) return;
  if (S.view === 'new') return renderNew(m);
  if (S.view === 'diary') return renderDiary(m);
  const keep = {}; m.querySelectorAll('[data-scroll]').forEach(el => keep[el.dataset.scroll] = el.scrollLeft);
  renderBoard(m);
  m.querySelectorAll('[data-scroll]').forEach(el => { if (keep[el.dataset.scroll]) el.scrollLeft = keep[el.dataset.scroll]; });
  restoreSel();
}

/* ---------- selección, Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+Z / Ctrl+Y como Excel ---------- */
const UNDO = [], REDO = []; let batch = null;
function pushUndo(e) { if (batch) { batch.push(e); return; } UNDO.push(e); if (UNDO.length > 100) UNDO.shift(); REDO.length = 0; }
function selectCell(el) {
  document.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
  if (!el) { S.sel = null; return; }
  el.classList.add('sel'); const tr = el.closest('tr[data-id]'); S.sel = tr ? { id: tr.dataset.id, key: el.dataset.key } : null;
  if (document.activeElement !== el) el.focus({ preventScroll: true });
}
function selEl() { return S.sel && document.querySelector(`tr[data-id="${S.sel.id}"] [data-key="${S.sel.key}"]`); }
function restoreSel() { const el = selEl(); if (el) { el.classList.add('sel'); const a = document.activeElement; if (!a || a === document.body || a.closest('.board')) el.focus({ preventScroll: true }); } }
const colOf = (p, key) => key === 'name' ? { key: 'name', type: 'text' } : colByKey(p.parent_id ? 'sub' : 'project', key);
function toText(p, key) {
  const c = colOf(p, key), v = p.data[key]; if (v == null) return '';
  if (c?.type === 'progress') return (p.parent_id || !subsOf(p.id).length ? v : Math.round(progressOf(p).v)) + '%';
  if (c?.type === 'checkbox') return v ? 'Sí' : 'No';
  return String(v);
}
function fromText(c, t) {
  t = String(t ?? '').trim(); if (t === '') return null;
  switch (c?.type) {
    case 'money': case 'number': return num(t);
    case 'progress': { const n = num(t); return n == null ? null : Math.max(0, Math.min(100, !t.includes('%') && n <= 1 ? n * 100 : n)); }
    case 'priority': { const n = t.includes('★') ? (t.match(/★/g) || []).length : num(t); return n ? Math.max(1, Math.min(5, Math.round(n))) : null; }
    case 'checkbox': return ['si', 'sí', 'true', '1', 'x', 'verdadero'].includes(norm(t));
    case 'date': { let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
      m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return null; }
    default: return t;
  }
}
function gridOf(el) { // filas visibles y llaves de columna de la tabla de la celda
  const table = el.closest('table'), tr = el.closest('tr[data-id]'), cls = tr.classList.contains('srow') ? 'tr.srow' : 'tr.prow';
  const rows = [...tr.parentElement.querySelectorAll(':scope > ' + cls)];
  const keys = ['name', ...[...table.querySelectorAll('thead th.dcol')].map(th => S.columns.find(c => c.id === th.dataset.col)?.key).filter(Boolean)];
  return { rows, keys, r: rows.indexOf(tr), k: keys.indexOf(el.dataset.key) };
}
async function applyGrid(el, matrix) {
  const { rows, keys, r, k } = gridOf(el), first = findP(rows[r].dataset.id), items = [], created = [];
  batch = [];
  for (let i = 0; i < matrix.length; i++) {
    const data = {};
    matrix[i].forEach((t, j) => { const key = keys[k + j]; if (!key) return; const p0 = first; const c = colOf(p0, key); if (c?.type === 'progress' && !p0.parent_id && rows[r + i] && subsOf(rows[r + i].dataset.id).length) return; const v = fromText(c, t); if (key === 'name' && !v) return; data[key] = v; });
    if (!Object.keys(data).length) continue;
    const tr = rows[r + i];
    if (tr) { const p = findP(tr.dataset.id); items.push({ id: p.id, prev: Object.fromEntries(Object.keys(data).map(x => [x, p.data[x] ?? null])), next: data }); Object.assign(p.data, data); sb.rpc('patch_project', { p_id: p.id, p_patch: data }); }
    else { const row = await createProject({ group_id: first.group_id, parent_id: first.parent_id, data: { name: first.parent_id ? 'Nueva subtarea' : 'Nuevo proyecto', ...data } }, true); created.push(row.id); }
  }
  batch = null;
  if (items.length) pushUndo({ type: 'patch', items }); if (created.length) pushUndo({ type: 'create', ids: created });
  render(); toast(`Pegado: ${items.length + created.length} fila(s)`, 'ok');
}
async function undoRedo(redo) {
  const from = redo ? REDO : UNDO, to = redo ? UNDO : REDO, e = from.pop(); if (!e) return toast(redo ? 'Nada para rehacer' : 'Nada para deshacer');
  if (e.type === 'patch') { for (const it of e.items) { const p = findP(it.id); if (!p) continue; const v = redo ? it.next : it.prev; Object.assign(p.data, v); sb.rpc('patch_project', { p_id: p.id, p_patch: v }); } to.push(e); render(); }
  else if (e.type === 'create') {
    if (redo) return toast('No se puede rehacer una creación');
    for (const id of e.ids) { const ids = [id, ...subsOf(id).map(s => s.id)]; await q(sb.from('projects').delete().eq('id', id)); S.projects = S.projects.filter(x => !ids.includes(x.id)); }
    render();
  }
  toast(redo ? 'Rehecho' : 'Deshecho');
}
const editing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
document.addEventListener('copy', e => { if (editing()) return; const el = selEl(); if (!el) return; const p = findP(S.sel.id); e.clipboardData.setData('text/plain', toText(p, S.sel.key)); e.preventDefault(); toast('Copiado'); });
document.addEventListener('cut', e => { if (editing() || !canEdit()) return; const el = selEl(); if (!el) return; const p = findP(S.sel.id); e.clipboardData.setData('text/plain', toText(p, S.sel.key)); e.preventDefault(); if (S.sel.key !== 'name') patch(p, { [S.sel.key]: null }); });
document.addEventListener('paste', e => {
  if (editing() || !canEdit()) return; const el = selEl(); if (!el) return; e.preventDefault();
  const text = (e.clipboardData.getData('text/plain') || '').replace(/\r/g, '').replace(/\n$/, '');
  const matrix = text.split('\n').map(l => l.split('\t'));
  if (matrix.length === 1 && matrix[0].length === 1) { const p = findP(S.sel.id), v = fromText(colOf(p, S.sel.key), matrix[0][0]); if (S.sel.key === 'name' && !v) return; patch(p, { [S.sel.key]: v }); }
  else applyGrid(el, matrix);
});
document.addEventListener('keydown', e => {
  if (document.getElementById('lockscreen') || S.view === 'diary') return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !editing() && !document.querySelector('.overlay') && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y') && canEdit()) { e.preventDefault(); undoRedo(e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')); return; }
  if (editing() || mod || e.altKey || document.querySelector('.overlay') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.defaultPrevented) return;
  const el = selEl(); if (!el || !document.contains(el)) return;
  const move = (dr, dk) => { const g = gridOf(el), tr = g.rows[g.r + dr], key = g.keys[g.k + dk]; if (!tr || !key) return; const n = tr.querySelector(`[data-key="${key}"]`); if (n) { selectCell(n); n.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } };
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1, 0); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1, 0); }
  else if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); move(0, 1); } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) { e.preventDefault(); move(0, -1); }
  else if (!canEdit()) return;
  else if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); el._start ? el._start() : el.click(); }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel.key !== 'name') { e.preventDefault(); patch(findP(S.sel.id), { [S.sel.key]: null }); }
  else if (e.key.length === 1 && el._start) { e.preventDefault(); el._start(e.key); }
});
document.addEventListener('mousedown', e => { if (!e.target.closest('.board,.pop,.overlay,.drawer,.toolbar')) selectCell(null); });

/* ---------- bloqueo por inactividad (10 min) ---------- */
let lockTimer;
function resetLock() { if (!S.user || document.getElementById('lockscreen')) return; clearTimeout(lockTimer); lockTimer = setTimeout(lockScreen, 10 * 60 * 1000); }
['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(ev => document.addEventListener(ev, resetLock, { passive: true, capture: true }));
function lockScreen() {
  if (!S.user || document.getElementById('lockscreen')) return;
  try { sessionStorage.setItem('lpp-lock', '1'); } catch (e) {}
  closePop(); if (document.activeElement) document.activeElement.blur();
  const msg = h('p', { class: 'lock-msg', role: 'alert' });
  const inp = h('input', { type: 'password', class: 'input', placeholder: 'Palabra clave', autocomplete: 'off', 'aria-label': 'Palabra clave' });
  const clock = h('div', { class: 'lock-time' }); const tick = () => { const d = new Date(); clock.textContent = d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }); clock.dataset.d = d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }); };
  tick(); const iv = setInterval(tick, 15000);
  const unlock = () => {
    if (inp.value.trim().toLowerCase() === 'hola') { clearInterval(iv); el.remove(); try { sessionStorage.removeItem('lpp-lock'); } catch (e) {} resetLock(); }
    else { msg.textContent = 'Palabra clave incorrecta'; inp.value = ''; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); inp.focus(); }
  };
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') unlock(); });
  const card = h('div', { class: 'lock-card' }, h('img', { src: 'logo-white.png', alt: 'Liberty', class: 'lock-logo' }), clock, h('div', { class: 'lock-date' }, clock.dataset.d),
    h('div', { class: 'lock-ico', svg: I.lock }), h('h2', {}, 'Bloqueo de pantalla'), h('p', {}, 'La sesión se bloqueó por 10 minutos de inactividad. Escribe la palabra clave para continuar.'),
    h('form', { onsubmit: e => { e.preventDefault(); unlock(); } }, inp, h('button', { class: 'btn accent block', type: 'submit' }, 'Desbloquear')), msg,
    h('button', { class: 'link lock-out', type: 'button', onclick: () => { clearInterval(iv); el.remove(); sb.auth.signOut(); } }, 'Cerrar sesión'));
  const el = h('div', { id: 'lockscreen', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bloqueo de pantalla' }, card);
  document.body.append(el); setTimeout(() => inp.focus(), 50);
}

/* ---------- Mis notas ---------- */
const STOP = new Set('de la que el en y a los del se las por un para con no una su al lo como mas más pero sus le ya o este si sí porque esta entre cuando muy sin sobre tambien también me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto antes algunos que qué unos yo otro otras otra el él tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mi mis tu te ti tus ellas es son fue ser han ha he hemos tiene tienen era fueron va van vamos hacer hace hizo bien solo'.split(' '));
const KEYW = /importante|urgente|pendiente|acuerd|decisi|decid|fecha|plazo|entrega|riesgo|problema|accion|responsable|monto|presupuesto|objetivo|meta|siguiente|proximo|conclusi|resultado|\$|\d/;
function summarize(text) {
  const sents = String(text || '').split(/(?<=[.!?;])\s+|\n+/).map(s => s.replace(/^[-*•\d.)\s]+/, '').trim()).filter(s => s.length > 12);
  if (sents.length <= 3) return sents;
  const words = t => norm(t).match(/[a-zñ0-9]+/g) || [], freq = {};
  words(text).forEach(w => { if (w.length > 2 && !STOP.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const sc = sents.map((s, i) => { const ws = words(s).filter(w => !STOP.has(w)); return { s, i, v: ws.reduce((a, w) => a + (freq[w] || 0), 0) / Math.sqrt(ws.length || 1) + (KEYW.test(norm(s)) ? 3 : 0) + (i === 0 ? 1 : 0) }; });
  const n = Math.min(5, Math.max(3, Math.ceil(sents.length * .3)));
  return sc.sort((a, b) => b.v - a.v).slice(0, n).sort((a, b) => a.i - b.i).map(x => x.s);
}
let noteTimer;
function saveNote(n) { n.updated_at = new Date().toISOString(); clearTimeout(noteTimer); noteTimer = setTimeout(() => q(sb.from('notes').update({ title: n.title, body: n.body, updated_at: n.updated_at }).eq('id', n.id)).catch(() => {}), 700); }
async function newNote() {
  const [row] = await q(sb.from('notes').insert({ title: '', body: '', author: S.user.id, updated_at: new Date().toISOString() }).select());
  S.notes.push(row); render(); openNote(row.id); setTimeout(() => $('#note-title')?.focus(), 50);
}
async function delNote(n) {
  if (!await confirmBox('Eliminar nota', `¿Eliminar "${n.title || 'Sin título'}" y sus adjuntos?`)) return;
  const at = S.attachments.filter(a => a.project_id === n.id);
  if (at.length) { await sb.storage.from('attachments').remove(at.map(a => a.path)); await q(sb.from('attachments').delete().eq('project_id', n.id)); }
  await q(sb.from('notes').delete().eq('id', n.id));
  S.notes = S.notes.filter(x => x.id !== n.id); S.attachments = S.attachments.filter(a => a.project_id !== n.id); document.querySelector('.drawer')?.remove(); render(); toast('Nota eliminada', 'ok');
}
function renderDiary(m) { return renderKanban(m); }
const fdate = d => d ? new Date(d).toLocaleString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
function openNote(id) {
  document.querySelector('.drawer')?.remove();
  const cur = S.notes.find(n => n.id === id); if (!cur) return;
  const ro = !canEdit(), sumBox = h('ul', { class: 'note-sum-list' });
  const drawSum = () => { const s = summarize(cur.body); sumBox.replaceChildren(...(s.length ? s.map(x => h('li', {}, x)) : [h('li', { class: 'muted' }, 'Escribe la nota y aquí aparecerán los puntos más importantes.')])); };
  const grow = el => { el.style.height = 'auto'; el.style.height = Math.max(220, el.scrollHeight + 4) + 'px'; };
  const body = h('textarea', { class: 'input note-body', id: 'note-body', value: cur.body || '', placeholder: 'Escribe tu nota…', disabled: ro, 'aria-label': 'Cuerpo de la nota',
    oninput: e => { cur.body = e.target.value; grow(e.target); drawSum(); saveNote(cur); } });
  const files = h('div', {}); drawFiles(cur, files, () => { render(); openNote(cur.id); });
  const dr = h('aside', { class: 'drawer note-drawer', role: 'dialog', 'aria-label': 'Nota' },
    h('div', { class: 'drawer-head' }, h('input', { class: 'input note-title', id: 'note-title', value: cur.title || '', placeholder: 'Título', disabled: ro, 'aria-label': 'Título', oninput: e => { cur.title = e.target.value; saveNote(cur); } }),
      h('button', { class: 'icon-btn', svg: I.x, 'aria-label': 'Cerrar', onclick: () => { dr.remove(); render(); } })),
    h('div', { class: 'drawer-body' },
      h('p', { class: 'muted', style: 'margin:0 0 10px' }, 'Creada ' + fdate(cur.created_at) + ' · actualizada ' + fdate(cur.updated_at) + ' · se guarda sola'),
      body, h('h3', { class: 'note-h' }, 'Adjuntos'), files,
      h('div', { class: 'note-sum' }, h('h3', { class: 'note-h' }, 'Resumen de lo más importante'), sumBox),
      ro ? null : h('div', { style: 'display:flex;justify-content:flex-end;margin-top:16px' }, h('button', { class: 'btn danger', onclick: () => delNote(cur) }, 'Eliminar nota'))));
  document.body.append(dr); drawSum(); setTimeout(() => grow(body), 0);
}
/* ---------- Pendientes por persona (tablero de cajitas) ---------- */
const myCols = () => S.kcols.filter(c => c.author === S.user.id).sort(byPos);
const cardsOf = cid => S.kcards.filter(k => k.col_id === cid).sort(byPos);
const nextPos = arr => (arr.length ? Math.max(...arr.map(x => x.position || 0)) : 0) + 1000;
async function addPerson() {
  const r = await ask('Nueva persona', [{ name: 'name', label: 'Nombre', required: true }], 'Agregar'); if (!r) return;
  const [row] = await q(sb.from('kcols').insert({ name: r.name.trim(), color: PALETTE[myCols().length % PALETTE.length], position: nextPos(myCols()), author: S.user.id }).select());
  S.kcols.push(row); render();
}
async function cardForm(col, k) {
  const r = await ask(k ? 'Editar' : 'Nuevo pendiente · ' + col.name, [
    { name: 'title', label: 'Título', value: k?.title || '', required: true }, { name: 'body', label: 'Descripción', type: 'textarea', value: k?.body || '' },
    { name: 'type', label: 'Tipo', type: 'select', value: k ? (k.is_task ? 'task' : 'note') : 'task', options: [{ value: 'task', label: 'Tarea (se puede marcar como ejecutada)' }, { value: 'note', label: 'Nota / tema a conversar' }] },
    { name: 'done', label: 'Estado', type: 'select', value: k?.done ? 'yes' : 'no', options: [{ value: 'no', label: 'Pendiente' }, { value: 'yes', label: 'Ejecutada' }] },
    { name: 'due', label: 'Fecha (opcional)', type: 'date', value: k?.due || '' }], k ? 'Guardar' : 'Agregar');
  if (!r) return;
  const v = { title: r.title.trim(), body: r.body.trim(), is_task: r.type === 'task', done: r.type === 'task' && r.done === 'yes', due: r.due || null };
  if (k) { Object.assign(k, v); render(); await q(sb.from('kcards').update(v).eq('id', k.id)); }
  else { const [row] = await q(sb.from('kcards').insert({ ...v, col_id: col.id, position: nextPos(cardsOf(col.id)), author: S.user.id }).select()); S.kcards.push(row); render(); }
}
async function setCard(k, v) { Object.assign(k, v); render(); await q(sb.from('kcards').update(v).eq('id', k.id)); }
function renderKanban(m) {
  const ro = !canEdit(), qq = norm(S.kq || '');
  const match = k => !qq || norm(k.title).includes(qq) || norm(k.body).includes(qq);
  const card = (k, col) => {
    const due = k.due ? new Date(k.due + 'T00:00') : null, late = due && !k.done && due < new Date(new Date().toDateString());
    return h('div', { class: 'kcard' + (k.done ? ' done' : ''), 'data-id': k.id, style: `--pc:${col.color}` },
      h('div', { class: 'kcard-top' },
        k.is_task ? h('input', { type: 'checkbox', class: 'kchk', checked: !!k.done, disabled: ro, title: k.done ? 'Ejecutada' : 'Marcar como ejecutada', 'aria-label': 'Ejecutada', onclick: e => e.stopPropagation(), onchange: e => setCard(k, { done: e.target.checked }) }) : null,
        h('b', { class: 'ktitle', onclick: () => !ro && cardForm(col, k) }, k.title || 'Sin título'),
        ro ? null : h('button', { class: 'icon-btn', svg: I.dots, 'aria-label': 'Opciones', onclick: e => menu(e.currentTarget, [
          { label: 'Editar', run: () => cardForm(col, k) },
          { label: k.is_task ? 'Convertir en nota' : 'Convertir en tarea', run: () => setCard(k, { is_task: !k.is_task, done: false }) },
          k.is_task && { label: k.done ? 'Marcar pendiente' : 'Marcar ejecutada', run: () => setCard(k, { done: !k.done }) },
          '-', { label: 'Eliminar', danger: true, run: async () => { if (!await confirmBox('Eliminar', `¿Eliminar "${k.title}"?`)) return; S.kcards = S.kcards.filter(x => x.id !== k.id); render(); await q(sb.from('kcards').delete().eq('id', k.id)); } }]) })),
      k.body ? h('p', { class: 'kbody', onclick: () => !ro && cardForm(col, k) }, k.body) : null,
      h('div', { class: 'kfoot' }, h('span', { class: 'ktag' }, k.is_task ? 'Tarea' : 'Nota'),
        k.is_task ? h('span', { class: 'kstate ' + (k.done ? 'ok' : 'pend') }, k.done ? '✓ Ejecutada' : 'Pendiente') : null,
        due ? h('span', { class: 'kdue' + (late ? ' late' : '') }, due.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })) : null));
  };
  const colEl = col => {
    const cards = cardsOf(col.id), shown = cards.filter(match), pend = cards.filter(k => k.is_task && !k.done).length;
    return h('section', { class: 'kcol', 'data-id': col.id, style: `--pc:${col.color}` },
      h('header', { class: 'kcol-head' }, ro ? null : h('span', { class: 'kgrip drag', svg: I.grip, title: 'Arrastrar persona' }),
        h('span', { class: 'kavatar' }, initials(col.name)),
        h('button', { class: 'kname', title: ro ? '' : 'Cambiar nombre', onclick: async () => { if (ro) return; const r = await ask('Cambiar nombre', [{ name: 'n', label: 'Nombre', value: col.name, required: true }]); if (r) { col.name = r.n.trim(); render(); await q(sb.from('kcols').update({ name: col.name }).eq('id', col.id)); } } }, col.name),
        h('span', { class: 'kcount', title: 'Tareas pendientes / total' }, `${pend} / ${cards.length}`),
        ro ? null : h('button', { class: 'icon-btn', svg: I.dots, 'aria-label': 'Opciones de ' + col.name, onclick: e => menu(e.currentTarget, [
          { label: 'Cambiar nombre', run: async () => { const r = await ask('Cambiar nombre', [{ name: 'n', label: 'Nombre', value: col.name, required: true }]); if (r) { col.name = r.n.trim(); render(); await q(sb.from('kcols').update({ name: col.name }).eq('id', col.id)); } } },
          { label: 'Cambiar color', run: () => colorPicker(document.querySelector(`.kcol[data-id="${col.id}"] .kavatar`), col.color, async c => { col.color = c || '#0080E8'; render(); await q(sb.from('kcols').update({ color: col.color }).eq('id', col.id)); }) },
          { label: 'Ocultar ejecutadas', run: () => { S.khide = !S.khide; render(); } },
          '-', { label: 'Eliminar persona', danger: true, run: async () => { if (!await confirmBox('Eliminar persona', `¿Eliminar a "${col.name}" y sus ${cards.length} cajitas?`)) return;
            S.kcards = S.kcards.filter(k => k.col_id !== col.id); S.kcols = S.kcols.filter(x => x.id !== col.id); render();
            for (const k of cards) await q(sb.from('kcards').delete().eq('id', k.id)); await q(sb.from('kcols').delete().eq('id', col.id)); } }]) })),
      h('div', { class: 'kcards', 'data-col': col.id }, shown.filter(k => !(S.khide && k.done)).map(k => card(k, col))),
      ro ? null : h('button', { class: 'kadd', onclick: () => cardForm(col) }, h('span', { svg: I.plus }), 'Agregar'));
  };
  const notes = S.notes.filter(n => n.author === S.user.id && (!qq || norm(n.title).includes(qq) || norm(n.body).includes(qq))).sort((x, y) => String(y.updated_at).localeCompare(String(x.updated_at)));
  const notesCol = h('section', { class: 'kcol knotes', style: '--pc:#ED7F32' },
    h('header', { class: 'kcol-head' }, h('span', { class: 'kavatar', svg: I.book }), h('span', { class: 'kname', style: 'cursor:default' }, 'Mis notas'), h('span', { class: 'kcount' }, notes.length)),
    h('div', { class: 'kcards' }, notes.map(n => { const na = S.attachments.filter(x => x.project_id === n.id).length, b = String(n.body || '');
      return h('div', { class: 'kcard knote', style: 'cursor:pointer', role: 'button', tabIndex: 0, onclick: () => openNote(n.id), onkeydown: e => { if (e.key === 'Enter') openNote(n.id); } },
        h('b', { class: 'ktitle' }, n.title || 'Sin título'), b ? h('p', { class: 'kbody' }, b) : null,
        h('div', { class: 'kfoot' }, h('span', { class: 'ktag' }, 'Nota'), na ? h('span', { class: 'ktag' }, '📎 ' + na) : null, h('span', { class: 'kdue' }, new Date(n.updated_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })))); })),
    ro ? null : h('button', { class: 'kadd', onclick: newNote }, h('span', { svg: I.plus }), 'Nueva nota'));
  const search = h('input', { class: 'input', type: 'search', id: 'kq', placeholder: 'Buscar en notas y pendientes…', value: S.kq || '', 'aria-label': 'Buscar pendientes',
    oninput: e => { S.kq = e.target.value; clearTimeout(search._t); search._t = setTimeout(() => { render(); const i = $('#kq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 200); } });
  const cols = myCols();
  m.replaceChildren(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Mis notas'), h('p', { class: 'muted' }, 'Tus notas y los temas pendientes con cada persona · arrastra las cajitas entre personas')),
    h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, ro ? null : h('button', { class: 'btn', id: 'btn-note', onclick: newNote }, h('span', { svg: I.plus }), 'Nota'), ro ? null : h('button', { class: 'btn primary', id: 'btn-person', onclick: addPerson }, h('span', { svg: I.plus }), 'Persona'))),
    h('div', { class: 'toolbar' }, h('div', { class: 'search' }, h('span', { svg: I.search }), search),
      h('label', { class: 'check', style: 'margin:0' }, h('input', { type: 'checkbox', checked: !!S.khide, onchange: e => { S.khide = e.target.checked; render(); } }), 'Ocultar ejecutadas')),
    h('div', { class: 'kanban' }, notesCol, cols.map(colEl), ro ? null : h('button', { class: 'kcol kaddcol', onclick: addPerson }, h('span', { svg: I.plus }), 'Agregar persona')));
  if (ro || !window.Sortable) return;
  m.querySelectorAll('.kcol:not(.knotes) .kcards').forEach(el => Sortable.create(el, { group: 'kcards', animation: 150, ghostClass: 'kghost', forceFallback: true, fallbackOnBody: true, emptyInsertThreshold: 40, filter: 'input,button', preventOnFilter: false, onEnd: async e => {
    const ups = [];
    for (const list of new Set([e.from, e.to])) [...list.querySelectorAll('.kcard')].forEach((n, i) => { const k = S.kcards.find(x => x.id === n.dataset.id); const pos = (i + 1) * 1000, cid = list.dataset.col;
      if (k && (k.position !== pos || k.col_id !== cid)) { k.position = pos; k.col_id = cid; ups.push(q(sb.from('kcards').update({ position: pos, col_id: cid }).eq('id', k.id))); } });
    render(); await Promise.all(ups);
  } }));
  const kb = m.querySelector('.kanban');
  if (kb) Sortable.create(kb, { handle: '.kgrip', draggable: '.kcol', animation: 150, onEnd: async () => {
    const ups = [...kb.querySelectorAll('.kcol')].map((n, i) => { const c = S.kcols.find(x => x.id === n.dataset.id); c.position = (i + 1) * 1000; return q(sb.from('kcols').update({ position: c.position }).eq('id', c.id)); });
    render(); await Promise.all(ups);
  } });
}

/* ---------- tamaño de letra (por usuario/navegador) ---------- */
function getFs() { try { return Number(localStorage.getItem('lpp-fs')) || 13; } catch (e) { return 13; } }
function applyFs() { document.documentElement.style.setProperty('--fs', getFs() + 'px'); }
function setFs(d) { const v = Math.max(8, Math.min(18, getFs() + d)); try { localStorage.setItem('lpp-fs', v); } catch (e) {} applyFs(); const el = $('#fs-val'); if (el) el.textContent = v + 'px'; }
applyFs();

/* ---------- vista tablero ---------- */
function renderBoard(m) {
  const all = S.groups.flatMap(g => visibleTop(g.id));
  const t = totals(all), meta = S.settings.meta;
  const kpis = h('section', { class: 'kpis', 'aria-label': 'Indicadores' },
    h('div', { class: 'kpi g' }, h('div', { class: 'l' }, 'Retorno total'), h('div', { class: 'v', id: 'k-ret' }, fmtMoney(t.ret)), h('div', { class: 's' }, `${t.n} proyectos`)),
    h('div', { class: 'kpi o' }, h('div', { class: 'l' }, 'Costo de desarrollo'), h('div', { class: 'v', id: 'k-cost' }, fmtMoney(t.cost)), h('div', { class: 's' }, 'USD')),
    h('div', { class: 'kpi' }, h('div', { class: 'l' }, 'Balance neto'), h('div', { class: 'v', id: 'k-net', style: t.net < 0 ? 'color:#B3261E' : '' }, fmtMoney(t.net)), h('div', { class: 's' }, 'Retorno − costo')),
    h('div', { class: 'kpi p' }, h('div', { class: 'l' }, 'Avance promedio'), h('div', { class: 'v', id: 'k-prog' }, Math.round(t.prog) + '%'), h('div', { class: 'bar' }, h('i', { style: `width:${t.prog}%` }))),
    h('div', { class: 'kpi r' + (canEdit() ? ' click' : ''), title: canEdit() ? 'Editar meta' : '', onclick: canEdit() ? editMeta : null },
      h('div', { class: 'l' }, meta?.label || 'Meta'), h('div', { class: 'v' }, meta?.value != null ? fmtMoney(meta.value) : '—'),
      h('div', { class: 's' }, meta?.value != null ? 'Clic para editar' : 'Sin meta definida')),
    h('div', { class: 'kpi r' }, h('div', { class: 'l' }, 'Faltante para la meta'), h('div', { class: 'v', id: 'k-falta', style: meta?.value != null && t.ret >= meta.value ? 'color:var(--green)' : '' }, meta?.value != null ? fmtMoney(Math.max(0, meta.value - t.ret)) : '—'),
      h('div', { class: 's' }, meta?.value != null ? (t.ret >= meta.value ? 'Meta alcanzada' : Math.round(t.ret / meta.value * 100) + '% alcanzado') : 'Define la meta'), meta?.value ? h('div', { class: 'bar' }, h('i', { style: `width:${Math.min(100, t.ret / meta.value * 100)}%;background:var(--orange)` })) : null));
  const statusOpts = colByKey('project', 'status')?.options || [], areaOpts = colByKey('project', 'area')?.options || [];
  const persons = allPersons();
  const search = h('input', { class: 'input', type: 'search', id: 'q', placeholder: 'Buscar proyectos, IDs, personas…', value: S.q, 'aria-label': 'Buscar',
    oninput: e => { S.q = e.target.value; clearTimeout(search._t); search._t = setTimeout(() => { render(); const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 200); } });
  const sel = (key, label, opts) => h('select', { class: 'input', id: 'f-' + key, 'aria-label': label, onchange: e => { S.f[key] = e.target.value; render(); } },
    h('option', { value: '' }, label), opts.map(o => h('option', { value: o, selected: S.f[key] === o }, o)));
  const tb = h('section', { class: 'toolbar' },
    canEdit() ? h('button', { class: 'btn primary', id: 'btn-new', onclick: () => quickAdd() }, h('span', { svg: I.plus }), 'Nuevo proyecto') : null,
    h('div', { class: 'search' }, h('span', { svg: I.search }), search),
    sel('status', 'Estatus', statusOpts.map(o => o.label)), sel('area', 'Área', areaOpts.map(o => o.label)), sel('person', 'Persona', persons),
    (S.q || S.f.status || S.f.area || S.f.person) ? h('button', { class: 'btn ghost', onclick: () => { S.q = ''; S.f = { status: '', area: '', person: '' }; render(); } }, 'Limpiar') : null,
    h('div', { class: 'fs-ctl', title: 'Tamaño de letra de la tabla' }, h('button', { 'aria-label': 'Letra más pequeña', onclick: () => setFs(-1) }, 'A−'), h('span', { id: 'fs-val' }, getFs() + 'px'), h('button', { 'aria-label': 'Letra más grande', onclick: () => setFs(1) }, 'A+')),
    h('div', { class: 'sep' }),
    canEdit() ? h('button', { class: 'btn', id: 'btn-group', onclick: addGroup }, '+ Grupo') : null,
    canEdit() ? h('button', { class: 'btn', onclick: importExcelModal }, h('span', { svg: I.up }), 'Importar') : null,
    h('button', { class: 'btn', id: 'btn-export', onclick: exportExcel }, h('span', { svg: I.down }), 'Exportar'));
  const groups = S.groups.slice().sort(byPos).map(renderGroup);
  m.replaceChildren(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Pipeline de proyectos'), h('p', { class: 'muted' }, 'Haz clic en cualquier celda para editar · arrastra filas y columnas para reordenar'))),
    kpis, tb, h('div', { id: 'groups' }, groups.length ? groups : h('div', { class: 'empty-state' }, 'Aún no hay grupos. ', canEdit() ? h('button', { class: 'btn primary', onclick: addGroup }, 'Crear grupo') : null)));
  setupSortables(m);
}
function renderGroup(g) {
  const list = visibleTop(g.id), pc = cols('project'), collapsed = S.collapsed.has(g.id);
  const head = h('div', { class: 'group-head', style: `--gc:${g.color}` },
    h('button', { class: 'icon-btn', 'aria-label': 'Contraer grupo', onclick: () => { collapsed ? S.collapsed.delete(g.id) : S.collapsed.add(g.id); render(); } }, h('span', { class: 'caret', style: collapsed ? '' : 'transform:rotate(90deg);display:inline-grid', svg: I.caret })),
    h('button', { class: 'gname', style: `color:${g.color}`, onclick: e => canEdit() && editGroupName(g) }, g.name),
    h('span', { class: 'count' }, `${list.length} proyecto${list.length === 1 ? '' : 's'}`),
    canEdit() ? h('button', { class: 'icon-btn', svg: I.dots, 'aria-label': 'Opciones de grupo', onclick: e => menu(e.currentTarget, [
      { label: 'Agregar proyecto', run: () => quickAdd(g.id) }, { label: 'Renombrar', run: () => editGroupName(g) },
      { label: 'Cambiar color', run: () => colorPicker(head, g.color, async c => { g.color = c || '#0080E8'; render(); await q(sb.from('groups').update({ color: g.color }).eq('id', g.id)); }) },
      '-', { label: 'Eliminar grupo', danger: true, run: () => delGroup(g) }]) }) : null);
  if (collapsed) return h('section', { class: 'group', 'data-group': g.id }, head);
  const thead = h('thead', {}, h('tr', { 'data-scope': 'project' }, h('th', { class: 'c-drag' }, h('div', { class: 'th-in' }, h('span', {}, 'Pos.'))), h('th', { class: 'c-name' }, h('div', { class: 'th-in' }, h('span', {}, 'Proyecto')), nameResizer('project')),
    pc.map(c => colHeader(c)), h('th', { class: 'c-add' }, canEdit() ? h('button', { class: 'icon-btn', svg: I.plus, title: 'Agregar columna', 'aria-label': 'Agregar columna', onclick: () => addColumn('project') }) : null)));
  const tbody = h('tbody', { 'data-group': g.id });
  for (const p of list) { tbody.append(projectRow(p, pc)); if (S.open.has(p.id)) tbody.append(subRow(p, pc.length + 3)); }
  const foot = h('tfoot', {});
  if (canEdit()) foot.append(h('tr', { class: 'add-row' }, h('td', { class: 'c-drag' }), h('td', { class: 'c-name', colSpan: 1 },
    h('input', { placeholder: '+ Agregar proyecto', 'aria-label': 'Agregar proyecto', onkeydown: async e => { if (e.key === 'Enter' && e.target.value.trim()) { const v = e.target.value.trim(); e.target.value = ''; await createProject({ group_id: g.id, data: { name: v } }); } } })),
    pc.map(c => h('td', {}, addCell({ group_id: g.id }, c))), h('td', {})));
  foot.append(sumRow(list, pc));
  return h('section', { class: 'group', 'data-group': g.id, style: `--gc:${g.color}` }, head,
    h('div', { class: 'tbl-wrap', 'data-scroll': g.id }, h('table', { class: 'board', style: `width:${64 + nameW('project') + pc.reduce((s, c) => s + c.width, 0) + 44}px` }, h('colgroup', {}, h('col', { style: 'width:64px' }), h('col', { 'data-namew': 'project', style: `width:${nameW('project')}px` }), pc.map(c => h('col', { 'data-colw': c.id, style: `width:${c.width}px` })), h('col', { style: 'width:44px' })), thead, tbody, foot)));
}
function colHeader(c) {
  return h('th', { class: 'dcol', 'data-col': c.id, title: c.label }, h('div', { class: 'th-in' }, h('span', {}, c.label),
    canEdit() ? h('button', { class: 'icon-btn', svg: I.dots, 'aria-label': 'Opciones de columna ' + c.label, onclick: e => { e.stopPropagation(); colMenu(e.currentTarget, c); } }) : null),
    canEdit() ? h('span', { class: 'rz', title: 'Arrastra para cambiar el ancho · doble clic: ancho estándar', onpointerdown: e => resizeCol(e, c), ondblclick: () => setColWidth(c, 150) }) : null);
}
function sumRow(list, pc, isSub) {
  return h('tr', { class: 'sum-row' }, h('td', { class: 'c-drag' }), h('td', { class: 'c-name' }, h('div', { class: 'cell ro muted' }, isSub ? 'Totales' : 'Totales del grupo')),
    pc.map(c => {
      if (c.type === 'money' || c.type === 'number') { let t = 0, any = false; for (const p of list) { const v = isSub ? num(p.data[c.key]) : (c.type === 'money' ? moneyOf(p, c.key).v : num(p.data[c.key])); if (v != null) { t += v; any = true; } } return h('td', {}, h('div', { class: 'cell ro num', 'data-sum': c.key }, any ? (c.type === 'money' ? fmtMoney(t) : t) : '')); }
      if (c.type === 'progress') { const a = list.length ? list.reduce((s, p) => s + (isSub ? subProgress(p) : progressOf(p).v), 0) / list.length : 0; return h('td', {}, h('div', { class: 'cell ro' }, progBar(a))); }
      if (c.type === 'status' || c.type === 'label') {
        const counts = {}; list.forEach(p => { const v = p.data[c.key] || ''; counts[v] = (counts[v] || 0) + 1; });
        return h('td', {}, h('div', { class: 'battery', title: Object.entries(counts).map(([k, n]) => `${k || 'Sin valor'}: ${n}`).join(' · ') },
          Object.entries(counts).map(([k, n]) => h('i', { style: `width:${n / list.length * 100}%;background:${optColor(c, k)}` }))));
      }
      return h('td', {});
    }), h('td', {}));
}
const optColor = (c, v) => (c.options || []).find(o => o.label === v)?.color || (v ? '#ACABB0' : '#C9CACF');
const progBar = (v, calc) => h('div', { class: 'prog' + (calc ? ' calc' : ''), title: calc ? 'Calculado a partir de subtareas' : '' }, h('div', { class: 'bar' }, h('i', { style: `width:${v}%;background:${v >= 100 ? 'var(--green)' : 'var(--blue)'}` })), h('em', {}, Math.round(v) + '%'));

function projectRow(p, pc) {
  const subs = subsOf(p.id), open = S.open.has(p.id);
  const nC = S.comments.filter(c => c.project_id === p.id).length, nF = S.attachments.filter(a => a.project_id === p.id).length;
  const tr = h('tr', { class: 'prow' + (p.height > 44 ? ' tall' : ''), 'data-id': p.id, style: rowStyle(p) });
  tr.append(h('td', { class: 'c-drag' }, h('div', { class: 'posc' }, canEdit() ? h('span', { class: 'drag', svg: I.grip, title: 'Arrastrar' }) : null, posEditor(p)), rowResizer(p)),
    h('td', { class: 'c-name' }, h('div', { class: 'name-cell' },
      h('button', { class: 'icon-btn', 'aria-label': open ? 'Ocultar subtareas' : 'Ver subtareas', 'aria-expanded': String(open), onclick: () => { open ? S.open.delete(p.id) : S.open.add(p.id); render(); } }, h('span', { class: 'caret' + (open ? ' open' : ''), style: 'display:inline-grid', svg: I.caret })),
      colorDot(p), nameEditor(p), subs.length ? h('span', { class: 'subcount', title: 'Subtareas' }, subs.length) : null,
      h('button', { class: 'icon-btn badge-btn', 'aria-label': 'Comentarios', title: 'Comentarios e historial', onclick: () => openDrawer(p.id, 'comments') }, h('span', { svg: I.chat }), nC ? h('b', {}, nC) : null),
      h('button', { class: 'icon-btn badge-btn', 'aria-label': 'Archivos', title: 'Archivos', onclick: () => openDrawer(p.id, 'files') }, h('span', { svg: I.clip }), nF ? h('b', {}, nF) : null),
      h('button', { class: 'icon-btn', svg: I.dots, 'aria-label': 'Acciones del proyecto', onclick: e => rowMenu(e.currentTarget, p) }))),
    ...pc.map(c => h('td', {}, cellView(p, c, false))), h('td', {}));
  return tr;
}
function subRow(p, span) {
  const sc = cols('sub'), subs = subsOf(p.id);
  const tbody = h('tbody', { 'data-parent': p.id });
  subs.forEach(s => tbody.append(h('tr', { class: 'srow' + (s.height > 44 ? ' tall' : ''), 'data-id': s.id, style: s.color ? rowStyle(s) : [p.color ? `--rc:${lighten(p.color, .5)};--rowbg:${tint(p.color, .04)}` : '', s.height ? `--rh:${s.height}px` : ''].join(';') },
    h('td', { class: 'c-drag' }, h('div', { class: 'posc' }, canEdit() ? h('span', { class: 'drag', svg: I.grip }) : null, posEditor(s)), rowResizer(s)),
    h('td', { class: 'c-name' }, h('div', { class: 'name-cell' }, colorDot(s), nameEditor(s),
      h('button', { class: 'icon-btn badge-btn', 'aria-label': 'Comentarios', onclick: () => openDrawer(s.id, 'comments') }, h('span', { svg: I.chat }), S.comments.some(c => c.project_id === s.id) ? h('b', {}, S.comments.filter(c => c.project_id === s.id).length) : null),
      h('button', { class: 'icon-btn badge-btn', 'aria-label': 'Archivos', onclick: () => openDrawer(s.id, 'files') }, h('span', { svg: I.clip }), S.attachments.some(a => a.project_id === s.id) ? h('b', {}, S.attachments.filter(a => a.project_id === s.id).length) : null),
      h('button', { class: 'icon-btn', svg: I.dots, 'aria-label': 'Acciones de subtarea', onclick: e => rowMenu(e.currentTarget, s) }))),
    sc.map(c => h('td', {}, cellView(s, c, true))), h('td', {}))));
  const foot = h('tfoot', {});
  if (canEdit()) foot.append(h('tr', { class: 'add-row' }, h('td', { class: 'c-drag' }), h('td', { class: 'c-name' },
    h('input', { placeholder: '+ Agregar subtarea', 'aria-label': 'Agregar subtarea', onkeydown: async e => { if (e.key === 'Enter' && e.target.value.trim()) { const v = e.target.value.trim(); e.target.value = ''; await createProject({ group_id: p.group_id, parent_id: p.id, data: { name: v } }); } } })), sc.map(c => h('td', {}, addCell({ group_id: p.group_id, parent_id: p.id }, c))), h('td', {})));
  if (subs.length) foot.append(sumRow(subs, sc, true));
  return h('tr', { class: 'subwrap', 'data-for': p.id }, h('td', { colSpan: span, style: p.color ? `--rc:${p.color}` : '' },
    h('div', { class: 'subbox', 'data-scroll': 'sub-' + p.id }, h('table', { class: 'board', style: `width:${64 + nameW('sub') + sc.reduce((s, c) => s + c.width, 0) + 44}px` },
      h('colgroup', {}, h('col', { style: 'width:64px' }), h('col', { 'data-namew': 'sub', style: `width:${nameW('sub')}px` }), sc.map(c => h('col', { 'data-colw': c.id, style: `width:${c.width}px` })), h('col', { style: 'width:44px' })),
      h('thead', {}, h('tr', { 'data-scope': 'sub' }, h('th', { class: 'c-drag' }, h('div', { class: 'th-in' }, h('span', {}, 'Pos.'))), h('th', { class: 'c-name' }, h('div', { class: 'th-in' }, h('span', {}, 'Subtarea')), nameResizer('sub')), sc.map(c => colHeader(c)),
        h('th', { class: 'c-add' }, canEdit() ? h('button', { class: 'icon-btn', svg: I.plus, 'aria-label': 'Agregar columna de subtarea', onclick: () => addColumn('sub') }) : null))),
      tbody, foot))));
}
const nameW = scope => (S.settings.nameWidths || {})[scope] || (scope === 'sub' ? 260 : 300);
function nameResizer(scope) {
  if (!canEdit()) return null;
  return h('span', { class: 'rz', title: 'Arrastra para cambiar el ancho', ondblclick: () => saveNameW(scope, null), onpointerdown: e => {
    const x0 = e.clientX, w0 = nameW(scope), els = document.querySelectorAll(`col[data-namew="${scope}"]`); let w = w0;
    dragPointer(e, ev => { w = Math.max(80, Math.min(700, Math.round(w0 + ev.clientX - x0))); els.forEach(c => c.style.width = w + 'px'); fitTables(els); }, () => { if (w !== w0) saveNameW(scope, w); });
  } });
}
async function saveNameW(scope, w) { const nw = { ...(S.settings.nameWidths || {}) }; if (w) nw[scope] = w; else delete nw[scope]; S.settings.nameWidths = nw; render(); await q(sb.from('settings').upsert({ key: 'nameWidths', value: nw })); }
function addCell(opts, c) {
  if (!canEdit()) return null;
  return h('div', { class: 'cell add-cell', tabIndex: 0, title: 'Clic para crear una línea nueva con este dato', onclick: async () => {
    const row = await createProject({ ...opts, data: { name: opts.parent_id ? 'Nueva subtarea' : 'Nuevo proyecto' } });
    setTimeout(() => { const el = document.querySelector(`tr[data-id="${row.id}"] [data-key="${c.key}"]`) || document.querySelector(`tr[data-id="${row.id}"] .stars`); if (el) { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); el.click(); } }, 50);
  } }, '+');
}
const lighten = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.substr(i, 2), 16) + (255 - parseInt(hex.substr(i, 2), 16)) * f).toString(16).padStart(2, '0')).join('').toUpperCase();
const siblings = p => p.parent_id ? subsOf(p.parent_id) : topOf(p.group_id);
function posEditor(p) {
  const n = num(p.data.pos);
  const b = h('button', { class: 'pos' + (n == null ? ' empty' : ''), title: canEdit() ? 'Posición · clic para asignarla' : 'Posición', disabled: !canEdit(), onclick: e => {
    e.stopPropagation();
    const inp = h('input', { type: 'number', min: 1, value: n ?? '', class: 'pos-in', 'aria-label': 'Posición' });
    let done = false; const fin = async ok => { if (done) return; done = true; const v = inp.value.trim() === '' ? null : Math.max(1, Math.round(num(inp.value) || 1)); if (ok && v !== n) await setPos(p, v); else render(); };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') fin(true); if (ev.key === 'Escape') fin(false); }); inp.addEventListener('blur', () => fin(true));
    b.replaceWith(inp); inp.focus(); inp.select();
  } }, n ?? '');
  return b;
}
async function setPos(p, v) { // si el número ya está ocupado, los siguientes se corren uno
  if (v != null && siblings(p).some(x => x !== p && num(x.data.pos) === v)) {
    const shift = siblings(p).filter(x => x !== p && num(x.data.pos) != null && num(x.data.pos) >= v).sort((a, b) => num(a.data.pos) - num(b.data.pos));
    let next = v; for (const x of shift) { if (num(x.data.pos) > next) break; next = num(x.data.pos) + 1; await patch(x, { pos: next }, true); }
  }
  await patch(p, { pos: v });
}
const rowStyle = p => [p.color ? `--rc:${p.color};--rowbg:${tint(p.color)}` : '', p.height ? `--rh:${p.height}px` : ''].join(';');
function colorDot(p) {
  return h('button', { class: 'cdot', style: `background:${p.color || '#fff'}`, title: 'Color de la línea', 'aria-label': 'Color de la línea', disabled: !canEdit(),
    onclick: e => colorPicker(e.currentTarget, p.color, async c => { p.color = c; render(); await q(sb.from('projects').update({ color: c }).eq('id', p.id)); }) });
}
function fitTables(cols) { new Set([...cols].map(c => c.closest('table'))).forEach(t => { if (!t) return; let w = 0; t.querySelectorAll(':scope > colgroup > col').forEach(c => w += parseFloat(c.style.width) || 0); t.style.width = w + 'px'; }); }
function dragPointer(e, move, end) {
  e.preventDefault(); e.stopPropagation(); const el = e.currentTarget; el.setPointerCapture?.(e.pointerId);
  const mv = ev => move(ev), up = ev => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); end(ev); };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
}
function resizeCol(e, c) {
  const x0 = e.clientX, w0 = c.width, cols = document.querySelectorAll(`col[data-colw="${c.id}"]`); let w = w0;
  dragPointer(e, ev => { w = Math.max(30, Math.min(900, Math.round(w0 + ev.clientX - x0))); cols.forEach(cl => cl.style.width = w + 'px'); fitTables(cols); }, () => { if (w !== w0) setColWidth(c, w); });
}
async function setColWidth(c, w) { c.width = w; render(); await q(sb.from('columns').update({ width: w }).eq('id', c.id)); }
function rowResizer(p) {
  if (!canEdit()) return null;
  return h('span', { class: 'rzr', title: 'Arrastra para cambiar el alto · doble clic: alto estándar', ondblclick: () => setRowHeight(p, null), onpointerdown: e => {
    const tr = e.currentTarget.closest('tr'), y0 = e.clientY, h0 = tr.offsetHeight; let hh = h0;
    dragPointer(e, ev => { hh = Math.max(24, Math.min(400, Math.round(h0 + ev.clientY - y0))); tr.style.setProperty('--rh', hh + 'px'); tr.classList.toggle('tall', hh > 44); }, () => { if (hh !== h0) setRowHeight(p, hh); });
  } });
}
async function setRowHeight(p, v) { p.height = v; render(); await q(sb.from('projects').update({ height: v }).eq('id', p.id)); }
function nameEditor(p) {
  const sp = h('span', { class: 'nm', tabIndex: 0, 'data-key': 'name', title: p.data.name || '' }, p.data.name || 'Sin nombre');
  if (!canEdit()) return sp;
  const start = () => {
    const inp = h('input', { class: 'input', value: p.data.name || '', style: 'padding:5px 6px;font-size:13px', 'aria-label': 'Nombre' });
    let done = false;
    const fin = async save => { if (done) return; done = true; const v = inp.value.trim(); if (save && v && v !== p.data.name) await patch(p, { name: v }); else render(); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') fin(true); if (e.key === 'Escape') fin(false); });
    inp.addEventListener('blur', () => fin(true));
    sp.replaceWith(inp); inp.focus(); if (typeof init === 'string') { inp.value = init; } else inp.select();
  };
  let init = null; sp._start = ch => { init = ch; start(); };
  sp.addEventListener('click', () => sp.classList.contains('sel') ? start() : selectCell(sp)); sp.addEventListener('dblclick', start);
  return sp;
}

/* ---------- celdas ---------- */
function cellView(p, c, isSub) {
  const v = p.data[c.key], ro = !canEdit();
  switch (c.type) {
    case 'status': case 'label': {
      const col = optColor(c, v);
      return h('div', { class: 'pill' + (v ? '' : ' empty'), role: 'button', tabIndex: 0, style: `background:${col};color:${textOn(col)}`, 'data-key': c.key,
        onclick: e => { selectCell(e.currentTarget); if (!ro) statusPicker(e.currentTarget, p, c); } }, v || '');
    }
    case 'money': case 'number': {
      const m = c.type === 'money' && !isSub ? moneyOf(p, c.key) : { v: num(v), calc: false };
      const txt = m.v == null ? '' : c.type === 'money' ? fmtMoney(m.v) : String(m.v);
      return inlineInput(p, c, h('span', { class: 'txt', title: m.calc ? 'Suma de subtareas (no se duplica)' : '' }, txt, m.calc ? h('small', { style: 'color:var(--blue);margin-left:3px' }, 'Σ') : null), 'num', 'number');
    }
    case 'progress': {
      const pr = isSub ? { v: subProgress(p), calc: false } : progressOf(p);
      if (pr.calc) return h('div', { class: 'cell ro', 'data-key': c.key }, progBar(pr.v, true));
      return inlineInput(p, c, progBar(pr.v), '', 'number');
    }
    case 'date': return inlineInput(p, c, h('span', { class: 'txt' }, v ? new Date(v + 'T00:00').toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''), 'center', 'date');
    case 'priority': return h('div', { class: 'cell ro', 'data-key': c.key, tabIndex: 0, onclick: e => selectCell(e.currentTarget) }, h('div', { class: 'stars', role: 'radiogroup', 'aria-label': 'Prioridad' }, [1, 2, 3, 4, 5].map(n => h('button', { class: n <= (num(v) || 0) ? 'on' : '', 'aria-label': n + ' de 5', disabled: ro, onclick: () => patch(p, { [c.key]: num(v) === n ? null : n }) }, '★'))));
    case 'checkbox': return h('div', { class: 'cell center ro', 'data-key': c.key, tabIndex: 0, onclick: e => selectCell(e.currentTarget) }, h('input', { type: 'checkbox', checked: !!v, disabled: ro, 'aria-label': c.label, onchange: e => patch(p, { [c.key]: e.target.checked }) }));
    case 'person': {
      const d = h('div', { class: 'cell' + (ro ? ' ro' : ''), tabIndex: 0, 'data-key': c.key, title: v || '' }, h('div', { class: 'tags' }, personsOf(v).map(n => h('span', { class: 'tag', style: `--tc:${hashColor(n)}` }, h('i', {}, initials(n)), n))));
      if (!ro) { d._start = () => personPicker(d, p, c); d.addEventListener('click', () => d.classList.contains('sel') ? d._start() : selectCell(d)); d.addEventListener('dblclick', () => d._start()); }
      else d.addEventListener('click', () => selectCell(d));
      return d;
    }
    case 'longtext': return inlineInput(p, c, h('span', { class: 'txt' }, v || ''), '', 'textarea');
    default: return inlineInput(p, c, h('span', { class: 'txt' }, v ?? ''), '', 'text');
  }
}
function inlineInput(p, c, content, cls, kind) {
  const d = h('div', { class: 'cell ' + cls + (canEdit() ? '' : ' ro'), tabIndex: canEdit() ? 0 : -1, 'data-key': c.key, title: typeof p.data[c.key] === 'string' ? p.data[c.key] : '' }, content);
  if (!canEdit()) return d;
  let init = null;
  const start = () => {
    if (d.querySelector('input,textarea')) return;
    const cur = p.data[c.key] ?? '';
    if (kind === 'textarea') {
      const ta = h('textarea', { class: 'input', value: typeof init === 'string' ? init : cur, style: `width:${Math.max(320, Math.min(540, d.offsetWidth + 40))}px`, 'aria-label': c.label });
      pop(d, h('div', { style: 'padding:6px' }, ta, h('div', { style: 'display:flex;justify-content:flex-end;gap:6px;margin-top:6px' },
        h('button', { class: 'btn', onclick: closePop }, 'Cancelar'), h('button', { class: 'btn primary', onclick: async () => { closePop(); if (ta.value !== cur) await patch(p, { [c.key]: ta.value.trim() || null }); } }, 'Guardar'))));
      popEl.classList.add('wide'); ta.style.height = Math.min(innerHeight * .6, ta.scrollHeight + 6) + 'px'; { const r = d.getBoundingClientRect(), pw = popEl.offsetWidth, ph = popEl.offsetHeight; popEl.style.left = Math.max(8, Math.min(r.left, innerWidth - pw - 8)) + 'px'; let y = r.bottom + 4; if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 4); popEl.style.top = y + 'px'; }
      ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); return;
    }
    const inp = h('input', { type: kind, value: typeof init === 'string' && kind !== 'date' ? init : cur, step: 'any', 'aria-label': c.label, min: c.type === 'progress' ? 0 : null, max: c.type === 'progress' ? 100 : null });
    let done = false;
    const fin = async save => {
      if (done) return; done = true;
      let val = inp.value.trim();
      if (kind === 'number') { val = val === '' ? null : num(val); if (c.type === 'progress' && val != null) val = Math.max(0, Math.min(100, val)); }
      else val = val || null;
      if (save && String(val ?? '') !== String(cur ?? '')) await patch(p, { [c.key]: val }); else render();
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') fin(true); if (e.key === 'Escape') fin(false); });
    inp.addEventListener('blur', () => fin(true));
    d.replaceChildren(inp); inp.focus(); if (typeof init !== 'string' && inp.select && kind !== 'date') inp.select();
  };
  d._start = ch => { init = ch; start(); };
  d.addEventListener('click', e => { if (d.querySelector('input')) return; d.classList.contains('sel') ? start() : selectCell(d); }); d.addEventListener('dblclick', () => start());
  return d;
}
const personsOf = v => String(v || '').split(/\s*[\/,;]\s*|\s+y\s+/).map(s => s.trim()).filter(Boolean);
const allPersons = () => [...new Set(S.projects.flatMap(p => S.columns.filter(c => c.type === 'person').flatMap(c => personsOf(p.data[c.key]))))].sort((a, b) => a.localeCompare(b, 'es'));
function personPicker(anchor, p, c) {
  let names = personsOf(p.data[c.key]);
  const save = () => patch(p, { [c.key]: names.length ? names.join(', ') : null });
  const box = h('div', { style: 'padding:6px;width:min(320px,85vw)' });
  const draw = () => {
    const inp = h('input', { class: 'input', list: 'lpp-persons', placeholder: 'Escribe un nombre y Enter', 'aria-label': 'Agregar persona',
      onkeydown: e => { if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); const n = inp.value.trim(); if (!names.some(x => norm(x) === norm(n))) names.push(n); save(); draw(); } if (e.key === 'Escape') closePop(); } });
    inp.setAttribute('list', 'lpp-persons');
    box.replaceChildren(h('div', { class: 'tags', style: 'margin-bottom:8px;min-height:24px' }, names.length ? names.map((n, i) => h('span', { class: 'tag', style: `--tc:${hashColor(n)}` }, h('i', {}, initials(n)), n,
      h('button', { 'aria-label': 'Quitar ' + n, onclick: () => { names.splice(i, 1); save(); draw(); } }, '×'))) : h('span', { class: 'muted' }, 'Sin personas')),
      inp, h('datalist', { id: 'lpp-persons' }, allPersons().filter(n => !names.includes(n)).map(n => h('option', { value: n }))),
      h('div', { style: 'display:flex;justify-content:flex-end;margin-top:8px' }, h('button', { class: 'btn primary', onclick: closePop }, 'Listo')));
    setTimeout(() => inp.focus(), 0);
  };
  pop(anchor, box); draw();
}
function statusPicker(anchor, p, c) {
  pop(anchor, h('div', { class: 'opt-list' },
    (c.options || []).map(o => h('button', { style: `background:${o.color};color:${textOn(o.color)}`, onclick: () => { closePop(); patch(p, { [c.key]: o.label }); } }, o.label)),
    h('button', { style: 'background:var(--g100);color:var(--g800)', onclick: () => { closePop(); patch(p, { [c.key]: null }); } }, 'Vaciar'),
    h('button', { style: 'background:#fff;color:var(--blue);border:1px solid var(--g400)', onclick: () => { closePop(); editLabels(c); } }, 'Editar etiquetas')));
}

/* ---------- persistencia ---------- */
async function patch(p, obj, noUndo) {
  if (!noUndo) pushUndo({ type: 'patch', items: [{ id: p.id, prev: Object.fromEntries(Object.keys(obj).map(k => [k, p.data[k] ?? null])), next: { ...obj } }] });
  Object.assign(p.data, obj); render();
  try { await q(sb.rpc('patch_project', { p_id: p.id, p_patch: obj })); } catch { await loadAll(); render(); }
}
async function createProject({ group_id, parent_id = null, data, color = null }, silent) {
  const sib = parent_id ? subsOf(parent_id) : topOf(group_id);
  const position = (sib.length ? Math.max(...sib.map(s => s.position)) : 0) + 1000;
  const [row] = await q(sb.from('projects').insert({ group_id, parent_id, data, color, position }).select());
  S.projects.push({ ...row, data: row.data || {} }); if (parent_id) S.open.add(parent_id); pushUndo({ type: 'create', ids: [row.id] });
  if (!silent) { render(); toast(parent_id ? 'Subtarea creada' : 'Proyecto creado', 'ok'); }
  return row;
}
async function duplicate(p) {
  const dataCopy = JSON.parse(JSON.stringify(p.data)); dataCopy.name = (p.data.name || 'Sin nombre') + ' (copia)';
  const sib = p.parent_id ? subsOf(p.parent_id) : topOf(p.group_id), idx = sib.indexOf(p), next = sib[idx + 1];
  const position = next ? (p.position + next.position) / 2 : p.position + 1000;
  const [row] = await q(sb.from('projects').insert({ group_id: p.group_id, parent_id: p.parent_id, data: dataCopy, color: p.color, position }).select());
  S.projects.push(row);
  const subs = subsOf(p.id);
  if (subs.length) { const rows = await q(sb.from('projects').insert(subs.map(s => ({ group_id: p.group_id, parent_id: row.id, data: s.data, color: s.color, position: s.position }))).select()); S.projects.push(...rows); }
  render(); toast('Duplicado', 'ok');
}
async function removeProject(p) {
  if (!await confirmBox('Eliminar', `¿Eliminar "${p.data.name || 'Sin nombre'}"${subsOf(p.id).length ? ' y sus subtareas' : ''}? Esta acción no se puede deshacer.`)) return;
  const ids = [p.id, ...subsOf(p.id).map(s => s.id)];
  const paths = S.attachments.filter(a => ids.includes(a.project_id)).map(a => a.path);
  if (paths.length) await sb.storage.from('attachments').remove(paths);
  await q(sb.from('projects').delete().eq('id', p.id));
  S.projects = S.projects.filter(x => !ids.includes(x.id)); S.attachments = S.attachments.filter(a => !ids.includes(a.project_id));
  render(); toast('Eliminado', 'ok');
}
function rowMenu(anchor, p) {
  menu(anchor, [
    { label: 'Editar detalles', run: () => openDrawer(p.id, 'details') }, { label: 'Abrir comentarios', run: () => openDrawer(p.id, 'comments') }, { label: 'Archivos adjuntos', run: () => openDrawer(p.id, 'files') }, { label: 'Historial de cambios', run: () => openDrawer(p.id, 'history') },
    canEdit() && '-',
    canEdit() && !p.parent_id && { label: 'Agregar subtarea', run: async () => { const r = await ask('Nueva subtarea', [{ name: 'name', label: 'Nombre', required: true }]); if (r) await createProject({ group_id: p.group_id, parent_id: p.id, data: { name: r.name.trim() } }); } },
    canEdit() && { label: 'Duplicar', run: () => duplicate(p) },
    canEdit() && { label: 'Color de fila', run: () => colorPicker(anchor, p.color, async c => { p.color = c; render(); await q(sb.from('projects').update({ color: c }).eq('id', p.id)); }) },
    canEdit() && !p.parent_id && S.groups.length > 1 && { label: 'Mover a grupo…', run: async () => {
      const r = await ask('Mover a grupo', [{ name: 'g', label: 'Grupo', type: 'select', value: p.group_id, options: S.groups.map(g => ({ value: g.id, label: g.name })) }], 'Mover');
      if (r && r.g !== p.group_id) { const ids = [p.id, ...subsOf(p.id).map(s => s.id)]; await q(sb.from('projects').update({ group_id: r.g }).in('id', ids)); S.projects.filter(x => ids.includes(x.id)).forEach(x => x.group_id = r.g); render(); }
    } },
    canEdit() && '-', canEdit() && { label: 'Eliminar', danger: true, run: () => removeProject(p) }]);
}
async function quickAdd(gid) {
  if (!S.groups.length) await addGroup();
  const g = gid || S.groups.slice().sort(byPos)[0]?.id; if (!g) return;
  const r = await ask('Nuevo proyecto', [{ name: 'name', label: 'Nombre del proyecto', required: true }, { name: 'g', label: 'Grupo', type: 'select', value: g, options: S.groups.map(x => ({ value: x.id, label: x.name })) }], 'Crear');
  if (r) await createProject({ group_id: r.g, data: { name: r.name.trim(), status: 'Pendiente' } });
}
async function addGroup() {
  const r = await ask('Nuevo grupo', [{ name: 'name', label: 'Nombre del grupo', required: true }], 'Crear'); if (!r) return;
  const [row] = await q(sb.from('groups').insert({ name: r.name.trim(), color: PALETTE[S.groups.length % PALETTE.length], position: (S.groups.length ? Math.max(...S.groups.map(g => g.position)) : 0) + 1 }).select());
  S.groups.push(row); render();
}
async function editGroupName(g) { const r = await ask('Renombrar grupo', [{ name: 'name', label: 'Nombre', value: g.name, required: true }]); if (!r) return; g.name = r.name.trim(); render(); await q(sb.from('groups').update({ name: g.name }).eq('id', g.id)); }
async function delGroup(g) {
  if (!await confirmBox('Eliminar grupo', `¿Eliminar "${g.name}" y todos sus proyectos?`)) return;
  await q(sb.from('groups').delete().eq('id', g.id)); S.groups = S.groups.filter(x => x.id !== g.id); S.projects = S.projects.filter(p => p.group_id !== g.id); render();
}
async function editMeta() {
  const m = S.settings.meta || {};
  const r = await ask('Meta financiera', [{ name: 'label', label: 'Nombre', value: m.label || 'Meta 2027' }, { name: 'value', label: 'Monto (USD)', type: 'number', value: m.value ?? '' }]); if (!r) return;
  S.settings.meta = { label: r.label || 'Meta', value: num(r.value) }; render();
  await q(sb.from('settings').upsert({ key: 'meta', value: S.settings.meta }));
}

/* ---------- columnas ---------- */
const TYPES = [['text', 'Texto'], ['longtext', 'Texto largo'], ['number', 'Número'], ['money', 'Moneda (USD)'], ['status', 'Estado'], ['label', 'Etiqueta'], ['person', 'Persona'], ['date', 'Fecha'], ['priority', 'Prioridad'], ['progress', 'Avance %'], ['checkbox', 'Casilla']];
async function addColumn(scope, preset) {
  const r = preset || await ask(scope === 'sub' ? 'Nueva columna de subtareas' : 'Nueva columna', [{ name: 'label', label: 'Nombre', required: true }, { name: 'type', label: 'Tipo', type: 'select', value: 'text', options: TYPES.map(([v, l]) => ({ value: v, label: l })) }], 'Agregar');
  if (!r) return null;
  let key = 'c_' + norm(r.label).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30); while (colByKey(scope, key)) key += '_';
  const opts = ['status', 'label'].includes(r.type) ? (r.options || [{ label: 'Pendiente', color: '#6A6D76' }, { label: 'En curso', color: '#ED7F32' }, { label: 'Listo', color: '#3F886B' }]) : [];
  const [row] = await q(sb.from('columns').insert({ scope, key, label: r.label.trim(), type: r.type, position: (cols(scope).length ? Math.max(...cols(scope).map(c => c.position)) : 0) + 1, width: r.width || 150, options: opts }).select());
  S.columns.push(row); if (!preset) render(); return row;
}
function colMenu(anchor, c) {
  menu(anchor, [
    { label: 'Renombrar', run: async () => { const r = await ask('Renombrar columna', [{ name: 'label', label: 'Nombre', value: c.label, required: true }]); if (r) { c.label = r.label.trim(); render(); await q(sb.from('columns').update({ label: c.label }).eq('id', c.id)); } } },
    { label: 'Ancho', run: async () => { const r = await ask('Ancho de columna', [{ name: 'w', label: 'Píxeles (30–900)', type: 'number', value: c.width }]); if (r) { c.width = Math.max(30, Math.min(900, num(r.w) || 150)); render(); await q(sb.from('columns').update({ width: c.width }).eq('id', c.id)); } } },
    ['status', 'label'].includes(c.type) && { label: 'Editar etiquetas', run: () => editLabels(c) },
    { label: 'Mover a la izquierda', run: () => moveCol(c, -1) }, { label: 'Mover a la derecha', run: () => moveCol(c, 1) },
    '-', { label: 'Eliminar columna', danger: true, run: async () => {
      if (!await confirmBox('Eliminar columna', `¿Eliminar "${c.label}"? Los valores de esta columna quedarán ocultos.`)) return;
      await q(sb.from('columns').delete().eq('id', c.id)); S.columns = S.columns.filter(x => x.id !== c.id); render(); } }]);
}
async function moveCol(c, dir) { const list = cols(c.scope), i = list.indexOf(c), j = i + dir; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; await saveColOrder(list); }
async function saveColOrder(list) { list.forEach((c, i) => c.position = i + 1); render(); await Promise.all(list.map(c => q(sb.from('columns').update({ position: c.position }).eq('id', c.id)))); }
function editLabels(c) {
  const rows = h('div', {});
  const addRow = (o = { label: '', color: PALETTE[rows.children.length % PALETTE.length] }) => {
    const color = h('input', { type: 'color', value: o.color, style: 'width:42px;height:38px;border:0;background:none;padding:0', 'aria-label': 'Color' });
    const lab = h('input', { class: 'input', value: o.label, placeholder: 'Etiqueta', 'aria-label': 'Etiqueta' });
    const r = h('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:8px' }, color, lab, h('button', { class: 'icon-btn', svg: I.x, 'aria-label': 'Quitar', onclick: () => r.remove() }));
    r._get = () => ({ label: lab.value.trim(), color: color.value.toUpperCase() }); rows.append(r);
  };
  (c.options || []).forEach(addRow);
  modal('Etiquetas · ' + c.label, h('div', {}, rows, h('button', { class: 'btn', onclick: () => addRow() }, '+ Etiqueta')), [{ label: 'Cancelar', run: x => x() }, { label: 'Guardar', cls: 'primary', run: async close => {
    const opts = [...rows.children].map(r => r._get()).filter(o => o.label); close();
    const renames = (c.options || []).map((o, i) => [o.label, opts[i]?.label]).filter(([a, b]) => b && a !== b && !(c.options || []).some(x => x.label === b));
    c.options = opts; render(); await q(sb.from('columns').update({ options: opts }).eq('id', c.id));
    for (const [from, to] of renames) for (const p of S.projects.filter(p => p.data[c.key] === from)) await patch(p, { [c.key]: to });
  } }]);
}

/* ---------- drag & drop ---------- */
function setupSortables(root) {
  if (!canEdit() || !window.Sortable) return;
  root.querySelectorAll('tbody[data-group]').forEach(tb => Sortable.create(tb, { group: 'rows', handle: '.drag', draggable: 'tr.prow', animation: 150, onStart: () => closePop(), onEnd: e => onRowsDrop(e) }));
  root.querySelectorAll('tbody[data-parent]').forEach(tb => Sortable.create(tb, { handle: '.drag', draggable: 'tr.srow', animation: 150, onEnd: e => onSubDrop(e.to) }));
  root.querySelectorAll('thead tr[data-scope]').forEach(tr => Sortable.create(tr, { draggable: 'th.dcol', filter: 'button,.rz', preventOnFilter: false, animation: 150, onEnd: e => {
    const ids = [...e.to.querySelectorAll('th.dcol')].map(th => th.dataset.col); const list = ids.map(id => S.columns.find(c => c.id === id)).filter(Boolean);
    if (e.oldIndex !== e.newIndex) saveColOrder(list);
  } }));
}
async function onRowsDrop(e) {
  const updates = [];
  for (const tb of new Set([e.from, e.to])) {
    const gid = tb.dataset.group;
    [...tb.querySelectorAll('tr.prow')].forEach((tr, i) => {
      const p = findP(tr.dataset.id); if (!p) return; const pos = (i + 1) * 1000;
      if (p.position !== pos || p.group_id !== gid) {
        const moved = p.group_id !== gid; p.position = pos; p.group_id = gid; updates.push(q(sb.from('projects').update({ position: pos, group_id: gid }).eq('id', p.id)));
        if (moved) subsOf(p.id).forEach(s => { s.group_id = gid; updates.push(q(sb.from('projects').update({ group_id: gid }).eq('id', s.id))); });
      }
    });
  }
  render(); await Promise.all(updates);
}
async function onSubDrop(tb) {
  const ups = [...tb.querySelectorAll('tr.srow')].map((tr, i) => { const p = findP(tr.dataset.id); p.position = (i + 1) * 1000; return q(sb.from('projects').update({ position: p.position }).eq('id', p.id)); });
  render(); await Promise.all(ups);
}

/* ---------- drawer: comentarios, archivos, historial ---------- */
function openDrawer(id, tab = 'comments') {
  document.querySelector('.drawer')?.remove();
  const p = findP(id); if (!p) return;
  const body = h('div', { class: 'drawer-body' });
  const tabs = [['details', 'Detalles'], ['comments', 'Comentarios'], ['files', 'Archivos'], ['history', 'Historial']];
  const parent = p.parent_id ? findP(p.parent_id) : null;
  const dr = h('aside', { class: 'drawer', role: 'dialog', 'aria-label': 'Detalle' },
    h('div', { class: 'drawer-head' }, h('div', { style: 'flex:1;min-width:0' }, parent ? h('div', { class: 'muted' }, 'Subtarea de ' + (parent.data.name || '')) : h('div', { class: 'muted' }, p.data.code || ''), h('h3', {}, p.data.name || 'Sin nombre')),
      h('button', { class: 'icon-btn', svg: I.x, 'aria-label': 'Cerrar', onclick: () => dr.remove() })),
    h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, l]) => h('button', { class: k === tab ? 'on' : '', role: 'tab', onclick: () => openDrawer(id, k) }, l))), body);
  document.body.append(dr);
  if (tab === 'details') drawDetails(p, body); else if (tab === 'comments') drawComments(p, body); else if (tab === 'files') drawFiles(p, body); else drawHistory(p, body);
}
function drawDetails(p, body) {
  const scope = p.parent_id ? 'sub' : 'project', ro = !canEdit();
  const save = async (key, v) => { await patch(p, { [key]: v }); };
  const fieldFor = c => {
    const v = p.data[c.key], id = 'dt-' + c.key; let el;
    if (c.type === 'progress' && !p.parent_id && subsOf(p.id).length) el = h('div', {}, progBar(progressOf(p).v, true), h('small', { class: 'muted' }, 'Calculado con las subtareas'));
    else if (c.type === 'status' || c.type === 'label') el = h('select', { class: 'input', id, disabled: ro, onchange: e => save(c.key, e.target.value || null) }, h('option', { value: '' }, '—'), (c.options || []).map(o => h('option', { value: o.label, selected: v === o.label }, o.label)));
    else if (c.type === 'priority') el = h('select', { class: 'input', id, disabled: ro, onchange: e => save(c.key, num(e.target.value)) }, h('option', { value: '' }, '—'), [1, 2, 3, 4, 5].map(n => h('option', { value: n, selected: num(v) === n }, '★'.repeat(n))));
    else if (c.type === 'checkbox') el = h('input', { type: 'checkbox', id, checked: !!v, disabled: ro, onchange: e => save(c.key, e.target.checked) });
    else if (c.type === 'longtext') el = h('textarea', { class: 'input', id, value: v ?? '', disabled: ro, onchange: e => save(c.key, e.target.value.trim() || null) });
    else { const isNum = ['money', 'number', 'progress'].includes(c.type); el = h('input', { class: 'input', id, type: isNum ? 'number' : c.type === 'date' ? 'date' : 'text', step: 'any', value: v ?? '', disabled: ro,
      onchange: e => { let x = e.target.value.trim(); x = isNum ? num(x) : (x || null); if (c.type === 'progress' && x != null) x = Math.max(0, Math.min(100, x)); save(c.key, x); } }); }
    return h('div', { class: 'field' }, h('label', { for: id }, c.label + (c.type === 'money' ? ' (USD)' : '').replace(' (USD) (USD)', ' (USD)')), el);
  };
  body.replaceChildren(h('div', {},
    h('div', { class: 'field' }, h('label', { for: 'dt-name' }, 'Nombre'), h('input', { class: 'input', id: 'dt-name', value: p.data.name || '', disabled: ro, onchange: e => e.target.value.trim() && save('name', e.target.value.trim()) })),
    cols(scope).map(fieldFor),
    h('div', { class: 'field' }, h('label', {}, 'Color de la línea'), h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [null, ...PALETTE].map(c => h('button', { class: 'cdot big', disabled: ro, style: `background:${c || '#fff'}${p.color === c ? ';box-shadow:0 0 0 2px var(--g900)' : ''}`, 'aria-label': c || 'Sin color',
      onclick: async () => { p.color = c; render(); openDrawer(p.id, 'details'); await q(sb.from('projects').update({ color: c }).eq('id', p.id)); } }))))));
}
function drawComments(p, body) {
  const ta = h('textarea', { class: 'input', placeholder: 'Escribe una actualización…', 'aria-label': 'Comentario' });
  const list = S.comments.filter(c => c.project_id === p.id);
  body.replaceChildren(h('div', {}, h('div', { style: 'margin-bottom:16px' }, ta, h('div', { style: 'display:flex;justify-content:flex-end;margin-top:8px' }, h('button', { class: 'btn primary', onclick: async e => {
    const text = ta.value.trim(); if (!text) return; e.target.disabled = true;
    const [row] = await q(sb.from('comments').insert({ project_id: p.id, body: text, author_id: S.user.id, author_email: S.profile.email }).select());
    S.comments.unshift(row); render(); openDrawer(p.id, 'comments');
  } }, 'Publicar'))),
  list.length ? list.map(c => h('div', { class: 'cmt' }, h('div', { class: 'meta' }, h('span', { class: 'avatar', style: `width:24px;height:24px;font-size:10px;background:${hashColor(c.author_email)}` }, initials(c.author_email)),
    h('b', {}, c.author_email || 'Usuario'), h('span', {}, new Date(c.created_at).toLocaleString('es-CR')),
    (c.author_id === S.user.id || isAdmin()) ? h('button', { class: 'link', style: 'margin-left:auto;color:#B3261E;font-size:12px', onclick: async () => { await q(sb.from('comments').delete().eq('id', c.id)); S.comments = S.comments.filter(x => x.id !== c.id); render(); openDrawer(p.id, 'comments'); } }, 'Eliminar') : null),
    h('p', {}, c.body))) : h('p', { class: 'muted' }, 'Sin comentarios todavía.')));
}
const ACCEPT = '.html,.htm,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg';
const EXT_COLOR = { pdf: '#B3261E', doc: '#003FF9', docx: '#003FF9', xls: '#3F886B', xlsx: '#3F886B', csv: '#3F886B', ppt: '#ED7F32', pptx: '#ED7F32', html: '#9648D9', htm: '#9648D9' };
function drawFiles(p, body, after = () => openDrawer(p.id, 'files')) {
  const input = h('input', { type: 'file', multiple: true, accept: ACCEPT, class: 'hidden', id: 'file-input', onchange: e => upload(p, e.target.files, after) });
  const drop = h('div', { class: 'drop', role: 'button', tabIndex: 0, onclick: () => input.click(),
    ondragover: e => { e.preventDefault(); drop.classList.add('over'); }, ondragleave: () => drop.classList.remove('over'),
    ondrop: e => { e.preventDefault(); drop.classList.remove('over'); upload(p, e.dataTransfer.files, after); } },
    h('b', {}, 'Arrastra archivos o haz clic para cargar'), h('div', { class: 'muted' }, 'HTML, PDF, PowerPoint, Word, Excel e imágenes · máx. 25 MB'));
  const list = S.attachments.filter(a => a.project_id === p.id);
  body.replaceChildren(h('div', {}, canEdit() ? h('div', {}, drop, input) : null, list.length ? list.map(a => {
    const ext = (a.name.split('.').pop() || '').toLowerCase();
    return h('div', { class: 'file' }, h('span', { class: 'ext', style: `background:${EXT_COLOR[ext] || 'var(--blue)'}` }, ext.slice(0, 4)),
      h('div', { class: 'fi' }, h('b', { title: a.name }, a.name), h('span', { class: 'muted' }, `${(a.size / 1024).toFixed(0)} KB · ${new Date(a.created_at).toLocaleDateString('es-CR')}`)),
      h('button', { class: 'btn', onclick: () => viewFile(a) }, 'Ver'), h('button', { class: 'btn', onclick: () => downloadFile(a) }, 'Descargar'),
      canEdit() ? h('button', { class: 'icon-btn', svg: I.x, 'aria-label': 'Eliminar archivo', onclick: async () => {
        if (!await confirmBox('Eliminar archivo', `¿Eliminar "${a.name}"?`)) return;
        await q(sb.storage.from('attachments').remove([a.path])); await q(sb.from('attachments').delete().eq('id', a.id));
        S.attachments = S.attachments.filter(x => x.id !== a.id); render(); after();
      } }) : null);
  }) : h('p', { class: 'muted' }, 'Sin archivos adjuntos.')));
}
async function upload(p, files, after = () => openDrawer(p.id, 'files')) {
  const okExt = ACCEPT.split(',');
  for (const f of files) {
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    if (!okExt.includes(ext)) { toast(`Tipo no permitido: ${f.name}`, 'err'); continue; }
    if (f.size > 26214400) { toast(`Archivo supera 25 MB: ${f.name}`, 'err'); continue; }
    const path = `${p.id}/${uid()}${ext}`;
    toast('Subiendo ' + f.name + '…');
    const up = await sb.storage.from('attachments').upload(path, f, { contentType: f.type || 'application/octet-stream', upsert: false });
    if (up.error) { toast(up.error.message, 'err'); continue; }
    const [row] = await q(sb.from('attachments').insert({ project_id: p.id, name: f.name, path, mime: f.type, size: f.size, uploaded_by: S.user.id }).select());
    S.attachments.unshift(row);
  }
  render(); after();
}
async function signed(a, download) { const r = await q(sb.storage.from('attachments').createSignedUrl(a.path, 300, download ? { download: a.name } : undefined)); return r.signedUrl; }
async function downloadFile(a) {
  const r = await sb.storage.from('attachments').download(a.path);
  if (r.error) return toast(r.error.message, 'err');
  const url = URL.createObjectURL(r.data); const link = h('a', { href: url, download: a.name }); document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function viewFile(a) {
  const ext = (a.name.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf', 'html', 'htm'].includes(ext)) {
    const r = await sb.storage.from('attachments').download(a.path); if (r.error) return toast(r.error.message, 'err');
    const type = { pdf: 'application/pdf', html: 'text/html', htm: 'text/html', svg: 'image/svg+xml' }[ext] || r.data.type || 'image/' + ext;
    const url = URL.createObjectURL(new Blob([r.data], { type }));
    const view = ['pdf', 'html', 'htm'].includes(ext) ? h('iframe', { class: 'preview', src: url, title: a.name, sandbox: ext === 'pdf' ? null : '' }) : h('img', { class: 'preview-img', src: url, alt: a.name });
    modal(a.name, view, [{ label: 'Descargar', cls: 'primary', run: () => downloadFile(a) }], true);
  } else window.open(await signed(a, false), '_blank', 'noopener');
}
async function drawHistory(p, body) {
  body.replaceChildren(h('p', { class: 'muted' }, 'Cargando…'));
  const rows = await q(sb.from('activity').select('*').eq('project_id', p.id).order('created_at', { ascending: false }).limit(200));
  const label = k => k === 'name' ? 'Nombre' : (colByKey(p.parent_id ? 'sub' : 'project', k)?.label || k);
  const fv = v => v == null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const cm = S.comments.filter(c => c.project_id === p.id).map(c => ({ created_at: c.created_at, user_email: c.author_email, comment: c.body }));
  const all = [...rows, ...cm].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  body.replaceChildren(h('div', {}, all.length ? all.map(r => h('div', { class: 'hist' }, h('div', { class: 'muted' }, new Date(r.created_at).toLocaleString('es-CR'), ' · ', r.user_email || 'Sistema'),
    r.comment != null ? h('div', {}, 'Comentó: ', h('i', {}, r.comment.slice(0, 160))) : h('div', {}, h('b', {}, label(r.field)), ': ', fv(r.old_value), ' → ', fv(r.new_value)))) : h('p', { class: 'muted' }, 'Sin cambios registrados.')));
}

/* ---------- Ingresar proyectos ---------- */
function renderNew(m) {
  const pc = cols('project'), inputs = {};
  const field = c => {
    let el;
    if (c.type === 'status' || c.type === 'label') el = h('select', { class: 'input' }, h('option', { value: '' }, '—'), (c.options || []).map(o => h('option', { value: o.label }, o.label)));
    else if (c.type === 'longtext') el = h('textarea', { class: 'input' });
    else if (c.type === 'priority') el = h('select', { class: 'input' }, h('option', { value: '' }, '—'), [1, 2, 3, 4, 5].map(n => h('option', { value: n }, '★'.repeat(n))));
    else if (c.type === 'checkbox') el = h('input', { type: 'checkbox' });
    else el = h('input', { class: 'input', type: { money: 'number', number: 'number', progress: 'number', date: 'date' }[c.type] || 'text', step: 'any', min: c.type === 'progress' ? 0 : null, max: c.type === 'progress' ? 100 : null });
    el.id = 'nf-' + c.key; inputs[c.key] = [el, c];
    return h('div', { class: 'field' + (c.type === 'longtext' ? ' full' : '') }, h('label', { for: el.id }, c.label + (c.type === 'money' ? '' : '')), el);
  };
  const name = h('input', { class: 'input', id: 'nf-name', required: true });
  const grp = h('select', { class: 'input', id: 'nf-group' }, S.groups.slice().sort(byPos).map(g => h('option', { value: g.id }, g.name)));
  const form = h('form', { onsubmit: async e => {
    e.preventDefault(); if (!canEdit()) return;
    if (!S.groups.length) { toast('Crea primero un grupo', 'err'); return; }
    const data = { name: name.value.trim() };
    for (const [k, [el, c]] of Object.entries(inputs)) {
      let v = c.type === 'checkbox' ? el.checked : el.value.trim();
      if (['money', 'number', 'progress', 'priority'].includes(c.type)) v = num(v);
      if (v !== '' && v != null && v !== false) data[k] = v;
    }
    await createProject({ group_id: grp.value, data });
    form.reset(); name.focus();
  } },
    h('div', { class: 'form-grid' }, h('div', { class: 'field' }, h('label', { for: 'nf-name' }, 'Nombre del proyecto *'), name), h('div', { class: 'field' }, h('label', { for: 'nf-group' }, 'Grupo'), grp), pc.map(field)),
    h('div', { style: 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px' }, h('button', { type: 'reset', class: 'btn' }, 'Limpiar'), h('button', { type: 'submit', class: 'btn primary', id: 'nf-submit' }, 'Crear proyecto')));
  m.replaceChildren(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Ingresar proyectos'), h('p', { class: 'muted' }, 'Registra un proyecto nuevo o importa un archivo Excel.'))),
    canEdit() ? h('div', { class: 'cards' },
      h('section', { class: 'card' }, h('h2', {}, 'Nuevo proyecto'), h('p', { class: 'muted' }, 'Los importes se registran en USD. El avance se calcula automáticamente si el proyecto tiene subtareas.'), form),
      h('section', { class: 'card' }, h('h2', {}, 'Importar / exportar Excel'), h('p', { class: 'muted' }, 'Importa .xlsx: cada hoja con encabezado "Proyecto" se carga como grupo. Las columnas desconocidas se crean como columnas personalizadas.'),
        h('div', { style: 'display:grid;gap:8px;margin-top:14px' }, h('button', { class: 'btn primary block', onclick: importExcelModal }, h('span', { svg: I.up }), 'Importar Excel'), h('button', { class: 'btn block', onclick: exportExcel }, h('span', { svg: I.down }), 'Exportar Excel'),
          h('button', { class: 'btn block', onclick: addGroup }, '+ Nuevo grupo'))))
      : h('div', { class: 'card' }, h('p', {}, 'Tu rol es de solo lectura. Solicita a un administrador permisos de editor.')));
}

/* ---------- Excel ---------- */
const ALIAS = { code: ['id', 'codigo', 'id proyecto'], area: ['area', 'id area'], canal: ['canal'], responsable: ['responsable'], name: ['proyecto', 'nombre del proyecto', 'nombre', 'subtarea', 'item'], status: ['status', 'estatus', 'estado'],
  description: ['descripcion'], jira: ['id jira', 'jira'], comment: ['comentario', 'comentarios'], encargado: ['encargado'], pmo: ['pmo'], costo: ['costo'], dev_cost: ['costo de desarrollo (usd)', 'costo de desarrollo', 'costo desarrollo'],
  return: ['retorno (usd)', 'retorno', 'proyeccion', 'proyeccion (usd)'], progress: ['progreso', 'avance', 'avance %'], start: ['inicio', 'fecha inicio', 'fecha de inicio'], end: ['fin', 'fecha fin', 'fecha de fin'], priority: ['prioridad'], next_task: ['siguiente tarea', 'proxima tarea'], weight: ['peso %', 'peso'] };
function cellVal(c) {
  let v = c.value; if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') { if ('result' in v) v = v.result; else if (v.richText) v = v.richText.map(t => t.text).join(''); else if ('text' in v) v = v.text; else if (v.error) return null; }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') { v = v.trim(); return v || null; }
  return v ?? null;
}
const argbHex = a => a && /^[0-9A-F]{8}$/i.test(a) ? '#' + a.slice(2).toUpperCase() : null;
const nearWhite = hex => { if (!hex) return true; const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) > 235 && ((n >> 8) & 255) > 235 && (n & 255) > 235; };
function importExcelModal() {
  if (!window.ExcelJS) return toast('Cargando librería de Excel, intenta de nuevo', 'err');
  const file = h('input', { type: 'file', accept: '.xlsx', class: 'input', id: 'xlsx-input' });
  const upd = h('input', { type: 'checkbox', checked: true, id: 'xlsx-upd' });
  modal('Importar Excel', h('div', {}, h('div', { class: 'field' }, h('label', { for: 'xlsx-input' }, 'Archivo .xlsx'), file),
    h('label', { class: 'check' }, upd, 'Actualizar proyectos existentes con el mismo ID (o nombre si no tiene ID) en lugar de duplicarlos'),
    h('p', { class: 'muted' }, 'Se preservan valores, colores de fila, anchos de columna y formato de encabezado para la exportación.')),
    [{ label: 'Cancelar', run: c => c() }, { label: 'Importar', cls: 'primary', run: async close => { if (!file.files[0]) return toast('Selecciona un archivo', 'err'); close(); await importExcel(file.files[0], upd.checked); } }]);
}
async function importExcel(f, updateExisting) {
  toast('Importando ' + f.name + '…');
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await f.arrayBuffer());
  let created = 0, updated = 0, skipped = []; let fmtSaved = false;
  for (const ws of wb.worksheets) {
    let hr = 0, best = 0;
    for (let r = 1; r <= Math.min(10, ws.rowCount); r++) { const vals = []; ws.getRow(r).eachCell(c => { const v = cellVal(c); if (typeof v === 'string') vals.push(norm(v)); }); if (vals.some(v => ALIAS.name.includes(v)) && vals.length > best) { best = vals.length; hr = r; } }
    if (!hr) { skipped.push(ws.name); continue; }
    const head = ws.getRow(hr), map = {}; let maxCol = 0;
    ws.eachRow({ includeEmpty: false }, row => row.eachCell(c => { if (cellVal(c) != null) maxCol = Math.max(maxCol, c.col); }));
    const usedName = new Set(), colHas = ci => { for (let r = hr + 1; r <= ws.rowCount; r++) if (cellVal(ws.getRow(r).getCell(ci)) != null) return true; return false; };
    const colNum = ci => { for (let r = hr + 1; r <= ws.rowCount; r++) { const v = cellVal(ws.getRow(r).getCell(ci)); if (v != null && num(v) == null) return false; } return true; };
    let gap = maxCol + 1; // columnas tras una columna vacía = bloque lateral (resúmenes/notas), no forman parte de la tabla
    for (let ci = 2; ci <= maxCol; ci++) if (cellVal(head.getCell(ci)) == null && !colHas(ci)) { gap = ci; break; }
    const tableCols = []; for (let ci = 1; ci < gap; ci++) { const n = norm(cellVal(head.getCell(ci))); tableCols.push(n); }
    for (let ci = 1; ci < gap; ci++) {
      const raw = cellVal(head.getCell(ci)); const n = norm(raw);
      if (n === 'nivel') { map[ci] = { key: '_level' }; continue; }
      if (['posicion', 'pos', 'pos.', '#'].includes(n)) { map[ci] = { key: '_pos' }; continue; }
      let key = Object.keys(ALIAS).find(k => ALIAS[k].includes(n) && !usedName.has(k));
      const hasData = colHas(ci);
      if (!key) { const ex = S.columns.find(c => c.scope === 'project' && norm(c.label) === n && n); if (ex) key = ex.key; }
      // encabezado vacío con montos y sin columna de retorno/proyección → Retorno (USD)
      if (!key && !n && hasData && colNum(ci) && !usedName.has('return') && !tableCols.some(t => ALIAS.return.includes(t))) key = 'return';
      if (!key) {
        if (!hasData) continue;
        const isNum = colNum(ci);
        const col = await addColumn('project', { label: String(raw || 'Columna ' + ws.getColumn(ci).letter), type: isNum ? 'number' : 'text', width: Math.round((ws.getColumn(ci).width || 14) * 7.5) });
        key = col.key;
      }
      usedName.add(key); map[ci] = { key };
      const pcol = colByKey('project', key), w = ws.getColumn(ci).width;
      if (pcol && w && w > 2) { const px = Math.max(60, Math.min(600, Math.round(w * 7.5))); if (px !== pcol.width) { pcol.width = px; await q(sb.from('columns').update({ width: px }).eq('id', pcol.id)); } }
    }
    if (!fmtSaved) { const hc = head.getCell(Number(Object.keys(map)[0]) || 1); const fill = hc.fill?.fgColor?.argb, font = hc.font?.color?.argb; if (fill) { S.settings.excel_format = { headerFill: fill, headerFont: font || 'FFFFFFFF' }; await q(sb.from('settings').upsert({ key: 'excel_format', value: S.settings.excel_format })); fmtSaved = true; } }
    let g = S.groups.find(x => norm(x.name) === norm(ws.name));
    if (!g) { [g] = await q(sb.from('groups').insert({ name: ws.name, color: PALETTE[S.groups.length % PALETTE.length], position: S.groups.length + 1 }).select()); S.groups.push(g); }
    const side = {};
    for (let r = 1; r <= ws.rowCount; r++) {
      const vals = []; for (let ci = gap + 1; ci <= maxCol; ci++) { const v = cellVal(ws.getRow(r).getCell(ci)); if (v != null) vals.push(v); }
      if (!vals.length) continue;
      if (vals.length >= 2 && typeof vals[0] === 'string' && num(vals[1]) != null) { if (norm(vals[0]).startsWith('meta') && !S.settings.meta) { S.settings.meta = { label: vals[0], value: num(vals[1]) }; await q(sb.from('settings').upsert({ key: 'meta', value: S.settings.meta })); } }
      else if (r > hr) side[r] = vals.map(String).join(' · ');
    }
    let lastTop = null; const pending = [];
    for (let r = hr + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r), data = {}; let level = 'proyecto', color = null;
      for (const [ci, m] of Object.entries(map)) {
        const cell = row.getCell(Number(ci)); let v = cellVal(cell); if (v == null) continue;
        if (m.key === '_level') { level = norm(v); continue; }
        if (m.key === '_pos') { const n = num(v); if (n != null) data.pos = n; continue; }
        const scope = level === 'subtarea' ? 'sub' : 'project', col = colByKey(scope, m.key) || colByKey('project', m.key);
        const t = col?.type;
        if (['money', 'number', 'priority'].includes(t)) v = num(v);
        else if (t === 'progress') { v = num(v); if (v != null && v <= 1) v = Math.round(v * 10000) / 100; }
        else if (t === 'date') { v = typeof v === 'number' ? new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10) : String(v).slice(0, 10); }
        else if (t === 'checkbox') v = v === true || ['si', 'sí', 'true', '1', 'x'].includes(norm(v));
        else v = String(v);
        if (v != null && v !== '') data[m.key] = v;
        if ((t === 'status' || t === 'label') && v && col && !(col.options || []).some(o => norm(o.label) === norm(v))) { col.options = [...(col.options || []), { label: v, color: PALETTE[(col.options || []).length % PALETTE.length] }]; await q(sb.from('columns').update({ options: col.options }).eq('id', col.id)); }
        if (!color) { const hx = argbHex(cell.fill?.fgColor?.argb); if (hx && !nearWhite(hx) && m.key !== 'status' && m.key !== 'area') color = hx; }
      }
      if (!data.name && !data.code) continue;
      const rh = row.height ? Math.round(row.height / 0.75) : null;
      if (side[r]) data.comment = (data.comment ? data.comment + ' · ' : '') + 'Nota: ' + side[r];
      if (!data.name) data.name = data.code;
      if (level === 'subtarea' && lastTop) { pending.push({ parentRef: lastTop, data, color }); continue; }
      const ex = updateExisting && S.projects.find(p => !p.parent_id && p.group_id === g.id && (data.code ? p.data.code === data.code : !p.data.code && p.data.name === data.name));
      if (ex) { await patch(ex, data); if (color) { ex.color = color; await q(sb.from('projects').update({ color }).eq('id', ex.id)); } lastTop = ex; updated++; }
      else { lastTop = await createProject({ group_id: g.id, data, color }, true); created++; }
      if (rh && rh > 44 && lastTop) { lastTop.height = rh; await q(sb.from('projects').update({ height: rh }).eq('id', lastTop.id)); }
    }
    for (const s of pending) {
      const ex = updateExisting && subsOf(s.parentRef.id).find(x => x.data.name === s.data.name);
      if (ex) { await patch(ex, s.data); updated++; } else { await createProject({ group_id: g.id, parent_id: s.parentRef.id, data: s.data, color: s.color }, true); created++; }
    }
  }
  await loadAll(); S.view = 'board'; renderShell();
  toast(`Importación lista: ${created} creados, ${updated} actualizados${skipped.length ? ' · hojas omitidas: ' + skipped.join(', ') : ''}`, 'ok');
}
async function exportExcel() {
  if (!window.ExcelJS) return toast('Cargando librería de Excel, intenta de nuevo', 'err');
  const wb = new ExcelJS.Workbook(); wb.creator = 'Liberty Project Pipeline'; wb.created = new Date();
  const fmt = S.settings.excel_format || { headerFill: 'FF0080E8', headerFont: 'FFFFFFFF' };
  const pc = cols('project'), subOnly = cols('sub').filter(c => !colByKey('project', c.key));
  const all = [{ key: '_pos', label: 'Posición', type: 'number', width: 70 }, { key: 'name', label: 'Proyecto', type: 'text', width: 300 }, ...pc, ...subOnly, { key: '_level', label: 'Nivel', type: 'text', width: 90 }];
  const used = new Set();
  const setCell = (cell, c, val, p, isSub) => {
    if (c.type === 'money') { cell.value = val; cell.numFmt = '"$"#,##0'; }
    else if (c.type === 'progress') { cell.value = val == null ? null : val / 100; cell.numFmt = '0%'; }
    else if (c.type === 'date' && val) { cell.value = new Date(val + 'T00:00:00Z'); cell.numFmt = 'dd/mm/yyyy'; }
    else cell.value = val ?? null;
    if ((c.type === 'status' || c.type === 'label') && val) { const hx = optColor(colByKey(isSub ? 'sub' : 'project', c.key) || c, val).replace('#', ''); cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hx } }; cell.font = { color: { argb: textOn('#' + hx) === '#fff' ? 'FFFFFFFF' : 'FF2F333C' }, bold: true }; cell.alignment = { horizontal: 'center' }; }
  };
  for (const g of S.groups.slice().sort(byPos)) {
    let name = g.name.replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || 'Grupo'; while (used.has(name)) name = name.slice(0, 28) + '_' + used.size; used.add(name);
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1, xSplit: 1 }], properties: { tabColor: { argb: 'FF' + g.color.replace('#', '') } } });
    ws.columns = all.map(c => ({ header: c.label, key: c.key, width: Math.max(8, Math.round((c.width || 150) / 7.5)) }));
    const hr = ws.getRow(1); hr.height = 22;
    hr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fmt.headerFill } }; c.font = { bold: true, color: { argb: fmt.headerFont } }; c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; });
    for (const p of topOf(g.id)) {
      const row = ws.addRow({}); if (p.height) row.height = Math.round(p.height * 0.75);
      all.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        let val = c.key === '_pos' ? num(p.data.pos) : c.key === '_level' ? 'Proyecto' : c.type === 'money' ? moneyOf(p, c.key).v : c.type === 'progress' ? progressOf(p).v : p.data[c.key];
        if (p.color) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + p.color.replace('#', '') + '' } };
        setCell(cell, c, val, p, false);
        if (p.color && !['status', 'label'].includes(c.type)) cell.font = { color: { argb: textOn(p.color) === '#fff' ? 'FFFFFFFF' : 'FF2F333C' } };
        cell.alignment = cell.alignment || { vertical: 'top', wrapText: c.type === 'longtext' };
      });
      for (const s of subsOf(p.id)) {
        const r2 = ws.addRow({}); r2.outlineLevel = 1; if (s.height) r2.height = Math.round(s.height * 0.75);
        all.forEach((c, i) => {
          const cell = r2.getCell(i + 1);
          const val = c.key === '_pos' ? num(s.data.pos) : c.key === '_level' ? 'Subtarea' : c.key === 'progress' ? subProgress(s) : s.data[c.key];
          { const sc = s.color || (p.color ? lighten(p.color, .6) : null); if (sc) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + sc.replace('#', '') } }; }
          setCell(cell, c, val, s, true);
          if (c.key === 'name') cell.alignment = { indent: 2 };
        });
      }
    }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: all.length } };
  }
  const hdrStyle = ws => ws.getRow(1).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fmt.headerFill } }; c.font = { bold: true, color: { argb: fmt.headerFont } }; });
  const pName = id => { const p = findP(id); if (!p) return ''; const par = p.parent_id ? findP(p.parent_id) : null; return par ? `${par.data.name} › ${p.data.name}` : p.data.name; };
  if (S.comments.length) { const cs = wb.addWorksheet('Comentarios'); cs.columns = [{ header: 'Proyecto / subtarea', width: 50 }, { header: 'Fecha', width: 20 }, { header: 'Usuario', width: 20 }, { header: 'Comentario', width: 90 }]; hdrStyle(cs);
    S.comments.slice().sort((x, y) => String(x.created_at).localeCompare(String(y.created_at))).forEach(c => { const r = cs.addRow([pName(c.project_id), new Date(c.created_at), c.author_email, c.body]); r.getCell(2).numFmt = 'dd/mm/yyyy hh:mm'; r.getCell(4).alignment = { wrapText: true, vertical: 'top' }; }); }
  if (S.attachments.length) { const fs = wb.addWorksheet('Archivos'); fs.columns = [{ header: 'Proyecto / subtarea', width: 50 }, { header: 'Archivo', width: 50 }, { header: 'Tamaño (KB)', width: 14 }, { header: 'Fecha', width: 20 }]; hdrStyle(fs);
    S.attachments.forEach(x => { const r = fs.addRow([pName(x.project_id), x.name, Math.round(x.size / 1024), new Date(x.created_at)]); r.getCell(4).numFmt = 'dd/mm/yyyy hh:mm'; }); }
  const t = totals(S.projects.filter(p => !p.parent_id)), rs = wb.addWorksheet('Resumen');
  rs.columns = [{ header: 'Indicador', width: 30 }, { header: 'Valor', width: 20 }];
  rs.getRow(1).eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fmt.headerFill } }; c.font = { bold: true, color: { argb: fmt.headerFont } }; });
  [['Proyectos', t.n], ['Retorno total (USD)', t.ret], ['Costo de desarrollo total (USD)', t.cost], ['Balance neto (USD)', t.net], ['Avance promedio', t.prog / 100], S.settings.meta?.value != null && [S.settings.meta.label || 'Meta', S.settings.meta.value], S.settings.meta?.value != null && ['Faltante para la meta (USD)', Math.max(0, S.settings.meta.value - t.ret)]].filter(Boolean)
    .forEach(([k, v], i) => { const r = rs.addRow([k, v]); r.getCell(2).numFmt = i === 0 ? '0' : i === 4 ? '0%' : '"$"#,##0'; });
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = h('a', { href: url, download: `Liberty_Project_Pipeline_${new Date().toISOString().slice(0, 10)}.xlsx` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Excel exportado', 'ok');
}

/* ---------- usuarios ---------- */
const ROLES = [['admin', 'Admin'], ['editor', 'Editor'], ['viewer', 'Lector']];
async function usersModal() {
  let users; try { users = await sb.users.list(); } catch (e) { return toast(e.message, 'err'); }
  const close = modal('Usuarios y permisos', h('div', {}, h('p', { class: 'muted' }, 'Admin: todo · Editor: crear y editar · Lector: solo ver.'),
    users.map(u => h('div', { class: 'user-row', style: 'display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);flex-wrap:wrap' },
      h('span', { class: 'avatar', style: `background:${hashColor(u.usuario)}` }, initials(u.usuario)), h('span', { style: 'flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis' }, u.usuario),
      h('select', { class: 'input', style: 'width:auto', disabled: u.id === S.user.id, 'aria-label': 'Rol de ' + u.usuario, onchange: async e => {
        try { await sb.users.setRole(u.id, e.target.value); toast('Rol actualizado', 'ok'); } catch (err) { toast(err.message, 'err'); e.target.value = u.rol; } } },
        ROLES.map(([v, l]) => h('option', { value: v, selected: u.rol === v }, l))),
      h('button', { class: 'btn', onclick: () => { close(); userForm(u); } }, 'Contraseña'),
      u.id !== S.user.id ? h('button', { class: 'icon-btn', svg: I.x, 'aria-label': 'Eliminar ' + u.usuario, onclick: async () => {
        if (!await confirmBox('Eliminar usuario', `¿Quitar el acceso de "${u.usuario}"?`)) return;
        try { await sb.users.remove(u.id); toast('Usuario eliminado', 'ok'); close(); usersModal(); } catch (err) { toast(err.message, 'err'); } } }) : null))),
    []);
}
async function userForm(u) {
  const r = await ask(u ? 'Restablecer contraseña · ' + u.usuario : 'Nuevo usuario', [
        { name: 'password', label: 'Contraseña (mín. 10)', type: 'password', required: true },
    { name: 'rol', label: 'Rol', type: 'select', value: u ? u.rol : 'editor', options: ROLES.map(([value, label]) => ({ value, label })) }].filter(Boolean), 'Guardar');
  if (!r) return;
  const usuario = u ? u.usuario : r.usuario.trim();
  if (!/^[a-z0-9._-]{3,40}$/i.test(usuario)) return toast('Usuario: 3–40 caracteres (letras, números, punto, guion)', 'err');
  if (r.password.length < 10) return toast('La contraseña debe tener al menos 10 caracteres', 'err');
  try { await sb.users.save({ usuario, password: r.password, rol: r.rol }); toast('Usuario guardado', 'ok'); usersModal(); } catch (e) { toast(e.message, 'err'); }
}
async function passwordModal() {
  const r = await ask('Cambiar contraseña', [{ name: 'old', label: 'Contraseña actual', type: 'password', required: true }, { name: 'n1', label: 'Nueva contraseña (mín. 10)', type: 'password', required: true }, { name: 'n2', label: 'Repetir nueva', type: 'password', required: true }]);
  if (!r) return; if (r.n1.length < 10 || r.n1 !== r.n2) return toast('La nueva contraseña no coincide o es muy corta', 'err');
  try { await sb.users.changePassword(r.old, r.n1); toast('Contraseña actualizada', 'ok'); } catch (e) { toast(e.message, 'err'); }
}
async function tokenModal(first) {
  const r = await ask(first ? 'Activar guardado (solo una vez)' : 'Actualizar token de GitHub', [{ name: 't', label: first ? 'Pega el token de GitHub (github_pat_…) para que la plataforma pueda guardar. No se vuelve a pedir.' : 'Nuevo token (Contents: Read and write)', type: 'password', required: true, placeholder: 'github_pat_…' }], 'Activar');
  if (!r) return; try { await sb.users.setToken(r.t.trim()); S.profile = sb.auth.profile(); toast('Guardado activado', 'ok'); } catch (e) { toast(e.message, 'err'); }
}

window.addEventListener('DOMContentLoaded', () => boot().catch(e => { console.error(e); toast(e.message || 'Error al iniciar', 'err'); }));
})();
