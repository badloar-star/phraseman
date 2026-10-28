// ═══════════════════════════════════════════════════════════════════════════
// frames_cards.tsx — кадры 12–14, 22, 23 макета stories-templates-v1.html: набор выучен, твой набор добавляют, фраза дня, ошибки разобраны,
// диалог пройден.
//
// зачем (владелец 28.10: шаблоны «именно так», пиксель в пиксель): разметка, задержки и кегли — из `render()` TPL макета построчно
// (pack: веер из трёх карточек 200/360/520; packpop: «+14» за 900 мс, монеты людей через 90 мс; phrase: кнопка дышит, фраза печатается
// 12 букв/с с 500 мс; mistakes: строки 100/300/500/700, галочки через 300 мс после строки; dialog: реплики 200/600/1000).
// Тексты данных (фраза, смысл, реплики, название набора) не переводятся — они приходят из события.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Art, Chip, FrameRoot, H1, Ov, P, k } from './story_template_kit';
import { CountUp, Enter, TypeLine } from './story_template_motion';
import { Breathe, CheckFill, FanCard, RingedCoin } from './story_template_parts';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryFrameProps } from './story_template_registry';
import { tplText } from './story_template_strings';

// ── 12 · набор выучен ────────────────────────────────────────────────────────────────────────────────────────────────

/** Веер макета: левая −16° и −62, правая 14° и +62, средняя 0° — сверху; задержки 200 / 360 / 520. */
const FAN = [{ rot: -16, dx: -62, d: 200 }, { rot: 14, dx: 62, d: 360 }, { rot: 0, dx: 0, d: 520 }] as const;

export const PackFrame = memo(function PackFrame({ tpl, lang }: StoryFrameProps<'pack'>) {
  const pal = useStoryTemplatePalette();
  const cards = tpl.samples.slice(0, 3);
  return (
    <FrameRoot testID="story-tpl-pack">
      {cards.length > 0 ? (
        <Art>
          <View style={f.fan}>
            {cards.map((card, i) => (
              <FanCard key={`${FAN[i]!.rot}:${card.term}`} rot={FAN[i]!.rot} dx={FAN[i]!.dx} d={FAN[i]!.d}>
                <Text style={[f.fcK, { color: pal.acc }]}>EN</Text>
                <Text style={[f.fcEn, { color: pal.tx }]}>{card.term}</Text>
                <Text style={[f.fcRu, { color: pal.sec }]}>{card.meaning}</Text>
              </FanCard>
            ))}
          </View>
        </Art>
      ) : null}
      <Ov text={tplText(lang, 'packLearnedOverline')} d={800} />
      <H1 text={tplText(lang, 'packLearnedTitle', { packTitle: tpl.packTitle, cards: tpl.cards })} d0={860} />
      <P text={tplText(lang, 'packLearnedText', { pct: tpl.knownPct, days: tpl.days })} d={1080} />
    </FrameRoot>
  );
});

// ── 13 · твой набор добавляют ────────────────────────────────────────────────────────────────────────────────────────

export const PackPopFrame = memo(function PackPopFrame({ tpl, lang }: StoryFrameProps<'packpop'>) {
  const pal = useStoryTemplatePalette();
  const ring = `0 0 0 3px ${pal.bgMid}`;
  return (
    <FrameRoot testID="story-tpl-packpop">
      <CountUp to={tpl.count} d={300} dur={900} prefix="+" style={[k.bigM, { color: pal.tx }]} />
      <View style={f.avs}>
        {tpl.ranks.slice(0, 6).map((rank, i) => (
          <Enter key={`a${i}:${rank}`} kind="pop" d={700 + i * 90}><RingedCoin rank={rank} size={40} ring={ring} style={f.avCoin} /></Enter>
        ))}
      </View>
      <Ov text={tplText(lang, 'communityWeekOverline')} d={1200} />
      <H1 text={tplText(lang, 'packAddedTitle', { count: tpl.count })} d0={1260} />
      <P text={tplText(lang, 'packAddedText', { packTitle: tpl.packTitle, cards: tpl.cards })} d={1480} />
    </FrameRoot>
  );
});

// ── 14 · фраза дня ───────────────────────────────────────────────────────────────────────────────────────────────────

