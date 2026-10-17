/**
 * Общие элементы «Панели» раздела «Мои ошибки» (макет docs/design/v2-app/mistakes-panel.html, вариант Б, одобрен владельцем 04.10).
 *
 * зачем (владелец: «1 в 1, без малейших потерь»): размеры взяты замером макета (430×932): кнопка «назад» 42, заголовок 40/46,
 * кольцо 236 (толщина 16) и малое 150 (12), ленты-фильтры высотой 38, панель радиусом 24 с рядами от 64, кнопка 52.
 * Границ и кромок нет (владелец 12.10, стиль «Тень»): плашку отделяют градиент 180° и тень — components/v2/ShadowSurface.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import Svg, { Circle } from 'react-native-svg';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { DebugLogger } from '../../app/debug-logger';
import { useTheme } from '../ThemeContext';

import { useLv2Glass, type Lv2Glass } from '../learning-v2/LearningV2Glass';
import { LinearGradient } from '../SafeLinearGradient';
import { mpColors } from './panelPaint';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../v2/ShadowSurface';
import { shadowSheetPlateTokens } from '../v2/shadow_sheet_paint';
import { GlassRim } from './GlassRim';

/** `.ph .rb` (cards-glass.css): фон круглой кнопки — 7 % от цвета текста темы (в светлой теме тоже виден). */
export function glassButtonFill(g: Lv2Glass): string {
  return g.text.length === 7 ? `${g.text}12` : g.opaqueControl;
}

export const BackButton = memo(function BackButton({ g, onPress, label }: Readonly<{ g: Lv2Glass; onPress: () => void; label: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <Pressable
      testID="mp-back"
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      // зачем (Сверка mistakes-panel-007, cards-glass.css .ph .rb): круглая кнопка — стекло 7 % поверх шапки, а не сплошной тёмный круг.
      style={({ pressed }) => [styles.back, { backgroundColor: glassButtonFill(g) }, pressed && styles.pressed]}>
      <Ionicons name="chevron-back" size={20} color={g.text} />
      <GlassRim radius={21} />
    </Pressable>
  );
});

export const ScreenTitle = memo(function ScreenTitle({ g, text }: Readonly<{ g: Lv2Glass; text: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" style={[styles.title, { color: g.text }]}>{text}</Text>;
});

/** Кольцо прогресса: большое 236 (хаб, итог) и малое 150 (вход). Внутри — центр (проценты и подпись). */
export const PanelRing = memo(function PanelRing({ g, progress, big = true, children }: Readonly<{ g: Lv2Glass; progress: number; big?: boolean; children?: React.ReactNode }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const size = big ? 236 : 150;
  const r = big ? 100 : 62;
  const w = big ? 16 : 12;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.ring, { width: size, height: size }, big && styles.ringBig]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={g.line} strokeWidth={w} />
        {p > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={g.accentGraphic} // зачем (светлый акцент): кольцо — графика, берёт accentGraphic
            strokeWidth={w}
            strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">{children}</View>
    </View>
  );
});

export type PanelChip = Readonly<{ id: string; label: string }>;

