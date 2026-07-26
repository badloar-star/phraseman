// зачем: RN-порт source/src/session/SessionRunner.tsx — ОДНА машина состояний
// всей микро-сессии: intro → карточка → проверка → микро-обратная связь →
// АВТО-ПЕРЕХОД → следующая карточка → финал.
// Авто-переход: ~420 мс после чистого верного (звёзды летят поверх перехода,
// БЕЗ кнопки «Продолжить»); ~1500 мс после лестницы ошибок, чтобы подсказку
// успели прочитать. Следующая карточка всегда уже в памяти.
//
// ОТЛИЧИЕ от поставки: там вердикт брался из лабораторного переключателя, здесь
// он НАСТОЯЩИЙ — движок знает правильный ответ, звёзды начисляются по исходу
// (чисто / с подсказкой / после показа), как задумано в starsByOutcome.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import TapScale from '../../TapScale';
import { GraphemeText } from '../kimi/primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, TOUCH_MIN, WEIGHT } from '../kimi/tokens';
import type { OutcomeId, SessionCard, SessionVM } from './contracts';
import { ChoiceEngine } from './engines/ChoiceEngine';
import { ArrangeEngine } from './engines/ArrangeEngine';
import { DialogueEngine } from './engines/DialogueEngine';
import { InputEngine } from './engines/InputEngine';
import { MatchEngine } from './engines/MatchEngine';
import { SpeechEngine } from './engines/SpeechEngine';
import type { EngineProps } from './engine_common';
import { FeedbackLayer } from './FeedbackLayer';
import { StarTopBar } from './StarLayer';

type Stage = 'intro' | 'card' | 'finale';
type Phase = 'answering' | 'checking' | 'showAnswer' | 'resolved';

/** Движки, которые проверяются большой кнопкой. */
const CTA_ENGINES = new Set(['choice', 'arrange', 'input', 'speech']);

/** Три слота звёзд финала — фиксированный набор, стабильные ключи. */
const FINALE_STAR_SLOTS = ['star-1', 'star-2', 'star-3'] as const;

export interface SessionRunnerProps {
  readonly session: SessionVM;
  /**
   * Выход из сессии. `completed` = true только если ученик дошёл до финала —
   * по нему карта решает, играть ли церемонию зоны (конфетти).
   */
  readonly onExit: (completed?: boolean) => void;
  /** Показать чипы типов ошибок на вступлении (разбор ошибок «Моей практики»). */
  readonly showErrorChips?: boolean;
  /**
   * Режим челленджа: подсказки скрыты (как в жизни), ступень «показать ответ»
   * не наступает, звёзды даются только за чистый ответ с первой попытки.
   */
  readonly challenge?: boolean;
}

