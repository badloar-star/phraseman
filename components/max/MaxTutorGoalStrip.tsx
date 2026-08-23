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

  const kindLabel = isFreeTalk ? freeTalk : cleanSceneTitle ? sceneLabel : goalLabel;

  return (
    // зачем (владелец 2026-08-23): «сделай текст ниже и чтобы он не обрезался».
    // Была одна строка `numberOfLines={1}` в ряд с точками прогресса: длинная
    // цель («Поздороваться и попрощаться…») упиралась в точки и обрывалась
    // многоточием — человек не видел, что именно учит. Стало: метка отдельной
    // тихой строкой сверху, название под ней на всю ширину в две строки без
    // обрезки, точки прогресса переехали к метке (они узкие и не воруют ширину
    // у названия). Фон и обводку не вводим — разделяем тоном и размером.
    <View
      testID="max-tutor-goal-strip"
      accessibilityLiveRegion="polite"
      accessibilityLabel={contextTitle === '' ? kindLabel : `${kindLabel}: ${contextTitle}`}
      style={{
        // Высота фиксирована под метку + две строки названия: цель приходит не
        // сразу, и без резерва блок выталкивал бы сферу вниз при её появлении
        // (контракт «первый кадр = финальная геометрия»).
        minHeight: 56,
        // зачем: владелец просил опустить текст ниже — отступ сверху отодвигает
        // справку от шапки, чтобы она не читалась как её вторая строка.
        marginTop: 6,
        gap: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: t.textMuted, fontSize: f.label, fontWeight: '600' }}
          maxFontSizeMultiplier={1.6}
        >
          {kindLabel}
        </Text>
        {!isFreeTalk ? (
          <View
            accessibilityLabel={progressLabel}
            style={{ flexDirection: 'row', gap: 4, justifyContent: 'flex-end' }}
          >
            {[1, 2, 3].map((step) => (
              <View
                key={step}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: step <= safeMastery ? t.accent : t.textGhost,
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
      {contextTitle === '' ? null : (
        // Название ведёт по тону и весу, но остаётся справкой: две строки —
        // потолок, дальше многоточие, иначе длинная цель съест место сферы.
        <Text
          numberOfLines={2}
          style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '800', lineHeight: Math.round(f.sub * 1.35) }}
          maxFontSizeMultiplier={1.6}
        >
          {contextTitle}
        </Text>
      )}
    </View>
  );
}

export default MaxTutorGoalStrip;
