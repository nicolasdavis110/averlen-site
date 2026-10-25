import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSnapshot, cents } from '../data.js';
import { fixture, householdId } from './fixtures.mjs';

test('decimal amounts preserve cents and reject ambiguous financial values', () => {
  assert.equal(cents('0.29'), 29); assert.equal(cents('-2.05'), -205); assert.equal(cents(123.45), 12345);
  for (const bad of [null, '', '1,000', 'NaN', Infinity, '1.001']) assert.throws(() => cents(bad));
});
test('stored snapshots add manual amounts once and preserve exact household records', () => {
  const data = fixture(), normalized = normalizeSnapshot(data.profile, data.billing, data.payload);
  assert.equal(normalized.transactions[0].cents, 12345);
  assert.equal(normalized.history.at(-1).cents, 1250000);
  assert.equal(normalized.history.at(-1).assets, 1300000);
  assert.equal(normalized.accounts[0].cents, 1000000);
});
test('household mismatches fail closed at billing, sync envelope, and individual rows', () => {
  for (const mutate of [data => { data.billing.household_id = 'other'; }, data => { data.payload.household_id = 'other'; }, data => { data.payload.changes.transactions[0].household_id = 'other'; }]) {
    const data = fixture(); mutate(data);
    assert.throws(() => normalizeSnapshot(data.profile, data.billing, data.payload), { code: 'HOUSEHOLD_CHANGED' });
  }
});
test('purged and deleted records stay hidden; transfers and excluded records remain in Activity data', () => {
  const data = fixture(), rows = data.payload.changes.transactions;
  rows.push({ ...rows[0], id: 'deleted', is_deleted: true }, { ...rows[0], id: 'transfer', is_internal_transfer: true });
  data.payload.changes.transaction_purges.push({ id: 'tx-1' });
  const normalized = normalizeSnapshot(data.profile, data.billing, data.payload);
  assert.deepEqual(normalized.transactions.map(row => row.id).sort(), ['transfer', 'tx-2']);
  assert.equal(normalized.transactions.find(row => row.id === 'transfer').transfer, true);
});
test('investment and Trends settings follow synced preferences without changing bank direction', () => {
  const data = fixture();
  data.payload.changes.transactions.push({ ...data.payload.changes.transactions[0], id: 'investment-tx', category_id: 'investments' });
  data.payload.changes.transactions[0].category_id = 'income'; // A category rename/misclassification never changes bank direction.
  data.payload.changes.user_preferences.push({ id: 'pref', household_id: householdId, pref_key: 'candor_trends_excluded_ids', pref_value: { v: ['TX-1'] } });
  let normalized = normalizeSnapshot(data.profile, data.billing, data.payload);
  assert.equal(normalized.transactions.find(row => row.id === 'tx-1').income, false);
  assert.equal(normalized.transactions.find(row => row.id === 'tx-1').trendExcluded, true);
  assert.equal(normalized.transactions.find(row => row.id === 'investment-tx').excluded, true);
  data.payload.changes.user_preferences.push({ id: 'pref2', household_id: householdId, pref_key: 'candor_include_investments', pref_value: { v: true } });
  normalized = normalizeSnapshot(data.profile, data.billing, data.payload);
  assert.equal(normalized.transactions.find(row => row.id === 'investment-tx').excluded, false);
});
test('an expired plan does not remove saved records or imply active access', () => {
  const data = fixture({ hasAccess: false }), normalized = normalizeSnapshot(data.profile, data.billing, data.payload);
  assert.equal(normalized.billing.hasAccess, false); assert.equal(normalized.transactions.length, 2);
});
test('malformed deletion flags fail closed rather than showing a deleted row', () => {
  const data = fixture(); data.payload.changes.transactions[0].is_deleted = 'true';
  assert.throws(() => normalizeSnapshot(data.profile, data.billing, data.payload), { code: 'INVALID_SYNC_RESPONSE' });
});
test('server DATE snapshots keep their calendar day in every browser time zone', () => {
  const data = fixture(), normalized = normalizeSnapshot(data.profile, data.billing, data.payload);
  assert.deepEqual(normalized.history.map(point => point.date), ['2026-09-25', '2026-10-25']);
});
test('wrapped preference values match the iOS wire format; a false toggle stays false', () => {
  const data = fixture();
  data.payload.changes.transactions.push({ ...data.payload.changes.transactions[0], id: 'investment-tx', category_id: 'investments' });
  data.payload.changes.user_preferences.push({ id: 'pref', household_id: householdId, pref_key: 'candor_include_investments', pref_value: { v: false } });
  const normalized = normalizeSnapshot(data.profile, data.billing, data.payload);
  assert.equal(normalized.transactions.find(row => row.id === 'investment-tx').excluded, true);
});
