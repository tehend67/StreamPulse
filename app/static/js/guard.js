(function (w, d) {
  'use strict';

  function blk(e) {
    if (e && e.preventDefault)       e.preventDefault();
    if (e && e.stopPropagation)       e.stopPropagation();
    if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
    return false;
  }

  function isInput(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || !!el.isContentEditable;
  }

  function isDevKey(e) {
    var k = e.key || '';
    if (k === 'F12') return true;
    var ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.shiftKey) {
      var u = k.toUpperCase();
      if ('IJCKEUS'.indexOf(u) !== -1) return true;
    }
    if (ctrl && !e.shiftKey) {
      var l = k.toLowerCase();
      if (l === 'u' || l === 'p') return true;
    }
    return false;
  }

  d.addEventListener('keydown', function (e) { if (isDevKey(e)) return blk(e); }, true);
  d.addEventListener('keyup',   function (e) { if (isDevKey(e)) return blk(e); }, true);
  w.addEventListener('keydown', function (e) { if (isDevKey(e)) return blk(e); }, true);

  d.addEventListener('contextmenu', function (e) {
    if (isInput(e.target)) return;
    return blk(e);
  }, true);

  ['copy', 'cut'].forEach(function (ev) {
    d.addEventListener(ev, function (e) {
      if (isInput(e.target)) return;
      e.preventDefault();
    }, true);
  });

  d.addEventListener('dragstart',   function (e) { e.preventDefault(); }, true);
  d.addEventListener('selectstart', function (e) {
    if (isInput(e.target)) return;
    e.preventDefault();
  }, true);

  try {
    w.addEventListener('beforeprint', function () {
      d.body.style.display = 'none';
      setTimeout(function () { d.body.style.display = ''; }, 800);
    });
  } catch (_) {}

  try {
    if (w.top !== w.self) {
      d.body && (d.body.style.display = 'none');
    }
  } catch (_) {
    d.body && (d.body.style.display = 'none');
  }

  w.addEventListener('error', function (e) {
    e.preventDefault();
    return true;
  }, true);

  w.addEventListener('unhandledrejection', function (e) {
    e.preventDefault();
  }, true);

  w.addEventListener('DOMContentLoaded', function () {
    try {
      var noop = function () {};
      ['log','debug','info','warn','error','table','trace','dir','count','time','timeEnd'].forEach(function (m) {
        try {
          Object.defineProperty(console, m, { value: noop, configurable: false, writable: false });
        } catch (_) {
          try { console[m] = noop; } catch (__) {}
        }
      });
    } catch (_) {}

    try {
      if (w.SP_I18N) Object.freeze(w.SP_I18N);
    } catch (_) {}
  });


}(window, document));
