// ═══════════════════════════════════════════════════════════════════════════
// frames_community.tsx — кадры 26–30 макета stories-announcements-v1.html (v2.1): Спасибо, Опрос, Автор недели, Новый год, Праздник.
//
// зачем (владелец 28.10: «точно так же, как на макете»): разметка, размеры, задержки и кривые — из render() TPL и CSS макета построчно
// (thanks: сердца слоем вне полосы текста, большое сердце 110 бьётся stBeat 1,6 с после pop 100, метка 300, счёт 400 за 1300, блоки 1000;
// poll: метка 100, вопрос 220, варианты .pb2 всплывают 700 + 160·i, заливка 900 и процент 400 с 1700 + 120·i; author: лавровое кольцо 180
// с монетой 120 (pop 200), лента пружиной 600 за 600, заголовок 700, блоки 1100; newyear: снег вне полосы текста, цифры года stBounceIn 700
// через 150 + 130·i, метка 800, заголовок 860, блок 1200; holiday: конфетти (22, 900), подарок 170 падает stDrop 1000 с 100 и плавает,
// метка 1000, заголовок 1060, блок 1400). Всё от часов кадра; цвета — токены темы; «Уменьшить движение» — конечное состояние.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { DebugLogger } from '../../../app/debug-logger';
import { hapticTap } from '../../../hooks/use-haptics';
import { ANNOUNCEMENT_POLL_MAX_OPTIONS } from '../../../modules/story_events/story_announcements_contract';
import SpireRankCoin from '../../spire/SpireRankCoin';
import { resolveThemedArt } from '../../theme/themed_art_registry';
import { useStoryFrameClock } from '../templates/story_frame_clock';
import { Art, Confetti } from '../templates/story_template_kit';
import { Snow } from '../templates/story_template_layers';
import { CountUp, Enter } from '../templates/story_template_motion';
import { Grow } from '../templates/story_template_parts';
import { mix } from '../templates/story_template_palette';
import { AnnRoot, EASE_CSS, EASE_SPRING, Keyframed, Loop, TextZone, type Key } from './announcement_v2_motion';
import { useAnnPalette } from './announcement_v2_palette';
import { Hearts, Laurel } from './announcement_v2_particles';
import { announcementArt } from './announcement_v2_registry';
import { AnnBadge, AnnBlocks, AnnTitle, bigStyle, type AnnFrameProps } from './announcement_v2_text';

const LOG = '[STORY-ANN2]';
const POLL_LOG = '[STORY-POLL]';

// ── 26 · Спасибо — сердца поднимаются и тают, большое сердце бьётся, число считает ────────────────────────────────

/** stBeat 1,6 с ease-in-out: 0 / 100 % — 1, 14 % — 1,12, 28 % — 1, 42 % — 1,1. */
const BEAT: readonly Key[] = [{ at: 0, scale: 1 }, { at: 0.14, scale: 1.12 }, { at: 0.28, scale: 1 }, { at: 0.42, scale: 1.1 }, { at: 1, scale: 1 }];

export const ThanksFrame = memo(function ThanksFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  // зачем: макет берёт число из заголовка (cnt(Number(title без нецифр))); без цифр счётчик показал бы «0» — тогда заголовок текстом
  const digits = content.title.replace(/\D/g, '');
  const n = Number(digits) || 0;
  const numeric = digits.length > 0;
  const blocks = content.blocks.slice(0, 2);
  useEffect(() => {
    DebugLogger.info(LOG, numeric ? `thanks: счёт до ${n} (заголовок «${content.title}»)` : `thanks: в заголовке нет цифр — заголовок текстом вместо счёта`);
  }, [content.title, n, numeric]);
  return (
    <AnnRoot testID="story-ann-thanks" layer={<Hearts />} maskText>
      <Art>
        <Enter kind="pop" d={100}>
          <Loop keys={BEAT} periodMs={1600}>
            <Ionicons name="heart" size={110} color={pal.accG} style={f.heartBig} accessibilityElementsHidden importantForAccessibility="no" />
          </Loop>
        </Enter>
      </Art>
      <TextZone>
        <AnnBadge text={content.badge} d={300} />
        {numeric ? (
          <View style={bigStyle.box}>
            <CountUp to={n} d={400} dur={1300} style={[bigStyle.m, { color: pal.tx }]} />
          </View>
        ) : <AnnTitle text={content.title} d0={400} />}
        {/* зачем: .big + .p { margin-top: 14 } макета — первый обычный блок под числом стоит на 14, а не на 8 (у .blk и так 14) */}
        {numeric && blocks[0]?.style === 'normal' ? <View style={f.afterBig} /> : null}
        <AnnBlocks blocks={blocks} d0={1000} max={2} />
      </TextZone>
    </AnnRoot>
  );
});

