// Озвучка правильного ответа в тренажёрах «Моей практики».
//
// В уроках (lesson1.tsx) правильная фраза проговаривается вслух при показе
// результата — это помогает запомнить произношение. В тренажёрах «Моей
// практики» (слова / фразы / арена / умная сессия / повтор) такого не было,
// поэтому при ответе ничего не звучало. Этот хук переносит тот же паттерн:
// проговорить целевой (английский/учебный) текст при правильном ответе,
// уважая пользовательскую настройку voiceOut и скорость speechRate.
//
// Держим отдельно от use-audio.ts, чтобы каждый тренажёр подключал озвучку
// одной строкой и не дублировал чтение настроек/локали.

import { useCallback } from 'react';
import { useAudio } from './use-audio';
import { getUserSettingsSnapshot } from '../app/user_settings_store';
import { ttsLocaleForStudyTarget } from '../app/phrase_target_utils';
import type { StudyTargetLang } from '../app/study_target_lang_dev';

export function useSpeakAnswer() {
  const { speak, stop } = useAudio();

  // Проговорить правильный ответ вслух. Тихо ничего не делает, если текст пуст
  // или пользователь выключил озвучку в настройках.
  const speakAnswer = useCallback(
    (text: string, studyTarget: StudyTargetLang) => {
      const line = (text ?? '').trim();
      if (!line) return;
      const settings = getUserSettingsSnapshot();
      if (!settings.voiceOut) return;
      speak(line, settings.speechRate, { language: ttsLocaleForStudyTarget(studyTarget) });
    },
    [speak],
  );

  return { speakAnswer, stopAnswer: stop };
}
