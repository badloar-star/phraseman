import React, { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableHybrid from '../components/PressableHybrid';
import { settingsGlassCardStyle } from '../components/settings/SettingsGlassRows';
import { ThemeSwatch } from '../components/settings/ThemeSwatch';
import { ThemeGlassSmoke } from '../components/v2/ThemeGlassSmoke';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useTheme } from '../components/ThemeContext';
import { FlowText } from '../components/text-integrity/FlowText';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import {
  LIQUID_GLASS_COLOR_LEVELS,
  liquidGlassTokens,
  type GlassTokens,
  type LiquidGlassAppearance,
  type LiquidGlassColorLevel,
  type LiquidGlassThemeId,
} from '../constants/liquidGlassThemePalette';
import { safeRouterBack } from './navigation_back';
import { DebugLogger } from './debug-logger';
import { themeDisplayName, type ThemeDisplayName } from './theme_display_names';
// зачем (PM-064, D38/D45): полка тем «за жемчуг» опустела ещё 2026-09-13 —
// модалка покупки темы за жемчуг удалена целиком (D45).

// зачем (владелец 2026-09-30, макет themes-v2-proposals.html → «Темы»):
// справа от заголовка луна и солнце без текста (тёмное / светлое, «Как в системе» убрано),
// ниже сегмент «Спокойно / Акцент / Максимум», затем одна стеклянная карточка с 13 темами.
// Подписей «Оформление / Цвет» и блока предпросмотра НЕТ. Тап по теме применяет её сразу —
// экран перекрашивается в том же кадре, отдельной кнопки «Применить» больше нет.
// Все темы бесплатны («ТЕМЫ ВСЕ ФРИ», владелец 30.09): ни замка, ни Plus, ни пейвола.

type ThemeOption = { mode: LiquidGlassThemeId };

const THEME_OPTIONS: ThemeOption[] = [
  { mode: 'graphite' }, { mode: 'polar' }, { mode: 'slate' }, { mode: 'ink' },
  { mode: 'lavender' }, { mode: 'iris' }, { mode: 'rose' }, { mode: 'terracotta' },
  { mode: 'taupe' }, { mode: 'olive' }, { mode: 'sage' }, { mode: 'eucalyptus' },
  { mode: 'marine' },
];

const LEVEL_LABELS: Readonly<Record<LiquidGlassColorLevel, ThemeDisplayName>> = {
  calm: { ru: 'Спокойно', uk: 'Спокійно', en: 'Calm', es: 'Calma', 'pt-BR': 'Calmo', vi: 'Dịu', id: 'Tenang', tr: 'Sakin', pl: 'Spokojnie' },
  accent: { ru: 'Акцент', uk: 'Акцент', en: 'Accent', es: 'Acento', 'pt-BR': 'Destaque', vi: 'Điểm nhấn', id: 'Aksen', tr: 'Vurgu', pl: 'Akcent' },
  max: { ru: 'Максимум', uk: 'Максимум', en: 'Max', es: 'Máximo', 'pt-BR': 'Máximo', vi: 'Tối đa', id: 'Maksimal', tr: 'Maksimum', pl: 'Maksimum' },
};

const APPEARANCE_OPTIONS: ReadonlyArray<Readonly<{ key: LiquidGlassAppearance; icon: 'moon' | 'sunny'; label: ThemeDisplayName }>> = [
  { key: 'dark', icon: 'moon', label: { ru: 'Тёмное оформление', uk: 'Темне оформлення', en: 'Dark appearance', es: 'Apariencia oscura', 'pt-BR': 'Aparência escura', vi: 'Giao diện tối', id: 'Tampilan gelap', tr: 'Koyu görünüm', pl: 'Ciemny wygląd' } },
  { key: 'light', icon: 'sunny', label: { ru: 'Светлое оформление', uk: 'Світле оформлення', en: 'Light appearance', es: 'Apariencia clara', 'pt-BR': 'Aparência clara', vi: 'Giao diện sáng', id: 'Tampilan terang', tr: 'Açık görünüm', pl: 'Jasny wygląd' } },
];

/**
 * Вид выбранного сегмента/значка по макету: тёмное «Спокойно» — светлая плашка стекла;
 * тёмные «Акцент/Максимум» — капсула цвета темы; светлое — белая плашка с тенью в тон темы.
 */
