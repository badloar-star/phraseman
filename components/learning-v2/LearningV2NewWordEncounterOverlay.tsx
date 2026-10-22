import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { learningV2NewWordEncounterCopy } from "../../app/learning_v2_new_word_encounter_copy";
import { useAppRuntimeActive } from "../../app/runtime_app_state_store";
import type {
  LearningV2NewWordAudioStateV1,
  LearningV2NewWordSaveStateV1,
} from "../../app/learning_v2_new_word_encounter_copy";
import { learningV2NewWordAudioEnabledV1 } from "../../app/learning_v2_new_word_card_runtime_v1";
import type { LearningV2InterfaceLocale } from "../../modules/learning-v2/content/generator_course_contract";
import type { LearningV2CourseSessionWordEncounterPresentationV1 } from "../../modules/learning-v2/runtime/course_session_word_encounter_presentation_v1";
import { LinearGradient } from "../SafeLinearGradient";
import { Lv2Explain, useLv2Glass } from "./LearningV2Glass";
import { LearningV2TaskCta } from "./LearningV2TaskBody";
import { lv2TaskTokens } from "./learning_v2_task_theme_tokens";
import { plateBoxShadow } from "../v2/ShadowSurface";
import { LEARNING_V2_OWNER_LAYOUT } from "./learningV2OwnerLayout";
import { useLineScale } from '../../hooks/useLineScale';

/** Значки и текст на тёмной карточке слова: белые во всех темах (карточка тёмная всегда — токен wordCardGradient). */
const FACE_INK = "#FFFFFF"; // theme-exempt: карточка слова тёмная в любой теме

export type LearningV2WindowPointV1 =Readonly<{ x: number; y: number }>;

function measureViewCenterInWindow(view: View | null): Promise<LearningV2WindowPointV1 | null> {
  return new Promise((resolve) => {
    if (!view) {
      resolve(null);
      return;
    }
    view.measureInWindow((x, y, width, height) => {
      if (![x, y, width, height].every(Number.isFinite)) {
        resolve(null);
        return;
      }
      resolve({ x: x + width / 2, y: y + height / 2 });
    });
  });
}

export interface LearningV2NewWordEncounterOverlayProps {
  encounter: LearningV2CourseSessionWordEncounterPresentationV1;
  locale: LearningV2InterfaceLocale;
  position: number;
  total: number;
  saveState: LearningV2NewWordSaveStateV1;
  audioState: LearningV2NewWordAudioStateV1;
  /** Persist the unlock before any decorative motion starts. */
  onContinue: () => void | Promise<void>;
  /** Called only after the compact card has a real on-screen layout. */
  onPresented: () => void;
  onFlightComplete: () => void;
  onToggleSave: () => void;
  onPlayAudio: () => void;
  measurePocketTarget: () => Promise<LearningV2WindowPointV1 | null>;
}

