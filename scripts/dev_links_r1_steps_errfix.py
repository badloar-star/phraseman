# Исправления шагов робота по ошибкам step_target_not_found (Сверка: docs/phraseman-2.0/ROBOT_STEP_ERRORS_2026-10-13.md).
#
# зачем (координатор 13.10): робот теряет ~17 % кадров на step_target_not_found. По кадрам ошибок и журналам
# (docs/phraseman-2.0/evidence/parity/_runs/*) разобраны причины; здесь лежат только исправления САМИХ ШАГОВ И ССЫЛОК,
# чужие модули не правятся. Подключается в dev_links_r1_generate.py ПОСЛЕДНИМ, после p84. Как p84: правка идемпотентна,
# записи нет в ENTRIES — понятная ошибка, а не молчаливый пропуск.
#
# Причины и что НЕ здесь (исправлено кодом приложения или нужна подмена/живой кадр):
#   dialogs-015/019/020 — подставной ход не нёс перевод/«Почему так»; исправлено в app/dialogue_v2_turn_coaching_client.ts (13.10), кадры сняты.
#   practice-001…003   — на Блице uiautomator не доходит до idle (полоса таймера); исправлено в 4e74715d4 (animations=off замораживает таймер).
#   video-004, dialogs-006 — переснято успешно после появления демо-каталога videopacks=catalog / повторного прогона.
#   results-009        — запись уже тапает #stats-primary-metric-year перед see:#stats-activity-365 (ошибка была на старых шагах).
#   dialogs-016        — НУЖЕН ЖИВОЙ ХОД: кнопка озвучки только у реплики с готовым голосом, подставной ход звук не подделывает.
#   mistakes-panel-021 — подмена сделана: mistakes=demo теперь засевает журнал гостя ≥5 готовыми ошибками (app/dev_mistakes_seed.ts,
#                        лог [DEV-STATE] mistakes seeded N ready); практика читает этот журнал, `minFive` больше не срабатывает. Ссылка прежняя.
import re

from dev_links_r1_steps import ENTRIES, add


def _entry(rid):
    if rid not in ENTRIES:
        raise SystemExit(f'errfix: нет записи {rid} в ENTRIES — исправление не к чему применяться')
    return ENTRIES[rid]


def set_steps(rid, steps):
    _entry(rid)['steps'] = list(steps)


def prepend_steps(rid, head):
    entry = _entry(rid)
    if entry['steps'][:len(head)] != list(head):
        entry['steps'] = list(head) + entry['steps']


def set_param(rid, key, value):
    """Задать параметр ссылки: заменить значение или вставить перед `&next=`."""
    entry = _entry(rid)
    link = entry['link']
    if re.search(rf'[?&]{re.escape(key)}=', link):
        link = re.sub(rf'([?&]{re.escape(key)}=)[^&]*', rf'\g<1>{value}', link, count=1)
    else:
        link = link.replace('&next=', f'&{key}={value}&next=', 1)
    entry['link'] = link


# coins-004: кадр ошибки показывает, что состояние «Проверяем повышение» УЖЕ достигнуто (тап прошёл, коин-ранг удерживается
# coinupgrade=hold), но `await:#coin-rank-pending-spinner` не находит узел: KitSpinner крутится бесконечно (Animated.loop),
# и дамп uiautomator не доходит до idle — как на Блице. Ждём по времени, а не по дереву: скриншот от дампа не зависит.
set_steps('coins-004', ['wait:1500', 'tap:#coin-rank-upgrade', 'wait:900'])

# system-015: на кадре ошибки Главная прокручена вниз прошлым прогоном — кнопки шапки не видны, а робот ищет вниз. Сначала вверх.
prepend_steps('system-015', ['scroll:up', 'wait:400'])

# spire-gap-022: ссылка вела на ?state=room (экран задания «Ступень 3»), а пилюля «бета» — на ГЛАВНОМ экране Шпиля
# (SpireHomeScreen: показывается только при изучаемом es/de/fr/it). Нужны state=lobby и studyTarget=es.
_spire = _entry('spire-gap-022')
if 'state=room' in _spire['link']:
    _spire['link'] = _spire['link'].replace('state=room', 'state=lobby', 1)
set_param('spire-gap-022', 'studyTarget', 'es')
set_steps('spire-gap-022', ['wait:2500', 'see:#spire-beta-pill'])

