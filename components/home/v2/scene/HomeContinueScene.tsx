// ═══════════════════════════════════════════════════════════════════════════
// HomeContinueScene.tsx — простой верх Главной: шапка, точки недели и одна кнопка «Продолжить урок».
//
// зачем (владелец 11.11: «убери с главной все эти состояния вверху… кнопка „Продолжить" становится „Продолжить урок"
// и только продолжает последний открытый урок»): герои-состояния (серия под угрозой, нет энергии, с возвращением,
// особые сцены…) уходят в истории (home_activity_stories), сверху остаётся постоянный минимум. Цвета и полосу под часами
// задаёт HomeSceneView (те же токены темы, что у прежней сцены) — здесь только вид.
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triLang, type Lang } from '../../../../constants/i18n';
import { V2 } from '../../../../constants/v2Style';
import V2Pressable from '../../../v2/V2Pressable';
import HomeWeekDots, { type HomeWeekDotsProps } from '../HomeWeekDots';
import { HOME_SCENE_INK } from './home_scene_ink';

type Props = Readonly<{
  lang: Lang;
  /** Шапка уже собрана HomeSceneView (с историей состояния в кольце аватара). */
  header: React.ReactNode;
  week?: HomeWeekDotsProps;
  sceneTop: string;
  sceneBottom: string;
  /** Высота зоны часов: фон заходит под часы, содержимое ниже. */
  topInset: number;
  /** Нет — кнопки нет (последнего урока нет и раздела «Уроки» для языка нет). */
  onContinue?: () => void;
}>;

export function homeContinueLessonLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Продолжить урок', uk: 'Продовжити урок', en: 'Continue lesson',
    es: 'Continuar la lección', 'pt-BR': 'Continuar a lição', vi: 'Tiếp tục bài học',
    id: 'Lanjutkan pelajaran', tr: 'Derse devam et', pl: 'Kontynuuj lekcję',
  });
}

export default function HomeContinueScene({ lang, header, week, sceneTop, sceneBottom, topInset, onContinue }: Props) {
  const label = homeContinueLessonLabel(lang);
  return (
    <View testID="home-continue-scene" style={[styles.root, { paddingTop: topInset + 8, backgroundColor: sceneTop }]}>
      <LinearGradient pointerEvents="none" colors={[sceneTop, sceneBottom]} style={StyleSheet.absoluteFill} />
      {header}
      {week ? <HomeWeekDots {...week} /> : null}
      {onContinue ? (
        <V2Pressable testID="home-scene-cta" accessibilityRole="button" accessibilityLabel={label} style={styles.button} onPress={onContinue}>
          <Ionicons name="play" size={18} color={HOME_SCENE_INK.ctaInk} />
          <Text style={styles.label}>{label}</Text>
        </V2Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: -V2.homePad, paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  button: {
    minHeight: 50, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: HOME_SCENE_INK.cta,
  },
  label: { color: HOME_SCENE_INK.ctaInk, fontSize: 16, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
});
