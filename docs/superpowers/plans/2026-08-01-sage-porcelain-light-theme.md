# «Фарфоровый шалфей» — план реализации светлой темы

> **Для Codex:** выполнять этот план через skill `executing-plans` либо `subagent-driven-development`, строго по одному коммиту на задачу. Не работать в текущем грязном worktree и не переносить в новую ветку чужие незакоммиченные изменения автоматически.

**Цель:** добавить в Phraseman одну бесплатную полноценную светлую тему `sagePorcelain`, совпадающую с утверждённым макетом, сохраняющую контраст WCAG AA и корректно работающую на всех тематизированных поверхностях и ассетах.

**Архитектура:** базовые семантические токены остаются в `constants/theme.ts`; чистые светлые chrome-роли и тени выносятся в небольшой модуль `constants/sagePorcelainChrome.ts`; `ThemeContext` отвечает за доступность, сохранение и системный light-mode. Все существующие `Record<ThemeMode, …>` получают явную запись новой темы. Для растровых слотов по умолчанию переиспользуются уже подключённые светлые `businessLight`-ассеты через статический `require()`, а уникальный новый WebP создаётся только для реферального баннера, потому что его контракт запрещает дубликаты.

**Стек:** React Native, Expo Router, TypeScript, Jest, AsyncStorage, `expo-linear-gradient`, `sharp`, встроенный Codex image generation только для одного уникального баннера.

**Утверждённый дизайн:** `docs/superpowers/specs/2026-08-01-sage-porcelain-light-theme-design.md`.

---

## Неподвижные решения

- Внутренний id: `sagePorcelain`.
- Название в RU: `Фарфоровый шалфей`.
- Тема бесплатная, идёт сразу после `indigo` в списке и цикле.
- Тема не становится темой по умолчанию: `DEFAULT_THEME_MODE` остаётся `indigo`.
- `isDark === false`, `statusBarLight === false` — то есть тёмные иконки status bar.
- `isFlat === false`: объём сохраняется, но тени светлые и спокойные.
- Существующие темы, экраны, функции и ассеты не удаляются.
- Никаких новых «про запас» изображений в `assets/images/**`.
- Новый реферальный баннер должен быть 900×300 WebP, сжатым и визуально/побайтово уникальным.

## Палитра, которая должна попасть в код

```ts
export const SAGE_PORCELAIN = {
  bgPrimary: '#F0F1EC',
  bgCard: '#FCFDF9',
  bgSurface: '#E1E5DC',
  bgSurface2: '#D1D9D1',
  textPrimary: '#17201D',
  textOnCard: '#17201D',
  textSecond: '#3C5A50',
  textMuted: '#52605A',
  textGhost: '#61706A',
  heroTextPrimary: '#17201D',
  heroTextMuted: '#52605A',
  border: '#CFD6CE',
  borderLight: '#BDC8BD',
  correct: '#2F6F4F',
  correctBg: '#DCEADF',
  wrong: '#A8464D',
  wrongBg: '#F2DFE0',
  gold: '#8B6320',
  goldBg: '#EEE5D1',
  textOnGold: '#FFFFFF',
  accent: '#315F50',
  accentBg: '#D9E9E1',
  correctText: '#FFFFFF',
  shadowDark: '#23322B',
  shadowLight: 'rgba(252,253,249,0.78)',
  borderHighlight: 'rgba(252,253,249,0.92)',
  isGlowEnabled: false,
  isGlossEnabled: false,
  btnShadow: '#264A3F',
  cardShadow: 'rgba(35,50,43,0.14)',
  glow: 'rgba(49,95,80,0.10)',
  cardGradient: ['#FCFDF9', '#F5F7F2'] as [string, string],
  bgGradient: ['#F7F8F4', '#E7EAE3'] as [string, string],
};
```

Минимальные контрастные пары:

| Пара | Ожидаемо |
|---|---:|
| `textPrimary / bgPrimary` | 14.67:1 |
| `textPrimary / bgCard` | 16.31:1 |
| `textSecond / bgPrimary` | 6.68:1 |
| `textMuted / bgPrimary` | 5.82:1 |
| `textGhost / bgPrimary` | 4.59:1 |
| `#FFFFFF / accent` | 7.28:1 |
| `#FFFFFF / correct` | 5.99:1 |
| `#FFFFFF / wrong` | 5.76:1 |
| `#FFFFFF / gold` | 5.38:1 |

---

### Задача 0: Изолировать реализацию и проверить пересечения

**Файлы:**

- Не изменять исходники в `C:\appsprojects\phraseman`.
- Новый worktree: `C:\appsprojects\phraseman\.worktrees\sage-porcelain-light-theme`.
- Ветка: `codex/sage-porcelain-light-theme`.

**Шаг 1: подтвердить чистую точку старта**

```powershell
git rev-parse --verify 3e00d9166
git check-ignore -q .worktrees
```

Ожидается: commit существует, `.worktrees` игнорируется.

**Шаг 2: создать отдельный worktree**

```powershell
git worktree add .worktrees/sage-porcelain-light-theme -b codex/sage-porcelain-light-theme 3e00d9166
```

**Шаг 3: сохранить список пересечений с грязным пользовательским worktree**

