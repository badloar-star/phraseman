import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import type { TutorConversationMode } from '../../app/max_tutor_live_board_state';
import { triLang, type Lang } from '../../constants/i18n';
import { useTheme } from '../ThemeContext';

type Props = {
  topic: string;
  mode: TutorConversationMode;
  lang: Lang;
};

export function MaxTutorTopicNotice({ topic, mode, lang }: Props) {
  const { theme: t, f } = useTheme();
  const text = mode === 'free_talk'
    ? triLang(lang, {
      ru: `Свободный разговор: ${topic}`, uk: `Вільна розмова: ${topic}`, es: `Conversación libre: ${topic}`,
      'pt-BR': `Conversa livre: ${topic}`, vi: `Trò chuyện tự do: ${topic}`, id: `Percakapan bebas: ${topic}`,
      tr: `Serbest konuşma: ${topic}`, pl: `Swobodna rozmowa: ${topic}`,
    })
    : triLang(lang, {
      ru: `Хорошо, говорим про ${topic}`, uk: `Добре, говоримо про ${topic}`, es: `Bien, hablamos de ${topic}`,
      'pt-BR': `Certo, vamos falar sobre ${topic}`, vi: `Được, ta nói về ${topic}`, id: `Baik, kita bahas ${topic}`,
      tr: `Tamam, ${topic} hakkında konuşalım`, pl: `Dobrze, rozmawiamy o ${topic}`,
    });

  return (
    <View
      testID="max-tutor-topic-notice"
      accessibilityLiveRegion="polite"
      style={{
        minHeight: 40,
        borderRadius: 14,
        backgroundColor: t.accentBg,
        paddingHorizontal: 12,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Ionicons name="swap-horizontal-outline" size={18} color={t.accent} />
      <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700', flex: 1 }}>{text}</Text>
    </View>
  );
}

export default MaxTutorTopicNotice;
