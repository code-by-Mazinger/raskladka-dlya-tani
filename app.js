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
const save = () => ls('tl_game', JSON.stringify(S));

function start(first = []) {
  S = null;
  if (!first.length) try { const g = JSON.parse(ls('tl_game')); if (g && g.L === L && !TL.won(g)) S = g; } catch (e) {}
  if (!S) S = TL.deal(L, pool(), undefined, first);
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
    if (c.item < 0) el.innerHTML = `<div class="b"></div><div class="f"><div class="strip">${esc(cat.n)}</div><div class="big">${esc(cat.i)}</div><div class="cnt"></div></div>`;
    else { const [e, w] = cat.items[c.item]; el.innerHTML = `<div class="b"></div><div class="f"><div class="strip">${esc(e)} ${esc(w)}</div>`
      + (e ? `<div class="big">${esc(e)}</div><div class="word">${esc(w)}</div>` : `<div class="big txt">${esc(w)}</div>`) + '</div>'; }
    el.addEventListener('click', () => tap(id));
    table.appendChild(el); els.set(id, el);
  });
  table.classList.add('still'); layout(); void table.offsetWidth; table.classList.remove('still');   // первая отрисовка — без полёта карт из угла
}
function layout() {
  if (!S) return;
  const G = Math.max(4, S.cols.length, S.slots.length), W = Math.min(innerWidth, 560) - 20, gap = Math.max(5, Math.round(W * 0.016));   // G — сетка: на ранних уровнях карты крупнее
  cw = Math.floor(Math.min((W - (G - 1) * gap) / G, 110)); ch = Math.round(cw * 1.4);
  const x0 = (innerWidth - (G * cw + (G - 1) * gap)) / 2, top = $('bar').getBoundingClientRect().bottom + 8;
  geo = { G, X: k => x0 + k * (cw + gap), y1: top, y2: top + ch + 12, y3: top + 2 * ch + 30 };
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
  Object.assign(stockN.style, { left: geo.X(G - 1) + cw / 2 + 'px', top: geo.y1 + ch - 12 + 'px' }); stockN.textContent = S.stock.length || ''; stockN.hidden = !S.stock.length;   // сколько осталось в колоде
  $('lvl').innerHTML = `Уровень ${S.L + 1}<small>Разложено ${S.done} из ${S.cats.length}</small>`;
  $('undo').classList.toggle('off', !hist.length);
}

// ─── ходы: касание карты — она сама идёт в лучшее место ───
function where(id) {
  if (S.stock.includes(id)) return 'stock';
  if (S.waste[S.waste.length - 1] === id) return 'w';
  for (let ci = 0; ci < S.cols.length; ci++) { const col = S.cols[ci], i = col.findIndex(x => x.id === id); if (i >= 0) return i >= col.length - TL.run(S, ci) ? ci : null; }
  return null;
}
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
  const m = TL.best(S);
  if (!m) { $('stuck').hidden = false; return; }
  const ids = m === 'draw' ? (S.stock.length ? [S.stock[S.stock.length - 1]] : []) : m.ids;
  if (!ids.length) { phStock.classList.remove('hint'); void phStock.offsetWidth; phStock.classList.add('hint'); return; }
  for (const id of ids) { const el = els.get(id); el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint'); }
};
$('mix').onclick = () => { hist.push(TL.clone(S)); TL.reshuffle(S); render(); save(); $('stuck').hidden = true; if (TL.stuck(S)) setTimeout(() => { $('stuck').hidden = false; }, 600); };
$('again').onclick = () => { ls('tl_game', null); $('stuck').hidden = true; start(); };

// ─── победа: тёплая фраза и новая вещь в доме ───
function win() {
  fanfare();
  L++; ls('tl_level', L); ls('tl_game', null);
  const got = room < ROOMN ? TD.ROOM[room] : null;
  if (got) { room++; ls('tl_room', room); }
  $('warm').textContent = pick(TD.WARM);
  $('newWrap').hidden = !got;
  if (got) { $('newThing').textContent = got[0]; $('newName').textContent = `В доме появилось: ${got[1]}`; }
  $('win').hidden = false; busy = false;
}
$('next').onclick = () => { $('win').hidden = true; start(); };
$('winHome').onclick = () => { $('win').hidden = true; home(true); };

// ─── дом: стартовый экран ───
function home(fresh = false) {
  const r = $('room'); r.querySelectorAll('.it').forEach(e => e.remove());
  const w = r.clientWidth || Math.min(innerWidth - 32, 460);
  TD.ROOM.slice(0, room).forEach(([e, n, x, y, s], i) => { const d = document.createElement('div');
    d.className = 'it' + (fresh && i === room - 1 ? ' new' : ''); d.textContent = e; d.title = n;
    Object.assign(d.style, { left: x + '%', top: y + '%', fontSize: Math.round(s * w * 1.1) + 'px' }); r.appendChild(d); });
  $('roomCap').textContent = room >= ROOMN ? 'Дом обставлен полностью! Можно просто раскладывать 🏡' : room ? `Вещей в доме: ${room} из ${ROOMN}. Каждая раскладка добавляет новую.` : 'Пока тут пусто. Каждая раскладка добавит в дом новую вещь.';
  let g = null; try { g = JSON.parse(ls('tl_game')); } catch (e) {}
  $('play').textContent = g && g.L === L && g.moves ? `Продолжить · уровень ${L + 1}` : `Играть · уровень ${L + 1}`;
  $('home').hidden = false;
}
$('play').onclick = () => { audio(); start(); bell(523.25, 0, 1, 0.07); };
$('homeBtn').onclick = () => home();

// ─── ночь и звук ───
function night() { const v = ls('tl_night'), h = new Date().getHours(); return v ? v === '1' : (h >= 21 || h < 7); }   // без выбора — ночь с 21 до 7
function paint() { const n = night(); document.body.classList.toggle('night', n); $('nightBtn').textContent = n ? '☀️ День' : '🌙 Ночь';
  document.querySelector('meta[name=theme-color]').content = n ? '#1d2033' : '#efe4d4'; $('sndBtn').textContent = soundOn() ? '🔈 Тихо' : '🔇 Без звука'; }
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

paint(); home();
if (/[?&]debug/.test(location.search)) window.TT = { S: () => S, tap, act, best: () => TL.best(S) };      // для проверок: ?debug
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); })).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
}
})();
