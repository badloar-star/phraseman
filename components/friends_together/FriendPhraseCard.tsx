/**
 * «Фраза дня вдвоём» (идея 8, docs/design/v2-app/friends-full.html #phrase) — первая карточка вкладки «Друзья»
 * на месте «Опроса дня» (макет: «та же карточка, только вопрос — фраза дня»).
 *
 * зачем (закон владельца «телефон решает и выдаёт сразу, сервер только хранит записи»; координатор 22.10): ответ отмечается
 * сразу, верность решает телефон, запись едет склеенным патчем синхронизации (friend_phrase_store) — сети в тапе нет.
 * Ответы друзей закрыты, пока не ответишь сам; после ответа у варианта — монеты друзей (тап → шторка друга с «Дать пять»).
 * Квест общий с Главной: ответ здесь ставит ту же метку, ответ на Главной закрывает вопрос здесь. Нет фразы или вариантов
 * для этого языка — на месте карточки остаётся «Опрос дня» (fallback). Стиль — DailyPollCard: поля 18, r22, без обводки.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  buildDailyPhraseQuestOptions,
  hasDailyPhraseQuestAnswered,
  markDailyPhraseQuestAnswered,
  type DailyPhraseQuestOption,
} from '../../app/daily_phrase_quest';
import {
  dailyPhraseCopyForLang,
  getDailyPhraseQuestPoolForTarget,
  getTodayPhraseForTarget,
  getTodayPhraseSyncForTarget,
  subscribeDailyPhrasePeekHydrated,
  type DailyPhrase,
  type DailyPhraseInterfaceLang,
} from '../../app/daily_phrase_system';
import type { FriendPhraseAnswer } from '../../app/friends_together/friend_phrase';
import { buildFriendPhraseCard, friendPhraseWhy, type FriendPhraseFriend, type FriendPhraseOptionView } from '../../app/friends_together/friend_phrase_card';
import { phraseAnsweredLine, phraseCopy, phraseQuestion } from '../../app/friends_together/friend_phrase_copy';
import { readMyPhraseAnswer, recordMyPhraseAnswer } from '../../app/friends_together/friend_phrase_store';
import type { FriendTogetherPairState } from '../../app/friends_together/together_store';
import { getLocalDayKey } from '../../app/local_date';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { noteSwallowedHandler } from '../../app/swallow_log';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { FriendsCoin, FriendsFeedbackRow, FriendsSectionTitle, useFriendsGlass, type FriendsGlass } from '../friends/FriendsGlassKit';
import { useLang } from '../LangContext';
import PressableHybrid from '../PressableHybrid';
import { useStudyTarget } from '../StudyTargetContext';
import { FlowText } from '../text-integrity';
import { nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';

const LOG = '[FRIEND-PHRASE]';
/** Монет у варианта — не больше трёх, остальные — «+N» (вариант остаётся читаемым на узком экране). */
const COINS_PER_OPTION = 3;
const QUEST_OPTIONS = 3;
/** Место трёх вариантов, пока они считаются (та же высота — без прыжка списка). */
const SKELETON_ROWS = ['skeleton-a', 'skeleton-b', 'skeleton-c'] as const;

type Props = Readonly<{
  /** Вкладка видна — фраза, свой ответ и метка Главной перечитываются при каждом заходе (полночь сменит вопрос). */
  active: boolean;
  friends: readonly FriendPhraseFriend[];
  pairs: Readonly<Record<string, FriendTogetherPairState | undefined>> | null;
  onOpenFriend: (uid: string) => void;
  /** Фразы или вариантов для этого языка нет — здесь остаётся «Опрос дня». */
  fallback: React.ReactNode;
}>;

/** Ключи как у квеста Главной (DailyPhraseCard.handleQuestOptionPress) — одна метка «уже ответил» на оба места. */
function questKeys(phrase: DailyPhrase): Readonly<{ phraseId: string; date: string }> {
  return { phraseId: phrase.id || phrase.date, date: phrase.date || phrase.scheduledDate || new Date().toISOString().split('T')[0]! };
}

