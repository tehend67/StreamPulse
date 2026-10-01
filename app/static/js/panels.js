'use strict';

function spPretty(v) {
  try { return JSON.stringify(v, null, 2).slice(0, 6000); } catch (e) { return String(v); }
}

function spStLabel(status) {
  try { return spT('st_' + status) || status; } catch (e) { return status; }
}

function spRunsHTML(h, highlight) {
  if (!h || !h.length) {
    return '<div class="sp-hist-empty">' + esc(spT('s_no_data')) + '</div>';
  }
  return h.slice(0, 20).map(function (r) {
    var errorText = r.error === 'Local task execution failed'
      ? spT('task_local_failed_legacy')
      : r.error;
    var extra = errorText
      ? esc(errorText).slice(0, 120)
      : (r.result ? esc(spPretty(r.result)).slice(0, 120) : '');
    var hl = (r.id === highlight) ? ' style="border-color:var(--fg)"' : '';
    var ts = r.created_at ? new Date(r.created_at).toLocaleString() : '';
    return '<div class="sp-run"' + hl + '>' +
      '<span class="sp-run-id">#' + r.id + '</span>' +
      '<span class="sp-run-kind">' + esc(r.kind) + '</span>' +
      '<span class="st ' + esc(r.status) + '">' + esc(spStLabel(r.status)) + '</span>' +
      '<span class="sp-run-extra" title="' + esc(extra) + '">' + (extra || esc(ts)) + '</span>' +
      '</div>';
  }).join('');
}

var _runThrottle = { last: 0 };

function spRun(integId, kind, params, onDone) {
  var now = Date.now();
  var wait = Math.max(0, 800 - (now - _runThrottle.last));
  _runThrottle.last = now + wait;

  setTimeout(async function () {
    try {
      var r = await api('/api/v1/actions/run', {
        method: 'POST',
        body: { integration_id: integId, kind: kind, params: params || {} }
      });
      toastOk('#' + r.id + ' queued');
      if (typeof onDone === 'function') onDone([], r.id, { status: r.status || 'queued' });

      var tries = 0;
      var consecutiveErrors = 0;
      var maxPolls = 100;
      async function snap() {
        var h = await api('/api/v1/integrations/' + integId + '/runs');
        if (typeof onDone === 'function') onDone(h, r.id);
        return h;
      }

      var initialRuns = await snap();
      var initialRun = initialRuns.find(function (run) { return run.id === r.id; });
      if (initialRun && (initialRun.status === 'success' || initialRun.status === 'failed')) {
        if (typeof onDone === 'function') onDone(initialRuns, r.id, { status: initialRun.status });
        reload();
        return;
      }

      async function poll() {
        await new Promise(function (resolve) { setTimeout(resolve, 1800); });
        tries++;
        var h;
        try {
          h = await snap();
          consecutiveErrors = 0;
        } catch (pollError) {
          consecutiveErrors++;
          if (consecutiveErrors >= 3) {
            toastErr(spT('task_poll_failed') + ': ' + String(pollError.message || pollError));
            if (typeof onDone === 'function') onDone(null, r.id, { error: pollError });
            return;
          }
          poll();
          return;
        }
        var cur = null;
        for (var i = 0; i < h.length; i++) {
          if (h[i].id === r.id) { cur = h[i]; break; }
        }
        if (cur && (cur.status === 'success' || cur.status === 'failed')) {
          if (typeof onDone === 'function') onDone(h, r.id, { status: cur.status });
          reload();
          return;
        }
        if (tries >= maxPolls) {
          toastOk(spT('task_still_running'));
          if (typeof onDone === 'function') onDone(h, r.id, { timeout: true });
          try { reload(); } catch (ex) {}
          return;
        }
        poll();
      }
      poll();

    } catch (e) {
      toastErr(String(e && e.message ? e.message : e));
      if (typeof onDone === 'function') onDone(null, null, { error: e });
    }
  }, wait);
}

