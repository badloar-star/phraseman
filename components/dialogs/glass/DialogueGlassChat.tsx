import React from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { nestedBoxShadow, plateBoxShadow } from '../../v2/ShadowSurface';
import { colorContrast } from '../../../constants/color_contrast';
import type { DialogueGlass } from './DialogueGlassKit';

// зачем (владелец 2026-09-30, макет dialogs.html C1–C17/F2): лента диалога — реплика
// собеседника слева с мини-аватаром 40 и подписью имени над пузырём, своя — справа
// светлым нейтральным пузырём с подписью «Вы»; «печатает» — три живые точки. Только вид:
// что внутри пузыря (текст/голосовое) и что делает нажатие, решает экран.

export type DialogueGlassAuthor = 'learner' | 'persona' | 'assistant';

/** Мини-аватар собеседника `.msg .av` — 40, круг тона темы. Реального лица в данных V2 нет. */
// зачем (Макеты 6dcbedb9f, dialogs-014/022/029): у собеседника сценария — значок сценки; без него — прежний значок человека.
export function DialogueGlassAvatar({ glass, compact, icon }: Readonly<{ glass: DialogueGlass; compact?: boolean; icon?: React.ComponentProps<typeof Ionicons>['name'] }>) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { backgroundColor: glass.opaqueControl, marginTop: compact ? 6 : 25 }]}
    >
      <Ionicons name={icon ?? 'person-outline'} size={20} color={glass.secondary} />
    </View>
  );
}

/** Цвета пузыря по автору: «Вы» — светлый (lightTint), собеседник — плашка с тенью. */
export function dialogueGlassBubbleInk(glass: DialogueGlass, author: DialogueGlassAuthor): string {
  if (author !== 'learner') return glass.text;
  // зачем (Макеты 18.10, light_turn_error.png; правило «текст ≥ 4,5»): в светлом оформлении градиентных тем пузырь «Вы» (lightTint) тёмный,
  // а ctaInk тоже тёмный — 1,0–1,3:1, текст не читается (14 сочетаний из 138). Если ctaInk не держит 4,5 на пузыре — светлый фон темы (bg).
  const tint = /^#[0-9a-f]{8}$/i.test(glass.lightTint) ? glass.lightTint.slice(0, 7) : glass.lightTint;
  return colorContrast(glass.ctaInk, tint) >= 4.5 ? glass.ctaInk : glass.bg;
}

export interface DialogueGlassBubbleProps {
  glass: DialogueGlass;
  author: DialogueGlassAuthor;
  /** Подпись над пузырём (`.msg .who`): имя собеседника или «Вы». */
  who?: string;
  /** Мини-аватар слева — только у собеседника сценария. */
  avatar?: boolean;
  /** Значок в аватаре (значок сценки); нет — значок человека. */
  avatarIcon?: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
  /** Ряд кнопок под пузырём (`.acts`). */
  actions?: React.ReactNode;
  /** Короткая отметка под пузырём («Не отправлено», dialogs-035). */
  note?: string;
  testID?: string;
}

/** Реплика `.msg`: ширина пузыря ≤ 78%, радиус 20, поля 14/18. */
export function DialogueGlassBubble({ glass, author, who, avatar, avatarIcon, children, actions, note, testID }: DialogueGlassBubbleProps) {
  const learner = author === 'learner';
  const bubble: ViewStyle = learner
    ? { backgroundColor: glass.lightTint }
    : {
      // зачем (стиль «Тень»): пузырь собеседника — плашка с тенью, без кромки
      backgroundColor: glass.plateFillFrom,
      boxShadow: plateBoxShadow(glass),
    };
  return (
    <View testID={testID} style={[styles.row, learner ? styles.rowEnd : styles.rowStart]}>
      {avatar && !learner ? <DialogueGlassAvatar glass={glass} compact={!who} icon={avatarIcon} /> : null}
      <View style={[styles.column, learner ? styles.columnEnd : null]}>
        {who ? (
          <Text maxFontSizeMultiplier={1.3} style={[styles.who, { color: glass.secondary }]}>{who}</Text>
        ) : null}
        <View style={[styles.bubble, bubble]}>{children}</View>
        {note ? (
          <View testID={testID ? `${testID}-note` : undefined} style={[styles.note, learner ? styles.noteEnd : null]}>
            <Ionicons name="alert-circle-outline" size={14} color={glass.secondary} />
            <Text maxFontSizeMultiplier={1.4} style={[styles.noteText, { color: glass.secondary }]}>{note}</Text>
          </View>
        ) : null}
        {actions ? <View style={[styles.actions, learner ? styles.actionsEnd : null]}>{actions}</View> : null}
      </View>
    </View>
  );
}

/** Текст реплики 17/24, вес 500 — цвет по автору. */
export function DialogueGlassBubbleText({ glass, author, children }: Readonly<{
  glass: DialogueGlass; author: DialogueGlassAuthor; children: React.ReactNode;
}>) {
  return (
    <Text maxFontSizeMultiplier={1.5} style={[styles.bubbleText, { color: dialogueGlassBubbleInk(glass, author) }]}>
      {children}
    </Text>
  );
}

