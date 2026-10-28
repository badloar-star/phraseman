// ═══════════════════════════════════════════════════════════════════════════
// frames_social.tsx — кадры 9–11 и 17 макета stories-templates-v1.html: дуэль выиграна, друг обогнал, новый друг, пригласи друга.
//
// зачем (владелец 28.10: шаблоны «именно так», пиксель в пиксель): разметка, задержки и кегли — из `render()` TPL макета построчно
// (duel: монеты 76 всплывают 120/220, очки считаются с 500 за 880, свои точки загораются через 220 мс; overtaken: дорожки растут за 1,3 с,
// дорожка друга — в акценте; friend: монеты съезжаются за 700 мс, галочка 800; invite: карточка кода всплывает 150). Монета = аватар.
// Имя друга не переводится (данные события); род не угадываем (строки Переводчика без рода).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import SpireRankCoin from '../../spire/SpireRankCoin';
import { Art, FrameRoot, H1, Ov, P } from './story_template_kit';
import { CountUp, Enter } from './story_template_motion';
import { AtTime, FromSide, Grow, RingedCoin } from './story_template_parts';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryFrameProps } from './story_template_registry';
import { tplText } from './story_template_strings';

// ── 9 · дуэль выиграна ───────────────────────────────────────────────────────────────────────────────────────────────

/** Точки фраз: свои загораются по одной (500 + 220·i мс), чужие стоят сразу; погасшие — текст·16 %. */
const Ticks = memo(function Ticks({ on, total, stagger }: Readonly<{ on: number; total: number; stagger: boolean }>) {
  const pal = useStoryTemplatePalette();
  const dots = Array.from({ length: Math.max(0, total) }, (_, i) => ({ id: `t${i}`, lit: i < on, at: 500 + i * 220 }));
  return (
    <View style={f.ticks}>
      {dots.map((dot) => (dot.lit && stagger
        ? <AtTime key={dot.id} at={dot.at} style={[f.tick, { backgroundColor: pal.accG }]} />
        : <View key={dot.id} style={[f.tick, { backgroundColor: dot.lit ? pal.accG : mix(pal.tx, 0.16) }]} />))}
    </View>
  );
});

export const DuelFrame = memo(function DuelFrame({ tpl, lang, myRank }: StoryFrameProps<'duel'>) {
  const pal = useStoryTemplatePalette();
  const min = Math.floor(tpl.seconds / 60);
  const sec = tpl.seconds % 60;
  return (
    <FrameRoot testID="story-tpl-duel">
      <Art>
        <View style={f.duel}>
          <Enter kind="pop" d={120} style={f.side}>
            <RingedCoin rank={myRank} size={76} ring={`0 0 0 4px ${pal.accG}, 0 0 0 10px ${mix(pal.accG, 0.2)}`} />
            <Text style={[f.sideName, { color: pal.tx }]}>{tplText(lang, 'you')}</Text>
            <Ticks on={tpl.myScore} total={tpl.rounds} stagger />
          </Enter>
          <Enter d={300} style={f.score}>
            <CountUp to={tpl.myScore} d={500} dur={880} style={[f.scoreN, { color: pal.tx }]} />
            <Text style={[f.colon, { color: pal.sec }]}>:</Text>
            <CountUp to={tpl.theirScore} d={500} dur={880} style={[f.scoreN, { color: pal.tx }]} />
          </Enter>
          <Enter kind="pop" d={220} style={f.side}>
            <SpireRankCoin rank={tpl.friend.rank} size={76} />
            <Text style={[f.sideName, { color: pal.tx }]}>{tpl.friend.name}</Text>
            <Ticks on={tpl.theirScore} total={tpl.rounds} stagger={false} />
          </Enter>
        </View>
      </Art>
      <Ov text={tplText(lang, 'duelOverline')} d={1300} />
      <H1 text={tplText(lang, 'duelWinTitle', { my: tpl.myScore, their: tpl.theirScore })} d0={1360} />
      <P text={tplText(lang, 'duelDetails', { name: tpl.friend.name, min, sec })} d={1540} />
    </FrameRoot>
  );
});

// ── 10 · друг обогнал ────────────────────────────────────────────────────────────────────────────────────────────────

const RaceRow = memo(function RaceRow({ name, rank, share, value, lead }: Readonly<{ name: string; rank: number | null; share: number; value: number; lead: boolean }>) {
  const pal = useStoryTemplatePalette();
  return (
    <View style={f.raceRow}>
      <Text style={[f.raceName, { color: pal.sec }]}>{name}</Text>
      <SpireRankCoin rank={rank} size={36} />
      <View style={[f.track, { backgroundColor: mix(pal.tx, 0.1) }]}>
        <Grow axis="x" to={share} d={300} dur={1300} style={[f.trackFill, { backgroundColor: lead ? pal.accG : mix(pal.tx, 0.32) }]} />
      </View>
      <Enter d={900} style={f.raceValueBox}>
        <CountUp to={value} d={300} dur={1200} style={[f.raceValue, { color: pal.tx }]} />
      </Enter>
    </View>
  );
});

