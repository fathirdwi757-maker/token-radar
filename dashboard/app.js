// Launch Radar's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts) and
// renders the ranked board, a detail view with the model's arithmetic and a farm plan for every
// protocol, the already-trading set the model refuses to rank, and the value model itself.
// No network: every byte it shows is in data.js.
(function () {
  'use strict';
  var DATA = window.RADAR;
  var view = document.getElementById('view');

  /* ---------- formatting ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(v) {
    if (v == null) return '—';
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(v);
  }
  function moneyFull(v) {
    return v == null ? '—' : '$' + Math.round(v).toLocaleString('en-US');
  }
  function pct(v) {
    if (v == null) return '<span class="chains">n/a</span>';
    var cls = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
    return '<span class="' + cls + '">' + (v > 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  }
  function ageText(days) {
    if (days == null) return 'unknown';
    if (days < 365) return days + 'd';
    var y = Math.floor(days / 365), r = days % 365;
    return y + 'y ' + r + 'd';
  }
  function mult(x) { return '×' + Number(x).toFixed(3); }

  /* ---------- the farm plan, generated per protocol from its own record ----------
     The same plan the entry's board.json carries: category actions, the first chain's gas
     band, capital scaled to TVL, a hold scaled to age, and an exit rule on the TVL trend. */
  function gasBand(chain) {
    var c = String(chain || '').toLowerCase();
    if (c === 'ethereum') return { low: 6, high: 15 };
    if (c === 'solana') return { low: 0.05, high: 0.25 };
    if (['base', 'arbitrum', 'optimism', 'zksync era', 'linea', 'scroll'].indexOf(c) >= 0) return { low: 0.3, high: 1.5 };
    if (['bsc', 'polygon', 'avalanche', 'fantom', 'gnosis'].indexOf(c) >= 0) return { low: 0.2, high: 1 };
    if (c === 'bitcoin') return { low: 1, high: 4 };
    return { low: 0.5, high: 3 };
  }
  function capitalFor(tvl) {
    if (tvl >= 1e9) return 250;
    if (tvl >= 1e8) return 100;
    if (tvl >= 1e7) return 50;
    return 25;
  }
  function holdDaysFor(age) {
    if (age == null) return 45;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function familyOf(cat) {
    var c = String(cat || '').toLowerCase();
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0 || c.indexOf('liquidity manager') >= 0) return 'curator';
    if (c.indexOf('dex') >= 0) return 'dex';
    if (c.indexOf('lend') >= 0 || c.indexOf('uncollateralized') >= 0 || c.indexOf('collateral') >= 0) return 'lending';
    if (c.indexOf('cdp') >= 0 || c.indexOf('stable') >= 0 || c.indexOf('basis') >= 0) return 'cdp';
    if (c.indexOf('yield') >= 0 || c.indexOf('farm') >= 0 || c.indexOf('leveraged') >= 0) return 'yield';
    if (c.indexOf('derivative') >= 0 || c.indexOf('perpetual') >= 0 || c.indexOf('options') >= 0 || c.indexOf('interest rate') >= 0) return 'derivatives';
    if (c.indexOf('rwa') >= 0 || c.indexOf('real world') >= 0) return 'rwa';
    if (c.indexOf('prediction') >= 0) return 'prediction';
    if (c.indexOf('insurance') >= 0) return 'insurance';
    if (c.indexOf('bridge') >= 0 || c.indexOf('chain') >= 0) return 'chain';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0 || c.indexOf('anchor') >= 0 || c.indexOf('btc') >= 0) return 'staking';
    if (c.indexOf('index') >= 0) return 'index';
    if (c.indexOf('payment') >= 0 || c.indexOf('card') >= 0 || c.indexOf('otc') >= 0) return 'payments';
    return 'generic';
  }
  function actionsFor(fam, name, capital, chain) {
    switch (fam) {
      case 'curator': return {
        core: 'Deposit $' + capital + ' of USDC into a ' + name + ' curated vault on ' + chain + '; curator vaults route the deposit to the lending markets the curator manages.',
        follow: 'Move a quarter of the deposit to a second ' + name + ' vault with a different risk profile, so your activity is not riding on one strategy.' };
      case 'dex': return {
        core: 'Provide $' + capital + ' split evenly between USDC and the pool\u2019s other asset in ' + name + '\u2019s deepest USDC pool on ' + chain + ', and keep the LP position open.',
        follow: 'Make three swaps a week through ' + name + ' itself, $10 to $25 each, across different pairs, so your wallet shows real trading and not one deposit.' };
      case 'lending': return {
        core: 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + '; supplying is the action points and launch allocations almost always count first.',
        follow: 'Borrow about 30 per cent of the supplied value against the position and repay it a week later, so the wallet has both a supply and a borrow on its record.' };
      case 'cdp': return {
        core: 'Deposit $' + capital + ' of collateral into ' + name + ' on ' + chain + ' and mint a small amount, about 40 per cent of the collateral\u2019s value, of its stable asset.',
        follow: 'Hold the minted stable asset in the same wallet, or park it in ' + name + '\u2019s own stability pool if it runs one, rather than selling it at once.' };
      case 'yield': return {
        core: 'Deposit $' + capital + ' of USDC into ' + name + '\u2019s main vault on ' + chain + ' and keep the vault shares in the farming wallet.',
        follow: 'Compound the yield back into the same vault once a month instead of withdrawing it, so the position grows on the protocol\u2019s own records.' };
      case 'derivatives': return {
        core: 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small position, no more than a fifth of the margin, hedged or delta-neutral if the venue allows.',
        follow: 'Trade to at least $500 of total volume across the month in small orders, and leave a resting limit order open overnight once a week.' };
      case 'rwa': return {
        core: 'Mint $' + capital + ' of ' + name + '\u2019s yield-bearing asset on ' + chain + ' after its own onboarding or KYC step, if it asks for one, and hold the asset.',
        follow: 'Hold through at least one full distribution or interest period, so the wallet is on record as a holder and not a passer-through.' };
      case 'prediction': return {
        core: 'Fund $' + capital + ' on ' + name + ' and take positions in at least three different markets, sized $10 to $30 each, on questions you have actually read.',
        follow: 'Keep trading one market a week until each position settles; settled history is what separates a user from a one-off visitor.' };
      case 'insurance': return {
        core: 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' against a position you really hold, and keep the policy to its term.',
        follow: 'Stake a smaller amount, about $' + Math.max(10, Math.round(capital / 5)) + ', into ' + name + '\u2019s risk pool if it offers one, so you appear on both sides of the market.' };
      case 'chain': return {
        core: 'Bridge $' + capital + ' of USDC to ' + chain + ' through the chain\u2019s official route and keep the funds on the chain rather than bridging straight back.',
        follow: 'Use two or three of the chain\u2019s own core apps, a swap and a lending deposit among them, so the wallet has native activity beyond the bridge.' };
      case 'staking': return {
        core: 'Stake $' + capital + ' of the chain\u2019s staking asset through ' + name + ' on ' + chain + ' and keep the staking receipt token in the wallet.',
        follow: 'Restake or re-delegate a part of the rewards once they accrue, and vote with the stake if ' + name + ' passes governance weight to stakers.' };
      case 'index': return {
        core: 'Mint $' + capital + ' of ' + name + '\u2019s index or basket asset on ' + chain + ' and hold it unbroken for the full hold period below.',
        follow: 'Add a small top-up, about a fifth of the first mint, in a later week, so the record shows a returning holder and not a single touch.' };
      case 'payments': return {
        core: 'Complete ' + name + '\u2019s own onboarding on ' + chain + ', fund $' + capital + ', and make one real payment or settlement through it.',
        follow: 'Repeat a smaller payment in a second week and keep the account active; payment products count returning users, not balances.' };
      default: return {
        core: 'Deposit $' + capital + ' of USDC into ' + name + '\u2019s core product on ' + chain + ' and keep the position open for the hold period below.',
        follow: 'Use one more of ' + name + '\u2019s own features, a second deposit, a vote or a claim, in a later week, so the wallet\u2019s record is not a single touch.' };
    }
  }
  function farmPlan(row) {
    var chain = row.chains.length ? row.chains[0] : 'its main chain';
    var gas = gasBand(chain);
    var capital = capitalFor(row.tvl_usd);
    var hold = holdDaysFor(row.age_days);
    var weeks = Math.max(4, Math.round(hold / 10));
    var a = actionsFor(familyOf(row.category), row.name, capital, chain);
    return [
      { text: 'Set up a fresh wallet for this farm alone, fund it on ' + chain + ', and keep its seed phrase offline; one wallet per protocol keeps a Sybil screen from linking your farms.',
        cost: 'under $' + gas.high + ' of gas to fund and approve', time: '10 minutes' },
      { text: a.core, cost: '$' + capital + ' of capital plus $' + gas.low + ' to $' + gas.high + ' of gas on ' + chain, time: '15 minutes to set up' },
      { text: a.follow, cost: 'about $' + (gas.low * 2) + ' of gas, inside the same $' + capital + ' position', time: '10 minutes' },
      { text: 'Repeat one qualifying action a week for ' + weeks + ' weeks \u2014 a deposit, a swap, a borrow or a vote \u2014 in different weeks and at different hours, never in one burst.',
        cost: 'about $' + gas.low + ' to $' + gas.high + ' of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so it stands in more than one weekly snapshot of the protocol\u2019s TVL; a position opened and closed inside a week is the first thing launch screens discard.',
        cost: 'the $' + capital + ' stays deployed, earning the product\u2019s own yield if it pays one', time: hold + ' days' },
      { text: 'Check the protocol\u2019s own app and announcements for a points or rewards page once a week, and claim only from the link the protocol itself publishes; never pay a third-party site to claim.',
        cost: 'nothing to check; a claim that asks for a fee is a scam', time: '5 minutes a week' },
      { text: 'Keep a farm log \u2014 wallet, dates, amounts, transaction hashes \u2014 and review it monthly. Exit rule: withdraw if the protocol\u2019s TVL falls more than 30 per cent in a week, or if it announces a token with no allocation for users.',
        cost: 'nothing but the log; withdrawing costs one more gas fee', time: '5 minutes a month' }
    ];
  }

  /* ---------- state ---------- */
  var params = new URLSearchParams(location.search);
  var state = {
    view: params.get('view') || 'board',
    q: params.get('q') || '',
    category: params.get('category') || '',
    chain: params.get('chain') || '',
    segment: params.get('segment') || 'all',
    minTvl: Number(params.get('minTvl') || 0),
    sortKey: params.get('sort') || 'rank',
    sortDir: 1,
    slug: params.get('slug') || null
  };
  var bySlug = {};
  DATA.rows.forEach(function (r) { bySlug[r.slug] = r; });

  function setTab(name) {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-view') === name);
  }

  /* ---------- stat strip ---------- */
  function renderStats() {
    var el = document.getElementById('stats');
    var top = DATA.rows[0];
    el.innerHTML =
      '<div class="stat"><b>' + DATA.scanned_size + '</b><span>protocols in the snapshot</span></div>' +
      '<div class="stat"><b>' + DATA.pretoken_size + '</b><span>record no token</span></div>' +
      '<div class="stat hot"><b>' + DATA.board_size + '</b><span>ranked on the board</span></div>' +
      '<div class="stat"><b>' + DATA.watchlist_size + ' / ' + DATA.watchlist_size + '</b><span>watchlist covered</span></div>' +
      '<div class="stat"><b>' + DATA.early_size + '</b><span>early finds below the $50M floor</span></div>' +
      '<div class="stat hot"><b>' + (top ? money(top.implied_value_usd) : '—') + '</b><span>top implied value: ' + (top ? esc(top.name) : '') + '</span></div>';
    document.getElementById('foot').textContent =
      'Snapshot: ' + DATA.source + ' · as of ' + DATA.as_of + ' · Model ' + DATA.model_version +
      ' · Implied value is this entry\u2019s own claim about what a launch would be worth if the protocol\u2019s record stayed as it is; it predicts neither that a token will be issued nor when. "Records no token" is DefiLlama\u2019s record, not proof a token does not exist.';
  }

  /* ---------- board ---------- */
  function filteredRows() {
    var rows = DATA.rows.filter(function (r) {
      if (state.segment === 'watchlist' && !r.watchlist) return false;
      if (state.segment === 'early' && r.watchlist) return false;
      if (state.category && (r.category || '') !== state.category) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (state.minTvl && r.tvl_usd < state.minTvl) return false;
      if (state.q) {
        var q = state.q.toLowerCase();
        if (r.name.toLowerCase().indexOf(q) < 0 && r.slug.indexOf(q) < 0) return false;
      }
      return true;
    });
    var k = state.sortKey, d = state.sortDir;
    rows.sort(function (a, b) {
      var va, vb;
      if (k === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); return (va < vb ? -1 : va > vb ? 1 : 0) * d; }
      if (k === 'chains') { va = a.chains.length; vb = b.chains.length; }
      else if (k === 'age') { va = a.age_days == null ? -1 : a.age_days; vb = b.age_days == null ? -1 : b.age_days; }
      else if (k === 'change') { va = a.change_7d == null ? -1e9 : a.change_7d; vb = b.change_7d == null ? -1e9 : b.change_7d; }
      else { va = a[k]; vb = b[k]; }
      return (va - vb) * d;
    });
    return rows;
  }
  function th(label, key, cls) {
    var arrow = state.sortKey === key ? ' <span class="dir">' + (state.sortDir === 1 ? '▲' : '▼') + '</span>' : '';
    return '<th class="' + (cls || '') + '" data-sort="' + key + '">' + label + arrow + '</th>';
  }
  function renderBoard() {
    setTab('board');
    var cats = {}, chains = {};
    DATA.rows.forEach(function (r) {
      if (r.category) cats[r.category] = 1;
      r.chains.forEach(function (c) { chains[c] = 1; });
    });
    var catOpts = '<option value="">All categories</option>' + Object.keys(cats).sort().map(function (c) {
      return '<option value="' + esc(c) + '"' + (state.category === c ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    var chainOpts = '<option value="">All chains</option>' + Object.keys(chains).sort().map(function (c) {
      return '<option value="' + esc(c) + '"' + (state.chain === c ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    var rows = filteredRows();
    var topVal = DATA.rows.length ? DATA.rows[0].implied_value_usd : 1;
    var body = rows.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"' + (r.rank <= 3 ? ' class="top"' : '') + '>' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td><span class="pname">' + esc(r.name) + '</span>' + (r.watchlist ? '<span class="badge">watchlist</span>' : '<span class="badge early">early</span>') +
        '<span class="pcat">' + esc(r.category || 'Uncategorised') + '</span></td>' +
        '<td class="chains">' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num">' + mult(r.category_multiple) + '</td>' +
        '<td class="num value">' + money(r.implied_value_usd) + '</td>' +
        '<td><div class="bar"><i style="width:' + Math.max(2, Math.round(100 * r.implied_value_usd / topVal)) + '%"></i></div></td></tr>';
    }).join('');
    view.innerHTML =
      '<div class="toolbar">' +
      '<label>Search <input type="search" id="f-q" value="' + esc(state.q) + '" placeholder="protocol name"></label>' +
      '<label>Category <select id="f-cat">' + catOpts + '</select></label>' +
      '<label>Chain <select id="f-chain">' + chainOpts + '</select></label>' +
      '<label>Min TVL <select id="f-tvl">' +
      [0, 1e7, 5e7, 1e8, 5e8].map(function (v) {
        return '<option value="' + v + '"' + (state.minTvl === v ? ' selected' : '') + '>' + (v === 0 ? 'any' : money(v) + '+') + '</option>';
      }).join('') + '</select></label>' +
      '<span class="seg" role="group" aria-label="Segment">' +
      ['all', 'watchlist', 'early'].map(function (s) {
        return '<button type="button" data-seg="' + s + '"' + (state.segment === s ? ' class="active"' : '') + '>' + s + '</button>';
      }).join('') + '</span>' +
      '<span class="count-note">' + rows.length + ' of ' + DATA.board_size + ' protocols</span></div>' +
      (rows.length
        ? '<table class="board"><thead><tr>' + th('#', 'rank', 'num') + th('Protocol', 'name') + th('Chains', 'chains') +
          th('TVL', 'tvl_usd', 'num') + th('7d', 'change', 'num') + th('Age', 'age', 'num') + th('Peer ×', 'category_multiple', 'num') +
          th('Implied value', 'implied_value_usd', 'num') + '<th>Signal</th></tr></thead><tbody>' + body + '</tbody></table>'
        : '<div class="empty">No protocol matches those filters. Loosen one and the radar sweeps again.</div>');
    bindBoard();
    view.setAttribute('aria-busy', 'false');
  }
  function bindBoard() {
    var q = document.getElementById('f-q');
    if (q) q.addEventListener('input', function () { state.q = q.value; refreshBody(); });
    var cat = document.getElementById('f-cat');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; renderBoard(); });
    var ch = document.getElementById('f-chain');
    if (ch) ch.addEventListener('change', function () { state.chain = ch.value; renderBoard(); });
    var tv = document.getElementById('f-tvl');
    if (tv) tv.addEventListener('change', function () { state.minTvl = Number(tv.value); renderBoard(); });
    var segs = view.querySelectorAll('[data-seg]');
    for (var i = 0; i < segs.length; i++) segs[i].addEventListener('click', function () {
      state.segment = this.getAttribute('data-seg'); renderBoard();
    });
    bindHeads();
    bindRows();
  }
  function refreshBody() {
    // Re-render only the table on a search keystroke, so the input keeps focus.
    renderBoard();
    var q = document.getElementById('f-q');
    if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
  function bindHeads() {
    var heads = view.querySelectorAll('th[data-sort]');
    for (var i = 0; i < heads.length; i++) heads[i].addEventListener('click', function () {
      var k = this.getAttribute('data-sort');
      if (state.sortKey === k) state.sortDir = -state.sortDir;
      else { state.sortKey = k; state.sortDir = (k === 'name' || k === 'rank') ? 1 : -1; }
      renderBoard();
    });
  }
  function bindRows() {
    var trs = view.querySelectorAll('tr[data-slug]');
    for (var i = 0; i < trs.length; i++) trs[i].addEventListener('click', function () {
      state.slug = this.getAttribute('data-slug'); state.view = 'detail'; renderDetail();
    });
  }

  /* ---------- detail ---------- */
  function renderDetail() {
    var r = bySlug[state.slug];
    if (!r) { renderBoard(); return; }
    setTab('board');
    var plan = farmPlan(r);
    var effMult = r.tvl_usd > 0 ? (r.implied_value_usd / r.tvl_usd) : 0;
    view.innerHTML =
      '<button type="button" class="backbtn" id="back">← Back to the board</button>' +
      '<div class="detail-head"><h2>' + esc(r.name) + '</h2><span class="cat">' + esc(r.category || 'Uncategorised') + '</span>' +
      (r.watchlist ? '<span class="badge">on the house watchlist</span>' : '<span class="badge early">early find — below the $50M watchlist floor</span>') + '</div>' +
      '<div>' + r.chains.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<div class="tiles">' +
      '<div class="tile"><b>#' + r.rank + '</b><span>radar rank of ' + DATA.board_size + '</span></div>' +
      '<div class="tile"><b>' + moneyFull(r.implied_value_usd) + '</b><span>implied launch value</span></div>' +
      '<div class="tile"><b>' + moneyFull(r.tvl_usd) + '</b><span>TVL in the snapshot</span></div>' +
      '<div class="tile"><b>' + (r.change_7d == null ? 'n/a' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</b><span>TVL change, 7 days</span></div>' +
      '<div class="tile"><b>' + ageText(r.age_days) + '</b><span>tracked with no token (' + (r.listed_at || 'date unrecorded') + ')</span></div>' +
      '<div class="tile"><b>' + mult(effMult) + '</b><span>effective value per $1 of TVL</span></div></div>' +
      '<section class="panel"><h3>Why this value — the model\u2019s arithmetic</h3>' +
      '<table class="kv"><tbody>' +
      '<tr><td>TVL, the snapshot\u2019s figure</td><td class="num">' + moneyFull(r.tvl_usd) + '</td></tr>' +
      '<tr><td>Category multiple — what the market pays per $1 of TVL in ' + esc(r.category || 'this category') + ', read from ' + r.category_peers + ' tokenized peers in this snapshot, shrunk toward the global median ' + DATA.global_median + '</td><td class="num">' + mult(r.category_multiple) + '</td></tr>' +
      '<tr><td>Growth — 7-day TVL change of ' + (r.change_7d == null ? 'unreported, counted as 0' : r.change_7d.toFixed(1) + '%') + ', half-weighted and clamped</td><td class="num">' + mult(r.growth_multiplier) + '</td></tr>' +
      '<tr><td>Maturity — ' + (r.age_days == null ? 'age unrecorded, counted as 365 days' : r.age_days + ' days tracked with no token') + ', up to four years</td><td class="num">' + mult(r.maturity_multiplier) + '</td></tr>' +
      '<tr><td>Breadth — live on ' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + ', a wider launch distribution</td><td class="num">' + mult(r.breadth_multiplier) + '</td></tr>' +
      '<tr class="total"><td>Implied value if it launched on this record</td><td class="num">' + moneyFull(r.implied_value_usd) + '</td></tr>' +
      '</tbody></table>' +
      '<p>This protocol records no token: no market cap, no CoinGecko id, no symbol in the snapshot. That is DefiLlama\u2019s record, not proof none exists — check before you act on it.</p></section>' +
      '<section class="panel"><h3>How to farm it — ' + plan.length + ' steps</h3><ol class="plan">' +
      plan.map(function (s) {
        return '<li><span class="act">' + esc(s.text) + '</span><span class="meta"><span class="chip">Cost: ' + esc(s.cost) + '</span><span class="chip time">Time: ' + esc(s.time) + '</span></span></li>';
      }).join('') + '</ol></section>';
    document.getElementById('back').addEventListener('click', function () { state.view = 'board'; renderBoard(); });
    view.setAttribute('aria-busy', 'false');
    window.scrollTo(0, 0);
  }

  /* ---------- already trading ---------- */
  function renderLive() {
    setTab('live');
    var body = DATA.live.map(function (r, i) {
      return '<tr><td class="rank">' + (i + 1) + '</td><td><span class="pname">' + esc(r.name) + '</span>' +
        (r.symbol ? '<span class="badge early">' + esc(r.symbol) + '</span>' : '') +
        '<span class="pcat">' + esc(r.category || 'Uncategorised') + '</span></td>' +
        '<td class="chains">' + esc(r.chains.slice(0, 3).join(', ')) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td><td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num value">' + money(r.mcap_usd) + '</td>' +
        '<td class="num">' + (r.tvl_usd > 0 && r.mcap_usd ? mult(r.mcap_usd / r.tvl_usd) : '—') + '</td></tr>';
    }).join('');
    view.innerHTML =
      '<section class="panel"><h3>Already trading — the market\u2019s values, not the model\u2019s</h3>' +
      '<p>These protocols\u2019 tokens already trade, so the radar never ranks them: it shows the market\u2019s own market cap. ' +
      'They are also the radar\u2019s evidence — the category multiples on the board are read from the market cap per TVL dollar of peers like these, in this same snapshot.</p></section>' +
      '<table class="board"><thead><tr><th class="num">#</th><th>Protocol</th><th>Chains</th><th class="num">TVL</th><th class="num">7d</th><th class="num">Market cap</th><th class="num">Mcap / TVL</th></tr></thead><tbody>' + body + '</tbody></table>';
    view.setAttribute('aria-busy', 'false');
  }

  /* ---------- the model ---------- */
  function renderModel() {
    setTab('model');
    var m = DATA.model;
    var catRows = DATA.categories.map(function (c) {
      return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.peers + '</td>' +
        '<td class="num">' + (c.median_ratio == null ? '—' : c.median_ratio.toFixed(3)) + '</td>' +
        '<td class="num">' + c.multiple.toFixed(3) + '</td></tr>';
    }).join('');
    view.innerHTML =
      '<section class="panel"><h3>The value model — ' + esc(DATA.model_version) + '</h3>' +
      '<p>An implied value is what a protocol\u2019s token would be worth if it launched on the record the snapshot shows. ' +
      'Every figure comes from the snapshot itself; no protocol\u2019s name is special-cased, and the same function scores every row.</p>' +
      '<div class="formula">implied = TVL × category multiple × growth × maturity × breadth</div>' +
      '<table class="kv"><tbody>' +
      '<tr><td><b>Category multiple</b> — from the snapshot\u2019s tokenized protocols: each peer\u2019s market cap / TVL, clamped to [' + m.ratio_floor + ', ' + m.ratio_cap + '] so one outlier cannot carry a category; the category median is shrunk toward the global median (' + DATA.global_median + ') by its peer count, (n × median + ' + m.shrink_prior + ' × global) / (n + ' + m.shrink_prior + '), and the result clamped to [' + m.multiple_floor + ', ' + m.multiple_cap + ']. A category with no peers uses the global median.</td></tr>' +
      '<tr><td><b>Growth</b> — 1 + ' + m.growth_weight + ' × clamp(7-day TVL change, ' + m.growth_floor + '%, +' + m.growth_cap + '%) / 100. An unreported change counts as 0: no news is neither growth nor decline.</td></tr>' +
      '<tr><td><b>Maturity</b> — ' + m.maturity_floor + ' + ' + m.maturity_range + ' × min(days tracked with no token, ' + m.maturity_days + ') / ' + m.maturity_days + '. A protocol DefiLlama has followed for years without a token has the record a launch is priced on; an unrecorded start counts as ' + m.unknown_age_days + ' days.</td></tr>' +
      '<tr><td><b>Breadth</b> — 1 + ' + m.breadth_per_chain + ' per chain beyond the first, up to ' + m.breadth_max_extra + ' extra chains: a launch distributes to every chain the protocol already serves.</td></tr>' +
      '</tbody></table></section>' +
      '<section class="panel"><h3>Who is on the board — and who is not</h3>' +
      '<p><b>On:</b> every protocol that records no token — no market cap, no CoinGecko id, no symbol — and is not a product of a token that already trades. All ' + DATA.watchlist_size + ' watchlist protocols are on it; so are ' + DATA.early_size + ' smaller ones the watchlist\u2019s $50M floor leaves out. The floor is never the ceiling.</p>' +
      '<p><b>Off:</b> ' + DATA.excluded_size + ' pre-token records set aside as wrapped, staked, bridged or versioned products of traded tokens (a bridge or staking wrapper, a name ending in a version marker, a whole word wrapped / staked / staking, an exchange\u2019s own product), and every protocol whose token already trades — those are shown apart, at market value, under Already trading.</p>' +
      '<p><b>Language:</b> the board says a protocol <i>records</i> no token. DefiLlama\u2019s record is not proof: a protocol may have a token its record does not carry.</p></section>' +
      '<section class="panel"><h3>Category multiples read from this snapshot</h3>' +
      '<table class="plain"><thead><tr><th>Category</th><th class="num">Tokenized peers</th><th class="num">Median mcap / TVL</th><th class="num">Multiple used</th></tr></thead><tbody>' + catRows + '</tbody></table>' +
      '<p class="note">Categories with few peers sit close to the global median by construction: thin evidence is believed only as far as it goes.</p></section>';
    view.setAttribute('aria-busy', 'false');
  }

  /* ---------- init ---------- */
  function render() {
    renderStats();
    if (state.view === 'live') renderLive();
    else if (state.view === 'model') renderModel();
    else if (state.view === 'detail' && state.slug) renderDetail();
    else renderBoard();
  }
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].addEventListener('click', function () {
    state.view = this.getAttribute('data-view'); render();
  });
  if (!DATA || !DATA.rows) {
    view.innerHTML = '<div class="empty">The radar has no data: run the entry first so data.js stands beside this page.</div>';
    return;
  }
  render();
})();
