/**
 * cards-2.1 (§7.2 SPEC_2_1): выбор режима озвучки «Слушания» — ОДНА кнопка
 * вместо четырёх чипов (EN→RU / RU→EN / EN×2 / только EN).
 *
 * Кнопка показывает текущий режим; тап — выпадающий список всех вариантов с
 * отметкой выбранного. Анимация: пружина контейнера + стаггер строк от ОДНОГО
 * общего драйвера `progress` (одна анимация вместо N) — только transform/opacity,
 * всё на UI-потоке Reanimated (§8).
 *
 * Закрытие: тап по варианту, тап по фону, системная «назад» (Modal.onRequestClose).
 * Список рендерится в Modal и позиционируется по замеру кнопки: если кнопка в
 * нижней половине экрана — раскрывается ВВЕРХ (иначе список уехал бы за экран).
 *
 * Деградация: reduceMotion / слабое устройство → timing вместо пружины, без
 * стаггера (список просто появляется).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { FC_TIMING } from '../../constants/flashcards_motion';
import { fcHaptic } from './SoundService';
import { isLowPowerEffective } from './low_power';
import { useFcReduceMotion } from './PhraseCard';
import type { ListeningOrder } from './listening_machine';
import {
  listeningModeOptions,
  selectListeningMode,
  type ListeningModeOption,
} from './listening_mode_options';

export type ListeningModePickerProps = {
  value: ListeningOrder;
  onChange: (order: ListeningOrder) => void;
  lang: Lang;
  t: Theme;
  f: { body: number; sub: number; caption: number };
  /** Акцент экрана (по умолчанию — фиолетовый «Слушания»). */
  accent?: string;
  /** Список открыт/закрыт — экрану может быть нужно (например, не менять фокус). */
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
};

const LIST_SPRING = { damping: 20, stiffness: 260, mass: 0.85 } as const;
const CHEVRON_SPRING = { damping: 18, stiffness: 300, mass: 0.7 } as const;
const LIST_MIN_W = 248;
const LIST_MARGIN = 12;
const ANCHOR_GAP = 10;
/** Смещение строки на входе, px (в сторону кнопки). */
const ROW_SHIFT = 14;
/** Доля прогресса, «съедаемая» стаггером, — дальше все строки едут вместе. */
const ROW_STAGGER = 0.1;

type Anchor = { x: number; y: number; w: number; h: number };

type RowProps = {
  option: ListeningModeOption;
  index: number;
  selected: boolean;
  progress: SharedValue<number>;
  stagger: boolean;
  /** +1 — список раскрыт вверх (строки приезжают снизу). */
  dir: 1 | -1;
  t: Theme;
  f: ListeningModePickerProps['f'];
  accent: string;
  onPick: (id: ListeningOrder) => void;
};

function ModeRow({ option, index, selected, progress, stagger, dir, t, f, accent, onPick }: RowProps) {
  const start = stagger ? Math.min(0.6, index * ROW_STAGGER) : 0;
  const aStyle = useAnimatedStyle(() => {
    const raw = (progress.value - start) / Math.max(0.001, 1 - start);
    const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    return {
      opacity: p,
      transform: [{ translateY: (1 - p) * ROW_SHIFT * dir }, { scale: 0.97 + 0.03 * p }],
    };
  }, [start, dir]);

  return (
    <Reanimated.View style={aStyle}>
      <Pressable
        testID={`fc-listen-mode-option-${option.id}`}
        accessibilityLabel={`qa-fc-listen-mode-option-${option.id}`}
        accessible
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onPick(option.id)}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: selected ? `${accent}1F` : pressed ? t.bgSurface2 : 'transparent',
          },
        ]}
      >
        <View style={[styles.rowIcon, { backgroundColor: selected ? `${accent}2E` : t.bgSurface2 }]}>
          <Ionicons name={option.icon as any} size={16} color={selected ? accent : t.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: selected ? accent : t.textPrimary, fontSize: f.sub, fontWeight: selected ? '800' : '700' }}
          >
            {option.label}
          </Text>
          <Text numberOfLines={2} style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }}>
            {option.hint}
          </Text>
        </View>
        {selected ? <Ionicons name="checkmark-circle" size={20} color={accent} /> : <View style={{ width: 20 }} />}
      </Pressable>
    </Reanimated.View>
  );
}

