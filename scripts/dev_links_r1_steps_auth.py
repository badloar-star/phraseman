# Ссылки и шаги робота Авторизации для покрытия съёмки r1 (triage.coverage: link_missing + core_switch без шагов).
#
# зачем (координатор 12.10): строки auth-gap-001/002/003/008/009/010/011/012 и profile-023 не имели ссылки или шагов. Свой модуль, чтобы
# не править общий dev_links_r1_steps.py (его уже дважды перетирали коммиты целиком). Подключается из scripts/dev_links_r1_generate.py
# (import), как dev_links_r1_steps_cards2.py.
#
# Безопасность: все подмены — dev_state, только память процесса, в стор-сборке маршрут вырезан и геттеры = null.
# Ни один шаг не входит в аккаунт и не стирает данные: вход подменён ошибкой ДО сети (switch=…, restore=retired), окна удаления только
# открываются (delete=fail — страховка), подтверждение удаления роботу не даётся (auth-gap-011 — вручную).
from dev_links_r1_steps import ACCT, CANCEL, ENTRIES, MANAGE, PLAN_Y, SETTINGS, SIGNIN, add

DELETE_OPEN = ['see:#account-delete-button', 'tap:#account-delete-button']

# ── Экран «Аккаунт»
add('auth-gap-001', [], 'plus=off', ACCT, note='гость: «Привязать аккаунт», нет почты / способа входа / «Выйти»; ТОЛЬКО ГОСТЬ')
add('auth-gap-002', ['tap:#account-email-copy', 'settle:0'], '', ACCT,
    note='«Скопировано» (≈1,4 с, снимок сразу после тапа); НУЖЕН ВХОД — строка почты есть только у вошедшего')

# ── Окно входа: отказы до сети (switch=required — новая подмена, restore=retired — существующая)
add('auth-gap-003', SIGNIN, 'switch=required', ACCT, note='окно входа: «нужна смена аккаунта» + кнопка «Сменить аккаунт» (вход отдаёт account_switch_required до сети); ТОЛЬКО ГОСТЬ')
add('auth-gap-012', SIGNIN + ['tap:#auth-switch-account', 'wait:1500'], 'switch=required', ACCT,
    note='«Сменить аккаунт» → окно «Сменить аккаунт?» в Настройках (без строки про Plus — она требует свежий store-Plus); «Продолжить» НЕ жать; ТОЛЬКО ГОСТЬ')
add('auth-gap-008', SIGNIN, 'restore=retired', ACCT, note='вход в удалённый навсегда аккаунт → окно «Аккаунт удалён» (identity_retired до сети); ТОЛЬКО ГОСТЬ')

# ── Удаление: только открыть окно
# зачем (EN-проход 13.10): вариант «через 14 дней» показывается только при входе Google/Apple; dev account=linked (только память,
# только на одноразовом госте, действия аккаунта отказывают) даёт тот же вариант без настоящего входа.
add('auth-gap-009', DELETE_OPEN, 'delete=fail&account=linked', ACCT, note='окно «Удалить аккаунт?» с «14 дней», НЕ подтверждать; вход — подменой account=linked (без настоящего входа)')
add('auth-gap-010', DELETE_OPEN, 'delete=fail', ACCT, note='гость: окно «Прогресс удалится безвозвратно», НЕ подтверждать; ТОЛЬКО ГОСТЬ')
add('auth-gap-011', DELETE_OPEN, 'delete=fail', ACCT, unique=False,
    note='«Удаление не завершилось» — ВРУЧНУЮ: нужно ввести слово подтверждения кириллицей (робот вводит только ASCII) и нажать «Удалить»; '
         'перед тапом убедиться, что в журнале есть [DEV-STATE] … delete — иначе это настоящее удаление')

# ── Управление подпиской: удержание после причины «Не хватает функций»
add('profile-023', [CANCEL, 'tap:#manage-subscription-reason-missing_features', 'tap:#manage-subscription-reasons-continue'], PLAN_Y, MANAGE,
    note='причина «Не хватает функций» → «Продолжить» → предложение удержания; offer-decline НЕ жать')

