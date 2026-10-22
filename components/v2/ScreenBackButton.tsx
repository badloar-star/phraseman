import React, { memo, useCallback } from 'react';
import { BackHandler, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { safeRouterBack } from '../../app/navigation_back';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { TabPageContext, TabTopBleedContext, useIsTabPage, useTabTopBleedInset } from '../tab_top_bleed';
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

const SLOT_STYLE = { width: SCREEN_BACK_SIZE, height: SCREEN_BACK_SIZE } as const;

/** Место под общую кнопку в строке шапки: сама кнопка — слой экрана, а заголовок и действия строки встают справа от неё. */
export function ScreenBackSlot() {
  return <View pointerEvents="none" style={SLOT_STYLE} />;
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
  /** Верх цвета сцены под кнопкой (Главная, «Диалоги», обложка Сезона): круг и значок подбираются по яркости сцены. Место и размер не меняются. */
  sceneTop?: string;
}>;

type BaseProps = Props & Readonly<{ glyph: 'back' | 'close' }>;

function ScreenBackButtonBase({ screen, fallback, onPress, testID, accessibilityLabel, glyph, sceneTop }: BaseProps) {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const isTabPage = useIsTabPage();
  const tabBleed = useTabTopBleedInset();
  // зачем: экран стека начинается от верха экрана → безопасный верх = insets.top; страница вкладки уже под отступом оболочки → 0,
  // а полноэкранная страница вкладки рисуется от верха → её зона часов (tabBleed). Иначе на вкладках отступ сложился бы дважды.
  const safeTop = isTabPage ? tabBleed : insets.top;
  const handlePress = useCallback(() => {
    if (onPress) { onPress(); return; }
    safeRouterBack(router, fallback);
  }, [fallback, onPress, router]);
  // зачем (владелец 22.10: «аппаратная „назад“ на Android делает то же, что ✕»): пока экран в фокусе, системная «назад» зовёт тот же
  // обработчик, что и ✕. Внутри Modal системная «назад» приходит в его onRequestClose — там хозяин окна передаёт тот же обработчик.
  useFocusEffect(useCallback(() => {
    if (glyph !== 'close') return undefined;
    // зачем: подмены react-native в тестах экранов бывают без BackHandler — ✕ не должен ронять их рендер; на устройстве он есть всегда
    if (typeof BackHandler?.addEventListener !== 'function') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { handlePress(); return true; });
    return () => sub.remove();
  }, [glyph, handlePress]));
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: screenBackTop(safeTop), left: SCREEN_BACK_LEFT, zIndex: 40 }}
    >
      <BackButton
        screen={screen}
        onPress={handlePress}
        size={SCREEN_BACK_SIZE}
        glyph={glyph}
        sceneTop={sceneTop}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const ScreenBackButton = memo(function ScreenBackButton(props: Props) {
  return <ScreenBackButtonBase {...props} glyph="back" />;
});
export default ScreenBackButton;

/**
 * ✕ «закрыть» экрана — в ТОЙ ЖЕ точке и том же круге, что «назад»; меняется только знак.
 *
 * зачем (владелец 22.10, вариант В: «✕ оставить, но в одном месте»): крестик остаётся там, где он по макетам (экран закрывается, а не
 * «возвращается»), но рисуется только этим компонентом — никаких самодельных крестиков на полноэкранных экранах. Системная «назад»
 * Android, пока экран в фокусе, делает то же, что ✕.
 */
export const ScreenCloseButton = memo(function ScreenCloseButton(props: Props) {
  return <ScreenBackButtonBase {...props} glyph="close" />;
});

/**
 * Для экранов, где всё содержимое уже под безопасным верхом (SafeAreaView с верхним краем или paddingTop: insets.top):
 * ставится ПЕРВЫМ ребёнком в потоке. Верх первого ребёнка = безопасный верх, кнопка считает верх от него.
 *
 * зачем (закон владельца 22.10 «назад/✕ в одном месте»): абсолютный слой не учитывает отступ родителя — положенная прямо в
 * SafeAreaView кнопка ушла бы под строку состояния. Якорь в потоке нулевой высоты держит точку, zIndex — поверх шапки ниже.
 */
const IN_FLOW_ANCHOR = { zIndex: 40 } as const;

export const SafeTopBackButton = memo(function SafeTopBackButton(props: Props) {
  return (
    <View style={IN_FLOW_ANCHOR}>
      <ScreenOriginBelowSafeTop><ScreenBackButtonBase {...props} glyph="back" /></ScreenOriginBelowSafeTop>
    </View>
  );
});

export const SafeTopCloseButton = memo(function SafeTopCloseButton(props: Props) {
  return (
    <View style={IN_FLOW_ANCHOR}>
      <ScreenOriginBelowSafeTop><ScreenBackButtonBase {...props} glyph="close" /></ScreenOriginBelowSafeTop>
    </View>
  );
});

/**
 * Полноэкранный слой (Modal) внутри вкладки: отсчёт верха — снова от верха экрана.
 *
 * зачем (координатор 22.10, вариант А: подвиды вкладки — «Все участники», «Шаг» Пика… — открываются полноэкранно поверх шапки вкладки):
 * контекст React проходит внутрь Modal, и без сброса кнопка внутри окна считала бы себя на странице вкладки (верх 0 или зона часов),
 * а окно начинается от верха экрана. Оборачивай содержимое такого окна.
 */
/**
 * Содержимое экрана уже стоит под безопасным верхом (SafeAreaView с верхним краем или paddingTop: insets.top у предка):
 * кнопка внутри считает верх от этого содержимого, а не от края экрана — иначе отступ сложился бы дважды.
 *
 * зачем (закон владельца 22.10 «назад/✕ в одном месте»): у многих экранов SafeAreaView top обёрнут вокруг всего содержимого, и
 * класть кнопку вне него неудобно (обработчик живёт внутри). Точка та же: безопасный верх + 0, слева 20.
 */
export function ScreenOriginBelowSafeTop({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <TabPageContext.Provider value>
      <TabTopBleedContext.Provider value={0}>{children}</TabTopBleedContext.Provider>
    </TabPageContext.Provider>
  );
}

export function ScreenOriginReset({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <TabPageContext.Provider value={false}>
      <TabTopBleedContext.Provider value={0}>{children}</TabTopBleedContext.Provider>
    </TabPageContext.Provider>
  );
}
