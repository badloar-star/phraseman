# Task packet: ночной перенос дизайна PhraseMan 2.0 Liquid Glass (Настройки, Шпиль, Paywall A/D, таббар)

Governance-ID: TG-127D4157DE37
Governance-ID: TG-A90889E38080
Governance-ID: TG-0CCE266A7630
Governance-ID: TG-EA4E012D23E3
Governance-ID: TG-705C2FD7F97F
Governance-ID: TG-FBDED796BC17
Governance-ID: TG-9715A54E8CA8
Governance-ID: TG-F5DE94AC2969
Governance-ID: TG-C6147C69A381
Governance-ID: TG-B7F5AE4FF733
Status: In progress
Owner: сессия Claude Code 08393a61 (Sonnet) + исполнители-субагенты
Related epic/enabler: PhraseMan 2.0 — перенос макетов Liquid Glass (см. HANDOVER_CLAUDE_2026-09-29.md, APP_TRANSFER_TRACKER.md)

## Outcome

Владелец 29.09.2026 поручил довести перенос дизайна «1 в 1 с макетов» без вопросов до утра. Видимый результат: корень «Настроек» (PRF-01) в стиле Liquid Glass; нижнее меню без подписей с крупными иконками по центру (сделано, коммит c94aa653f); экраны «Шпиль» за выключенным по умолчанию клиентским ключом; пейвол вне онбординга — только A «Классический» и D «Два тарифа» по макету paywall-review.html. Успех — узкие source-контракт-тесты зелёные, снимки Android-эмулятора на сборке после правок, честный отчёт «исходники / устройство / ждёт владельца». Не «готово», пока нет снимка устройства.

## Scope

In scope: `components/v2/V2TabBar.tsx`; `app/(tabs)/settings.tsx` (только корень PRF-01); `app/(tabs)/community.tsx`, `app/tab_page_model.ts`, `components/spire/*`, `app/spire/*` (скрытая вкладка «Шпиль» за флагом); файлы пейвола A/D (`app/paywall_a.tsx`, `app/paywall_d.tsx`, `components/paywall/*`, `app/paywall_copy.ts`, `app/paywall_variant.ts`); новые тесты в `tests/`; документы трекера в папке макетов.

Out of scope: Главная и хаб «Карточки» (утверждены владельцем — не менять); онбординг и его пейвол; purchase-hook (`app/paywall_purchase.ts`), Store Offerings, entitlement и лимиты; серверные флаги Шпиля, `spireJoinRoom`, любые записи в боевой Firebase (в т.ч. `adminBackfillVideoPacks`); удаление тем/ассетов; юридические тексты; игра-ступень Шпиля (нет данных и списания энергии).

## Architecture

Без архитектурных изменений: новые экраны используют существующие токены (`liquidGlassTokens`, `useV2GlassStyle`), систему переводов и remote-кэш `remote_config_cache_v1`. Вкладка «Шпиль» — новый sub-runtime id `'spire'` в `SUB_RUNTIME_OWNER_IDS`, гейт двойной: клиентский ключ (по умолчанию выключен) и `config/spire_v1.enabled`; при выключенном Шпиле клиент не вызывает `spireJoinRoom`, `spireFlushNow`, загрузку пакета недели. Инвариант: purchase/entitlement-код не меняется.

## Security and privacy

Аутентификация/права не меняются. Новых сборов данных нет: Шпиль читает уже кэшируемый конфиг и локальные данные; имена/аватары участников комнаты до включения не показываются — перед включением для людей нужно проверить, покрывает ли Privacy Policy показ имени и рамки участников комнаты (пометка для владельца). Секреты не добавляются. Кнопки покупки не вызываются.

## Technical debt

- Pay now: таббар — убран мёртвый стиль подписи; тест обновлён.
- Contain: два старых Jest-теста `tests/tab_bar_motion_accessibility_contract.test.ts` и `tests/tabbar_scroll_chrome_contract.test.ts` проверяют устаревший `_layout.tsx` и падают независимо от этой работы — не менялись; владелец/отдельная сессия обновляет ожидания.
- Accept temporarily (владелец решает): конфликт «Безлимит» для Plus vs лимит 1500 пользовательских карточек в коде; purchase-marker до открытия магазина (открытые P1-гонки); пустой каталог «Из видео» до запуска админ-бэкфилла.

