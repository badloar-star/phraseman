# Task packet: кольцо историй пульсирует всё время, пока есть непросмотренная история

Governance-ID: TG-1788D15CB0C7
Governance-ID: TG-01F61FA1ABB4
Status: Done
Owner: сессия Claude (побочная, 11.11.2026)
Related epic/enabler: D192 (истории на Главной)

## Outcome

Слово владельца 11.11.2026: «КОГДА есть история пусть аватарка пульсирует всегда пока есть непросмотренная история!»
Раньше кольцо вокруг аватара на Главной «дышало» 4 раза (около 7 секунд) и замирало. Теперь оно пульсирует без
остановки всё время, пока есть хотя бы одна непросмотренная история, и исчезает вместе с пульсацией, когда
просмотрено всё. Мера успеха: человек, зашедший на Главную через минуту, час или после перезапуска, видит живое кольцо.

## Scope

In scope: `components/stories/StoryRing.tsx` (число повторов), два сторожа, которые закрепляли прежнее конечное
«дыхание» (`tests/motion_allowlist_contract.test.mjs`, `tests/stories_ring_viewer_contract.test.tsx`), новый тест
поведения `tests/story_ring_pulse_while_unseen_2026_11_11.test.tsx`.

Дополнение (владелец 11.11, второе сообщение: «и макет покажешь, когда сделаешь, как это будет выглядеть»): интерактивный
макет пульсации на настоящем кадре Главной (`home_ink_dark.png` из утверждённых сцен + картинка монеты из приложения).
Макет лежит вне репозитория (папка сессии) и публикуется приватной страницей; в код и в `docs/design` ничего не добавляется.

Out of scope: `components/stories/StoryAvatarSlot.tsx` и `app/(tabs)/home.tsx` (редактируются в других сессиях, не
тронуты); размах пульсации (в коде 1,06, в макете `stories-avatar.html` — 1,05); плавное «схлопывание» кольца
при просмотре последней истории.

## Architecture

No architecture change. Признак «есть непросмотренное» по-прежнему решает слот аватара по локальному состоянию
историй (память процесса, без сети): кольцо смонтировано тогда и только тогда, когда непросмотренное есть.
Меняется только длительность цикла внутри кольца: конечные 4 повтора заменены на вечный цикл. Инварианты прежние:
анимация на UI-потоке (reanimated), стоит вне фокуса экрана и в фоне (`useRuntimeActive`), стоит при системной
настройке «уменьшить движение», геометрия слота 48 × 48 не меняется (только transform).

## Security and privacy

Не затрагивается: данные не собираются, не хранятся и не передаются, сеть и авторизация не участвуют.

## Technical debt

- Contain: вечный цикл внесён в список разрешённых (`motion_allowlist_contract`) с причиной и ссылкой на слово
  владельца; сторож фокуса/фона (`perf_freeze_contract`) продолжает требовать гейт. Выход: владелец отменит правило.
- Accept temporarily: размах 1,06 против 1,05 в макете — владелец/координатор, решить при ближайшей Сверке Главной.
- Замечено, не моё: `scripts/guard_runtime_lifecycle_ratchet.mjs` ссылается на отсутствующий
  `tests/runtime_lifecycle_ratchet.test.ts`.

## Verification

- `npm run test:one -- tests/story_ring_pulse_while_unseen_2026_11_11.test.tsx`
- `npm run test:one -- tests/stories_ring_viewer_contract.test.tsx`
- `npm run test:one -- tests/avatar_one_ring_owner_lock_2026_10_28.test.tsx`
- `npm run test:one -- tests/perf_freeze_contract.test.ts`
- `node --test tests/motion_allowlist_contract.test.mjs`
- Итог 11.11: три файла по кольцу зелёные (53 проверки); в `perf_freeze_contract` и `motion_allowlist_contract` красное чужое (`HomeWeekCapsule.tsx`; устаревшие строки `app/_layout.tsx`, `LearningV2MapNode.tsx`), кольцо в нарушителях не значится. На устройстве не проверялось.

## Rollback

Вернуть `4, false` в `StoryRing.tsx` и строки двух сторожей (один коммит, `git revert`). Данных пользователя нет.