```powershell
$themeTargets = @(
  'constants/theme.ts',
  'components/ThemeContext.tsx',
  'app/settings_themes.tsx',
  'app/(tabs)/settings.tsx',
  'components/ScreenGradient.tsx',
  'components/AppArtBackdrop.tsx',
  'constants/screenBackground.ts',
  'components/ReferralInviteBannerArt.tsx'
)
git status --short -- $themeTargets | Set-Content -LiteralPath '.codex-tmp/sage-porcelain-user-overlaps.txt' -Encoding utf8
Get-Content -LiteralPath '.codex-tmp/sage-porcelain-user-overlaps.txt'
```

Ожидается: отчёт может быть непустым. Он информационный; никакой `checkout`, `reset`, stash или автоматическое копирование этих файлов не выполнять.

**Шаг 4: проверить новый worktree**

```powershell
git -C .worktrees/sage-porcelain-light-theme status --short
git -C .worktrees/sage-porcelain-light-theme branch --show-current
```

Ожидается: чистый статус, ветка `codex/sage-porcelain-light-theme`.

---

### Задача 1: Зафиксировать палитру и WCAG-контракты

**Файлы:**

- Создать: `tests/sage_porcelain_theme_contract.test.ts`
- Изменить: `constants/theme.ts`

**Шаг 1: написать падающий тест палитры**

Тест должен импортировать `SAGE_PORCELAIN`, `ThemeMode` и `isLightThemeMode`, проверять точные значения главных токенов и вычислять контраст самостоятельно:

```ts
import {
  SAGE_PORCELAIN,
  isLightThemeMode,
  type Theme,
  type ThemeMode,
} from '../constants/theme';

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const rgb = [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16));
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('sagePorcelain theme contract', () => {
  it('keeps the approved semantic palette', () => {
    expect(SAGE_PORCELAIN).toMatchObject({
      bgPrimary: '#F0F1EC',
      bgCard: '#FCFDF9',
      textPrimary: '#17201D',
      textMuted: '#52605A',
      textGhost: '#61706A',
      accent: '#315F50',
      correct: '#2F6F4F',
      wrong: '#A8464D',
      gold: '#8B6320',
    });
  });

  it.each([
    ['textPrimary/bgPrimary', '#17201D', '#F0F1EC'],
    ['textPrimary/bgCard', '#17201D', '#FCFDF9'],
    ['textSecond/bgPrimary', '#3C5A50', '#F0F1EC'],
    ['textMuted/bgPrimary', '#52605A', '#F0F1EC'],
    ['textGhost/bgPrimary', '#61706A', '#F0F1EC'],
    ['white/accent', '#FFFFFF', '#315F50'],
    ['white/correct', '#FFFFFF', '#2F6F4F'],
    ['white/wrong', '#FFFFFF', '#A8464D'],
    ['white/gold', '#FFFFFF', '#8B6320'],
  ])('%s passes 4.5:1', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('is a typed light theme mode', () => {
    const mode: ThemeMode = 'sagePorcelain';
    const theme: Theme = SAGE_PORCELAIN;
    expect(mode).toBe('sagePorcelain');
    expect(theme.bgCard).toBe('#FCFDF9');
    expect(isLightThemeMode(mode)).toBe(true);
    expect(isLightThemeMode('indigo')).toBe(false);
  });
});
```

**Шаг 2: запустить RED**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_theme_contract.test.ts --no-cache --runInBand
```

Ожидается: FAIL — экспорт и `ThemeMode` ещё не существуют.

**Шаг 3: добавить тему в `constants/theme.ts`**

- Добавить объект `SAGE_PORCELAIN` ровно из раздела «Палитра».
- Добавить `'sagePorcelain'` в `ThemeMode`.
- Добавить compile-time check:

```ts
const _checkSAGE_PORCELAIN: Theme = SAGE_PORCELAIN as any;

export function isLightThemeMode(mode: ThemeMode): boolean {
  return mode === 'sagePorcelain';
}
```

**Шаг 4: запустить GREEN**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_theme_contract.test.ts --no-cache --runInBand
```

Ожидается: PASS, 9 контрастных пар проходят.

**Шаг 5: коммит**

```powershell
git add constants/theme.ts tests/sage_porcelain_theme_contract.test.ts
git commit -m "feat(themes): add sage porcelain palette"
```

---

### Задача 2: Подключить тему к ThemeContext, хранению и системной схеме

**Файлы:**

- Создать: `constants/sagePorcelainChrome.ts`
- Создать: `tests/sage_porcelain_theme_context_contract.test.ts`
- Изменить: `components/ThemeContext.tsx`
- Изменить: `tests/theme_context_default.test.ts`

**Шаг 1: написать RED-тест публичной политики**

Тест должен проверить исходник `ThemeContext.tsx` и чистую функцию теней:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { sagePorcelainShadow } from '../constants/sagePorcelainChrome';

const source = fs.readFileSync(path.join(process.cwd(), 'components/ThemeContext.tsx'), 'utf8');