function spBtn(kind, labelKey, isPrimary) {
  var label = labelKey;
  try { label = spT(labelKey); } catch (e) {}
  var cls = 'sp-pact' + (isPrimary ? ' primary' : '');
  var iconId = _actionIcon(kind);
  return '<button class="' + cls + '" data-k="' + esc(kind) + '" type="button" aria-pressed="false">' +
    icon(iconId) +
    '<span>' + esc(label) + '</span>' +
    '</button>';
}

function _actionIcon(kind) {
  var m = {
    broadcast: 'i-broadcast', send_message: 'i-mail', stats: 'i-chart',
    chat_info: 'i-info', members: 'i-users', admins: 'i-user',
    webhook_info: 'i-link', commands: 'i-cpu', poll: 'i-activity',
    audit: 'i-layers', guild_info: 'i-info', channels: 'i-chat',
    roles: 'i-key', invites: 'i-link', pins: 'i-lock',
    moderation: 'i-wrench', webhook: 'i-link',
    sync: 'i-refresh', livestream: 'i-video', videos: 'i-play',
    video_info: 'i-info', playlists: 'i-layers', search: 'i-search'
  };
  return m[kind] || 'i-zap';
}

function _resultStats(platform, result) {
  if (!result || typeof result !== 'object') return '';
  var rows = '';

  if (platform === 'telegram') {
    var fields = [
      ['username',     'label_username'],
      ['bot_id',       'ID'],
      ['member_count', 's_members'],
      ['sent',         's_sent'],
      ['failed',       's_failed_short'],
      ['total',        's_total'],
      ['can_join_groups', 'Groups'],
    ];
    rows = fields.map(function (f) {
      var v = result[f[0]];
      if (v === undefined || v === null) return '';
      var label = f[1];
      try { label = spT(f[1]) || f[1]; } catch (e) {}
      return '<div class="sp-statbox"><div class="sp-mlabel">' + esc(label) + '</div>' +
        '<div class="sp-mval">' + esc(String(v).slice(0, 40)) + '</div></div>';
    }).filter(Boolean).join('');
  } else if (platform === 'discord') {
    var fields2 = [
      ['guilds_count', 's_guilds'],
      ['bot',          'Bot'],
      ['count',        's_total'],
      ['roles_count',  'a_roles'],
      ['member_count', 's_members'],
      ['name',         'ph_name'],
    ];
    rows = fields2.map(function (f) {
      var v = result[f[0]];
      if (v === undefined || v === null) return '';
      var label = f[1];
      try { label = spT(f[1]) || f[1]; } catch (e) {}
      return '<div class="sp-statbox"><div class="sp-mlabel">' + esc(label) + '</div>' +
        '<div class="sp-mval">' + esc(String(v).slice(0, 40)) + '</div></div>';
    }).filter(Boolean).join('');

    if (result.guilds && result.guilds.length) {
      rows += '<div class="sp-statbox" style="grid-column:1/-1">' +
        '<div class="sp-mlabel">' + esc(spT('s_guilds')) + '</div>' +
        result.guilds.slice(0, 8).map(function (g) {
          return '<div style="display:flex;gap:8px;align-items:center;margin-top:6px;font-size:13px">' +
            '<span style="font-weight:600">' + esc(g.name || g.id) + '</span>' +
            '<span style="color:var(--mut)">' + (g.member_count != null ? g.member_count + ' ' + spT('s_members') : '') + '</span>' +
            '</div>';
        }).join('') +
        '</div>';
    }
  } else if (platform === 'youtube') {
    var live = result.live || {};
    var fields3 = [
      ['subscribers',  's_subscribers'],
      ['views',        's_views'],
      ['videos',       's_videos_cnt'],
      ['title',        'ph_name'],
      ['live_count',   's_live'],
    ];
    rows = fields3.map(function (f) {
      var v = f[0] === 'live_count' ? live['live_count'] : result[f[0]];
      if (v === undefined || v === null) return '';
      var num = Number(v);
      var disp = !isNaN(num) && num > 999 ? num.toLocaleString() : String(v).slice(0, 40);
      var label = f[1];
      try { label = spT(f[1]) || f[1]; } catch (e) {}
      return '<div class="sp-statbox"><div class="sp-mlabel">' + esc(label) + '</div>' +
        '<div class="sp-mval">' + esc(disp) + '</div></div>';
    }).filter(Boolean).join('');

    if (live.is_live !== undefined) {
      rows = '<div class="sp-statbox"><div class="sp-mlabel">' + esc(spT('s_live')) + '</div>' +
        '<div class="sp-mval">' + (live.is_live ? '✓ Live' : '—') + '</div></div>' + rows;
    }

    if (result.videos && result.videos.length) {
      rows += '<div class="sp-statbox" style="grid-column:1/-1">' +
        '<div class="sp-mlabel">' + esc(spT('s_videos_cnt')) + '</div>' +
        result.videos.slice(0, 6).map(function (v2) {
          return '<div style="display:flex;gap:8px;align-items:baseline;margin-top:6px;font-size:12px">' +
            '<span style="font-weight:600;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(v2.title || v2.video_id) + '</span>' +
            (v2.views ? '<span style="color:var(--mut)">' + Number(v2.views).toLocaleString() + ' views</span>' : '') +
            '</div>';
        }).join('') +
        '</div>';
    }
  }

  if (!rows) return '';
  return '<div class="sp-statgrid" style="margin-top:14px">' + rows + '</div>';
}

