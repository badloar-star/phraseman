// ═══════════════════════════════════════════════════════════════════════════
// PhraseWorkshopRowButton.tsx — кнопка «Мастерская фраз» под строкой пройденного урока (список «Все уроки», V2).
//
// зачем (владелец 25.10, макет утверждён «Да, так», вердикт Макетов 2fd279a1e): карточка пройденного урока растёт вниз,
// под строкой — кнопка во всю ширину содержимого: высота 44, r22, текст 16/700, значок 20, отступ сверху 12, снизу 17.
//   • open         — заливка accentSoft, текст и значок accentText, значок build-outline;
//   • locked_plus  — та же заливка и цвет, значок lock-closed (тап ведёт на экран Plus — решает родитель);
//   • accumulating — заливка opaqueControl, текст secondary, значок time-outline цвета iconMuted, БЕЗ замка (тап — тост).
// Цвета — только из карты Тем (docs/work/exam-workshop-theme-token-map-2026-10-25.md, роли W1–W5).
// Чистый вид: решения (куда вести, что показать) принимает родитель; эта кнопка только рисует и зовёт onPress.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import PressableHybrid from '../../PressableHybrid';
import type { Lv2Glass } from '../LearningV2Glass';
import type { PhraseWorkshopEntryState } from '../../../app/phrase_workshop_model';

export type PhraseWorkshopButtonState = Exclude<PhraseWorkshopEntryState, 'hidden'>;

const ICON: Readonly<Record<PhraseWorkshopButtonState, 'build-outline' | 'lock-closed' | 'time-outline'>> = {
  open: 'build-outline',
  locked_plus: 'lock-closed',
  accumulating: 'time-outline',
};

type Props = Readonly<{
  ordinal: number;
  state: PhraseWorkshopButtonState;
  title: string;
  g: Lv2Glass;
  onPress: (ordinal: number, state: PhraseWorkshopButtonState) => void;
}>;

function PhraseWorkshopRowButtonBase({ ordinal, state, title, g, onPress }: Props) {
  const muted = state === 'accumulating';
  // зачем (карта Тем docs/work/exam-workshop-theme-token-map-2026-10-25.md, W1–W5, 0 нарушений контраста во всех темах): вход —
  // accentText на accentSoft (с Plus и без: замок того же цвета, не приглушать); «фраз мало» — secondary на opaqueControl,
  // часы iconMuted. Прозрачность вместо токена не используем — она роняет контраст.
  const fill = muted ? g.opaqueControl : g.accentSoft;
  const ink = muted ? g.secondary : g.accentText;
  const iconColor = muted ? g.iconMuted : g.accentText;
  return (
    <View style={styles.wrap}>
      <PressableHybrid
        variant="secondary"
        testID={`learning-v2-workshop-button-${ordinal}`}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: false }}
        onPress={() => onPress(ordinal, state)}
        style={[styles.button, { backgroundColor: fill }]}
        contentStyle={styles.content}
      >
        <View style={styles.inner}>
          <Ionicons name={ICON[state]} size={20} color={iconColor} />
          <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.label, { color: ink }]}>{title}</Text>
        </View>
      </PressableHybrid>
    </View>
  );
}

export const PhraseWorkshopRowButton = memo(PhraseWorkshopRowButtonBase);

const styles = StyleSheet.create({
  // отступ сверху 12 — от строки урока; нижний (17) задаёт карточка через paddingBottom строки
  wrap: { alignSelf: 'stretch', marginTop: 12 },
  button: { height: 44, borderRadius: 22 },
  content: { height: 44, width: '100%', alignItems: 'center', justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  label: { fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
});
