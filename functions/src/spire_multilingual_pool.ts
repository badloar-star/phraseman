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
 *   - speed_match → 'match': генератор хранит hash-bound tileLeft/tileRight
 *     из парного лексикона и точную ссылку на umbrella lexical fact/value;
 *     в игровой payload идут только 6 коротких пар по контракту ≤3 слова.
 *
 * Итог после коротких evidence-bound плиток: 4000 из 4000, 5 режимов из 5.
 */

import { createHash } from 'crypto';
import { ARENA_REFERENCE_MODE_DIFFICULTY_QUOTAS } from './arena_content_generation';
import { validateTournamentTaskForNewRoom, type TournamentTask } from './tournament_core';

export type SpireMultilingualLang = 'es' | 'de' | 'fr' | 'it';
export const SPIRE_MULTILINGUAL_REQUIRED_TASKS = 4_000;

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
  correctAnswer?: string;
  correctTokens: readonly string[];
  tokenBank: readonly string[];
  correctTokenCount?: number;
  samePosDecoy?: Readonly<{ token?: string }>;
}>;
type RawSpeedMatchPair = Readonly<{
  tileLeft?: string;
  tileRight?: string;
}>;
type RawSpeedMatchPayload = Readonly<{
  promptRu?: string;
  pairs?: readonly RawSpeedMatchPair[];
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
function taskFromMultilingualRow(row: unknown, verified: boolean): TournamentTask | null {
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
    const example = payload.stem
      ? `${payload.stem.prefix}${payload.options[correctIndex]}${payload.stem.suffix}`
      : payload.options[correctIndex];
    return {
      taskId: raw.taskId,
      mode: raw.mode,
      difficulty: raw.difficulty,
      isVoice: false,
      tags: [],
      verified,
      payload: { phrase, options: [...payload.options], correctIndex },
      explanation: { ruleNote, example, wrongOptionReasons },
    };
  }

  if (raw.mode === 'translate_build') {
    const payload = raw.payload as unknown as RawTranslatePayload;
    if (!isStringArray(payload.correctTokens) || !isStringArray(payload.tokenBank)) return null;
    const phrase = typeof payload.promptRu === 'string' && payload.promptRu.trim() ? payload.promptRu : null;
    if (!phrase) return null;
    const correctTokenCount = Number.isInteger(payload.correctTokenCount)
      ? Number(payload.correctTokenCount) : payload.correctTokens.length;
    const correctAnswer = typeof payload.correctAnswer === 'string' && payload.correctAnswer.trim()
      ? payload.correctAnswer
      : payload.correctTokens[0] === "J'"
        ? `${payload.correctTokens[0]}${payload.correctTokens.slice(1).join(' ')}`
        : payload.correctTokens.join(' ');
    // зачем: Арена называет поле wordBank, multilingual-генератор — tokenBank; переименовываем на границе.
    return {
      taskId: raw.taskId,
      mode: raw.mode,
      difficulty: raw.difficulty,
      isVoice: false,
      tags: [],
      verified,
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
      explanation: {
        ruleNote: typeof payload.samePosDecoy?.token === 'string' && payload.samePosDecoy.token.trim()
          ? `Собери фразу в верном порядке. Плашка «${payload.samePosDecoy.token}» лишняя: это форма другого лица.`
          : 'Собери фразу из плашек в верном порядке. Одна плашка лишняя.',
        example: correctAnswer,
        wrongOptionReasons: [],
      },
    };
  }

  if (raw.mode === 'speed_match') {
    const payload = raw.payload as unknown as RawSpeedMatchPayload;
    if (!Array.isArray(payload.pairs) || payload.pairs.length !== 6) return null;
    const left = payload.pairs.map((pair) => pair.tileLeft);
    const orderedRight = payload.pairs.map((pair) => pair.tileRight);
    if (!left.every((value): value is string => typeof value === 'string' && value.trim().length > 0)
      || !orderedRight.every((value): value is string => typeof value === 'string' && value.trim().length > 0)) {
      return null;
    }
    const rotation = 1 + (Array.from(raw.taskId).reduce((sum, char) => sum + char.charCodeAt(0), 0)
      % (orderedRight.length - 1));
    const rightOptions = [...orderedRight.slice(rotation), ...orderedRight.slice(0, rotation)];
    const items = left.map((prompt, pairIndex) => {
      const correctIndex = rightOptions.indexOf(orderedRight[pairIndex]);
      return {
      prompt,
      options: [...rightOptions],
      correctIndex,
      explanation: {
        ruleNote: 'Соедини русское значение с соответствующим словом или коротким выражением.',
        example: `${prompt} — ${rightOptions[correctIndex]}`,
        wrongOptionReasons: rightOptions.map((_, optionIndex) => (
          optionIndex === correctIndex ? '' : 'Это слово или выражение не соответствует русскому значению.'
        )),
      },
      };
    });
    return {
      taskId: raw.taskId,
      mode: raw.mode,
      difficulty: raw.difficulty,
      isVoice: false,
      tags: [],
      verified,
      payload: {
        prompt: typeof payload.promptRu === 'string' && payload.promptRu.trim()
          ? payload.promptRu
          : 'Соедините русские значения со словами и короткими выражениями.',
        items,
        rightOptions,
      },
      explanation: {
        ruleNote: 'Каждому русскому значению соответствует одно слово или короткое выражение.',
        example: `${left[0]} — ${orderedRight[0]}`,
        wrongOptionReasons: [],
      },
    };
  }

  // Всё незнакомое намеренно пропускается.
  return null;
}

