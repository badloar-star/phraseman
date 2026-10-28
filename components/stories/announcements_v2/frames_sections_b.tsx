// ═══════════════════════════════════════════════════════════════════════════
// frames_sections_b.tsx — кадры 17–21 макета stories-announcements-v1.html (v2.1), группа «Разделы», вторая половина: Фраза дня, Ошибки,
// Видео, Экзамен, Разговор с ИИ.
//
// зачем (владелец 28.10: «точно так же, как на макете»; гейт сравнивает снимки в конечном состоянии): разметка, размеры, задержки и кривые —
// из render() TPL и CSS макета построчно (phrase: буквы stLetter y −44 rot −12 scale .6 пружиной 560 с 300 + 45·k, арт 110 pop 80, метка 300,
// блок 400 + 45·K + 300; mistakes: карточка 300 stTiltIn 1000 с 150 при perspective 800, stTiltLife 0 → 6°/−3° 6 с туда-обратно с 1,6 с,
// зачёркивание stGrowX 500 ease-out с 1400, «I agree» stUp 500 (ease) с 1900, метка 700, заголовок 760, блок 1100; video: кадр 320 × 180
// stPop 700 ease-out с 100, наезд stKen 14 с, кнопка 68 дышит 2,4 с, плашка «8:42»; exam: лучи 440 за артом, арт 160 pop 100, метка 400,
// заголовок 480, чипы stFromT пружиной 600 с 1000 / 1150; ai: диск 320 в углу (140°, опора 70 % / 30 %), арт 200 pop 350, волна, метка 700,
// заголовок 760, блок 1200).
// Вечные циклы макета без fill (stTiltLife, stKen) в конечном состоянии стоят в БАЗЕ (transform: none), а не на первом ключе: так стоит
// эталон гейта (ST.settle(true) + finish()) и макет при «Уменьшить движение».
// Глифы io() макета — 22 (инлайн font-size:22px перекрывает .vk .pb .io 28 и .sl .chip .io 15; сверено по эталону гейта).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import { resolveThemedArt } from '../../theme/themed_art_registry';
import { frameMs, phase, pingPong, useStoryFrameClock } from '../templates/story_frame_clock';
import { Enter } from '../templates/story_template_motion';
import { mix } from '../templates/story_template_palette';
import { AnnRoot, EASE_CSS, EASE_CSS_IN_OUT, EASE_CSS_OUT, EASE_OUT, EASE_SPRING, Keyframed, Loop, type Key, type KeyStyle } from './announcement_v2_motion';
import { useAnnPalette, type AnnPalette } from './announcement_v2_palette';
import { Disc, Rays, Wave } from './announcement_v2_parts';
import { announcementArt, type AnnouncementV2Content } from './announcement_v2_registry';
import { annText } from './announcement_v2_strings';
import { AnnBadge, AnnBlocks, AnnTitle, type AnnFrameProps } from './announcement_v2_text';

const LOG = '[STORY-ANN2]';

// ── общее: арт .v2art макета ───────────────────────────────────────────────────────────────────────────────────────

/** stFloat 4,2 с: 0 → −6 → 0 (картинка .v2art.float). */
const FLOAT: readonly Key[] = [{ at: 0, y: 0 }, { at: 0.5, y: -6 }, { at: 1, y: 0 }];

/** Арт кадра: выбранный в редакторе (если разрешён) или арт шаблона; комплект по оформлению — как artSrc() макета (тёмное / светлое). */
function useArtSource(content: AnnouncementV2Content, pal: AnnPalette): ImageSourcePropType | null {
  const name = announcementArt(content.design, content.art);
  const tone = pal.isLight ? 'light' : 'dark';
  // зачем pal в зависимостях: смена темы может сменить арт премиум-набора (resolveThemedArt сначала смотрит его)
  const base = useMemo(() => (name ? resolveThemedArt(name, tone).base : null), [name, tone, pal]);
  useEffect(() => {
    if (!base) DebugLogger.info(LOG, `кадр ${content.design}: арта нет (имя=${name ?? '—'}, комплект=${tone}) — место арта пустое, размер сохранён`);
  }, [base, content.design, name, tone]);
  return base;
}

/**
 * art(ph, name, size, d) макета: .pop с задержкой d (stPop 560 пружиной), внутри картинка size × size, плавает (stFloat).
 * зачем contentFit="contain": <img width height> макета без object-fit растягивается в квадрат (intro_ai_dialog 3:2 сжат так же, как в эталоне).
 * Без арта — пустое место того же размера (геометрия кадра не прыгает).
 */
