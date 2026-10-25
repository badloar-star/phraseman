import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import ScreenBackButton, { ScreenBackZone } from '../components/v2/ScreenBackButton';
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
import { useScrollToSelectedTheme } from './settings_themes_scroll';
import {
  isPremiumThemeId,
  premiumThemeById,
  type PremiumThemeProgress,
  type PremiumThemeProgressByCondition,
} from './premium_theme_catalog';
import {
  premiumThemeProgressLabel,
  premiumThemeProgressValue,
  premiumThemeRequirement,
  premiumThemeRequirementLabel,
} from './premium_theme_copy';
import { claimPremiumThemeCondition, primePremiumThemeEntitlements, usePremiumThemeEntitlements } from './premium_theme_entitlements';

// зачем (PM-064, D38/D45): полка тем «за жемчуг» опустела ещё 2026-09-13 —
// модалка покупки темы за жемчуг удалена целиком (D45).

// зачем (владелец 2026-09-30, макет themes-v2-proposals.html → «Темы»):
// справа от заголовка луна и солнце без текста (тёмное / светлое, «Как в системе» убрано),
// ниже ползунок насыщенности (владелец 2026-10-04: три кнопки «Спокойно / Акцент / Максимум»
// заменены одним ползунком), затем одна стеклянная карточка с 13 темами.
// Подписей «Оформление / Цвет» и блока предпросмотра НЕТ. Тап по теме применяет её сразу —
// экран перекрашивается в том же кадре, отдельной кнопки «Применить» больше нет.
// Обычные темы бесплатны. Шесть утверждённых наградных тем находятся внизу
// списка и открываются только проверенными сервером достижениями владельца.

type ThemeOption = { mode: LiquidGlassThemeId };

const THEME_OPTIONS: ThemeOption[] = [
  { mode: 'graphite' }, { mode: 'polar' }, { mode: 'slate' }, { mode: 'ink' },
  { mode: 'lavender' }, { mode: 'iris' }, { mode: 'rose' }, { mode: 'terracotta' },
  { mode: 'taupe' }, { mode: 'olive' }, { mode: 'sage' }, { mode: 'eucalyptus' },
  { mode: 'marine' },
];

const GRADIENT_OPTIONS: ThemeOption[] = LIQUID_GLASS_GRADIENT_THEME_IDS.map(mode => ({ mode }));
const STANDARD_GRADIENT_OPTIONS: ThemeOption[] = GRADIENT_OPTIONS.filter(({ mode }) => !isPremiumThemeId(mode));
const PREMIUM_GRADIENT_OPTIONS: ThemeOption[] = GRADIENT_OPTIONS.filter(({ mode }) => isPremiumThemeId(mode));

/** В какой карточке и на какой строке стоит тема (карточка «gradient» = особые + градиентные подряд). Нет нигде — null и строка журнала с причиной. */
function selectedCardOf(id: LiquidGlassThemeId): { card: 'main' | 'gradient'; rowCount: number; rowIndex: number } | null {
  const main = THEME_OPTIONS.findIndex((o) => o.mode === id);
  if (main >= 0) return { card: 'main', rowCount: THEME_OPTIONS.length, rowIndex: main };
  const gradientRows = [...PREMIUM_GRADIENT_OPTIONS, ...STANDARD_GRADIENT_OPTIONS];
  const grad = gradientRows.findIndex((o) => o.mode === id);
  if (grad >= 0) return { card: 'gradient', rowCount: gradientRows.length, rowIndex: grad };
  console.warn(`[THEMES-SCROLL] показанной темы нет в списках экрана ${JSON.stringify({ id, main: THEME_OPTIONS.length, gradient: gradientRows.length })}`); // guard-ok: причина «нет галочки» всегда видна
  return null;
}

// Visual parity fixture for emulator screenshots only. Production always uses the
// server-authoritative snapshot below; this branch is unreachable in store builds.
const DEV_PREMIUM_PROGRESS: PremiumThemeProgressByCondition = Object.freeze({
  plus_purchase: Object.freeze({ current: 1, target: 1, unit: 'purchase' }),
  final_coin_rank: Object.freeze({ current: 19, target: 19, unit: 'rank' }),
  streak_365: Object.freeze({ current: 365, target: 365, unit: 'days' }),
  final_spire: Object.freeze({ current: 11, target: 11, unit: 'tier' }),
  video_200_hours: Object.freeze({ current: 200, target: 200, unit: 'hours' }),
  learning_v2_complete: Object.freeze({ current: 1792, target: 1792, unit: 'sessions' }),
});

