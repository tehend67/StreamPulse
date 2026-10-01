'use strict';

var _K = 'sp41x9';

function _xor(s) {
  var o = '';
  for (var i = 0; i < s.length; i++) {
    o += String.fromCharCode(s.charCodeAt(i) ^ _K.charCodeAt(i % _K.length));
  }
  return o;
}

function tok() {
  try {
    var v = localStorage.getItem('sp_tok') || localStorage.getItem('sp_token') || '';
    if (!v) return '';
    if (v.indexOf('e:') === 0) return _xor(atob(v.slice(2)));
    return v;
  } catch (e) { return ''; }
}

function stok(t) {
  try {
    localStorage.setItem('sp_tok', 'e:' + btoa(_xor(t)));
    localStorage.removeItem('sp_token');
  } catch (e) {
    try { localStorage.setItem('sp_token', t); } catch (_) {}
  }
}

function clearTok() {
  try {
    localStorage.removeItem('sp_tok');
    localStorage.removeItem('sp_token');
  } catch (e) {}
  try { sessionStorage.removeItem('sp_session_started_at'); } catch (e) {}
}

function H(hasBody) {
  var h = {};
  if (hasBody !== false) h['Content-Type'] = 'application/json';
  var t = tok();
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

var API = '';

async function api(path, opt) {
  opt = opt || {};
  opt.headers = Object.assign(H(opt.json !== false), opt.headers || {});
  if (opt.body && typeof opt.body !== 'string') opt.body = JSON.stringify(opt.body);
  var r;
  try {
    r = await fetch(API + path, opt);
  } catch (netErr) {
    throw new Error('Network error: ' + netErr.message);
  }
  if (r.status === 401) {
    var cp = location.pathname;
    var onAuth = cp === '/login' || cp === '/register';
    if (!onAuth) {
      clearTok();
      location.href = '/login';
    }
    throw new Error('auth');
  }
  var t = null;
  try { t = await r.json(); } catch (e) {}
  if (!r.ok) {
    var msg = 'HTTP ' + r.status;
    if (t && typeof t.detail === 'string') msg = t.detail;
    else if (t && t.detail && Array.isArray(t.detail) && t.detail[0] && t.detail[0].msg) {
      msg = t.detail[0].msg;
    }
    throw new Error(msg);
  }
  return t;
}

function toast(msg, type) {
  var root = document.getElementById('toastRoot');
  if (!root) return;
  var d = document.createElement('div');
  d.className = 'sp-toast' + (type ? ' ' + type : '');
  d.textContent = msg;
  d.addEventListener('click', function () { d.remove(); });
  root.appendChild(d);
  setTimeout(function () {
    d.style.transition = 'opacity .4s ease, transform .4s ease';
    d.style.opacity = '0';
    d.style.transform = 'translateX(30px)';
    setTimeout(function () { d.remove(); }, 450);
  }, 4200);
}

function toastOk(msg)  { toast(msg, 'ok'); }
function toastErr(msg) { toast(msg, 'err'); }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function icon(id, cls) {
  return '<svg class="sp-ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
}

var PLATFORM_ICON = {
  telegram: 'i-send',
  discord:  'i-chat',
  youtube:  'i-play'
};

var state = {
  items:    [],   
  filter:   'overview',
  pstats:   {},
  user:     null,
  events:   [],
  wsReady:  false
};

function needAuth() {
  var p = location.pathname;
  var isDash = p === '/dashboard';
  if (!isDash) return;
  if (!tok()) {
    location.replace('/');
  }
}

function isAuthPage() {
  var p = location.pathname;
  return p === '/login' || p === '/register';
}

function spWelcome() {
  var p = location.pathname;
  var t = tok();

  if (p === '/login' || p === '/register') {
    return;
  }

  if (p === '/' && t) {
    location.replace('/dashboard');
    return;
  }

  if (t && p === '/dashboard') {
    var fresh = false;
    try { fresh = new URLSearchParams(location.search).get('fresh') === '1'; } catch (e) {}
    if (fresh) {
      try { history.replaceState(null, '', '/'); } catch (e) {}
      var fv = document.getElementById('freshVeil');
      if (fv) {
        fv.hidden = false;
        setTimeout(function () {
          fv.classList.add('done');
          setTimeout(function () { if (fv.parentNode) fv.parentNode.removeChild(fv); }, 700);
        }, 1800);
      }
    }
  }
}

function renderMetrics(s) {
  var a = document.getElementById('mConnected');
  var b = document.getElementById('mActive');
  var c = document.getElementById('mHealth');
  function setVal(el, v) {
    if (!el) return;
    var prev = el.textContent;
    var nxt  = String(v);
    if (prev === nxt) return;
    el.textContent = nxt;
    el.classList.remove('anim');
    void el.offsetWidth; 
    el.classList.add('anim');
  }
  if (a) setVal(a, s ? (s.integrations || 0) : 0);
  if (b) setVal(b, s ? (s.active_tasks  || 0) : 0);
  if (c) {
    var health = s ? (s.ok ? 'OK' : 'WARN') : '—';
    setVal(c, health);
    c.style.color = (!s || s.ok) ? 'var(--fg)' : 'var(--mut)';
  }
  var di = document.getElementById('dropInteg');
  var dt = document.getElementById('dropTasks');
  if (di && a) di.textContent = a.textContent;
  if (dt && b) dt.textContent = b.textContent;
}

function cardHTML(it, idx) {
  var ic  = PLATFORM_ICON[it.platform] || 'i-grid';
  var isOk = it.status === 'active';
  var stTag = isOk
    ? '<span class="sp-tag ok"><i></i>' + esc(spT('s_online')) + '</span>'
    : '<span class="sp-tag"><i></i>' + esc(it.status || 'pending') + '</span>';
  var disp = (it.meta_data && it.meta_data.display) || it.external_id || '';
  var lastChk = it.last_check_at
    ? new Date(it.last_check_at).toLocaleTimeString()
    : '—';
  var connectionError = it.meta_data && it.meta_data.error
    ? '<div class="sub text-xs" style="color:var(--fg2);margin:0 0 10px">' + esc(it.meta_data.error) + '</div>'
    : '';
  var delay = (idx * 55) + 'ms';
  return [
    '<article class="sp-card" data-id="' + it.id + '" data-platform="' + it.platform + '" style="animation-delay:' + delay + '" tabindex="0" role="article" aria-label="' + esc(it.name) + '">',
    '  <div class="sp-card-corner" aria-hidden="true">' + icon(ic) + '</div>',
    '  <div>' + stTag + '</div>',
    '  <h3>' + esc(it.name) + '</h3>',
    '  <div class="sub">' + esc(it.platform) + (disp ? ' · ' + esc(disp) : '') + '</div>',
    '  <div class="sub text-xs" style="margin-top:-8px;margin-bottom:10px">',
    '    <span style="color:var(--mut2)">' + esc(lastChk) + '</span>',
    '  </div>',
    connectionError,
    '  <div class="sp-cardrow">',
    '    <button class="sp-btn" data-open="' + it.id + '" aria-label="' + esc(spT('open_panel')) + '">' + esc(spT('open_panel')) + '</button>',
    '    <button class="sp-btn ghost sp-btn sm" data-edit="' + it.id + '" aria-label="' + esc(spT('edit_integ')) + '">' + icon('i-edit') + '</button>',
    '    <button class="sp-btn ghost sp-btn sm" data-check="' + it.id + '" aria-label="Refresh status">' + icon('i-refresh') + '</button>',
    '  </div>',
    '</article>'
  ].join('');
}

var PLATFORM_METRIC_KEYS = {
  telegram: [
    { k: 'member_count',  l: 's_members' },
    { k: 'sent',          l: 's_sent' },
    { k: 'failed',        l: 's_failed_short' },
    { k: 'username',      l: 'label_username' }
  ],
  discord: [
    { k: 'guilds_count',    l: 's_guilds' },
    { k: 'member_count',    l: 's_members' },
    { k: 'roles_count',     l: 'a_roles' },
    { k: 'sampled_members', l: 's_members' }
  ],
  youtube: [
    { k: 'subscribers', l: 's_subscribers' },
    { k: 'views',       l: 's_views' },
    { k: 'videos',      l: 's_videos_cnt' },
    { k: 'is_live',     l: 's_live' },
    { k: 'live_count',  l: 's_live' }
  ]
};

function _fmt(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  var n = Number(v);
  if (!isNaN(n) && n > 999) return n.toLocaleString();
  return String(v).slice(0, 40);
}

function renderPstats() {
  var w = document.getElementById('pstats');
  if (!w) return;
  var f = state.filter;
  if (f !== 'telegram' && f !== 'discord' && f !== 'youtube') {
    w.hidden = true; w.innerHTML = '';
    return;
  }
  var d = (state.pstats || {})[f];
  if (!d) { w.hidden = true; return; }

  var rate   = d.success_rate == null ? '—' : d.success_rate + '%';
  var lastAt = d.last_run_at ? new Date(d.last_run_at).toLocaleString() : '—';
  var metrics = d.metrics || {};

  var metaKeys = PLATFORM_METRIC_KEYS[f] || [];
  var metaRows = metaKeys.map(function (mk) {
    var v = metrics[mk.k];
    if (v === null || v === undefined) return '';
    return '<div class="sp-pstat"><div class="sp-mlabel">' + esc(spT(mk.l)) + '</div>'
      + '<div class="sp-pval">' + esc(_fmt(v)) + '</div></div>';
  }).filter(Boolean).join('');

  var sparkBars = '';
  if (d.runs > 0) {
    var total = Math.max(d.runs, 1);
    var okPct  = d.success_rate != null ? d.success_rate : 0;
    var heights = [30, 55, 45, 70, 80, okPct, 90, 65, 75, 85];
    sparkBars = heights.map(function (h, i) {
      var active = i >= heights.length - 3 ? ' active' : '';
      return '<div class="sp-spark-bar' + active + '" style="height:' + Math.max(4, Math.round(h * 0.28)) + 'px"></div>';
    }).join('');
  }

  var onlineStr = d.online + '/' + d.integrations;
  w.hidden = false;
  w.innerHTML =
    '<div class="sp-phead">' + icon(PLATFORM_ICON[f] || 'i-grid') +
    '<b>' + esc(f) + '</b>' +
    '<span>' + esc(onlineStr) + ' online</span>' +
    '</div>' +
    '<div class="sp-pgrid">' +
    '<div class="sp-pstat"><div class="sp-mlabel">' + esc(spT('s_runs')) + '</div><div class="sp-pval">' + esc(String(d.runs || 0)) + '</div></div>' +
    '<div class="sp-pstat"><div class="sp-mlabel">' + esc(spT('s_success_rate')) + '</div><div class="sp-pval">' + esc(rate) + '</div></div>' +
    '<div class="sp-pstat"><div class="sp-mlabel">' + esc(spT('s_last_run')) + '</div><div class="sp-pval text-sm">' + esc(lastAt) + '</div></div>' +
    '<div class="sp-pstat"><div class="sp-mlabel">' + esc(spT('s_failed_short')) + '</div><div class="sp-pval">' + esc(String(d.failed || 0)) + '</div></div>' +
    metaRows +
    '</div>' +
    (sparkBars ? '<div class="sp-sparkline" style="margin-top:12px">' + sparkBars + '</div>' : '') +
    (!d.runs ? '<div class="sp-pempty">' + esc(spT('s_no_data')) + '</div>' : '');
}

async function loadAllRuns() {
  var w2 = document.getElementById('allRuns');
  if (!w2) return;
  try {
    var h = await api('/api/v1/actions/history');
    if (!h || !h.length) {
      w2.innerHTML = '<div class="sp-hist-empty">' + esc(spT('s_no_data')) + '</div>';
      return;
    }
    w2.innerHTML = h.map(function (r) {
      var ts = r.created_at ? new Date(r.created_at).toLocaleString() : '';
      return '<div class="sp-run">' +
        '<span class="sp-run-id">#' + r.id + '</span>' +
        '<span class="sp-run-kind">' + esc(r.kind) + '</span>' +
        '<span class="st ' + esc(r.status) + '">' + esc(spT('st_' + r.status) || r.status) + '</span>' +
        '<span class="sp-run-extra">' + esc(ts) + '</span>' +
        '</div>';
    }).join('');
  } catch (e) {
    w2.innerHTML = '<div class="sp-hist-empty" style="color:var(--fg2)">' + esc(e.message || String(e)) + '</div>';
  }
}

function renderCards() {
  var wrap = document.getElementById('cards');
  if (!wrap) return;
  var q = ((document.getElementById('searchInput') || {}).value || '').toLowerCase();
  var f = state.filter;
  var list = state.items.filter(function (it) {
    if (f !== 'overview' && f !== 'vault' && f !== 'tasks' && it.platform !== f) return false;
    if (q) {
      var hay = (it.name + ' ' + it.platform + ' ' + (it.external_id || '') +
                 ' ' + ((it.meta_data && it.meta_data.display) || '')).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });

  if (f === 'vault') {
    if (!state.items.length) {
      wrap.innerHTML = _emptyHTML();
      return;
    }
    wrap.innerHTML = state.items.map(function (it) {
      var m = it.masked_credentials || {};
      var rows = Object.keys(m).map(function (k) {
        return '<div class="sp-vault-row"><span class="sp-vault-key">' + esc(k) + '</span><span class="sp-vault-val">' + esc(m[k]) + '</span></div>';
      }).join('') || '<div class="sp-vault-row"><span class="text-mut">—</span></div>';
      return '<article class="sp-card">' +
        '<div><span class="sp-tag"><i></i>VAULT · ' + esc(it.platform) + '</span></div>' +
        '<h3>' + esc(it.name) + '</h3>' +
        '<div style="margin-top:10px">' + rows + '</div>' +
        '<div class="sp-cardrow" style="margin-top:14px">' +
        '<button class="sp-btn ghost" data-open="' + it.id + '">' + esc(spT('open_panel')) + '</button>' +
        '<button class="sp-btn ghost sp-btn sm" data-edit="' + it.id + '" aria-label="' + esc(spT('edit_integ')) + '">' + icon('i-edit') + '</button>' +
        '<button class="sp-btn ghost sp-btn sm" data-del="' + it.id + '" aria-label="Delete">' + icon('i-trash') + '</button>' +
        '</div></article>';
    }).join('');
  } else if (f === 'tasks') {
    wrap.innerHTML = '<article class="sp-card" style="grid-column:1/-1">' +
      '<h3>' + esc(spT('tasks')) + '</h3>' +
      '<div id="allRuns" class="sp-hist"></div>' +
      '</article>';
    loadAllRuns();
  } else {
    if (!list.length) {
      wrap.innerHTML = _emptyHTML(f !== 'overview' && f !== state.filter);
    } else {
      wrap.innerHTML = list.map(function (it, idx) { return cardHTML(it, idx); }).join('');
    }
  }

  wrap.querySelectorAll('[data-open]').forEach(function (b) {
    b.onclick = function () { openPanel(parseInt(b.getAttribute('data-open'), 10)); };
  });
  wrap.querySelectorAll('[data-edit]').forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      var integ = state.items.find(function (it) { return it.id === parseInt(b.getAttribute('data-edit'), 10); });
      if (integ) openAdd(integ);
    };
  });
  wrap.querySelectorAll('[data-check]').forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      checkInteg(parseInt(b.getAttribute('data-check'), 10));
    };
  });
  wrap.querySelectorAll('[data-del]').forEach(function (b) {
    b.onclick = function () { delInteg(parseInt(b.getAttribute('data-del'), 10)); };
  });
  wrap.querySelectorAll('.sp-card[tabindex]').forEach(function (card) {
    card.onkeydown = function (e) {
      if (e.target && e.target.closest && e.target.closest('button, a, input, select, textarea')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var id = parseInt(card.getAttribute('data-id'), 10);
        if (id) openPanel(id);
      }
    };
  });
}

