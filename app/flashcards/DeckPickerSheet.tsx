import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
/**
 * cards-2.0 (E8): DeckPickerSheet — bottom-sheet выбора набора + размера сессии
 * (§3.1 п.5, §3.5 мастер-плана). Свой, без сторонних либ: Reanimated translateY
 * (spring) + backdrop opacity — только transform/opacity на UI-потоке (принцип 3).
 *
 * cards-2.1 (§6 SPEC_2_1): МУЛЬТИВЫБОР — чекбоксы вместо радио, можно отметить
 * несколько наборов сразу; счётчик «Выбрано 3 · 84 карточки» (карточки суммируются
 * с дедупликацией по стабильному id, если списки id переданы в `cardIds`); старт
 * заблокирован при нуле выбранных. «Слабые» (due-очередь тренера) — не набор, а
 * режим, поэтому выбирается только в одиночку (deck_selection.toggleDeckSelection).
 *
 * Открывается по long-press / иконке ⚙ на плитке режима — быстрый старт идёт
 * мимо него (принцип 2: ≤2 тапа до тренировки). Выбор сохраняется в
 * fc_mode_prefs_v1.lastPreset — следующий тап по режиму стартует с ним.
 *
 * Размер: 10/15/20. reduceMotion/web/lowPower — timing вместо spring, без стаггера.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { FC_TIMING, fcStaggerDelay } from '../../constants/flashcards_motion';
import { fcHaptic } from './SoundService';
import { isLowPowerEffective } from './low_power';
import {
  deckSelectionLabel,
  summarizeDeckSelection,
  toggleDeckSelection,
  type DeckCountable,
} from './deck_selection';
import {
  FC_SESSION_SIZES,
  FC_DEFAULT_SESSION_SIZE,
  presetDeckIds,
  setLastPreset,
  type FcDeckId,
  type FcModePreset,
  type FcPresetMode,
  type FcSessionSize,
} from './mode_prefs';

export type DeckSheetOption = DeckCountable & {
  deckId: FcDeckId;
  title: string;
  /** Кол-во карточек в наборе (бейдж; 0 — набор задизейблен). */
  count: number;
  /**
   * cards-2.1: стабильные id карточек набора. Если переданы — суммарный счётчик
   * выбранного дедуплицируется (одна карточка в двух наборах считается один раз).
   * Без них счётчик просто складывает `count`.
   */
  cardIds?: readonly string[];
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Старт сессии с выбранным пресетом (после сохранения в fc_mode_prefs_v1). */
  onStart: (preset: FcModePreset) => void;
  decks: DeckSheetOption[];
  /** Последний пресет — предвыбор при открытии (мультивыбор: preset.deckIds). */
  initialPreset?: FcModePreset | null;
  lang: Lang;
  t: Theme;
  f: { h3: number; body: number; sub: number; caption: number };
  reduceMotion?: boolean;
  /** E10: чей пресет сохраняем и какой CTA показываем (дефолт — тренер). */
  mode?: FcPresetMode;
};

const SHEET_SPRING = { damping: 22, stiffness: 260, mass: 0.9 } as const;
/** Мягкая пружина галочки — заметная, но без «резинового» перелёта. */
const CHECK_SPRING = { damping: 15, stiffness: 320, mass: 0.7 } as const;
const ROW_SPRING = { damping: 20, stiffness: 240, mass: 0.8 } as const;
const SHEET_HIDE_Y = 620;
const ROW_ENTER_Y = 10;

// ── Строка набора: пружинная галочка + стаггер входа ─────────────────────────

type DeckRowProps = {
  deck: DeckSheetOption;
  index: number;
  active: boolean;
  onToggle: (deckId: FcDeckId) => void;
  /** Упрощённая анимация: reduce motion / слабое устройство / web. */
  simple: boolean;
  t: Theme;
  f: Props['f'];
};

