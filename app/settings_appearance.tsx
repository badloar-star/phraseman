// ═══════════════════════════════════════════════════════════════════════════
// settings_appearance.tsx — экран «Оформление»: Светлая/Тёмная + ползунки «Оттенок» и «Насыщенность» (флаг theme_sliders_v1).
//
// зачем (слово владельца через координатора 05.11: все темы заменяются на светлая/тёмная + оттенок + насыщенность (Plus); макет
// docs/work/mockups/theme_sliders_exact.html одобрен, «иконки добавлять не надо»): сегмент Светлая/Тёмная — всем, ползунки и «Вернуть стандартный» — только Plus;
// без Plus ползунки заперты и ведут в пейвол. Выбор = идентификатор tune:H:S в ThemeContext: превью при перетаскивании (setPreviewLiquidGlassThemeId, без записи),
// одна запись при отпускании (setLiquidGlassThemeId — локально сразу, на диск и в синк фоном, как у любой темы). Optimistic: вид меняется на каждом шаге до записи.
// Флаг выключен — экран пустой и сразу возвращает назад (глубокая ссылка не открывает недоделанное). Журнал: [THEME-SLIDERS].
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import BouncyScrollView from '../components/BouncyScrollView';
import ScreenGradient from '../components/ScreenGradient';
import ScreenBackButton, { ScreenBackZone } from '../components/v2/ScreenBackButton';
import V2SegmentedControl from '../components/v2/V2SegmentedControl';
import ContentWrap from '../components/ContentWrap';
import { settingsGlassCardStyle } from '../components/settings/SettingsGlassRows';
import { TuneSlider } from '../components/settings/TuneSlider';
import { useTheme } from '../components/ThemeContext';
import { usePremium } from '../components/PremiumContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens, type LiquidGlassAppearance } from '../constants/liquidGlassThemePalette';
import { oklchToHex } from '../constants/liquidGlassColor';
import { THEME_SLIDERS_V1_ENABLED } from '../constants/theme_sliders_flag';
import { THEME_TUNE_CMAX, THEME_TUNE_STANDARD, isThemeTuneStandard, normalizeThemeTune, parseThemeTuneId, themeTuneId, type ThemeTune } from '../constants/theme_tune';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { safeRouterBack } from './navigation_back';
import { openPremiumPaywall } from './paywall_navigation';

const LOG = '[THEME-SLIDERS]';
const HUE_MAX = 359;
const SAT_MAX = 100;

const T = {
  title: { ru: 'Оформление', uk: 'Оформлення', en: 'Appearance', es: 'Apariencia', 'pt-BR': 'Aparência', vi: 'Giao diện', id: 'Tampilan', tr: 'Görünüm', pl: 'Wygląd' },
  light: { ru: 'Светлая', uk: 'Світла', en: 'Light', es: 'Claro', 'pt-BR': 'Claro', vi: 'Sáng', id: 'Terang', tr: 'Açık', pl: 'Jasny' },
  dark: { ru: 'Тёмная', uk: 'Темна', en: 'Dark', es: 'Oscuro', 'pt-BR': 'Escuro', vi: 'Tối', id: 'Gelap', tr: 'Koyu', pl: 'Ciemny' },
  color: { ru: 'Цвет', uk: 'Колір', en: 'Color', es: 'Color', 'pt-BR': 'Cor', vi: 'Màu', id: 'Warna', tr: 'Renk', pl: 'Kolor' },
  hue: { ru: 'Оттенок', uk: 'Відтінок', en: 'Hue', es: 'Tono', 'pt-BR': 'Matiz', vi: 'Sắc độ', id: 'Rona', tr: 'Ton', pl: 'Odcień' },
  sat: { ru: 'Насыщенность', uk: 'Насиченість', en: 'Saturation', es: 'Saturación', 'pt-BR': 'Saturação', vi: 'Độ bão hòa', id: 'Saturasi', tr: 'Doygunluk', pl: 'Nasycenie' },
  reset: { ru: 'Вернуть стандартный', uk: 'Повернути стандартний', en: 'Reset to default', es: 'Restablecer', 'pt-BR': 'Restaurar padrão', vi: 'Đặt lại mặc định', id: 'Kembalikan standar', tr: 'Varsayılana dön', pl: 'Przywróć domyślne' },
} as const;

