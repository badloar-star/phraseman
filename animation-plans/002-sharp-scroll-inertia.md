# 002 — Резкая app-wide инерция скролла

**Severity:** HIGH  
**Status:** DONE  
**Audit baseline:** `f11824104`

## Проблема

Текущий контракт разрешает `fast` только для paging/snap и тем самым закрепляет
мягкую долгую инерцию. Аудит нашёл 209 прямых scroll-поверхностей: 87 явных
`normal`, 118 без значения (нативный default `normal`) и лишь 5 `fast`.
Android edge-bounce дополнительно возвращается пружиной 500 мс.

## Исправление

- Ввести единый app-wide default `decelerationRate="fast"` для обычных
  `ScrollView`/list/BouncyScrollView поверхностей.
- Заменить явные `normal` на `fast`; omission должен быть запрещён контрактом
  там, где он снова возвращает нативный `normal`.
- Сохранить локальную snap/paging физику колёс и каруселей.
- Не менять внутренние жесты и motion fingerprints Learning V2.
- Сделать Android edge-rebound коротким и не перезапускать его на каждом кадре.

## Contract / проверка

- AST-контракт считает `normal`, numeric/dynamic и незащищённый omission ошибкой.
- Отдельные тесты фиксируют snap-исключения и короткий rebound.
- Повторный аудит должен дать 0 ordinary-normal/default-normal поверхностей.
