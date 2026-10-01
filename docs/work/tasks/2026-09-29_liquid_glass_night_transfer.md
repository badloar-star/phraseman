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
