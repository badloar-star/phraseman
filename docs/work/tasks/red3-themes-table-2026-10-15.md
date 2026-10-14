# Task packet: три красных из таблицы Тем, приписанные моим коммитам (координатор 15.10)

Governance-ID: TG-000EC580AC30
Status: Разобрано; правка одного теста
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

| Тест | Реальная причина | Чей коммит | Решение |
|---|---|---|---|
| analytics_funnel_coverage | `intro_ended_cta` больше не шлётся: D186 снял окно «72 часа» и его кнопку (мой 4b2562d52 убрал мёртвый обработчик) | мой | тест: событие снято из списка воронки (как `winback_shown`) |
| android_bundle_hygiene_contract | `.easignore`: `/content/` заменён на `/content/*` + исключение `content/learning-v2-course/activation/` | Ядро 2a033ab6e, 14.10 23:13 — НЕ мой `app/_layout.tsx` | координатору → Ядру (сторож упаковки сборки обновляет хозяин правки) |
| audio_never_permanently_silent_contract | нарушитель — `modules/sound_v2/sound_v2_runtime.ts` (играет мимо владения звуком) | сессия Звуков — НЕ мой | координатору → Звукам |

Попутная проверка (не поломка): в `app/_layout.tsx` осталось состояние `introFullAccessModal` ('welcome'/'ended') и `useOverlayVisible('introFullAccess')`,
а само окно не рисуется с 4f6334b20. Ветки недостижимы (`INTRO_FULL_ACCESS_REMOVED = true` → expiredUnseen/welcomeUnseen всегда false), но если флаг
вернут без окна — получится невидимый держатель слота очереди окон. Убрать в этапе 2 D186.

## Scope

In scope: `tests/analytics_funnel_coverage.test.ts`. Out of scope: `.easignore`, `modules/sound_v2/*`, `app/_layout.tsx`.

## Architecture

Только список ожидаемых событий в тесте; код приложения не меняется.

## Security and privacy

Не касается.

## Technical debt

- Мёртвые `intro_ended_shown` / `intro_full_access_started` / состояние `introFullAccessModal` в `app/_layout.tsx` — этап 2 D186.

## Verification

`analytics_funnel_coverage` — N passed, N>0 (по GO).

## Rollback

`git revert`.
