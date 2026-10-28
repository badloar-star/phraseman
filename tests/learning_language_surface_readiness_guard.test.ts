/**
 * СТОРОЖ D129: раздел для языка включает ТОЛЬКО владелец.
 *
 * зачем (владелец 2026-09-30, D129): «при добавлении языка/раздела ИИ-сессия обязана
 * спросить владельца, включать ли раздел для этого языка». Тест падает, если:
 *  (а) у клетки «язык × раздел» нет решения или ссылки на строку 03_DECISIONS.md;
 *  (б) появился язык или раздел без клетки;
 *  (в) клетку поменяли, а снимок ниже — нет (снимок правится ТОЛЬКО после ответа владельца).
 * Сработал — не «чини» тест: спроси владельца и запиши решение в 03_DECISIONS.md.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  LEARNING_LANGUAGE_SURFACES,
  LEARNING_LANGUAGE_TARGETS,
} from '../app/learning_language_surface_matrix';
import {
  LEARNING_LANGUAGE_SURFACE_READINESS,
  isLearnTabVisibleForTarget,
  listLearningSurfaceReadinessCells,
} from '../app/learning_language_surface_readiness';
import { isTodayTaskKindAvailableForTarget } from '../app/today_task_surface_filter';

const DECISIONS_PATH = path.join(__dirname, '..', 'docs', 'phraseman-2.0', '03_DECISIONS.md');

function askOwner(target: string, surface: string): string {
  return `Новый язык/раздел: спроси владельца, включать ли раздел ${surface} для языка ${target}, `
    + 'и запиши решение в 03_DECISIONS.md (таблица: app/learning_language_surface_readiness.ts).';
}

// Снимок решений владельца. Менять ТОЛЬКО вместе с новой строкой в 03_DECISIONS.md.
const OWNER_APPROVED_SNAPSHOT: Record<string, Record<string, string>> = {
  en: { lessons: 'ready', learning_v2: 'ready', daily_phrase: 'ready', dialogues: 'ready', arena: 'hidden', videos: 'ready', flashcards: 'ready', diagnostic_and_exam: 'ready', spire: 'ready' },
  es: { lessons: 'hidden', learning_v2: 'ready', daily_phrase: 'ready', dialogues: 'ready', arena: 'hidden', videos: 'ready', flashcards: 'ready', diagnostic_and_exam: 'hidden', spire: 'ready' },
  fr: { lessons: 'hidden', learning_v2: 'hidden', daily_phrase: 'ready', dialogues: 'ready', arena: 'hidden', videos: 'ready', flashcards: 'ready', diagnostic_and_exam: 'hidden', spire: 'ready' },
  de: { lessons: 'hidden', learning_v2: 'hidden', daily_phrase: 'ready', dialogues: 'ready', arena: 'hidden', videos: 'ready', flashcards: 'ready', diagnostic_and_exam: 'hidden', spire: 'ready' },
  it: { lessons: 'hidden', learning_v2: 'hidden', daily_phrase: 'ready', dialogues: 'hidden', arena: 'hidden', videos: 'ready', flashcards: 'ready', diagnostic_and_exam: 'hidden', spire: 'ready' },
};

describe('D129 guard: language × surface readiness', () => {
  const decisions = fs.readFileSync(DECISIONS_PATH, 'utf8');

  test('every target × surface cell has an owner decision with an existing D-reference', () => {
    for (const { target, surface, cell } of listLearningSurfaceReadinessCells()) {
      if (!cell) throw new Error(askOwner(target, surface));
      if (cell.status !== 'ready' && cell.status !== 'hidden') throw new Error(askOwner(target, surface));
      if (!/^D\d+$/.test(cell.decidedBy)) throw new Error(askOwner(target, surface));
      if (!decisions.includes(`| ${cell.decidedBy} |`)) {
        throw new Error(`${askOwner(target, surface)} Решения ${cell.decidedBy} нет в 03_DECISIONS.md.`);
      }
    }
  });

  test('no target or surface exists without a cell', () => {
    expect(Object.keys(LEARNING_LANGUAGE_SURFACE_READINESS).sort()).toEqual([...LEARNING_LANGUAGE_TARGETS].sort());
    for (const target of LEARNING_LANGUAGE_TARGETS) {
      for (const surface of LEARNING_LANGUAGE_SURFACES) {
        if (!LEARNING_LANGUAGE_SURFACE_READINESS[target]?.[surface]) throw new Error(askOwner(target, surface));
      }
    }
  });

  test('table matches the owner-approved snapshot', () => {
    for (const target of LEARNING_LANGUAGE_TARGETS) {
      for (const surface of LEARNING_LANGUAGE_SURFACES) {
        const approved = OWNER_APPROVED_SNAPSHOT[target]?.[surface];
        const actual = LEARNING_LANGUAGE_SURFACE_READINESS[target][surface].status;
        if (approved !== actual) throw new Error(askOwner(target, surface));
      }
    }
    expect(Object.keys(OWNER_APPROVED_SNAPSHOT).sort()).toEqual([...LEARNING_LANGUAGE_TARGETS].sort());
  });

  test('the course entry is available for English and owner-approved Spanish V2 (D201)', () => {
    expect(LEARNING_LANGUAGE_TARGETS.filter(isLearnTabVisibleForTarget)).toEqual(['en', 'es']);
    expect(LEARNING_LANGUAGE_SURFACE_READINESS.es.learning_v2.decidedBy).toBe('D201');
    expect(LEARNING_LANGUAGE_SURFACE_READINESS.es.lessons.status).toBe('hidden');
  });

  test('non-English Spire readiness is fail-closed to the signed local release manifest', () => {
    for (const target of ['es', 'fr', 'de', 'it'] as const) {
      const manifest = JSON.parse(fs.readFileSync(path.join(
        __dirname, '..', 'content', 'arena-multilingual', 'generated', target, 'manifest.json',
      ), 'utf8')) as {
        releaseEligible?: boolean;
        linguisticReviewReceipt?: { verdict?: string };
        adminPublicationReceipt?: { publicationStatus?: string };
      };
      const receiptReady = manifest.releaseEligible === true
        && manifest.linguisticReviewReceipt?.verdict === 'PASS'
        && manifest.adminPublicationReceipt?.publicationStatus === 'approved';
      expect(LEARNING_LANGUAGE_SURFACE_READINESS[target].spire.status).toBe(receiptReady ? 'ready' : 'hidden');
    }
  });

  // зачем D155/D134: задания дня читают клетки таблицы, а не свои списки языков.
  test('daily tasks follow the table: receipt-gated spire (D155) and mistakes only with the course (D134)', () => {
    expect(LEARNING_LANGUAGE_TARGETS.filter((t) => isTodayTaskKindAvailableForTarget('spire_steps', t))).toEqual(['en', 'es', 'fr', 'de', 'it']);
    expect(LEARNING_LANGUAGE_TARGETS.filter((t) => isTodayTaskKindAvailableForTarget('mistakes', t))).toEqual(['en']);
    expect(LEARNING_LANGUAGE_TARGETS.filter((t) => isTodayTaskKindAvailableForTarget('cards', t))).toEqual([...LEARNING_LANGUAGE_TARGETS]);
  });
});
