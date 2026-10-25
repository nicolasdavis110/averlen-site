import { transactions as specs } from './demo.js';

// This preview is intentionally isolated from authentication, storage, and APIs.
export const categories = [
  { id: 'groceries', name: 'Groceries', color: '#5FAF87', icon: 'cart' },
  { id: 'restaurants', name: 'Restaurants', color: '#D27C35', icon: 'utensils' },
  { id: 'transport', name: 'Transport', color: '#5B8DEF', icon: 'car' },
  { id: 'entertainment', name: 'Entertainment', color: '#A78BFA', icon: 'play' },
  { id: 'shopping', name: 'Shopping', color: '#D768A1', icon: 'bag' },
  { id: 'subscriptions', name: 'Subscriptions', color: '#C49423', icon: 'repeat' },
  { id: 'utilities', name: 'Utilities', color: '#299B90', icon: 'bolt' },
  { id: 'income', name: 'Income', color: '#35795A', icon: 'income' },
];
export const accounts = [
  { id: 'checking', name: 'Everyday Checking', institution: 'First Horizon', mask: '4521', cents: 428732, asset: true, type: 'Cash' },
  { id: 'savings', name: 'Emergency Fund', institution: 'First Horizon', mask: '8934', cents: 1245000, asset: true, type: 'Cash' },
  { id: 'credit', name: 'Cash Rewards Card', institution: 'Apex Card', mask: '1234', cents: 84721, asset: false, type: 'Credit card' },
];
export function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function makeDemo(today = new Date()) {
  const anchor = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return specs.map(spec => {
    const date = new Date(anchor);
    date.setDate(date.getDate() - spec.daysAgo);
    return { ...spec, date: localDateKey(date) };
  });
}
export function eligible(rows) { return rows.filter(row => !row.transfer && !row.deleted && !row.excluded); }
export function forMonth(rows, month, throughDay = 31) {
  return eligible(rows).filter(row => row.date.slice(0, 7) === month && Number(row.date.slice(8)) <= throughDay);
}
export function totals(rows) {
  return eligible(rows).reduce((sum, row) => {
    sum[row.income ? 'income' : 'spending'] += row.cents;
    sum.net = sum.income - sum.spending;
    return sum;
  }, { income: 0, spending: 0, net: 0 });
}
export function categoryTotals(rows) {
  return categories.filter(cat => cat.id !== 'income').map(cat => ({
    ...cat, cents: eligible(rows).filter(tx => !tx.income && tx.category === cat.id).reduce((sum, tx) => sum + tx.cents, 0),
  })).filter(cat => cat.cents > 0).sort((a, b) => b.cents - a.cents);
}
export function wealthTotals(rows = accounts) {
  const assets = rows.filter(a => a.asset).reduce((sum, a) => sum + a.cents, 0);
  const liabilities = rows.filter(a => !a.asset).reduce((sum, a) => sum + a.cents, 0);
  return { assets, liabilities, net: assets - liabilities };
}

export function previousMonth(month) {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() - 1);
  return localDateKey(date).slice(0, 7);
}
export function categoryChanges(rows, month, today = new Date()) {
  const prior = previousMonth(month);
  const cutoff = month === localDateKey(today).slice(0, 7) ? today.getDate() : 31;
  const coverageStart = rows.map(row => row.date).sort()[0];
  if (!coverageStart || coverageStart > `${prior}-01`) return { available: false, prior, cutoff, changes: [] };
  const current = categoryTotals(forMonth(rows, month, cutoff));
  const previous = categoryTotals(forMonth(rows, prior, cutoff));
  const changes = categories.filter(cat => cat.id !== 'income').map(cat => {
    const now = current.find(row => row.id === cat.id)?.cents || 0;
    const before = previous.find(row => row.id === cat.id)?.cents || 0;
    return { ...cat, now, before, delta: now - before };
  }).filter(cat => cat.now || cat.before).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { available: true, prior, cutoff, changes };
}
export function applyOwnership(rows, percent = 100) {
  const share = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 50;
  return rows.map(row => ({ ...row, cents: Math.round(row.cents * share / 100) }));
}
export function makeWealthHistory(today = new Date(), endingCents = wealthTotals().net) {
  // Synthetic weekly history with the iPhone demo's drift/noise, anchored to
  // the preview's reconciled account total rather than a mismatching endpoint.
  return Array.from({ length: 27 }, (_, i) => {
    const week = 26 - i;
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - week * 7, 12);
    return { date: localDateKey(date), cents: endingCents - week * 17500 + Math.round(Math.sin(week * .7) * 25000) };
  });
}
export function amortize({ balanceCents, apr, paymentCents, extraCents = 0, lumpSumCents = 0 }) {
  if (![balanceCents, apr, paymentCents, extraCents, lumpSumCents].every(Number.isFinite)
      || [balanceCents, apr, paymentCents, extraCents, lumpSumCents].some(value => value < 0)) throw new RangeError('Use finite, nonnegative amounts.');
  let balance = Math.max(0, balanceCents - lumpSumCents) / 100;
  const rate = apr / 100 / 12;
  const payment = (paymentCents + extraCents) / 100;
  let months = 0, interest = 0;
  if (balance <= .01) return { months: 0, interestCents: 0, paysOff: true };
  if (payment <= balance * rate || payment <= 0) return { months: 0, interestCents: 0, paysOff: false };
  while (balance > .01 && months < 1200) {
    const charge = balance * rate;
    balance -= Math.min(balance, payment - charge);
    interest += charge;
    months++;
  }
  return { months, interestCents: Math.round(interest * 100), paysOff: balance <= .01 };
}
export function retirementEstimate({ age, retirementAge, balanceCents, monthlyCents, realReturn }) {
  if (![age, retirementAge, balanceCents, monthlyCents, realReturn].every(Number.isFinite)
      || !Number.isInteger(age) || !Number.isInteger(retirementAge) || age < 18 || retirementAge < age || retirementAge > 100
      || balanceCents < 0 || monthlyCents < 0 || realReturn < -10 || realReturn > 15) throw new RangeError('Check the ages, amounts, and return assumption.');
  let balance = balanceCents / 100;
  const points = [{ age, cents: Math.round(balance * 100) }];
  for (let next = age + 1; next <= retirementAge; next++) {
    // End-of-year contribution timing matches the app's projection loop.
    balance = balance * (1 + realReturn / 100) + monthlyCents / 100 * 12;
    if (!Number.isSafeInteger(Math.round(balance * 100))) throw new RangeError('This projection exceeds the supported amount. Try smaller sample inputs.');
    points.push({ age: next, cents: Math.round(balance * 100) });
  }
  return { cents: Math.round(balance * 100), contributionsCents: monthlyCents * 12 * (retirementAge - age), points };
}
export function deletionPolicy({ owner = false, memberCount = 1, freshIdentity = false }) {
  if (owner && memberCount > 1) return { allowed: false, reason: 'transfer_ownership' };
  if (!freshIdentity) return { allowed: false, reason: 'reauthenticate' };
  return { allowed: true, reason: null };
}
