import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';

import type { TutorConversationMode } from '../../app/max_tutor_live_board_state';
import { triLang, type Lang } from '../../constants/i18n';
import { useTheme } from '../ThemeContext';

type Props = {
  mode: TutorConversationMode;
  title: string;
  currentTopic: string;
  sceneTitle: string;
  mastery: number;
  lang: Lang;
};

export function MaxTutorGoalStrip({ mode, title, currentTopic, sceneTitle, mastery, lang }: Props) {
  const { theme: t, f } = useTheme();
  const isFreeTalk = mode === 'free_talk';
  const cleanTopic = currentTopic.trim();
  const cleanSceneTitle = sceneTitle.trim();
  const contextTitle = isFreeTalk ? cleanTopic : (cleanSceneTitle || title.trim());
  const safeMastery = Math.max(0, Math.min(3, Math.floor(mastery)));
  const freeTalk = triLang(lang, {
    ru: 'Свободный разговор', uk: 'Вільна розмова', es: 'Conversación libre',
    'pt-BR': 'Conversa livre', vi: 'Trò chuyện tự do', id: 'Percakapan bebas',
    tr: 'Serbest konuşma', pl: 'Swobodna rozmowa',
  });
  const goalLabel = triLang(lang, {
    ru: 'Цель урока', uk: 'Мета уроку', es: 'Objetivo de la lección',
    'pt-BR': 'Objetivo da aula', vi: 'Mục tiêu bài học', id: 'Tujuan pelajaran',
    tr: 'Ders hedefi', pl: 'Cel lekcji',
  });
  const sceneLabel = triLang(lang, {
    ru: 'Сценка', uk: 'Сценка', es: 'Escena', 'pt-BR': 'Cena', vi: 'Tình huống',
    id: 'Adegan', tr: 'Sahne', pl: 'Scenka',
  });
  const progressLabel = triLang(lang, {
    ru: `Прогресс цели: ${safeMastery} из 3`, uk: `Прогрес цілі: ${safeMastery} з 3`,
    es: `Progreso del objetivo: ${safeMastery} de 3`, 'pt-BR': `Progresso do objetivo: ${safeMastery} de 3`,
    vi: `Tiến độ mục tiêu: ${safeMastery} trên 3`, id: `Kemajuan tujuan: ${safeMastery} dari 3`,
    tr: `Hedef ilerlemesi: 3 üzerinden ${safeMastery}`, pl: `Postęp celu: ${safeMastery} z 3`,
  });

  return (
    <View
      testID="max-tutor-goal-strip"
      accessibilityLiveRegion="polite"
      style={{
        minHeight: 58,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.bgSurface,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View
        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.accentBg, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons
          name={isFreeTalk ? 'chatbubbles-outline' : cleanSceneTitle ? 'people-outline' : 'sparkles-outline'}
          size={18}
          color={t.accent}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', textTransform: 'uppercase' }}>
          {isFreeTalk ? freeTalk : cleanSceneTitle ? sceneLabel : goalLabel}
        </Text>
        {contextTitle !== '' ? (
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800', marginTop: 2 }}>
            {contextTitle}
          </Text>
        ) : null}
      </View>
      {!isFreeTalk ? (
        <View
          accessibilityLabel={progressLabel}
          style={{ flexDirection: 'row', gap: 4, minWidth: 44, justifyContent: 'flex-end' }}
        >
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: step <= safeMastery ? t.accent : t.border }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default MaxTutorGoalStrip;
