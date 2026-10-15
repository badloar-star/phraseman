# R08 — карта V2 «Новые уроки»: известный риск (15.10)

**Статус:** не воспроизводится. Сверка df455f92d на 7ed710f6e: все уровни `[V2-MAP-LAYOUT]` onLayout ненулевые, `zero:true` ни разу, карта за 0,43 с,
двойной тап «Начать» → один push. Решение координатора: ничего не чиним, логи `[V2-MAP-LAYOUT]` оставляем (дешёвые) — если вернётся, поймаем.

## Симптом (как было)

React рисует карту (есть `[V2-MAP] chapters:rows`), а натив — нет: `chapters:layout` не приходит, на экране прежний список;
раскладка появлялась только после тапа по другой вкладке.

## Известный риск — H1: таббар размонтируется в одном коммите с монтажом карты

- `app/(tabs)/lessons.tsx:4553` — `setPage("v2")` (уже на следующем кадре после тапа, 610759838).
- `app/(tabs)/lessons.tsx:2670` — `useHideTabBar(page === "v2" && lessonsTabVisible)` в том же коммите.
- `app/(tabs)/_layout.tsx:745` — `barHidden ? null : (...)` — капсула таббара **размонтируется целиком**, а не прячется.

Итог: один коммит одновременно удаляет нативное поддерево таббара и монтирует всю карту. На новой архитектуре такой коммит уже
однажды не выводился на экран до следующего касания (R08, 15.10).

**Признак в журнале:** есть `[V2-MAP-LAYOUT] render` и `[V2-MAP] after-commit:raf`, но нет ни одной строки `[V2-MAP-LAYOUT] onLayout`
(даже `level:"root"`), `[TABBAR-HIDE] result=apply`.

**Если вернётся — фикс:** в `_layout.tsx:745` не размонтировать капсулу, а прятать: opacity 0 + translateY за край, `pointerEvents="none"`.
Капсула уже `position:'absolute'` (`s.tabBarWrap`) — места не занимает, карта не сдвигается и не обрезается («ничего под таббаром»).
Возврат при выходе с карты — без прыжка (тот же translateY назад). Логи `[TABBAR-HIDE]` оставить. Проверить на всех вкладках — `_layout.tsx` общий.

## Прочие гипотезы (менее вероятны) — признаки в журнале

| # | Где | Признак |
|---|-----|---------|
| H2 | react-freeze: `_layout.tsx:1291` (freezeWanted от physicalPageIdx), `TabPane` `:234–238` | `[V2-MAP] lessons-pane freezeWanted=true` при тапе и НЕТ `[V2-MAP-LAYOUT] render` |
| H3 | ключ эпохи `DeferredTabScreen key=lessons-${epoch}` `_layout.tsx:330–334` | `[LESSONS-EPOCH] bump` + `chapters:unmount → mount` рядом с тапом |
| H4 | крышка `coverLessons` `_layout.tsx:313` | onLayout есть и ненулевой, `coverLessons=true` (видно React, не видно глазу) |
| H5 | `display:none` контейнера страницы `lessons.tsx:5569` | `level:"lessonsPage" display:"none"` (только при «Диалогах») |
| H6 | ширина ленты `app/TabSlider.tsx:168–172` | `level:"lessonsPage" width:0` |

Вкладки — не React Navigation: своя лента `app/TabSlider.tsx` + react-freeze; `lazy`/`freezeOnBlur`/`detachInactiveScreens` к ним не применимы.

**Чтение журнала:** onLayout контейнера `lessonsPage` приходит при монтировании и смене размера — после тапа «Новые уроки» его отсутствие нормально.
Решающие строки — `root` / `scroll` / `chapter:N` карты и `render`.

Сбор: `grep "[V2-MAP-LAYOUT]|[V2-MAP]|[V2-OPEN]|[TABBAR-HIDE]|[LESSONS-EPOCH]"`.
