'use strict';
// Уютная раскладка — стол, касания, звук, окна. Правила — logic.js (TL), категории и дом — data.js (TD).
(() => {
const $ = id => document.getElementById(id);
const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pick = a => a[Math.floor(Math.random() * a.length)];

// ─── звук: тихие колокольчики (по умолчанию негромко — рядом может спать малыш) ───
let ac = null, out = null, rev = null;
const soundOn = () => ls('tl_sound') !== '0';
function audio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    out = ac.createGain(); out.gain.value = soundOn() ? 0.45 : 0; out.connect(ac.destination);
    rev = ac.createConvolver(); const len = ac.sampleRate * 2.2, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = b; const wet = ac.createGain(); wet.gain.value = 0.35; rev.connect(wet); wet.connect(out);
  }
  if (ac.state === 'suspended') ac.resume();
  ambient();
}
// ─── звуки уюта: дождь (белый шум в полосе 500–7000 Гц + низкий гул) и камин (гул + треск) — без файлов ───
let amb = null;
const rainLv = () => +ls('tl_rain') || 0, fireOn = () => ls('tl_fire') === '1';
function noise(brown) {
  const len = ac.sampleRate * 3, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; d[i] = brown ? (last = (last + 0.02 * w) / 1.02) * 3.5 : w; }
  const src = ac.createBufferSource(); src.buffer = b; src.loop = true; src.start(); return src;
}
function ambient() {
  if (!ac) return;
  if (!amb) {
    const g = () => { const x = ac.createGain(); x.gain.value = 0; x.connect(out); return x; };
    amb = { rain: g(), fire: g() };
    const hp = ac.createBiquadFilter(), lp = ac.createBiquadFilter(), low = ac.createBiquadFilter(), lowG = ac.createGain();
    hp.type = 'highpass'; hp.frequency.value = 500; lp.type = 'lowpass'; lp.frequency.value = 7000;
    noise(false).connect(hp); hp.connect(lp); lp.connect(amb.rain);
    low.type = 'lowpass'; low.frequency.value = 400; lowG.gain.value = 0.6; noise(true).connect(low); low.connect(lowG); lowG.connect(amb.rain);
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 250; noise(true).connect(fl); fl.connect(amb.fire);
    setInterval(() => {                                                             // треск поленьев: короткие щелчки шума
      if (!fireOn() || !soundOn() || Math.random() > 0.4) return;
      const t0 = ac.currentTime, n = ac.createBufferSource(), len = Math.floor(ac.sampleRate * (0.01 + Math.random() * 0.04)), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const bp = ac.createBiquadFilter(), k = ac.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1500 + Math.random() * 3000; k.gain.value = 0.15 + Math.random() * 0.35;
      n.buffer = b; n.connect(bp); bp.connect(k); k.connect(out); n.start(t0);
    }, 110);
  }
  amb.rain.gain.setTargetAtTime([0, 0.07, 0.16][rainLv()], ac.currentTime, 0.8);
  amb.fire.gain.setTargetAtTime(fireOn() ? 0.5 : 0, ac.currentTime, 0.8);
  rainShow();
}
function rainShow() {                                                               // капли на окне комнаты
  const r = $('rain'); if (!r) return;
  r.hidden = !rainLv();
  if (r.hidden || r.childElementCount) return;
  for (let i = 0; i < 70; i++) { const d = document.createElement('i'); Object.assign(d.style, { left: Math.random() * 100 + '%', height: 10 + Math.random() * 16 + 'px',
    animationDuration: 0.5 + Math.random() * 0.6 + 's', animationDelay: -Math.random() * 2 + 's', opacity: 0.25 + Math.random() * 0.45 }); r.appendChild(d); }
}
function bell(f, t = 0, dur = 1, v = 0.1) {
  if (!ac) return; const t0 = ac.currentTime + t, g = ac.createGain();
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  for (const [m, a] of [[1, 1], [2.001, 0.2], [3.01, 0.05]]) { const o = ac.createOscillator(), k = ac.createGain(); o.frequency.value = f * m; k.gain.value = a; o.connect(k); k.connect(g); o.start(t0); o.stop(t0 + dur + 0.05); }
  g.connect(out); g.connect(rev);
}
const tick = () => bell(440 * Math.pow(2, Math.floor(Math.random() * 5) * 2 / 12), 0, 0.6, 0.06);
const chime = () => [0, 4, 7, 12].forEach((s, k) => bell(523.25 * Math.pow(2, s / 12), k * 0.09, 1.3, 0.08));
const fanfare = () => [0, 4, 7, 12, 16].forEach((s, k) => bell(392 * Math.pow(2, s / 12), k * 0.13, 1.8, 0.09));
for (const ev of ['pointerup', 'touchend']) addEventListener(ev, audio, { passive: true });