export default function FriendPhraseCard({ active, friends, pairs, onOpenFriend, fallback }: Props) {
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { glass, textScale } = useFriendsGlass();
  const reduceMotion = useReduceMotion();
  // зачем: как DailyPhraseCard — у фразы дня нет английского контента, английский интерфейс берёт русский; при цели не «en»
  // английскому интерфейсу русские варианты не показываем (решение владельца 12.10) — остаётся «Опрос дня»
  const phraseLang: DailyPhraseInterfaceLang = lang === 'en' ? 'ru' : lang;
  const noSource = lang === 'en' && studyTarget !== 'en';
  const [phrase, setPhrase] = useState<DailyPhrase | null>(() => (noSource ? null : getTodayPhraseSyncForTarget(studyTarget, lang)));
  const [options, setOptions] = useState<Readonly<{ phraseId: string; list: readonly DailyPhraseQuestOption[] }> | null>(null);
  const [mine, setMine] = useState<FriendPhraseAnswer | null>(null);
  const [answeredElsewhere, setAnsweredElsewhere] = useState(false);
  const [failed, setFailed] = useState(false);
  const busyRef = useRef(false);
  // зачем (Optimistic UI): поздно дочитанная запись не затирает ответ, данный в этом сеансе
  const localSeqRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!active) return;
    if (noSource) {
      console.log(`${LOG} карточки нет: английский интерфейс без источника для цели ${studyTarget} → «Опрос дня»`); // guard-ok: ранний выход называет причину
      setPhrase(null);
      return;
    }
    let cancelled = false;
    const pickToday = (prev: DailyPhrase | null): DailyPhrase | null => {
      const next = getTodayPhraseSyncForTarget(studyTarget, lang);
      return next && next.id !== prev?.id ? next : prev;
    };
    setPhrase(pickToday);
    const unsubscribe = subscribeDailyPhrasePeekHydrated(() => { if (!cancelled) setPhrase(pickToday); });
    void getTodayPhraseForTarget(studyTarget, lang)
      .then((next) => { if (!cancelled && next) setPhrase((prev) => (prev?.id === next.id ? prev : next)); })
      .catch(noteSwallowedHandler('FriendPhraseCard:getTodayPhraseForTarget'));
    return () => { cancelled = true; unsubscribe(); };
  }, [active, lang, noSource, studyTarget]);

  // зачем (ре-рендеры): стабильные ключи — обработчик тапа и мемо-строки вариантов не пересоздаются на каждый рендер вкладки
  const keys = useMemo(() => (phrase ? questKeys(phrase) : null), [phrase]);
  const phraseId = keys?.phraseId ?? '';

  useEffect(() => {
    if (!active || !phrase) return;
    let cancelled = false;
    const id = questKeys(phrase).phraseId;
    // зачем (первый кадр вкладки): ложные варианты «en» берутся из каталога идиом (~610 КБ) — поднимаем его после анимации
    // перехода, а до того держим место трёх вариантов той же высоты (список под карточкой не прыгает)
    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      const list = buildDailyPhraseQuestOptions(phrase, getDailyPhraseQuestPoolForTarget(studyTarget, phraseLang), phraseLang, studyTarget);
      console.log(`${LOG} варианты phrase=${id} n=${list.length} target=${studyTarget} lang=${phraseLang}`); // guard-ok: одна строка на фразу
      setOptions({ phraseId: id, list });
    });
    return () => { cancelled = true; task.cancel(); };
  }, [active, phrase, phraseLang, studyTarget]);

  useEffect(() => {
    if (!active || !phrase) return;
    let cancelled = false;
    const seq = localSeqRef.current;
    const quest = questKeys(phrase);
    void Promise.all([
      readMyPhraseAnswer(),
      hasDailyPhraseQuestAnswered({ ...quest, studyTarget }).catch((error: unknown) => {
        console.warn(`${LOG} метка Главной не прочиталась: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
        return false;
      }),
    ]).then(([stored, elsewhere]) => {
      if (cancelled || !mountedRef.current) return;
      if (localSeqRef.current !== seq) {
        console.log(`${LOG} чтение опоздало — ответ этого сеанса не трогаем`); // guard-ok: гонка названа
        return;
      }
      console.log(`${LOG} прочитано: свой=${stored ? `${stored.day}/${stored.phraseId}/${stored.optionId}` : 'нет'} главная=${elsewhere} phrase=${quest.phraseId}`); // guard-ok: вход карточки
      setMine(stored);
      setAnsweredElsewhere(elsewhere);
    });
    return () => { cancelled = true; };
  }, [active, phrase, studyTarget]);

  const todayKey = getLocalDayKey();
  const list = options && options.phraseId === phraseId ? options.list : null;
  const view = useMemo(
    () => (list && list.length === QUEST_OPTIONS
      ? buildFriendPhraseCard({ phraseId, todayKey, options: list, mine, answeredElsewhere, friends, pairs: pairs ?? {} })
      : null),
    [answeredElsewhere, friends, list, mine, pairs, phraseId, todayKey],
  );

  const viewKey = !phrase ? 'fallback:no_phrase' : !list ? 'skeleton' : !view ? `fallback:options_${list.length}` : `${view.state}:${view.answered.length}:${view.wrongFriends}`;
  useEffect(() => {
    if (!active) return;
    console.log(`${LOG} карточка: ${viewKey} phrase=${phraseId || '-'} day=${todayKey}`); // guard-ok: что увидел пользователь
  }, [active, phraseId, todayKey, viewKey]);

  const handleAnswer = useCallback((optionId: string) => {
    if (!phrase || !keys || !view) {
      console.log(`${LOG} тап → ранний выход: нет фразы или вариантов (option=${optionId})`); // guard-ok: ранний выход называет причину
      return;
    }
    if (busyRef.current || view.state === 'done') {
      console.log(`${LOG} тап → ранний выход: ${busyRef.current ? 'ответ ещё пишется' : 'уже ответил'} (option=${optionId})`); // guard-ok: двойной тап
      return;
    }
    const option = view.options.find((item) => item.id === optionId);
    if (!option) {
      console.warn(`${LOG} тап → ранний выход: варианта ${optionId} нет в карточке`); // guard-ok: ранний выход называет причину
      return;
    }
    busyRef.current = true;
    localSeqRef.current += 1;
    const before = mine;
    if (!reduceMotion) animateNextLayoutTransition();
    setFailed(false);
    // Optimistic UI: ответ и ответы друзей видны сразу — запись на телефоне догоняет
    setMine({ v: 1, day: todayKey, phraseId: keys.phraseId, optionId, correct: option.correct });
    console.log(`${LOG} ответ: option=${optionId} correct=${option.correct} phrase=${keys.phraseId} друзей ответило=${view.answered.length}`); // guard-ok: одна строка на ответ
    void recordMyPhraseAnswer({ phraseId: keys.phraseId, optionId, correct: option.correct })
      .then((saved) => {
        if (!mountedRef.current) return;
        if (saved) {
          void markDailyPhraseQuestAnswered({ ...keys, studyTarget }).catch(noteSwallowedHandler('FriendPhraseCard:markDailyPhraseQuestAnswered'));
          return;
        }
        console.warn(`${LOG} откат: ответ не сохранился (причина — строкой выше)`); // guard-ok: откат назван
        setMine(before);
        setFailed(true);
      })
      .catch((error: unknown) => {
        console.warn(`${LOG} откат: запись упала: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
        if (!mountedRef.current) return;
        setMine(before);
        setFailed(true);
      })
      .finally(() => { busyRef.current = false; });
  }, [keys, mine, phrase, reduceMotion, studyTarget, todayKey, view]);

  if (!phrase || (list && !view)) return <>{fallback}</>;

  const why = view && list ? friendPhraseWhy(view, list, dailyPhraseCopyForLang(phrase, phraseLang).literal) : null;
  const whyText = why ? (why.kind === 'literal' ? `${phraseCopy(lang, 'literal')}: ${why.text}` : why.text) : null;
  const metaLine = view?.state === 'done'
    ? (view.answered.length === 0 ? phraseCopy(lang, 'firstFriend') : view.wrongFriends > 0 ? phraseCopy(lang, 'tryHighFive') : null)
    : view ? phraseAnsweredLine(lang, view.answered.map((friend) => friend.name)) : null;

  return (
    <View
      testID="friend-phrase-card"
      style={{ marginTop: 12, marginBottom: 12, padding: 18, borderRadius: 22, backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass) }}
    >
      <Text
        testID="friend-phrase-kicker"
        style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase' }} // guard-ok: надзаголовок НАД вопросом (как «Опрос дня»), не подпись под названием
      >
        {phraseCopy(lang, 'kicker')}
      </Text>
      <View style={{ marginTop: 8 }}>
        <FriendsSectionTitle glass={glass} textScale={textScale}>{phraseQuestion(lang, phrase.english)}</FriendsSectionTitle>
      </View>
      {view?.state === 'ask' && metaLine ? (
        <View testID="friend-phrase-locked" style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CoinPair friends={view.answered} glass={glass} />
          <Text style={{ flexShrink: 1, color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale }}>{metaLine}</Text>{/* guard-ok: строка состояния макета (s13 «уже ответили · откроется после твоего»), не расшифровка названия */}
        </View>
      ) : null}
      <View style={{ marginTop: 14, gap: 10 }} accessibilityRole="radiogroup">
        {view
          ? view.options.map((option, index) => (
            <FriendPhraseOptionRow
              key={option.id}
              index={index}
              option={option}
              done={view.state === 'done'}
              glass={glass}
              textScale={textScale}
              lang={lang}
              onAnswer={handleAnswer}
              onOpenFriend={onOpenFriend}
            />
          ))
          : SKELETON_ROWS.map((rowKey) => (
            <View
              key={rowKey}
              testID="friend-phrase-option-skeleton"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ minHeight: 58, borderRadius: 14, backgroundColor: glass.opaqueControl, opacity: 0.56 }}
            />
          ))}
      </View>
      {whyText ? (
        <FlowText
          testID="friend-phrase-why"
          provenance="authored"
          style={{ marginTop: 12, color: glass.text, fontSize: 13 * textScale, lineHeight: 18 * textScale }}
        >
          {whyText}
        </FlowText>
      ) : null}
      {view?.state === 'done' && metaLine ? (
        <Text testID="friend-phrase-meta" style={{ marginTop: whyText ? 4 : 12, color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale }}>{/* guard-ok: строка макета после ответа («первым» / «дать пять за попытку»), не подпись под названием */}
          {metaLine}
        </Text>
      ) : null}
      {failed ? (
        <FriendsFeedbackRow testID="friend-phrase-error" tone="error" text={phraseCopy(lang, 'saveFailed')} textScale={textScale} style={{ marginTop: 12 }} />
      ) : null}
    </View>
  );
}

