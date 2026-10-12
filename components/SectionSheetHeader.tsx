// ════════════════════════════════════════════════════════════════════════════
// SectionSheetHeader.tsx — единая шапка «шторки раздела» (стандарт владельца,
// ориентир — Bevel).
//
// зачем: разделы приложения открываются как модальная страница с выездом снизу
// (см. app/section_sheet_navigation.ts), а у такой страницы грамматика шапки —
// не «стрелка назад + заголовок слева», а заголовок по центру и тональная
// кнопка-крестик справа (закрытие вниз). Высота фиксированная: первый кадр =
// финальная геометрия (Библия производительности, layout stability).
// Разделение — тоном и hairline-линией снизу, без обводок контейнеров.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlowText } from './text-integrity/FlowText';
import TapScale from './TapScale';
// зачем (2026-08-16, motionVariant='hybrid'): единый пресс-стандарт гибрида
// «Световод + Чекан» (constants/motionHybrid.ts → PRESS) для крестика/аксессуара
// вместо TapScale. Дефолт остаётся 'classic' — вид не меняется без явного флага.
import PressableHybrid from './PressableHybrid';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';

import { noAndroidOutline } from '../constants/androidGlow';
import { RowDivider } from './v2/RowDivider';
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
  /** Гибрид «Световод + Чекан» для крестика (PressableHybrid variant="icon"). Дефолт — боевой 'classic'. */
  motionVariant?: 'classic' | 'hybrid';
  /** Крестик в тональном круге (по умолчанию, как referral-code-states) или плоский без плашки (как promo-code-states). */
  closeVariant?: 'plate' | 'flat';
}

export default function SectionSheetHeader({
  title,
  onClose,
  accessory,
  showDivider = true,
  closeTestID,
  motionVariant = 'classic',
  closeVariant = 'plate',
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
        {motionVariant === 'hybrid' ? (
          <PressableHybrid
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            testID={closeTestID}
            variant="icon"
            onPress={onClose}
            style={closeBtnStyle(t, closeVariant)}
          >
            <Ionicons name="close" size={20} color={t.textPrimary} />
          </PressableHybrid>
        ) : (
          <TapScale
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            testID={closeTestID}
            onPress={onClose}
            style={closeBtnStyle(t, closeVariant)}
          >
            <Ionicons name="close" size={20} color={t.textPrimary} />
          </TapScale>
        )}
      </View>
    </View>
  );
}

/** Одинаковая геометрия крестика в classic/hybrid — меняется только прессабл-примитив. */
function closeBtnStyle(t: ReturnType<typeof useTheme>['theme'], variant: 'plate' | 'flat' = 'plate') {
  if (variant === 'flat') {
    return { width: 40, height: 40, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const, ...noAndroidOutline };
  }
  return {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: t.bgSurface,
    shadowColor: '#000', // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    ...noAndroidOutline,
  };
}
