// ═════════════════════════════════════════════════════════════════════
// CommunityPackPreviewSkeleton.tsx — экран просмотра набора сообщества, пока сам набор ещё не найден в каталоге.
//
// зачем (координатор 12.10, аудит скорости: [PACK-OPEN] gallery:cards cards=0 → через 1,7 с cards=49, cards-v2-015): при открытии просмотра по прямой ссылке
// метаданных набора ещё нет (нет ни выбранной плитки, ни тёплого каталога), и экран рисовал обычный экран СВОЕГО набора — с «0 карточек» и пустой
// сеткой, а потом перескакивал на настоящий просмотр. Теперь вместо ложного нуля — заготовки той же геометрии, что у `CommunityPackPreview`:
// верхняя панель («назад» работает сразу), название, строка автора, строка «N карточек», кнопка, ряды карточек. Чисел и названий нет.
// ═════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import SkeletonBlock from '../../components/SkeletonShimmer';
import { PackBackBare, PackTopBarRow } from '../../components/packs/PackScreenKit';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { triLang, type Lang } from '../../constants/i18n';

const SIDE = 20;
const SKELETON_ROW_H = 118; // та же высота, что у плитки шага 0 в CommunityPackPreview — без прыжка при подмене
const SKELETON_ROWS = 4;

export const COMMUNITY_PACK_PREVIEW_SKELETON_TEST_ID = 'pack-preview-resolving';

export default memo(function CommunityPackPreviewSkeleton({ lang, onBack }: Readonly<{ lang: Lang; onBack: () => void }>) {
  const g = useLv2Glass();
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  return (
    <View testID={COMMUNITY_PACK_PREVIEW_SKELETON_TEST_ID} style={styles.root}>
      <ScrollView decelerationRate="fast" scrollEnabled={false} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PackTopBarRow left={<PackBackBare g={g} testID="pack-preview-back" label={backLabel} onPress={onBack} />} />
        <View style={styles.title}><SkeletonBlock width="62%" height={34} borderRadius={10} /></View>
        <View style={styles.authorRow}>
          <SkeletonBlock width={23} height={23} borderRadius={12} />
          <SkeletonBlock width={120} height={16} borderRadius={8} />
        </View>
        <View style={styles.metaRow}><SkeletonBlock width={150} height={18} borderRadius={8} /></View>
        <View style={styles.actions}><SkeletonBlock width="100%" height={48} borderRadius={24} /></View>
        <View style={styles.grid}>
          {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
            <SkeletonBlock key={index} width="100%" height={SKELETON_ROW_H} borderRadius={16} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: SIDE, paddingBottom: 48 },
  title: { marginTop: 14, height: 40, justifyContent: 'center' },
  authorRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaRow: { marginTop: 12, height: 22, justifyContent: 'center' },
  actions: { marginTop: 20 },
  grid: { marginTop: 24, gap: 10 },
});