describe('sagePorcelain ThemeContext policy', () => {
  it('registers the theme as a free live choice after indigo', () => {
    expect(source).toContain('sagePorcelain: SAGE_PORCELAIN');
    expect(source).toMatch(/const CYCLE: ThemeMode\[\] = \['indigo', 'sagePorcelain'/);
    expect(source).not.toMatch(/PREMIUM_ONLY_THEMES[^;]*sagePorcelain/);
    expect(source).not.toMatch(/REMOVED_THEME_MODES[^;]*sagePorcelain/);
  });

  it('derives status bar mode from the light-theme helper', () => {
    expect(source).toContain('const isDark = !isLightThemeMode(themeMode)');
    expect(source).toContain('const statusBarLight = isDark');
  });

  it('uses quiet light shadows', () => {
    expect(sagePorcelainShadow(1)).toMatchObject({ shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 });
    expect(sagePorcelainShadow(2)).toMatchObject({ shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 });
    expect(sagePorcelainShadow(3)).toMatchObject({ shadowOpacity: 0.14, shadowRadius: 20, elevation: 7 });
  });
});
```

В `tests/theme_context_default.test.ts` заменить устаревшее ожидание Midnight на действующий контракт: default остаётся `indigo`, бесплатные темы — `indigo` и `sagePorcelain`, Midnight остаётся premium/grandfathered.

**Шаг 2: запустить RED**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_theme_context_contract.test.ts tests/theme_context_default.test.ts --no-cache --runInBand
```

Ожидается: FAIL — модуль теней и регистрация ещё отсутствуют.

**Шаг 3: добавить чистый модуль chrome-ролей**

```ts
export const SAGE_PORCELAIN_CHROME = {
  accentHover: '#294E43',
  accentPressed: '#223F37',
  focusRing: '#8FC0AA',
  info: '#2E5366',
  infoBg: '#DDEBF0',
  disabledBg: '#D1D9D1',
  disabledText: '#61706A',
} as const;

export function sagePorcelainShadow(level: 1 | 2 | 3) {
  return {
    shadowColor: '#23322B',
    shadowOffset: { width: 0, height: level === 1 ? 2 : level === 2 ? 4 : 8 },
    shadowOpacity: level === 1 ? 0.06 : level === 2 ? 0.10 : 0.14,
    shadowRadius: level === 1 ? 6 : level === 2 ? 12 : 20,
    elevation: level === 1 ? 2 : level === 2 ? 4 : 7,
  };
}
```

**Шаг 4: зарегистрировать тему в `ThemeContext.tsx`**

- Импортировать `SAGE_PORCELAIN`, `isLightThemeMode`, `sagePorcelainShadow`.
- Добавить `sagePorcelain: SAGE_PORCELAIN` в `THEME_MAP`.
- Сделать `CYCLE` начинающимся с `['indigo', 'sagePorcelain', ...]`.
- Не добавлять тему в `PREMIUM_ONLY_THEMES` и `REMOVED_THEME_MODES`.
- Добавить `migrated === 'sagePorcelain'` в проверку сохранённого режима.
- Оставить `DEFAULT_THEME_MODE = 'indigo'`.
- Оставить `isFlat` только для `business/businessLight`.
- Перед общим return в `getVolumetricShadow` добавить:

```ts
if (themeMode === 'sagePorcelain') return sagePorcelainShadow(level);
```

- Заменить захардкоженную тёмную схему:

```ts
const isDark = !isLightThemeMode(themeMode);
const statusBarLight = isDark;
```

**Шаг 5: запустить GREEN**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_theme_contract.test.ts tests/sage_porcelain_theme_context_contract.test.ts tests/theme_context_default.test.ts --no-cache --runInBand
```

Ожидается: PASS.

**Шаг 6: коммит**

```powershell
git add constants/sagePorcelainChrome.ts components/ThemeContext.tsx tests/sage_porcelain_theme_context_contract.test.ts tests/theme_context_default.test.ts
git commit -m "feat(themes): wire sage porcelain runtime"
```

---

### Задача 3: Сделать спокойный светлый фон без cinema bloom

**Файлы:**

- Создать: `tests/sage_porcelain_background_contract.test.ts`
- Изменить: `constants/screenBackground.ts`
- Изменить: `components/ScreenGradient.tsx`
- Изменить: `components/AppArtBackdrop.tsx`
- Изменить: `tests/app_art_backdrop_contract.test.ts`

**Шаг 1: написать RED-тест**

```ts
import { BG_GRADIENTS } from '../constants/screenBackground';

describe('sagePorcelain background', () => {
  it('uses the approved three-stop paper field', () => {
    expect(BG_GRADIENTS.sagePorcelain).toEqual(['#F7F8F4', '#F0F1EC', '#E7EAE3']);
  });

  it('does not mount cinema bloom or decorative orbs', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').join(process.cwd(), 'components/ScreenGradient.tsx'),
      'utf8',
    );
    expect(source).toContain("themeMode === 'sagePorcelain' ? null : themeMode");
    expect(source).toMatch(/sagePorcelain:\s*\[\]/);
    expect(source).toMatch(/bloomMode:\s*ThemeMode \| null/);
  });
});
```

`tests/app_art_backdrop_contract.test.ts` должен ожидать отдельные светлые scrim-наборы новой темы.

**Шаг 2: запустить RED**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_background_contract.test.ts tests/app_art_backdrop_contract.test.ts --no-cache --runInBand
```

Ожидается: FAIL — нет фоновой записи и nullable bloom.

