/**
 * cards-2.0 (E8): DeckPickerSheet — bottom-sheet выбора набора + размера сессии
 * (§3.1 п.5, §3.5 мастер-плана). Свой, без сторонних либ: Reanimated translateY
 * (spring) + backdrop opacity — только transform/opacity на UI-потоке (принцип 3).
 *
 * Открывается по long-press / иконке ⚙ на плитке режима — быстрый старт идёт
 * мимо него (принцип 2: ≤2 тапа до тренировки). Выбор сохраняется в
 * fc_mode_prefs_v1.lastPreset — следующий тап по режиму стартует с ним.
 *
 * Наборы: Слабые (due тренера) / Все сохранённые / Мои карточки / Пак X (owned).
 * Размер: 10/15/20. reduceMotion/web — timing вместо spring (без оверскролл-хвоста).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { FC_TIMING } from '../../constants/flashcards_motion';
import { fcHaptic } from './SoundService';
import {
  FC_SESSION_SIZES,
  FC_DEFAULT_SESSION_SIZE,
  setLastPreset,
  type FcDeckId,
  type FcModePreset,
  type FcPresetMode,
  type FcSessionSize,
} from './mode_prefs';

export type DeckSheetOption = {
  deckId: FcDeckId;
  title: string;
  /** Кол-во карточек в наборе (бейдж; 0 — набор задизейблен). */
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Старт сессии с выбранным пресетом (после сохранения в fc_mode_prefs_v1). */
  onStart: (preset: FcModePreset) => void;
  decks: DeckSheetOption[];
  /** Последний пресет — предвыбор при открытии. */
  initialPreset?: FcModePreset | null;
  lang: Lang;
  t: Theme;
  f: { h3: number; body: number; sub: number; caption: number };
  reduceMotion?: boolean;
  /** E10: чей пресет сохраняем и какой CTA показываем (дефолт — тренер). */
  mode?: FcPresetMode;
};

const SHEET_SPRING = { damping: 22, stiffness: 260, mass: 0.9 } as const;
const SHEET_HIDE_Y = 620;

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
  const insets = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  /** Modal живёт чуть дольше visible — успевает проиграться анимация закрытия. */
  const [mounted, setMounted] = useState(visible);
  const [deckId, setDeckId] = useState<FcDeckId>(initialPreset?.deckId ?? 'weak');
  const [size, setSize] = useState<FcSessionSize>(initialPreset?.size ?? FC_DEFAULT_SESSION_SIZE);
  const [starting, setStarting] = useState(false);

  const ty = useSharedValue(SHEET_HIDE_Y);
  const backdrop = useSharedValue(0);

  const unmount = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setStarting(false);
      // Предвыбор из последнего пресета (мог обновиться между открытиями).
      // E10: один шит на несколько режимов — выбор прошлого открытия может
      // отсутствовать в текущем списке (у слушания нет 'weak') → первый набор.
      const isListed = (id: FcDeckId | undefined | null) => !!id && decks.some((d) => d.deckId === id);
      if (initialPreset && isListed(initialPreset.deckId)) {
        setDeckId(initialPreset.deckId);
        setSize(initialPreset.size);
      } else if (!isListed(deckId) && decks.length > 0) {
        setDeckId(decks[0].deckId);
      }
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: FC_TIMING.base });
      ty.value = withTiming(SHEET_HIDE_Y, { duration: FC_TIMING.base }, (fin) => {
        if (fin) runOnJS(unmount)();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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

  /** Выбранный набор недоступен (0 карточек) → кнопка старта задизейблена. */
  const selected = decks.find((d) => d.deckId === deckId) ?? null;
  const canStart = !!selected && selected.count > 0 && !starting;

  const handleStart = useCallback(() => {
    if (!canStart || !selected) return;
    setStarting(true);
    fcHaptic('tap');
    const preset: FcModePreset = { deckId: selected.deckId, size };
    // Оптимистик: сохраняем пресет и стартуем не дожидаясь записи (очередь mode_prefs)
    void setLastPreset(mode, preset);
    onStart(preset);
  }, [canStart, selected, size, onStart, mode]);

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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '800' }}>
              {mode === 'listening'
                ? triLang(lang, { ru: 'Что слушаем?', uk: 'Що слухаємо?', es: '¿Qué escuchamos?' })
                : mode === 'blitz'
                  ? triLang(lang, { ru: 'Колода для блица', uk: 'Колода для бліцу', es: 'Mazo para el blitz' })
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

          {/* Наборы */}
          <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              {decks.map((d) => {
                const active = d.deckId === deckId;
                const empty = d.count <= 0;
                return (
                  <Pressable
                    key={d.deckId}
                    testID={`fc-deck-option-${d.deckId}`}
                    accessibilityLabel={`qa-fc-deck-option-${d.deckId}`}
                    accessible
                    disabled={empty}
                    onPress={() => {
                      fcHaptic('tap');
                      setDeckId(d.deckId);
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
                      <Ionicons name={d.icon} size={18} color={active ? t.accent : t.textMuted} />
                    </View>
                    <Text
                      style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: active ? '800' : '600' }}
                      numberOfLines={1}
                    >
                      {d.title}
                    </Text>
                    <Text style={{ color: active ? t.accent : t.textMuted, fontSize: f.sub, fontWeight: '800' }}>
                      {d.count}
                    </Text>
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={active ? t.accent : t.textGhost}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Размер сессии (блиц — на время, размер не выбирается: E12 §3.9) */}
            {mode === 'blitz' ? (
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600', marginTop: 14 }}>
                {triLang(lang, {
                  ru: '60 секунд · 4 варианта · 3 жизни',
                  uk: '60 секунд · 4 варіанти · 3 життя',
                  es: '60 segundos · 4 opciones · 3 vidas',
                })}
              </Text>
            ) : (
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
