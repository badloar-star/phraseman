import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import PressableHybrid from '../../PressableHybrid';
import { nestedBoxShadow } from '../../v2/ShadowSurface';
import { triLang, type Lang } from '../../../constants/i18n';
import type { DialogueV2CoachingMood } from '../../../app/dialogue_v2_turn_coaching_client';
import { DialogueGlassCta, dialogueGlassCardStyle, type DialogueGlass } from './DialogueGlassKit';
import { glassTone } from './glassTone';

// зачем (владелец 2026-09-30, макет dialogs.html C1–C24): детали сессии V2, которых не
// было в ките — настроение собеседника (серый контурный значок лица, 5 зон), карточка
// «Цель N из M» с кнопкой «Подсказка», пилюля месячного остатка ответов (D111), кнопки
// «Перевод»/«Почему так» под репликой, «Лучше так» под своей, стена «на этот месяц всё»,
// вуаль «Нажми, чтобы перейти к итогу» и пилюля «Итоги». Только вид; решает экран.

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const FACE_FEATURES: Readonly<Record<DialogueV2CoachingMood, readonly string[]>> = Object.freeze({
  happy: ['M8.5 13.5c.8 1.6 2 2.4 3.5 2.4s2.7-.8 3.5-2.4'],
  smile: ['M9 14.2c.8.9 1.8 1.4 3 1.4s2.2-.5 3-1.4'],
  neutral: ['M9 14.8h6'],
  sad: ['M9 15.6c.8-.9 1.8-1.4 3-1.4s2.2.5 3 1.4'],
  angry: ['M9 15.6c.8-.9 1.8-1.4 3-1.4s2.2.5 3 1.4', 'M8 8.5l2.4 1.2M16 8.5l-2.4 1.2'],
});

/** Контурный значок лица (макет `face()`): тон, а не цветной эмодзи. */
export function DialogueGlassMoodFace({ mood, size = 18, color }: Readonly<{
  mood: DialogueV2CoachingMood; size?: number; color: string;
}>) {
  const eyesY = mood === 'angry' ? 10.8 : 9.5;
  const eyesX = mood === 'angry' ? [9.3, 14.7] : [9, 15];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
      <Circle cx={12} cy={12} r={8.5} />
      {FACE_FEATURES[mood].map((d) => <Path key={d} d={d} />)}
      <Path d={`M${eyesX[0]} ${eyesY}h.01M${eyesX[1]} ${eyesY}h.01`} strokeWidth={2.5} />
    </Svg>
  );
}

export function dialogueMoodLabel(lang: Lang, mood: DialogueV2CoachingMood): string {
  switch (mood) {
    case 'happy':
      // зачем (Макеты 12.10, dialogs-023): настроение — одна строка рядом с энергией и «N/30», лимит 13 знаков;
      // uk/pt-BR/pl/de были 14–17, id на границе — короткие слова с тем же смыслом «в восторге».
      return triLang(lang, { ru: 'Очень доволен', uk: 'Дуже радий', en: 'Delighted', es: 'Encantado', 'pt-BR': 'Encantado', vi: 'Rất hài lòng', id: 'Gembira', tr: 'Çok memnun', pl: 'Zachwycony', fr: 'Ravi', de: 'Begeistert' });
    case 'smile':
      return triLang(lang, { ru: 'Доволен', uk: 'Задоволений', en: 'Pleased', es: 'Contento', 'pt-BR': 'Satisfeito', vi: 'Hài lòng', id: 'Senang', tr: 'Memnun', pl: 'Zadowolony', fr: 'Content', de: 'Zufrieden' });
    case 'neutral':
      return triLang(lang, { ru: 'Нейтрально', uk: 'Нейтрально', en: 'Neutral', es: 'Neutral', 'pt-BR': 'Neutro', vi: 'Bình thường', id: 'Netral', tr: 'Nötr', pl: 'Neutralnie', fr: 'Neutre', de: 'Neutral' });
    case 'sad':
      return triLang(lang, { ru: 'Насторожён', uk: 'Насторожений', en: 'Wary', es: 'Desconfiado', 'pt-BR': 'Desconfiado', vi: 'Dè dặt', id: 'Waspada', tr: 'Tedirgin', pl: 'Czujny', fr: 'Méfiant', de: 'Skeptisch' });
    case 'angry':
    default:
      return triLang(lang, { ru: 'Раздражён', uk: 'Роздратований', en: 'Annoyed', es: 'Molesto', 'pt-BR': 'Irritado', vi: 'Khó chịu', id: 'Kesal', tr: 'Sinirli', pl: 'Zirytowany', fr: 'Agacé', de: 'Genervt' });
  }
}

