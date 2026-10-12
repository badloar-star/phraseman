# Ссылки и шаги для строк, которые Сверка пропустила в chain7 (координатор 12.10; rescan_verdicts_2026-10-12.md, «Пропущенные»).
#
# зачем: у этих id не было строки в DEV_LINKS_R1 (или стоял «ручной путь»). Здесь — только то, что открывается СУЩЕСТВУЮЩИМИ dev-подменами
# (память процесса, без записей в прод, гость). Чего не хватает (новая подмена/testID в чужом экране) — не пишется кодом, а уходит списком
# координатору (docs/work/tasks/dev-links-selectors-template-and-chain7-gaps-2026-10-12.md). cards-001 / cards-section-001 — removed_by_owner.
# Модуль подключается в генераторе ПОСЛЕ dev_links_r1_steps_auth: копии записей Карточек (блиц) берутся из уже собранных ENTRIES.
from dev_links_r1_steps import ENTRIES, add
import dev_links_r1_steps_robot as STEPS_ROBOT

# строки без release=r1 в реестре — генератор берёт их по этому списку (тот же механизм, что у модуля Макетов)
CHAIN7_IDS = {
    'learn-001', 'learn-003', 'learn-004', 'learn-014', 'learn-028', 'learn-032',
    'dialogs-015', 'dialogs-016', 'dialogs-019', 'dialogs-022', 'dialogs-041',
    'practice-001', 'practice-002', 'practice-003',
    'community-025', 'system-015', 'results-007', 'results-009', 'mistakes-panel-004', 'mistakes-panel-021',
    # Авторизация 12.10: новые подмены coins=N / coinupgrade=hold / errorscreen=on / appmessage=announcement
    'coins-001', 'coins-003', 'coins-004', 'system-010', 'system-012',
    # Дизайн 12.10 (228448bfe): демо-каталог YouTube в памяти — videopacks=catalog|catalog_upcoming
    'video-001', 'video-004', 'video-008', 'video-009', 'video-011',
    # Ядро 12.10 (d53db125f): lessonsDone / examA1 / dev_dialog_why + метка верного слова lesson1-word-option-correct
    'learn-007', 'learn-008', 'learn-011', 'learn-012', 'learn-013', 'learn-029', 'learn-031', 'dialogs-020',
}
STEPS_ROBOT.INCLUDE_IDS.update(CHAIN7_IDS)

LESSONS = '/(tabs)/lessons'
# Free как в сторе: в dev-сборке уроки открыты флагом разработчика, free=on возвращает настоящие ворота Free
FREE = 'plus=off&free=on&studyTarget=en'

# ── A. Список уроков
add('learn-001', ['wait:1500'], FREE, LESSONS, note='список уроков у Free (A1)')
add('learn-003', ['wait:1500', 'tap:#legacy-lessons-search-toggle', 'wait:500'], 'plus=on&studyTarget=en', LESSONS, note='список уроков: поиск открыт (A3)')
add('learn-004', ['wait:1500', 'tap:#legacy-lessons-search-toggle', 'tap:#legacy-lessons-search-input', 'type:zzqx', 'wait:600'],
    'plus=on&studyTarget=en', LESSONS, note='поиск — ничего не нашлось (A4; запрос «zzqx»)')
add('learn-014', ['wait:1500', 'tap:#lessons-row-4', 'wait:1500'], FREE, LESSONS, note='Free тапает урок 4 → пейвол-вход (A13)')

# ── D. Урок — сборка фразы (база ссылок урока 1 как у energy-modes: вступление пропущено в памяти)
LESSON1 = '/lesson1?id=1%26from=lesson_menu'
LESSON_BASE = 'plus=off&free=on&studyTarget=en&lessonintro=skip'
add('learn-028', ['wait:2500'], LESSON_BASE + '&mode=a&energy=5', LESSON1, note='задание — пусто (D1): первый вопрос урока 1')
add('learn-032', ['wait:2500', 'tap:#lesson1-word-option-wrong', 'wait:300'], LESSON_BASE + '&mode=b&energy=5', LESSON1,
    note='неверно — сердце потеряно (D5): dev-метка первого неверного слова, режим сердец (mode=b)')

# ── Диалоги: сессия на подставном ходе (dev_dialog_send=ok), без сервера ИИ
DLG = '/ai_dialog_home'
DLG_BASE = 'plus=off&dquota=reset&energy=5&dev_dialog_send=ok'
DLG_START = ['tap:#dialogue-v2-world-toggle-*', 'tap:#dialogue-v2-catalogue-row-*', 'tap:#dialogue-v2-briefing-start', 'wait:3000']
SEND = ['tap:#dialogue-v2-session-input', 'type:Hello', 'tap:#dialogue-v2-session-send', 'wait:2500']
add('dialogs-015', DLG_START + SEND + ['tap:#dialogue-v2-translate-*', 'wait:600'], DLG_BASE, DLG, note='перевод показан: тап «Перевод» у реплики собеседника')
add('dialogs-016', DLG_START + ['tap:#dialogue-v2-prepared-bot-voice-*', 'wait:400'], DLG_BASE, DLG, unique=False,
    note='НУЖЕН ЖИВОЙ ХОД (Ядро 7c59646d8): кнопка озвучки — только у реплики, для которой сервер выбрал готовый голос и клиент его скачал; у открывающей реплики голоса нет, подставной ход звук не подделывает — снимать вручную на живом диалоге')
