/**
 * Конвертер multilingual-контента (`content/arena-multilingual/generated/`)
 * в TournamentTask — прямой путь публикации es/de/fr для Шпиля, в обход
 * v11-пайплайна Арены.
 *
 * зачем (владелец 2026-09-24, прямое указание после разбора кода): для
 * es/de/fr реальной публикации через `adminArenaPublicationActivate` НЕ
 * СУЩЕСТВУЕТ — `admin_arena_content.ts` прямо документирует отсутствие
 * стейджинг-транспорта для payload ~10 МБ, а v11-пайплайн требует бандл-формат
 * (`TournamentV11TargetBundleRoot`), через который multilingual-контент
 * никогда не проходил. Ждать построения этой инфраструктуры — отдельная
 * большая задача. Вместо этого Шпиль читает bundled JSONL напрямую (как уже
 * делает admin_arena_content.ts для читалки манифеста) и конвертирует в
 * TournamentTask на лету при сборке пакета — Firestore/tournamentTasks для
 * этих языков не трогается вообще, значит Арена (её удаляет соседняя сессия)
 * тут ни при чём.
 *
 * ВАЖНО — НЕ v11: сюда намеренно не проставляются poolVersion/tags вида
 * pool:tpool_20260808_v11 — это НЕ настоящая v11-публикация Арены, а
 * отдельный контур только для пакетов Шпиля. validateTournamentTaskForNewRoom
 * (tournament_core.ts) включает строгую v11-проверку ТОЛЬКО когда видит эти
 * маркеры (isV11) — без них применяется базовый контракт + форма payload по
 * режиму + ПОЛНОЕ объяснение на каждый вариант (hasFullExplanationForOptions),
 * которому эти задания соответствуют честно, без подделки чужой цепочки
 * провенанса.
 *
 * Explanation (ruleNote/example/wrongOptionReasons): исходный контент несёт
 * только 4 МАШИННЫХ кода причины на весь пул (verb_person_conflicts_with_
 * fixed_subject, matches_subject_person, subject_verb_person_agree,
 * only_error_subject_verb_person_mismatch) — все про согласование подлежащего
 * и сказуемого. Готового текста объяснения на русском в контенте нет. Ниже —
 * честный словарь перевода этих 4 машинных кодов в короткие ОБЩИЕ фразы
 * правила (не придуманные факты о конкретной фразе — только перевод уже
 * существующего вывода генератора в читаемый текст, как локализация строки
 * интерфейса). ruleNote/example берутся из promptRu исходной записи.
 *
 * Совместимость по режимам (проверено на реальных файлах, все 3 языка):
 *   - guess_phrase, fill_gap → 'choice' (stem+options[4]+correctIndex) — 100%
 *   - find_oddity → 'choice' (options[4]+oddityIndex, "найди ошибку") — 100%
 *   - translate_build → 'translate' (tokenBank+correctTokens+correctTokenCount,
 *     ровно 1 ловушка) — 100%
 *   - speed_match → 'match' — 0% СОВМЕСТИМО: контракт Арены требует ровно 6
 *     пар и максимум 3 слова на плитку (владелец, 2 авг.: «для пары максимум
 *     3 слова»); multilingual-контент генерировался с полными фразами (5+
 *     слов) до этого правила. Пропускается целиком — честно, не обрезаем
 *     текст руками.
 *
 * Итог: 3808 из 4000 заданий на язык (95%), 4 режима из 5.
 */

import { createHash } from 'crypto';
import type { TournamentTask } from './tournament_core';

export type SpireMultilingualLang = 'es' | 'de' | 'fr';

type RawGrammarOption = Readonly<{ token?: string; grammatical?: boolean; reason?: string }>;
type RawInverseProofOption = Readonly<{ factId?: string; grammatical?: boolean; reason?: string }>;

type RawChoicePayload = Readonly<{
  promptRu?: string;
  phrase?: string;
  stem?: Readonly<{ prefix: string; suffix: string }>;
  options: readonly string[];
  correctIndex?: number;
  oddityIndex?: number;
  grammarMatrix?: Readonly<{ options?: readonly RawGrammarOption[] }>;
  inverseProof?: Readonly<{ options?: readonly RawInverseProofOption[] }>;
}>;
type RawTranslatePayload = Readonly<{
  promptRu?: string;
  correctTokens: readonly string[];
  tokenBank: readonly string[];
  correctTokenCount?: number;
}>;
type RawMultilingualTask = Readonly<{
  schemaVersion: string;
  taskId: string;
  studyTarget: string;
  mode: string;
  difficulty: number;
  payload: RawChoicePayload | RawTranslatePayload | Record<string, unknown>;
}>;

