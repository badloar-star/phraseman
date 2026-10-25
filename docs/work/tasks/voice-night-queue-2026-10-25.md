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
