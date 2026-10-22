// ════════════════════════════════════════════════════════════════════════════
// SectionSheetHeader.tsx — единая шапка «шторки раздела» (стандарт владельца,
// ориентир — Bevel).
//
// зачем: разделы приложения открываются как модальная страница с выездом снизу
// (см. app/section_sheet_navigation.ts), а у такой страницы грамматика шапки —
// не «стрелка назад + заголовок слева», а заголовок по центру и ✕ (закрытие вниз).
// 22.10 (владелец, вариант В: «✕ в одном месте, в той же точке, что стрелка: слева сверху»): прежний стандарт 12.10
// «✕ справа» отменён — ✕ рисует общий ScreenCloseButton слева сверху, справа остаётся только аксессуар. Высота фиксированная: первый кадр =
// финальная геометрия (Библия производительности, layout stability).
// Разделение — тоном и hairline-линией снизу, без обводок контейнеров.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View } from 'react-native';
import { FlowText } from './text-integrity/FlowText';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';

import { RowDivider } from './v2/RowDivider';
import { ScreenCloseButton, ScreenOriginBelowSafeTop } from './v2/ScreenBackButton';
/** Фиксированная высота контентной части шапки — без прыжков геометрии. */
export const SECTION_SHEET_HEADER_HEIGHT = 56;

/** Боковая зона (аксессуар + крестик): заголовок центрируется между зонами,
 *  чтобы при любом наборе кнопок справа он стоял ровно по центру шторки. */
const SIDE_ZONE_WIDTH = 92;

interface SectionSheetHeaderProps {
  title: string;
  /** Закрытие шторки — обычно () => safeRouterBack(router, fallback). Хаптик даёт TapScale. */
  onClose: () => void;
  /** Необязательный элемент слева от крестика (иконка-действие, статус «сохранено»). */
  accessory?: React.ReactNode;
  /** Hairline-линия снизу (односторонний разделитель разрешён стилем владельца). */
  showDivider?: boolean;
  closeTestID?: string;
}

export default function SectionSheetHeader({
  title,
  onClose,
  accessory,
  showDivider = true,
  closeTestID,
}: SectionSheetHeaderProps) {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const closeLabel = triLang(lang, {
    ru: 'Закрыть',
    uk: 'Закрити',
    en: 'Close',
    es: 'Cerrar',
    'pt-BR': 'Fechar',
    vi: 'Đóng',
    id: 'Tutup',
    tr: 'Kapat',
    pl: 'Zamknij',
  });

  return (
    <View
      style={{
        height: SECTION_SHEET_HEADER_HEIGHT,
        justifyContent: 'center',
      }}
    >
      {/* зачем (стиль «Тень»): нижний разделитель шапки — линия-View, а не borderBottom */}
      {showDivider ? <RowDivider edge="bottom" color={t.border} /> : null}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: SIDE_ZONE_WIDTH,
          right: SIDE_ZONE_WIDTH,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* зачем: text-integrity — длинный заголовок переносится по центру
            (2 строки по 17px помещаются в фикс-высоту 56), не усекается. */}
        <FlowText
          testID="section-sheet-title"
          provenance="authored"
          style={{ color: t.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' }}
        >
          {title}
        </FlowText>
      </View>
      <View
        // зачем (координатор 12.10, overlays-campaigns-004/016/017): по стандарту владельца (см. шапку файла) крестик — СПРАВА, заголовок по центру; в коде он стоял слева (left: 12) и расходился с образцами promo-code-states / referral-code-states
        style={{
          position: 'absolute',
          right: 12,
          top: 0,
          bottom: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {accessory}
      </View>
      {/* зачем (владелец 22.10, вариант В): ✕ — общий ScreenCloseButton в общей точке (20/48 от безопасного верха). Шапка всегда первой
          стоит под безопасным верхом хозяина (SafeAreaView) — поэтому кнопка считает верх от неё. Системная «назад» Android = ✕. */}
      <ScreenOriginBelowSafeTop>
        <ScreenCloseButton screen="section_sheet" testID={closeTestID} accessibilityLabel={closeLabel} onPress={onClose} />
      </ScreenOriginBelowSafeTop>
    </View>
  );
}

