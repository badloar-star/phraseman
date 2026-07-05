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
import { hasPhraseAudio } from './phrase_audio_player';
import { getUserSettingsSnapshot } from '../app/user_settings_store';
import { ttsLocaleForStudyTarget } from '../app/phrase_target_utils';
import type { StudyTargetLang } from '../app/study_target_lang_dev';

const ANSWER_SPEECH_MIN_WAIT_TIMEOUT_MS = 1800;
// Потолок фолбэк-таймера. Он ТОЛЬКО страховка от зависшего TTS — реальная озвучка
// снимается по onDone/onStopped/onError мгновенно. Прежний потолок 6500 мс обрезал
// длинные фразы (13+ слов) на пути со скачиванием клипа (grace 4500 мс + ~5.6 с речи
// = ~10 с, упиралось в 6.5 с → фраза не дозвучивала, «Моя практика» перескакивала
// на следующую). Поднимаем до 12 с: длинные фразы дозвучивают, зависший TTS всё равно
// разожмётся не позже 12 с (а обычно раньше — по onError/onStopped).
const ANSWER_SPEECH_MAX_WAIT_TIMEOUT_MS = 12000;
const ANSWER_SPEECH_FIRST_CLIP_GRACE_MS = 4500;
const ANSWER_SPEECH_SYSTEM_TTS_GRACE_MS = 600;

function answerSpeechWaitTimeoutMs(text: string, rate: number | undefined, mayUseFirstClipDownload: boolean): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const safeRate = typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : 1;
  const startupGraceMs = mayUseFirstClipDownload
    ? ANSWER_SPEECH_FIRST_CLIP_GRACE_MS
    : ANSWER_SPEECH_SYSTEM_TTS_GRACE_MS;
  const spokenMs = (700 + words * 380) / Math.max(0.5, safeRate);
  return Math.min(
    ANSWER_SPEECH_MAX_WAIT_TIMEOUT_MS,
    Math.max(
      ANSWER_SPEECH_MIN_WAIT_TIMEOUT_MS,
      Math.ceil(startupGraceMs + spokenMs),
    ),
  );
}

export function useSpeakAnswer() {
  const { speak, stop } = useAudio();

  // Проговорить правильный ответ вслух. Тихо ничего не делает, если текст пуст
  // или пользователь выключил озвучку в настройках.
  const speakAnswer = useCallback(
    (text: string, studyTarget: StudyTargetLang): Promise<void> => {
      const line = (text ?? '').trim();
      if (!line) return Promise.resolve();
      const settings = getUserSettingsSnapshot();
      if (!settings.voiceOut) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const language = ttsLocaleForStudyTarget(studyTarget);
        const mayUseFirstClipDownload = language.toLowerCase().startsWith('en')
          && !(settings.speechVoiceId ?? '').trim()
          && hasPhraseAudio(line);
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const finish = () => {
          if (settled) return;
          settled = true;
          if (timer) clearTimeout(timer);
          resolve();
        };
        timer = setTimeout(finish, answerSpeechWaitTimeoutMs(line, settings.speechRate, mayUseFirstClipDownload));
        try {
          speak(line, settings.speechRate, {
            language,
            onDone: finish,
            onStopped: finish,
            onError: finish,
          });
        } catch {
          finish();
        }
      });
    },
    [speak],
  );

  return { speakAnswer, stopAnswer: stop };
}