**Шаг 3: добавить фоновые записи**

В `constants/screenBackground.ts`:

```ts
sagePorcelain: ['#F7F8F4', '#F0F1EC', '#E7EAE3'],
```

В `components/ScreenGradient.tsx`:

```ts
// exhaustive records
sagePorcelain: 1,
sagePorcelain: { bloomA: '#D9E9E1', bloomB: '#F0F1EC' },
sagePorcelain: [],

type ScreenBgLayer = {
  // existing fields
  bloomMode: ThemeMode | null;
};

const bloomMode = themeMode === 'sagePorcelain' ? null : themeMode;
```

Во всех местах, где `bloomMode` передаётся в `CinemaBloom`, оставить условный render; `null` должен полностью исключать слой, а не делать его белым.

В `components/AppArtBackdrop.tsx`:

```ts
sagePorcelain: [
  'rgba(252,253,249,0.50)',
  'rgba(240,241,236,0.26)',
  'rgba(252,253,249,0.72)',
],

sagePorcelain: [
  'rgba(252,253,249,0.52)',
  'rgba(49,95,80,0.03)',
  'rgba(49,95,80,0.02)',
  'rgba(252,253,249,0.46)',
],
```

**Шаг 4: запустить GREEN**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_background_contract.test.ts tests/app_art_backdrop_contract.test.ts --no-cache --runInBand
```

Ожидается: PASS.

**Шаг 5: коммит**

```powershell
git add constants/screenBackground.ts components/ScreenGradient.tsx components/AppArtBackdrop.tsx tests/sage_porcelain_background_contract.test.ts tests/app_art_backdrop_contract.test.ts
git commit -m "feat(themes): add porcelain light backgrounds"
```

---

### Задача 4: Добавить тему в выбор и локализации

**Файлы:**

- Создать: `tests/sage_porcelain_picker_contract.test.ts`
- Изменить: `app/settings_themes.tsx`
- Изменить: `app/(tabs)/settings.tsx`

**Шаг 1: написать RED-тест**

Контракт должен читать оба исходника и проверять:

```ts
expect(themePickerSource).toContain("mode: 'sagePorcelain'");
expect(themePickerSource).toContain("labelRU: 'Фарфоровый шалфей'");
expect(themePickerSource).toContain("colors: ['#FCFDF9', '#315F50', '#D1D9D1']");
expect(themePickerSource).toContain("item.mode === 'sagePorcelain'");
expect(themePickerSource.indexOf("mode: 'sagePorcelain'"))
  .toBeGreaterThan(themePickerSource.indexOf("mode: 'indigo'"));
expect(settingsSource).toContain("sagePorcelain: { ru: 'Фарфоровый шалфей'");
```

Также проверить, что option не содержит `premiumOnly: true`.

**Шаг 2: запустить RED**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_picker_contract.test.ts --no-cache --runInBand
```

Ожидается: FAIL.

**Шаг 3: добавить бесплатную option сразу после Indigo**

```ts
{
  mode: 'sagePorcelain',
  labelRU: 'Фарфоровый шалфей',
  labelUK: 'Порцелянова шавлія',
  labelES: 'Salvia porcelana',
  labelPtBr: 'Sálvia porcelana',
  labelVi: 'Xô thơm sứ',
  labelId: 'Sage porselen',
  labelTr: 'Porselen adaçayı',
  labelPl: 'Porcelanowa szałwia',
  colors: ['#FCFDF9', '#315F50', '#D1D9D1'],
  text: '#17201D',
},
```

**Шаг 4: добавить отдельный светлый row chrome**

В начале `themeRowColors` добавить ветку:

```ts
if (item.mode === 'sagePorcelain') {
  return {
    gradient: ['#FCFDF9', '#F0F1EC', '#E1E5DC'],
    shine: ['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.18)', 'rgba(49,95,80,0.03)'],
    textColor: '#17201D',
    mutedColor: '#52605A',
    activeIconColor: '#315F50',
    shadowColor: '#23322B',
    borderColor: active ? '#315F50' : '#BDC8BD',
    swatches: item.colors,
  };
}
```

У самой строки включить видимую тонкую границу только для `sagePorcelain`, поскольку на белой странице без неё карточка сольётся:

```ts
borderWidth: item.mode === 'sagePorcelain' ? 1 : 0,
```

**Шаг 5: добавить локализованное текущее название в Settings**

```ts
sagePorcelain: {
  ru: 'Фарфоровый шалфей',
  uk: 'Порцелянова шавлія',
  es: 'Salvia porcelana',
  'pt-BR': 'Sálvia porcelana',
  vi: 'Xô thơm sứ',
  id: 'Sage porselen',
  tr: 'Porselen adaçayı',
  pl: 'Porcelanowa szałwia',
},
```

