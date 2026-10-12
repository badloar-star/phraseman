# Ссылки и шаги для строк, которые робот Сверки пропускал (координатор 12.10, «29 id без ссылок»; сессия «Макеты»).
#
# зачем: 20 строк были match и потому не попадали в DEV_LINKS_R1 (генератор брал только pending|diff), а после правок кода их надо
# переснимать; ещё 6 строк имели «ручной путь» без ссылки. Пути выведены из кода и shot list, подмены — только dev-память
# (без записей в прод и без входа в аккаунты). Онбординг открывается подменой `onbstep=<шаг>` (app/dev_state_fixtures.ts), pm clear не нужен.
# Чего в коде нет (testID / подмена) — список Дизайну в docs/phraseman-2.0/R1_ROBOT_LINKS_GAPS.md; код здесь не правится.
# зачем (12.10, ответ Сверке по step_target_not_found): energy-modes-009/010 открывали урок 3, а при plus=off он закрыт («Входить у Plus»), и lesson_menu
# сам уводит на список уроков — кнопок меню там нет; берём открытый урок 1. onboarding-030: экран цены проявляется ≈2 с, без паузы кнопки «Больше предложений»
# ещё нет; community-007: кнопка «+» в «Друзьях» рисуется только при заявках/друзьях, поэтому friends=demo (у пустого списка кнопка friends-empty-add).
from dev_links_r1_steps import add

# строки без поля release в реестре (гейт их считает) — генератор берёт их по списку
INCLUDE_IDS = {'onboarding-006', 'onboarding-010', 'onboarding-025', 'onboarding-paywall-001', 'community-014', 'community-016', 'onboarding-030', 'mistakes-panel-002', 'learn-002', 'learn-016', 'learn-017', 'learn-018', 'video-007', 'coins-002', 'coins-005', 'home-002', 'overlays-041'}

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
add('onboarding-030', ['wait:2500', 'tap:#onboarding-paywall-more-offers'], 'onbstep=onboardingPaywall&paywall=reference', HOME, note='онбординг: цена Plus → «Больше предложений»')

# ── Карточки
SAVED = '/flashcards_collection?cat=saved'
add('cards-031', [], 'cards=demo&hold=saved_loading&studyTarget=en', SAVED, note='«Сохранённые»: загрузка (удержание hold=saved_loading)')
# «Блиц — верно / неверно»: какой из четырёх вариантов верный, шаг заранее не знает (слово в вопросе случайное) — unique=False, пока у Дизайна нет подсказки
BLITZ = '/flashcards_blitz_session?deck=saved&sec=60'
add('cards-section-044', ['wait:4000', 'await:#fc-blitz-opt-target', 'tap:#fc-blitz-opt-target'], 'cards=demo&plus=on&studyTarget=en&blitz_answer=correct', BLITZ, note='Блиц: ответ «верно» — dev blitz_answer=correct помечает верный вариант testID fc-blitz-opt-target (12.10)')
add('cards-section-045', ['wait:4000', 'await:#fc-blitz-opt-target', 'tap:#fc-blitz-opt-target'], 'cards=demo&plus=on&studyTarget=en&blitz_answer=wrong', BLITZ, note='Блиц: ответ «неверно, минус жизнь» — dev blitz_answer=wrong помечает неверный вариант testID fc-blitz-opt-target (12.10)')

# ── Режим Б: занятия «Слова» и «Неправильные глаголы» (shot list G-E02 / G-E03)
EB = 'energy=5&plus=off&free=on&mode=b'
add('energy-modes-009', ['tap:#lesson-menu-words', 'wait:1500'], EB, '/lesson_menu?id=1', note='Режим Б: тренировка слов, пилюля попыток без сердечек (lesson-words-session-attempts)')
add('energy-modes-010', ['tap:#lesson-menu-irregular-verbs', 'wait:1500'], EB, '/lesson_menu?id=1', note='Режим Б: неправильные глаголы, пилюля попыток (irregular-verbs-session-attempts)')

# ── Сообщество (гость без друзей; вкладка по умолчанию — «Друзья»)
COMM = 'spire=open&plus=off&free=on&cards=demo'
add('community-001', ['tap:#community-sections-spire', 'wait:800'], COMM, '/(tabs)/community', note='вкладка сообщества: строка сегментов, выбран «Шпиль»')
add('community-007', ['tap:#friends-open-add', 'wait:800'], 'friends=demo&' + COMM, '/(tabs)/community', note='«Добавить друга» — шторка friends-add-sheet (в образце «центрированное окно», в коде нижняя шторка)')
add('community-020', ['see:#friends-empty-add'], 'overlays=off&' + COMM, '/(tabs)/community', note='Друзья: пустой список у гостя без друзей (friends-list-empty)')

# ── Подмены Дизайна 12.10 (R1_ROBOT_LINKS_GAPS.md): «Мои ошибки» с данными и друзья со входящей заявкой — только память, только одноразовый гость
add('mistakes-panel-002', ['wait:1500'], 'mistakes=demo&studyTarget=en', '/mistakes_hub', note='хаб «Мои ошибки» с данными: dev mistakes=demo (6 ошибок: 4 ждут, 2 исправлены; журнал не трогается)')
add('community-006', ['see:#friend-request-row-dev-demo-friend-request-1'], 'friends=demo&spire=open&plus=off&free=on', '/(tabs)/community', note='Друзья: входящая заявка (dev friends=demo: заявка от Alex и друг Maria, без подписок Firestore и записей)')

