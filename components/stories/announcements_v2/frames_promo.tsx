// ═══════════════════════════════════════════════════════════════════════════
// frames_promo.tsx — кадры 22–25 макета stories-announcements-v1.html (v2.1), группа «Акции»: Plus, Набор месяца, Челлендж недели,
// Пригласи друзей.
//
// зачем (владелец 28.10: «точно так же, как на макете»): разметка, размеры, задержки и кривые — из render() TPL и CSS макета построчно
// (plus: кольцо 180 вылетает .3 → 1 за 900 с 100 и вращается за 9 с, волна-кольцо .5 → 4,5 и ,55 → 0 за 1700 с 500 в точке 50 %/32 % кадра,
// метка 500, заголовок 560, блок 1000; contest: конфетти 20 с 1500, пьедестал 2 · 1 · 3 — столбики 112/140/84 растут за 800 с 400/700/1000,
// монеты 44 всплывают через +250 и подпрыгивают на 26 за 700 через +900, метка 1100, заголовок 1160; challenge: метка 100, заголовок 220,
// дорожка 7 дней — заливка до 2/6 за 1200 с 400, монета 40 бежит к третьему узлу, цель — пятый узел с кольцом 3, блок 1500; invite: монеты 96
// съезжаются с ±48 за 700 с 100, пунктир за 1100 с 300, карточка кода переворачивается по Y 90° → 0 за 800 с 900, метка 1300, заголовок
// 1360, блок 1700). Кнопку действия (plus / invite) рисует просмотр под кадром — в кадре её нет.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import SpireRankCoin from '../../spire/SpireRankCoin';
import { useStoryFrameClock } from '../templates/story_frame_clock';
import { DAY_MS, weekdayLetter } from '../templates/story_template_dates';
import { Confetti } from '../templates/story_template_kit';
import { Enter } from '../templates/story_template_motion';
import { Grow } from '../templates/story_template_parts';
import { mix } from '../templates/story_template_palette';
import { AnnRoot, EASE_CSS_OUT, EASE_OUT, EASE_SPRING, Keyframed, TextZone, type Key } from './announcement_v2_motion';
import { useAnnPalette } from './announcement_v2_palette';
import { ConicRing } from './announcement_v2_parts';
import { DashedLink } from './announcement_v2_particles';
import { annText } from './announcement_v2_strings';
import { AnnBadge, AnnBlocks, AnnTitle, type AnnFrameProps } from './announcement_v2_text';

// ── 22 · Plus — кольцо вылетает из центра, второе кольцо расходится волной ───────────────────────────────────────────

/** stZoomIn: scale .3 → 1 с проявлением (900 мс, .23,1,.32,1, после 100). */
const ZOOM_IN: readonly Key[] = [{ at: 0, scale: 0.3, opacity: 0 }, { at: 1, scale: 1, opacity: 1 }];
/** stRingOut: scale .5 → 4,5, opacity ,55 → 0 (1700 мс, CSS ease-out, после 500; до старта — первый ключ, как fill both). */
const RING_OUT: readonly Key[] = [{ at: 0, scale: 0.5, opacity: 0.55 }, { at: 1, scale: 4.5, opacity: 0 }];

/** .bigring — копия кольца Plus в точке 50 %/32 % кадра (слой .fx). */
const BigRing = memo(function BigRing() {
  // зачем: у .bigring макета нет stSpin — только волна; период 0 держит кольцо в покое (loop() часов кадра: период ≤ 0 → 0)
  return (
    <Keyframed keys={RING_OUT} d={500} dur={1700} ease={EASE_CSS_OUT} style={f.bigRing}>
      <ConicRing periodMs={0} />
    </Keyframed>
  );
});

export const PlusFrame = memo(function PlusFrame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const { final } = useStoryFrameClock();
  // зачем: в конечном состоянии волна уже растаяла (opacity 0) — слой не рисуем вовсе (бриф: «в final не рисовать»)
  return (
    <AnnRoot testID="story-ann-plus" layer={final ? undefined : <BigRing />}>
      <View style={f.art}>
        <Keyframed keys={ZOOM_IN} d={100} dur={900} ease={EASE_OUT} style={f.pz2}>
          <ConicRing periodMs={9000} style={f.ringc} pointerEvents="none" />
          <Text style={[f.t3, { color: pal.tx }]}>{annText(lang, 'plus')}</Text>
        </Keyframed>
      </View>
      <AnnBadge text={content.badge} d={500} />
      <AnnTitle text={content.title} d0={560} />
      <AnnBlocks blocks={content.blocks} d0={1000} max={1} />
    </AnnRoot>
  );
});