**Шаг 6: запустить GREEN**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_picker_contract.test.ts tests/button_foreground_contrast.test.ts --no-cache --runInBand
```

Ожидается: PASS; кнопки не получают белый текст на ярком салатовом фоне.

**Шаг 7: коммит**

```powershell
git add app/settings_themes.tsx 'app/(tabs)/settings.tsx' tests/sage_porcelain_picker_contract.test.ts
git commit -m "feat(themes): expose sage porcelain picker"
```

---

### Задача 5: Протянуть светлый chrome на учебные и системные поверхности

**Файлы:**

- Создать: `tests/sage_porcelain_surface_chrome_contract.test.ts`
- Изменить:
  - `components/settings/settingsSurfaces.ts`
  - `app/(tabs)/settings.tsx`
  - `app/daily_phrase_chrome.ts`
  - `constants/themedToastChrome.ts`
  - `constants/weekDotTheme.ts`
  - `constants/statsThemeChrome.ts`
  - `components/medalToastThemeStyles.ts`

**Шаг 1: написать RED-контракт полноты**

Для каждого файла тест должен проверить наличие явного ключа `sagePorcelain:` и запретить fallback через `default`/`as any`. Дополнительно импортируемые функции должны вернуть:

- основной фон `#F0F1EC` или card `#FCFDF9`;
- border `#CFD6CE`/`#BDC8BD`;
- accent `#315F50`;
- основной текст `#17201D`;
- secondary/muted не светлее `#52605A`;
- success `#2F6F4F`, error `#A8464D`, reward `#8B6320`.

**Шаг 2: запустить RED**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_surface_chrome_contract.test.ts tests/stats_tonal_hierarchy_contract.test.ts --no-cache --runInBand
```

Ожидается: FAIL из-за отсутствующих exhaustive entries.

**Шаг 3: добавить entries по единой таблице**

| Роль | Значение |
|---|---|
| page / base | `#F0F1EC` |
| card / panel | `#FCFDF9` |
| quiet surface | `#E1E5DC` |
| selected / strong surface | `#D1D9D1` |
| border | `#CFD6CE` |
| strong border | `#BDC8BD` |
| title / primary text | `#17201D` |
| secondary text | `#3C5A50` |
| muted text | `#52605A` |
| accent | `#315F50` |
| accent soft | `#D9E9E1` |
| success / soft | `#2F6F4F` / `#DCEADF` |
| error / soft | `#A8464D` / `#F2DFE0` |
| reward / soft | `#8B6320` / `#EEE5D1` |

Не копировать `businessLight` с чисто белым page background и синим accent: значения должны ссылаться на `SAGE_PORCELAIN` или на таблицу выше.

**Шаг 4: запустить GREEN**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_surface_chrome_contract.test.ts tests/stats_tonal_hierarchy_contract.test.ts tests/button_foreground_contrast.test.ts --no-cache --runInBand
```

Ожидается: PASS.

**Шаг 5: коммит**

```powershell
git add components/settings/settingsSurfaces.ts 'app/(tabs)/settings.tsx' app/daily_phrase_chrome.ts constants/themedToastChrome.ts constants/weekDotTheme.ts constants/statsThemeChrome.ts components/medalToastThemeStyles.ts tests/sage_porcelain_surface_chrome_contract.test.ts tests/stats_tonal_hierarchy_contract.test.ts
git commit -m "feat(themes): add sage porcelain surface chrome"
```

---

### Задача 6: Протянуть chrome на модальные, reward и paywall-поверхности

**Файлы:**

- Создать: `tests/sage_porcelain_modal_chrome_contract.test.ts`
- Изменить:
  - `components/DailyTasksFirstVisitModal.tsx`
  - `components/DailyTaskRewardToast.tsx`
  - `components/NoEnergyModal.tsx`
  - `components/paywallThemeConfig.ts`
  - `app/flashcards/cardPackPaywallTheme.ts`
  - `constants/leagueBonusPalette.ts`
  - `components/RewardModalBackdrop.tsx`
  - `tests/paywallThemeConfig.test.ts`

**Шаг 1: написать RED-контракт**

Тест должен проверять явную обработку `sagePorcelain` во всех семи исходниках и ожидать:

- scrim: `rgba(23,32,29,0.26)` regular, `rgba(23,32,29,0.38)` strong;
- panel gradient: `['#FCFDF9', '#F5F7F2', '#E7EAE3']`;
- panel border: `#BDC8BD`;
- CTA/accent: `#315F50`, CTA text `#FFFFFF`;
- reward/gold: `#8B6320` и `#EEE5D1`;
- error: `#A8464D` и `#F2DFE0`.

**Шаг 2: запустить RED**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_modal_chrome_contract.test.ts tests/paywallThemeConfig.test.ts --no-cache --runInBand
```

Ожидается: FAIL.

**Шаг 3: добавить explicit entries и switch cases**

В `RewardModalBackdrop.tsx` все switch-функции должны иметь отдельный `case 'sagePorcelain'`, чтобы ни один dark default не просочился в светлую тему. Использовать только точные значения из шага 1 и базовой таблицы; не менять ветки других тем.

В `PAYWALL_THEME_CONFIG` и `cardPackPaywallTheme` использовать фарфоровую карточку, шалфейный CTA и бронзовый reward; декоративные glow/particle opacity — `0` или текущий минимальный неанимированный уровень, без белого текста на светлой поверхности.

**Шаг 4: запустить GREEN**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_modal_chrome_contract.test.ts tests/paywallThemeConfig.test.ts tests/reward_modal_liquid_glass_contract.test.ts tests/button_foreground_contrast.test.ts --no-cache --runInBand
```

