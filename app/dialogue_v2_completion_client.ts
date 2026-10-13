import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import {
  buildDialogueV2CompletionReview,
  type DialogueV2CompletionReview,
} from './dialogue_v2_completion_review_adapter';
import { getDevDialogCompletion, type DevDialogCompletion } from './dev_dialog_state';
import { triLang, type Lang } from '../constants/i18n';

const REGION = 'us-central1';
const STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);
const INTERFACE_LANGUAGES = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'fr', 'de']);
const SESSION_RE = /^d2s_[A-Za-z0-9_-]{32,96}$/;
const SCENARIO_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;

export type DialogueV2CompletionSelection = Readonly<{
  sessionId: string;
  studyTarget: 'en' | 'es' | 'fr' | 'de';
  scenarioId: string;
  interfaceLang: string;
}>;

export type DialogueV2CompletionResult = Readonly<{
  review: DialogueV2CompletionReview;
  memory: Readonly<{
    sharedMemoryStored: true;
    scenarioCheckpointStored: boolean;
  }>;
  replayed: boolean;
}>;

export class DialogueV2CompletionUnavailableError extends Error {
  constructor() {
    super('dialogue_v2_completion_unavailable');
    this.name = 'DialogueV2CompletionUnavailableError';
  }
}

function record(value: unknown): Record<string, unknown> | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string')) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function safeSelection(value: unknown): DialogueV2CompletionSelection | null {
  const selection = record(value);
  if (!selection || !exactKeys(selection, ['sessionId', 'studyTarget', 'scenarioId', 'interfaceLang'])
    || typeof selection.sessionId !== 'string' || !SESSION_RE.test(selection.sessionId)
    || typeof selection.studyTarget !== 'string' || !STUDY_TARGETS.has(selection.studyTarget)
    || typeof selection.scenarioId !== 'string' || !SCENARIO_RE.test(selection.scenarioId)
    || typeof selection.interfaceLang !== 'string' || !INTERFACE_LANGUAGES.has(selection.interfaceLang)) return null;
  return Object.freeze({
    sessionId: selection.sessionId,
    studyTarget: selection.studyTarget as DialogueV2CompletionSelection['studyTarget'],
    scenarioId: selection.scenarioId,
    interfaceLang: selection.interfaceLang,
  });
}

function safeResult(value: unknown): DialogueV2CompletionResult | null {
  const response = record(value);
  const completion = record(response?.v2Completion);
  const memory = record(response?.v2Memory);
  if (!response || !exactKeys(response, ['ok', 'v2Completion', 'v2Memory', 'replayed'])
    || response.ok !== true || typeof response.replayed !== 'boolean'
    || !completion || !memory
    || !exactKeys(memory, ['sharedMemoryStored', 'scenarioCheckpointStored'])
    || memory.sharedMemoryStored !== true
    || typeof memory.scenarioCheckpointStored !== 'boolean') return null;
  const review = buildDialogueV2CompletionReview({
    feedback: completion.feedback,
    context: completion.context,
    objectiveLabels: completion.objectiveLabels,
    personaNames: completion.personaNames,
    userMessages: completion.userMessages,
    evidenceNote: completion.evidenceNote,
  });
  return review ? Object.freeze({
    review,
    memory: Object.freeze({
      sharedMemoryStored: true as const,
      scenarioCheckpointStored: memory.scenarioCheckpointStored,
    }),
    replayed: response.replayed,
  }) : null;
}

/** Только для лога: какие ключи пришли и какая проверка формы ответа не прошла (без текстов пользователя). */
function describeCompletionResponseShape(value: unknown): Record<string, unknown> {
  const response = record(value);
  if (!response) return { response: value === null ? 'null' : typeof value };
  const completion = record(response.v2Completion);
  const memory = record(response.v2Memory);
  return {
    keys: Object.keys(response).sort(),
    ok: response.ok,
    replayedType: typeof response.replayed,
    completionKeys: completion ? Object.keys(completion).sort() : null,
    memory: memory ? { keys: Object.keys(memory).sort(), shared: memory.sharedMemoryStored } : null,
    reviewBuilt: completion
      ? buildDialogueV2CompletionReview({
        feedback: completion.feedback,
        context: completion.context,
        objectiveLabels: completion.objectiveLabels,
        personaNames: completion.personaNames,
        userMessages: completion.userMessages,
        evidenceNote: completion.evidenceNote,
      }) !== null
      : null,
  };
}

/**
 * зачем (Макеты 12.10, съёмка R1 dialogs-037/040/042/044, gap-007/008): итог подставной сессии без сервера — у сессии
 * dev_dialog_send сервер всё равно ответил бы отказом. Только память, в стор-сборке геттеры null.
 */