function _emptyHTML(filtered) {
  if (filtered) {
    return '<div class="sp-empty">' + icon('i-search', 'xl') +
      '<div><strong>' + esc(spT('no_integ')) + '</strong>' +
      esc(spT('no_integ_sub')) + '</div></div>';
  }
  return '<div class="sp-empty" style="grid-column:1/-1">' + icon('i-layers', 'xl') +
    '<div><strong>' + esc(spT('no_integ')) + '</strong>' +
    esc(spT('no_integ_sub')) + '</div>' +
    '<button class="sp-btn" style="width:auto;padding:11px 24px" id="emptyAddBtn">' +
    icon('i-plus') + ' ' + esc(spT('a_add')) + '</button></div>';
}

async function checkInteg(id) {
  var btn = document.querySelector('[data-check="' + id + '"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="sp-loader sm"></span>'; }
  try {
    await api('/api/v1/integrations/' + id + '/check', { method: 'POST', body: {} });
    toastOk(spT('check_ok'));
    await reload();
  } catch (e) {
    toastErr((spT('check_fail') || 'Error') + ': ' + (e.message || e));
    await reload();
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = icon('i-refresh'); }
  }
}

async function delInteg(id) {
  try {
    var confirmed = await spConfirm({
      title: spT('confirm_title'),
      message: spT('confirm_del'),
      confirmLabel: spT('confirm'),
      cancelLabel: spT('cancel')
    });
    if (!confirmed) return;
    await api('/api/v1/integrations/' + id, { method: 'DELETE', json: false });
    toastOk(spT('del_ok'));
    await reload();
  } catch (e) { toastErr(e.message || String(e)); }
}

