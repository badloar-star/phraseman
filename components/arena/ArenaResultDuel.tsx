import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import AvatarView from '../AvatarView';
import { useTournamentPalette } from '../ui/v2_theme';

/**
 * ArenaResultDuel — верх экрана результатов Арены, вариант «Дуэль».
 *
 * зачем (владелец 2026-09-04, выбор из трёх макетов
 * `.motion-mockups/phraseman-arena-results.html`): прежний верх показывал два
 * счёта в отдельных плитках и не давал почувствовать САМО соперничество.
 * Здесь оба счёта растут одновременно и гонятся друг за другом, а полоса
 * делит экран между игроками пропорционально набранному — сразу видно,
 * насколько ты обошёл соперника или отстал.
 *
 * Метка исхода появляется ПОСЛЕ гонки, а не до: объявить победу раньше, чем
 * доехали числа, значит обесценить сам подсчёт. Она же стоит НАД парой, а не
 * в углу — в углу она наезжала на аватар соперника (поймано на макете).
 *
 * Честность: `opponentScore === null` означает «счёт соперника ещё не известен»
 * (живой соперник молчит). Тогда рисуется прочерк и НЕ объявляется исход —
 * ноль вместо прочерка был бы утверждением «он не набрал ничего».
 *
 * Производительность: всё движение — только `opacity`/`transform`/`width`
 * на UI-потоке Reanimated. Числа докручиваются извне (`viewerShown`), поэтому
 * компонент не держит собственного состояния и не перерисовывает дерево.
 */

export type ArenaResultDuelOutcome = 'win' | 'loss' | 'draw' | null;

type Props = Readonly<{
  viewerName: string;
  opponentName: string;
  opponentAvatar?: string;
  opponentAura?: string;
  /** Уже докрученное значение своего счёта. */
  viewerShown: number;
  /** Уже докрученное значение счёта соперника; null — счёт неизвестен. */
  opponentShown: number | null;
  /** Итоговые значения: по ним считается доля полосы. */
  viewerScore: number;
  opponentScore: number | null;
  outcome: ArenaResultDuelOutcome;
  outcomeLabel: string | null;
  /**
   * Подстрочник под полосой: «обошёл на 8» / «не хватило 7» / «равный счёт».
   *
   * зачем: разрыв отвечает на вопрос «насколько», который сами числа не
   * проговаривают — «26 против 18» читается дольше, чем «обошёл на 8».
   */
  leadLabel: string | null;
  reduceMotion: boolean;
  /** Экран владеет runtime: на премаунте таба анимацию не гоняем. */
  active?: boolean;
}>;

/** Доля полосы для своего счёта. Оба нуля — ровно пополам, а не деление на ноль. */
export function arenaDuelShare(viewerScore: number, opponentScore: number | null): number {
  const mine = Math.max(0, viewerScore);
  const theirs = Math.max(0, opponentScore ?? 0);
  const total = mine + theirs;
  if (total <= 0) return 0.5;
  return mine / total;
}

const RACE_MS = 900;
const TAG_DELAY_MS = 940;