// ── 27 · Опрос — варианты всплывают, потом наполняются процентами ──────────────────────────────────────────────────

/** Проценты и выбор примера макета (pct = [52, 31, 17], .sel у первого) — фотостудия и гейт, где состояния опроса нет (poll = null). */
const POLL_SAMPLE_PERCENTS: readonly number[] = [52, 31, 17];
const POLL_SAMPLE_CHOSEN = 0;
/** stFade 400 мс (ease) — процент варианта. */
const FADE: readonly Key[] = [{ at: 0, opacity: 0 }, { at: 1, opacity: 1 }];

const pct = (value: number | undefined): number => Math.max(0, Math.min(100, Math.round(value ?? 0)));

/**
 * С какого мгновения кадра видны проценты. зачем (Optimistic UI без «прыжка»): в макете заливки идут с 1700 + 120·i — так и при повторном
 * показе (проценты с диска приходят сразу); голос посреди кадра — заливки растут от ответа сервера, а не встают рывком. Пока мгновение
 * не записано (один кадр после ответа), процентов не рисуем — иначе заливка мигнула бы полной шириной.
 */
function useReveal(has: boolean): Readonly<{ ready: boolean; at: number }> {
  const { progress, durationMs, final } = useStoryFrameClock();
  const [state, setState] = useState(() => ({ ready: has, at: 0 }));
  useEffect(() => {
    if (has !== state.ready) setState(has ? { ready: true, at: final ? 0 : Math.round(progress.get() * durationMs) } : { ready: false, at: 0 });
  }, [has, state.ready, final, progress, durationMs]);
  return state;
}

type PollRowProps = Readonly<{
  index: number;
  text: string;
  /** Процент 0…100 или null — процентов ещё нет (до голоса или ждём ответа). */
  percent: number | null;
  selected: boolean;
  /** Голос отправлен, проценты ещё не пришли — галочка на месте процента (мгновенный отклик). */
  pending: boolean;
  /** Начало заливки и проявления процента, мс кадра. */
  fd: number;
  /** Голосовать ещё можно: отклик нажатия и хаптик. */
  canVote: boolean;
  /** Голос; undefined — состояния опроса нет (фотостудия), касание уходит просмотру. */
  onVote: ((index: number) => void) | undefined;
}>;

/** .pb2 .op макета: строка 52, радиус 16, фон текст·10 %, заливка accent·32 % (у выбранного ·60 %) растёт слева, процент справа. */
const PollRow = memo(function PollRow({ index, text, percent, selected, pending, fd, canVote, onVote }: PollRowProps) {
  const pal = useAnnPalette();
  // зачем: после голоса строка остаётся нажимаемой — повтор глушит useStoryPoll («второй голос не шлём»), а обёртка слоя помечает тап
  // как свой (onInnerPress) — двойной тап по варианту не перелистывает историю
  const onPress = useCallback(() => { onVote?.(index); }, [index, onVote]);
  const onPressIn = useCallback(() => { void hapticTap(); }, []);
  const label = percent === null ? text : `${text}, ${percent} %`;
  return (
    <Enter d={700 + 160 * index}>
      <Pressable
        testID={`story-ann-poll-option-${index}`}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled: !canVote }}
        // зачем: явный disabled={false} Pressable вписал бы в accessibilityState и затёр «недоступно» после голоса — задаём только true
        disabled={onVote ? undefined : true}
        onPressIn={canVote ? onPressIn : undefined}
        onPress={onPress}
        style={({ pressed }) => [f.op, { backgroundColor: mix(pal.tx, 0.1) }, pressed && canVote ? f.opPressed : null]}
      >
        {percent === null ? null : (
          <View style={f.opFillBox}>
            <Grow axis="x" d={fd} dur={900} style={{ width: `${percent}%`, backgroundColor: mix(pal.accG, selected ? 0.6 : 0.32) }} />
          </View>
        )}
        <Text style={[f.opT, { color: pal.tx }]} numberOfLines={2}>{text}</Text>
        {percent !== null ? (
          <Keyframed keys={FADE} d={fd} dur={400} ease={EASE_CSS}>
            <Text style={[f.opP, { color: pal.tx }]} numberOfLines={1}>{`${percent} %`}</Text>
          </Keyframed>
        ) : pending ? <Ionicons name="checkmark-circle" size={20} color={pal.accG} style={f.opCheck} accessibilityElementsHidden importantForAccessibility="no" /> : null}
      </Pressable>
    </Enter>
  );
});