function spConfirm(options) {
  options = options || {};
  var root = document.getElementById('browserDialogRoot');
  if (!root) return Promise.reject(new Error('Confirmation dialog root is missing'));
  if (root.firstElementChild) return Promise.reject(new Error('A confirmation dialog is already open'));

  var previousFocus = document.activeElement;
  var title = options.title || spT('confirm_title');
  var message = options.message || '';
  var confirmLabel = options.confirmLabel || spT('confirm');
  var cancelLabel = options.cancelLabel || spT('cancel');

  root.innerHTML =
    '<div class="sp-modal sp-confirm-modal">' +
    '<div class="sp-back" data-confirm-back tabindex="-1"></div>' +
    '<section class="sp-confirm-window" role="dialog" aria-modal="true" aria-labelledby="spConfirmTitle" aria-describedby="spConfirmMessage">' +
    '<div class="sp-confirm-mark" aria-hidden="true">' + icon('i-trash') + '</div>' +
    '<div class="sp-confirm-copy">' +
    '<h2 id="spConfirmTitle">' + esc(title) + '</h2>' +
    '<p id="spConfirmMessage">' + esc(message) + '</p>' +
    '</div>' +
    '<div class="sp-confirm-actions">' +
    '<button class="sp-confirm-cancel" type="button" data-confirm-cancel>' + esc(cancelLabel) + '</button>' +
    '<button class="sp-confirm-accept" type="button" data-confirm-accept>' + esc(confirmLabel) + '</button>' +
    '</div>' +
    '</section>' +
    '</div>';

  return new Promise(function (resolve) {
    var layer = root.querySelector('.sp-confirm-modal');
    var backdrop = root.querySelector('[data-confirm-back]');
    var cancelButton = root.querySelector('[data-confirm-cancel]');
    var acceptButton = root.querySelector('[data-confirm-accept]');
    var settled = false;

    function finish(confirmed) {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeydown, true);
      layer.classList.add('is-closing');
      window.setTimeout(function () {
        if (root.contains(layer)) layer.remove();
        if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
        resolve(confirmed);
      }, 160);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
        return;
      }
      if (event.key !== 'Tab') return;
      event.preventDefault();
      (event.shiftKey ? acceptButton : cancelButton).focus();
    }

    backdrop.addEventListener('click', function () { finish(false); });
    cancelButton.addEventListener('click', function () { finish(false); });
    acceptButton.addEventListener('click', function () { finish(true); });
    document.addEventListener('keydown', onKeydown, true);
    cancelButton.focus();
  });
}

