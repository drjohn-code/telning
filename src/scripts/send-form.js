/* /send form: three steps with working tabs and Next/Back (one step visible at a time; step 1 is checked before moving
   on), photo preview with rotate / zoom / drag-to-crop (re-encoded to JPEG, which also drops EXIF and GPS), validation
   in words, the conditional consent for step 2, and the fetch submit with the thank-you state. Without JS every step
   shows, the tabs are plain links, and the form posts as multipart to /api/story-card. Field values never go to
   analytics or logs. */
(function () {
  var form = document.getElementById('story-form'); if (!form) return;
  var S = JSON.parse(document.getElementById('send-strings').textContent);
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(sel, root) { return (root || form).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || form).querySelectorAll(sel)); }

  var tabs = $$('.tn-progress__tab'), parts = $$('.tn-form__part'), current = 1;

  /* errors in words, never colour alone */
  function err(fieldEl, id, msg) {
    var p = document.getElementById(id); if (!p) return;
    p.querySelector('.tn-error-text').textContent = msg || '';
    var field = fieldEl || p.closest('.tn-field') || p.parentNode;
    field.classList.toggle('is-error', !!msg);
    $$('input,select,textarea', field).forEach(function (i) { if (i.type !== 'checkbox' && i.type !== 'radio') i.setAttribute('aria-invalid', msg ? 'true' : 'false'); });
  }

  /* photo: preview, rotate, zoom, drag; the crop frame is square (the card frame is square) */
  var input = $('#f-photo'), btn = $('.tn-photo__btn'), crop = $('.tn-crop'), canvas = $('.tn-crop__canvas'), ctx = canvas.getContext('2d');
  var zoom = $('[data-zoom]'), rotateBtn = $('[data-rotate]');
  var img = null, rot = 0, scale = 1, dx = 0, dy = 0, drag = null, decodable = true;
  var TYPES = /^image\/(jpeg|png|webp|heic|heif)$/i, EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
  function fileOk(f) {
    if (!f) return S.errors.photo;
    if (!(TYPES.test(f.type) || EXT.test(f.name))) return S.errors.photoType;
    if (f.size > S.maxMb * 1024 * 1024) return S.errors.photoSize;
    return '';
  }
  function draw() {
    if (!img) return;
    var W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    var iw = img.width, ih = img.height, rotated = rot % 180 !== 0;
    var bw = rotated ? ih : iw, bh = rotated ? iw : ih;
    var base = Math.max(W / bw, H / bh) * scale;     /* cover the frame, then zoom */
    ctx.save(); ctx.translate(W / 2 + dx, H / 2 + dy); ctx.rotate(rot * Math.PI / 180); ctx.scale(base, base); ctx.drawImage(img, -iw / 2, -ih / 2); ctx.restore();
  }
  function load(file) {
    var m = fileOk(file); err(null, 'f-photo-err', m); if (m) { crop.hidden = true; img = null; return; }
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () { img = im; rot = 0; scale = 1; dx = dy = 0; zoom.value = 1; decodable = true; crop.hidden = false; btn.textContent = btn.getAttribute('data-change'); draw(); URL.revokeObjectURL(url); };
    im.onerror = function () { decodable = false; img = null; crop.hidden = true; btn.textContent = btn.getAttribute('data-change'); URL.revokeObjectURL(url); };   /* HEIC in some browsers: send the file as it is; the server converts it */
    im.src = url;
  }
  input.addEventListener('change', function () { load(input.files && input.files[0]); });
  rotateBtn.addEventListener('click', function () { rot = (rot + 90) % 360; draw(); });
  zoom.addEventListener('input', function () { scale = parseFloat(zoom.value); draw(); });
  canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, dx: dx, dy: dy }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', function (e) { if (!drag) return; var k = canvas.width / canvas.getBoundingClientRect().width; dx = drag.dx + (e.clientX - drag.x) * k; dy = drag.dy + (e.clientY - drag.y) * k; draw(); });
  canvas.addEventListener('pointerup', function () { drag = null; }); canvas.addEventListener('pointercancel', function () { drag = null; });
  function exportBlob() {
    return new Promise(function (resolve) {
      if (!img) return resolve(null);
      var out = document.createElement('canvas'); out.width = out.height = 1600;
      var c = out.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 1600, 1600);
      var k = 1600 / canvas.width, iw = img.width, ih = img.height, rotated = rot % 180 !== 0;
      var base = Math.max(canvas.width / (rotated ? ih : iw), canvas.height / (rotated ? iw : ih)) * scale * k;
      c.save(); c.translate(800 + dx * k, 800 + dy * k); c.rotate(rot * Math.PI / 180); c.scale(base, base); c.drawImage(img, -iw / 2, -ih / 2); c.restore();
      out.toBlob(function (b) { resolve(b); }, 'image/jpeg', 0.86);
    });
  }

  /* part 2 filled? then consent 3 is required */
  function part2Filled() { return $$('#part-2 input:checked').length > 0 || $$('#part-2 textarea').some(function (t) { return t.value.trim(); }); }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  /* Each check returns the first field with a problem (or null), and writes the messages. */
  function checkStep1() {
    var first = null;
    function bad(id, msg, el) { err(null, id, msg); if (!first) first = el; }
    var email = $('#f-email'); err(null, 'f-email-err', '');
    if (!email.value.trim()) bad('f-email-err', S.errors.email, email); else if (!EMAIL_RE.test(email.value.trim())) bad('f-email-err', S.errors.emailInvalid, email);
    var name = $('#f-name'); err(null, 'f-name-err', ''); if (!name.value.trim()) bad('f-name-err', S.errors.name, name);
    var age = $('#f-age'); err(null, 'f-age-err', ''); if (!age.value) bad('f-age-err', S.errors.age, age);
    var f = input.files && input.files[0], pm = fileOk(f); err(null, 'f-photo-err', ''); if (pm) bad('f-photo-err', pm, input);
    return first;
  }
  function checkStep3() {
    var first = null;
    var c1 = $('input[name="consentGuardian"]'), c2 = $('input[name="consentCard"]'), c3 = $('input[name="consentAnswers"]');
    var box = c1.closest('.tn-checks');
    function bad(id, msg, el) { err(box, id, msg); if (!first) first = el; }
    err(box, 'f-c1-err', ''); err(box, 'f-c2-err', ''); err(box, 'f-c3-err', '');
    if (!c1.checked) bad('f-c1-err', S.errors.c1, c1);
    if (!c2.checked) bad('f-c2-err', S.errors.c2, c2);
    if (part2Filled() && !c3.checked) bad('f-c3-err', S.errors.c3, c3);
    return first;
  }
  function focusField(el) {
    el.focus({ preventScroll: true });
    if (window.Telning && window.Telning.scrollToEl) window.Telning.scrollToEl(el.closest('.tn-field, .tn-checks') || el, { center: true });
  }

  /* Steps: one part visible at a time. Moving forward past step 1 needs step 1 to be complete. */
  function show(n, focus) {
    current = n;
    parts.forEach(function (p) { p.hidden = parseInt(p.getAttribute('data-step'), 10) !== n; });
    tabs.forEach(function (a) {
      var k = parseInt(a.getAttribute('data-goto'), 10);
      if (k === n) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      a.classList.toggle('is-done', k < n);
    });
    if (focus !== false) {
      var part = parts[n - 1];
      if (window.Telning && window.Telning.scrollToEl) window.Telning.scrollToEl(form, { instant: calm });
      part.focus({ preventScroll: true });
    }
  }
  function go(n) {
    if (n > 1 && n > current) {
      var bad1 = checkStep1();
      if (bad1) { if (current !== 1) show(1, false); focusField(bad1); return; }
    }
    show(n);
  }
  form.classList.add('is-steps');
  $$('[data-nav]').forEach(function (el) { el.hidden = false; });
  $$('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); go(parseInt(el.getAttribute('data-goto'), 10)); });
  });
  show(1, false);

  var submitBtn = $('button[type="submit"]'), failP = $('#f-form-err');
  function fail(msg) { failP.querySelector('.tn-error-text').textContent = msg; failP.classList.add('is-on'); submitBtn.textContent = S.submit; submitBtn.removeAttribute('aria-disabled'); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    failP.classList.remove('is-on');
    if ($('#f-web').value) { done(); return; }                       /* honeypot: pretend */
    var bad1 = checkStep1();
    if (bad1) { show(1, false); focusField(bad1); return; }
    var bad3 = checkStep3();
    if (bad3) { if (current !== 3) show(3, false); focusField(bad3); return; }
    submitBtn.textContent = S.sending; submitBtn.setAttribute('aria-disabled', 'true');
    exportBlob().then(function (blob) {
      var fd = new FormData(form);
      if (blob) { fd.set('photo', blob, 'drawing.jpg'); fd.set('photoCropped', '1'); }
      return fetch(form.action, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } });
    }).then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        if (res.status === 200 && res.body && res.body.ok) { done(); return; }
        var code = res.body && res.body.error;
        fail(S.errors[code] || (res.status === 503 ? S.errors.notReady : S.errors.failed));
      }, function () { fail(S.errors.failed); });
  });
  function done() {
    parts.forEach(function (p) { p.hidden = true; });
    $('.tn-progress').hidden = true;
    var th = $('.tn-form__thanks'); th.hidden = false; th.focus({ preventScroll: true });
    if (window.Telning && window.Telning.scrollToEl) window.Telning.scrollToEl(th, { center: true, instant: calm });
    form.reset(); img = null;
  }
})();
