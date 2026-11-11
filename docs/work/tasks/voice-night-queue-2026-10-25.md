# Task packet: ночная очередь текстов в голосе PhraseMan (Переводчик, приказ владельца 25.10 «всё за ночь»)

Governance-ID: TG-C66E07F34598
Governance-ID: TG-1FC8A17BA4D6
Governance-ID: TG-41808039280B
Status: In progress
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Владелец 25.10: «все задачи выполнить за ночь: всё, что было, всё, что не выполнено, всё, что не проверено». Очередь
Переводчика по голосу `docs/work/VOICE.md`, все 9 языков:
1. Пейвол М, раздел 6 ×9 одним источником (docs-таблицы, из которых `scripts/paywall_m_copy_build.mjs` собирает
   `components/paywall/m/paywall_m_copy.generated.ts`), заголовки ≤ 2 строк, mc.workshop — честно (сборка С подсказками).
2. Пик ×8 для Моментов (exitText, packMissing, packOffline, offline, downBody по ступеням, promoCountingPlaces) +
   summitDock ≤ 32 знаков ×9; правки таблицы (tour3Text «нижние 15 % и все без ступеней», мимо топ-5 без {gap}).
3. Learning V2: 4 подписи SpeakingPanel «не расслышал» по причине + строка/тост ручного ввода ×9; 177 строк занятия ru/uk.
4. Аудит Моментов (50 строк на 8 языках) — ответы по пунктам.
5. Пачка 3 по приложению, пуши ×8.
Где файл чужой (Моменты, Дизайн, Learning V2, Ядро) — тексты владельцу зоны через документ/координатора.

## Scope

In scope: тексты и docs-таблицы; правки в свободных файлах. Out of scope: логика, вёрстка, чужие незакоммиченные файлы.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Рассылка сессиям приостановлена приложением (лимит сообщений без реплики пользователя) — отчёты лежат в docs и коммитах.

## Verification

Сторож `owner_locks_voice_forbidden_phrases_2026_10_25`; разбор правленых файлов; тесты затронутых экранов через слот.

## Rollback

`git revert <коммит>` по пачкам.

Governance-ID: TG-D760FFCC6144 (Макеты 1642c7302: вчера-пуш, Эпизод N, экзамен «Почти»)

Governance-ID: TG-CECD2A37DA26 (спуск в лиге ×9, вычитка удаления аккаунта, Learning V2 7 языков)

Governance-ID: TG-1C6ABB56FCC0 (Learning V2: 11 ключей ×7 по списку Ревизора 12a9bc15d)

Governance-ID: TG-A8F1F2D841A0 (проход голоса: Настройки, Магазин/осколки, Друзья, Задания дня, Рефералы, Промокод)
Governance-ID: TG-7F0A10125996 (тот же проход голоса по зонам)

Governance-ID: (тот же пакет) — mc.dialog.title без «по-английски» (Макеты через координатора)

Governance-ID: TG-13FCBA0D04A8 (пейвол М: окна ×8 языков)

Governance-ID: TG-27C0E71236F2 (согласие ИИ-диалогов: правдивая фраза про голос ×9)

Governance-ID: TG-00002E7F0545 (глоссарий ×9 и сверка терминов после 2.0.2)

Governance-ID: TG-AE73EC9539AA (прочёсывание обещаний о данных, ru+en)

Governance-ID: TG-CC464645FE5B (4 неправды о данных: тексты ×9)

Governance-ID: TG-C6091DBEE9DC (выбор владельца: 3 обещания, варианты А/Б)

Governance-ID: TG-3516A999A4DB (сводка ночи Переводчика для владельца)

Governance-ID: TG-7B77656346D0 (банки экзаменов глав v2: уроки 04–07)

Governance-ID: TG-11C9B38ABEB1 (коммиты банков 05–07 и PROGRESS)

Governance-ID: TG-BE6DB7F086F8 (подключение банков 04–07 в registry_l04_l07)

Governance-ID: TG-AFFEB051F49A (банки 04–07: вернуть «?», вопросы урока 6)

Governance-ID: TG-8B34EA017BF3 (вернуть варианты с ’s в банки 04–07, PROGRESS)

Governance-ID: TG-6EB07DE452C7 (28.10: тест уровня — бессмыслица в подсказках ×9; строки «Пожаловаться»)

Governance-ID: TG-3466FA06E090 (28.10: внести 13 правок заголовков теста уровня в final.ru.md/final.uk.md; откат — git revert коммита; пересборку выпуска запускает Codex)

Governance-ID: TG-3466FA06E090 (28.10: ревизия текстов флага «Пожаловаться» ×9 — правка только чистых файлов ReportPackModal, ReportUserModal, PackMoreMenu, ReportCommentModal + сторож pm107; чужие файлы — предложениями координатору)

Governance-ID: TG-05174B19FFA2 (28.10: строки 23 шаблонов историй ×9 — документ docs/voice/stories-templates-v1-strings-2026-10-28.md; код не трогаю, формат — по ответу Моментов)

Governance-ID: TG-053CBD022814 (28.10: поиск грамматических терминов вне заголовков Learning V2 — отчёт в docs/voice, правок курса нет)

Governance-ID: TG-EB8E66AB45AE (28.10: исключение session в глоссарий; сквозная проверка 9 языков в коммитах с 17:00 — правки только в свободных файлах)

Governance-ID: TG-EB8E66AB45AE (28.10: проверка 1003 заголовков Теории — исправлены перестановка У/Якщо в у17 и канцелярит «получение» в у15)

