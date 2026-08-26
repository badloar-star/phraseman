# 003 — Мгновенное открытие разделов

**Severity:** HIGH  
**Status:** DONE  
**Audit baseline:** `f11824104`

## Проблема

Большинство production routes наследуют `slide_from_right` 220 мс; section
sheets и paywalls используют `slide_from_bottom`, Cards siblings — fade 140 мс.
Несколько helper-путей добавляют timer/InteractionManager задержки.

## Исправление

- Production default и все обычные section/subsection routes:
  `animation: 'none'`, `animationDuration: 0`.
- Сохранить presentation, Back/dismiss, access/paywall и данные; убрать только
  задержку появления.
- Не ждать необязательный cache/prefetch до навигации. Проверки, которые решают
  право доступа или покупку, остаются до перехода и получают немедленный
  visual-first press feedback.
- Оставить редкие reward/celebration motion и нормативный Learning V2 motion.

## Contract / проверка

- Контракт проверяет instant root/section/paywall policy и запрещает возврат
  default-on env-флагов.
- Любое ненулевое route-motion исключение должно быть именованным и обоснованным.
- Повторный статический аудит всех route options и focused tests.
