/**
 * Контракт озвучки заданий турнира.
 *
 * зачем эти тесты: два риска, оба дорогие.
 * 1) Деньги: без дедупа по тексту одна фраза озвучивалась бы заново при каждом
 *    одобрении — платим OpenAI за то же самое.
 * 2) Рассинхрон: правку текста без инвалидации звука игрок услышит как «звучит
 *    одно, написано другое». В проекте это известный класс бага.
 */
import {
  TOURNAMENT_TTS_VOICE,
  audioTextForTask,
  checkTournamentAudioFreshness,
  modeNeedsAudio,
  planTournamentSpeech,
  tournamentAudioDownloadUrl,
  tournamentAudioObjectPath,
  tournamentAudioTextHash,
  tournamentAudioToken,
} from './tournament_audio';

describe('озвучка заданий турнира', () => {
  it('одинаковый текст → один файл (платим за озвучку один раз)', () => {
    // Регистр и лишние пробелы не должны плодить дубли в Storage.
    expect(tournamentAudioObjectPath('Nice to meet you'))
      .toBe(tournamentAudioObjectPath('  nice   to meet you '));
    // Разный текст — разные файлы, иначе игрок услышит чужую фразу.
    expect(tournamentAudioObjectPath('Nice to meet you'))
      .not.toBe(tournamentAudioObjectPath('See you later'));
  });

  it('путь и токен детерминированы — ссылки не протухают при перезаписи', () => {
    const path = tournamentAudioObjectPath('Nice to meet you');
    expect(path).toMatch(/^tournament-audio\/[0-9a-f]{32}\.mp3$/);
    expect(tournamentAudioToken(path)).toBe(tournamentAudioToken(path));
    expect(tournamentAudioToken(path)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('ссылка для клиента — валидный Firebase Storage URL', () => {
    const path = tournamentAudioObjectPath('Hello');
    const url = tournamentAudioDownloadUrl('bucket.app', path, tournamentAudioToken(path));
    expect(url).toContain('https://firebasestorage.googleapis.com/v0/b/bucket.app/o/');
    // Слэш в пути обязан быть экранирован, иначе Storage вернёт 404.
    expect(url).toContain('tournament-audio%2F');
    expect(url).toContain('alt=media&token=');
  });

  it('озвучка нужна только аудио-режимам', () => {
    for (const mode of ['listen_choose', 'sound_contrast', 'listen_build']) {
      expect(modeNeedsAudio(mode)).toBe(true);
    }
    for (const mode of ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match']) {
      expect(modeNeedsAudio(mode)).toBe(false);
    }
    // Текстовому режиму заявка на озвучку не выдаётся вообще.
    expect(planTournamentSpeech('guess_phrase', { phrase: 'Hello' })).toBeNull();
  });

  it('заявка содержит текст, голос обучения и путь', () => {
    const plan = planTournamentSpeech('listen_choose', { phrase: 'Nice to meet you' });
    expect(plan).not.toBeNull();
    expect(plan?.request.text).toBe('Nice to meet you');
    expect(plan?.request.voice).toBe(TOURNAMENT_TTS_VOICE);
    // Чуть медленнее обычного: фраза звучит один раз под таймером.
    expect(plan?.request.speed).toBeLessThan(1);
    expect(plan?.objectPath).toBe(tournamentAudioObjectPath('Nice to meet you'));
  });

  it('пустой и слишком длинный текст не озвучиваются', () => {
    expect(audioTextForTask('listen_choose', { phrase: '   ' })).toBeNull();
    expect(audioTextForTask('listen_choose', { phrase: 'a'.repeat(400) })).toBeNull();
    expect(audioTextForTask('listen_choose', {})).toBeNull();
  });

  it('СТРАЖ: правка текста делает озвучку несвежей', () => {
    const asset = {
      downloadUrl: 'https://x/a.mp3',
      textHash: tournamentAudioTextHash('Nice to meet you'),
      voice: TOURNAMENT_TTS_VOICE,
    };
    expect(checkTournamentAudioFreshness(asset, 'Nice to meet you')).toEqual({ fresh: true });
    // Владелец поправил фразу — старый звук играть нельзя.
    expect(checkTournamentAudioFreshness(asset, 'Nice to meet you again'))
      .toEqual({ fresh: false, reason: 'text_changed' });
  });

  it('СТРАЖ: отсутствие озвучки и смена голоса тоже несвежесть', () => {
    expect(checkTournamentAudioFreshness(null, 'Hello'))
      .toEqual({ fresh: false, reason: 'missing' });
    expect(checkTournamentAudioFreshness({ downloadUrl: 'https://x/a.mp3' }, 'Hello'))
      .toEqual({ fresh: false, reason: 'missing' });
    const otherVoice = {
      downloadUrl: 'https://x/a.mp3',
      textHash: tournamentAudioTextHash('Hello'),
      voice: 'marin',
    };
    expect(checkTournamentAudioFreshness(otherVoice, 'Hello'))
      .toEqual({ fresh: false, reason: 'voice_changed' });
  });
});
