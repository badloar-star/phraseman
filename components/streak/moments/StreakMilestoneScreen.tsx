// ═══════════════════════════════════════════════════════════════════════════
// StreakMilestoneScreen.tsx — полноэкранные рубежи серии: средний (50, 200, 300, 400, 600, 800, 900), большой (7, 30, 100), «Полтысячи» (500), «Год» (365),
// «Два года» (730), «Легенда» (1000). Образец: docs/design/v2-app/streak-milestones.html (`medium`, `big`, `half500`, `year`, `twoYears`, `legend` + init-такты).
//
// зачем (владелец 14.10: «перенести полноценно все модалы, точно по макетам»; гейт паритета, круг 1): у каждого уровня своя сцена и тайм-лист (streak_milestones.ts → STREAK_MOMENT_TIMELINE):
// такты включают стадии сцены — burst огня, морф в новую стадию с дрожью, тексты по 180–200 мс, акты года и легенды. Огонь — цвет стадии (7 яркий, 30 второй цвет темы, 100 белый, 365 звёздный,
// 1000 золотой) с радиальным ореолом, без тёмной подложки. Фон — экран темы (MomentFullScreen). «Пропустить» только у актов 1–2 года и легенды; в финале — «Дальше →» и «Поделиться».
// Конфетти и искры рисуются ПОД текстом. Монета — как в образце (радость на морфе, блеск в «Легенде»); запрещены только формулировки про живую монету. Звук — sound_v2 через мост, хаптик на тактах.
// Reanimated на UI-треде; reduceMotion — сразу финальный вид. Ничего не начисляет и не пишет: ачивку, «Поделиться» и показ решает Ядро (флаг moments_v3).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { hapticSuccess, hapticTap } from '../../../hooks/use-haptics';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import AchievementArt from '../../AchievementArt';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { useTheme } from '../../ThemeContext';
import { V2Button } from '../../v2/V2Kit';
import MomentCoin from '../../moments/MomentCoin';
import MomentFirework, { useMomentRumble } from '../../spire/moments/moments_effects';
import { MomentFullScreen } from '../../spire/moments/moments_layout';
import { useSpirePalette } from '../../spire/useSpirePalette';
import StreakConfetti from './StreakConfetti';
import StreakMomentFlame from './StreakMomentFlame';
import { STREAK_PROBE, STREAK_PROBE_DELAYS_MS } from './streak_calendar_probe';
import { STREAK_FLAME_FULL_DAYS } from '../StreakFlameFill';

// зачем (Сверка моментов v3 15.10, эталон engagement-moments-v3-all m19): на окне рубежа огонь залит целиком — стадию несут цвет и число.
// StreakFlameFill заливает по дням (7 из 10 = 70 %), и на рубеже 7 верх огня оставался пустым контуром. Число на плашке — настоящее.
const milestoneFlameDays = (days: number): number => Math.max(days, STREAK_FLAME_FULL_DAYS);
import { HalfRing, MonthCalendar, MonthRing } from './StreakMomentRings';
import {
  STREAK_MILESTONES_WITH_SHARE, STREAK_MONTH_ARCS, STREAK_MOMENT_TIMELINE, streakAchievementId, streakFlameStage, streakMomentKind,
  type StreakFlameStage, type StreakMilestone, type StreakMomentKind,
} from './streak_milestones';
import { playStreakLegendSecondSound, playStreakSceneSound, playStreakTapSound } from './streak_moments_sound';
import { streakMilestoneSubline, streakMilestoneTitle, streakMomentText } from './streak_moments_strings';

export type StreakMilestoneScreenProps = Readonly<{
  lang: Lang;
  /** Рубеж не малого уровня (малые — тост StreakMilestoneToast). */
  milestone: StreakMilestone;
  coinRank: number | null;
  onDone: () => void;
  /** Нет колбэка — кнопки «Поделиться» нет, даже у рубежей, где она предусмотрена. */
  onShare?: () => void;
  testID?: string;
}>;

const HEAVY_CUES: ReadonlySet<string> = new Set(['morph', 'fireworks', 'fire1']);
const COIN_OVERLAP = -20; // guard-ok: наложение монеты на огонь (вид), не баланс

