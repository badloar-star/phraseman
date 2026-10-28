# Патч для `app/(tabs)/_layout.tsx` (файл Codex): события диагностики вкладки «Уроки» (Дизайн, 28.10)

Governance-ID: TG-B62B3E7952A1

Модуль готов и закоммичен: `app/lessons_tab_diagnostics.ts` (`noteLessonsOpenStart`, `noteLessonsLeave`, `noteLessonsFirstFrame`). Вкладка `lessons.tsx` уже пишет `back_button`, неявный `tab_switch` и первый кадр; плитка Главной ставит метку тапа. Остаётся пять вставок в `_layout.tsx`. Каждая — одна строка; поведение вкладок они не меняют.

## 1. Импорт (рядом с `import { planHiddenTabRedirect } from '../tabs_hidden_route_redirect';`)

```ts
import { noteLessonsLeave, noteLessonsOpenStart } from '../lessons_tab_diagnostics';
```

## 2. Редирект скрытой вкладки — `hidden_tab_redirect` (самая важная строка: ловит жалобы «/lessons → /home»)

В `useLayoutEffect` по `pathname`, внутри ветки с `console.warn('[LANG-SURFACE] tabs:hidden_tab_route → home', ...)`:

```ts
if (rawFromRouter === 1) noteLessonsLeave('hidden_tab_redirect', { studyTarget: String(studyTarget) });
```

То же — в месте, где применяется `planHiddenTabRedirect(...)` (строка ~922), если редирект на Главную выполняется там: перед самим `replace` для вкладки с индексом 1.

## 3. Тап по таббару — метка старта и `tab_bar_tap`

В `handleTabChange`, сразу после `const idx = visibleTabIdx(requestedIdx, pageLayoutRef.current);`:

```ts
if (idx === 1 && activeIdxRef.current !== 1) noteLessonsOpenStart('tab_bar');
if (activeIdxRef.current === 1 && idx !== 1) noteLessonsLeave('tab_bar_tap', { to: idx });
```

Если `handleTabChange` вызывается и программно (`goToTab` из экранов), а у таббара есть отдельный `onPress`, лучше поставить обе строки в `onPress` таббара — тогда подпись `tab_bar_tap` точная. Если разделить нельзя — оставить в `handleTabChange`: неточность только в подписи.

## 4. Уход по маршруту — `route_param`

В том же `useLayoutEffect` по `pathname`, после вычисления `rawFromRouter`, до обработки `pending`:

```ts
if (rawFromRouter !== 1 && activeIdxRef.current === 1 && pendingTabIdxRef.current === null) noteLessonsLeave('route_param', { pathname });
```

(маршрут увёл с «Уроков», а нажатия по таббару не было).

## 5. Проверка

После вставок: `npm run test:one -- tests/lessons_tab_diagnostics.test.ts` и полная проверка типов.

## Что увидит поддержка

В админке в журнале обращения: `feature_action · /lessons · lessons:leave:<hidden_tab_redirect | back_button | tab_bar_tap | route_param | tab_switch>` и `lessons:first_frame_ms:<lt1s | 1to3s | 3to8s | gt8s>` с точным `durationMs`. Белый список сервера (`safeDiagnosticAction`) эти действия пропускает — замок в `tests/lessons_tab_diagnostics.test.ts`. События пишутся только при включённой диагностике поддержки (`isSupportDiagnosticsEnabled()`); новых категорий данных нет (метка действия и миллисекунды, без идентификаторов и текстов), политика конфиденциальности не меняется.