export const OvertakenFrame = memo(function OvertakenFrame({ tpl, lang, myRank }: StoryFrameProps<'overtaken'>) {
  const top = Math.max(1, tpl.friendCoins, tpl.myCoins);
  const gap = Math.max(0, tpl.friendCoins - tpl.myCoins); // guard-ok: разрыв для подписи кадра, баланс не меняется
  return (
    <FrameRoot testID="story-tpl-overtaken">
      <Art style={f.wide}>
        <View style={f.race}>
          <RaceRow name={tpl.friend.name} rank={tpl.friend.rank} share={tpl.friendCoins / top} value={tpl.friendCoins} lead />
          <RaceRow name={tplText(lang, 'you')} rank={myRank} share={tpl.myCoins / top} value={tpl.myCoins} lead={false} />
        </View>
      </Art>
      <Ov text={tplText(lang, 'weekCoinsOverline')} d={1300} />
      <H1 text={tplText(lang, 'overtakenTitle', { name: tpl.friend.name })} d0={1360} />
      <P text={tplText(lang, 'overtakenGap', { gap, daysLeft: tpl.daysLeft })} d={1560} />
    </FrameRoot>
  );
});

// ── 11 · новый друг ──────────────────────────────────────────────────────────────────────────────────────────────────

export const FriendFrame = memo(function FriendFrame({ tpl, lang, myRank }: StoryFrameProps<'friend'>) {
  const pal = useStoryTemplatePalette();
  return (
    <FrameRoot testID="story-tpl-friend">
      <Art>
        <View style={f.pair}>
          <FromSide side="left"><SpireRankCoin rank={myRank} size={96} /></FromSide>
          <FromSide side="right" style={f.pairSecond}><SpireRankCoin rank={tpl.friend.rank} size={96} /></FromSide>
          <Enter kind="pop" d={800} style={[f.ok, { backgroundColor: pal.accG }]}>
            <Ionicons name="checkmark" size={22} color={pal.accInk} style={f.okIcon} />
          </Enter>
        </View>
      </Art>
      <Ov text={tplText(lang, 'friendsOverline')} d={900} />
      <H1 text={tplText(lang, 'friendJoinedTitle', { name: tpl.friend.name })} d0={960} />
      <P text={tplText(lang, 'friendJoinedText')} d={1180} />
    </FrameRoot>
  );
});

// ── 17 · пригласи друга ──────────────────────────────────────────────────────────────────────────────────────────────

export const InviteFrame = memo(function InviteFrame({ tpl, lang, myRank }: StoryFrameProps<'invite'>) {
  const pal = useStoryTemplatePalette();
  // .avs .coin: кольцо 3 dp цветом фона просмотра
  const ring = `0 0 0 3px ${pal.bgMid}`;
  return (
    <FrameRoot testID="story-tpl-invite">
      <Enter kind="rise" d={150} style={[f.inv, { backgroundColor: pal.card, boxShadow: `0 18px 44px -18px ${mix(pal.shTint, 0.7)}` }]}>
        <Text style={[f.invK, { color: pal.sec }]}>{tplText(lang, 'inviteCodeLabel')}</Text>
        <Text style={[f.invCode, { color: pal.tx }]} selectable>{tpl.code}</Text>
        <View style={f.avs}>
          <RingedCoin rank={myRank} size={40} ring={ring} style={f.avCoin} />
          <View style={[f.avCoin, f.plus, { backgroundColor: mix(pal.tx, 0.14), boxShadow: ring }]}>
            <Ionicons name="add" size={20} color={pal.tx} style={f.plusIcon} />
          </View>
        </View>
      </Enter>
      <Ov text={tplText(lang, 'inviteOverline')} d={600} />
      <H1 text={tplText(lang, 'inviteTitle')} d0={660} />
      <P text={tplText(lang, 'inviteText')} d={880} />
    </FrameRoot>
  );
});

const f = StyleSheet.create({
  // .duel: ряд, зазор 22; сторона — колонка, зазор 8; имя 13/700 (строка 21)
  duel: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  side: { alignItems: 'center', gap: 8 },
  sideName: { fontSize: 13, lineHeight: 21, fontWeight: '700', maxWidth: 96 },
  ticks: { flexDirection: 'row', gap: 4 },
  tick: { width: 10, height: 10, borderRadius: 5 },
  // .duel .sc 56/60, −2; двоеточие 40, обычный вес, вторичный
  score: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreN: { fontSize: 56, lineHeight: 60, fontWeight: '800', letterSpacing: -2 },
  colon: { fontSize: 40, lineHeight: 60, fontWeight: '400' },
  // .race: колонка, зазор 14; строка: отступ 10, монета 36, дорожка 28 (радиус 14), число 62 справа 15/700
  wide: { alignSelf: 'stretch' },
  race: { alignSelf: 'stretch', gap: 14 },
  raceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  raceName: { position: 'absolute', left: 58, top: -18, fontSize: 12, lineHeight: 21, maxWidth: 200 },
  track: { flex: 1, minWidth: 0, height: 28, borderRadius: 14, overflow: 'hidden' },
  trackFill: { height: '100%', width: '100%', borderRadius: 14 },
  raceValueBox: { width: 62 },
  raceValue: { fontSize: 15, lineHeight: 21, fontWeight: '700', textAlign: 'right' },
  // .pair: высота 110; вторая монета −14; галочка 40 по центру
  pair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 110 },
  pairSecond: { marginLeft: -14 },
  ok: { position: 'absolute', left: '50%', top: '50%', width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  okIcon: { lineHeight: 22 },
  // .inv: до 300, поля 18, радиус 24, колонка с зазором 6, отступ снизу 22
  inv: { width: '100%', maxWidth: 300, padding: 18, borderRadius: 24, alignItems: 'center', gap: 6, marginBottom: 22 },
  invK: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  invCode: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: 3, fontVariant: ['tabular-nums'] },
  avs: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  avCoin: { marginHorizontal: -6 }, // guard-ok: нахлёст монет в ряду аватаров (вид), не баланс
  plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  plusIcon: { lineHeight: 20 },
});