# ── profile-017 (склейка 12.10, «состояние не то»): образец — прокрученный экран месячной подписки («Восстановить покупки», «Перейти к отмене»,
# пояснение про источник цены). Запись в общем файле снимала верх экрана; перекрываем её здесь, общий файл не трогаем.
ENTRIES.pop('profile-017', None)
add('profile-017', ['scroll:down'], 'plus=on&plan=monthly', MANAGE,
    note='управление подпиской, месячная, прокручено вниз; карточки «Перейти на годовой» без магазина нет (нужен store-аккаунт)')

# ── Покрытие pending r1 зоны Авторизации (координатор 12.10 вечер, «помочь съёмке»). Только существующие подмены.
# paywalls-025 — дубль profile-023 по shot list G-A06 («Поддержка или отмена»): те же шаги.
add('paywalls-025', [CANCEL, 'tap:#manage-subscription-reason-missing_features', 'tap:#manage-subscription-reasons-continue'], PLAN_Y, MANAGE,
    note='то же, что profile-023: «Не хватает функций» → «Продолжить» → «Поддержка или отмена»; offer-decline НЕ жать')

# settings-gap-006 «Pro без срока (выдан из админки)»: vip=admin_lifetime (vip_until=0) → isLifetimeVipValues → тир Pro
# (premium_guard.ts); заголовок «Выданный Pro», срок «Pro без срока окончания» (settings.tsx vipAccessTitle/vipExpiryText).
# VIP читается при старте — робот перезапускает приложение сам, как для settings-gap-004/005.
add('settings-gap-006', ['see:#settings-plus-access-details'], 'vip=admin_lifetime&plus=inherit', SETTINGS,
    note='главная Настроек: «Выданный Pro · Pro без срока окончания» (vip=admin_lifetime), блок доступа прокручен в экран')

# auth-gap-016 «Смена — прогресс не сохранён»: switch=not_uploaded → выход отвечает sync_failed (dev_account_state.ts) →
# окно «Прогресс не сохранён» (settings.tsx, ветка res.reason === 'sync_failed'). Вторую кнопку НЕ жать (это auth-gap-017).
add('auth-gap-016', ['tap:#settings-switch-continue', 'wait:1500'], 'switch=not_uploaded', '/(tabs)/settings?switchAccount=1',
    note='окно «Прогресс не сохранён»: «Остаться» / «Сменить без сохранения» — ничего не жать; настоящая смена и стирание недостижимы при switch=')

# settings-gap-034 «Обучение — выбранный голос»: первый настоящий голос (@2 — после «Системный (авто)»), назад кнопкой экрана.
# Пишет выбор голоса гостя на устройстве (локальная настройка, без облака); вернуть — выбрать «Системный (авто)».
add('settings-gap-034', ['see:#fc-voice-picker-row', 'tap:#fc-voice-picker-row', 'tap:#fc-voice-row-*@2', 'tap:#fc-voice-picker-back',
                         'see:#fc-voice-picker-row'], 'plus=off', '/settings_edu',
    note='в строке «Голос озвучки» имя голоса; нужен хотя бы один английский голос TTS на эмуляторе (имя — как отдаёт TTS, в макете «Samantha» — iOS)')

# ── Поправки по коду (Ядро 12.10 вечер). Общий dev_links_r1_steps.py не трогаем — перекрываем здесь.
# Двухкнопочное окно useGlassAlert рисуется ThemedConfirmModal без testID (hooks/use-glass-alert.tsx: 2 кнопки) — жать по тексту.
SWITCH = '/(tabs)/settings?switchAccount=1'
SWITCH_FORCE_TEXT = ['tap:#settings-switch-continue', 'wait:1500', 'tap:Сменить без сохранения', 'wait:1500']
for _rid in ('auth-gap-012', 'auth-gap-013', 'auth-gap-017', 'auth-gap-018'):
    ENTRIES.pop(_rid, None)
add('auth-gap-013', SWITCH_FORCE_TEXT, 'switch=unsaved_cards', SWITCH, note='«Прогресс не сохранён» → «Сменить без сохранения» → окно про несохранённые карточки')
add('auth-gap-017', SWITCH_FORCE_TEXT, 'switch=guard', SWITCH,
    note='«Прогресс не сохранён» → «Сменить без сохранения» → «Смена аккаунта отменена» (форсированная отклонена защитной проверкой)')
# окно «смена ещё идёт» живёт 45–50 с (switch=slow держит 50 с) — снимок сразу после 46 с
add('auth-gap-018', ['tap:#settings-switch-continue', 'wait:46000', 'settle:0'], 'switch=slow', SWITCH,
    note='смена дольше 45 с → окно «смена ещё идёт»; снимать сразу (через 50 с отказ)')