/** Кнопка под репликой `.ab` (36 высотой в макете, область нажатия расширена до 44). */
export function dialogueGlassActionStyle(glass: DialogueGlass, live: boolean): ViewStyle {
  return {
    minHeight: 36,
    minWidth: 40,
    paddingHorizontal: 14, // dialogs.html `.ab`: поля 0·14
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: live ? glass.cta : glass.opaqueControl,
    // зачем (стиль «Тень»): кнопка под репликой — вложенная плашка с малой тенью
    boxShadow: nestedBoxShadow(glass),
  };
}

/**
 * Круглая кнопка строки ввода `.ibar .rbtn` — 52: микрофон слева и «↑» справа.
 * `live` — белая заливка (идёт запись / можно отправить), иначе тон темы; обе с малой тенью, без кромки.
 */
export function dialogueGlassRoundButtonStyle(glass: DialogueGlass, live: boolean): ViewStyle {
  return {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: live ? glass.cta : glass.opaqueControl,
    // зачем (стиль «Тень»): кромка круглой кнопки снята — отделяет малая тень
    boxShadow: nestedBoxShadow(glass),
  };
}

/** Поле ввода `.ibar .fld` — 52, радиус 26. */
// зачем: стиль идёт в TextInput, а не в View — ViewStyle.userSelect (string) не совместим с TextStyle.
export function dialogueGlassFieldStyle(glass: DialogueGlass): TextStyle {
  return {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    // зачем (сверка dialogs-014: «плейсхолдер переносится на 2 строки, вторая отрезана»): на узком экране «Напиши или зажми микрофон» в одну строку
    // не помещается; шрифт не сжимаем и текст не режем — поле многострочное и растёт по тексту (до 132), строка по центру по высоте
    maxHeight: 132,
    paddingVertical: 14,
    textAlignVertical: 'center',
    borderRadius: 26,
    paddingHorizontal: 18,
    // зачем (стиль «Тень»): поле ввода — плашка с тенью вместо кромки
    backgroundColor: glass.plateFillFrom,
    boxShadow: plateBoxShadow(glass) as unknown as string /* зачем: типы RN для стиля TextInput знают boxShadow только строкой, на деле массив работает */,
  };
}

const DOT_DELAYS = [0, 180, 360] as const;

/** «Печатает» `.typing`: три точки подпрыгивают по кругу 1,1 с. Уважает «Уменьшить движение». */
export function DialogueGlassTyping({ glass, testID, avatar, avatarIcon, caption }: Readonly<{
  glass: DialogueGlass; testID: string; avatar?: boolean; avatarIcon?: React.ComponentProps<typeof Ionicons>['name'];
  /** зачем (координатор 18.10, К2): мягкая подпись под «…», когда ответ идёт долго («Мила печатает…» / «Отвечает дольше обычного»). Без кнопок. */
  caption?: string | null;
}>) {
  const values = React.useRef(DOT_DELAYS.map(() => new Animated.Value(0))).current;
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (alive) setReduceMotion(enabled); })
      .catch((error: unknown) => {
        // Нет ответа от системы — оставляем анимацию включённой, но причину видно в логе.
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[DIALOG-GLASS] reduce motion unavailable', error);
      });
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    if (reduceMotion) return undefined;
    const loops = values.map((value, index) => Animated.loop(Animated.sequence([
      Animated.delay(DOT_DELAYS[index] ?? 0),
      Animated.timing(value, { toValue: 1, duration: 330, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 330, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(440 - (DOT_DELAYS[index] ?? 0)),
    ])));
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [reduceMotion, values]);

  return (
    <View testID={testID} style={[styles.row, styles.rowStart]}>
      {avatar ? <DialogueGlassAvatar glass={glass} compact icon={avatarIcon} /> : null}
      <View style={styles.typingColumn}>
      <View
        style={[styles.typing, {
          backgroundColor: glass.plateFillFrom,
          boxShadow: plateBoxShadow(glass), // зачем (стиль «Тень»): «печатает» — плашка с тенью, без кромки
        }]}
      >
        {values.map((value, index) => (
          <Animated.View
            key={DOT_DELAYS[index]}
            style={[styles.dot, {
              backgroundColor: glass.secondary,
              opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
              transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
            }]}
          />
        ))}
      </View>
      {caption ? (
        <Text
          testID={`${testID}-caption`}
          accessibilityLiveRegion="polite"
          style={[styles.typingCaption, { color: glass.secondary }]}
          maxFontSizeMultiplier={1.3}
        >
          {caption}
        </Text>
      ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18 },
  rowStart: { justifyContent: 'flex-start' },
  rowEnd: { justifyContent: 'flex-end' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  column: { maxWidth: '78%', minWidth: 0 },
  columnEnd: { alignItems: 'flex-end' },
  // `.msg .who` 14/19/500 — шкала D145: 13/18, вес 500.
  who: { fontSize: 13, lineHeight: 18, fontWeight: '500', marginHorizontal: 6, marginBottom: 6 },
  bubble: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14 },
  // `.msg .bub` 17/24/500 — шкала D145: 16/22, вес 500.
  bubbleText: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  actionsEnd: { justifyContent: 'flex-end' },
  note: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  noteEnd: { justifyContent: 'flex-end' },
  noteText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 52, paddingHorizontal: 20, borderRadius: 20 },
  // зачем (К2): подпись под «…» — шкала D145 (13/18), колонка не растягивает пузырь на всю ширину.
  typingColumn: { alignItems: 'flex-start', gap: 6, flexShrink: 1 },
  typingCaption: { fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
