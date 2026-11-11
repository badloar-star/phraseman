// ═══════════════════════════════════════════════════════════════════════════
// frames_plus.tsx — три кадра-предложения Plus в «Историях»: защита серии, итог недели, диалоги без счётчика.
//
// зачем (владелец 11.11: «карточки предложения переместить в истории и сделать красивый дизайн им», затем «Писать отдельно»):
// макет docs/design/v2-app/stories-plus-offers.html. Разметка, задержки и кегли — из `render()` трёх кадров макета построчно;
// кадры собраны из тех же блоков, что «Серия · 7 дней» (frames_streak), «Твоя неделя» (frames_recap) и «Диалог пройден» (frames_cards).
// Знак Plus — шестиугольник ✦ в градиенте уровня из пейвола «Два пути» (история и окно покупки выглядят одной вещью).
//
// Шаг 1 (11.11): кадры записаны в реестр (story_plus_offer_registry → story_template_registry) и видны в фотостудии под номерами 49…51.
// К игроку они попадут на шаге 2: событие-источник, показ следом за личным кадром и только бесплатному аккаунту.
// Пакет: docs/work/tasks/plus-offer-stories-wiring-step1-2026-11-11.md
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import type { Lang } from '../../../constants/i18n';
import { PLUS_MARK_GRADIENT, PLUS_MARK_INK } from '../../plus/plus_mark_colors';
import { streakPlateFill } from '../../streak/moments/StreakMomentFlame';
import { weekRange } from './story_template_dates';
import { Art, FrameRoot, H1, Ov, P } from './story_template_kit';
import { streakWeekCells, weekBars } from './story_template_layout';
import { CountUp, Enter } from './story_template_motion';
import { Grow } from './story_template_parts';
import { TemplateFlame } from './story_template_flame';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryBubble } from './story_template_registry';
import { tplNumber, tplText } from './story_template_strings';
import { plusOfferText } from './story_plus_offer_strings';

/** Данные кадров — только то, что событие уже знает. Список id и примеры — story_plus_offer_registry. */
export type PlusStreakOffer = Readonly<{ days: number; endMs: number }>;
export type PlusWeekOffer = Readonly<{ startMs: number; endMs: number; dailyMinutes: readonly number[] }>;
export type PlusDialogOffer = Readonly<{ repliesLimit: number; bubbles: readonly StoryBubble[] }>;

type FrameProps<D> = Readonly<{ tpl: D; lang: Lang }>;

// зачем: цвета знака Plus — из чистого модуля plus_mark_colors (те же, что у уровня Ultra в пейволе «Два пути»). Сам PaywallDuoHero сюда
// не подключаем: он на уровне модуля зовёт анимации, и просмотр историй тянул бы их за собой. Своих цветов в кадрах нет — сторож шаблонов
// историй запрещает жёсткие цвета в файлах кадров.
const PLUS_GRADIENT = PLUS_MARK_GRADIENT;
const PLUS_INK = PLUS_MARK_INK;
const PLUS_GLOW = PLUS_MARK_GRADIENT[1];
/** Шестиугольник макета (.pmark i: clip-path 50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%) в поле 100 × 100. */
const HEX_POINTS = '50,0 93,25 93,75 50,100 7,75 7,25';
/** Какой день недели серии показан «закрытым защитой» — пятый, как в макете. */
const SHIELD_DAY_INDEX = 4;

