// ═══════════════════════════════════════════════════════════════════════════
// SpirePositionRiseMoment.tsx — момент m05 · вариант A «Позиция выросла: строка «Ты» едет вверх через линию ТОП-5» (эталон engagement-moments-v3-all.html, `rise3`).
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER m05; координатор): после ступени человек видит, как его строка в таблице комнаты (в монетах недели) переезжает на место выше
// и пересекает линию ТОП-5. Экран: «Ступень пройдена · +N монет», «Считаем место…» → «Ты в топ-5» (стоп-кадр на 2,4 с), таблица из 6 строк (те же LadderRow, что в моменте повышения), линия ТОП-5 под пятой строкой
// на 0,6 с, на 1,2 с строка «Ты» едет вверх за 1,1 с, соседи уезжают вниз; «Играть ещё» и «К башне». Все данные — props (до/после из кэша комнаты считает Ядро): компонент только показывает, ничего не пишет.
// Если место не пересекло линию ТОП-5 — заголовок «N место» вместо «Ты в топ-5» (ничего не выдумываем).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { hapticMediumImpact, hapticSuccess, hapticTap } from '../../../hooks/use-haptics';
import { playEvent } from '../../../modules/sound_v2/sound_bank';
import { useFireOnce } from '../../moments/use_fire_once';
import { V2Button } from '../../v2/V2Kit';
import { spireGameText } from '../spire_game_strings';
import { useSpirePalette } from '../useSpirePalette';
import { LadderRow, type MomentRoomRow } from './MomentPromotion';
import { MomentFullScreen } from './moments_layout';
import { momentText } from './moments_strings';
import { positionMomentText } from './position_moment_strings';
import { stepMomentText } from './step_moment_strings';

const ROW_GAP = 6;
const FALLBACK_ROW_H = 48;
const TOP5 = 5;
/** Тайминги образца, мс: линия 600, подъём 1200 (1100 мс), стоп-кадр 2400. */
export const POSITION_RISE_TIMELINE = { zone: 600, rise: 1200, riseMs: 1100, freeze: 2400 } as const;

export type SpirePositionRiseMomentProps = Readonly<{
  lang: Lang;
  /** До 6 строк комнаты в порядке ДО подъёма (по убыванию монет недели). */
  rows: readonly MomentRoomRow[];
  /** Индекс строки «Ты» до подъёма (0-based). */
  fromIndex: number;
  /** Индекс строки «Ты» после подъёма (0-based, меньше fromIndex). */
  toIndex: number;
  /** Монеты за ступень («+10 монет»). */
  coinsGained: number;
  onPlay: () => void;
  onLater: () => void;
  busy?: boolean;
  testID?: string;
}>;

/** Порядок строк после подъёма: «Ты» встаёт на toIndex, остальные сдвигаются вниз. */
export function positionRiseOrderAfter(rows: readonly MomentRoomRow[], fromIndex: number, toIndex: number): readonly MomentRoomRow[] {
  if (fromIndex < 0 || fromIndex >= rows.length || toIndex < 0 || toIndex >= fromIndex) return rows;
  const next = rows.slice();
  const [me] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, me!);
  return next;
}