# mistakes-panel-021: ссылка обязана включать mistakes=demo (засев журнала); шаги прежние — хаб → «Начать» → шторка → практика → меню.
if 'mistakes=demo' not in _entry('mistakes-panel-021')['link']:
    set_param('mistakes-panel-021', 'mistakes', 'demo')

# spire-gap-016: «Итог недели» снимался на данных не образца («Нефрит · этаж 7»), ссылка не несла tier/floor. Образец — «Гранит, этаж 4».
_week = _entry('spire-gap-016')
if 'tier=' not in _week['link']:
    _week['link'] = _week['link'] + '%26tier=0%26floor=4'

# cards-v2-037 / cards-section-046: в образце сердца в шапке (SessionAttemptsHud), а кадр снят в режиме Б энергии (EnergyAttemptsHud) — mode=a.
for _rid in ('cards-v2-037', 'cards-section-046'):
    set_param(_rid, 'mode', 'a')

# Проверено и НЕ менялось (ссылка и шаги уже верны, кадр в пересклейке «старый»): cards-041 (#fc-pack-menu на экране набора), cards-gap-011 и cards-v2-027
# (тап #fc-cards-hub-train + пауза), cards-v2-046 (ввод Layover), cards-v2-026 (cards=empty + hidekb), dialogs-gap-016 (hidekb), cards-v2-044 (fail=catalog_load).
# spire-gap-019 — шторка правил на кадре закрыта; причина без журнала [SPIRE-RULES] не установлена, нужна пересъёмка с журналом.

# spire-004/005/014/015 (Макеты 847b8151c): ссылка превью Шпиля не несла tier/floor, поэтому кадр снимался на умолчаниях «Нефрит · этаж 7». Образец — «Гранит, этаж 4».
for _rid in ('spire-004', 'spire-005', 'spire-014', 'spire-015'):
    _spire_row = _entry(_rid)
    if 'tier=' not in _spire_row['link']:
        _spire_row['link'] = _spire_row['link'] + '%26tier=0%26floor=4'

# cards-081: на кадре панель ввода ОС (⌫, поиск, смайл) после type:zzzqq — прячем клавиатуру перед кадром.
_c81 = _entry('cards-081')
if _c81['steps'][-2:] != ['hidekb', 'wait:400']:
    _c81['steps'] = _c81['steps'] + ['hidekb', 'wait:400']

# dialogs-041: настроение «Очень доволен» берётся из mood последнего хода (Ядро), а подставной ход приходил с mood:null — без dev_dialog_mood=happy состояние не показывается.
set_param('dialogs-041', 'dev_dialog_mood', 'happy')

# onboarding-003/004/005 (Сверка, ROBOT_M_B1): кнопки на кадрах ошибок ВИДНЫ («Войти через Google», «У меня уже есть аккаунт»), но снимка дерева на анимирующихся экранах онбординга нет
# (логотип и заголовок полупрозрачны — вход экрана ещё играет), поэтому тап по testID не находит узел. Пауза подлиннее и нажатие по координатам экрана 1080×2400
# (как у cards-v2-037): Google — (540,1902), «У меня уже есть аккаунт» — (540,2242). Онбординг заморожен — меняются только шаги робота, не код.
set_steps('onboarding-003', ['tap:#onboarding-existing-account', 'wait:1800', 'xy:540,1902', 'wait:9500'])
set_steps('onboarding-004', ['tap:#onboarding-existing-account', 'wait:1800', 'xy:540,1902', 'wait:1200'])
set_steps('onboarding-005', ['wait:1500', 'xy:540,2242', 'wait:1800', 'xy:540,1902', 'wait:1500'])

# dialogs-010 (Ядро 91c80f60e): образец — экран «AI-диалоги выключены» (отказ согласия), а общее правило генератора вело на паузу диалогов
# (dialogs_paused=1 → «Диалоги на паузе»). Подмена aiConsent=denied живёт только в памяти (запись согласия и облако не вызываются), энергию не трогаем.
add('dialogs-010', [], 'aiConsent=denied', '/ai_dialog_home', note='экран «AI-диалоги выключены» (отказ согласия): aiConsent=denied, без паузы диалогов и без подмены энергии')