const PopArt = memo(function PopArt({ source, size, d }: Readonly<{ source: ImageSourcePropType | null; size: number; d: number }>) {
  const box = useMemo(() => ({ width: size, height: size }), [size]);
  return (
    <Enter kind="pop" d={d}>
      <Loop keys={FLOAT} periodMs={4200}>
        {source ? <Image source={source} style={box} contentFit="contain" transition={0} accessible={false} /> : <View style={box} />}
      </Loop>
    </Enter>
  );
});

// ── 17 · Фраза дня — буквы падают по одной с поворотом ─────────────────────────────────────────────────────────────

/** stLetter: translateY(−44) rotate(−12°) scale(.6) → none, пружина .34,1.56,.64,1 за 560 мс (порядок transform как в CSS: сдвиг → поворот → масштаб). */
const LETTER: readonly Key[] = [{ at: 0, y: -44, rot: -12, scale: 0.6, opacity: 0 }, { at: 1, y: 0, rot: 0, scale: 1, opacity: 1 }];
const LETTER_D0 = 300;
const LETTER_STEP = 45;

type PhraseLetter = Readonly<{ ch: string; k: number }>;
type PhraseWord = Readonly<{ key: string; letters: readonly PhraseLetter[] }>;

/** Слова по пробелу (.wd nowrap), буквы по кодовым точкам ([...wd] макета); k — сквозной номер буквы по всему заголовку (k++ макета). */
function splitLetters(title: string): Readonly<{ words: readonly PhraseWord[]; total: number }> {
  let k = 0;
  const words = title.split(' ').filter(Boolean).map((word, i) => ({ key: `${i}-${word}`, letters: Array.from(word).map((ch) => ({ ch, k: k++ })) }));
  return { words, total: k };
}

export const PhraseFrame = memo(function PhraseFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const art = useArtSource(content, pal);
  const { words, total } = useMemo(() => splitLetters(content.title), [content.title]);
  const letterStyle = useMemo<StyleProp<TextStyle>>(() => [f.letter, { color: pal.tx }], [pal.tx]);
  return (
    <AnnRoot testID="story-ann-phrase">
      <PopArt source={art} size={110} d={80} />
      <AnnBadge text={content.badge} d={300} />
      <View style={f.letters} accessible accessibilityRole="header" accessibilityLabel={content.title}>
        {words.map((w) => ( // guard-ok: ключ — номер и текст слова; заголовок на показе кадра не меняется
          <View key={w.key} style={f.word}>
            {w.letters.map((l) => ( // guard-ok: ключ — сквозной номер буквы, порядок постоянный
              <Keyframed key={l.k} keys={LETTER} d={LETTER_D0 + l.k * LETTER_STEP} dur={560} ease={EASE_SPRING}>
                <Text style={letterStyle}>{l.ch}</Text>
              </Keyframed>
            ))}
          </View>
        ))}
      </View>
      {/* зачем: blocks(s.blocks, 400 + k·45 + 300) макета — значение проявляется после последней буквы */}
      <AnnBlocks blocks={content.blocks} d0={400 + total * LETTER_STEP + 300} max={1} />
    </AnnRoot>
  );
});

// ── 18 · Ошибки — карточка выезжает в 3D, ошибка зачёркивается, верный ответ всплывает; карточка покачивается ─────────

/** Фразы карточки — пример макета (ошибка и исправление на английском, как в «Моих ошибках»); в содержимом объявления их нет. */
const MISTAKE_WRONG = 'I am agree';
const MISTAKE_RIGHT = 'I agree';
/** stGrowX: scaleX 0 → 1 от левого края (0,001 вместо 0 — вырожденная матрица ломает разложение transform на Android). */
const STRIKE: readonly Key[] = [{ at: 0, scaleX: 0.001 }, { at: 1, scaleX: 1 }];
/** stUp: y 16 → 0 с проявлением; у .right макета кривая не задана — CSS ease. */
const UP16: readonly Key[] = [{ at: 0, y: 16, opacity: 0 }, { at: 1, y: 0, opacity: 1 }];
const TILT_PERSPECTIVE = 800;
const TILT_IN_D = 150;
const TILT_IN_MS = 1000;
const TILT_LIFE_D = 1600;
const TILT_LIFE_MS = 6000;

