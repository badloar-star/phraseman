// ═══════════════════════════════════════════════════════════════════════════
// LegacyBonusWelcomeSheet.tsx — шторка «Встречайте PhraseMan 2.0»: старые бонусы стали монетами (D195).
//
// зачем (Ядро 15.10; макет — артефакт Q9jqpBbjwJEFV1DpdEGx2h; владелец: окно — только «Встречайте» и пересчёт бонусов в монеты, без рассказа о новом):
// заголовок, «Твои бонусы переходят в монеты», плашка с большой монетой и итогом, ниже строки (только где монет больше нуля), кнопка «Понятно».
// Монеты уже на балансе — окно ничего не пишет и не ждёт; закрытие просто гасит окно. Анимация сгорания строк и полётов монет — use_legacy_bonus_burn.
// Материал шторки и кнопка — те же, что у окна «Что нового» (HybridSheetShell liquid-glass, DuoPressable): ни обводок, ни подписей мелким шрифтом.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, type MutableRefObject } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { Lang } from '../../constants/i18n';
import { legacyBonusConvertTitle, legacyBonusCta, legacyBonusTitle } from '../../modules/legacy_bonus/legacy_bonus_strings';
import { legacyBonusHasContent, legacyBonusRows, legacyBonusTotal, type LegacyBonusViewInput } from '../../modules/legacy_bonus/legacy_bonus_view';
import DuoPressable from '../DuoPressable';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { useTheme } from '../ThemeContext';
import { MOMENT_TITLE_MAX_FONT_SCALE } from '../moments/title_scale';
import LegacyBonusFlyLayer from './LegacyBonusFlyLayer';
import LegacyBonusHero from './LegacyBonusHero';
import LegacyBonusRow from './LegacyBonusRow';
import { useLegacyBonusBurn } from './use_legacy_bonus_burn';

export type LegacyBonusWelcomeSheetProps = Readonly<{
  visible: boolean;
  lang: Lang;
  coinRank: number | null;
  result: LegacyBonusViewInput;
  onClose: () => void;
  /** Нативное окно ушло — можно отдавать слот очереди окон. */
  onDismissed?: () => void;
}>;

/** Содержимое монтируется вместе со шторкой: сценарий стартует с её появлением и гасится при закрытии. */
function Content({ lang, coinRank, result, requestDismiss }: Readonly<{ lang: Lang; coinRank: number | null; result: LegacyBonusViewInput; requestDismiss: () => void }>) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReducedMotion();
  const rows = useMemo(() => legacyBonusRows(result), [result]);
  const total = useMemo(() => legacyBonusTotal(result), [result]);
  // зачем (владелец 15.10): ничего не начислено — окно только с заголовком и «Понятно», без плашки пересчёта
  const hasContent = useMemo(() => legacyBonusHasContent(result), [result]);
  const burn = useLegacyBonusBurn({ rows, total, reduceMotion });

  const onRowsLayout = useCallback((e: LayoutChangeEvent) => {
    burn.rowsOffset.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y };
  }, [burn.rowsOffset]);
  const placeRow = useCallback((i: number) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    burn.rowPlaces.current[i] = { x, y, width, height };
  }, [burn.rowPlaces]);

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE} style={[s.title, { color: glass.text }]}>{legacyBonusTitle(lang)}</Text>
        {hasContent ? (
        <>
        <Text style={[s.convert, { color: glass.text }]}>{legacyBonusConvertTitle(lang)}</Text>
        <View style={[s.plate, { backgroundColor: glass.opaqueCard }]} testID="legacy-bonus-plate">
          <LegacyBonusHero
            ref={burn.heroRef}
            lang={lang}
            coinRank={coinRank}
            total={total}
            glass={glass}
            reduceMotion={reduceMotion}
            onReachedTotal={burn.celebrate}
          />
          <View style={s.rows} onLayout={onRowsLayout}>
            {rows.map((row, i) => (
              <View key={row.key} onLayout={placeRow(i)}>
                <LegacyBonusRow
                  ref={(h) => { (burn.rowRefs as MutableRefObject<(typeof h)[]>).current[i] = h; }}
                  lang={lang}
                  row={row}
                  glass={glass}
                  reduceMotion={reduceMotion}
                  testID={`legacy-bonus-row-${row.key}`}
                />
              </View>
            ))}
          </View>
          <LegacyBonusFlyLayer ref={burn.flyRef} />
        </View>
        </>
        ) : null}
      </ScrollView>
      <DuoPressable
        testID="legacy-bonus-cta"
        accessibilityRole="button"
        accessibilityLabel={legacyBonusCta(lang)}
        onPress={requestDismiss}
        edgeColor={glass.opaqueControl}
        edgeHeight={4}
        wrapStyle={s.ctaWrap}
        // зачем (координатор 15.10, правило владельца 13.10 «кнопки не сливаются»): заливка главной кнопки — ctaFill темы (accent/cta на светлых градиентных темах сливались со шторкой)
        style={[s.cta, { backgroundColor: glass.ctaFill }]}
      >
        <Text style={[s.ctaText, { color: glass.ctaFillInk }]}>{legacyBonusCta(lang)}</Text>
      </DuoPressable>
    </>
  );
}

function LegacyBonusWelcomeSheet({ visible, lang, coinRank, result, onClose, onDismissed }: LegacyBonusWelcomeSheetProps) {
  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      closeLabel={legacyBonusCta(lang)}
      backdropAccessible={false}
      material="liquid-glass"
      testID="legacy-bonus-sheet"
    >
      {({ requestDismiss }) => <Content lang={lang} coinRank={coinRank} result={result} requestDismiss={requestDismiss} />}
    </HybridSheetShell>
  );
}

export default memo(LegacyBonusWelcomeSheet);

const s = StyleSheet.create({
  scroll: { flexShrink: 1 },
  scrollContent: { paddingTop: 6, paddingBottom: 8 },
  // макет: .title 28/34, по центру, поля 6/4; `.conv .h` 20/26 700; `.conv .sub` 16/22, поля 4/14
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center', marginTop: 6, marginBottom: 4 },
  // `.conv .h` 20/26, 700, по центру; эталон: поля 6 сверху и 14 до плашки (пояснения под ним нет)
  convert: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  // `.plate`: радиус 18, поля 14 — без обводки (стиль «Тень»: тон и скругление)
  plate: { borderRadius: 18, padding: 14 },
  rows: { gap: 6 },
  ctaWrap: { width: '100%', marginTop: 12 },
  cta: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
