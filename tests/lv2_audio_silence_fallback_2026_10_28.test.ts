// Жалоба пользователя 28.10 (2.0.2): «Урок 1 · Эпизод 1 · listen_choose — не слышно. Телефон работает, интернет есть».
// Запись занятия может молча не зазвучать (голос не выдан, «не готово» за 4 с) — без onError запасной путь не включался.
// Сторож: таймер старта записи → системный голос; поздний старт записи после перехода глушится; тихие выходы пишут причину.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('звук занятия V2: тишины без запасного голоса нет', () => {
  const audio = read('hooks/use-audio.ts');
  const player = read('modules/learning-v2/audio/progressive_audio_player.ts');

  it('запись не зазвучала за 4,5 с → гасим её и говорим системным голосом', () => {
    expect(audio).toContain('const LV2_RECORDED_START_TIMEOUT_MS = 4_500;');
    expect(audio).toMatch(/startTimer = setTimeout\(\(\) => \{ startTimer = null; if \(!started\) fallback\('start_timeout'\); \}, LV2_RECORDED_START_TIMEOUT_MS\);/);
    expect(audio).toMatch(/fellBack = true;\s*trace\('fallback:system_tts', \{ reason \}\);\s*stopLearningV2RecordedAudioIfLoaded\(\);\s*speakWithSystemTts\(\);/);
  });

  it('ошибка плеера, нет записи на телефоне, сбой загрузки — тоже системный голос', () => {
    expect(audio).toContain("onError: (error: Error) => fallback(`player_error:${error.message}`)");
    expect(audio).toContain("if (!played) fallback('not_cached');");
    expect(audio).toMatch(/fallback\(`catch:\$\{/);
  });

  it('запись стартовала уже после перехода — глушим, два голоса не звучат', () => {
    expect(audio).toMatch(/if \(fellBack\) \{ trace\('recorded:late_start_stopped'\); stopLearningV2RecordedAudioIfLoaded\(\); return; \}/);
  });

  it('тихие выходы системного голоса и плеера записи называют причину и значения', () => {
    for (const stage of ['tts:skip_before_queue', 'tts:skip_in_queue']) expect(audio).toContain(`'[LV2-AUDIO] ${stage}'`);
    expect(audio).toContain("reason: 'claim_refused_recording_active', ...ttsState()");
    expect(audio).toContain("reason: 'audio_not_ready', ...ttsState()");
    for (const stage of ['player:resolve_failed', 'player:not_cached', 'player:claim_refused', 'player:ready_check_failed', 'player:not_ready']) {
      expect(player).toContain(`"${stage}"`);
    }
    expect(player).not.toMatch(/\}\s*catch\s*\{/);
  });
});
