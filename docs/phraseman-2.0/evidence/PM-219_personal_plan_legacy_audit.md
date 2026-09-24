# PM-219 — аудит "Personal Plan": legacy Plans, разведка (read-only)

Дата: 2026-09-24. Задача: PM-219 "Удалить персональные планы из релизного контура".
Формат: чисто разведочный — код НЕ менялся, НЕ удалялся, ничего не закоммичено.

## Статус фичи: RETIRED-но-ЖИВАЯ для grandfathered-пользователей (сценарий "б", не "а")

Это НЕ мёртвый код, который только редиректит наружу. Это фича с официально
объявленной датой отключения (sunset), которая до этой даты продолжает
работать для узкого множества пользователей, купивших/начавших план ДО
cutoff. Прямые цитаты:

`app/personal_plan_retired_redirect.ts:9-13`:
> Personal Plan is retired for acquisition. A denied grandfathered route must
> explain that fact and return to the free course, never use Plus checkout as
> an accidental renewal path for a product that no longer exists.

Тост, который видит пользователь при отказе в доступе (`personal_plan_retired_redirect.ts:14-28`):
> "Personal Plan больше не продаётся. Первые три урока доступны бесплатно,
> продолжение курса — с Plus."

`app/personal_plan_sunset.ts:3-11` — три ключевые константы:
```
PERSONAL_PLAN_GRANDFATHER_CUTOFF_AT_MS = Date.parse('2026-08-20T23:59:59.999Z')
PERSONAL_PLAN_SUNSET_AT_MS             = Date.parse('2026-10-20T00:00:00.000Z')
PERSONAL_PLAN_SUNSET_FALLBACK_ROUTE    = '/lessons_list'
```

Логика доступа (`resolvePersonalPlanSunsetAccess`, там же, строки 51-76):
1. Если `nowMs >= 20.10.2026` → `status: 'expired'` — для ВСЕХ, безусловно.
2. Иначе, если сохранённый план (`status` in active/paused/completed) имеет
   `createdAt <= 20.08.2026` (grandfather cutoff) → допускается доступ,
   ПРИ УСЛОВИИ что у пользователя подтверждён исходный платный доступ к
   фиче (`hasOriginalFeatureAccess`/premium).
3. Иначе — `not_grandfathered`, редирект на `/lessons_list` с объясняющим тостом.

То есть: **не продаётся новым** (grandfathering закрыт с 20.08.2026), но
**работает для тех, кто уже купил/начал план до этой даты — вплоть до
20.10.2026, когда раздел выключается полностью и безусловно для всех**.

`personal_plan_sunset_clock.ts` — доп. механизм: account-independent
монотонные "высоководные" часы в AsyncStorage (`personal_plan_sunset_high_water_v1`),
которые не дают обойти дедлайн переводом часов устройства назад. Комментарий
в коде (строки 14-21) прямо называет это "retirement" и подтверждает design intent
на строгое закрытие 20.10.2026, без доверия системным часам устройства.

**Вывод по PM-219-A1**: фраза "legacy Plans, не учебные планы V1/V2" —
подтверждена. Personal Plan НЕ имеет отношения к Learning V1/V2 (это
отдельная группа модулей `app/personal_plan_*`, тематически про
персональный insurance-план по фразам/грамматике с собственным движком
заданий, а не курс). Но статус точнее описывается не как "legacy/retired"
в смысле "мёртвый код", а как **"sunsetting" — активная фича с зафиксированной
датой полного отключения (20.10.2026), которая ДО этой даты обслуживает
grandfathered-пользователей**.

## Точки входа снаружи группы `personal_plan_*`

### Живая пользовательская навигация (НЕ только редирект наружу)

- `app/(tabs)/lessons.tsx:3738` — `router.push("/personal_plan_setup")` —
  для dev-bypass пользователя без сохранённого плана.
- `app/(tabs)/lessons.tsx:3775-3778` — `router.push(state.status === "completed"
  ? "/personal_plan_complete" : "/personal_plan")` — САМАЯ ГЛАВНАЯ находка:
  реальный пользователь с grandfathered-планом реально открывает `/personal_plan`
  через вкладку уроков (весь блок `openLearningRoute`, строки 3717-3789, —
  это живой UI-путь: проверка sunset-доступа → проверка premium → редирект
  ЛИБО на экран плана, ЛИБО на `redirectRetiredPersonalPlan`).
- `app/(tabs)/lessons.tsx:2249-2251` — `useFeatureAccess("personal_plan")` —
  вкладка условно показывается/скрывается по фиче-флагу.
- `app/(tabs)/home.tsx:224` — импортирует `readPersonalPlanState` (карточка на
  Главной, судя по соседнему комментарию про `personal_plan_stats_screen.tsx`).
- `components/CleanOnboarding.tsx:99` — импортирует
  `PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY` — онбординг всё ещё знает
  про отложенную активацию плана.
