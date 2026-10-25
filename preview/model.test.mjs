import test from 'node:test';
import assert from 'node:assert/strict';
import { totals, forMonth, categoryTotals, makeDemo, wealthTotals, categoryChanges, previousMonth, makeWealthHistory, applyOwnership, amortize, retirementEstimate, deletionPolicy } from './model.js';

test('cash flow excludes transfers, deleted rows and excluded categories without losing cents', () => {
  const rows = [
    { cents: 100001, income: true }, { cents: 1999, category: 'groceries' },
    { cents: 2, category: 'groceries' }, { cents: 50000, transfer: true },
    { cents: 4000, deleted: true }, { cents: 3000, excluded: true },
  ];
  assert.deepEqual(totals(rows), { income: 100001, spending: 2001, net: 98000 });
  assert.equal(categoryTotals(rows).reduce((sum, cat) => sum + cat.cents, 0), 2001);
});
test('Trends compares the same days and refuses an incomplete previous month', () => {
  const rows = [
    { date: '2026-09-01', cents: 1000, category: 'groceries' },
    { date: '2026-09-26', cents: 9000, category: 'groceries' },
    { date: '2026-10-01', cents: 1600, category: 'groceries' },
    { date: '2026-10-02', cents: 8000, category: 'groceries', transfer: true },
  ];
  const result = categoryChanges(rows, '2026-10', new Date(2026, 9, 25, 12));
  assert.equal(result.available, true);
  assert.equal(result.changes[0].before, 1000);
  assert.equal(result.changes[0].delta, 600);
  assert.equal(categoryChanges(rows.slice(1), '2026-10', new Date(2026, 9, 25, 12)).available, false);
  assert.equal(previousMonth('2026-01'), '2025-12');
});
test('ownership is a reversible display view and synthetic history reconciles at its endpoint', () => {
  const accounts = [{ id: 'asset', cents: 10000, asset: true }, { id: 'debt', cents: 2000, asset: false }];
  const original = structuredClone(accounts);
  assert.equal(wealthTotals(applyOwnership(accounts, 50)).net, 4000);
  assert.equal(wealthTotals(applyOwnership(accounts, 100)).net, 8000);
  assert.deepEqual(accounts, original);
  assert.equal(wealthTotals(applyOwnership(accounts, 0)).net, 0);
  const history = makeWealthHistory(new Date(2026, 9, 25, 12), 8000);
  assert.equal(history.length, 27);
  assert.deepEqual(history.at(-1), { date: '2026-10-25', cents: 8000 });
});
test('debt simulations trim the last payment and handle zero interest, extra payments, and nonpayoff', () => {
  assert.deepEqual(amortize({ balanceCents: 10000, apr: 0, paymentCents: 3000 }), { months: 4, interestCents: 0, paysOff: true });
  const loan = { balanceCents: 100000, apr: 12, paymentCents: 10000 };
  const base = amortize(loan), extra = amortize({ ...loan, extraCents: 10000 });
  assert.ok(extra.months < base.months);
  assert.ok(extra.interestCents < base.interestCents);
  assert.equal(amortize({ ...loan, paymentCents: 1000 }).paysOff, false);
  assert.equal(amortize({ ...loan, lumpSumCents: 100000 }).months, 0);
  assert.throws(() => amortize({ ...loan, balanceCents: NaN }), RangeError);
});
test('retirement uses annual growth then end-of-year contributions and rejects invalid ages', () => {
  assert.equal(retirementEstimate({ age: 35, retirementAge: 36, balanceCents: 1000000, monthlyCents: 10000, realReturn: 5 }).cents, 1170000);
  assert.equal(retirementEstimate({ age: 65, retirementAge: 65, balanceCents: 1000000, monthlyCents: 10000, realReturn: 5 }).cents, 1000000);
  assert.throws(() => retirementEstimate({ age: 35, retirementAge: 34, balanceCents: 0, monthlyCents: 10000, realReturn: 5 }), RangeError);
  assert.throws(() => retirementEstimate({ age: 18, retirementAge: 100, balanceCents: 100000000000, monthlyCents: 100000000000, realReturn: 15 }), RangeError);
});
test('deletion requires fresh identity and blocks shared owners even after identity confirmation', () => {
  assert.deepEqual(deletionPolicy({ owner: true, memberCount: 2, freshIdentity: true }), { allowed: false, reason: 'transfer_ownership' });
  assert.equal(deletionPolicy({ owner: true, memberCount: 1 }).reason, 'reauthenticate');
  assert.equal(deletionPolicy({ owner: true, memberCount: 1, freshIdentity: true }).allowed, true);
  assert.equal(deletionPolicy({ owner: false, memberCount: 2, freshIdentity: true }).allowed, true);
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
