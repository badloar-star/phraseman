// зачем (координатор 13.10, деньги): режим энергии Б (750314a24) останавливает занятие на ПОСЛЕДНЕЙ энергии эффектом energy_exhausted. Любой экран, который сравнивает эффект только с
// 'attempts_exhausted', на последней энергии пошёл бы дальше бесплатно. Этот контракт держит три вещи: (1) предикат — ровно два стоп-эффекта; (2) каждый экран из списка режима Б идёт через предикат
// и в ветке остановки остаётся на текущем вопросе (не двигается дальше); (3) экраны, которые сравнивают напрямую, НЕ входят в список режима Б (мистейк-практика и предлоги остаются в режиме А).
import fs from 'node:fs';
import path from 'node:path';

import { isMistakeChargeActivity } from '../app/energy_mode';
import { isAttemptsInputBlocked, isAttemptsStopEffect } from '../app/session_attempts/session_attempts_stop';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('предикат остановки занятия', () => {
  it('останавливают ровно два эффекта: кончились сердечки и кончилась энергия', () => {
    expect(isAttemptsStopEffect('attempts_exhausted')).toBe(true);
    expect(isAttemptsStopEffect('energy_exhausted')).toBe(true);
    for (const other of ['none', 'attempt_consumed', 'ignored', 'recovered'] as const) {
      expect(isAttemptsStopEffect(other as never)).toBe(false);
    }
  });

  it('ввод заблокирован в ожидании восстановления и в остановке без энергии, в активной фазе — нет', () => {
    expect(isAttemptsInputBlocked('awaiting_recovery')).toBe(true);
    expect(isAttemptsInputBlocked('stopped_no_energy')).toBe(true);
    expect(isAttemptsInputBlocked('active')).toBe(false);
    expect(isAttemptsInputBlocked('ended')).toBe(false);
  });
});

/** Экран → что обязано происходить в ветке остановки (остаться на этом вопросе: не идти дальше, не запускать автопереход). */
const SCREENS: ReadonlyArray<Readonly<{ file: string; stay: RegExp; why: string }>> = [
  { file: 'app/flashcards_blitz_session.tsx', stay: /if \(isAttemptsStopEffect\(attemptEffect\)\) \{/, why: 'Блиц: пауза отсчёта' },
  { file: 'app/flashcards_speaking_session.tsx', stay: /if \(isAttemptsStopEffect\(attemptEffect\)\) \{\n\s*clearAdvanceTimer\(\);\n\s*setHoldActive\(false\);\n\s*stopSpeechAndCancelPendingAdvance\(\);/, why: 'Речь: таймер перехода снят, удержание и озвучка остановлены' },
  { file: 'app/flashcards_swipe.tsx', stay: /if \(isAttemptsStopEffect\(attemptEffect\)\) \{\n\s*audio\.stop\(\);\n\s*\}\n\s*return;/, why: 'Свайп: звук остановлен, return до перехода к следующей карточке' },
  { file: 'app/lesson_irregular_verbs.tsx', stay: /if \(isAttemptsStopEffect\(attemptEffect\)\) \{\n\s*return;/, why: 'Глаголы: return до автоперехода' },
  { file: 'app/lesson1.tsx', stay: /if \(isAttemptsStopEffect\(attemptEffect\)\) \{[^\n]*\n[^\n]*\n\s*return;/, why: 'Урок: return до записи следующей ячейки' },
  { file: 'app/lesson_words.tsx', stay: /if \(isAttemptsStopEffect\(attemptEffect\)\) \{\n\s*recordWrongVocabularyAttempt\(current, opt\);\n\s*return;/, why: 'Слова: return до автоперехода' },
];

describe.each(SCREENS)('экран режима Б остаётся на вопросе при остановке: $file', ({ file, stay, why }) => {
  const src = read(file);

  it(`идёт через общий предикат (${why})`, () => {
    expect(src).toContain("from './session_attempts/session_attempts_stop'");
    expect(src).toMatch(stay);
  });

  it("нет прямого сравнения только с 'attempts_exhausted' — иначе на последней энергии занятие шло бы дальше", () => {
    expect(src).not.toContain("attemptEffect === 'attempts_exhausted'");
  });

  it('остановку показывает HUD с модальной карточкой «Энергия закончилась» (EnergyStopSheet), а не тихий пропуск', () => {
    expect(src).toContain('<SessionAttemptsHud');
  });
});

describe('экраны с прямым сравнением не входят в режим Б (деньги)', () => {
  it('отработка ошибок и предлоги остаются в режиме А: ошибка не снимает энергию, energy_exhausted там невозможен', () => {
    expect(isMistakeChargeActivity('mistake_practice')).toBe(false);
    expect(isMistakeChargeActivity('preposition_drill')).toBe(false);
    // …и пока это так, их прямое сравнение безопасно. Попал в список режима Б — тест роняется и требует перевода экрана на предикат.
    expect(read('app/mistake_practice_session.tsx')).toContain("attemptEffect === 'attempts_exhausted'");
  });

  it('все экраны списка режима Б перечислены выше (шесть: Блиц, Речь, Свайп, Глаголы, Урок, Слова) + Learning V2', () => {
    for (const activity of ['flashcards', 'lesson_words', 'irregular_verbs', 'classic_lesson', 'learning_v2_session'] as const) {
      expect(isMistakeChargeActivity(activity)).toBe(true);
    }
    expect(SCREENS.map((s) => s.file)).toEqual(expect.arrayContaining([
      'app/flashcards_blitz_session.tsx', 'app/flashcards_speaking_session.tsx', 'app/flashcards_swipe.tsx',
      'app/lesson_irregular_verbs.tsx', 'app/lesson1.tsx', 'app/lesson_words.tsx',
    ]));
    // Learning V2 — Codex, здесь только проверка, что его экраны тоже на предикате
    expect(read('app/learning_v2_direct_session_player_v1.tsx')).toContain('isAttemptsStopEffect(attemptEffect)');
    expect(read('app/learning-v2/session/[id].tsx')).toContain('isAttemptsStopEffect(attemptEffect)');
  });
});
