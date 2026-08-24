import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import SkeletonBlock from '../SkeletonShimmer';
import type { TournamentV2 } from '../ui/v2_theme';

/**
 * Первый кадр хаба Арены, пока нет ни тёплого снимка, ни ответа сети.
 *
 * зачем: аудит владельца показал, что хаб и три подэкрана грузятся «в
 * пустоту» — ни одного состояния загрузки. Раньше при пустом warm-снимке
 * (первый запуск приложения, снимок ещё не записан) экран рисовал пустые/
 * выключенные карточки и ничего не объяснял. Показываем заглушки ТОЧНО той
 * же геометрии, что и настоящий контент вкладки «Сегодня» (ArenaHubLive +
 * ArenaDailyGoals + today-карточка из app/arena.tsx + строки ArenaFeatureRow),
 * чтобы приход данных не двигал вёрстку ни на пиксель (Performance Bible →
 * layout stability). Показывается только когда нет вообще ничего — если
 * есть тёплый снимок, экран сразу рисует его, скелетон не мигает.
 *
 * Геометрия зеркалит:
 * - ArenaHubLive.styles.card (V2Card pad=16, rankHead+track+meta) —
 *   components/arena/ArenaHubLive.tsx
 * - ArenaDailyGoals.styles.card (V2Card pad=16, head + 3×goal) —
 *   components/arena/ArenaDailyGoals.tsx
 * - todayCard в app/arena.tsx (styles.todayCard/todayHead/todayNumber)
 * - ArenaFeatureRow в components/arena/ArenaExpansionUI.tsx (minHeight 82,
 *   borderRadius 22, featureIcon 48×48)
 *
 * Правки размеров там же требуют правки и здесь — иначе появится прыжок.
 * Никаких вымышленных цифр: заглушка не показывает ни ранга, ни очков.
 */

interface ArenaHubSkeletonProps {
  palette: TournamentV2;
}

/** Тон «кости»: поверхность карточки чуть светлее/темнее elev, не белый. */
function boneTones(P: TournamentV2): { bone: string; shine: string } {
  return {
    bone: P.chipEdge,
    shine: P.chipHi,
  };
}

function GoalRowSkeleton({ bone, shine }: { bone: string; shine: string }) {
  return (
    <View style={styles.goal}>
      <View style={styles.goalHead}>
        <SkeletonBlock width={18} height={18} borderRadius={9} baseColor={bone} highlightColor={shine} />
        <SkeletonBlock width={96} height={13} borderRadius={7} baseColor={bone} highlightColor={shine} style={styles.goalName} />
        <SkeletonBlock width={34} height={12} borderRadius={6} baseColor={bone} highlightColor={shine} />
      </View>
      <SkeletonBlock width="100%" height={8} borderRadius={5} baseColor={bone} highlightColor={shine} />
    </View>
  );
}

function FeatureRowSkeleton({ bone, shine }: { bone: string; shine: string }) {
  return (
    <View style={[styles.feature, { backgroundColor: bone }]}>
      <SkeletonBlock width={48} height={48} borderRadius={16} baseColor={bone} highlightColor={shine} />
      <View style={styles.featureCopy}>
        <SkeletonBlock width="62%" height={15} borderRadius={7} baseColor={bone} highlightColor={shine} />
        <SkeletonBlock width="44%" height={12} borderRadius={6} baseColor={bone} highlightColor={shine} style={styles.featureBody} />
      </View>
    </View>
  );
}

function ArenaHubSkeletonComponent({ palette }: ArenaHubSkeletonProps) {
  const { bone, shine } = boneTones(palette);

  return (
    <View testID="arena-hub-skeleton" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Карточка ранга — ArenaHubLive.styles.card */}
      <View style={[styles.card, { backgroundColor: palette.surfaceGradB }]}>
        <View style={styles.rankHead}>
          <SkeletonBlock width="52%" height={20} borderRadius={9} baseColor={bone} highlightColor={shine} />
          <SkeletonBlock width={40} height={14} borderRadius={7} baseColor={bone} highlightColor={shine} />
        </View>
        <SkeletonBlock width="100%" height={10} borderRadius={6} baseColor={bone} highlightColor={shine} />
        <SkeletonBlock width={110} height={12} borderRadius={6} baseColor={bone} highlightColor={shine} />
      </View>

      {/* Карточка целей дня — ArenaDailyGoals.styles.card */}
      <View style={[styles.card, styles.goalsCard, { backgroundColor: palette.surfaceGradB }]}>
        <View style={styles.head}>
          <SkeletonBlock width={96} height={16} borderRadius={8} baseColor={bone} highlightColor={shine} />
          <SkeletonBlock width={34} height={14} borderRadius={7} baseColor={bone} highlightColor={shine} />
        </View>
        <GoalRowSkeleton bone={bone} shine={shine} />
        <GoalRowSkeleton bone={bone} shine={shine} />
        <GoalRowSkeleton bone={bone} shine={shine} />
      </View>

      {/* Карточка «Сегодня» — todayCard/todayHead/todayNumber в app/arena.tsx */}
      <View style={[styles.card, styles.todayCard, { backgroundColor: palette.surfaceGradB }]}>
        <View style={styles.todayHead}>
          <View style={styles.todayCopy}>
            <SkeletonBlock width="70%" height={18} borderRadius={9} baseColor={bone} highlightColor={shine} />
            <SkeletonBlock width="90%" height={13} borderRadius={7} baseColor={bone} highlightColor={shine} style={styles.todayBody} />
          </View>
          <SkeletonBlock width={52} height={52} borderRadius={18} baseColor={bone} highlightColor={shine} />
        </View>
        <SkeletonBlock width="100%" height={10} borderRadius={999} baseColor={bone} highlightColor={shine} />
        <SkeletonBlock width="100%" height={56} borderRadius={20} baseColor={bone} highlightColor={shine} />
      </View>

      {/* Плитки режимов игры — ArenaFeatureRow (minHeight 82, borderRadius 22) */}
      <View style={styles.features}>
        <FeatureRowSkeleton bone={bone} shine={shine} />
        <FeatureRowSkeleton bone={bone} shine={shine} />
      </View>
    </View>
  );
}

export const ArenaHubSkeleton = memo(ArenaHubSkeletonComponent);

const styles = StyleSheet.create({
  // borderRadius совпадает с V2Card (radius.lg - 2 = 24), padding = pad 16
  card: { borderRadius: 24, padding: 16, gap: 8 },
  rankHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  goalsCard: { gap: 12, marginTop: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  goal: { gap: 6 },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalName: { flex: 1 },
  // gap 16 совпадает с styles.todayCard в app/arena.tsx
  todayCard: { gap: 16, marginTop: 16 },
  todayHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayCopy: { flex: 1, gap: 6 },
  todayBody: { marginTop: 3 },
  features: { marginTop: 16, gap: 10 },
  feature: { minHeight: 82, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureCopy: { flex: 1, gap: 6 },
  featureBody: { marginTop: 2 },
});

export default ArenaHubSkeleton;