# settings-gap-028: «Ежедневное напоминание» неактивно, пока выключен ГЛАВНЫЙ переключатель («Разрешить уведомления»), а строка «Время» активна только при master && daily —
# прежние шаги включали только daily (он disabled) и окно не открывалось. Сначала master, потом daily, потом «Время». robot_no_cloud=1 уже в ссылке: тумблеры меняют только экран.
set_steps('settings-gap-028', ['tap:#notif-master-switch', 'wait:500', 'tap:#notif-daily-switch', 'wait:500', 'tap:#notif-time-label', 'wait:700'])
# зачем (бэклог №18, Авторизация 13.10): по журналу кадра 11:58 мастер у гостя уже был включён (focus_permission master=true) — первый тап его
# ВЫКЛЮЧАЛ, «Время» становилось неактивным, окно не открывалось. Стартовое состояние гостя между прогонами разное, поэтому reminderTime=20:00 теперь
# ещё и витрина: экран показывает мастер и ежедневное напоминание включёнными (только показ, app/settings_notifications.tsx devShowcase). Шаг один.
set_steps('settings-gap-028', ['wait:800', 'tap:#notif-time-label', 'wait:700'])

# system-015 (Авторизация 3d27dc084): шаги верны — колокольчик открывает шторку «Сообщения» (кадр 02:22 это подтверждает, раньше открывалась Главная из-за прокрутки).
# Остаток — ДАННЫЕ, не шаги: у гостя приходит закреплённое сообщение команды («Замочки ушли в отпуск!»), а макет — пустые «Сообщений нет». Крестик на карточке пишет
# dismissAppMessage в облако (нельзя с робота и испортит соседние строки с этим сообщением) → нужна подмена Ядра (например dev_state?inbox=empty). Шаги не меняю.

# cards-046 (Сверка R7): текст поиска zzzqq уже как в образце (cards-v2.html phone 66), но на кадре клавиатура ОС — прячем перед съёмкой (hidekb трогает только показанную).
_c46 = _entry('cards-046')
if _c46['steps'][-2:] != ['hidekb', 'wait:400']:
    _c46['steps'] = _c46['steps'] + ['hidekb', 'wait:400']

# energy-modes-007 (Сверка R7): после «Начать» при нуле энергии кадр снимался на остатке экрана урока (пилюля ⚡ 0), а образец — список уроков с тостом «Нужна энергия».
# Добавляем возврат: системная «назад» и пауза под тост. Если после «назад» откроется подтверждение выхода — нужен журнал кадра, тогда второй шаг.
set_steps('energy-modes-007', ['wait:3000', 'tap:#lesson-menu-primary', 'wait:1500', 'back', 'wait:1500'])

# cards-v2-088 (Макеты 303b3efc4/ad7f4ebd9): настройка Блица, наборы на 2 языках — чип «ES ⌄» и меню. Подмена cardslangs=on выбирает языки по studyTarget, НЕ по языку интерфейса
# (app/dev_fc_lang_state.ts getDevOtherLanguageDecks), поэтому uiLang=en не нужен: образец №88 русский. Сейчас меню покажет English/Español/Français (3 языка) против двух в образце —
# нужен dev-вариант cardslangs от Ядра («два языка»: English 6 + Español 3).
add('cards-v2-088', ['wait:1800', 'tap:#fc-training-setup-language-chip', 'wait:400'], 'cards=demo&plus=off&free=on&studyTarget=es&cardslangs=on', '/flashcards_training_setup?mode=blitz', unique=False,
    note='меню языка наборов открыто: чип «ES ⌄» (studyTarget=es), cardslangs=on — списки других языков в памяти; образец №88 — два языка (English 6 / Español 3)')

# cards-v2-089 (Макеты d6c3edde9): каталог сообщества, есть недоделанный черновик — строка «Продолжить создание набора» (FlashcardsCategoryHub, testID flashcards-packs-continue-draft).
# Новый флаг не нужен: packdraft=on (app/dev_cards_state.ts) кормит и экран создания, и hasMeaningfulCommunityPackCreateDraft в каталоге (подмена в памяти, хранилище не пишется);
# cards=demo чистит только настоящий черновик. catalog=demo — демо-каталог без сети. Пауза под асинхронную проверку черновика.
add('cards-v2-089', ['wait:1500'], 'cards=demo&catalog=demo&packdraft=on', '/flashcards_packs', unique=False,
    note='каталог сообщества с черновиком: строка «Продолжить создание набора» (packdraft=on — черновик из памяти, catalog=demo — демо-каталог)')