// Даже при временно недоступном сервере условие остаётся понятным: показываем
// нулевую точку и цель вместо технического текста «прогресс недоступен».
const FALLBACK_PREMIUM_PROGRESS: PremiumThemeProgressByCondition = Object.freeze({
  plus_purchase: Object.freeze({ current: 0, target: 1, unit: 'purchase' }),
  final_coin_rank: Object.freeze({ current: 0, target: 19, unit: 'rank' }),
  streak_365: Object.freeze({ current: 0, target: 365, unit: 'days' }),
  final_spire: Object.freeze({ current: 0, target: 11, unit: 'tier' }),
  video_200_hours: Object.freeze({ current: 0, target: 200, unit: 'hours' }),
  learning_v2_complete: Object.freeze({ current: 0, target: 1792, unit: 'sessions' }),
});

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
  available: boolean;
  expanded: boolean;
  progress: PremiumThemeProgress | null;
  lang: Lang;
  onPress: (mode: LiquidGlassThemeId) => void;
  onLockedPress: (mode: LiquidGlassThemeId) => void;
  glass: GlassTokens;
};

const ThemeRow = memo(function ThemeRow({ option, label, applied, first, vivid, available, expanded, progress, lang, onPress, onLockedPress, glass }: ThemeRowProps) {
  // Радио выбранной темы: в «Спокойно» — нейтральное (белое в тёмном, чернильное в светлом),
  // в «Акценте/Максимуме» — цвет темы.
  const mark = glass.level === 'calm' ? (glass.isLight ? glass.text : glass.lightTint) : glass.accentBorder;
  // зачем (FONTSCALE2, 05.10): межстрочный растёт с системным шрифтом — иначе низ букв срезается; при 1.0 значение прежнее.
  const lh = useLineScale();
  const premium = premiumThemeById(option.mode);
  const percent = progress ? Math.max(0, Math.min(100, Math.round((progress.current / progress.target) * 100))) : 0;
  const accessibilityLabel = available || !premium
    ? label
    : `${label}. ${premiumThemeRequirement(premium.id, lang)}. ${progress ? premiumThemeProgressValue(progress, lang) : ''}`;
  return (
    <View>
      {first ? null : <RowDivider color={glass.dividerTone} />}
      <PressableHybrid
        testID={`theme-tile-${option.mode}`}
        accessibilityRole={available ? 'radio' : 'button'}
        accessibilityState={available ? { selected: applied, checked: applied } : { expanded }}
        accessibilityLabel={accessibilityLabel}
        onPress={() => { if (available) onPress(option.mode); else onLockedPress(option.mode); }}
        withHaptic={false}
        withSound={false}
        variant="card"
        contentStyle={styles.row}
      >
        <ThemeSwatch id={option.mode} vivid={vivid} />
        <View style={styles.rowText}>
          {/* зачем: FlowText намеренно не принимает numberOfLines (text-integrity: без усечений) —
              длинное имя темы переносится, а не режется троеточием. */}
          <FlowText testID={`theme-tile-name-${option.mode}`} provenance="authored" style={[styles.rowName, { color: glass.text, lineHeight: lh(styles.rowName.lineHeight) }]}>{label}</FlowText>
        </View>
        {available ? <View style={[styles.radio, { borderColor: applied ? mark : glass.glassEdge }]}>{/* shadow-ok: кольцо радио — индикатор выбора, не контейнер */}
          {applied ? <View style={[styles.radioDot, { backgroundColor: mark }]} /> : null}
        </View> : (
          <View style={styles.lockCluster}>
            <Ionicons name="lock-closed" size={18} color={glass.secondary} />
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={glass.secondary} />
          </View>
        )}
      </PressableHybrid>
      {!available && expanded && premium ? (
        <View
          testID={`theme-tile-details-${option.mode}`}
          style={[styles.rewardDetails, { backgroundColor: glass.opaqueControl }]}
        >
          <FlowText testID={`theme-tile-requirement-label-${option.mode}`} provenance="authored" style={[styles.detailLabel, { color: glass.secondary }]}>
            {premiumThemeRequirementLabel(lang)}
          </FlowText>
          <FlowText testID={`theme-tile-requirement-${option.mode}`} provenance="authored" style={[styles.detailValue, { color: glass.text, lineHeight: lh(styles.detailValue.lineHeight) }]}>
            {premiumThemeRequirement(premium.id, lang)}
          </FlowText>
          <View style={styles.progressHead}>
            <FlowText testID={`theme-tile-progress-label-${option.mode}`} provenance="authored" style={[styles.detailLabel, { color: glass.secondary }]}>
              {premiumThemeProgressLabel(lang)}
            </FlowText>
            <FlowText testID={`theme-tile-progress-value-${option.mode}`} provenance="authored" style={[styles.progressValue, { color: glass.text }]}>
              {progress ? premiumThemeProgressValue(progress, lang) : ''}
            </FlowText>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: glass.glassEdge }]}>
            <View style={[styles.progressFill, { backgroundColor: glass.accentBorder, width: `${percent}%` as `${number}%` }]} />
          </View>
        </View>
      ) : null}
    </View>
  );
});