const CHOICE_MODES = new Set(['guess_phrase', 'fill_gap', 'find_oddity']);
/** Пропуск в fill_gap: у Арены нет своего поля stem, клиент рендерит одно phrase. */
const GAP_PLACEHOLDER = '___';

/**
 * Словарь машинных reason-кодов генератора → короткое общее правило на
 * русском. Источник: content/arena-multilingual — оба грамматических
 * блока (grammarMatrix для guess_phrase/fill_gap, inverseProof для
 * find_oddity) используют эти же 4 кода на всех трёх языках (проверено).
 * Расширять по мере появления новых кодов — не покрытый код roundtrip'ится
 * в generic текст, не роняет конвертер (см. explanationTextForReason).
 */
const REASON_TEXT_RU: Readonly<Record<string, string>> = Object.freeze({
  matches_subject_person: 'Форма глагола верно согласована с подлежащим.',
  verb_person_conflicts_with_fixed_subject: 'Форма глагола не согласована с этим подлежащим по лицу.',
  subject_verb_person_agree: 'Подлежащее и сказуемое здесь согласованы верно.',
  only_error_subject_verb_person_mismatch: 'Здесь подлежащее и сказуемое не согласованы по лицу.',
});

function explanationTextForReason(reason: string | undefined): string {
  if (reason && REASON_TEXT_RU[reason]) return REASON_TEXT_RU[reason];
  // зачем: неизвестный код не должен ронять конвертер — честная нейтральная
  // причина лучше, чем задание без explanation вовсе (упадёт на сервере) или
  // выдуманный текст, которого генератор не подтверждал.
  return 'Этот вариант не согласуется с правилом задания.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function phraseFromChoicePayload(mode: string, payload: RawChoicePayload): string | null {
  if (payload.stem && typeof payload.stem.prefix === 'string' && typeof payload.stem.suffix === 'string') {
    return `${payload.stem.prefix}${GAP_PLACEHOLDER}${payload.stem.suffix}`;
  }
  if (typeof payload.promptRu === 'string' && payload.promptRu.trim()) return payload.promptRu;
  if (typeof payload.phrase === 'string' && payload.phrase.trim()) return payload.phrase;
  return null;
}

function correctIndexFromChoicePayload(mode: string, payload: RawChoicePayload): number | null {
  const index = mode === 'find_oddity' ? payload.oddityIndex : payload.correctIndex;
  return Number.isInteger(index) ? Number(index) : null;
}

/**
 * wrongOptionReasons: пустая строка на correctIndex, иначе перевод машинного
 * reason-кода. guess_phrase/fill_gap берут его из grammarMatrix.options,
 * find_oddity — из inverseProof.options (тот же порядок, что options самого
 * задания — оба массива генератор строит параллельно одному payload.options).
 */
function wrongOptionReasonsFor(
  mode: string,
  payload: RawChoicePayload,
  optionsLength: number,
  correctIndex: number,
): string[] | null {
  const source = mode === 'find_oddity'
    ? payload.inverseProof?.options
    : payload.grammarMatrix?.options;
  if (!Array.isArray(source) || source.length !== optionsLength) return null;
  return source.map((entry, index) => (
    index === correctIndex ? '' : explanationTextForReason(entry.reason)
  ));
}

/**
 * Конвертирует одну строку multilingual JSONL в TournamentTask.
 * Возвращает null для несовместимых записей (например speed_match) —
 * вызывающий код считает пропуски и логирует их, не молчит.
 */
