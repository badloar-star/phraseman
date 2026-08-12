import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AvatarView from '../AvatarView';
import { V2Counter } from '../tournament/tournament_v2_ui';
import { useTournamentPalette } from '../tournament/tournament_theme';
import type { ArenaPlayer } from '../../modules/arena/contract';
import { useCountUp } from '../league/leagueStatusShared';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

function Player({ player, active, botLabel, animateScore }: { player?: ArenaPlayer; active: boolean; botLabel?: string; animateScore: boolean }) {
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();
  const shownScore = useCountUp(player?.score ?? 0, reduceMotion || !animateScore);
  return (
    <View style={styles.player}>
      <AvatarView avatar={player?.avatar} auraId={player?.aura} size={44} animateAura={false} ownerActive={active} />
      <View style={styles.copy}>
        <Text style={[styles.name, { color: P.text }]}>{player?.name ?? '—'}</Text>
        {player?.isBot && botLabel ? <Text style={[styles.bot, { color: P.muted }]}>{botLabel}</Text> : null}
      </View>
      <V2Counter value={shownScore} />
    </View>
  );
}

export function ArenaPlayers({ players, active, botLabel, animateScore = false }: { players: readonly ArenaPlayer[]; active: boolean; botLabel?: string; animateScore?: boolean }) {
  const P = useTournamentPalette();
  return (
    <View style={[styles.root, { backgroundColor: P.elev }]}>
      <Player player={players[0]} active={active} botLabel={botLabel} animateScore={animateScore} />
      <Text accessibilityElementsHidden style={[styles.vs, { color: P.accent }]}>VS</Text>
      <Player player={players[1]} active={active} botLabel={botLabel} animateScore={animateScore} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 86, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  player: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  copy: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '800' },
  bot: { marginTop: 1, fontSize: 10, fontWeight: '700' },
  vs: { fontSize: 13, fontWeight: '900' },
});