function modal(html, offsetClass) {
  var root = document.getElementById('modalRoot');
  if (!root) return;
  root.innerHTML =
    '<div class="sp-modal" role="dialog" aria-modal="true">' +
    '<div class="sp-back" data-close tabindex="-1"></div>' +
    '<div class="sp-win ' + (offsetClass || 'offset') + '">' + html + '</div>' +
    '</div>';
  root.querySelector('[data-close]').onclick = closeModal;
  var xBtn = root.querySelector('[data-x]');
  if (xBtn) xBtn.onclick = closeModal;
  setTimeout(function () {
    var first = root.querySelector('input,textarea,select,button:not([data-close]):not([data-x])');
    if (first) first.focus();
  }, 50);
}

function closeModal() {
  var root = document.getElementById('modalRoot');
  if (!root) return;
  var modalElement = root.querySelector('.sp-modal');
  var win = root.querySelector('.sp-win');
  if (win) {
    win.style.transition = 'opacity .2s ease, transform .2s ease';
    win.style.opacity = '0';
    win.style.transform = 'scale(.96) translateY(8px)';
  }
  setTimeout(function () {
    if (modalElement && root.contains(modalElement)) modalElement.remove();
  }, 220);
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});

function credFields(p, required) {
  var req = required ? ' required' : '';
  var requiredLabel = required ? ' *' : '';
  var keepHint = required ? '' : spT('cred_keep_hint');
  if (p === 'telegram') {
    return '<div><label class="sp-form-label">bot_token' + requiredLabel + '</label>' +
      '<input type="password" name="bot_token" placeholder="' + esc(required ? '123456:ABCdef...' : keepHint) + '"' + req + ' autocomplete="new-password" spellcheck="false"></div>' +
      '<div><label class="sp-form-label">chat_id</label>' +
      '<input name="chat_id" placeholder="-100123456789 (optional)" autocomplete="off"></div>' +
      '<div><label class="sp-form-label">chat_ids (JSON array)</label>' +
      '<input name="chat_ids_raw" placeholder=\'["-100123456", "@channel"]\' autocomplete="off"></div>';
  }
  if (p === 'discord') {
    return '<div><label class="sp-form-label">bot_token' + requiredLabel + '</label>' +
      '<input type="password" name="bot_token" placeholder="' + esc(required ? 'MTxxxxxxxx.Gxxxxxx.xxxxxxxxxxxx' : keepHint) + '"' + req + ' autocomplete="new-password" spellcheck="false"></div>' +
      '<div><label class="sp-form-label">guild_id</label>' +
      '<input name="guild_id" placeholder="Server ID (optional)" autocomplete="off"></div>' +
      '<div><label class="sp-form-label">channel_id</label>' +
      '<input name="channel_id" placeholder="Channel ID (optional)" autocomplete="off"></div>';
  }
  return '<div><label class="sp-form-label">api_key' + requiredLabel + '</label>' +
    '<input type="password" name="api_key" placeholder="' + esc(required ? 'AIzaSy...' : keepHint) + '"' + req + ' autocomplete="new-password" spellcheck="false"></div>' +
    '<div><label class="sp-form-label">channel_id' + requiredLabel + '</label>' +
    '<input name="channel_id" placeholder="UCxxxxxxxxxxxxxxxx"' + req + ' autocomplete="off"></div>';
}