add('dialogs-019', DLG_START + SEND + ['tap:#dialogue-v2-why-*', 'wait:800'], DLG_BASE, DLG, note='шторка «Почему так» (первый из 3 разборов Free за день)')
add('dialogs-022', DLG_START + ['tap:#dialogue-v2-session-input', 'type:Hel', 'wait:500'], DLG_BASE, DLG, note='ввод текстом: клавиатура открыта, набрано «Hel» (не отправлять)')
COMPLETE = ['tap:#dialogue-v2-session-more', 'tap:#dialogue-v2-session-menu-complete', 'wait:1500']
add('dialogs-041', DLG_START + SEND + COMPLETE, DLG_BASE + '&dev_dialog_completion=errors', DLG, note='итог диалога — с ошибками (dev_dialog_completion=errors)')

# ── Блиц (practice.html) = те же кадры, что cards-section-044/045 (подмена blitz_answer помечает нужный вариант)
_blitz_ok = ENTRIES['cards-section-044']
_blitz_bad = ENTRIES['cards-section-045']
ENTRIES['practice-001'] = {**_blitz_ok, 'steps': ['wait:4000', 'await:#fc-blitz-opt-target'], 'unique': False, 'note': 'блиц: вопрос (до ответа)'}
ENTRIES['practice-002'] = {**_blitz_ok, 'unique': False, 'note': 'блиц: верный ответ (дубль cards-section-044)'}
ENTRIES['practice-003'] = {**_blitz_bad, 'unique': False, 'note': 'блиц: неверный ответ (дубль cards-section-045)'}

# ── Сообщество, сообщения, статистика, «Мои ошибки»
add('community-025', ['wait:1500'], 'cards=demo&plus=on&studyTarget=en', '/flashcards_packs', note='каталог наборов сообщества (демо-каталог cards=demo, без сети)')
# зачем (Сверка chain21): колокольчик Главной — home-notification-center-button; home-app-messages-button рисуется внутри входящих, не на Главной
add('system-015', ['wait:1500', 'tap:#home-notification-center-button', 'await:#notification-center-screen', 'wait:600'], 'plus=off', '/(tabs)/home', note='входящие — пусто (у свежего гостя нет сообщений)')
add('results-007', ['wait:1500'], 'plus=on', '/streak_stats', note='серия и неделя (данные гостя — нули; цифры макета отличаются)')
# зачем (Сверка chain21): карта за год рисуется только при показателе «год» (streak_stats.tsx: metric === 'year')
add('results-009', ['wait:1500', 'tap:#stats-primary-metric-year', 'wait:600', 'see:#stats-activity-365'], 'plus=on', '/streak_stats', note='активность за год (показатель «год»)')
add('mistakes-panel-004', ['wait:1500', 'tap:#mistakes-hub-start', 'wait:800'], 'mistakes=demo&studyTarget=en', '/mistakes_hub', note='«Перед отработкой»: шторка старта на демо-ошибках')
add('mistakes-panel-021', ['wait:1500', 'tap:#mistakes-hub-start', 'wait:800', 'tap:#mistakes-hub-sheet-start', 'wait:2500', 'tap:#mistake-practice-menu', 'wait:500'],
    'mistakes=demo&studyTarget=en&energy=5', '/mistakes_hub', note='меню задания в отработке ошибок (демо-ошибки; energy=5 — старт идёт через ворота энергии)')

# ── Монеты: баланс 12 480 и ранг 5 «Лектор» (coins.html) — только показ (app/dev_coin_rank.ts); при подменённом балансе настоящее повышение
# отказывает до сервера, coinupgrade=hold держит «Проверяем повышение…» без сервера — монеты не списываются ни в одной из ссылок
COINS = 'coinRank=5&coins=12480'
add('coins-001', ['wait:1500'], COINS, '/runes_wallet', note='кошелёк: 12 480 монет, ранг 5 (баланс только для показа, coins=12480)')
add('coins-003', ['wait:1500', 'see:#coin-rank-upgrade'], COINS, '/coin_rank', note='повышение: готово к подтверждению (Лектор → Эксперт за 6 000; кнопку НЕ жать)')
add('coins-004', ['wait:1500', 'tap:#coin-rank-upgrade', 'await:#coin-rank-pending-spinner', 'wait:400'], COINS + '&coinupgrade=hold', '/coin_rank',
    note='повышение: ожидание «Проверяем повышение…» (coinupgrade=hold — сервер не вызывается, списания нет)')