# «Сменить аккаунт?» с переносом Plus: окно открывается параметром switchAccount, строка про Plus — plus=on + plustransfer=on
# (plus_transfer_hold.ts); switch=required страхует от настоящей смены, если «Продолжить» нажмут.
add('auth-gap-012', [], 'plus=on&plustransfer=on&switch=required', SWITCH,
    note='окно «Сменить аккаунт?» со строкой «У тебя активен Plus…»; «Продолжить» НЕ жать')

# ── Окно восстановления аккаунта (restore=offer|restored — только память, сервер и настоящее восстановление недостижимы)
add('auth-gap-007', SIGNIN, 'restore=offer', ACCT, note='вход → «Восстановить аккаунт?» (13 дней, подставной статус); кнопки не жать; ТОЛЬКО ГОСТЬ')
add('auth-gap-006', SIGNIN + ['tap:Восстановить', 'wait:1200'], 'restore=restored', ACCT,
    note='вход → «Восстановить» → в окне входа «Аккаунт восстановлен · Войди ещё раз»; restoreDeletedAccount не вызывается; ТОЛЬКО ГОСТЬ')

# ── Уведомления и Приватность под robot_no_cloud=1: тумблеры меняют только экран — ни сохранения, ни облака (координатор 12.10).
NOTIF = '/settings_notifications'
add('settings-gap-010', ['tap:#notif-master-switch', 'wait:1600', 'tap:#notif-daily-switch', 'settle:0'], 'robot_no_cloud=1', NOTIF,
    note='мастер вкл → «Ежедневное напоминание» вкл → сразу «Сохранено» и «Время 19:00» (время по умолчанию; в образце может быть другое)')
add('settings-gap-027', ['tap:#notif-master-switch', 'wait:1600'], 'robot_no_cloud=1', NOTIF,
    note='мастер вкл, ежедневное выкл (исходно) → «Время» приглушено; «Сохранено» погасло (1,4 с)')
add('settings-gap-017', ['tap:#privacy-analytics-consent-switch', 'tap:#privacy-ai-explain-consent-switch',
                         'tap:#privacy-ai-dialog-consent-switch', 'see:#privacy-delete-account'], 'robot_no_cloud=1', '/privacy_settings',
    note='аналитика выкл, оба ИИ вкл (исходно: аналитика вкл, ИИ выкл), прокручено до «Документы»/«Удалить аккаунт» (НЕ жать)')
# settings-gap-012 («телефон не разрешает») — ручной шаг Сверки: pm revoke + системное окно «Не разрешать» (координатор 12.10).
# settings-gap-001 («профиль привязан») — только настоящий вход (G-A10, аккаунт №3): ручной, в утренний лист владельцу.

# ── guest=required (координатор 12.10, п.1: Сверка жмёт «Выйти», «Продолжить» смены, код приглашения и тумблеры ПО-НАСТОЯЩЕМУ).
# Во всех ссылках с удалением, сменой аккаунта и кодом приглашения, где кадр — гость: на не-госте dev_state отказывает целиком
# (app/dev_state_fixtures.ts, до любого шага и без перехода на next). Модуль подключается последним — правим уже собранные ссылки.
# НЕ ставится там, где кадр есть ТОЛЬКО у вошедшего аккаунта («Выйти» и окно «14 дней» рисуются при linkedAuth, app/account_details.tsx):
# profile-028/029 (выход), profile-030 и auth-gap-009 (удаление с входом) — они на подменах-отказах logout=hold|fail / delete=fail,
# которые отказывают до любого действия на ЛЮБОМ аккаунте. Настоящий выход без подмены — только по отдельному слову владельца.
GUEST_REQUIRED_IDS = (
    ['auth-gap-010', 'auth-gap-011']
    + [f'auth-gap-0{n}' for n in range(12, 19)]
    + [f'overlays-campaigns-0{n}' for n in range(16, 27)]
)
_GUEST_MISSING = []
for _rid in GUEST_REQUIRED_IDS:
    _entry = ENTRIES.get(_rid)
    if not _entry or 'dev_state?' not in _entry['link']:
        _GUEST_MISSING.append(_rid)
        continue
    if 'guest=required' not in _entry['link']:
        _entry['link'] = _entry['link'].replace('dev_state?', 'dev_state?guest=required&', 1)
