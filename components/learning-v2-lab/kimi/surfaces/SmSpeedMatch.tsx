// зачем: дословный RN-порт source/src/surfaces/mobile/SmSpeedMatch.tsx.
// Пары EN↔RU в две колонки. Таймер — заранее запечённое значение из фикстуры
// (никогда не считается), с переключателем «Без таймера» и оверлеем паузы.
// Сматченные плитки гаснут до opacity 0, НО остаются в потоке — геометрия
// стабильна (layout-stability контракт репо). Необязательная тренировка.
import React, { memo, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import TapScale from '../../../TapScale';
import { ChoiceShell } from '../ChoiceShell';
import { smSpeedMatchFixture } from '../fixtures/core';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, TOUCH_MIN, WEIGHT, withAlpha } from '../tokens';

export const SmSpeedMatch = memo(function SmSpeedMatch() {
  const lab = useLab();
  const surfaceId = 'sm-speed-match';
  const vm = smSpeedMatchFixture;
  const state = lab.canonicalState;

  const [untimed, setUntimed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pickedEn, setPickedEn] = useState<string | null>(null);
  const [pickedRu, setPickedRu] = useState<string | null>(null);
  const [matched, setMatched] = useState<readonly string[]>([]);

  const interactive = state === 'active' && !paused;

  const pick = useCallback(
    (side: 'en' | 'ru', pairId: string) => {
      if (!interactive || matched.includes(pairId)) return;
      const nextEn = side === 'en' ? pairId : pickedEn;
      const nextRu = side === 'ru' ? pairId : pickedRu;
      lab.logIntent({ surfaceId, intent: 'sm.pick_tile', payload: { side, pairId } });
      // зачем: выбор — чисто локальное состояние, отклик мгновенный, без сети
      if (side === 'en') setPickedEn(pairId);
      else setPickedRu(pairId);
      if (nextEn && nextRu) {
        if (nextEn === nextRu) {
          setMatched((prev) => [...prev, nextEn]);
          lab.logIntent({
            surfaceId,
            intent: 'sm.pair_matched',
            payload: { pairId: nextEn, matchedCount: matched.length + 1 },
          });
        }
        setPickedEn(null);
        setPickedRu(null);
      }
    },
    [interactive, matched, pickedEn, pickedRu, lab],
  );

  return (
    <ChoiceShell
      surfaceId={surfaceId}
      title="Скоростные пары"
      subtitle="Speed Match · EN · тренировка"
      copy={vm.copy}
      promptZone={
        <View style={s.head}>
          <GraphemeText text={vm.briefLabel} maxGraphemes={100} style={s.brief} />
          <View style={s.timerRow}>
            <View style={[s.timer, untimed ? s.timerOff : null]}>
              <Text style={[s.timerText, untimed ? s.timerTextOff : null]}>
                {untimed ? 'Без таймера' : vm.timerDisplay}
              </Text>
            </View>
            <IntentButton
              surfaceId={surfaceId}
              intent="sm.toggle_timer"
              payload={{ untimed: !untimed, simulated: true }}
              onIntent={lab.logIntent}
              onPress={() => setUntimed(!untimed)}
              variant="ghost"
              pressed={untimed}
              accessibilityLabel="Переключить режим без таймера"
            >
              {untimed ? 'С таймером' : 'Без таймера'}
            </IntentButton>
            <IntentButton
              surfaceId={surfaceId}
              intent="sm.pause"
              payload={{ simulated: true }}
              onIntent={lab.logIntent}
              onPress={() => setPaused(true)}
              variant="ghost"
              disabled={state !== 'active'}
              accessibilityLabel="Пауза"
            >
              ⏸ Пауза
            </IntentButton>
          </View>
        </View>
      }
      missHint="Спокойно: смотри на пары сверху вниз, не гонись."
      recoveryNote={vm.copy.statusMessages.recovery}
      primaryPayload={{ matchedCount: matched.length, untimed }}
    >
      <View style={s.wrap}>
        <View style={s.columns}>
          <View style={s.column} accessibilityRole="none" accessibilityLabel="Английские фразы">
            {vm.pairs.map((pair) => (
              <Tile
                key={`en-${pair.id}`}
                text={pair.en}
                maxGraphemes={32}
                matched={matched.includes(pair.id)}
                picked={pickedEn === pair.id}
                disabled={!interactive}
                onPress={() => pick('en', pair.id)}
                accessibilityLabel={`EN: ${pair.en}`}
              />
            ))}
          </View>
          <View style={s.column} accessibilityRole="none" accessibilityLabel="Русские значения">
            {vm.pairs.map((pair) => (
              <Tile
                key={`ru-${pair.id}`}
                text={pair.ru}
                maxGraphemes={40}
                matched={matched.includes(pair.id)}
                picked={pickedRu === pair.id}
                disabled={!interactive}
                onPress={() => pick('ru', pair.id)}
                accessibilityLabel={`RU: ${pair.ru}`}
              />
            ))}
          </View>
        </View>

        {state === 'success' ? (
          <View style={s.results}>
            <Result label="Скорость" value={vm.results.speedDisplay} />
            <Result label="Точность" value={vm.results.accuracyDisplay} />
            <Result label="Личный рекорд" value={vm.results.personalBestDisplay} />
          </View>
        ) : null}

        {paused ? (
          <View style={s.pause} accessibilityViewIsModal accessibilityLabel="Пауза">
            <Text style={s.pauseTitle}>Пауза</Text>
            <IntentButton
              surfaceId={surfaceId}
              intent="sm.pause_resume"
              payload={{ simulated: true }}
              onIntent={lab.logIntent}
              onPress={() => setPaused(false)}
              variant="secondary"
              accessibilityLabel="Продолжить"
            >
              Продолжить
            </IntentButton>
            <IntentButton
              surfaceId={surfaceId}
              intent="sm.restart"
              payload={{ simulated: true }}
              onIntent={lab.logIntent}
              onPress={() => {
                setMatched([]);
                setPickedEn(null);
                setPickedRu(null);
                setPaused(false);
              }}
              variant="ghost"
              accessibilityLabel="Начать заново"
            >
              Начать заново
            </IntentButton>
            <IntentButton
              surfaceId={surfaceId}
              intent="sm.toggle_timer"
              payload={{ untimed: true, simulated: true }}
              onIntent={lab.logIntent}
              onPress={() => {
                setUntimed(true);
                setPaused(false);
              }}
              variant="ghost"
              accessibilityLabel="Играть без таймера"
            >
              Играть без таймера
            </IntentButton>
          </View>
        ) : null}
      </View>
    </ChoiceShell>
  );
});

