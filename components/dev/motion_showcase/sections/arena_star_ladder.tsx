// ─── Витрина движения · шард «Арена · звёздная лестница» ───
// зачем: владелец (2026-08-23) — «в DEV Hub всё, что я вижу на макетах,
// должно быть прикручено к РЕАЛЬНЫМ экранам». Каждый пункт монтирует
// боевой компонент звёздной лестницы с демо-данными: сцены итога
// (победа/поражение/ничья), модалки смены деления и тира, тост, пипсы,
// полка наград. Ничего не читает из сети и не пишет в прогресс.
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';
import { ArenaResultStarBeat } from '../../../arena/ArenaResultStarBeat';
import { ArenaRankChangeHybrid } from '../../../arena/ArenaRankHybrid';
import { ArenaNextRankToast } from '../../../arena/ArenaNextRankToast';
import { ArenaRankStars } from '../../../arena/ArenaRankStars';
import { ArenaRewards } from '../../../arena/ArenaRewards';
import { ImpactFlash, fireImpactFlash } from '../../../arena/ArenaImpactFx';
import { useTournamentPalette } from '../../../ui/v2_theme';
import { useArenaSound } from '../../../../hooks/use_arena_sound';
import { hapticSuccess } from '../../../../hooks/use-haptics';
import { arenaRankView } from '../../../../modules/arena/rank_engine';
import type { ArenaRankAnnounce } from '../../../../modules/arena/result_view';

/** Сцена-подложка: центрирует карточный демо-контент поверх витрины. */
function DemoStage({ children }: { children: React.ReactNode }) {
  const P = useTournamentPalette();
  return (
    <View pointerEvents="box-none" style={styles.stage}>
      <View style={[styles.stageCard, { backgroundColor: P.card }]}>{children}</View>
    </View>
  );
}

/**
 * Такт звезды на итоге — как на боевом экране arena_results: вспышка, звук
 * starLand и хаптика приходят ровно в посадку через onImpact.
 */
function StarBeatDemo({ ratingAfter, ratingDelta, isDraw }: {
  ratingAfter: number; ratingDelta: number; isDraw: boolean;
}) {
  const playSound = useArenaSound();
  const flash = useSharedValue(0);
  const onImpact = useCallback(() => {
    playSound('starLand');
    void hapticSuccess();
    fireImpactFlash(flash, 0.4);
  }, [flash, playSound]);
  const view = arenaRankView(ratingAfter);
  return (
    <>
      <DemoStage>
        <ArenaResultStarBeat
          ratingAfter={ratingAfter}
          ratingDelta={ratingDelta}
          rankLabel={`${cs('arena_star_ladder_section_title')} · ${view.starsInRank}/3`}
          isDraw={isDraw}
          reduceMotion={false}
          onImpact={ratingDelta > 0 ? onImpact : undefined}
        />
      </DemoStage>
      <ImpactFlash opacity={flash} />
    </>
  );
}

/** Переход ранга для боевой сцены: собирается из настоящего движка. */
function rankTransition(kind: Exclude<ArenaRankAnnounce, { kind: 'none' }>['kind'], fromStars: number, toStars: number): Exclude<ArenaRankAnnounce, { kind: 'none' }> {
  const before = arenaRankView(fromStars);
  const after = arenaRankView(toStars);
  if (kind === 'tier_up' || kind === 'tier_down') {
    return { kind, tierKey: after.tierKey, tierIndex: after.tierIndex, before, after };
  }
  return { kind, before, after };
}

