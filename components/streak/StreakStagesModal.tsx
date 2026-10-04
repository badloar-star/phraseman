import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang, type Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { hapticTap } from '../../hooks/use-haptics';

// зачем (макет results.html RES-08 «стадии огня 0–10», 30.09): отдельный экран
// «Стадии серии» — 11 плиток, огонь от 0 до 10 дней становится крупнее и ярче.
// Монохром 2.0: яркость огня растёт от тусклого к почти белому, как в макете
// (shade 72 → 252, иконка 15 → 27 px, плитка 38 → 46 px). Текущая стадия выделена
// тоном плитки, без обводки.

const STAGES = Array.from({ length: 11 }, (_, i) => i);

function stageShade(i: number): string {
  const v = 72 + Math.round(i * 18);
  return `rgb(${v},${v},${Math.min(255, v + 4)})`;
}

function daysLabel(lang: Lang, n: number): string {
  const ruForm = (one: string, few: string, many: string) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  return triLang(lang, {
    ru: `${n} ${ruForm('день', 'дня', 'дней')}`,
    uk: `${n} ${ruForm('день', 'дні', 'днів')}`,
    en: `${n} ${n === 1 ? 'day' : 'days'}`,
    es: `${n} ${n === 1 ? 'día' : 'días'}`,
    'pt-BR': `${n} ${n === 1 ? 'dia' : 'dias'}`,
    vi: `${n} ngày`,
    id: `${n} hari`,
    tr: `${n} gün`,
    pl: `${n} ${n === 1 ? 'dzień' : 'dni'}`,
  });
}

export default function StreakStagesModal({
  visible,
  currentDays,
  onClose,
}: {
  visible: boolean;
  currentDays: number;
  onClose: () => void;
}) {
  const { liquidGlassThemeId, f } = useTheme();
  const { lang } = useLang();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const currentStage = Math.max(0, Math.min(10, Math.floor(currentDays))); // guard-ok: только выбор подсвеченной плитки, данные не меняются
  const title = triLang(lang, {
    ru: 'Стадии серии', uk: 'Стадії серії', en: 'Streak stages', es: 'Etapas de la racha',
    'pt-BR': 'Etapas da sequência', vi: 'Các giai đoạn chuỗi', id: 'Tahap rangkaian', tr: 'Seri aşamaları', pl: 'Etapy serii',
  });
  // зачем (PM-044, 04.10): огонь не растёт в размере — он заполняется по дням (StreakFlameFill); «крупнее» было неправдой.
  const sub = triLang(lang, {
    ru: 'С каждым днём серии огонь заполняется — к 10 дням он полный',
    uk: 'З кожним днем серії вогонь заповнюється — до 10 днів він повний',
    en: 'The flame fills up with each day of your streak — it’s full by day 10',
    es: 'La llama se llena con cada día de racha: a los 10 días está completa',
    'pt-BR': 'A chama se enche a cada dia da sequência — com 10 dias ela fica completa',
    vi: 'Mỗi ngày trong chuỗi, ngọn lửa đầy thêm — đến ngày thứ 10 là đầy',
    id: 'Api terisi setiap hari streak — penuh di hari ke-10',
    tr: 'Serinin her gününde alev dolar — 10. günde tamamen dolu olur',
    pl: 'Z każdym dniem serii płomień się wypełnia — po 10 dniach jest pełny',
  });
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <LinearGradient colors={[glass.bgTop, glass.bgBottom]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
            <Pressable
              testID="streak-stages-back"
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              onPress={() => { hapticTap(); onClose(); }}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                backgroundColor: glass.opaqueControl, opacity: pressed ? 0.8 : 1,
              })}
            >
              <Ionicons name="chevron-back" size={22} color={glass.text} />
            </Pressable>
            <Text accessibilityRole="header" style={{ flex: 1, color: glass.text, fontSize: 20, lineHeight: 26, fontWeight: '700' }}>
              {title}
            </Text>
          </View>
          <Text style={{ color: glass.secondary, fontSize: f.body, lineHeight: f.body * 1.4, marginTop: 14 }}>{sub}</Text>
          <View testID="streak-stages-grid" style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 24, marginHorizontal: -5 }}>
            {STAGES.map((i) => {
              const tile = 38 + Math.round(i * 0.8);
              const icon = 15 + Math.round(i * 1.2);
              const current = i === currentStage;
              return (
                <View key={i} style={{ width: '33.333%', padding: 5 }}>{/* guard-ok: постоянный список из 11 стадий */}
                  <View
                    testID={`streak-stage-${i}`}
                    accessible
                    accessibilityLabel={daysLabel(lang, i)}
                    accessibilityState={{ selected: current }}
                    style={{
                      borderRadius: 18, paddingVertical: 16, alignItems: 'center',
                      backgroundColor: current ? glass.selected : glass.opaqueCard,
                    }}
                  >
                    <View style={{ width: tile, height: tile, borderRadius: tile / 3, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl }}>
                      <Ionicons name="flame" size={icon} color={stageShade(i)} />
                    </View>
                    <Text style={{ color: current ? glass.text : glass.secondary, fontSize: 13, fontWeight: '600', marginTop: 10 }}>{/* guard-ok: подпись плитки из макета RES-08 */}
                      {daysLabel(lang, i)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}
