# React Native UI Standard v4 — Phraseman

## Финальный исполняемый стандарт

---

## Раздел 1 — Обязательные платформенные правила

Эти правила верифицированы на реальных устройствах. Нарушение ломает визуал.

### Правило 1 — shadowColor только solid HEX

```typescript
// ПРАВИЛЬНО
shadowColor: '#22f6ee'

// ЗАПРЕЩЕНО — double-alpha: shadowOpacity * colorAlpha → тень исчезает
shadowColor: 'rgba(34,246,238,0.28)'
```

### Правило 2 — fontWeight только '400' или '700'

```typescript
// ПРАВИЛЬНО
fontWeight: '700'
fontWeight: '400'
// или вообще без fontWeight

// ЗАПРЕЩЕНО — файлов шрифта '500','600' не существует → fallback Roboto
fontWeight: '500'
fontWeight: '600'
```

### Правило 3 — overflow:'hidden' убивает elevation на Android

```tsx
// ПРАВИЛЬНО — двойной View
<View style={outerStyle}>        {/* shadow/elevation, без overflow */}
  <View style={innerStyle}>      {/* overflow:'hidden' для clip */}
    {children}
  </View>
</View>

// ЗАПРЕЩЕНО
<View style={{ borderRadius: 30, overflow: 'hidden', elevation: 8 }}>
```

### Правило 4 — dashed border только через SVG

```tsx
// ПРАВИЛЬНО — SVG Rect с strokeDasharray
<Rect strokeDasharray="4 4" />

// ЗАПРЕЩЕНО — не работает на Android
borderStyle: 'dashed'
```

### Правило 5 — цвет/шрифт только на Text

```tsx
// ПРАВИЛЬНО
<View><Text style={{ color: '#fff', fontSize: 14 }}>текст</Text></View>

// ЗАПРЕЩЕНО — нет наследования в RN
<View style={{ color: '#fff', fontSize: 14 }}>...</View>
```

### Правило 6 — центрирование через alignSelf

```typescript
// ПРАВИЛЬНО
alignSelf: 'center'

// ЗАПРЕЩЕНО — нестабильно в Yoga layout
marginHorizontal: 'auto' as any
```

### Правило 7 — LinearGradient через start/end

```typescript
// ПРАВИЛЬНО — expo-linear-gradient v15
<LinearGradient colors={[...]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} />

// ЗАПРЕЩЕНО — props от react-native-linear-gradient, не expo
<LinearGradient angle={135} useAngle colors={[...]} />
```

---

## Раздел 2 — Токены темы

### 2.1 Структура

```typescript
// src/theme/tokens.ts
export interface ThemeTokens {
  accent: string;        // solid HEX — для shadowColor, Text color, icon fill
  accentSoft: string;    // rgba — для borderColor, overlay, SVG stroke
  btnGlow: string;       // rgba — для LinearGradient glow (НИКОГДА в shadowColor)
  button: [string, string];    // LinearGradient colors
  screenBg: [string, string];  // screen background gradient
}

export const themeMap = {
  a: { accent: '#22f6ee', accentSoft: 'rgba(34,246,238,0.35)',  button: ['#28e9ff','#1ee7a0'] as [string,string], btnGlow: 'rgba(34,246,238,0.28)',  screenBg: ['#071018','#030506'] as [string,string] },
  b: { accent: '#6cff9b', accentSoft: 'rgba(108,255,155,0.34)', button: ['#78ff9a','#1ee8d6'] as [string,string], btnGlow: 'rgba(108,255,155,0.25)', screenBg: ['#06110b','#020403'] as [string,string] },
  c: { accent: '#8da2ff', accentSoft: 'rgba(141,162,255,0.35)', button: ['#8da2ff','#27f6ee'] as [string,string], btnGlow: 'rgba(141,162,255,0.27)', screenBg: ['#08101f','#030408'] as [string,string] },
  d: { accent: '#ffd166', accentSoft: 'rgba(255,209,102,0.32)', button: ['#ffd166','#ff8c42'] as [string,string], btnGlow: 'rgba(255,209,102,0.24)', screenBg: ['#141007','#040302'] as [string,string] },
  e: { accent: '#ff6d8f', accentSoft: 'rgba(255,109,143,0.34)', button: ['#ff6d8f','#a98bff'] as [string,string], btnGlow: 'rgba(255,109,143,0.24)', screenBg: ['#13070d','#040305'] as [string,string] },
  f: { accent: '#5cc8ff', accentSoft: 'rgba(92,200,255,0.35)',  button: ['#5cc8ff','#7cffb4'] as [string,string], btnGlow: 'rgba(92,200,255,0.24)',  screenBg: ['#06101a','#030506'] as [string,string] },
  g: { accent: '#b8ff5c', accentSoft: 'rgba(184,255,92,0.33)',  button: ['#b8ff5c','#25f4ee'] as [string,string], btnGlow: 'rgba(184,255,92,0.21)',  screenBg: ['#091306','#030503'] as [string,string] },
  h: { accent: '#c68cff', accentSoft: 'rgba(198,140,255,0.33)', button: ['#c68cff','#22f6ee'] as [string,string], btnGlow: 'rgba(198,140,255,0.23)', screenBg: ['#0d0716','#040306'] as [string,string] },
  i: { accent: '#ff9f43', accentSoft: 'rgba(255,159,67,0.32)',  button: ['#ff9f43','#25f4ee'] as [string,string], btnGlow: 'rgba(255,159,67,0.22)',  screenBg: ['#140c05','#040302'] as [string,string] },
  j: { accent: '#6effe3', accentSoft: 'rgba(110,255,227,0.35)', button: ['#6effe3','#8da2ff'] as [string,string], btnGlow: 'rgba(110,255,227,0.22)', screenBg: ['#061412','#030506'] as [string,string] },
  k: { accent: '#fffb87', accentSoft: 'rgba(255,251,135,0.30)', button: ['#fffb87','#6cff9b'] as [string,string], btnGlow: 'rgba(255,251,135,0.20)', screenBg: ['#121207','#030403'] as [string,string] },
  l: { accent: '#70a1ff', accentSoft: 'rgba(112,161,255,0.32)', button: ['#70a1ff','#ff6d8f'] as [string,string], btnGlow: 'rgba(112,161,255,0.21)', screenBg: ['#071023','#030407'] as [string,string] },
  m: { accent: '#2eff7b', accentSoft: 'rgba(46,255,123,0.33)',  button: ['#2eff7b','#24e5ff'] as [string,string], btnGlow: 'rgba(46,255,123,0.22)',  screenBg: ['#061207','#020403'] as [string,string] },
  n: { accent: '#25f4ee', accentSoft: 'rgba(37,244,238,0.35)',  button: ['#25f4ee','#5dffb1'] as [string,string], btnGlow: 'rgba(37,244,238,0.24)',  screenBg: ['#061113','#030506'] as [string,string] },
} satisfies Record<string, ThemeTokens>;

export type ThemeKey = keyof typeof themeMap;
```

