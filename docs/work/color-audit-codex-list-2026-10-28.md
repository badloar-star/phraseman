# Список правок цвета для Codex (4 · Темы, 28.10.2026)

Файлы, в которых есть литералы цвета вне токенов темы и **чужие незакоммиченные правки** — я их не трогал. Правило владельца: **каждый цвет — оттенок текущей темы**; счёт защищает `tests/color_literal_census_ratchet.test.mjs` (число литералов в файле не растёт; снизили — `node tests/color_literal_census_ratchet.test.mjs --update`).

Свежая перепись: 760 литералов в 18 файлах; из них в файлах с чужими правками — **194 в 10**.

## Что сделать по файлам

| Файл | Литералов | Строки (первые) | Что это | Чем заменить |
|---|---|---|---|---|
| `app/paywall_copy.ts` | 80 | 48, 51, 52, 53, 54, 55 | значение цвета | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной · `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| `components/CleanOnboarding.tsx` | 63 | 1442, 1457, 1458, 1727, 1728, 1735 | заливка значка, линия/значок, текст или значок | `g.scrim` / `g.mediaScrim` (на медиа) · `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| `app/_layout.tsx` | 11 | 634, 636, 637, 638, 847, 4095 | значение цвета, градиент, текст или значок | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) · `semanticInk(g).badText` (текст) / `g.bad` (значок) |
| `components/packs/CommunityScene.tsx` | 10 | 69, 193, 202, 210 | градиент, текст или значок, заливка | `g.scrim` / `g.scrimStrong` (или theme-exempt: затемнение) · `g.bevelHi` |
| `components/packs/CommunityAwardDecoration.tsx` | 7 | 22, 43 | градиент | `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной · `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) |
| `components/packs/CommunityWinnerDialog.tsx` | 7 | 62, 75, 78 | градиент, заливка | `g.accentTextSafe` (текст) / `g.accentGraphic` (значок) / `g.accentSoft` (заливка) · `g.warnSoft` (подложка) / `g.warn` (текст); золото-валюта — theme-exempt с причиной |
| `app/community_packs/CommunityPackSocialBar.tsx` | 6 | 561, 562, 566 | заливка, текст или значок | `g.bevelHi` · `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) |
| `components/packs/CommunityPackScene.tsx` | 5 | 36, 55, 56, 57 | текст или значок, заливка | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) · `g.bevelHi` |
| `app/flashcards_packs.tsx` | 3 | 439 | заливка | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) · `g.bevelHi` |
| `components/packs/CommunityPackCheckScene.tsx` | 2 | 43 | текст или значок | `g.mediaInk` (на медиа и акцентных заливках) / `g.ctaFillInk` (на кнопке) · `semanticInk(g).badText` (текст) / `g.bad` (значок) |

## `components/CleanOnboarding.tsx` (63 литерала) — по решению владельца: цвета ТЕМЫ ПО УМОЛЧАНИЮ

Онбординг «ага» уже переведён (`components/onboarding_aha/aha_theme.ts` → `ahaThemeFor`, хук `useAhaTheme()` в `use_aha_theme.ts`). Его палитра была копией палитры `CleanOnboarding.tsx` («инлайн-палитра Полночь»), поэтому имена ключей совпадают — можно взять **ту же палитру**:

1. В `CleanOnboarding.tsx` подключить `const T = useAhaTheme();` (импорт из `./onboarding_aha/use_aha_theme`) и `ahaStylesCache` для стилей уровня модуля (`const makeStyles = ahaStylesCache((T: AhaTheme) => StyleSheet.create({...}))`; в компоненте `const styles = makeStyles(T)`).
2. Соответствие: фон экрана `T.bgGradient`; кнопка `T.ctaGradient` (подпись `T.ctaTextColor`, выключенная `T.ctaDisabled`); акцент/прогресс `T.accentGradient`; текст `T.textPrimary` / `T.textSecondary` / `T.textMuted`; плашки и чипы `T.cardBg` / `T.chipBg` и их `*Border`; выбранный чип `T.chipSelectedBg` / `T.chipSelectedBorder`; блики фона `T.blobBlue` / `T.blobViolet`; виньетка `T.vignette*`.
3. После выбора темы всё перекрасится само (хук берёт `useTheme()`); до выбора — стандартная тема (светлые «Сумерки», замок 24.10).
4. Убрать файл из `ALLOWED` и `MUST_DECLARE` в `tests/onboarding_pre_theme_palette_exemption.test.mjs`; страж палитры — `tests/onboarding_aha_theme_palette.test.ts` (добавить в его проверку литералов путь `components/CleanOnboarding.tsx`).

## Остальные файлы с литералами (свободные, ждут решения или удаления)

| Файл | Литералов | Решение |
|---|---|---|
| `components/paywallThemeConfig.ts` | 210 | Plus: таблица пейвола по прежнему режиму — снять при Пейволе М (зона Codex) |
| `components/medalToastThemeStyles.ts` | 177 | таблица нужна только пропу themeMode витрины и двум контрактным тестам — удалить вместе с ними |
| `app/learning-v2/session/[id].tsx` | 106 | старый экран занятия — удалить после выхода OTA |
| `components/ui/v2_theme.ts` | 56 | токены удалённых «Турниров» — удалять кластером components/ui вместе с режимом sound_contrast |
| `app/(tabs)/home.tsx` | 7 | окно званий: золотистые подложки → g.warnSoft; Главная — по запрету владельца не трогать без слова координатора |
| `app/flashcards/cardStatus.ts` | 5 | цвета статусов закреплены тестом flashcard_card_status (хендофф §4.3) — решение Макетов |
| `app/flashcards/trainingSources.ts` | 4 | SOURCE_ACCENTS — акценты источников; решение вместе со статусами |
| `components/home/HomeMistakesLockedSheet.tsx` | 1 | мёртвый файл (нет импортёров), в awaiting баз движения — удалить вместе с записью |