## Verification

Тесты: `node --test tests/v2_tab_bar_liquid_glass_theme.test.cjs` (3/3 pass); новые source-контракты Настроек/Шпиля/пейвола — точечно, `--test-concurrency=1`; `npx jest --runTestsByPath tests/tab_page_model.test.ts --runInBand --watchman=false`. Ручной обход: снимки Pixel_8 (Настройки, вкладка Сообщество, пейвол из Настроек, таббар). Доступность: `accessibilityLabel` вкладок сохранён. Артефакт: снимки в `C:\Temp\shots` и отчёт в папке макетов.

## Rollback

Каждый пакет — отдельный коммит; откат — `git revert <sha>` этого пакета. Вкладка «Шпиль» выключается клиентским ключом без релиза. Данные пользователей и права не затрагиваются.

Governance-ID: TG-FBDED796BC17
Governance-ID: TG-9D3AFFE964E9

Governance-ID: TG-7551F854D7D5
Governance-ID: TG-5353A42E97E5
Governance-ID: TG-7F52A0E2C8C0
Governance-ID: TG-A8E2882DB57C
Governance-ID: TG-CD6F89D9D1BC
Governance-ID: TG-E392A341C0A1
Governance-ID: TG-CF43711D496C
Governance-ID: TG-3BA07647C62E
Governance-ID: TG-CB7E624E15DB
Governance-ID: TG-8F19C1A9324D
Governance-ID: TG-7C5BC51A01B6
Governance-ID: TG-7F52A0E2C8C0

Governance-ID: TG-13F6B77F8106
Governance-ID: TG-DFCBCE16E90D
Governance-ID: TG-EB578AC6DE14
Governance-ID: TG-5D3B69512CBA
Governance-ID: TG-690AA682825F
Governance-ID: TG-DFA786CC05CE
Governance-ID: TG-8B3A10D798C2
Governance-ID: TG-6AA640730B3E
Governance-ID: TG-CD83C68CE673
Governance-ID: TG-DCBDBC6B199D
Governance-ID: TG-4949B2ADBB3C
Governance-ID: TG-D4F187EDC83C
Governance-ID: TG-35A5617C8028
Governance-ID: TG-9E92D46CCD52
Governance-ID: TG-62B8A9D26CE3
Governance-ID: TG-529330F8D109
Governance-ID: TG-D5DA9144BEF9
Governance-ID: TG-082A3DF2597D
Governance-ID: TG-5D3B69512CBA
Governance-ID: TG-10EBB7075912
Governance-ID: TG-54769FD62E4A

Governance-ID: TG-A6103398BB86
Governance-ID: TG-6751640E0147
Governance-ID: TG-E248D92BA4E7
Governance-ID: TG-7BAE07EF4E28
Governance-ID: TG-D63D17B699A3
Governance-ID: TG-89B0472C8639

Governance-ID: TG-3E4151550599
Governance-ID: TG-3E4151550599
Governance-ID: TG-117894375C08
Governance-ID: TG-FE0906347CFC
Governance-ID: TG-5085B3342482
Governance-ID: TG-1D349138CC40
Governance-ID: TG-DB75799F6790
Governance-ID: TG-E0103A66E8B5
Governance-ID: TG-49E01F176D24
Governance-ID: TG-BD545892E985
Governance-ID: TG-F4F8F2002FE4
Governance-ID: TG-90E0DACFBC4A
Governance-ID: TG-3C8B7004BA58
Governance-ID: TG-D42BF4182DC5
Governance-ID: TG-2861AAD4D78D
Governance-ID: TG-F4B09326F5D8