Ожидается: PASS.

**Шаг 5: коммит**

```powershell
git add components/DailyTasksFirstVisitModal.tsx components/DailyTaskRewardToast.tsx components/NoEnergyModal.tsx components/paywallThemeConfig.ts app/flashcards/cardPackPaywallTheme.ts constants/leagueBonusPalette.ts components/RewardModalBackdrop.tsx tests/sage_porcelain_modal_chrome_contract.test.ts tests/paywallThemeConfig.test.ts
git commit -m "feat(themes): cover sage porcelain modal chrome"
```

---

### Задача 7: Подключить все статические asset-слоты без лишнего bundle weight

**Файлы:**

- Создать: `tests/sage_porcelain_asset_fallbacks_contract.test.ts`
- Изменить:
  - `app/coin_icons.ts`
  - `app/home_menu_icons.ts`
  - `app/flashcards/FlashcardsCategoryHub.tsx`
  - `app/personal_plan_task_visuals.ts`
  - `components/EnergyIcon.tsx`
  - `constants/generatedThemeIconAssets.ts`
  - `constants/socialIconAssets.ts`
  - `constants/streakIconAssets.ts`
  - `constants/trainerThemeIcons.ts`
  - `constants/weeklyCompassIcons.ts`
  - `constants/boonIconAssets.ts`
  - `constants/leagueBonusGiftImages.ts`
  - связанные focused tests: `tests/currency_icon_assets_contract.test.ts`, `tests/boon_icon_assets.test.ts`, `tests/weekly_bonus_theme_assets.test.ts`, `tests/trainer_theme_icons_locale.test.ts`

**Шаг 1: написать RED-тест 1:1 slot coverage**

Тест должен сравнить наборы ключей `sagePorcelain` с `businessLight` для:

- home menu: 10 ключей;
- flashcards modes: 6;
- personal-plan tasks: 11;
- personal-plan routes: 5;
- streak fires: 10 + freeze;
- trainer icons: 3;
- weekly boons: точный текущий `WeeklyBoonIconId` set;
- social: friends + chat;
- energy, coin, compass, lesson-exam, league gift: по одному.

Каждый `sagePorcelain` source должен быть статическим `require()` существующего файла. Никаких template paths, `require(variable)` и новых файлов в `assets/images/**` на этом шаге.

**Шаг 2: запустить RED**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_asset_fallbacks_contract.test.ts tests/currency_icon_assets_contract.test.ts tests/boon_icon_assets.test.ts tests/weekly_bonus_theme_assets.test.ts tests/trainer_theme_icons_locale.test.ts --no-cache --runInBand
```

Ожидается: FAIL — новая тема не покрыта.

**Шаг 3: добавить статические светлые fallbacks**

Паттерн для каждого exhaustive map:

```ts
sagePorcelain: require('../assets/images/currency/pearl_businessLight.webp'),
```

Для вложенных map повторить точный `businessLight` slot list, сохранив static require каждой существующей картинки. Для `trainerThemeIcons` ассеты можно переиспользовать, но palette должна быть новой:

```ts
sagePorcelain: {
  primary: '#315F50',
  secondary: '#8B6320',
  outline: '#17201D',
  surface: '#FCFDF9',
},
```

Для streak chrome использовать:

```ts
sagePorcelain: { rgb: [139, 99, 32], accent: '#315F50' },
```

Для freeze chrome:

```ts
sagePorcelain: { rgb: [97, 112, 106], accent: '#52605A' },
```

В `tests/boon_icon_assets.test.ts` заменить хрупкое число `120` на точную формулу `liveThemeCount * boonIdCount`, где `liveThemeCount` включает `sagePorcelain`; проверка не должна ослабевать до `>=`.

**Шаг 4: проверить, что ни одного нового bundled asset не появилось**

```powershell
git status --short -- assets/images
```

Ожидается: пусто.

**Шаг 5: запустить GREEN**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_asset_fallbacks_contract.test.ts tests/currency_icon_assets_contract.test.ts tests/boon_icon_assets.test.ts tests/weekly_bonus_theme_assets.test.ts tests/trainer_theme_icons_locale.test.ts tests/section_asset_preload.test.ts --no-cache --runInBand
```

Ожидается: PASS.

**Шаг 6: коммит**

```powershell
git add app/coin_icons.ts app/home_menu_icons.ts app/flashcards/FlashcardsCategoryHub.tsx app/personal_plan_task_visuals.ts components/EnergyIcon.tsx constants/generatedThemeIconAssets.ts constants/socialIconAssets.ts constants/streakIconAssets.ts constants/trainerThemeIcons.ts constants/weeklyCompassIcons.ts constants/boonIconAssets.ts constants/leagueBonusGiftImages.ts tests/sage_porcelain_asset_fallbacks_contract.test.ts tests/currency_icon_assets_contract.test.ts tests/boon_icon_assets.test.ts tests/weekly_bonus_theme_assets.test.ts tests/trainer_theme_icons_locale.test.ts
git commit -m "feat(themes): wire sage porcelain asset slots"
```

---

### Задача 8: Создать единственный уникальный theme-specific asset

**Файлы:**

