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
    note='озвучка играет: кнопка есть только у реплик с готовой озвучкой (приветствие); нет кнопки — у сценария нет готового голоса')
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
add('system-015', ['wait:1500', 'tap:#home-app-messages-button', 'wait:800'], 'plus=off', '/(tabs)/home', note='входящие — пусто (у свежего гостя нет сообщений)')
add('results-007', ['wait:1500'], 'plus=on', '/streak_stats', note='серия и неделя (данные гостя — нули; цифры макета отличаются)')
add('results-009', ['wait:1500', 'see:#stats-activity-365'], 'plus=on', '/streak_stats', note='активность за год (карточка внизу экрана)')
add('mistakes-panel-004', ['wait:1500', 'tap:#mistakes-hub-start', 'wait:800'], 'mistakes=demo&studyTarget=en', '/mistakes_hub', note='«Перед отработкой»: шторка старта на демо-ошибках')
add('mistakes-panel-021', ['wait:1500', 'tap:#mistakes-hub-start', 'wait:800', 'tap:#mistakes-hub-sheet-start', 'wait:2500', 'tap:#mistake-practice-menu', 'wait:500'],
    'mistakes=demo&studyTarget=en', '/mistakes_hub', note='меню задания в отработке ошибок (демо-ошибки)')
