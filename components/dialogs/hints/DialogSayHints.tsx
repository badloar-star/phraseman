// DialogSayHints.tsx — постоянные подсказки «Можно сказать…» прямо над полем ввода Диалогов.
// зачем (владелец 24.10, дословно через координатора: «подсказки, чтобы внизу над полем ввода появлялся мелкий текст — что можно написать по контексту, с подсказкой, что это значит»;
// «постоянно должны быть подсказки, потому что я ноль, но хочу учиться»): 1–3 фразы на изучаемом языке, под каждой — смысл на родном; тап по фразе вставляет её в поле
// (отправляет человек сам — реплика остаётся его). Строка не прячется после «застрял» (прежнее правило помощника 14.09 заменено словом 24.10), всегда видна, пока есть фразы.
// Вёрстка: одна горизонтальная лента карточек (две строки: фраза 14/19 и смысл 13/17) — выше она не растёт, клавиатуре и ленте реплик места хватает на 360 dp; шрифт не сжимается,
// длинная фраза переносится на следующую строку в своей карточке (до 3 строк). Без обводок — плашка с малой тенью, как кнопки под репликой. Источник фраз — Ядро, сети здесь нет.
import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { hapticTap } from '../../../hooks/use-haptics';
import { PressableScale } from '../../feedback/PressableScale';
import { nestedBoxShadow } from '../../v2/ShadowSurface';
import { useDialogueGlass } from '../glass/DialogueGlassKit';
import { dialogSayHintsLabel } from './dialog_say_hints_copy';
import { applyDialogSayHint, type DialogSayHint } from './dialog_say_hints_model';

/** Размеры: подпись 13/17, фраза 14/19, смысл 13/17; карточка радиус 14, поля 12/8, ширина до 260. */
export const DIALOG_SAY_HINTS_LAYOUT = {
  label: { size: 13, line: 17, icon: 14, gap: 6 },
  card: { radius: 14, padH: 12, padV: 8, maxWidth: 260, minWidth: 140, gap: 8 },
  phrase: { size: 14, line: 19 },
  meaning: { size: 13, line: 17, marginTop: 2 },
  wrap: { marginBottom: 10, labelGap: 6 },
} as const;

type Props = Readonly<{
  /** Язык интерфейса (подпись блока). */
  lang: string;
  hints: readonly DialogSayHint[];
  /** Тап: вставить фразу в поле ввода (не отправлять). */
  onUse: (text: string) => void;
  /** Поле закрыто (лимит, запись) — карточки приглушены и не нажимаются. */
  disabled?: boolean;
  testID?: string;
}>;

export const DialogSayHints = memo(function DialogSayHints({ lang, hints, onUse, disabled = false, testID = 'dialog-say-hints' }: Props) {
  const glass = useDialogueGlass();
  const reduceMotion = useReducedMotion();
  if (hints.length === 0) return null;
  const L = DIALOG_SAY_HINTS_LAYOUT;
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(180)} style={styles.wrap} testID={testID}>
      <View style={styles.labelRow}>
        <Ionicons name="bulb-outline" size={L.label.icon} color={glass.secondary} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.label, { color: glass.secondary }]}>{dialogSayHintsLabel(lang)}</Text>
      </View>
      {/* guard-ok: не более трёх карточек (sanitizeDialogSayHints) — виртуализация FlatList дороже самого списка */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.row} decelerationRate="fast">
        {hints.map((hint) => (
          <PressableScale
            key={hint.text}
            variant="flat"
            disabled={disabled}
            onPress={() => { void hapticTap(); onUse(applyDialogSayHint('', hint)); }}
            accessibilityRole="button"
            accessibilityLabel={hint.meaning ? `${hint.text} — ${hint.meaning}` : hint.text}
            accessibilityState={{ disabled }}
            testID={`${testID}-item`}
            style={[styles.card, { backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass), opacity: disabled ? 0.55 : 1 }]}
          >
            <Text maxFontSizeMultiplier={1.3} numberOfLines={3} style={[styles.phrase, { color: glass.text }]}>{hint.text}</Text>
            {hint.meaning ? <Text maxFontSizeMultiplier={1.3} numberOfLines={3} style={[styles.meaning, { color: glass.secondary }]}>{hint.meaning}</Text> : null}
          </PressableScale>
        ))}
      </ScrollView>
    </Animated.View>
  );
});

const L = DIALOG_SAY_HINTS_LAYOUT;
const styles = StyleSheet.create({
  wrap: { marginBottom: L.wrap.marginBottom },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: L.label.gap, marginBottom: L.wrap.labelGap },
  label: { fontSize: L.label.size, lineHeight: L.label.line, fontWeight: '700' },
  row: { gap: L.card.gap, paddingRight: 4 },
  card: { borderRadius: L.card.radius, paddingHorizontal: L.card.padH, paddingVertical: L.card.padV, minWidth: L.card.minWidth, maxWidth: L.card.maxWidth },
  phrase: { fontSize: L.phrase.size, lineHeight: L.phrase.line, fontWeight: '600' },
  meaning: { marginTop: L.meaning.marginTop, fontSize: L.meaning.size, lineHeight: L.meaning.line },
});