if _GUEST_MISSING:
    raise SystemExit(f'guest=required: нет записи шагов для {_GUEST_MISSING} — ссылка без защиты недопустима')

# ── Вход в онбординге без авиарежима: signin=hold|offline|generic (координатор 12.10, п.2; спецификация Ядра). Вход при подмене не
# начинается (ни Google, ни сеть); онбординг открывается подменой onbstep (общий onboarding=done её не перебивает). guest=required — на
# всякий случай: шаги входа только на госте.
ONB_HOME = '/(tabs)/home'
ONB_SIGNIN = ['tap:#onboarding-existing-account', 'wait:600', 'tap:#auth-google-button']
add('onboarding-003', ONB_SIGNIN + ['wait:9500'], 'guest=required&onbstep=welcome&signin=hold', ONB_HOME,
    note='«Вход всё ещё выполняется…» (появляется после 8 с; подмена держит 60 с и отменяет)')
add('onboarding-004', ONB_SIGNIN + ['wait:1200'], 'guest=required&onbstep=welcome&signin=offline', ONB_HOME,
    note='ошибка «Связь пропала. Попробуй ещё раз.» без кода dev_stub в тексте')
add('onboarding-008', ['tap:#auth-google-button', 'wait:1200'], 'guest=required&onbstep=privacy&signin=generic', ONB_HOME,
    note='общая ошибка входа на шаге «Твои данные» (без кода dev_stub в тексте)')

# ── auth-gap-011 «Удаление не завершилось» по макету: delete=throw (координатор 12.10, п.3). Исключение первой строкой beginAccountDeletion —
# ничего не удаляется; кнопка «Удалить» доступна без ввода слова ТОЛЬКО при dev-флаге удаления (в стор-сборке ввод обязателен всегда).
ENTRIES.pop('auth-gap-011', None)
add('auth-gap-011', ['see:#account-delete-button', 'tap:#account-delete-button', 'wait:600', 'tap:#delete-account-confirm', 'wait:2500'],
    'guest=required&delete=throw', ACCT, note='окно «Не получилось · Удаление не завершилось. Проверь интернет…» (исключение dev_delete_throw, ничего не удалено)')

# ── «Выйти» (координатор 12.10, п.A): кнопка есть только у вошедшего аккаунта — настоящий выход ТОЛЬКО на №3 «Phraseman Support».
# account=support_only обрывает ссылку на любом другом аккаунте (app/dev_state_fixtures.ts). Повторный вход в №3 — только выбором уже
# добавленного аккаунта; появилось поле пароля — СТОП (пароли не вводим).
ENTRIES.pop('profile-028', None)
ENTRIES.pop('profile-029', None)
LOGOUT_TAP = ['see:#account-logout-button', 'tap:#account-logout-button']
add('profile-028', LOGOUT_TAP + ['settle:0'], 'account=support_only', ACCT,
    note='НАСТОЯЩИЙ выход из №3: кадр «Выходим из аккаунта…» сразу после тапа; потом вход в №3 выбором аккаунта (пароль — стоп)')
# Неудачу выхода настоящим выходом не воспроизвести — остаётся подмена logout=fail (отказ до действия) плюс защита №3.
add('profile-029', LOGOUT_TAP + ['wait:1500'], 'account=support_only&logout=fail', ACCT,
    note='«Не удалось выйти» (logout=fail — выхода нет); только на №3')
# зачем (координатор 12.10, chain7 пропустил): «выход выполняется, окно не закрыть» — logout=hold держит прогресс 120 с и затем отказывает
# (sync_failed) ДО любого стирания; на №3 (account=support_only), т.к. «Выйти» есть только у вошедшего. Настоящего выхода нет.
ENTRIES.pop('overlays-runtime-018', None)
add('overlays-runtime-018', LOGOUT_TAP + ['wait:1500'], 'account=support_only&logout=hold', ACCT,
    note='«Выходим из аккаунта…» держится (logout=hold, 120 с, затем отказ без стирания); снимать в первые 2 мин; только на №3')