# system-015 / settings-gap-028 (Ядро 4ca9997fd): подмены только для показа — inbox=empty скрывает закреплённое серверное сообщение (образец «Сообщений нет»),
# reminderTime=20:00 показывает время напоминания как в образце (расписание и хранилище не меняются). Шаги этих строк верны (см. выше).
set_param('system-015', 'inbox', 'empty')
set_param('settings-gap-028', 'reminderTime', '20:00')

# energy-modes-017 (Ядро/координатор 13.10): кадр снимался на скелете меню урока — после тапа «Начать» нет паузы под окно «Нет энергии» (NoEnergyModal): ждём 2,5 с.
set_steps('energy-modes-017', ['wait:3000', 'tap:#lesson-menu-primary', 'wait:2500'])

# ── Промокод и код друга (Сверка R7, заметки Макетов): на кадрах клавиатура ОС и код «TESTCODE» вместо кода образца.
# Образцы (promo-code-states.html / referral-code-states.html): 007 WELCOME30, 008 FOREVER, 009 ABC123, 010 SPRING24, 011 FRIENDS50, 012 TRY12345, 014/015 WELCOME30.
# Шаги: тап в поле → ввод кода образца → hidekb (убирает клавиатуру, только если показана) → «Активировать» → пауза под ответ. Подмены promo=/refcode= в ссылках прежние.
_PROMO = {7: 'WELCOME30', 8: 'FOREVER', 9: 'ABC123', 10: 'SPRING24', 11: 'FRIENDS50', 12: 'TRY12345', 15: 'WELCOME30'}
for _n, _code in _PROMO.items():
    _rid = 'overlays-campaigns-%03d' % _n
    if _rid in ENTRIES:
        set_steps(_rid, ['tap:#promo-code-input', 'type:' + _code, 'hidekb', 'tap:#promo-code-submit', 'wait:800'])

# код друга: после type прячем клавиатуру (hidekb) перед тапом «Применить» и перед кадром; у 017 (кнопка не нажимается) — просто спрятать после ввода.
for _n in range(17, 27):
    _rid = 'overlays-campaigns-%03d' % _n
    if _rid not in ENTRIES:
        continue
    _st = list(ENTRIES[_rid]['steps'])
    if 'hidekb' in _st or not any(x.startswith('type:') for x in _st):
        continue
    _i = max(i for i, x in enumerate(_st) if x.startswith('type:'))
    _st[_i + 1:_i + 1] = ['hidekb', 'wait:200']
    ENTRIES[_rid]['steps'] = _st

# ── «Мои ошибки»: строки 005 («Все ошибки — ждут») и 010 («Выбери перевод») не имели записи в DEV_LINKS — кадры были ручными (11.10) и старше кода. Путь:
# 005 — хаб → список /mistakes_list?filter=ready (mistakes=demo засевает журнал; нужен свежий гость — Ядро cc8a35a65); 010 — хаб → «Начать» → шторка → первый вопрос практики (как 021 без меню).
add('mistakes-panel-005', ['wait:1500'], 'mistakes=demo&studyTarget=en', '/mistakes_list?filter=ready', unique=False, note='список «Все ошибки», вкладка «Ждут» (mistakes=demo — демо-журнал)')
add('mistakes-panel-010', ['wait:1500', 'tap:#mistakes-hub-start', 'wait:800', 'tap:#mistakes-hub-sheet-start', 'wait:2500'], 'mistakes=demo&studyTarget=en&energy=5', '/mistakes_hub', unique=False, note='первый вопрос отработки «Выбери перевод» (демо-ошибки; energy=5 — ворота энергии)')

# onboarding-018 (Сверка): шаг «Уведомления» играет анимацию появления — кадр нужен после паузы ≥ 3 с (меняются только шаги, вид онбординга заморожен владельцем 11.10).
set_steps('onboarding-018', ['wait:3500'])

# settings-gap-002/003/004/030 (Авторизация AUTH_ZONES_DIFF_ROWS_R1): главная Настроек снималась сверху, образцы — низ страницы («PHRASEMAN PLUS»). 002/003/030 уже несут прокрутку (chain7 _SET_BOTTOM);
# 004 («Plus по коду»: see:#settings-plus-access-details) шёл без прокрутки — цель ниже края экрана (правило Сверки y>2150): явная прокрутка вниз, затем see: и пауза.
set_steps('settings-gap-004', ['wait:1200', 'scroll:down', 'scroll:down', 'see:#settings-plus-access-details', 'wait:500'])

