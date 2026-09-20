# Task packet: телефон не греется и не копит лаги при долгом использовании

Governance-ID: TG-9B393D7704AC
Status: Done (commit afb937a3f)
Owner: сессия Claude Opus 5, 2026-09-20
Related epic/enabler: Performance Bible (AGENTS.md), PERF_MASTER_PLAN.md

## Outcome

Запрос владельца: «полный аудит — есть ли места, которые греют телефон/батарею
или через полчаса-час использования начинают лагать и тормозить нажатия».

Наблюдаемый результат:
- вечные анимации, крутившиеся вне видимого экрана, остановлены;
- сторож, который обязан такие анимации ловить, снова работает (был красный —
  именно поэтому дефект и проехал);
- из релизной сборки убраны логи, которые на телефоне пользователя писались
  в никуда.

Мера успеха: `npm run guard:motion-ratchet` зелёный (81/81), реестр вечных
анимаций и layout_stability зелёные, на живых файлах подтверждено, что
`console.log` исчезает из релиза, а `warn`/`error` остаются.

## Scope

In scope (изменено, 8 файлов, коммит afb937a3f):
- `components/QuestTaskCard.tsx` — гард `useRuntimeActive` на Animated.loop;
- `components/HomeDiscountBadge.tsx` — разделение эффекта, гард на пульс;
- `app/ideas_catalog.tsx` — гард на три Animated.loop;
- `tests/runtime_lifecycle_ratchet.test.ts` — реестр: 14 расхождений → 0;
- `tests/owner_direction_runtime_contract.test.ts` — аллоулист setInterval: +5;
- `babel.config.js`, `package.json`, `package-lock.json` — вырезание console.

Out of scope (намеренно НЕ трогал):
- `app/learning_v2_course_session_audio_preload_v1.ts` — переводится на новый
  механизм озвучки ДРУГОЙ сессией прямо сейчас;
- 5 падений `owner_direction_runtime_contract` + 1
  `home_runtime_animation_contract` — чужой предсуществующий долг, строки
  исчезли из `home.tsx` и `EnergyContext.tsx` в коммите-снимке `0993b137c`;
- JS-занятость 5 с при выходе из сессии Learning V2 — требует трассы рендеров,
  отдельная задача (гадать запрещено правилом «сперва логи»).

## Architecture

Без изменения архитектуры. Применён существующий контракт Performance Bible:
любая `withRepeat(-1)` / `Animated.loop` обязана быть под фокусом экрана и
AppState через `hooks/use_runtime_active.ts`. Эталон — `SurveyTaskCard`.

Инвариант, который сознательно НЕ нарушен: гейтится только повторяющееся
движение. Появление элемента (`HomeDiscountBadge`) остаётся негейтованным,
иначе первый кадр перестал бы равняться финальному (layout stability).

Признак релизной сборки берётся тем же способом, что и `babel-preset-expo`
(`build/common.js` → `getIsProd`): сначала `api.caller(c => c.isDev)`, и только
при его отсутствии — переменные окружения. Проверка одного лишь `NODE_ENV`
была бы неверной: Metro сообщает режим через caller.

## Security and privacy

Не применимо к правкам анимаций: персональных данных, авторизации, секретов и
сетевых вызовов они не касаются.

По вырезанию console проверено отдельно, так как это затрагивает диагностику:
- ошибки пользователей уходят в облако ОТДЕЛЬНЫМ каналом (`app/app_health.ts`
  → `submitClientReport('app_error')`) и сборкой не затрагиваются;
- `app/debug-logger.ts` пишет в AsyncStorage, тоже не через console;
- `console.warn` / `console.error` в `exclude` — они несут причины ранних
  выходов и проглоченных `catch` (правило владельца «сперва логи, потом
  починка»). Проверено grep: `catch`, пишущих причину через `console.log`, в
  проекте НОЛЬ, все 6 идут через warn/error.
Новых данных не собирается, политика приватности правки не требует.

## Technical debt

- **Pay now:** реестр вечных анимаций приведён в соответствие с кодом
  (11 файлов внесены, протухшая запись `LiveStreakFeather` снята, устаревший
  токен `scripted_repeat_compare_mode_v1` подрезан после проверки `git log -S`,
  что полоски волны были УДАЛЕНЫ вместе с анимацией, а не лишились гарда).
- **Pay now:** аллоулист `setInterval` дополнен 5 тиками, каждый сверен на гард
  вручную; тихого сетевого опроса среди них нет.
- **Contain:** сторож `guard_runtime_lifecycle_ratchet.mjs` + jest-реестр
  остаются блокирующими — новая незащищённая анимация снова упрётся в них.
- **Accept temporarily:** 6 красных проверок чужого долга (см. Out of scope).
  Владелец уведомлён, чинить отдельной задачей с разбором `home.tsx`; чинить
  вслепую внутри этой задачи было бы гаданием.
- **Accept temporarily:** JS-занятость при выходе из сессии Learning V2.
  Потолок влияния: задержка отклика, не потеря данных. Следующий шаг — трасса
  `[TAP-LAT]` в релизной сборке.

## Verification

Выполнено в этой сессии:
- `node scripts/guard_runtime_lifecycle_ratchet.mjs` → OK, 81 записей / 81 файл;
- реестр вечных анимаций → PASS (2 проверки);
- `layout_stability_contract` → PASS; `animation_scheduling` → PASS;
- проверка типов проекта → 276 ошибок, все в чужих файлах, в затронутых НОЛЬ;
- вырезание console проверено в ОТДЕЛЬНЫХ процессах (кеш конфига иначе отдаёт
  первый посчитанный режим дважды и даёт ложный результат), все 4 сочетания:
  caller.isDev=false → остались только warn+error; caller.isDev=true → всё;
  NODE_ENV=production без caller → warn+error; development → всё;
- замер на живых файлах: `quests_client` 21 log → 0 / warn 8 → 8;
  `phone-state/database` 9 → 0 / 11 → 11; `firestore_friends` 14 → 0 / 4 → 4;
- Optimistic UI затронутых экранов: мгновенный отклик на тап и оптимистичный
  лайк идеи с откатом — на месте, правки их не касаются.

## Rollback

Полный откат: `git revert afb937a3f`. Пользовательских данных, миграций и
выданных прав правки не затрагивают, откат безопасен.

Частичный откат вырезания console: убрать блок `plugins` из `babel.config.js`
(пересборка обязательна — конфиг применяется на этапе сборки, JS-релиз его не
подхватит). Откат гардов вернёт прежний нагрев, смысла не имеет.