Governance-ID: TG-813177371D89 (28.10: урок 32 — «я помыл» → «вы помыли», заголовки и вступления ru/uk, решение координатора (а) / Q54)

Governance-ID: TG-7878D4DB782E (28.10: урок 32 — перевод английской фразы во вступлениях вернуть к «я» (96 строк), заголовки на «вы»; уточнение координатора и замечание Ревизора; откат — git revert)

Governance-ID: TG-A8D405A4F8E2 (28.10: тост «Уроки недоступны» короче — строки Дизайну; правок файлов нет)

Governance-ID: TG-6E69D6C07CA2 (29.10: подписи кадров объявлений 2.0 на 9 языках — components/stories/announcements_v2/announcement_v2_strings.ts, снять TRANSLATE; проверка — ратчет i18n:check и разбор файла; откат — git revert)

Governance-ID: TG-01D6F46EF80F (29.10: вычитка ru/uk уроков 25–27 после Теории — «законченное время / завершений час» → «это уже прошлое», «не може стояти сама» → «окремо»; правки только final.ru/uk.md, по коммиту на урок; откат — git revert)

Governance-ID: TG-C2109CD9D7C3 (29.10: вычитка ru/uk уроков 29–30 — «форма для нескольких: were» → «растений несколько»; «was — связка» → «was — «было»»; откат — git revert)

Governance-ID: TG-5E97EB663DBD (29.10: вычитка ru/uk урока 32 — «Когда вместо предмета it» → «…стоит it»; откат — git revert)

Governance-ID: TG-68268650B792 (29.10: поиск «суженных» строк (словари не на все 9 языков) в закоммиченном коде экранов; список координатору, перевод чистых файлов по коммиту на экран, предложение правки сторожа scan_untranslated_ui; откат — git revert)

Governance-ID: TG-79FBCE356B10 (29.10: «суженные» словари triLang — неверные ключи языков (pt вместо pt-BR) и пропуски; первая находка components/DailyPhraseFriendsRow.tsx:39; правка ключей по экрану, откат — git revert)

Governance-ID: TG-F2EA45DDBED5 (29.10: сторож ключей triLang — scripts/trilang_key_guard.mjs + подключение в scan_untranslated_ui.mjs (полный и --staged): неверный ключ языка = ошибка, словарь без en / без pt-BR,vi,id,tr,pl = ратчет по базе; тест на подложенный pt:; откат — git revert)

Governance-ID: TG-3C8DB0742A1E (29.10: замечания Ревизора к сторожу triLang 5f04a4f03 — немой catch в walk() → console.warn; fr/de разрешить только в файлах «Диалогов»; тест; откат — git revert)

Governance-ID: TG-3EC571B1353E (29.10: вычитка новых «Що ви опануєте / Что вы освоите» уроков 1–4 и 27–32 после переписи Теорией; правки только в final.ru/uk.md (поле не в practice.atomic.json); откат — git revert)

Governance-ID: TG-9E0545C31320 (29.10: сверка 9 языков в коммитах обновления — конкурс B, окно победителя, лесенка, анонс/история, «Не хочу с начала», окно Plus, энергия 30 мин; дописать пропуски, коммит по экрану; откат — git revert)

Governance-ID: TG-9E0545C31320 (продолжение 29.10: сторож scan_untranslated_ui исключает дев-превью app/dev_*.tsx и *_preview.tsx; немой catch в walk() пишет причину)

Governance-ID: TG-9E0545C31320 (продолжение 29.10: перевод 24 фраз рекорда этажа Пика на en/es/pt-BR/vi/id/tr/pl в docs/work/handover/peak-record-translation-2026-10-29.md по просьбе Тем)

Governance-ID: TG-D5C5351CEA07 (29.10: 9 языков в components/packs/CommunityPackCheckScene.tsx (версия HEAD после слияния 13f66f310) — LP(ru,en) → triLang на 9 языков, склонение «N карточек» по языку; правки Codex в рабочей копии не трогать; откат — git revert)

Governance-ID: TG-2EAE18132ACE (29.10: новый файл components/packs/community_pack_check_strings.ts — 9 языков экрана проверки набора; правка экрана — поверх коммита Дизайна)

Governance-ID: TG-D358005FEDF4 (29.10: 9 языков в шторке правил конкурса и этапе на главной Сообщества — новый components/packs/community_scene_strings.ts, LP в CommunityScene.tsx → по словарю; неполные словари CommunityPackScene/community_pack_create; призы — по решению координатора; откат — git revert)

Governance-ID: TG-AEA19A16CFBD (29.10: components/spire/moments/moments_strings.ts:59 downBodyNoSteps — tr/pl старые названия Kule/Wieża → Zirve/Szczyt, красный сторож spire_old_names_guard)

Governance-ID: TG-9F6373C9B940 (29.10: призы конкурса в шторке «Условия участия» — Plus на 3/2/1 месяц за места 1/2/3 по решению владельца; CommunityScene.tsx:131; 9 языков из community_scene_strings.ts)

Governance-ID: TG-9C5ACA64AAA7 (29.10: вычитка uk «Що ви опануєте» во всём курсе на естественность — кальки, род, лишние слова; правки в md через Теорию или с её согласия; откат — git revert)

Governance-ID: TG-9C5ACA64AAA7 (продолжение: 6 правок «Что вы освоите» с согласия Теории — l05/s53, s55, l10/s37 калька «знаходиться»; l07/s48, l09/s18, l26/s39 двусмысленное «вы», без рода)
