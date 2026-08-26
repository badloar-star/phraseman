# 004 — Visual-first отклик на нажатие

**Severity:** HIGH  
**Status:** DONE  
**Audit baseline:** `f11824104`

## Проблема

`PressableHybrid` обслуживает 71 место и вызывает native haptic раньше старта
scale-анимации. Остальные общие press-примитивы уже используют правильный
visual-first порядок. Контракта на единый порядок нет.

## Исправление

- Сначала синхронно запустить scale/opacity feedback, затем haptic.
- Сохранить callbacks, disabled-состояние, accessibility и пользовательские
  `onPressIn/onPressOut`.
- Не добавлять `delayPressIn`, timer или ожидание animation completion перед route.

## Contract / проверка

- Source contract фиксирует visual-before-haptic для всех общих press-примитивов.
- Контракт запрещает ненулевой press delay в shared primitives.
- Focused tests подтверждают порядок и отсутствие регрессии callbacks.
