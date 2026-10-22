import React, { memo, useCallback } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { safeRouterBack } from '../../app/navigation_back';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import BackButton from './BackButton';

/**
 * Кнопка «назад» экрана — ОДНА на всё приложение и в ОДНОМ месте.
 *
 * зачем (закон владельца 22.10, капсом: «КНОПКА НАЗАД ВООБЩЕ ВЕЗДЕ ДОЛЖНА БЫТЬ В ОДНОМ И ТОМ ЖЕ МЕСТЕ НА АБСОЛЮТНО ВСЕХ ЭКРАНАХ!»;
 * поводы — «где кнопка назад?» на Пике с Главной и в «Вся глава» Сезона): у экранов были свои кнопки в своих шапках, и место зависело от
 * вёрстки каждой шапки. Здесь кнопка рисуется абсолютным слоем от верхнего края экрана, поэтому место не зависит от шапки.
 *
 * Место — эталон макетов 2.0 (docs/design/v2-app/kit.css), самый частый вариант из 158 макетов: круг `.rb.l` 48 в `.topbar` 44 у верха
 * контента. Контент `.scr .in` начинается на 52 при строке состояния `.sb` 50 → шапка на +2 от безопасного верха; круг 48 по центру
 * шапки 44 → верх круга = безопасный верх + 0. Слева `--pad` = 20.
 *
 * Как класть: прямым ребёнком корня экрана, который начинается от верхнего края (edge-to-edge, без SafeAreaView с верхним краем —
 * иначе отступ сложится дважды). Своих стилей и смещений компонент не принимает — сдвинуть кнопку нельзя. Заголовок рядом оставляет
 * слева SCREEN_BACK_RESERVED.
 */
export const SCREEN_BACK_LEFT = 20;
export const SCREEN_BACK_SIZE = 48;
export const SCREEN_BACK_TOP_OFFSET = 0;
/** Сколько места слева оставить заголовку шапки, чтобы он не лёг под кнопку (кнопка + зазор 12). */
export const SCREEN_BACK_RESERVED = SCREEN_BACK_LEFT + SCREEN_BACK_SIZE + 12;

/** Верх кнопки для данного безопасного отступа — для шапок, которые выравнивают заголовок по кнопке. */
export function screenBackTop(safeTop: number): number {
  return safeTop + SCREEN_BACK_TOP_OFFSET;
}

type Props = Readonly<{
  /** Короткий ключ экрана для журнала [BACK-BTN] (например `spire_week`). */
  screen: string;
  /**
   * Куда вернуться, если в истории некуда (по умолчанию — Главная внутри safeRouterBack).
   * зачем строка, а не Href: union типизированных маршрутов в массиве зависимостей даёт TS2590 («too complex»); safeRouterBack и так принимает путь.
   */
  fallback?: string;
  /** Свой обработчик (подтверждение выхода из занятия и т. п.); без него — safeRouterBack. */
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}>;

function ScreenBackButtonBase({ screen, fallback, onPress, testID, accessibilityLabel }: Props) {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const handlePress = useCallback(() => {
    if (onPress) { onPress(); return; }
    safeRouterBack(router, fallback);
  }, [fallback, onPress, router]);
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: screenBackTop(insets.top), left: SCREEN_BACK_LEFT, zIndex: 40 }}
    >
      <BackButton
        screen={screen}
        onPress={handlePress}
        size={SCREEN_BACK_SIZE}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const ScreenBackButton = memo(ScreenBackButtonBase);
export default ScreenBackButton;