# paywalls-024/025, profile-022/023 (координатор 13.10): тап #manage-subscription-reasons-continue → submitCancel → при отсутствии шага удержания openStoreCancel →
# Linking.openURL(getStoreManageUrl()) — выход в магазин управления подпиской; с аккаунтов владельца НЕ трогаем. Тап убран; состояния «оверлей удержания»
# (024/022) шагами недостижимы — нужна dev-подмена шага удержания у Ядра (например saveOffer=progress), пока кадр показывает список причин.
for _rid in ('paywalls-024', 'paywalls-025', 'profile-022', 'profile-023'):
    if _rid in ENTRIES:
        ENTRIES[_rid]['steps'] = [x for x in ENTRIES[_rid]['steps'] if x != 'tap:#manage-subscription-reasons-continue']
# зачем (координатор 13.10, фикстура Ядра 92c6d2206): dev_state?saveOffer=progress|support открывает шаг удержания сам — тапы «Отменить → причина → Продолжить»
# больше не нужны (и не рискуют увести в магазин). 024/022 — «Сохранить доступ» (progress: 12 дней и 38 уроков подставляет сама фикстура, offerProgress не нужен),
# 025/023 — «Поддержка или отмена» (support). Ссылка получает saveOffer, шаги — только ожидание открытия шторки.
for _rid, _kind in (('paywalls-024', 'progress'), ('profile-022', 'progress'), ('paywalls-025', 'support'), ('profile-023', 'support')):
    if _rid in ENTRIES:
        _e = ENTRIES[_rid]
        _e['steps'] = ['wait:2000']
        _link = _e['link'].replace('&offerProgress=on', '')
        if 'saveOffer=' not in _link:
            _link = _link.replace('&next=', '&saveOffer=' + _kind + '&next=', 1)  # overlays=off дописывает генератор
        _e['link'] = _link

# ── Итог урока (Дизайн 13.10: dev-параметр devResult=верно:ошибок в /lesson_complete — цифры, медаль, пример ошибки; без него итог «пустой» без прогресса).
# Числа — из образцов: learn.html E1 48:2 (3★ ≥85 %), E2 38:12 (2★), E3 27:23 (1★), E4 47:3 («следующий в Plus»), practice.html «Урок V1 — 2 звезды» 15:5.
for _rid, _res in (('paywalls-009', '38:12'), ('paywalls-010', '48:2')):
    _e = _entry(_rid)
    if 'devResult=' not in _e['link']:
        _e['link'] = _e['link'].replace('%26passed=1', '%26passed=1%26devResult=' + _res, 1)
for _rid, _res, _plus, _note in (
        ('learn-047', '48:2', 'plus=off', 'итог урока E1: 3★ (≥85 %), 48 верно / 2 ошибки'),
        ('learn-048', '38:12', 'plus=off', 'итог урока E2: 2★ (60–84 %), 38 / 12'),
        ('learn-049', '27:23', 'plus=off', 'итог урока E3: 1★ (<60 %), 27 / 23'),
        ('learn-050', '47:3', 'plus=off', 'итог урока E4: «Урок пройден — следующий в Plus», 47 / 3'),
        ('practice-024', '15:5', 'plus=off', 'итог урока V1 — 2 звезды, 15 / 5')):
    if _rid not in ENTRIES:
        add(_rid, ['wait:3000'], _plus, '/lesson_complete?id=3%26passed=1%26devResult=' + _res, unique=False, note=_note + ' (devResult — демо в памяти, прогресс не пишется)')

# зачем (координатор 13.10, Авторизация): у learn-047…050, practice-024, mistakes-panel-005/010 в реестре нет release=r1 —
# генератор (dev_links_r1_generate.py:37) берёт только r1 или INCLUDE_IDS, и ссылки выше молча не попадали в DEV_LINKS_R1.
import dev_links_r1_steps_robot as _STEPS_ROBOT  # noqa: E402
_STEPS_ROBOT.INCLUDE_IDS.update({'learn-047', 'learn-048', 'learn-049', 'learn-050', 'practice-024', 'mistakes-panel-005', 'mistakes-panel-010'})

# results-009 (владелец 13.10, вопрос 17): «Активность за год» теперь ОТДЕЛЬНЫЙ экран /year_activity (раньше — полоска внутри «Серии и статистики»). Прямая ссылка на экран,
# данные из кэша активности гостя (демо-подмены активности пока нет — сетка может быть пустой, итоги 0); тап по полоске на «Серии…» ведёт туда же.
_ya = _entry('results-009')
_ya['link'] = _ya['link'].replace('next=/streak_stats', 'next=/year_activity')
_ya['steps'] = ['wait:2000']

