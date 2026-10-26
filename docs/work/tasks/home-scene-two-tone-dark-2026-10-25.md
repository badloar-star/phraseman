# Главная: двухоттеночный градиент сцены в тёмных темах (+35°)

Governance-ID: TG-C0C7377524C0

## Outcome
Владелец 25.10 по макету dark-themes-scene.html: «только главную, а остальные места не меняем (тёмный дизайн)»; сила сдвига +35° (рекомендованная). Сцена Главной в тёмных темах — два соседних оттенка темы (низ глубокий, верх светлее со сдвигом 35°), без пятна света; белый ≥ 4,5. Сезон и Пик — как есть.

## Scope
In scope: `components/home/v2/scene/home_scene_two_tone.ts` (новый чистый модуль), `components/home/v2/scene/HomeScene.tsx` (useHomeSceneStageTokens), `tests/home_scene_two_tone.test.ts`, строка замка владельца.
Out of scope: homeSceneTokensForTheme (им рисуются Пик, «Сегодня», кольца карточки), Сезон, Пик, светлое оформление, премиальные коллекции.

## Architecture
homeSceneTwoTone(themeId, appearance, base) переопределяет sceneTop/sceneBottom/sceneGlow/whiteContrastTop/seam только при dark и не премиальной теме. Оттенок — акцент темы уровня «Максимум» (у серых — оттенок прежнего верха); верх OKLCH(0,45; 0,12; h∓35°), низ OKLCH(0,20; 0,075; h), низ светлеет тем же оттенком до шва 1,34 к карточке (иначе низ сливается с карточками: 1,03–1,24). Полоса под часами берёт тот же sceneTop (setHomeSceneStatusTint) — верх цельный.

## Security and privacy
Не касается.

## Technical debt
Низ в коде светлее макета (L 0,33–0,40 вместо 0,20) ради шва; вечер оставляет свой тёплый свет.

## Verification
tests/home_scene_two_tone.test.ts, home_scene_theme_tokens, home_today_ring_tokens; снимок Сверки Главной в тёмных темах.

## Rollback
Откатить коммит.