function DeckRow({ deck, index, active, onToggle, simple, t, f }: DeckRowProps) {
  const empty = deck.count <= 0;
  /** Вход строки: opacity + translateY со стаггером (только transform/opacity). */
  const enter = useSharedValue(simple ? 1 : 0);
  /** Галочка: 0 — снята, 1 — стоит (мягкая пружина). */
  const check = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (simple) {
      enter.value = 1;
      return;
    }
    enter.value = 0;
    enter.value = withDelay(fcStaggerDelay(index), withSpring(1, ROW_SPRING));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    check.value = simple
      ? withTiming(active ? 1 : 0, { duration: FC_TIMING.fast })
      : withSpring(active ? 1 : 0, CHECK_SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, simple]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * ROW_ENTER_Y }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: 0.6 + check.value * 0.4 }],
  }));

  return (
    <Reanimated.View style={rowStyle}>
      <Pressable
        testID={`fc-deck-option-${deck.deckId}`}
        accessibilityLabel={`qa-fc-deck-option-${deck.deckId}`}
        accessible
        accessibilityRole="checkbox"
        accessibilityState={{ checked: active, disabled: empty }}
        disabled={empty}
        onPress={() => {
          fcHaptic('tap');
          onToggle(deck.deckId);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: active ? t.accent : t.border,
          backgroundColor: active ? `${t.accent}14` : t.bgSurface,
          paddingVertical: 12,
          paddingHorizontal: 14,
          opacity: empty ? 0.45 : 1,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            backgroundColor: active ? `${t.accent}26` : `${t.textMuted}1A`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={deck.icon} size={18} color={active ? t.accent : t.textMuted} />
        </View>
        <Text
          style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: active ? '800' : '600' }}
          numberOfLines={1}
        >
          {deck.title}
        </Text>
        <Text style={{ color: active ? t.accent : t.textMuted, fontSize: f.sub, fontWeight: '800' }}>
          {deck.count}
        </Text>
        {/* Чекбокс: рамка статична, «птичка» въезжает пружиной (scale + opacity) */}
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: active ? t.accent : t.textGhost,
            backgroundColor: active ? t.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Reanimated.View style={checkStyle}>
            <Ionicons name="checkmark" size={15} color={t.correctText} />
          </Reanimated.View>
        </View>
      </Pressable>
    </Reanimated.View>
  );
}