# зачем (координатор 13.10 ~11:25): кадры Шпиля в образцах сняты с 2 энергии — все строки spire-* / spire-gap-* открываются с energy=2,
# кроме spire-016 (кадр «нет энергии» — energy=0). Подмена энергии только в памяти (dev_state), Firestore не трогается.
for _rid in sorted(ENTRIES):
    if _rid.startswith('spire-'):
        set_param(_rid, 'energy', '0' if _rid == 'spire-016' else '2')

# results-009: подмена Ядра 0bc13b5b7 — yearActivity=demo даёт заполненную сетку и итоги образца (только __DEV__ и память).
set_param('results-009', 'yearActivity', 'demo')

# зачем (координатор 13.10): EXCLUDE_IDS — строки, которые не попадают в DEV_LINKS_R1 (генератор читает рядом с INCLUDE_IDS). Сейчас пусто:
# spire-gap-021 (флажок жалобы тестера) исключали по ошибке — по заметке реестра это рабочая функция стор-сборки, координатор вернул её (~11:40).
_STEPS_ROBOT.EXCLUDE_IDS = set(getattr(_STEPS_ROBOT, 'EXCLUDE_IDS', set()))

# learn-003/004 (бэклог №18, Авторизация 13.10): вкладки «Уроки | V2» запоминают выбор (Темы bdb1dbe2e) — после прогона на V2 экран открывался на V2,
# поиска старых уроков нет, тап мимо, а hidekb без клавиатуры = «назад» → кадр Главной (журнал 12:09: /lessons, затем /home). Сначала вкладка «Уроки» по testID.
for _rid in ('learn-003', 'learn-004'):
    prepend_steps(_rid, ['wait:1500', 'tap:#lessons-tab-lessons', 'wait:500'])

# dialogs-gap-011 (бэклог №18): свободный разговор стартует на ПЕРВОЙ реплике — шаг «wait» без отправки не доходил до отказа (в журнале кадра
# 11:09 нет «[DEV-STATE] freeform: старт подменён отказом»). Отправляем реплику — dev_dialog_fail=service даёт «не удалось продолжить».
set_steps('dialogs-gap-011', ['wait:1500', 'tap:#dialogue-v2-freeform-input', 'type:Hello', 'tap:#dialogue-v2-freeform-send', 'wait:1500'])

# profile-024 / paywalls-022 (бэклог №18): в карточке плана нет «Следующее списание» — dev-план с датой проигрывал пустому ответу RevenueCat эмулятора
# (исправлено в manage_subscription.tsx). planUntil=2027-01-14 — дата образца («14 января 2027»), только память dev-сборки.
for _rid in ('profile-024', 'paywalls-022'):
    set_param(_rid, 'planUntil', '2027-01-14')

# ── Проход по реестру R1 (координатор 13.10 ~14:35, продолжение №18): строки с бракованным кадром по ссылке.
# «Следующее списание · 14 января 2027» нужно во всех кадрах экрана подписки с годовым планом — та же дата образца, что у profile-024.
for _rid, _entry_ in list(ENTRIES.items()):
    if 'next=/manage_subscription' in _entry_['link'] and 'plan=yearly' in _entry_['link'] and 'planUntil=' not in _entry_['link']:
        set_param(_rid, 'planUntil', '2027-01-14')
# settings-gap-004: образец прокручен до «Версия 2.0.0» — кадр был сверху («ПОМОЩЬ» под панелью вкладок).
set_steps('settings-gap-004', ['wait:1200', 'see:#settings-plus-access-details', 'scroll:down', 'scroll:down', 'scroll:down', 'wait:500'])
# settings-gap-022: в образце набран текст ≥ 10 символов и «Отправить» активна; adb не печатает кириллицу — английский текст (отправку не жмём).
set_steps('settings-gap-022', ['tap:#support-report-input', 'type:Cards_audio_does_not_play', 'hidekb', 'wait:300', 'tap:#support-diagnostics-disclosure', 'wait:400'])
# settings-gap-035: в образце журнал диагностики ВЫКЛЮЧЕН («журнал выключен») и клавиатуры нет.
set_steps('settings-gap-035', ['tap:#support-diagnostics-attach-switch', 'wait:300', 'tap:#support-report-input', 'type:short', 'hidekb', 'wait:400'])