function Beat({ i, children }: Readonly<{ i: number; children: ReactNode }>) {
  const reduceMotion = useReducedMotion();
  return <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(i * 190).duration(500)}>{children}</Animated.View>;
}

function StreakMilestoneScreen({ lang, milestone, coinRank, onDone, onShare, testID = 'streak-milestone-screen' }: StreakMilestoneScreenProps) {
  const p = useSpirePalette();
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const rumble = useMomentRumble();
  const kind: StreakMomentKind = streakMomentKind(milestone);
  const cues = STREAK_MOMENT_TIMELINE[kind];
  const [done, setDone] = useState<ReadonlySet<string>>(() => (reduceMotion ? new Set(cues.map((c) => c.id)) : new Set()));
  const [burstKey, setBurstKey] = useState(0);
  const [morphKey, setMorphKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // зачем (гейт паритета, круг 1 — ПРИЧИНА «нет текстов и кнопок»): `rumble` создаётся заново на каждый рендер, и эффект тактов, зависевший от fire → rumble, перезапускал ВСЕ таймеры после каждого такта;
  // сцена бесконечно крутила морф и до такта «text» не доходила. Теперь fire живёт в ref, эффект зависит только от сцены — таймеры ставятся один раз.
  const fireRef = useRef<(id: string) => void>(() => undefined);
  const mountedAtRef = useRef(Date.now());
  const viewportHRef = useRef(0);
  // зачем (Сверка d30b fd2e677da: календарь смонтирован 347×235, но на кадре t14 его нет) — сперва логи [STREAK-MILESTONE] calendar:visual:
  // где календарь на экране (measureInWindow) против высоты окна и прокрутки, в момент раскладки и через 0,5/1/2 с; такты; цвета клеток.
  const calendarRef = useRef<View>(null);
  const columnRef = useRef<View>(null);
  const scrollYRef = useRef(0);
  const visualTracedRef = useRef(false);
  const doneRef = useRef(done);
  doneRef.current = done;
  const { height: windowH } = useWindowDimensions();
  const traceCalendarVisual = (trigger: string) => {
    if (visualTracedRef.current && trigger === 'layout') return;
    if (trigger === 'layout') {
      visualTracedRef.current = true;
      // зачем (Ревизор 3.34): повторные замеры — довесок пробы, в сторовую сборку не уезжают
      if (STREAK_PROBE) STREAK_PROBE_DELAYS_MS.forEach((ms) => setTimeout(() => traceCalendarVisual(`+${ms}ms`), ms));
    }
    calendarRef.current?.measureInWindow((x, y, w, h) => {
      console.log(`[STREAK-MILESTONE] calendar:visual ${JSON.stringify({
        trigger, milestone, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), windowH: Math.round(windowH),
        onScreen: y < windowH && y + h > 0, bottomCut: Math.max(0, Math.round(y + h - windowH)), scrollY: Math.round(scrollYRef.current),
        viewportH: viewportHRef.current, beats: [...doneRef.current], extraFired: doneRef.current.has('extra'),
        cellOn: glass.accentGraphic, cellOff: p.control, bg: p.bg,
      })}`); // guard-ok: строка на замер видимости календаря
    });
  };
  const layoutLoggedRef = useRef('');
  fireRef.current = (id: string) => {
    // зачем (Сверка r8, d30: «календаря нет даже через 14 с, под заголовком пусто») — сперва логи: какой такт сработал и когда
    console.log(`[STREAK-MILESTONE] beat ${JSON.stringify({ milestone, kind, id, sinceMountMs: Date.now() - mountedAtRef.current })}`); // guard-ok: строка на такт сцены
    setDone((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    if (id === 'burst') setBurstKey((k) => k + 1);
    if (id === 'morph') { setMorphKey((k) => k + 1); rumble.play(); }
    if (id === 'fireworks') rumble.play();
    if (id === 'text') playStreakTapSound();
    if (id === 'act2' && kind === 'legend') playStreakLegendSecondSound();
    void (HEAVY_CUES.has(id) ? hapticSuccess() : hapticTap());
  };

  useEffect(() => {
    playStreakSceneSound(kind);
  }, [kind]);

  useEffect(() => {
    if (reduceMotion) return undefined;
    timers.current = cues.map((c) => setTimeout(() => fireRef.current(c.id), c.at));
    return () => timers.current.forEach(clearTimeout);
  }, [cues, reduceMotion]);

  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setDone(new Set(cues.map((c) => c.id)));
  }, [cues]);

  const has = (id: string) => done.has(id);
  // зачем (аудит Optimistic UI, 14.10): двойной тап по «Дальше» не должен звать onDone дважды (хозяин может закрывать окно и двигать очередь) — один вызов на показ
  const finishedRef = useRef(false);
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDone();
  }, [onDone]);
  const baseStage = streakFlameStage(milestone);
  const title = streakMilestoneTitle(lang, milestone);
  const sub = streakMilestoneSubline(lang, milestone);
  const overline = streakMomentText(lang, 'overline', { n: milestone });
  const showShare = !!onShare && STREAK_MILESTONES_WITH_SHARE.includes(milestone);
  const act = kind === 'year' || kind === 'legend' ? (has('act3') ? 3 : has('act2') ? 2 : 1) : 3;
  const finalAct = act === 3;
  const morphed = has('morph');
  const before = milestone - 1; // guard-ok: цифра огня ДО морфа (n−1, как в образце), вид — не баланс
  const prevStage = Math.max(0, baseStage - 1) as StreakFlameStage; // guard-ok: стадия огня ДО морфа (вид), не баланс
  const flameA11y = streakMomentText(lang, 'flameA11y', { n: milestone });

  const T = (text: string, style: 'ov' | 'ovMuted' | 'xl' | 'md' | 'p') => (
    <Text style={[s[style], { color: style === 'ov' ? glass.accentTextSafe : style === 'p' || style === 'ovMuted' ? p.textSecondary : p.text }]}>{text}</Text>
  );
  const foot = (
    <View style={s.foot}>
      <V2Button label={streakMomentText(lang, 'next')} onPress={finish} icon="arrow-forward" testID={`${testID}-next`} />
      {showShare ? <V2Button label={streakMomentText(lang, 'share')} onPress={onShare} variant="secondary" testID={`${testID}-share`} /> : null}
    </View>
  );

  // сцены: каждая возвращает содержимое `body`; `glowTop` — центр ореола по высоте экрана (null — без ореола), `confetti` — конфетти под текстом.
  // зачем (координатор 18.10): ореол — эталонный `.glowspot` моментов (MomentFullScreen → moment_glow.tsx: широкий, тусклый, --acc-soft), высоты — из
  // streak-milestones.html: medium 34 %, big 30 %, half500 32 %, twoYears 34 %; у «Года» (365) и «Легенды» (1000) в эталоне ореола нет ни в одном акте.
  let body: ReactNode;
  let glowTop: `${number}%` | null = null;
  let confetti = false;
  if (kind === 'medium') {
    glowTop = '34%';
    body = (
      <>
        <StreakMomentFlame days={milestoneFlameDays(milestone)} label={milestone} size={150} stage={baseStage} burstKey={burstKey || undefined} accessibilityLabel={flameA11y} />
        {has('text') ? <Beat i={0}><View style={s.col}>{T(overline, 'ov')}{T(title, 'xl')}{T(sub, 'p')}</View></Beat> : null}
      </>
    );
  } else if (kind === 'big') {
    const st = morphed ? baseStage : prevStage;
    glowTop = '30%';
    confetti = milestone === 100 && has('extra');
    const ach = streakAchievementId(milestone);
    body = (
      <>
        <View style={s.fireRow}>
          <StreakMomentFlame days={milestoneFlameDays(morphed ? milestone : before)} label={morphed ? milestone : before} size={160} stage={st} morphKey={morphKey || undefined} accessibilityLabel={flameA11y} />
          <View style={s.coinBeside}><MomentCoin rank={coinRank} size={60} mood={morphed ? 'cheer' : 'idle'} shadow={false} emote={morphed ? 'star' : null} emoteKey={morphKey} emoteCount={3} /></View>
        </View>
        {has('text') ? (
          <Beat i={0}><View ref={columnRef} style={s.col}>
            {T(overline, 'ov')}{T(title, 'xl')}{T(sub, 'p')}
            {milestone === 7 && ach ? (
              <View style={s.achRow}>
                <AchievementArt achievementId={ach} size={56} />
                <Text style={[s.achText, { color: p.text }]}>{streakMomentText(lang, 'achievementRow', { n: milestone })}</Text>
              </View>
            ) : null}
            {milestone === 30 && has('extra') ? (
              <View
                ref={calendarRef}
                style={s.extra}
                onLayout={(e) => {
                  traceCalendarVisual('layout');
                  // зачем (Сверка r8 b705b923f: calendar=false, высота сцены после такта extra не изменилась) — сперва логи: реальный размер календаря
                  const { width, height } = e.nativeEvent.layout;
                  console.log(`[STREAK-MILESTONE] calendar:layout ${JSON.stringify({ milestone, w: Math.round(width), h: Math.round(height), zero: Math.round(width) === 0 || Math.round(height) === 0 })}`); // guard-ok: строка на раскладку календаря
                }}
              ><MonthCalendar lit={30} probeRefs={() => ({ column: columnRef.current, parent: calendarRef.current })} /></View>
            ) : null}
          </View></Beat>
        ) : null}
      </>
    );
  } else if (kind === 'half500') {
    glowTop = '32%';
    confetti = has('burst');
    body = (
      <>
        <HalfRing size={250} run={has('ring')}>
          <StreakMomentFlame days={milestoneFlameDays(milestone)} label={milestone} size={150} stage={baseStage} burstKey={has('burst') ? burstKey || undefined : undefined} accessibilityLabel={flameA11y} />
        </HalfRing>
        {has('text') ? <Beat i={0}><View style={s.col}>{T(overline, 'ov')}{T(title, 'xl')}{T(sub, 'p')}</View></Beat> : null}
      </>
    );
  } else if (kind === 'twoYears') {
    glowTop = '34%';
    body = (
      <>
        {T(overline, 'ovMuted')}
        <View style={s.extra}><MonthRing rings={2} size={250} center={String(milestone)} lit={has('months')} stepMs={STREAK_MONTH_ARCS.twoYears.stepMs} /></View>
        {has('text') ? <Beat i={0}><View style={s.col}>{T(title, 'xl')}{T(sub, 'p')}</View></Beat> : null}
        <MomentFirework x={width / 2} y={260} r={130} fire={has('fireworks')} />
      </>
    );
  } else if (kind === 'year') {
    const st: StreakFlameStage = act === 2 && !morphed ? 3 : 4;
    confetti = has('act3');
    body = act === 1 ? (
      <>{T(overline, 'ov')}{T(streakMomentText(lang, 'yearAct1'), 'md')}<View style={s.extra}><MonthRing rings={1} size={250} center={String(milestone)} lit={has('months')} stepMs={STREAK_MONTH_ARCS.year.stepMs} /></View></>
    ) : (
      <>
        <StreakMomentFlame days={milestoneFlameDays(milestone)} label={milestone} size={act === 2 ? 180 : 150} stage={st} morphKey={morphKey || undefined} accessibilityLabel={flameA11y} />
        {act === 2 ? T(streakMomentText(lang, 'stageNew', { next: 1000 }), 'ov') : null}
        {T(title, 'xl')}
        {act === 3 ? T(sub, 'p') : null}
        <MomentFirework x={width / 2} y={220} r={120} fire={has('morph')} />
      </>
    );
  } else {
    // legend
    const st: StreakFlameStage = act === 1 && !morphed ? 4 : 5;
    confetti = has('act3');
    body = act === 1 ? (
      <>
        <StreakMomentFlame days={morphed ? 1000 : 999} label={morphed ? 1000 : 999} size={170} stage={st} morphKey={morphKey || undefined} accessibilityLabel={flameA11y} />
        {T(overline, 'ov')}
      </>
    ) : act === 2 ? (
      <>
        <MomentCoin rank={19} size={130} mood="cheer" glints emote="star" emoteKey={1} emoteCount={6} />
        {T(title, 'xl')}{T(streakMomentText(lang, 'legendSub'), 'p')}
        <MomentFirework x={width / 2} y={200} r={120} fire={has('fire1')} />
        <MomentFirework x={width * 0.28} y={260} r={80} fire={has('fire2')} delayMs={0} />
        <MomentFirework x={width * 0.72} y={240} r={90} fire={has('fire3')} delayMs={0} />
      </>
    ) : (
      <>
        <StreakMomentFlame days={1000} label={1000} size={170} stage={5} accessibilityLabel={flameA11y} />
        {T(streakMomentText(lang, 'finalStage'), 'ov')}{T(title, 'xl')}
      </>
    );
  }

  const withFoot = kind === 'year' || kind === 'legend' ? finalAct : has('text');
  const skippable = (kind === 'year' || kind === 'legend') && !finalAct;
  const bodyKey = `${kind}-${act}`;
  return (
    <MomentFullScreen testID={testID} glowTop={glowTop ?? undefined}>
      <Animated.View style={[s.fill, { paddingTop: insets.top + 52, paddingBottom: insets.bottom + 24 }, rumble.style]}>
        {confetti ? <StreakConfetti fire /> : null}
        {/* зачем (контракт «до кнопки можно добраться»): на низком экране сцена прокручивается, а «Дальше» остаётся внизу */}
        <ScrollView
          key={bodyKey}
          decelerationRate="fast"
          style={s.fillBody}
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          bounces={false}
          onLayout={(e) => { viewportHRef.current = Math.round(e.nativeEvent.layout.height); }}
          // зачем (Ревизор 3.34): JS-обработчик прокрутки нужен только пробе calendar:visual — в сторе его нет
          onScroll={STREAK_PROBE ? (e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; } : undefined}
          scrollEventThrottle={STREAK_PROBE ? 64 : undefined}
          onContentSizeChange={(_w, h) => {
            // зачем (Сверка r8, d30 «огонь у верхнего края»): содержимое выше окна прокрутки → сцена прижата к верху; строка на каждую смену высоты
            const line = `${kind}:${Math.round(h)}/${viewportHRef.current}:${[...done].join(',')}`;
            if (layoutLoggedRef.current === line) return;
            layoutLoggedRef.current = line;
            console.log(`[STREAK-MILESTONE] layout ${JSON.stringify({ milestone, kind, contentH: Math.round(h), viewportH: viewportHRef.current, overflow: Math.round(h) > viewportHRef.current, done: [...done], calendar: milestone === 30 && done.has('extra') && done.has('text') })}`); // guard-ok: строка на смену геометрии
          }}
        >{body}</ScrollView>
        {withFoot ? <Beat i={2}>{foot}</Beat> : <View style={s.footSpacer} />}
        {skippable ? (
          <Pressable accessibilityRole="button" accessibilityLabel={streakMomentText(lang, 'skip')} onPress={skip} hitSlop={12} style={[s.skip, { top: insets.top + 12, backgroundColor: glass.buttonFill }]} testID={`${testID}-skip`}>
            <Text style={[s.skipText, { color: p.text }]}>{streakMomentText(lang, 'skip')}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </MomentFullScreen>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 24 },
  fillBody: { flex: 1 },
  body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  col: { alignItems: 'center', gap: 6, marginTop: 14 },
  fireRow: { flexDirection: 'row', alignItems: 'flex-end' },
  coinBeside: { marginLeft: COIN_OVERLAP, marginBottom: 10 },
  extra: { marginTop: 16, width: '100%', alignItems: 'center' },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  achText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  ov: { fontSize: 13, lineHeight: 17, letterSpacing: 1.4, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  ovMuted: { fontSize: 13, lineHeight: 17, letterSpacing: 1.4, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  xl: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  md: { fontSize: 24, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  p: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  foot: { gap: 12 },
  footSpacer: { height: 56 },
  // зачем (Макеты 15.10, решение координатора, эталон v3 d365/d1000 и m01): «Пропустить» — 13 · 700 на плашке-таблетке (padding 6/10, радиус 12);
  // одно осознанное отличие от эталона: фон плашки buttonFill вместо control — правило владельца 13.10 "кнопки не сливаются" (на control контраст 1,00)
  skip: { position: 'absolute', right: 20, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 },
  skipText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
});

export default memo(StreakMilestoneScreen);
