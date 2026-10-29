# Утверждённая сцена 29.10: патч для Пика (файлы Codex) и геометрия света Диалогов

Автор: сессия «4 · ТЕМЫ». Адресаты: Codex (файлы Пика), Ревизор. Источник цвета — `components/scene/scene_palette.ts`
(`scenePalette(themeId, appearance, screen, W, H, opts)`), порт `docs/design/v2-app/scene-approved.js` (Макеты, 4b3e5eea9).
Экраны на функцию **ещё не переведены** — ждём зелёный `tests/scene_palette_parity.test.ts`. Ниже — что менять, когда он зелёный.

## 1. Пик — что менять в файлах, занятых Codex

В `git status` грязные: `components/spire/scene/SpireScene.tsx`, `components/spire/scene/SpireScenePedestal.tsx` (и `SpireHomeScreen.tsx`).
Я их не трогаю. Файлы Пика, **чистые** (их перевожу сама): `spire_scene_backdrop.tsx`, `spire_scene_backdrop_math.ts`, `useSpireScene.ts`.

### 1.1 Как сейчас

`SpireScene.tsx` (HEAD, ~строка 111) берёт цвета у Главной: `homeSceneTokensForTheme(themeId, appearance, evening)` → `tokens.sceneTop / sceneBottom / sceneGlow`, и собирает
`backdrop = { top, bottom, glow, evening, bleed, sceneH }` (~строка 149) для `SpireSceneBackdrop`. Плоский градиент «верх → низ» и один свет не могут
изобразить «Глубокое небо» (шесть остановок по вертикали, дымка, звёзды, виньетка), поэтому нужен второй вид спецификации.

### 1.2 Что должно стать (для Codex — внести в SpireScene.tsx после зелёного parity)

```diff
+import { scenePalette, SCENE_DP } from '../../scene/scene_palette';
 ...
   const tokens = useMemo(() => homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance, evening), [liquidGlassThemeId, liquidGlassAppearance, evening]);
+  // зачем (вердикт владельца 29.10): фон Пика — утверждённая сцена (тёмное «Глубокое небо», светлое «А»), считается одной функцией scenePalette
+  const { width: winW } = useWindowDimensions();
+  const approved = useMemo(
+    () => scenePalette(liquidGlassThemeId, liquidGlassAppearance, 'peak', Math.round(winW * PixelRatio.get()), Math.round((bleed + frame.sceneH) * PixelRatio.get()), { dp: PixelRatio.get() }),
+    [liquidGlassThemeId, liquidGlassAppearance, winW, bleed, frame.sceneH],
+  );
 ...
-  const backdrop = useMemo<SpireSceneBackdropSpec>(() => ({ top: tokens.sceneTop, bottom: tokens.sceneBottom, glow, evening, bleed, sceneH: frame.sceneH }), [...]);
+  const backdrop = useMemo<SpireSceneBackdropSpec>(() => ({ top: tokens.sceneTop, bottom: tokens.sceneBottom, glow, evening, bleed, sceneH: frame.sceneH, approved }), [tokens.sceneTop, tokens.sceneBottom, glow, evening, bleed, frame.sceneH, approved]);
```

Вечер (`evening`) владелец не выбирал — остаётся как сейчас (старый путь по `tokens`), поэтому при `evening === true` в `backdrop` кладём `approved: null`.
`SpireScenePedestal.tsx`: цвета пьедестала берутся из `themeColors` (`sceneTop/sceneBottom`); после перехода они должны браться из `approved`
(светлое: `approved.gradient.top/bottom`; тёмное: `approved.gradient.stops[0]` и `[5]`) — иначе пьедестал останется «Затмением» старой палитры.

### 1.3 Что в чистых файлах (делаю я, не Codex)

- `spire_scene_backdrop_math.ts`: в `SpireSceneBackdropSpec` добавляется необязательное поле `approved` (результат `scenePalette`); расчёт затемнения шапки
  (`spireTopShadeAlpha`) для тёмного «неба» берёт цвета из `approved.gradient`/`sun`/`haze`.
- `spire_scene_backdrop.tsx`: при `approved.mode === 'dark-sky'` рисует слои по порядку эталона: вертикальный градиент, солнце, дымка, звёзды
  (готовый список `approved.stars.list`, доли W/H), виньетка; при `light-A` — градиент `(.22,0)→(.78,1)`, два света, затемнение низа и страж из `approved`.
- Старые замки Пика (`tests/owner_lock_whole_top_2026_10_25.test.ts`, 41 текстовый сторож экрана) придётся обновлять вместе: «верх цельный» остаётся, меняются цвета.

## 2. Геометрия света: «Диалоги» сейчас против Главной (и против утверждённого)

| Что | Главная (HomeSceneStage), «как сейчас» | Диалоги (DialogsSceneBackdrop), «как сейчас» | Утверждено (scene-approved.js), все экраны |
| --- | --- | --- | --- |
| Линейный градиент | `top → bottom`, старт (.22, 0), конец (.78, 1) | `top → bottom`, старт (.42, 0), конец (.58, 1) (почти вертикаль) | светлое: старт (.22, 0), конец (.78, 1); тёмное: вертикаль 0 → 1 с шестью остановками |
| Свет 1 | эллипс в (18 %, 0 %), радиусы 70 % W × 50 % H, цвет свечения темы, альфа из токена | `bgGlow[0]`: (84 %, 14 %), радиусы 70 % × 46 % | светлое: (18 %, 0 %), 70 % × 50 %, `lightC`, альфа .85, fade .7; тёмное «солнце»: (18 %, 2 %), 62 % × 46 %, `lightC`, альфа .72 |
| Свет 2 | нет | `bgGlow[1]`: (8 %, 0 %), радиусы 60 % × 42 % | светлое: (86 %, 102 %), 80 % × 42 %, `light2C`, альфа .55, fade .7; тёмное: нет (есть дымка .62–.76 H и виньетка) |
| Свет 3 | нет | `bgGlow[2]` только в светлом: (50 %, 100 %), 80 % × 50 % | нет |
| Затемнение низа (светлое) | `.40` на 300 dp | `.34` на 60 % H (цвет `scrim` темы, не чёрный) | `.34` на 60 % H, **чёрный**, затем страж (для Диалогов в эталоне `0.34 / 649 px`) |
| Ореол за героем | нет | `accentGlow` вокруг героя (halo) | остаётся «как сейчас» (владелец не выбирал) |

Вывод: у Диалогов геометрия света **меняется на геометрию Главной** (света слева-сверху и справа-снизу вместо двух верхних углов и нижнего), цвета — из `scenePalette`.
Свечения из прозрачного чёрного нет: закрыто в `ac9573883` (слой с полностью прозрачным цветом не рисуется; для светлых `grad_*` свет брался из `accentGlow`) и снимается совсем
после перехода — слои строятся из `lightC / light2C`.

Открытое решение Макетов: светлые Диалоги становятся тёмной сценой, поэтому текст и кнопки на ней — как в тёмном оформлении
(надписи белые, «Начать» — белая плашка с тёмной надписью, микрофон — стекло 16 % белого с белым значком). Это правит `use_dialogs_scene_theme.ts` /
`dialogsSceneColors` (`text`, `secondary`, `cta`, `ctaInk`, `glass`, `track` для светлого берутся из тёмного набора) — делаю вместе с переводом Диалогов.
