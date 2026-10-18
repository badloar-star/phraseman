import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableHybrid from '../components/PressableHybrid';
import { settingsGlassCardStyle } from '../components/settings/SettingsGlassRows';
import { nestedBoxShadow } from '../components/v2/ShadowSurface';
import { ThemeSwatch } from '../components/settings/ThemeSwatch';
import { ThemeGlassSmoke } from '../components/v2/ThemeGlassSmoke';
import { RowDivider } from '../components/v2/RowDivider';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useTheme } from '../components/ThemeContext';
import { FlowText } from '../components/text-integrity/FlowText';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { useLineScale } from '../hooks/useLineScale';
import { triLang, type Lang } from '../constants/i18n';
import {
  LIQUID_GLASS_GRADIENT_THEME_IDS,
  liquidGlassTokens,
  releaseLiquidGlassTokenCacheExcept,
  type GlassTokens,
  type LiquidGlassAppearance,
  type LiquidGlassThemeId,
} from '../constants/liquidGlassThemePalette';
import { ThemeIntensitySlider } from '../components/settings/ThemeIntensitySlider';
import { useThemesMemLog } from '../components/settings/themesMemLog';
import { safeRouterBack } from './navigation_back';
import { DebugLogger } from './debug-logger';
import { themeDisplayName, type ThemeDisplayName } from './theme_display_names';
import BackGlyph from '../components/v2/BackGlyph';

// зачем (PM-064, D38/D45): полка тем «за жемчуг» опустела ещё 2026-09-13 —
// модалка покупки темы за жемчуг удалена целиком (D45).

// зачем (владелец 2026-09-30, макет themes-v2-proposals.html → «Темы»):
// справа от заголовка луна и солнце без текста (тёмное / светлое, «Как в системе» убрано),
// ниже ползунок насыщенности (владелец 2026-10-04: три кнопки «Спокойно / Акцент / Максимум»
// заменены одним ползунком), затем одна стеклянная карточка с 13 темами.
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

const GRADIENT_OPTIONS: ThemeOption[] = LIQUID_GLASS_GRADIENT_THEME_IDS.map(mode => ({ mode }));

// Только для экранного диктора: у ползунка нет видимой подписи (владелец: «только ползунок»).
const INTENSITY_LABEL: ThemeDisplayName = {
  ru: 'Насыщенность цвета', uk: 'Насиченість кольору', en: 'Color intensity', es: 'Intensidad del color',
  'pt-BR': 'Intensidade da cor', vi: 'Độ đậm màu', id: 'Intensitas warna', tr: 'Renk yoğunluğu', pl: 'Intensywność koloru',
};

const APPEARANCE_OPTIONS: ReadonlyArray<Readonly<{ key: LiquidGlassAppearance; icon: 'moon' | 'sunny'; label: ThemeDisplayName }>> = [
  { key: 'dark', icon: 'moon', label: { ru: 'Тёмное оформление', uk: 'Темне оформлення', en: 'Dark appearance', es: 'Apariencia oscura', 'pt-BR': 'Aparência escura', vi: 'Giao diện tối', id: 'Tampilan gelap', tr: 'Koyu görünüm', pl: 'Ciemny wygląd' } },
  { key: 'light', icon: 'sunny', label: { ru: 'Светлое оформление', uk: 'Світле оформлення', en: 'Light appearance', es: 'Apariencia clara', 'pt-BR': 'Aparência clara', vi: 'Giao diện sáng', id: 'Tampilan terang', tr: 'Açık görünüm', pl: 'Jasny wygląd' } },
];

/**
 * Вид выбранного сегмента/значка (стиль «Тень», владелец 12.10 — без кромки): тёмное «Спокойно» — приподнятый тон плашки;
 * тёмные «Акцент/Максимум» — капсула цвета темы; светлое — белая плашка; у всех малая тень вложенного.
 */
