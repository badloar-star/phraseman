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
import type { ImageSourcePropType } from 'react-native';
import { Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import {
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { FC_TIMING } from '../../constants/flashcards_motion';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { FONT_SCALE, useTheme } from '../../components/ThemeContext';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { fcHaptic } from './SoundService';
import { isLowPowerEffective } from './low_power';
// зачем (2026-08-16, motionVariant='hybrid'): гибрид «Световод + Чекан» — тот же
// контент шита (наборы/размер/CTA) поднимается каркасом HybridSheetShell вместо
// самодельного Modal+backdrop+Reanimated.View. Минимальная вставка по правилу
// владельца: существующий 'classic' JSX не тронут, hybrid-ветка — отдельный
// early return чуть ниже, использующий те же state/handlers.
import HybridSheetShell from '../../components/modal_fx/HybridSheetShell';
import PressableHybrid from '../../components/PressableHybrid';
import { compactDeckCountLabel } from '../../lib/flashcards/compact_deck_count_label';
import DeckSelectionTile from './DeckSelectionTile';
import { actionBoxShadow, nestedBoxShadow, plateBoxShadow } from '../../components/v2/ShadowSurface';
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
  /** Реальная рубашка набора; отсутствует у системных источников. */
  coverImage?: ImageSourcePropType;
  /** Стабильная ревизия обложки для тёплого кэша. */
  coverRevision?: string;
  sourceKind: 'saved' | 'custom' | 'pack';
  /** D127: 'none' — набор «без языка»; режимы со звуком его не предлагают. */
  packLanguage?: 'none';
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
  /** Устарело (04.10): ветка 'classic' удалена, шит всегда гибрид; свойство оставлено, чтобы не ломать вызовы витрины. */
  motionVariant?: 'classic' | 'hybrid';
  // зачем (PM-086, владелец 2026-09-24): showsEnergyCostForPreset удалён —
  // жил только ради ценника энергии над кнопкой старта, который убрали.
};

/**
 * Подписи шита для режима «Говорить» (владелец, 2026-08-17). Вынесены в функции,
 * потому что шит рендерится двумя ветками (hybrid / classic) и текст нужен в обеих.
 */
const SPEAKING_SHEET_HEADING = (lang: Lang) =>
  triLang(lang, {
    ru: 'Что говорим?', uk: 'Що говоримо?', en: 'What do we say?', es: '¿Qué decimos?',
    'pt-BR': 'O que vamos falar?', vi: 'Nói gì?', id: 'Bicara apa?',
    tr: 'Ne söylüyoruz?', pl: 'Co mówimy?',
  });
const SPEAKING_SHEET_START = (lang: Lang) =>
  triLang(lang, {
    ru: 'Начать говорить', uk: 'Почати говорити', en: 'Start speaking', es: 'Empezar a hablar',
    'pt-BR': 'Começar a falar', vi: 'Bắt đầu nói', id: 'Mulai bicara',
    tr: 'Konuşmaya başla', pl: 'Zacznij mówić',
  });

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
  motionVariant = 'hybrid',
}: Props) {
  const { liquidGlassThemeId, fontSize, uiScale } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const textScale = (FONT_SCALE[fontSize] / FONT_SCALE.medium) * uiScale;
  const insets = useStableSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
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


  const toggleDeck = useCallback((id: FcDeckId) => {
    setDeckIds((prev) => toggleDeckSelection(prev, id));
  }, []);

  /** «Выбрано 3 · 84 карточки» — суммарно, с дедупликацией по стабильному id. */
  const summary = useMemo(() => summarizeDeckSelection(decks, deckIds), [decks, deckIds]);
  const selectedIds = useMemo(() => new Set<FcDeckId>(deckIds), [deckIds]);
  /** Нечего тренировать (0 выбрано или в выбранном нет карточек) → старт заблокирован. */
  const canStart = summary.deckCount > 0 && summary.cardCount > 0 && !starting;
  const selectedPreset = useMemo<FcModePreset>(() => ({
    deckId: deckIds[0],
    deckIds: [...deckIds],
    size,
  }), [deckIds, size]);
  const handleStart = useCallback(() => {
    if (!canStart || deckIds.length === 0) return;
    setStarting(true);
    fcHaptic('tap');
    // Оптимистик: сохраняем пресет и стартуем не дожидаясь записи (очередь mode_prefs)
    void setLastPreset(mode, selectedPreset);
    onStart(selectedPreset);
  }, [canStart, deckIds.length, mode, onStart, selectedPreset]);

  if (!mounted) return null;

  const sheetHeading = mode === 'speaking'
      ? SPEAKING_SHEET_HEADING(lang)
    : mode === 'blitz'
      ? triLang(lang, {
          ru: 'Что в блице?',
          uk: 'Що в бліці?',
          en: 'What’s in the blitz?',
          es: '¿Qué entra en el blitz?',
          'pt-BR': 'O que entra no blitz?',
          vi: 'Blitz gồm những gì?',
          id: 'Apa isi blitz?',
          tr: 'Blitz’te ne olsun?',
          pl: 'Co w blitzu?',
        })
      : triLang(lang, {
          ru: 'Что тренируем?',
          uk: 'Що тренуємо?',
          en: 'What are we practicing?',
          es: '¿Qué entrenamos?',
          'pt-BR': 'O que vamos treinar?',
          vi: 'Luyện gì?',
          id: 'Latih apa?',
          tr: 'Ne çalışalım?',
          pl: 'Co trenujemy?',
        });

  const startLabel = mode === 'speaking'
      ? SPEAKING_SHEET_START(lang)
    : mode === 'blitz'
      ? triLang(lang, {
          ru: 'В блиц!', uk: 'У бліц!', en: 'To the blitz!', es: '¡Al blitz!',
          'pt-BR': 'Ao blitz!', vi: 'Vào blitz!', id: 'Mulai blitz!',
          tr: 'Blitz’e!', pl: 'Do blitza!',
        })
      : triLang(lang, {
          ru: 'Начать тренировку', uk: 'Почати тренування', en: 'Start practice', es: 'Empezar',
          'pt-BR': 'Começar o treino', vi: 'Bắt đầu luyện tập',
          id: 'Mulai latihan', tr: 'Alıştırmaya başla', pl: 'Zacznij trening',
        });

  const closeLabel = triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
    vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });

  const summaryLabel = summary.deckCount > 0
    ? deckSelectionLabel(lang, summary)
    : triLang(lang, {
        ru: 'Отметьте один или несколько наборов',
        uk: 'Позначте один або кілька наборів',
        en: 'Select one or more packs',
        es: 'Marca uno o varios packs',
        'pt-BR': 'Marque um ou mais pacotes',
        vi: 'Chọn một hoặc nhiều bộ thẻ',
        id: 'Tandai satu atau beberapa set',
        tr: 'Bir veya birkaç set işaretle',
        pl: 'Zaznacz jeden lub kilka zestawów',
      });

  const cardsInSessionLabel = triLang(lang, {
    ru: 'Карточек в сессии',
    uk: 'Карток у сесії',
    en: 'Cards per session',
    es: 'Tarjetas por sesión',
    'pt-BR': 'Cartões por sessão',
    vi: 'Số thẻ mỗi phiên',
    id: 'Kartu per sesi',
    tr: 'Oturum başına kart',
    pl: 'Fiszek na sesję',
  });

  // зачем: гибрид «Световод + Чекан» — тот же контент (заголовок/наборы/размер/
  // CTA), но каркас HybridSheetShell (подъём из света без отскока, drag-to-dismiss
  // встроен) вместо самодельного Modal+backdrop+Reanimated.View выше. 'classic'
  // ниже не тронут — минимальная вставка по правилу владельца.
  // зачем (REVIEW_UI_11, 04.10): ветка 'classic' (самодельный Modal с цветной рамкой и ужатием шрифта) была
  // недостижима в боевых экранах и нарушала правила владельца — удалена; шит всегда рисуется утверждённым гибридом.
  const normalizedBottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const hybridContentMaxHeight = Math.max(
    0,
    Math.min(winH - insets.top, winH * 0.86) - 20 - normalizedBottomInset - 28,
  );
  const hybridDockMaxHeight = Math.max(0, Math.min(240, hybridContentMaxHeight * 0.55));
  const hybridBodyMaxHeight = Math.max(0, hybridContentMaxHeight - hybridDockMaxHeight);
  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={closeLabel}
      testID="fc-deck-sheet"
      material="liquid-glass-opaque"
      backdropAccessible={false}
    >
      {({ requestDismiss }) => (
        <View
          testID="fc-deck-picker-safe-frame"
          style={{
            maxHeight: hybridContentMaxHeight,
            minHeight: 0,
            flexShrink: 1,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            overflow: 'hidden',
          }}
        >
          <ScrollView
            testID="fc-deck-picker-body"
            decelerationRate="fast"
            style={{ flexGrow: 0, flexShrink: 0, minHeight: 0, maxHeight: hybridBodyMaxHeight }}
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  testID="fc-deck-picker-heading"
                  style={{ color: glass.text, fontSize: 22 * textScale, lineHeight: 28 * textScale, fontWeight: '700' }}
                >
                  {sheetHeading}
                </Text>
                <Text
                  testID="fc-deck-selection-summary"
                  accessible
                  style={{
                    color: summary.deckCount > 0 ? glass.secondary : glass.mutedText,
                    fontSize: 16 * textScale,
                    lineHeight: 21 * textScale,
                    fontWeight: '400',
                    marginTop: 4,
                  }}
                >
                  {summaryLabel}
                </Text>
              </View>
              <PressableHybrid
                testID="fc-deck-sheet-close"
                accessibilityLabel={closeLabel}
                variant="icon"
                withHaptic={false}
                withSound={false}
                onPress={requestDismiss}
                style={{
                  width: 44,
                  height: 44,
                  alignSelf: 'center',
                  borderRadius: 22,
                  backgroundColor: glass.plateFillFrom,
                  boxShadow: plateBoxShadow(glass), // зачем (Тень 12.10): кнопка закрытия без кромки
                }}
                contentStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={18} color={glass.secondary} />
              </PressableHybrid>
            </View>

            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'column' }}>
              {decks.map((d, i) => (
                <DeckSelectionTile
                  key={d.deckId}
                  deck={d}
                  index={i}
                  selected={selectedIds.has(d.deckId)}
                  onToggle={toggleDeck}
                  simpleMotion={simpleMotion}
                  t={t}
                  f={f}
                  presentation="compact-liquid-glass"
                  liquidGlass={glass}
                  textScale={textScale}
                  countLabel={compactDeckCountLabel(lang, d.count)}
                />
              ))}
            </View>
          </ScrollView>

          <ScrollView
            testID="fc-deck-picker-dock"
            style={{ flexGrow: 0, flexShrink: 0, minHeight: 0, maxHeight: hybridDockMaxHeight }}
            contentContainerStyle={{ paddingTop: mode === 'blitz' ? 8 : 16 }}
            showsVerticalScrollIndicator={false} decelerationRate="fast"
          >
            {mode === 'blitz' ? null : (
              <Text
                style={{
                  color: glass.text,
                  fontSize: 16 * textScale,
                  lineHeight: 21 * textScale,
                  fontWeight: '700',
                  marginHorizontal: 4,
                  marginBottom: 10,
                }}
              >
                {cardsInSessionLabel}
              </Text>
            )}
            {mode === 'blitz' ? null : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {FC_SESSION_SIZES.map((n) => {
                  const active = n === size;
                  return (
                    <PressableHybrid
                      key={n}
                      testID={`fc-deck-size-${n}`}
                      variant="chip"
                      onPress={() => setSize(n)}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        borderRadius: 22,
                        backgroundColor: active ? glass.cta : glass.opaqueControl,
                        boxShadow: active ? actionBoxShadow(glass) : nestedBoxShadow(glass), // зачем (Тень 12.10): чип без кромки
                      }}
                      contentStyle={{ flex: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text
                        style={{
                          color: active ? glass.ctaInk : glass.text,
                          fontSize: 16 * textScale,
                          lineHeight: 21 * textScale,
                          fontWeight: '700',
                        }}
                      >
                        {n}
                      </Text>
                    </PressableHybrid>
                  );
                })}
              </View>
            )}

            <PressableHybrid
              testID="fc-deck-start"
              variant="primary"
              disabled={!canStart}
              onPress={handleStart}
              style={{
                minHeight: 48,
                marginTop: 20,
                borderRadius: 24,
                backgroundColor: canStart ? glass.cta : glass.opaqueControl,
                boxShadow: canStart ? actionBoxShadow(glass) : undefined, // зачем (Тень 12.10): выключенная кнопка — плотный тон без кромки
              }}
              contentStyle={{ minHeight: 48, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text
                testID="fc-deck-start-label"
                style={{
                  color: canStart ? glass.ctaInk : glass.mutedText,
                  fontSize: 16 * textScale,
                  lineHeight: 23 * textScale,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                {startLabel}
              </Text>
            </PressableHybrid>
          </ScrollView>
        </View>
      )}
    </HybridSheetShell>
  );
}
