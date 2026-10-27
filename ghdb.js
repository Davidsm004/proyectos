/* Almacenamiento cifrado en el propio repositorio de GitHub (rama "datos"), mismo modelo que teleton-2026.
   - datos.json: tablas cifradas con AES-GCM (llave K).
   - usuarios.json: cada usuario abre K con su contraseña (PBKDF2). Admin/editor abren además W, que descifra el token de GitHub (escritura).
   - adjuntos/: archivos cifrados con K.
   Expone una interfaz compatible con el subconjunto de supabase-js que usa app.js. */
(() => {
'use strict';
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = s => Uint8Array.from(atob(String(s).replace(/\s/g, '')), c => c.charCodeAt(0));
const tob64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const rnd = n => crypto.getRandomValues(new Uint8Array(n));
const aesKey = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
const enc1 = async (key, bytes) => { const iv = rnd(12); return { iv: tob64(iv), ct: tob64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)) }; };
const dec1 = async (key, box) => new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.ct)));
const seal = (key, obj) => enc1(key, enc.encode(JSON.stringify(obj)));
const open = async (key, box) => JSON.parse(dec.decode(await dec1(key, box)));
async function kekFor(pass, salt, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const ITER = 250000, DATA = 'datos.json', USERS = 'usuarios.json', SKEY = 'lpp-session';
const TABLES = ['groups', 'columns', 'projects', 'comments', 'attachments', 'settings', 'activity', 'notes', 'kcols', 'kcards'];
const DEF = { projects: { parent_id: null, color: null, position: 0, data: {} }, columns: { options: [], width: 150, builtin: false, position: 0 }, groups: { color: '#0080E8', position: 0 } };

function gitHub(cfg) {
  const api = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, br = cfg.branch || 'datos';
  const raw = p => `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${br}/${p}`;
  const etags = new Map();
  const hdr = (t, accept) => { const h = { Accept: accept || 'application/vnd.github+json' }; if (t) h.Authorization = 'Bearer ' + t; return h; };
  async function get(path, token) {
    const h = hdr(token), prev = etags.get(path); if (prev) h['If-None-Match'] = prev.etag;
    let r = null; try { r = await fetch(`${api}/contents/${path}?ref=${br}`, { headers: h, cache: 'no-store' }); } catch (e) { r = null; }
    if (r && r.status === 304 && prev) return prev.val;
    if (r && r.status === 404) { etags.delete(path); return null; }
    if (!r || !r.ok) { // sin token y sin cupo de API: copia pública
      if (r && (r.status === 401)) throw Object.assign(new Error('El token de GitHub no es válido o venció'), { code: 'token' });
      const rr = await fetch(raw(path) + '?_=' + Date.now(), { cache: 'no-store' }).catch(() => null);
      if (rr && rr.status === 404) return null;
      if (rr && rr.ok) return { json: await rr.json(), sha: null };
      throw new Error('No se pudo leer ' + path + ' (' + (r ? r.status : 'sin conexión') + ')');
    }
    const j = await r.json(), val = { json: JSON.parse(dec.decode(b64(j.content))), sha: j.sha };
    const et = r.headers.get('ETag'); if (et) etags.set(path, { etag: et, val });
    return val;
  }
  async function put(path, b64content, sha, token, msg) {
    const body = { message: msg, content: b64content, branch: br }; if (sha) body.sha = sha;
    const r = await fetch(`${api}/contents/${path}`, { method: 'PUT', headers: { ...hdr(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 409 || r.status === 422) return { conflict: true };
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error('El token de GitHub no es válido, venció o no tiene permiso de escritura'), { code: 'token' });
    if (!r.ok) throw new Error('No se pudo guardar (' + r.status + ')');
    const j = await r.json(); return { sha: j.content.sha };
  }
  async function del(path, token) {
    const r = await fetch(`${api}/contents/${path}?ref=${br}`, { headers: hdr(token), cache: 'no-store' }); if (r.status === 404) return; if (!r.ok) throw new Error('No se pudo eliminar (' + r.status + ')');
    const { sha } = await r.json();
    const d = await fetch(`${api}/contents/${path}`, { method: 'DELETE', headers: { ...hdr(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Eliminar adjunto', sha, branch: br }) });
    if (!d.ok && d.status !== 404) throw new Error('No se pudo eliminar (' + d.status + ')');
  }
  async function getBin(path, token) {
    let r = await fetch(raw(path), { cache: 'force-cache' }).catch(() => null);
    if (!r || !r.ok) r = await fetch(`${api}/contents/${path}?ref=${br}`, { headers: hdr(token, 'application/vnd.github.raw'), cache: 'no-store' });
    if (!r.ok) throw new Error('No se pudo leer el archivo (' + r.status + ')');
    return new Uint8Array(await r.arrayBuffer());
  }
  async function ensureBranch(token) {
    const rp = await fetch(api, { headers: hdr(token) }); if (!rp.ok) throw Object.assign(new Error(rp.status === 401 ? 'Token de GitHub inválido' : 'El token no tiene acceso al repositorio ' + cfg.owner + '/' + cfg.repo), { code: 'token' });
    const repo = await rp.json(); if (repo.permissions && !repo.permissions.push) throw new Error('El token no tiene permiso de escritura (Contents: Read and write)');
    const b = await fetch(`${api}/git/ref/heads/${br}`, { headers: hdr(token), cache: 'no-store' }); if (b.ok) return;
    const m = await fetch(`${api}/git/ref/heads/${repo.default_branch || 'main'}`, { headers: hdr(token) }); if (!m.ok) throw new Error('No se encontró la rama principal');
    const { object } = await m.json();
    const c = await fetch(`${api}/git/refs`, { method: 'POST', headers: { ...hdr(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: 'refs/heads/' + br, sha: object.sha }) });
    if (!c.ok && c.status !== 422) throw new Error('No se pudo crear la rama de datos (' + c.status + ')');
  }
  return { get, put, del, getBin, ensureBranch };
}

function createClient(cfg) {
  const gh = gitHub(cfg);
  let sess = null, T = null, sha = null, queue = [], flushing = null, timer = null, poll = null;
  const authCbs = [], changeCbs = [];
  const emptyDb = () => ({ groups: [], columns: (cfg.columns || []).map(c => ({ id: uuid(), ...clone(c) })), projects: [], comments: [], attachments: [], settings: [], activity: [], notes: [], kcols: [], kcards: [] });
  const fill = db => { TABLES.forEach(t => db[t] = db[t] || []); return db; };
  const err = m => ({ data: null, error: { message: m } });
  const notifyErr = e => (cfg.onError || console.error)(e.message || String(e));

  async function readData() { const r = await gh.get(DATA, sess.token); if (!r) return { db: emptyDb(), sha: null }; return { db: fill(await open(sess.K, r.json.box)), sha: r.sha }; }
  async function writeData(db, prevSha, msg) {
    if (db.activity.length > 3000) db.activity = db.activity.slice(-3000);
    const pkg = { v: 1, fecha: now(), por: sess.usuario, box: await seal(sess.K, db) };
    return gh.put(DATA, tob64(enc.encode(JSON.stringify(pkg))), prevSha, sess.token, msg || ('Datos ' + new Date().toLocaleString('es-CR') + ' (' + sess.usuario + ')'));
  }
  function enqueue(op) { op(T); queue.push(op); clearTimeout(timer); timer = setTimeout(flush, 400); }
  function flush() {
    if (flushing) return flushing;
    flushing = (async () => {
      try {
        while (queue.length) {
          const ops = queue.slice(); let done = false;
          for (let i = 0; i < 6 && !done; i++) {
            const cur = await readData(); ops.forEach(op => op(cur.db));
            const r = await writeData(cur.db, cur.sha);
            if (r.conflict) { await new Promise(ok => setTimeout(ok, 300 + Math.random() * 700)); continue; }
            sha = r.sha; queue.splice(0, ops.length); T = cur.db; queue.forEach(op => op(T)); done = true;
          }
          if (!done) throw new Error('Conflicto al guardar: intenta de nuevo');
        }
      } catch (e) { queue = []; notifyErr(e); try { const cur = await readData(); T = cur.db; sha = cur.sha; changeCbs.forEach(f => f()); } catch (x) {} }
      finally { flushing = null; }
    })();
    return flushing;
  }
  function startPoll() {
    clearInterval(poll);
    poll = setInterval(async () => {
      if (!sess || queue.length || flushing || document.hidden) return;
      try { const r = await gh.get(DATA, sess.token); if (r && r.sha && r.sha !== sha) { T = fill(await open(sess.K, r.json.box)); sha = r.sha; changeCbs.forEach(f => f()); } } catch (e) {}
    }, sess.token ? 20000 : 60000);
  }
  window.addEventListener('beforeunload', e => { if (queue.length || flushing) { flush(); e.preventDefault(); e.returnValue = ''; } });

  /* ---------- consultas ---------- */
  function cascade(db, t, rows) {
    if (t === 'groups') { const ids = rows.map(r => r.id); remove(db, 'projects', db.projects.filter(p => ids.includes(p.group_id))); }
    if (t === 'projects') { const ids = rows.map(r => r.id); const kids = db.projects.filter(p => ids.includes(p.parent_id)); if (kids.length) remove(db, 'projects', kids);
      db.comments = db.comments.filter(c => !ids.includes(c.project_id)); db.attachments = db.attachments.filter(c => !ids.includes(c.project_id)); db.activity = db.activity.filter(c => !ids.includes(c.project_id)); }
  }
  function remove(db, t, rows) { const ids = new Set(rows.map(r => r.id)); db[t] = db[t].filter(r => !ids.has(r.id)); cascade(db, t, rows); }
  const canWrite = () => !!(sess && sess.token);
  class Q {
    constructor(t) { this.t = t; this.op = 'select'; this.f = []; this.fs = []; }
    select() { if (this.op !== 'select') this.sel = true; return this; }
    insert(r) { this.op = 'insert'; this.rows = [].concat(r); return this; }
    upsert(r) { this.op = 'upsert'; this.rows = [].concat(r); return this; }
    update(p) { this.op = 'update'; this.p = clone(p); return this; }
    delete() { this.op = 'delete'; return this; }
    eq(k, v) { this.f.push(r => r[k] === v); return this; }
    in(k, v) { this.f.push(r => v.includes(r[k])); return this; }
    order(k, o) { this.ord = [k, !(o && o.ascending === false)]; return this; }
    limit(n) { this.lim = n; return this; }
    maybeSingle() { this.one = true; return this; }
    then(a, b) { return Promise.resolve().then(() => this.exec()).then(a, b); }
    exec() {
      if (!T) return err('Sin sesión');
      const t = this.t, f = this.f, match = r => f.every(fn => fn(r));
      if (!T[t]) return err('Tabla desconocida: ' + t);
      if (this.op === 'select') {
        let out = T[t].filter(match);
        if (this.ord) { const [k, asc] = this.ord; out.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)); }
        if (this.lim) out = out.slice(0, this.lim);
        return { data: clone(this.one ? out[0] || null : out), error: null };
      }
      if (!canWrite()) return err('Tu rol es de solo lectura');
      if (this.op === 'insert') {
        const rows = this.rows.map(r => ({ id: uuid(), created_at: now(), ...(DEF[t] || {}), ...clone(r) }));
        if (t === 'projects') rows.forEach(r => r.created_by = sess.id);
        enqueue(db => db[t].push(...clone(rows)));
        return { data: this.sel ? clone(rows) : null, error: null };
      }
      if (this.op === 'upsert') { const rows = clone(this.rows); enqueue(db => rows.forEach(r => { const ex = db[t].find(x => x.key === r.key); ex ? Object.assign(ex, clone(r)) : db[t].push(clone(r)); })); return { data: null, error: null }; }
      if (this.op === 'update') { const p = this.p; enqueue(db => db[t].filter(match).forEach(r => Object.assign(r, clone(p), t === 'projects' ? { updated_at: now() } : {}))); return { data: null, error: null }; }
      if (this.op === 'delete') { enqueue(db => remove(db, t, db[t].filter(match))); return { data: null, error: null }; }
    }
  }

  /* ---------- usuarios ---------- */
  async function readUsers(token) { const r = await gh.get(USERS, token); return r ? { doc: r.json, sha: r.sha } : null; }
  async function makeEntry(doc, usuario, pass, rol, Kraw, Wraw) {
    const salt = rnd(16), kek = await kekFor(pass, salt, doc.iter);
    const e = { id: await sha256(doc.pepper + ':' + usuario.toLowerCase()), salt: tob64(salt), k: await enc1(kek, Kraw) };
    if (rol === 'admin' || rol === 'editor') e.w = await enc1(kek, Wraw);
    return e;
  }
  async function changeUsers(fn, msg) {
    for (let i = 0; i < 5; i++) {
      const cur = await readUsers(sess.token); const doc = cur.doc, dir = await open(sess.K, doc.dir);
      await fn(doc, dir); doc.dir = await seal(sess.K, dir); doc.fecha = now();
      const r = await gh.put(USERS, tob64(enc.encode(JSON.stringify(doc))), cur.sha, sess.token, msg);
      if (!r.conflict) return dir;
      await new Promise(ok => setTimeout(ok, 400));
    }
    throw new Error('Conflicto al guardar usuarios');
  }
  const needAdmin = () => { if (!sess || sess.rol !== 'admin' || !sess.token) throw new Error('Solo un administrador puede gestionar usuarios'); };
  function store() { try { sessionStorage.setItem(SKEY, JSON.stringify({ usuario: sess.usuario, id: sess.id, rol: sess.rol, k: sess.Kraw, w: sess.Wraw, token: sess.token })); } catch (e) {} }
  async function startSession(s) {
    sess = s; sess.K = await aesKey(b64(s.Kraw));
    const d = await readData(); T = d.db; sha = d.sha; store(); startPoll();
    return { id: s.id, email: s.usuario };
  }

  const client = {
    from: t => new Q(t),
    rpc: async (fn, a) => {
      if (fn !== 'patch_project') return err('Función desconocida');
      if (!canWrite()) return err('Tu rol es de solo lectura');
      const patch = clone(a.p_patch), id = a.p_id, who = sess.usuario;
      enqueue(db => {
        const p = db.projects.find(x => x.id === id); if (!p) return;
        for (const [k, v] of Object.entries(patch)) if (JSON.stringify(p.data[k] ?? null) !== JSON.stringify(v ?? null)) db.activity.push({ id: uuid(), project_id: id, field: k, old_value: p.data[k] ?? null, new_value: v, user_email: who, created_at: now() });
        p.data = { ...p.data, ...clone(patch) }; p.updated_at = now();
      });
      return { data: null, error: null };
    },
    channel: () => ({ on(_a, _b, cb) { changeCbs.push(cb); return this; }, subscribe() { return this; } }),
    flush,
    status: async () => (await readUsers(null)) ? 'ready' : 'setup',
    auth: {
      getSession: async () => {
        let s = null; try { s = JSON.parse(sessionStorage.getItem(SKEY)); } catch (e) {}
        if (!s) return { data: { session: null } };
        try { const user = await startSession({ usuario: s.usuario, id: s.id, rol: s.rol, Kraw: s.k, Wraw: s.w, token: s.token }); return { data: { session: { user } } }; }
        catch (e) { try { sessionStorage.removeItem(SKEY); } catch (x) {} return { data: { session: null } }; }
      },
      onAuthStateChange: cb => { authCbs.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: async ({ email, password }) => {
        try {
          const usuario = String(email || '').trim().toLowerCase();
          const u = await readUsers(null); if (!u) return err('La plataforma aún no está configurada');
          const doc = u.doc, id = await sha256(doc.pepper + ':' + usuario);
          const entry = doc.entries.find(x => x.id === id) || doc.entries[0];
          const kek = await kekFor(password, b64(entry.salt), doc.iter);
          if (entry.id !== id) return err('Invalid login credentials');
          let Kraw; try { Kraw = await dec1(kek, entry.k); } catch (e) { return err('Invalid login credentials'); }
          const K = await aesKey(Kraw), dir = await open(K, doc.dir), me = dir.find(x => x.id === id);
          if (!me) return err('Invalid login credentials');
          let token = null, Wraw = null;
          if (entry.w) { Wraw = await dec1(kek, entry.w); token = await open(await aesKey(Wraw), doc.gh); }
          const user = await startSession({ usuario: me.usuario, id, rol: me.rol, Kraw: tob64(Kraw), Wraw: Wraw ? tob64(Wraw) : null, token });
          return { data: { user, session: { user } }, error: null };
        } catch (e) { return err(e.message); }
      },
      signOut: async () => { await flush(); sess = null; T = null; clearInterval(poll); try { sessionStorage.removeItem(SKEY); } catch (e) {} authCbs.forEach(f => f('SIGNED_OUT', null)); return { error: null }; },
      profile: () => sess && { id: sess.id, email: sess.usuario, role: sess.rol },
      hasToken: () => !!(sess && sess.token),
    },
    users: {
      list: async () => { const u = await readUsers(sess.token); return open(sess.K, u.doc.dir); },
      save: async ({ usuario, password, rol }) => { // crear o restablecer
        needAdmin(); usuario = usuario.trim().toLowerCase();
        return changeUsers(async (doc, dir) => {
          const e = await makeEntry(doc, usuario, password, rol, b64(sess.Kraw), b64(sess.Wraw));
          doc.entries = doc.entries.filter(x => x.id !== e.id).concat(e);
          const d = dir.find(x => x.id === e.id); if (d) d.rol = rol; else dir.push({ id: e.id, usuario, rol, creado: now() });
        }, 'Usuarios: ' + usuario);
      },
      remove: async id => { needAdmin(); if (id === sess.id) throw new Error('No puedes eliminar tu propio usuario'); return changeUsers((doc, dir) => { doc.entries = doc.entries.filter(x => x.id !== id); dir.splice(dir.findIndex(x => x.id === id), 1); }, 'Usuarios: baja'); },
      setRole: async (id, rol) => { needAdmin(); return changeUsers((doc, dir) => { const e = doc.entries.find(x => x.id === id), d = dir.find(x => x.id === id);
        if ((rol === 'admin' || rol === 'editor') && !e.w) throw new Error('Para dar permisos de edición a un lector, restablece su contraseña con el nuevo rol');
        if (rol === 'viewer') delete e.w; d.rol = rol; }, 'Usuarios: rol'); },
      changePassword: async (oldPass, newPass) => {
        if (!sess.token) throw new Error('Solicita a un administrador el cambio de contraseña');
        return changeUsers(async doc => { const e = doc.entries.find(x => x.id === sess.id); const kek0 = await kekFor(oldPass, b64(e.salt), doc.iter);
          try { await dec1(kek0, e.k); } catch (x) { throw new Error('La contraseña actual no es correcta'); }
          const n = await makeEntry(doc, sess.usuario, newPass, sess.rol, b64(sess.Kraw), b64(sess.Wraw)); Object.assign(e, n); if (!n.w) delete e.w; }, 'Usuarios: contraseña');
      },
      setToken: async token => { if (!sess || sess.rol !== 'admin') throw new Error('Solo un administrador puede actualizar el token');
        const W = await aesKey(b64(sess.Wraw)), prev = sess.token; sess.token = token;
        try { const d = await changeUsers(async doc => { doc.gh = await seal(W, token); }, 'Token actualizado'); store(); startPoll(); return d; }
        catch (e) { sess.token = prev; throw new Error(e.code === 'token' || /token/i.test(e.message) ? 'Ese token no funciona: revisa que tenga acceso a proyectos con Contents: Read and write' : e.message); } }
    },
    storage: { from: () => ({
      upload: async (path, file) => {
        if (!canWrite()) return err('Tu rol es de solo lectura');
        try { const bytes = new Uint8Array(await file.arrayBuffer()); const box = await enc1(sess.K, bytes); const iv = b64(box.iv), ct = b64(box.ct), all = new Uint8Array(12 + ct.length); all.set(iv); all.set(ct, 12);
          for (let i = 0; i < 4; i++) { const r = await gh.put('adjuntos/' + path, tob64(all), null, sess.token, 'Adjunto'); if (!r.conflict) return { data: { path }, error: null }; await new Promise(ok => setTimeout(ok, 700)); }
          return err('Conflicto al subir, intenta de nuevo'); } catch (e) { return err(e.message); }
      },
      download: async path => {
        try { const all = await gh.getBin('adjuntos/' + path, sess.token); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, sess.K, all.slice(12));
          const a = (T.attachments.find(x => x.path === path) || {}); return { data: new Blob([pt], { type: a.mime || 'application/octet-stream' }), error: null }; } catch (e) { return err(e.message); }
      },
      createSignedUrl: async path => { const r = await client.storage.from().download(path); return r.error ? r : { data: { signedUrl: URL.createObjectURL(r.data) }, error: null }; },
      remove: async paths => { if (!canWrite()) return err('Tu rol es de solo lectura'); try { for (const p of paths) await gh.del('adjuntos/' + p, sess.token); return { data: null, error: null }; } catch (e) { return err(e.message); } }
    }) }
  };
  return client;
}
window.GHDB = { createClient };
})();
