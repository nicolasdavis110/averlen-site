import { categories, accounts, localDateKey, makeDemo, forMonth, totals, categoryTotals, wealthTotals, categoryChanges, applyOwnership, makeWealthHistory, retirementEstimate, amortize, deletionPolicy } from './model.js';

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
const dateLabel = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const monthLabel = month => new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const shortMonth = month => new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short' });
const today = new Date();
const asOf = localDateKey(today);
const currentMonth = asOf.slice(0, 7);
const rows = makeDemo(today);
const wealthAccounts = accounts.map(account => ({ ...account }));
const wealthHistory = makeWealthHistory(today);
const defaultRetirement = { age: 35, retirementAge: 65, balanceCents: 0, monthlyCents: 30000, realReturn: 5 };
const defaultDebt = { balanceCents: 84721, apr: 19.99, paymentCents: 7500, extraCents: 5000, lumpSumCents: 0 };
const months = [...new Set(rows.map(tx => tx.date.slice(0, 7)))].sort().reverse();
const state = { route: 'login', session: false, month: currentMonth, query: '', category: '', type: '', historyWeeks: 26, lens: 'household', share: 50, retirement: { ...defaultRetirement }, debt: { ...defaultDebt }, deletedPreview: false, theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' };
const main = document.querySelector('#main');
const dialog = document.querySelector('#detail');
const catFor = id => categories.find(cat => cat.id === id);
const selectedRows = () => forMonth(rows, state.month);
const announce = message => { document.querySelector('#announcement').textContent = message; };
const empty = message => `<div class="empty">${esc(message)}</div>`;

function catIcon(cat) { return `<span class="category-icon" style="--category-color:${cat.color}">${icon(cat.icon)}</span>`; }
function txRow(tx, detailed = false) {
  const cat = catFor(tx.category);
  return `<button class="tx-row" data-tx="${tx.id}" aria-label="${esc(tx.merchant)}, ${money(tx.cents)}, ${esc(cat.name)}, ${dateLabel(tx.date)}">${catIcon(cat)}<span><span class="merchant">${esc(tx.merchant)}</span><span class="tx-meta">${dateLabel(tx.date)} · ${detailed ? 'Sample transaction' : esc(cat.name)}</span></span>${detailed ? `<span class="table-category">${esc(cat.name)}</span>` : ''}<span class="tx-amount ${tx.income ? 'positive' : ''}">${tx.income ? '+' : '−'}${money(tx.cents)}</span></button>`;
}
function categoryList(data, limit = 7) {
  const cats = categoryTotals(data).slice(0, limit);
  const total = totals(data).spending;
  return cats.map(cat => {
    const share = total ? Math.round(cat.cents / total * 100) : 0;
    return `<button class="category-row" data-category="${cat.id}" style="--category-color:${cat.color}">${catIcon(cat)}<span><span class="category-name">${cat.name}</span><span class="category-track" style="display:block"><span class="category-fill" style="display:block;width:${share}%"></span></span></span><span><span class="category-amount">${money(cat.cents)}</span><span class="category-share" style="display:block">${share}%</span></span></button>`;
  }).join('') || empty('No sample spending in this month.');
}
function header(title, subtitle = '', action = '') {
  return `<div class="section-heading"><div><h2>${title}</h2>${subtitle ? `<p class="card-subtitle">${subtitle}</p>` : ''}</div>${action}</div>`;
}
function summary(data) {
  const sum = totals(data);
  return `<div class="summary-strip">${[['Income', sum.income, 'arrowIn'], ['Spending', sum.spending, 'arrowOut'], ['Net cash flow', sum.net, 'trends']].map(([name, cents, symbol]) => `<div class="card"><div class="stat-label">${icon(symbol)}${name}</div><div class="stat-value ${name === 'Net cash flow' && cents >= 0 ? 'positive' : ''}">${money(cents)}</div></div>`).join('')}</div>`;
}
function paceChart(data) {
  const dayCount = state.month === currentMonth ? today.getDate() : new Date(Number(state.month.slice(0, 4)), Number(state.month.slice(5)), 0).getDate();
  const daily = Array.from({ length: dayCount }, (_, i) => data.filter(tx => !tx.income && Number(tx.date.slice(8)) === i + 1).reduce((sum, tx) => sum + tx.cents, 0));
  let cumulative = 0;
  const amounts = daily.map(amount => cumulative += amount);
  const max = Math.max(...amounts, 100);
  const points = [[0, 158], ...amounts.map((value, i) => [((i + 1) / dayCount) * 540, 158 - value / max * 140])];
  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} 540,158 0,158`;
  return `<svg class="chart" viewBox="0 0 540 180" role="img" aria-label="Cumulative sample spending: ${money(cumulative)} through day ${dayCount}"><defs><linearGradient id="pace-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5FAF87" stop-opacity=".2"/><stop offset="100%" stop-color="#5FAF87" stop-opacity="0"/></linearGradient></defs>${[18, 88, 158].map(y => `<line class="gridline" x1="0" x2="540" y1="${y}" y2="${y}"/>`).join('')}<polygon points="${area}" fill="url(#pace-fill)"/><polyline points="${line}" class="spending-line"/><circle cx="540" cy="${points.at(-1)[1]}" r="4" fill="var(--green)"/></svg><div class="chart-axis"><span>${shortMonth(state.month)} 1</span><span>${shortMonth(state.month)} ${dayCount}</span></div>`;
}
function home() {
  const data = selectedRows();
  const sum = totals(data);
  const leading = categoryTotals(data)[0];
  main.innerHTML = `<p class="intro">Your month, at a glance. A little room to see the bigger picture.</p><div class="grid"><div class="stack"><section class="card hero"><div class="overline">${monthLabel(state.month)} · Spending</div><div class="hero-number">${money(sum.spending)}</div><p class="subtle">${data.filter(tx => !tx.income).length} sample purchases${state.month === currentMonth ? ` through ${dateLabel(asOf)}` : ''}</p><div class="stats"><div><div class="stat-label">${icon('arrowIn')}Income</div><div class="stat-value">${money(sum.income)}</div></div><div><div class="stat-label">${icon('trends')}Net cash flow</div><div class="stat-value positive">${money(sum.net)}</div></div></div></section><section class="card">${header('Monthly pace', 'Cumulative spending in the sample dataset')}<div class="chart-summary"><strong>${money(sum.spending)}</strong><span>spent so far</span></div>${paceChart(data)}</section></div><div class="stack"><section class="card">${header('Spending by category', 'Follow the numbers into your activity')}<div>${categoryList(data)}</div></section><section class="card insight"><span class="insight-icon">${icon('spark')}</span><div><h3>${leading ? `${leading.name} leads this month` : 'A little space for insight'}</h3><p>${leading ? `Your largest sample category is ${money(leading.cents)}. See the individual purchases for a closer look.` : 'Choose a month with sample spending to explore its categories.'}</p>${leading ? `<button class="text-button" data-category="${leading.id}">Explore ${leading.name.toLowerCase()} →</button>` : ''}</div></section></div><section class="card full">${header('Recent activity', 'The details behind your month', '<a class="text-button" href="#activity">View all activity →</a>')}<div class="transaction-list">${data.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(tx => txRow(tx)).join('') || empty('No sample transactions in this month.')}</div></section></div>`;
}
function activity() {
  main.innerHTML = `<p class="intro">Explore your transactions, follow a category, or find a particular purchase.</p>${summary(selectedRows())}<div class="filters"><div class="search-wrap">${icon('search')}<label class="sr-only" for="search">Search transactions</label><input id="search" type="search" placeholder="Search transactions…" value="${esc(state.query)}" autocomplete="off"></div><label class="sr-only" for="category-filter">Category</label><select id="category-filter"><option value="">All categories</option>${categories.map(cat => `<option value="${cat.id}" ${state.category === cat.id ? 'selected' : ''}>${cat.name}</option>`).join('')}</select><label class="sr-only" for="type-filter">Transaction type</label><select id="type-filter"><option value="">All activity</option><option value="spending" ${state.type === 'spending' ? 'selected' : ''}>Spending</option><option value="income" ${state.type === 'income' ? 'selected' : ''}>Income</option></select></div><section class="card activity"><p class="result-count" id="result-count" role="status"></p><div class="table-header"><span>Transaction</span><span>Category</span><span class="right">Amount</span></div><div id="activity-rows"></div></section>`;
  document.querySelector('#search').addEventListener('input', event => { state.query = event.target.value; activityRows(); });
  document.querySelector('#category-filter').addEventListener('change', event => { state.category = event.target.value; activityRows(); });
  document.querySelector('#type-filter').addEventListener('change', event => { state.type = event.target.value; activityRows(); });
  activityRows();
}
function activityRows() {
  const data = selectedRows().filter(tx => (!state.category || tx.category === state.category) && (!state.type || tx.income === (state.type === 'income')) && `${tx.merchant} ${catFor(tx.category).name}`.toLowerCase().includes(state.query.toLowerCase().trim())).sort((a, b) => b.date.localeCompare(a.date));
  document.querySelector('#result-count').textContent = `${data.length} sample transaction${data.length === 1 ? '' : 's'} · ${monthLabel(state.month)}`;
  document.querySelector('#activity-rows').innerHTML = data.map(tx => txRow(tx, true)).join('') || `${empty('No transactions match these filters.')}<button class="text-button" id="clear-filters">Clear filters</button>`;
  document.querySelector('#clear-filters')?.addEventListener('click', () => { state.query = ''; state.category = ''; state.type = ''; activity(); });
}
function trends() {
  const comparison = categoryChanges(rows, state.month, today);
  const throughDay = state.month === currentMonth ? today.getDate() : 31;
  const coverageStart = rows.map(row => row.date).sort()[0];
  const monthly = months.filter(month => month <= state.month && `${month}-01` >= coverageStart).reverse().map(month => ({ month, ...totals(forMonth(rows, month, throughDay)) }));
  const max = Math.max(...monthly.map(month => month.spending), 1);
  const changeRows = comparison.changes.slice(0, 5).map(cat => `<button class="change-row" data-category="${cat.id}">${catIcon(cat)}<span><strong>${cat.name}</strong><small>${money(cat.before)} → ${money(cat.now)}</small></span><span class="change-amount ${cat.delta < 0 ? 'positive' : ''}">${cat.delta > 0 ? '+' : cat.delta < 0 ? '−' : ''}${money(Math.abs(cat.delta))}<small>${cat.delta > 0 ? 'more' : cat.delta < 0 ? 'less' : 'unchanged'}</small></span></button>`).join('');
  main.innerHTML = `<p class="intro">What changed, what drove it, and how your months fit together.</p>${summary(selectedRows())}<div class="grid"><section class="card">${header('Spending over time', state.month === currentMonth ? `Each month through day ${throughDay}` : 'Spending by completed month')}<div class="bars">${monthly.map(month => `<div class="bar-group"><span class="bar-value">${money(month.spending)}</span><button class="bar-button ${month.month === state.month ? 'selected' : ''}" data-month="${month.month}" style="--bar-height:${Math.max(4, month.spending / max * 70)}%" aria-label="Explore ${monthLabel(month.month)}, ${money(month.spending)} spending"></button><span class="bar-month">${shortMonth(month.month)}</span></div>`).join('')}</div><p class="legend">Only months covered from day 1 are shown. Current-month comparisons stop at the same day. Select a bar to explore.</p></section><section class="card">${header('What changed', comparison.available ? `${monthLabel(state.month)} vs. ${shortMonth(comparison.prior)}${state.month === currentMonth ? ` · through day ${throughDay}` : ''}` : 'A little more history is needed')}${comparison.available ? changeRows || empty('No category changes in this period.') : empty('The prior month is not fully covered by the sample. Choose a later month for a fair comparison.')}</section><section class="card report-card full"><div class="insight-icon">${icon('activity')}</div><div><h2>Your monthly report</h2><p class="subtle">See income, spending, and the purchases behind ${monthLabel(state.month)} in one place.</p></div><button class="button" data-action="monthly-report">Open report →</button></section></div>`;
}
function historyChart(points) {
  const min = Math.min(...points.map(point => point.cents));
  const max = Math.max(...points.map(point => point.cents));
  const spread = Math.max(max - min, 10000);
  const coords = points.map((point, i) => [i / Math.max(points.length - 1, 1) * 600, 158 - (point.cents - min) / spread * 130]);
  return `<svg class="chart history-chart" viewBox="0 0 600 180" role="img" aria-label="Illustrative net worth history from ${money(points[0].cents)} to ${money(points.at(-1).cents)}">${[28, 93, 158].map(y => `<line class="gridline" x1="0" x2="600" y1="${y}" y2="${y}"/>`).join('')}<polyline class="spending-line" points="${coords.map(point => point.join(',')).join(' ')}"/><circle cx="600" cy="${coords.at(-1)[1]}" r="4" fill="var(--green)"/></svg><div class="chart-axis"><span>${dateLabel(points[0].date)}</span><span>${dateLabel(points.at(-1).date)}</span></div>`;
}
function wealth() {
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
  main.innerHTML = `<div class="auth-shell"><section class="auth-story"><a href="#login" class="brand"><img src="../averlen-logo.png" width="40" height="40" alt=""><span>Averlen</span></a><span class="overline">YOUR SPACE FOR CLARITY</span><h2>A clearer picture.<br>A little more possibility.</h2><p>See where your money goes, share the bigger picture, and make room for what comes next.</p><div class="auth-illustration" aria-hidden="true"><span class="overline">THE BIGGER PICTURE</span><div class="illustration-number">Room to move forward.</div><div class="illustration-bars"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><span class="subtle">Spend with awareness. Plan with perspective.</span></div></section><section class="auth-form card"><span class="overline">WELCOME TO AVERLEN</span><h1>Welcome back.</h1><p class="subtle">Your financial picture, on a bigger screen.</p>${state.deletedPreview ? '<p class="success-note" role="status">Deletion preview complete. The sample session was cleared. No real account or bank connection was changed.</p>' : ''}<div class="preview-note">Sign-in design preview. Live authentication is not connected; please use the sample account below.</div><button class="button apple-button" disabled>Continue with Apple</button><div class="auth-divider">or use email</div><label for="login-email">Email</label><input id="login-email" type="email" placeholder="you@example.com" disabled autocomplete="off"><label for="login-password">Password</label><input id="login-password" type="password" placeholder="Your password" disabled autocomplete="off"><div class="login-assistance"><button class="text-button" data-action="reset-password-info">Forgot password?</button></div><button class="button" disabled>Sign in</button><button class="button primary" data-action="start-demo">Explore sample account →</button><p class="note">Already use Averlen on iPhone? The live web version will use your existing account. No additional account is needed.</p><div class="auth-links"><a href="#account">Saved data & account</a><a href="https://candorfinance.app/support.html">Support</a><button class="text-button" data-theme-action>Appearance</button></div></section></div>`;
}
function settings() {
  main.innerHTML = `<p class="intro">Your account, your data, and your preferences.</p><div class="grid"><section class="card">${header('Account', 'Sample account · signed in for this preview')}<button class="settings-row" data-action="manage-account"><span><strong>Manage account</strong><small>Saved data, subscription, and account deletion</small></span><span>→</span></button><button class="settings-row" data-action="logout"><span><strong>Sign out</strong><small>Clear this sample session and return to sign-in</small></span><span>→</span></button></section><section class="card">${header('Appearance & preview')}<button class="settings-row" data-theme-action><span><strong>Appearance</strong><small>Switch between light and dark</small></span><span>→</span></button><button class="settings-row" data-action="reset-sample"><span><strong>Reset sample changes</strong><small>Restore the original transactions, accounts, and planning inputs</small></span><span>↺</span></button></section><section class="card insight full"><span class="insight-icon">${icon('spark')}</span><div><h3>Sample data, throughout</h3><p>Login, planning, manual accounts, and deletion can be explored here. Nothing connects to a real bank or changes a real account. Sample edits reset on reload.</p></div></section></div>`;
}
function account() {
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
  document.title = `${titles[state.route]} · Averlen web preview`;
  document.querySelector('#navigation').innerHTML = ['home', 'activity', 'trends', 'wealth'].map(key => `<a href="#${key}" ${state.route === key ? 'aria-current="page"' : ''}>${icon(key)}<span>${titles[key]}</span></a>`).join('');
  document.querySelector('#settings-link').innerHTML = `${icon('settings')}Settings`;
  document.querySelector('#account-settings').innerHTML = icon('settings');
  document.querySelector('#month').hidden = ['login', 'wealth', 'settings', 'account'].includes(state.route);
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
  const content = JSON.stringify({ sample_data_only: true, transactions: rows, accounts: wealthAccounts }, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'averlen-sample-data.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); announce('Sample data exported.');
}
function navigate(destination) { if (dialog.open) dialog.close(); if (location.hash === `#${destination}`) route(); else location.hash = destination; }
document.querySelector('#month').innerHTML = months.map(month => `<option value="${month}">${monthLabel(month)}</option>`).join('');
document.querySelector('#month').value = state.month;
document.querySelector('#month').addEventListener('change', event => { state.month = event.target.value; render(); announce(`Showing ${monthLabel(state.month)}.`); });
document.querySelector('#theme-toggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; setTheme(); });
document.querySelector('#about-preview').addEventListener('click', openAbout);
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) {
    const actions = {
      'start-demo': () => { state.session = true; state.deletedPreview = false; const destination = state.pendingRoute || 'home'; state.pendingRoute = null; navigate(destination); },
      'start-demo-account': () => { state.session = true; state.deletedPreview = false; navigate('account'); },
      'manage-account': () => navigate('account'),
      'open-settings': () => navigate('settings'),
      logout: () => { resetSample(); state.session = false; state.pendingRoute = null; state.deletedPreview = false; navigate('login'); },
      'reset-sample': () => { resetSample(); render(); announce('Sample changes reset.'); },
      'monthly-report': () => openDialog(`${monthLabel(state.month)} report`, `${summary(selectedRows())}<p class="subtle">${state.month === currentMonth ? `Month to date through ${dateLabel(asOf)}.` : 'Completed month.'} Sample transactions only.</p><div class="report-categories">${categoryList(selectedRows())}</div>`),
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
  if (txButton) {
    const tx = rows.find(row => row.id === txButton.dataset.tx);
    openDialog(tx.merchant, `<p class="subtle">${dateLabel(tx.date)} · Sample transaction</p><div class="dialog-value ${tx.income ? 'positive' : ''}">${tx.income ? '+' : '−'}${money(tx.cents)}</div><label for="edit-category" class="dialog-label">Category</label><select id="edit-category">${categories.filter(cat => (cat.id === 'income') === tx.income).map(cat => `<option value="${cat.id}" ${cat.id === tx.category ? 'selected' : ''}>${cat.name}</option>`).join('')}</select><p class="note">Try a different category. This changes sample data in this browser only and resets on reload.</p><div class="button-row"><button class="button primary" id="save-category">Save sample category</button></div>`);
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
setTheme();
route();