# ── Диалоги: завершение вручную через меню «⋯» (нужна хотя бы одна реплика — «Завершить» иначе неактивна)
DIALOG_PARAMS = 'plus=off&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&studyTarget=en'
DIALOG_OPEN = ['tap:#dialogue-v2-world-toggle-*', 'tap:#dialogue-v2-catalogue-row-*', 'tap:#dialogue-v2-briefing-start', 'wait:3000']
DIALOG_FINISH = ['tap:#dialogue-v2-session-input', 'type:Hello', 'tap:#dialogue-v2-session-send', 'wait:2500', 'tap:#dialogue-v2-session-more', 'tap:#dialogue-v2-session-menu-complete', 'wait:3000']
add('dialogs-043', DIALOG_OPEN + DIALOG_FINISH, DIALOG_PARAMS, '/ai_dialog_home', unique=False, note='ручное завершение через меню «⋯»; шаги выведены из кода (подтверждения может не быть), не отлажены')

# ── Главная по языкам: фраза дня включена для es/de/it (bf776a432); язык изучения — dev-подмена studyTarget (только память)
for _rid, _lang in (('home-004', 'es'), ('home-005', 'de'), ('home-006', 'it')):
    add(_rid, ['wait:1500'], f'plus=off&studyTarget={_lang}', HOME, note=f'Главная с языком изучения {_lang}: плитка «Фраза дня»')

# ── ROBOT13: строки без ссылки (Сверка 12.10, «нет_в_DEV_LINKS_R1») ──────────────────────────────────────────────────────────
# зачем: Сверка не смогла снять 11 id без строки в DEV_LINKS_R1; маршруты выведены из кода, прежние ручные сценарии — в evidence/parity/SVERKA_LOG.md.
# cards-section-044/045: «#fc-blitz-opt-target не найден» — после ссылки идёт подготовка тренировки (как у cards-v2-033), вопрос блица появляется позже 1,5 с;
# теперь пауза 4 с и await по testID до тапа.
add('learn-002', [], 'plus=on', '/(tabs)/lessons', note='список уроков у Plus (SVERKA_LOG): название закрытых уроков приглушённое')
add('learn-016', [], 'plus=on', '/combined_lesson_pick', note='«Смешать темы»: пусто (Free получает пейвол — поэтому plus=on)')
add('learn-017', ['tap:#combo-pick-topic-*', 'tap:#combo-pick-topic-*@2', 'tap:#combo-pick-topic-*@3'], 'plus=on', '/combined_lesson_pick', note='«Смешать темы»: выбрано 3 темы')
add('learn-018', ['tap:#combo-pick-topic-*', 'tap:#combo-pick-topic-*@2', 'tap:#combo-pick-topic-*@3', 'tap:#combo-pick-topic-*@4', 'tap:#combo-pick-topic-*@5', 'tap:#combo-pick-topic-*@6'], 'plus=on', '/combined_lesson_pick', unique=False, note='«Смешать темы»: лимит 5 — шестой тап должен показать лимит; соответствие состоянию A17 проверить глазами')
add('video-007', ['wait:3000', 'await:#lingman-video-card'], 'plus=on', '/lingman_videos', note='«Все видео и плейлисты»: вкладка «Все видео»')
add('coins-002', [], 'coinRank=5', '/runes_wallet', note='кошелёк: нулевой баланс (у гостя 0 монет)')
add('coins-005', [], 'coinRank=5', '/coin_rank', note='повышение ранга: недостаточно монет (у гостя 0 монет)')
add('home-002', [], 'plus=on', '/(tabs)/home', unique=False, note='Главная в СВЕТЛОЙ теме: подмены theme нет — перед кадром включить светлую тему в Настройки → Внешний вид (запрос Темам: dev_state?theme=light)')
add('overlays-041', ['wait:1500'], 'intros=reset&plus=on&cards=demo', '/flashcards', unique=False, note='окно знакомства «Фразы — в твою коллекцию» = cards_hub_first_visit (feature_intro_sections_copy.ts, screenRoute /flashcards, first_visit); intros=reset вместо intros=seen')

# ── core_switch / link_missing: подмены уже есть в dev_state — ссылки и шаги (координатор 12.10, «link_missing — твоя часть»)
# зачем: у этих строк подмена Ядра существует (app/dev_state_fixtures.ts, app/dev_social_state.ts), не хватало только строки со ссылкой.
add('onboarding-006', [], 'onbstep=privacy&auth=none', HOME, note='онбординг: вход недоступен (auth=none: Google и Apple выключены), шаг privacy')
add('onboarding-010', [], 'onbstep=niceToMeet&greet=Alexander-Maximilian-Fitzgerald', HOME, note='онбординг: знакомство с длинным именем (greet до 24 символов)')
add('onboarding-025', [], 'onbstep=onboardingPaywall&paywall=loading', HOME, note='онбординг: цена Plus — загрузка (paywall=loading)')
add('onboarding-paywall-001', ['wait:2500'], 'onbstep=onboardingPaywall&paywall=live', HOME, note='онбординг: цена Plus — «настоящая» цена (paywall=live; на эмуляторе без магазина может остаться справочной)', unique=False)
FADD = ['tap:#friends-open-add', 'wait:800', 'tap:#friends-code-input']
add('community-014', FADD + ['type:DEVUNSYNCED', 'tap:#friends-search', 'wait:1500'], 'friends=demo&' + COMM, '/(tabs)/community', note='Друзья: профиль найден, но ещё не синхронизирован (служебный код DEVUNSYNCED, без сервера)')
add('community-016', FADD + ['type:ZZ99', 'tap:#friends-search', 'wait:1500'], 'friends=demo&dev_friends_fail=search&' + COMM, '/(tabs)/community', note='Друзья: поиск — другая ошибка (dev_friends_fail=search)')