# ── Системное: экран ошибки без исключения и отчётов; окно «сообщение команды» из памяти (кнопки окна НЕ жать — без них подтверждение не уходит)
add('system-010', ['wait:2000'], 'errorscreen=on', '/(tabs)/home', note='экран ошибки корневой границы (errorscreen=on; снять — errorscreen=off или перезапуск)')
add('system-012', ['wait:2500'], 'appmessage=announcement&overlays=on', '/(tabs)/home',
    note='окно «сообщение команды»: демо-объявление из памяти (overlays=on — окна не гасятся)')

# ── Видео: демо-каталог YouTube из памяти (app/dev_youtube_demo.ts, Дизайн 228448bfe) — канал dev_en, премьера devDemoEvt1, ролики devDemoVid0…5,
# плейлисты PLdevDemoEveryday01 / PLdevDemoTravel0002; Firestore не вызывается. Превью i.ytimg.com несуществующих роликов пустые — для кадров состояний это норма.
VIDEO = 'videopacks=catalog&studyTarget=en'
add('video-001', ['wait:2500'], VIDEO, '/lingman_videos', note='главная канала (демо-каталог videopacks=catalog)')
add('video-004', ['wait:2500', 'see:#youtube-premiere-live'], VIDEO, '/lingman_videos', note='премьера «сейчас» (маркер youtube-premiere-live; «скоро» — videopacks=catalog_upcoming)')
add('video-008', ['wait:2500', 'tap:#youtube-tab-playlists', 'wait:600'], VIDEO, '/lingman_videos', note='вкладка «Плейлисты»')
add('video-009', ['wait:2500'], VIDEO, '/lingman_playlist?playlistId=PLdevDemoEveryday01&channelId=dev_en', note='плейлист PLdevDemoEveryday01')
add('video-011', ['wait:3000'], VIDEO, '/lingman_video_watch?videoId=devDemoVid0&channelId=dev_en&title=Ordering%20coffee%20like%20a%20local&source=deeplink',
    unique=False, note='ролик с фразами devDemoVid0: фразы из памяти, плеер без сети показывает своё состояние — кадр смотреть глазами')

# ── Список уроков: прогресс и экзамен A1 подменяются в памяти поверх снимка (Ядро d53db125f); ворота уроков считаются честно (без dev-разблокировки)
LP = 'plus=on&studyTarget=en'
add('learn-007', ['wait:1500', 'see:#legacy-lessons-exam-A1'], LP + '&lessonsDone=8&examA1=almost', LESSONS, note='экзамен A1 «Почти — 61%» (A7)')
add('learn-008', ['wait:1500', 'see:#legacy-lessons-exam-A1'], 'plus=off&studyTarget=en&lessonsDone=8', LESSONS, note='Free: экзамен «Откроется с Plus» (A8)')
add('learn-011', ['wait:1500', 'tap:#lessons-row-3', 'wait:600'], LP + '&lessonsDone=1', LESSONS, note='окно «Ещё рано» (A10): урок 3 закрыт по прогрессу; Plus — иначе пейвол')
add('learn-012', ['wait:1500', 'tap:#legacy-lessons-exam-A2', 'wait:600'], LP + '&lessonsDone=8', LESSONS, note='окно «Уровень пока закрыт» (A11): A1 пройден, экзамен A1 не сдан')
add('learn-013', ['wait:1500', 'tap:#legacy-lessons-exam-A1', 'wait:600'], LP + '&lessonsDone=2', LESSONS, note='окно «Недоступно» (A12): уровень не пройден')

# ── Урок 1: верное слово метит lesson1-word-option-correct (во всех сборках)
add('learn-029', ['wait:2500', 'tap:#lesson1-word-option-correct', 'wait:300'], LESSON_BASE + '&mode=a&energy=5', LESSON1,
    note='фраза собирается (D2): одно верное слово')
add('learn-031', ['wait:2500'] + ['tap:#lesson1-word-option-correct'] * 3 + ['wait:600'], LESSON_BASE + '&mode=a&energy=5', LESSON1,
    note='«Верно + монеты» (D4): все фразы урока 1 — по 3 слова (Ядро 12.10), 3 верных тапа завершают первую фразу')

# ── Диалог: «Почему так» — разборы на сегодня закончились (dev_dialog_why=spent, только память)
add('dialogs-020', DLG_START + SEND + ['tap:#dialogue-v2-why-*', 'wait:800'], DLG_BASE + '&dev_dialog_why=spent', DLG, note='шторка «Почему так»: бесплатные разборы на сегодня закончились')

# ── Карточки: публикация набора — «отправлено» (Макеты 12.10, подмена publish=ok: ответ в памяти, без записи)
add('cards-gap-025', ['tap:#fc-pack-menu', 'tap:#fc-pack-publish', 'wait:400'], 'cards=demo&plus=on&publish=ok', '/flashcards_collection?pack=local_pack_dev_demo_work',
    note='«Набор отправлен на публикацию» (publish=ok, без сети)')