export default function DeckPickerSheet({
  visible,
  onClose,
  onStart,
  decks,
  initialPreset,
  lang,
  t,
  f,
  reduceMotion = false,
  mode = 'trainer',
}: Props) {
  const insets = useStableSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  /** Modal живёт чуть дольше visible — успевает проиграться анимация закрытия. */
  const [mounted, setMounted] = useState(visible);
  /** cards-2.1: мультивыбор наборов (§6). Пустой список — старт заблокирован. */
  const [deckIds, setDeckIds] = useState<FcDeckId[]>(() => presetDeckIds(initialPreset));
  const [size, setSize] = useState<FcSessionSize>(initialPreset?.size ?? FC_DEFAULT_SESSION_SIZE);
  const [starting, setStarting] = useState(false);

  /** Упрощённая анимация строк: reduce motion / слабое устройство / web. */
  const simpleMotion = reduceMotion || Platform.OS === 'web' || isLowPowerEffective();

  const ty = useSharedValue(SHEET_HIDE_Y);
  const backdrop = useSharedValue(0);

  const unmount = useCallback(() => setMounted(false), []);

  /** Предвыбор текущего открытия уже сделан (один раз на открытие). */
  const presetAppliedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setStarting(false);
      presetAppliedRef.current = false;
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: FC_TIMING.base });
      ty.value = withTiming(SHEET_HIDE_Y, { duration: FC_TIMING.base }, (fin) => {
        if (fin) runOnJS(unmount)();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /**
   * Предвыбор из последнего пресета (мог обновиться между открытиями).
   * E10: один шит на несколько режимов — наборы прошлого открытия могут
   * отсутствовать в текущем списке (у слушания нет 'weak') → фильтруем.
   *
   * cards-2.1: список наборов грузится АСИНХРОННО и на первом кадре открытия
   * бывает пустым — тогда ждём его и предвыбираем, когда наборы приедут
   * (иначе шит открывался с нулём отмеченных и заблокированным стартом).
   */
  useEffect(() => {
    if (!visible || presetAppliedRef.current || decks.length === 0) return;
    presetAppliedRef.current = true;
    const listed = new Set<FcDeckId>(decks.map((d) => d.deckId));
    const fromPreset = presetDeckIds(initialPreset).filter((id) => listed.has(id));
    if (fromPreset.length > 0) {
      setDeckIds(fromPreset);
      if (initialPreset) setSize(initialPreset.size);
      return;
    }
    setDeckIds((prev) => {
      const kept = prev.filter((id) => listed.has(id));
      if (kept.length > 0) return kept;
      const firstUsable = decks.find((d) => d.count > 0) ?? decks[0];
      return firstUsable ? [firstUsable.deckId] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, decks]);

  // Анимация входа — ПОСЛЕ монтирования Modal (иначе стартовый кадр web
  // пропускает начатую до маунта анимацию и шит остаётся за экраном).
  useEffect(() => {
    if (!visible || !mounted) return;
    ty.value = SHEET_HIDE_Y;
    backdrop.value = withTiming(1, { duration: FC_TIMING.base });
    ty.value = reduceMotion
      ? withTiming(0, { duration: FC_TIMING.fast })
      : Platform.OS === 'web'
        ? withTiming(0, { duration: FC_TIMING.enter })
        : withSpring(0, SHEET_SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  const toggleDeck = useCallback((id: FcDeckId) => {
    setDeckIds((prev) => toggleDeckSelection(prev, id));
  }, []);

  /** «Выбрано 3 · 84 карточки» — суммарно, с дедупликацией по стабильному id. */
  const summary = useMemo(() => summarizeDeckSelection(decks, deckIds), [decks, deckIds]);
  const selectedIds = useMemo(() => new Set<FcDeckId>(deckIds), [deckIds]);
  /** Нечего тренировать (0 выбрано или в выбранном нет карточек) → старт заблокирован. */
  const canStart = summary.deckCount > 0 && summary.cardCount > 0 && !starting;

  const handleStart = useCallback(() => {
    if (!canStart || deckIds.length === 0) return;
    setStarting(true);
    fcHaptic('tap');
    const preset: FcModePreset = { deckId: deckIds[0], deckIds: [...deckIds], size };
    // Оптимистик: сохраняем пресет и стартуем не дожидаясь записи (очередь mode_prefs)
    void setLastPreset(mode, preset);
    onStart(preset);
  }, [canStart, deckIds, size, onStart, mode]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* web: контент шире device-width (лента магазина хаба) раздувает layout viewport,
          и «низ»/«ширина» fixed-модалки уезжают за видимый экран — капим окном. */}
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          ...(Platform.OS === 'web' ? { maxHeight: winH, maxWidth: winW } : {}),
        }}
      >
        {/* Backdrop */}
        <Reanimated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
            backdropStyle,
          ]}
        >
          <Pressable
            testID="fc-deck-sheet-backdrop"
            accessibilityLabel="qa-fc-deck-sheet-backdrop"
            accessible
            onPress={onClose}
            style={{ flex: 1 }}
          />
        </Reanimated.View>

        {/* Sheet */}
        <Reanimated.View
          testID="fc-deck-sheet"
          style={[
            {
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: t.bgCard,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor: t.border,
              paddingTop: 10,
              paddingHorizontal: 16,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
              maxHeight: '82%',
            },
            sheetStyle,
          ]}
        >
          {/* Grabber + заголовок */}
          <View style={{ alignItems: 'center', marginBottom: 6 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '800' }}>
              {mode === 'listening'
                ? triLang(lang, { ru: 'Что слушаем?', uk: 'Що слухаємо?', es: '¿Qué escuchamos?' })
                : mode === 'blitz'
                  ? triLang(lang, {
                      ru: 'Что в блице?',
                      uk: 'Що в бліці?',
                      es: '¿Qué entra en el blitz?',
                      'pt-BR': 'O que entra no blitz?',
                      vi: 'Blitz gồm những gì?',
                      id: 'Apa isi blitz?',
                      tr: 'Blitz’te ne olsun?',
                      pl: 'Co w blitzu?',
                    })
                  : triLang(lang, { ru: 'Что тренируем?', uk: 'Що тренуємо?', es: '¿Qué entrenamos?' })}
            </Text>
            <Pressable
              testID="fc-deck-sheet-close"
              accessibilityLabel="qa-fc-deck-sheet-close"
              accessible
              onPress={onClose}
              hitSlop={10}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: t.bgSurface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color={t.textMuted} />
            </Pressable>
          </View>

          {/* §6: счётчик выбранного — «Выбрано 3 · 84 карточки»; при нуле — подсказка */}
          <Text
            testID="fc-deck-selection-summary"
            accessibilityLabel="qa-fc-deck-selection-summary"
            accessible
            style={{
              color: summary.deckCount > 0 ? t.accent : t.textMuted,
              fontSize: f.caption,
              fontWeight: '800',
              marginBottom: 12,
            }}
          >
            {summary.deckCount > 0
              ? deckSelectionLabel(lang, summary)
              : triLang(lang, {
                  ru: 'Отметьте один или несколько наборов',
                  uk: 'Позначте один або кілька наборів',
                  es: 'Marca uno o varios packs',
                  'pt-BR': 'Marque um ou mais pacotes',
                  vi: 'Chọn một hoặc nhiều bộ thẻ',
                  id: 'Tandai satu atau beberapa set',
                  tr: 'Bir veya birkaç set işaretle',
                  pl: 'Zaznacz jeden lub kilka zestawów',
                })}
          </Text>

          {/* Наборы — чекбоксы (мультивыбор) */}
          <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              {decks.map((d, i) => (
                <DeckRow
                  key={d.deckId}
                  deck={d}
                  index={i}
                  active={selectedIds.has(d.deckId)}
                  onToggle={toggleDeck}
                  simple={simpleMotion}
                  t={t}
                  f={f}
                />
              ))}
            </View>

            {/* Размер сессии (блиц — на время, размер не выбирается: E12 §3.9).
                Пояснительная подпись под режимом убрана по просьбе владельца
                (2026-08-13): кнопки без описаний. */}
            {mode === 'blitz' ? null : (
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.caption,
                fontWeight: '800',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              {triLang(lang, { ru: 'Карточек в сессии', uk: 'Карток у сесії', es: 'Tarjetas por sesión' })}
            </Text>
            )}
            {mode === 'blitz' ? null : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FC_SESSION_SIZES.map((n) => {
                const active = n === size;
                return (
                  <Pressable
                    key={n}
                    testID={`fc-deck-size-${n}`}
                    accessibilityLabel={`qa-fc-deck-size-${n}`}
                    accessible
                    onPress={() => {
                      fcHaptic('tap');
                      setSize(n);
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: active ? t.accent : t.border,
                      backgroundColor: active ? `${t.accent}14` : t.bgSurface,
                      paddingVertical: 10,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: active ? t.accent : t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            )}
          </ScrollView>

          {/* CTA */}
          <Pressable
            testID="fc-deck-start"
            accessibilityLabel="qa-fc-deck-start"
            accessible
            accessibilityState={{ disabled: !canStart }}
            disabled={!canStart}
            onPress={handleStart}
            style={{
              marginTop: 16,
              borderRadius: 16,
              backgroundColor: canStart ? t.accent : t.bgSurface,
              paddingVertical: 15,
              alignItems: 'center',
              borderWidth: canStart ? 0 : 1,
              borderColor: t.border,
            }}
          >
            <Text
              style={{
                color: canStart ? t.correctText : t.textGhost,
                fontSize: f.body,
                fontWeight: '800',
              }}
            >
              {mode === 'listening'
                ? triLang(lang, { ru: 'Начать слушание', uk: 'Почати слухання', es: 'Empezar a escuchar' })
                : mode === 'blitz'
                  ? triLang(lang, { ru: 'В блиц!', uk: 'У бліц!', es: '¡Al blitz!' })
                  : triLang(lang, { ru: 'Начать тренировку', uk: 'Почати тренування', es: 'Empezar' })}
            </Text>
          </Pressable>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
