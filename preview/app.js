import { categories, accounts, localDateKey, makeDemo, forMonth, totals, categoryTotals, wealthTotals, applyOwnership, makeWealthHistory, retirementEstimate, amortize, deletionPolicy, monthChange, attentionStory, pace, trendsComparison, monthlySeries } from './model.js';

const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  activity: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  trends: '<path d="M3 3v18h18M6 16l5-6 4 3 6-9"/>',
  wealth: '<path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M2 20h20"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  cart: '<path d="M2 3h3l3 12h11l3-8H6M9 20h.01M18 20h.01"/>',
  utensils: '<path d="M5 3v6q0 3 3 3t3-3V3M8 3v18M20 21V3q-5 1-5 9h5"/>',
  car: '<path d="m5 7 2-4h10l2 4 2 4v8H3v-8ZM3 11h18M7 15h.01M17 15h.01M5 19v2M19 19v2"/>',
  play: '<rect x="3" y="4" width="18" height="16" rx="4"/><path d="m10 8 6 4-6 4Z"/>',
  bag: '<path d="M4 7h16l1 14H3ZM8 8V6a4 4 0 0 1 8 0v2"/>',
  repeat: '<path d="m17 2 4 4-4 4M21 6H7a4 4 0 0 0-4 4M7 22l-4-4 4-4M3 18h14a4 4 0 0 0 4-4"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7Z"/>',
  income: '<path d="M12 3v18M16 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6"/>',
  arrowIn: '<path d="M18 6 6 18M6 6v12h12"/>',
  arrowOut: '<path d="M6 18 18 6M6 6h12v12"/>',
  settings: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  bank: '<path d="m2 8 10-6 10 6ZM3 21h18M5 10v8M10 10v8M14 10v8M19 10v8"/>',
  spark: '<path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.bank}</svg>`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const money = cents => currency.format(cents / 100);
const wholeCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const roundMoney = cents => wholeCurrency.format(Math.round(cents / 100));
const compact = cents => Math.abs(cents) >= 100000 ? `$${(cents / 100000).toFixed(1).replace(/\.0$/, '')}K` : roundMoney(cents);
const longMonth = month => new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long' });
const dateLabel = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const monthLabel = month => new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const shortMonth = month => new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short' });
const today = new Date();
const asOf = localDateKey(today);
const currentMonth = asOf.slice(0, 7);
const isLivePage = document.documentElement.dataset.mode === 'live';
const demoCategories = categories.map(category => ({ ...category }));
let liveConnection = null, liveConfiguration = null;
let liveMessage = () => 'Could not finish this request. Please try again.';
const rows = makeDemo(today);
const wealthAccounts = accounts.map(account => ({ ...account }));
const wealthHistory = makeWealthHistory(today);
const defaultRetirement = { age: 35, retirementAge: 65, balanceCents: 0, monthlyCents: 30000, realReturn: 5 };
const defaultDebt = { balanceCents: 84721, apr: 19.99, paymentCents: 7500, extraCents: 5000, lumpSumCents: 0 };
const months = [...new Set(rows.map(tx => tx.date.slice(0, 7)))].sort().reverse();
const state = { route: 'login', session: false, liveData: null, phase: 'signed-out', liveError: null, liveDeleted: false, month: currentMonth, query: '', category: '', type: '', historyWeeks: 26, lens: 'household', share: 50, retirement: { ...defaultRetirement }, debt: { ...defaultDebt }, deletedPreview: false, theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' };
const main = document.querySelector('#main');
const dialog = document.querySelector('#detail');
const catFor = id => categories.find(cat => cat.id === id) || { name: 'Uncategorized', color: '#6C6E73', icon: 'bag' };
const selectedRows = () => forMonth(rows, state.month);
const announce = message => { document.querySelector('#announcement').textContent = message; };
const empty = message => `<div class="empty">${esc(message)}</div>`;

function catIcon(cat) { return `<span class="category-icon" style="--category-color:${cat.color}">${icon(cat.icon)}</span>`; }
function txRow(tx, detailed = false) {
  const cat = catFor(tx.category);
  return `<button class="tx-row" data-tx="${esc(tx.id)}" aria-label="${esc(tx.merchant)}, ${money(tx.cents)}, ${esc(cat.name)}, ${dateLabel(tx.date)}">${catIcon(cat)}<span><span class="merchant">${esc(tx.merchant)}</span><span class="tx-meta">${detailed ? `${esc(cat.name)}${tx.transfer ? ' · Transfer, not in totals' : tx.excluded ? ' · Excluded from totals' : ''}` : `${dateLabel(tx.date)} · ${esc(cat.name)}`}</span></span>${detailed ? `<span class="table-category">${esc(cat.name)}</span>` : ''}<span class="tx-amount ${tx.income ? 'positive' : ''}">${tx.income ? '+' : '−'}${money(tx.cents)}</span></button>`;
}
function categoryList(data, limit = 7) {
  const cats = categoryTotals(data).slice(0, limit);
  const total = totals(data).spending;
  return cats.map(cat => {
    const share = total ? Math.round(cat.cents / total * 100) : 0;
    return `<button class="category-row" data-category="${esc(cat.id)}" style="--category-color:${cat.color}">${catIcon(cat)}<span><span class="category-name">${esc(cat.name)}</span><span class="category-track" style="display:block"><span class="category-fill" style="display:block;width:${share}%"></span></span></span><span><span class="category-amount">${money(cat.cents)}</span><span class="category-share" style="display:block">${share}%</span></span></button>`;
  }).join('') || empty('No sample spending in this month.');
}
function header(title, subtitle = '', action = '') {
  return `<div class="section-heading"><div><h2>${esc(title)}</h2>${subtitle ? `<p class="card-subtitle">${esc(subtitle)}</p>` : ''}</div>${action}</div>`;
}
function summary(data) {
  const sum = totals(data);
  return `<div class="summary-strip">${[['Income', sum.income, 'arrowIn'], ['Spending', sum.spending, 'arrowOut'], ['Net cash flow', sum.net, 'trends']].map(([name, cents, symbol]) => `<div class="card"><div class="stat-label">${icon(symbol)}${name}</div><div class="stat-value ${name === 'Net cash flow' && cents >= 0 ? 'positive' : ''}">${money(cents)}</div></div>`).join('')}</div>`;
}
function paceChart(result) {
  const { length, day, current, typical } = result;
  const top = Math.max(...current, ...(typical || []), 10000);
  const step = 10 ** Math.floor(Math.log10(top / 2)), ceiling = Math.ceil(top / step / 2) * step * 2;
  const x = i => 48 + (i + 1) / length * 486, y = cents => 160 - cents / ceiling * 140;
  const path = values => values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const line = `48,160 ${path(current)}`;
  const ticks = [0, ceiling / 2, ceiling];
  const days = [1, 8, 15, 22].filter(d => d <= length);
  const label = state.liveData ? '' : 'sample ';
  return `<svg class="chart pace-chart" viewBox="0 0 540 186" role="img" aria-label="Cumulative ${label}spending: ${money(result.spent)} through day ${day}${typical ? `, typical ${money(result.typicalToday)} by this day` : ''}"><defs><linearGradient id="pace-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--chart)" stop-opacity=".28"/><stop offset="100%" stop-color="var(--chart)" stop-opacity="0"/></linearGradient></defs>${ticks.map(t => `<line class="gridline" x1="48" x2="540" y1="${y(t)}" y2="${y(t)}"/><text x="0" y="${y(t) + 3}">${compact(t)}</text>`).join('')}${typical ? `<polyline class="typical-line" points="48,160 ${path(typical)}"/>` : ''}<polygon points="${line} ${x(current.length - 1).toFixed(1)},160" fill="url(#pace-fill)"/><polyline points="${line}" class="spending-line"/>${days.map(d => `<text x="${x(d - 1)}" y="182" text-anchor="middle">${d}</text>`).join('')}</svg>${typical ? '<div class="chart-legend"><span><i class="swatch solid"></i>This month</span><span><i class="swatch dashed"></i>Typical history</span></div>' : ''}`;
}
function home() {
  if (state.liveData && !rows.length) { main.innerHTML = '<section class="card account-gate"><h2>No saved transactions yet</h2><p class="note">Open the iPhone app and let it sync. Then reload your saved records here.</p><button class="button" data-action="reload-live">Reload saved records</button></section>'; return; }
  const data = selectedRows();
  const sum = totals(data);
  const change = monthChange(rows, state.month, today);
  const story = attentionStory(rows, state.month, today);
  const paced = pace(rows, state.month, today);
  const purchases = data.filter(tx => !tx.income).length;
  const vsTypical = paced.typicalToday != null ? paced.spent - paced.typicalToday : null;
  const badge = change ? `<span class="delta-pill">${Math.abs(change.percent) < 5 ? `≈ About the same ${change.label}` : `${change.percent > 0 ? '↗' : '↘'} ${Math.abs(change.percent) > 999 ? '999+' : Math.round(Math.abs(change.percent))}% ${change.label}`}</span>` : '<span class="delta-pill quiet">Not enough prior-month data</span>';
  main.innerHTML = `<div class="grid"><div class="stack"><section class="card hero"><div class="overline">Spent in ${longMonth(state.month)}</div><div class="hero-number">${money(sum.spending)}</div>${badge}<p class="subtle">${purchases} ${state.liveData ? '' : 'sample '}purchase${purchases === 1 ? '' : 's'}${state.month === currentMonth ? ` through ${dateLabel(asOf)}` : ''}</p><div class="stats"><div class="stat-tile"><div class="stat-label">Income</div><div class="stat-value positive">${money(sum.income)}</div></div><div class="stat-tile"><div class="stat-label">Net</div><div class="stat-value ${sum.net >= 0 ? 'positive' : ''}">${sum.net >= 0 ? '+' : '−'}${money(Math.abs(sum.net))}</div></div></div></section>${story ? `<button class="card attention" data-category="${esc(story.id)}"><span class="attention-label">Worth a look</span><span class="attention-body">${catIcon(story)}<span><strong>${esc(story.name)} changed most</strong><small>${roundMoney(story.delta)} more than ${longMonth(story.prior)}${story.comparison ? ` ${story.comparison}` : ''}</small></span><span class="chevron" aria-hidden="true">›</span></span></button>` : ''}<section class="card"><div class="section-heading"><div><h2>Monthly pace</h2><p class="card-subtitle">Cumulative spending through day ${paced.day}</p></div>${paced.projected != null ? `<div class="projected"><span>Projected</span><strong>${compact(paced.projected)}</strong></div>` : ''}</div>${vsTypical != null && Math.abs(vsTypical) >= 100 ? `<p class="pace-note">${vsTypical > 0 ? '↗' : '↘'} ${roundMoney(Math.abs(vsTypical))} ${vsTypical > 0 ? 'above' : 'below'} typical today</p>` : ''}${paceChart(paced)}</section></div><div class="stack"><section class="card">${header('Spending by category', 'Follow the numbers into your activity')}<div>${categoryList(data)}</div></section></div><section class="card full">${header('Recent activity', 'The details behind your month', '<a class="text-button" href="#activity">View all activity →</a>')}<div class="transaction-list">${data.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(tx => txRow(tx)).join('') || empty('No transactions in this month.')}</div></section></div>`;
}
function activity() {
  main.innerHTML = `<p class="intro">Explore your transactions, follow a category, or find a particular purchase.</p>${summary(selectedRows())}<div class="filters"><div class="search-wrap">${icon('search')}<label class="sr-only" for="search">Search transactions</label><input id="search" type="search" placeholder="Search transactions…" value="${esc(state.query)}" autocomplete="off"></div><label class="sr-only" for="category-filter">Category</label><select id="category-filter"><option value="">All categories</option>${categories.map(cat => `<option value="${esc(cat.id)}" ${state.category === cat.id ? 'selected' : ''}>${esc(cat.name)}</option>`).join('')}</select><label class="sr-only" for="type-filter">Transaction type</label><select id="type-filter"><option value="">All activity</option><option value="spending" ${state.type === 'spending' ? 'selected' : ''}>Spending</option><option value="income" ${state.type === 'income' ? 'selected' : ''}>Income</option></select></div><section class="card activity"><p class="result-count" id="result-count" role="status"></p><div class="table-header"><span>Transaction</span><span>Category</span><span class="right">Amount</span></div><div id="activity-rows"></div></section>`;
  document.querySelector('#search').addEventListener('input', event => { state.query = event.target.value; activityRows(); });
  document.querySelector('#category-filter').addEventListener('change', event => { state.category = event.target.value; activityRows(); });
  document.querySelector('#type-filter').addEventListener('change', event => { state.type = event.target.value; activityRows(); });
  activityRows();
}
function activityRows() {
  const data = rows.filter(tx => tx.date.slice(0, 7) === state.month && (!state.category || tx.category === state.category) && (!state.type || (!tx.transfer && !tx.excluded && tx.income === (state.type === 'income'))) && `${tx.merchant} ${catFor(tx.category).name}`.toLowerCase().includes(state.query.toLowerCase().trim())).sort((a, b) => b.date.localeCompare(a.date));
  document.querySelector('#result-count').textContent = `${data.length} ${state.liveData ? '' : 'sample '}transaction${data.length === 1 ? '' : 's'} · ${monthLabel(state.month)}`;
  const days = [...new Set(data.map(tx => tx.date))];
  document.querySelector('#activity-rows').innerHTML = days.map(date => {
    const group = data.filter(tx => tx.date === date);
    const label = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    return `<div class="day-group"><div class="day-header"><span>${label}</span><span>${group.length} transaction${group.length === 1 ? '' : 's'}</span></div>${group.map(tx => txRow(tx, true)).join('')}</div>`;
  }).join('') || `${empty('No transactions match these filters.')}<button class="text-button" id="clear-filters">Clear filters</button>`;
  document.querySelector('#clear-filters')?.addEventListener('click', () => { state.query = ''; state.category = ''; state.type = ''; activity(); });
}
function trends() {
  const trendRows = rows.filter(row => !row.trendExcluded);
  const comparison = trendsComparison(trendRows, state.month, today);
  const series = monthlySeries(trendRows, state.month, today);
  const isCurrent = state.month === currentMonth;
  const max = Math.max(...series.bars.map(bar => bar.spending), series.typical || 0, 1);
  const selected = series.bars.at(-1);
  const summaryLine = !comparison.available ? 'Building your comparison.' : Math.abs(comparison.totalDelta) < 1000 ? 'Overall spending is close to your typical level.' : `${roundMoney(Math.abs(comparison.totalDelta))} ${comparison.totalDelta > 0 ? 'above' : 'below'} your typical level.`;
  const drivers = comparison.drivers.map(cat => {
    const scale = Math.max(cat.current, cat.typical, 1);
    return `<button class="change-row" data-category="${esc(cat.id)}">${catIcon(cat)}<span><strong>${esc(cat.name)}</strong><span class="driver-track"><span style="width:${(cat.current / scale * 100).toFixed(1)}%"></span></span></span><span class="change-amount">${cat.delta > 0 ? '+' : '−'}${roundMoney(Math.abs(cat.delta))}<small>${roundMoney(cat.current)} now · ${roundMoney(cat.typical)} typical</small></span></button>`;
  }).join('');
  main.innerHTML = `${summary(forMonth(trendRows, state.month))}<div class="grid"><section class="card"><div class="section-heading"><div><h2>Spending over time</h2><p class="card-subtitle">${isCurrent ? `Through day ${series.cutoff} of each month` : 'Spending by month'}</p></div><div class="projected"><strong>${compact(selected.spending)}</strong><span>${monthLabel(state.month)}</span></div></div><div class="bars" style="--t:${series.typical ? (series.typical / max).toFixed(3) : 0}">${series.typical ? '<span class="typical-rule" aria-hidden="true"></span>' : ''}${series.bars.map(bar => `<div class="bar-group"><button class="bar-button ${bar.month === state.month ? 'selected' : ''}" data-month="${bar.month}" style="--h:${(bar.spending / max).toFixed(3)}" aria-label="Explore ${monthLabel(bar.month)}, ${money(bar.spending)} spending" title="${monthLabel(bar.month)} · ${money(bar.spending)}"></button><span class="bar-month">${shortMonth(bar.month)}</span></div>`).join('')}</div>${series.typical ? `<div class="chart-legend"><span><i class="swatch dashed"></i>${compact(series.typical)} typical</span></div>` : ''}<p class="legend">Only months covered from day 1 are shown${isCurrent ? '; every month stops at the same day' : ''}. Select a bar to explore that month.</p></section><section class="card"><div class="section-heading"><div><h2>What changed</h2><p class="card-subtitle">${esc(summaryLine)}</p></div><span class="comparison-label">${esc(comparison.label)}</span></div>${comparison.available ? drivers || empty('No category moved meaningfully from your typical level.') : empty('A full prior month of saved history is needed for a fair comparison.')}${drivers ? '<p class="legend">Select a category to review the transactions behind the change.</p>' : ''}</section><section class="card report-card full"><div class="insight-icon">${icon('activity')}</div><div><h2>Your monthly report</h2><p class="subtle">See income, spending, and the purchases behind ${monthLabel(state.month)} in one place.</p></div><button class="button" data-action="monthly-report">Open report →</button></section></div>`;
}
function historyChart(points) {
  const min = Math.min(...points.map(point => point.cents));
  const max = Math.max(...points.map(point => point.cents));
  const spread = Math.max(max - min, 10000);
  const coords = points.map((point, i) => [i / Math.max(points.length - 1, 1) * 600, 158 - (point.cents - min) / spread * 130]);
  return `<svg class="chart history-chart" viewBox="0 0 600 180" role="img" aria-label="Illustrative net worth history from ${money(points[0].cents)} to ${money(points.at(-1).cents)}">${[28, 93, 158].map(y => `<line class="gridline" x1="0" x2="600" y1="${y}" y2="${y}"/>`).join('')}<polyline class="spending-line" points="${coords.map(point => point.join(',')).join(' ')}"/><circle cx="600" cy="${coords.at(-1)[1]}" r="4" fill="var(--green)"/></svg><div class="chart-axis"><span>${dateLabel(points[0].date)}</span><span>${dateLabel(points.at(-1).date)}</span></div>`;
}
function wealth() {
  if (state.liveData) { savedWealth(); return; }
  const share = state.lens === 'mine' ? state.share : 100;
  const displayAccounts = applyOwnership(wealthAccounts, share);
  const sum = wealthTotals(displayAccounts);
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - state.historyWeeks * 7, 12);
  const history = wealthHistory.filter(point => point.date >= localDateKey(cutoff)).map(point => ({ ...point, cents: Math.round(point.cents * share / 100) }));
  history[history.length - 1] = { date: asOf, cents: sum.net };
  const change = sum.net - history[0].cents;
  const groups = [...new Set(displayAccounts.map(account => account.manual ? account.type : account.asset ? 'Cash' : 'Credit Cards'))];
  const groupHtml = groups.map(group => {
    const grouped = displayAccounts.filter(account => (account.manual ? account.type : account.asset ? 'Cash' : 'Credit Cards') === group);
    return `<section class="card">${header(esc(group), `${grouped.length} account${grouped.length === 1 ? '' : 's'}`)}${grouped.map(account => `<button class="balance-row" data-account="${account.id}"><span class="category-icon" style="--category-color:var(--green)">${icon(account.asset ? 'bank' : 'income')}</span><span><strong>${esc(account.name)}</strong><small>${account.manual ? 'Added manually · Sample' : `${esc(account.institution)} · ••${account.mask}`}${share < 100 ? ` · ${share}% share` : ''}</small></span><strong>${money(account.cents)}</strong></button>`).join('')}</section>`;
  }).join('');
  const retirement = retirementEstimate(state.retirement);
  const debt = amortize(state.debt);
  main.innerHTML = `<p class="intro">Your progress, your next steps, and your complete financial picture.</p><div class="wealth-toolbar"><div class="segmented" aria-label="Ownership view"><button data-lens="household" aria-pressed="${state.lens === 'household'}">Household</button><button data-lens="mine" aria-pressed="${state.lens === 'mine'}">My share · ${state.share}%</button></div><button class="text-button" data-action="ownership">Edit ownership split</button></div><div class="grid"><section class="card hero"><div class="overline">${state.lens === 'mine' ? 'Your share' : 'Sample household'} · Net worth</div><div class="hero-number">${money(sum.net)}</div><p class="subtle">Assets minus liabilities · ${dateLabel(asOf)}</p><div class="stats"><div><div class="stat-label">Assets</div><div class="stat-value">${money(sum.assets)}</div></div><div><div class="stat-label">Liabilities</div><div class="stat-value">${money(sum.liabilities)}</div></div></div></section><section class="card planning-card">${header('Next steps', 'Explore a few possibilities')}<button class="planning-row" data-action="retirement"><span class="insight-icon">${icon('trends')}</span><span><strong>Plan your retirement</strong><small>${money(retirement.cents)} projected at age ${state.retirement.retirementAge} · Sample plan</small></span><span>→</span></button><button class="planning-row" data-action="debt"><span class="insight-icon">${icon('income')}</span><span><strong>Simulate your debt payoff</strong><small>${debt.paysOff ? `${debt.months} months with the sample extra payment` : 'Explore payments and interest'}</small></span><span>→</span></button></section><section class="card full">${header('Net worth history', 'Illustrative sample history; today reconciles to the accounts below', `<div class="segmented">${[[4, '1M'], [13, '3M'], [26, '6M']].map(([weeks, label]) => `<button data-history="${weeks}" aria-pressed="${state.historyWeeks === weeks}">${label}</button>`).join('')}</div>`)}<div class="chart-summary"><strong>${change < 0 ? '−' : '+'}${money(Math.abs(change))}</strong><span>over this period · ${state.lens === 'mine' ? 'your share' : 'household'}</span></div>${historyChart(history)}<label class="history-select">Snapshot <select id="history-point">${history.map(point => `<option value="${point.date}" ${point.date === asOf ? 'selected' : ''}>${dateLabel(point.date)} · ${money(point.cents)}</option>`).join('')}</select></label></section><div class="accounts-heading full"><div><h2>Accounts</h2><p class="subtle">${wealthAccounts.length} tracked · all changes in this preview reset on reload</p></div><button class="button" data-action="add-account">+ Add manual account</button></div>${groupHtml}</div>`;
}
function resetSample() {
  rows.splice(0, rows.length, ...makeDemo(today));
  wealthAccounts.splice(0, wealthAccounts.length, ...accounts.map(account => ({ ...account })));
  state.retirement = { ...defaultRetirement }; state.debt = { ...defaultDebt };
  state.lens = 'household'; state.share = 50; state.query = ''; state.category = ''; state.type = '';
}
function login() {
  if (isLivePage) { liveLogin(); return; }
  main.innerHTML = `<div class="auth-shell"><section class="auth-story"><a href="#login" class="brand"><img src="../averlen-logo.png" width="40" height="40" alt=""><span>Averlen</span></a><span class="overline">YOUR SPACE FOR CLARITY</span><h2>A clearer picture.<br>A little more possibility.</h2><p>See where your money goes, share the bigger picture, and make room for what comes next.</p><div class="auth-illustration" aria-hidden="true"><span class="overline">THE BIGGER PICTURE</span><div class="illustration-number">Room to move forward.</div><div class="illustration-bars"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><span class="subtle">Spend with awareness. Plan with perspective.</span></div></section><section class="auth-form card"><span class="overline">WELCOME TO AVERLEN</span><h1>Welcome back.</h1><p class="subtle">Your financial picture, on a bigger screen.</p>${state.deletedPreview ? '<p class="success-note" role="status">Deletion preview complete. The sample session was cleared. No real account or bank connection was changed.</p>' : ''}<div class="preview-note">Sign-in design preview. Live authentication is not connected; please use the sample account below.</div><button class="button apple-button" disabled>Continue with Apple</button><div class="auth-divider">or use email</div><label for="login-email">Email</label><input id="login-email" type="email" placeholder="you@example.com" disabled autocomplete="off"><label for="login-password">Password</label><input id="login-password" type="password" placeholder="Your password" disabled autocomplete="off"><div class="login-assistance"><button class="text-button" data-action="reset-password-info">Forgot password?</button></div><button class="button" disabled>Sign in</button><button class="button primary" data-action="start-demo">Explore sample account →</button><p class="note">Already use Averlen on iPhone? The live web version will use your existing account. No additional account is needed.</p><div class="auth-links"><a href="#account">Saved data & account</a><a href="https://candorfinance.app/support.html">Support</a><button class="text-button" data-theme-action>Appearance</button></div></section></div>`;
}
function settings() {
  if (state.liveData) { liveSettings(); return; }
  main.innerHTML = `<p class="intro">Your account, your data, and your preferences.</p><div class="grid"><section class="card">${header('Account', 'Sample account · signed in for this preview')}<button class="settings-row" data-action="manage-account"><span><strong>Manage account</strong><small>Saved data, subscription, and account deletion</small></span><span>→</span></button><button class="settings-row" data-action="logout"><span><strong>Sign out</strong><small>Clear this sample session and return to sign-in</small></span><span>→</span></button></section><section class="card">${header('Appearance & preview')}<button class="settings-row" data-theme-action><span><strong>Appearance</strong><small>Switch between light and dark</small></span><span>→</span></button><button class="settings-row" data-action="reset-sample"><span><strong>Reset sample changes</strong><small>Restore the original transactions, accounts, and planning inputs</small></span><span>↺</span></button></section><section class="card insight full"><span class="insight-icon">${icon('spark')}</span><div><h3>Sample data, throughout</h3><p>Login, planning, manual accounts, and deletion can be explored here. Nothing connects to a real bank or changes a real account. Sample edits reset on reload.</p></div></section></div>`;
}
function account() {
  if (state.liveData) { liveAccount(); return; }
  if (isLivePage) {
    main.innerHTML = '<section class="card account-gate"><h2>Saved data & account</h2><p class="note">Sign in to view saved records, export your information, or delete your Averlen account. These controls remain available without an active plan.</p><div class="button-row"><a class="button primary" href="#login">Sign in to your account</a><a class="button" href="../preview/">Explore sample preview</a></div></section>'; return;
  }
  if (!state.session) {
    main.innerHTML = `<section class="card account-gate">${header('Saved data & account')}<p class="subtle">Sign in to view saved records, export your data, or delete your Averlen account. These options should remain available when a subscription expires.</p><p class="note">Live sign-in is not connected in this preview. Explore the sample account to try the account-management flow.</p><div class="button-row"><button class="button primary" data-action="start-demo-account">Explore sample account</button><a class="button" href="#login">Back to sign-in</a></div></section>`;
    return;
  }
  main.innerHTML = `<p class="intro">You’re in control of your account and saved information.</p><div class="grid"><section class="card">${header('Your account', 'Sample account · solo household')}<div class="definition"><span>Household role</span><strong>Owner · 1 member</strong></div><div class="definition"><span>Account access</span><strong>Preview only</strong></div><div class="button-row"><button class="button" data-action="export-sample">Export sample data</button><button class="button" data-action="logout">Sign out</button></div><p class="note">Viewing, exporting, and deleting an account remain accessible even without an active plan.</p></section><section class="card">${header('Subscription')}<p class="subtle">Subscriptions purchased through Apple are managed with Apple. Deleting an Averlen account does not cancel its App Store subscription.</p><div class="button-row"><a href="https://apps.apple.com/account/subscriptions" class="button" target="_blank" rel="noopener">Manage Apple subscription ↗</a></div></section><section class="card danger-zone full">${header('Delete account', 'This preview lets you explore the confirmation steps')}<p class="subtle">Real deletion must verify your identity, disconnect your bank connections, and remove your account’s data. A shared household owner must transfer ownership first so their partner’s account and data remain available.</p><div class="button-row"><button class="button danger" data-action="delete-account">Preview account deletion</button></div></section></div>`;
}
function render() {
  const titles = { login: 'Sign in', home: 'Home', activity: 'Activity', trends: 'Trends', wealth: 'Wealth', settings: 'Settings', account: 'Your account' };
  document.querySelector('.layout').classList.toggle('auth-mode', state.route === 'login');
  document.querySelector('#page-title').textContent = titles[state.route];
  document.title = `${titles[state.route]} · Averlen${isLivePage ? '' : ' web preview'}`;
  document.querySelector('#navigation').innerHTML = ['home', 'activity', 'trends', 'wealth'].map(key => `<a href="#${key}" ${state.route === key ? 'aria-current="page"' : ''}>${icon(key)}<span>${titles[key]}</span></a>`).join('');
  document.querySelector('#settings-link').innerHTML = `${icon('settings')}Settings`;
  document.querySelector('#account-settings').innerHTML = icon('settings');
  document.querySelector('#month').hidden = ['login', 'wealth', 'settings', 'account'].includes(state.route);
  if (isLivePage && ['loading', 'error'].includes(state.phase)) { liveStatus(); return; }
  if (state.liveData?.recordsUnavailable && ['home', 'activity', 'trends', 'wealth'].includes(state.route)) {
    main.innerHTML = '<section class="card account-gate"><h2>Your saved records could not be loaded</h2><p class="note">Your account controls are still available. Try reloading your records, or continue to account management.</p><div class="button-row"><button class="button primary" data-action="reload-live">Reload records</button><button class="button" data-action="manage-account">Manage account</button></div></section>'; return;
  }
  ({ login, home, activity, trends, wealth, settings, account }[state.route])();
}
function setTheme() {
  document.documentElement.dataset.theme = state.theme;
  const button = document.querySelector('#theme-toggle');
  button.innerHTML = icon(state.theme === 'light' ? 'moon' : 'sun');
  button.setAttribute('aria-label', `Switch to ${state.theme === 'light' ? 'dark' : 'light'} appearance`);
}
function openDialog(title, body) {
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-body').innerHTML = body;
  if (!dialog.open) dialog.showModal();
  else document.querySelector('#close-dialog').focus();
}
function openAbout() {
  if (isLivePage) { openDialog('Averlen on the web', '<p class="subtle">Your saved iPhone records are available here using your existing account. This first web connection is read-only. Bank refresh, editing, and planning changes remain in the iPhone app.</p><p class="note">Account deletion and data export use the same server permissions as the app and require you to confirm your identity.</p>'); return; }
  openDialog('Averlen for the web', `<p class="subtle">Explore Home, Activity, Trends, Wealth, and account management using synthetic data. Sample changes reset on reload.</p><p class="note">Live sign-in, bank access, and actual account deletion are not connected. The login screen and deletion sequence demonstrate those flows without asking for real credentials.</p><div class="button-row">${state.session ? '<a href="#settings" class="button">Preview settings</a><a href="#account" class="button">Account management</a>' : '<button class="button primary" data-action="start-demo">Explore sample account</button>'}</div>`);
}

