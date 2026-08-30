// Домашка MAX-звонка → карточки Тренажёра («настоящий ингест», аудит 2026-08-30).
//
// зачем: учитель голосом отправляет 2-3 отработанные фразы в домашку, значения
// на родном языке собираются инструментом assign_homework ИМЕННО под карточки
// (см. TutorHomeworkItem) — но до этого фикса ни одна карточка не создавалась,
// и обещание «фразы будут в Тренажёре» было ложью. Теперь после урока фразы
// ложатся в личную коллекцию тем же каналом, что и ручное создание:
//   • та же mutex-очередь custom_cards_store (гонки с редактором/undo исключены);
//   • тот же формат CardItem и та же раскладка перевода по локалям
//     (customCardLocalizationForLang — родной язык ученика в своё поле);
//   • дедуп по тексту фразы — повторная домашка не плодит дубликаты.
//
// Пейвол создания карточек здесь НЕ применяется намеренно: это не ручное
// создание из редактора, а результат платного урока (paid minutes / trial),
// обещанный учителем вслух.
//
// Логи: префикс [MAX-HW-INGEST]; ранние выходы и catch пишут причину всегда
// (правило «сперва логи»).

import type { Lang } from '../constants/i18n';
import { storageStudyTarget } from './target_storage_keys';
import { customCardLocalizationForLang } from './flashcards/custom_card_localization';
import { updateCustomCards } from './flashcards/custom_cards_store';
import type { CardItem } from './flashcards/types';
import { getTranscription } from './transcription';
import type { MaxVoiceStudyTarget } from './max_target_gate';
import { DebugLogger } from './debug-logger';

export interface MaxHomeworkIngestItem {
  text: string;
  meaning: string;
}

export interface MaxHomeworkIngestArgs {
  items: readonly MaxHomeworkIngestItem[];
  /** Язык интерфейса ученика — раскладывает meaning в правильное поле карточки. */
  lang: Lang;
  /** Язык курса этого звонка — карточки не должны попасть в чужой неймспейс. */
  studyTarget: MaxVoiceStudyTarget;
  sessionId: string;
  nowMs?: number;
}

export interface MaxHomeworkIngestResult {
  /** Сколько новых карточек создано. */
  created: number;
  /** Сколько фраз уже были в коллекции (дедуп по тексту). */
  duplicates: number;
  /** true — фразы этой домашки лежат в Тренажёре (создали сейчас или уже были). */
  savedToTrainer: boolean;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function dedupeKey(value: string): string {
  return normalizeText(value).toLocaleLowerCase();
}

/**
 * Чистая сборка: существующая коллекция + домашка → новые карточки.
 * Отдельно от записи ради юнит-тестов без AsyncStorage.
 */
export function buildMaxHomeworkCards(
  existing: readonly CardItem[],
  args: MaxHomeworkIngestArgs,
): { cards: CardItem[]; created: number; duplicates: number } {
  const now = args.nowMs ?? Date.now();
  const seen = new Set(existing.map((card) => dedupeKey(card.en ?? '')));
  const cards: CardItem[] = [];
  let duplicates = 0;
  args.items.forEach((item, index) => {
    const text = normalizeText(item.text ?? '');
    const meaning = normalizeText(item.meaning ?? '');
    if (!text || !meaning) {
      DebugLogger.info('[MAX-HW-INGEST]', `skip item ${index}: empty text=${text === ''} meaning=${meaning === ''}`);
      return;
    }
    const key = dedupeKey(text);
    if (seen.has(key)) {
      duplicates += 1;
      DebugLogger.info('[MAX-HW-INGEST]', `skip item ${index}: duplicate "${text}"`);
      return;
    }
    seen.add(key);
    const localized = customCardLocalizationForLang(args.lang, meaning);
    // Транскрипция — английская IPA; для fr/es курсов честнее без неё,
    // чем с английским прочтением французской фразы.
    const transcription = args.studyTarget === 'en' ? getTranscription(text) : '';
    cards.push({
      addedAt: now,
      id: `max_hw_${now}_${index}`,
      en: text,
      ...(transcription ? { transcription } : {}),
      ru: localized.baseRu,
      uk: localized.baseUk,
      es: localized.baseEs,
      sourceLocales: localized.plannedSourceLocales,
      categoryId: 'custom',
      isSystem: false,
      // След происхождения: карточку принёс учитель MAX из конкретного урока.
      source: 'max_voice',
      sourceId: args.sessionId,
    });
  });
  return { cards, created: cards.length, duplicates };
}

/**
 * Записать домашку урока в Тренажёр. Никогда не бросает — сбой ингеста не
 * имеет права сорвать финализацию звонка; причина всегда в логе.
 */
export async function ingestMaxHomeworkIntoTrainer(
  args: MaxHomeworkIngestArgs,
): Promise<MaxHomeworkIngestResult> {
  const none: MaxHomeworkIngestResult = { created: 0, duplicates: 0, savedToTrainer: false };
  if (args.items.length === 0) return none;
  // Стор кастомных карточек пишет в неймспейс ТЕКУЩЕГО курса приложения.
  // Звонок всегда стартует из этого же контекста, но при расхождении (диплинк,
  // смена курса под живым звонком) фразы в чужой неймспейс не кладём.
  const trainerTarget = storageStudyTarget();
  if (trainerTarget !== args.studyTarget) {
    DebugLogger.warn(
      '[MAX-HW-INGEST]',
      `skip all: call target=${args.studyTarget} trainer namespace=${trainerTarget} session=${args.sessionId}`,
    );
    return none;
  }
  try {
    let created = 0;
    let duplicates = 0;
    await updateCustomCards((cards) => {
      const built = buildMaxHomeworkCards(cards, args);
      created = built.created;
      duplicates = built.duplicates;
      if (built.cards.length === 0) return cards;
      return [...cards, ...built.cards];
    });
    DebugLogger.info(
      '[MAX-HW-INGEST]',
      `session=${args.sessionId} target=${args.studyTarget} items=${args.items.length} created=${created} duplicates=${duplicates}`,
    );
    return { created, duplicates, savedToTrainer: created + duplicates > 0 };
  } catch (e) {
    DebugLogger.error('[MAX-HW-INGEST]:write', e instanceof Error ? e : new Error(String(e)), 'warning');
    return none;
  }
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