/** Одиночная диагностическая конверсия; verified всегда false. */
export function spireInspectMultilingualRow(row: unknown): TournamentTask | null {
  return taskFromMultilingualRow(row, false);
}

export type SpireMultilingualConversionStats = Readonly<{
  lang: SpireMultilingualLang;
  totalRows: number;
  converted: number;
  skippedByMode: Readonly<Record<string, number>>;
}>;

export type SpireMultilingualReleaseGate =
  | Readonly<{ ok: true; tasksSha256: string }>
  | Readonly<{ ok: false; reason: string }>;

function canonical(value: unknown): string {
  if (value === null || ['boolean', 'number', 'string'].includes(typeof value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(null);
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(',')}}`;
}

function canonicalSha256(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

function normalizeSemanticValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.normalize('NFC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase();
  }
  if (Array.isArray(value)) return value.map(normalizeSemanticValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeSemanticValue(item)]));
  }
  return value;
}

function semanticLearnerCoreForRow(row: Record<string, unknown>): unknown | null {
  const mode = row.mode;
  const payload = row.payload;
  if (typeof mode !== 'string' || !isRecord(payload)) return null;
  if (mode === 'guess_phrase' || mode === 'fill_gap') {
    const options = payload.options;
    const correctIndex = payload.correctIndex;
    const stem = payload.stem;
    if (!Array.isArray(options) || !options.every((option) => typeof option === 'string')
      || !Number.isInteger(correctIndex) || !isRecord(stem)
      || typeof stem.prefix !== 'string' || typeof stem.suffix !== 'string') return null;
    const correct = options[correctIndex as number];
    if (typeof correct !== 'string') return null;
    return normalizeSemanticValue({
      mode,
      promptRu: payload.promptRu,
      correctSentence: `${stem.prefix}${correct}${stem.suffix}`,
      distractors: options.filter((_, index) => index !== correctIndex).sort(),
    });
  }
  if (mode === 'find_oddity') {
    const options = payload.options;
    const oddityIndex = payload.oddityIndex;
    if (!Array.isArray(options) || !options.every((option) => typeof option === 'string')
      || !Number.isInteger(oddityIndex) || typeof options[oddityIndex as number] !== 'string') return null;
    return normalizeSemanticValue({
      mode,
      promptRu: payload.promptRu,
      oddity: options[oddityIndex as number],
      grammatical: options.filter((_, index) => index !== oddityIndex).sort(),
    });
  }
  if (mode === 'translate_build') {
    const decoy = payload.samePosDecoy;
    if (typeof payload.correctAnswer !== 'string' || !isRecord(decoy) || typeof decoy.token !== 'string') return null;
    return normalizeSemanticValue({
      mode,
      promptRu: payload.promptRu,
      correctAnswer: payload.correctAnswer,
      decoy: decoy.token,
    });
  }
  if (mode === 'speed_match') {
    const pairs = payload.pairs;
    if (!Array.isArray(pairs)) return null;
    const visiblePairs: Array<{ tileLeft: string; tileRight: string }> = [];
    for (const pair of pairs) {
      if (!isRecord(pair) || typeof pair.tileLeft !== 'string' || typeof pair.tileRight !== 'string') return null;
      visiblePairs.push({ tileLeft: pair.tileLeft, tileRight: pair.tileRight });
    }
    visiblePairs.sort((left, right) =>
      `${left.tileLeft}\u0000${left.tileRight}`.localeCompare(`${right.tileLeft}\u0000${right.tileRight}`));
    return normalizeSemanticValue({ mode, promptRu: payload.promptRu, pairs: visiblePairs });
  }
  return null;
}

/**
 * Fail-closed граница прямого пула Шпиля. Структурно корректный JSONL ещё не
 * является публикацией: сборщик принимает его только вместе с PASS-манифестом,
 * привязанным к тем же байтам задач и к тому же target language.
 */
export function spireMultilingualReleaseGate(
  lang: SpireMultilingualLang,
  rows: readonly unknown[],
  manifest: unknown,
): SpireMultilingualReleaseGate {
  if (!isRecord(manifest) || manifest.schemaVersion !== 'arena-multilingual-pool-manifest-v1') {
    return { ok: false, reason: 'manifest_invalid' };
  }
  if (manifest.studyTarget !== lang) return { ok: false, reason: 'manifest_target_mismatch' };
  if (manifest.verdict !== 'PASS' || manifest.releaseEligible !== true) {
    return { ok: false, reason: 'manifest_release_blocked' };
  }
  const coverage = manifest.coverage;
  const reviewReceipt = manifest.linguisticReviewReceipt;
  if (!isRecord(coverage)
    || coverage.lexicalFactInventoryStatus !== 'approved'
    || !isRecord(reviewReceipt)
    || reviewReceipt.schemaVersion !== 'spire-multilingual-linguistic-review-v1'
    || reviewReceipt.studyTarget !== lang
    || reviewReceipt.verdict !== 'PASS'
    || reviewReceipt.reviewerIndependence !== 'independent_read_only'
    || reviewReceipt.reviewerQualification !== 'target_language_expert'
    || reviewReceipt.linguisticEvidenceStatus !== 'approved'
    || reviewReceipt.cefrEvidenceStatus !== 'not_claimed') {
    return { ok: false, reason: 'manifest_linguistic_review_missing' };
  }
  if (rows.length !== SPIRE_MULTILINGUAL_REQUIRED_TASKS
    || manifest.generatedTaskCount !== SPIRE_MULTILINGUAL_REQUIRED_TASKS
    || manifest.requiredTaskCount !== SPIRE_MULTILINGUAL_REQUIRED_TASKS) {
    return { ok: false, reason: 'manifest_task_count_mismatch' };
  }
  if (rows.some((row) => !isRecord(row) || row.studyTarget !== lang)) {
    return { ok: false, reason: 'bundle_target_mismatch' };
  }
  const taskIds = rows.map((row) => isRecord(row) && typeof row.taskId === 'string' ? row.taskId : '');
  if (taskIds.some((taskId) => taskId.length === 0)) {
    return { ok: false, reason: 'bundle_task_id_invalid' };
  }
  if (new Set(taskIds).size !== taskIds.length) {
    return { ok: false, reason: 'bundle_duplicate_task_id' };
  }
  if (rows.some((row) => isRecord(row) && (
    'cefrBand' in row
    || 'cefrProfile' in row
    || (isRecord(row.payload) && 'cefrBand' in row.payload)
  ))) {
    return { ok: false, reason: 'bundle_unsupported_cefr_claim' };
  }
  const expectedQuotaEntries = Object.entries(ARENA_REFERENCE_MODE_DIFFICULTY_QUOTAS);
  const manifestQuotas = manifest.quotas;
  if (!isRecord(manifestQuotas)
    || Object.keys(manifestQuotas).length !== expectedQuotaEntries.length
    || expectedQuotaEntries.some(([cell, count]) => manifestQuotas[cell] !== count)) {
    return { ok: false, reason: 'manifest_quota_matrix_invalid' };
  }
  const actualQuotas = Object.fromEntries(expectedQuotaEntries.map(([cell]) => [cell, 0])) as Record<string, number>;
  for (const row of rows) {
    if (!isRecord(row) || typeof row.mode !== 'string' || !Number.isInteger(row.difficulty)) {
      return { ok: false, reason: 'manifest_quota_matrix_mismatch' };
    }
    const cell = `${row.mode}:${row.difficulty}`;
    if (!(cell in actualQuotas)) return { ok: false, reason: 'manifest_quota_matrix_mismatch' };
    actualQuotas[cell] += 1;
  }
  if (expectedQuotaEntries.some(([cell, count]) => actualQuotas[cell] !== count)) {
    return { ok: false, reason: 'manifest_quota_matrix_mismatch' };
  }
  if (typeof manifest.semanticLedgerSha256 !== 'string'
    || !/^[a-f0-9]{64}$/u.test(manifest.semanticLedgerSha256)) {
    return { ok: false, reason: 'manifest_semantic_ledger_invalid' };
  }
  const semanticSignatures = rows.map((row) => isRecord(row) && typeof row.semanticSignature === 'string'
    ? row.semanticSignature : '');
  if (semanticSignatures.some((signature) => !/^[a-f0-9]{64}$/u.test(signature))
    || new Set(semanticSignatures).size !== rows.length) {
    return { ok: false, reason: 'bundle_semantic_signature_invalid' };
  }
  const recomputedSemanticSignatures = rows.map((row) => isRecord(row)
    ? canonicalSha256(semanticLearnerCoreForRow(row))
    : '');
  if (rows.some((row, index) => !isRecord(row)
    || semanticLearnerCoreForRow(row) === null
    || semanticSignatures[index] !== recomputedSemanticSignatures[index])) {
    return { ok: false, reason: 'bundle_semantic_signature_mismatch' };
  }
  if (manifest.semanticLedgerSha256 !== canonicalSha256(semanticSignatures)) {
    return { ok: false, reason: 'manifest_semantic_ledger_mismatch' };
  }
  const tasksSha256 = canonicalSha256(rows);
  if (manifest.tasksSha256 !== tasksSha256) return { ok: false, reason: 'manifest_tasks_hash_mismatch' };
  if (typeof manifest.evidencePackSha256 !== 'string'
    || reviewReceipt.tasksSha256 !== tasksSha256
    || reviewReceipt.evidencePackSha256 !== manifest.evidencePackSha256) {
    return { ok: false, reason: 'manifest_linguistic_review_binding_mismatch' };
  }
  const reviewReceiptSha256 = typeof reviewReceipt.receiptSha256 === 'string' ? reviewReceipt.receiptSha256 : '';
  const reviewReceiptBody = Object.fromEntries(Object.entries(reviewReceipt).filter(([key]) => key !== 'receiptSha256'));
  if (reviewReceiptSha256 !== canonicalSha256(reviewReceiptBody)) {
    return { ok: false, reason: 'manifest_linguistic_review_hash_mismatch' };
  }
  const adminPublicationReceipt = manifest.adminPublicationReceipt;
  if (!isRecord(adminPublicationReceipt)
    || adminPublicationReceipt.schemaVersion !== 'spire-multilingual-admin-publication-v1'
    || adminPublicationReceipt.studyTarget !== lang
    || adminPublicationReceipt.publicationStatus !== 'approved'
    || adminPublicationReceipt.publisherRole !== 'content_admin'
    || typeof adminPublicationReceipt.publicationId !== 'string'
    || adminPublicationReceipt.publicationId.trim().length === 0) {
    return { ok: false, reason: 'manifest_admin_publication_missing' };
  }
  if (adminPublicationReceipt.tasksSha256 !== tasksSha256
    || adminPublicationReceipt.linguisticReviewReceiptSha256 !== reviewReceiptSha256) {
    return { ok: false, reason: 'manifest_admin_publication_binding_mismatch' };
  }
  const adminReceiptSha256 = typeof adminPublicationReceipt.receiptSha256 === 'string'
    ? adminPublicationReceipt.receiptSha256
    : '';
  const adminReceiptBody = Object.fromEntries(
    Object.entries(adminPublicationReceipt).filter(([key]) => key !== 'receiptSha256'),
  );
  if (adminReceiptSha256 !== canonicalSha256(adminReceiptBody)) {
    return { ok: false, reason: 'manifest_admin_publication_hash_mismatch' };
  }
  const manifestSha256 = typeof manifest.manifestSha256 === 'string' ? manifest.manifestSha256 : '';
  const manifestBody = Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== 'manifestSha256'));
  if (manifestSha256 !== canonicalSha256(manifestBody)) {
    return { ok: false, reason: 'manifest_self_hash_mismatch' };
  }
  return { ok: true, tasksSha256 };
}

/** Конвертирует весь файл (уже распарсенный на строки JSON) в задания Шпиля + честную статистику пропусков. */
function convertMultilingualPool(
  lang: SpireMultilingualLang,
  rows: readonly unknown[],
  verified: boolean,
): { tasks: TournamentTask[]; stats: SpireMultilingualConversionStats } {
  const tasks: TournamentTask[] = [];
  const skippedByMode: Record<string, number> = {};
  for (const row of rows) {
    if (!isRecord(row) || row.studyTarget !== lang) {
      skippedByMode.target_mismatch = (skippedByMode.target_mismatch ?? 0) + 1;
      continue;
    }
    const task = taskFromMultilingualRow(row, verified);
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
 * Диагностический конвертер для тестов качества и админских отчётов.
 * Он намеренно никогда не выдаёт verified-задачи: такой результат нельзя
 * незаметно подать в пользовательский пакет, минуя release-манифест.
 */
export function spireInspectMultilingualPool(
  lang: SpireMultilingualLang,
  rows: readonly unknown[],
): { tasks: TournamentTask[]; stats: SpireMultilingualConversionStats } {
  return convertMultilingualPool(lang, rows, false);
}

export type SpireReleasedMultilingualPool =
  | Readonly<{
    ok: true;
    tasks: TournamentTask[];
    stats: SpireMultilingualConversionStats;
    tasksSha256: string;
  }>
  | Readonly<{ ok: false; reason: string }>;

/** Единственный публичный путь, способный выдать verified=true для Шпиля. */
export function spireReleaseMultilingualPool(
  lang: SpireMultilingualLang,
  rows: readonly unknown[],
  manifest: unknown,
): SpireReleasedMultilingualPool {
  const gate = spireMultilingualReleaseGate(lang, rows, manifest);
  if (!gate.ok) return gate;
  const converted = convertMultilingualPool(lang, rows, true);
  if (converted.tasks.length !== SPIRE_MULTILINGUAL_REQUIRED_TASKS) {
    return { ok: false, reason: 'converted_task_count_mismatch' };
  }
  if (converted.tasks.some((task) => !validateTournamentTaskForNewRoom(task).ok)) {
    return { ok: false, reason: 'converted_task_invalid' };
  }
  return { ok: true, ...converted, tasksSha256: gate.tasksSha256 };
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
