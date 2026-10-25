import { categories, accounts, localDateKey, makeDemo, forMonth, totals, categoryTotals, wealthTotals } from './model.js';

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
const months = [...new Set(rows.map(tx => tx.date.slice(0, 7)))].sort().reverse();
const state = { route: 'home', month: currentMonth, query: '', category: '', type: '', theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' };
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
  const throughDay = state.month === currentMonth ? today.getDate() : 31;
  const visibleMonths = months.filter(month => month <= state.month).reverse();
  const monthly = visibleMonths.map(month => ({ month, ...totals(forMonth(rows, month, throughDay)) }));
  const max = Math.max(...monthly.map(month => month.spending), 1);
  const firstFullMonth = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 88, 12);
  main.innerHTML = `<p class="intro">See how your spending changes over time, without turning it into a budget.</p>${summary(selectedRows())}<div class="grid"><section class="card">${header('Spending over time', state.month === currentMonth ? `Each month through day ${throughDay}, for a like-for-like view` : 'Completed months in the sample dataset')}<div class="bars">${monthly.map(month => `<div class="bar-group"><span class="bar-value">${money(month.spending)}</span><button class="bar-button ${month.month === state.month ? 'selected' : ''}" data-month="${month.month}" style="--bar-height:${Math.max(4, month.spending / max * 70)}%" aria-label="Explore ${monthLabel(month.month)}, ${money(month.spending)} spending"></button><span class="bar-month">${shortMonth(month.month)}</span></div>`).join('')}</div><p class="legend">Sample transaction history begins ${dateLabel(localDateKey(firstFullMonth))}. The earliest month may be incomplete. Choose a bar to explore that month.</p></section><section class="card">${header('Where it went', monthLabel(state.month))}${categoryList(selectedRows())}</section><section class="card insight full"><span class="insight-icon">${icon('trends')}</span><div><h3>The story behind the numbers</h3><p>Choose a category to see its purchases. Transactions marked as transfers are excluded from spending and cash flow, matching the app’s approach.</p><a class="text-button" href="#activity">Explore activity →</a></div></section></div>`;
}
function wealth() {
  const sum = wealthTotals();
  const accountRows = assets => accounts.filter(account => account.asset === assets).map(account => `<button class="balance-row" data-account="${account.id}"><span class="category-icon" style="--category-color:var(--green)">${icon('bank')}</span><span><strong>${account.name}</strong><small>${account.institution} · ••${account.mask}</small></span><strong>${money(account.cents)}</strong></button>`).join('');
  main.innerHTML = `<p class="intro">A broader view of what you have and what you owe.</p><div class="grid"><section class="card hero"><div class="overline">Sample household · Net worth</div><div class="hero-number">${money(sum.net)}</div><p class="subtle">Assets minus liabilities · Sample balances as of ${dateLabel(asOf)}</p><div class="stats"><div><div class="stat-label">Assets</div><div class="stat-value">${money(sum.assets)}</div></div><div><div class="stat-label">Liabilities</div><div class="stat-value">${money(sum.liabilities)}</div></div></div></section><section class="card">${header('The balance of things', 'Three accounts from the iPhone app’s demo')}<div class="balance-track" role="img" aria-label="${money(accounts[0].cents)} checking and ${money(accounts[1].cents)} savings"><span style="width:${accounts[0].cents / sum.assets * 100}%"></span><span style="flex:1"></span></div><div class="definition"><span>Everyday checking</span><strong>${money(accounts[0].cents)}</strong></div><div class="definition"><span>Emergency savings</span><strong>${money(accounts[1].cents)}</strong></div><div class="definition"><span>Credit card balance</span><strong>${money(accounts[2].cents)}</strong></div></section><section class="card">${header('Assets', 'Cash and savings')}${accountRows(true)}</section><section class="card">${header('Liabilities', 'Outstanding credit card balance')}${accountRows(false)}</section></div>`;
}
function settings() {
  main.innerHTML = `<p class="intro">An early look at Averlen on a bigger screen.</p><div class="grid"><section class="card">${header('About this preview')}<p class="subtle">Explore the four main areas of the iPhone app using its synthetic demo transactions and accounts. You can search activity, change months, follow categories, and try categorizing a sample purchase.</p><div class="definition"><span>Data source</span><strong>Sample data only</strong></div><div class="definition"><span>Sign-in and connected banks</span><strong>Not connected</strong></div><div class="definition"><span>Edits</span><strong>Reset on reload</strong></div><div class="button-row"><button id="reset-demo" class="button">Reset sample changes</button><button class="button" data-theme-action>Change appearance</button></div></section><section class="card">${header('Building toward your app')}<p class="subtle">The next step is signing in with your existing Averlen account, followed by reading your synced data with the same household permissions and subscription access as the iPhone app.</p><p class="note">Bank connections, subscriptions, invitations, and account management stay in the iPhone app while the web experience is being built.</p><div class="button-row"><a href="https://candorfinance.app/support.html" class="button">Contact support</a></div></section></div>`;
  document.querySelector('#reset-demo').addEventListener('click', () => { rows.splice(0, rows.length, ...makeDemo(today)); render(); announce('Sample changes reset.'); });
}
function render() {
  const titles = { home: 'Home', activity: 'Activity', trends: 'Trends', wealth: 'Wealth', settings: 'Settings' };
  document.querySelector('#page-title').textContent = titles[state.route];
  document.title = `${titles[state.route]} · Averlen web preview`;
  document.querySelector('#navigation').innerHTML = Object.entries(titles).filter(([key]) => key !== 'settings').map(([key, title]) => `<a href="#${key}" ${state.route === key ? 'aria-current="page"' : ''}>${icon(key)}<span>${title}</span></a>`).join('');
  document.querySelector('#settings-link').innerHTML = `${icon('settings')}Settings`;
  document.querySelector('#month').hidden = ['wealth', 'settings'].includes(state.route);
  ({ home, activity, trends, wealth, settings }[state.route])();
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
}
function openAbout() {
  openDialog('Averlen for the web', '<p class="subtle">This is an early interactive preview of Home, Activity, Trends, and Wealth. Everything shown is sample data from the iPhone app’s demo.</p><p class="note">Your accounts are not connected. Sample category changes affect this preview only and reset when you reload. Sign-in and live syncing will be added in a later step.</p><div class="button-row"><a href="#settings" class="button">Preview settings</a></div>');
}
document.querySelector('#month').innerHTML = months.map(month => `<option value="${month}">${monthLabel(month)}</option>`).join('');
document.querySelector('#month').value = state.month;
document.querySelector('#month').addEventListener('change', event => { state.month = event.target.value; render(); announce(`Showing ${monthLabel(state.month)}.`); });
document.querySelector('#theme-toggle').addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; setTheme(); });
document.querySelector('#about-preview').addEventListener('click', openAbout);
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.addEventListener('click', event => {
  const category = event.target.closest('[data-category]');
  if (category) {
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
  if (accountButton) {
    const account = accounts.find(row => row.id === accountButton.dataset.account);
    openDialog(account.name, `<p class="subtle">${account.institution} · ••${account.mask}</p><div class="dialog-value">${money(account.cents)}</div><div class="definition"><span>Type</span><strong>${account.type}</strong></div><div class="definition"><span>Net worth</span><strong>${account.asset ? 'Asset' : 'Liability'}</strong></div><p class="note">This is a synthetic account from Averlen’s iPhone demo. No bank is connected to this preview.</p>`);
  }
  const monthButton = event.target.closest('[data-month]');
  if (monthButton) { state.month = monthButton.dataset.month; document.querySelector('#month').value = state.month; render(); announce(`Showing ${monthLabel(state.month)}.`); }
  if (event.target.closest('[data-theme-action]')) { state.theme = state.theme === 'light' ? 'dark' : 'light'; setTheme(); }
});
function route() {
  const destination = location.hash.slice(1);
  if (destination === 'main') { main.focus(); return; }
  if (dialog.open) dialog.close();
  state.route = ['home', 'activity', 'trends', 'wealth', 'settings'].includes(destination) ? destination : 'home';
  render();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
setTheme();
route();