// ── 23 · Набор месяца — пьедестал 2 · 1 · 3, монеты авторов прыгают, конфетти ────────────────────────────────────────

type PodiumSlot = Readonly<{ k: 0 | 1 | 2; h: number; rank: number; d: number }>;
type PodiumCol = PodiumSlot & Readonly<{ set: string; author: string }>;

/** Колонки слева направо — order макета [k, h, rank, d]: номер блока («набор · автор»), высота столбика, ранг монеты, задержка роста. */
const PODIUM: readonly PodiumSlot[] = [
  { k: 1, h: 112, rank: 9, d: 400 },
  { k: 0, h: 140, rank: 5, d: 700 },
  { k: 2, h: 84, rank: 3, d: 1000 },
];
/** stJump: 0 → −26 → 0 за 700; пружина .34,1.56,.64,1 на каждом отрезке (как animation-timing-function в CSS). */
const JUMP: readonly Key[] = [{ at: 0, y: 0 }, { at: 0.4, y: -26 }, { at: 1, y: 0 }];

const PodiumColumn = memo(function PodiumColumn({ col }: Readonly<{ col: PodiumCol }>) {
  const pal = useAnnPalette();
  // .pc.me макета — первый блок (k = 0): столбик accent со свечением 0 −10 40 −10 accentGlow, номер accentInk
  const lead = col.k === 0;
  return (
    <View style={f.pc}>
      <Enter kind="pop" d={col.d + 250}>
        <Keyframed keys={JUMP} d={col.d + 900} dur={700} ease={EASE_SPRING}>
          <SpireRankCoin rank={col.rank} size={44} />
        </Keyframed>
      </Enter>
      {/* зачем: пустая подпись в макете — пустой span высотой 0, но с зазором 6 — пустой View держит ту же геометрию */}
      {col.set ? <Text style={[f.pcName, { color: pal.tx }]}>{col.set}</Text> : <View />}
      <Grow axis="y" d={col.d} dur={800} style={[f.bar, { height: col.h, backgroundColor: lead ? pal.accG : mix(pal.tx, 0.12) }, lead ? { boxShadow: `0 -10px 40px -10px ${pal.accGlow}` } : null]}>
        <Text style={[f.barN, { color: lead ? pal.accInk : pal.sec }]}>{col.k + 1}</Text>
      </Grow>
      {col.author ? <Text style={[f.pcAuthor, { color: pal.sec }]}>{col.author}</Text> : <View />}
    </View>
  );
});

/** confetti(20, 1500) макета объявлений: .conf i стартует с 50 %/40 % кадра, а Confetti личных кадров — с 50 %/42 %. */
const ContestConfetti = memo(function ContestConfetti() {
  // зачем: слой поднят на 2 % высоты кадра (top −2 %, bottom 2 %: высота та же) — старт ровно в 50 %/40 %, как в макете
  return <View style={f.conf40}><Confetti n={20} d0={1500} /></View>;
});

export const ContestFrame = memo(function ContestFrame({ content }: AnnFrameProps) {
  const { final } = useStoryFrameClock();
  // зачем: «набор · автор» — текст блока до и после « · » (b.text.split(' · ') макета); блока нет — подписи пустые, столбик стоит
  const cols = useMemo<readonly PodiumCol[]>(() => PODIUM.map((slot) => {
    const [set = '', author = ''] = (content.blocks[slot.k]?.text ?? '').split(' · ');
    return { ...slot, set, author };
  }), [content.blocks]);
  // зачем (.fx.tz макета): конфетти гаснет в полосе текста — полоса = метка и заголовок (пьедестал — это .art, в полосу не входит)
  return (
    <AnnRoot testID="story-ann-contest" layer={final ? undefined : <ContestConfetti />} maskText>
      <View style={f.art}>
        <View style={f.podium}>{cols.map((c) => <PodiumColumn key={c.k} col={c} />)}</View>
      </View>
      <TextZone>
        <AnnBadge text={content.badge} d={1100} />
        <AnnTitle text={content.title} d0={1160} />
      </TextZone>
    </AnnRoot>
  );
});

// ── 24 · Челлендж недели — дорожка из 7 дней заполняется до сегодня, монета бежит по ней, цель обведена ───────────────

