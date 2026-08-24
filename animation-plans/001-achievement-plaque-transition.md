# 001 — Связать смену награды с музейной плашкой

- **Status**: DONE
- **Commit**: fe1b40492
- **Severity**: MEDIUM
- **Category**: Missed opportunities / Cohesion & tokens
- **Estimated scope**: 2 files, small

## Problem

На `components/achievements/AchievementShelfCarousel.tsx:285` содержимое плашки
меняется мгновенно при завершении горизонтального скролла:

```tsx
{renderDetail(selectedItem)}
```

Награда физически приезжает под центр полки, а её подпись телепортируется. Связь
между объектом и описанием теряется.

## Target

При смене `selectedId` плашка один раз проявляется через opacity `0 → 1` и
`translateY 6 → 0` за `ACHIEVEMENT_SHELF_HYBRID.detailFadeMs` с
`Easing.out(Easing.cubic)`. Анимируются только transform/opacity. При Reduce
Motion геометрия и opacity сразу переходят в конечное состояние, как требует
локальный контракт Motion Hybrid.

## Repo conventions to follow

- Все числа находятся в `constants/motionHybrid.ts`.
- Очистка через `cancelAnimation`, как у `reflectionProgress` в том же компоненте.
- Reduce Motion берётся из существующего `useReduceMotion()`.

## Steps

1. Добавить `detailTranslateY: 6` в `ACHIEVEMENT_SHELF_HYBRID`.
2. Добавить shared progress, effect с cleanup и animated style в карусель.
3. Обернуть существующий Pressable плашки в `Reanimated.View`, не меняя её tap-flow.
4. Обновить узкий source-contract test.

## Boundaries

- Не добавлять таймер, loop, ambient breathing или bounce.
- Не менять механику выбора и горизонтальный scroll.
- Не добавлять зависимости и `runOnJS`.

## Verification

- **Mechanical**: transpile двух TS-файлов; source guard подтверждает токены,
  cleanup и отсутствие `withRepeat`/`runOnJS`.
- **Feel check**: награда доезжает, затем её подпись тихо проявляется снизу на 6px;
  быстрый повторный скролл ретаргетит текущую анимацию без накопления.
- **Done when**: смена подписи перестала телепортироваться и Reduce Motion не
  двигает её по вертикали.
