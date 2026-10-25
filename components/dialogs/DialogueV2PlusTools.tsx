import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { triLang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';
import V2Pressable from '../v2/V2Pressable';
import { dialogsHubTokens } from './scene/dialogs_hub_tokens';

export type DialogueV2PlusToolsProps = Readonly<{
  accessResolved: boolean;
  hasPremiumAccess: boolean;
  onOpenFreeform: () => void;
}>;

// зачем (приказ владельца 11.10): «Память диалогов» живёт только в Настройках → Приватность
// (app/privacy_settings.tsx → /dialogue_v2_memory), в самом разделе — лишь «Свободный разговор».
//
// зачем (владелец 22.10, «Да, переносить», макет dialogs-hub-v4.html, решение (б)): «Свободный разговор» — широкая плитка сразу под сценой, одного стиля с плитками тем (высота 58, заливка «контрол» темы, без обводок).
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «ЕСЛИ PLUS ЮЗЕР ТО УБРАТЬ PLUS ИКОНКУ» — значок Plus и замок только у Free (ведёт в окно Plus); у Plus — шеврон и никакого значка. В коде до этого значок был виден всегда.
export function DialogueV2PlusTools({
  accessResolved,
  hasPremiumAccess,
  onOpenFreeform,
}: DialogueV2PlusToolsProps) {
  const g = useLv2Glass();
  const t = dialogsHubTokens(g);
  const { lang } = useLang();
  const title = triLang(lang, {
    ru: 'Свободный разговор', uk: 'Вільна розмова', en: 'Open conversation',
    es: 'Conversación libre', fr: 'Conversation libre', de: 'Freies Gespräch',
    'pt-BR': 'Conversa livre', vi: 'Trò chuyện tự do', id: 'Obrolan bebas', tr: 'Serbest sohbet', pl: 'Swobodna rozmowa',
  });
  const subtitle = triLang(lang, {
    ru: 'Практика без сценария', uk: 'Практика без сценарію', en: 'Practice without a scenario',
    es: 'Práctica sin guion', fr: 'Pratique sans scénario', de: 'Üben ohne Szenario',
    'pt-BR': 'Prática sem roteiro', vi: 'Luyện tập không theo kịch bản', id: 'Latihan tanpa skenario', tr: 'Senaryosuz pratik', pl: 'Ćwiczenie bez scenariusza',
  });
  const hint = !hasPremiumAccess
    ? triLang(lang, {
      ru: 'Доступно в Plus. Откроется экран Plus.',
      uk: 'Доступно в Plus. Відкриється екран Plus.',
      en: 'Available with Plus. Opens the Plus screen.',
      es: 'Disponible con Plus. Abre la pantalla de Plus.',
      fr: 'Disponible avec Plus. Ouvre l’écran Plus.',
      de: 'Mit Plus verfügbar. Öffnet den Plus-Bildschirm.',
      'pt-BR': 'Disponível no Plus. Abre a tela do Plus.', vi: 'Có trong Plus. Mở màn hình Plus.', id: 'Tersedia di Plus. Membuka layar Plus.', tr: 'Plus ile kullanılabilir. Plus ekranını açar.', pl: 'Dostępne w Plusie. Otwiera ekran Plus.',
    })
    : subtitle;

  return (
    <View testID="dialogue-v2-plus-tools" style={styles.wrap}>
      <V2Pressable
        testID="dialogue-v2-plus-tool-freeform"
        onPress={onOpenFreeform}
        disabled={!accessResolved}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={hint}
        accessibilityState={{ disabled: !accessResolved }}
        style={[styles.tile, { backgroundColor: t.tile.bg, opacity: accessResolved ? 1 : 0.62 }]}
      >
        <Ionicons name="mic-outline" size={22} color={t.tile.icon} />
        <View style={styles.text}>
          <Text style={[styles.title, { color: t.tile.label }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{title}</Text>
          <Text style={[styles.sub, { color: t.tile.count }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{subtitle}</Text>
        </View>
        {!hasPremiumAccess ? (
          <View style={styles.right}>
            <View testID="dialogue-v2-freeform-plus-badge" style={[styles.plus, { backgroundColor: t.plus.bg }]}>
              <Ionicons name="diamond" size={12} color={t.plus.ink} />
              <Text style={[styles.plusText, { color: t.plus.ink }]} maxFontSizeMultiplier={1.2}>Plus</Text>
            </View>
            <Ionicons name="lock-closed" size={18} color={t.tile.count} />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={t.tile.count} />
        )}
      </V2Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  // зачем: плитка строго 58, радиус 20, заливка «контрол» — как плитки тем и плитки хаба уроков
  tile: { height: 58, borderRadius: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  sub: { fontSize: 13, lineHeight: 17, fontWeight: '600' }, // зачем (шкала V2_TYPE 13/17, храповик typography_store_surface 25.10): было lineHeight 16
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  plus: { height: 22, paddingHorizontal: 8, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 3 },
  plusText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
});

export default DialogueV2PlusTools;