# ── Разбор Ядра 13.10 (журналы кадров _runs/*/<id>.log): ссылка давала бракованный кадр. Код не меняется, testID на месте.
# paywalls-008: меню урока без шагов — до карточки ИИ-разбора робот не доходил. Неверный ответ → проверка → разбор грузится сам,
# ai_explain=limit сразу ставит «лимит» без сервера (use_mistake_explain.ts).
ENTRIES.pop('paywalls-008', None)
add('paywalls-008',
    ['wait:2500', 'tap:#lesson1-word-option-wrong', 'tap:#lesson1-word-option-correct', 'tap:#lesson1-word-option-correct',
     'tap:#lesson1-check', 'await:#ai-mistake-limit-card', 'see:#ai-mistake-limit-card', 'wait:400'],
    'plus=off&aiConsent=granted&ai_explain=limit&free=on&lessonintro=skip&mode=a&energy=5', '/lesson1?id=1%26from=lesson_menu',
    unique=False, note='карточка ИИ-разбора «лимит» после неверной проверки (ai_explain=limit — подмена в памяти, без сервера)')
# paywalls-009/010: подмена upsell применялась, но кадр снимался через 3 с — анимация наград дольше; ждём саму карточку.
for _rid in ('paywalls-009', 'paywalls-010'):
    set_steps(_rid, ['await:#soft-upsell-card', 'see:#soft-upsell-card', 'wait:500'])
# dialogs-032 / dialogs-gap-012: отказ хода достигнут («ход подменён отказом»), но кадр с открытой клавиатурой.
for _rid in ('dialogs-032', 'dialogs-gap-012'):
    if _entry(_rid)['steps'][-2:] != ['hidekb', 'wait:400']:
        _entry(_rid)['steps'] = _entry(_rid)['steps'] + ['hidekb', 'wait:400']
# dialogs-032: пилюля квоты «30/30» как в образце (как dialogs-012).
set_param('dialogs-032', 'dquota', '30')

# ── Партия «ссылка даёт бракованный кадр» (координатор 13.10, разбор Авторизации 78a47ad16; зона Темы). Вид приложения не меняется — только фикстуры, ожидания и ввод. ──
# cards-021: кадр снят на служебной странице «DEV-STATE OK» — переход на редактор не успел сработать: ждём перехода.
set_steps('cards-021', ['wait:2500'])
# cards-061 / cards-022: полноэкранный редактор «Новая карточка» с живым превью (Layover/пересадка, без клавиатуры) — фикстура cardsdraft=filled (Дизайн 39548e8d9).
set_param('cards-061', 'cardsdraft', 'filled')
_e022 = _entry('cards-022')
_e022['link'] = _e022['link'].replace('next=/community_pack_create', 'next=/flashcards_card_editor?create=1%26cat=custom', 1)
set_param('cards-022', 'cardsdraft', 'filled')
set_steps('cards-022', ['wait:2500'])
# cards-066: «Новый набор» с выбранным «Только я» — фикстура packdraft=private; шторка «Новая карточка» не открывается.
set_param('cards-066', 'packdraft', 'private')
set_steps('cards-066', ['wait:2500'])
# cards-071: окно лимита «Карточек уже 50» — перед тапом «+ Карточка» ждём экран создания набора.
set_steps('cards-071', ['wait:2500', 'tap:#ugc-pack-add-card', 'wait:600'])
# cards-section-020: шторка «Новая карточка» поверх «Нового набора» с введёнными данными (образец: «Путешествия», A2, «Карточки 2») — packdraft=few.
set_param('cards-section-020', 'packdraft', 'few')
set_steps('cards-section-020', ['wait:2500', 'tap:#ugc-pack-add-card', 'wait:600'])
# cards-section-029: «Нет сети» с «Повторить» — кадр снимался на скелете загрузки: ждём, пока сработает fail=catalog_load.
set_steps('cards-section-029', ['wait:3000'])
# cards-v2-034: «Вспомни и напиши» — в образце набрано «dela», кнопка «Проверить» активна.
set_steps('cards-v2-034', ['wait:4000', 'tap:#fc-recall-input', 'type:dela', 'hidekb', 'wait:400'])
# profile-008: темы — в образце тёмный режим и ползунок в середине (снят был светлый, насыщенность 0).
set_param('profile-008', 'appearance', 'dark')
set_param('profile-008', 'level', '0.5')
