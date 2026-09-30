import React, { memo, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import SafeLinearGradient, { LinearGradient } from '../components/SafeLinearGradient';
import PressableHybrid from '../components/PressableHybrid';
import { settingsGlassCardStyle } from '../components/settings/SettingsGlassRows';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useTheme, getVolumetricShadow } from '../components/ThemeContext';
import { FlowText } from '../components/text-integrity/FlowText';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { DARK, type Theme } from '../constants/theme';
import { liquidGlassTokens, makeLiquidGlassTheme, type LiquidGlassThemeId } from '../constants/liquidGlassThemePalette';
import { safeRouterBack } from './navigation_back';
import { themeDisplayName } from './theme_display_names';
// зачем (PM-064, D38/D45): полка тем «за жемчуг» опустела ещё 2026-09-13 —
// isThemeShardPurchasable/themePriceShards всегда возвращали false/0, а
// ThemeShardPaywallModal и purchaseThemeWithShards были недостижимым кодом.
// D45 требует убрать все модалки «за жемчуг» целиком — модуль и модалка удалены.

// зачем: «Примерочная» (решение владельца 2026-08-02) — каждая плашка рисуется
// НАСТОЯЩИМИ токенами своей темы (никаких ручных дублей цветов: они уже
// разъезжались с палитрами), тап примеряет тему на весь экран через
// previewThemeMode, применение/пейволл — кнопкой внизу.

type ThemeOption = {
  mode: PickerThemeMode;
};
// зачем (владелец 2026-09-30): «ТЕМЫ ВСЕ ФРИ, БЕЗ ПЛЮСА МОЖНО МЕНЯТЬ» — замка, значка
// Plus и перехода на пейвол у тем больше нет; все 13 тем применяются сразу.

const THEME_OPTIONS: ThemeOption[] = [
  { mode: 'graphite' }, { mode: 'polar' }, { mode: 'slate' }, { mode: 'ink' },
  { mode: 'lavender' }, { mode: 'iris' }, { mode: 'rose' }, { mode: 'terracotta' },
  { mode: 'taupe' }, { mode: 'olive' }, { mode: 'sage' }, { mode: 'eucalyptus' },
  { mode: 'marine' },
];

// зачем: имя темы нужно и плитке, и модалке покупки — один помощник вместо
// двух копий словаря (копии уже разъезжались в других местах приложения).
function themeLabel(mode: string, lang: Lang): string {
  // зачем: единый словарь имён тем живёт в theme_display_names.ts — карточке
  // подарка из спина он нужен так же, как этому экрану. Копия здесь уже была
  // источником расхождений.
  return themeDisplayName(mode, lang);
}

type PickerThemeMode = LiquidGlassThemeId;
const paletteFor = (id: PickerThemeMode): Theme => makeLiquidGlassTheme(id, DARK);

type ThemeRowProps = {
  option: ThemeOption;
  label: string;
  sub: string | null;
  applied: boolean;
  candidate: boolean;
  onPress: (mode: PickerThemeMode) => void;
  glass: ReturnType<typeof liquidGlassTokens>;
};

