import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { RowDivider } from '../v2/RowDivider';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';

import { coinRankRowForDisplay } from '../../app/coin_rank_table_v1';
import { logMemCoin } from '../coins/mem_coin_probe';
import EnergyBar from '../EnergyBar';
import V2Backdrop from '../v2/V2Backdrop';
import { nestedBoxShadow } from '../v2/ShadowSurface';
import {
  DialogueGlassBackButton,
  DialogueGlassCta,
  dialogueGlassCardStyle,
  useDialogueGlass,
} from './glass/DialogueGlassKit';
import { glassTone } from './glass/glassTone';
import { formatDialogObjectiveLabel } from './dialog_objective_label';
import { BriefingRevealRow } from './DialogueIncomingCall';

// зачем (владелец 2026-09-30): брифинг «1 в 1» по макету dialogs.html B1/B2 (Liquid Glass):
// медальон сцены 88, бейдж уровня, крупное название, карточка брифинга, карточка «Задания»
// с номерами в кругах и закреплённая кнопка «Начать диалог →». Карточки «Участники» нет (владелец 11.10, журнал 37).
// Закрытый по рангу: погашенная кнопка с замком «Откроется на ранге N» и под ней реальный
// ранг человека с монетой. Цен и состояний подписки здесь нет по контракту.

export type DialogueV2BriefingObjective = Readonly<{ id: string; label: string }>;

export type DialogueV2BriefingScreenProps = Readonly<{
  title: string;
  cefr: string;
  briefing: string;
  objectives: readonly DialogueV2BriefingObjective[];
  rankRequired: number;
  /** Пилюля энергии справа в шапке (как в сессии диалога): false у безлимитной энергии. */
  showEnergy?: boolean;
  /** The local rank gate decides this before render; no account entitlement is consulted. */
  unlocked: boolean;
  /** Реальный ранг монеты человека; null — ещё не известен, строку «Сейчас ранг» не рисуем. */
  currentRank: number | null;
  labels: Readonly<{
    back: string;
    tasks: string;
    start: string;
    locked: (rankRequired: number) => string;
    currentRank: (rank: number) => string;
  }>;
  onBack: () => void;
  onStart: () => void;
  /** m16: после «Ответить» на звонок строки заданий всплывают по очереди; false — сразу на месте. */
  revealRows?: boolean;
  /** R52: старт идёт (согласие, списание энергии, переход) — кнопка занята. */
  starting?: boolean;
}>;

/**
 * Design 2.0 briefing for a server-authorized V2 chat packet. It receives
 * only learner copy and the local rank result: prices and account-entitlement state
 * intentionally have no representation in this surface.
 */