function SpirePositionRiseMoment({ lang, rows, fromIndex, toIndex, coinsGained, onPlay, onLater, busy, testID = 'position-rise' }: SpirePositionRiseMomentProps) {
  // зачем (координатор 14.10, аудит Optimistic UI): тап срабатывает один раз синхронно; родитель в onNext/onPlay СНАЧАЛА закрывает окно, потом навигация/запись
  const fire = useFireOnce('POSITION-RISE');
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const [rowH, setRowH] = useState(FALLBACK_ROW_H);
  const [zone, setZone] = useState(reduceMotion);
  const [risen, setRisen] = useState(reduceMotion);
  const [frozen, setFrozen] = useState(reduceMotion);
  const lift = useSharedValue(0);
  const flash = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shown = useMemo(() => rows.slice(0, 6), [rows]);
  const after = useMemo(() => positionRiseOrderAfter(shown, fromIndex, toIndex), [shown, fromIndex, toIndex]);
  const crossesTop5 = fromIndex >= TOP5 && toIndex < TOP5;
  const step = rowH + ROW_GAP;

  useEffect(() => {
    console.log(`[POSITION-RISE] показ: ${fromIndex + 1} → ${toIndex + 1} место, пересекает топ-5=${String(crossesTop5)}, +${coinsGained} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    if (reduceMotion) return undefined;
    const T = POSITION_RISE_TIMELINE;
    const at = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
    at(T.zone, () => { setZone(true); playEvent('tap'); void hapticTap(); });
    at(T.rise, () => {
      lift.value = withTiming(1, { duration: T.riseMs, easing: Easing.bezier(0.23, 1, 0.32, 1) });
      playEvent('swipe_know'); void hapticMediumImpact();
    });
    // строки меняются местами в данных ровно в конце движения: transform сбрасывается в 0, прыжка нет
    at(T.rise + T.riseMs, () => { setRisen(true); lift.value = 0; });
    at(T.freeze, () => {
      setFrozen(true);
      flash.value = withSequence(withTiming(1, { duration: 0 }), withDelay(420, withTiming(0, { duration: 0 })));
      playEvent('correct'); void hapticSuccess();
    });
    return () => { timers.current.forEach(clearTimeout); timers.current = []; cancelAnimation(lift); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на показ
  }, []);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.16 }));
  const zoneTop = step * TOP5 - 3;
  const order = risen ? after : shown;
  // индекс строки в порядке ДО подъёма: «Ты» едет вверх на (from − to) шагов, пока строки между ними уезжают вниз на 1
  const originalIndexOf = useCallback((row: MomentRoomRow): number => shown.findIndex((r) => r.uid === row.uid), [shown]);
  const heading = frozen
    ? (crossesTop5 ? positionMomentText(lang, 'inTop5') : momentText(lang, 'promoPlace', { n: toIndex + 1 }))
    : positionMomentText(lang, 'counting');

  return (
    <MomentFullScreen testID={testID}>
      <View style={s.full}>
        <View style={s.body}>
          <Text style={[s.ov, { color: p.textSecondary }]}>{`${spireGameText(lang, 'stepPassed').toUpperCase()} · +${coinsGained} ${spireGameText(lang, 'coins').toUpperCase()}`}</Text>
          <Text accessibilityRole="header" style={[s.hMd, { color: p.text }]} testID={`${testID}-heading`}>{heading}</Text>
          <View style={s.ladder}>
            {zone ? (
              <View pointerEvents="none" style={[s.zone, { top: zoneTop, backgroundColor: p.correct, boxShadow: `0 0 12px ${p.correct}` }]}>
                <Text style={[s.zoneLbl, { color: p.correct }]}>{momentText(lang, 'zoneTop5')}</Text>
              </View>
            ) : null}
            {order.map((row, i) => (
              <RiseRow key={row.uid} row={row} place={i + 1} originalIndex={originalIndexOf(row)} fromIndex={fromIndex} toIndex={toIndex} step={step} lift={lift} risen={risen} frozen={frozen && row.isMe} onLayout={i === 0 ? (e) => setRowH(Math.round(e.nativeEvent.layout.height)) : undefined} testID={`${testID}-row-${i}`} />
            ))}
          </View>
        </View>
        <View style={s.foot}>
          <V2Button label={positionMomentText(lang, 'playMore')} icon="arrow-forward" onPress={() => fire(onPlay, 'play')} disabled={busy} testID={`${testID}-play`} />
          <View style={s.gap} />
          <V2Button label={stepMomentText(lang, 'toTower')} variant="secondary" onPress={() => fire(onLater, 'later')} testID={`${testID}-later`} />
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} />{/* theme-exempt: стоп-кадр образца — светлая вуаль */}
      </View>
    </MomentFullScreen>
  );
}

type RiseRowProps = Readonly<{
  row: MomentRoomRow; place: number; originalIndex: number; fromIndex: number; toIndex: number; step: number;
  lift: ReturnType<typeof useSharedValue<number>>; risen: boolean; frozen: boolean; onLayout?: (e: LayoutChangeEvent) => void; testID: string;
}>;

/** Строка таблицы: до подъёма «Ты» едет вверх, строки между toIndex и fromIndex−1 — вниз на один шаг. */
const RiseRow = memo(function RiseRow({ row, place, originalIndex, fromIndex, toIndex, step, lift, risen, frozen, onLayout, testID }: RiseRowProps) {
  const isMe = row.isMe;
  const displaced = !isMe && originalIndex >= toIndex && originalIndex < fromIndex;
  const style = useAnimatedStyle(() => ({
    zIndex: isMe ? 2 : 0,
    transform: [{ translateY: risen ? 0 : isMe ? -step * (fromIndex - toIndex) * lift.value : displaced ? step * lift.value : 0 }],
  }));
  return (
    <Animated.View style={style} onLayout={onLayout}>
      <LadderRow row={row} index={0} place={place} flicker={false} rise={frozen} testID={testID} />
    </Animated.View>
  );
});

const s = StyleSheet.create({
  full: { flex: 1, paddingHorizontal: 24, paddingTop: 76, paddingBottom: 36 },
  body: { flex: 1, alignItems: 'center' },
  ov: { fontSize: 12, lineHeight: 16, letterSpacing: 2.6, fontWeight: '700', textAlign: 'center' },
  hMd: { marginTop: 6, fontSize: 21, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center' },
  ladder: { alignSelf: 'stretch', marginTop: 16, gap: ROW_GAP },
  zone: { position: 'absolute', left: -8, right: -8, height: 2, zIndex: 3 },
  zoneLbl: { position: 'absolute', right: 8, top: -18, fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  foot: { gap: 0 },
  gap: { height: 12 },
});

export default memo(SpirePositionRiseMoment);