Governance-ID: TG-A9E1404D2863
Governance-ID: TG-A9E1404D2863
Governance-ID: TG-C6F693F1AF3F
Governance-ID: TG-C6F693F1AF3F
Governance-ID: TG-6889D0DF5276
Governance-ID: TG-822A736C752D
Governance-ID: TG-7F4716C4CB52
Governance-ID: TG-822A736C752D
Governance-ID: TG-7F4716C4CB52
Governance-ID: TG-563ACF411156

Governance-ID: TG-F88F851AB0D6
Governance-ID: TG-F88F851AB0D6
Governance-ID: TG-227E337B60DE

Governance-ID: TG-5CF63385E88D

Governance-ID: TG-C0DCBC0F1EC7

Governance-ID: TG-7F76FDC0211C

Governance-ID: TG-E9E0B9390C45

Governance-ID: TG-E9E0B9390C45

Governance-ID: TG-E9E0B9390C45

Governance-ID: TG-FCC005DF00E8

Governance-ID: TG-FFC9826D1FDF

Governance-ID: TG-FFC9826D1FDF

Governance-ID: TG-9D93C0474E08

Governance-ID: TG-9D93C0474E08

Governance-ID: TG-9D93C0474E08

Governance-ID: TG-91C5233A500A

Governance-ID: TG-D6423CBAEDEA

Governance-ID: TG-441649D2D3A8

Governance-ID: TG-441649D2D3A8

Governance-ID: TG-441649D2D3A8

Governance-ID: TG-52600C8FF291

Governance-ID: TG-419C92ED5962

Governance-ID: TG-419C92ED5962

Governance-ID: TG-419C92ED5962

Governance-ID: TG-419C92ED5962

Governance-ID: TG-419C92ED5962

Governance-ID: TG-419C92ED5962

Governance-ID: TG-419C92ED5962

Governance-ID: TG-B25C0524B362

Governance-ID: TG-B25C0524B362

Governance-ID: TG-55F7AE2C1F46

Governance-ID: TG-B25C0524B362

Governance-ID: TG-B25C0524B362

Governance-ID: TG-AD5DF93014BB

Governance-ID: TG-ECB47B12B46E

Governance-ID: TG-07F6FC9A42A2
- 30.09: эмулятор — неизвестная ссылка + «назад» = пустой экран; временная трассировка [DEFERRED-REDIRECT] в components/DeferredRedirect.tsx, диагноз по логам.

Governance-ID: TG-33F29313E545
- 30.09: тест звёзд меню урока; «Повторить» на хабе Диалогов; проход тем/экранов в эмуляторе.

Governance-ID: TG-AAA8ACA01409
- 30.09: красные home_counters_first_frame / approved_ux_context; профиль и длинные тексты; Шпиль без прод-данных; задачи v2-app.

Governance-ID: TG-BBEF57DCC6AD
- 01.10: PM-128 длинные строки на уровне кода (без эмулятора — он у AccountV2).

Governance-ID: TG-D5AAF079D3AC
- 01.10: эмулятор — PM-128 длинные строки, профиль, PM-033-A1 (TalkBack/крупный шрифт/анимации), safe area.

Governance-ID: TG-6ECE387280F3
- 01.10: PM-033-A1 по коду — бесконечные анимации без reduce motion.

Governance-ID: TG-F7387C7AFC11
- 01.10: PM-033-A1 — бесконечные анимации учитывают «Уменьшить движение» (скелетон, друзья, голо-карта, лента сообщений, итог урока, открытие набора, эквалайзер).

Governance-ID: TG-BD17FC47F590
- 01.10: после b95865d99 — эмулятор: длинные строки, профиль, TalkBack/крупный шрифт, safe area.

Governance-ID: TG-6705057C5632
- 01.10: Сообщество — параметр ?section=spire|friends|packs для пушей; бандлер фоном без панели (решение владельца).

Governance-ID: TG-358C74A26DCF
- 01.10 решения координатора: Q6 убрать FriendLevelUpModal; PM-044 шкала огня из ассета; PM-035/PM-139 done; задача на вырезание home_menu.

Governance-ID: TG-13C7F35FE467
- 01.10 Q9: YoutubeInlinePlayer без рун/буста за просмотр (D07, PM-080-A3), сторож импортов.