/** Спектр дорожки «Оттенок»: 13 остановок по кругу, светлота/цветность одни — читается на любой теме. */
const hueStops = (appearance: LiquidGlassAppearance): string[] => Array.from({ length: 13 }, (_, i) => oklchToHex(appearance === 'dark' ? 0.7 : 0.62, 0.14, i * 30));
/** Дорожка «Насыщенность»: от серого к полному цвету текущего оттенка. */
const satStops = (appearance: LiquidGlassAppearance, H: number): string[] => [oklchToHex(appearance === 'dark' ? 0.7 : 0.6, 0.004, H), oklchToHex(appearance === 'dark' ? 0.7 : 0.6, THEME_TUNE_CMAX, H)];

export default function SettingsAppearanceScreen(): React.JSX.Element | null {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { liquidGlassThemeId, liquidGlassAppearance, setLiquidGlassAppearance, setLiquidGlassThemeId, setPreviewLiquidGlassThemeId } = useTheme();
  const { hasPremiumAccess } = usePremium();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  // Применённая настройка: из темы-идентификатора; старая тема (до миграции) показывается как стандарт — ничего не выдумываем.
  const applied: ThemeTune = parseThemeTuneId(liquidGlassThemeId) ?? THEME_TUNE_STANDARD;
  const [draft, setDraft] = useState<ThemeTune | null>(null);
  const shown = draft ?? applied;
  const locked = !hasPremiumAccess;

  useEffect(() => {
    console.log(LOG, 'screen', JSON.stringify({ flag: THEME_SLIDERS_V1_ENABLED, themeId: String(liquidGlassThemeId), applied, plus: hasPremiumAccess, appearance: liquidGlassAppearance })); // guard-ok: один вход на экран
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!THEME_SLIDERS_V1_ENABLED) {
      console.warn(LOG, 'экран открыт при выключенном флаге — возврат назад'); // guard-ok: ранний выход называет причину
      safeRouterBack(router, '/(tabs)/settings' as never);
    }
  }, [router]);
  // зачем: превью не должно пережить уход с экрана посреди жеста — возвращаем применённую тему
  useEffect(() => () => setPreviewLiquidGlassThemeId(null), [setPreviewLiquidGlassThemeId]);

  const preview = useCallback((next: ThemeTune) => {
    setDraft(next);
    setPreviewLiquidGlassThemeId(themeTuneId(next));
  }, [setPreviewLiquidGlassThemeId]);
  const commit = useCallback((next: ThemeTune, why: string) => {
    const id = themeTuneId(next);
    console.log(LOG, 'commit', JSON.stringify({ why, from: String(liquidGlassThemeId), to: id, appearance: liquidGlassAppearance })); // guard-ok: одна строка на запись
    setPreviewLiquidGlassThemeId(null);
    setDraft(null);
    setLiquidGlassThemeId(id);
  }, [liquidGlassAppearance, liquidGlassThemeId, setLiquidGlassThemeId, setPreviewLiquidGlassThemeId]);

  const onHuePreview = useCallback((H: number) => preview(normalizeThemeTune({ H, S: shown.S })), [preview, shown.S]);
  const onHueCommit = useCallback((H: number) => commit(normalizeThemeTune({ H, S: shown.S }), 'hue'), [commit, shown.S]);
  const onSatPreview = useCallback((S: number) => preview(normalizeThemeTune({ H: shown.H, S })), [preview, shown.H]);
  const onSatCommit = useCallback((S: number) => commit(normalizeThemeTune({ H: shown.H, S }), 'saturation'), [commit, shown.H]);
  const onLockedPress = useCallback(() => {
    console.log(LOG, 'ползунок заперт без Plus — пейвол', JSON.stringify({ plus: hasPremiumAccess })); // guard-ok: причина перехода
    openPremiumPaywall(router as never, { context: 'generic', source: 'appearance_tune' });
  }, [hasPremiumAccess, router]);
  const onReset = useCallback(() => {
    if (locked) { onLockedPress(); return; }
    void hapticTap();
    commit(THEME_TUNE_STANDARD, 'reset');
  }, [commit, locked, onLockedPress]);
  const onAppearance = useCallback((next: LiquidGlassAppearance) => {
    if (next === liquidGlassAppearance) return;
    console.log(LOG, 'appearance', JSON.stringify({ from: liquidGlassAppearance, to: next })); // guard-ok: одна строка на смену
    setLiquidGlassAppearance(next);
  }, [liquidGlassAppearance, setLiquidGlassAppearance]);

  const hueGradient = useMemo(() => hueStops(liquidGlassAppearance), [liquidGlassAppearance]);
  const satGradient = useMemo(() => satStops(liquidGlassAppearance, shown.H), [liquidGlassAppearance, shown.H]);
  const segments = useMemo(() => [
    { key: 'light' as const, label: triLang(lang, T.light) },
    { key: 'dark' as const, label: triLang(lang, T.dark) },
  ], [lang]);
  const hueColor = oklchToHex(liquidGlassAppearance === 'dark' ? 0.7 : 0.62, 0.14, shown.H);
  const accentNow = glass.accentGraphic;
  const canReset = !isThemeTuneStandard(shown);

  if (!THEME_SLIDERS_V1_ENABLED) return null;
  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <ScreenBackZone />
          <BouncyScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" style={[styles.title, { color: glass.text }]}>{triLang(lang, T.title)}</Text>
            <View style={styles.segment}>
              <V2SegmentedControl segments={segments} value={liquidGlassAppearance} onChange={onAppearance} testID="appearance-segment" />
            </View>
            <View style={[settingsGlassCardStyle(glass), styles.card]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: glass.text }]}>{triLang(lang, T.color)}</Text>
                {locked ? <View testID="appearance-plus-tag" style={[styles.plusTag, { backgroundColor: glass.cta }]}><Text style={[styles.plusTagText, { color: glass.ctaInk }]}>Plus</Text></View> : null}
              </View>
              <View style={styles.sliderHead}>
                <Text style={[styles.sliderLabel, { color: glass.text }]}>{triLang(lang, T.hue)}</Text>
                <Text style={[styles.sliderValue, { color: glass.secondary }]}>{`${shown.H}°`}</Text>
              </View>
              <TuneSlider testID="appearance-hue" gradient={hueGradient} value={shown.H} max={HUE_MAX} thumbColor={hueColor} label={triLang(lang, T.hue)} valueText={`${shown.H}°`}
                locked={locked} onLockedPress={onLockedPress} onPreview={onHuePreview} onCommit={onHueCommit} />
              <View style={[styles.sliderHead, styles.sliderGap]}>
                <Text style={[styles.sliderLabel, { color: glass.text }]}>{triLang(lang, T.sat)}</Text>
                <Text style={[styles.sliderValue, { color: glass.secondary }]}>{`${shown.S} %`}</Text>
              </View>
              <TuneSlider testID="appearance-saturation" gradient={satGradient} value={shown.S} max={SAT_MAX} thumbColor={accentNow} label={triLang(lang, T.sat)} valueText={`${shown.S} %`}
                locked={locked} onLockedPress={onLockedPress} onPreview={onSatPreview} onCommit={onSatCommit} />
              <Pressable
                testID="appearance-reset"
                accessibilityRole="button"
                accessibilityState={{ disabled: !locked && !canReset }}
                disabled={!locked && !canReset}
                onPress={onReset}
                style={[styles.reset, { backgroundColor: glass.buttonFill, opacity: !locked && !canReset ? 0.45 : 1 }]}
              >
                <Text style={[styles.resetText, { color: glass.text }]}>{triLang(lang, T.reset)}</Text>
              </Pressable>
            </View>
          </BouncyScrollView>
        </ContentWrap>
      </View>
      <ScreenBackButton screen="settings_appearance" testID="appearance-back" accessibilityLabel={triLang(lang, T.title)} onPress={() => safeRouterBack(router, '/(tabs)/settings' as never)} />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { marginTop: 10, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
  segment: { marginTop: 16 },
  card: { marginTop: 16, padding: 16, borderRadius: 28 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  cardTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  plusTag: { height: 24, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  plusTagText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
  sliderHead: { marginTop: 10, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sliderGap: { marginTop: 8 },
  sliderLabel: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  sliderValue: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  reset: { marginTop: 14, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