export default function LearningV2NewWordEncounterOverlay({
  encounter,
  locale,
  position,
  total,
  saveState,
  audioState,
  onContinue,
  onPresented,
  onFlightComplete,
  onToggleSave,
  onPlayAudio,
  measurePocketTarget,
}: LearningV2NewWordEncounterOverlayProps) {
  const lh = useLineScale();
  // зачем (learning-v2.html, wordCard): окно нового слова — плита стекла (`g`), CTA и статус сохранения из общего набора Learning V2;
  // лицо карточки — своё (задания №23, 22.10: тёмный градиент токена макета, слово и перевод, динамик и закладка внизу в кружках)
  const g = useLv2Glass();
  const reduceMotion = useReducedMotion();
  const appActive = useAppRuntimeActive();
  const word = encounter.save.targetText;
  const copy = useMemo(
    () =>
      learningV2NewWordEncounterCopy({
        locale,
        word,
        position,
        total,
        saveState,
        audioState,
      }),
    [audioState, locale, position, saveState, total, word],
  );
  const saved = saveState === "saved";
  const saveDisabled = saveState === "saving";
  // зачем (владелец 22.10): под словом — только точный короткий перевод (без транскрипции и примера); переворачивать карточку не нужно
  const exactMeaningByLocale = encounter.save.meaningByLocale;
  const exactTranslation = exactMeaningByLocale[locale];
  // зачем (владелец 22.10, 1:1): `.nw .fc { height: 245 }` — высота карточки как в макете, без прежнего потолка 210 (окно прокручивается на малых экранах)
  const cardHeight = LEARNING_V2_OWNER_LAYOUT.word.cardHeight;
  const pocketFlight = useRef(new RNAnimated.Value(0)).current;
  const pocketFlightX = useRef(new RNAnimated.Value(0)).current;
  const pocketFlightY = useRef(new RNAnimated.Value(0)).current;
  const entranceProgress = useRef(new RNAnimated.Value(0)).current;
  // зачем (эмулятор 17.10, L01 s16: после «Начать проверку» ~3 с серый экран без карточки): мс от рендера карточки до старта анимации входа —
  // если JS-поток занят монтированием занятия, разница видна в [V2-WORD-CARD] entrance_start.
  const renderedAtRef = useRef(Date.now());
  const [continuing, setContinuing] = useState(false);
  const continuingRef = useRef(false);
  const presentedRef = useRef(false);
  const sheetFlightOriginRef = useRef<View>(null);
  // зачем (задания №23, 22.10): переворота у нового слова больше нет — слово и перевод на одной стороне, поэтому анимаций переворота и таймера авто-переворота нет
  useLayoutEffect(() => {
    continuingRef.current = false;
    presentedRef.current = false;
    setContinuing(false);
    pocketFlight.setValue(0);
    pocketFlightX.setValue(0);
    pocketFlightY.setValue(0);
  }, [encounter.lexicalItemId, pocketFlight, pocketFlightX, pocketFlightY]);
  // Что на карточке — строка на слово (слово курса и точный перевод).
  useEffect(() => {
    console.log("[V2-WORD-CARD] faces", JSON.stringify({ lexicalItemId: encounter.lexicalItemId, word, translation: exactTranslation ?? null, locale })); // guard-ok: строка на карточку
  }, [encounter.lexicalItemId, exactTranslation, locale, word]);
  useEffect(() => {
    console.log("[V2-WORD-CARD] entrance_start", JSON.stringify({ lexicalItemId: encounter.lexicalItemId, sinceRenderMs: Date.now() - renderedAtRef.current, reduceMotion })); // guard-ok: строка на карточку
    renderedAtRef.current = Date.now();
    entranceProgress.setValue(reduceMotion ? 1 : 0);
    if (reduceMotion) return;
    const entrance = RNAnimated.timing(entranceProgress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    });
    entrance.start();
    return () => entrance.stop();
  }, [encounter.lexicalItemId, entranceProgress, reduceMotion]);
  const onSpeakFromCardsComponent = useCallback(() => {
    onPlayAudio();
  }, [onPlayAudio]);
  const continueToPocket = useCallback(async () => {
    if (continuingRef.current) return;
    continuingRef.current = true;
    setContinuing(true);
    try {
      await onContinue();
    } catch {
      continuingRef.current = false;
      setContinuing(false);
      return;
    }
    if (reduceMotion) {
      onFlightComplete();
      return;
    }
    const [origin, target] = await Promise.all([
      measureViewCenterInWindow(sheetFlightOriginRef.current),
      measurePocketTarget(),
    ]);
    if (!origin || !target) {
      onFlightComplete();
      return;
    }
    pocketFlightX.setValue(0);
    pocketFlightY.setValue(0);
    RNAnimated.parallel([
      RNAnimated.timing(pocketFlight, {
        toValue: 1,
        duration: 230,
        useNativeDriver: true,
      }),
      RNAnimated.timing(pocketFlightX, {
        toValue: target.x - origin.x,
        duration: 230,
        useNativeDriver: true,
      }),
      RNAnimated.timing(pocketFlightY, {
        toValue: target.y - origin.y,
        duration: 230,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onFlightComplete();
      else {
        continuingRef.current = false;
        setContinuing(false);
      }
    });
  }, [
    measurePocketTarget,
    onContinue,
    onFlightComplete,
    pocketFlight,
    pocketFlightX,
    pocketFlightY,
    reduceMotion,
  ]);

  return (
    <View
      testID="learning-v2-new-word-overlay"
      pointerEvents="box-none"
      style={styles.overlay}
    >
      {/* зачем (макет `cm`): окно поверх занятия затемняет фон; слой не ловит касания, поэтому
          прежняя проходимость касаний сквозь оверлей не изменилась. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
      <RNAnimated.View
        ref={sheetFlightOriginRef}
        collapsable={false}
        pointerEvents="auto"
        style={[
          styles.sheet,
          {
            backgroundColor: g.opaqueSheet,
            boxShadow: plateBoxShadow(g), // зачем («Тень» 12.10): окно по центру без кромки, с тенью плашки
            // зачем (эмулятор 17.10, ~3 с серого экрана): карточка видна с первого кадра — вход лишь сдвиг и масштаб; прозрачность от него
            // не зависит, иначе занятый JS-поток (старт анимации ждёт эффекта) держал карточку невидимой поверх уже затемнённого фона
            opacity: pocketFlight.interpolate({
              inputRange: [0, 0.9, 1],
              outputRange: [1, 1, 0],
            }),
            transform: [
              { translateX: pocketFlightX },
              {
                translateY: RNAnimated.add(
                  pocketFlightY,
                  entranceProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [reduceMotion ? 0 : 12, 0],
                  }),
                ),
              },
              {
                scale: RNAnimated.multiply(
                  entranceProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [reduceMotion ? 1 : 0.96, 1],
                  }),
                  pocketFlight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.18],
                  }),
                ),
              },
            ],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.label, { color: g.text, lineHeight: lh(26) }]}>
            {copy.label}
          </Text>
          <Text style={[styles.counter, { color: g.secondary, lineHeight: lh(21) }]}>
            {copy.counter}
          </Text>
        </View>

        <ScrollView
          style={styles.cardScroll}
          contentContainerStyle={styles.cardScrollContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
        >
        <View
          onLayout={() => {
            if (presentedRef.current) return;
            presentedRef.current = true;
            onPresented();
          }}
        >
        <RNAnimated.View
          testID="learning-v2-new-word-compact-card"
          style={styles.cardWrap}
        >
          {/* зачем (Сверка 22.10, №23 «до бита»; макет `.nw .fc`): лицо — тёмный градиент 160° (токен wordCardGradient, во всех темах), слово 40/800 белое и перевод 16 с α .7 по центру;
              динамик (круг 38, `.spk`) слева внизу и закладка (круг 44) справа внизу — в 14 от краёв, на плашке белого α .14 */}
          <LinearGradient
            testID="learning-v2-new-word-face"
            colors={[...lv2TaskTokens(g).wordCardGradient.colors]}
            start={{ x: 0.33, y: 0.03 }}
            end={{ x: 0.67, y: 0.97 }}
            style={[styles.face, { height: cardHeight }]}
          >
            <Text testID="learning-v2-new-word-word" style={[styles.faceWord, { lineHeight: lh(48) }]}>{word}</Text>
            <Text testID="learning-v2-new-word-translation" style={[styles.faceTranslation, { lineHeight: lh(21) }]}>{exactTranslation}</Text>
          </LinearGradient>
          <Pressable
            testID="learning-v2-new-word-audio"
            accessibilityRole="button"
            accessibilityLabel={copy.audioLabel}
            accessibilityState={{ disabled: !learningV2NewWordAudioEnabledV1(audioState) }}
            disabled={!learningV2NewWordAudioEnabledV1(audioState)}
            hitSlop={6}
            onPress={onSpeakFromCardsComponent}
            style={({ pressed }) => [styles.faceSpeaker, { opacity: !learningV2NewWordAudioEnabledV1(audioState) ? 0.45 : pressed ? 0.68 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
          >
            <Ionicons name="volume-high" size={18} color={FACE_INK} />
          </Pressable>
          <Pressable
            testID="learning-v2-new-word-save"
            accessibilityRole="button"
            accessibilityLabel={copy.saveLabel}
            accessibilityState={{ disabled: saveDisabled, selected: saved }}
            disabled={saveDisabled}
            hitSlop={8}
            onPress={onToggleSave}
            style={({ pressed }) => [
              styles.cardBookmark,
              {
                opacity: saveDisabled ? 0.45 : pressed ? 0.68 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={20} color={FACE_INK} />
          </Pressable>
        </RNAnimated.View>
        </View>

        {/* зачем (владелец 22.10 через координатора, «до бита»): в «Предлагаем» под карточкой слова ничего нет — абзац с определением убран; данные определения остаются в выпуске */}
        </ScrollView>

        <View style={styles.continueRow}>
          {/* зачем (Сверка 22.10, №23): в макете `.nw .tcta` — тёмная плоская кнопка (фон = цвет текста, надпись = цвет карточки), а не светло-сиреневая CTA темы */}
          <LearningV2TaskCta
            accessibilityLabel={copy.continue}
            disabled={continuing}
            onPress={() => {
              void continueToPocket();
            }}
            style={styles.continue}
            right={<Ionicons name="arrow-forward" size={18} color={continuing ? g.secondary : lv2TaskTokens(g).ctaInk} />}
          >
            {copy.continue}
          </LearningV2TaskCta>
        </View>

        {/* макет 61/62: «Перевёрнута и сохранена» — галочка, «Не сохранилось» — лампочка */}
        {copy.saveStatus ? (
          <Lv2Explain icon={saved ? "checkmark-circle-outline" : "bulb-outline"} tone={saved ? "ok" : "warm"}>
            {copy.saveStatus}
          </Lv2Explain>
        ) : null}
      </RNAnimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  sheet: {
    width: "88%",
    maxWidth: 330,
    maxHeight: "62%",
    gap: 10,
    overflow: "visible",
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  cardScroll: {
    flexShrink: 1,
    overflow: "visible",
  },
  cardScrollContent: {
    gap: 14,
    paddingBottom: 2,
    overflow: "visible",
  },
  header: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
  },
  // зачем (learning-v2.html wordCard, «1 из 4» 15/600 --sec; D145 → 16).
  counter: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
  },
  cardWrap: {
    position: "relative",
    borderRadius: LEARNING_V2_OWNER_LAYOUT.word.cardRadius,
    overflow: "visible",
  },
  // `.nw .fc`: высота 245 (cardHeight), радиус 33, колонка по центру с gap 8; слово 40/800, перевод 16 с α .7
  face: {
    borderRadius: LEARNING_V2_OWNER_LAYOUT.word.cardRadius,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 30, // слово и перевод — оптический центр над рядом кнопок внизу
    overflow: "hidden",
  },
  faceWord: { color: FACE_INK, fontSize: 40, fontWeight: "800", textAlign: "center" },
  faceTranslation: { color: FACE_INK, opacity: 0.7, fontSize: 16, fontWeight: "400", textAlign: "center" },
  // `.spk` 38 × 38 слева внизу в 14 от краёв, плашка белого α .14, значок 18
  faceSpeaker: {
    position: "absolute",
    left: 14,
    bottom: 14,
    zIndex: 5,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.14)", // theme-exempt: плашка на тёмной карточке слова (во всех темах карточка тёмная)
    alignItems: "center",
    justifyContent: "center",
  },
  // закладка 44 × 44 справа внизу в 14 от краёв, та же плашка
  cardBookmark: {
    position: "absolute",
    right: 14,
    bottom: 14,
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)", // theme-exempt: плашка на тёмной карточке слова
    alignItems: "center",
    justifyContent: "center",
  },
  continueRow: {
    width: "100%",
    alignItems: "center",
  },
  continue: {
    width: "100%",
    maxWidth: 360,
  },
  scrim: { backgroundColor: "rgba(0,0,0,0.6)" }, // theme-exempt: затемнение под окном и тень — чёрные в любой теме
});