- 01.10: StatsPremiumBlur — токены 2.0 вместо золота, без мелькания замка до accessResolved.
- 2026-10-01T06:01:41Z Governance-ID: TG-PM032-1790834501 — PM-032 разовые реакции вместо вечных циклов (lesson_complete, pack_opening, CollectionListView, lesson_intro_screens, NewWordEncounterOverlay) + сторож allowlist

Governance-ID: TG-FEA7004DAE87
- 01.10 пачка координатора: хвост PM-032 (10 циклов -> 2-3 повтора, reduceMotion - нет), удаление 4 мёртвых файлов, далее E03/E04/E12/E13/E09/E16/E18/E19/E07/E11/E20 по макетам docs/design/v2-app. Главная/онбординг не трогаются. Откат: git revert. Проверка: motion_allowlist_contract + проверка типов по файлам.

Governance-ID: TG-7DA5FD1A482A
- 01.10: хвост PM-032 + удаление мёртвых анимационных компонентов; затем вход «Разбор» из «Мои ошибки» на /phrase_analytics_screen (решение владельца через Ядро). Откат: git revert.

Governance-ID: TG-89A059BB454B
- 01.10 уточнения координатора: Q11 вход в разбор — уже сделан (82836a31c, 38d7e0a94); Q9 плеер — сделан ранее этой сессией (импорты наград сняты). Дальше E03.

Governance-ID: TG-61D85770A26B
- 01.10 PM-030 по решению координатора: пуши — не больше одного эмодзи в начале строки; ✨ у живых текстов подарков убрать; иконки достижений — хвост в PROGRESS.md; PM-030 → review.

Governance-ID: TG-61D85770A26B
- 01.10 владелец: старый итог урока с руной — заменить на макет E (learn.html, общий экран завершения D36/D64.1, PM-137); ассет руны stars_10.webp -> монета coin_rank_00.webp во всех местах.

Governance-ID: TG-57149E6B1E7D
- 01.10 владелец: руны везде заменить на монеты (картинка и подписи в интерфейсе).

Governance-ID: TG-478184BAF41E
- 01.10 владелец: видимые тексты «руны» → «монеты» на 9 языках (183 строки, 21 файл), идентификаторы кода не трогаются.

Governance-ID: TG-22E5B4DC94F3
- 01.10 фикс регрессии: замена руны→монеты задела идентификаторы внутри ${} (DIALOG_EXTRA_REPLIES_PRICE_RUNES); итог урока → V2DoneScreen.

Governance-ID: TG-D57CD27481A1
- 01.10 аудит макетов: жёлтый из темы (gold/goldBg/textOnGold) → токены акцента; далее топ нарушителей из MOCKUP_GAP_AUDIT.md.

Governance-ID: TG-61FAB88E1123
- 01.10 итоги режимов по макету (глаголы, предлоги); затем «Сегодня»: переходы по типам заданий (по просьбе Ядра).

Governance-ID: TG-EBB7CE1C2D70
- 01.10 владелец: (1) анимация смены ранга и перехода на Pro не запускается — сперва логи [RANK-CEREMONY]; (2) смена темы не меняет Главную — Главная обязана следовать теме как все экраны.

Governance-ID: TG-C4F8690B27E2
- 01.10 владелец: все задачи сохранять — очередь docs/phraseman-2.0/OWNER_TASKS_QUEUE.md; тема Главной (v2StyleGlassVariant); видео без «Все видео».

Governance-ID: TG-7E5948EC4F72
- 01.10 тема Главной: palette 2.0 в «Спокойно» тёмном из токенов темы; проверка сценариев монет для Ядра.

Governance-ID: TG-AF3C2DCB2AB9
- 01.10 пачка координатора (слова владельца): нет экранов ошибок/загрузки/пустых; диалоги открываются мгновенно с первой репликой; «Сегодня» — переходы; макет «Из видео»; PM-184 визитка; список выключенного.

Governance-ID: TG-E824FAE5DE13
- 01.10 первая реплика диалога из packet.content.opening (контракт с Ядром), зачистка экранов ошибок/загрузки.