const clock = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.round(sec % 60))).padStart(2, '0')}`;

export const PhraseFrame = memo(function PhraseFrame({ tpl, lang }: StoryFrameProps<'phrase'>) {
  const pal = useStoryTemplatePalette();
  return (
    <FrameRoot testID="story-tpl-phrase">
      {/* зачем (макет): вход .pop — на обёртке, дыхание — на кнопке (у дыхания та же задержка --d 120) */}
      <Enter kind="pop" d={120}>
        <Breathe d={120} style={[f.play, { backgroundColor: mix(pal.tx, 0.14) }]}>
          <Ionicons name="play" size={28} color={pal.tx} style={f.playIcon} />
        </Breathe>
      </Enter>
      <Ov text={tplText(lang, 'phraseOverline')} d={200} />
      <TypeLine text={tpl.phrase} d={500} cps={12} style={[f.phz, { color: pal.tx }]} caretColor={pal.accG} />
      <P text={tpl.meaning} d={1500} />
      {tpl.audioSec !== null ? <Chip icon="volume-high" text={tplText(lang, 'phraseListen', { time: clock(tpl.audioSec) })} d={1700} /> : null}
    </FrameRoot>
  );
});

// ── 22 · ошибки разобраны ────────────────────────────────────────────────────────────────────────────────────────────

export const MistakesFrame = memo(function MistakesFrame({ tpl, lang }: StoryFrameProps<'mistakes'>) {
  const pal = useStoryTemplatePalette();
  const left = tplText(lang, 'mistakesLeft', { left: tpl.left });
  return (
    <FrameRoot testID="story-tpl-mistakes">
      <View style={f.list}>
        {tpl.samples.slice(0, 4).map((text, i) => {
          // макет: строка входит в d − 200, галочка закрашивается в d + 300 (d = 300, 500, 700, 900)
          const d = 300 + i * 200;
          return (
            <Enter key={`m${i}:${text}`} d={d - 200} style={[f.row, { backgroundColor: mix(pal.tx, 0.09) }]}>
              <Text style={[f.rowText, { color: pal.tx }]}>{text}</Text>
              <View style={[f.ck, { backgroundColor: mix(pal.tx, 0.14) }]}>
                <CheckFill d={d + 300}>
                  <View style={[f.ckOn, { backgroundColor: pal.accG }]}><Ionicons name="checkmark" size={15} color={pal.accInk} style={f.ckIcon} /></View>
                </CheckFill>
              </View>
            </Enter>
          );
        })}
      </View>
      <Ov text={tplText(lang, 'mistakesOverline')} d={1300} />
      <H1 text={tplText(lang, 'mistakesClearedTitle', { cleared: tpl.cleared })} d0={1360} />
      <P text={tpl.noNew ? `${left} · ${tplText(lang, 'mistakesNoNew')}` : left} d={1560} />
    </FrameRoot>
  );
});

// ── 23 · диалог пройден ──────────────────────────────────────────────────────────────────────────────────────────────

export const DialogFrame = memo(function DialogFrame({ tpl, lang }: StoryFrameProps<'dialog'>) {
  const pal = useStoryTemplatePalette();
  const stats = tplText(lang, 'dialogStats', { turns: tpl.turns, minutes: tpl.minutes });
  return (
    <FrameRoot testID="story-tpl-dialog">
      <View style={f.bubs}>
        {tpl.bubbles.slice(0, 3).map((b, i) => (
          <Enter key={`b${i}:${b.text}`} d={200 + i * 400} style={[f.bub, b.me ? [f.bubMe, { backgroundColor: pal.accG }] : [f.bubThem, { backgroundColor: mix(pal.tx, 0.11) }]]}>
            <Text style={[f.bubText, { color: b.me ? pal.accInk : pal.tx }]}>{b.text}</Text>
          </Enter>
        ))}
      </View>
      <Ov text={tplText(lang, 'dialogOverline', { title: tpl.title })} d={1200} />
      <H1 text={tplText(lang, 'dialogGoalsTitle', { done: tpl.goalsDone, total: tpl.goalsTotal })} d0={1260} />
      <P text={tpl.noHints ? `${stats} · ${tplText(lang, 'dialogNoHints')}` : stats} d={1480} />
    </FrameRoot>
  );
});

const f = StyleSheet.create({
  // .fan 220 × 170; карточка .fc — в story_template_parts (FanCard); .k 11/700 +0,5; .en 20/24 800 −0,3; .ru 13/17
  fan: { width: 220, height: 170 },
  fcK: { position: 'absolute', left: 12, top: 10, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.5 },
  fcEn: { fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: -0.3, maxWidth: 104, textAlign: 'center' },
  fcRu: { fontSize: 13, lineHeight: 17, maxWidth: 104, textAlign: 'center' },
  // .avs: отступ 10; монеты 40 с нахлёстом 6 и кольцом цвета фона
  avs: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  avCoin: { marginHorizontal: -6 }, // guard-ok: нахлёст монет в ряду аватаров (вид), не баланс
  // .plybtn 64, текст·14 %, значок 28 со сдвигом 4, отступ снизу 22
  play: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  playIcon: { marginLeft: 4, lineHeight: 28 },
  // .phz 46/52, 800, −1,2
  phz: { fontSize: 46, lineHeight: 52, fontWeight: '800', letterSpacing: -1.2 },
  // .list: до 300, зазор 8, отступ снизу 20; строка: зазор 12, поля 10 12 10 14, радиус 14, 15/20
  list: { width: '100%', maxWidth: 300, gap: 8, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, paddingBottom: 10, paddingRight: 12, paddingLeft: 14, borderRadius: 14 },
  rowText: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 20, textAlign: 'left' },
  ck: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden' },
  ckOn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ckIcon: { lineHeight: 15 },
  // .bubs: до 300, зазор 8, отступ снизу 20; реплика до 82 %, поля 10 14, радиус 18 (угол у говорящего 6), 15/20
  bubs: { width: '100%', maxWidth: 300, gap: 8, marginBottom: 20 },
  bub: { maxWidth: '82%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubThem: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bubMe: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  bubText: { fontSize: 15, lineHeight: 20, textAlign: 'left' },
});
