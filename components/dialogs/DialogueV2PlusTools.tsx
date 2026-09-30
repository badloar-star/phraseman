import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import { triLang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { useLang } from '../LangContext';
import { PressableScale } from '../feedback/PressableScale';
import { useV2Palette } from '../v2/useV2Palette';

export type DialogueV2PlusToolsProps = Readonly<{
  accessResolved: boolean;
  hasPremiumAccess: boolean;
  onOpenFreeform: () => void;
  onOpenMemory: () => void;
}>;

export function DialogueV2PlusTools({
  accessResolved,
  hasPremiumAccess,
  onOpenFreeform,
  onOpenMemory,
}: DialogueV2PlusToolsProps) {
  const p = useV2Palette();
  const { lang } = useLang();
  const rows = [
    {
      id: 'freeform',
      icon: 'chatbubbles-outline' as const,
      title: triLang(lang, {
        ru: 'Свободный разговор', uk: 'Вільна розмова', en: 'Free conversation',
        es: 'Conversación libre', fr: 'Conversation libre', de: 'Freies Gespräch',
      }),
      subtitle: triLang(lang, {
        ru: 'Практика без сценария', uk: 'Практика без сценарію', en: 'Practice without a scenario',
        es: 'Práctica sin escenario', fr: 'Pratique sans scénario', de: 'Üben ohne Szenario',
      }),
      onPress: onOpenFreeform,
    },
    {
      id: 'memory',
      icon: 'archive-outline' as const,
      title: triLang(lang, {
        ru: 'Память диалогов', uk: 'Пам’ять діалогів', en: 'Dialogue memory',
        es: 'Memoria de diálogos', fr: 'Mémoire des dialogues', de: 'Dialoggedächtnis',
      }),
      subtitle: triLang(lang, {
        ru: 'Что сохранено для этого языка', uk: 'Що збережено для цієї мови', en: 'What is saved for this language',
        es: 'Lo guardado para este idioma', fr: 'Ce qui est mémorisé pour cette langue', de: 'Was für diese Sprache gespeichert ist',
      }),
      onPress: onOpenMemory,
    },
  ] as const;

  return (
    <View testID="dialogue-v2-plus-tools" style={{ gap: V2.gapTight, marginTop: V2.gap }}>
      {rows.map((row) => (
        <PressableScale
          key={row.id}
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
            })
            : row.subtitle}
          accessibilityState={{ disabled: !accessResolved }}
          variant="flat"
          style={{
            minHeight: V2.rowMinHeight,
            borderRadius: V2.radius.row,
            backgroundColor: p.glassRaised,
            borderColor: p.stroke,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: V2.gapTight,
            opacity: accessResolved ? 1 : 0.62,
          }}
        >
          <View style={{ width: V2.rowIcon, height: V2.rowIcon, borderRadius: V2.radius.tile, backgroundColor: p.control, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={row.icon} size={21} color={p.iconTint} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: p.text, ...V2_TYPE.headline }} maxFontSizeMultiplier={1.2}>
              {row.title}
            </Text>
            <Text style={{ color: p.textSecondary, ...V2_TYPE.caption, marginTop: 2 }} maxFontSizeMultiplier={1.2}>
              {row.subtitle}
            </Text>
          </View>
          {!hasPremiumAccess ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="lock-closed" size={17} color={p.textMuted} />
              <Text style={{ color: p.textSecondary, ...V2_TYPE.caption, fontWeight: '700' }}>Plus</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={19} color={p.textMuted} />
          )}
        </PressableScale>
      ))}
    </View>
  );
}

export default DialogueV2PlusTools;