- `app/paywall_purchase.ts` (63-858) — пейвол активно обрабатывает контекст
  покупки `context === 'personal_plan'`: активация плана после Plus-покупки
  (`activatePendingPersonalPlanAfterPremium`), пост-премиум роутинг
  (`personal_plan_post_premium.ts` → `/personal_plan_thank_you` либо
  `/lessons_list`).
- `app/cloud_sync.ts` (96-97, 608-684, 1515-2010) — облачная синхронизация
  ЯВНО и по сей день синхронизирует ключи `personal_plan_state_v1`,
  `personal_plan_progress_v1`, `personal_plan_completed_tasks_v1`,
  `personal_plan_task_progress_v1`, `personal_plan_xp_ledger_v1`,
  `personal_plan_attempt_events_v1`, `personal_plan_counted_phrases_v1`,
  `personal_plan_recovery_applied_actions_v1`,
  `personal_plan_onboarding_nickname_pending_v1`,
  `personal_plan_pending_activation_v1`, `personal_plan_day_runtime_v1:*`
  — включая merge-логику для восстановления между устройствами
  (`mergePersonalPlanStateRestoreValue`).
- `app/events.ts:167` — событие `personal_plan_updated` в типах глобальной
  шины событий приложения.
- `app/lesson1.tsx`, `app/lesson_menu.tsx`, `app/flashcards_swipe.tsx`,
  `app/mistake_practice_session.tsx` — все четыре оборачивают свои экраны в
  `withOptionalPersonalPlanSunsetGuard` (общий guard из
  `components/personal_plan_sunset_guard.tsx`) — это означает, что маршруты
  ЭТИХ экранов используются СОВМЕСТНО (shared routes) между обычным Learning
  и Personal Plan через `hasPersonalPlanRouteMarker` (маркер параметра
  в URL решает, применять ли guard). `mistake_practice_session.tsx:434` также
  напрямую помечает `'personal_plan'` как источник ошибки/практики и вызывает
  `markPersonalPlanTaskCompleted`.
- `components/personal_plan_sunset_guard.tsx` — центральный guard-HOC
  (`withPersonalPlanSunsetGuard`, `withOptionalPersonalPlanSunsetGuard`),
  который на каждом фокусе экрана заново проверяет sunset-доступ и, если
  дедлайн наступил, вызывает `redirectRetiredPersonalPlan`. Содержит
  таймер, который САМ себя перепроверяет вплоть до наступления
  `PERSONAL_PLAN_SUNSET_AT_MS` (`setTimeout` на `remainingMs`, максимум раз в
  60 секунд) — то есть экраны плана "живые" ровно до 20.10.2026 00:00 UTC,
  когда автоматически перестанут открываться сами, без релиза нового билда.
- `components/PersonalPlanSunsetNotice.tsx` — виджет обратного отсчёта
  ("До отключения: ДД:ЧЧ:ММ:СС"), показывается где-то в UI плана.
- `app/plan_content_remote_facade.ts`, `app/plan_day_lesson_recommendation.ts`,
  `app/plan_week_mode_progression.ts` — три файла БЕЗ префикса `personal_plan_`,
  но семантически часть той же фичи (контент/рекомендации/прогрессия недели
  плана) — это тоже часть границы удаления, просто наименование не попало под
  простой `find`.

### Вывод по границе

Группа `personal_plan_*` НЕ изолирована: минимум 16 файлов снаружи префикса
активно её используют (навигация, синхронизация, пейвол, онбординг, guard'ы
для общих экранов). Это означает, что PM-219-A2 нельзя закрыть простым
"удалить папку `personal_plan_*`" — нужно аккуратно перерезать все точки
входа, причём НЕ ДО 20.10.2026, иначе grandfathered-пользователи потеряют
доступ раньше объявленного срока (нарушение обещания, данного им текстом
тоста/countdown).

## Серверная часть (Cloud Functions)

**Прямых Cloud Functions под personal_plan НЕТ.** `grep -rli` по
`functions/src` не нашёл ни одной функции с `personal_plan`/`personalPlan` в
имени или логике — единственное совпадение (`functions/src/generated/support_repo_context.json`)
— это сгенерированный служебный файл-контекст для саппорт-бота, не рабочий код.

`firestore.rules` также не содержит явных правил, специфичных для
`personal_plan` коллекций — значит, данные плана хранятся, по всей
видимости, внутри общих пользовательских документов/полей (судя по ключам
AsyncStorage выше — `personal_plan_state_v1` и т.д. — которые `cloud_sync.ts`
кладёт в общий синхронизируемый профиль), а не в отдельной Firestore-коллекции
со своими правилами. Это значит удаление клиентского кода не требует отдельной
серверной миграции/деплоя функций — но нужно аккуратно решить, что делать с
уже накопленными полями в профилях пользователей (не в рамках этой задачи).

## Вес (embedded-ассеты)

Оценка по размеру файлов (не git-history, а текущий размер на диске):

