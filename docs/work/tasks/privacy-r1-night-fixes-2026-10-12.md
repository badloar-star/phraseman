# Ночные правки по PRIVACY_R1_GAP (решения советника, владелец спит)

Governance-ID: TG-87C0CCD06D42

## Outcome
Шесть решений, каждое отдельным коммитом под замком. НИЧЕГО не выкладывать и не публиковать: без деплоя, без `legal:sync` на хостинг, без push.
1. TTL для `dialogue_v2_freeform_sessions.expiresAt` в `firestore.indexes.json`, как у `dialogue_v2_sessions`. `account_delete.ts` не трогаем. Деплой индексов — владелец утром.
2. `legal/privacy_policy_en.json` + `_ios.json`, одним коммитом:
   - §11: комментарии оценки — «only if you enabled AI features»;
   - §11: свободный чат (вариант Б);
   - Шпиль: комнаты до 30 мест, часть мест — компьютерные участники, результаты видят другие пользователи;
   - ИИ-проверка и автоперевод наборов, ИИ-черновики ответов на жалобы;
   - что прикладывается к обращению;
   - язык и часовой пояс при push;
   - вход по коду и аварийная копия на телефоне.
   После правки — `npm run legal:sync` только для локальных копий в репозитории (без деплоя).
3. Условия использования: строка про компьютерных участников Шпиля.
4. Удалить неиспользуемые `react-native-webrtc` и `react-native-incall-manager` (0 импортов). Убрать `NSCameraUsageDescription` и `MODIFY_AUDIO_SETTINGS`, если на них ничего не опирается. Тест `website_privacy_consent_contract`. Нативная сборка — «проверить до 14.10».
5. HTML iOS-версии политики `/legal/privacy-ios/` — файл в репозитории, не выкладывать.
6. RU-версия не публикуется. Сводка «что сделано ночью / что нужно утром» — в `PRIVACY_R1_GAP.md`.

## Scope
- `firestore.indexes.json`
- `legal/*.json` и их локальные копии
- `app.json`, `package.json` / lock
- тесты
- `knowly-www/legal/privacy-ios/`
- `docs/phraseman-2.0/PRIVACY_R1_GAP.md`

## Architecture
- Политика: источник — `legal/*.json`, копии генерирует `scripts/sync-legal-html.mjs`.
- TTL: декларация в `firestore.indexes.json`, применяется только при деплое индексов.

## Security and privacy
- Политика приводится в соответствие с кодом.
- Удаление камеры и лишних разрешений уменьшает собираемое.

## Technical debt
- Нативная сборка после удаления пакетов не проверена — «проверить сборкой до 14.10».

## Verification
- JSON валиден.
- `legal:sync` локально; тесты политики/сайта.
- `expo config --type introspect`: нет камеры и `MODIFY_AUDIO_SETTINGS`.
- Срез `tsc`, точечные тесты.

## Rollback
- `git revert` каждого коммита.

Governance-ID: TG-87C0CCD06D42 (п.4: удаление react-native-webrtc / react-native-incall-manager, NSCameraUsageDescription; MODIFY_AUDIO_SETTINGS оставлен — нужен голосовым функциям)

Governance-ID: TG-E1CEF515644F (п.60 журнала: сверка 9 решений советника по PRIVACY_R1_GAP; (2) одна фактическая строка про компьютерных участников Шпиля в условиях; (8) пометка у экспорта cardTts и тексты §6/§13 для владельца)
