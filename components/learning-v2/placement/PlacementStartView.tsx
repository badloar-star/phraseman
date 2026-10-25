// PlacementStartView.tsx — экран «Проверим, что ты уже знаешь» (макет chapter-exam-season.html, раздел 6, «Старт теста»).
// зачем (координатор 24.10, «1 в 1»): плитка школы 55, заголовок 28/34, абзац 16/23; подвал — «Начать тест» и «Начну с начала».
// зачем (владелец 25.10, «это черновик разраба или приложение?!»): три правила («ещё два вопроса», «засчитаем два из трёх», «бесплатный, около 5 минут»)
// убраны — служебная механика теста человеку не нужна; на старте только заголовок, одна фраза и кнопки.
// Размеры из CSS макета: .tstart, .ich, .exfoot. Без обводок; кегли подписей — 13/16 (правило проекта).
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useLv2Glass } from '../LearningV2Glass';
import { PlacementFooter, PlacementTopBar } from './PlacementChrome';
import { placementCopy } from './placement_copy';

type Props = Readonly<{
  lang: string;
  topInset: number;
  bottomInset: number;
  onStart: () => void;
  onStartOver: () => void;
  onClose: () => void;
  closeLabel: string;
}>;

export function PlacementStartView({ lang, topInset, bottomInset, onStart, onStartOver, onClose, closeLabel }: Props) {
  const g = useLv2Glass();
  return (
    <View testID="placement-start" style={styles.root}>
      <PlacementTopBar closeLabel={closeLabel} onClose={onClose} topInset={topInset} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.tile, { backgroundColor: `${g.text}17` }]}>
          <Ionicons name="school-outline" size={26} color={g.text} />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{placementCopy(lang, 'introTitle')}</Text>
        <Text style={[styles.body16, { color: g.secondary }]}>{placementCopy(lang, 'introBody')}</Text>
      </ScrollView>
      <PlacementFooter primaryLabel={placementCopy(lang, 'start')} onPrimary={onStart} ghostLabel={placementCopy(lang, 'startOver')} onGhost={onStartOver} bottomInset={bottomInset} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // `.tstart { padding-top: 18 }`; поля экрана 20
  body: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 24 },
  // `.ich`: 55 × 55, радиус 14, значок 26
  tile: { width: 55, height: 55, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  // `.tstart .h`: 28/34 800, −.4, отступ сверху 18
  title: { marginTop: 18, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4 },
  // `.tstart .p`: 16/23, отступ 10
  body16: { marginTop: 10, fontSize: 16, lineHeight: 23 },
});
