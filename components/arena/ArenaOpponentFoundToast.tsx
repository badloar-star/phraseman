/**
 * Тост «Соперник найден» — предложение матча поверх любого экрана.
 *
 * зачем (владелец 2026-09-20): поиск соперника продолжается, когда человек
 * ушёл в другой раздел. Находку нельзя просто втащить в матч — человек мог
 * уйти в урок или отложить телефон. Поэтому находка приходит предложением, а
 * не переходом. Макет: `docs/design/2026-09-20_arena_background_search_toast_mockup.html`.
 *
 * Отсчёт идёт по АБСОЛЮТНОМУ серверному сроку (`deadlineAtMs`), а не по
 * локальной длительности: только сервер решает, примут ли ответ, и кольцо
 * обязано истечь не позже него.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from '../SafeLinearGradient';
import { useTournamentPalette } from '../ui/v2_theme';
import { SUITE } from '../../constants/motionHybrid';
import DuoPressable from '../DuoPressable';
import { noAndroidOutline } from '../../constants/androidGlow';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

const RING_SIZE = 38;
const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Последние секунды окрашиваются тревожнее — но геометрия не меняется. */
const RING_WARN_AT_MS = 5_000;

export type ArenaOpponentFoundToastProps = Readonly<{
  title: string;
  opponentName?: string;
  opponentAvatar?: string;
  opponentStars?: number;
  acceptLabel: string;
  /**
   * Надпись на кнопке, пока идёт вход в матч.
   *
   * зачем (владелец 2026-09-20: «нажал ПРИНЯТЬ — пару секунд ничего не
   * происходит»): `busy` только ГАСИЛ кнопки, и карточка просто замирала.
   * Подготовка входа честно занимает секунду-две (принятие + план), и об этом
   * надо сказать словами, а не заставлять гадать.
   */
  busyLabel: string;
  declineLabel: string;
  /** Абсолютный серверный срок решения. */
  deadlineAtMs: number;
  nowMs: number;
  reduceMotion: boolean;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  bottomOffset?: number;
}>;

