import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import SkeletonBlock from '../SkeletonShimmer';
import type { LeagueHubPalette } from './leagueHubPalette';

/**
 * Первый кадр экрана Лиги, пока нет ни локального кэша, ни ответа сети.
 *
 * зачем: владелец увидел ~10 секунд ПОЛНОЙ пустоты при входе в лигу (пустой
 * подиум, «0 участников», ничего под заголовком) и прочитал это как поломку
 * приложения. Раньше club_screen при отсутствии кэша просто ничего не рисовал:
 * localLeagueHydrated=false → ни подиума, ни строк. Показываем заглушки ТОЧНО
 * той же геометрии, что и настоящий контент, чтобы приход данных не двигал
 * вёрстку ни на пиксель (Performance Bible → layout stability).
 *
 * Геометрия зеркалит LeagueArenaScene (подиум) и LeagueLeaderboardRow (строки):
 * при правке размеров там — поправить и здесь, иначе появится прыжок.
 * Никаких вымышленных цифр: заглушка не показывает ни очков, ни мест.
 */

interface LeagueHubSkeletonProps {
  palette: LeagueHubPalette;
  /** Сколько строк-заглушек списка рисовать. */
  rows?: number;
}

// Синхронизировано с LeagueArenaScene.STEP_HEIGHT — иначе подиум подпрыгнет.
const STEP_HEIGHT: Record<number, number> = { 1: 74, 2: 54, 3: 42 };
// Порядок ступеней на экране: 2-е место слева, 1-е в центре, 3-е справа.
const PODIUM_PLACES = [2, 1, 3] as const;

function LeagueHubSkeletonComponent({ palette, rows = 5 }: LeagueHubSkeletonProps) {
  // Кость чуть темнее поверхности карточки — тон, а не обводка (запрет владельца).
  const bone = 'rgba(255,255,255,0.07)';
  const shine = 'rgba(255,255,255,0.16)';

  return (
    <View testID="league-hub-skeleton" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Сцена: эмблема + название + подпись участников + подиум */}
      <View style={styles.stage}>
        <SkeletonBlock width={84} height={84} borderRadius={42} baseColor={bone} highlightColor={shine} style={styles.emblem} />
        <SkeletonBlock width={132} height={16} borderRadius={8} baseColor={bone} highlightColor={shine} style={styles.leagueName} />
        <SkeletonBlock width={88} height={11} borderRadius={6} baseColor={bone} highlightColor={shine} style={styles.leagueSub} />

        <View style={styles.podiumRow}>
          {PODIUM_PLACES.map((place) => {
            const first = place === 1;
            const avatarSize = first ? 70 : 58;
            return (
              <View key={place} style={styles.person}>
                <SkeletonBlock
                  width={avatarSize}
                  height={avatarSize}
                  borderRadius={avatarSize / 2}
                  baseColor={bone}
                  highlightColor={shine}
                />
                <SkeletonBlock width={64} height={12} borderRadius={6} baseColor={bone} highlightColor={shine} style={styles.personName} />
                <SkeletonBlock width={42} height={10} borderRadius={5} baseColor={bone} highlightColor={shine} style={styles.personPoints} />
                <SkeletonBlock
                  width="100%"
                  height={STEP_HEIGHT[place]}
                  borderRadius={12}
                  baseColor={bone}
                  highlightColor={shine}
                  style={styles.step}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Строки списка участников — та же высота, что у настоящей строки (68). */}
      <View style={styles.list}>
        {/* guard-ok: список заглушек фиксированной длины, он не сортируется и в него
            ничего не вставляется — переиспользовать по индексу здесь безопасно. */}
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={[styles.row, { backgroundColor: palette.surface }]}>
            <SkeletonBlock width={16} height={16} borderRadius={8} baseColor={bone} highlightColor={shine} style={styles.place} />
            <SkeletonBlock width={50} height={50} borderRadius={25} baseColor={bone} highlightColor={shine} />
            <View style={styles.body}>
              <SkeletonBlock width="58%" height={13} borderRadius={7} baseColor={bone} highlightColor={shine} />
            </View>
            <SkeletonBlock width={44} height={16} borderRadius={8} baseColor={bone} highlightColor={shine} />
          </View>
        ))}
      </View>
    </View>
  );
}

export const LeagueHubSkeleton = memo(LeagueHubSkeletonComponent);

const styles = StyleSheet.create({
  // paddingTop/Bottom как в LeagueArenaScene.stage
  stage: { paddingTop: 6, paddingBottom: 4 },
  emblem: { alignSelf: 'center' },
  leagueName: { alignSelf: 'center', marginTop: 8 },
  leagueSub: { alignSelf: 'center', marginTop: 2 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginTop: 14 },
  person: { width: 96, alignItems: 'center' },
  personName: { marginTop: 7 },
  personPoints: { marginTop: 1 },
  step: { marginTop: 9 },
  // Отступ до первой строки повторяет блок заголовка «Участники клуба»
  list: { marginTop: 24 },
  row: {
    minHeight: 68,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 4,
  },
  place: { marginHorizontal: 5 },
  body: { flex: 1, minWidth: 0 },
});

export default LeagueHubSkeleton;