- Создать: `assets/images/settings/referral_theme/invite-sagePorcelain-v2.webp`
- Изменить: `components/ReferralInviteBannerArt.tsx`
- Изменить: `tests/referral_invite_banner_theme_assets.test.ts`

**Шаг 1: расширить RED-контракт**

Добавить `sagePorcelain` в список обязательных уникальных баннеров. Существующий тест должен по-прежнему проверять:

- файл существует;
- размер 900×300;
- формат WebP;
- static require в `ReferralInviteBannerArt.tsx`;
- digest не совпадает ни с одним другим theme banner.

```powershell
npx jest --runTestsByPath tests/referral_invite_banner_theme_assets.test.ts --no-cache --runInBand
```

Ожидается: FAIL — файла нет.

**Шаг 2: создать исходник встроенным image generation**

Использовать `invite-businessLight-v2.webp` как визуальный reference и выполнить одну генерацию/редактирование с таким art direction:

```text
Edit this 3:1 premium referral banner while preserving the centered wrapped gift composition and generous negative space. Replace the warm cream scene with soft porcelain white and pale warm-sage paper textures. Change the charcoal ribbon to deep muted sage #315F50 with a subtle bronze #8B6320 edge detail. Natural diffused daylight, calm tactile editorial photography, no text, no logos, no neon, no blue cast, no black background, no clipping of the gift or bow.
```

Raw output сохранить только в `.codex-tmp/sage-porcelain-sources/`, не в `assets/images/**`.

**Шаг 3: подготовить финальный WebP через `sharp`**

```powershell
node -e "const sharp=require('sharp'); sharp(process.argv[1]).resize(900,300,{fit:'cover',position:'centre'}).webp({quality:72,alphaQuality:80,smartSubsample:true}).toFile(process.argv[2])" ".codex-tmp/sage-porcelain-sources/invite-source.png" "assets/images/settings/referral_theme/invite-sagePorcelain-v2.webp"
```

**Шаг 4: wire first/static require**

```ts
sagePorcelain: require('../assets/images/settings/referral_theme/invite-sagePorcelain-v2.webp'),
```

**Шаг 5: проверить метаданные, размер и уникальность**

```powershell
node -e "const sharp=require('sharp'); sharp(process.argv[1]).metadata().then(m=>{console.log(JSON.stringify(m)); if(m.format!=='webp'||m.width!==900||m.height!==300) process.exit(1)})" "assets/images/settings/referral_theme/invite-sagePorcelain-v2.webp"
Get-FileHash -Algorithm SHA256 assets/images/settings/referral_theme/invite-*-v2.webp | Sort-Object Hash
```

Ожидается: WebP 900×300; хэш нового баннера уникален.

**Шаг 6: визуально открыть финал**

Использовать локальный image viewer и проверить: подарок целиком, нет текста/логотипов, шалфей читается, фон остаётся светлым, центральная композиция не обрезана.

**Шаг 7: запустить GREEN**

```powershell
npx jest --runTestsByPath tests/referral_invite_banner_theme_assets.test.ts --no-cache --runInBand
```

Ожидается: PASS.

**Шаг 8: коммит**

```powershell
git add components/ReferralInviteBannerArt.tsx tests/referral_invite_banner_theme_assets.test.ts assets/images/settings/referral_theme/invite-sagePorcelain-v2.webp
git commit -m "feat(themes): add sage porcelain referral art"
```

---

### Задача 9: Закрыть все exhaustive ThemeMode-контракты

**Файлы:**

- Изменить только те исходники и focused tests, которые назовёт TypeScript/Jest.
- Ожидаемые кандидаты:
  - `constants/levelGiftImages.ts`
  - `components/LevelGiftDualModal.tsx`
  - `app/personal_plan.tsx`
  - `app/personal_plan_stats_screen.tsx`
  - `app/streak_stats.tsx`
  - другие `Record<ThemeMode, …>` или `switch(themeMode)`, обнаруженные компилятором.

**Шаг 1: выполнить диагностический typecheck с коротким логом**

```powershell
node scripts/codex-safe-run.mjs -- npx tsc --noEmit
```

Ожидается: если остались exhaustive maps, TypeScript перечислит их. Полный лог остаётся в `.codex-tmp/codex-safe-run/`; в разговор выводятся только итог и решающие строки.

**Шаг 2: для каждого найденного места сначала добавить focused assertion**

Правило: не добавлять `default`, `Partial<Record<...>>`, `as any` или fallback на `indigo` только ради зелёного typecheck. Для визуального switch добавить явный `case 'sagePorcelain'` со значениями:

```ts
case 'sagePorcelain':
  return /* существующий return-тип */;
```

Возвращаемое значение должно состоять из утверждённых токенов: page `#F0F1EC`, card `#FCFDF9`, accent `#315F50`, bronze `#8B6320`, border `#CFD6CE`, text `#17201D`.

**Шаг 3: повторить typecheck**

```powershell
node scripts/codex-safe-run.mjs -- npx tsc --noEmit
```

Ожидается: exit 0.

**Шаг 4: проверить полноту theme maps поиском**

```powershell
rg -n "Record<ThemeMode|switch \(themeMode\)|switch\(themeMode\)" app components constants --glob "*.ts" --glob "*.tsx"
```