function paramsFor(it, kind) {
  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  if (it.platform === 'telegram') {
    var chatId = val('pChat');
    if (kind === 'poll') {
      var q = val('pPollQ');
      var raw = val('pPollO');
      var opts = raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      return { question: q, options: opts, chat_id: chatId || undefined };
    }
    if (kind === 'broadcast' || kind === 'send_message') {
      return { text: val('pText'), chat_id: chatId || undefined };
    }
    if (kind === 'chat_info' || kind === 'members' || kind === 'admins') {
      return { chat_id: chatId || undefined };
    }
    return {};
  }

  if (it.platform === 'discord') {
    if (kind === 'send_message') {
      var text = val('pText');
      return { text: text, content: text, channel_id: val('pChan') || undefined };
    }
    if (kind === 'audit' || kind === 'guild_info' || kind === 'channels' ||
        kind === 'roles' || kind === 'invites' || kind === 'moderation') {
      return { guild_id: val('pGuild') || undefined };
    }
    if (kind === 'webhook' || kind === 'pins') {
      return { channel_id: val('pChan') || undefined };
    }
    return {};
  }

  if (kind === 'search') return { query: val('pQ') };
  if (kind === 'video_info') return { video_id: val('pVid') };
  if (kind === 'videos') return { limit: Number(val('pLimit')) || 10 };
  return {};
}