function openAdd(existing) {
  var isEdit = Boolean(existing);
  var platform = isEdit ? existing.platform : 'telegram';
  var needsCredentialRecovery = isEdit && existing.credentials_available === false;
  var recoveryHint = needsCredentialRecovery
    ? '<div class="sp-credential-recovery" data-i18n="credentials_recovery_hint"></div>'
    : '';
  var html =
    '<div class="sp-winhead">' +
    '<h2>' + icon(isEdit ? 'i-edit' : 'i-plus') + ' ' + esc(spT(isEdit ? 'edit_integ' : 'add_integ')) + '</h2>' +
    '<button class="sp-x" data-x aria-label="Close">' + icon('i-x') + '</button>' +
    '</div>' +
    '<form id="addForm" class="sp-form" autocomplete="off" novalidate style="gap:14px">' +
    '<div>' +
    '<label class="sp-form-label" for="platformSel" data-i18n="telegram">Платформа</label>' +
    '<select name="platform" id="platformSel"' + (isEdit ? ' disabled' : '') + '>' +
    '<option value="telegram">Telegram</option>' +
    '<option value="discord">Discord</option>' +
    '<option value="youtube">YouTube</option>' +
    '</select>' +
    '</div>' +
    '<div>' +
    '<label class="sp-form-label" for="addName" data-i18n="ph_name">Назва</label>' +
    '<input id="addName" name="name" data-i18n-ph="ph_name" placeholder="My Bot" value="' + esc(isEdit ? existing.name : '') + '" required minlength="2" maxlength="128">' +
    '</div>' +
    '<div id="credBox" style="display:contents"></div>' +
    recoveryHint +
    (isEdit && !needsCredentialRecovery ? '<div class="text-xs text-mut" data-i18n="edit_secret_hint"></div>' : '') +
    '<div id="addErr" style="display:none;font-size:13px;color:var(--fg2);padding:10px 13px;border:1px solid var(--line);border-radius:12px;background:var(--bg2)"></div>' +
    '<button type="submit" id="addSubmitBtn" style="min-height:48px;display:flex;align-items:center;justify-content:center;gap:8px">' + esc(spT(isEdit ? 'save' : 'a_add')) + '</button>' +
    '</form>';

  modal(html, 'offset2');

  var sel    = document.getElementById('platformSel');
  var box    = document.getElementById('credBox');
  var form   = document.getElementById('addForm');
  var errBox = document.getElementById('addErr');
  if (isEdit) sel.value = platform;

  function syncCreds() {
    var old = form.querySelectorAll('[data-cred]');
    old.forEach(function(el){ el.remove(); });
    var fragment = document.createElement('div');
    fragment.innerHTML = credFields(sel.value, !isEdit || needsCredentialRecovery);
    var children = Array.from(fragment.children);
    children.forEach(function(child){
      child.setAttribute('data-cred', '1');
      form.insertBefore(child, errBox);
    });
    try { spApplyLang(window.SP_LANG); } catch(e) {}
  }
  sel.onchange = syncCreds;
  syncCreds();
  if (needsCredentialRecovery) {
    var recoverySecrets = form.querySelectorAll('input[name="bot_token"], input[name="api_key"]');
    recoverySecrets.forEach(function (field) {
      field.readOnly = true;
      field.onfocus = function () {
        field.readOnly = false;
        field.value = '';
        field.onfocus = null;
      };
    });
  }

  form.onsubmit = async function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var btn = document.getElementById('addSubmitBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="sp-loader sm"></span>'; }
    errBox.style.display = 'none';

    var fd = new FormData(form);
    var creds = {};
    var selectedPlatform = isEdit ? platform : String(fd.get('platform') || 'telegram');
    var name = String(fd.get('name') || '').trim();

    ['bot_token', 'api_key', 'chat_id', 'guild_id', 'channel_id'].forEach(function (k) {
      var v = fd.get(k);
      if (v && String(v).trim()) creds[k] = String(v).trim();
    });

    var chatIdsRaw = fd.get('chat_ids_raw');
    if (chatIdsRaw && chatIdsRaw.trim()) {
      try {
        var arr = JSON.parse(chatIdsRaw.trim());
        if (Array.isArray(arr) && arr.length) creds.chat_ids = arr;
      } catch (_) {
        if (chatIdsRaw.trim().charAt(0) === '[') {
          errBox.textContent = spT('invalid_chat_ids');
          errBox.style.display = 'block';
          if (btn) { btn.disabled = false; btn.innerHTML = spT(isEdit ? 'save' : 'a_add'); }
          return;
        }
        creds.chat_ids = chatIdsRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      }
    }

    try {
      var saved = await api(isEdit ? '/api/v1/integrations/' + existing.id : '/api/v1/integrations', {
        method: isEdit ? 'PATCH' : 'POST',
        body: isEdit
          ? { name: name, credentials: Object.keys(creds).length ? creds : undefined }
          : { platform: selectedPlatform, name: name, credentials: creds }
      });
      closeModal();
      if (saved.status === 'active') toastOk(spT(isEdit ? 'integ_updated' : 'integ_added'));
      else toastErr(spT(isEdit ? 'integ_update_failed' : 'integ_added_unverified') + ': ' +
        ((saved.meta_data && saved.meta_data.error) || spT('check_fail')));
      await reload();
    } catch (err) {
      var errorMessage = err.message || String(err);
      if (/Saved credentials cannot be decrypted/i.test(errorMessage)) {
        errorMessage = spT('credentials_recovery_error');
      }
      errBox.textContent = errorMessage;
      errBox.style.display = 'block';
      errBox.classList.add('shake');
      setTimeout(function () { errBox.classList.remove('shake'); }, 500);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = spT(isEdit ? 'save' : 'a_add'); }
    }
  };
}

