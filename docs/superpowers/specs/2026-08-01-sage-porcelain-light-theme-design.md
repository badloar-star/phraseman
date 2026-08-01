# «Фарфоровый шалфей»: дизайн светлой темы Phraseman

Дата: 2026-08-01

Статус: визуальное направление утверждено владельцем

Внутренний идентификатор: `sagePorcelain`

Пользовательское имя: `Фарфоровый шалфей`

## 1. Цель

Добавить в Phraseman одну полноценную светлую тему, которая:

- комфортна для длительного обучения и не воспринимается ослепляюще белой;
- сохраняет чёткую глубину между фоном, карточками и вложенными поверхностями;
- выглядит спокойно, современно и достаточно премиально;
- не превращает весь экран в однотонную серо-зелёную массу;
- обеспечивает WCAG AA для активного текста и значимых элементов интерфейса;
- масштабируется на существующие экраны и тематические assets без случайных локальных цветов.

Тема не заменяет и не удаляет существующие темы или поведение. Она добавляется отдельным вариантом.

## 2. Контекст и исследовательские выводы

В приложении уже были неудачные светлые направления:

- `businessLight` оставлен только для совместимости и удалён из выбора;
- `vanilla` потребовал отдельного исправления фонов, плашек, границ, градиентов и swatches в коммите `2739ed167`, а затем был полностью удалён коммитом `cfaeb568c`;
- `ocean` и `sakura` были гибридными темами с тёмным экранным фоном, а не полноценными светлыми режимами, и мигрируются на другую тему.

Из этой истории следует: подобрать несколько приятных hex недостаточно. Светлая тема должна иметь фиксированные роли поверхности, текста, состояния и глубины, а не исправляться по одному экрану.

Внешние опорные принципы:

- обычный текст должен иметь контраст не ниже 4.5:1, крупный текст и значимые UI-границы — не ниже 3:1: [WCAG 2.2, Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), [Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html);
- цвет следует применять экономно, сохраняя его прежде всего для действий и состояний: [Apple HIG — Color](https://developer.apple.com/design/human-interface-guidelines/color);
- визуальная иерархия светлой темы строится нейтральными поверхностями, а brand/shared colors имеют отдельные функции: [Fluent 2 — Color](https://fluent2.microsoft.design/color);
- устойчивые сочетания строятся прежде всего на разнице светлоты, а не только оттенка: [Google — Designing with accessible colors](https://codelabs.developers.google.com/color-contrast-accessibility).

## 3. Утверждённое визуальное направление

Владелец сравнил три исходных направления и три гибрида на одинаковых макетах. Выбран вариант B — `Фарфоровый шалфей`.

Характер темы:

- нейтрально-тёплый, но не жёлтый фон;
- почти белые карточки вместо чисто-белого полноэкранного полотна;
- глубокий шалфейный CTA;
- очень тёмный зелёно-графитовый текст;
- отдельные приглушённые семейства для success, error, info и reward;
- мягкие холодно-зелёные тени вместо тяжёлых чёрных теней тёмных тем;
- насыщенный цвет занимает ориентировочно 8–12% видимой площади.

Тема не является плоской `businessLight`: карточки сохраняют мягкую глубину, тонкий border и очень лёгкую тень.

## 4. Foundation-палитры

Foundation-оттенки не используются компонентами напрямую. Компоненты получают только семантические токены из раздела 5.

### 4.1 Тёплые нейтрали

| Тон | Hex |
|---:|:---|
| 25 | `#FCFDF9` |
| 50 | `#F7F8F4` |
| 100 | `#F0F1EC` |
| 200 | `#E7EAE3` |
| 300 | `#E1E5DC` |
| 400 | `#D1D9D1` |
| 500 | `#B9C3BA` |
| 600 | `#96A49C` |
| 700 | `#697871` |
| 900 | `#3F4D47` |
| 950 | `#17201D` |

### 4.2 Шалфейный brand

| Тон | Hex |
|---:|:---|
| 25 | `#F5FAF7` |
| 50 | `#EDF6F1` |
| 100 | `#E2F0E9` |
| 200 | `#D9E9E1` |
| 300 | `#B7D8C8` |
| 400 | `#8FC0AA` |
| 500 | `#669F86` |
| 600 | `#4B806B` |
| 700 | `#315F50` |
| 900 | `#223F37` |
| 950 | `#0E1B17` |

### 4.3 Success

`#F3F9F5`, `#EAF4ED`, `#DCEADF`, `#C5DFC8`, `#9FCBA8`, `#70AE80`, `#4C9165`, `#2F6F4F`, `#285B42`, `#1E3D2F`, `#10241A`.

### 4.4 Error

`#FCF7F7`, `#FBF2F2`, `#F2DFE0`, `#E7C3C5`, `#D69CA1`, `#C37178`, `#A8464D`, `#963A42`, `#7D3038`, `#58272C`, `#301214`.

### 4.5 Info

`#F5F9FA`, `#F0F6F8`, `#DDEBF0`, `#BDD8E1`, `#91BCCD`, `#639DB4`, `#477F97`, `#37677D`, `#2E5366`, `#243B47`, `#15252D`.

### 4.6 Reward

`#FDFBF6`, `#FBF7ED`, `#EEE5D1`, `#E2D1A9`, `#D1B777`, `#B99748`, `#9D7A2E`, `#8B6320`, `#6F4B1C`, `#4E331C`, `#2C1A0D`.

## 5. Семантический контракт

### 5.1 Маппинг на существующий `Theme`

| Поле | Значение | Назначение |
|---|---|---|
| `bgPrimary` | `#F0F1EC` | основной фон экрана |
| `bgCard` | `#FCFDF9` | карточки, листы, модалы |
| `bgSurface` | `#E1E5DC` | вложенные блоки, secondary containers |
| `bgSurface2` | `#D1D9D1` | tracks, pressed и более глубокие поверхности |
| `textPrimary` | `#17201D` | заголовки и body |
| `textOnCard` | `#17201D` | основной текст карточек |
| `textSecond` | `#3C5A50` | акцентный вторичный текст |
| `textMuted` | `#52605A` | подписи и метаданные |
| `textGhost` | `#61706A` | третичный активный текст; не использовать старый макетный `#7B8882` для малого текста |
| `heroTextPrimary` | `#17201D` | текст светлого hero/header |
| `heroTextMuted` | `#52605A` | muted-текст светлого hero/header |
| `border` | `#CFD6CE` | обычная структурная граница |
| `borderLight` | `#BDC8BD` | усиленная граница |
| `correct` | `#2F6F4F` | success fill и индикатор |
| `correctBg` | `#DCEADF` | success wash |
| `wrong` | `#A8464D` | error fill и индикатор |
| `wrongBg` | `#F2DFE0` | error wash |
| `gold` | `#8B6320` | XP, серии и reward mark |
| `goldBg` | `#EEE5D1` | reward wash |
| `textOnGold` | `#FFFFFF` | текст на тёмно-бронзовом `gold` |
| `accent` | `#315F50` | primary CTA, active navigation, progress |
| `accentBg` | `#D9E9E1` | selected/active wash |
| `correctText` | `#FFFFFF` | текст на `accent` и `correct` |
| `shadowDark` | `rgba(35,50,43,0.14)` | максимальная тема-тень |
| `shadowLight` | `rgba(255,255,255,0.82)` | верхний мягкий блик |
| `borderHighlight` | `rgba(255,255,255,0.82)` | светлая кромка |
| `isGlowEnabled` | `false` | светящейся ауры нет |
| `isGlossEnabled` | `false` | glossy overlay нет |
| `btnShadow` | `#1F4237` | нижняя кромка основной кнопки |
| `cardShadow` | `rgba(35,50,43,0.10)` | тень карточек |
| `glow` | `rgba(49,95,80,0.10)` | редкий декоративный wash, не свечение |
| `cardGradient` | `['#FFFFFF', '#F5F7F2']` | почти незаметная глубина карточки |
| `bgGradient` | `['#F7F8F4', '#F0F1EC', '#E7EAE3']` | очень мягкий фон сверху вниз |

### 5.2 Дополнительные роли

Существующий `Theme` не содержит отдельных `info` и state-variant полей. На первом этапе они должны жить в небольшом theme-aware helper рядом с прочими chrome helpers, не расширяя глобальный контракт без необходимости:

| Роль | Значение |
|---|---|
| `accentHover` | `#294E43` |
| `accentPressed` | `#223F37` |
| `focusRing` | `#8FC0AA` |
| `info` | `#2E5366` |
| `infoBg` | `#DDEBF0` |
| `disabledBg` | `#D1D9D1` |
| `disabledText` | `#61706A` |

Не следует добавлять десятки новых обязательных полей ко всем существующим темам только ради одного light mode.

## 6. Контрастный бюджет

| Пара | Контраст | Требование |
|---|---:|---|
| `textPrimary` / `bgPrimary` | 14.67:1 | pass AAA |
| `textPrimary` / `bgCard` | 16.31:1 | pass AAA |
| `textSecond` / `bgPrimary` | 6.68:1 | pass AA |
| `textMuted` / `bgPrimary` | 5.82:1 | pass AA |
| `textGhost` / `bgPrimary` | 4.59:1 | pass AA |
| `#FFFFFF` / `accent` | 7.28:1 | pass AAA |
| `#FFFFFF` / `correct` | 5.99:1 | pass AA |
| `#FFFFFF` / `wrong` | 5.76:1 | pass AA |
| `#FFFFFF` / `info` | 8.25:1 | pass AAA |
| `#FFFFFF` / `gold` | 5.38:1 | pass AA |
| `#6F4B1C` / `goldBg` | 6.21:1 | pass AA |
| `accent` / `accentBg` | 5.79:1 | pass AA |
| `wrong` / `wrongBg` | 4.50:1 | pass AA |

Границы низкого приоритета могут быть тоньше 3:1, если геометрия карточки также обозначена фоном и тенью. Граница выбранного, focused или ошибочного состояния обязана иметь 3:1 и дополнительный нецветовой сигнал.

## 7. Глубина и тени

Текущая общая ветка `getVolumetricShadow()` использует тяжёлую чёрную тень и не подходит новой светлой теме. Для `sagePorcelain` требуется отдельная ветка без изменения тёмных тем:

| Уровень | Offset Y | Opacity | Radius | Elevation |
|---:|---:|---:|---:|---:|
| 1 | 2 | 0.06 | 6 | 2 |
| 2 | 4 | 0.10 | 12 | 4 |
| 3 | 8 | 0.14 | 20 | 7 |

Цвет тени: `#23322B`. Карточка не должна одновременно иметь сильную тень, сильную границу и контрастный gradient — максимум два сигнала глубины.

## 8. Компонентные правила

### Primary action

- default: `accent` + `#FFFFFF`;
- pressed: `accentPressed` + `#FFFFFF`;
- нижняя кромка: `btnShadow`, 3 px;
- disabled: `disabledBg` + `disabledText`; disabled-состояние дополнительно обозначается отсутствием elevation и недоступностью действия.

### Secondary action

- фон `accentBg`;
- текст и иконка `accentPressed`;
- граница `#B7D8C8`.

### Selection

- фон `accentBg`;
- граница 2 px `accent`;
- выбранность дополнительно выражается толщиной границы, checkmark или текстом.

### Success, error, info, reward

- каждый статус использует отдельные foreground/background пары;
- статус всегда содержит текст или символ, цвет не является единственным сигналом;
- reward bronze не заменяет success green.

### Навигация

- активный элемент: `accent` плюс существующий active indicator;
- неактивные подписи: не светлее `textGhost`;
- tab bar: `bgCard`, `border`, лёгкая тень уровня 1.

## 9. Системное поведение темы

- `isDark` для `sagePorcelain` должен быть `false`.
- `statusBarLight` должен быть `false`, чтобы системные status-bar icons были тёмными.
- Текущий код `const isDark = true; const statusBarLight = isDark;` требует theme-aware исправления.
- `ScreenGradient` не должен добавлять cinema bloom, чёрный underlay или тёмный hero для этой темы.
- Root Stack и root container получают постоянный `bgPrimary`, без readiness-dependent изменения.
- Тема не включает `isFlat`: применяется существующий масштаб интерфейса и типографика.
- Шрифт и размеры не меняются. Используется текущий `APP_FONT_FAMILY` и существующая шкала.

## 10. Доступ и позиция в picker

Принятое рабочее решение: `sagePorcelain` — бесплатная тема и второй базовый выбор рядом с бесплатной `indigo`.

Обоснование: это единственный полноценный светлый режим и выбор визуального комфорта, а не только косметический premium-скин.

В picker тема показывается сразу после `indigo`. Swatches:

1. `#FCFDF9`
2. `#315F50`
3. `#D1D9D1`

Picker обязан корректно отображать светлую карточку/preview и не принудительно подменять её общим тёмным row-gradient.

## 11. Assets и bundle hygiene

Добавление `sagePorcelain` в `ThemeMode` затрагивает статические theme maps. До генерации любых файлов нужен полный inventory всех карт `Record<ThemeMode, ...>` и тестов, читающих список тем из `ThemeMode`.

Правила:

- wire first, generate second;
- новый набор повторяет точный slot list установленной темы, без дополнительных speculative-вариантов;
- каждый новый bundled asset имеет статический `require()`;
- raw sources, contact sheets и промежуточные файлы не попадают в `assets/images/**`;
- финальные assets — WebP с разумной компрессией и сохранённой alpha;
- тёмные assets нельзя автоматически переиспользовать, если их края, тени или надписи теряются на светлом фоне;
- fallback разрешён только после визуальной проверки на светлом фоне и явного контракта;
- referral banner остаётся уникальным, потому что существующий тест запрещает byte-identical art между темами.

Минимально известные затрагиваемые зоны:

- `app/coin_icons.ts`;
- `app/home_menu_icons.ts`;
- `constants/generatedThemeIconAssets.ts`;
- `constants/socialIconAssets.ts`;
- `constants/streakIconAssets.ts`;
- `constants/trainerThemeIcons.ts`;
- `constants/weeklyCompassIcons.ts`;
- `constants/boonIconAssets.ts`;
- `components/ReferralInviteBannerArt.tsx`;
- другие карты, найденные точным поиском `ThemeMode` перед реализацией.

## 12. Performance и layout stability

- Тема не добавляет timers, subscriptions или новые animated loops.
- Переключение темы не должно вызывать пустой кадр, spinner или async layout jump.
- Все theme assets остаются статически разрешимыми и доступны до первого кадра.
- Фон Stack остаётся постоянным цветом выбранной темы на всём переходе.
- Добавление темы не ослабляет `freezeOnBlur`, snapshot hydration или layout-stability guards.

## 13. План визуальной QA

Обязательные representative screens:

1. Главная: hero, progress, cards, daily goal, bottom tabs.
2. Урок: вопрос, варианты, selected, correct, wrong, hint, CTA.
3. Настройки и picker темы.
4. Paywall и reward modal.
5. Friends/league со сложными цветными assets.
6. Flashcards и trainer.
7. Empty, loading, offline и disabled states.
8. Большой системный шрифт и Increase Contrast.

Проверка проводится минимум на 375 px и крупном iPhone/Android viewport. Светлый режим нельзя принимать только по palette swatches.

## 14. Acceptance criteria

- `sagePorcelain` присутствует в `ThemeMode`, `THEME_MAP`, picker и persistence/migration validation.
- Тема доступна бесплатно и не попадает в `PREMIUM_ONLY_THEMES`.
- `isDark === false`, `statusBarLight === false`.
- Все поля существующего `Theme` заполнены значениями из раздела 5.1.
- Primary, muted, ghost, success, error, info и reward пары проходят установленные пороги контраста.
- На representative screens нет белого текста на ярком салатовом/неоново-зелёном фоне.
- Фон, карточка и вложенная поверхность визуально различимы без декоративного цветного шума.
- Новая тема не меняет внешний вид существующих тем.
- Все обязательные theme maps покрывают `sagePorcelain`.
- Каждый новый bundled asset имеет статический `require()`, существует, является валидным WebP и используется runtime-кодом.
- Нет mid-frame background change, blank first frame или layout jump при старте/переключении.
- Узкие theme/contrast/asset/performance guards проходят без изменения тестов ради сокрытия регрессии.

## 15. Не входит в эту работу

- редизайн геометрии экранов;
- новая типографика;
- удаление или переименование существующих тем;
- изменение premium-entitlements других тем;
- массовая генерация assets до утверждённого inventory;
- изменение админки;
- тёмная пара для `sagePorcelain`.

## 16. Рекомендуемая последовательность реализации

1. Inventory theme-aware кода и asset slots.
2. Контрактные тесты для palette, access, status bar и asset coverage.
3. Добавление core palette и ThemeContext wiring.
4. Light-aware background, shadow и picker chrome.
5. Theme-specific helper roles (`info`, focus, pressed).
6. Wire всех asset slots.
7. Создание только необходимых light-compatible assets.
8. Узкая автоматическая проверка.
9. Screenshot QA representative screens.
10. Финальная проверка отсутствия unused assets и регрессий существующих тем.