Governance-ID: TG-22B1CD68DEDD
- 01.10 владелец: значок энергии крупнее и без фона везде; убрать кнопку «Подарки» из статистики и все входы в «Подарки»; служебные строки Диалогов на языке интерфейса (ru/uk).

Governance-ID: TG-204CF3F8E119
- 01.10 «Сегодня»: переходы по типам заданий (TODAY_TASK_ROUTES), лог [TODAY-TASKS] route.

Governance-ID: TG-D0B2E9D90FC3
- 01.10 прогон «Сегодня»: cards ок; mistakes и spire_steps — тупики (передано Ядру).

Governance-ID: TG-4729D5E30F54
- 01.10 перепроверка «Сегодня» после фикса Ядра (тупики убраны).

Governance-ID: TG-8F2C05E9000D
Governance-ID: TG-F03D258E6B05
— 01.10 «Дизайн»: экраны без «загружается/не загрузилось» (карточки, Диалоги, Главная, видео, диагностика), короткие анимации Главной (3 повтора и покой). Откат: git revert соответствующих коммитов.
Governance-ID: TG-D95DBB6D8340
— 01.10 «Дизайн»: плитки Главной — подпись на всю ширину (перенос «expressões»).
Governance-ID: TG-9C9A081E1457
Governance-ID: TG-B60B0CE57EBF
— 01.10 «Дизайн»: видео — избранное, число сохранений, «Тренировать», открытие по videoId, звук после плеера, раскрытие строки ~180 мс.
Governance-ID: TG-0B29A2924F32
Governance-ID: TG-D12805B5FB5F
Governance-ID: TG-9A2AA679981A
Governance-ID: TG-BE747503D86D
Governance-ID: TG-CB9BF2E434CD
— 01.10 «Дизайн»: кнопка «Заблокировать» у друга/в карточке профиля (Q41/Q48/Q49).
Governance-ID: TG-B8FDED5F5661
— 01.10 «Дизайн»: кнопка «Заблокировать» за выключателем до выкладки friendBlockUser/friendUnblockUser.
Governance-ID: TG-A8173CD1DDA8
Governance-ID: TG-018C3BAF4957
— 01.10 «Дизайн»: блокировка включена (координатор: функции и удаление аккаунта на проде).
Governance-ID: TG-04E6445692D1
— 01.10 «Дизайн»: окно Plus без «не удалось загрузить цены» (заготовки + тихий повтор); макеты Главной/таббара при неготовых разделах языка.
Governance-ID: TG-E9A6B334AB24
— 01.10 «Дизайн»: карточка «Продолжить обучение» низкая с артом справа (скрин владельца); «Фраза дня» точь-в-точь по скрину, лишняя полоска удалить.
Governance-ID: TG-441C345C1DA3
— 01.10 «Дизайн»: 3 раздела одобрены и не меняются; 10 креативных вариантов только для 2 и 1 раздела.
Governance-ID: TG-0ED69863D146
Governance-ID: TG-9BFD7BC6E94F
Governance-ID: TG-9A6606B2FC56
— 01.10 «Дизайн»: в дев-сборке кнопка «Дев-хаб» в самом верху «Настроек».
Governance-ID: TG-BACDD96D70B6
— 01.10 «Дизайн»: D137 — подстановка разделов в ряд плиток Главной.
Governance-ID: TG-B0B97A62B262
— 01.10 «Дизайн»: «Устно» — подпись «Совпадение с фразой» (Q61).
Governance-ID: TG-46E613D90B81
— 01.10 «Дизайн»: PM-008 — вычистка видимых строк про удалённое (Q74).
Governance-ID: TG-5DC7A5C48835
— 01.10 «Дизайн»: D139 шрифты, пачка 2 (Главная, уроки, итоги, Шпиль, статистика).
Governance-ID: TG-621630387D77
— 01.10 «Дизайн»: D139 шрифты, пачка 3 (оставшиеся файлы).
Governance-ID: TG-2B6F9D2FC59C
Governance-ID: TG-74D0E1474584
— 01.10 «Дизайн»: D139 — оставшиеся 3 файла (Настройки, уведомления, окно покупки набора).
Governance-ID: TG-3436B7A2D52D
Governance-ID: TG-3436B7A2D52D — Дизайн: перенумерация D142–D146 (коллизия 03_DECISIONS)
Governance-ID: TG-B0A78ECD9DB2 — Дизайн: D147 убрать видимые тексты «Супер-воскресенье» (9 языков) + скриншоты DESIGN gate PM-043/044/045
Governance-ID: TG-657332291E4C — Дизайн: пачка скриншотов DESIGN gate PM-043/044/045/141/145 (только чтение кода, эмулятор)
Governance-ID: TG-8001C2FD1885 — Дизайн: text-integrity 29 мест без обрезки (продолжение)
Governance-ID: TG-A5B5D7ECB11A — Дизайн: удаление мёртвого FlashcardsTabBar и его помощников
Governance-ID: TG-49A5C97D3057 — Дизайн: вкладка «Видео» на FlashList (вид без изменений) + сторож
Governance-ID: TG-B44F3829F5BA — Дизайн: эмулятор — скриншоты PM-141/145/044, клавиатура «Добавить друга», локали, переход на Про
Governance-ID: TG-04835A586961 — Дизайн: «Добавить друга» в верхней трети на коротких экранах; Главная без скачков монет и карточки «Продолжить» + сторож
Governance-ID: TG-964AC155EA12 — Дизайн: сырой след [STREAK] для Ядра + [HOME-FIRST-FRAME] на холодном старте
Governance-ID: TG-82FE12C88FE9 — Дизайн: пересъёмка DESIGN gate (PM-044/141/145/144/197) + след [STREAK]
Governance-ID: TG-C2816BCD78A5 — Дизайн: Главная — первый кадр (монеты «—», заготовка «Продолжить»), сторож layout_stability; след [STREAK]
Governance-ID: TG-56E911F05E42 — Дизайн: срочно — continueResolvedRef в тестах Главной, rune_balance_snapshot_preservation, след [STREAK]
Governance-ID: TG-2B3DE8BBDE4B — Дизайн: обвязка home_lesson_progress_single_pass и rune_balance_snapshot_preservation под заготовку и «—»
Governance-ID: TG-4BCD030B2068 — Дизайн: пейвол — крестик залипает после «Оформить» в дев-сборке; подтверждение cloud=6
Governance-ID: TG-137299BB0291 — Дизайн: пересъёмка PM-141/145/144/197, вес арта
Governance-ID: TG-C6EA51BE3051 — Дизайн: проверка починки серии Ядра (холодный старт), мёртвая «Начать диалог» (energy operation_id_conflict)
Governance-ID: TG-63189596B7EA — Дизайн: home_learning_cta_contract (бюджет арта), просмотр экранов на п.6–7
Governance-ID: TG-94886C4095C5 — Дизайн: след [ENERGY-CONFLICT] для «Начать диалог» по запросу Ядра
Governance-ID: TG-45B06497D1FE — Дизайн: жемчуг снят со всех видимых экранов (D70/D78, PM-289 этап 2)
Governance-ID: TG-FB09292B347F — Дизайн: «Монетная заначка» — прогресс по монетам, дев-рынок за жемчуг
Governance-ID: TG-5A780A2A1F11 — Дизайн: повтор хода social_01 после выкладки, PM-144
Governance-ID: TG-D69C347D92EE — Дизайн: ход social_01 до итогов, энергия acknowledge
Governance-ID: TG-53978FA6DAB9 — Дизайн: прогон диалога до итога с таймингом реплик и целей
Governance-ID: TG-EF8DFCB9F041 — Дизайн: проверка итога диалога после выкладки 1d589d1d0
Governance-ID: TG-774EB9223559 — Дизайн: полный прогон social_01 до итога по целям
Governance-ID: TG-FC336965AAE3 — Дизайн: облегчение списка уроков, Q112 «по всем языкам», лёгкие обложки «Видео», проверка сжатого арта
Governance-ID: TG-F4C67E533A5C — Дизайн: лёгкие обложки «Видео» и облегчение списка уроков
Governance-ID: TG-D69D96DACFF4 — Дизайн: FINAL_PHASE п.6–7 (Настройки/Профиль/Друзья/Сообщество/Карточки): safe-area, пустые/офлайн-состояния, Optimistic UI, хаптик только на кнопках
Governance-ID: TG-A0F984EFBC81 — Дизайн: FINAL_PHASE п.7 продолжение (Настройки: обработка разрешения уведомлений, немые catch) + повтор итога диалога после выкладки
Governance-ID: TG-6FF12B5EB1FE — Дизайн: вариант В координатора — открытие набора с тихими повторами и мягкой подсказкой во всех 7 местах (общий помощник app/community_packs/stage_with_retry.ts)
Governance-ID: TG-D6DAFF64AB62 — Дизайн: диагностика phone_state HMAC для Ядра (только логи и эмулятор, без правок кода) + проверка варианта В офлайн
Governance-ID: TG-EAC1EAA6C822 — Дизайн: разбор 10 красных UI-контрактов карточек (законный сдвиг → обновить контракт с зачем; регрессия → чинить код)
Governance-ID: TG-A0A7B6632EC8 — Дизайн: проверка пересоздания phone_state базы (2 холодных старта) для Ядра + продолжение разбора красных контрактов карточек
Governance-ID: TG-67AF68DC504E — Дизайн: проверка 001fa6b0c (пересоздание phone-state при ошибке целостности) на эмуляторе для Ядра
Governance-ID: TG-594498412C23 — Дизайн: FINAL_PHASE п.7 — Optimistic UI удаления своего набора в «Моих наборах» (мгновенно убрать из списка, откат при ошибке)
Governance-ID: TG-F271231ABE53 — Дизайн: трасса холодного старта для Ядра (COLD-START/PHONE-STATE-DB/FC-TRAIN-ENTRY/HOME-PAINT), только логи на эмуляторе
Governance-ID: TG-8BACBE79E0BF — Дизайн: §80 DESIGN-gate — основания/кадры по 20 задачам в evidence/DESIGN_GATE_OWNER_REVIEW.md + живая проверка ветки пересоздания cipher
Governance-ID: TG-2A2BB3263548 — Дизайн: §80 строки DESIGN-gate (20 задач) + замер холодного старта «после» 415f9ec83 для Ядра
Governance-ID: TG-7F219401258F — Дизайн: §84 замер холодного старта на слабом профиле AVD (2 ядра/2 ГБ, ≥5 стартов), возврат обычного профиля
Governance-ID: TG-ED41406F336D — Дизайн: ответ Ядру по PM-052 (CoinRewardFlight вместо LearningV2RuneFlight) + продолжение §84
Governance-ID: TG-66DF92420F5D — Дизайн: §84 слабый профиль, добор прогонов с таймстемпами
Governance-ID: TG-3EA87EA02902 — Дизайн: правка итога §80 + холодный старт на слабом профиле на HEAD с e420cfa2e (логи ключа) для Ядра
Governance-ID: TG-607498F09CE0 — Дизайн: CoinRewardFlight (D75, PM-052 ч.2 визуал) — переименование/перекраска LearningV2RuneFlight с прежним API
Governance-ID: TG-5598D75D5DD1 — Дизайн: CoinRewardFlight — reduce motion внутри компонента (без полёта, сразу onDone), лимит частиц, UI-поток
Governance-ID: TG-B7C0A90C67AC — Дизайн: commit CoinRewardFlight reduce-motion + повторный замер ключа на слабом профиле (677d8c1f8)
Governance-ID: TG-1CDA8220655E — Дизайн: повтор трассы ключа 677d8c1f8 на слабом профиле, возврат профиля
Governance-ID: TG-AB03FFBDE124 — Дизайн: 5 красных тестов карточек/Learning V2 (blitz_access, speaking_quota, swipe_access, fc_recall_contract, session1 owner UI gate) — разбор §77
Governance-ID: TG-EE2056E342E3 — Дизайн: холодный старт на release-сборке (HEAD ≥ 2d97d6dfd) на слабом профиле для Ядра ([COLD-START-IO] summary)
Governance-ID: TG-7930AC6AA735 — Дизайн: release-замер [COLD-START-IO] на слабом профиле + кадры окна режимов «Готовим тренировку…/Не получилось» (5364cd28b) + 5 красных тестов
Governance-ID: TG-BE0C38CD1216 — Дизайн: кадры окна «Тренироваться» (ожидание/Повторить) на слабом профиле, INBOX COLD-START-IO, возврат профиля, затем Блиц и красные тесты
Governance-ID: TG-D4A255681189 — Дизайн: после падения сессии — коммит своих правок тестов, INBOX COLD-START-IO, эмулятор, далее очередь §86
Governance-ID: TG-DA695BF2C2AE — Дизайн: перенос реализации CoinRewardFlight в components/rewards + звук pm.coin.flight_start; повторный release-замер 31cfd76c4
Governance-ID: TG-AD999892946D — Дизайн: повторный release-замер [COLD-START-IO] (31cfd76c4) + доводка тестов переноса CoinRewardFlight
Governance-ID: TG-33EA2896C2DE — Дизайн: store-release сборка (EXPO_PUBLIC_STORE_RELEASE=1) на HEAD с 8daaec362 для [COLD-START-IO]; тест «Устно»
Governance-ID: TG-C4D0CA56A46A — Дизайн: коммит теста «Устно», store-release замер [COLD-START-IO] на слабом профиле
Governance-ID: TG-74CBE8908ED1 — Дизайн: store-замер отправлен; возврат эмулятора; sound_director (xp_counter_tick), lifecycle-тест полёта; далее Блиц
Governance-ID: TG-3C59A79BE539 — Дизайн: коммит sound_director (__DEV__, звук completion) и coin_reward_flight_lifecycle (testMatch)
Governance-ID: TG-6246E86AB07A
Governance-ID: TG-9F2EAC359731
Governance-ID: TG-EC8451DFE6E6
Governance-ID: TG-92E71F5E52E5
Governance-ID: TG-39DAB2D2A171
Governance-ID: TG-64D3B3D561A2
Governance-ID: TG-CC19CF92BCDF
Governance-ID: TG-411387BF3770
Governance-ID: TG-1101FE88ACA7
Governance-ID: TG-736E2C42F4E3
Governance-ID: TG-FFBD371A3D98
Governance-ID: TG-6ABACFFFA8E7
Governance-ID: TG-0395A1A4B9CB
Governance-ID: TG-3FF324EAF61A
Governance-ID: TG-45C5B91C9046
Governance-ID: TG-79DE6F64F327
Governance-ID: TG-28601E5015FF
Governance-ID: TG-8FFAFB844753
Governance-ID: TG-553D4052BF3D
Governance-ID: TG-38BC25066F73
Governance-ID: TG-68139C3A46AA
Governance-ID: TG-53ADAA209307
Governance-ID: TG-1C00DD92A7F1
Governance-ID: TG-33AF0B10B284
Governance-ID: TG-796B4D6E91F3
Governance-ID: TG-CAA638A95CF0
Governance-ID: TG-3F7F884DE2D0
Governance-ID: TG-77D7A9F0132A
Governance-ID: TG-F893F58BA85B
Governance-ID: TG-D522AAC1CC0E
Governance-ID: TG-D45689EC2031
Governance-ID: TG-36C3D180AAD2
Governance-ID: TG-54B80762F4B2
Governance-ID: TG-65A38037BC5C
Governance-ID: TG-DF3E18877B89
Governance-ID: TG-5145A5C4BDEA
Governance-ID: TG-E9E08D20001C
Governance-ID: TG-8A6CB5916E3A
Governance-ID: TG-9F936235292E
Governance-ID: TG-2174D05907D3
Governance-ID: TG-B12A0877C5D1
Governance-ID: TG-9ECBEE4ABEBF
Governance-ID: TG-830652D031C8
