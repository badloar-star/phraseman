import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
/**
 * cards-2.0 (E11): полноэкранный режим «Стопка» в коллекции (§3.2) —
 * просмотр без оценки (решение по п.22 критики).
 *
 * Стек из ≤3 смонтированных PhraseCard: верхняя + 2 подложки (scale 0.95/0.90,
 * translateY 12/24), подложки подтягиваются useDerivedValue от tx верхней.
 * Tap = флип; свайп L/R = следующая/предыдущая (native); кнопки ‹ › — web,
 * доступность и одноручный режим. Только transform/opacity (Reanimated 4);
 * lowPower/reduceMotion — навигация без улёта (мгновенная подмена).
 * Текстовой подсказки про тап на экране нет (репорт владельца).
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation,
  interpolate,
  Extrapolation,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { triLang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { FC_SPRING, FC_SWIPE } from '../../constants/flashcards_motion';
import { inferExpoSpeechLanguage, type SpeakOpts } from '../../hooks/use-audio';
import PhraseCard, { useFcReduceMotion, type PhraseCardPackTheme } from './PhraseCard';
import { isLowPowerEffective } from './low_power';
import type { WordStrength } from './word_strength';
import { CardItem, resolveFlashcardBackText, type FlashcardContentLang } from './types';

/** Подложки стека (§3.2): scale 0.95/0.90, translateY 12/24. */
const UNDER_1 = { scale: 0.95, ty: 12 } as const;
const UNDER_2 = { scale: 0.90, ty: 24 } as const;
/**
 * Доп. «выглядывание» подложки: над 4px-гранью акцента должно быть видно тело
 * карточки (скруглённый борт), иначе стек читается как три тонкие линии.
 */
const UNDER_REVEAL = 8;

type Props = {
  /** Видимые карточки набора (после фильтра/поиска/лимита). */
  cards: CardItem[];
  initialIndex?: number;
  lang: FlashcardContentLang;
  cardContentLang: FlashcardContentLang;
  t: Theme;
  f: Record<string, number>;
  packCardTheme?: PhraseCardPackTheme | null;
  onSpeak: (text: string, opts?: SpeakOpts) => void;
  /** Смена текущей карточки (персист прогресса + трекинг просмотра). */
  onIndexChanged: (idx: number, cardId: string) => void;
  /** Переворот на рубашку (daily-task трекинг). */
  onFlipTracked: (cardId: string) => void;
  /** Кнопка выхода в списочный view. */
  onExitToList: () => void;
  /** E13: «сила слова» по EN карточки (word_strength.strengthFor); null — без точек. */
  strengthForCard?: ((en: string) => WordStrength | null) | null;
};