function spSrc(s) {
  s = String(s || 'sys').toLowerCase();
  var m = {
    te: 'TG', tg: 'TG', telegram: 'TG',
    di: 'DS', ds: 'DS', discord: 'DS',
    yo: 'YT', yt: 'YT', youtube: 'YT',
    sys: 'SYS', system: 'SYS'
  };
  return m[s] || s.toUpperCase().slice(0, 4);
}

function feedAdd(level, source, msg, time) {
  var f = document.getElementById('feed');
  if (!f) return;

  while (f.children.length >= 80) f.lastChild.remove();

  var d = document.createElement('div');
  d.className = 'sp-feed-item';

  if (typeof msg === 'string' && msg.charAt(0) === '{') {
    try {
      var j = JSON.parse(msg);
      if (j.message) msg = j.message;
      if (j.source) source = j.source;
      if (j.status === 'failed') level = 'error';
      if (j.status === 'success') level = 'success';
    } catch (ex) {}
  }

  var hh = new Date(time || Date.now());
  var ts = isNaN(hh.getTime()) ? '--:--:--' : hh.toLocaleTimeString();

  d.innerHTML =
    '<span class="sp-feed-ts">' + esc(ts) + '</span>' +
    '<span class="sp-feed-src">' + esc(spSrc(source)) + '</span>' +
    '<span class="sp-feed-msg">' + esc(String(msg || '')) + '</span>';

  if (level === 'error' || level === 'failed') d.classList.add('e-err');
  else if (level === 'success') d.classList.add('e-ok');
  else if (source === 'sys' || source === 'system') d.classList.add('e-sys');

  f.prepend(d);
}

var _wsInstance = null;
var _wsReconnectTimer = null;

function connectWS() {
  var t = tok();
  if (!t) return;
  if (_wsInstance && _wsInstance.readyState <= 1) return;

  var proto = location.protocol === 'https:' ? 'wss' : 'ws';
  var url = proto + '://' + location.host + '/ws/feed';
  var ws = null;

  try { ws = new WebSocket(url, ['streampulse', 'sp-auth.' + t]); } catch (ex) { return; }

  _wsInstance = ws;

  var elState = document.getElementById('wsState');
  var dot = document.getElementById('netDot');

  ws.onopen = function () {
    state.wsReady = true;
    if (elState) { elState.textContent = 'LIVE'; elState.className = 'sp-ws live'; }
    if (dot) dot.className = 'sp-dot ok';
    if (_wsReconnectTimer) { clearTimeout(_wsReconnectTimer); _wsReconnectTimer = null; }
  };

  ws.onclose = function () {
    state.wsReady = false;
    if (elState) { elState.textContent = 'OFF'; elState.className = 'sp-ws'; }
    if (dot) dot.className = 'sp-dot bad';
    _wsInstance = null;
    _wsReconnectTimer = setTimeout(connectWS, 4500);
  };

  ws.onerror = function () {
    try { ws.close(); } catch (ex) {}
  };

  ws.onmessage = function (ev) {
    try {
      var m = JSON.parse(ev.data);
      if (m.type === 'event' || m.type === 'task') {
        feedAdd(
          m.level || (m.status === 'failed' ? 'error' : m.status === 'success' ? 'success' : 'info'),
          m.source || 'sys',
          m.message || '',
          m.created_at || null
        );
        if (m.type === 'task' && (m.status === 'success' || m.status === 'failed')) {
          reload();
        }
      }
    } catch (ex) {}
  };
}

var _reloadLock = false;