// ─── состояние: уровень, вещей в доме, своя раскладка (сохраняется после каждого хода) ───
const ROOMN = TD.ROOM.length;
let L = Math.max(0, +ls('tl_level') || 0), room = Math.min(ROOMN, +ls('tl_room') || 0);
let S = null, hist = [], doneSlot = {}, cw = 60, ch = 84, geo = null, busy = false;
const els = new Map(), table = $('table');
const mine = () => { try { return JSON.parse(ls('tl_mine') || '[]'); } catch (e) { return []; } };
const pool = () => TD.CATS.concat(mine());
const KEY = { level: 'tl_game', daily: 'tl_dgame', quick: 'tl_qgame' };
const mode = () => (S && S.mode) || 'level';
const save = () => ls(KEY[mode()], JSON.stringify(S));
const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
const saved = m => { try { return JSON.parse(ls(KEY[m])); } catch (e) { return null; } };

function start(first = [], m = 'level') {
  S = null;
  const g = first.length ? null : saved(m);
  if (g && !TL.won(g) && (m === 'level' ? g.L === L && !g.mode : m === 'daily' ? g.day === today() : true)) S = g;
  if (!S) {
    if (m === 'daily') { S = TL.deal(20, TD.CATS, today()); S.day = today(); }               // одна раздача на дату, средней сложности
    else if (m === 'quick') S = TL.deal(0, TD.CATS, Date.now() % 1e9, [], TL.QUICK);
    else S = TL.deal(L, pool(), undefined, first);
    if (m !== 'level') S.mode = m;
  }
  hist = []; doneSlot = {}; build(); save();
  $('home').hidden = true;
}

// ─── стол ───
let phSlots = [], phCols = [], phStock = null, stockN = null;
function build() {
  table.innerHTML = ''; els.clear();
  const ph = (cls, txt) => { const d = document.createElement('div'); d.className = 'ph ' + cls; d.textContent = txt; table.appendChild(d); return d; };
  phSlots = S.slots.map(() => ph('slot', '+'));
  phCols = S.cols.map(() => ph('col', ''));
  phStock = ph('stock', '↻'); phStock.onclick = () => doDraw();
  stockN = document.createElement('div'); stockN.id = 'stockN'; table.appendChild(stockN);
  S.cards.forEach((c, id) => {
    const cat = S.cats[c.cat], el = document.createElement('div');
    el.className = 'c' + (c.item < 0 ? ' cat' : '');
    if (c.item < 0) el.innerHTML = `<div class="b"></div><div class="f"><div class="in"><div class="strip">${esc(cat.n)}</div><div class="big">${esc(cat.i)}</div><div class="cnt"></div></div></div>`;
    else { const [e, w] = cat.items[c.item]; el.innerHTML = `<div class="b"></div><div class="f"><div class="in"><div class="strip">${esc(e)} ${esc(w)}</div>`
      + (e ? `<div class="big">${esc(e)}</div><div class="word">${esc(w)}</div>` : `<div class="big txt">${esc(w)}</div>`) + '</div></div>'; }
    el.dataset.id = id;
    table.appendChild(el); els.set(id, el);
  });
  table.classList.add('still'); layout(); void table.offsetWidth; table.classList.remove('still');   // первая отрисовка — без полёта карт из угла
}
function layout() {
  if (!S) return;
  const G = Math.max(4, S.cols.length, S.slots.length), W = Math.min(innerWidth, 560) - 20, gap = Math.max(5, Math.round(W * 0.016));   // G — сетка: на ранних уровнях карты крупнее
  cw = Math.floor(Math.min((W - (G - 1) * gap) / G, 110)); ch = Math.round(cw * 1.4);
  const x0 = (innerWidth - (G * cw + (G - 1) * gap)) / 2, top = $('bar').getBoundingClientRect().bottom + 8;
  geo = { G, X: k => x0 + k * (cw + gap), y1: top, y2: top + ch + 12, y3: top + 2 * ch + 34 };
  table.style.setProperty('--w', cw + 'px'); table.style.setProperty('--h', ch + 'px');
  for (const el of [...els.values(), ...phSlots, ...phCols, phStock]) { el.style.width = cw + 'px'; el.style.height = ch + 'px'; }
  render();
}
addEventListener('resize', layout);