| Файл | Размер |
|---|---|
| `app/personal_plan_runtime_audio_assets.compact.generated.ts` | 120 869 байт (~118 КБ) |
| `app/personal_plan_art.ts` | 2 407 байт |
| `app/personal_plan_runtime_audio_asset_modules.ts` | 1 745 байт |
| **Все ~90 файлов `personal_plan_*` суммарно** | **1 345 423 байт (~1.28 МБ)** исходного TS-кода |

Для сравнения с прецедентом MAX (161 файл ~560 КБ вместе с ассетами) — блок
Personal Plan почти вдвое тяжелее по объёму кода одного лишь TS/TSX (без учёта
реальных бинарных аудио/картинок, если они подключаются через отдельные
`require()` — это не проверялось, `personal_plan_art.ts` и
`_audio_asset_modules.ts` малы и похожи на список путей/индекс, а не сами
бинарники). Реальный вес в бандле = TS-код (~1.28 МБ исходников, после
минификации меньше) + внешние аудио/картинка ассеты, на которые эти два
индексных файла ссылаются — их размер не измерен в этом аудите (нужен
отдельный проход по `require()`/`import` путям в `personal_plan_art.ts` и
`personal_plan_runtime_audio_asset_modules.ts`, вне текущего read-only объёма).

## Вердикт

**PM-219-A1 (уточнение: legacy Plans ≠ Learning V1/V2)** — ПОДТВЕРЖДЕНО.
Personal Plan — полностью самостоятельная, отдельная от курсов V1/V2 фича
("insurance"-план фраз с собственным движком заданий/XP/озвучки), официально
объявленная владельцем к закрытию (даты grandfather-cutoff 20.08.2026 и
sunset 20.10.2026 зашиты в код с прямыми комментариями про "retired"/"retirement").

**PM-219-A2 (exclusive routes/services/assets) — уточнение классификации:**
Задачу нельзя закрыть как "легаси, можно удалять сейчас" — это сценарий
**(б) частично жива, нужна миграция/grandfathering**, а не (а). Рекомендация:
пометить NEEDS_DECISION до 20.10.2026, конкретно:

1. **Удалять НЕЛЬЗЯ до 20.10.2026** — до этой даты код обязан продолжать
   работать для grandfathered-пользователей, иначе нарушится публичное
   обещание (тост + countdown-виджет), данное владельцем этим пользователям.
2. **После 20.10.2026** (когда `PERSONAL_PLAN_SUNSET_AT_MS` наступит и
   `resolvePersonalPlanSunsetAccess` начнёт безусловно возвращать `expired`
   для всех) — подлежат удалению:
   - вся группа `app/personal_plan_*.ts`/`.tsx` (~90 файлов, ~1.28 МБ
     исходников) целиком, включая `personal_plan_sunset.ts` и
     `personal_plan_sunset_clock.ts` (сам механизм заката тоже станет не
     нужен);
   - `app/plan_content_remote_facade.ts`, `app/plan_day_lesson_recommendation.ts`,
     `app/plan_week_mode_progression.ts` — сателлиты без префикса;
   - `components/personal_plan_sunset_guard.tsx`,
     `components/PersonalPlanSunsetNotice.tsx`;
   - ссылки/импорты в 13 внешних файлах: `app/(tabs)/home.tsx`,
     `app/(tabs)/lessons.tsx` (блок `openLearningRoute` и вкладка целиком),
     `app/cloud_sync.ts` (все 15+ ключей `personal_plan_*` из списков
     синхронизации и merge-функция), `app/events.ts` (тип события
     `personal_plan_updated`), `app/flashcards_swipe.tsx`, `app/lesson1.tsx`,
     `app/lesson_menu.tsx`, `app/mistake_practice_session.tsx` (снять
     `withOptionalPersonalPlanSunsetGuard`-обёртку и код, специфичный для
     `'personal_plan'` как источника ошибки), `app/paywall_purchase.ts`
     (снять контекст `'personal_plan'` целиком), `components/CleanOnboarding.tsx`
     (снять `PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY`);
   - серверных Cloud Functions снимать НЕ с чего — их нет; решить отдельно,
     что делать с уже накопленными полями `personal_plan_*` в профилях
     пользователей (Firestore) — вне объёма этой задачи.
3. Ассеты (`personal_plan_art.ts`, `personal_plan_runtime_audio_asset_modules.ts`,
   `personal_plan_runtime_audio_assets.compact.generated.ts`) удаляются вместе
   с кодом — но фактический вес бинарников, на которые они ссылаются, не
   измерен в этом аудите и должен быть проверен отдельно перед удалением
   (аналогично тому, как в MAX-прецеденте отдельно считали 375 КБ орбов).

**НЕ подтверждён как "простое удаление сейчас"** — если владелец хочет
удалить раньше 20.10.2026, это требует явного решения о досрочном сносе
grandfathering (то есть отказ части уже заплативших/начавших пользователей от
обещанного доступа) — статус NEEDS_DECISION, а не готовая к исполнению задача.