/** .path макета: ширина до замера (max 320); линия и узлы — от 20 до W − 20. */
const PATH_W = 320;
const PATH_PAD = 20;
/** Заливка и бег монеты — до третьего узла (--p = 2/6 макета). */
const PATH_TO = 2 / 6;
/** 7 узлов: первые два пройдены (.nd.on), пятый — цель (.nd.goal); ключи постоянные. */
const PATH_NODES = Array.from({ length: 7 }, (_, i) => ({ i, nodeKey: `nd${i}`, labelKey: `lb${i}`, on: i < 2, goal: i === 4 }));
/** Опорный понедельник (5 января 2026, полдень): буквы Пн…Вс от недели не зависят — кадр детерминирован. */
const MONDAY_MS = new Date(2026, 0, 5, 12).getTime();

export const ChallengeFrame = memo(function ChallengeFrame({ content, lang, myRank }: AnnFrameProps) {
  const pal = useAnnPalette();
  const [w, setW] = useState(PATH_W);
  const onPath = useCallback((e: LayoutChangeEvent) => { setW(Math.round(e.nativeEvent.layout.width)); }, []);
  // зачем: неделя челленджа макета — Пн…Вс (DAYS = П В С Ч П С В): пройдены Пн и Вт, монета бежит к Ср, цель — 5-й день (Пт).
  // Буквы — на языке интерфейса через Intl (weekdayLetter); в ru совпадают с макетом в любой день недели.
  const letters = useMemo(() => PATH_NODES.map((n) => weekdayLetter(lang, MONDAY_MS + n.i * DAY_MS)), [lang]);
  const span = Math.max(0, w - PATH_PAD * 2);
  // зачем: макет сдвигает монету на round(280 · 2/6) = 93 при ширине 320; от замера — та же точка третьего узла на любой ширине
  const run = useMemo<readonly Key[]>(() => [{ at: 0, x: 0 }, { at: 1, x: Math.round(span * PATH_TO) }], [span]);
  const track = mix(pal.tx, 0.18);
  return (
    <AnnRoot testID="story-ann-challenge">
      <AnnBadge text={content.badge} d={100} />
      <AnnTitle text={content.title} d0={220} />
      <View style={f.path} onLayout={onPath} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={[f.pathLine, { backgroundColor: track }]}>
          <Grow axis="x" d={400} dur={1200} style={[f.pathFill, { width: span * PATH_TO, backgroundColor: pal.accG }]} />
        </View>
        {PATH_NODES.map((n) => (
          <View
            key={n.nodeKey}
            style={[
              f.node,
              { left: PATH_PAD + (span * n.i) / 6 - 11, backgroundColor: n.on ? pal.accG : n.goal ? pal.bgMid : track },
              // кольцо цели — box-shadow 0 0 0 3px accent макета (кольцо узла, не обводка контейнера)
              n.goal ? { boxShadow: `0 0 0 3px ${pal.accG}` } : null,
            ]}
          >
            {n.on ? <Ionicons name="checkmark" size={13} color={pal.accInk} style={f.glyph13} /> : null}
          </View>
        ))}
        {PATH_NODES.map((n) => (
          <Text key={n.labelKey} style={[f.dayLetter, { left: PATH_PAD + (span * n.i) / 6 - 20, color: pal.sec }]}>{letters[n.i]}</Text>
        ))}
        <Keyframed keys={run} d={400} dur={1200} ease={EASE_OUT} style={f.run}>
          <SpireRankCoin rank={myRank ?? 5} size={40} />
        </Keyframed>
      </View>
      <AnnBlocks blocks={content.blocks} d0={1500} max={1} />
    </AnnRoot>
  );
});

// ── 25 · Пригласи друзей — монеты съезжаются, пунктир прочерчивается, карточка кода переворачивается ──────────────────

