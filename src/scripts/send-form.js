/* /send form: three steps with working tabs and Next/Back (one step visible at a time; step 1 is checked before moving
   on), validation in words, the conditional consent for step 2, and the fetch submit with the thank-you state.
   No photo upload since 12 Oct 2026 (v2 plan). Without JS every step shows, the tabs are plain links, and the form
   posts to /api/story-card. Field values never go to analytics or logs. */
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
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
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
    form.reset();
  }
})();