export const PollFrame = memo(function PollFrame({ content, poll }: AnnFrameProps) {
  // зачем: контракт Моментов держит 2–4 варианта (ANNOUNCEMENT_POLL_MAX_OPTIONS) — показываем все, чтобы за каждый можно было голосовать
  const options = content.blocks.slice(0, ANNOUNCEMENT_POLL_MAX_OPTIONS);
  const percents = poll ? poll.percents : POLL_SAMPLE_PERCENTS;
  const chosen = poll ? poll.myOption : POLL_SAMPLE_CHOSEN;
  const reveal = useReveal(percents !== null);
  const show = reveal.ready && percents !== null;
  const canVote = !!poll && poll.myOption === null;
  const start = Math.max(1700, reveal.at);
  const hasPoll = !!poll;
  const pctKey = percents ? percents.join('/') : '—';
  useEffect(() => {
    DebugLogger.info(POLL_LOG, hasPoll
      ? `кадр: вариантов=${options.length} выбран=${chosen ?? '—'} проценты=${pctKey} показаны=${String(show)} заливки с ${start} мс`
      : `кадр: состояния опроса нет (фотостудия) — проценты примера макета ${pctKey}, выбран ${POLL_SAMPLE_CHOSEN}`);
  }, [chosen, hasPoll, options.length, pctKey, show, start]);
  return (
    <AnnRoot testID="story-ann-poll">
      <AnnBadge text={content.badge} d={100} />
      <AnnTitle text={content.title} d0={220} />
      <View style={f.pb2}>
        {options.map((b, i) => (
          <PollRow
            key={`${i}-${b.text}`}
            index={i}
            text={b.text}
            percent={show && percents ? pct(percents[i]) : null}
            selected={chosen === i}
            pending={!!poll && poll.myOption === i && !show}
            fd={start + 120 * i}
            canVote={canVote}
            onVote={poll ? poll.onVote : undefined}
          />
        ))}
      </View>
    </AnnRoot>
  );
});

// ── 28 · Автор недели — лавровое кольцо вращается, монета всплывает, лента выскакивает пружиной ───────────────────

/** Монета автора — ранг примера макета (coin(9, 120)): у объявления нет поля ранга автора, а свой ранг (myRank) здесь не к месту. */
const AUTHOR_COIN_RANK = 9;

export const AuthorFrame = memo(function AuthorFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  return (
    <AnnRoot testID="story-ann-author">
      <View style={f.laurel}>
        <Laurel />
        <Enter kind="pop" d={200}><SpireRankCoin rank={AUTHOR_COIN_RANK} size={120} /></Enter>
      </View>
      {content.badge ? (
        <Enter kind="pop" d={600} dur={600} style={[f.ribbon, { backgroundColor: pal.accG }]}>
          <Text style={[f.ribbonT, { color: pal.accInk }]}>{content.badge}</Text>
        </Enter>
      ) : null}
      <AnnTitle text={content.title} d0={700} />
      <AnnBlocks blocks={content.blocks} d0={1100} max={2} />
    </AnnRoot>
  );
});

// ── 29 · Новый год — снег, цифры года подпрыгивают по одной ─────────────────────────────────────────────────────────

/** stBounceIn: сверху −80 и .6 → на место с проявлением (700 мс, пружина). */
const BOUNCE_IN: readonly Key[] = [{ at: 0, y: -80, scale: 0.6, opacity: 0 }, { at: 1, y: 0, scale: 1, opacity: 1 }];

/**
 * Год на кадре (в макете — «2027»): по дате события, если она есть, иначе по сегодняшней. зачем: «С Новым годом!» публикуют и 31 декабря,
 * и в первые дни января — в январе празднуем наступивший год, в остальные месяцы — следующий (31.12.2026 → 2027, 02.01.2027 → 2027).
 */
function celebratedYear(atMs: number): string {
  const d = new Date(atMs);
  return String(d.getMonth() === 0 ? d.getFullYear() : d.getFullYear() + 1);
}

export const NewYearFrame = memo(function NewYearFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const eventAtMs = content.eventAtMs ?? null;
  const year = useMemo(() => celebratedYear(eventAtMs ?? Date.now()), [eventAtMs]);
  useEffect(() => {
    DebugLogger.info(LOG, `newyear: год ${year} по ${eventAtMs !== null ? 'дате события' : 'сегодняшней дате'}`);
  }, [eventAtMs, year]);
  return (
    // зачем (stSnow макета объявлений: translateY(760px)): у личных историй снег падает на 880 — проп Моментов (571dbd8e3)
    <AnnRoot testID="story-ann-newyear" layer={<Snow fallTo={760} />} maskText>
      <TextZone>
        <View style={f.yr} accessible accessibilityLabel={year}>
          {year.split('').map((ch, i) => (
            <Keyframed key={`${i}-${ch}`} keys={BOUNCE_IN} d={150 + 130 * i} dur={700} ease={EASE_SPRING}>
              <Text style={[bigStyle.big, { color: pal.tx }]}>{ch}</Text>
            </Keyframed>
          ))}
        </View>
        <AnnBadge text={content.badge} d={800} />
        <AnnTitle text={content.title} d0={860} />
        <AnnBlocks blocks={content.blocks} d0={1200} max={1} />
      </TextZone>
    </AnnRoot>
  );
});