export function DialogueV2BriefingScreen({
  title,
  cefr,
  briefing,
  objectives,
  rankRequired,
  revealRows = false,
  showEnergy = false,
  unlocked,
  currentRank,
  labels,
  onBack,
  onStart,
  starting = false,
}: DialogueV2BriefingScreenProps) {
  const glass = useDialogueGlass();
  // зачем (Сверка 22.10: «назад» и «⚡5» наезжали на часы; правило владельца «верхняя сейф-зона — часть общей композиции»): отступ под часы — устойчивый inset (первый кадр уже финальный), а не SafeAreaView, который в первом кадре мог отдать 0;
  // фон (V2Backdrop и glass.bg корня) идёт под строку статуса без полосы
  const insets = useStableSafeAreaInsets();
  const startLabel = unlocked ? labels.start : labels.locked(rankRequired);
  const card = dialogueGlassCardStyle(glass);

  return (
    <View style={[styles.fill, { backgroundColor: glass.bg }]} testID="dialogue-v2-briefing-screen">
      {/* зачем (Макеты d7cf7113d, dialogs-007/008, тон темы): в образце B1/B2 за брифингом — пятна Авроры (зелёное слева, фиолетовое справа), у экрана был ровный чёрный. Тот же статичный слой, что у хаба Карточек, кошелька и рангов; у тем без пятен слоя нет */}
      <V2Backdrop />
      <View style={[styles.fill, { paddingTop: insets.top }]} testID="dialogue-v2-briefing-safe-top">
        <View style={styles.top}>
          <DialogueGlassBackButton glass={glass} onPress={onBack} accessibilityLabel={labels.back} />
          {/* зачем (Сверка dialogs-007/008, координатор 12.10): в образце B1/B2 справа в шапке пилюля энергии «⚡ N» (диалог тратит энергию) — как в шапке сессии */}
          {showEnergy ? <EnergyBar glass solidBolt /> : null}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} decelerationRate="fast">
          <View testID="dialogue-v2-briefing-scene" style={styles.hero}>
            <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chatbubbles-outline" size={40} color={glass.text} />
            </View>
            <View style={[styles.level, { backgroundColor: glass.dividerTone, boxShadow: nestedBoxShadow(glass) }]}>{/* зачем (стиль «Тень»): плашка уровня `.lvl` — вложенная, без кромки */}
              <Text maxFontSizeMultiplier={1.3} style={[styles.levelText, { color: glass.text }]}>{cefr}</Text>
            </View>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.title, { color: glass.text }]}>{title}</Text>
          </View>

          <View style={[card, styles.briefCard]}>
            <Text maxFontSizeMultiplier={1.4} style={[styles.briefText, { color: glass.text }]}>{briefing}</Text>
          </View>

          <View testID="dialogue-v2-briefing-tasks" style={[card, styles.listCard]}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: glass.secondary }]}>{labels.tasks}</Text>
            {objectives.map((objective, index) => (
              <BriefingRevealRow key={objective.id} index={index} active={revealRows}>
              <View
                style={styles.obj}
              >
                {index > 0 ? <RowDivider color={glass.dividerTone} /> : null}
                {/* зачем (сверка dialogs-008, макет `.obj .n`): цифра в видимом кружке (control 0x1C1C1E на карточке 0x161618) — тон от цвета текста темы, токен opaqueControl сливался с карточкой */}
                <View style={[styles.num, { backgroundColor: glassTone(glass.text, 0.10) }]}>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.numText, { color: glass.text }]}>{index + 1}</Text>
                </View>
                <Text maxFontSizeMultiplier={1.4} style={[styles.objText, { color: glass.text }]}>{formatDialogObjectiveLabel(objective.label)}</Text>
              </View>
              </BriefingRevealRow>
            ))}
          </View>

        </ScrollView>
      </View>
      <SafeAreaView edges={['bottom']} style={[styles.dock, { backgroundColor: glass.bg }]}>
        <DialogueGlassCta
          glass={glass}
          testID="dialogue-v2-briefing-start"
          label={startLabel}
          onPress={onStart}
          disabled={!unlocked}
          busy={unlocked && starting}
          trailingArrow={unlocked}
          icon={unlocked ? undefined : 'lock-closed'}
        />
        {!unlocked && currentRank != null ? (
          <View style={styles.rankNow} accessible accessibilityLabel={labels.currentRank(currentRank)}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.rankNowText, { color: glass.secondary }]}>{labels.currentRank(currentRank)}</Text>
            {/* зачем (R129): expo-image декодирует монету 768² под размер вида (18 dp), а не целиком */}
            <Image source={coinRankRowForDisplay(currentRank).source} style={styles.rankCoin} contentFit="cover" accessible={false} onLoad={() => logMemCoin('dialogue-briefing-rank', 18)} />
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scroll: { paddingHorizontal: 16, paddingBottom: 28 },
  hero: { alignItems: 'center', marginTop: 18 },
  // dialogs.html B `.lvl`: 38×26, радиус 8, поля 0·9; без кромки (стиль «Тень»).
  level: { marginTop: 14, minWidth: 38, height: 26, borderRadius: 8, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  levelText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  title: { marginTop: 10, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  briefCard: { marginTop: 22, padding: 18 },
  briefText: { fontSize: 16, lineHeight: 22 },
  listCard: { marginTop: 13, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  kicker: { paddingTop: 12, paddingBottom: 4, fontSize: 13, lineHeight: 17, letterSpacing: 3, fontWeight: '700', textTransform: 'uppercase' },
  obj: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, minHeight: 48 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  objText: { flex: 1, fontSize: 16, lineHeight: 22 },
  dock: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  rankNow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  rankNowText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  rankCoin: { width: 18, height: 18 },
});

export default DialogueV2BriefingScreen;