### 2.2 ThemeContext

```typescript
// src/theme/ThemeContext.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { ThemeTokens, ThemeKey, themeMap } from './tokens';

interface ThemeContextValue {
  key: ThemeKey;
  tokens: ThemeTokens;
  setTheme: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState<ThemeKey>('a');

  // useMemo ОБЯЗАТЕЛЕН — без него все useTheme() ре-рендерятся на каждый
  // рендер родителя, даже если ключ темы не менялся.
  const value = useMemo<ThemeContextValue>(
    () => ({ key, tokens: themeMap[key], setTheme: setKey }),
    [key]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

### 2.3 Монтаж ThemeProvider

```tsx
// App.tsx — ThemeProvider ТОЛЬКО на уровне App, снаружи навигатора
export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
}

// ЗАПРЕЩЕНО — ThemeProvider внутри навигатора
export default function App() {
  return (
    <NavigationContainer>
      <ThemeProvider>  {/* key-изменение пересоздаёт всё поддерево */}
        <RootNavigator />
      </ThemeProvider>
    </NavigationContainer>
  );
}
```

---

## Раздел 3 — Константы градиентных углов

```typescript
// src/constants/gradientAngles.ts
// expo-linear-gradient не принимает angle — только start/end.

export const ANGLE_135_START = { x: 0.15, y: 0 };
export const ANGLE_135_END   = { x: 0.85, y: 1 };

export const ANGLE_145_START = { x: 0.12, y: 0 };
export const ANGLE_145_END   = { x: 0.88, y: 1 };

// Справочник других углов:
// 0deg   → start:{x:0,y:0.5}   end:{x:1,y:0.5}
// 90deg  → start:{x:0.5,y:0}   end:{x:0.5,y:1}
// 180deg → start:{x:0.5,y:1}   end:{x:0.5,y:0}
// 270deg → start:{x:1,y:0.5}   end:{x:0,y:0.5}
```

---

## Раздел 4 — Иерархия borderRadius

```
phone: 42
  screen: 32
    bigCard: 30
      card: 24
        btn: 22
          round: 21
        navBottom: 24
          option: 17
            slot: 15
              tile: 13
```

Прогрессия создаёт визуальную вложенность. Изменять только системно.

---

## Раздел 5 — Полный StyleSheet всех компонентов

```typescript
// src/theme/baseStyles.ts
// НЕ использовать StyleSheet.create — значения зависят от темы.
// Тема-зависимые поля (shadowColor, borderColor, color) задаются
// через useMemo внутри компонентов.

import { ViewStyle, TextStyle } from 'react-native';

