import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  DAILY_POLL_LOG,
  loadTodayDailyPoll,
  peekTodayDailyPoll,
  submitDailyPollVote,
  type DailyPollSnapshot,
  type DailyPollVoteErrorReason,
} from '../../app/daily_poll/daily_poll_client';
import { dailyPollPercents, pickDailyPollText, type DailyPollVote } from '../../app/daily_poll/daily_poll_model';
import { DebugLogger } from '../../app/debug-logger';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { triLang } from '../../constants/i18n';
import { KIT_MOTION } from '../../constants/motionHybrid';
import { useLang } from '../LangContext';
import PressableHybrid from '../PressableHybrid';
import { FlowText } from '../text-integrity';
import { FriendsFeedbackRow, FriendsSectionTitle, useFriendsGlass, type FriendsGlass } from './FriendsGlassKit';

// зачем (владелец 2026-09-30, «Делаем, вопросы из админки»): карточка «Опрос дня» по макету
// community.html → COM-04-ACTIVITY (`.card.c2` + `.eyebrow` + `.section-title` + `.opt`).
// Состояние после голоса нарисовано в том же стиле: те же кнопки-варианты, внутри — полоса
// доли и процент, свой выбор отмечен галочкой и более плотной полосой.
// Опроса на сегодня нет → карточки нет совсем (без пустой рамки).
// Optimistic UI: выбор отмечается сразу, проценты приходят из ответа сервера (без «прыжка»
// числа от устаревшего утреннего кэша); ошибка → откат выбора и понятное сообщение.

type Props = Readonly<{
  /** Вкладка видна — при каждом заходе дешёвая сверка кэша (сеть — раз в день). */
  active: boolean;
}>;

// зачем (координатор 10.10): полосы результатов — kit.css `.trk > i`: 800 мс cubic-bezier(.2,.8,.2,1).
const REVEAL_MS = KIT_MOTION.progressMs;