// зачем (координатор 13.10, EN-проход en-dialog-completion-001): подставной итог был зашит по-русски с пометкой «(dev)» — на английском
// прогоне кадр не совпадал с образцом. Текст — на языке интерфейса из запроса (как у настоящего итога); факт подмены — в журнале [DEV-STATE].
function devCompletionCopy(lang: Lang) {
  return {
    assessmentErrors: triLang(lang, { ru: 'Ты справился с разговором, есть пара мест, где можно сказать точнее.', uk: 'Ти впорався з розмовою, є кілька місць, де можна сказати точніше.', en: 'You handled the conversation well; a couple of places could be phrased more precisely.', es: 'Llevaste bien la conversación; hay un par de frases que se pueden decir mejor.', 'pt-BR': 'Você se saiu bem na conversa; há alguns trechos que dá para dizer melhor.', vi: 'Bạn đã trò chuyện tốt; có vài chỗ có thể nói chính xác hơn.', id: 'Percakapanmu berjalan baik; ada beberapa bagian yang bisa diucapkan lebih tepat.', tr: 'Sohbeti iyi yürüttün; birkaç yer daha doğru söylenebilir.', pl: 'Dobrze poradziłeś sobie z rozmową; kilka miejsc można powiedzieć precyzyjniej.' }),
    assessmentClean: triLang(lang, { ru: 'Отличный разговор — все цели выполнены.', uk: 'Чудова розмова — усі цілі виконано.', en: 'Great conversation — all goals completed.', es: 'Gran conversación: cumpliste todos los objetivos.', 'pt-BR': 'Ótima conversa: todos os objetivos cumpridos.', vi: 'Cuộc trò chuyện tuyệt vời — đã hoàn thành mọi mục tiêu.', id: 'Percakapan yang hebat — semua tujuan tercapai.', tr: 'Harika bir sohbet — tüm hedefler tamamlandı.', pl: 'Świetna rozmowa — wszystkie cele osiągnięte.' }),
    tip: triLang(lang, { ru: 'В следующий раз попробуй задать встречный вопрос.', uk: 'Наступного разу спробуй поставити зустрічне запитання.', en: 'Next time, try asking a question back.', es: 'La próxima vez, intenta hacer una pregunta de vuelta.', 'pt-BR': 'Da próxima vez, tente fazer uma pergunta de volta.', vi: 'Lần sau, hãy thử hỏi lại một câu.', id: 'Lain kali, coba ajukan pertanyaan balik.', tr: 'Bir dahaki sefere karşı soru sormayı dene.', pl: 'Następnym razem spróbuj zadać pytanie w odpowiedzi.' }),
    goodStart: triLang(lang, { ru: 'Хорошее начало.', uk: 'Добрий початок.', en: 'A good start.', es: 'Buen comienzo.', 'pt-BR': 'Bom começo.', vi: 'Khởi đầu tốt.', id: 'Awal yang bagus.', tr: 'İyi bir başlangıç.', pl: 'Dobry początek.' }),
    goalGreet: triLang(lang, { ru: 'Поздороваться', uk: 'Привітатися', en: 'Say hello', es: 'Saludar', 'pt-BR': 'Cumprimentar', vi: 'Chào hỏi', id: 'Menyapa', tr: 'Selam ver', pl: 'Przywitać się' }),
    goalOrder: triLang(lang, { ru: 'Сделать заказ', uk: 'Зробити замовлення', en: 'Place an order', es: 'Hacer un pedido', 'pt-BR': 'Fazer um pedido', vi: 'Gọi món', id: 'Memesan', tr: 'Sipariş ver', pl: 'Złożyć zamówienie' }),
    politer: triLang(lang, { ru: 'Так вежливее.', uk: 'Так ввічливіше.', en: 'This is more polite.', es: 'Así es más cortés.', 'pt-BR': 'Assim é mais educado.', vi: 'Nói vậy lịch sự hơn.', id: 'Ini lebih sopan.', tr: 'Böylesi daha kibar.', pl: 'Tak jest grzeczniej.' }),
    plural: triLang(lang, { ru: 'Множественное число.', uk: 'Множина.', en: 'Plural form.', es: 'Forma plural.', 'pt-BR': 'Forma plural.', vi: 'Dạng số nhiều.', id: 'Bentuk jamak.', tr: 'Çoğul biçim.', pl: 'Liczba mnoga.' }),
  };
}