/**
 * .tiltw > .tiltlife > .tilt макета одним слоем: perspective 800 · stTiltLife (из покоя: rotateY 0 → 6, rotateX 0 → −3, ease-in-out, 6 с туда-обратно
 * с 1,6 с) · stTiltIn (rotateX 28 rotateY −18 translateY 30 → none, проявление, 1000 мс ease-out с 150). Отрезки не пересекаются (вход
 * кончается к 1150), порядок функций — как preserve-3d макета. stTiltLife без fill: до 1,6 с и в конечном состоянии — ровно (база).
 */
const TiltCard = memo(function TiltCard({ style, children }: Readonly<{ style: StyleProp<ViewStyle>; children: React.ReactNode }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    const t = frameMs(progress.value, durationMs, final);
    const e = EASE_OUT(phase(t, TILT_IN_D, TILT_IN_MS));
    const k = 1 - e;
    const live = !final && t >= TILT_LIFE_D;
    const l = live ? EASE_CSS_IN_OUT(pingPong(t - TILT_LIFE_D, TILT_LIFE_MS, false)) : 0;
    // зачем (макет v2.1, правка 28.10): качание из покоя 0 → 6/−3 → 0 (stTiltLife: from none → to rotateY 6 rotateX −3, туда-обратно), без рывка на 1,6 с
    const ry = live ? 6 * l : 0;
    const rx = live ? -3 * l : 0;
    const s: KeyStyle = {
      opacity: e,
      transform: [{ perspective: TILT_PERSPECTIVE }, { rotateY: `${ry}deg` }, { rotateX: `${rx}deg` }, { rotateX: `${28 * k}deg` }, { rotateY: `${-18 * k}deg` }, { translateY: 30 * k }],
    };
    return s;
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
});

export const MistakesFrame = memo(function MistakesFrame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const art = useArtSource(content, pal);
  const was = annText(lang, 'was');
  const became = annText(lang, 'became');
  const card = useMemo<StyleProp<ViewStyle>>(() => [f.tilt, { backgroundColor: pal.card, boxShadow: `0 30px 60px -24px ${mix(pal.shTint, 0.8)}` }], [pal.card, pal.shTint]);
  const lbl = useMemo<StyleProp<TextStyle>>(() => [f.lbl, { color: pal.sec }], [pal.sec]);
  return (
    <AnnRoot testID="story-ann-mistakes">
      <View style={f.tiltArt} accessible accessibilityLabel={`${was}: ${MISTAKE_WRONG}. ${became}: ${MISTAKE_RIGHT}`}>
        <TiltCard style={card}>
          <View style={f.hd}>
            <Text style={lbl}>{was}</Text>
            {/* зачем: .v2art 44 без pop/float; drop-shadow макета в RN не рисуем (filter у Image не везде) */}
            {art ? <Image source={art} style={f.art44} contentFit="contain" transition={0} accessible={false} /> : <View style={f.art44} />}
          </View>
          <View style={f.wrong}>
            <Text style={[f.phrase, { color: pal.tx }]}>{MISTAKE_WRONG}</Text>
            <Keyframed keys={STRIKE} d={1400} dur={500} ease={EASE_CSS_OUT} style={[f.strike, { backgroundColor: pal.bad }]} />
          </View>
          <Text style={lbl}>{became}</Text>
          <Keyframed keys={UP16} d={1900} dur={500} ease={EASE_CSS}>
            <Text style={[f.phrase, { color: pal.good }]}>{MISTAKE_RIGHT}</Text>
          </Keyframed>
        </TiltCard>
      </View>
      <AnnBadge text={content.badge} d={700} />
      <AnnTitle text={content.title} d0={760} />
      <AnnBlocks blocks={content.blocks} d0={1100} max={1} />
    </AnnRoot>
  );
});

// ── 19 · Видео — кадр всплывает, картинка медленно наезжает, кнопка дышит ──────────────────────────────────────────

/** Запасной кадр видео — картинка макета (assets/home_video/en_rail_1.jpg макета). */
const VIDEO_FALLBACK: ImageSourcePropType = require('../../../assets/images/en_rail_1.jpg');
/** Длительность на плашке — пример макета. */
const VIDEO_DURATION = '8:42';
/** .vk: stPop (scale .6 → 1 с проявлением), но кривая ease-out .23,1,.32,1 и 700 мс — не пружина. */
const VK_POP: readonly Key[] = [{ at: 0, scale: 0.6, opacity: 0 }, { at: 1, scale: 1, opacity: 1 }];
/** stBreathe кнопки: 1 → 1,04 → 1 за 2,4 с (ease-in-out на каждом отрезке). */
const BREATHE: readonly Key[] = [{ at: 0, scale: 1 }, { at: 0.5, scale: 1.04 }, { at: 1, scale: 1 }];
const KEN_MS = 14000;

