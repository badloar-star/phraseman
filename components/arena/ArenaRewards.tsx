import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import RuneGlyph from '../RuneGlyph';
import { useTournamentPalette } from '../ui/v2_theme';
import { useLang } from '../LangContext';
import { arenaText } from '../../modules/arena/copy';
import { SUITE } from '../../constants/motionHybrid';
import type { ArenaMatchReward } from '../../modules/arena/contract';
import { useCountUp } from '../league/leagueStatusShared';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

/**
 * Полка наград за матч — чипы «опыт» и «руны» (кошелёк Арены).
 *
 * зачем: владелец (2026-08-23, премиум-макет phraseman-arena-stars.html):
 * «не забывай про начисление опыта — им тоже должно быть место на экране
 * завершения». Чипы входят каскадом 70ms, опыт тикает 0→N. Полка
 * расширяемая: следующая валюта встаёт третьим чипом, ничего не переставляя.
 *
 * Валюта кошелька Арены — руны, не звёзды (переименование 22–23.08,
 * docs/RUNES_RENAME_REGISTRY_2026-08-23.md). Поле `starsEarned` в контракте
 * не переименовано — это серверное имя поля, реестр его прямо запрещает
 * трогать; честный глиф и текст на экране решают вопрос для игрока.
 *
 * `reward` может отсутствовать: итог ещё не пришёл с сервера. Раньше в этом
 * случае рисовалось «+0» — то есть «ты не заработал ничего» вместо честного
 * «пока не знаю». Ноль — ответ, отсутствие ответа — прочерк.
 */

function RewardChip({ children, delayMs, reduceMotion }: {
  children: React.ReactNode; delayMs: number; reduceMotion: boolean;
}) {
  const P = useTournamentPalette();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const y = useSharedValue(reduceMotion ? 0 : 10);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }));
    y.value = withDelay(delayMs, withSpring(0, SUITE.pulse));
    return () => { cancelAnimation(opacity); cancelAnimation(y); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
  return (
    <Reanimated.View style={[styles.chip, { backgroundColor: P.elev }, style]}>
      {children}
    </Reanimated.View>
  );
}

export function ArenaRewards({ reward, starsLabel }: { reward?: ArenaMatchReward; starsLabel: string }) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const known = reward !== undefined;
  const shownRunes = useCountUp(reward?.starsEarned ?? 0, reduceMotion);
  const shownXp = useCountUp(reward?.xpEarned ?? 0, reduceMotion);
  const showRunes = !known || Number(reward?.starsEarned ?? 0) > 0;
  return (
    <View style={styles.row} accessibilityLabel={known
      ? `+${reward?.xpEarned ?? 0} ${arenaText(lang, 'xpLabel')}${showRunes ? `, +${reward?.starsEarned ?? 0} ${starsLabel}` : ''}`
      : undefined}
    >
      <RewardChip delayMs={0} reduceMotion={reduceMotion}>
        <Ionicons name="flash" size={15} color={P.accent} />
        <Text style={[styles.value, { color: known ? P.text : P.muted }]}>{known ? `+${shownXp}` : '—'}</Text>
        <Text style={[styles.label, { color: P.muted }]}>{arenaText(lang, 'xpLabel')}</Text>
      </RewardChip>
      {showRunes ? (
        <RewardChip delayMs={70} reduceMotion={reduceMotion}>
          <RuneGlyph size={16} color={P.gold} />
          <Text style={[styles.value, { color: known ? P.text : P.muted }]}>{known ? `+${shownRunes}` : '—'}</Text>
          <Text style={[styles.label, { color: P.muted }]}>{starsLabel}</Text>
        </RewardChip>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Высота полки постоянна с первого кадра — чипы входят анимацией
  // opacity/translate, геометрия не прыгает (layout stability).
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8, minHeight: 40 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
  },
  value: { fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  label: { fontSize: 12, fontWeight: '700' },
});
