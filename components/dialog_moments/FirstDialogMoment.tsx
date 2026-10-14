// ═══════════════════════════════════════════════════════════════════════════
// FirstDialogMoment.tsx — момент m17 «Первый диалог пройден» (эталон engagement-moments-v3-all.html, `first3`).
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER m17; координатор): на экране завершения диалога (dialogue_v2_completion), один раз — за первый пройденный диалог. Монета 110 радуется
// с сердцами и облачком «Получилось!» на 0,3 с, конфетти цветов темы на 0,7 с, затем по 220 мс: «Первый диалог», «Первый разговор {по-английски} — есть!», «Реплик: 6 · заданий 5 из 5», «Следующий сценарий».
// Язык в заголовке — изучаемый (studyLanguageWord(..., 'adv')), не зашитый «английский». Без шеринга фразы человека (конфиденциальность), без разблокировок и бонусов (D124/D09). Все числа — props из итога диалога.
// Компонент ничего не пишет: «Следующий сценарий» — колбэк. Условие «первый» и показ — вызывающий. reduceMotion — сразу итоговый кадр.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { studyLanguageWord } from '../../constants/study_language_words';
import { hapticLightImpact, hapticSuccess } from '../../hooks/use-haptics';
import MomentCoin from '../moments/MomentCoin';
import { MomentFullScreen } from '../spire/moments/moments_layout';
import { useSpirePalette } from '../spire/useSpirePalette';
import StreakConfetti from '../streak/moments/StreakConfetti';
import { V2Button } from '../v2/V2Kit';
import { firstDialogText } from './first_dialog_strings';

/** Тайминги образца, мс: монета 300, конфетти 700, тексты 900 + 220 × i. */
export const FIRST_DIALOG_TIMELINE = { cheer: 300, confetti: 700, texts: 900, textStep: 220 } as const;

export type FirstDialogMomentProps = Readonly<{
  lang: Lang;
  /** Изучаемый язык (en/es/fr/de/it) — из него наречие в заголовке. */
  studyTarget: string;
  /** Ранг монеты 0…19; null — базовая. */
  coinRank: number | null;
  /** Реплик человека в диалоге. */
  turns: number;
  goalsDone: number;
  goalsTotal: number;
  onNext: () => void;
  testID?: string;
}>;

function FirstDialogMoment({ lang, studyTarget, coinRank, turns, goalsDone, goalsTotal, onNext, testID = 'first-dialog' }: FirstDialogMomentProps) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const [cheer, setCheer] = useState(reduceMotion);
  const [confetti, setConfetti] = useState(false);
  const adv = studyLanguageWord(lang, studyTarget, 'adv');

  useEffect(() => {
    console.log(`[FIRST-DIALOG] показ: язык=${studyTarget} реплик=${turns} задания=${goalsDone}/${goalsTotal} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    if (reduceMotion) return undefined;
    const T = FIRST_DIALOG_TIMELINE;
    const a = setTimeout(() => { setCheer(true); void hapticSuccess(); }, T.cheer);
    const b = setTimeout(() => setConfetti(true), T.confetti);
    const c = setTimeout(() => { void hapticLightImpact(); }, T.texts);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на показ
  }, []);

  const beat = (i: number) => (reduceMotion ? undefined : FadeIn.delay(FIRST_DIALOG_TIMELINE.texts + i * FIRST_DIALOG_TIMELINE.textStep).duration(400));

  return (
    <MomentFullScreen testID={testID}>
      <StreakConfetti fire={confetti} n={90} />
      <View style={s.full}>
        <View style={s.body}>
          <MomentCoin rank={coinRank} size={110} mood={cheer ? 'cheer' : 'idle'} say={cheer ? firstDialogText(lang, 'say') : undefined} emote={cheer ? 'heart' : null} emoteCount={4} glints testID={`${testID}-coin`} />
          <Animated.Text entering={beat(0)} style={[s.ov, { color: p.accentText }]}>{firstDialogText(lang, 'overline').toUpperCase()}</Animated.Text>
          <Animated.Text entering={beat(1)} accessibilityRole="header" style={[s.hXl, { color: p.text }]} testID={`${testID}-title`}>{firstDialogText(lang, 'title', { adv })}</Animated.Text>
          <Animated.Text entering={beat(2)} style={[s.p, { color: p.textSecondary }]} testID={`${testID}-stats`}>{firstDialogText(lang, 'stats', { turns, done: goalsDone, all: goalsTotal })}</Animated.Text>
        </View>
        <Animated.View entering={beat(3)} style={s.foot}>
          <V2Button label={firstDialogText(lang, 'next')} icon="arrow-forward" onPress={onNext} testID={`${testID}-next`} />
        </Animated.View>
      </View>
    </MomentFullScreen>
  );
}

const s = StyleSheet.create({
  // `.full`: колонка, поля 24, верх 76 / низ 36
  full: { flex: 1, paddingHorizontal: 24, paddingTop: 76, paddingBottom: 36 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ov: { marginTop: 20, fontSize: 13, lineHeight: 17, letterSpacing: 2.6, fontWeight: '700', textAlign: 'center' },
  hXl: { marginTop: 6, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  p: { marginTop: 8, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  foot: { gap: 0 },
});

export default memo(FirstDialogMoment);
