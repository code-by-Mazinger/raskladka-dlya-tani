'use strict';
// Уютная раскладка — правила (без отрисовки, проверяется в node: selfcheck.js).
// Карта: { cat, item } — item = -1 у карты-категории. Столбец — [{ id, up }], верх — последний.
// В свободную ячейку кладётся карта-категория, на неё — предметы этой категории; собрано k предметов — категория уходит.
// В столбцах на открытую карту кладутся карты той же категории (категория — только в пустой столбец).
(() => {
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Уровни: дальше — больше категорий, длиннее категории (4, 6, 8 карточек), больше столбцов
function spec(L) {
  if (L === 0) return { sizes: [3, 3, 3], cols: [1, 2, 3], slots: 3 };
  if (L === 1) return { sizes: [4, 4, 3], cols: [1, 2, 3], slots: 3 };
  if (L === 2) return { sizes: [4, 4, 4, 3], cols: [1, 2, 3, 4], slots: 3 };
  if (L < 6) return { sizes: [4, 4, 6, 6], cols: [1, 2, 3, 4], slots: 4 };
  if (L < 12) return { sizes: [4, 4, 6, 6, 6], cols: [1, 2, 3, 4, 5], slots: 4 };
  return { sizes: [4, 6, 6, 8, 8, 4], cols: [2, 3, 4, 5, 6], slots: 4 };
}

// cats — [{ n, i, items: [[эмодзи, слово]] }]: из них уровень берёт нужное число категорий и предметов
// first — номера категорий, которые обязательно войдут (свои категории Тани)
function deal(L, cats, seed = L * 7919 + 17, first = []) {
  const sp = spec(L);
  for (let t = 0; t < 60; t++) {                                                    // раздача, которую бот проходит; иначе — следующий сид
    const r = rng(seed + t * 101), pick = [...first, ...shuffle(cats.map((_, i) => i).filter(i => !first.includes(i)), r)].slice(0, sp.sizes.length);
    const lc = pick.map((ci, j) => { const c = cats[ci], k = Math.min(sp.sizes[j], c.items.length); return { n: c.n, i: c.i, items: shuffle(c.items.slice(), r).slice(0, k), k }; });
    const cards = []; lc.forEach((c, ci) => { cards.push({ cat: ci, item: -1 }); for (let k = 0; k < c.k; k++) cards.push({ cat: ci, item: k }); });
    const ids = shuffle(cards.map((_, i) => i), r), cols = sp.cols.map(n => ids.splice(0, n).map((id, j, a) => ({ id, up: j === a.length - 1 })));
    const S = { L, cats: lc, cards, cols, stock: ids, waste: [], slots: Array(sp.slots).fill(null), done: 0, moves: 0 };
    if (solve(clone(S), r)) return S;
  }
  throw new Error('нет решаемой раздачи для уровня ' + L);
}
const clone = S => ({ ...S, cols: S.cols.map(c => c.map(x => ({ ...x }))), stock: S.stock.slice(), waste: S.waste.slice(), slots: S.slots.map(s => s && { ...s }) });
const won = S => S.done === S.cats.length;
const isCat = (S, id) => S.cards[id].item === -1;
const catOf = (S, id) => S.cards[id].cat;

// Верхняя серия столбца: открытые карты одной категории, карта-категория — только в самом низу серии
function run(S, ci) {
  const col = S.cols[ci]; let i = col.length - 1;
  if (i < 0 || !col[i].up) return 0;
  while (i > 0 && col[i - 1].up && catOf(S, col[i - 1].id) === catOf(S, col[i].id) && !isCat(S, col[i].id)) i--;
  return col.length - i;
}
// Куда можно положить серию ids: 'slot' (номер ячейки) или в столбец
function slotFor(S, ids) {
  const c = catOf(S, ids[0]);
  if (isCat(S, ids[0])) { const e = S.slots.indexOf(null); return e; }
  return S.slots.findIndex(s => s && s.cat === c);
}
const fitsCol = (S, ids, ci) => { const col = S.cols[ci]; if (!col.length) return true; const t = col[col.length - 1];
  return t.up && !isCat(S, ids[0]) && catOf(S, t.id) === catOf(S, ids[0]); };

// Все ходы: { from: 'w' | номер столбца, to: 's' + ячейка | номер столбца }
function moves(S) {
  const out = [], srcs = [];
  if (S.waste.length) srcs.push(['w', [S.waste[S.waste.length - 1]]]);
  S.cols.forEach((col, ci) => { const n = run(S, ci); if (n) srcs.push([ci, col.slice(-n).map(x => x.id)]); });
  for (const [from, ids] of srcs) {
    const s = slotFor(S, ids); if (s >= 0) out.push({ from, to: 's' + s, ids });
    S.cols.forEach((col, ci) => { if (ci !== from && fitsCol(S, ids, ci) && !(col.length === 0 && from !== 'w' && S.cols[from].length === ids.length)) out.push({ from, to: ci, ids }); });
  }
  return out;
}
function apply(S, m) {                                                              // меняет S, возвращает { flipped, completed }
  const n = m.ids.length, res = { flipped: false, completed: -1 };
  if (m.from === 'w') S.waste.pop(); else { const col = S.cols[m.from]; col.splice(col.length - n, n); const t = col[col.length - 1]; if (t && !t.up) { t.up = true; res.flipped = true; } }
  if (typeof m.to === 'string') {
    const s = +m.to.slice(1), c = catOf(S, m.ids[0]);
    if (!S.slots[s]) S.slots[s] = { cat: c, n: 0 };
    S.slots[s].n += m.ids.filter(id => !isCat(S, id)).length;
    if (S.slots[s].n >= S.cats[c].k) { S.slots[s] = null; S.done++; res.completed = c; }
  } else S.cols[m.to].push(...m.ids.map(id => ({ id, up: true })));
  S.moves++;
  return res;
}
function draw(S) {                                                                  // колода → открытая карта; кончилась — снова в колоду
  if (S.stock.length) S.waste.push(S.stock.pop()); else if (S.waste.length) { S.stock = S.waste.reverse(); S.waste = []; } else return false;
  S.moves++; return true;
}

// Полезный ход для бота и подсказки: в ячейку; в столбец — только если открывает закрытую карту или снимает карту с открытой
function useful(S, m) {
  if (typeof m.to === 'string') return 3;
  if (m.from === 'w') return 2;
  const col = S.cols[m.from], below = col[col.length - m.ids.length - 1];
  if (below && !below.up) return 2;
  if (below && catOf(S, below.id) !== catOf(S, m.ids[0])) return 1;                 // открывает другую карту (назад не вернуть — категории разные)
  return 0;
}
function best(S, r = Math.random) {                                                 // ход-подсказка или 'draw', null — ходов нет
  let top = null, sc = 0;
  for (const m of moves(S)) { const v = useful(S, m) + r() * 0.5; if (useful(S, m) && v > sc) { sc = v; top = m; } }
  return top || (S.stock.length + S.waste.length ? 'draw' : null);
}
// Застряла: ни одного полезного хода, и ни одна карта колоды не ложится никуда
function stuck(S) {
  if (moves(S).some(m => useful(S, m))) return false;
  return ![...S.stock, ...S.waste].some(id => slotFor(S, [id]) >= 0 || S.cols.some((_, ci) => fitsCol(S, [id], ci) && S.cols[ci].length));
}
// Перемешать закрытые карты и колоду (бесплатно, когда застряла): открытые остаются на местах
function reshuffle(S, r = Math.random) {
  const pool = shuffle([...S.stock, ...S.waste, ...S.cols.flatMap(c => c.filter(x => !x.up).map(x => x.id))], r);
  for (const col of S.cols) for (const x of col) if (!x.up) x.id = pool.pop();
  S.stock = pool; S.waste = [];
}
function solve(S, r, max = 4000) {                                                  // бот: true — разложил
  let idle = 0;
  for (let step = 0; step < max && !won(S); step++) {
    const m = best(S, r);
    if (!m) return false;
    if (m === 'draw') { draw(S); if (++idle > (S.stock.length + S.waste.length) * 2 + 2) return false; }
    else { apply(S, m); idle = 0; }
  }
  return won(S);
}
globalThis.TL = { rng, spec, deal, clone, won, run, moves, apply, draw, best, stuck, reshuffle, solve, isCat, catOf };
})();
