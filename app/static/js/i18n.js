(function (w) {
  'use strict';

  w.SP_I18N = {

    uk: {
      landing_welcome: 'Вітаємо',
      landing_statement: 'Ваші платформи. В одному місці.',
      landing_copy: 'Підключайте сервіси та керуйте щоденними задачами — спокійно, зрозуміло, без зайвого.',
      landing_signin: 'Увійти',
      landing_signup: 'Створити акаунт',
      landing_footer: 'Зрозуміло з першого кроку.',
      landing_platforms_label: 'Підтримувані платформи',
      landing_steps_label: 'Як це працює',
      landing_step_connect: 'Підключіть сервіс',
      landing_step_action: 'Оберіть дію',
      landing_step_results: 'Стежте за результатом',
      dashboard:    'Огляд',
      telegram:     'Telegram Боти',
      discord:      'Discord Сервери',
      youtube:      'YouTube Канали',
      vault:        'Системний Vault',
      tasks:        'Конструктор задач',
      search:       'Пошук по сервісам...',
      connected:    'Підключено сервісів',
      active_tasks: 'Активних задач',
      m_health:     'Стан системи',
      live_feed:    'Live Activity Feed',
      open_panel:   'Відкрити панель',
      back:         'Назад до інтеграцій',
      run_async:    'Запустити задачу асинхронно',
      history:      'Історія запусків',
      login:        'Вхід',
      register:     'Реєстрація',
      logout:       'Вийти',
      account_session: 'Сеанс',
      account_role: 'Роль',
      account_joined: 'З нами',
      go_register:  'Ще немає акаунту?',
      go_login:     'Вже є акаунт?',
      go_home:      '← Головна',
      w_first_time: 'Перший раз тут? Ласкаво просимо!',
      light:        'Світла',
      dark:         'Темна',
      or_lang:      'Мова',
      label_email:    'Пошта',
      label_pass:     'Пароль',
      label_username: "Ім'я користувача",
      ph_email:     'your@email.com',
      ph_username:  'cooluser',
      ph_pass_new:  '••••••••',
      ph_text:      'Текст повідомлення',
      ph_chat:      'chat_id або @канал',
      ph_poll_q:    'Питання опитування',
      ph_poll_o:    'Варіанти через кому',
      ph_guild:     'guild_id',
      ph_channel:   'channel_id',
      ph_query:     'Пошуковий запит',
      ph_video:     'video_id',
      ph_limit:     'Кількість результатів (1–50)',
      ph_name:      'Назва',
      a_broadcast:  'Розсилка',
      a_send:       'Надіслати',
      a_stats:      'Статистика',
      a_chat_info:  'Інфо каналу',
      a_members:    'Учасники',
      a_admins:     'Адміни',
      a_webhook:    'Вебхук',
      a_commands:   'Команди',
      a_poll:       'Опитування',
      a_audit:      'Аудит',
      a_guild_info: 'Інфо сервера',
      a_channels:   'Канали',
      a_roles:      'Ролі',
      a_invites:    'Запрошення',
      a_pins:       'Закріплені',
      a_moderation: 'Модерація',
      a_webhooks:   'Вебхуки',
      a_sync:       'Синхронізація',
      a_live:       'Ефір',
      a_videos:     'Відео',
      a_playlists:  'Плейлисти',
      a_search:     'Пошук',
      a_video_info: 'Інфо відео',
      a_add:        'Додати',
      st_running:   'виконується',
      st_success:   'успішно',
      st_failed:    'помилка',
      st_queued:    'в черзі',
      st_started:   'запущено',
      s_runs:         'Запусків',
      s_success_rate: 'Успішність',
      s_last_run:     'Останній запуск',
      s_no_data:      'Ще немає даних — запустіть першу задачу',
      s_integrations: 'Інтеграції',
      s_online:       'Онлайн',
      s_offline:      'Офлайн',
      s_total:        'Всього',
      s_failed_short: 'Помилки',
      s_members:      'Учасників',
      s_subscribers:  'Підписників',
      s_views:        'Переглядів',
      s_videos_cnt:   'Відео',
      s_guilds:       'Серверів',
      s_live:         'Прямий ефір',
      s_sent:         'Надіслано',
      w_title: 'Ласкаво просимо',
      w_sub:   'Ваш центр керування платформами',
      w_go:    'Продовжити',
      feed_empty:   'Стрічка порожня',
      confirm_del:  'Видалити інтеграцію?',
      confirm_title: 'Підтвердьте дію',
      confirm:      'Видалити',
      cancel:       'Скасувати',
      login_hint:   'перевірте дані або зареєструйтесь',
      add_integ:    'Нова інтеграція',
      edit_integ:   'Налаштування інтеграції',
      edit_secret_hint: 'Залиште секретні поля порожніми, щоб не змінювати збережені значення.',
      cred_keep_hint: 'Залиште порожнім, щоб зберегти поточне значення',
      credentials_recovery_hint: 'Збережені дані не розшифровуються поточним FERNET_KEY. Відновіть початковий ключ, щоб повернути до них доступ. Якщо ключ втрачено, введіть нижче всі обов’язкові нові дані для заміни або видаліть інтеграцію та підключіть її знову. Не генеруйте новий ключ, намагаючись відновити старі дані.',
      credentials_recovery_error: 'Збережені дані недоступні. Відновіть початковий FERNET_KEY або введіть усі обов’язкові нові дані для повторного підключення інтеграції.',
      save:         'Зберегти',
      invalid_chat_ids: 'Вкажіть chat_ids як JSON-масив або список через кому.',
      integ_added:  'Інтеграцію додано та перевірено',
      integ_added_unverified: 'Інтеграцію збережено, але не вдалося перевірити підключення',
      integ_updated: 'Налаштування інтеграції збережено',
      integ_update_failed: 'Налаштування збережено, але підключення не пройшло перевірку',
      task_poll_failed: 'Не вдалося оновити стан задачі',
      task_still_running: 'Задача ще виконується; результат буде в історії',
      task_local_failed_legacy: 'Локальне завдання завершилося до виконання. Перевірте ключ шифрування інтеграції.',
      select_action_hint: 'Оберіть дію. Форма покаже лише потрібні для неї поля.',
      no_action_fields: 'Для цієї дії додаткові параметри не потрібні.',
      run_selected: 'Запустити дію',
      task_queued: 'Завдання додано в чергу…',
      task_failed: 'Завдання завершилося з помилкою',
      poll_min_options: 'Вкажіть щонайменше два варіанти через кому.',
      poll_max_options: 'В опитуванні можна вказати не більше десяти варіантів.',
      unknown_error: 'Невідома помилка',
      no_integ:     'Інтеграцій ще немає',
      no_integ_sub: 'Натисніть + щоб підключити перший сервіс',
      check_ok:     'Статус оновлено',
      check_fail:   'Помилка перевірки',
      del_ok:       'Інтеграцію видалено',
    },

    ru: {
      landing_welcome: 'Добро пожаловать',
      landing_statement: 'Ваши платформы. В одном месте.',
      landing_copy: 'Подключайте сервисы и управляйте повседневными задачами — спокойно, понятно, без лишнего.',
      landing_signin: 'Войти',
      landing_signup: 'Создать аккаунт',
      landing_footer: 'Понятно с первого шага.',
      landing_platforms_label: 'Поддерживаемые платформы',
      landing_steps_label: 'Как это работает',
      landing_step_connect: 'Подключите сервис',
      landing_step_action: 'Выберите действие',
      landing_step_results: 'Следите за результатом',
      dashboard:    'Обзор',
      telegram:     'Telegram Боты',
      discord:      'Discord Серверы',
      youtube:      'YouTube Каналы',
      vault:        'Системный Vault',
      tasks:        'Конструктор задач',
      search:       'Поиск по сервисам...',
      connected:    'Подключено сервисов',
      active_tasks: 'Активных задач',
      m_health:     'Состояние системы',
      live_feed:    'Live Activity Feed',
      open_panel:   'Открыть панель',
      back:         'Назад к интеграциям',
      run_async:    'Запустить задачу асинхронно',
      history:      'История запусков',
      login:        'Вход',
      register:     'Регистрация',
      logout:       'Выйти',
      account_session: 'Сеанс',
      account_role: 'Роль',
      account_joined: 'С нами',
      go_register:  'Ещё нет аккаунта?',
      go_login:     'Уже есть аккаунт?',
      go_home:      '← Главная',
      w_first_time: 'Первый раз здесь? Добро пожаловать!',
      light:        'Светлая',
      dark:         'Тёмная',
      or_lang:      'Язык',
      label_email:    'Почта',
      label_pass:     'Пароль',
      label_username: 'Имя пользователя',
      ph_email:     'your@email.com',
      ph_username:  'cooluser',
      ph_pass_new:  '••••••••',
      ph_text:      'Текст сообщения',
      ph_chat:      'chat_id или @канал',
      ph_poll_q:    'Вопрос опроса',
      ph_poll_o:    'Варианты через запятую',
      ph_guild:     'guild_id',
      ph_channel:   'channel_id',
      ph_query:     'Поисковый запрос',
      ph_video:     'video_id',
      ph_limit:     'Количество результатов (1–50)',
      ph_name:      'Название',
      a_broadcast:  'Рассылка',
      a_send:       'Отправить',
      a_stats:      'Статистика',
      a_chat_info:  'Инфо канала',
      a_members:    'Участники',
      a_admins:     'Админы',
      a_webhook:    'Вебхук',
      a_commands:   'Команды',
      a_poll:       'Опрос',
      a_audit:      'Аудит',
      a_guild_info: 'Инфо сервера',
      a_channels:   'Каналы',
      a_roles:      'Роли',
      a_invites:    'Приглашения',
      a_pins:       'Закреплённые',
      a_moderation: 'Модерация',
      a_webhooks:   'Вебхуки',
      a_sync:       'Синхронизация',
      a_live:       'Эфир',
      a_videos:     'Видео',
      a_playlists:  'Плейлисты',
      a_search:     'Поиск',
      a_video_info: 'Инфо видео',
      a_add:        'Добавить',
      st_running:   'выполняется',
      st_success:   'успешно',
      st_failed:    'ошибка',
      st_queued:    'в очереди',
      st_started:   'запущена',
      s_runs:         'Запусков',
      s_success_rate: 'Успешность',
      s_last_run:     'Последний запуск',
      s_no_data:      'Пока нет данных — запустите первую задачу',
      s_integrations: 'Интеграции',
      s_online:       'Онлайн',
      s_offline:      'Офлайн',
      s_total:        'Всего',
      s_failed_short: 'Ошибки',
      s_members:      'Участников',
      s_subscribers:  'Подписчиков',
      s_views:        'Просмотров',
      s_videos_cnt:   'Видео',
      s_guilds:       'Серверов',
      s_live:         'Прямой эфир',
      s_sent:         'Отправлено',
      w_title:      'Добро пожаловать',
      w_sub:        'Ваш центр управления платформами',
      w_go:         'Продолжить',
      feed_empty:   'Лента пуста',
      confirm_del:  'Удалить интеграцию?',
      confirm_title: 'Подтвердите действие',
      confirm:      'Удалить',
      cancel:       'Отмена',
      login_hint:   'проверьте данные или зарегистрируйтесь',
      add_integ:    'Новая интеграция',
      edit_integ:   'Настройки интеграции',
      edit_secret_hint: 'Оставьте секретные поля пустыми, чтобы сохранить текущие значения.',
      cred_keep_hint: 'Оставьте пустым, чтобы сохранить текущее значение',
      credentials_recovery_hint: 'Сохранённые данные не расшифровываются текущим FERNET_KEY. Восстановите исходный ключ, чтобы вернуть к ним доступ. Если ключ утрачен, введите ниже все обязательные новые данные для замены или удалите интеграцию и подключите её заново. Не генерируйте новый ключ в попытке восстановить старые данные.',
      credentials_recovery_error: 'Сохранённые данные недоступны. Восстановите исходный FERNET_KEY или введите все обязательные новые данные для переподключения интеграции.',
      save:         'Сохранить',
      invalid_chat_ids: 'Укажите chat_ids как JSON-массив или список через запятую.',
      integ_added:  'Интеграция добавлена и проверена',
      integ_added_unverified: 'Интеграция сохранена, но подключение проверить не удалось',
      integ_updated: 'Настройки интеграции сохранены',
      integ_update_failed: 'Настройки сохранены, но подключение не прошло проверку',
      task_poll_failed: 'Не удалось обновить состояние задачи',
      task_still_running: 'Задача ещё выполняется; результат появится в истории',
      task_local_failed_legacy: 'Локальная задача завершилась до выполнения. Проверьте ключ шифрования интеграции.',
      select_action_hint: 'Выберите действие. Форма покажет только нужные для него поля.',
      no_action_fields: 'Для этого действия дополнительные параметры не нужны.',
      run_selected: 'Запустить действие',
      task_queued: 'Задача добавлена в очередь…',
      task_failed: 'Задача завершилась с ошибкой',
      poll_min_options: 'Укажите не менее двух вариантов через запятую.',
      poll_max_options: 'В опросе можно указать не более десяти вариантов.',
      unknown_error: 'Неизвестная ошибка',
      no_integ:     'Интеграций ещё нет',
      no_integ_sub: 'Нажмите + чтобы подключить первый сервис',
      check_ok:     'Статус обновлён',
      check_fail:   'Ошибка проверки',
      del_ok:       'Интеграция удалена',
    },

    en: {
      landing_welcome: 'Welcome',
      landing_statement: 'Your platforms. All in one place.',
      landing_copy: 'Connect services and manage everyday tasks with a clear, calm workspace.',
      landing_signin: 'Sign in',
      landing_signup: 'Create account',
      landing_footer: 'Clear from the very first step.',
      landing_platforms_label: 'Supported platforms',
      landing_steps_label: 'How it works',
      landing_step_connect: 'Connect a service',
      landing_step_action: 'Choose an action',
      landing_step_results: 'Follow the results',
      dashboard:    'Overview',
      telegram:     'Telegram Bots',
      discord:      'Discord Servers',
      youtube:      'YouTube Channels',
      vault:        'System Vault',
      tasks:        'Task Builder',
      search:       'Search services...',
      connected:    'Connected services',
      active_tasks: 'Active tasks',
      m_health:     'System health',
      live_feed:    'Live Activity Feed',
      open_panel:   'Open panel',
      back:         'Back to integrations',
      run_async:    'Run task async',
      history:      'Run history',
      login:        'Login',
      register:     'Register',
      logout:       'Logout',
      account_session: 'Session',
      account_role: 'Role',
      account_joined: 'Member since',
      go_register:  "Don't have an account?",
      go_login:     'Already have an account?',
      go_home:      '← Home',
      w_first_time: 'First time here? Welcome!',
      light:        'Light',
      dark:         'Dark',
      or_lang:      'Language',
      label_email:    'Email',
      label_pass:     'Password',
      label_username: 'Username',
      ph_email:     'your@email.com',
      ph_username:  'cooluser',
      ph_pass_new:  '••••••••',
      ph_text:      'Message text',
      ph_chat:      'chat_id or @channel',
      ph_poll_q:    'Poll question',
      ph_poll_o:    'Options, comma-separated',
      ph_guild:     'guild_id',
      ph_channel:   'channel_id',
      ph_query:     'Search query',
      ph_video:     'video_id',
      ph_limit:     'Result limit (1–50)',
      ph_name:      'Name',
      a_broadcast:  'Broadcast',
      a_send:       'Send',
      a_stats:      'Stats',
      a_chat_info:  'Channel info',
      a_members:    'Members',
      a_admins:     'Admins',
      a_webhook:    'Webhook',
      a_commands:   'Commands',
      a_poll:       'Poll',
      a_audit:      'Audit',
      a_guild_info: 'Server info',
      a_channels:   'Channels',
      a_roles:      'Roles',
      a_invites:    'Invites',
      a_pins:       'Pins',
      a_moderation: 'Moderation',
      a_webhooks:   'Webhooks',
      a_sync:       'Sync',
      a_live:       'Live',
      a_videos:     'Videos',
      a_playlists:  'Playlists',
      a_search:     'Search',
      a_video_info: 'Video info',
      a_add:        'Add',
      st_running:   'running',
      st_success:   'success',
      st_failed:    'failed',
      st_queued:    'queued',
      st_started:   'started',
      s_runs:         'Runs',
      s_success_rate: 'Success rate',
      s_last_run:     'Last run',
      s_no_data:      'No data yet — run your first task',
      s_integrations: 'Integrations',
      s_online:       'Online',
      s_offline:      'Offline',
      s_total:        'Total',
      s_failed_short: 'Errors',
      s_members:      'Members',
      s_subscribers:  'Subscribers',
      s_views:        'Views',
      s_videos_cnt:   'Videos',
      s_guilds:       'Servers',
      s_live:         'Live stream',
      s_sent:         'Sent',
      w_title:      'Welcome',
      w_sub:        'Your platform control center',
      w_go:         'Continue',
      feed_empty:   'Feed is empty',
      confirm_del:  'Delete integration?',
      confirm_title: 'Confirm action',
      confirm:      'Delete',
      cancel:       'Cancel',
      login_hint:   'check your credentials or register',
      add_integ:    'New integration',
      edit_integ:   'Integration settings',
      edit_secret_hint: 'Leave secret fields blank to keep the saved values.',
      cred_keep_hint: 'Leave blank to keep the saved value',
      credentials_recovery_hint: 'Saved credentials cannot be decrypted with the current FERNET_KEY. Restore the original key to recover them. If it is lost, enter all required fresh credentials below to replace them, or delete and reconnect this integration. Do not generate another key to try to recover existing data.',
      credentials_recovery_error: 'Credentials are unavailable. Restore the original FERNET_KEY or enter all required new credentials to reconnect this integration.',
      save:         'Save',
      invalid_chat_ids: 'Enter chat_ids as a JSON array or comma-separated list.',
      integ_added:  'Integration added and verified',
      integ_added_unverified: 'Integration saved, but the connection could not be verified',
      integ_updated: 'Integration settings saved',
      integ_update_failed: 'Settings saved, but the connection check failed',
      task_poll_failed: 'Could not refresh task status',
      task_still_running: 'The task is still running; its result will appear in history',
      task_local_failed_legacy: 'Local task stopped before execution. Check the integration encryption key.',
      select_action_hint: 'Choose an action. Only its required fields will appear here.',
      no_action_fields: 'This action does not need any additional input.',
      run_selected: 'Run action',
      task_queued: 'Task queued…',
      task_failed: 'Task failed',
      poll_min_options: 'Enter at least two comma-separated options.',
      poll_max_options: 'A poll can have no more than ten options.',
      unknown_error: 'Unknown error',
      no_integ:     'No integrations yet',
      no_integ_sub: 'Click + to connect your first service',
      check_ok:     'Status updated',
      check_fail:   'Check failed',
      del_ok:       'Integration deleted',
    }
  };


  function _initLang() {
    try {
      var stored = localStorage.getItem('sp_lang');
      if (stored && w.SP_I18N[stored]) return stored;
    } catch (e) {  }
    var docLang = document.documentElement.lang || 'uk';
    if (w.SP_I18N[docLang]) return docLang;
    return 'uk';
  }

  w.SP_LANG = _initLang();

  function spT(k) {
    var l = w.SP_LANG;
    var dict = (w.SP_I18N[l] || w.SP_I18N['uk']);
    var v = dict[k];
    if (v !== undefined) return v;
    var en = w.SP_I18N['en'];
    if (en && en[k] !== undefined) return en[k];
    return k;
  }

  function spApplyLang(l) {
    if (!w.SP_I18N[l]) l = 'uk';
    w.SP_LANG = l;
    try { localStorage.setItem('sp_lang', l); } catch (e) {  }
    document.documentElement.lang = l;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      el.textContent = spT(k);
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-ph');
      el.placeholder = spT(k);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-title');
      el.title = spT(k);
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', spT(k));
    });

    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.classList.toggle('on', btn.getAttribute('data-lang') === l);
    });

    var tb = document.getElementById('themeBtn');
    if (tb) {
      var sp = tb.querySelector('span[data-i18n]');
      if (sp) {
        var curTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        sp.textContent = spT(curTheme === 'dark' ? 'dark' : 'light');
      }
    }

    try { if (w.spRenderAll) w.spRenderAll(); } catch (e) {  }
  }

  function _attachLangBtns() {
    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      if (btn._spLangAttached) return;
      btn._spLangAttached = true;
      btn.addEventListener('click', function () {
        var l = btn.getAttribute('data-lang');
        spApplyLang(l);
        var tok = '';
        try {
          tok = w.tok ? w.tok() : (localStorage.getItem('sp_tok') || '');
        } catch (e) {  }
        if (tok) {
          fetch('/api/v1/users/prefs', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
            body: JSON.stringify({ lang: l })
          }).catch(function () {  });
        }
      });
    });
  }

  function _init() {
    spApplyLang(w.SP_LANG);
    _attachLangBtns();
    if (typeof MutationObserver !== 'undefined') {
      var obs = new MutationObserver(function (mutations) {
        var needAttach = false;
        mutations.forEach(function (m) {
          if (m.addedNodes.length) needAttach = true;
        });
        if (needAttach) {
          _attachLangBtns();
          mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
              if (node.nodeType !== 1) return;
              node.querySelectorAll('[data-i18n]').forEach(function (el) {
                el.textContent = spT(el.getAttribute('data-i18n'));
              });
              node.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
                el.placeholder = spT(el.getAttribute('data-i18n-ph'));
              });
            });
          });
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  w.spT = spT;
  w.spApplyLang = spApplyLang;

}(window));