function buildPanelForm(it, kind) {
  var T = function (k) { try { return spT(k); } catch (e) { return k; } };
  var fields = '';

  if (it.platform === 'telegram') {
    if (kind === 'broadcast' || kind === 'send_message') {
      fields = '<div><label class="sp-form-label" for="pText" data-i18n="ph_text">Message text</label>' +
        '<textarea id="pText" rows="3" required maxlength="4096" data-i18n-ph="ph_text" placeholder="' + esc(T('ph_text')) + '"></textarea></div>';
    } else if (kind === 'poll') {
      fields = '<div><label class="sp-form-label" for="pPollQ" data-i18n="ph_poll_q">Poll question</label>' +
        '<input id="pPollQ" required maxlength="300" data-i18n-ph="ph_poll_q" placeholder="' + esc(T('ph_poll_q')) + '"></div>' +
        '<div><label class="sp-form-label" for="pPollO" data-i18n="ph_poll_o">Options, comma-separated</label>' +
        '<input id="pPollO" required data-i18n-ph="ph_poll_o" placeholder="' + esc(T('ph_poll_o')) + '"></div>';
    }
    if (kind === 'broadcast' || kind === 'send_message' || kind === 'poll' ||
        kind === 'chat_info' || kind === 'members' || kind === 'admins') {
      fields += '<div><label class="sp-form-label" for="pChat" data-i18n="ph_chat">Chat or channel</label>' +
        '<input id="pChat" data-i18n-ph="ph_chat" placeholder="' + esc(T('ph_chat')) + '"></div>';
    }
  } else if (it.platform === 'discord') {
    if (kind === 'send_message') {
      fields = '<div><label class="sp-form-label" for="pText" data-i18n="ph_text">Message text</label>' +
        '<textarea id="pText" rows="3" required maxlength="2000" data-i18n-ph="ph_text" placeholder="' + esc(T('ph_text')) + '"></textarea></div>' +
        '<div><label class="sp-form-label" for="pChan" data-i18n="ph_channel">Channel ID</label>' +
        '<input id="pChan" required inputmode="numeric" data-i18n-ph="ph_channel" placeholder="' + esc(T('ph_channel')) + '"></div>';
    } else if (kind === 'audit' || kind === 'guild_info' || kind === 'channels' ||
               kind === 'roles' || kind === 'invites' || kind === 'moderation') {
      fields = '<div><label class="sp-form-label" for="pGuild" data-i18n="ph_guild">Server ID</label>' +
        '<input id="pGuild" inputmode="numeric" data-i18n-ph="ph_guild" placeholder="' + esc(T('ph_guild')) + '"></div>';
    } else if (kind === 'webhook' || kind === 'pins') {
      fields = '<div><label class="sp-form-label" for="pChan" data-i18n="ph_channel">Channel ID</label>' +
        '<input id="pChan" required inputmode="numeric" data-i18n-ph="ph_channel" placeholder="' + esc(T('ph_channel')) + '"></div>';
    }
  } else if (kind === 'search') {
    fields = '<div><label class="sp-form-label" for="pQ" data-i18n="ph_query">Search query</label>' +
      '<input id="pQ" required data-i18n-ph="ph_query" placeholder="' + esc(T('ph_query')) + '"></div>';
  } else if (kind === 'video_info') {
    fields = '<div><label class="sp-form-label" for="pVid" data-i18n="ph_video">Video ID</label>' +
      '<input id="pVid" required data-i18n-ph="ph_video" placeholder="' + esc(T('ph_video')) + '"></div>';
  } else if (kind === 'videos') {
    fields = '<div><label class="sp-form-label" for="pLimit" data-i18n="ph_limit">Result limit</label>' +
      '<input id="pLimit" type="number" min="1" max="50" value="10" data-i18n-ph="ph_limit" placeholder="10"></div>';
  }

  var hasFields = Boolean(fields);
  return '<form id="panelActionForm" class="sp-form sp-action-form' + (hasFields ? '' : ' is-empty') + '" novalidate>' +
    (hasFields ? fields : '<p class="sp-action-hint" data-i18n="no_action_fields">' + esc(T('no_action_fields')) + '</p>') +
    '<button id="runSelectedBtn" class="sp-btn sp-run-selected" type="submit" data-i18n="run_selected">' + esc(T('run_selected')) + '</button>' +
    '</form>';
}

