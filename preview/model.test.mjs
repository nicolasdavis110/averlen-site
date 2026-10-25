import test from 'node:test';
import assert from 'node:assert/strict';
import { totals, forMonth, categoryTotals, makeDemo, wealthTotals } from './model.js';

test('cash flow excludes transfers, deleted rows and excluded categories without losing cents', () => {
  const rows = [
    { cents: 100001, income: true }, { cents: 1999, category: 'groceries' },
    { cents: 2, category: 'groceries' }, { cents: 50000, transfer: true },
    { cents: 4000, deleted: true }, { cents: 3000, excluded: true },
  ];
  assert.deepEqual(totals(rows), { income: 100001, spending: 2001, net: 98000 });
  assert.equal(categoryTotals(rows).reduce((sum, cat) => sum + cat.cents, 0), 2001);
});
test('like-for-like comparisons stop at the same day and never include another month', () => {
  const rows = [
    { date: '2026-09-01', cents: 100 }, { date: '2026-09-25', cents: 200 },
    { date: '2026-09-26', cents: 400 }, { date: '2026-10-01', cents: 800 },
  ];
  assert.equal(totals(forMonth(rows, '2026-09', 25)).spending, 300);
  assert.equal(totals(forMonth(rows, '2026-09')).spending, 700);
});
test('synthetic data crosses year boundaries using local calendar dates', () => {
  const rows = makeDemo(new Date(2026, 0, 1, 12));
  assert.equal(rows[0].date, '2026-01-01');
  assert.equal(rows[1].date, '2025-12-31');
  assert.equal(rows.length, 53);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
});
test('sample category totals reconcile to spending, and wealth reconciles to account balances', () => {
  const rows = forMonth(makeDemo(new Date(2026, 9, 25, 12)), '2026-10');
  assert.equal(totals(rows).spending, 106164);
  assert.equal(categoryTotals(rows).reduce((sum, cat) => sum + cat.cents, 0), 106164);
  assert.deepEqual(wealthTotals(), { assets: 1673732, liabilities: 84721, net: 1589011 });
});