export default function DailyPollCard({ active }: Props) {
  const { lang } = useLang();
  const { glass, textScale } = useFriendsGlass();
  const [snapshot, setSnapshot] = useState<DailyPollSnapshot | null>(() => peekTodayDailyPoll());
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const [error, setError] = useState<DailyPollVoteErrorReason | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void loadTodayDailyPoll()
      .then((next) => {
        if (cancelled || !mountedRef.current) {
          DebugLogger.info(DAILY_POLL_LOG, 'карточка: загрузка пришла после ухода с вкладки — не применяем');
          return;
        }
        setSnapshot((prev) => {
          // Карточка появляется/исчезает в потоке списка — анимируем вставку, а не телепортируем.
          if (Boolean(prev?.poll) !== Boolean(next.poll)) animateNextLayoutTransition();
          // Голос, отмеченный локально в этой сессии, не затираем более старым снимком.
          if (prev?.vote && !next.vote && prev.dateKey === next.dateKey) return { ...next, vote: prev.vote };
          return next;
        });
      })
      .catch((err: unknown) => {
        DebugLogger.warn(DAILY_POLL_LOG, `карточка: загрузка упала: ${String(err)}`);
      });
    return () => { cancelled = true; };
  }, [active]);

  const L = useCallback(
    (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
      triLang(lang as never, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl }),
    [lang],
  );

  const poll = snapshot?.poll ?? null;
  const vote = snapshot?.vote ?? null;

  const handleVote = useCallback(async (optionId: string) => {
    if (!snapshot?.poll) {
      DebugLogger.info(DAILY_POLL_LOG, `тап: ранний выход — опроса нет (option=${optionId})`);
      return;
    }
    if (busyRef.current || snapshot.vote) {
      DebugLogger.info(DAILY_POLL_LOG, `тап: ранний выход — ${busyRef.current ? 'голос уже в полёте' : `уже голосовал за ${snapshot.vote?.optionId}`}`);
      return;
    }
    busyRef.current = true;
    // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
    setError(null);
    setPendingOptionId(optionId); // optimistic: выбор виден сразу
    const outcome = await submitDailyPollVote(snapshot, optionId);
    busyRef.current = false;
    if (!mountedRef.current) {
      DebugLogger.info(DAILY_POLL_LOG, `тап: ответ пришёл после размонтирования (ok=${outcome.ok})`);
      return;
    }
    if (outcome.ok) {
      animateNextLayoutTransition();
      setSnapshot((prev) => (prev && prev.dateKey === snapshot.dateKey ? { ...prev, vote: outcome.vote } : prev));
      setPendingOptionId(null);
      return;
    }
    // Откат выбора + понятное сообщение.
    setPendingOptionId(null);
    setError(outcome.reason);
    DebugLogger.info(DAILY_POLL_LOG, `тап: откат выбора ${optionId}, причина=${outcome.reason}`);
  }, [snapshot]);

  if (!poll) return null;

  const optionIds = poll.options.map((o) => o.id);
  const errorText = error === null
    ? null
    : error === 'closed' || error === 'not_found'
      ? L('Этот опрос уже закрыт.', 'Це опитування вже закрите.', 'This poll is already closed.', 'Esta encuesta ya está cerrada.', 'Esta enquete já foi encerrada.', 'Cuộc bình chọn này đã đóng.', 'Polling ini sudah ditutup.', 'Bu anket kapandı.', 'Ta ankieta jest już zamknięta.')
      : error === 'offline'
        ? L('Нет связи — голос не отправлен. Попробуй ещё раз.', 'Немає звʼязку — голос не надіслано. Спробуй ще раз.', 'No connection — your vote wasn’t sent. Try again.', 'Sin conexión: tu voto no se envió. Inténtalo de nuevo.', 'Sem conexão — seu voto não foi enviado. Tente de novo.', 'Không có kết nối — phiếu chưa được gửi. Thử lại nhé.', 'Tidak ada koneksi — suaramu belum terkirim. Coba lagi.', 'Bağlantı yok — oyun gönderilmedi. Tekrar dene.', 'Brak połączenia — głos nie został wysłany. Spróbuj ponownie.')
        : L('Не получилось отправить голос. Попробуй ещё раз.', 'Не вдалося надіслати голос. Спробуй ще раз.', 'Couldn’t send your vote. Try again.', 'No se pudo enviar tu voto. Inténtalo de nuevo.', 'Não foi possível enviar seu voto. Tente de novo.', 'Không gửi được phiếu. Thử lại nhé.', 'Suaramu gagal terkirim. Coba lagi.', 'Oy gönderilemedi. Tekrar dene.', 'Nie udało się wysłać głosu. Spróbuj ponownie.');

  return (
    <View
      testID="daily-poll-card"
      style={{
        marginTop: 12,
        marginBottom: 12,
        padding: 18,
        borderRadius: 22,
        backgroundColor: glass.opaqueCard,
        borderWidth: 1, // guard-ok: тонкая 1 px полупрозрачная кромка стекла 2.0, как у FriendsCard
        borderColor: glass.glassEdge, // guard-ok: 1 px кромка стекла 2.0
      }}
    >
      <Text
        testID="daily-poll-eyebrow"
        // guard-ok: `.eyebrow` макета — надпись НАД заголовком, не подпись под ним
        style={{ color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase' }}
      >
        {L('Опрос дня', 'Опитування дня', 'Poll of the day', 'Encuesta del día', 'Enquete do dia', 'Bình chọn hôm nay', 'Polling hari ini', 'Günün anketi', 'Ankieta dnia')}
      </Text>
      <View style={{ marginTop: 8 }}>
        <FriendsSectionTitle glass={glass} textScale={textScale}>{pickDailyPollText(poll.question, lang)}</FriendsSectionTitle>
      </View>
      <View style={{ marginTop: 14, gap: 10 }} accessibilityRole="radiogroup">
        {poll.options.map((option) => (
          <DailyPollOptionButton
            key={option.id}
            glass={glass}
            textScale={textScale}
            label={pickDailyPollText(option.text, lang)}
            optionId={option.id}
            vote={vote}
            pendingOptionId={pendingOptionId}
            percent={vote ? dailyPollPercents(vote.counts, optionIds)[option.id] ?? 0 : null}
            onVote={handleVote}
          />
        ))}
      </View>
      {errorText ? (
        <FriendsFeedbackRow testID="daily-poll-error" tone="error" text={errorText} textScale={textScale} style={{ marginTop: 12 }} />
      ) : null}
    </View>
  );
}

type OptionProps = Readonly<{
  glass: FriendsGlass;
  textScale: number;
  label: string;
  optionId: string;
  vote: DailyPollVote | null;
  pendingOptionId: string | null;
  /** null — результатов ещё нет (до голоса или пока ответ в пути). */
  percent: number | null;
  onVote: (optionId: string) => void;
}>;

/** `.opt` макета: мин. 58, радиус 14, 1 px кромка, 16.5/21 полужирный. После голоса — полоса доли внутри. */
const DailyPollOptionButton = React.memo(function DailyPollOptionButton({
  glass, textScale, label, optionId, vote, pendingOptionId, percent, onVote,
}: OptionProps) {
  const chosenId = vote?.optionId ?? pendingOptionId;
  const isChosen = chosenId === optionId;
  const locked = Boolean(vote) || pendingOptionId !== null;
  const showResults = percent !== null;
  const reveal = useSharedValue(showResults ? 1 : 0);

  useEffect(() => {
    reveal.value = showResults ? withTiming(1, { duration: REVEAL_MS, easing: Easing.bezier(KIT_MOTION.progressEase[0], KIT_MOTION.progressEase[1], KIT_MOTION.progressEase[2], KIT_MOTION.progressEase[3]) }) : 0;
  }, [showResults, reveal]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: reveal.value }] }));
  const onPress = useMemo(() => () => onVote(optionId), [onVote, optionId]);
  const fade = locked && !isChosen && !showResults ? 0.56 : 1;

  return (
    <PressableHybrid
      testID={`daily-poll-option-${optionId}`}
      accessibilityRole="radio"
      accessibilityLabel={showResults ? `${label}, ${percent}%` : label}
      accessibilityState={{ selected: isChosen, disabled: locked }}
      onPress={onPress}
      disabled={locked}
      withHaptic={false}
      withSound={false}
      variant="secondary"
      contentStyle={{
        minHeight: 58,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: showResults ? 16 : 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: showResults ? 'space-between' : 'center',
        gap: 10,
        overflow: 'hidden',
        backgroundColor: isChosen ? glass.selected : 'transparent',
        borderWidth: 1, // guard-ok: `.opt` макета — 1 px полупрозрачный контур
        borderColor: glass.glassEdge, // guard-ok: 1 px кромка 2.0; выбор отмечен тоном и галочкой, не цветной рамкой
        opacity: fade,
      }}
    >
      {showResults ? (
        <Reanimated.View
          pointerEvents="none"
          testID="daily-poll-bar"
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: `${percent}%`,
              backgroundColor: isChosen ? glass.lightTint : glass.opaqueControl,
              transformOrigin: 'left',
            },
            barStyle,
          ]}
        />
      ) : null}
      <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {isChosen ? <Ionicons name="checkmark-circle" size={18} color={glass.text} /> : null}
        <FlowText
          testID="daily-poll-option-label"
          provenance="authored"
          style={{ flexShrink: 1, textAlign: showResults ? 'left' : 'center', color: glass.text, fontSize: 16 * textScale, lineHeight: 22 * textScale, fontWeight: '700' }}
        >
          {label}
        </FlowText>
      </View>
      {showResults ? (
        <Text
          testID="daily-poll-percent"
          style={{ color: isChosen ? glass.text : glass.secondary, fontSize: 16 * textScale, lineHeight: 21 * textScale, fontWeight: '700', fontVariant: ['tabular-nums'] }}
        >
          {`${percent}%`}
        </Text>
      ) : null}
    </PressableHybrid>
  );
});
