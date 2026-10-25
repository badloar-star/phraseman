// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_header.tsx — слой «Сцены» Пика над шапкой «Сообщества»: цвет верха сцены, белые вкладки, белая энергия справа.
//
// зачем (Пик v2; владелец 22.10: «чтобы пик не был отдельной частью в отдельном окошке»; эталон peak-scene-v2.html — сцена уходит под вкладки
// «Пик · Друзья · Наборы»; координатор: «только на вкладке Пик и только при SPIRE_SCENE_V2_ENABLED, при выключенном флаге — побайтно прежний
// вид»; 3b-3: «гаси цвет шапки «Сообщества» при прокрутке Пика так же, как у Главной, тем же механизмом»):
// - шапка «Сообщества» рисует свои вкладки как всегда, а этот слой ложится поверх неё той же раскладкой (стили шапки передаёт «Сообщество»):
//   цвет сцены, те же вкладки белым, энергия справа. Касания и чтение с экрана проходят к настоящим вкладкам под слоем;
// - тон решает чистая функция spireSceneHeaderTone: флаг выключен, вкладка не «Пик» или сцены на экране нет → слоя нет, шапка прежняя;
// - прокрутка Пика гасит слой тем же механизмом, что верхнюю маску Главной (TopFadeMask): общий признак прокрутки TopFadeScroll, порог 6,
//   появление маски 180 мс — слой гаснет за те же 180, возврат 260, нативный драйвер. Перехода цветов текста нет: под слоем уже обычные
//   вкладки, получается настоящее перетекание. React при прокрутке ничего не перерисовывает.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import HomeSceneEnergy from '../../home/v2/scene/HomeSceneEnergy';
import { useTopFadeScroll } from '../../TopFadeScrollContext';
import { SPIRE_SCENE_V2_ENABLED } from './spire_scene_flag';
import { spireSceneHeaderTone, useSpireSceneHeaderTint, type SpireSceneHeaderTone } from './spire_scene_header_tint';
import SpireSceneBackdrop, { useSpireSceneBackdrop } from './spire_scene_backdrop';

const LOG = '[SPIRE-SCENE]';
/** Как у верхней маски (TopFadeMask showThreshold и длительности): одна прокрутка — маска появляется, цвет шапки гаснет. */
const SHOW_THRESHOLD = 6;
const FADE_OUT_MS = 180;
const FADE_IN_MS = 260;
/** зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10, верх цельный): слой шапки цвета сцены не гаснет при прокрутке — прежнее гашение оставлено выключенным для отката. */
const WHOLE_TOP_KEEPS_HEADER = true;

type Tab = Readonly<{ key: string; label: string }>;

/** Стили шапки «Сообщества» (её StyleSheet): слой повторяет раскладку, чтобы белые вкладки легли ровно поверх обычных. */
export type SpireSceneHeaderStyles = Readonly<{
  header: StyleProp<ViewStyle>;
  tabs: StyleProp<ViewStyle>;
  tab: StyleProp<ViewStyle>;
  tabText: StyleProp<TextStyle>;
  headerRight: StyleProp<ViewStyle>;
}>;

type Props = Readonly<{
  onPeak: boolean; tabs: readonly Tab[]; active: string; styles: SpireSceneHeaderStyles;
  /** Отступ полноэкранной шапки под часы (как у настоящей шапки «Сообщества»): рисованные вкладки — ровно на месте настоящих. */
  topInset?: number;
  /** Сдвиг ряда вкладок, когда слева стоит общая «назад» (ScreenBackButton): рисованные вкладки — там же, где настоящие. */
  tabsInset?: Readonly<{ marginLeft: number }> | null;
}>;

function SpireSceneHeaderLayer({ onPeak, tabs, active, styles, topInset = 0, tabsInset = null }: Props) {
  const tint = useSpireSceneHeaderTint();
  const tone = spireSceneHeaderTone({ enabled: SPIRE_SCENE_V2_ENABLED, onPeak, tint });
  if (tone === null) return null;
  return <LitLayer tone={tone} tabs={tabs} active={active} styles={styles} topInset={topInset} tabsInset={tabsInset} />;
}

export default memo(SpireSceneHeaderLayer);

function LitLayer({ tone, tabs, active, styles, topInset, tabsInset }: Readonly<{ tone: SpireSceneHeaderTone; tabs: readonly Tab[]; active: string; styles: SpireSceneHeaderStyles; topInset: number; tabsInset: Readonly<{ marginLeft: number }> | null }>) {
  // зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10, опись Сверки: шапка плоская 81,76,166 над сценой 140,114,202): под вкладками — верхняя часть ТОГО ЖЕ фона, что у сцены
  const backdrop = useSpireSceneBackdrop();
  const topFade = useTopFadeScroll();
  const scrollY = topFade?.scrollY;
  // зачем: слой появляется, когда Пик уже на экране и мог быть прокручен, — начинаем с текущего вида маски, без ожидания следующей смены
  const shownRef = useRef<boolean | null>(null);
  if (shownRef.current === null) shownRef.current = topFade?.isMaskShown() ?? false;
  const fade = useRef(new Animated.Value(WHOLE_TOP_KEEPS_HEADER || !shownRef.current ? 1 : 0)).current;
  useEffect(() => {
    console.log(LOG, 'header layer on', JSON.stringify({ scrolled: shownRef.current, tint: tone.tint, scrollSource: scrollY ? 'TopFadeScroll' : 'нет провайдера — слой не гаснет' })); // guard-ok: одна строка на появление слоя
    // зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10: «нигде верхняя часть не должна отличаться, она должна быть цельной»): слой цвета сцены под часами и вкладками больше не гаснет при прокрутке — погасший открывал бледное полотно оболочки полосой над сценой
    console.log('[TOP-BAND]', JSON.stringify({ at: 'spire_header_layer', tint: tone.tint, decision: 'always_on' })); // guard-ok: одна строка на появление слоя
    if (WHOLE_TOP_KEEPS_HEADER) return undefined;
    if (!scrollY) return undefined;
    const id = scrollY.addListener(({ value }) => {
      const shown = value > SHOW_THRESHOLD;
      if (shown === shownRef.current) return;
      shownRef.current = shown;
      Animated.timing(fade, { toValue: shown ? 0 : 1, duration: shown ? FADE_OUT_MS : FADE_IN_MS, useNativeDriver: true }).start();
    });
    return () => scrollY.removeListener(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: строка журнала — только на появление слоя, смена цвета темы её не повторяет
  }, [scrollY, fade]);
  return (
    <Animated.View pointerEvents="none" testID="spire-scene-header-tint" style={[StyleSheet.absoluteFill, styles.header, topInset > 0 ? { paddingTop: 12 + topInset } : null, { backgroundColor: backdrop ? 'transparent' : tone.tint, opacity: fade, overflow: 'hidden' }]}>
      {backdrop ? <SpireSceneBackdrop spec={backdrop} offsetTop={0} /> : null}
      {/* зачем (аудит кнопок Ревизора 22.10, F5): тот же отступ под часы, что у настоящей шапки — рисованные вкладки там же, куда попадает палец */}
      <View style={[styles.tabs, tabsInset]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <View key={t.key} style={[styles.tab, { borderBottomColor: on ? tone.text : 'transparent' }]}>
              <Text style={[styles.tabText, { color: on ? tone.text : tone.muted }]}>{t.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.headerRight}><HomeSceneEnergy /></View>
    </Animated.View>
  );
}
