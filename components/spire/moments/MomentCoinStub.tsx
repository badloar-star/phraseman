// ═══════════════════════════════════════════════════════════════════════════
// MomentCoinStub.tsx — ВРЕМЕННАЯ статичная монета-персонаж для моментов Пика (интерфейс пропсов как у будущего components/moments/MomentCoin.tsx Авторизации).
//
// зачем (координатор 14.10): анимированного персонажа (sleep / peek / wake / cheer, эмоции) делает Авторизация общим компонентом; пока его нет,
// моменты Пика ставят эту заглушку: настоящая монета ранга (assets coin_rank_00…19), реплика-пузырь, значок сна, «!» — БЕЗ анимации настроений.
// Смена на общий компонент — одна строка в moments_coin.ts. Настроение влияет только на статичный вид: sleep — чуть приглушена и с «z», peek/cheer — как idle.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSpirePalette } from '../useSpirePalette';
import { useSpireShadow } from '../useSpireShadow';
import SpireRankCoin from '../SpireRankCoin';

export type MomentCoinMood = 'idle' | 'cheer' | 'nod' | 'sleep' | 'peek';

export type MomentCoinProps = Readonly<{
  /** Ранг монеты 0…19; null — базовая монета. */
  rank: number | null;
  size: number;
  mood: MomentCoinMood;
  /** Реплика-пузырь над монетой («Держимся.»). */
  say?: string;
  /** Значок сна при mood='sleep'. */
  zz?: boolean;
  glints?: boolean;
  emote?: 'star' | 'bang' | null;
  /** Тап по монете (в m03 будит). */
  onPress?: () => void;
  testID?: string;
}>;

function MomentCoinStub({ rank, size, mood, say, zz, emote, onPress, testID }: MomentCoinProps) {
  const p = useSpirePalette();
  const sh = useSpireShadow();
  const body = (
    <View style={[s.wrap, mood === 'sleep' ? s.sleepy : null]}>
      {say ? (
        <View style={[s.say, { backgroundColor: p.card }, sh.plate]} accessible accessibilityLabel={say}>
          <Text style={[s.sayText, { color: p.text }]}>{say}</Text>
        </View>
      ) : null}
      <SpireRankCoin rank={rank} size={size} />
      {mood === 'sleep' && zz ? <Text style={[s.zz, { color: p.textSecondary }]} accessible={false}>z</Text> : null}
      {emote === 'bang' ? <Text style={s.bang} accessible={false}>!</Text> : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{body}</View>;
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={say ?? 'coin'} hitSlop={12}>
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  sleepy: { opacity: 0.82 },
  // `.cc .say` эталона: пузырь над монетой на 10 выше, скругление 18 (низ-лево 6), 15/700
  say: { position: 'absolute', bottom: '100%', marginBottom: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, borderBottomLeftRadius: 6 },
  sayText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  zz: { position: 'absolute', right: -8, top: -4, fontSize: 18, fontWeight: '800' },
  bang: { position: 'absolute', right: -6, top: -10, fontSize: 26, fontWeight: '900', color: '#FFD166' }, // theme-exempt: «!» персонажа — иллюстрация (эталон .emo.bang), не токен темы
});

export default memo(MomentCoinStub);
