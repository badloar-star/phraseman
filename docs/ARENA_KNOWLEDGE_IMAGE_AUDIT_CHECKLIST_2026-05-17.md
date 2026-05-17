# Arena Knowledge Image Audit Checklist

Дата: 2026-05-17

## Цель

Подготовить интеграцию фоновой иллюстрации "арена знаний в древней библиотеке" так, чтобы она выглядела частью приложения, а не отдельным fantasy-постером. На этом этапе код не менялся: это аудит текущего UI, research по месту внедрения и чеклист для следующего шага.

## Быстрый вывод

Рекомендуемый вариант: сделать иллюстрацию не полноэкранным фоном вкладки, а "сценой" внутри текущей arena action-card на `app/arena_lobby.tsx`. Карточка уже является главным фокусом экрана, поддерживает темы, GoldBevel, gradients, CTA и существующую motion-систему. Иллюстрация должна быть приглушённым premium background-layer с затемнением, theme tint и короткой entrance-анимацией.

## Найдено в коде

- Entry point вкладки: `app/(tabs)/arena.tsx` просто рендерит `DuelLobbyScreen isTab`.
- Основной экран: `app/arena_lobby.tsx`.
- Экран уже использует `ScreenGradient`, `LinearGradient`, `Animated`, `Easing`, `Ionicons`, `GoldBevel`, `GOLD_GRADIENTS`, `GOLD_RICH`, `goldShadow`.
- В `app/arena_lobby.tsx` включён `USE_ELITE_ARENA_LOBBY = true`.
- На idle-состоянии главный UI-блок: `styles.arenaStageCard` с `arenaStageTop`, status/mode pills, CTA `arenaLaunchGradient`, cost row и secondary flows.
- На searching-состоянии уже есть "elite radar" с пульсом и sweep-анимацией. Новая иллюстрация не должна конфликтовать с этим режимом.
- Общие темы: `dark`, `neon`, `gold`, `coral`, `minimalLight`, `minimalDark` в `constants/theme.ts`.
- Gold тема вынесена отдельно в `constants/goldTheme.ts`: black/graphite base, champagne/metal gold accents, тонкие hairline-рамки.
- Motion-константы: `constants/motion.ts` (`fast: 180`, `normal: 240`, `slow: 320`, `celebrate: 420`) и мягкие scale-пики. Для картинки лучше использовать transform/opacity с native driver.
- В проекте уже есть `expo-image`, но в arena lobby сейчас используется `Image` из `react-native`. Для локального asset-layer можно оставить RN `Animated.Image`; если понадобится cache/transition/contentFit, можно перейти на `expo-image`.
- Существующие arena assets в основном иконки/ранги/achievements, а не широкая фоновая сцена.

## Риски

- Слишком детальная картинка забьёт CTA и мелкий текст, особенно на маленьких Android.
- Один asset может плохо лечь на все темы. Безопаснее: нейтральная тёмная сцена + программный overlay под тему.
- Большой PNG увеличит bundle и может просадить первый заход в арену. Нужен `.webp`, разумный размер и сжатие.
- Blur-анимация в React Native может быть нестабильной/дорогой. Лучше делать эффект через scale + opacity + затемняющий overlay.
- Если положить картинку на весь экран, она начнёт спорить с `ScreenGradient`, орбами/GoldFabricFlow и текущей визуальной системой.
- В рабочем дереве много уже изменённых файлов, поэтому следующий патч должен быть узким и не затрагивать чужие изменения.

## Creative Brief

Иллюстрация должна быть:

- UI-background, не poster/key art.
- Композиция: круг учеников/магов/знатоков в мантиях, древняя библиотека, светящийся центр, книги/руны/арена на полу.
- Центр и нижняя треть должны иметь достаточно спокойного пространства под CTA и текст.
- Без читаемого текста, логотипов, случайных букв и современных предметов.
- Контраст: края затемнены, главный свет в центре/верхней половине.
- Палитра base: graphite/black/forest shadows + champagne gold; допустим лёгкий green accent для default/dark темы.
- Не использовать фиолетово-синюю fantasy-палитру как доминанту.

## Prompt Draft

Основной промпт:

```text
Premium mobile app background illustration for an "Arena of Knowledge" screen, ancient grand library interior, robed scholars standing in a circle as if competing in an intellectual duel, glowing circular floor sigil, floating books and subtle runes, warm candlelight and champagne gold highlights, deep graphite shadows, cinematic but calm, UI-friendly composition, darkened edges, softer lower third for buttons and text, no readable text, no logos, no modern objects, high detail but not cluttered, fantasy realism, 16:9
```

Negative / уточнения:

```text
No poster typography, no large faces in foreground, no neon purple dominance, no busy lower third, no horror mood, no weapons focus, no readable letters, no UI elements inside the image.
```

Gold-тема вариант:

```text
black gold luxury mobile app background, obsidian library, champagne gold magical light, restrained premium contrast, thin golden rim light, dark vignette, UI-safe lower area
```

Default/dark вариант:

```text
deep forest green shadows, soft emerald glow only as accent, warm library candles, readable dark edges, UI-safe composition
```

## Recommended Integration

1. Добавить asset:
   - `assets/images/arena/knowledge-arena-hero.webp`
   - target: 1280x720 или 1536x864, `.webp`, ориентир до 300-500 KB.

2. В `app/arena_lobby.tsx` добавить статический require рядом с imports:
   - `const ARENA_KNOWLEDGE_HERO = require('../assets/images/arena/knowledge-arena-hero.webp');`

3. Внутри `arenaStageCard` добавить абсолютный background-layer:
   - `Animated.Image` / `Animated.View`
   - `StyleSheet.absoluteFillObject`
   - `resizeMode="cover"`
   - `opacity` около `0.22-0.38` в зависимости от темы.

4. Поверх картинки добавить 2 overlay слоя:
   - общий dark overlay: `rgba(0,0,0,0.38-0.58)`
   - theme tint/gradient: Gold -> `GOLD_RICH.wash`, Dark -> `t.accent` с малой opacity.

5. Entrance animation:
   - initial scale `1.10-1.14`
   - to scale `1`
   - opacity `0 -> target`
   - optional translateY `8 -> 0`
   - duration `420-560ms`
   - easing `Easing.out(Easing.cubic)`
   - `useNativeDriver: true`

6. Replay policy:
   - играть при первом focus/первом mount idle lobby.
   - не перезапускать бесконечно при изменении очереди/таймера.
   - при searching можно либо скрыть image-layer, либо оставлять очень слабым под радаром.

7. Layout:
   - у `arenaStageCard` сохранить стабильные размеры.
   - не менять header/body scroll rhythm без необходимости.
   - не класть карточку в карточку.

## QA Checklist

- [ ] Idle arena lobby: картинка видна как атмосфера, но CTA "Найти матч" остаётся главным.
- [ ] Searching state: radar и countdown не теряются на фоне.
- [ ] Gold theme: картинка выглядит black/gold, без coral/navy/purple ощущения.
- [ ] MinimalDark/MinimalLight: контраст текста и pills сохраняется.
- [ ] Dark/Neon/Coral: overlay не конфликтует с accent colors.
- [ ] RU/UK/ES/PT-BR/VI/ID/TR/PL: длинные строки не упираются в картинку и не теряют читаемость.
- [ ] Android small phone: нет обрезки CTA, нет скачка высоты карточки.
- [ ] Tablet/wide layout: картинка не выглядит растянутой или пустой.
- [ ] Asset size проверен, `.webp` не чрезмерный.
- [ ] Typecheck проходит: `npx tsc --noEmit --pretty false`.
- [ ] Arena contract/smoke по возможности: `npm run maestro:regression -- arena_lobby_contract` или существующий flow из `maestro/flows/regression/arena_lobby_contract.yaml`.

## Decision For Next Step

Самый безопасный next step: сначала сгенерировать 2-3 варианта одной сцены, выбрать самый спокойный UI-friendly вариант, сохранить как `.webp`, затем сделать маленький патч только в `app/arena_lobby.tsx` и `assets/images/arena/`.

## Implementation Note

Сделано 2026-05-17:

- Сгенерирована UI-friendly сцена древней библиотеки/арены знаний.
- Финальный asset сохранён в проект: `assets/images/arena/knowledge-arena-hero.webp`.
- PNG-оригинал оставлен в `$CODEX_HOME/generated_images/...`, рабочий asset конвертирован в WebP `1536x864`, около `104 KB`.
- В `app/arena_lobby.tsx` добавлен фоновый `Animated.Image` внутри idle `arenaStageCard`.
- Добавлен scrim/overlay по теме, чтобы CTA и текст оставались читаемыми.
- Добавлена entrance-анимация: картинка открывается с увеличенного масштаба и плавно садится в нормальный размер.
- `npx tsc --noEmit --pretty false` проходит без вывода.
- Metro уже был запущен на `localhost:8081`.

Theme-specific update:

- Добавлены отдельные theme assets:
  - `assets/images/arena/knowledge-arena-minimal-light.webp`
  - `assets/images/arena/knowledge-arena-minimal-dark.webp`
  - `assets/images/arena/knowledge-arena-dark.webp`
  - `assets/images/arena/knowledge-arena-neon.webp`
  - `assets/images/arena/knowledge-arena-coral.webp`
  - `assets/images/arena/knowledge-arena-gold.webp`
- В `app/(tabs)/_layout.tsx` общий arena backdrop теперь выбирается по `themeMode`.
- В `app/arena_lobby.tsx` картинка внутри idle-card тоже выбирается по `themeMode`.
- `npx tsc --noEmit --pretty false` проходит без вывода после theme mapping.