/**
 * stKen: scale(1.02) → scale(1.16) translate(−8, −5), ease-in-out, 14 с туда-обратно; порядок как в CSS — масштаб, потом сдвиг
 * (сдвиг масштабируется). Без fill: в конечном состоянии — база макета (scale 1, без сдвига).
 */
const KenImage = memo(function KenImage({ source }: Readonly<{ source: ImageSourcePropType }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    const e = final ? 0 : EASE_CSS_IN_OUT(pingPong(frameMs(progress.value, durationMs, final), KEN_MS, false));
    const s: KeyStyle = { opacity: 1, transform: [{ scale: final ? 1 : 1.02 + 0.14 * e }, { translateX: -8 * e }, { translateY: -5 * e }] };
    return s;
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animated]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} accessible={false} />
    </Animated.View>
  );
});

export const VideoFrame = memo(function VideoFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  // TODO(ролик ленты): content.videoId → обложка и длительность ролика ленты Главной. зачем: ролик подключат позже (контракт уже несёт
  // videoId); до этого кадр — картинка макета, чтобы снимок совпадал с эталоном гейта и кадр не был пустым.
  useEffect(() => {
    if (content.videoId) DebugLogger.info(LOG, `кадр video: videoId=${content.videoId} — пока запасной кадр макета (ролик ленты не подключён)`);
  }, [content.videoId]);
  const shadow = useMemo<ViewStyle>(() => ({ boxShadow: `0 24px 50px -20px ${mix(pal.shTint, 0.8)}` }), [pal.shTint]);
  return (
    <AnnRoot testID="story-ann-video">
      <Keyframed keys={VK_POP} d={100} dur={700} ease={EASE_OUT} style={[f.vk, shadow]}>
        <View style={f.vkClip}>
          <KenImage source={VIDEO_FALLBACK} />
          <Loop keys={BREATHE} periodMs={2400} style={[f.pb, { backgroundColor: pal.cta }]}>
            <Ionicons name="play" size={22} color={pal.ctaInk} style={f.pbIcon} />
          </Loop>
          {/* зачем: rgba(0,0,0,.55) + #fff макета → роль «подложка поверх видео» темы на 55 % и белый mediaInk (светлые темы — ровно макет) */}
          <View style={[f.dur, { backgroundColor: mix(pal.mediaScrim, 0.55) }]}>
            <Text style={[f.durT, { color: pal.mediaInk }]}>{VIDEO_DURATION}</Text>
          </View>
        </View>
      </Keyframed>
      <AnnBadge text={content.badge} d={400} />
      <AnnTitle text={content.title} d0={480} />
      <AnnBlocks blocks={content.blocks} d0={900} max={1} />
    </AnnRoot>
  );
});

// ── 20 · Экзамен — лучи вращаются за артом, арт парит, чипы падают сверху ──────────────────────────────────────────

/** stFromT: y −48 → 0 с проявлением; у .chips .chip кривая — пружина .34,1.56,.64,1, 600 мс. */
const FROM_T: readonly Key[] = [{ at: 0, y: -48, opacity: 0 }, { at: 1, y: 0, opacity: 1 }];

type ExamChip = Readonly<{ key: string; icon: React.ComponentProps<typeof Ionicons>['name']; d: number; text: Readonly<Record<Lang, string>> }>;
// зачем: тексты чипов — пример макета («12 вопросов», «сдать от 10»), полей для них в объявлении нет. До строк annText (examQuestions /
// examPassFrom — переданы координатору) живут здесь на 9 языках интерфейса. TRANSLATE: uk … pl — английские, как в announcement_v2_strings.ts.
const EXAM_CHIPS: readonly ExamChip[] = [
  { key: 'questions', icon: 'list', d: 1000, text: { ru: '12 вопросов', uk: '12 questions', en: '12 questions', es: '12 questions', 'pt-BR': '12 questions', vi: '12 questions', id: '12 questions', tr: '12 questions', pl: '12 questions' } },
  { key: 'pass', icon: 'checkmark', d: 1150, text: { ru: 'сдать от 10', uk: '10 to pass', en: '10 to pass', es: '10 to pass', 'pt-BR': '10 to pass', vi: '10 to pass', id: '10 to pass', tr: '10 to pass', pl: '10 to pass' } },
];

