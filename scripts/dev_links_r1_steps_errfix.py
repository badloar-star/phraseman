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
