/**
 * Контракт исхода ИИ-диалога: разбор «сайдкара» от сервера (mood/objectives/
 * outcome/реакция персонажа) с безопасным фолбэком и маппинг исхода в
 * заголовок и множитель XP.
 *
 * Сервер (premiumDialogSend) возвращает reply + turnState. Если JSON битый или
 * поля отсутствуют — parseTurnState даёт «безопасный продолжающийся» исход, и
 * диалог идёт как обычный чат (фича просто «молчит» этот ход), а не падает.
 *
 * Чистые функции без RN-зависимостей — покрыто jest.
 */

import { triLang, type Lang } from '../constants/i18n';
import { clampMood, DEFAULT_MOOD } from './dialog_mood_face';

/** Терминальные исходы + 'ongoing' (диалог продолжается). */
export type DialogOutcome = 'ongoing' | 'success' | 'lost_patience' | 'stalled';

/** Разобранное состояние одного хода диалога (то, что показывает клиент). */
export interface DialogTurnState {
  /** Настроение собеседника 0..100 (для смайла). */
  mood: number;
  /** id выполненных к этому моменту под-целей (накопительно). */
  objectivesMet: string[];
  /** Исход на текущий ход. 'ongoing' — продолжаем. */
  outcome: DialogOutcome;
  /** Реакция персонажа от 1-го лица для финального модала (терминальные исходы). */
  characterReaction: string;
  /** 1-2 короткие фразы разбора «что сказать в следующий раз». */
  coachTips: string[];
}

const VALID_OUTCOMES: readonly DialogOutcome[] = ['ongoing', 'success', 'lost_patience', 'stalled'];

function asStringArray(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value) {
    const s = String(raw ?? '').trim().slice(0, maxLen);
    if (s) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

/** «Безопасный продолжающийся» исход — когда сайдкара нет или он битый. */
export function neutralTurnState(): DialogTurnState {
  return {
    mood: DEFAULT_MOOD,
    objectivesMet: [],
    outcome: 'ongoing',
    characterReaction: '',
    coachTips: [],
  };
}

/**
 * Разбирает сырой turnState (объект ИЛИ JSON-строку). Любая некорректность →
 * neutralTurnState (никогда не бросает). Неизвестный outcome → 'ongoing'.
 */
export function parseTurnState(raw: unknown): DialogTurnState {
  let obj: Record<string, unknown> | null = null;
  if (raw && typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') obj = parsed as Record<string, unknown>;
    } catch {
      return neutralTurnState();
    }
  }
  if (!obj) return neutralTurnState();

  const outcomeRaw = String(obj.outcome ?? 'ongoing');
  const outcome: DialogOutcome = (VALID_OUTCOMES as readonly string[]).includes(outcomeRaw)
    ? (outcomeRaw as DialogOutcome)
    : 'ongoing';

  return {
    mood: clampMood(obj.mood),
    objectivesMet: asStringArray(obj.objectivesMet, 12, 64),
    outcome,
    characterReaction: String(obj.characterReaction ?? '').trim().slice(0, 400),
    coachTips: asStringArray(obj.coachTips, 3, 200),
  };
}

/** Терминальный ли исход (нужен ли финальный модал). */
export function isTerminalOutcome(outcome: DialogOutcome): boolean {
  return outcome !== 'ongoing';
}

/**
 * Множитель XP по исходу. Юзер выбрал «больше XP за успех»; провал/заглох —
 * меньше, но НЕ ноль (попытка ценна). Применяется к базовому XP диалога.
 */
export function outcomeXpMultiplier(outcome: DialogOutcome): number {
  switch (outcome) {
    case 'success':
      return 1;
    case 'stalled':
      return 0.6;
    case 'lost_patience':
      return 0.4;
    case 'ongoing':
    default:
      return 0; // диалог не завершён — XP ещё не начисляем
  }
}

/** Локализованный заголовок модала-вердикта (8 языков). */
export function outcomeTitle(outcome: DialogOutcome, lang: Lang): string {
  switch (outcome) {
    case 'success':
      return triLang(lang, {
        ru: 'Получилось!',
        uk: 'Вийшло!',
        es: '¡Lo lograste!',
        'pt-BR': 'Conseguiu!',
        vi: 'Thành công!',
        id: 'Berhasil!',
        tr: 'Başardın!',
        pl: 'Udało się!',
      });
    case 'lost_patience':
      return triLang(lang, {
        ru: 'Собеседник потерял терпение',
        uk: 'Співрозмовник втратив терпіння',
        es: 'Tu interlocutor perdió la paciencia',
        'pt-BR': 'Seu interlocutor perdeu a paciência',
        vi: 'Người kia mất kiên nhẫn',
        id: 'Lawan bicaramu kehilangan kesabaran',
        tr: 'Karşındaki sabrını kaybetti',
        pl: 'Rozmówca stracił cierpliwość',
      });
    case 'stalled':
      return triLang(lang, {
        ru: 'Разговор заглох',
        uk: 'Розмова згасла',
        es: 'La conversación se apagó',
        'pt-BR': 'A conversa esfriou',
        vi: 'Cuộc trò chuyện chững lại',
        id: 'Percakapan mandek',
        tr: 'Konuşma tıkandı',
        pl: 'Rozmowa utknęła',
      });
    case 'ongoing':
    default:
      return triLang(lang, {
        ru: 'Разговор продолжается',
        uk: 'Розмова триває',
        es: 'La conversación continúa',
        'pt-BR': 'A conversa continua',
        vi: 'Cuộc trò chuyện tiếp tục',
        id: 'Percakapan berlanjut',
        tr: 'Konuşma sürüyor',
        pl: 'Rozmowa trwa',
      });
  }
}
