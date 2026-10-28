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