/** Пилюля месячного остатка ответов (D111). Только Free; у Plus её нет. */
export function DialogueGlassQuotaPill({ glass, text, accessibilityLabel, testID }: Readonly<{
  glass: DialogueGlass; text: string; accessibilityLabel: string; testID?: string;
}>) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={[styles.pill, { backgroundColor: glass.buttonFill, boxShadow: nestedBoxShadow(glass) }]} // зачем (стиль «Тень»): пилюля без кромки — малая тень; заливка buttonFill, а не opaqueControl: в светлых темах opaqueControl == фон страницы (1,00:1), [BLEND-AUDIT] 18.10
    >
      <Ionicons name="chatbubble-ellipses-outline" size={16} color={glass.text} />
      <Text maxFontSizeMultiplier={1.2} style={[styles.pillText, { color: glass.text }]}>{text}</Text>
    </View>
  );
}

/** Карточка цели `.goal`: флажок · «Цель N из M» + название · «Подсказка» · «›». */
export function DialogueGlassGoalCard({
  glass, kicker, label, hintLabel, onOpen, onHint, testID,
}: Readonly<{
  glass: DialogueGlass; kicker: string; label: string; hintLabel: string;
  // зачем (dialogs-015/017): onHint нет — подсказки пока нет; кнопку не рисуем, а не оставляем мёртвой.
  onOpen: () => void; onHint?: () => void; testID?: string;
}>) {
  return (
    <PressableHybrid
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${kicker}. ${label}`}
      onPress={onOpen}
      withSound={false}
      variant="secondary"
      style={styles.goalHit}
      contentStyle={[dialogueGlassCardStyle(glass, 18), styles.goal]}
    >
      {/* зачем (сверка dialogs-014): в макете плитка флажка и круг лампочки светлее карточки (`--tile` 0x242426 на 0x161618); токен opaqueControl в тёмных темах почти
          сливается с карточкой, и плитки не видно — тон считаем от белого: заметен в любой теме */}
      <View style={[styles.goalTile, { backgroundColor: glassTone(glass.text, 0.08) }]}>
        <Ionicons name="flag-outline" size={20} color={glass.text} />
      </View>
      <View style={styles.goalText}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.goalKicker, { color: glass.secondary }]}>{kicker}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.goalLabel, { color: glass.text }]}>{label}</Text>
      </View>
      {onHint ? <PressableHybrid
        testID={testID ? `${testID}-hint` : undefined}
        accessibilityRole="button"
        accessibilityLabel={hintLabel}
        onPress={onHint}
        withSound={false}
        variant="icon"
        style={styles.hintHit}
        contentStyle={[styles.hintButton, { backgroundColor: glassTone(glass.text, 0.08) }]}
      >
        <Ionicons name="bulb-outline" size={20} color={glass.text} />
      </PressableHybrid> : null}
      <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
    </PressableHybrid>
  );
}

/** Кнопка под репликой `.ab` с подписью: «Перевод» / «Скрыть перевод» / «Почему так». */
export function DialogueGlassReplyAction({
  glass, icon, label, active, onPress, testID,
}: Readonly<{ glass: DialogueGlass; icon: IconName; label: string; active?: boolean; onPress: () => void; testID?: string }>) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.replyAction,
        {
          backgroundColor: active ? glass.selected : glass.buttonFill,
          boxShadow: nestedBoxShadow(glass), // зачем (стиль «Тень»): кнопка под репликой без кромки — малая тень
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={glass.text} />
      <Text maxFontSizeMultiplier={1.2} style={[styles.replyActionText, { color: glass.text }]}>{label}</Text>
    </Pressable>
  );
}

/** «Лучше так»: сначала кнопка `.fixb`, после нажатия — строка `.fixt` с вариантом. */
export function DialogueGlassBetterPhrasing({
  glass, label, phrasing, open, onOpen, testID,
}: Readonly<{ glass: DialogueGlass; label: string; phrasing: string; open: boolean; onOpen: () => void; testID?: string }>) {
  if (open) {
    return (
      <Text testID={testID} maxFontSizeMultiplier={1.4} style={[styles.fixText, { color: glass.secondary }]}>
        <Ionicons name="create-outline" size={15} color={glass.secondary} />
        {` ${label}: `}
        <Text style={[styles.fixStrong, { color: glass.text }]}>{phrasing}</Text>
      </Text>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={7}
      style={({ pressed }) => [styles.fixButton, { backgroundColor: glass.buttonFill, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name="create-outline" size={15} color={glass.secondary} />
      <Text maxFontSizeMultiplier={1.2} style={[styles.fixButtonText, { color: glass.secondary }]}>{label}</Text>
    </Pressable>
  );
}

/** Стена лимита `.wall`: встаёт на место строки ввода. */
export function DialogueGlassLimitWall({
  glass, title, message, secondaryLabel, onSecondary, primaryLabel, onPrimary, testID,
}: Readonly<{
  glass: DialogueGlass; title: string; message: string;
  secondaryLabel: string; onSecondary: () => void; primaryLabel: string; onPrimary: () => void; testID?: string;
}>) {
  return (
    <View testID={testID} style={styles.wallWrap}>
      <View style={[dialogueGlassCardStyle(glass, 22), styles.wall]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.wallTitle, { color: glass.text }]}>{title}</Text>
        <Text maxFontSizeMultiplier={1.4} style={[styles.wallText, { color: glass.secondary }]}>{message}</Text>
        <View style={styles.wallButtons}>
          <DialogueGlassCta glass={glass} ghost label={secondaryLabel} onPress={onSecondary} style={styles.wallButton} />
          <DialogueGlassCta glass={glass} label={primaryLabel} onPress={onPrimary} style={styles.wallButton} />
        </View>
      </View>
    </View>
  );
}

/** Сцена закрыта собеседником: ввод скрыт, тап по ленте или по надписи открывает итог. */
export function DialogueGlassEndVeil({ glass, text, onPress, testID }: Readonly<{
  glass: DialogueGlass; text: string; onPress: () => void; testID?: string;
}>) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive) return;
      if (reduce) opacity.setValue(1);
      else Animated.timing(opacity, { toValue: 1, duration: 360, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }).catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] veil:reduce-motion unavailable' /* guard-ok: лог причины catch */, error instanceof Error ? error.message : String(error));
      opacity.setValue(1);
    });
    return () => { alive = false; };
  }, [opacity]);
  return (
    <Animated.View style={{ opacity }}>
      <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={text} style={styles.veil}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.veilText, { color: glass.secondary }]}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Пилюля «Итоги» `.sumpill` внизу по центру — после возврата к переписке. */
export function DialogueGlassSummaryPill({ glass, label, onPress, testID }: Readonly<{
  glass: DialogueGlass; label: string; onPress: () => void; testID?: string;
}>) {
  return (
    <View style={styles.summaryWrap}>
      <DialogueGlassCta glass={glass} size="small" icon="checkmark" label={label} onPress={onPress} testID={testID} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { minHeight: 32, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  goalHit: { alignSelf: 'stretch', marginTop: 14 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 12 },
  goalTile: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  goalText: { flex: 1, minWidth: 0 },
  goalKicker: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  goalLabel: { fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 2 },
  hintHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hintButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  replyAction: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 7 },
  replyActionText: { fontSize: 13, fontWeight: '700' },
  fixButton: { marginTop: 8, minHeight: 30, paddingHorizontal: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 6 },
  fixButtonText: { fontSize: 13, fontWeight: '600' },
  fixText: { marginTop: 8, marginHorizontal: 4, fontSize: 13, lineHeight: 18, textAlign: 'right' },
  fixStrong: { fontWeight: '600' },
  wallWrap: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 },
  wall: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 18, alignItems: 'center' },
  wallTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  wallText: { fontSize: 16, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  wallButtons: { flexDirection: 'row', gap: 12, marginTop: 18, alignSelf: 'stretch' },
  wallButton: { flex: 1 },
  veil: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  veilText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  summaryWrap: { alignItems: 'center', paddingVertical: 10 },
});