function buildActionGrid(it) {
  if (it.platform === 'telegram') {
    return '<div class="sp-panel-actions">' +
      spBtn('broadcast',    'a_broadcast',   false) +
      spBtn('send_message', 'a_send',        false) +
      spBtn('stats',        'a_stats') +
      spBtn('chat_info',    'a_chat_info') +
      spBtn('members',      'a_members') +
      spBtn('admins',       'a_admins') +
      spBtn('webhook_info', 'a_webhook') +
      spBtn('commands',     'a_commands') +
      spBtn('poll',         'a_poll') +
      '</div>';
  }
  if (it.platform === 'discord') {
    return '<div class="sp-panel-actions">' +
      spBtn('send_message', 'a_send',        false) +
      spBtn('audit',        'a_audit',       false) +
      spBtn('guild_info',   'a_guild_info') +
      spBtn('channels',     'a_channels') +
      spBtn('roles',        'a_roles') +
      spBtn('moderation',   'a_moderation') +
      spBtn('invites',      'a_invites') +
      spBtn('pins',         'a_pins') +
      spBtn('webhook',      'a_webhooks') +
      '</div>';
  }
  return '<div class="sp-panel-actions">' +
    spBtn('sync',       'a_sync',       false) +
    spBtn('livestream', 'a_live',       false) +
    spBtn('videos',     'a_videos') +
    spBtn('playlists',  'a_playlists') +
    spBtn('search',     'a_search') +
    spBtn('video_info', 'a_video_info') +
    '</div>';
}

