/**
 * ЗАМОК ВЛАДЕЛЬЦА 25.10: «удалить звук, который появляется при правильных ответах в любых режимах!!!»
 * Ни один обработчик верного ответа не звучит: звук «верно», «молния» серии верных ответов, Арена (верно / первым / комбо /
 * пары), звон «золотого задания» и возврат сердца за серию в Пике. Вибрация и анимация остаются, звук ошибки не тронут.
 * Сработал — верни заглушку, а не ослабляй сторож (ослабить — только по новому слову владельца).
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';
import {
  CORRECT_ANSWER_DIRECTOR_EVENTS,
  CORRECT_ANSWER_V2_EVENTS,
  isCorrectAnswerSoundSilenced,
} from '../modules/audio/correct_answer_silence';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

function walk(dir: string, out: string[]): void {
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (fs.statSync(path.join(ROOT, rel)).isDirectory()) { if (name !== 'node_modules' && name !== 'generated') walk(rel, out); continue; }
    if (/\.(tsx?|js)$/.test(name)) out.push(rel);
  }
}

describe('ЗАМОК ВЛАДЕЛЬЦА 25.10: нет звука на верный ответ ни в одном режиме', () => {
  it('заглушка знает все звуки верного ответа и не трогает звук ошибки', () => {
    for (const e of ['correct', 'lightning']) expect(isCorrectAnswerSoundSilenced(e, 'test')).toBe(true);
    for (const e of ['pm.arena.answer_correct', 'pm.arena.answer_first', 'pm.arena.combo_start', 'pm.arena.combo_up', 'pm.arena.pair_match', 'pm.arena.pair_clear']) {
      expect(CORRECT_ANSWER_DIRECTOR_EVENTS.has(e)).toBe(true);
    }
    for (const e of ['wrong', 'pm.arena.answer_wrong', 'pm.arena.pair_miss', 'tap', 'lesson_done']) expect(isCorrectAnswerSoundSilenced(e, 'test')).toBe(false);
    expect([...CORRECT_ANSWER_V2_EVENTS].sort()).toEqual(['correct', 'lightning']);
  });

  it('единые входы глушат раньше всего: банк V2, директор, мост старых звуков', () => {
    const bank = read('modules/sound_v2/sound_bank.ts');
    expect(bank).toMatch(/export function playEvent\(event: SoundV2EventId, options\?: PlayEventOptions\): SoundV2PlayResult \{\n[^\n]*\n  if \(isCorrectAnswerSoundSilenced\(String\(event\), 'sound_bank'\)\) return/);
    const director = read('modules/audio/sound_director.ts');
    expect(director).toMatch(/request\(eventId: SoundEventId, options: SoundRequestOptions = \{\}\): SoundDecision \{\n[^\n]*\n    if \(isCorrectAnswerSoundSilenced\(eventId/);
    const bridge = read('modules/sound_v2/legacy_bridge.ts');
    expect(bridge).toMatch(/MUTED_SOUND_V2_EVENTS[^\n]*'correct'[^\n]*'lightning'/);
    expect(bridge).toContain("'correct_answer_silenced'");
  });

  it('ни один экран не зовёт звук верного ответа в обход заглушки (кроме самой заглушки)', () => {
    const files: string[] = [];
    for (const dir of ['app', 'components', 'hooks', 'modules']) walk(dir, files);
    const offenders = files
      .filter((f) => f !== 'modules/audio/correct_answer_silence.ts')
      .filter((f) => /(?:tryPlayV2Event|playUnlessRecentlyPlayed)\(\s*'(?:correct|lightning)'/.test(read(f)));
    // ComboRing зовёт lightning — мост глушит его (MUTED_SOUND_V2_EVENTS), прямой банк — тоже (playEvent); список чистых обходов пуст
    expect(offenders.filter((f) => f !== 'components/feedback/ComboRing.tsx')).toEqual([]);
  });

  it('Пик: золотое задание и сердце за серию — без звука, вибрация остаётся', () => {
    for (const f of ['app/spire/use_spire_gold.ts', 'app/spire/use_spire_streak_heart.ts']) {
      const src = read(f);
      expect(src).not.toMatch(/tryPlayV2Event|playEvent\(|coins_many/);
      expect(src).toContain('void hapticSuccess();');
    }
  });

  it('строка в реестре замков владельца', () => {
    expect(read('docs/work/OWNER_LOCKS.md')).toContain('tests/owner_locks_correct_sound_2026_10_25.test.ts');
  });
});