function devCompletionResult(kind: Extract<DevDialogCompletion, 'clean' | 'errors'>, interfaceLang: unknown): DialogueV2CompletionResult {
  const errors = kind === 'errors';
  const lang = (typeof interfaceLang === 'string' && INTERFACE_LANGUAGES.has(interfaceLang) ? interfaceLang : 'ru') as Lang;
  const copy = devCompletionCopy(lang);
  console.warn(`[DEV-STATE] dialogs: подставной итог kind=${kind} язык=${lang} (из запроса: ${String(interfaceLang)})`); // guard-ok: dev-ветка
  return {
    review: {
      ok: true,
      assessment: errors ? copy.assessmentErrors : copy.assessmentClean,
      tip: copy.tip,
      speakerPersonaId: 'dev',
      speakerName: 'Dev',
      evidence: [{ learnerTurn: 'Hello', note: copy.goodStart }],
      objectiveResults: [
        { objectiveId: 'dev_greet', label: copy.goalGreet, status: 'met', evidence: ['Hello'] },
        { objectiveId: 'dev_order', label: copy.goalOrder, status: errors ? 'not_met' : 'met', evidence: [] },
      ],
      corrections: errors ? [
        { original: 'I want table', corrected: 'I would like a table', note: copy.politer, kind: 'polish' },
        { original: 'for two person', corrected: 'for two people', note: copy.plural, kind: 'polish' },
      ] : [],
    },
    memory: { sharedMemoryStored: true, scenarioCheckpointStored: false },
    replayed: false,
  };
}

/** Потолок вызова итога диалога на телефоне (сервер — до 60 с). */
export const DIALOGUE_V2_COMPLETION_TIMEOUT_MS = 45_000;

export async function completeDialogueV2Session(
  input: DialogueV2CompletionSelection,
): Promise<DialogueV2CompletionResult | null> {
  // Только при явном параметре: кадры, снятые со «старым» поведением подставной сессии (итог недоступен), не меняются.
  const devCompletion = getDevDialogCompletion();
  if (devCompletion) {
    console.warn(`[DEV-STATE] dialogs: итог подменён без сервера kind=${devCompletion}`); // guard-ok: dev-ветка
    if (devCompletion === 'loading') return new Promise<DialogueV2CompletionResult | null>(() => undefined);
    if (devCompletion === 'unavailable') throw new DialogueV2CompletionUnavailableError();
    return devCompletionResult(devCompletion, input?.interfaceLang);
  }
  const selection = safeSelection(input);
  if (!selection) {
    console.warn('[DIALOGUE-V2] completion:client invalid_selection', JSON.stringify({
      keys: input && typeof input === 'object' ? Object.keys(input).sort() : typeof input,
    }));
    return null;
  }
  // зачем (Сверка 05.10: «completion:run → failed reason=dialogue_v2_completion_unavailable ms=20054»): любая
  // ошибка сервера и любой «не тот» ответ превращались в одно и то же «недоступно» — настоящая причина терялась.
  // Печатаем код/текст/details отказа, длительность и, если ответ пришёл, — какую проверку формы он не прошёл.
  const startedAt = Date.now();
  try {
    // зачем (аудит «пропала сеть», Авторизация 13.10): без потолка «Собеседник готовит итог…» висел до нативных ~60–70 с. Сервер
    // итога работает до 60 с намеренно (02.10 итог обрывался на 30 с в проде), поэтому НЕ 15–20 с: 45 с — ниже нативного, с запасом
    // для настоящего медленного итога. Дальше «недоступно» + «Повторить»; повтор идемпотентен (вернёт готовый итог, replayed).
    const callable = httpsCallable<DialogueV2CompletionSelection, unknown>(
      getFunctions(getApp(), REGION),
      'dialogueV2SessionComplete',
      { timeout: DIALOGUE_V2_COMPLETION_TIMEOUT_MS },
    );
    const response = await callable(selection);
    const result = safeResult(response?.data);
    if (!result) {
      console.warn('[DIALOGUE-V2] completion:client bad_response', JSON.stringify({
        ms: Date.now() - startedAt,
        shape: describeCompletionResponseShape(response?.data),
      }));
      throw new DialogueV2CompletionUnavailableError();
    }
    console.log(`[DIALOGUE-V2] completion:client ok ms=${Date.now() - startedAt} replayed=${result.replayed}`);
    return result;
  } catch (error) {
    if (error instanceof DialogueV2CompletionUnavailableError) throw error;
    const failure = error as { code?: unknown; message?: unknown; details?: unknown };
    console.warn('[DIALOGUE-V2] completion:client call_failed', JSON.stringify({
      ms: Date.now() - startedAt,
      code: String(failure?.code ?? 'unknown'),
      message: String(failure?.message ?? error).slice(0, 200),
      details: failure?.details === undefined ? null : String(JSON.stringify(failure.details)).slice(0, 200),
      scenarioId: selection.scenarioId,
    }));
    throw new DialogueV2CompletionUnavailableError();
  }
}