function formField(id, label, value, { min = 0, max = 1000000000, step = '.01', type = 'number' } = {}) {
  return `<div class="form-field"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" value="${esc(value)}" min="${min}" max="${max}" step="${step}" required></div>`;
}
function showRetirement() {
  const plan = state.retirement;
  openDialog('Plan your retirement', `<p class="subtle">Try a sample plan in today’s dollars.</p><form id="retirement-form"><div class="form-grid">${formField('age', 'Current age', plan.age, { min: 18, max: 100, step: 1 })}${formField('retirement-age', 'Retirement age', plan.retirementAge, { min: 18, max: 100, step: 1 })}${formField('retirement-balance', 'Retirement savings ($)', plan.balanceCents / 100)}${formField('monthly-contribution', 'Monthly contribution ($)', plan.monthlyCents / 100)}${formField('real-return', 'Annual return after inflation (%)', plan.realReturn, { min: -10, max: 15, step: '.1' })}</div><p class="form-error" id="retirement-error" role="alert"></p><button class="button primary" type="submit">Update projection</button></form><div id="retirement-result" class="planner-result" role="status"></div><p class="note">Illustration only. A fixed after-inflation return is applied annually, with contributions added at each year’s end. This does not model taxes, benefits, healthcare, or changing market returns.</p>`);
  const update = () => {
    try {
      const form = document.querySelector('#retirement-form');
      const read = name => Number(form.elements.namedItem(name).value);
      const next = { age: read('age'), retirementAge: read('retirement-age'), balanceCents: Math.round(read('retirement-balance') * 100), monthlyCents: Math.round(read('monthly-contribution') * 100), realReturn: read('real-return') };
      const result = retirementEstimate(next); state.retirement = next;
      document.querySelector('#retirement-error').textContent = '';
      document.querySelector('#retirement-result').innerHTML = `<div class="overline">Projected at age ${next.retirementAge}</div><div class="planner-number">${money(result.cents)}</div><p class="subtle">${money(result.contributionsCents)} contributed over ${next.retirementAge - next.age} years, plus the modeled growth of your starting balance and contributions.</p>`;
    } catch (error) { document.querySelector('#retirement-error').textContent = error.message; document.querySelector('#retirement-result').innerHTML = ''; }
  };
  document.querySelector('#retirement-form').addEventListener('submit', event => { event.preventDefault(); update(); wealth(); });
  update();
}
function showDebt() {
  const debt = state.debt;
  openDialog('Simulate your debt payoff', `<p class="subtle">Compare a baseline payment with extra payments. These are example loan terms.</p><form id="debt-form"><div class="form-grid">${formField('debt-balance', 'Balance ($)', debt.balanceCents / 100)}${formField('debt-apr', 'Annual interest rate (%)', debt.apr, { min: 0, max: 100, step: '.01' })}${formField('debt-payment', 'Monthly payment ($)', debt.paymentCents / 100)}${formField('debt-extra', 'Extra each month ($)', debt.extraCents / 100)}${formField('debt-lump', 'One-time payment now ($)', debt.lumpSumCents / 100)}</div><button class="button primary" type="submit">Compare payoff</button></form><div id="debt-result" class="planner-result" role="status"></div><p class="note">A fixed annual rate divided into monthly interest; the final payment is trimmed to the balance. No fees, new purchases, or rate changes. This illustration does not change your account balances.</p>`);
  const update = () => {
    const form = document.querySelector('#debt-form');
    const read = name => Number(form.elements.namedItem(name).value);
    const next = { balanceCents: Math.round(read('debt-balance') * 100), apr: read('debt-apr'), paymentCents: Math.round(read('debt-payment') * 100), extraCents: Math.round(read('debt-extra') * 100), lumpSumCents: Math.round(read('debt-lump') * 100) };
    const base = amortize({ ...next, extraCents: 0, lumpSumCents: 0 }), extra = amortize(next); state.debt = next;
    const resultLine = result => result.paysOff ? `${result.months} month${result.months === 1 ? '' : 's'} · ${money(result.interestCents)} interest` : 'Payment does not clear the balance within 100 years.';
    document.querySelector('#debt-result').innerHTML = `<div class="definition"><span>Baseline</span><strong>${resultLine(base)}</strong></div><div class="definition"><span>With extra payments</span><strong>${resultLine(extra)}</strong></div>${base.paysOff && extra.paysOff ? `<div class="success-note">${Math.max(0, base.months - extra.months)} months sooner · ${money(Math.max(0, base.interestCents - extra.interestCents))} less interest</div>` : '<p class="note">The payment needs to cover interest and reduce principal to reach a payoff date.</p>'}`;
  };
  document.querySelector('#debt-form').addEventListener('submit', event => { event.preventDefault(); update(); wealth(); });
  update();
}
function showManualAccount(account = null) {
  const types = ['Cash', 'Investments', 'Credit Cards', 'Loans', 'Other Assets', 'Other Liabilities'];
  openDialog(account ? 'Edit manual account' : 'Add a manual account', `<p class="subtle">Add something that helps complete the sample picture.</p><form id="manual-account-form"><div class="form-field"><label for="manual-name">Account name</label><input id="manual-name" name="manual-name" maxlength="80" value="${esc(account?.name || '')}" placeholder="e.g. Home value" required></div><div class="form-grid"><div class="form-field"><label for="manual-type">Account type</label><select id="manual-type">${types.map(type => `<option ${type === account?.type ? 'selected' : ''}>${type}</option>`).join('')}</select></div>${formField('manual-balance', 'Balance ($)', (account?.cents || 0) / 100)}</div><p class="form-error" id="manual-error" role="alert"></p><div class="button-row"><button type="submit" class="button primary">${account ? 'Save sample account' : 'Add sample account'}</button>${account ? '<button type="button" class="button danger" id="remove-manual">Remove sample account</button>' : ''}</div></form><p class="note">Enter positive balances for assets and liabilities. These sample changes reset on reload and never sync to your real account.</p>`);
  document.querySelector('#manual-account-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = document.querySelector('#manual-name').value.trim(), cents = Math.round(Number(document.querySelector('#manual-balance').value) * 100), type = document.querySelector('#manual-type').value;
    if (!name || !Number.isSafeInteger(cents) || cents < 0 || cents > 100000000000) { document.querySelector('#manual-error').textContent = 'Enter a name and a valid nonnegative balance.'; return; }
    const next = { name, cents, type, asset: !['Credit Cards', 'Loans', 'Other Liabilities'].includes(type), manual: true, institution: 'Manual', mask: '' };
    if (account) Object.assign(account, next); else wealthAccounts.push({ id: `manual-${crypto.randomUUID()}`, ...next });
    dialog.close(); wealth(); announce('Sample account saved. Net worth updated.');
  });
  document.querySelector('#remove-manual')?.addEventListener('click', () => { wealthAccounts.splice(wealthAccounts.indexOf(account), 1); dialog.close(); wealth(); announce('Sample manual account removed.'); });
}
function showAccount(id) {
  const account = wealthAccounts.find(row => row.id === id);
  if (!account) return;
  if (account.manual) { showManualAccount(account); return; }
  openDialog(account.name, `<p class="subtle">${esc(account.institution)} · ••${account.mask}</p><div class="dialog-value">${money(account.cents)}</div><div class="definition"><span>Type</span><strong>${account.type}</strong></div><div class="definition"><span>Net worth</span><strong>${account.asset ? 'Asset' : 'Liability'}</strong></div><p class="note">The full account balance is shown here. ${state.lens === 'mine' ? `Your ${state.share}% display share is ${money(Math.round(account.cents * state.share / 100))}. ` : ''}This is a synthetic account; no bank is connected.</p>`);
}
function showOwnership() {
  openDialog('Your ownership split', `<p class="subtle">Choose your share of the household picture. This is a display view; it does not alter balances or history.</p><form id="ownership-form">${formField('ownership-share', 'Your share of each account (%)', state.share, { min: 0, max: 100, step: 1 })}<p class="note">This preview applies one percentage to every account. Household view always shows the full balances.</p><button class="button primary" type="submit">Show my share</button></form>`);
  document.querySelector('#ownership-form').addEventListener('submit', event => { event.preventDefault(); state.share = Number(document.querySelector('#ownership-share').value); state.lens = 'mine'; dialog.close(); wealth(); });
}
function showDeletion() {
  if (state.liveData) { liveAccountAction('delete'); return; }
  const policy = deletionPolicy({ owner: true, memberCount: 1, freshIdentity: false });
  if (policy.reason === 'transfer_ownership') { openDialog('Transfer ownership first', '<p class="subtle">A shared-household owner must transfer ownership to another member before deleting their own account. Their partner’s account and data must remain intact.</p>'); return; }
  openDialog('Delete your Averlen account?', `<p class="subtle">In the live service, deletion permanently removes your account and its data and disconnects your bank access. A partner’s account must remain intact.</p><div class="preview-note">This is a sample-only walkthrough. No real account, stored financial record, or bank connection will be deleted.</div><p class="note">Deleting your account does not cancel an App Store subscription. <a href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noopener">Manage it with Apple</a> to stop future charges.</p><div class="button-row"><button class="button" id="cancel-deletion">Keep account</button><button class="button danger" id="reauth-preview">Continue deletion preview</button></div>`);
  document.querySelector('#cancel-deletion').addEventListener('click', () => dialog.close());
  document.querySelector('#reauth-preview').addEventListener('click', () => {
    openDialog('Confirm your identity', '<p class="subtle">A real deletion requires a fresh sign-in using your account’s password or Apple identity. This preview uses a sample confirmation without collecting credentials.</p><div class="button-row"><button class="button primary" id="confirm-sample-identity">Confirm sample identity</button><button class="button" id="cancel-identity">Cancel</button></div>');
    document.querySelector('#cancel-identity').addEventListener('click', () => dialog.close());
    document.querySelector('#confirm-sample-identity').addEventListener('click', () => {
      const verifiedPolicy = deletionPolicy({ owner: true, memberCount: 1, freshIdentity: true });
      if (!verifiedPolicy.allowed) return;
      openDialog('Final deletion preview', '<p class="subtle">Type DELETE to finish the walkthrough. Only this sample session will be reset.</p><label for="delete-confirmation" class="dialog-label">Type DELETE</label><input id="delete-confirmation" type="text" autocomplete="off" spellcheck="false"><div class="button-row"><button class="button danger" id="simulate-deletion" disabled>Simulate deletion</button><button class="button" id="cancel-final-deletion">Keep account</button></div>');
      document.querySelector('#cancel-final-deletion').addEventListener('click', () => dialog.close());
      document.querySelector('#delete-confirmation').addEventListener('input', event => { document.querySelector('#simulate-deletion').disabled = event.target.value !== 'DELETE'; });
      document.querySelector('#simulate-deletion').addEventListener('click', () => { resetSample(); state.session = false; state.deletedPreview = true; dialog.close(); navigate('login'); });
    });
  });
}
function exportSample() {
  if (state.liveData) { liveAccountAction('export'); return; }
  const content = JSON.stringify({ sample_data_only: true, transactions: rows, accounts: wealthAccounts }, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'averlen-sample-data.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); announce('Sample data exported.');
}
function navigate(destination) { if (dialog.open) dialog.close(); if (location.hash === `#${destination}`) route(); else location.hash = destination; }
function showMonthlyReport() {
  const data = forMonth(rows.filter(row => !row.trendExcluded), state.month);
  openDialog(`${monthLabel(state.month)} report`, `${summary(data)}<p class="subtle">${state.month === currentMonth ? `Month to date through ${dateLabel(asOf)}.` : 'Completed month.'} ${state.liveData ? 'Saved records; your Trends exclusions are applied.' : 'Sample transactions only.'}</p><div class="report-categories">${categoryList(data)}</div>`);
}

function clearLiveRecords() {
  rows.length = 0; categories.length = 0; wealthAccounts.length = 0; wealthHistory.length = 0; months.length = 0;
  state.liveData = null; state.session = false; state.query = ''; state.category = ''; state.type = '';
  state.retirement = { ...defaultRetirement }; state.debt = { ...defaultDebt }; state.lens = 'household'; state.share = 50;
  if (dialog.open) dialog.close();
  document.querySelector('#dialog-body').replaceChildren();
}
function updateMonths() {
  document.querySelector('#month').innerHTML = months.map(month => `<option value="${month}">${monthLabel(month)}</option>`).join('');
  document.querySelector('#month').value = state.month;
}
export function attachLiveConnection(configuration, factory, message) {
  liveConfiguration = configuration; liveMessage = message;
  clearLiveRecords();
  if (configuration.enabled && factory) {
    liveConnection = factory(event => {
      clearLiveRecords(); state.phase = event.phase; state.liveError = event.error || null;
      if (event.phase === 'deleted') state.liveDeleted = true;
      if (event.phase === 'deletion-unconfirmed') state.liveDeleted = 'unconfirmed';
      if (event.phase === 'ready') {
        const data = event.data;
        state.liveData = data; state.session = true;
        rows.push(...data.transactions); categories.push(...data.categories); wealthAccounts.push(...data.accounts); wealthHistory.push(...data.history);
        months.push(...new Set([currentMonth, ...rows.map(row => row.date.slice(0, 7))])); months.sort().reverse();
        if (!months.includes(state.month)) state.month = months[0];
        document.querySelector('.profile strong').textContent = data.profile.user.display_name || 'Your Averlen account';
        document.querySelector('.profile small').textContent = data.profile.household.name || 'Household';
      } else {
        document.querySelector('.profile strong').textContent = 'Averlen'; document.querySelector('.profile small').textContent = 'Your account';
      }
      updateMonths();
      document.querySelector('.preview-banner>span').textContent = state.session ? 'Saved records · Read-only web access' : 'Averlen for the web';
      if (['deleted', 'deletion-unconfirmed'].includes(event.phase) || (event.phase === 'signed-out' && state.liveDeleted)) navigate('login');
      else if (state.session && ['', '#login'].includes(location.hash)) navigate('home');
      else route();
    });
  }
  render();
}
function liveStatus() {
  if (state.phase === 'loading') {
    main.innerHTML = '<section class="card account-gate" role="status"><h2>Opening your Averlen account…</h2><p class="note">Checking your household and loading saved records.</p></section>';
    return;
  }
  main.innerHTML = `<section class="card account-gate"><h2>We couldn’t open your saved records</h2><p class="note">${esc(liveMessage(state.liveError))}</p><div class="button-row"><button class="button primary" data-action="reload-live">Try again</button><button class="button" data-action="logout">Sign out</button></div></section>`;
}
function liveLogin() {
  const available = Boolean(liveConfiguration?.enabled && liveConnection);
  const appleAvailable = available && liveConfiguration.appleEnabled;
  main.innerHTML = `<div class="auth-shell"><section class="auth-story"><a href="#login" class="brand"><img src="../averlen-logo.png" width="40" height="40" alt=""><span>Averlen</span></a><span class="overline">YOUR SPACE FOR CLARITY</span><h2>Your picture.<br>Wherever you are.</h2><p>Open your saved Averlen records using the account you already use on iPhone.</p></section><section class="auth-form card"><span class="overline">WELCOME TO AVERLEN</span><h1>Welcome back.</h1><p class="subtle">Sign in with your existing Averlen account.</p>${state.liveDeleted ? `<p class="success-note" role="status">${state.liveDeleted === 'unconfirmed' ? 'We could not confirm whether deletion finished. Your session was cleared. Sign in again to check, or contact support. The website will not retry deletion automatically.' : 'Your account was deleted. Bank disconnection and remaining provider cleanup are being processed.'}</p>` : ''}${!available ? '<div class="preview-note">Web sign-in is being prepared. The sample preview is available while the secure connection is completed.</div>' : '<p class="note">This first web version shows saved records. Editing and bank refresh remain in the iPhone app.</p>'}<button class="button apple-button" id="apple-signin" ${appleAvailable ? '' : 'disabled'}>Continue with Apple</button>${!appleAvailable && available ? '<p class="note">Apple web sign-in is still being configured. Use the iPhone app if your account uses Apple.</p>' : ''}<div class="auth-divider">or use email</div><form id="live-login-form"><div class="form-field"><label for="live-email">Email</label><input id="live-email" type="email" autocomplete="username" required ${available ? '' : 'disabled'}></div><div class="form-field"><label for="live-password">Password</label><input id="live-password" type="password" autocomplete="current-password" required ${available ? '' : 'disabled'}></div><p id="login-error" class="form-error" role="alert"></p><button type="submit" class="button primary" ${available ? '' : 'disabled'}>Sign in</button><button type="button" class="text-button" id="live-reset-password" ${available ? '' : 'disabled'}>Forgot password?</button></form><a href="../preview/" class="button">Explore sample preview →</a><p class="note">Use your original account and sign-in method. The website will not create or link accounts automatically.</p><div class="auth-links"><a href="#account">Saved data & account</a><a href="https://candorfinance.app/support.html">Support</a><button class="text-button" data-theme-action>Appearance</button></div></section></div>`;
  document.querySelector('#live-login-form').addEventListener('submit', async event => {
    event.preventDefault(); if (!available) return;
    const form = event.currentTarget, email = form.querySelector('#live-email').value.trim(), passwordField = form.querySelector('#live-password');
    const password = passwordField.value; passwordField.value = ''; const button = form.querySelector('[type=submit]'); button.disabled = true;
    try { state.liveDeleted = false; await liveConnection.signIn(email, password); }
    catch (error) { if (form.isConnected) form.querySelector('#login-error').textContent = liveMessage(error); }
    finally { button.disabled = false; }
  });
  document.querySelector('#apple-signin').addEventListener('click', async event => {
    if (!appleAvailable) return; const button = event.currentTarget; button.disabled = true;
    try { state.liveDeleted = false; await liveConnection.signInApple(); } catch (error) { const target = document.querySelector('#login-error'); if (target) target.textContent = liveMessage(error); } finally { button.disabled = false; }
  });
  document.querySelector('#live-reset-password').addEventListener('click', async () => {
    const email = document.querySelector('#live-email'); if (!email.reportValidity() || !email.value) { email.focus(); return; }
    try { await liveConnection.resetPassword(email.value.trim()); const target = document.querySelector('#login-error'); if (target) target.textContent = 'If a password account exists for that email, a reset link will be sent.'; }
    catch (error) { const target = document.querySelector('#login-error'); if (target) target.textContent = liveMessage(error); }
  });
}
function liveSettings() {
  main.innerHTML = `<p class="intro">Your account and saved information, connected to the iPhone app.</p><div class="grid"><section class="card">${header('Account', state.liveData.profile.user.display_name || 'Your Averlen account')}<button class="settings-row" data-action="manage-account"><span><strong>Manage account</strong><small>Export your data, manage your plan, or delete your account</small></span><span>→</span></button><button class="settings-row" data-action="logout"><span><strong>Sign out</strong><small>Clear financial information from this browser session</small></span><span>→</span></button></section><section class="card">${header('Saved records')}<button class="settings-row" data-action="reload-live"><span><strong>Reload saved records</strong><small>Read the latest records synced from the iPhone app</small></span><span>↻</span></button><button class="settings-row" data-theme-action><span><strong>Appearance</strong><small>Switch light and dark</small></span><span>→</span></button></section></div>`;
}
function liveAccount() {
  const data = state.liveData, profile = data.profile;
  const blocked = profile.household.is_owner && profile.members.length > 1;
  main.innerHTML = `<p class="intro">Manage your Averlen account and saved records.</p><div class="grid"><section class="card">${header('Your account')}<div class="definition"><span>Name</span><strong>${esc(profile.user.display_name || 'Your account')}</strong></div><div class="definition"><span>Email</span><strong class="account-email">${esc(profile.user.email || 'Apple account')}</strong></div><div class="definition"><span>Household</span><strong>${esc(profile.household.name || 'Your household')}</strong></div><div class="definition"><span>Role</span><strong>${profile.household.is_owner ? 'Owner' : 'Member'} · ${profile.members.length} member${profile.members.length === 1 ? '' : 's'}</strong></div><div class="button-row"><button class="button" data-action="export-sample">Export my data</button><button class="button" data-action="logout">Sign out</button></div></section><section class="card">${header('Plan & access')}<p class="subtle">${data.billing.hasAccess ? 'Your household currently has access through its Averlen plan.' : 'An active plan was not confirmed. Your saved records, export, and account deletion remain available.'}</p><p class="note">This first web version is read-only. Manage or restore purchases in the iPhone app. Deleting your account does not cancel an App Store subscription.</p><div class="button-row"><a class="button" href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noopener">Manage Apple subscription ↗</a></div></section><section class="card danger-zone full">${header('Delete account')}<p class="subtle">${blocked ? 'You own a shared household. Transfer ownership to your partner in the iPhone app before deleting your account. Their account and data must stay available.' : 'Your account and its Averlen data will be permanently deleted. Your identity must be confirmed first. Bank disconnection is queued by the server as part of deletion.'}</p><div class="button-row"><button class="button danger" data-action="delete-account" ${blocked ? 'disabled' : ''}>${blocked ? 'Transfer ownership first' : 'Delete my account'}</button></div></section></div>`;
}
function savedWealth() {
  const latest = wealthHistory.at(-1);
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - state.historyWeeks * 7, 12);
  const history = wealthHistory.filter(point => point.date >= localDateKey(cutoff));
  main.innerHTML = `<p class="intro">Your saved household picture, as last synced from the iPhone app.</p><div class="grid"><section class="card hero">${latest ? `<div class="overline">Last saved net worth · ${dateLabel(latest.date)}</div><div class="hero-number">${money(latest.cents)}</div><div class="stats"><div><div class="stat-label">Assets</div><div class="stat-value">${money(latest.assets)}</div></div><div><div class="stat-label">Liabilities</div><div class="stat-value">${money(latest.liabilities)}</div></div></div>` : '<h2>No saved net worth snapshot yet</h2><p class="note">Open Wealth in the iPhone app and let it sync to build your saved history.</p>'}</section><section class="card">${header('Saved balances')}<p class="subtle">Net worth snapshots include saved bank and manual balances. This page does not refresh banks or create a new snapshot.</p><p class="note">Retirement plans, debt tracking, and account editing remain in the iPhone app in this first connected web version.</p><button class="button" data-action="reload-live">Reload saved records</button></section><section class="card full">${header('Net worth history', 'Full household totals, including saved manual balances', `<div class="segmented">${[[4, '1M'], [13, '3M'], [26, '6M']].map(([weeks, label]) => `<button data-history="${weeks}" aria-pressed="${state.historyWeeks === weeks}">${label}</button>`).join('')}</div>`)}${history.length >= 2 ? historyChart(history) : empty('Not enough saved snapshots in this period yet.')}</section><section class="card full">${header('Manual accounts', 'Stored values from the iPhone app')}${wealthAccounts.map(account => `<div class="balance-row"><span class="category-icon" style="--category-color:var(--green)">${icon('bank')}</span><span><strong>${esc(account.name)}</strong><small>${account.asset ? 'Asset' : 'Liability'}</small></span><strong>${money(account.cents)}</strong></div>`).join('') || empty('No saved manual accounts.')}</section></div>`;
}
async function liveSignOut() {
  try { await liveConnection?.signOut(); navigate('login'); }
  catch (error) { state.phase = 'error'; state.liveError = { code: error.code }; render(); }
}
function liveAccountAction(kind) {
  const profile = state.liveData?.profile; if (!profile || !liveConnection) return;
  if (kind === 'delete' && profile.household.is_owner && profile.members.length > 1) { openDialog('Transfer ownership first', '<p class="subtle">Transfer household ownership in the iPhone app before deleting your account.</p>'); return; }
  const usesPassword = liveConnection.provider() === 'password';
  openDialog(kind === 'delete' ? 'Permanently delete your account?' : 'Export your account data', `<p class="subtle">${esc(profile.user.email || profile.user.display_name || 'Your Averlen account')}</p><p class="note">${kind === 'delete' ? 'This permanently removes your Averlen account and its data. Bank access is disconnected through server cleanup. Your partner’s account must remain available. Deleting does not cancel an App Store subscription.' : 'Download your server-filtered records. Shared-household access does not include your partner’s private history.'}</p><form id="live-account-action">${usesPassword ? '<div class="form-field"><label for="confirm-password">Confirm your Averlen password</label><input id="confirm-password" type="password" autocomplete="current-password" required></div>' : '<p class="note">Apple will ask you to confirm your identity.</p>'}${kind === 'delete' ? '<div class="form-field"><label for="confirm-delete">Type DELETE to confirm</label><input id="confirm-delete" autocomplete="off" spellcheck="false" required pattern="DELETE"></div>' : ''}<p id="account-action-error" role="alert" class="form-error"></p><div class="button-row"><button type="submit" class="button ${kind === 'delete' ? 'danger' : 'primary'}">${kind === 'delete' ? 'Delete my account permanently' : 'Confirm and export'}</button><button type="button" class="button" id="cancel-live-action">Cancel</button></div></form>`);
  document.querySelector('#cancel-live-action').addEventListener('click', () => dialog.close());
  document.querySelector('#live-account-action').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget;
    if (kind === 'delete' && form.querySelector('#confirm-delete').value !== 'DELETE') return;
    const field = form.querySelector('#confirm-password'), password = field?.value || ''; if (field) field.value = '';
    const button = form.querySelector('[type=submit]'), cancel = form.querySelector('#cancel-live-action'), close = document.querySelector('#close-dialog');
    button.disabled = true; cancel.disabled = true; close.disabled = true; dialog.dataset.busy = 'true';
    try {
      if (kind === 'delete') await liveConnection.deleteAccount(password);
      else { const data = await liveConnection.exportData(password); downloadJson(data, 'averlen-account-data.json'); dialog.close(); }
    } catch (error) { const target = document.querySelector('#account-action-error'); if (target) target.textContent = liveMessage(error); }
    finally { button.disabled = false; cancel.disabled = false; close.disabled = false; delete dialog.dataset.busy; }
  });
}
function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.querySelector('#month').innerHTML = months.map(month => `<option value="${month}">${monthLabel(month)}</option>`).join('');
document.querySelector('#month').value = state.month;
document.querySelector('#month').addEventListener('change', event => { state.month = event.target.value; render(); announce(`Showing ${monthLabel(state.month)}.`); });
document.querySelector('#theme-toggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; setTheme(); });
document.querySelector('#about-preview').addEventListener('click', openAbout);
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', event => { if (dialog.dataset.busy === 'true') event.preventDefault(); });
dialog.addEventListener('close', () => { dialog.querySelectorAll('input[type=password]').forEach(input => { input.value = ''; }); });
document.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) {
    const actions = {
      'start-demo': () => { state.session = true; state.deletedPreview = false; const destination = state.pendingRoute || 'home'; state.pendingRoute = null; navigate(destination); },
      'start-demo-account': () => { state.session = true; state.deletedPreview = false; navigate('account'); },
      'manage-account': () => navigate('account'),
      'reload-live': () => { void liveConnection?.refresh(); },
      'open-settings': () => navigate('settings'),
      logout: () => { if (isLivePage) { void liveSignOut(); return; } resetSample(); state.session = false; state.pendingRoute = null; state.deletedPreview = false; navigate('login'); },
      'reset-sample': () => { if (isLivePage) { void liveConnection?.refresh(); return; } resetSample(); render(); announce('Sample changes reset.'); },
      'monthly-report': showMonthlyReport,
      retirement: showRetirement, debt: showDebt, ownership: showOwnership,
      'add-account': () => showManualAccount(), 'delete-account': showDeletion, 'export-sample': exportSample,
      'reset-password-info': () => openDialog('Reset your password', '<p class="subtle">The live website will send a reset link to the email on your Averlen account. Email delivery is not connected in this preview, and no message has been sent.</p>'),
    };
    actions[action]?.();
  }
  const lens = event.target.closest('[data-lens]');
  if (lens) { state.lens = lens.dataset.lens; wealth(); }
  const history = event.target.closest('[data-history]');
  if (history) { state.historyWeeks = Number(history.dataset.history); wealth(); }
  const category = event.target.closest('[data-category]');
  if (category) {
    if (dialog.open) dialog.close();
    state.category = category.dataset.category; state.query = ''; state.type = 'spending';
    if (location.hash === '#activity') { state.route = 'activity'; render(); }
    else location.hash = 'activity';
  }
  const txButton = event.target.closest('[data-tx]');
  if (txButton && state.liveData) { const tx = rows.find(row => row.id === txButton.dataset.tx); openDialog(tx.merchant, `<p class="subtle">${dateLabel(tx.date)} · ${esc(catFor(tx.category).name)}</p><div class="dialog-value">${tx.income ? '+' : '−'}${money(tx.cents)}</div><p class="note">${esc(tx.note || '')}</p><p class="note">This saved transaction is read-only on the website. Edit it in the iPhone app.</p>`); return; }
  if (txButton) {
    const tx = rows.find(row => row.id === txButton.dataset.tx);
    openDialog(tx.merchant, `<p class="subtle">${dateLabel(tx.date)} · Sample transaction</p><div class="dialog-value ${tx.income ? 'positive' : ''}">${tx.income ? '+' : '−'}${money(tx.cents)}</div><label for="edit-category" class="dialog-label">Category</label><select id="edit-category">${categories.filter(cat => (cat.id === 'income') === tx.income).map(cat => `<option value="${esc(cat.id)}" ${cat.id === tx.category ? 'selected' : ''}>${esc(cat.name)}</option>`).join('')}</select><p class="note">Try a different category. This changes sample data in this browser only and resets on reload.</p><div class="button-row"><button class="button primary" id="save-category">Save sample category</button></div>`);
    document.querySelector('#save-category').addEventListener('click', () => { tx.category = document.querySelector('#edit-category').value; dialog.close(); render(); announce('Sample category updated.'); });
  }
  const accountButton = event.target.closest('[data-account]');
  if (accountButton) showAccount(accountButton.dataset.account);
  const monthButton = event.target.closest('[data-month]');
  if (monthButton) { state.month = monthButton.dataset.month; document.querySelector('#month').value = state.month; render(); announce(`Showing ${monthLabel(state.month)}.`); }
  if (event.target.closest('[data-theme-action]')) { state.theme = state.theme === 'light' ? 'dark' : 'light'; setTheme(); }
});
function route() {
  const destination = location.hash.slice(1);
  if (destination === 'main') { main.focus(); return; }
  if (dialog.open) dialog.close();
  const privateRoutes = ['home', 'activity', 'trends', 'wealth', 'settings'];
  if (!state.session && privateRoutes.includes(destination)) { state.pendingRoute = destination; state.route = 'login'; }
  else state.route = ['login', 'account', ...privateRoutes].includes(destination) ? destination : state.session ? 'home' : 'login';
  render();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
if (isLivePage) {
  clearLiveRecords(); updateMonths();
  document.querySelector('.preview-banner>span').textContent = 'Averlen for the web';
  document.querySelector('#about-preview').textContent = 'About web access';
  document.querySelector('footer').textContent = 'Averlen · Your saved financial picture';
  window.addEventListener('pagehide', () => { clearLiveRecords(); state.phase = 'loading'; render(); });
  window.addEventListener('pageshow', event => { if (event.persisted) void liveConnection?.refresh(); });
}
setTheme();
route();