/** Знак Plus: шестиугольник с ✦. Размер 58 у арта, 34 в строке счётчика (макет .pmark / .pmark.inl). */
export const PlusMark = memo(function PlusMark({ size = 58, id }: Readonly<{ size?: number; id: string }>) {
  return (
    <View style={[f.mark, { width: size, height: size, shadowColor: PLUS_GLOW }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`plus-${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={PLUS_GRADIENT[0]} />
            <Stop offset="0.52" stopColor={PLUS_GRADIENT[1]} />
            <Stop offset="1" stopColor={PLUS_GRADIENT[2]} />
          </LinearGradient>
        </Defs>
        <Polygon points={HEX_POINTS} fill={`url(#plus-${id})`} />
      </Svg>
      <Text style={[f.markGlyph, { fontSize: Math.round(size * 0.45), lineHeight: size, color: PLUS_INK }]}>✦</Text>
    </View>
  );
});

// ── 1 · защита серии ──────────────────────────────────────────────────────────────────────────────

export const PlusStreakFrame = memo(function PlusStreakFrame({ tpl, lang }: FrameProps<PlusStreakOffer>) {
  const pal = useStoryTemplatePalette();
  const cells = useMemo(() => streakWeekCells(lang, tpl.endMs, tpl.days), [lang, tpl.endMs, tpl.days]);
  // заголовок «7 дней подряд» — из уже переведённого streakBigUnit («{days_w} подряд»), слово «день» согласуется само
  const title = `${tplNumber(tpl.days)} ${tplText(lang, 'streakBigUnit', { days: tpl.days })}`;
  return (
    <FrameRoot testID="story-tpl-plus-streak">
      <Art>
        {/* зачем: знак стоит от блока огня шириной 150, а не от всей ширины кадра — поэтому общий контейнер, а не сосед в Art */}
        <View style={f.flame}>
        <Enter kind="pop" d={120}>
          <View style={f.flame}>
            <TemplateFlame size={150} />
            <View pointerEvents="none" style={f.plateWrap}>
              <View style={[f.plate, { backgroundColor: streakPlateFill({ mediaScrim: pal.mediaScrim }) }]}>
                <CountUp to={tpl.days} d={300} dur={800} style={[f.plateText, { color: pal.mediaInk }]} />
              </View>
            </View>
          </View>
        </Enter>
        <Enter kind="pop" d={900} style={f.markAtFlame}><PlusMark id="streak" /></Enter>
        </View>
      </Art>
      <Ov text={tplText(lang, 'streakOverline', { days: tpl.days })} d={380} />
      <H1 text={title} d0={460} />
      <P text={plusOfferText(lang, 'streakText')} d={640} />
      <View style={f.cal7}>
        {cells.map((c, i) => {
          const shield = i === SHIELD_DAY_INDEX;
          return (
            <Enter key={c.key} kind="pop" d={shield ? 1250 : 700 + i * 80}>
              <View style={[f.day, shield ? [f.dayShield, { backgroundColor: PLUS_GRADIENT[1], shadowColor: PLUS_GLOW }] : { backgroundColor: pal.accG }]}>
                <Text style={[f.dayT, { color: shield ? PLUS_INK : pal.accInk }]}>{c.letter}</Text>
                {shield
                  ? <Text style={[f.dayGlyph, { color: PLUS_INK }]}>✦</Text>
                  : <Ionicons name="checkmark" size={16} color={pal.accInk} style={f.dayI} />}
              </View>
            </Enter>
          );
        })}
      </View>
    </FrameRoot>
  );
});

// ── 2 · итог недели ───────────────────────────────────────────────────────────────────────────────

export const PlusWeekFrame = memo(function PlusWeekFrame({ tpl, lang }: FrameProps<PlusWeekOffer>) {
  const pal = useStoryTemplatePalette();
  const bars = useMemo(() => weekBars(lang, tpl.startMs, tpl.dailyMinutes), [lang, tpl.startMs, tpl.dailyMinutes]);
  return (
    <FrameRoot testID="story-tpl-plus-week">
      <Art>
        {/* зачем: знак стоит от ряда столбиков (264), а не от всей ширины кадра */}
        <View>
        <View style={f.wk}>
          {bars.map((b) => (
            <View key={b.key} style={f.wkCol}>
              {b.h > 0 ? <Grow axis="y" d={b.d} dur={700} style={[f.wkBar, { height: b.h, backgroundColor: b.top ? pal.accG : mix(pal.tx, 0.18) }]} /> : null}
              <Text style={[f.wkDay, { color: pal.sec }]}>{b.letter}</Text>
            </View>
          ))}
        </View>
        <Enter kind="pop" d={950} style={f.markAtWeek}><PlusMark id="week" /></Enter>
        </View>
      </Art>
      <Ov text={weekRange(lang, tpl.startMs, tpl.endMs)} d={800} />
      <H1 text={plusOfferText(lang, 'weekTitle')} d0={860} />
      <P text={plusOfferText(lang, 'weekText')} d={1200} />
    </FrameRoot>
  );
});

// ── 3 · диалоги без счётчика ──────────────────────────────────────────────────────────────────────

export const PlusDialogFrame = memo(function PlusDialogFrame({ tpl, lang }: FrameProps<PlusDialogOffer>) {
  const pal = useStoryTemplatePalette();
  return (
    <FrameRoot testID="story-tpl-plus-dialog">
      <View style={f.bubs}>
        {tpl.bubbles.slice(0, 2).map((b, i) => (
          <Enter key={`b${i}:${b.text}`} d={200 + i * 400} style={[f.bub, b.me ? [f.bubMe, { backgroundColor: pal.accG }] : [f.bubThem, { backgroundColor: mix(pal.tx, 0.11) }]]}>
            <Text style={[f.bubText, { color: b.me ? pal.accInk : pal.tx }]}>{b.text}</Text>
          </Enter>
        ))}
      </View>
      <Enter d={950} style={f.quota}>
        <View style={f.quotaFree}>
          <Text style={[f.quotaNum, { color: pal.sec }]}>{tplNumber(tpl.repliesLimit)}</Text>
          <Text style={[f.quotaUnit, { color: pal.sec }]}>{plusOfferText(lang, 'quotaUnit')}</Text>
        </View>
        <Ionicons name="arrow-forward" size={22} color={pal.sec} />
        <View style={f.quotaPlus}>
          <Enter kind="pop" d={1150}><PlusMark id="dialog" size={34} /></Enter>
          <Text style={[f.quotaInf, { color: pal.tx }]}>∞</Text>
        </View>
      </Enter>
      <Ov text={plusOfferText(lang, 'dialogOverline')} d={1200} />
      <H1 text={plusOfferText(lang, 'dialogTitle')} d0={1260} />
      <P text={plusOfferText(lang, 'dialogText')} d={1480} />
    </FrameRoot>
  );
});

const f = StyleSheet.create({
  // .pmark: тень 0 10 22 цветом уровня; знак ✦ по центру шестиугольника
  mark: { alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.5, shadowRadius: 11, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  markGlyph: { position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', fontWeight: '700' },
  // .pmark у огня: right calc(50% − 96px), bottom 2 — в арте шириной 150 это правый нижний угол огня со сдвигом наружу
  markAtFlame: { position: 'absolute', right: -21, bottom: 2 },
  // .pmark.wkm: right calc(50% − 150px), top −22 — над последним столбиком недели (ряд .wk шириной 264)
  markAtWeek: { position: 'absolute', right: -18, top: -22 },
  // огонь и плашка цифры — как у кадра «Серия · 7 дней» (frames_streak: .flame 150, .n низ 12 %, 36/45, 800)
  flame: { width: 150, height: 150 },
  plateWrap: { position: 'absolute', left: 0, right: 0, bottom: '12%', alignItems: 'center' },
  plate: { borderRadius: 999, paddingHorizontal: 12 },
  plateText: { fontSize: 36, lineHeight: 45, fontWeight: '800', letterSpacing: -0.5 },
  // .cal7: зазор 8, отступ 20; клетка 38 × 50, радиус 12, буква 12/700 (строка 21), галочка 16, зазор 4
  cal7: { flexDirection: 'row', gap: 8, marginTop: 20 },
  day: { width: 38, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  // .cal7 .c.sh: тень 0 8 20 −6 цветом уровня
  dayShield: { shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  dayT: { fontSize: 12, lineHeight: 21, fontWeight: '700' }, // guard-ok: буква дня недели в клетке календаря, как у кадра «Серия · 7 дней» (не подпись под названием)
  dayI: { lineHeight: 16 },
  dayGlyph: { fontSize: 15, lineHeight: 16 },
  // .wk: ряд по низу, зазор 9, высота 120, отступ снизу 6; столбик 30, радиус 8; подпись 12/700 (строка 21), отступ 6
  wk: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 120, marginBottom: 6 },
  wkCol: { width: 30, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  wkBar: { width: '100%', borderRadius: 8 },
  wkDay: { fontSize: 12, lineHeight: 21, fontWeight: '700', marginTop: 6 }, // guard-ok: буква дня под столбиком, как у кадра «Твоя неделя»
  // .bubs: до 300, зазор 8, отступ снизу 20; реплика до 82 %, поля 10 14, радиус 18 (угол у говорящего 6), 15/20
  bubs: { width: '100%', maxWidth: 300, gap: 8, marginBottom: 20 },
  bub: { maxWidth: '82%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubThem: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bubMe: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  bubText: { fontSize: 15, lineHeight: 20, textAlign: 'left' },
  // .quota: ряд по центру, зазор 16, отступы 22 сверху и 6 снизу; число 34/38 800 зачёркнуто, подпись 13/17; ∞ 52/52 800
  quota: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 22, marginBottom: 6 },
  quotaFree: { alignItems: 'center' },
  quotaNum: { fontSize: 34, lineHeight: 38, fontWeight: '800', textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  quotaUnit: { fontSize: 13, lineHeight: 17, fontWeight: '500' },
  quotaPlus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quotaInf: { fontSize: 52, lineHeight: 52, fontWeight: '800' },
});
