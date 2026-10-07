// node selfcheck.js — правила, раздачи 1–60 проходимы ботом, сложность растёт, перемешивание не теряет карт, данные без повторов
'use strict';
const assert = require('assert');
require('./data.js'); require('./logic.js');
const { CATS, ROOM, WARM } = TD;

// данные: по 8 предметов, эмодзи не повторяются между категориями (иначе не различить)
assert(CATS.every(c => c.items.length === 8), 'в каждой категории 8 предметов');
const emo = CATS.flatMap(c => c.items.map(x => x[0]));
assert.strictEqual(new Set(emo).size, emo.length, 'эмодзи предметов не повторяются');
assert(ROOM.length >= 20 && WARM.length >= 8);

// правила на ручной раскладке: категория A (2 предмета), B (2 предмета)
const S = { L: 0, cats: [{ n: 'A', i: 'a', items: [['1', 'a1'], ['2', 'a2']], k: 2 }, { n: 'B', i: 'b', items: [['3', 'b1'], ['4', 'b2']], k: 2 }],
  cards: [{ cat: 0, item: -1 }, { cat: 0, item: 0 }, { cat: 0, item: 1 }, { cat: 1, item: -1 }, { cat: 1, item: 0 }, { cat: 1, item: 1 }],
  cols: [[{ id: 4, up: false }, { id: 0, up: true }, { id: 1, up: true }], [{ id: 3, up: true }], []], stock: [5], waste: [2], slots: [null, null], done: 0, moves: 0 };
assert.strictEqual(TL.run(S, 0), 2, 'серия: категория A + предмет A');
assert(TL.moves(S).some(m => m.from === 0 && m.to === 's0'), 'серия с категорией — в пустую ячейку');
assert(!TL.moves(S).some(m => m.from === 1 && m.to === 0), 'категория не кладётся на карту');
assert(!TL.moves(S).some(m => m.from === 0 && m.to === 1), 'A не кладётся на B');
let r = TL.apply(S, TL.moves(S).find(m => m.from === 0 && m.to === 's0'));
assert(r.flipped && S.cols[0][0].up && S.slots[0].n === 1, 'в ячейке 1 предмет, закрытая карта открылась');
r = TL.apply(S, TL.moves(S).find(m => m.from === 'w'));
assert(r.completed === 0 && S.slots[0] === null && S.done === 1, 'категория собрана — ячейка свободна');
assert(TL.solve(TL.clone(S), TL.rng(1)), 'бот доводит до конца');

// раздачи: все уровни проходимы, карт ровно сколько нужно; перемешивание сохраняет набор карт
for (let L = 0; L < 60; L++) {
  const D = TL.deal(L, CATS), n = D.cats.reduce((s, c) => s + c.k + 1, 0);
  assert.strictEqual(D.cards.length, n);
  assert.strictEqual(D.cols.flat().length + D.stock.length, n, 'все карты разданы');
  assert(TL.plan(D) !== null, 'уровень ' + (L + 1) + ': подсказка с первого хода ведёт к победе');
  const ids = () => [...D.stock, ...D.waste, ...D.cols.flat().map(x => x.id)].sort((a, b) => a - b).join();
  const before = ids(); TL.reshuffle(D, TL.rng(9)); assert.strictEqual(ids(), before, 'перемешивание не теряет карт');
}
// сложность растёт: наугад на 41–45-м выигрывается заметно реже, чем на 6–10-м (раздачи подбираются по этой доле)
const rate = (a, b) => { let ok = 0, n = 0; for (let L = a; L < b; L++) { const D = TL.deal(L, CATS); for (let k = 0; k < 40; k++, n++) ok += TL.naive(TL.clone(D), TL.rng(777 + k)) ? 1 : 0; } return ok / n; };
const easy = rate(5, 10), hard = rate(40, 45);
assert(easy - hard > 0.25, `сложность растёт: 6–10-й ${Math.round(easy * 100)}%, 41–45-й ${Math.round(hard * 100)}%`);
// быстрая раскладка — маленькая и проходимая; раскладка дня — одна и та же на дату
const Q = TL.deal(0, CATS, 4242, [], TL.QUICK);
assert(Q.cards.length === 15 && TL.plan(Q) !== null, 'быстрая: 15 карт, проходима');
assert.deepStrictEqual(TL.deal(20, CATS, 20261008).cols, TL.deal(20, CATS, 20261008).cols, 'раскладка дня одинакова весь день');
assert(TD.RARE.length === 30 && new Set(TD.RARE.map(x => x[0])).size === 30, '30 разных редких вещей');
// свои категории: 3 предмета, обязательно входят в раскладку
const mine = CATS.concat([{ n: 'Моя', i: '📝', items: [['', 'раз'], ['', 'два'], ['', 'три']] }]);
const M = TL.deal(15, mine, undefined, [CATS.length]);
assert(M.cats[0].n === 'Моя' && M.cats[0].k === 3, 'своя категория в раскладке, k не больше её предметов');
// застряла: пустая колода, ходов нет
const T = { ...TL.clone(S), stock: [], waste: [], cols: [[{ id: 4, up: true }, { id: 3, up: true }]], slots: [{ cat: 0, n: 1 }], done: 0 };
T.cards = S.cards; T.cats = S.cats;
assert(TL.stuck(T), 'нет ходов — застряла');
console.log('ВСЁ ОК');