function selectedChip(glass: GlassTokens): { box: ViewStyle; ink: string } {
  if (glass.isLight) {
    return {
      box: {
        backgroundColor: glass.level === 'calm' ? glass.opaqueCard : glass.accentSoft,
        borderColor: glass.level === 'calm' ? glass.line : glass.accentCap, // guard-ok: 1px кромка 2.0 по макету
        shadowColor: glass.shadowTint, shadowOpacity: 1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
      },
      ink: glass.level === 'calm' ? glass.text : glass.accent,
    };
  }
  if (glass.level === 'calm') {
    return { box: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.14)' }, ink: glass.text }; // guard-ok: 1px кромка 2.0
  }
  return { box: { backgroundColor: `${glass.accentCap}38`, borderColor: `${glass.accentCap}4D` }, ink: glass.accentBright }; // guard-ok: 1px кромка 2.0
}

const AppearanceToggle = memo(function AppearanceToggle({ glass, lang, value, onChange }: {
  glass: GlassTokens; lang: Lang; value: LiquidGlassAppearance; onChange: (next: LiquidGlassAppearance) => void;
}) {
  const on = selectedChip(glass);
  return (
    <View accessibilityRole="radiogroup" style={[styles.modeToggle, { backgroundColor: glass.opaqueControl }]}>
      {APPEARANCE_OPTIONS.map(opt => {
        const selected = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            testID={`theme-appearance-${opt.key}`}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={triLang(lang, opt.label)}
            hitSlop={4}
            onPress={() => onChange(opt.key)}
            style={[styles.modeItem, selected ? [styles.chipOn, on.box] : null]}
          >
            <Ionicons name={selected ? opt.icon : `${opt.icon}-outline`} size={19} color={selected ? on.ink : glass.secondary} />
          </Pressable>
        );
      })}
    </View>
  );
});