Просмотреть результаты и убедиться, что каждый exhaustive визуальный map содержит `sagePorcelain`, а switch либо имеет явную ветку, либо доказуемо строится только из семантических токенов `theme`.

**Шаг 5: коммит, только если были исправления**

```powershell
$coverageFiles = git diff --name-only HEAD -- app components constants tests
git add -- $coverageFiles
git commit -m "fix(themes): complete sage porcelain coverage"
```

---

### Задача 10: Финальная автоматическая и визуальная проверка

**Файлы:**

- При необходимости создать ignored screenshots: `.codex-tmp/sage-porcelain-qa/`.
- Исходники не менять, пока конкретная проверка не воспроизведёт дефект.

**Шаг 1: запустить узкий набор theme-тестов**

```powershell
npx jest --runTestsByPath tests/sage_porcelain_theme_contract.test.ts tests/sage_porcelain_theme_context_contract.test.ts tests/sage_porcelain_background_contract.test.ts tests/sage_porcelain_picker_contract.test.ts tests/sage_porcelain_surface_chrome_contract.test.ts tests/sage_porcelain_modal_chrome_contract.test.ts tests/sage_porcelain_asset_fallbacks_contract.test.ts tests/referral_invite_banner_theme_assets.test.ts tests/button_foreground_contrast.test.ts tests/app_art_backdrop_contract.test.ts tests/theme_context_default.test.ts tests/paywallThemeConfig.test.ts --no-cache --runInBand
```

Ожидается: PASS, 0 failed.

**Шаг 2: запустить обязательные runtime/layout guards**

```powershell
npx jest --runTestsByPath tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts tests/layout_stability_contract.test.ts --no-cache --runInBand
```

Ожидается: PASS; новая тема не добавляет timers, горячие скрытые экраны или layout jumps.

**Шаг 3: финальный TypeScript gate**

```powershell
node scripts/codex-safe-run.mjs -- npx tsc --noEmit
```

Ожидается: exit 0.

**Шаг 4: ручная визуальная матрица на устройстве/эмуляторе**

Выбрать `Фарфоровый шалфей` и снять не менее шести экранов:

1. Главная: фон, hero, четыре карточки, bottom nav.
2. Урок: вопрос, варианты default/selected/correct/wrong, progress, CTA.
3. Настройки: текущая тема и picker row.
4. Статистика: графики, week dots, muted labels.
5. Paywall/reward modal: scrim, светлая панель, CTA, bronze reward.
6. Referral: новый баннер в реальном layout.

Для каждого экрана проверить:

- фон не белый и не серо-грязный;
- `bgPrimary`, `bgCard`, `bgSurface` различимы без тяжёлых рамок;
- muted текст читается;
- white используется только на достаточно тёмных `accent/correct/wrong/gold`;
- status bar имеет тёмные иконки;
- нет чёрного кадра при навигации;
- нет cinema stars/bloom;
- иллюстрации не имеют тёмных прямоугольных подложек;
- переключение на Indigo и обратно ничего не ломает.

**Шаг 5: проверить diff и asset hygiene**

```powershell
git diff --check 3e00d9166...HEAD
git status --short
git diff --name-only 3e00d9166...HEAD -- assets/images
rg -n "invite-sagePorcelain-v2\.webp" app components constants
```

Ожидается:

- `git diff --check` чист;
- единственный новый bundled asset — `invite-sagePorcelain-v2.webp`;
- у него ровно один осмысленный static require;
- `.codex-tmp/**` не отслеживается;
- нет случайных пользовательских файлов из исходного грязного worktree.

**Шаг 6: финальный review-коммит, только если QA потребовал исправления**

```powershell
$qaFiles = git diff --name-only HEAD -- app components constants tests assets/images/settings/referral_theme
git add -- $qaFiles
git commit -m "fix(themes): polish sage porcelain contrast"
```

**Шаг 7: перед передачей пользователю**

- Выполнить skill `verification-before-completion` и приложить свежие команды/результаты.
- Сравнить `git diff --name-only 3e00d9166...HEAD` с разрешённым списком этого плана.
- Не делать merge, push, release или deploy без отдельной команды пользователя.
- При переносе в исходный грязный worktree сначала показать пересекающиеся файлы из `.codex-tmp/sage-porcelain-user-overlaps.txt`; не перезаписывать их автоматически.

---

## Критерии готовности

- `sagePorcelain` доступна бесплатно и сохраняется после перезапуска.
- Тёмные status-bar icons и светлая системная семантика работают только для новой темы; остальные темы не изменились.
- Все утверждённые HEX-токены присутствуют без ad-hoc замен.
- Все текстовые пары проходят минимум 4.5:1, границы/controls — минимум 3:1 там, где цвет несёт смысл.
- ScreenGradient не рисует cinema bloom/stars/orbs в новой теме.
- Все `Record<ThemeMode, …>` и тематические switch покрыты без ослабления типов.
- Все asset slot sets совпадают с established theme; dead assets нет.
- Единственный новый bundled WebP — уникальный referral banner 900×300.
- Узкие Jest-наборы, runtime/layout guards и `tsc --noEmit` зелёные.
- Шесть репрезентативных экранов визуально проверены в реальном приложении.
- Ни один существующий экран, режим, тема или пользовательское изменение не удалены и не перезаписаны.
