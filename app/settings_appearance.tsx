// ═══════════════════════════════════════════════════════════════════════════
// settings_appearance.tsx — экран «Оформление»: Светлая/Тёмная + ползунки «Оттенок» и «Насыщенность» (флаг theme_sliders_v1).
//
// зачем (слово владельца через координатора 05.11: все темы заменяются на светлая/тёмная + оттенок + насыщенность (Plus); макет
// docs/work/mockups/theme_sliders_exact.html одобрен, «иконки добавлять не надо»): сегмент Светлая/Тёмная — всем, ползунки и «Вернуть стандартный» — только Plus;
// без Plus ползунки заперты и ведут в пейвол. Выбор = идентификатор tune:H:S в ThemeContext: превью при перетаскивании (setPreviewLiquidGlassThemeId, без записи),
// одна запись при отпускании (setLiquidGlassThemeId — локально сразу, на диск и в синк фоном, как у любой темы). Optimistic: вид меняется на каждом шаге до записи.
// Флаг выключен — экран пустой и сразу возвращает назад (глубокая ссылка не открывает недоделанное). Журнал: [THEME-SLIDERS].
// зачем (владелец 05.11 ~20:55 «КАК ПО МАКЕТУ»): размеры, значки и подписи — 1:1 с макетом (☀/☾ в сегменте, замок у «Plus», значок у «Вернуть стандартный»,
// кромка дорожки, 15 px у чисел). Круг «назад» остаётся на общем месте приложения (правило владельца «назад везде в одной точке»), заголовок — под ним.
// ═══════════════════════════════════════════════════════════════════════════
import React, { Profiler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import BouncyScrollView from '../components/BouncyScrollView';
import ScreenGradient from '../components/ScreenGradient';
import ScreenBackButton, { ScreenBackZone } from '../components/v2/ScreenBackButton';
import V2SegmentedControl from '../components/v2/V2SegmentedControl';
import ContentWrap from '../components/ContentWrap';
import { settingsGlassCardStyle } from '../components/settings/SettingsGlassRows';
import { TuneSlider } from '../components/settings/TuneSlider';
import { AppearancePlusSheet } from '../components/settings/AppearancePlusSheet';
import { createTunePerf, type TunePerf } from '../components/settings/tune_perf_log';
import { KIT_MOTION } from '../constants/motionHybrid';
import { ThemeDraftScope, useTheme } from '../components/ThemeContext';
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
/** Как часто во время жеста перекрашиваются пятна света фона (мс). Остальной экран — каждый кадр. */
const GLOW_PREVIEW_MS = 140;

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
  // Применённая настройка: из темы-идентификатора; старая тема (до миграции) показывается как стандарт — ничего не выдумываем.
  const applied: ThemeTune = parseThemeTuneId(liquidGlassThemeId) ?? THEME_TUNE_STANDARD;
  const [draft, setDraft] = useState<ThemeTune | null>(null);
  const shown = draft ?? applied;
  // зачем (06.11): во время жеста экран красится локально по черновику — остальное приложение не перерисовывается до отпускания
  const glass = liquidGlassTokens(draft ? themeTuneId(draft) : liquidGlassThemeId);
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
  // зачем: прежний предпросмотр через ThemeContext (если остался от старой версии экрана) снимается при уходе; новый предпросмотр — локальный
  useEffect(() => () => setPreviewLiquidGlassThemeId(null), [setPreviewLiquidGlassThemeId]);

  // зачем (🔴 владелец 06.11 «лаги ползунков»): замер жеста — [THEME-SLIDERS] perf одной строкой на жест (components/settings/tune_perf_log.ts)
  const perfRef = useRef<TunePerf | null>(null);
  if (perfRef.current === null) {
    perfRef.current = createTunePerf({
      now: () => performance.now(),
      raf: (cb) => { requestAnimationFrame(cb); },
      log: (summary) => console.log(LOG, 'perf', JSON.stringify(summary)), // guard-ok: одна строка на жест
    });
  }
  perfRef.current.render();
  // зачем (🔴 владелец 06.11, TestFlight 150: «ужасные лаги при прокрутке ползунков»; замер [THEME-SLIDERS] perf до правки — каждый шаг ползунка
  // менял ThemeContext (setPreviewLiquidGlassThemeId) и перерисовывал ВСЁ приложение): во время жеста бегунок едет на UI-потоке (TuneSlider), а
  // предпросмотр — только ЛОКАЛЬНО на этом экране (draft → glass карточки, числа, дорожки), не чаще 1 раза за кадр (requestAnimationFrame).
  // ThemeContext и диск — ОДИН раз при отпускании (commit → setLiquidGlassThemeId; запись на диск — фоном в persister ThemeContext).
  const pendingRef = useRef<ThemeTune | null>(null);
  const rafRef = useRef<number | null>(null);
  // зачем (владелец 11.11 «оно теперь подтормаживает — ползунки»): пятна света фона (полноэкранный SVG) красятся по отдельному черновику не чаще
  // раза в GLOW_PREVIEW_MS; последний шаг догоняет таймером, чтобы при остановке пальца пятна не оставались от прошлого цвета.
  const [glowDraft, setGlowDraft] = useState<ThemeTune | null>(null);
  const glowAtRef = useRef(0);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // зачем (правило «сперва логи»): куда уходит время шага — расчёт цветов и перерисовка экрана — одной строкой на жест ([THEME-SLIDERS] perf_split)
  const splitRef = useRef({ commits: 0, commitSumMs: 0, commitMaxMs: 0, glowUpdates: 0 });
  const onProfile = useCallback((_id: string, _phase: string, actualMs: number) => {
    const s = splitRef.current;
    splitRef.current = { ...s, commits: s.commits + 1, commitSumMs: s.commitSumMs + actualMs, commitMaxMs: Math.max(s.commitMaxMs, actualMs) };
  }, []);
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
  }, []);
  const preview = useCallback((next: ThemeTune, target: string) => {
    perfRef.current?.preview(target);
    pendingRef.current = next;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const n = pendingRef.current;
      if (!n) return;
      setDraft(n);
      const pushGlow = () => {
        glowTimerRef.current = null;
        const latest = pendingRef.current;
        if (!latest) return;
        glowAtRef.current = performance.now();
        splitRef.current = { ...splitRef.current, glowUpdates: splitRef.current.glowUpdates + 1 };
        setGlowDraft(latest);
      };
      const wait = GLOW_PREVIEW_MS - (performance.now() - glowAtRef.current);
      if (wait <= 0) pushGlow();
      else if (glowTimerRef.current === null) glowTimerRef.current = setTimeout(pushGlow, wait);
    });
  }, []);
  const commit = useCallback((next: ThemeTune, why: string) => {
    const id = themeTuneId(next);
    console.log(LOG, 'commit', JSON.stringify({ why, from: String(liquidGlassThemeId), to: id, appearance: liquidGlassAppearance })); // guard-ok: одна строка на запись
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (glowTimerRef.current) { clearTimeout(glowTimerRef.current); glowTimerRef.current = null; }
    const split = splitRef.current;
    splitRef.current = { commits: 0, commitSumMs: 0, commitMaxMs: 0, glowUpdates: 0 };
    console.log(LOG, 'perf_split', JSON.stringify({ why, screenCommits: split.commits, commitAvgMs: split.commits ? Math.round((split.commitSumMs / split.commits) * 10) / 10 : 0, commitMaxMs: Math.round(split.commitMaxMs * 10) / 10, glowUpdates: split.glowUpdates })); // guard-ok: одна строка на жест
    pendingRef.current = null;
    setGlowDraft(null);
    setDraft(null);
    setLiquidGlassThemeId(id);
    perfRef.current?.end(why, true);
  }, [liquidGlassAppearance, liquidGlassThemeId, setLiquidGlassThemeId, setPreviewLiquidGlassThemeId]);

  const onHuePreview = useCallback((H: number) => preview(normalizeThemeTune({ H, S: shown.S }), 'hue'), [preview, shown.S]);
  const onHueCommit = useCallback((H: number) => commit(normalizeThemeTune({ H, S: shown.S }), 'hue'), [commit, shown.S]);
  const onSatPreview = useCallback((S: number) => preview(normalizeThemeTune({ H: shown.H, S }), 'saturation'), [preview, shown.H]);
  const onSatCommit = useCallback((S: number) => commit(normalizeThemeTune({ H: shown.H, S }), 'saturation'), [commit, shown.H]);
  // зачем (координатор 05.11 ~22:20, «КАК ПО МАКЕТУ»): запертый ползунок/сброс без Plus сначала поднимает шторку макета «Цвет под себя — с Plus»,
  // в окно оплаты ведёт только её кнопка. Оплата открывается после ухода шторки (KIT_MOTION.sheetMs), чтобы Modal не перекрывал экран оплаты.
  const [plusSheet, setPlusSheet] = useState(false);
  const paywallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (paywallTimerRef.current) clearTimeout(paywallTimerRef.current); }, []);
  const onLockedPress = useCallback((target: string = 'reset') => {
    console.log(LOG, 'touch', JSON.stringify({ target, locked: !hasPremiumAccess, plus: hasPremiumAccess })); // guard-ok: одна строка на тап (координатор 05.11: «тап не открывает шторку»)
    console.log(LOG, 'lock_tap', 'ползунок заперт без Plus — шторка', JSON.stringify({ target, plus: hasPremiumAccess, sheetOpen: plusSheet })); // guard-ok: причина перехода
    if (plusSheet) return;
    void hapticTap();
    setPlusSheet(true);
    console.log(LOG, 'sheet_open', JSON.stringify({ source: 'appearance_tune' })); // guard-ok: одна строка на показ
  }, [hasPremiumAccess, plusSheet]);
  const onHueLocked = useCallback(() => onLockedPress('hue'), [onLockedPress]);
  const onSatLocked = useCallback(() => onLockedPress('saturation'), [onLockedPress]);
  // зачем (🔴 координатор 05.11, кадр 5562: вся карточка «Цвет» в одну строку, дорожек нет): геометрия частей карточки — в журнал, чтобы
  // поломку раскладки было видно без кадра. Одна строка на каждую раскладку части (не на кадр).
  const logLayout = useCallback((part: string) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    console.log(LOG, 'layout', JSON.stringify({ part, x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) })); // guard-ok: раскладка части, не кадр
  }, []);
  const onSheetPlus = useCallback(() => {
    console.log(LOG, 'sheet_cta', JSON.stringify({ to: 'paywall', context: 'generic', source: 'appearance_tune', delayMs: KIT_MOTION.sheetMs })); // guard-ok: одна строка на нажатие
    setPlusSheet(false);
    if (paywallTimerRef.current) clearTimeout(paywallTimerRef.current);
    paywallTimerRef.current = setTimeout(() => {
      paywallTimerRef.current = null;
      openPremiumPaywall(router as never, { context: 'generic', source: 'appearance_tune' });
    }, KIT_MOTION.sheetMs);
  }, [router]);
  const onSheetDismiss = useCallback((reason: 'not_now' | 'backdrop_or_back') => {
    console.log(LOG, 'sheet_dismiss', JSON.stringify({ reason })); // guard-ok: причина закрытия
    setPlusSheet(false);
  }, []);
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
    { key: 'light' as const, label: triLang(lang, T.light), icon: 'sunny' as const },
    { key: 'dark' as const, label: triLang(lang, T.dark), icon: 'moon' as const },
  ], [lang]);
  const hueColor = oklchToHex(liquidGlassAppearance === 'dark' ? 0.7 : 0.62, 0.14, shown.H);
  const accentNow = glass.accentGraphic;
  const canReset = !isThemeTuneStandard(shown);

  if (!THEME_SLIDERS_V1_ENABLED) return null;
  // зачем (владелец 11.11: «ползунок должен реально играть роль ползунка»): раньше за пальцем красилась только карточка, фон и остальное — рывком
  // при отпускании. ThemeDraftScope подаёт черновик всему ЭТОМУ экрану (фон, сегмент, «назад», шторка) — цвет течёт за пальцем; остальное приложение не трогается.
  return (
    <ThemeDraftScope themeId={draft ? themeTuneId(draft) : null} glowThemeId={glowDraft ? themeTuneId(glowDraft) : null}>
    <Profiler id="settings_appearance" onRender={onProfile}>
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <ScreenBackZone />
          <BouncyScrollView decelerationRate="fast" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" style={[styles.title, { color: glass.text }]}>{triLang(lang, T.title)}</Text>
            <View style={styles.segment}>
              <V2SegmentedControl segments={segments} value={liquidGlassAppearance} onChange={onAppearance} testID="appearance-segment" />
            </View>
            {/* зачем (🔴 05.11): settingsGlassCardStyle — стиль СТРОКИ настроек (flexDirection: 'row', центр, gap 14, minHeight); карточке «Цвет» нужна колонка, как в макете */}
            <View onLayout={logLayout('card')} style={[settingsGlassCardStyle(glass), styles.card]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: glass.text }]}>{triLang(lang, T.color)}</Text>
                {locked ? (
                  <Pressable testID="appearance-plus-tag" accessibilityRole="button" accessibilityLabel="Plus" hitSlop={10} onPress={() => onLockedPress('plus_tag')} style={[styles.plusTag, { backgroundColor: glass.cta }]}>
                    <Ionicons name="lock-closed" size={12} color={glass.ctaInk} />
                    <Text style={[styles.plusTagText, { color: glass.ctaInk }]}>Plus</Text>
                  </Pressable>
                ) : null}
              </View>
              <View onLayout={logLayout('hue_head')} style={styles.sliderHead}>
                <Text style={[styles.sliderLabel, { color: glass.text }]}>{triLang(lang, T.hue)}</Text>
                <Text style={[styles.sliderValue, { color: glass.secondary }]}>{`${shown.H}°`}</Text>
              </View>
              <View onLayout={logLayout('hue_track')} style={styles.trackWrap}>
                <TuneSlider testID="appearance-hue" gradient={hueGradient} value={shown.H} max={HUE_MAX} thumbColor={hueColor} edgeColor={glass.line} label={triLang(lang, T.hue)} valueText={`${shown.H}°`}
                  locked={locked} onLockedPress={onHueLocked} onPreview={onHuePreview} onCommit={onHueCommit} />
              </View>
              <View onLayout={logLayout('saturation_head')} style={styles.sliderHead}>
                <Text style={[styles.sliderLabel, { color: glass.text }]}>{triLang(lang, T.sat)}</Text>
                <Text style={[styles.sliderValue, { color: glass.secondary }]}>{`${shown.S} %`}</Text>
              </View>
              <View onLayout={logLayout('saturation_track')} style={styles.trackWrap}>
                <TuneSlider testID="appearance-saturation" gradient={satGradient} value={shown.S} max={SAT_MAX} thumbColor={accentNow} edgeColor={glass.line} label={triLang(lang, T.sat)} valueText={`${shown.S} %`}
                  locked={locked} onLockedPress={onSatLocked} onPreview={onSatPreview} onCommit={onSatCommit} />
              </View>
              <Pressable
                testID="appearance-reset"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canReset }}
                disabled={!canReset}
                onPress={onReset}
                onLayout={logLayout('reset')}
                style={[styles.reset, { backgroundColor: glass.buttonFill, opacity: !canReset ? 0.45 : 1 }]}
              >
                <Ionicons name="refresh" size={17} color={glass.text} />
                <Text style={[styles.resetText, { color: glass.text }]}>{triLang(lang, T.reset)}</Text>
              </Pressable>
            </View>
          </BouncyScrollView>
        </ContentWrap>
      </View>
      <AppearancePlusSheet lang={lang} visible={plusSheet} onPlus={onSheetPlus} onDismiss={onSheetDismiss} />
      <ScreenBackButton screen="settings_appearance" testID="appearance-back" accessibilityLabel={triLang(lang, T.title)} onPress={() => safeRouterBack(router, '/(tabs)/settings' as never)} />
    </ScreenGradient>
    </Profiler>
    </ThemeDraftScope>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { marginTop: 10, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
  segment: { marginTop: 16 },
  card: { marginTop: 16, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14, borderRadius: 28, flexDirection: 'column', alignItems: 'stretch', gap: 0, minHeight: 0 },
  trackWrap: { alignSelf: 'stretch' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, marginBottom: 4 },
  cardTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  plusTag: { height: 24, paddingHorizontal: 9, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  plusTagText: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.2 },
  sliderHead: { marginTop: 10, minHeight: 22, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  sliderValue: { fontSize: 15, lineHeight: 22, fontWeight: '500', fontVariant: ['tabular-nums'] },
  reset: { marginTop: 12, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  resetText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
