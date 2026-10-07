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
    function showAll() { Array.prototype.forEach.call(items, function (el) { el.classList.add('is-in'); }); }
    if (calm || !('IntersectionObserver' in window)) { showAll(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
    setTimeout(showAll, 2500);
  };

  T.initMenu = function (root) {
    each(root, '.tn-menu-btn', function (btn) {
      var nav = document.getElementById(btn.getAttribute('aria-controls'));
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
      });
    });
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
        if (!endpoint) { setTimeout(done, 500); return; }   /* design preview: no endpoint chosen yet */
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form: 'news', email: v, book: bookInput ? bookInput.value : '', lang: document.documentElement.lang || 'en' }) })
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
        block.classList.remove('is-done'); block.scrollIntoView({ block: 'center' });
        var input = block.querySelector('input[type="email"]'); if (input) input.focus({ preventScroll: true });
      });
    });
  };

  T.init = function (root) {
    document.documentElement.classList.add('tn-js');
    T.initReveal(root); T.initDepth(root); T.initTilt(root); T.initMenu(root); T.initEmail(root);
  };
})();