async function reload() {
  if (_reloadLock || document.hidden) return;
  _reloadLock = true;
  try {
    var results = await Promise.allSettled([
      api('/api/v1/stats'),
      api('/api/v1/integrations'),
      api('/api/v1/stats/platforms'),
      api('/api/v1/auth/me')
    ]);

    if (results[0].status === 'fulfilled') renderMetrics(results[0].value);
    if (results[1].status === 'fulfilled') {
      state.items = results[1].value;
      renderCards();
    }
    if (results[2].status === 'fulfilled') {
      state.pstats = results[2].value;
      renderPstats();
    }
    if (results[3].status === 'fulfilled') {
      var me = results[3].value;
      state.user = me;
      var nameEl = document.getElementById('userName');
      if (nameEl) nameEl.textContent = me.username;
      if (me.lang && me.lang !== window.SP_LANG) {
        try { spApplyLang(me.lang); } catch (_) {}
      }
      if (me.theme && me.theme !== spTheme()) {
        try { spSetTheme(me.theme); } catch (_) {}
      }
      var dn = document.getElementById('dropUserName');
      var de = document.getElementById('dropUserEmail');
      var dr = document.getElementById('dropRole');
      var ds = document.getElementById('dropSince');
      if (dn) dn.textContent = me.username || '—';
      if (de) de.textContent = me.email || '—';
      if (dr) dr.textContent = me.is_admin ? 'Admin' : 'User';
      if (ds) ds.textContent = me.created_at ? new Date(me.created_at).toLocaleDateString() : '—';
    }
  } finally {
    _reloadLock = false;
  }
}

window.spRenderAll = function () {
  try { renderCards(); } catch (e) {}
  try { renderPstats(); } catch (e) {}
};

function _emsg(j) {
  if (!j) return 'Error';
  if (typeof j.detail === 'string') return j.detail;
  if (j.detail && Array.isArray(j.detail) && j.detail[0] && j.detail[0].msg) return j.detail[0].msg;
  return 'Error';
}

function initLoginForm() {
  var form = document.getElementById('loginForm');
  if (!form) return;

  var toggler = document.getElementById('togglePass');
  var passInput = document.getElementById('loginPass');
  if (toggler && passInput) {
    toggler.onclick = function () {
      var isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
    };
  }

  var errBox = document.getElementById('loginError');
  var btnTxt = document.getElementById('loginBtnTxt');
  var btnSpinner = document.getElementById('loginBtnSpinner');
  var btn = document.getElementById('loginBtn');

  function showErr(msg) {
    if (!errBox) return;
    errBox.textContent = msg;
    errBox.style.display = 'block';
    errBox.classList.add('shake');
    setTimeout(function () { errBox.classList.remove('shake'); }, 500);
  }

  function setLoading(v) {
    if (btn) btn.disabled = v;
    if (btnTxt) btnTxt.style.display = v ? 'none' : '';
    if (btnSpinner) btnSpinner.style.display = v ? 'inline-flex' : 'none';
  }

  form.onsubmit = async function (e) {
    e.preventDefault();
    if (errBox) errBox.style.display = 'none';
    setLoading(true);
    var fd = new FormData(form);
    try {
      var r = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:    String(fd.get('email')    || '').trim(),
          password: String(fd.get('password') || '')
        })
      });
      var j = null;
      try { j = await r.json(); } catch (_) {}
      if (!r.ok) { showErr(_emsg(j)); return; }
      if (!j || !j.access_token) { showErr('Login failed'); return; }
      stok(j.access_token);
      try { sessionStorage.setItem('sp_session_started_at', String(Date.now())); } catch (ex) {}
      try { localStorage.setItem('sp_seen', '1'); } catch (ex) {}
      if (j.user) {
        if (j.user.lang) { try { spApplyLang(j.user.lang); } catch (_) {} }
        if (j.user.theme) { try { spSetTheme(j.user.theme); } catch (_) {} }
      }
      location.replace('/dashboard?fresh=1');
    } catch (err) {
      var m = String(err.message || err);
      if (/invalid credentials/i.test(m)) {
        try { m += ' — ' + spT('login_hint'); } catch (_) {}
      }
      showErr(m);
    } finally {
      setLoading(false);
    }
  };
}

function _passStrength(pw) {
  var score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; 
}

function initRegisterForm() {
  var form = document.getElementById('registerForm');
  if (!form) return;

  var toggler = document.getElementById('toggleRegPass');
  var passInput = document.getElementById('regPass');
  if (toggler && passInput) {
    toggler.onclick = function () {
      passInput.type = passInput.type === 'password' ? 'text' : 'password';
    };
  }

  var strengthWrap = document.getElementById('passStrength');
  var strengthBar  = document.getElementById('passStrengthBar');
  if (passInput && strengthWrap && strengthBar) {
    passInput.addEventListener('input', function () {
      var pw = passInput.value;
      if (!pw) { strengthWrap.style.display = 'none'; return; }
      strengthWrap.style.display = 'block';
      var score = _passStrength(pw);
      var pct = Math.round(score / 5 * 100);
      strengthBar.style.width = pct + '%';
      if (score <= 1) strengthBar.style.background = 'var(--mut)';
      else if (score <= 3) strengthBar.style.background = 'var(--fg2)';
      else strengthBar.style.background = 'var(--fg)';
    });
  }

  var errBox = document.getElementById('regError');
  var btnTxt = document.getElementById('regBtnTxt');
  var btnSpinner = document.getElementById('regBtnSpinner');
  var btn = document.getElementById('regBtn');

  function showErr(msg) {
    if (!errBox) return;
    errBox.textContent = msg;
    errBox.style.display = 'block';
    errBox.classList.add('shake');
    setTimeout(function () { errBox.classList.remove('shake'); }, 500);
  }

  function setLoading(v) {
    if (btn) btn.disabled = v;
    if (btnTxt) btnTxt.style.display = v ? 'none' : '';
    if (btnSpinner) btnSpinner.style.display = v ? 'inline-flex' : 'none';
  }

  form.onsubmit = async function (e) {
    e.preventDefault();
    if (errBox) errBox.style.display = 'none';
    setLoading(true);
    var fd = new FormData(form);
    try {
      var r = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: String(fd.get('username') || '').trim(),
          email:    String(fd.get('email')    || '').trim(),
          password: String(fd.get('password') || '')
        })
      });
      var j = null;
      try { j = await r.json(); } catch (_) {}
      if (!r.ok) {
        var msg = _emsg(j);
        showErr(msg);
        if (/already/i.test(msg)) {
          setTimeout(function () { location.replace('/login'); }, 1800);
        }
        return;
      }
      if (!j || !j.access_token) { showErr('Registration failed'); return; }
      stok(j.access_token);
      try { sessionStorage.setItem('sp_session_started_at', String(Date.now())); } catch (ex) {}
      try { localStorage.setItem('sp_seen', '1'); } catch (ex) {}
      if (j.user) {
        if (j.user.lang) { try { spApplyLang(j.user.lang); } catch (_) {} }
        if (j.user.theme) { try { spSetTheme(j.user.theme); } catch (_) {} }
      }
      location.replace('/dashboard?fresh=1');
    } catch (err) {
      showErr(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };
}