function selectedChip(glass: GlassTokens): { box: ViewStyle; ink: string } {
  if (glass.isLight) {
    return {
      box: {
        backgroundColor: glass.level === 'calm' ? glass.opaqueCard : glass.accentSoft,
        boxShadow: nestedBoxShadow(glass),
      },
      ink: glass.level === 'calm' ? glass.text : glass.accentTextSafe,
    };
  }
  if (glass.level === 'calm') {
    return { box: { backgroundColor: glass.raisedFillFrom, boxShadow: nestedBoxShadow(glass) }, ink: glass.text };
  }
  return { box: { backgroundColor: `${glass.accentCap}38`, boxShadow: nestedBoxShadow(glass) }, ink: glass.accentBright };
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
            style={[styles.modeItem, selected ? on.box : null]}
          >
            <Ionicons name={selected ? opt.icon : `${opt.icon}-outline`} size={19} color={selected ? on.ink : glass.secondary} />
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
  // зачем (FONTSCALE2, 05.10): межстрочный растёт с системным шрифтом — иначе низ букв срезается; при 1.0 значение прежнее.
  const lh = useLineScale();
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
      contentStyle={styles.row}
    >
      {first ? null : <RowDivider color={glass.dividerTone} />}
      <ThemeSwatch id={option.mode} vivid={vivid} />
      <View style={styles.rowText}>
        {/* зачем: FlowText намеренно не принимает numberOfLines (text-integrity: без усечений) —
            длинное имя темы переносится, а не режется троеточием. */}
        <FlowText testID={`theme-tile-name-${option.mode}`} provenance="authored" style={[styles.rowName, { color: glass.text, lineHeight: lh(styles.rowName.lineHeight) }]}>{label}</FlowText>
      </View>
      <View style={[styles.radio, { borderColor: applied ? mark : glass.glassEdge }]}>{/* shadow-ok: кольцо радио — индикатор выбора, не контейнер */}
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
    liquidGlassIntensity,
    setLiquidGlassIntensity,
    setPreviewLiquidGlassIntensity,
    liquidGlassAppearance,
    setLiquidGlassAppearance,
  } = useTheme();
  const { lang } = useLang();
  const lh = useLineScale();

  // зачем: примерки больше нет, но старая примерка (если осталась с прошлой версии
  // экрана) не должна пережить уход — всегда возвращаем применённую тему.
  useEffect(() => () => setPreviewLiquidGlassThemeId(null), [setPreviewLiquidGlassThemeId]);
  // зачем: превью интенсивности не должно пережить уход с экрана посреди жеста.
  useEffect(() => () => setPreviewLiquidGlassIntensity(null), [setPreviewLiquidGlassIntensity]);

  /** Тап по теме = применить сразу (optimistic: state мгновенно, диск догоняет фоном) + ачивка. */
  const onRowPress = useCallback((mode: LiquidGlassThemeId) => {
    if (mode === appliedLiquidGlassThemeId) return;
    // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
    setLiquidGlassThemeId(mode);
    // зачем: ачивка — только за НАСТОЯЩУЮ смену темы.
    void (async () => {
      const { checkAchievements } = await import('./achievements');
      void checkAchievements({ type: 'profile_theme_set' });
    })().catch((e: unknown) => {
      DebugLogger.error('settings_themes:achievement', e instanceof Error ? e : new Error(String(e)), 'warning');
    });
  }, [appliedLiquidGlassThemeId, setLiquidGlassThemeId]);

  const onAppearance = useCallback((appearance: LiquidGlassAppearance) => {
    if (appearance === liquidGlassAppearance) return;
    hapticTap();
    setLiquidGlassAppearance(appearance);
  }, [liquidGlassAppearance, setLiquidGlassAppearance]);

  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  const vivid = liquidGlassIntensity > 0;
  // зачем (запрос координатора 15.10, +52 МБ): при уходе с экрана тем освобождаем кэш токенов всех чужих тем (они пересчитаются по требованию); активная остаётся — идентичность токенов не меняется.
  const activeThemeRef = useRef(liquidGlassThemeId);
  activeThemeRef.current = liquidGlassThemeId;
  useEffect(() => () => {
    const freed = releaseLiquidGlassTokenCacheExcept(activeThemeRef.current);
    console.log('[THEMES-MEM] уход с экрана: освобождены токены чужих тем', JSON.stringify({ freed, active: activeThemeRef.current })); // guard-ok: итог освобождения кэша
  }, []);
  // зачем (запрос координатора 15.10, +52 МБ за 65 с): лог памяти экрана — сколько превью смонтировано и как растут кэши и куча
  useThemesMemLog({
    themeId: liquidGlassThemeId, appearance: liquidGlassAppearance, intensity: liquidGlassIntensity,
    swatches: THEME_OPTIONS.length + GRADIENT_OPTIONS.length,
    smokes: glass.level === 'max' && glass.cardSmoke && !glass.isLight ? 2 : 0,
  });
  // зачем (стиль «Тень»): тень списков даёт settingsGlassCardStyle (plateBoxShadow) — прежняя светлая shadow* здесь удвоила бы её.

  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <BouncyScrollView decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 20 /* зачем: паритет profile.html (13.10): поля экрана 20 */, paddingBottom: 24 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            <PressableHybrid
              testID="themes-back"
              accessibilityLabel={backLabel}
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)}
              variant="icon"
              withHaptic={false}
              withSound={false}
              style={{ width: 48, height: 44, alignSelf: 'flex-start', marginTop: 4 }}
              // зачем: паритет profile.html PRF-06 (13.10): «назад» — голый шеврон 21 без круга, как на соседних экранах настроек; область нажатия 48×44
              contentStyle={{ width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
            >
              <BackGlyph size={21} color={glass.text} />
            </PressableHybrid>
            <View style={styles.head}>
              <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" style={[styles.title, { color: glass.text, lineHeight: lh(styles.title.lineHeight) }]}>
                {triLang(lang, { ru: 'Темы', uk: 'Теми', en: 'Themes', es: 'Temas', 'pt-BR': 'Temas', vi: 'Chủ đề', id: 'Tema', tr: 'Temalar', pl: 'Motywy' })}
              </Text>
              <AppearanceToggle glass={glass} lang={lang} value={liquidGlassAppearance} onChange={onAppearance} />
            </View>
            <ThemeIntensitySlider
              glass={glass}
              themeId={liquidGlassThemeId}
              value={liquidGlassIntensity}
              label={triLang(lang, INTENSITY_LABEL) ?? 'Color intensity'}
              onPreview={setPreviewLiquidGlassIntensity}
              onCommit={setLiquidGlassIntensity}
            />
            <View
              accessibilityRole="radiogroup"
              style={[settingsGlassCardStyle(glass), styles.list]}
            >
              <ThemeGlassSmoke glass={glass} radius={20} />
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
            {/* зачем (владелец 2026-10-04): 10 градиентных тем ДОБАВЛЕНЫ к 13 — отдельной
                карточкой ниже, без подписи; набор берётся из одного списка-конфига. */}
            <View
              accessibilityRole="radiogroup"
              style={[settingsGlassCardStyle(glass), styles.list]}
            >
              <ThemeGlassSmoke glass={glass} radius={20} />
              {GRADIENT_OPTIONS.map((item, index) => (
                <ThemeRow
                  key={item.mode}
                  option={item}
                  label={themeDisplayName(item.mode, lang)}
                  applied={item.mode === appliedLiquidGlassThemeId}
                  first={index === 0}
                  vivid
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
  list: { flexDirection: 'column', alignItems: 'stretch', padding: 0, paddingVertical: 0, paddingHorizontal: 0, gap: 0, borderRadius: 20, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingVertical: 8, paddingLeft: 14, paddingRight: 16 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' }, // shadow-ok: кольцо радио — индикатор выбора, не контейнер; guard-ok: кольцо радио
  radioDot: { width: 12, height: 12, borderRadius: 6 },
});
