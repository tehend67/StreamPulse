(function () {
  'use strict';

  function spTheme() {
    try {
      return localStorage.getItem('sp_theme') ||
             document.documentElement.getAttribute('data-theme') ||
             'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function _readTok() {
    try {
      if (window.tok) return window.tok();
      var K = 'sp41';
      var v = localStorage.getItem('sp_tok') || localStorage.getItem('sp_token') || '';
      if (!v) return '';
      if (v.indexOf('e:') === 0) {
        var b = atob(v.slice(2));
        var o = '';
        for (var i = 0; i < b.length; i++) {
          o += String.fromCharCode(b.charCodeAt(i) ^ K.charCodeAt(i % K.length));
        }
        return o;
      }
      return v;
    } catch (e) {
      return '';
    }
  }

  function spSetTheme(t) {
    if (t !== 'dark' && t !== 'light') t = 'dark';

    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.lang = document.documentElement.lang || 'uk';

    try { localStorage.setItem('sp_theme', t); } catch (e) {  }

    var btn = document.getElementById('themeBtn');
    if (btn) {
      var use = btn.querySelector('use');
      if (use) use.setAttribute('href', t === 'dark' ? '#i-moon' : '#i-sun');
      var sp = btn.querySelector('span[data-i18n]');
      if (sp && window.spT) {
        try { sp.textContent = window.spT(t === 'dark' ? 'dark' : 'light'); } catch (e) {  }
      }
    }
  }

  function _saveThemeServer(t) {
    var tok = _readTok();
    if (!tok) return;
    try {
      fetch('/api/v1/users/prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
        body: JSON.stringify({ theme: t })
      }).catch(function () {  });
    } catch (e) {  }
  }

  function _attachBtn() {
    var btn = document.getElementById('themeBtn');
    if (!btn || btn._spThemeAttached) return;
    btn._spThemeAttached = true;
    btn.addEventListener('click', function () {
      var next = spTheme() === 'dark' ? 'light' : 'dark';
      spSetTheme(next);
      _saveThemeServer(next);
      try { if (window.spRenderAll) window.spRenderAll(); } catch (e) {  }
    });
  }

  spSetTheme(spTheme());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _attachBtn);
  } else {
    _attachBtn();
  }

  window.spSetTheme = spSetTheme;
  window.spTheme = spTheme;

}());