/** Плитка пары. Сматченная гаснет, но НЕ исчезает из потока — колонки не прыгают. */
const Tile = memo(function Tile(props: {
  readonly text: string;
  readonly maxGraphemes: number;
  readonly matched: boolean;
  readonly picked: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
}) {
  const { text, maxGraphemes, matched, picked, disabled, onPress, accessibilityLabel } = props;
  return (
    <TapScale
      onPress={onPress}
      disabled={disabled || matched}
      // зачем: плитка — не управляющая кнопка, владелец просит здесь вибрацию
      withHaptic
      scaleTo={0.97}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || matched, selected: picked }}
      style={[s.tile, picked ? s.tilePicked : null, matched ? s.tileMatched : null]}
    >
      <GraphemeText text={text} maxGraphemes={maxGraphemes} style={s.tileText} />
    </TapScale>
  );
});

const Result = memo(function Result({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={s.result}>
      <Text style={s.resultLabel}>{label}</Text>
      <Text style={s.resultValue}>{value}</Text>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s3, position: 'relative' },
  head: { gap: SPACE.s2 },
  brief: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  timerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s2 },
  timer: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSurface,
    minHeight: TOUCH_MIN - 12,
    justifyContent: 'center',
  },
  timerOff: { backgroundColor: C.bgSubtle },
  timerText: { fontSize: TEXT.xl, fontWeight: WEIGHT.bold, color: C.fgPrimary, letterSpacing: 1 },
  timerTextOff: { fontSize: TEXT.md, color: C.fgSecondary, letterSpacing: 0 },
  columns: { flexDirection: 'row', gap: SPACE.s3 },
  column: { flex: 1, gap: SPACE.s2 },
  tile: {
    minHeight: TOUCH_MIN,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: C.bgSurface,
    justifyContent: 'center',
  },
  tilePicked: { backgroundColor: C.accentSoft },
  // зачем: Kimi гасит сматченную плитку до нуля, но место сохраняет — иначе
  // соседние плитки поедут вверх и колонка «прыгнет» посреди тренировки.
  tileMatched: { opacity: 0 },
  tileText: { fontSize: TEXT.sm, color: C.fgPrimary, lineHeight: TEXT.sm * LEADING.snug },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s3 },
  result: {
    flex: 1,
    minWidth: 96,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: '#182B31',
    gap: SPACE.s1,
    alignItems: 'center',
  },
  resultLabel: { fontSize: TEXT.xs, color: C.fgSecondary },
  resultValue: { fontSize: TEXT.xl, fontWeight: WEIGHT.bold, color: C.correct, letterSpacing: 1 },
  pause: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    borderRadius: RADIUS.md,
    backgroundColor: withAlpha('#070912', 0.94),
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s3,
  },
  pauseTitle: { fontSize: TEXT.xl, fontWeight: WEIGHT.bold, color: C.fgPrimary },
});
