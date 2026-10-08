/* Telning — small vanilla helpers: depth (parallax), tilt, reveal, phone menu, email block. No framework.
   Site facts and text come from src/data (site-data.json, strings.*.json). */
import siteData from '../data/site-data.json';
import stringsEn from '../data/strings.en.json';

(function () {
  var T = window.Telning = window.Telning || {};
  T.data = siteData;
  T.strings = { en: stringsEn };
  function each(root, sel, fn) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); }
  function s(k) { return (T.strings.en && T.strings.en[k]) || ''; }
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  /* Header height → --header-h on <html>, so anchor jumps never land under the sticky header
     (CSS: html { scroll-padding-top: var(--header-h) } and [id] { scroll-margin-top: var(--header-h) }) */
  var header = null;
  function headerH() { return header ? header.getBoundingClientRect().height : 0; }
  function setHeaderH() { if (header) document.documentElement.style.setProperty('--header-h', Math.ceil(headerH()) + 'px'); }
  T.initHeader = function () {
    header = document.querySelector('.tn-header'); if (!header) return;
    setHeaderH();
    if ('ResizeObserver' in window) new ResizeObserver(setHeaderH).observe(header);
    window.addEventListener('resize', setHeaderH);
  };
  /* Every scroll the site does goes through here: the top of el sits right under the header.
     { center: true } centres a block, but never puts its top under the header. { instant: true } = no smooth scroll. */
  T.scrollToEl = function (el, o) {
    o = o || {};
    setHeaderH();
    var r = el.getBoundingClientRect(), y = r.top + window.scrollY, h = headerH();
    /* a section with no top padding of its own (e.g. #ages) gets 24 px of air under the header */
    var top = y - h - ((parseFloat(getComputedStyle(el).paddingTop) || 0) < 16 ? 24 : 0);
    if (o.center) top = Math.min(top, y - (window.innerHeight - r.height) / 2);
    window.scrollTo({ top: Math.max(0, Math.round(top)), left: 0, behavior: (calm || o.instant) ? 'auto' : 'smooth' });
  };
  function focusHeading(el) {
    var id = el.getAttribute('aria-labelledby');
    var h = (id && document.getElementById(id)) || (el.matches('h1,h2,h3') ? el : el.querySelector('h1,h2,h3')) || el;
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
  function setMenu(btn, open) {
    var nav = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', String(open)); if (nav) nav.classList.toggle('is-open', open);
    btn.querySelector('.tn-sr').textContent = open ? 'Close menu' : 'Menu';
    document.documentElement.classList.toggle('tn-menu-open', open);
  }
  function closeMenu() {
    each(document, '.tn-menu-btn[aria-expanded="true"]', function (btn) { setMenu(btn, false); });
  }
  function hashTarget(hash) { try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch (x) { return null; } }
  /* In-page anchors (href="#ages" or "/#ages" on the same page): close the phone menu, scroll with the offset,
     update the URL, move focus to the section heading. A page that loads with a hash scrolls after fonts and images
     are ready, and checks again after 300 ms in case the layout moved. Links to other pages are left alone. */
  T.initAnchors = function (root) {
    each(root, 'a[href*="#"]', function (a) {
      a.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
        var url; try { url = new URL(a.getAttribute('href'), location.href); } catch (x) { return; }
        if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash.length < 2) return;
        var target = hashTarget(url.hash); if (!target) return;
        e.preventDefault();
        closeMenu();
        T.scrollToEl(target);
        if (location.hash !== url.hash) history.pushState(null, '', url.hash);
        focusHeading(target);
      });
    });
    function toHash() { var t = location.hash.length > 1 && hashTarget(location.hash); if (t) { T.scrollToEl(t, { instant: true }); focusHeading(t); } }
    if (location.hash.length > 1) {
      var go = function () { toHash(); setTimeout(toHash, 300); };
      var fonts = (document.fonts && document.fonts.ready) || Promise.resolve();
      if (document.readyState === 'complete') fonts.then(go); else window.addEventListener('load', function () { fonts.then(go); });
    }
  };

  /* Depth: layers inside .tn-scene move with the pointer (desktop) and with the scroll */
  T.initDepth = function (root) {
    if (calm) return;
    each(root, '.tn-scene', function (scene) {
      var raf = 0, px = 0, py = 0;
      function apply() { raf = 0; scene.style.setProperty('--px', px.toFixed(3)); scene.style.setProperty('--py', py.toFixed(3)); }
      if (finePointer) {
        (scene.closest('[data-depth-area]') || scene).addEventListener('pointermove', function (e) {
          var r = scene.getBoundingClientRect();
          px = ((e.clientX - r.left) / r.width - 0.5) * 2; py = ((e.clientY - r.top) / r.height - 0.5) * 2;
          if (!raf) raf = requestAnimationFrame(apply);
        });
        (scene.closest('[data-depth-area]') || scene).addEventListener('pointerleave', function () { px = 0; py = 0; if (!raf) raf = requestAnimationFrame(apply); });
      }
      /* scroll depth only in a normal browser window (not in a frame that is as tall as the page) */
      if (window.innerHeight > 1600) return;
      function onScroll() {
        var r = scene.getBoundingClientRect(), off = (r.top + r.height / 2) - window.innerHeight / 2;
        off = Math.max(-500, Math.min(500, off));
        scene.style.setProperty('--sy', Math.round(off));
      }
      window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    });
  };

  /* Tilt: cards turn a little toward the pointer */
  T.initTilt = function (root) {
    if (calm || !finePointer) return;
    each(root, '.tn-tilt', function (el) {
      var max = parseFloat(el.getAttribute('data-tilt') || '8');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (x * max).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-y * max).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
    });
  };

  /* Reveal on scroll (never leaves content hidden: everything shows after 2.5 s) */
  T.initReveal = function (root) {
    var items = (root || document).querySelectorAll('.tn-reveal');
    function showAll() { Array.prototype.forEach.call(items, function (el) { el.classList.add('is-now'); el.classList.add('is-in'); }); }   /* the safety net reveals instantly: nothing is ever half-visible */
    if (calm || !('IntersectionObserver' in window)) { showAll(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
    setTimeout(showAll, 2500);
  };

  T.initMenu = function (root) {
    each(root, '.tn-menu-btn', function (btn) {
      btn.addEventListener('click', function () { setMenu(btn, btn.getAttribute('aria-expanded') !== 'true'); });
    });
    /* Close on a tap on the dimmed page, on Esc (focus goes back to the button), and when the screen grows to desktop */
    each(root, '.tn-scrim', function (s) { s.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var btn = document.querySelector('.tn-menu-btn[aria-expanded="true"]'); if (btn) { closeMenu(); btn.focus(); }
    });
    if (window.matchMedia) { var wide = window.matchMedia('(min-width: 1024px)'); var onWide = function () { if (wide.matches) closeMenu(); }; if (wide.addEventListener) wide.addEventListener('change', onWide); }
  };

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  T.initEmail = function (root) {
    each(root, '.tn-email', function (block) {
      var form = block.querySelector('form'), field = block.querySelector('.tn-field'), input = block.querySelector('input[type="email"]');
      var err = block.querySelector('.tn-error-text'), btn = block.querySelector('.tn-btn'), chip = block.querySelector('.tn-email__chip');
      var bookInput = block.querySelector('input[name="book"]');
      function setError(m) { field.classList.toggle('is-error', !!m); input.setAttribute('aria-invalid', m ? 'true' : 'false'); err.textContent = m || ''; }
      input.addEventListener('input', function () { if (field.classList.contains('is-error') && EMAIL_RE.test(input.value.trim())) setError(''); });
      if (chip) chip.querySelector('button').addEventListener('click', function () { bookInput.value = ''; chip.classList.remove('is-on'); input.focus(); });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = input.value.trim();
        if (!v) { setError(s('email.error.empty')); input.focus(); return; }
        if (!EMAIL_RE.test(v)) { setError(s('email.error.invalid')); input.focus(); return; }
        setError('');
        if (form.querySelector('.tn-hp input').value) { block.classList.add('is-done'); return; }
        var label = btn.textContent; btn.textContent = s('email.sending'); btn.setAttribute('aria-disabled', 'true');
        function done() { block.classList.add('is-done'); block.querySelector('.tn-email__thanks').focus(); }
        function fail() { btn.textContent = label; btn.removeAttribute('aria-disabled'); setError(s('email.failed')); }
        var endpoint = (T.data && T.data.formEndpoint) || '';
        if (!endpoint) { fail(); return; }   /* never a fake thank-you */
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ form: (form.querySelector('input[name="form"]') || {}).value || 'news', email: v, book: bookInput ? bookInput.value : '', lang: document.documentElement.lang || 'en' }) })
          .then(function (r) { r.ok ? done() : fail(); }, fail);
      });
    });
    each(root, '[data-tn-notify]', function (a) {
      a.addEventListener('click', function (e) {
        var block = document.getElementById((a.getAttribute('href') || '#news').slice(1)); if (!block) return;
        e.preventDefault();
        var key = a.getAttribute('data-tn-notify'), book = (T.data.books || []).concat((T.data.series || []).map(function (x) { return { key: x.key, title: { en: x.name } }; })).filter(function (b) { return b.key === key; })[0];
        var chip = block.querySelector('.tn-email__chip');
        if (book && chip) { block.querySelector('input[name="book"]').value = key; chip.querySelector('.tn-email__chip-text').textContent = book.title.en; chip.classList.add('is-on'); }
        block.classList.remove('is-done'); T.scrollToEl(block, { center: true });
        var input = block.querySelector('input[type="email"]'); if (input) input.focus({ preventScroll: true });
      });
    });
  };

  /* Scroll stories: every .tn-view element carries --p from 0 to 1 while the picture crosses a line at 75% of the
     viewport height: 0 when its top edge reaches the line, 1 when it has moved past by its own height (at least 40% of
     the viewport, so a short picture finishes while it is still in full view). data-track="<selector>" measures that
     child instead (the picture inside a section with cards or text); a sticky child is not measured (it does not move),
     the whole element is. CSS turns --p into transforms and opacity (only under .tn-js, so the final state shows
     without JS). Reduced motion: --p is 1 and nothing moves. */
  T.initView = function (root) {
    var els = Array.prototype.slice.call((root || document).querySelectorAll('.tn-view'));
    if (!els.length) return;
    if (calm) { els.forEach(function (el) { el.style.setProperty('--p', '1'); }); return; }
    var active = [], raf = 0;
    function update() {
      raf = 0; var vh = window.innerHeight;
      active.forEach(function (el) {
        var t = (el.dataset.track && el.querySelector(el.dataset.track)) || el;
        if (t !== el && getComputedStyle(t).position === 'sticky') t = el;
        var r = t.getBoundingClientRect(), p = (vh * 0.75 - r.top) / Math.max(r.height, vh * 0.4);
        el.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(4));
      });
    }
    function tick() { if (!raf) raf = requestAnimationFrame(update); }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = active.indexOf(e.target);
        if (e.isIntersecting) { if (i < 0) active.push(e.target); }
        else { if (i >= 0) active.splice(i, 1); e.target.style.setProperty('--p', e.boundingClientRect.top > 0 ? '0' : '1'); }
      });
      tick();
    }, { rootMargin: '12% 0px' });
    els.forEach(function (el) { io.observe(el); });
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    tick();
  };

  /* <details data-open-min="600">: open from that viewport width (the content is always in the HTML) */
  T.initDetails = function (root) {
    each(root, 'details[data-open-min]', function (d) { if (window.innerWidth >= parseInt(d.getAttribute('data-open-min'), 10)) d.open = true; });
  };

  T.init = function (root) {
    document.documentElement.classList.add('tn-js');
    T.initHeader(); T.initAnchors(root); T.initReveal(root); T.initDepth(root); T.initTilt(root); T.initMenu(root); T.initEmail(root); T.initView(root); T.initDetails(root);
  };
})();