/** Лента-фильтр: чипы 38 высотой, активный на цвете акцента; лента листается вбок и уходит за край экрана, как в макете. */
export const FilterChips = memo(function FilterChips({ g, chips, activeId, onChange, testIDPrefix }: Readonly<{ g: Lv2Glass; chips: readonly PanelChip[]; activeId: string; onChange: (id: string) => void; testIDPrefix: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips} decelerationRate="fast">
      {/* guard-ok: лента из 3–5 коротких чипов, виртуализация не нужна */ chips.map((chip) => {
        const on = chip.id === activeId;
        return (
          <Pressable
            key={chip.id}
            testID={`${testIDPrefix}-${chip.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(chip.id)}
            style={({ pressed }) => [styles.chip, { backgroundColor: on ? g.accent : g.hairlineSoft }, pressed && styles.pressed]}>
            <Text style={[styles.chipText, { color: on ? g.accentInk : g.secondary }]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

/** Панель: одна карточка-список — плашка стиля «Тень» (градиент 180° и тень, без кольца). */
export const Panel = memo(function Panel({ g, children, style }: Readonly<{ g: Lv2Glass; children: React.ReactNode; style?: StyleProp<ViewStyle> }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <View style={[styles.panel, { boxShadow: plateBoxShadow(g) }, style]}>
      <PlateFill g={g} radius={24} />
      {children}
    </View>
  );
});

/** Три полоски прогресса дней (14×6): закрашены те, что уже «верные». */
export const MiniDots = memo(function MiniDots({ g, n }: Readonly<{ g: Lv2Glass; n: number }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <View style={styles.mini}>
      {/* guard-ok: ровно три полоски */ [0, 1, 2].map((i) => <View key={i} style={[styles.miniDot, { backgroundColor: i < n ? g.accentGraphic : g.glassEdge }]} />)}
    </View>
  );
});

/** Ряд панели: слово 18/700, под ним перевод 14, справа — произвольное (полоски, число). Между рядами — тонкая линия. */
export const PanelRow = memo(function PanelRow({ g, title, subtitle, right, first, onPress, testID, danger }: Readonly<{ g: Lv2Glass; title: string; subtitle?: string | null; right?: React.ReactNode; first?: boolean; onPress?: () => void; testID?: string; danger?: boolean }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const body = (
    <>
      {first ? null : <View pointerEvents="none" style={[styles.rowLine, { backgroundColor: g.hairlineSoft }]} />}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: danger ? mpColors(g).bad : g.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: g.secondary }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </>
  );
  return onPress ? (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{body}</Pressable>
  ) : (
    <View testID={testID} style={styles.row}>{body}</View>
  );
});

/** Главная кнопка: 52 высотой, цвет акцента, внутренняя подсветка сверху и свечение снизу (как «ac-cta» макета). */
export const PanelCta = memo(function PanelCta({ g, label, onPress, testID, disabled, flex, ghost, trailing }: Readonly<{ g: Lv2Glass; label: string; onPress: () => void; testID?: string; disabled?: boolean; flex?: boolean; ghost?: boolean; trailing?: React.ReactNode }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        flex && styles.ctaFlex,
        ghost
          ? { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g) }
          : { backgroundColor: g.ctaFill, boxShadow: actionBoxShadow(g) },
        disabled && styles.ctaDisabled,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.ctaText, { color: ghost ? g.text : g.ctaFillInk }]}>{label}</Text>
      {trailing}
    </Pressable>
  );
});

/** Нижняя панель экрана: кнопки поверх плавного затемнения (макет «.bot2»). */
export const PanelDock = memo(function PanelDock({ children }: Readonly<{ children: React.ReactNode }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const insets = useStableSafeAreaInsets();
  // зачем (замечание владельца 10.10): затухание под кнопками — от фона темы, а не литерал под «Аврору»
  const g = useLv2Glass();
  // зачем (журнал 27, «подложка под кнопкой ВСЁ ЕЩЁ просвечивает»; правило «сперва логи»): ВРЕМЕННЫЙ лог [DOCK] — какой цвет и
  // откуда пришёл, где панель стоит в окне. После починки подробности убрать, оставить только ранние выходы и ошибки.
  const { liquidGlassThemeId } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const dockRef = useRef<View>(null);
  const gradientColors = [`${g.bgBottom}00`, `${g.bgBottom}FF`, `${g.bgBottom}FF`] as const;
  const onDockLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    const snapshot = {
      theme: liquidGlassThemeId, level: g.level, appearance: g.isLight ? 'light' : 'dark', intensity: g.intensity,
      bg: g.bg, bgTop: g.bgTop, bgBottom: g.bgBottom, bgEqualsBottom: g.bg === g.bgBottom,
      colors: gradientColors, locations: [0, 0.35, 1], colorsValid: gradientColors.every((c) => /^#[0-9A-Fa-f]{8}$/.test(c)),
      layout: { x, y, width, height }, window: { width: windowWidth, height: windowHeight }, insetBottom: insets.bottom,
    };
    DebugLogger.info('[DOCK]', `layout ${JSON.stringify(snapshot)}`);
    requestAnimationFrame(() => {
      dockRef.current?.measureInWindow?.((wx, wy, ww, wh) => {
        DebugLogger.info('[DOCK]', `window x=${Math.round(wx)} y=${Math.round(wy)} w=${Math.round(ww)} h=${Math.round(wh)} bottomGap=${Math.round(windowHeight - (wy + wh))}`);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidGlassThemeId, g.level, g.isLight, g.intensity, g.bg, g.bgTop, g.bgBottom, windowWidth, windowHeight, insets.bottom]);
  return (
    <View ref={dockRef} onLayout={onDockLayout} style={styles.dock} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="none"
        colors={gradientColors} // зачем (Сверка 06:07): под самой кнопкой фон сплошной (F2 пропускал строку списка); затухание вверх оставлено
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ paddingBottom: Math.max(20, insets.bottom + 12) }}>{children}</View>
    </View>
  );
});

/** Строка шторки-меню: плитка с иконкой и название (макет «.gl.opt»). */
export function SheetRow({ g, icon, title, danger, onPress, testID }: Readonly<{ g: Lv2Glass; icon: keyof typeof Ionicons.glyphMap; title: string; danger?: boolean; onPress: () => void; testID: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, { boxShadow: plateBoxShadow(g) }, pressed && styles.pressed]}>
      <PlateFill g={shadowSheetPlateTokens(g)} radius={20} />
      <View style={[styles.menuTile, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}>
        <Ionicons name={icon} size={20} color={danger ? mpColors(g).bad : g.text} />
      </View>
      <Text style={[styles.menuText, { color: danger ? mpColors(g).bad : g.text }]}>{title}</Text>
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  pressed: { opacity: 0.82 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 8, fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.6 },
  ring: { alignSelf: 'center' },
  ringBig: { marginTop: 14 },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  chipsScroll: { marginHorizontal: -20, flexGrow: 0, marginTop: 22, marginBottom: 8 },
  chips: { paddingHorizontal: 20, gap: 8 },
  chip: { minHeight: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  panel: { borderRadius: 24, paddingHorizontal: 18, paddingVertical: 4 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  rowSub: { marginTop: 2, fontSize: 13, lineHeight: 17 },
  mini: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  miniDot: { width: 14, height: 6, borderRadius: 3 },
  cta: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 24 },
  ctaFlex: { flex: 1 },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  menuRow: { minHeight: 62, marginTop: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingLeft: 10, paddingRight: 16 },
  menuTile: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 20 },
});