export default function CollectionDeckView({
  cards,
  initialIndex = 0,
  lang,
  cardContentLang,
  t,
  f,
  packCardTheme = null,
  onSpeak,
  onIndexChanged,
  onFlipTracked,
  onExitToList,
  strengthForCard = null,
}: Props) {
  const insets = useStableSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const reduceMotion = useFcReduceMotion();
  /** lowPower-ветка: без улёта, мгновенная подмена (transform-подложки статичны и дёшевы). */
  const instantNav = reduceMotion || isLowPowerEffective();

  const total = cards.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, total - 1)));
  const [flipped, setFlipped] = useState(false);
  const indexRef = useRef(index);
  indexRef.current = index;
  /**
   * Навигация «идёт» (улёт) — игнорим повторные свайпы/тапы по кнопкам.
   * SharedValue, а не ref: решение «улетать или вернуться» принимается прямо
   * в worklet'е onEnd, без прыжка на JS-поток (раньше карточка успевала
   * пружиной вернуться назад, пока JS был занят — репорт владельца).
   */
  const navBusySV = useSharedValue(0);

  // Смена состава набора (поиск/фильтр/удаление) — индекс в границы
  useEffect(() => {
    if (total === 0) return;
    if (indexRef.current > total - 1) setIndex(total - 1);
  }, [total]);

  // Трекинг просмотра + персист позиции — на каждую смену верхней карточки (и маунт)
  useEffect(() => {
    const card = cards[index];
    if (card) onIndexChanged(index, card.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // ── Анимация верхней карточки ──
  const tx = useSharedValue(0);
  /** Высота верхней карточки (onLayout) — компенсация центр-скейла подложек. */
  const cardHsv = useSharedValue(0);
  /** Прогресс ухода верхней карточки 0..1 — подложки подтягиваются от него. */
  const progress = useDerivedValue(() =>
    interpolate(Math.abs(tx.value), [0, screenW * 0.5], [0, 1], Extrapolation.CLAMP),
  );

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      {
        rotateZ: `${interpolate(
          tx.value,
          [-screenW, 0, screenW],
          [-FC_SWIPE.rotateZDeg, 0, FC_SWIPE.rotateZDeg],
        )}deg`,
      },
    ],
  }));
  /**
   * Подложки: заявленные §3.2 scale/ty (0.95/12, 0.90/24) + компенсация
   * центр-скейла (h·(1−scale)/2) — иначе уменьшенная карточка прячется ЗА верхней
   * и стек выглядит плоским. Компенсация делает «выглядывание» снизу видимым.
   */
  const under1Style = useAnimatedStyle(() => {
    const p = progress.value;
    const scale = interpolate(p, [0, 1], [UNDER_1.scale, 1]);
    const peek = interpolate(p, [0, 1], [UNDER_1.ty + UNDER_REVEAL, 0]);
    const h = cardHsv.value > 0 ? cardHsv.value : 300;
    return {
      opacity: interpolate(p, [0, 1], [0.92, 1]),
      transform: [
        { translateY: peek + (h * (1 - scale)) / 2 },
        { scale },
      ],
    };
  });
  const under2Style = useAnimatedStyle(() => {
    const p = progress.value;
    const scale = interpolate(p, [0, 1], [UNDER_2.scale, UNDER_1.scale]);
    const peek = interpolate(p, [0, 1], [UNDER_2.ty + UNDER_REVEAL * 2, UNDER_1.ty + UNDER_REVEAL]);
    const h = cardHsv.value > 0 ? cardHsv.value : 300;
    return {
      opacity: interpolate(p, [0, 1], [0.75, 0.92]),
      transform: [
        { translateY: peek + (h * (1 - scale)) / 2 },
        { scale },
      ],
    };
  });

  /**
   * Границы стопки в SharedValue — чтобы worklet свайпа сам решал «улетать или
   * вернуться», не дожидаясь JS-потока.
   */
  const canNextSV = useSharedValue(0);
  const canPrevSV = useSharedValue(0);
  useEffect(() => {
    canNextSV.value = index < total - 1 ? 1 : 0;
    canPrevSV.value = index > 0 ? 1 : 0;
  }, [index, total, canNextSV, canPrevSV]);

  /** Подмена верхней карточки (JS): сброс флипа и позиции стека. */
  const settleAt = useCallback((next: number, enterFromLeft: boolean) => {
    setFlipped(false);
    setIndex(next);
    if (enterFromLeft) {
      // «Возврат» предыдущей: новая верхняя въезжает слева поверх стека
      tx.value = -1.2 * (typeof screenW === 'number' ? screenW : 390);
      tx.value = withSpring(0, FC_SPRING.return, () => {
        runOnJS(unlockNav)();
      });
    } else {
      tx.value = 0;
      navBusySV.value = 0;
    }
  }, [screenW, tx]); // eslint-disable-line react-hooks/exhaustive-deps

  function unlockNav() {
    navBusySV.value = 0;
  }

  /** Финал свайпа: улёт уже отыгран на UI-потоке, здесь только подмена индекса. */
  const settleFromSwipe = useCallback((forward: boolean) => {
    const cur = indexRef.current;
    settleAt(forward ? cur + 1 : cur - 1, !forward);
  }, [settleAt]);

  const goNext = useCallback(() => {
    const cur = indexRef.current;
    if (navBusySV.value === 1) return;
    if (cur >= total - 1) {
      tx.value = withSpring(0, FC_SPRING.return);
      return;
    }
    navBusySV.value = 1;
    if (instantNav) {
      settleAt(cur + 1, false);
      return;
    }
    tx.value = withTiming(-screenW * 1.2, { duration: FC_SWIPE.flyOutMs }, (finished) => {
      if (finished) runOnJS(settleAt)(cur + 1, false);
      else runOnJS(unlockNav)();
    });
  }, [instantNav, navBusySV, screenW, settleAt, total, tx]);

  const goPrev = useCallback(() => {
    const cur = indexRef.current;
    if (navBusySV.value === 1) return;
    if (cur <= 0) {
      tx.value = withSpring(0, FC_SPRING.return);
      return;
    }
    navBusySV.value = 1;
    if (instantNav) {
      settleAt(cur - 1, false);
      return;
    }
    // Текущая уезжает вправо, предыдущая въезжает слева (undo-паттерн)
    tx.value = withTiming(screenW * 1.2, { duration: FC_SWIPE.flyOutMs }, (finished) => {
      if (finished) runOnJS(settleAt)(cur - 1, true);
      else runOnJS(unlockNav)();
    });
  }, [instantNav, navBusySV, screenW, settleAt, tx]);

  /**
   * lowPower/reduceMotion как SharedValue — worklet выбирает ветку «мгновенно»
   * без чтения JS-замыкания (и без пересборки жеста при смене режима).
   */
  const instantNavSV = useSharedValue(instantNav ? 1 : 0);
  useEffect(() => {
    instantNavSV.value = instantNav ? 1 : 0;
  }, [instantNav, instantNavSV]);

  // ── Свайп L/R (native; web — кнопки ‹ ›) ──
  const swipeEnabled = !isWeb && total > 1;
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(swipeEnabled)
        .activeOffsetX([-FC_SWIPE.activationOffsetX, FC_SWIPE.activationOffsetX])
        // Вертикаль отдаём наружу (шторка/скролл), иначе Pan «съедал» движение
        // и жест срывался посреди свайпа.
        .failOffsetY([-FC_SWIPE.failOffsetY, FC_SWIPE.failOffsetY])
        .onBegin(() => {
          // Незавершённый возврат предыдущего жеста не должен драться с новым.
          if (navBusySV.value === 0) cancelAnimation(tx);
        })
        .onUpdate((e) => {
          if (navBusySV.value === 1) return;
          tx.value = e.translationX;
        })
        .onEnd((e) => {
          if (navBusySV.value === 1) return;
          const threshold = screenW * FC_SWIPE.thresholdRatio;
          const passed =
            Math.abs(e.translationX) > threshold ||
            Math.abs(e.velocityX) > FC_SWIPE.velocityThreshold;
          const signed = e.translationX !== 0 ? e.translationX : e.velocityX;
          const forward = signed < 0;
          const allowed = forward ? canNextSV.value === 1 : canPrevSV.value === 1;
          if (!passed || !allowed) {
            tx.value = withSpring(0, FC_SPRING.return);
            return;
          }
          navBusySV.value = 1;
          if (instantNavSV.value === 1) {
            tx.value = 0;
            runOnJS(settleFromSwipe)(forward);
            return;
          }
          // Улёт стартует прямо здесь, на UI-потоке: раньше решение уходило
          // на JS (runOnJS(goNext)) и при занятом JS карточка успевала
          // «прыгнуть назад» до старта анимации.
          tx.value = withTiming(
            (forward ? -1 : 1) * screenW * 1.2,
            { duration: FC_SWIPE.flyOutMs },
            (finished) => {
              if (finished) {
                runOnJS(settleFromSwipe)(forward);
              } else {
                navBusySV.value = 0;
                tx.value = withSpring(0, FC_SPRING.return);
              }
            },
          );
        })
        .onFinalize((_e, success) => {
          // Жест отменён системой — карточка не должна зависнуть посреди экрана.
          if (!success && navBusySV.value === 0) tx.value = withSpring(0, FC_SPRING.return);
        }),
    [swipeEnabled, screenW, tx, navBusySV, canNextSV, canPrevSV, instantNavSV, settleFromSwipe],
  );

  // ── Контент карточек ──
  const card = cards[index] ?? null;
  /** Смонтировано максимум 3 карточки (§3.2): верхняя + 2 подложки. */
  const underCards = useMemo(
    () => [cards[index + 1] ?? null, cards[index + 2] ?? null],
    [cards, index],
  );
  const mountedCount = 1 * (card ? 1 : 0) + underCards.filter(Boolean).length;

  const cardMinHeight = Math.min(440, Math.max(240, Math.round((screenH - insets.top - insets.bottom) * 0.44)));

  const handleFlip = useCallback(
    (next: boolean) => {
      setFlipped(next);
      if (next && card) onFlipTracked(card.id);
    },
    [card, onFlipTracked],
  );

  const backText = card ? resolveFlashcardBackText(card, cardContentLang) : '';
  const speakFront = useCallback(() => {
    if (card) onSpeak(card.en, { language: inferExpoSpeechLanguage(card.en) });
  }, [card, onSpeak]);
  const speakBack = useCallback(() => {
    if (backText) onSpeak(backText, { language: inferExpoSpeechLanguage(backText, cardContentLang) });
  }, [backText, cardContentLang, onSpeak]);

  if (!card) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 }}>
        <Ionicons name="albums-outline" size={40} color={t.textGhost} />
        <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
          {triLang(lang, {
            ru: 'Ничего не найдено',
            uk: 'Нічого не знайдено',
            es: 'No se encontró nada',
          })}
        </Text>
      </View>
    );
  }

  const shadow = {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  } as const;

  const stackEl = (
    <View style={{ marginHorizontal: 22 }}>
      {/* Подложка 2 (нижняя) */}
      {underCards[1] && (
        <Reanimated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, shadow, under2Style]}
        >
          <PhraseCard
            en={underCards[1].en}
            transcription={underCards[1].transcription}
            translation={resolveFlashcardBackText(underCards[1], cardContentLang)}
            packTheme={packCardTheme}
            t={t}
            f={f}
            minHeight={cardMinHeight}
            disabled
            muted
          />
        </Reanimated.View>
      )}
      {/* Подложка 1 */}
      {underCards[0] && (
        <Reanimated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, shadow, under1Style]}
        >
          <PhraseCard
            en={underCards[0].en}
            transcription={underCards[0].transcription}
            translation={resolveFlashcardBackText(underCards[0], cardContentLang)}
            packTheme={packCardTheme}
            t={t}
            f={f}
            minHeight={cardMinHeight}
            disabled
            muted
          />
        </Reanimated.View>
      )}
      {/* Верхняя карточка: tap = флип, свайп = навигация */}
      <Reanimated.View
        style={[shadow, topStyle]}
        onLayout={(e) => {
          cardHsv.value = e.nativeEvent.layout.height;
        }}
      >
        <PhraseCard
          key={card.id}
          en={card.en}
          transcription={card.transcription}
          translation={backText}
          flipped={flipped}
          onFlip={handleFlip}
          onSpeakFront={speakFront}
          onSpeakBack={speakBack}
          packTheme={packCardTheme}
          t={t}
          f={f}
          minHeight={cardMinHeight}
          testID="fc-deck-card"
          strength={strengthForCard ? strengthForCard(card.en) : null}
        />
      </Reanimated.View>
    </View>
  );

  return (
    <View style={{ flex: 1 }} testID="fc-deck-view">
      {/* Верхняя строка: счётчик N/M + выход в список */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 18,
          paddingTop: 10,
        }}
      >
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.bgSurface,
            paddingHorizontal: 14,
            paddingVertical: 6,
          }}
        >
          <Text testID="fc-deck-counter" style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', letterSpacing: 0.4 }}>
            {index + 1}/{total}
          </Text>
        </View>
        {__DEV__ && (
          <Text style={{ color: t.textGhost, fontSize: 9 }} testID="fc-deck-mounted">
            mounted {mountedCount}/3
          </Text>
        )}
        <Pressable
          testID="fc-deck-exit"
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, { ru: 'К списку', uk: 'До списку', es: 'A la lista' })}
          onPress={onExitToList}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.bgSurface,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <Ionicons name="list-outline" size={18} color={t.textSecond} />
        </Pressable>
      </View>

      {/* Стек — по центру экрана */}
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 8 }}>
        {isWeb ? stackEl : <GestureDetector gesture={pan}>{stackEl}</GestureDetector>}
      </View>

      {/* Кнопки ‹ › — web/доступность/одноручный режим */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
          paddingBottom: Math.max(insets.bottom, 8) + 12,
        }}
      >
        <Pressable
          testID="fc-deck-prev"
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, { ru: 'Предыдущая карточка', uk: 'Попередня картка', es: 'Tarjeta anterior' })}
          onPress={goPrev}
          disabled={index <= 0}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 54,
            height: 54,
            borderRadius: 27,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: index <= 0 ? t.border : `${t.accent}88`,
            backgroundColor: index <= 0 ? 'transparent' : `${t.accent}14`,
            opacity: index <= 0 ? 0.35 : 1,
            transform: [{ scale: pressed ? 0.93 : 1 }],
          })}
        >
          <Ionicons name="chevron-back" size={26} color={index <= 0 ? t.textMuted : t.accent} />
        </Pressable>
        {/*
          Текстовой подсказки про тап здесь больше нет (репорт владельца после
          теста на iPhone). Отступ между ‹ и › держим спейсером, чтобы кнопки
          не съезжались к центру.
        */}
        <View style={{ width: 60 }} />
        <Pressable
          testID="fc-deck-next"
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, { ru: 'Следующая карточка', uk: 'Наступна картка', es: 'Siguiente tarjeta' })}
          onPress={goNext}
          disabled={index >= total - 1}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 54,
            height: 54,
            borderRadius: 27,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: index >= total - 1 ? t.border : `${t.accent}88`,
            backgroundColor: index >= total - 1 ? 'transparent' : `${t.accent}14`,
            opacity: index >= total - 1 ? 0.35 : 1,
            transform: [{ scale: pressed ? 0.93 : 1 }],
          })}
        >
          <Ionicons name="chevron-forward" size={26} color={index >= total - 1 ? t.textMuted : t.accent} />
        </Pressable>
      </View>
    </View>
  );
}