export const ArenaResultDuel = memo(function ArenaResultDuel({
  viewerName,
  opponentName,
  opponentAvatar,
  opponentAura,
  viewerShown,
  opponentShown,
  viewerScore,
  opponentScore,
  outcome,
  outcomeLabel,
  leadLabel,
  reduceMotion,
  active = true,
}: Props) {
  const P = useTournamentPalette();
  const share = arenaDuelShare(viewerScore, opponentScore);

  const fill = useSharedValue(reduceMotion ? share : 0);
  const tag = useSharedValue(reduceMotion ? 1 : 0);
  const sub = useSharedValue(reduceMotion ? 1 : 0);
  const avatarPop = useSharedValue(1);
  /** Просадка аватара при поражении: выдох вниз, а не сжатие. */
  const avatarDip = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !active) {
      // Reduced Motion и премаунт получают финальный кадр без движения.
      fill.value = share;
      tag.value = 1;
      sub.value = 1;
      return;
    }
    fill.value = withTiming(share, { duration: RACE_MS, easing: Easing.out(Easing.cubic) });
    tag.value = withDelay(TAG_DELAY_MS, withTiming(1, { duration: 420 }));
    sub.value = withDelay(TAG_DELAY_MS + 220, withTiming(1, { duration: 400 }));
    /*
     * У каждого исхода СВОЙ характер движения — цвета метки мало.
     *
     * Победа бьёт вверх (толчок), поражение выдыхает вниз (короткая просадка,
     * без унижения), ничья мягко дышит. Это тот же язык, что у звёздного такта
     * (`ArenaResultStarBeat`): «победная звезда прилетает и бьёт, потерянная
     * выдыхает, ничья дышит» — сцены не должны говорить на разных языках.
     */
    if (outcome === 'win') {
      avatarPop.value = withDelay(TAG_DELAY_MS, withSequence(
        withTiming(1.14, { duration: 260, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
      ));
    } else if (outcome === 'loss') {
      avatarDip.value = withDelay(TAG_DELAY_MS, withSequence(
        withTiming(5, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }),
      ));
    } else if (outcome === 'draw') {
      avatarPop.value = withDelay(TAG_DELAY_MS, withSequence(
        withTiming(1.05, { duration: 350, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 350, easing: Easing.inOut(Easing.quad) }),
      ));
    }
  }, [active, avatarDip, avatarPop, fill, outcome, reduceMotion, share, sub, tag]);

  const fillStyle = useAnimatedStyle(() => ({ flexGrow: fill.value }));
  const foeFillStyle = useAnimatedStyle(() => ({ flexGrow: 1 - fill.value }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tag.value,
    transform: [{ scale: 0.8 + tag.value * 0.2 }],
  }));
  const viewerAvatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarPop.value }, { translateY: avatarDip.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({
    opacity: sub.value,
    transform: [{ translateY: (1 - sub.value) * 6 }],
  }));

  const outcomeColor = outcome === 'win' ? P.accent : outcome === 'loss' ? P.danger : P.muted;
  const outcomeBg = outcome === 'win' ? P.accentSoft : outcome === 'loss' ? P.dangerSoft : P.elev2;

  return (
    <View style={[styles.root, { backgroundColor: P.elev }]}>
      {/* Исход объявляется только когда он ДЕЙСТВИТЕЛЬНО известен. */}
      {outcomeLabel ? (
        <Animated.View style={[styles.tag, { backgroundColor: outcomeBg }, tagStyle]}>
          <Text style={[styles.tagText, { color: outcomeColor }]}>{outcomeLabel}</Text>
        </Animated.View>
      ) : null}

      <View style={styles.row}>
        <View style={styles.side}>
          <Animated.View style={viewerAvatarStyle}>
            <AvatarView size={56} animateAura={false} ownerActive={active} />
          </Animated.View>
          <Text numberOfLines={1} style={[styles.name, { color: P.text }]}>{viewerName}</Text>
          <Text style={[styles.points, { color: P.text }]}>{viewerShown}</Text>
        </View>

        <Text accessibilityElementsHidden style={[styles.vs, { color: P.muted }]}>VS</Text>

        <View style={styles.side}>
          <AvatarView
            avatar={opponentAvatar}
            auraId={opponentAura}
            size={56}
            animateAura={false}
            ownerActive={active}
          />
          <Text numberOfLines={1} style={[styles.name, { color: P.muted }]}>{opponentName}</Text>
          {/* Прочерк, а не ноль: счёт соперника может быть просто неизвестен. */}
          <Text style={[styles.points, { color: P.muted }]}>
            {opponentShown === null ? '—' : opponentShown}
          </Text>
        </View>
      </View>

      <View style={[styles.bar, { backgroundColor: P.elev2 }]}>
        <Animated.View style={[styles.fill, { backgroundColor: outcomeColor }, fillStyle]} />
        <Animated.View style={[styles.fill, styles.fillFoe, { backgroundColor: P.muted }, foeFillStyle]} />
      </View>

      {/* Разрыв словами: «26 против 18» читается дольше, чем «обошёл на 8». */}
      {leadLabel ? (
        <Animated.Text style={[styles.lead, { color: P.muted }, subStyle]}>{leadLabel}</Animated.Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  // Разделение тоном и скруглением: обводок нет (прямой запрет владельца).
  root: { borderRadius: 26, paddingHorizontal: 18, paddingVertical: 20, gap: 16 },
  tag: { alignSelf: 'center', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  tagText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  side: { flex: 1, alignItems: 'center', gap: 8, minWidth: 0 },
  name: { alignSelf: 'stretch', textAlign: 'center', fontSize: 12, fontWeight: '800' },
  points: { fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  vs: { minWidth: 40, textAlign: 'center', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  lead: { textAlign: 'center', fontSize: 12, fontWeight: '700' },
  bar: { height: 8, borderRadius: 99, overflow: 'hidden', flexDirection: 'row' },
  fill: { height: '100%', flexBasis: 0 },
  fillFoe: { opacity: 0.55 },
});

export default ArenaResultDuel;