export default function SettingsThemes() {
  const router = useRouter();
  const {
    liquidGlassThemeId,
    setPreviewLiquidGlassThemeId,
    setLiquidGlassThemeId,
    isLiquidGlassThemeAvailable,
    liquidGlassIntensity,
    setLiquidGlassIntensity,
    setPreviewLiquidGlassIntensity,
    liquidGlassAppearance,
    setLiquidGlassAppearance,
  } = useTheme();
  const { lang } = useLang();
  const premiumEntitlements = usePremiumThemeEntitlements();
  // зачем (11 · РЕВИЗОР 24.10, Firebase-экономия): права на особые темы на старте берутся из кэша телефона (сеть раз в 12 ч); на экране «Темы» — обновляем, если старше 10 мин
  useEffect(() => { void primePremiumThemeEntitlements({ maxAgeMs: 10 * 60 * 1000 }); }, []);
  // Debug-сборка открывает все темы и показывает выполненные условия: это режим
  // визуальной сверки на эмуляторе. Store-сборка использует только серверные права.
  const devProgressPreview = __DEV__;
  const premiumProgressByCondition: PremiumThemeProgressByCondition = devProgressPreview
    ? DEV_PREMIUM_PROGRESS
    : Object.freeze({ ...FALLBACK_PREMIUM_PROGRESS, ...premiumEntitlements.progressByCondition });
  const [expandedPremiumTheme, setExpandedPremiumTheme] = useState<LiquidGlassThemeId | null>(null);
  const lh = useLineScale();
  // зачем (Сверка 24.10 через координатора: «выбранная тема „Затмение“ без галочки, журнал — „выбранной темы нет в списках“»): отмечается и прокручивается
  // тема, которую человек ВИДИТ (liquidGlassThemeId), а не сохранённый выбор: у того, кто ещё не выбирал, показана тема по умолчанию, а сохранённое
  // значение другое — галочки не было ни у одной строки.
  const shownThemeId = liquidGlassThemeId;
  // Экран всегда открывается сверху: особые темы должны быть первым видимым выбором (решение координатора 24.10 — витрина премиум-тем, задумка Codex).
  // Проверка, что показанная тема вообще есть в списках, остаётся — с журналом причины.
  useEffect(() => { selectedCardOf(shownThemeId); }, [shownThemeId]);
  const { scrollRef, onCardLayout, onScrollLayout, onContentSizeChange } = useScrollToSelectedTheme(null);
  const onMainCardLayout = useMemo(() => onCardLayout('main'), [onCardLayout]);
  const onGradientCardLayout = useMemo(() => onCardLayout('gradient'), [onCardLayout]);

  // зачем: примерки больше нет, но старая примерка (если осталась с прошлой версии
  // экрана) не должна пережить уход — всегда возвращаем применённую тему.
  useEffect(() => () => setPreviewLiquidGlassThemeId(null), [setPreviewLiquidGlassThemeId]);
  // зачем: превью интенсивности не должно пережить уход с экрана посреди жеста.
  useEffect(() => () => setPreviewLiquidGlassIntensity(null), [setPreviewLiquidGlassIntensity]);

  /** Тап по теме = применить сразу (optimistic: state мгновенно, диск догоняет фоном) + ачивка. */
  const onRowPress = useCallback((mode: LiquidGlassThemeId) => {
    if (mode === shownThemeId) return;
    // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
    setLiquidGlassThemeId(mode);
    // зачем: ачивка — только за НАСТОЯЩУЮ смену темы.
    void (async () => {
      const { checkAchievements } = await import('./achievements');
      void checkAchievements({ type: 'profile_theme_set' });
    })().catch((e: unknown) => {
      DebugLogger.error('settings_themes:achievement', e instanceof Error ? e : new Error(String(e)), 'warning');
    });
  }, [shownThemeId, setLiquidGlassThemeId]);

  const onAppearance = useCallback((appearance: LiquidGlassAppearance) => {
    if (appearance === liquidGlassAppearance) return;
    hapticTap();
    setLiquidGlassAppearance(appearance);
  }, [liquidGlassAppearance, setLiquidGlassAppearance]);

  const onLockedThemePress = useCallback((mode: LiquidGlassThemeId) => {
    const premium = premiumThemeById(mode);
    if (!premium) return;
    hapticTap();
    setExpandedPremiumTheme((current) => current === mode ? null : mode);
    // Тап одновременно освежает entitlement: если условие было выполнено между
    // фоновыми синхронизациями, тема откроется без перезапуска экрана.
    void claimPremiumThemeCondition(premium.condition);
  }, []);

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
          {/* зачем (ЗАМОК ВЛАДЕЛЬЦА 22.10 «кнопка в своём месте, не пересекается с другими элементами»): полоса кнопки до прокрутки — контент под круг не заезжает */}
          <ScreenBackZone />
          <BouncyScrollView ref={scrollRef} onLayout={onScrollLayout} onContentSizeChange={onContentSizeChange} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 20 /* зачем: паритет profile.html (13.10): поля экрана 20 */, paddingBottom: 24 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
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
            {/* Шесть особых тем стоят первыми. В debug они открыты для полной
                проверки; в store каждая остаётся под серверным условием. */}
            <View
              accessibilityRole="radiogroup"
              onLayout={onGradientCardLayout}
              style={[settingsGlassCardStyle(glass), styles.list]}
            >
              <ThemeGlassSmoke glass={glass} radius={20} />
              {PREMIUM_GRADIENT_OPTIONS.map((item, index) => {
                const premium = premiumThemeById(item.mode)!;
                return (
                  <ThemeRow
                    key={item.mode}
                    option={item}
                    label={themeDisplayName(item.mode, lang)}
                    applied={item.mode === shownThemeId}
                    first={index === 0}
                    vivid
                    available={__DEV__ || isLiquidGlassThemeAvailable(item.mode)}
                    expanded={expandedPremiumTheme === item.mode}
                    progress={premiumProgressByCondition[premium.condition] ?? null}
                    lang={lang}
                    onPress={onRowPress}
                    onLockedPress={onLockedThemePress}
                    glass={glass}
                  />
                );
              })}
              {STANDARD_GRADIENT_OPTIONS.map((item) => (
                <ThemeRow
                  key={item.mode}
                  option={item}
                  label={themeDisplayName(item.mode, lang)}
                  applied={item.mode === shownThemeId}
                  first={false}
                  vivid
                  available // зачем (30.09 «ТЕМЫ ВСЕ ФРИ», координатор 24.10): обычные темы всегда доступны — замка у них быть не может
                  expanded={false}
                  progress={null}
                  lang={lang}
                  onPress={onRowPress}
                  onLockedPress={onLockedThemePress}
                  glass={glass}
                />
              ))}
            </View>
            <View
              accessibilityRole="radiogroup"
              onLayout={onMainCardLayout}
              style={[settingsGlassCardStyle(glass), styles.list]}
            >
              <ThemeGlassSmoke glass={glass} radius={20} />
              {THEME_OPTIONS.map((item, index) => (
                <ThemeRow
                  key={item.mode}
                  option={item}
                  label={themeDisplayName(item.mode, lang)}
                  applied={item.mode === shownThemeId}
                  first={index === 0}
                  vivid={vivid}
                  available // зачем (30.09 «ТЕМЫ ВСЕ ФРИ», координатор 24.10): обычные темы всегда доступны — замка у них быть не может
                  expanded={false}
                  progress={null}
                  lang={lang}
                  onPress={onRowPress}
                  onLockedPress={onLockedThemePress}
                  glass={glass}
                />
              ))}
            </View>
          </BouncyScrollView>
        </ContentWrap>
      </View>
      <ScreenBackButton screen="settings_themes" testID="themes-back" accessibilityLabel={backLabel} onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)} />
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
  lockCluster: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rewardDetails: { marginHorizontal: 12, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
  // зачем (D145 владельца: обычный текст — только 16 и 13; Ревизор 25.10, храповики шрифтов): строки условия премиум-темы из пакета Codex были 11/14/12
  detailLabel: { fontSize: 13, lineHeight: 17, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.55 },
  detailValue: { marginTop: 3, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  progressHead: { marginTop: 11, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  progressValue: { flexShrink: 1, textAlign: 'right', fontSize: 13, lineHeight: 17, fontWeight: '700' },
  progressTrack: { height: 6, marginTop: 7, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' }, // shadow-ok: кольцо радио — индикатор выбора, не контейнер; guard-ok: кольцо радио
  radioDot: { width: 12, height: 12, borderRadius: 6 },
});
