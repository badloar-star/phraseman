# Ссылки и шаги для строк, которые робот Сверки пропускал (координатор 12.10, «29 id без ссылок»; сессия «Макеты»).
#
# зачем: 20 строк были match и потому не попадали в DEV_LINKS_R1 (генератор брал только pending|diff), а после правок кода их надо
# переснимать; ещё 6 строк имели «ручной путь» без ссылки. Пути выведены из кода и shot list, подмены — только dev-память
# (без записей в прод и без входа в аккаунты). Онбординг открывается подменой `onbstep=<шаг>` (app/dev_state_fixtures.ts), pm clear не нужен.
# Чего в коде нет (testID / подмена) — список Дизайну в docs/phraseman-2.0/R1_ROBOT_LINKS_GAPS.md; код здесь не правится.
from dev_links_r1_steps import add

# строки без поля release в реестре (гейт их считает) — генератор берёт их по списку
INCLUDE_IDS = {'onboarding-030', 'mistakes-panel-002'}

HOME = '/(tabs)/home'

# ── Онбординг: открыть с нужного шага (`onbstep` ставит onboarding=pending, общий onboarding=done его не перебивает)
add('onboarding-001', ['wait:1800'], 'onbstep=welcome', HOME, note='онбординг: приветствие (шаг welcome)')
add('onboarding-007', [], 'onbstep=privacy', HOME, note='онбординг: сейф «Твои данные — только твои» (шаг privacy)')
add('onboarding-009', [], 'onbstep=niceToMeet&greet=Alex', HOME, note='онбординг: знакомство (шаг niceToMeet, имя Alex)')
add('onboarding-011', ['wait:2500'], 'onbstep=promise', HOME, note='онбординг: «Прогресс» — график; пауза 2,5 с, пока дорисуется')
add('onboarding-012', [], 'onbstep=improve', HOME, note='онбординг: «Помоги сделать Phraseman лучше» (шаг improve)')
add('onboarding-013', [], 'onbstep=source', HOME, note='онбординг: «Как ты узнал о нас?» (шаг source)')
add('onboarding-014', ['tap:#onboarding-source-tiktok'], 'onbstep=source', HOME, note='онбординг: «Как ты узнал о нас?» с выбранным вариантом TikTok')
add('onboarding-015', ['wait:2000'], 'onbstep=language', HOME, note='онбординг: «Какой язык учим?» (шаг language)')
add('onboarding-018', ['wait:2000'], 'onbstep=notifications', HOME, note='онбординг: уведомления (шаг notifications)')
add('onboarding-022', [], 'onbstep=trialReminder', HOME, note='онбординг: «Напомним до конца пробного» (шаг trialReminder)')
add('onboarding-paywall-002', ['wait:2500'], 'onbstep=onboardingPaywall&paywall=reference', HOME, note='онбординг: цена Plus — справочная цена (paywall=reference)')
add('onboarding-030', ['tap:#onboarding-paywall-more-offers'], 'onbstep=onboardingPaywall&paywall=reference', HOME, note='онбординг: цена Plus → «Больше предложений»')

# ── Карточки
SAVED = '/flashcards_collection?cat=saved'
add('cards-031', [], 'cards=demo&hold=saved_loading&studyTarget=en', SAVED, note='«Сохранённые»: загрузка (удержание hold=saved_loading)')
# «Блиц — верно / неверно»: какой из четырёх вариантов верный, шаг заранее не знает (слово в вопросе случайное) — unique=False, пока у Дизайна нет подсказки
BLITZ = '/flashcards_blitz_session?deck=saved&sec=60'
add('cards-section-044', ['wait:1500', 'tap:#fc-blitz-opt-0'], 'cards=demo&plus=on&studyTarget=en', BLITZ, unique=False, note='Блиц: ответ «верно» — какой вариант верный, шаги не знают (нужна подсказка Дизайна, см. R1_ROBOT_LINKS_GAPS.md)')
add('cards-section-045', ['wait:1500', 'tap:#fc-blitz-opt-0'], 'cards=demo&plus=on&studyTarget=en', BLITZ, unique=False, note='Блиц: ответ «неверно, минус жизнь» — то же, что cards-section-044')

# ── Режим Б: занятия «Слова» и «Неправильные глаголы» (shot list G-E02 / G-E03)
EB = 'energy=5&plus=off&free=on&mode=b'
add('energy-modes-009', ['tap:#lesson-menu-words', 'wait:1500'], EB, '/lesson_menu?id=3', note='Режим Б: тренировка слов, пилюля попыток без сердечек (lesson-words-session-attempts)')
add('energy-modes-010', ['tap:#lesson-menu-irregular-verbs', 'wait:1500'], EB, '/lesson_menu?id=3', note='Режим Б: неправильные глаголы, пилюля попыток (irregular-verbs-session-attempts)')

# ── Сообщество (гость без друзей; вкладка по умолчанию — «Друзья»)
COMM = 'spire=open&plus=off&free=on&cards=demo'
add('community-001', ['tap:#community-sections-spire', 'wait:800'], COMM, '/(tabs)/community', note='вкладка сообщества: строка сегментов, выбран «Шпиль»')
add('community-007', ['tap:#friends-open-add', 'wait:800'], COMM, '/(tabs)/community', note='«Добавить друга» — шторка friends-add-sheet (в образце «центрированное окно», в коде нижняя шторка)')
add('community-020', ['see:#friends-empty-add'], COMM, '/(tabs)/community', note='Друзья: пустой список у гостя без друзей (friends-list-empty)')

# ── Диалоги: завершение вручную через меню «⋯» (нужна хотя бы одна реплика — «Завершить» иначе неактивна)
DIALOG_PARAMS = 'plus=off&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&studyTarget=en'
DIALOG_OPEN = ['tap:#dialogue-v2-world-toggle-*', 'tap:#dialogue-v2-catalogue-row-*', 'tap:#dialogue-v2-briefing-start', 'wait:3000']
DIALOG_FINISH = ['tap:#dialogue-v2-session-input', 'type:Hello', 'tap:#dialogue-v2-session-send', 'wait:2500', 'tap:#dialogue-v2-session-more', 'tap:#dialogue-v2-session-menu-complete', 'wait:3000']
add('dialogs-043', DIALOG_OPEN + DIALOG_FINISH, DIALOG_PARAMS, '/ai_dialog_home', unique=False, note='ручное завершение через меню «⋯»; шаги выведены из кода (подтверждения может не быть), не отлажены')

# ── Главная по языкам: фраза дня включена для es/de/it (bf776a432); язык изучения — dev-подмена studyTarget (только память)
for _rid, _lang in (('home-004', 'es'), ('home-005', 'de'), ('home-006', 'it')):
    add(_rid, ['wait:1500'], f'plus=off&studyTarget={_lang}', HOME, note=f'Главная с языком изучения {_lang}: плитка «Фраза дня»')