function render(fly = []) {
  const pos = new Map(), sl = S.slots.length, nc = S.cols.length;
  const G = geo.G, sx = i => geo.X(i + (G - sl) / 2), cx = i => geo.X(i + (G - nc) / 2);
  S.stock.forEach((id, k) => pos.set(id, { x: geo.X(G - 1), y: geo.y1, z: 10 + k, up: false }));
  S.waste.forEach((id, k) => pos.set(id, { x: geo.X(G - 2), y: geo.y1, z: 10 + k, up: true }));
  const avail = innerHeight - geo.y3 - ch - 40;                                    // длинный столбец сжимается, чтобы влезть
  S.cols.forEach((col, i) => {
    const dd = ch * 0.17, du = ch * 0.3, d = col.filter(x => !x.up).length, need = d * dd + Math.max(0, col.length - d - 1) * du, f = need > avail ? avail / need : 1;
    let y = geo.y3; col.forEach((x, k) => { pos.set(x.id, { x: cx(i), y, z: 100 + k, up: x.up, cov: k < col.length - 1 }); y += (x.up ? du : dd) * f; });
  });
  S.cards.forEach((c, id) => {
    if (pos.has(id)) return;
    const s = S.slots.findIndex(q => q && q.cat === c.cat);
    if (s >= 0) pos.set(id, { x: sx(s), y: geo.y2, z: c.item < 0 ? 50 : 51, up: true, gone: c.item >= 0 });
    else pos.set(id, { x: sx(doneSlot[c.cat] ?? 0), y: geo.y2, z: 60, up: true, done: true });
  });
  for (const [id, p] of pos) {
    const el = els.get(id), f = fly.indexOf(id);
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.zIndex = f >= 0 ? 500 + f : p.z;
    el.classList.toggle('up', p.up); el.classList.toggle('cov', !!p.cov); el.classList.toggle('gone', !!p.gone); el.classList.toggle('done', !!p.done);
  }
  if (fly.length) setTimeout(() => { for (const id of fly) if (pos.has(id)) els.get(id).style.zIndex = pos.get(id).z; }, 320);
  S.cards.forEach((c, id) => { if (c.item >= 0) return; const s = S.slots.find(q => q && q.cat === c.cat); els.get(id).querySelector('.cnt').textContent = `${s ? s.n : 0}/${S.cats[c.cat].k}`; });
  phSlots.forEach((p, i) => { p.style.left = sx(i) + 'px'; p.style.top = geo.y2 + 'px'; });
  phCols.forEach((p, i) => { p.style.left = cx(i) + 'px'; p.style.top = geo.y3 + 'px'; });
  Object.assign(phStock.style, { left: geo.X(G - 1) + 'px', top: geo.y1 + 'px' }); phStock.textContent = S.stock.length ? '' : S.waste.length ? '↻' : '';
  Object.assign(stockN.style, { left: geo.X(G - 1) + cw / 2 + 'px', top: geo.y1 + ch - 14 + 'px' }); stockN.textContent = S.stock.length || ''; stockN.hidden = !S.stock.length;   // сколько осталось в колоде
  $('lvl').innerHTML = `${mode() === 'daily' ? 'Сегодня <b>☀️</b>' : mode() === 'quick' ? 'Быстрая <b>⚡</b>' : `Уровень <b>${S.L + 1}</b>`}<small>Разложено ${S.done} из ${S.cats.length}</small>`;
  $('undo').classList.toggle('off', !hist.length);
}