export const ExamFrame = memo(function ExamFrame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const art = useArtSource(content, pal);
  const chip = useMemo<StyleProp<ViewStyle>>(() => [f.chip, { backgroundColor: mix(pal.tx, 0.12) }], [pal.tx]);
  const chipText = useMemo<StyleProp<TextStyle>>(() => [f.chipT, { color: pal.tx }], [pal.tx]);
  return (
    <AnnRoot testID="story-ann-exam" layer={<View style={f.rays}><Rays id="ann-exam-rays" /></View>}>
      <PopArt source={art} size={160} d={100} />
      <AnnBadge text={content.badge} d={400} />
      <AnnTitle text={content.title} d0={480} />
      {/* зачем: по render() макета блоков у кадра нет — под заголовком только чипы */}
      <View style={f.chips}>
        {EXAM_CHIPS.map((c) => (
          <Keyframed key={c.key} keys={FROM_T} d={c.d} dur={600} ease={EASE_SPRING} style={chip}>
            <Ionicons name={c.icon} size={22} color={pal.acc} />
            <Text style={chipText}>{c.text[lang] ?? c.text.en}</Text>
          </Keyframed>
        ))}
      </View>
    </AnnRoot>
  );
});

// ── 21 · Разговор с ИИ — диск темы в углу, арт у правого края, волна на всю ширину, текст слева ────────────────────

export const AiFrame = memo(function AiFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const art = useArtSource(content, pal);
  return (
    <AnnRoot testID="story-ann-ai" left back={<Disc size={320} angle={140} d={100} originFx={0.7} originFy={0.3} style={f.disc2} />}>
      <View style={f.aiArt}>
        <PopArt source={art} size={200} d={350} />
      </View>
      <Wave />
      <AnnBadge text={content.badge} d={700} align="left" />
      <AnnTitle text={content.title} d0={760} align="left" />
      <AnnBlocks blocks={content.blocks} d0={1200} align="left" max={1} />
    </AnnRoot>
  );
});

const f = StyleSheet.create({
  // 17 · .letters: 46/54 800 −1, max 334, отступ 8, перенос по словам, column-gap .22em (10,12); .wd nowrap
  letters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 46 * 0.22, maxWidth: 334, marginTop: 8 },
  word: { flexDirection: 'row' },
  letter: { fontSize: 46, lineHeight: 54, fontWeight: '800', letterSpacing: -1 },
  // 18 · .art.tiltw: отступ 18; .tilt: 300, радиус 24, поля 18/22/20, текст слева, зазор 10; .hd: на всю ширину, края, зазор 10
  tiltArt: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  tilt: { width: 300, borderRadius: 24, paddingTop: 18, paddingHorizontal: 22, paddingBottom: 20, alignItems: 'flex-start', gap: 10 },
  hd: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  // .lbl: 12/16 700 +1 капсом, вторичный (guard-ok: подпись «Было / Стало» внутри карточки макета, не расшифровка под названием)
  lbl: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'left' }, // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1
  art44: { width: 44, height: 44 },
  // .wrong / .right: 26/32 800; полоса: top 50 % − 1 = 15, высота 3, радиус 2, от левого края
  wrong: { alignSelf: 'flex-start' },
  phrase: { fontSize: 26, lineHeight: 32, fontWeight: '800', textAlign: 'left' },
  strike: { position: 'absolute', left: 0, right: 0, top: 15, height: 3, borderRadius: 2, transformOrigin: 'left' },
  // 19 · .vk: 320 × 180, радиус 22, отступ снизу 20 (тень снаружи, обрезка — внутренним слоем); .pb 68 по центру; .dur справа 12 снизу 12
  vk: { width: 320, height: 180, borderRadius: 22, marginBottom: 20 },
  vkClip: { width: 320, height: 180, borderRadius: 22, overflow: 'hidden' },
  pb: { position: 'absolute', left: 160 - 34, top: 90 - 34, width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  pbIcon: { marginLeft: 4 },
  dur: { position: 'absolute', right: 12, bottom: 12, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 9 },
  durT: { fontSize: 12, lineHeight: 16, fontWeight: '700' }, // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1
  // 20 · .fx.rays: лучи 440 по центру кадра; .chips: ряд, зазор 8, по центру, перенос, отступ 16; .chip: 32, поля 0 12, радиус 16, зазор 6, 14 700
  rays: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16 },
  chipT: { fontSize: 14, fontWeight: '700' }, // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1
  // 21 · .disc2: 320 в углу (right −80, top −70); .aiart: у правого края, поля 0 −6 4 0
  disc2: { position: 'absolute', right: -80, top: -70 },
  aiArt: { alignSelf: 'flex-end', marginRight: -6, marginBottom: 4 },
});
