import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { triLang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { useLang } from '../LangContext';
import { PressableScale } from '../feedback/PressableScale';
import { LinearGradient } from '../SafeLinearGradient';
import { glassTone } from './glass/glassTone';
import { nestedBoxShadow, PlateFill, raisedBoxShadow, RAISED_LIFT, useShadowGlass } from '../v2/ShadowSurface';
import { useV2Palette } from '../v2/useV2Palette';

export type DialogueV2PlusToolsProps = Readonly<{
  accessResolved: boolean;
  hasPremiumAccess: boolean;
  onOpenFreeform: () => void;
}>;

// зачем (приказ владельца 11.10): «Память диалогов» живёт только в Настройках → Приватность
// (app/privacy_settings.tsx → /dialogue_v2_memory), в самом разделе — лишь «Свободный разговор».
export function DialogueV2PlusTools({
  accessResolved,
  hasPremiumAccess,
  onOpenFreeform,
}: DialogueV2PlusToolsProps) {
  const p = useV2Palette();
  const g = useShadowGlass();
  const { lang } = useLang();
  const rows = [
    {
      id: 'freeform',
      icon: 'chatbubbles-outline' as const,
      title: triLang(lang, {
        ru: 'Свободный разговор', uk: 'Вільна розмова', en: 'Open conversation',
        es: 'Conversación libre', fr: 'Conversation libre', de: 'Freies Gespräch',
        'pt-BR': 'Conversa livre', vi: 'Trò chuyện tự do', id: 'Obrolan bebas', tr: 'Serbest sohbet', pl: 'Swobodna rozmowa',
      }),
      subtitle: triLang(lang, {
        ru: 'Практика без сценария', uk: 'Практика без сценарію', en: 'Practice without a scenario',
        es: 'Práctica sin escenario', fr: 'Pratique sans scénario', de: 'Üben ohne Szenario',
        'pt-BR': 'Prática sem roteiro', vi: 'Luyện tập không theo kịch bản', id: 'Latihan tanpa skenario', tr: 'Senaryosuz pratik', pl: 'Ćwiczenie bez scenariusza',
      }),
      onPress: onOpenFreeform,
    },
  ] as const;

  return (
    <View testID="dialogue-v2-plus-tools" style={{ gap: V2.gapTight, marginTop: V2.gap }}>
      {rows.map((row) => (
        // зачем (стиль «Тень», эталон «Диалоги»: «Свободный разговор» приподнят): сдвиг — на внешней обёртке, высота ряда не меняется.
        <View key={row.id} style={{ transform: [{ translateY: RAISED_LIFT }] }}>
        <PressableScale
          testID={`dialogue-v2-plus-tool-${row.id}`}
          onPress={row.onPress}
          disabled={!accessResolved}
          accessibilityRole="button"
          accessibilityLabel={row.title}
          accessibilityHint={!hasPremiumAccess
            ? triLang(lang, {
              ru: 'Доступно в Plus. Откроется экран Plus.',
              uk: 'Доступно в Plus. Відкриється екран Plus.',
              en: 'Available with Plus. Opens the Plus screen.',
              es: 'Disponible con Plus. Abre la pantalla de Plus.',
              fr: 'Disponible avec Plus. Ouvre l’écran Plus.',
              de: 'Mit Plus verfügbar. Öffnet den Plus-Bildschirm.',
              'pt-BR': 'Disponível no Plus. Abre a tela do Plus.', vi: 'Có trong Plus. Mở màn hình Plus.', id: 'Tersedia di Plus. Membuka layar Plus.', tr: 'Plus ile kullanılabilir. Plus ekranını açar.', pl: 'Dostępne w Plus. Otwiera ekran Plus.',
            })
            : row.subtitle}
          accessibilityState={{ disabled: !accessResolved }}
          variant="flat"
          style={{
            minHeight: V2.rowMinHeight,
            borderRadius: V2.radius.row,
            boxShadow: raisedBoxShadow(g),
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: V2.gapTight,
            opacity: accessResolved ? 1 : 0.62,
          }}
        >
          <PlateFill g={g} radius={V2.radius.row} raised />
          {/* зачем (сверка dialogs-001/002, образец dialogs.html `.fr`): плашка «Свободный разговор» окрашена акцентом темы — перелив 135° от 14% акцента к нулю на 70% (в образце мятный при «Аврора»; в «Спокойно» акцент нейтральный — тон светлее плиты).
              Цвет — токен accentText с малой альфой, не hex: смена темы красит плашку сама. Слой не ловит нажатия. */}
          <LinearGradient
            pointerEvents="none"
            testID="dialogue-v2-freeform-tint"
            colors={[glassTone(g.accentText, 0.14), glassTone(g.accentText, 0)]}
            locations={[0, 0.7]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: V2.radius.row }]}
          />
          {/* зачем (координатор 12.10, dialogs-001/002; эталон «Тень» etalon.html .dc): плитка 52×52 радиус 18, значок 26 в цвете темы, как у «Свободного разговора» в утверждённом образце; заливка плитки — 22% акцента темы (образец `.fr .fi`, сверка dialogs-001/002) */}
          <View testID="dialogue-v2-freeform-tile" style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: glassTone(g.accentText, 0.22), boxShadow: nestedBoxShadow(g), alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={row.icon} size={26} color={g.accentText} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: p.text, ...V2_TYPE.headline, flexShrink: 1 }} maxFontSizeMultiplier={1.2} numberOfLines={2}>
                {row.title}
              </Text>
              {/* зачем (образец dialogs.html .fp / etalon .pp): значок PLUS рядом с названием — высота 20, радиус 8, заливка цвета темы, 13/700; показан и Free, и Plus */}
              <View testID="dialogue-v2-freeform-plus-badge" style={{ height: 20, paddingHorizontal: 7, borderRadius: 8, backgroundColor: g.accent, justifyContent: 'center' }}>
                <Text style={{ color: g.accentInk, fontSize: 13, lineHeight: 17, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>PLUS</Text>
              </View>
            </View>
            <Text style={{ color: p.textSecondary, ...V2_TYPE.caption, marginTop: 2 }} maxFontSizeMultiplier={1.2}>
              {row.subtitle}
            </Text>
          </View>
          {/* зачем (образец dialogs.html .fr > .i): справа замок (Free, ряд ведёт в Plus) или шеврон (Plus) в цвете темы; подпись «Plus» справа убрана — её роль играет значок рядом с названием */}
          {!hasPremiumAccess ? (
            <Ionicons name="lock-closed" size={20} color={g.accentText} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={g.accentText} />
          )}
        </PressableScale>
        </View>
      ))}
    </View>
  );
}

export default DialogueV2PlusTools;
