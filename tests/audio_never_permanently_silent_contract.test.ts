jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

import fs from 'fs';
import path from 'path';
import {
  acquireAudioActivity,
  describeLiveAudioLeases,
  getAudioActivitySnapshot,
  releaseStaleAudioActivity,
  resetAudioActivityForTests,
} from '../modules/audio/audio_activity';
import { SoundArbiter } from '../modules/audio/sound_arbiter';
import type { SoundClock } from '../modules/audio/sound_clock';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

class FakeClock implements SoundClock {
  nowMs = 0;
  now = () => this.nowMs;
  advance(ms: number) { this.nowMs += ms; }
}

/**
 * Сторож класса бага «в приложении пропала озвучка, помогает только перезапуск».
 *
 * Прежний сторож (audio_runtime_ownership_contract) проверял НАЛИЧИЕ строк —
 * что нужная функция где-то упомянута. Пять настоящих утечек аренды прошли мимо
 * него именно поэтому. Здесь проверяется ПОВЕДЕНИЕ: ни одно состояние звука не
 * имеет права быть бессрочным.
 *
 * Если этот файл упал — звук снова может замолчать навсегда. Чинить надо
 * поведение, а не сторожа.
 */
describe('аудио никогда не замолкает навсегда', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetAudioActivityForTests();
  });

  afterEach(() => {
    resetAudioActivityForTests();
    jest.useRealTimers();
  });

  test('забытая аренда снимается предохранителем, а не живёт до перезапуска', () => {
    // Вызывающий взял аренду и «забыл» вернуть — ровно то, что делали пять
    // найденных аудитом мест.
    acquireAudioActivity('spoken', 'test:leaky-screen');
    expect(getAudioActivitySnapshot().spokenActive).toBe(true);

    jest.advanceTimersByTime(90_000);

    expect(getAudioActivitySnapshot().spokenActive).toBe(false);
    expect(describeLiveAudioLeases()).toHaveLength(0);
  });

  test('забытая аренда записи тоже снимается: иначе молчит вся озвучка', () => {
    // recordingActive=true заставляет claimSpokenAudio отдавать null по всему
    // приложению — самый тяжёлый вариант поломки.
    acquireAudioActivity('recording', 'test:leaky-microphone');
    expect(getAudioActivitySnapshot().recordingActive).toBe(true);

    jest.advanceTimersByTime(90_000);

    expect(getAudioActivitySnapshot().recordingActive).toBe(false);
  });

  test('честно возвращённая аренда не ждёт предохранителя', () => {
    const lease = acquireAudioActivity('spoken', 'test:healthy-screen');
    lease.release();

    expect(getAudioActivitySnapshot().spokenActive).toBe(false);
    expect(describeLiveAudioLeases()).toHaveLength(0);
  });

  test('повторный release идемпотентен и не уводит счётчик в минус', () => {
    const lease = acquireAudioActivity('spoken', 'test:double-release');
    lease.release();
    lease.release();

    const second = acquireAudioActivity('spoken', 'test:next-playback');
    expect(getAudioActivitySnapshot().spokenActive).toBe(true);
    second.release();
    expect(getAudioActivitySnapshot().spokenActive).toBe(false);
  });

  test('возврат из фона снимает аренду, осиротевшую при уходе в фон', () => {
    acquireAudioActivity('spoken', 'test:interrupted-by-call');
    jest.advanceTimersByTime(5_000);

    const cleared = releaseStaleAudioActivity('app-foreground');

    expect(cleared).toBe(1);
    expect(getAudioActivitySnapshot().spokenActive).toBe(false);
  });

  test('возврат из фона НЕ трогает аренду, взятую только что', () => {
    const fresh = acquireAudioActivity('spoken', 'test:started-on-resume');

    expect(releaseStaleAudioActivity('app-foreground')).toBe(0);
    expect(getAudioActivitySnapshot().spokenActive).toBe(true);
    fresh.release();
  });

  test('тишина эффектов на время речи конечна даже без сигнала о её конце', () => {
    const clock = new FakeClock();
    const arbiter = new SoundArbiter(clock);

    // Речь началась, но парный setVoiceActive(false) не придёт никогда —
    // осиротевшая аренда, оборванный колбэк движка.
    arbiter.setVoiceActive(true);
    // Событие с deferAfterVoice откладывается, остальные отбрасываются —
    // важно, что НИ ОДНО не звучит, пока приложение считает, что идёт речь.
    expect(arbiter.request('pm.system.info').kind).not.toBe('play');
    expect(arbiter.request('pm.ui.tap_soft')).toMatchObject({ kind: 'drop', reason: 'voice' });

    clock.advance(30_001);

    // Сигнал о конце речи так и не пришёл, но потолок истёк — звук вернулся сам.
    expect(arbiter.request('pm.ui.tap_soft')).toMatchObject({ kind: 'play' });
  });

  test('потолок НЕ прорывается, пока речь реально звучит (иначе эффекты поверх голоса)', () => {
    const clock = new FakeClock();
    let voiceHeld = true;
    // Сверка с владельцем звука: голос ещё держит аудиотракт.
    const arbiter = new SoundArbiter(clock, () => voiceHeld);

    arbiter.setVoiceActive(true);
    clock.advance(30_001);

    // Речь длиннее потолка — защита обязана продлиться, а не рухнуть.
    expect(arbiter.request('pm.ui.tap_soft')).toMatchObject({ kind: 'drop', reason: 'voice' });

    // Голос отпустил аудиотракт, но парный сигнал о конце всё ещё не пришёл.
    voiceHeld = false;
    clock.advance(30_001);

    expect(arbiter.request('pm.ui.tap_soft')).toMatchObject({ kind: 'play' });
  });

  test('уборка после фона снимает аренду её же механизмом, без двойного учёта', () => {
    const lease = acquireAudioActivity('spoken', 'test:orphaned-by-background');
    jest.advanceTimersByTime(5_000);

    expect(releaseStaleAudioActivity('app-foreground')).toBe(1);
    expect(getAudioActivitySnapshot().spokenActive).toBe(false);

    // Владелец очнулся и всё-таки вернул аренду: повторного уменьшения быть не
    // должно, иначе следующая честная озвучка «уйдёт в минус» и замолчит.
    lease.release();
    const next = acquireAudioActivity('spoken', 'test:next-playback');
    expect(getAudioActivitySnapshot().spokenActive).toBe(true);
    next.release();
    expect(getAudioActivitySnapshot().spokenActive).toBe(false);

    // И таймер предохранителя снятой аренды не должен выстрелить ложной тревогой.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.advanceTimersByTime(120_000);
    const falseAlarms = warn.mock.calls.filter((call) => String(call[1] ?? '').includes('watchdog:forced-release'));
    warn.mockRestore();
    expect(falseAlarms).toHaveLength(0);
  });
});