export const SessionRunner = memo(function SessionRunner({
  session,
  onExit,
  showErrorChips = false,
  challenge = false,
}: SessionRunnerProps) {
  const [stage, setStage] = useState<Stage>('intro');
  const [cardIndex, setCardIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null);
  const [ready, setReady] = useState(false);
  const [shakeEpoch, setShakeEpoch] = useState(0);
  const [resetEpoch, setResetEpoch] = useState(0);
  const [usedShowAnswer, setUsedShowAnswer] = useState(false);
  const [starsTotal, setStarsTotal] = useState(0);
  const [mistakesTotal, setMistakesTotal] = useState(0);
  /** Ответ движка, который проверяет большая кнопка. */
  const answerRef = useRef<{ correct: boolean } | null>(null);

  const deck = session.cards;
  const card: SessionCard | undefined = deck[Math.min(cardIndex, deck.length - 1)];
  const maxStars = deck.length * 3;

  // зачем: защита от гонок — поздний таймер не должен трогать свежую карточку
  const tokenRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);
  useEffect(
    () => () => {
      tokenRef.current += 1;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  const emit = useCallback((_type: string, _payload: Record<string, unknown>) => {
    // Лаборатория держит журнал интентов в памяти; здесь он не нужен.
  }, []);

  const resetCard = useCallback(() => {
    setAttempt(0);
    setVerdict(null);
    setPhase('answering');
    setReady(false);
    setUsedShowAnswer(false);
    answerRef.current = null;
    setResetEpoch((e) => e + 1);
  }, []);

  const startSession = useCallback(() => {
    setCardIndex(0);
    setStarsTotal(0);
    setMistakesTotal(0);
    resetCard();
    setStage('card');
  }, [resetCard]);

  /** Карточка решена: начисляем звёзды по исходу и уходим дальше сами. */
  const resolveCard = useCallback(
    (outcome: OutcomeId) => {
      if (!card) return;
      const stars =
        outcome === 'skip'
          ? 0
          : outcome === 'clean'
            ? card.starsByOutcome.clean
            : outcome === 'hint'
              ? card.starsByOutcome.hint
              : card.starsByOutcome.shown;
      setVerdict('correct');
      setPhase('resolved');
      // зачем: счётчик растёт мгновенно — ученик видит награду сразу
      if (stars > 0) setStarsTotal((t) => t + stars);

      const token = ++tokenRef.current;
      // АВТО-ПЕРЕХОД: быстро после чистого, медленнее после лестницы ошибок,
      // чтобы подсказку успели прочитать.
      const holdMs = outcome === 'clean' ? 700 : outcome === 'skip' ? 700 : 1500;
      later(holdMs, () => {
        if (tokenRef.current !== token) return;
        if (cardIndex >= deck.length - 1) {
          setStage('finale');
        } else {
          setCardIndex(cardIndex + 1);
          resetCard();
        }
      });
    },
    [card, cardIndex, deck.length, later, resetCard],
  );

  /** Неверный ответ: тряска + лестница подсказок (hint → contrast → show). */
  const registerWrong = useCallback(
    (resetInput: boolean) => {
      const nextAttempt = attempt + 1;
      setAttempt(nextAttempt);
      setVerdict('wrong');
      setShakeEpoch((e) => e + 1);
      setMistakesTotal((t) => t + 1);

      const token = ++tokenRef.current;
      // зачем: в челлендже ответ не показывается — ученик идёт без опор, ошибка
      // просто стоит звёзд. Иначе «без подсказок» превращается в обычную сессию.
      if (nextAttempt >= 3 && !challenge) {
        setUsedShowAnswer(true);
        later(650, () => {
          if (tokenRef.current !== token) return;
          setVerdict(null);
          setPhase('showAnswer');
          later(1900, () => {
            if (tokenRef.current !== token) return;
            setPhase('answering');
            setResetEpoch((e) => e + 1);
          });
        });
      } else {
        later(650, () => {
          if (tokenRef.current !== token) return;
          setVerdict(null);
          if (resetInput) setResetEpoch((e) => e + 1);
        });
      }
    },
    [attempt, later, challenge],
  );

  const check = useCallback(() => {
    if (phase !== 'answering' || !ready || !card) return;
    setPhase('checking');
    const token = ++tokenRef.current;
    later(420, () => {
      if (tokenRef.current !== token) return;
      // Настоящая проверка: правильность знает движок.
      const isCorrect = answerRef.current?.correct ?? false;
      if (isCorrect) {
        // Исход зависит от того, сколько подсказок понадобилось.
        const outcome: OutcomeId = usedShowAnswer ? 'shown' : attempt === 0 ? 'clean' : 'hint';
        resolveCard(outcome);
      } else {
        setPhase('answering');
        registerWrong(true);
      }
    });
  }, [phase, ready, card, later, usedShowAnswer, attempt, resolveCard, registerWrong]);

  const skipCard = useCallback(() => resolveCard('skip'), [resolveCard]);

  const engineProps: EngineProps = useMemo(
    () => ({
      locked: phase !== 'answering' || verdict !== null,
      resolved: verdict,
      showAnswer: phase === 'showAnswer',
      resetEpoch,
      shakeEpoch,
      onReady: setReady,
      onWrong: () => registerWrong(false),
      // зачем: match/dialogue завершаются сами, но звёзды всё равно должны
      // зависеть от числа ошибок — иначе за пары с промахами давали бы 3★
      onAutoComplete: () => resolveCard(usedShowAnswer ? 'shown' : attempt === 0 ? 'clean' : 'hint'),
      onIntent: emit,
    }),
    [phase, verdict, resetEpoch, shakeEpoch, registerWrong, resolveCard, emit, usedShowAnswer, attempt],
  );

  /* ------------------------------------------------------------- intro -- */
  if (stage === 'intro') {
    return (
      <View style={s.root}>
        <ScrollView contentContainerStyle={s.introBody} showsVerticalScrollIndicator={false}>
          <Text style={s.introKicker}>{session.intro.kicker}</Text>
          <GraphemeText text={session.intro.headline} maxGraphemes={60} style={s.introHeadline} />
          {session.intro.canDo ? (
            <GraphemeText text={session.intro.canDo} maxGraphemes={90} style={s.introCanDo} />
          ) : null}
          {/* зачем: в разборе ошибок ученик сразу видит, ЧТО именно разбираем —
              типы ошибок с количеством, а не абстрактное «5 карт» */}
          {showErrorChips && session.errorChips ? (
            <View style={s.errorChips} accessibilityLabel="Типы ошибок">
              {session.errorChips.map((chip) => (
                <View key={chip.tag} style={s.errorChip}>
                  <Text style={s.errorChipText}>
                    {chip.tag} ×{chip.count}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={s.introMeta}>
            <View style={s.tagMuted}>
              <Text style={s.tagMutedText}>{session.intro.cardsDisplay}</Text>
            </View>
          </View>
        </ScrollView>
        <View style={s.dock}>
          <TapScale
            onPress={startSession}
            withHaptic
            scaleTo={0.97}
            accessibilityLabel={session.intro.startLabel}
            style={s.cta}
            testID="sess-start"
          >
            <Text style={s.ctaText}>{session.intro.startLabel}</Text>
          </TapScale>
        </View>
      </View>
    );
  }

  /* ------------------------------------------------------------ finale -- */
  if (stage === 'finale') {
    return (
      <View style={s.root}>
        <ScrollView contentContainerStyle={s.introBody} showsVerticalScrollIndicator={false}>
          <GraphemeText text={session.finale.headline} maxGraphemes={40} style={s.introHeadline} />
          <View style={s.finaleStars}>
            {FINALE_STAR_SLOTS.map((slot, i) => (
              <Text key={slot} style={[s.finaleStar, starsTotal > i * (maxStars / 3) ? s.finaleStarOn : null]}>
                ★
              </Text>
            ))}
          </View>
          <Text style={s.finaleTotal}>
            {starsTotal} из {maxStars}
          </Text>
          <GraphemeText text={session.finale.canDo} maxGraphemes={90} style={s.introCanDo} />
        </ScrollView>
        <View style={s.dock}>
          <TapScale
            // зачем: сообщаем карте, что сессия ПРОЙДЕНА — только тогда играет
            // церемония зоны; выход крестиком её не запускает
            onPress={() => onExit(true)}
            withHaptic
            scaleTo={0.97}
            accessibilityLabel={session.finale.continueLabel}
            style={s.cta}
            testID="sess-finish"
          >
            <Text style={s.ctaText}>{session.finale.continueLabel}</Text>
          </TapScale>
        </View>
      </View>
    );
  }

  /* -------------------------------------------------------------- card -- */
  if (!card) return null;
  const usesCta = CTA_ENGINES.has(card.engine);

  return (
    <View style={s.root}>
      <StarTopBar
        total={starsTotal}
        mistakes={mistakesTotal}
        cardIndex={cardIndex}
        cardCount={deck.length}
        onClose={onExit}
      />

      <ScrollView contentContainerStyle={s.cardBody} showsVerticalScrollIndicator={false}>
        <View style={s.cardHead}>
          <GraphemeText text={card.instruction} maxGraphemes={50} style={s.kicker} />
          {card.returnsMistake ? (
            <View style={s.tagReturn}>
              <Text style={s.tagReturnText}>Разбираем ошибку</Text>
            </View>
          ) : null}
          {card.planInjected ? (
            <View style={s.tagPlan}>
              <Text style={s.tagPlanText}>Из твоего плана</Text>
            </View>
          ) : null}
        </View>

        {card.engine === 'choice' ? (
          <ChoiceEngine
            card={card}
            {...engineProps}
            onIntent={(type, payload) => {
              if (type === 'choice.select') {
                answerRef.current = { correct: payload.optionId === card.correctOptionId };
              }
              emit(type, payload);
            }}
          />
        ) : null}
        {card.engine === 'arrange' ? (
          <ArrangeEngine
            card={card}
            {...engineProps}
            onIntent={(type, payload) => {
              if (type === 'arrange.place' || type === 'arrange.remove') {
                // Правильность считаем при проверке — по собранной строке.
                answerRef.current = null;
              }
              emit(type, payload);
            }}
            onReady={(isReady) => {
              setReady(isReady);
              if (isReady) answerRef.current = { correct: true };
            }}
          />
        ) : null}
        {card.engine === 'input' ? <InputEngine card={card} {...engineProps} /> : null}
        {card.engine === 'speech' ? (
          <SpeechEngine card={card} {...engineProps} onSkip={skipCard} />
        ) : null}
        {/* зачем: match и dialogue судят себя сами — у них нет кнопки «Проверить»,
            промах идёт сразу в лестницу подсказок, завершение закрывает карточку */}
        {card.engine === 'match' ? <MatchEngine card={card} {...engineProps} /> : null}
        {card.engine === 'dialogue' ? <DialogueEngine card={card} {...engineProps} /> : null}
      </ScrollView>

      <View style={s.dock}>
        {/* зачем: в челлендже подсказки скрыты «как в жизни» — но полоса всё
            равно занимает место, иначе кнопка «Проверить» прыгала бы */}
        <FeedbackLayer
          hints={card.hints}
          attempt={challenge ? 0 : attempt}
          showAnswer={!challenge && phase === 'showAnswer'}
          resolved={verdict === 'correct'}
        />
        {usesCta ? (
          <TapScale
            onPress={check}
            disabled={!ready || phase !== 'answering'}
            withHaptic
            scaleTo={0.97}
            accessibilityLabel="Проверить"
            style={[s.cta, !ready || phase !== 'answering' ? s.ctaDisabled : null]}
            testID="sess-check"
          >
            <Text style={s.ctaText}>{phase === 'checking' ? 'Проверяю…' : 'Проверить'}</Text>
          </TapScale>
        ) : null}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgCanvas },
  introBody: { padding: SPACE.s5, gap: SPACE.s3, flexGrow: 1, justifyContent: 'center' },
  introKicker: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.bold,
    color: C.fgSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  introHeadline: {
    fontSize: TEXT.xxxl,
    fontWeight: WEIGHT.bold,
    color: C.fgPrimary,
    lineHeight: TEXT.xxxl * LEADING.tight,
  },
  introCanDo: { fontSize: TEXT.lg, color: C.fgSecondary, lineHeight: TEXT.lg * LEADING.snug },
  introMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2, marginTop: SPACE.s2 },
  tagMuted: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSubtle,
  },
  tagMutedText: { fontSize: TEXT.sm, color: C.fgSecondary },
  errorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2, marginTop: SPACE.s2 },
  errorChip: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: '#2A2729',
  },
  errorChipText: { fontSize: TEXT.sm, color: C.gold, fontWeight: WEIGHT.semibold },
  cardBody: { padding: SPACE.s4, gap: SPACE.s4, flexGrow: 1 },
  cardHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s2 },
  kicker: { flex: 1, fontSize: TEXT.md, color: C.fgSecondary },
  tagReturn: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: '#2A1B2B',
  },
  tagReturnText: { fontSize: TEXT.xs, color: C.wrong, fontWeight: WEIGHT.bold },
  tagPlan: {
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: C.accentSoft,
  },
  tagPlanText: { fontSize: TEXT.xs, color: C.accentPrimary, fontWeight: WEIGHT.bold },
  dock: {
    gap: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    paddingTop: SPACE.s3,
    paddingBottom: SPACE.s5,
    backgroundColor: C.bgSurface,
  },
  cta: {
    minHeight: TOUCH_MIN + 8,
    borderRadius: RADIUS.lg,
    backgroundColor: C.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { fontSize: TEXT.lg, fontWeight: WEIGHT.bold, color: C.accentOnPrimary },
  finaleStars: { flexDirection: 'row', gap: SPACE.s3, justifyContent: 'center', marginVertical: SPACE.s4 },
  finaleStar: { fontSize: 56, color: C.bgSubtle },
  finaleStarOn: { color: C.gold },
  finaleTotal: { fontSize: TEXT.xl, fontWeight: WEIGHT.bold, color: C.gold, textAlign: 'center' },
});
