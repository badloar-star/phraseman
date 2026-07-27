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
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from './TapScale';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';

import { noAndroidOutline } from '../constants/androidGlow';
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
        ...(showDivider ? { borderBottomWidth: 0.5, borderBottomColor: t.border } : null),
      }}
    >
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
        <Text style={{ color: t.textPrimary, fontSize: 17, fontWeight: '600' }} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          left: 12,
          top: 0,
          bottom: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {accessory}
        <TapScale
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          testID={closeTestID}
          onPress={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.bgSurface,
            shadowColor: '#000',
            shadowOpacity: 0.24,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            ...noAndroidOutline,
          }}
        >
          <Ionicons name="close" size={20} color={t.textPrimary} />
        </TapScale>
      </View>
    </View>
  );
}
