// ═══════════════════════════════════════════════════════════════════════════
// AppearancePlusSheet.tsx — шторка «Цвет под себя — с Plus» на экране «Оформление» (theme_sliders_v1).
//
// зачем (владелец 05.11 ~20:55 «КАК ПО МАКЕТУ», координатор ~22:20): в одобренном макете docs/work/mockups/theme_sliders_exact.html тап по
// запертому ползунку без Plus сначала поднимает шторку (заголовок, одна строка, «Открыть Plus», «Не сейчас»), и только кнопка шторки
// ведёт в обычное окно оплаты. Шторка — существующий KitSheetModal (новых модалок нет). Вид макета `.sheet`: заголовок 24/30, строка 16/22
// вторичным тоном, главная кнопка 54 (r 27) заливкой главной кнопки темы, «Не сейчас» 46 без заливки. Цвета — только токены темы.
// Ничего не пишет и не покупает: «Открыть Plus» и закрытие — колбэки экрана (журнал [THEME-SLIDERS] — там же).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { KitSheetModal } from '../v2/KitSheetModal';
import { APPEARANCE_PLUS_SHEET_TEXT } from './appearance_plus_sheet_copy';
import { useTheme } from '../ThemeContext';

export { APPEARANCE_PLUS_SHEET_TEXT };

type Props = Readonly<{
  lang: Lang;
  visible: boolean;
  /** «Открыть Plus» — экран закрывает шторку и открывает окно оплаты. */
  onPlus: () => void;
  /** «Не сейчас», тап по фону, свайп вниз, «назад» — причина для журнала. */
  onDismiss: (reason: 'not_now' | 'backdrop_or_back') => void;
}>;

function AppearancePlusSheetImpl({ lang, visible, onPlus, onDismiss }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const t = (key: keyof typeof APPEARANCE_PLUS_SHEET_TEXT): string => triLang(lang, APPEARANCE_PLUS_SHEET_TEXT[key]);
  return (
    <KitSheetModal
      visible={visible}
      onRequestClose={() => onDismiss('backdrop_or_back')}
      closeLabel={t('dismiss')}
      testID="appearance-plus-sheet"
      header={<Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={[s.title, { color: glass.text }]}>{t('title')}</Text>}
    >
      <View style={s.body}>
        <Text style={[s.text, { color: glass.secondary }]}>{t('body')}</Text>
        <Pressable
          testID="appearance-plus-sheet-cta"
          accessibilityRole="button"
          onPress={onPlus}
          style={({ pressed }) => [s.cta, { backgroundColor: glass.ctaFill, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[s.ctaText, { color: glass.ctaFillInk }]}>{t('cta')}</Text>
        </Pressable>
        <Pressable
          testID="appearance-plus-sheet-dismiss"
          accessibilityRole="button"
          onPress={() => onDismiss('not_now')}
          style={({ pressed }) => [s.dismiss, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[s.dismissText, { color: glass.secondary }]}>{t('dismiss')}</Text>
        </Pressable>
      </View>
    </KitSheetModal>
  );
}

export const AppearancePlusSheet = memo(AppearancePlusSheetImpl);

const s = StyleSheet.create({
  // макет `.sheet h3` / `p` / `.go` / `.no`
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4, marginBottom: 6 },
  body: { paddingBottom: 4 },
  text: { fontSize: 16, lineHeight: 22, marginBottom: 18 },
  cta: { minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  ctaText: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  dismiss: { marginTop: 6, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  dismissText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