window.openPanel = async function (id) {
  var it = state.items.find(function (x) { return x.id === id; });
  if (!it) return;

  var T = function (k) { try { return spT(k); } catch (e) { return k; } };

  var isOk = it.status === 'active';
  var stTag = isOk
    ? '<span class="sp-tag ok" style="margin-left:8px"><i></i>' + esc(T('s_online')) + '</span>'
    : '<span class="sp-tag" style="margin-left:8px"><i></i>' + esc(it.status) + '</span>';

  var disp = (it.meta_data && it.meta_data.display) || it.external_id || '';
  var savedChat = it.masked_credentials && it.masked_credentials.chat_id
    ? (it.masked_credentials.chat_id.indexOf('***') === -1 ? it.masked_credentials.chat_id : '')
    : '';
  var savedGuild = it.masked_credentials && it.masked_credentials.guild_id
    ? (it.masked_credentials.guild_id.indexOf('***') === -1 ? it.masked_credentials.guild_id : '')
    : '';
  var savedChannel = it.masked_credentials && it.masked_credentials.channel_id
    ? (it.masked_credentials.channel_id.indexOf('***') === -1 ? it.masked_credentials.channel_id : '')
    : '';

  var html =
    '<div class="sp-winhead">' +
    '<button class="sp-ibtn" style="flex:none" data-close2 type="button">' +
    icon('i-x') + ' ' + esc(T('back')) +
    '</button>' +
    '<div style="flex:1;min-width:0">' +
    '<h2 style="margin:0;font-size:18px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
    icon(PLATFORM_ICON[it.platform] || 'i-grid') +
    esc(it.name) +
    stTag +
    '</h2>' +
    (disp ? '<div style="color:var(--mut);font-size:12px;margin-top:2px">' + esc(disp) + '</div>' : '') +
    '</div>' +
    '<button class="sp-x" data-x aria-label="Close">' + icon('i-x') + '</button>' +
    '</div>' +

    '<div class="sp-tabs" id="panelTabs">' +
    '<button class="sp-tab on" data-tab="actions" type="button">' + icon('i-zap') + ' ' + esc(T('run_async')) + '</button>' +
    '<button class="sp-tab" data-tab="stats" type="button">' + icon('i-chart') + ' ' + esc(T('a_stats')) + '</button>' +
    '<button class="sp-tab" data-tab="history" type="button">' + icon('i-activity') + ' ' + esc(T('history')) + '</button>' +
    '</div>' +

    '<div id="tabActions">' +
    buildActionGrid(it) +
    '<div id="panelFormHost"><p class="sp-action-hint" data-i18n="select_action_hint">' +
    esc(T('select_action_hint')) + '</p></div>' +
    '<div id="pOut" class="sp-output" style="display:none;margin-top:14px"></div>' +
    '</div>' +

    '<div id="tabStats" style="display:none">' +
    '<div id="statsBox" style="color:var(--mut);text-align:center;padding:28px">' +
    '<span class="sp-loader lg"></span>' +
    '</div>' +
    '</div>' +

    '<div id="tabHistory" style="display:none">' +
    '<div id="runsBox" class="sp-hist" style="margin-top:0">' +
    '<div style="text-align:center;padding:20px"><span class="sp-loader"></span></div>' +
    '</div>' +
    '</div>';

  modal(html, it.id % 2 ? 'offset' : 'offset2');

  var mr = document.getElementById('modalRoot');
  if (!mr) return;
  var panelWindow = mr.querySelector('.sp-win');
  if (panelWindow) panelWindow.classList.add('sp-integration-panel');

  var close2 = mr.querySelector('[data-close2]');
  if (close2) close2.onclick = closeModal;

  function setOut(txt) {
    var o = document.getElementById('pOut');
    if (!o) return;
    o.style.display = txt ? 'block' : 'none';
    o.textContent = txt || '';
  }

  async function refreshHistory(highlight) {
    try {
      var h = await api('/api/v1/integrations/' + it.id + '/runs');
      var b = document.getElementById('runsBox');
      if (b) b.innerHTML = spRunsHTML(h, highlight);
      if (h && h.length) {
        var last = h.find(function (r) { return r.id === highlight; }) || h[0];
        if (last && last.result) setOut(spPretty(last.result));
        else if (last && last.error) setOut(last.error);
      }
      return h;
    } catch (ex) {
      var box = document.getElementById('runsBox');
      if (box) box.innerHTML = '<div class="sp-hist-empty" style="color:var(--fg2)">' + esc(ex.message || String(ex)) + '</div>';
      return null;
    }
  }

  async function loadStats() {
    var box = document.getElementById('statsBox');
    if (!box) return;
    try {
      var h = await api('/api/v1/integrations/' + it.id + '/runs');
      if (!h || !h.length) {
        box.innerHTML = '<div class="sp-hist-empty">' + esc(T('s_no_data')) + '</div>';
        return;
      }
      var ok  = h.filter(function (r) { return r.status === 'success'; });
      var err = h.filter(function (r) { return r.status === 'failed'; });
      var rate = ok.length ? Math.round(ok.length / h.length * 100) : 0;
      var lastOk = ok[0];
      var statsHtml =
        '<div class="sp-statgrid">' +
        '<div class="sp-statbox"><div class="sp-mlabel">' + esc(T('s_runs')) + '</div><div class="sp-mval">' + h.length + '</div></div>' +
        '<div class="sp-statbox"><div class="sp-mlabel">' + esc(T('s_success_rate')) + '</div><div class="sp-mval">' + rate + '%</div></div>' +
        '<div class="sp-statbox"><div class="sp-mlabel">' + esc(T('s_failed_short')) + '</div><div class="sp-mval">' + err.length + '</div></div>' +
        '<div class="sp-statbox"><div class="sp-mlabel">' + esc(T('s_last_run')) + '</div><div class="sp-mval text-sm">' +
        (h[0].created_at ? new Date(h[0].created_at).toLocaleString() : '—') + '</div></div>' +
        '</div>';
      if (lastOk && lastOk.result) {
        statsHtml += _resultStats(it.platform, lastOk.result);
      }
      box.innerHTML = statsHtml;
    } catch (ex) {
      box.innerHTML = '<div class="sp-hist-empty" style="color:var(--fg2)">' + esc(String(ex.message || ex)) + '</div>';
    }
  }

  var tabs = mr.querySelectorAll('[data-tab]');
  var tabPanes = {
    actions: document.getElementById('tabActions'),
    stats:   document.getElementById('tabStats'),
    history: document.getElementById('tabHistory')
  };
  var historyLoaded = false;
  var statsLoaded   = false;

  tabs.forEach(function (tab) {
    tab.onclick = function () {
      tabs.forEach(function (t) { t.classList.remove('on'); });
      tab.classList.add('on');
      var which = tab.getAttribute('data-tab');
      Object.keys(tabPanes).forEach(function (k) {
        if (tabPanes[k]) tabPanes[k].style.display = k === which ? 'block' : 'none';
      });
      if (which === 'history' && !historyLoaded) {
        historyLoaded = true;
        refreshHistory(null);
      }
      if (which === 'stats' && !statsLoaded) {
        statsLoaded = true;
        loadStats();
      }
    };
  });

  var selectedAction = '';
  var actions = mr.querySelectorAll('[data-k]');
  actions.forEach(function (btn) {
    btn.onclick = function () {
      selectedAction = btn.getAttribute('data-k') || '';
      actions.forEach(function (actionButton) {
        var isSelected = actionButton === btn;
        actionButton.classList.toggle('selected', isSelected);
        actionButton.setAttribute('aria-pressed', String(isSelected));
      });
      var formHost = document.getElementById('panelFormHost');
      if (formHost) {
        formHost.innerHTML = buildPanelForm(it, selectedAction);
        if (it.platform === 'telegram') {
          var chat = document.getElementById('pChat');
          if (chat) chat.value = savedChat;
        } else if (it.platform === 'discord') {
          var guild = document.getElementById('pGuild');
          var channel = document.getElementById('pChan');
          if (guild) guild.value = savedGuild;
          if (channel) channel.value = savedChannel;
        }
        try { spApplyLang(window.SP_LANG); } catch (e) {}
        var actionForm = formHost.querySelector('#panelActionForm');
        if (actionForm) {
          var scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
          actionForm.scrollIntoView({ behavior: scrollBehavior, block: 'nearest' });
        }
      }
      setOut('');
    };
  });

  mr.onsubmit = function (event) {
    var form = event.target;
    if (!form || form.id !== 'panelActionForm') return;
    event.preventDefault();
    var pollOptionsInput = document.getElementById('pPollO');
    if (pollOptionsInput) pollOptionsInput.setCustomValidity('');
    if (!selectedAction || !form.reportValidity()) return;

    if (selectedAction === 'poll') {
      var options = (pollOptionsInput.value || '')
        .split(',').map(function (option) { return option.trim(); }).filter(Boolean);
      if (options.length < 2) {
        pollOptionsInput.setCustomValidity(T('poll_min_options'));
        pollOptionsInput.reportValidity();
        return;
      }
      if (options.length > 10) {
        pollOptionsInput.setCustomValidity(T('poll_max_options'));
        pollOptionsInput.reportValidity();
        return;
      }
    }
    if (selectedAction === 'videos') {
      var limitInput = document.getElementById('pLimit');
      if (limitInput && !limitInput.reportValidity()) return;
    }

    var runButton = form.querySelector('#runSelectedBtn');
    if (!runButton) return;
    runButton.disabled = true;
    setOut(T('task_queued'));
    spRun(it.id, selectedAction, paramsFor(it, selectedAction), function (h, rid, info) {
      var current = h && h.find(function (run) { return run.id === rid; });
      if (current && current.status === 'failed') {
        setOut(T('task_failed') + ': ' + (current.error || T('unknown_error')));
        runButton.disabled = false;
      } else if (current && current.status === 'success') {
        setOut(spPretty(current.result || {}));
        runButton.disabled = false;
        if (statsLoaded) {
          statsLoaded = false;
          loadStats();
        }
      } else if (info && info.error) {
        setOut(String(info.error.message || info.error));
        runButton.disabled = false;
      } else if (info && info.timeout) {
        setOut(T('task_still_running'));
        runButton.disabled = false;
      } else if (h) {
        var history = document.getElementById('runsBox');
        if (history) history.innerHTML = spRunsHTML(h, rid);
      }
      if (h && historyLoaded) {
        var historyBox = document.getElementById('runsBox');
        if (historyBox) historyBox.innerHTML = spRunsHTML(h, rid);
      }
    });
  };

  try { spApplyLang(window.SP_LANG); } catch (e) {}
};