function initMouseVeil() {
  try {
    var veil = document.createElement('div');
    veil.className = 'sp-lightveil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);

    var px = innerWidth / 2, py = innerHeight / 4;
    var tx = px, ty = py;
    var raf = 0;

    function tick() {
      px += (tx - px) * 0.07;
      py += (ty - py) * 0.07;
      document.documentElement.style.setProperty('--mx', px + 'px');
      document.documentElement.style.setProperty('--my', py + 'px');
      var dx = Math.abs(tx - px), dy = Math.abs(ty - py);
      if (dx > 0.5 || dy > 0.5) raf = requestAnimationFrame(tick);
      else raf = 0;
    }

    document.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  } catch (e) {}
}

function initNav() {
  document.querySelectorAll('[data-nav]').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('[data-nav]').forEach(function (x) {
        x.classList.remove('is-active');
        x.setAttribute('aria-current', 'false');
      });
      b.classList.add('is-active');
      b.setAttribute('aria-current', 'page');
      state.filter = b.getAttribute('data-nav');
      renderCards();
      renderPstats();
    };
  });
}

function initSearch() {
  var si = document.getElementById('searchInput');
  if (si) {
    si.oninput = function () { renderCards(); };
  }
}

function initLogout() {
  var lo = document.getElementById('logoutBtn');
  if (lo) {
    lo.onclick = function () {
      clearTok();
      location.href = '/login';
    };
  }
}

function initAddBtn() {
  var ab = document.getElementById('addBtn');
  if (ab) ab.onclick = function () { openAdd(); };
  document.addEventListener('click', function (e) {
    var target = e.target;
    var button = target && target.closest ? target.closest('#emptyAddBtn') : null;
    if (button) openAdd();
  });
}

var _refreshInterval = null;

function startAutoRefresh() {
  if (_refreshInterval) clearInterval(_refreshInterval);
  _refreshInterval = setInterval(reload, 30000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) reload();
  });
}

function initSidebarBackdrop() {
  var sidebar = document.getElementById('sidebar');
  var burger = document.querySelector('.sp-burger');
  if (!sidebar || !burger) return;

  function closeSidebar() {
    sidebar.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }

  burger.addEventListener('click', function () {
    var open = sidebar.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', function (e) {
    if (!sidebar.classList.contains('open')) return;
    if (!sidebar.contains(e.target) && !burger.contains(e.target)) closeSidebar();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
  });
}

function initDashboard() {
  if (isAuthPage()) return;
  if (!document.getElementById('cards')) return;
  needAuth();
  initNav();
  initSearch();
  initLogout();
  initAddBtn();
  initSidebarBackdrop();
  reload();
  connectWS();
  startAutoRefresh();
}

function initAuthPage() {
  if (!isAuthPage()) return;
  if (tok()) {
    location.replace('/dashboard');
    return;
  }
  initLoginForm();
  initRegisterForm();
}

function initLanding() {
  if (location.pathname !== '/') return;
  if (tok()) {
    location.replace('/dashboard');
    return;
  }

  var curtain = document.querySelector('.sp-page-curtain');
  if (!curtain || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('[data-page-transition]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === '_blank'
      ) return;

      var destination = new URL(link.href, location.href);
      if (destination.origin !== location.origin) return;

      event.preventDefault();
      curtain.classList.add('is-closing');
      setTimeout(function () {
        location.assign(destination.href);
      }, 600);
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initMouseVeil();
  spWelcome();
  initLanding();
  initAuthPage();
  initDashboard();
});

window.tok    = tok;
window.stok   = stok;
window.api    = api;
window.toast  = toast;
window.toastOk  = toastOk;
window.toastErr = toastErr;
window.esc    = esc;
window.icon   = icon;
window.modal  = modal;
window.closeModal = closeModal;
window.reload = reload;
window.openPanel = function (id) {
  var it = state.items.find(function (x) { return x.id === id; });
  if (!it) return;
  modal('<div class="sp-winhead"><h2>' + esc(it.name) + '</h2>' +
    '<button class="sp-x" data-x>' + icon('i-x') + '</button></div>' +
    '<div style="padding:20px 0;color:var(--mut);text-align:center">' +
    '<span class="sp-loader lg"></span></div>');
};
window.PLATFORM_ICON = PLATFORM_ICON;
window.state  = state;
window.spSrc  = spSrc;