describe('источники отказа звука объясняют причину', () => {
  test('перехват в бэкенде эффектов не проглатывает отказ молча', () => {
    const backend = read('modules', 'audio', 'expo_sfx_backend.ts');
    // Именно немой `catch { return false; }` скрывал отказ ОС в новом плеере.
    expect(backend).not.toMatch(/}\s*catch\s*{\s*return false;\s*}/);
    expect(backend).toContain('sfx:play-failed');
  });

  test('слот плеера эффектов имеет предельный срок жизни', () => {
    const backend = read('modules', 'audio', 'expo_sfx_backend.ts');
    expect(backend).toContain('PLAYBACK_MAX_LIFETIME_MS');
    expect(backend).toContain('sfx:playback-watchdog');
    // Таймер обязан сниматься на ОБОИХ путях освобождения слота.
    expect(backend.match(/clearTimeout\(playback\.watchdog\)/g) ?? []).toHaveLength(2);
  });

  test('системная озвучка имеет страховку завершения', () => {
    const useAudio = read('hooks', 'use-audio.ts');
    // Освобождение аренды не имеет права зависеть только от колбэков движка.
    expect(useAudio).toContain('tts:completion-guard');
    expect(useAudio).toContain('settleSpeech');
  });

  test('бессрочная тишина эффектов запрещена', () => {
    const arbiter = read('modules', 'audio', 'sound_arbiter.ts');
    expect(arbiter).not.toContain('Number.POSITIVE_INFINITY');
    expect(arbiter).toContain('VOICE_QUIET_CEILING_MS');
  });

  test('озвучка урока освобождает аренду на каждом выходе', () => {
    const lesson = read('app', 'learning-v2', 'session', '[id].tsx');
    expect(lesson).toContain('lesson:audio-skip');
    // Ранний выход после seekTo раньше уходил БЕЗ stopAudioAttempt() — аренда
    // голоса оставалась висеть навсегда. Проверяем именно этот блок: в нём
    // перед return обязан стоять вызов освобождения.
    const guardedExit = lesson.match(
      /!claim\.isCurrent\(\)[\s\S]{0,200}?!audioAttemptPendingRef\.current[\s\S]{0,900}?return;/,
    );
    expect(guardedExit).not.toBeNull();
    expect(guardedExit?.[0]).toContain('stopAudioAttempt()');
  });

  test('речь карточек освобождает аренду, даже если движок бросил исключение', () => {
    const service = read('app', 'flashcards', 'SoundService.ts');
    expect(service).toContain('flashcards:speak-threw');
  });

  test('возврат приложения на передний план восстанавливает владение звуком', () => {
    const layout = read('app', '_layout.tsx');
    // Порядок важен: сперва штатная остановка владельцев (их release снимает
    // аренду), затем уборка аренд, оставшихся без владельца.
    expect(layout).toContain('stopAllAudioOwnersOnResume');
    expect(layout).toContain('releaseStaleAudioActivity');
    expect(layout.indexOf('stopAllAudioOwnersOnResume();'))
      .toBeLessThan(layout.indexOf("releaseStaleAudioActivity('app-foreground')"));
  });

  test('страховка речи спрашивает движок, а не гадает по длине текста', () => {
    const useAudio = read('hooks', 'use-audio.ts');
    // Оценка «миллисекунд на символ» врала на замедленной речи и длинных
    // репликах — страховка отбирала бы аренду у живой озвучки.
    expect(useAudio).toContain('Speech.isSpeakingAsync()');
    expect(useAudio).not.toMatch(/spokenText\.length\s*\*\s*\d+/);
  });

  test('потолок тишины сверяется с владельцем звука', () => {
    const director = read('modules', 'audio', 'sound_director.ts');
    const arbiter = read('modules', 'audio', 'sound_arbiter.ts');
    expect(arbiter).toContain('isVoiceHeld');
    expect(director).toContain('getAudioActivitySnapshot().spokenActive');
  });

  test('ни одна аренда звука не берётся анонимно', () => {
    // Безымянная аренда пишется в трассу как «unknown» и лишает предохранитель
    // главной ценности: по логу невозможно найти виновный экран.
    const roots = ['app', 'components', 'hooks', 'modules'];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '_archive') continue;
          walk(full);
        } else if (/\.tsx?$/.test(entry.name) && entry.name !== 'audio_runtime_arbiter.ts') {
          files.push(full);
        }
      }
    };
    for (const root of roots) walk(path.join(ROOT, root));

    const anonymous: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const pattern = /claim(?:Spoken|Recording|Ambient)Audio\(/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source)) !== null) {
        let index = match.index + match[0].length;
        let depth = 1;
        while (index < source.length && depth > 0) {
          if (source[index] === '(') depth += 1;
          else if (source[index] === ')') depth -= 1;
          index += 1;
        }
        const call = source.slice(match.index, index);
        if (!/,\s*'[^']+'\s*\)$/.test(call)) {
          anonymous.push(`${path.relative(ROOT, file)}:${source.slice(0, match.index).split('\n').length}`);
        }
      }
    }
    expect(anonymous).toEqual([]);
  });
});