export const SECTION: ShowcaseSection = {
  id: 'arena_star_ladder',
  order: 24,
  title: cs('arena_star_ladder_section_title'),
  items: [
    {
      id: 'arena-star-beat-win-hybrid',
      title: cs('arena_beat_win_title'),
      detail: cs('arena_beat_win_detail'),
      approval: 'accepted',
      kind: 'render',
      // Золото II, 1/3 → 2/3: победа без смены ранга.
      render: () => <StarBeatDemo ratingAfter={23} ratingDelta={1} isDraw={false} />,
    },
    {
      id: 'arena-star-beat-win-rank-up-hybrid',
      title: cs('arena_beat_win_rank_up_title'),
      // зачем: краевой случай — победа, дожимающая третью звезду (Золото III
      // 2/3 → Золото II 0/3). Ряд обнуляется одновременно с ударом; отдельная
      // проверка нужна, потому что именно здесь beatIndex раньше уходил в -1
      // и удар (звук/вспышка) молча не срабатывал — см. ArenaResultStarBeat.tsx.
      detail: cs('arena_beat_win_rank_up_detail'),
      approval: 'accepted',
      kind: 'render',
      render: () => <StarBeatDemo ratingAfter={9} ratingDelta={1} isDraw={false} />,
    },
    {
      id: 'arena-star-beat-loss-hybrid',
      title: cs('arena_beat_loss_title'),
      detail: cs('arena_beat_loss_detail'),
      approval: 'accepted',
      kind: 'render',
      // Золото II, 2/3 → 1/3: поражение без смены ранга.
      render: () => <StarBeatDemo ratingAfter={22} ratingDelta={-1} isDraw={false} />,
    },
    {
      id: 'arena-star-beat-draw-hybrid',
      title: cs('arena_beat_draw_title'),
      detail: cs('arena_beat_draw_detail'),
      approval: 'accepted',
      kind: 'render',
      render: () => <StarBeatDemo ratingAfter={22} ratingDelta={0} isDraw />,
    },
    {
      id: 'arena-rank-shift-up-hybrid',
      title: cs('arena_shift_up_title'),
      detail: cs('arena_shift_up_detail'),
      approval: 'accepted',
      kind: 'render',
      // Золото III 2/3 → Золото II 0/3.
      render: ({ onClose }) => (
        <ArenaRankChangeHybrid
          transition={rankTransition('rank_up', 20, 21)}
          starsAwarded={0}
          chestUnlocked={false}
          onDone={onClose}
        />
      ),
    },
    {
      id: 'arena-rank-shift-down-hybrid',
      title: cs('arena_shift_down_title'),
      detail: cs('arena_shift_down_detail'),
      approval: 'accepted',
      kind: 'render',
      // Золото II 0/3 → Золото III 2/3: «Реванш» и «Позже» оба закрывают демо.
      render: ({ onClose }) => (
        <ArenaRankChangeHybrid
          transition={rankTransition('rank_down', 21, 20)}
          starsAwarded={0}
          chestUnlocked={false}
          onDone={onClose}
          onRevenge={onClose}
        />
      ),
    },
    {
      id: 'arena-tier-up-stars-hybrid',
      title: cs('arena_tier_up_star_title'),
      detail: cs('arena_tier_up_star_detail'),
      approval: 'accepted',
      kind: 'render',
      // Бронза I 2/3 → Серебро III 0/3, с сундуком и рунами кошелька.
      render: ({ onClose }) => (
        <ArenaRankChangeHybrid
          transition={rankTransition('tier_up', 8, 9)}
          starsAwarded={12}
          chestUnlocked
          onDone={onClose}
        />
      ),
    },
    {
      id: 'arena-tier-down-stars-hybrid',
      title: cs('arena_tier_down_star_title'),
      detail: cs('arena_tier_down_star_detail'),
      approval: 'accepted',
      kind: 'render',
      // Серебро III 0/3 → Бронза I 2/3.
      render: ({ onClose }) => (
        <ArenaRankChangeHybrid
          transition={rankTransition('tier_down', 9, 8)}
          starsAwarded={2}
          chestUnlocked={false}
          onDone={onClose}
          onRevenge={onClose}
        />
      ),
    },
    {
      id: 'arena-next-rank-toast-hybrid',
      title: cs('arena_next_rank_toast_title'),
      detail: cs('arena_next_rank_toast_detail'),
      approval: 'accepted',
      kind: 'render',
      render: ({ onClose }) => (
        <ArenaNextRankToast
          label={cs('arena_next_rank_toast_label')}
          visible
          reduceMotion={false}
          onDone={onClose}
          bottomOffset={64}
        />
      ),
    },
    {
      id: 'arena-rank-pips-hybrid',
      title: cs('arena_rank_pips_title'),
      detail: cs('arena_rank_pips_detail'),
      approval: 'accepted',
      kind: 'render',
      render: () => (
        <DemoStage>
          <ArenaRankStars filled={2} size={26} accessibilityLabel={cs('arena_rank_pips_title')} />
        </DemoStage>
      ),
    },
    {
      id: 'arena-rewards-shelf-hybrid',
      title: cs('arena_rewards_shelf_title'),
      detail: cs('arena_rewards_shelf_detail'),
      approval: 'accepted',
      kind: 'render',
      render: () => (
        <DemoStage>
          <ArenaRewards
            reward={{ starsEarned: 12, xpEarned: 40, ratingDelta: 1 }}
            starsLabel={cs('arena_stars_label')}
          />
        </DemoStage>
      ),
    },
  ],
};

const styles = StyleSheet.create({
  stage: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stageCard: {
    width: '100%', maxWidth: 360, borderRadius: 24, padding: 20,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
});