/** stFromL / stFromR: въезд с ±48 с проявлением (700 мс, .23,1,.32,1, после 100). */
const FROM_L48: readonly Key[] = [{ at: 0, x: -48, opacity: 0 }, { at: 1, x: 0, opacity: 1 }];
const FROM_R48: readonly Key[] = [{ at: 0, x: 48, opacity: 0 }, { at: 1, x: 0, opacity: 1 }];
/** stFlipInY: rotateY 90° → 0 с проявлением (800 мс, .23,1,.32,1, после 900; перспектива 1000 — .sl макета). */
const FLIP_IN_Y: readonly Key[] = [{ at: 0, rotY: 90, opacity: 0 }, { at: 1, rotY: 0, opacity: 1 }];
// зачем (подагент 28.10, 🔴): код приглашения — настоящий код человека из пропса inviteCode (просмотр); нет кода — карточки нет, фотостудия передаёт пример макета
export const InviteFrame = memo(function InviteFrame({ content, lang, inviteCode }: AnnFrameProps) {
  const pal = useAnnPalette();
  return (
    <AnnRoot testID="story-ann-invite">
      <View style={f.lnk}>
        <Keyframed keys={FROM_L48} d={100} dur={700} ease={EASE_OUT}><SpireRankCoin rank={5} size={96} /></Keyframed>
        <DashedLink />
        <Keyframed keys={FROM_R48} d={100} dur={700} ease={EASE_OUT}><SpireRankCoin rank={2} size={96} /></Keyframed>
      </View>
      {inviteCode ? <Keyframed
        keys={FLIP_IN_Y}
        d={900}
        dur={800}
        ease={EASE_OUT}
        perspective={1000}
        style={[f.codeCard, { backgroundColor: pal.card, boxShadow: `0 18px 44px -18px ${mix(pal.shTint, 0.7)}` }]}
      >
        <View>
          <Text style={[f.codeK, { color: pal.sec }]}>{annText(lang, 'yourCode')}</Text>
          <Text style={[f.code, { color: pal.tx }]}>{inviteCode}</Text>
        </View>
        <View style={[f.copy, { backgroundColor: mix(pal.tx, 0.12) }]}>
          <Ionicons name="copy" size={20} color={pal.tx} style={f.glyph20} />
        </View>
      </Keyframed> : null}
      <AnnBadge text={content.badge} d={1300} />
      <AnnTitle text={content.title} d0={1360} />
      <AnnBlocks blocks={content.blocks} d0={1700} max={1} />
    </AnnRoot>
  );
});

const f = StyleSheet.create({
  // .art: по центру, 18 снизу
  art: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  // .pz2 180; .t3 44/50 800 −1; .bigring 180 с центром в 50 %/32 % кадра (margin −90)
  pz2: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  ringc: { position: 'absolute', left: 0, top: 0 },
  t3: { fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
  bigRing: { position: 'absolute', left: '50%', top: '32%', width: 180, height: 180, marginLeft: -90, marginTop: -90 },
  // конфетти: слой кадра, поднятый на 2 % (старт 50 %/40 %)
  conf40: { position: 'absolute', left: 0, right: 0, top: '-2%', bottom: '2%' },
  // .podium: ряд по низу, зазор 10; .pc 90, зазор 6; .nm 13/17 700 max 90; .bar 90, радиус 16 сверху, поле 10, 20/24 800; .cn 12/16
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  pc: { width: 90, alignItems: 'center', gap: 6 },
  pcName: { fontSize: 13, lineHeight: 17, fontWeight: '700', maxWidth: 90, textAlign: 'center' },
  bar: { width: 90, borderTopLeftRadius: 16, borderTopRightRadius: 16, alignItems: 'center', paddingTop: 10 },
  barN: { fontSize: 20, lineHeight: 24, fontWeight: '800', textAlign: 'center' },
  pcAuthor: { fontSize: 12, lineHeight: 16, textAlign: 'center' }, // guard-ok: автор набора под столбиком (.cn макета), не подпись-расшифровка // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1
  // .path: 100 % до 320 (по центру колонки), высота 84, 18 сверху; .ln left/right 20, top 38, высота 4; .nd 22 на 29; .lb 11/14 700 на 60
  // шириной 40; .run 40 на 0 (центр в первом узле)
  path: { width: '100%', maxWidth: PATH_W, height: 84, marginTop: 18 },
  pathLine: { position: 'absolute', left: PATH_PAD, right: PATH_PAD, top: 38, height: 4, borderRadius: 2 },
  pathFill: { position: 'absolute', left: 0, top: 0, height: 4, borderRadius: 2 },
  node: { position: 'absolute', top: 29, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  glyph13: { lineHeight: 13 },
  dayLetter: { position: 'absolute', top: 60, width: 40, fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center' }, // guard-ok: буква дня под узлом дорожки (.lb макета) // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1
  run: { position: 'absolute', left: 0, top: 0, width: 40, height: 40 },
  // .lnk 320 × 110, монеты по краям; .codecard 300, поля 16/20, радиус 22, 14 сверху и 18 снизу; .k 12/16 700 +1; .code 28/34 800 +3; .cp 44
  lnk: { width: 320, height: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeCard: {
    width: 300, maxWidth: '100%', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 22,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 18,
  },
  codeK: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'left' }, // guard-ok: подпись над кодом (.codecard .k макета) // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1
  code: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: 3, fontVariant: ['tabular-nums'], textAlign: 'left' },
  copy: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  glyph20: { lineHeight: 20 },
});