export const baseStyles = {

  // ─── PHONE CONTAINER ─────────────────────────────────────────────────────
  phone: {
    width: 380,
    minHeight: 615,
    borderRadius: 42,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',                    // Правило 1: solid HEX
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.55,
    shadowRadius: 60,
    elevation: 20,
  } as ViewStyle,

  // ─── SCREEN ──────────────────────────────────────────────────────────────
  // Правило 3: overflow:'hidden' обрезает elevation дочерних на Android.
  // Btn, Orb, NavBottom размещаются ВОВНЕ Screen в JSX (см. Раздел 7).
  screen: {
    minHeight: 585,
    borderRadius: 32,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  } as ViewStyle,

  // ─── BIG CARD ─────────────────────────────────────────────────────────────
  // Правило 3: bigCardOuter несёт shadow; bigCardInner — overflow:'hidden'
  bigCardOuter: {
    borderRadius: 30,
    // shadowColor: tokens.accent — задаётся в компоненте (Правило 1)
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.09,
    shadowRadius: 38,
    elevation: 8,
  } as ViewStyle,

  bigCardInner: {
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    // borderColor: tokens.accentSoft — задаётся в компоненте
    overflow: 'hidden',
  } as ViewStyle,

  // Inner glow: inset 0 1px 0 rgba(255,255,255,.09) — единственная эмуляция в RN
  bigCardInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.09)',
    zIndex: 1,
  } as ViewStyle,

  // ─── CARD (обычная) ───────────────────────────────────────────────────────
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 24,
    padding: 18,
  } as ViewStyle,

  // ─── OPTION ───────────────────────────────────────────────────────────────
  option: {
    minHeight: 50,
    borderRadius: 17,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,

  optionText: {
    color: '#e8eef2',
    fontSize: 14,
    // fontWeight намеренно отсутствует — верифицировано на реальных устройствах.
    // Явный '400' на кастомном шрифте на Android ведёт себя иначе, чем отсутствие.
    // НЕ ДОБАВЛЯТЬ.
  } as TextStyle,

  // active border/shadow задаётся в компоненте через tokens.accent
  optionActiveBase: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 10,
    // borderColor: tokens.accent — задаётся в компоненте (Правило 1)
    // shadowColor: tokens.accent — задаётся в компоненте (Правило 1)
  } as ViewStyle,

  // ─── TILE ────────────────────────────────────────────────────────────────
  tile: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  } as ViewStyle,

  tileText: {
    color: '#f4f7f8',
    fontSize: 14,
    // fontWeight намеренно отсутствует (см. комментарий optionText)
  } as TextStyle,

  // ─── SLOT ────────────────────────────────────────────────────────────────
  // Правило 4: borderStyle:'dashed' не работает на Android.
  // Размеры и background здесь; dashed border — через SVG (компонент SlotBorder).
  slot: {
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.12)',
    flex: 1,
  } as ViewStyle,

  // ─── PHRASE ───────────────────────────────────────────────────────────────
  phrase: {
    fontSize: 25,
    // fontWeight намеренно отсутствует — макет не задаёт, дефолт 400.
    // НЕ добавлять fontWeight: '400' — верифицированное поведение.
    lineHeight: 29.5,        // 25 * 1.18
    letterSpacing: -0.875,   // -0.035em * 25px
    color: '#f4f7f8',
  } as TextStyle,

  // ─── BUTTON (primary) ────────────────────────────────────────────────────
  // Правило 3: Btn размещается ВОВНЕ Screen в JSX.
  // Правило 7: LinearGradient через start/end.
  btnOuter: {
    height: 58,
    borderRadius: 22,
    // shadowColor: tokens.accent — задаётся в компоненте (Правило 1)
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 38,
    elevation: 12,
    marginTop: 18,
  } as ViewStyle,

  btnInner: {
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } as ViewStyle,

  btnText: {
    color: '#071014',
    fontWeight: '700',   // Правило 2
    fontSize: 16,
  } as TextStyle,

  btnSecondary: {
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    marginTop: 18,
  } as ViewStyle,

  btnSecondaryText: {
    color: '#dce6ea',
    fontWeight: '700',   // Правило 2
    fontSize: 16,
  } as TextStyle,

  // ─── WAVE (equalizer) ─────────────────────────────────────────────────────
  wave: {
    height: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,  // RN 0.71+; для старых версий — marginRight: 4 на каждый бар
  } as ViewStyle,

  // backgroundColor и shadowColor задаются в компоненте через tokens.accent
  waveBarBase: {
    width: 4,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 6,
  } as ViewStyle,

  // ─── ORB ─────────────────────────────────────────────────────────────────
  // Правило 3: Orb размещается ВОВНЕ Screen в JSX.
  // Правило 6: alignSelf:'center' — НЕ marginHorizontal:'auto'.
  orb: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',   // Правило 6
    marginVertical: 20,
    // shadowColor: tokens.accent — задаётся в компоненте (Правило 1)
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 70,
    elevation: 20,
    overflow: 'hidden',
  } as ViewStyle,

  // ─── NAV BOTTOM ───────────────────────────────────────────────────────────
  // Правило 3: NavBottom размещается ВОВНЕ Screen в JSX.
  navBottom: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 14,
    height: 62,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  } as ViewStyle,

  navBottomItem: {
    color: '#8996a0',
    fontSize: 11,
  } as TextStyle,

  // fontWeight: '700' — макет даёт '600', исправлено (Правило 2).
  // '600' не существует как файл шрифта → fallback Roboto.
  // '700' = Bold = единственный жирный файл кастомного шрифта.
  // color: tokens.accent — задаётся в компоненте.
  navBottomActiveText: {
    fontSize: 11,
    fontWeight: '700',   // Правило 2: было '600' в макете
  } as TextStyle,

  // ─── PROGRESS ─────────────────────────────────────────────────────────────
  progressTrack: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
  } as ViewStyle,

  // Используй flex: progress на fill + flex: 1-progress на spacer.
  // НЕ width:'n%' — вычисляется в 0 без измеренной ширины родителя.
  progressFillBase: {
    height: 7,
    borderRadius: 999,
    // flex: clamped — задаётся в компоненте динамически
  } as ViewStyle,

  // ─── METRIC ───────────────────────────────────────────────────────────────
  metric: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  } as ViewStyle,

  // fontWeight: '700' — макет даёт '600', исправлено (Правило 2).
  // color: tokens.accent — задаётся в компоненте.
  metricValue: {
    fontSize: 25,
    fontWeight: '700',   // Правило 2: было '600' в макете
  } as TextStyle,

  // ─── TYPOGRAPHY ───────────────────────────────────────────────────────────
  label: {
    fontSize: 12,
    color: '#9aa6ad',
    marginBottom: 8,
  } as TextStyle,

  mini: {
    fontSize: 12,
    color: '#91a0aa',
  } as TextStyle,

  xl: {
    fontSize: 64,
    letterSpacing: -5.12,   // -0.08em * 64
    lineHeight: 57.6,       // 64 * 0.9
    color: '#f4f7f8',
  } as TextStyle,

  // ─── UTILITY ──────────────────────────────────────────────────────────────
  round: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  } as ViewStyle,

  homeBar: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 118,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#fff',
    opacity: 0.9,
  } as ViewStyle,

  spacer: {
    height: 16,
  } as ViewStyle,
};
```

---

## Раздел 6 — Компоненты (полный JSX)

### 6.1 BigCard

```tsx
// src/components/BigCard.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { baseStyles } from '../theme/baseStyles';
import { ANGLE_145_START, ANGLE_145_END } from '../constants/gradientAngles';

interface BigCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BigCard({ children, style }: BigCardProps) {
  const { tokens } = useTheme();

  const outerStyle = useMemo(() => ({
    ...baseStyles.bigCardOuter,
    shadowColor: tokens.accent,    // Правило 1
  }), [tokens.accent]);