export default function ListeningModePicker({
  value,
  onChange,
  lang,
  t,
  f,
  accent = '#9C6ADE',
  onOpenChange,
  disabled,
}: ListeningModePickerProps) {
  const { width: winW, height: winH } = useWindowDimensions();
  const reduceMotion = useFcReduceMotion();
  const simpleMotion = reduceMotion || isLowPowerEffective();

  const options = useMemo(() => listeningModeOptions(lang), [lang]);
  const current = useMemo(
    () => options.find((o) => o.id === value) ?? options[0]!,
    [options, value],
  );

  const btnRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);
  const chevron = useSharedValue(0);

  useEffect(() => {
    onOpenChange?.(mounted);
  }, [mounted, onOpenChange]);

  const open = useCallback(() => {
    if (disabled) return;
    fcHaptic('tap');
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      setMounted(true);
      progress.value = simpleMotion
        ? withTiming(1, { duration: FC_TIMING.fast })
        : withSpring(1, LIST_SPRING);
      chevron.value = simpleMotion ? withTiming(1, { duration: FC_TIMING.fast }) : withSpring(1, CHEVRON_SPRING);
    };
    const node = btnRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, w, h) => {
        if (Number.isFinite(x) && Number.isFinite(y) && w > 0) setAnchor({ x, y, w, h });
        show();
      });
      // Страховка: колбэк measureInWindow может не прийти (нода вне дерева) —
      // список всё равно откроется, просто по фолбэк-позиции.
      setTimeout(show, 80);
    } else {
      show();
    }
  }, [disabled, simpleMotion, progress, chevron]);

  const close = useCallback(() => {
    chevron.value = withTiming(0, { duration: FC_TIMING.fast });
    progress.value = withTiming(0, { duration: FC_TIMING.fast }, (finished) => {
      'worklet';
      if (finished) runOnJS(setMounted)(false);
    });
  }, [progress, chevron]);

  const pick = useCallback(
    (id: ListeningOrder) => {
      const next = selectListeningMode(value, id);
      fcHaptic('tap');
      close();
      if (next !== value) onChange(next);
    },
    [value, onChange, close],
  );

  // ── Геометрия списка ──────────────────────────────────────────────────────
  const listW = Math.min(
    Math.max(LIST_MIN_W, anchor?.w ?? LIST_MIN_W),
    Math.max(LIST_MIN_W, winW - LIST_MARGIN * 2),
  );
  const openUp = anchor ? anchor.y + anchor.h / 2 > winH * 0.5 : true;
  const left = anchor
    ? Math.min(Math.max(LIST_MARGIN, anchor.x + anchor.w / 2 - listW / 2), Math.max(LIST_MARGIN, winW - listW - LIST_MARGIN))
    : Math.max(LIST_MARGIN, (winW - listW) / 2);
  const vertical = anchor
    ? openUp
      ? { bottom: Math.max(LIST_MARGIN, winH - anchor.y + ANCHOR_GAP) }
      : { top: anchor.y + anchor.h + ANCHOR_GAP }
    : { bottom: 140 };

  const listStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * (openUp ? 10 : -10) },
      { scale: 0.94 + 0.06 * progress.value },
    ],
  }), [openUp]);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.55 }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  return (
    <>
      <View ref={btnRef} collapsable={false} style={styles.btnWrap}>
        <Pressable
          testID="fc-listen-mode-button"
          accessibilityLabel="qa-fc-listen-mode-button"
          accessible
          accessibilityRole="button"
          accessibilityState={{ expanded: mounted, disabled: !!disabled }}
          disabled={disabled}
          onPress={open}
          style={({ pressed }) => [
            styles.btn,
            {
              borderColor: mounted ? accent : t.border,
              backgroundColor: pressed || mounted ? `${accent}1A` : t.bgSurface,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name={current.icon as any} size={16} color={accent} />
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color: t.textMuted, fontSize: f.caption - 1, fontWeight: '600' }} numberOfLines={1}>
              {triLang(lang, { ru: 'Режим озвучки', uk: 'Режим озвучення', es: 'Modo de voz' })}
            </Text>
            <Text
              testID="fc-listen-mode-button-label"
              style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}
              numberOfLines={1}
            >
              {current.label}
            </Text>
          </View>
          <Reanimated.View style={chevronStyle}>
            <Ionicons name="chevron-up" size={18} color={t.textMuted} />
          </Reanimated.View>
        </Pressable>
      </View>

      <Modal
        visible={mounted}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        <Pressable
          testID="fc-listen-mode-backdrop"
          accessibilityLabel="qa-fc-listen-mode-backdrop"
          accessible
          onPress={close}
          style={StyleSheet.absoluteFill}
        >
          <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]} />
        </Pressable>
        <Reanimated.View
          testID="fc-listen-mode-list"
          style={[
            styles.list,
            vertical,
            {
              left,
              width: listW,
              backgroundColor: t.bgCard,
              borderColor: t.border,
            },
            listStyle,
          ]}
        >
          {options.map((o, i) => (
            <ModeRow
              key={o.id}
              option={o}
              index={openUp ? options.length - 1 - i : i}
              selected={o.id === value}
              progress={progress}
              stagger={!simpleMotion}
              dir={openUp ? 1 : -1}
              t={t}
              f={f}
              accent={accent}
              onPick={pick}
            />
          ))}
        </Reanimated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btnWrap: { alignSelf: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 200,
  },
  list: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
