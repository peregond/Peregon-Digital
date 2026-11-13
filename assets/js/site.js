/* peregon.cc: language switch, video tiles, route rail, live release versions. No dependencies. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;

  /* ---------- Language (EN in the markup, RU from dictionaries) ---------- */
  var COMMON_RU = {
    'nav.digital': 'Digital',
    'nav.hire': 'Hire',
    'nav.vibe': 'Vibe',
    'f.note': 'Перегон — участок пути между двумя станциями. На этом сайте станций три.',
    'f.lines': 'Линии',
    'f.d': 'Digital, продакшен-компания',
    'f.h': 'Hire, портфолио и резюме',
    'f.v': 'Vibe, приложения',
    'f.contact': 'Контакты',
    'f.write': 'Напишите мне',
    'f.rights': '© 2026 Peregon Digital. Дмитрий Перегон.',
    'f.top': 'Наверх',
    'yt.play': 'Смотреть'
  };
  var RU = Object.assign({}, COMMON_RU, window.I18N_RU || {});
  var titleEn = doc.title;

  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'ru' || q === 'en') { try { localStorage.setItem('lang', q); } catch (e) {} return q; }
    try { var s = localStorage.getItem('lang'); if (s === 'ru' || s === 'en') return s; } catch (e) {}
    return /^ru\b/i.test(navigator.language || '') ? 'ru' : 'en';
  }
  function applyLang(lang) {
    root.lang = lang;
    doc.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (el._en === undefined) el._en = el.innerHTML;
      var v = RU[el.dataset.i18n];
      el.innerHTML = lang === 'ru' && v != null ? v : el._en;
    });
    doc.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      // format: "attr:key;attr:key"
      el.dataset.i18nAttr.split(';').forEach(function (pair) {
        var p = pair.split(':'), attr = p[0], key = p[1];
        el._attrEn = el._attrEn || {};
        if (el._attrEn[attr] === undefined) el._attrEn[attr] = el.getAttribute(attr);
        var v = RU[key];
        el.setAttribute(attr, lang === 'ru' && v != null ? v : el._attrEn[attr]);
      });
    });
    doc.title = lang === 'ru' && RU.title ? RU.title : titleEn;
    doc.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
  }
  applyLang(pickLang());
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('.lang button');
    if (!b) return;
    try { localStorage.setItem('lang', b.dataset.lang); } catch (err) {}
    applyLang(b.dataset.lang);
  });

  /* ---------- "Back to top": the #top anchor sits on a sticky header, so scroll explicitly ---------- */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#top"]');
    if (!a) return;
    e.preventDefault();
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  });

  /* ---------- Video tiles: a link to YouTube that becomes a player on click ---------- */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a.yt[data-yt]');
    if (!a || a.classList.contains('is-playing') || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    var f = doc.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(a.dataset.yt) + '?autoplay=1&rel=0';
    f.title = a.getAttribute('aria-label') || 'Video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    a.classList.add('is-playing');
    a.appendChild(f);
  });

  /* ---------- Route rail: sections become stations, scroll moves the train ---------- */
  var stops = Array.prototype.slice.call(doc.querySelectorAll('[data-stop]'));
  if (stops.length > 1) {
    var rail = doc.createElement('nav');
    rail.className = 'rail';
    rail.setAttribute('aria-label', 'On this page');
    var fill = doc.createElement('i');
    fill.className = 'rail-fill';
    rail.appendChild(fill);
    var marks = stops.map(function (s, i) {
      if (!s.id) s.id = 'stop-' + (i + 1);
      var a = doc.createElement('a');
      a.href = '#' + s.id;
      a.style.top = (i / (stops.length - 1) * 100) + '%';
      var label = doc.createElement('span');
      label.dataset.i18n = s.dataset.stopKey || '';
      label.textContent = s.dataset.stop;
      a.appendChild(label);
      rail.appendChild(a);
      return a;
    });
    doc.body.appendChild(rail);
    applyLang(root.lang);

    var ticking = false;
    var update = function () {
      ticking = false;
      var mid = window.innerHeight * 0.4, current = 0;
      stops.forEach(function (s, i) { if (s.getBoundingClientRect().top <= mid) current = i; });
      var p = current / (stops.length - 1);
      var cur = stops[current].getBoundingClientRect(), next = stops[current + 1];
      if (next) {
        var span = next.getBoundingClientRect().top - cur.top;
        if (span > 0) p += Math.min(1, Math.max(0, (mid - cur.top) / span)) / (stops.length - 1);
      }
      fill.style.setProperty('--p', p.toFixed(4));
      marks.forEach(function (m, i) {
        m.classList.toggle('passed', i <= current);
        m.classList.toggle('now', i === current);
      });
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Latest release versions from GitHub (static text stays if the request fails) ---------- */
  doc.querySelectorAll('[data-release]').forEach(function (el) {
    fetch('https://api.github.com/repos/' + el.dataset.release + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && /^v?\d+(\.\d+)+$/.test(d.tag_name)) el.textContent = 'v' + d.tag_name.replace(/^v/, ''); })
      .catch(function () {});
  });
})();