/** Монеты ответивших до моего ответа (`.pair` макета): две, внахлёст. */
function CoinPair({ friends, glass }: Readonly<{ friends: readonly FriendPhraseFriend[]; glass: FriendsGlass }>) {
  return (
    <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {friends.slice(0, 2).map((friend, index) => (
        <View key={friend.uid} style={{ marginLeft: index === 0 ? 0 : -6 }}>
          <FriendsCoin coinRank={friend.coinRank} name={friend.name} size={20} glass={glass} plus={friend.isPlus} />
        </View>
      ))}
    </View>
  );
}

type OptionProps = Readonly<{
  index: number;
  option: FriendPhraseOptionView;
  done: boolean;
  glass: FriendsGlass;
  textScale: number;
  lang: Parameters<typeof phraseCopy>[0];
  onAnswer: (optionId: string) => void;
  onOpenFriend: (uid: string) => void;
}>;

/** `.opt` «Опроса дня»: 58 / r14 / 16·22. До ответа — кнопка по центру; после — значок, текст слева, монеты друзей справа. */
const FriendPhraseOptionRow = React.memo(function FriendPhraseOptionRow({ index, option, done, glass, textScale, lang, onAnswer, onOpenFriend }: OptionProps) {
  const onPress = useMemo(() => () => onAnswer(option.id), [onAnswer, option.id]);
  const label = (
    <FlowText
      testID={`friend-phrase-option-label-${index}`}
      provenance="authored"
      style={{ flexShrink: 1, flexGrow: done ? 1 : 0, textAlign: done ? 'left' : 'center', color: glass.text, fontSize: 16 * textScale, lineHeight: 22 * textScale, fontWeight: '700' }}
    >
      {option.text}
    </FlowText>
  );
  if (!done) {
    return (
      <PressableHybrid
        testID={`friend-phrase-option-${index}`}
        accessibilityRole="radio"
        accessibilityLabel={option.text}
        accessibilityState={{ selected: false }}
        onPress={onPress}
        // зачем (правило владельца): вибрация только на управляющих кнопках, не на вариантах ответа
        withHaptic={false}
        withSound={false}
        variant="secondary"
        contentStyle={{ minHeight: 58, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }}
      >
        {label}
      </PressableHybrid>
    );
  }
  const verdict = option.mark === 'right' ? phraseCopy(lang, 'right') : option.mark === 'wrong' ? phraseCopy(lang, 'wrong') : null;
  const extra = option.friends.length - COINS_PER_OPTION;
  return (
    <View
      testID={`friend-phrase-option-${index}`}
      accessible
      accessibilityRole="radio"
      accessibilityState={{ selected: option.mine, disabled: true }}
      accessibilityLabel={[option.text, verdict, ...option.friends.map((friend) => friend.name)].filter(Boolean).join(', ')}
      style={{
        minHeight: 58,
        borderRadius: 14,
        paddingVertical: 12,
        paddingLeft: 16,
        paddingRight: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: option.mine ? glass.selected : glass.opaqueControl,
        boxShadow: nestedBoxShadow(glass), // зачем (стиль «Тень»): без обводки — свой выбор отмечен тоном, верный — значком
      }}
    >
      {option.mark ? (
        <Ionicons
          testID={`friend-phrase-mark-${option.mark}`}
          name={option.mark === 'right' ? 'checkmark-circle' : 'close-circle'}
          size={18}
          color={option.mark === 'right' ? glass.good : glass.secondary}
        />
      ) : null}
      {label}
      {option.friends.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {option.friends.slice(0, COINS_PER_OPTION).map((friend) => (
            <Pressable
              key={friend.uid}
              testID="friend-phrase-friend-coin"
              accessibilityRole="button"
              accessibilityLabel={friend.name}
              // зачем (макет: «Дать пять» — в шторке друга): монета 26 — цель мала, добираем высоту строки
              hitSlop={{ top: 16, bottom: 16, left: 2, right: 2 }}
              onPress={() => onOpenFriend(friend.uid)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <FriendsCoin coinRank={friend.coinRank} name={friend.name} size={26} glass={glass} plus={friend.isPlus} />
            </Pressable>
          ))}
          {extra > 0 ? (
            <Text style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale, fontWeight: '700' }}>{`+${extra}`}</Text>/* guard-ok: счётчик «+N» монет, не подпись */
          ) : null}
        </View>
      ) : null}
    </View>
  );
});
