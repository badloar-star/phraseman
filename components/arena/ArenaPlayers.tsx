import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import AvatarView from '../AvatarView';
import { V2Counter } from '../ui/v2_ui';
import { useTournamentPalette } from '../ui/v2_theme';
import type { ArenaPlayer } from '../../modules/arena/contract';
import { useCountUp } from '../league/leagueStatusShared';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

type ArenaDisplayedPlayer = Omit<ArenaPlayer, 'score'> & Readonly<{ score: number | null }>;

function Player({ player, active, animateScore, compact, answered = false, answeredLabel }: { player?: ArenaDisplayedPlayer; active: boolean; animateScore: boolean; compact: boolean; answered?: boolean; answeredLabel?: string }) {
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();
  const knownScore = typeof player?.score === 'number' ? player.score : null;
  const shownScore = useCountUp(knownScore ?? 0, reduceMotion || !animateScore);
  /**
   * Владелец (2026-08-21): ник стоит под аватаром и не обрезается.
   * В одной строке между аватаром, счётом и VS ему оставалась ровно
   * одна буква; вертикальный identity-блок отдаёт нику всю ширину аватара и
   * позволяет перенос, если имя действительно длинное.
   */
  const { width } = useWindowDimensions();
  const avatarSize = compact || width < 360 ? 34 : 44;
  return (
    <View style={[styles.player, compact ? styles.playerCompact : null]}>
      <View style={styles.identity}>
        <View>
          <AvatarView avatar={player?.avatar} auraId={player?.aura} size={avatarSize} animateAura={false} ownerActive={active} />
          {/*
            Отметка «ответил» у соперника.

            зачем (2026-08-23): факт хода соперника сообщался ТОЛЬКО звуком, а
            он у большинства выключен — владелец играл против бота и не понимал,
            отвечает тот вообще или нет.

            Верность чужого ответа здесь НЕ показывается намеренно: тик
            приходит, пока игрок ещё отвечает на то же задание, и «соперник
            ответил верно» было бы подсказкой ответа. Сообщаем факт хода, а не
            его содержание.

            Сидит на углу аватара абсолютом: появление не двигает вёрстку.

            Голая галочка озвучилась бы бессмысленным символом, поэтому у неё
            есть подпись для скринридера. Видимого текста это не добавляет:
            владелец запретил именно загромождающий HUD текст, а не сигнал.
          */}
          {answered ? (
            <Animated.View
              accessibilityLabel={answeredLabel}
              entering={reduceMotion ? FadeIn.duration(120) : ZoomIn.springify().damping(14).stiffness(220)}
              style={[styles.answered, { backgroundColor: P.accent }]}
            >
              <Text accessibilityElementsHidden style={[styles.answeredGlyph, { color: P.accentText }]}>✓</Text>
            </Animated.View>
          ) : null}
        </View>
        <Text style={[styles.name, { color: P.text }]}>{player?.name ?? '—'}</Text>
      </View>
      {/* Про игрока, которого ещё нет, счёт неизвестен. Ноль здесь — это
          утверждение, а не отсутствие данных. */}
      {player && knownScore !== null
        ? <V2Counter value={shownScore} />
        : <Text style={[styles.name, { color: P.muted }]}>—</Text>}
    </View>
  );
}

export function ArenaPlayers({ players, active, animateScore = false, compact = false, answeredUid = null, answeredLabel }: { players: readonly ArenaDisplayedPlayer[]; active: boolean; animateScore?: boolean; compact?: boolean; answeredUid?: string | null; answeredLabel?: string }) {
  const P = useTournamentPalette();
  return (
    <View style={[styles.root, compact ? styles.rootCompact : null, { backgroundColor: P.elev }]}>
      <Player player={players[0]} active={active} animateScore={animateScore} compact={compact} answered={Boolean(answeredUid) && players[0]?.uid === answeredUid} answeredLabel={answeredLabel} />
      <Text accessibilityElementsHidden style={[styles.vs, { color: P.accent }]}>VS</Text>
      <Player player={players[1]} active={active} animateScore={animateScore} compact={compact} answered={Boolean(answeredUid) && players[1]?.uid === answeredUid} answeredLabel={answeredLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', minHeight: 86, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  rootCompact: { minHeight: 72, borderRadius: 18, paddingHorizontal: 10, gap: 6 },
  player: { minHeight: 48, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  playerCompact: { gap: 5 },
  identity: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 3 },
  name: { alignSelf: 'stretch', textAlign: 'center', fontSize: 11.5, fontWeight: '800' },
  vs: { minWidth: 40, textAlign: 'center', fontSize: 13, fontWeight: '900' },
  answered: { position: 'absolute', right: -2, bottom: -2, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  answeredGlyph: { fontSize: 11, fontWeight: '900', lineHeight: 14 },
});
