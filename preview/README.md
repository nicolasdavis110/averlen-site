# Averlen web foundation

Local preview only. Serve the parent website folder with a static HTTP server
and open `/preview/`. No packages, credentials, database, or customer data are
required. JavaScript modules require HTTP rather than opening `index.html` as a file.

The palette, four main tabs, category names, synthetic transactions, and account
balances come from the iPhone app. Sample changes live in memory only. The CSP
blocks outgoing API connections; this preview cannot sign in or access live data.

Implemented: responsive navigation; monthly spending, income and net; cumulative
spending chart; category drilldowns; transaction search and filters; sample
categorization; same-day monthly comparisons; asset/liability reconciliation;
account details; light/dark appearance; keyboard-accessible dialogs.

Next: use existing Firebase identity, the server-authoritative billing status,
and household-scoped sync read API. Check the deployed server source before
integration; the sibling server checkout may lag production. Keep real records
out of static assets and logs. Initially use a read-only integration. The sync
pull endpoint updates device cursor metadata even though it uses GET. Browser
origins, Firebase authorized domains, Apple web sign-in, fresh-auth actions,
cache clearing on sign-out, concurrent household/account switching, subscription
states, and deleted/purged transaction handling need explicit implementation and
verification before enabling live access. Never derive access from client state.

No website login form or disabled bank-connect placeholder is shown to users.