export function spireTaskFromMultilingualRow(row: unknown): TournamentTask | null {
  if (!isRecord(row)) return null;
  const raw = row as unknown as RawMultilingualTask;
  if (raw.schemaVersion !== 'arena-multilingual-task-v1') return null;
  if (typeof raw.taskId !== 'string' || !raw.taskId) return null;
  if (!Number.isInteger(raw.difficulty) || raw.difficulty < 1 || raw.difficulty > 3) return null;
  if (!isRecord(raw.payload)) return null;

  if (CHOICE_MODES.has(raw.mode)) {
    const payload = raw.payload as unknown as RawChoicePayload;
    const phrase = phraseFromChoicePayload(raw.mode, payload);
    const correctIndex = correctIndexFromChoicePayload(raw.mode, payload);
    if (!phrase || correctIndex === null || !isStringArray(payload.options) || payload.options.length !== 4
      || correctIndex < 0 || correctIndex >= payload.options.length) {
      return null;
    }
    const wrongOptionReasons = wrongOptionReasonsFor(raw.mode, payload, payload.options.length, correctIndex);
    if (!wrongOptionReasons) return null;
    const ruleNote = raw.mode === 'find_oddity'
      ? 'Найди вариант с ошибкой согласования.'
      : 'Выбери форму, верно согласованную с подлежащим.';
    return {
      taskId: raw.taskId,
      mode: raw.mode,
      difficulty: raw.difficulty,
      isVoice: false,
      tags: [],
      verified: true,
      payload: { phrase, options: [...payload.options], correctIndex },
      explanation: { ruleNote, example: phrase, wrongOptionReasons },
    };
  }

  if (raw.mode === 'translate_build') {
    const payload = raw.payload as unknown as RawTranslatePayload;
    if (!isStringArray(payload.correctTokens) || !isStringArray(payload.tokenBank)) return null;
    const phrase = typeof payload.promptRu === 'string' && payload.promptRu.trim() ? payload.promptRu : null;
    if (!phrase) return null;
    const correctTokenCount = Number.isInteger(payload.correctTokenCount)
      ? Number(payload.correctTokenCount) : payload.correctTokens.length;
    // зачем: Арена называет поле wordBank, multilingual-генератор — tokenBank; переименовываем на границе.
    return {
      taskId: raw.taskId,
      mode: raw.mode,
      difficulty: raw.difficulty,
      isVoice: false,
      tags: [],
      verified: true,
      payload: {
        phrase,
        correctTokens: [...payload.correctTokens],
        wordBank: [...payload.tokenBank],
        correctTokenCount,
      },
      // зачем: validateTournamentTaskForNewRoom требует explanation ДЛЯ ЛЮБОГО
      // kind (hasFullExplanationForOptions вызывается безусловно; для
      // translate directOptions=[] — значит нужен пустой wrongOptionReasons,
      // но explanation-объект обязателен, не опционален, как могло показаться
      // из TournamentTaskExplanation с optional-полями в типе).
      explanation: { ruleNote: 'Собери фразу из плашек в верном порядке.', example: phrase, wrongOptionReasons: [] },
    };
  }

  // speed_match и всё незнакомое — намеренно пропускаются, см. шапку файла.
  return null;
}

export type SpireMultilingualConversionStats = Readonly<{
  lang: SpireMultilingualLang;
  totalRows: number;
  converted: number;
  skippedByMode: Readonly<Record<string, number>>;
}>;

/** Конвертирует весь файл (уже распарсенный на строки JSON) в задания Шпиля + честную статистику пропусков. */
export function spireConvertMultilingualPool(
  lang: SpireMultilingualLang,
  rows: readonly unknown[],
): { tasks: TournamentTask[]; stats: SpireMultilingualConversionStats } {
  const tasks: TournamentTask[] = [];
  const skippedByMode: Record<string, number> = {};
  for (const row of rows) {
    const task = spireTaskFromMultilingualRow(row);
    if (task) {
      tasks.push(task);
    } else {
      const mode = isRecord(row) && typeof row.mode === 'string' ? row.mode : 'unknown';
      skippedByMode[mode] = (skippedByMode[mode] ?? 0) + 1;
    }
  }
  return {
    tasks,
    stats: { lang, totalRows: rows.length, converted: tasks.length, skippedByMode },
  };
}

/**
 * Отпечаток источника — не answerFingerprint конкретного ответа (тот считает
 * spire_pack_contract.ts с солью пакета), а версия САМОГО ПУЛА: меняется,
 * если контент-файл поменялся, участвует в диагностике сборки (лог), не в
 * packHash игрока.
 */
export function spireMultilingualPoolSourceHash(rows: readonly unknown[]): string {
  const hash = createHash('sha256');
  for (const row of rows) hash.update(JSON.stringify(row)); // guard-ok: crypto hash.update в памяти, не Firestore
  return hash.digest('hex');
}