// ── 30 · Праздник — подарок падает сверху с подскоком, конфетти ─────────────────────────────────────────────────────

/** stDrop: сверху −280 с проявлением (1000 мс, пружина); stFloat 4,2 с: 50 % — −6. */
const DROP: readonly Key[] = [{ at: 0, y: -280, opacity: 0 }, { at: 1, y: 0, opacity: 1 }];
const FLOAT: readonly Key[] = [{ at: 0, y: 0 }, { at: 0.5, y: -6 }, { at: 1, y: 0 }];

/**
 * .v2art макета: drop-shadow(0 18px 30px sh-tint·55 %) по силуэту картинки. зачем: boxShadow рисует тень рамки, а не силуэта предмета.
 * Android — filter dropShadow (σ = 30 / 2, как у монеты Моментов); iOS — тень слоя без фона (система берёт силуэт картинки): filter на iOS
 * растеризует слой квадратом ([COIN-IOS-FILTER] в MomentCoin).
 */
function artShadow(tint: string): ViewStyle {
  return Platform.OS === 'ios'
    ? { shadowColor: tint, shadowOpacity: 0.55, shadowRadius: 15, shadowOffset: { width: 0, height: 18 } }
    : { filter: [{ dropShadow: { offsetX: 0, offsetY: 18, standardDeviation: 15, color: mix(tint, 0.55) } }] };
}

export const HolidayFrame = memo(function HolidayFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const name = announcementArt('holiday', content.art);
  const art = useMemo(() => (name ? resolveThemedArt(name, pal.isLight ? 'light' : 'dark') : null), [name, pal.isLight]);
  const shadow = useMemo(() => artShadow(pal.shTint), [pal.shTint]);
  const source = art?.base ?? null;
  useEffect(() => {
    DebugLogger.info(LOG, source ? `holiday: арт ${name} (${art?.origin})` : `holiday: арта нет (art=${String(content.art ?? '—')} → ${name ?? '—'}, ${art?.origin ?? 'none'}) — кадр без подарка`);
  }, [art?.origin, content.art, name, source]);
  return (
    // зачем (.conf i макета: top 40 %): конфетти личных историй стартует с 42 % — проп Моментов (571dbd8e3)
    <AnnRoot testID="story-ann-holiday" layer={<Confetti n={22} d0={900} fromPct={40} />} maskText>
      {source ? (
        <Art>
          <Keyframed keys={DROP} d={100} dur={1000} ease={EASE_SPRING}>
            <Loop keys={FLOAT} periodMs={4200} style={shadow}>
              <Image source={source} style={f.gift} contentFit="contain" transition={0} accessible={false} />
            </Loop>
          </Keyframed>
        </Art>
      ) : null}
      <TextZone>
        <AnnBadge text={content.badge} d={1000} />
        <AnnTitle text={content.title} d0={1060} />
        <AnnBlocks blocks={content.blocks} d0={1400} max={1} />
      </TextZone>
    </AnnRoot>
  );
});

const f = StyleSheet.create({
  // .heartbig: 110/110 цвета --acc-g
  heartBig: { lineHeight: 110 },
  // .big + .p: 8 у .p + 6 = 14
  afterBig: { height: 6 },
  // .pb2: 100 %, max 300, зазор 10, 12 сверху; .op: 52, радиус 16, поля 0 16, 16/20 700 слева; процент — <b> (жирнее 700 → 900), tabular
  pb2: { width: '100%', maxWidth: 300, gap: 10, marginTop: 12 },
  op: { height: 52, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, paddingHorizontal: 16 },
  // нажатие — как у кита (.t.down): .985 и прозрачность .86
  opPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  // заливка — обычный ребёнок слоя на всю строку: ширина в % считается от строки целиком (не от поля за вычетом отступов 16)
  opFillBox: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  opT: { flexShrink: 1, fontSize: 16, lineHeight: 20, fontWeight: '700', textAlign: 'left' },
  opP: { fontSize: 16, lineHeight: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  opCheck: { lineHeight: 20 },
  // .laurel 180 по центру; .ribbon: 10 сверху, поля 7/16, радиус 999
  laurel: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  ribbon: { marginTop: 10, paddingVertical: 7, paddingHorizontal: 16, borderRadius: 999 },
  ribbonT: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' }, // typo-exempt: .ribbon макета 12/16 800 капсом — лента «Автор недели», не подпись под названием
  // .yr: цифры в ряд с зазором 2 (цифра — .big 96/96 800 −4 tabular)
  yr: { flexDirection: 'row', gap: 2 },
  // .gift .v2art 170
  gift: { width: 170, height: 170 },
});