// ─── ходы: касание карты — она сама идёт в лучшее место ───
function where(id) {
  if (S.stock.includes(id)) return 'stock';
  if (S.waste[S.waste.length - 1] === id) return 'w';
  for (let ci = 0; ci < S.cols.length; ci++) { const col = S.cols[ci], i = col.findIndex(x => x.id === id); if (i >= 0) return i >= col.length - TL.run(S, ci) ? ci : null; }
  return null;
}
// ─── перетаскивание пальцем: взяла карту (или всю верхнюю стопку) — отпустила над ячейкой или столбцом; без сдвига — обычное нажатие ───
let drag = null;
const slotX = i => geo.X(i + (geo.G - S.slots.length) / 2), colX = i => geo.X(i + (geo.G - S.cols.length) / 2);
table.addEventListener('pointerdown', e => {
  const el = e.target.closest('.c'); if (!el || busy || drag) return;
  drag = { id: +el.dataset.id, x0: e.clientX, y0: e.clientY, pid: e.pointerId, moved: false };
});
addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < 8) return;
    const w = where(drag.id); if (w === null || w === 'stock') { drag = null; return; }
    drag.from = w; drag.ids = w === 'w' ? [drag.id] : S.cols[w].slice(-TL.run(S, w)).map(x => x.id); drag.moved = true;
    drag.ids.forEach((id, k) => { const el = els.get(id); el.classList.remove('hint'); el.classList.add('drag'); el.style.transition = 'none'; el.style.zIndex = 800 + k; });
  }
  drag.ids.forEach(id => { els.get(id).style.transform = `translate(${dx}px,${dy}px) scale(1.04)`; });
});
function dropMove(d, x, y) {                                                        // куда отпустила: ближайшая ячейка или столбец под центром карты
  let best = null, bd = 1e9;
  const hit = (to, tx, ty, h) => { const dist = Math.hypot(x - tx - cw / 2, (y - ty - ch / 2) * 0.6); if (Math.abs(x - tx - cw / 2) < cw * 0.8 && y > ty - ch * 0.6 && y < ty + h + ch * 0.6 && dist < bd) { bd = dist; best = to; } };
  S.slots.forEach((_, i) => hit('s' + i, slotX(i), geo.y2, ch));
  S.cols.forEach((col, i) => hit(i, colX(i), geo.y3, Math.max(ch, innerHeight - geo.y3)));
  if (best === null || best === d.from) return null;
  const id = d.ids[0], c = TL.catOf(S, id);
  if (typeof best === 'string') {                                                   // ячейка: пустая — для категории, своя — для её предметов
    const sl = S.slots[+best.slice(1)];
    return (TL.isCat(S, id) ? !sl : sl && sl.cat === c && !d.ids.some(x => TL.isCat(S, x))) ? { from: d.from, to: best, ids: d.ids } : null;
  }
  return TL.moves(S).find(m => m.from === d.from && m.to === best) || null;
}
function dropEnd(e, cancel) {
  const d = drag; if (!d || e.pointerId !== d.pid) return; drag = null;
  if (!d.moved) { if (!cancel) tap(d.id); return; }
  const dx = e.clientX - d.x0, dy = e.clientY - d.y0, el0 = els.get(d.ids[0]);
  const m = cancel ? null : dropMove(d, parseFloat(el0.style.left) + dx + cw / 2, parseFloat(el0.style.top) + dy + ch / 2);
  for (const id of d.ids) { const el = els.get(id);                                  // карта остаётся там, где её отпустили, и оттуда плывёт на место
    el.style.left = parseFloat(el.style.left) + dx + 'px'; el.style.top = parseFloat(el.style.top) + dy + 'px';
    el.style.transform = ''; el.classList.remove('drag'); void el.offsetWidth; el.style.transition = ''; }
  if (m) act(m); else { render(d.ids); if (!cancel) bell(220, 0, 0.25, 0.03); }
}
addEventListener('pointerup', e => dropEnd(e, false));
addEventListener('pointercancel', e => dropEnd(e, true));
function nope(id) { const el = els.get(id); el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); }
function tap(id) {
  if (busy) return;
  const w = where(id);
  if (w === 'stock') return doDraw();
  if (w === null) return nope(id);
  const ms = TL.moves(S).filter(m => m.from === w);
  const m = ms.find(m => typeof m.to === 'string') || ms.find(m => S.cols[m.to].length) || ms[0];
  if (!m) return nope(id);
  act(m);
}
function act(m) {
  hist.push(TL.clone(S)); if (hist.length > 300) hist.shift();
  const r = TL.apply(S, m);
  if (r.completed >= 0) { doneSlot[r.completed] = +m.to.slice(1); chime(); setTimeout(() => burst(+m.to.slice(1)), 250); } else tick();
  render(m.ids); save(); after();
}
function doDraw() {
  if (busy) return;
  hist.push(TL.clone(S));
  if (!TL.draw(S)) { hist.pop(); return; }
  bell(660, 0, 0.3, 0.03); render(S.waste.slice(-1)); save(); after();
}
function after() {
  if (TL.won(S)) { busy = true; setTimeout(win, 700); return; }
  if (TL.stuck(S)) setTimeout(() => { $('stuck').hidden = false; }, 500);
}
function burst(s) {
  const sl = S.slots.length, x = geo.X(s + (geo.G - sl) / 2) + cw / 2, y = geo.y2 + ch / 2;
  for (let i = 0; i < 9; i++) { const b = document.createElement('div'), a = i / 9 * Math.PI * 2;
    b.className = 'burst'; b.textContent = pick(['✨', '🌿', '💛']); b.style.left = x - 11 + 'px'; b.style.top = y - 11 + 'px';
    b.style.setProperty('--dx', Math.cos(a) * 70 + 'px'); b.style.setProperty('--dy', Math.sin(a) * 70 + 'px');
    table.appendChild(b); setTimeout(() => b.remove(), 1100); }
}
$('undo').onclick = () => { if (busy || !hist.length) return; S = hist.pop(); render(); save(); };
$('hintBtn').onclick = () => {
  if (busy) return;
  const m = TL.plan(S);                                                             // ход, после которого бот доводит раскладку до конца
  if (!m) { $('stuck').hidden = false; return; }                                     // пути нет — честно предлагаем перемешать
  const ids = m === 'draw' ? (S.stock.length ? [S.stock[S.stock.length - 1]] : []) : m.ids;
  if (!ids.length) { phStock.classList.remove('hint'); void phStock.offsetWidth; phStock.classList.add('hint'); return; }
  for (const id of ids) { const el = els.get(id); el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint'); }
};
$('mix').onclick = () => { hist.push(TL.clone(S)); TL.reshuffle(S); render(); save(); $('stuck').hidden = true; if (TL.stuck(S)) setTimeout(() => { $('stuck').hidden = false; }, 600); };
$('think').onclick = () => { $('stuck').hidden = true; };
$('again').onclick = () => { const m = mode(); ls(KEY[m], null); $('stuck').hidden = true; start([], m); };

// ─── победа: тёплая фраза; уровень — вещь в дом и свет, раскладка дня — редкая вещь, быстрая — просто отдых ───
let rare = Math.min(TD.RARE.length, +ls('tl_rare') || 0);
function win() {
  fanfare();
  const m = mode(); ls(KEY[m], null);
  let got = null, name = '', lit = '';
  if (m === 'level') {
    L++; ls('tl_level', L);
    got = room < ROOMN ? TD.ROOM[room] : null;
    if (got) { room++; ls('tl_room', room); name = `В доме появилось: ${got[1]}`; const l = TD.LIGHTS.find(l => l[0] === room); lit = l ? `✨ ${l[1]}` : 'В комнате стало чуть светлее'; }
  } else if (m === 'daily') {
    ls('tl_daily', today());
    got = rare < TD.RARE.length ? TD.RARE[rare] : null;
    if (got) { rare++; ls('tl_rare', rare); name = `Редкая вещь: ${got[1]}`; lit = 'Новая раскладка дня — завтра'; }
  }
  $('winTitle').textContent = m === 'daily' ? 'Раскладка дня готова!' : 'Раскладка готова!';
  $('warm').textContent = pick(TD.WARM);
  $('newWrap').hidden = !got;
  if (got) { $('newThing').textContent = got[0]; $('newName').textContent = name; $('lit').textContent = lit; }
  $('next').textContent = m === 'level' ? 'Дальше' : m === 'quick' ? 'Ещё одну быструю' : 'Домой';
  $('winHome').hidden = m === 'daily';
  $('winHome').textContent = m === 'level' ? 'Посмотреть дом' : 'Домой';
  $('win').hidden = false; busy = false;
}
$('next').onclick = () => { $('win').hidden = true; const m = mode(); if (m === 'daily') home(true); else start([], m); };
$('winHome').onclick = () => { $('win').hidden = true; home(true); };

// ─── дом: комната оживает — светлеет с каждой раскладкой, на порогах загорается свет; вещи — коллекция под картинкой ───
function home(fresh = false) {
  const r = $('room'), w = r.clientWidth || Math.min(innerWidth - 32, 460), t = room / ROOMN;
  r.querySelector('img').style.filter = `brightness(${(0.38 + 0.62 * t).toFixed(2)}) saturate(${(0.45 + 0.55 * t).toFixed(2)})`;
  r.querySelectorAll('.lt').forEach(e => e.remove());
  for (const [need, , x, y, s, rgb] of TD.LIGHTS) { const d = document.createElement('div'), px = Math.round(s * w);
    d.className = 'lt' + (room >= need ? ' on' : '') + (fresh && room === need ? ' new' : '');
    Object.assign(d.style, { left: x + '%', top: y + '%', width: px + 'px', height: px + 'px', background: `radial-gradient(circle, rgba(${rgb},.55) 0%, rgba(${rgb},.18) 35%, rgba(${rgb},0) 70%)` });
    r.appendChild(d); }
  $('shelf').innerHTML = TD.ROOM.map(([e], i) => i < room ? `<span data-i="${i}"${fresh && i === room - 1 ? ' class="new"' : ''}>${e}</span>` : `<span class="no" data-i="${i}">●</span>`).join('');
  const next = TD.LIGHTS.find(l => l[0] > room), n = next ? next[0] - room : ROOMN - room;
  $('roomCap').innerHTML = room >= ROOMN ? 'Дом обставлен полностью — все огни горят 🏡'
    : `🏠 Вещей в доме: <b>${room} из ${ROOMN}</b>. Пройди раскладку — получишь вещь, а в комнате станет светлее.`
      + `<span class="goal">✨ Ещё ${n} ${plural(n, 'раскладка', 'раскладки', 'раскладок')} — и ${next ? next[6] : 'дом будет обставлен полностью'}</span>`;
  $('rare').innerHTML = rare ? '<b>Редкие:</b> ' + TD.RARE.slice(0, rare).map(([e], i) => `<span data-r="${i}">${e}</span>`).join('') : '';
  const done = +ls('tl_daily') === today();
  $('dailyBtn').innerHTML = tile('☀️', done ? 'Раскладка дня ✓' : 'Раскладка дня');
  $('dailyBtn').classList.toggle('done', done);
  $('tip').textContent = '';
  let g = null; try { g = JSON.parse(ls('tl_game')); } catch (e) {}
  $('play').innerHTML = `<span class="tri">▶</span>${g && g.L === L && g.moves ? 'Продолжить' : 'Играть'} · уровень ${L + 1}<span class="chev">›</span>`;
  $('home').hidden = false;
}
const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;
let tipT = 0;
const tipShow = t => { $('tip').textContent = t; clearTimeout(tipT); tipT = setTimeout(() => { $('tip').textContent = ''; }, 2500); };
$('shelf').onclick = e => { const i = e.target.dataset && e.target.dataset.i; if (i === undefined) return;                // значок вещи — её название
  const [em, nm] = TD.ROOM[+i]; tipShow(+i < room ? `${em} ${nm}` : 'Эта вещь ещё впереди — пройди раскладку'); };
$('rare').onclick = e => { const i = e.target.dataset && e.target.dataset.r; if (i !== undefined) tipShow(`${TD.RARE[+i][0]} ${TD.RARE[+i][1]} — редкая вещь`); };
$('dailyBtn').onclick = () => { if (+ls('tl_daily') === today()) { tipShow('Раскладка дня уже собрана — новая завтра ☀️'); return; } audio(); start([], 'daily'); };
$('quickBtn').onclick = () => { audio(); start([], 'quick'); };
$('play').onclick = () => { audio(); start(); bell(523.25, 0, 1, 0.07); };
$('homeBtn').onclick = () => home();

// ─── ночь и звук ───
function night() { return ls('tl_night') !== '0'; }                               // тёмная тема — основная, «День» — светлый вариант
const tile = (ico, t) => `<span class="ico">${ico}</span>${t}<span class="chev">›</span>`;
function paint() { const n = night(); document.body.classList.toggle('day', !n); $('nightBtn').innerHTML = n ? tile('☀️', 'День') : tile('🌙', 'Ночь');
  document.querySelector('meta[name=theme-color]').content = n ? '#0b1122' : '#eef1f8'; $('sndBtn').innerHTML = soundOn() ? tile('🔈', 'Тихо') : tile('🔇', 'Без звука');
  $('rainBtn').innerHTML = tile('🌧️', ['Дождь', 'Дождик', 'Ливень'][rainLv()]); $('fireBtn').innerHTML = tile('🔥', fireOn() ? 'Камин ✓' : 'Камин'); }
const loud = () => { if (!soundOn()) { ls('tl_sound', '1'); if (out) out.gain.value = 0.45; } };          // включила дождь или камин — звук нужен
$('rainBtn').onclick = () => { ls('tl_rain', (rainLv() + 1) % 3); if (rainLv()) loud(); audio(); ambient(); paint(); };
$('fireBtn').onclick = () => { ls('tl_fire', fireOn() ? '0' : '1'); if (fireOn()) loud(); audio(); ambient(); paint(); };
$('nightBtn').onclick = () => { ls('tl_night', night() ? '0' : '1'); paint(); };
$('sndBtn').onclick = () => { audio(); ls('tl_sound', soundOn() ? '0' : '1'); if (out) out.gain.value = soundOn() ? 0.45 : 0; paint(); };

// ─── минута дыхания: вдох 4 с, выдох 6 с, шесть раз ───
let bT = null;
function breathe() {
  audio(); $('breathe').hidden = false; clearTimeout(bT);
  const c = $('bCircle'); let k = 0;
  c.style.transition = 'transform 1s'; c.style.transform = 'scale(.55)'; $('bText').textContent = 'Устройся удобно'; $('bLeft').textContent = '';
  const step = () => {
    if ($('breathe').hidden) return;
    if (k >= 12) { $('bText').textContent = 'Готово. Ты молодец 🌿'; $('bLeft').textContent = ''; return; }
    const inh = k % 2 === 0, t = inh ? 4 : 6;
    c.style.transition = `transform ${t}s ease-in-out`; c.style.transform = `scale(${inh ? 1 : 0.55})`;
    $('bText').textContent = inh ? 'Вдох…' : 'Выдох…'; $('bLeft').textContent = `осталось вдохов: ${6 - Math.floor(k / 2)}`;
    if (inh) bell(196, 0, 3.6, 0.04);
    k++; bT = setTimeout(step, t * 1000);
  };
  bT = setTimeout(step, 1500);
}
$('breathBtn').onclick = breathe; $('breathHome').onclick = breathe;
$('bClose').onclick = () => { $('breathe').hidden = true; clearTimeout(bT); };

// ─── свои категории ───
const EMO = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s*(.*)$/u;
function edList() {
  const m = mine();
  $('mineList').innerHTML = m.length ? m.map((c, i) => `<div class="mine"><span>${esc(c.i)}</span><b>${esc(c.n)}</b><span>${c.items.length} шт.</span><button data-i="${i}" aria-label="Удалить">🗑️</button></div>`).join('')
    : '<p>Пока нет своих категорий. Придумай свою — например, «Что взять на прогулку» или «Любимые сериалы».</p>';
  $('mineList').querySelectorAll('button').forEach(b => b.onclick = () => { const m = mine(); if (!confirm(`Удалить «${m[+b.dataset.i].n}»?`)) return; m.splice(+b.dataset.i, 1); ls('tl_mine', JSON.stringify(m)); edList(); });
  $('minePlay').hidden = !m.length;
}
$('mineBtn').onclick = () => { edList(); $('edErr').textContent = ''; $('editor').hidden = false; };
$('edClose').onclick = () => { $('editor').hidden = true; };
$('edSave').onclick = () => {
  const n = $('edName').value.trim(), icon = ($('edIcon').value.trim().match(EMO) || [])[1] || '📝';
  const items = $('edItems').value.split('\n').map(s => s.trim()).filter(Boolean).map(s => { const m = s.match(EMO); return m ? [m[1], m[2].trim()] : ['', s]; });
  const err = !n ? 'Напиши название категории.' : items.length < 3 ? 'Нужно хотя бы 3 предмета — каждый с новой строки.' : items.length > 8 ? 'Не больше 8 предметов.'
    : items.some(([, w]) => w.length > 18) ? 'Слишком длинное название предмета (до 18 букв).' : new Set(items.map(([, w]) => w.toLowerCase())).size < items.length ? 'Есть повторяющиеся предметы.' : '';
  $('edErr').textContent = err; if (err) return;
  const m = mine(); m.push({ n, i: icon, items }); ls('tl_mine', JSON.stringify(m));
  $('edName').value = $('edIcon').value = $('edItems').value = ''; edList();
};
$('minePlay').onclick = () => {                                                     // уровень с её категориями (сколько влезет) плюс обычные
  const base = TD.CATS.length, idx = mine().map((_, i) => base + i).sort(() => Math.random() - 0.5).slice(0, TL.spec(L).sizes.length - 1);
  $('editor').hidden = true; audio(); start(idx.length ? idx : [base]);
};

// ─── игра на экране «Домой»: у приложения на iPhone своя память, не общая с Сафари — уровень переносится вручную ───
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (!standalone && matchMedia('(pointer: coarse)').matches) $('a2hs').hidden = false;
if (standalone && !ls('tl_level')) $('moveBtn').hidden = false;
$('a2hs').onclick = () => { $('a2hsText').innerHTML = ios
  ? `<ol class="steps"><li>Внизу Сафари нажми «Поделиться» — квадрат со стрелкой ⬆️.</li><li>Выбери «На экран „Домой“», потом «Добавить».</li><li>Дальше открывай игру с иконки «Раскладка» — так прогресс не сотрётся.</li></ol>`
    + `<p>У приложения своя память: в нём нажми «Перенести прогресс» и введи <b>${L + 1}</b>. Свои категории придумывай уже в приложении.</p>`
  : `<ol class="steps"><li>Нажми меню браузера ⋮.</li><li>Выбери «Добавить на главный экран».</li><li>Дальше открывай игру с иконки «Раскладка».</li></ol>`;
  $('a2hsCard').hidden = false; };
$('a2hsOk').onclick = () => { $('a2hsCard').hidden = true; };
$('moveBtn').onclick = () => { $('moveCard').hidden = false; };
$('moveNo').onclick = () => { $('moveCard').hidden = true; };
$('moveGo').onclick = () => { const n = Math.floor(+$('moveIn').value); if (!(n >= 1 && n <= 999)) { $('moveIn').focus(); return; }
  L = n - 1; room = Math.min(ROOMN, L); ls('tl_level', L); ls('tl_room', room); $('moveCard').hidden = true; $('moveBtn').hidden = true; home(); };

paint(); home(); rainShow();
if (/[?&]debug/.test(location.search)) window.TT = { S: () => S, tap, act, best: () => TL.best(S) };      // для проверок: ?debug
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); })).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}
})();