# ── Онбординг и вход без ссылок (координатор 12.10: link_missing onboarding-002/005/026–029).
add('onboarding-002', ['tap:#onboarding-existing-account', 'wait:600'], 'onbstep=welcome', ONB_HOME,
    note='«У меня есть аккаунт» → кнопки Google / Apple; вход НЕ начинать')
# signin=unknown: created_new с вымышленной почтой example.com без настоящего входа → «Аккаунта … у нас нет». Кнопки не жать.
add('onboarding-005', ONB_SIGNIN + ['wait:1500'], 'guest=required&onbstep=welcome&signin=unknown', ONB_HOME,
    note='«Начнём с чистого листа · Аккаунта alex.demo@example.com у нас нет» — «Создать аккаунт» / «Войти другим способом» не жать')
# Мини-онбординг нового языка: язык макета — «Английский». До «Начать» ничего не сохраняется.
LW = '/language_welcome?target=en'
add('onboarding-026', ['wait:600'], '', LW, note='новый язык: приветствие')
add('onboarding-027', ['tap:#language-welcome-primary', 'wait:500'], '', LW, note='«Зачем тебе…» без выбора')
add('onboarding-028', ['tap:#language-welcome-primary', 'wait:500', 'tap:#language-welcome-option-everyday',
                       'tap:#language-welcome-primary', 'wait:500'], '', LW, note='шаг «Уровень» (цель «каждый день» выбрана)')
# «Новый язык выбран» без настоящего включения языка: devStep=done (только dev), язык гостя не меняется. «Начать учить» не жать.
add('onboarding-029', ['wait:600'], '', LW + '&devStep=done', note='«Новый язык выбран · Английский · План под тебя готов…» (devStep=done, без сохранений)')

# зачем (координатор 13.10, overlays-campaigns-013): промокод «Неверный формат» — состояние в приложении есть с 93c22d44c (п.81(13)): кнопка активна при любом
# непустом коде, формат проверяется по нажатию ДО сети. `AB` — 2 знака < 3 (PROMO_CODE_FORMAT) → плашка «Проверь код», сеть не вызывается.
# Строка попадёт в DEV_LINKS_R1, когда реестр переведёт её из blocked в pending (генератор берёт только pending/diff/match).
add('overlays-campaigns-013', ['tap:#promo-code-input', 'type:AB', 'hidekb', 'tap:#promo-code-submit', 'wait:600'], 'plus=off&energy=3&promo=not_found', '/promo_code_entry',  # promo=: сторож prod_write — подмена исхода обязательна у любой кнопки активации (сюда сеть и так не доходит)
   
    note='промокод: неверный формат (2 знака) — «Проверь код», без сети')

# ── Бэклог №18 (координатор 13.10): состояния, до которых робот не доходил — по вердиктам Макетов «[состояние] не достигнуто».
import dev_links_r1_steps_cards3 as _C3  # noqa: E402
import dev_links_r1_steps_core1 as _K1  # noqa: E402

# cards-054: меню СВОЕГО отклика («Удалить»). Отправленный в demo-режиме отклик получает id dev_cm_<время> (packCommentsFirestore) —
# шаблон pack-comment-more-dev_cm_* выбирает только свой отклик (демо-отклики — dev_demo_cm_*).
ENTRIES.pop('cards-054', None)
add('cards-054', [_C3.WAIT, _C3.ADD, _C3.COMMENTS] + _C3.SEND + ['tap:#pack-comment-more-dev_cm_*', 'wait:500'], _C3.P2 + '&comments=demo', _C3.P2_ROUTE,
    note='меню своего отклика («Удалить»): отклик отправлен в память, ⋯ по шаблону dev_cm_*; пункты не жать')

# community-011/018/019: исходы заявки найденному другу DEVFND без сервера (dev_friends_fail=add_network|add_already_friends|add_already_sent).
for _rid, _fail, _note in (('community-011', 'add_network', 'заявку не удалось отправить — «Связь пропала»'),
                           ('community-018', 'add_already_friends', 'исход «Уже друзья»'),
                           ('community-019', 'add_already_sent', 'исход «Заявка уже отправлена»')):
    ENTRIES.pop(_rid, None)
    add(_rid, _K1.search('DEVFND') + ['tap:#friends-add-found', 'wait:900'], _K1.FRIENDS + '&dev_friends_fail=' + _fail, _K1.COMMUNITY,
        note=f'Друзья: {_note} (dev_friends_fail={_fail}, без сети)')
