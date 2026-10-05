import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableHybrid from '../PressableHybrid';
import { KitGlassLayer } from '../v2/KitLiquidGlass';
import { lessonsGlassCardStyle, type LessonsListGlass } from './LessonsListGlassKit';

// зачем (владелец 2026-09-30): карточки конца уровня из learn.html — `.exc` (экзамен уровня:
// плашка 46 со значком документа, «Экзамен A1», строка состояния, шеврон; недоступный — приглушён)
// и `.attest` (B2 / CEFR · Аттестация). Медальных точек и золотых фасок в 2.0 нет.
// Что делает нажатие, решает прежний обработчик из app/(tabs)/lessons.tsx.


function Tile({ glass, size, radius, icon, iconSize }: {
  glass: LessonsListGlass;
  size: number;
  radius: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconSize: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: glass.opaqueControl,
      }}
    >
      <Ionicons name={icon} size={iconSize} color={glass.text} />
    </View>
  );
}

export const LessonsListGlassExamCard = React.memo(function LessonsListGlassExamCard({
  glass,
  level,
  title,
  status,
  faint,
  bestPct,
  onPress,
}: {
  glass: LessonsListGlass;
  level: string;
  title: string;
  status: string;
  /** Экзамен пока нельзя начать и результата нет — плашка приглушена (.exc.faint). */
  faint: boolean;
  /** Лучший результат для чтения экрана; 0 — не озвучиваем. */
  bestPct: number;
  onPress: () => void;
}) {
  return (
    <PressableHybrid
      testID={`legacy-lessons-exam-${level}`}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${status}`}
      accessibilityValue={bestPct > 0 ? { text: `${bestPct}%` } : undefined}
      onPress={onPress}
      // зачем: вибрацию даёт прежний обработчик экзамена (hapticTap в onPress).
      withHaptic={false}
      variant="card"
      pressScaleTo={0.975}
      style={{ marginHorizontal: 20, marginTop: 9 }}
      contentStyle={[
        lessonsGlassCardStyle(glass, 22),
        { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
      ]}
    >
      {/* зачем (Сверка learn-007): подкраска glass.selected делала карточку светлее уроков — в макете .card.c2 со стандартным стеклом. */}
      <KitGlassLayer radius={22} />
      <View style={{ opacity: faint ? 0.6 : 1 }}>
        <Tile glass={glass} size={46} radius={12} icon="document-text" iconSize={22} />
      </View>
      <View style={{ flex: 1, minWidth: 0, opacity: faint ? 0.6 : 1 }}>
        <Text style={{ color: glass.text, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, marginTop: 3 }}>{status}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
    </PressableHybrid>
  );
});

export const LessonsListGlassAttestationCard = React.memo(function LessonsListGlassAttestationCard({
  glass,
  title,
  onPress,
}: {
  glass: LessonsListGlass;
  title: string;
  onPress: () => void;
}) {
  return (
    <PressableHybrid
      testID="legacy-lessons-attestation"
      accessibilityRole="button"
      accessibilityLabel={`B2 / CEFR. ${title}`}
      onPress={onPress}
      withHaptic={false}
      variant="card"
      pressScaleTo={0.975}
      style={{ marginHorizontal: 20, marginTop: 12 }}
      contentStyle={[
        lessonsGlassCardStyle(glass, 22),
        { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18, paddingHorizontal: 16 },
      ]}
    >
      {/* зачем (Сверка learn-007): подкраска glass.selected делала карточку светлее уроков — в макете .card.c2 со стандартным стеклом. */}
      <KitGlassLayer radius={22} />
      <Tile glass={glass} size={55} radius={14} icon="school-outline" iconSize={26} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: glass.secondary,
            fontSize: 13, // guard-ok: надстрочная метка `.ov` макета НАД названием, не подпись-расшифровка
            lineHeight: 17,
            fontWeight: '700',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          B2 / CEFR
        </Text>
        <Text style={{ color: glass.text, fontSize: 20, lineHeight: 25, fontWeight: '700', marginTop: 6 }}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
    </PressableHybrid>
  );
});