  const innerStyle = useMemo(() => ({
    ...baseStyles.bigCardInner,
    borderColor: tokens.accentSoft,
  }), [tokens.accentSoft]);

  // Фон: linear-gradient(145deg, rgba(accent,0.17), rgba(255,255,255,0.055))
  // accentSoft имеет alpha 0.35 → заменяем на 0.17 для фона
  const bgColors = useMemo(() =>
    [tokens.accentSoft.replace(/[\d.]+\)$/, '0.17)'), 'rgba(255,255,255,0.055)'] as [string, string],
  [tokens.accentSoft]);

  return (
    <View style={[outerStyle, style]}>
      <View style={innerStyle}>
        {/* Inner glow: inset 0 1px 0 rgba(255,255,255,.09) */}
        <View style={baseStyles.bigCardInnerGlow} pointerEvents="none" />
        <LinearGradient
          colors={bgColors}
          start={ANGLE_145_START}
          end={ANGLE_145_END}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    </View>
  );
}
```

### 6.2 Btn

```tsx
// src/components/Btn.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { baseStyles } from '../theme/baseStyles';
import { ANGLE_135_START, ANGLE_135_END } from '../constants/gradientAngles';

interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Btn({ label, onPress, variant = 'primary', disabled }: BtnProps) {
  const { tokens } = useTheme();

  const outerStyle = useMemo(() => ({
    ...baseStyles.btnOuter,
    shadowColor: tokens.accent,   // Правило 1
    opacity: disabled ? 0.5 : 1,
  }), [tokens.accent, disabled]);

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        style={[baseStyles.btnSecondary, disabled && { opacity: 0.5 }]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Text style={baseStyles.btnSecondaryText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={outerStyle}>
      <TouchableOpacity
        style={baseStyles.btnInner}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <LinearGradient
          colors={tokens.button}
          start={ANGLE_135_START}   // Правило 7
          end={ANGLE_135_END}
          style={StyleSheet.absoluteFill}
        />
        <Text style={baseStyles.btnText}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 6.3 ProgressBar

```tsx
// src/components/ProgressBar.tsx
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { baseStyles } from '../theme/baseStyles';
import { ANGLE_135_START, ANGLE_135_END } from '../constants/gradientAngles';

interface ProgressBarProps {
  progress: number;  // 0..1
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const { tokens } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));

  // flex вместо width:'%' — надёжно без onLayout (Правило из baseStyles)
  const fillStyle = useMemo(() => ({
    ...baseStyles.progressFillBase,
    flex: clamped,
  }), [clamped]);

  const spacerStyle = useMemo(() => ({ flex: 1 - clamped }), [clamped]);

  return (
    <View
      style={baseStyles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 1, now: clamped }}
    >
      <LinearGradient
        colors={tokens.button}
        start={ANGLE_135_START}
        end={ANGLE_135_END}
        style={fillStyle}
      />
      <View style={spacerStyle} />
    </View>
  );
}
```

### 6.4 SlotBorder

```tsx
// src/components/SlotBorder.tsx
// Правило 4: dashed border через SVG.
import React, { useState, useCallback } from 'react';
import { View, LayoutChangeEvent, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { baseStyles } from '../theme/baseStyles';

interface SlotBorderProps {
  children?: React.ReactNode;
  initialWidth?: number;   // передай для устранения flash до onLayout
  initialHeight?: number;
}

export function SlotBorder({ children, initialWidth, initialHeight }: SlotBorderProps) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(
    initialWidth && initialHeight ? { w: initialWidth, h: initialHeight } : null
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDims(prev =>
      prev?.w === width && prev?.h === height ? prev : { w: width, h: height }
    );
  }, []);

  return (
    <View style={baseStyles.slot} onLayout={onLayout}>
      {dims ? (
        <Svg
          width={dims.w}
          height={dims.h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Rect
            x="0.5" y="0.5"
            width={dims.w - 1}
            height={dims.h - 1}
            rx={15} ry={15}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </Svg>
      ) : (
        // Fallback: виден ~1 кадр (16ms). Передай initialWidth/Height чтобы исключить.
        <View style={slotFallback} pointerEvents="none" />
      )}
      {children}
    </View>
  );
}

const slotFallback: ViewStyle = {
  ...StyleSheet.absoluteFillObject,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.22)',
  borderRadius: 15,
};
```

### 6.5 WaveBar

```tsx
// src/components/WaveBar.tsx
// useRef + массив Animated.Value — правильный паттерн.
// useSharedValue нельзя вызывать в .map() — нарушение Rules of Hooks.
import React, { useRef, useEffect, useMemo } from 'react';
import { Animated, View, Easing } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { baseStyles } from '../theme/baseStyles';

const BAR_HEIGHTS = [24, 48, 32, 70, 38, 58, 28, 64, 42];

interface WaveBarProps {
  playing: boolean;
}

export function WaveBar({ playing }: WaveBarProps) {
  const { tokens } = useTheme();

  // useRef вызывается один раз — Rules of Hooks соблюдены
  const animValues = useRef(
    BAR_HEIGHTS.map(h => new Animated.Value(h))
  ).current;

  useEffect(() => {
    if (!playing) {
      const resets = animValues.map((val, i) =>
        Animated.timing(val, {
          toValue: BAR_HEIGHTS[i],
          duration: 300,
          useNativeDriver: false,  // height не поддерживает native driver
        })
      );
      Animated.parallel(resets).start();
      return;
    }

    const animations = animValues.map((val, i) => {
      const pulse = () => Animated.sequence([
        Animated.timing(val, {
          toValue: BAR_HEIGHTS[i] * (0.3 + Math.random() * 0.7),
          duration: 200 + Math.random() * 300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(val, {
          toValue: BAR_HEIGHTS[i],
          duration: 200 + Math.random() * 300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]);
      return Animated.loop(pulse());
    });

    const parallel = Animated.parallel(animations);
    parallel.start();
    return () => parallel.stop();
  }, [playing, animValues]);

  const barStyle = useMemo(() => ({
    ...baseStyles.waveBarBase,
    backgroundColor: tokens.accent,
    shadowColor: tokens.accent,   // Правило 1
  }), [tokens.accent]);

  return (
    <View style={baseStyles.wave} accessibilityElementsHidden>
      {animValues.map((val, i) => (
        <Animated.View key={i} style={[barStyle, { height: val }]} />
      ))}
    </View>
  );
}
```

### 6.6 Orb

```tsx
// src/components/Orb.tsx
// Правило 3: Orb размещается ВОВНЕ Screen в JSX.
// Правило 6: alignSelf:'center' уже в baseStyles.orb.
import React, { useMemo, useRef, useEffect } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { baseStyles } from '../theme/baseStyles';

interface OrbProps {
  listening?: boolean;
}

export function Orb({ listening = false }: OrbProps) {
  const { tokens } = useTheme();
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const shadowAnim  = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!listening) {
      Animated.parallel([
        Animated.spring(scaleAnim,  { toValue: 1,   useNativeDriver: true }),
        Animated.timing(shadowAnim, { toValue: 0.5, duration: 400, useNativeDriver: false }),
      ]).start();
      return;
    }

    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.08, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1,    duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(shadowAnim, { toValue: 1,   duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(shadowAnim, { toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [listening, scaleAnim, shadowAnim]);

  const orbStyle = useMemo(() => ({
    ...baseStyles.orb,
    shadowColor: tokens.accent,   // Правило 1
  }), [tokens.accent]);

  // radial-gradient эмулируется двумя LinearGradient
  const innerColors: [string, string] = ['#ffffff', tokens.accent];
  const outerColors: [string, string] = [tokens.accentSoft, 'transparent'];

  return (
    <Animated.View
      style={[orbStyle, { transform: [{ scale: scaleAnim }], shadowOpacity: shadowAnim }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={innerColors}
        start={{ x: 0.36, y: 0.28 }}
        end={{ x: 0.5, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={outerColors}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
```

### 6.7 NavBottom

```tsx
// src/components/NavBottom.tsx
// Правило 3: NavBottom размещается ВОВНЕ Screen, последним в JSX (Z-order).
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { baseStyles } from '../theme/baseStyles';

interface NavItem {
  key: string;
  label: string;
}

interface NavBottomProps {
  items: NavItem[];
  activeIndex: number;
  onPress: (index: number) => void;
}

export function NavBottom({ items, activeIndex, onPress }: NavBottomProps) {
  const { tokens } = useTheme();

  const activeTextStyle = useMemo(() => ({
    ...baseStyles.navBottomActiveText,
    color: tokens.accent,   // Правило 5: color только на Text; Правило 1: solid HEX
  }), [tokens.accent]);

  return (
    <View style={baseStyles.navBottom}>
      {items.map((item, i) => (
        <TouchableOpacity
          key={item.key}
          onPress={() => onPress(i)}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === activeIndex }}
          accessibilityLabel={item.label}
        >
          <Text style={i === activeIndex ? activeTextStyle : baseStyles.navBottomItem}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

### 6.8 Screen

```tsx
// src/components/Screen.tsx
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { baseStyles } from '../theme/baseStyles';

interface ScreenProps {
  children: React.ReactNode;
  // edges: внутри Stack-навигатора с header → ['bottom'] или []
  // standalone (без навигационного header) → ['top','bottom']
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function Screen({ children, edges = ['top', 'bottom'] }: ScreenProps) {
  const { tokens } = useTheme();

  return (
    <SafeAreaView edges={edges} style={{ flex: 1 }}>
      <LinearGradient
        colors={tokens.screenBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={baseStyles.screen}
      >
        {children}
      </LinearGradient>
    </SafeAreaView>
  );
}
```

---

## Раздел 7 — Анимационные хуки

### 7.1 useAnswerFeedback — правильный/неправильный ответ

```tsx
// src/hooks/useAnswerFeedback.ts
import { useRef } from 'react';
import { Animated, Easing } from 'react-native';

export function useAnswerFeedback() {
  const scaleAnim      = useRef(new Animated.Value(1)).current;
  const glowOpacity    = useRef(new Animated.Value(0)).current;
  const translateX     = useRef(new Animated.Value(0)).current;
  const flashOpacity   = useRef(new Animated.Value(0)).current;

  const celebrate = () => {
    // Scale pump + green glow flash
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.06, friction: 3, tension: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1,    friction: 5, tension: 100, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.35, duration: 80,  useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0,    duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();
  };

  const shake = () => {
    // Shake + red flash
    Animated.parallel([
      Animated.sequence([
        Animated.timing(translateX, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue:  8, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue:  6, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -4, duration: 40, useNativeDriver: true }),
        Animated.timing(translateX, { toValue:  4, duration: 40, useNativeDriver: true }),
        Animated.timing(translateX, { toValue:  0, duration: 40, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 0.25, duration: 60,  useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 0,    duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();
  };

  return { scaleAnim, glowOpacity, translateX, flashOpacity, celebrate, shake };
}
```

### 7.2 useTilePressAnim — pick-up анимация плитки

```tsx
// src/hooks/useTilePressAnim.ts
import { useRef } from 'react';
import { Animated, Easing } from 'react-native';

export function useTilePressAnim() {
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const liftAnim   = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(2)).current;  // elevation, useNativeDriver:false

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim,  { toValue: 1.12, friction: 4, tension: 250, useNativeDriver: true }),
      Animated.timing(liftAnim,   { toValue: -4,   duration: 120, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(shadowAnim, { toValue: 16,   duration: 120, useNativeDriver: false }),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim,  { toValue: 1, friction: 5, tension: 150, useNativeDriver: true }),
      Animated.timing(liftAnim,   { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      Animated.timing(shadowAnim, { toValue: 2, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  return { scaleAnim, liftAnim, shadowAnim, pressIn, pressOut };
}
```

---

## Раздел 8 — JSX шаблоны экранов

### 8.1 Шаблон: Learn Screen (урок с вариантами ответов)

```tsx
// src/screens/LearnScreen.tsx
// КРИТИЧНО: Btn/Orb/NavBottom вне Screen → elevation работает на Android.
// paddingBottom: 90 = NavBottom.bottom(14) + height(62) + gap(14).

import React, { useState } from 'react';
import { View, Text, ScrollView, Animated } from 'react-native';
import { Screen } from '../components/Screen';
import { BigCard } from '../components/BigCard';
import { ProgressBar } from '../components/ProgressBar';
import { Btn } from '../components/Btn';
import { NavBottom } from '../components/NavBottom';
import { baseStyles } from '../theme/baseStyles';
import { useTheme } from '../theme/ThemeContext';
import { useAnswerFeedback } from '../hooks/useAnswerFeedback';

const NAV_ITEMS = [
  { key: 'home',   label: 'Home'   },
  { key: 'learn',  label: 'Learn'  },
  { key: 'stats',  label: 'Stats'  },
  { key: 'profile',label: 'Profile'},
];

export function LearnScreen() {
  const { tokens } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const { scaleAnim, glowOpacity, translateX, flashOpacity, celebrate, shake } = useAnswerFeedback();

  const handleOption = (index: number, isCorrect: boolean) => {
    setSelected(index);
    if (isCorrect) celebrate();
    else shake();
  };

  return (
    // Правило: position:'relative' на корневом View для NavBottom position:'absolute'
    <View style={{ flex: 1, position: 'relative' }}>

      {/* Screen имеет overflow:'hidden' — все элементы с elevation внутри */}
      <Screen edges={[]}>  {/* edges=[] внутри Stack-навигатора с header */}
        <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>

          {/* Progress */}
          <ProgressBar progress={0.35} />
          <View style={baseStyles.spacer} />

          {/* Phrase */}
          <Text style={baseStyles.phrase}>She enjoys reading books.</Text>
          <View style={baseStyles.spacer} />

          {/* BigCard с вариантами ответов */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateX }] }}>
            <BigCard>
              {[
                { text: 'A  Она любит читать книги.', correct: true  },
                { text: 'B  Она ненавидит читать.',   correct: false },
                { text: 'C  Она часто читает.',       correct: false },
              ].map((opt, i) => (
                <OptionRow
                  key={i}
                  text={opt.text}
                  isSelected={selected === i}
                  onPress={() => handleOption(i, opt.correct)}
                />
              ))}

              {/* Celebrate glow overlay */}
              <Animated.View
                pointerEvents="none"
                style={[
                  { ...StyleSheet.absoluteFillObject, borderRadius: 24, backgroundColor: tokens.accent },
                  { opacity: glowOpacity },
                ]}
              />
              {/* Wrong flash overlay */}
              <Animated.View
                pointerEvents="none"
                style={[
                  { ...StyleSheet.absoluteFillObject, borderRadius: 24, backgroundColor: '#ff6d8f' },
                  { opacity: flashOpacity },
                ]}
              />
            </BigCard>
          </Animated.View>

        </ScrollView>
      </Screen>

      {/* Btn ВОВНЕ Screen — elevation корректен на Android */}
      <View style={{ paddingHorizontal: 22, paddingBottom: 90 }}>
        <Btn label="Continue" onPress={() => {}} />
      </View>

      {/* NavBottom последним — наивысший Z-order */}
      <NavBottom items={NAV_ITEMS} activeIndex={1} onPress={() => {}} />

    </View>
  );
}
```

### 8.2 Шаблон: Pronunciation Screen (орб + эквалайзер)

```tsx
// src/screens/PronunciationScreen.tsx

export function PronunciationScreen() {
  const [listening, setListening] = useState(false);

  return (
    <View style={{ flex: 1, position: 'relative' }}>

      <Screen edges={[]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
          <Text style={baseStyles.phrase}>Good morning, everyone!</Text>
          <View style={baseStyles.spacer} />
          <WaveBar playing={listening} />
          <View style={baseStyles.spacer} />
          {/* Прочий контент внутри Screen */}
        </ScrollView>
      </Screen>

      {/* Orb ВОВНЕ Screen */}
      <Orb listening={listening} />

      {/* Btn ВОВНЕ Screen */}
      <View style={{ paddingHorizontal: 22, paddingBottom: 90 }}>
        <Btn
          label={listening ? 'Stop' : 'Speak'}
          onPress={() => setListening(v => !v)}
        />
      </View>

      {/* NavBottom последним */}
      <NavBottom items={NAV_ITEMS} activeIndex={1} onPress={() => {}} />

    </View>
  );
}
```

### 8.3 Шаблон: Build Sentence Screen (плитки + слоты)

```tsx
// src/screens/BuildSentenceScreen.tsx

export function BuildSentenceScreen() {
  return (
    <View style={{ flex: 1, position: 'relative' }}>

      <Screen edges={[]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>

          <Text style={baseStyles.phrase}>Build the sentence:</Text>
          <View style={baseStyles.spacer} />

          {/* Слоты — dashed border через SVG */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SlotBorder initialHeight={46} />
            <SlotBorder initialHeight={46} />
            <SlotBorder initialHeight={46} />
          </View>

          <View style={baseStyles.spacer} />

          {/* Плитки слов */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['She', 'enjoys', 'reading', 'books'].map(word => (
              <WordTile key={word} word={word} />
            ))}
          </View>

        </ScrollView>
      </Screen>

      <View style={{ paddingHorizontal: 22, paddingBottom: 90 }}>
        <Btn label="Check" onPress={() => {}} />
      </View>

      <NavBottom items={NAV_ITEMS} activeIndex={1} onPress={() => {}} />

    </View>
  );
}
```

### 8.4 Шаблон: Stats Screen (метрики + прогресс)

```tsx
// src/screens/StatsScreen.tsx

export function StatsScreen() {
  const { tokens } = useTheme();

  const metricValueStyle = useMemo(() => ({
    ...baseStyles.metricValue,
    color: tokens.accent,   // Правило 1: solid HEX на Text
  }), [tokens.accent]);

  return (
    <View style={{ flex: 1, position: 'relative' }}>

      <Screen edges={['top', 'bottom']}>  {/* standalone, без навигационного header */}
        <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>

          <Text style={baseStyles.xl}>247</Text>
          <Text style={baseStyles.label}>phrases learned</Text>
          <View style={baseStyles.spacer} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[baseStyles.metric, { flex: 1 }]}>
              <Text style={metricValueStyle}>14</Text>
              <Text style={baseStyles.label}>streak days</Text>
            </View>
            <View style={[baseStyles.metric, { flex: 1 }]}>
              <Text style={metricValueStyle}>92%</Text>
              <Text style={baseStyles.label}>accuracy</Text>
            </View>
          </View>

          <View style={baseStyles.spacer} />
          <Text style={baseStyles.label}>Today's progress</Text>
          <ProgressBar progress={0.72} />

        </ScrollView>
      </Screen>

      <NavBottom items={NAV_ITEMS} activeIndex={2} onPress={() => {}} />

    </View>
  );
}
```

---

## Раздел 9 — Зависимости

```json
{
  "expo-linear-gradient": "~15.0.8",
  "expo-blur": "~15.0.8",
  "react-native-svg": "^15.x",
  "react-native-safe-area-context": "^4.x",
  "react-native-reanimated": "~4.1.1"
}
```

Опционально для цветного glow на Android:
```json
{
  "react-native-shadow-2": "^7.x"
}
```

---

## Раздел 10 — 15 запрещённых паттернов

| # | Запрещено | Причина | Правильно |
|---|-----------|---------|-----------|
| 1 | `shadowColor: 'rgba(...)'` | double-alpha → тень исчезает | `shadowColor: '#hexhex'` |
| 2 | `fontWeight: '500'` / `'600'` | нет файла шрифта → fallback Roboto | только `'400'` или `'700'` |
| 3 | `overflow:'hidden'` + `elevation` на одном View | тень обрезается на Android | двойной View: outer=shadow, inner=overflow |
| 4 | `borderStyle: 'dashed'` | не работает на Android | SVG Rect + strokeDasharray |
| 5 | `color` / `fontSize` на View | нет наследования в RN | только на Text |
| 6 | `marginHorizontal: 'auto'` | непредсказуемо в Yoga | `alignSelf: 'center'` |
| 7 | `<LinearGradient angle={135} useAngle>` | props от react-native-linear-gradient, не expo | `start/end` векторы |
| 8 | `StyleSheet.create({ color: tokens.accent })` | StyleSheet создаётся до инициализации темы | `useMemo` внутри компонента |
| 9 | `useSharedValue` / хук в `.map()` | нарушение Rules of Hooks | `useRef` с массивом `Animated.Value` |
| 10 | `ThemeProvider` внутри навигатора | key-изменение пересоздаёт поддерево | ThemeProvider только на уровне App |
| 11 | `width: '${n}%'` для ProgressBar fill | вычисляется в 0 без фиксированной ширины родителя | `flex: progress` + `flex: 1-progress` |
| 12 | `SafeAreaView edges={['top','bottom']}` внутри Stack | двойной padding сверху | `edges={['bottom']}` или `edges={[]}` |
| 13 | Btn / Orb / NavBottom внутри Screen | elevation обрезается overflow:'hidden' | вне Screen в JSX |
| 14 | NavBottom не последний в JSX | перекрывается другими элементами | NavBottom всегда последний |
| 15 | `useNativeDriver: true` для `height` / `width` / `elevation` | эти свойства не поддерживаются native driver | `useNativeDriver: false` для layout-свойств |

---

## Раздел 11 — Чеклист перед сдачей UI (30 пунктов)

### Платформа и рендеринг
- [ ] 1. `shadowColor` везде — только solid HEX, нет rgba
- [ ] 2. `fontWeight` — только `'400'` или `'700'`, нет `'500'`/`'600'`
- [ ] 3. Каждый View с `overflow:'hidden'` И elevation — разбит на двойной View
- [ ] 4. Нет `borderStyle: 'dashed'` — заменено на SVG компонент
- [ ] 5. `color`/`fontSize`/`fontWeight` — только на Text, не на View
- [ ] 6. Нет `marginHorizontal: 'auto'` — заменено на `alignSelf: 'center'`
- [ ] 7. LinearGradient использует `start`/`end`, не `angle`/`useAngle`

### Тема и стили
- [ ] 8. Нет `StyleSheet.create` с токенами темы — только `useMemo` в компонентах
- [ ] 9. Все динамические стили обёрнуты в `useMemo` с правильными зависимостями
- [ ] 10. `ThemeProvider` смонтирован на уровне App, снаружи `NavigationContainer`
- [ ] 11. `accentSoft`/`btnGlow` (rgba) — НИКОГДА не в `shadowColor`
- [ ] 12. Все `useMemo` стилей имеют правильный dep array (не `[tokens]` если нужен только `tokens.accent`)

### JSX структура
- [ ] 13. Btn смонтирован ВОВНЕ Screen
- [ ] 14. Orb смонтирован ВОВНЕ Screen
- [ ] 15. NavBottom смонтирован ВОВНЕ Screen
- [ ] 16. NavBottom — последний элемент в JSX (наивысший Z-order)
- [ ] 17. Корневой View имеет `position: 'relative'` если есть абсолютные дочерние
- [ ] 18. `contentContainerStyle` ScrollView имеет `paddingBottom: 90` (или больше) если есть NavBottom
- [ ] 19. Контейнер Btn имеет `paddingBottom: 90` если перед NavBottom

### Навигация и SafeAreaView
- [ ] 20. Screen внутри Stack-навигатора использует `edges={[]}` или `edges={['bottom']}`
- [ ] 21. Standalone Screen использует `edges={['top','bottom']}`

### Анимация
- [ ] 22. Анимация `height`/`width`/`elevation`/`borderColor` использует `useNativeDriver: false`
- [ ] 23. Анимация `transform`/`opacity` использует `useNativeDriver: true`
- [ ] 24. Нет `useSharedValue`/хуков в `.map()` — только `useRef` с массивом
- [ ] 25. Все анимационные loops останавливаются в cleanup `useEffect`

### Accessibility
- [ ] 26. Все кнопки имеют `accessibilityRole="button"` и `accessibilityLabel`
- [ ] 27. WaveBar имеет `accessibilityElementsHidden`
- [ ] 28. Orb имеет `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`
- [ ] 29. ProgressBar имеет `accessibilityRole="progressbar"` + `accessibilityValue`
- [ ] 30. NavBottom items имеют `accessibilityRole="tab"` + `accessibilityState={{ selected }}`

---

## Раздел 12 — Быстрый справочник правильного кода

### Shadow (правильно vs запрещено)

```typescript
// ПРАВИЛЬНО
const cardStyle = useMemo(() => ({
  shadowColor: tokens.accent,    // solid HEX
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.09,
  shadowRadius: 38,
  elevation: 8,
}), [tokens.accent]);

// ЗАПРЕЩЕНО
const cardStyle = {
  shadowColor: tokens.btnGlow,   // rgba — double-alpha!
  shadowColor: 'rgba(34,246,238,0.28)',  // rgba — тень исчезает!
};
```

### FontWeight (правильно vs запрещено)

```typescript
// ПРАВИЛЬНО
fontWeight: '700'  // Bold файл шрифта существует
fontWeight: '400'  // Regular файл шрифта существует
// без fontWeight — берётся Regular по умолчанию

// ЗАПРЕЩЕНО
fontWeight: '600'  // файла нет → fallback Roboto на Android
fontWeight: '500'  // файла нет → fallback Roboto на Android
```

### Dynamic styles (правильно vs запрещено)

```typescript
// ПРАВИЛЬНО — useMemo с dep array
function Card() {
  const { tokens } = useTheme();
  const style = useMemo(() => ({
    borderColor: tokens.accentSoft,
    shadowColor: tokens.accent,
  }), [tokens.accent, tokens.accentSoft]);  // точные зависимости
  return <View style={style} />;
}

// ЗАПРЕЩЕНО — StyleSheet.create с токенами
const style = StyleSheet.create({
  card: {
    borderColor: tokens.accentSoft,  // tokens неизвестен при инициализации модуля
  }
});
```

### LinearGradient (правильно vs запрещено)

```tsx
// ПРАВИЛЬНО — expo-linear-gradient
import { LinearGradient } from 'expo-linear-gradient';
<LinearGradient
  colors={tokens.button}
  start={{ x: 0.15, y: 0 }}
  end={{ x: 0.85, y: 1 }}
  style={StyleSheet.absoluteFill}
/>

// ЗАПРЕЩЕНО — angle prop не существует в expo-linear-gradient
<LinearGradient
  colors={tokens.button}
  angle={135}
  useAngle
  style={StyleSheet.absoluteFill}
/>
```

### JSX порядок (правильно vs запрещено)

```tsx
// ПРАВИЛЬНО — элементы с elevation вне Screen
<View style={{ flex: 1, position: 'relative' }}>
  <Screen edges={[]}>
    {/* контент без elevation */}
    <Text style={baseStyles.phrase}>...</Text>
    <BigCard>...</BigCard>
  </Screen>
  <View style={{ paddingHorizontal: 22, paddingBottom: 90 }}>
    <Btn label="Continue" onPress={() => {}} />   {/* вне Screen */}
  </View>
  <Orb />           {/* вне Screen */}
  <NavBottom ... />  {/* последний */}
</View>

// ЗАПРЕЩЕНО — elevation-элементы внутри Screen
<Screen>
  <Btn label="Continue" onPress={() => {}} />   {/* elevation обрезается! */}
  <Orb />           {/* elevation обрезается! */}
  <NavBottom ... />  {/* перекрывается другими */}
</Screen>
```

### Анимация хуков (правильно vs запрещено)

```typescript
// ПРАВИЛЬНО — useRef с массивом для нескольких Animated.Value
const animValues = useRef(
  BAR_HEIGHTS.map(h => new Animated.Value(h))
).current;

// ЗАПРЕЩЕНО — хук внутри .map() нарушает Rules of Hooks
const animValues = BAR_HEIGHTS.map(h => useRef(new Animated.Value(h)).current);
```

### NativeDriver (правильно vs запрещено)

```typescript
// ПРАВИЛЬНО
// transform и opacity — native driver true
Animated.timing(scaleAnim, { toValue: 1.1, useNativeDriver: true })
Animated.timing(opacityAnim, { toValue: 0, useNativeDriver: true })

// layout свойства — native driver false (иначе ошибка в runtime)
Animated.timing(heightAnim,    { toValue: 50, useNativeDriver: false })
Animated.timing(elevationAnim, { toValue: 8,  useNativeDriver: false })
Animated.timing(borderColor,   { toValue: 1,  useNativeDriver: false })
```