export function ArenaOpponentFoundToast({
  title,
  opponentName,
  opponentAvatar,
  opponentStars,
  acceptLabel,
  busyLabel,
  declineLabel,
  deadlineAtMs,
  nowMs,
  reduceMotion,
  busy,
  onAccept,
  onDecline,
  bottomOffset = 0,
}: ArenaOpponentFoundToastProps) {
  const P = useTournamentPalette();
  const opacity = useSharedValue(0);
  const y = useSharedValue(14);
  const [totalMs] = useState(() => Math.max(1, deadlineAtMs - nowMs));

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      return undefined;
    }
    opacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) });
    y.value = withSpring(0, SUITE.pulse);
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
  }, [opacity, reduceMotion, y]);

  const remainingMs = Math.max(0, deadlineAtMs - nowMs);
  const seconds = Math.ceil(remainingMs / 1_000);
  const warn = remainingMs <= RING_WARN_AT_MS;

  const shell = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  /**
   * Кольцо считает на UI-треде: `nowMs` тикает раз в секунду и двигает только
   * цифру, а дуга течёт непрерывно, не дёргая JS каждый кадр.
   */
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, remainingMs / totalMs))),
  }), [remainingMs, totalMs]);

  const stars = useMemo(() => {
    const count = Math.max(0, Math.min(3, Math.trunc(opponentStars ?? 0)));
    return count > 0 ? '★'.repeat(count) : '';
  }, [opponentStars]);

  return (
    /*
     * зачем pointerEvents="box-none" (регрессия 2026-09-20): контейнер тоста
     * растянут на всю ширину и лежит ПОВЕРХ экрана. Без этого атрибута он
     * ловил касания по всей своей полосе — на экранах Арены переставали
     * нажиматься кнопки, включая «На арену» и «Назад». Владелец: «ни 1
     * кнопка на этом экране не работает».
     *
     * Именно box-none, а не none: none убил бы и сами кнопки тоста. box-none
     * пропускает касания насквозь везде, КРОМЕ интерактивных детей.
     */
    <Reanimated.View
      style={[styles.host, { bottom: bottomOffset }, shell]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={[P.surfaceGradA, P.surfaceGradB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, noAndroidOutline]}
      >
        <View style={styles.head}>
          <View style={[styles.avatar, { backgroundColor: P.accentSoft }]}>
            {/* guard-ok: аватар декоративен — имя соперника стоит рядом текстом,
                озвучивать картинку повторно значит читать одно и то же дважды. */}
            {opponentAvatar ? (
              <Image source={{ uri: opponentAvatar }} style={styles.avatarImage} accessible={false} />
            ) : (
              <Text style={styles.avatarGlyph}>⚔️</Text>
            )}
          </View>
          <View style={styles.meta}>
            <Text numberOfLines={1} style={[styles.title, { color: P.text }]}>{title}</Text>
            {(opponentName || stars) ? (
              <View style={styles.subline}>
                {opponentName ? (
                  <Text numberOfLines={1} style={[styles.sub, { color: P.muted }]}>{opponentName}</Text>
                ) : null}
                {stars ? <Text style={[styles.stars, { color: P.gold }]}>{stars}</Text> : null}
              </View>
            ) : null}
          </View>
          <View style={styles.ring}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                strokeWidth={3}
                stroke={P.muted}
                opacity={0.25}
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                strokeWidth={3}
                strokeLinecap="round"
                stroke={warn ? P.gold : P.accent}
                strokeDasharray={RING_CIRCUMFERENCE}
                animatedProps={ringProps}
              />
            </Svg>
            <Text style={[styles.ringNum, { color: warn ? P.gold : P.text }]}>{seconds}</Text>
          </View>
        </View>
        {/*
          * зачем wrapStyle={styles.half} (владелец 2026-09-20: «кнопки смещены
          * вправо»): DuoPressable отдаёт `style` ВНУТРЕННЕЙ поверхности, а в
          * ряду ширину делит ВНЕШНИЙ Pressable. `flex: 1` на поверхности тянул
          * её шире собственной обёртки — кнопки съезжали и вылезали за карточку.
          * Ширину задаём обёртке, ровно как в других модалках проекта.
          */}
        <View style={styles.buttons}>
          <DuoPressable
            onPress={onDecline}
            disabled={busy}
            wrapStyle={styles.half}
            style={[styles.button, { backgroundColor: P.accentSoft }]}
          >
            <Text numberOfLines={1} style={[styles.buttonText, { color: P.muted }]}>{declineLabel}</Text>
          </DuoPressable>
          {/*
            * зачем `|| expired` (владелец 2026-09-21: «выйти из поиска, зайти
            * назад — появляется кнопка Принять, нажимаю и сразу этого матча
            * больше нет»): кнопка гасла ТОЛЬКО флагом `busy`, а срок приёма
            * её не касался. Досчитав кольцо до нуля, она оставалась живой и
            * нажималась — сервер к тому времени матч уже закрыл, и человек
            * платил 25⚡ за отказ. Кнопка, которая не может сработать, не
            * должна выглядеть рабочей.
            */}
          <DuoPressable
            onPress={onAccept}
            disabled={busy || remainingMs <= 0}
            wrapStyle={styles.half}
            style={[styles.button, {
              backgroundColor: P.accent,
              opacity: remainingMs <= 0 ? 0.45 : 1,
            }]}
          >
            <Text numberOfLines={1} style={[styles.buttonText, { color: P.accentText }]}>
              {busy ? busyLabel : acceptLabel}
            </Text>
          </DuoPressable>
        </View>
      </LinearGradient>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12 },
  card: { borderRadius: 24, padding: 14, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarGlyph: { fontSize: 20 },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.1 },
  subline: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  sub: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  stars: { fontSize: 11, fontWeight: '800' },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  ringNum: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  buttons: { flexDirection: 'row', gap: 9 },
  /** Ширину делит обёртка кнопки, а не её поверхность. */
  half: { flex: 1 },
  /*
   * minHeight переопределяет 56 из DuoPressable: тост — плашка поверх экрана,
   * а не полноэкранная модалка, и кнопка в 56px делала её тяжёлой.
   */
  button: { borderRadius: 15, minHeight: 48, paddingVertical: 13, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '800', letterSpacing: -0.1 },
});