const LevelSegment = memo(function LevelSegment({ glass, lang, value, onChange }: {
  glass: GlassTokens; lang: Lang; value: LiquidGlassColorLevel; onChange: (next: LiquidGlassColorLevel) => void;
}) {
  const on = selectedChip(glass);
  return (
    <View accessibilityRole="radiogroup" style={[styles.segment, { backgroundColor: glass.opaqueControl }]}>
      {LIQUID_GLASS_COLOR_LEVELS.map(level => {
        const selected = level === value;
        const label = triLang(lang, LEVEL_LABELS[level]);
        return (
          <Pressable
            key={level}
            testID={`theme-level-${level}`}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={label}
            onPress={() => onChange(level)}
            style={[styles.segmentItem, selected ? [styles.chipOn, on.box] : null]}
          >
            <Text style={[styles.segmentText, { color: selected ? (glass.isLight ? on.ink : glass.text) : glass.secondary }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

type ThemeRowProps = {
  option: ThemeOption;
  label: string;
  applied: boolean;
  first: boolean;
  vivid: boolean;
  onPress: (mode: LiquidGlassThemeId) => void;
  glass: GlassTokens;
};

const ThemeRow = memo(function ThemeRow({ option, label, applied, first, vivid, onPress, glass }: ThemeRowProps) {
  // Радио выбранной темы: в «Спокойно» — нейтральное (белое в тёмном, чернильное в светлом),
  // в «Акценте/Максимуме» — цвет темы.
  const mark = glass.level === 'calm' ? (glass.isLight ? glass.text : glass.lightTint) : glass.accentBorder;
  return (
    <PressableHybrid
      testID={`theme-tile-${option.mode}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: applied, checked: applied }}
      accessibilityLabel={label}
      onPress={() => onPress(option.mode)}
      withHaptic={false}
      withSound={false}
      variant="card"
      contentStyle={[styles.row, first ? null : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: glass.line }]}
    >
      <ThemeSwatch id={option.mode} vivid={vivid} />
      <View style={styles.rowText}>
        {/* зачем: FlowText намеренно не принимает numberOfLines (text-integrity: без усечений) —
            длинное имя темы переносится, а не режется троеточием. */}
        <FlowText testID={`theme-tile-name-${option.mode}`} provenance="authored" style={[styles.rowName, { color: glass.text }]}>{label}</FlowText>
      </View>
      <View style={[styles.radio, { borderColor: applied ? mark : glass.glassEdge }]}>{/* guard-ok: кольцо радио */}
        {applied ? <View style={[styles.radioDot, { backgroundColor: mark }]} /> : null}
      </View>
    </PressableHybrid>
  );
});

export default function SettingsThemes() {
  const router = useRouter();
  const {
    liquidGlassThemeId,
    appliedLiquidGlassThemeId,
    setPreviewLiquidGlassThemeId,
    setLiquidGlassThemeId,
    liquidGlassColorLevel,
    setLiquidGlassColorLevel,
    liquidGlassAppearance,
    setLiquidGlassAppearance,
  } = useTheme();
  const { lang } = useLang();

  // зачем: примерки больше нет, но старая примерка (если осталась с прошлой версии
  // экрана) не должна пережить уход — всегда возвращаем применённую тему.
  useEffect(() => () => setPreviewLiquidGlassThemeId(null), [setPreviewLiquidGlassThemeId]);

  /** Тап по теме = применить сразу (optimistic: state мгновенно, диск догоняет фоном) + ачивка. */
  const onRowPress = useCallback((mode: LiquidGlassThemeId) => {
    if (mode === appliedLiquidGlassThemeId) return;
    hapticTap();
    setLiquidGlassThemeId(mode);
    // зачем: ачивка — только за НАСТОЯЩУЮ смену темы.
    void (async () => {
      const { checkAchievements } = await import('./achievements');
      void checkAchievements({ type: 'profile_theme_set' });
    })().catch((e: unknown) => {
      DebugLogger.error('settings_themes:achievement', e instanceof Error ? e : new Error(String(e)), 'warning');
    });
  }, [appliedLiquidGlassThemeId, setLiquidGlassThemeId]);

  const onLevel = useCallback((level: LiquidGlassColorLevel) => {
    if (level === liquidGlassColorLevel) return;
    hapticTap();
    setLiquidGlassColorLevel(level);
  }, [liquidGlassColorLevel, setLiquidGlassColorLevel]);

  const onAppearance = useCallback((appearance: LiquidGlassAppearance) => {
    if (appearance === liquidGlassAppearance) return;
    hapticTap();
    setLiquidGlassAppearance(appearance);
  }, [liquidGlassAppearance, setLiquidGlassAppearance]);

  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  const vivid = liquidGlassColorLevel !== 'calm';
  const listShadow: ViewStyle | null = glass.isLight
    ? { shadowColor: glass.shadowTint, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 }
    : null;

  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <BouncyScrollView decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 24 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            <PressableHybrid
              testID="themes-back"
              accessibilityLabel={backLabel}
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)}
              variant="icon"
              withHaptic={false}
              withSound={false}
              style={{ width: 48, height: 48, alignSelf: 'flex-start', marginTop: 4 }}
              contentStyle={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, borderWidth: 1, borderColor: glass.glassEdge }} // guard-ok: 1px кромка 2.0
            >
              <Ionicons name="arrow-back" size={22} color={glass.lightTint} />
            </PressableHybrid>
            <View style={styles.head}>
              <Text accessibilityRole="header" style={[styles.title, { color: glass.text }]}>
                {triLang(lang, { ru: 'Темы', uk: 'Теми', en: 'Themes', es: 'Temas', 'pt-BR': 'Temas', vi: 'Chủ đề', id: 'Tema', tr: 'Temalar', pl: 'Motywy' })}
              </Text>
              <AppearanceToggle glass={glass} lang={lang} value={liquidGlassAppearance} onChange={onAppearance} />
            </View>
            <LevelSegment glass={glass} lang={lang} value={liquidGlassColorLevel} onChange={onLevel} />
            <View
              accessibilityRole="radiogroup"
              style={[settingsGlassCardStyle(glass), styles.list, listShadow]}
            >
              <ThemeGlassSmoke glass={glass} />
              {THEME_OPTIONS.map((item, index) => (
                <ThemeRow
                  key={item.mode}
                  option={item}
                  label={themeDisplayName(item.mode, lang)}
                  applied={item.mode === appliedLiquidGlassThemeId}
                  first={index === 0}
                  vivid={vivid}
                  onPress={onRowPress}
                  glass={glass}
                />
              ))}
            </View>
          </BouncyScrollView>
        </ContentWrap>
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  title: { flexShrink: 1, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  modeToggle: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: 22 },
  modeItem: { width: 42, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  // Тонкая 1px кромка выбранного сегмента — как в макете (разрешено в стиле 2.0).
  chipOn: { borderWidth: 1 }, // guard-ok: 1px кромка 2.0
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, marginTop: 20 },
  segmentItem: { flex: 1, minHeight: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segmentText: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  list: { flexDirection: 'column', alignItems: 'stretch', padding: 0, paddingVertical: 0, paddingHorizontal: 0, gap: 0, borderRadius: 20, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingVertical: 8, paddingLeft: 14, paddingRight: 16 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' }, // guard-ok: кольцо радио
  radioDot: { width: 12, height: 12, borderRadius: 6 },
});