// зачем (владелец 2026-09-29, макет profile.html#PRF-06): «Темы» — плотный список стеклянных
// строк: образец темы слева (красится НАСТОЯЩЕЙ палитрой самой темы, не ручным дублем),
// имя + короткий статус, справа радио «выбрана для примерки/применена». Тап по-прежнему
// примеряет тему на весь экран, применение и пейволл — кнопкой внизу (логика не менялась).
const ThemeRow = memo(function ThemeRow({ option, label, sub, applied, candidate, onPress, glass }: ThemeRowProps) {
  const palette = paletteFor(option.mode);
  return (
    <PressableHybrid
      testID={`theme-tile-${option.mode}`}
      accessibilityRole="radio"
      accessibilityState={{ selected: candidate, checked: candidate }}
      accessibilityValue={{ text: applied ? 'applied' : candidate ? 'preview' : 'available' }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      onPress={() => onPress(option.mode)}
      withHaptic={false}
      withSound={false}
      variant="card"
      contentStyle={settingsGlassCardStyle(glass)}
    >
      <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={palette.cardGradient}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.swatch}
      >
        <View style={[styles.swatchDot, { backgroundColor: palette.accent }]} />
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* зачем: FlowText намеренно не принимает numberOfLines (text-integrity: без усечений) —
            длинное имя темы переносится, а не режется троеточием. */}
        <FlowText testID={`theme-tile-name-${option.mode}`} provenance="authored" style={{ color: glass.text, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>{label}</FlowText>
        {sub ? <Text style={{ color: glass.mutedText, fontSize: 13, lineHeight: 18, marginTop: 3 }}>{sub}</Text> : null}
      </View>
      <View
        style={[
          styles.radio,
          { borderColor: candidate ? glass.lightTint : glass.glassEdge, backgroundColor: candidate ? glass.selected : 'transparent' },
        ]}
      >
        {applied ? <Ionicons name="checkmark" size={14} color={glass.lightTint} /> : candidate ? <View style={[styles.radioDot, { backgroundColor: glass.lightTint }]} /> : null}
      </View>
    </PressableHybrid>
  );
});

export default function SettingsThemes() {
  const router = useRouter();
  const {
    theme: t,
    liquidGlassThemeId,
    appliedLiquidGlassThemeId,
    previewLiquidGlassThemeId,
    setPreviewLiquidGlassThemeId,
    setLiquidGlassThemeId,
  } = useTheme();
  const { lang } = useLang();
  // зачем удалено (аудит 2026-08-25): мёртвая переменная — «Пульт» (remote-config
  // тумблер 'themes') уже учтён ВНУТРИ ThemeContext как liveThemeAccess и подмешан
  // в isThemeAvailable/isThemeUnlockedFor. Дублировать здесь — источник расхождения,
  // не защита.

  // зачем: примерка живёт только пока открыт экран «Темы» — уход с экрана
  // всегда возвращает применённую тему (превью не персистится).
  useEffect(() => () => setPreviewLiquidGlassThemeId(null), [setPreviewLiquidGlassThemeId]);

  const candidate: PickerThemeMode = previewLiquidGlassThemeId ?? appliedLiquidGlassThemeId;
  const candidatePalette = paletteFor(candidate);
  const candidateApplied = candidate === appliedLiquidGlassThemeId;

  const onRowPress = useCallback((mode: PickerThemeMode) => {
    hapticTap();
    // Тап по применённой теме = выход из примерки; по любой другой — мгновенная примерка.
    setPreviewLiquidGlassThemeId(mode === appliedLiquidGlassThemeId ? null : mode);
  }, [appliedLiquidGlassThemeId, setPreviewLiquidGlassThemeId]);

  /** Применить тему + ачивка. */
  const applyCandidate = useCallback((mode: PickerThemeMode) => {
    setLiquidGlassThemeId(mode);
    setPreviewLiquidGlassThemeId(null);
    // зачем: ачивка — только за НАСТОЯЩЕЕ применение, примерка её не триггерит.
    void (async () => {
      const { checkAchievements } = await import('./achievements');
      void checkAchievements({ type: 'profile_theme_set' });
    })();
  }, [setPreviewLiquidGlassThemeId, setLiquidGlassThemeId]);

  const onCtaPress = useCallback(() => {
    hapticTap();
    if (candidateApplied) return;
    applyCandidate(candidate);
  }, [candidate, candidateApplied, applyCandidate]);

  const ctaLabel = candidateApplied
      ? triLang(lang, { ru: 'Тема применена', uk: 'Тему застосовано', en: 'Theme applied', es: 'Tema aplicado', 'pt-BR': 'Tema aplicado', vi: 'Đã áp dụng chủ đề', id: 'Tema diterapkan', tr: 'Tema uygulandı', pl: 'Motyw zastosowany' })
      : triLang(lang, { ru: 'Применить тему', uk: 'Застосувати тему', en: 'Apply theme', es: 'Aplicar tema', 'pt-BR': 'Aplicar tema', vi: 'Áp dụng chủ đề', id: 'Terapkan tema', tr: 'Temayı uygula', pl: 'Zastosuj motyw' });

  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  const standardLabel = triLang(lang, { ru: 'Стандартная', uk: 'Стандартна', en: 'Standard', es: 'Estándar', 'pt-BR': 'Padrão', vi: 'Mặc định', id: 'Standar', tr: 'Standart', pl: 'Standardowy' });

  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <BouncyScrollView decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 16 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            <PressableHybrid
              testID="themes-back"
              accessibilityLabel={backLabel}
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)}
              variant="icon"
              withHaptic={false}
              withSound={false}
              style={{ width: 48, height: 48, alignSelf: 'flex-start', marginTop: 4 }}
              contentStyle={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, borderWidth: 1, borderColor: glass.glassEdge }}
            >
              <Ionicons name="arrow-back" size={22} color={glass.lightTint} />
            </PressableHybrid>
            <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 10 }}>
              {triLang(lang, { ru: 'Темы', uk: 'Теми', en: 'Themes', es: 'Temas', 'pt-BR': 'Temas', vi: 'Chủ đề', id: 'Tema', tr: 'Temalar', pl: 'Motywy' })}
            </Text>
            <View accessibilityRole="radiogroup" style={{ gap: 10, marginTop: 22 }}>
              {THEME_OPTIONS.map(item => {
                return (
                  <ThemeRow
                    key={item.mode}
                    option={item}
                    label={themeLabel(item.mode, lang)}
                    sub={item.mode === 'graphite' ? standardLabel : null}
                    applied={item.mode === appliedLiquidGlassThemeId}
                    candidate={item.mode === candidate}
                    onPress={onRowPress}
                    glass={glass}
                  />
                );
              })}
            </View>
          </BouncyScrollView>

          {/* Кнопка существует с первого кадра (стабильная геометрия), меняется только содержимое. */}
          <View style={styles.footer}>
            <TouchableOpacity
              testID="theme-cta"
              activeOpacity={0.9}
              disabled={candidateApplied}
              onPress={onCtaPress}
              accessibilityRole="button"
              accessibilityState={{ disabled: candidateApplied }}
              accessibilityLabel={ctaLabel}
              style={[
                styles.cta,
                { backgroundColor: candidateApplied ? candidatePalette.accentBg : candidatePalette.accent },
                !candidateApplied ? getVolumetricShadow('dark', candidatePalette, 2) : null,
              ]}
            >
              <Ionicons
                name={candidateApplied ? 'checkmark-circle' : 'color-palette'}
                size={18}
                color={candidateApplied ? candidatePalette.accent : candidatePalette.correctText}
              />
              <FlowText
                testID="theme-cta-label"
                provenance="authored"
                style={[
                  styles.ctaText,
                  { color: candidateApplied ? candidatePalette.accent : candidatePalette.correctText },
                ]}
              >
                {ctaLabel}
              </FlowText>
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  swatch: {
    width: 41,
    height: 41,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  cta: {
    // зачем: minHeight вместо height — длинная локаль переносится на 2 строки,
    // кнопка растёт, а не режет текст (правило text-integrity: без ужатий).
    minHeight: 54,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
});
