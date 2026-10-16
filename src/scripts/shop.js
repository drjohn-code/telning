/* Telning shop helpers (vanilla): the basket (kept on this device in localStorage, nothing is sent until checkout),
   the currency switch, add to basket, the basket drawer and page, checkout through /api/checkout (Stripe),
   product galleries with zoom, and the collection filters. No cookies, no trackers.
   Pages work without this script: prices show in euros and "Add to basket" posts straight to checkout. */
(function () {
  var T = window.Telning = window.Telning || {};
  var KEY = 'tn-basket', CUR = 'tn-currency';
  var CURS = ['EUR', 'GBP', 'USD', 'CAD'];
  function each(root, sel, fn) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (x) { return null; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- basket state ---------- */
  function basket() { try { var b = JSON.parse(store(KEY) || '[]'); return Array.isArray(b) ? b.filter(function (l) { return l && l.sku && l.qty > 0; }) : []; } catch (x) { return []; } }
  function saveBasket(b) { store(KEY, JSON.stringify(b)); render(); }
  function count() { return basket().reduce(function (a, l) { return a + l.qty; }, 0); }
  function guess() {
    var l = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (x) { /* old browser */ }
    if (/-GB$/i.test(l) || tz === 'Europe/London') return 'GBP';
    if (/-CA$/i.test(l) || /^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Regina|St_Johns|Montreal|Moncton|Whitehorse|Yellowknife)/.test(tz)) return 'CAD';
    if (/-US$/i.test(l) || /^(America|Pacific\/Honolulu)/.test(tz)) return 'USD';
    return 'EUR';
  }
  function currency() { var c = store(CUR); return CURS.indexOf(c) >= 0 ? c : guess(); }
  T.setCurrency = function (c) { if (CURS.indexOf(c) < 0) return; store(CUR, c); applyPrices(); render(); };

  var cat = null, catP = null;
  function catalog() {
    if (cat) return Promise.resolve(cat);
    if (!catP) catP = fetch('/shop/catalog.json').then(function (r) { return r.json(); }).then(function (j) { cat = j; return j; });
    return catP;
  }
  function fmt(minor, c) {
    var loc = (cat && cat.currencies[c] && cat.currencies[c].locale) || ({ EUR: 'en-IE', GBP: 'en-GB', USD: 'en-US', CAD: 'en-CA' })[c];
    try { return new Intl.NumberFormat(loc, { style: 'currency', currency: c }).format(minor / 100); } catch (x) { return (minor / 100).toFixed(2) + ' ' + c; }
  }

  /* ---------- prices on the page ---------- */
  function applyPrices() {
    var c = currency(), k = c.toLowerCase();
    each(document, '[data-eur]', function (el) { if (el.dataset[k]) el.textContent = el.dataset[k]; });
    each(document, 'select.tn-cur', function (s) { s.value = c; });
    each(document, 'input[name="currency"]', function (i) { i.value = c; });
    each(document, '[data-taxnote-eur]', function (el) { el.textContent = el.getAttribute('data-taxnote-' + k) || ''; });
  }

  /* ---------- add to basket ---------- */
  T.addToBasket = function (items, opts) {
    var b = basket();
    items.forEach(function (it) {
      var line = b.filter(function (l) { return l.sku === it.sku && (l.variant || '') === (it.variant || ''); })[0];
      var max = it.max || 30;
      if (line) line.qty = Math.min(max, line.qty + (it.qty || 1));
      else b.push({ sku: it.sku, variant: it.variant || '', qty: Math.min(max, it.qty || 1) });
    });
    saveBasket(b);
    lastAdded = items.length === 1 ? items[0].sku : null;
    if (!opts || opts.open !== false) openDrawer(true);
  };
  var lastAdded = null;
  function onBuy(e) {
    var f = e.target;
    if (!f.matches || !f.matches('form.tn-buy')) return;
    e.preventDefault();
    var v = f.querySelector('input[name="variant"]:checked');
    var q = f.querySelector('input[name="qty"]');
    T.addToBasket([{ sku: f.getAttribute('data-sku'), variant: v ? v.value : '', qty: q ? Math.max(1, parseInt(q.value, 10) || 1) : 1, max: parseInt(f.getAttribute('data-max'), 10) || 30 }]);
  }

  /* ---------- the drawer and the basket page ---------- */
  var drawer = null, lastFocus = null;
  function openDrawer(added) {
    drawer = drawer || document.getElementById('tn-drawer');
    if (!drawer) { location.href = '/basket'; return; }
    lastFocus = document.activeElement;
    drawer.classList.toggle('is-added', !!added);
    var at = drawer.querySelector('[data-added-text]');
    if (at) { at.textContent = 'Added to your basket'; if (added && lastAdded) catalog().then(function (j) { var p = j.products[lastAdded]; if (p && added) at.textContent = 'Added: ' + p.n; }).catch(function () {}); }
    if (typeof drawer.showModal === 'function') { if (!drawer.open) drawer.showModal(); } else drawer.setAttribute('open', '');
    document.documentElement.classList.add('tn-drawer-open');
    render();
  }
  function closeDrawer() {
    if (!drawer) return;
    if (typeof drawer.close === 'function' && drawer.open) drawer.close(); else drawer.removeAttribute('open');
    document.documentElement.classList.remove('tn-drawer-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  T.openBasket = openDrawer;

  function linesHtml(b, c, big) {
    return b.map(function (l, i) {
      var p = cat.products[l.sku]; if (!p) return '';
      var v = p.v && p.v.filter(function (x) { return x.k === l.variant; })[0];
      var unit = (v ? v.p : p.p)[c];
      var src = (v ? v.i : p.i) + '-600.webp';
      if (p.t === 'pack' && l.variant) {
        var parts = l.variant.split('|'), tote = (parts[1] || '').split('~');
        v = { n: parts[0].split(',').map(function (k) { return (cat.names.packTitles && cat.names.packTitles[k]) || k; }).join(', ') + ' · tote: ' + (cat.names.totes[tote[0]] || tote[0]) + ' (' + (tote[1] === 'natural' ? 'undyed' : tote[1]) + ')' };
      }
      return '<li class="tn-line" data-i="' + i + '">' +
        '<a class="tn-line__img" href="' + p.u + '" tabindex="-1" aria-hidden="true"><img src="' + src + '" alt="" width="96" height="96" loading="lazy"></a>' +
        '<div class="tn-line__body"><a class="tn-line__name" href="' + p.u + '">' + esc(p.n) + '</a>' +
        (v ? '<span class="tn-line__var">' + esc(v.n) + '</span>' : '') +
        '<span class="tn-line__unit">' + fmt(unit, c) + (l.qty > 1 ? ' each' : '') + '</span>' +
        '<div class="tn-line__row"><div class="tn-qty" role="group" aria-label="Quantity of ' + esc(p.n) + '">' +
        '<button type="button" class="tn-qty__b" data-act="dec" aria-label="One less">−</button><span class="tn-qty__n" aria-live="polite">' + l.qty + '</span>' +
        '<button type="button" class="tn-qty__b" data-act="inc" aria-label="One more"' + (l.qty >= p.m ? ' disabled' : '') + '>+</button></div>' +
        '<button type="button" class="tn-line__rm" data-act="rm">Remove</button></div></div>' +
        '<span class="tn-line__total">' + fmt(unit * l.qty, c) + '</span></li>';
    }).join('');
  }
  function totals(b, c) {
    var sub = 0, groups = {};
    b.forEach(function (l) {
      var p = cat.products[l.sku]; if (!p) return;
      var v = p.v && p.v.filter(function (x) { return x.k === l.variant; })[0];
      sub += (v ? v.p : p.p)[c] * l.qty;
      if (p.sh) p.sh.forEach(function (s) { groups[s.parcel] = (groups[s.parcel] || 0) + s.per * l.qty; });
      else groups[p.pa] = (groups[p.pa] || 0) + l.qty;
    });
    var ship = 0, parcels = [];
    Object.keys(groups).forEach(function (k) {
      var pc = cat.parcels[k];
      var a = Math.round(pc.first[c] * 100) + Math.max(0, groups[k] - 1) * Math.round(pc.extra[c] * 100);
      ship += a; parcels.push({ name: pc.name, qty: groups[k], amount: a });
    });
    return { sub: sub, ship: ship, parcels: parcels, total: sub + ship };
  }
  function summaryHtml(t, c) {
    var cur = cat.currencies[c], reg = cat.regions[cur.region];
    return '<dl class="tn-sum">' +
      '<div><dt>Items</dt><dd>' + fmt(t.sub, c) + '</dd></div>' +
      t.parcels.map(function (p) { return '<div class="tn-sum__parcel"><dt>Shipping: ' + esc(p.name.toLowerCase()) + ' <span>(' + p.qty + ' item' + (p.qty > 1 ? 's' : '') + ', one parcel)</span></dt><dd>' + fmt(p.amount, c) + '</dd></div>'; }).join('') +
      '<div class="tn-sum__total"><dt>Total</dt><dd>' + fmt(t.total, c) + '</dd></div></dl>' +
      '<p class="tn-sum__note">' + esc(cur.taxNote) + ' Delivery to the ' + esc(reg.name.replace(/^United/, 'United')) + ' in ' + reg.delivery[0] + '–' + reg.delivery[1] + ' working days. ' +
      (t.parcels.length > 1 ? 'Your order comes in ' + t.parcels.length + ' parcels: each kind of item is made in its own workshop.' : '') + '</p>';
  }
  /* drop lines for products (or colours/types) that are no longer in the catalogue, so an old basket can't get stuck */
  function prune() {
    var b = basket(), ok = b.filter(function (l) {
      var p = cat.products[l.sku]; if (!p) return false;
      if (l.variant && p.v && p.t !== 'pack') return p.v.some(function (x) { return x.k === l.variant; });
      return true;
    });
    if (ok.length !== b.length) store(KEY, JSON.stringify(ok));
    return ok;
  }
  function badge() {
    var n = count();
    each(document, '.tn-basket-count', function (el) { el.textContent = n; el.hidden = !n; });
    each(document, '.tn-basketlink', function (a) { a.setAttribute('aria-label', 'Basket, ' + n + ' item' + (n === 1 ? '' : 's')); });
  }
  function render() {
    badge();
    var targets = [];
    if (drawer && drawer.open) targets.push(drawer);
    var pageEl = document.getElementById('tn-basketpage');
    if (pageEl) targets.push(pageEl);
    if (!targets.length && !count()) return;
    catalog().then(function () {
      var b = prune(), c = currency();
      badge();
      if (!targets.length) return;
      targets.forEach(function (root) {
        var list = root.querySelector('[data-basket-lines]'), sum = root.querySelector('[data-basket-sum]');
        var empty = root.querySelector('[data-basket-empty]'), full = root.querySelector('[data-basket-full]');
        if (empty) empty.hidden = !!b.length;
        if (full) full.hidden = !b.length;
        if (!b.length) return;
        if (list) list.innerHTML = linesHtml(b, c);
        if (sum) sum.innerHTML = summaryHtml(totals(b, c), c);
        each(root, '[data-basket-skel]', function (sk) { sk.hidden = true; });
      });
      applyPrices();
    }).catch(function () { /* the catalogue could not load: the page still links to /basket */ });
  }
  function onLineClick(e) {
    var btn = e.target.closest && e.target.closest('[data-act]');
    if (!btn) return;
    var li = btn.closest('.tn-line'); if (!li) return;
    var i = parseInt(li.getAttribute('data-i'), 10), b = basket(), l = b[i]; if (!l) return;
    var act = btn.getAttribute('data-act');
    var max = (cat && cat.products[l.sku] && cat.products[l.sku].m) || 30;
    if (act === 'inc') l.qty = Math.min(max, l.qty + 1);
    if (act === 'dec') l.qty -= 1;
    if (act === 'rm' || l.qty < 1) b.splice(i, 1);
    saveBasket(b);
  }

  /* ---------- checkout ---------- */
  var MSG = {
    notReady: 'The shop opens very soon. Your basket is saved on this device.',
    region: 'Postcards are delivered to Europe and the UK only. Please remove them, or pay in euros or pounds.',
    closed: 'The shop opens very soon. Your basket is saved on this device.',
    stripe: 'Sorry, the payment page did not open. Please try again in a minute.',
    basket: 'Your basket is empty.',
    sku: 'Something in your basket is no longer for sale. Please remove it and try again.',
    qty: 'Please check the quantities in your basket.',
    variant: 'Please choose the colour or type again.',
    error: 'Sorry, that did not work. Please try again.',
  };
  function checkout(btn) {
    var root = btn.closest('[data-basket]') || document;
    var msg = root.querySelector('[data-basket-msg]');
    var b = basket();
    if (!b.length) return;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    var label = btn.textContent; btn.textContent = 'Opening secure payment…';
    if (msg) { msg.hidden = true; msg.textContent = ''; }
    var optin = root.querySelector('[data-optin]');   // "Letters from Pim" box: unticked unless the buyer ticks it
    fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ currency: currency(), items: b, marketing: !!(optin && optin.checked) }) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'error' }; }); })
      .then(function (j) {
        if (j && j.ok && j.url) { location.href = j.url; return; }
        throw new Error((j && j.error) || 'error');
      })
      .catch(function (e) {
        btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = label;
        if (msg) { msg.textContent = MSG[e.message] || MSG.error; msg.hidden = false; }
      });
  }

  /* ---------- product gallery: thumbnails, variant photos, zoom ---------- */
  function initGallery(root) {
    each(root, '.tn-gallery', function (g) {
      var main = g.querySelector('.tn-gallery__main img');
      var thumbs = g.querySelectorAll('.tn-gallery__thumb');
      function show(btn) {
        each(g, '.tn-gallery__thumb', function (t) { t.setAttribute('aria-pressed', String(t === btn)); });
        // the main photo is a <picture>: its AVIF and WebP <source>s win over the <img>, so change them too
        var base = btn.getAttribute('data-base');
        each(g.querySelector('.tn-gallery__main'), 'source', function (s) {
          var ext = s.type === 'image/avif' ? 'avif' : 'webp';
          if (base) s.srcset = base + '-600.' + ext + ' 600w, ' + base + '-1200.' + ext + ' 1200w';
        });
        main.src = btn.getAttribute('data-src'); main.srcset = btn.getAttribute('data-srcset') || '';
        main.alt = btn.getAttribute('data-alt') || '';
        g.setAttribute('data-view', btn.getAttribute('data-view') || '');
      }
      Array.prototype.forEach.call(thumbs, function (t) { t.addEventListener('click', function () { show(t); }); });
      g.showView = function (view) { var t = g.querySelector('.tn-gallery__thumb[data-view="' + view + '"]'); if (t) show(t); };
      var zoomBtn = g.querySelector('.tn-gallery__zoom');
      var dlg = g.querySelector('.tn-zoom');
      if (zoomBtn && dlg) {
        zoomBtn.addEventListener('click', function () {
          var t = g.querySelector('.tn-gallery__thumb[aria-pressed="true"]') || thumbs[0];
          var big = dlg.querySelector('img');
          big.src = t.getAttribute('data-zoom') || t.getAttribute('data-src'); big.alt = t.getAttribute('data-alt') || '';
          if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
        });
        dlg.addEventListener('click', function (e) { if (e.target === dlg || (e.target.closest && e.target.closest('[data-close]'))) dlg.close(); });
      }
    });
    // variant radios: switch the price and the photo
    each(root, 'form.tn-buy', function (f) {
      each(f, 'input[name="variant"]', function (r) {
        r.addEventListener('change', function () {
          var price = f.closest('.tn-pdp') && f.closest('.tn-pdp').querySelector('.tn-pdp__price [data-eur]');
          if (price) CURS.forEach(function (c) { var k = c.toLowerCase(); if (r.dataset[k]) price.dataset[k] = r.dataset[k]; });
          applyPrices();
          var g = document.querySelector('.tn-gallery');
          if (g && g.showView && r.getAttribute('data-view')) g.showView(r.getAttribute('data-view'));
        });
      });
      each(f, '[data-step]', function (b) {
        b.addEventListener('click', function () {
          var q = f.querySelector('input[name="qty"]'); var max = parseInt(q.max, 10) || 30;
          q.value = Math.max(1, Math.min(max, (parseInt(q.value, 10) || 1) + parseInt(b.getAttribute('data-step'), 10)));
        });
      });
    });
  }

  /* ---------- collection filters: chips set ?series= &age= &type= and hide the cards that do not match ---------- */
  function initFilters(root) {
    each(root, '[data-filters]', function (bar) {
      var grid = document.querySelector(bar.getAttribute('data-filters'));
      if (!grid) return;
      var state = {};
      var tools = document.querySelector('[data-filterbar="' + bar.id + '"]');
      var qs = new URLSearchParams(location.search);
      each(bar, '[data-group]', function (b) { var g = b.getAttribute('data-group'); if (qs.get(g) === b.getAttribute('data-value')) state[g] = b.getAttribute('data-value'); });
      function apply() {
        var shown = 0;
        each(grid, '[data-card]', function (card) {
          var ok = Object.keys(state).every(function (g) { return !state[g] || (' ' + (card.getAttribute('data-' + g) || '') + ' ').indexOf(' ' + state[g] + ' ') >= 0; });
          card.hidden = !ok; if (ok) shown++;
        });
        each(bar, '[data-group]', function (b) { var g = b.getAttribute('data-group'); b.setAttribute('aria-pressed', String((state[g] || '') === (b.getAttribute('data-value') || ''))); });
        var label = shown + (shown === 1 ? ' item' : ' items');
        var out = document.querySelector(bar.getAttribute('data-count'));
        if (out) out.textContent = label;
        /* the phone toolbar: the same count, and how many filters are on */
        var active = Object.keys(state).filter(function (g) { return state[g]; }).length;
        if (tools) {
          each(tools, '[data-count-mirror]', function (m) { m.textContent = label; });
          var n = tools.querySelector('[data-filter-n]'); if (n) { n.textContent = String(active); n.hidden = !active; }
          var ob = tools.querySelector('[data-filter-open]'); if (ob) ob.setAttribute('aria-label', active ? 'Filter, ' + active + ' on' : 'Filter');
        }
        each(bar, '[data-filter-show]', function (x) { x.textContent = 'Show ' + label; });
        var u = new URL(location.href);
        ['series', 'age', 'type', 'occasion', 'animal', 'child'].forEach(function (g) { if (state[g]) u.searchParams.set(g, state[g]); else u.searchParams.delete(g); });
        history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
      }
      each(bar, '[data-group]', function (b) {
        b.addEventListener('click', function () { state[b.getAttribute('data-group')] = b.getAttribute('data-value') || ''; apply(); });
      });
      each(bar, '[data-filter-clear]', function (c) { c.addEventListener('click', function () { state = {}; apply(); }); });
      if (tools) { initSheet(bar, tools, grid); tools.hidden = false; }
      bar.hidden = false;
      apply();
    });
  }

  /* On a phone the filters open as a bottom sheet: a dialog with focus inside, Escape and the dim layer close it. */
  function initSheet(sheet, tools, grid) {
    var openBtn = tools.querySelector('[data-filter-open]');
    var scrim = sheet.nextElementSibling && sheet.nextElementSibling.hasAttribute('data-filter-scrim') ? sheet.nextElementSibling : null;
    var phone = window.matchMedia('(max-width: 767px)');
    function focusables() { return Array.prototype.filter.call(sheet.querySelectorAll('button, select, a[href], input'), function (x) { return !x.disabled && x.offsetParent !== null; }); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
    function open() {
      if (!phone.matches) return;
      sheet.classList.add('is-open');
      sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', sheet.id + '-h');
      openBtn.setAttribute('aria-expanded', 'true');
      if (scrim) scrim.hidden = false;
      document.documentElement.classList.add('tn-sheet-open');
      document.addEventListener('keydown', onKey);
      var c = sheet.querySelector('.tn-filters__close'); if (c) c.focus();
    }
    function close(refocus) {
      if (!sheet.classList.contains('is-open')) return;
      sheet.classList.remove('is-open');
      sheet.removeAttribute('role'); sheet.removeAttribute('aria-modal'); sheet.removeAttribute('aria-labelledby');
      openBtn.setAttribute('aria-expanded', 'false');
      if (scrim) scrim.hidden = true;
      document.documentElement.classList.remove('tn-sheet-open');
      document.removeEventListener('keydown', onKey);
      if (refocus) openBtn.focus();
    }
    openBtn.addEventListener('click', open);
    each(sheet, '[data-filter-close]', function (b) {
      b.addEventListener('click', function () {
        var show = b.hasAttribute('data-filter-show');
        close(!show);
        if (show && grid) { if (window.Telning && window.Telning.scrollToEl) window.Telning.scrollToEl(tools); else tools.scrollIntoView({ block: 'start' }); }
      });
    });
    if (scrim) scrim.addEventListener('click', function () { close(true); });
    if (phone.addEventListener) phone.addEventListener('change', function () { if (!phone.matches) close(false); });
  }

  /* ---------- /organisations: the pack builder and the quote form ---------- */
  function initPacks(root) {
    var f = root.querySelector('form.tn-packform');
    if (f) {
      var msg = f.querySelector('[data-pack-msg]');
      var limit = function () {
        var pack = f.querySelector('input[name="sku"]:checked');
        var max = pack ? parseInt(pack.getAttribute('data-titles'), 10) : 1;
        var boxes = f.querySelectorAll('input[name="pack_titles"]');
        var on = Array.prototype.filter.call(boxes, function (b) { return b.checked; });
        while (on.length > max) { on.pop().checked = false; }
        Array.prototype.forEach.call(boxes, function (b) { b.disabled = max > 1 && !b.checked && on.length >= max; });   // with one title, a click swaps it
        var lab = f.querySelector('[data-max-label]');
        if (lab) lab.textContent = max === 1 ? '(choose 1)' : '(' + on.length + ' of up to ' + max + ' chosen)';
      };
      /* the summary on the right: pack, Story Walls, the chosen pictures, tote bags and the price */
      var sum = function (k) { return f.querySelector('[data-sum="' + k + '"]'); };
      var update = function () {
        var pack = f.querySelector('input[name="sku"]:checked'); if (!pack) return;
        var titles = Array.prototype.filter.call(f.querySelectorAll('input[name="pack_titles"]'), function (b) { return b.checked; })
          .map(function (b) { return b.getAttribute('data-name') || b.value; });
        var tote = f.querySelector('input[name="pack_tote"]:checked');
        var set = function (k, v) { var el = sum(k); if (el) el.textContent = v; };
        set('name', pack.getAttribute('data-name'));
        set('titles', titles.length ? titles.join(', ') : 'none yet');
        set('posters', pack.getAttribute('data-posters') + ' Story Walls, shared over your pictures');
        set('totes', pack.getAttribute('data-totes') + ' × ' + (tote ? tote.getAttribute('data-name') + ', ' + tote.getAttribute('data-colour') : ''));
        var price = sum('price');
        if (price) { CURS.forEach(function (c) { var k = c.toLowerCase(); price.setAttribute('data-' + k, pack.getAttribute('data-p-' + k)); }); applyPrices(); }
      };
      f.addEventListener('change', function (e) {
        /* one title allowed: a new choice replaces the old one, like a radio button */
        var x = e.target, pack = f.querySelector('input[name="sku"]:checked');
        if (x && x.name === 'pack_titles' && x.checked && pack && pack.getAttribute('data-titles') === '1') each(f, 'input[name="pack_titles"]', function (b) { if (b !== x) b.checked = false; });
        limit(); update();
      });
      limit(); update();
      /* show one age group at a time in the grid (a card can answer to more than one); the choices stay */
      each(f, '[data-agefilter]', function (btn) {
        btn.addEventListener('click', function () {
          var age = btn.getAttribute('data-agefilter');
          each(f, '[data-agefilter]', function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
          each(f, '.tn-titlepick', function (l) { l.hidden = !!age && (' ' + (l.getAttribute('data-age') || '') + ' ').indexOf(' ' + age + ' ') < 0; });
        });
      });
      each(root, '[data-pack-start]', function (a) {
        a.addEventListener('click', function () { var r = f.querySelector('input[name="sku"][value="' + a.getAttribute('data-pack-start') + '"]'); if (r) { r.checked = true; limit(); update(); } });
      });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var val = function (n) { var x = f.querySelector('[name="' + n + '"]:checked') || f.querySelector('select[name="' + n + '"]'); return x ? x.value : ''; };
        var titles = Array.prototype.filter.call(f.querySelectorAll('input[name="pack_titles"]'), function (b) { return b.checked; }).map(function (b) { return b.value; });
        if (!titles.length) { msg.textContent = 'Please choose at least one Story Wall.'; msg.hidden = false; return; }
        msg.hidden = true;
        T.addToBasket([{ sku: val('sku'), variant: titles.join(',') + '|' + val('pack_tote'), qty: 1, max: 5 }]);   // pack_tote is "design~colour"
      });
    }
    var q = root.querySelector('form[data-quote]');
    var qm = q && q.querySelector('[data-quote-msg]');
    var Q = { sent: 'Thank you! We answer within two working days.', email: 'Please check your email address.', missing: 'Please fill in your organisation and what you would like.', notReady: 'The form is not open yet. Please email us instead.', rate: 'Too many requests. Please try again later.' };
    var st = new URLSearchParams(location.search).get('quote');
    if (q && st) { qm.textContent = Q[st] || 'Sorry, that did not work. Please try again.'; qm.hidden = false; }
    if (q) q.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {}; new FormData(q).forEach(function (v, k) { data[k] = v; });
      var b = q.querySelector('button[type="submit"]'); b.disabled = true;
      fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (j) { b.disabled = false; qm.textContent = j.ok ? Q.sent : (Q[j.error] || 'Sorry, that did not work. Please try again.'); qm.hidden = false; if (j.ok) q.reset(); })
        .catch(function () { b.disabled = false; qm.textContent = 'Sorry, that did not work. Please try again.'; qm.hidden = false; });
    });
  }

  T.initShop = function (root) {
    root = root || document;
    document.documentElement.classList.add('tn-shop-js');
    applyPrices();
    each(root, 'select.tn-cur', function (s) { s.addEventListener('change', function () { T.setCurrency(s.value); }); });
    document.addEventListener('submit', onBuy);
    each(root, '[data-open-basket]', function (a) { a.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); openDrawer(false); }); });
    each(root, '[data-add]', function (b) {
      b.addEventListener('click', function () { try { T.addToBasket(JSON.parse(b.getAttribute('data-add'))); } catch (x) { /* bad data */ } });
    });
    drawer = document.getElementById('tn-drawer');
    if (drawer) {
      drawer.addEventListener('click', function (e) { if (e.target === drawer || (e.target.closest && e.target.closest('[data-close]'))) closeDrawer(); });
      drawer.addEventListener('close', function () { document.documentElement.classList.remove('tn-drawer-open'); });
    }
    document.addEventListener('click', onLineClick);
    each(root, '[data-checkout]', function (b) { b.addEventListener('click', function () { checkout(b); }); });
    var err = new URLSearchParams(location.search).get('error');
    var pm = document.querySelector('#tn-basketpage [data-basket-msg]');
    if (err && pm) { pm.textContent = MSG[err] || MSG.error; pm.hidden = false; }
    if (document.body.hasAttribute('data-clear-basket')) store(KEY, '[]');
    initGallery(root);
    initFilters(root);
    initPacks(root);
    // homepage series: two rows, a fade, and "See all 12 series"
    each(root, '[data-fold-btn]', function (b) {
      var fold = document.querySelector('[data-fold]');
      b.addEventListener('click', function () {
        var open = !fold.classList.contains('is-open');
        fold.classList.toggle('is-open', open);
        b.setAttribute('aria-expanded', String(open));
        b.textContent = b.getAttribute(open ? 'data-less' : 'data-more');
        if (!open && T.scrollToEl) T.scrollToEl(document.getElementById('series'), { instant: true });
      });
    });
    // phones: a small buy bar appears when the main "Add to basket" button is out of view
    var bar = document.querySelector('.tn-buybar'), form = document.querySelector('form.tn-buy');
    if (bar && form) {
      bar.removeAttribute('aria-hidden');
      var bb = bar.querySelector('[data-buybar]'); bb.removeAttribute('tabindex');
      bb.addEventListener('click', function () { if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); });
      var ticking = false;
      var mainBtn = form.querySelector('button[type="submit"]') || form;
      var check = function () { ticking = false; var r = mainBtn.getBoundingClientRect(); bar.classList.toggle('is-on', r.bottom < 0 || r.top > window.innerHeight); };
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
      check();
    }
    render();
    window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === CUR) { applyPrices(); render(); } });
  };
})();
