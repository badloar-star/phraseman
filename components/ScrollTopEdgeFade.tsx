import React from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';

import { LinearGradient } from './SafeLinearGradient';
import { useTopFadeScrolled } from './useTopFadeScrolled';

/** Высота растворения — как у списка уроков (components/lessons/ListTopEdgeFade). */
const FADE_HEIGHT = 20;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  edge: { height: FADE_HEIGHT },
  opaque: { flex: 1, backgroundColor: 'black' }, // theme-exempt: маска — цвет несёт только альфу
  restCover: { position: 'absolute', top: 0, left: 0, right: 0, height: FADE_HEIGHT, backgroundColor: 'black' }, // theme-exempt: маска — цвет несёт только альфу
});

/**
 * Мягкий верхний край прокручиваемого списка под закреплённой шапкой: верхние 20 px растворяются в фон экрана.
 *
 * зачем (владелец 11.11: «в уроках мы сделали при скролле верхний край размытым фейдом… в других разделах жёсткое разделение
 * осталось — надо чтобы везде был край размыт и нигде жёсткий»): тот же приём, что в уроках (маска по альфе — фон вкладки это
 * рисунок, плоской заливкой его не повторить), но растворение включается только после начала прокрутки. В покое верх списка
 * закрыт непрозрачной накладкой маски — первый блок («Твои друзья», лента недели) виден целиком, вид экрана прежний.
 */
type Props = Readonly<{
  children: React.ReactNode;
  /**
   * false — маска целиком непрозрачная, содержимое не меняется. зачем: раздел, у которого шапка то стоит блоком, то лежит поверх
   * сцены («Пик»), держит обёртку постоянно — иначе смена режима перемонтировала бы весь раздел.
   */
  enabled?: boolean;
  /**
   * Своя накладка маски (1 — покой, 0 — прокручено) вместо общего признака вкладок.
   * зачем (владелец 11.11: «во всех экранах… с размытым фейд краем»): отдельный экран вне оболочки вкладок считает прокрутку сам (useSoftTopEdge).
   */
  cover?: Animated.Value;
  /** Раскладка обёртки вместо «заполнить родителя» — когда маска встаёт на место самого списка (SoftTopEdgeScrollView). */
  style?: StyleProp<ViewStyle>;
}>;

export default function ScrollTopEdgeFade({ children, enabled = true, cover, style }: Props) {
  const sharedCover = useTopFadeScrolled({ rest: 1, stepOnAndroid: true });
  const restCover = cover ?? sharedCover;
  return (
    <MaskedView
      style={style ?? styles.fill}
      maskElement={
        <View style={styles.fill} pointerEvents="none">
          <LinearGradient colors={['transparent', 'black']} style={styles.edge} />
          <View style={styles.opaque} />
          <Animated.View style={[styles.restCover, { opacity: enabled ? restCover : 1 }]} />
        </View>
      }
    >
      {children}
    </MaskedView>
  );
}
