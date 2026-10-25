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
