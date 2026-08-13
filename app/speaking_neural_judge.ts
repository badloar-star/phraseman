// Уровень B честной оценки «Устно»: НЕЙТРАЛЬНЫЙ нейро-судья на устройстве.
//
// Роль: второй, полностью независимый транскрипт сохранённого аудио попытки
// (wav из audioend) от локальной нейросети whisper.cpp, которая НИЧЕГО не
// знает о целевой фразе. Его балл идёт в ту же честностную поправку
// (speaking_honesty_check: final = min(biased, control + 25)) вместо/поверх
// контрольного прогона системного распознавателя — одинаково на всех OEM,
// офлайн, бесплатно.
//
// СТАТУС ВРЕЗКИ: модуль самодостаточен и «выключен», пока в бинаре нет пакета
// `whisper.rn` (лениво require-ится, как expo-speech-recognition в
// personal_plan_speech_module). Хвост для активации:
//   1) npm i whisper.rn + нативная пересборка (package.json занят auth-сессией);
//   2) в SpeakingPanel.runControlPass: сначала judgeWithNeuralEngine(uri,target),
//      при null — существующий контрольный прогон системного движка.
// Модель НЕ кладём в бандл (см. аудит веса iOS): скачивается при первом входе
// в «Устно» в documentDirectory (~32МБ, tiny.en q5_1).
//
// Нативные модули (whisper.rn, expo-file-system) подключаются ТОЛЬКО лениво
// внутри функций — чистые экспорты юнит-тестируемы без нативной среды.

import { Platform } from 'react-native';

import { scoreSpeechPronunciationTranscript } from './pronunciation_scoring_client';
import {
  MODEL_EN,
  WHISPER_MODEL_DIRECTORY,
  modelsToPrune,
  resolveWhisperModel,
  whisperLanguageFor,
  type WhisperModelSpec,
} from './speaking_whisper_models';

/**
 * Подкаталог в documentDirectory (кэш ОС может чиститься — документы нет).
 * Реэкспорт из реестра, чтобы старые импортёры не сломались.
 */
export const NEURAL_JUDGE_DIRECTORY = WHISPER_MODEL_DIRECTORY;

/**
 * Совместимость: раньше модель была одна (англ tiny.en). Старые импортёры и
 * контракт-тесты ждут форму {fileName,url,minBytes,directory}. Английская
 * модель + directory из реестра. Новый код берёт модель через реестр по языку.
 */
export const NEURAL_JUDGE_MODEL = {
  fileName: MODEL_EN.fileName,
  url: MODEL_EN.url,
  minBytes: MODEL_EN.minBytes,
  directory: WHISPER_MODEL_DIRECTORY,
} as const;

/** Потолок одного прогона судьи: короткая фраза, дальше — без поправки. */
export const NEURAL_JUDGE_TIMEOUT_MS = 6000;

/** Балл нейтрального транскрипта против цели — та же шкала, что у скорера. */
export function neuralControlScore(targetText: string, transcript: string): number | null {
  const text = transcript.trim();
  if (!text) return null;
  return scoreSpeechPronunciationTranscript({ targetText, transcript: text }).score;
}

type WhisperModule = {
  initWhisper: (options: { filePath: string }) => Promise<WhisperContext>;
};

type WhisperContext = {
  transcribe: (
    filePathOrUri: string,
    options?: Record<string, unknown>,
  ) => { stop?: () => void; promise: Promise<{ result?: string }> };
  release?: () => Promise<void>;
};

/** Ленивый гардированный загрузчик whisper.rn: null, пока пакета нет в бинаре. */
export function loadWhisperModule(): WhisperModule | null {
  // iOS release builds currently disable whisper.rn autolinking because the
  // 0.6.0 pod exports duplicate ggml headers. The model remains remote; iOS
  // falls back to the system control pass until the native pod is fixed.
  if (Platform.OS === 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('whisper.rn');
    if (!mod || typeof mod.initWhisper !== 'function') return null;
    return mod as WhisperModule;
  } catch {
    return null;
  }
}

/** Пакет whisper.rn присутствует в этом бинаре. */
export function isNeuralJudgeSupported(): boolean {
  return loadWhisperModule() != null;
}

// expo-file-system (новый API File/Directory/Paths) — тоже лениво: модуль
// должен импортироваться в jest без нативной среды.
function loadFs(): {
  File: any;
  Directory: any;
  Paths: any;
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('expo-file-system');
    if (!fs?.File || !fs?.Directory || !fs?.Paths) return null;
    return fs;
  } catch {
    return null;
  }
}

function modelFileFor(spec: WhisperModelSpec): any | null {
  const fs = loadFs();
  if (!fs) return null;
  try {
    const dir = new fs.Directory(fs.Paths.document, WHISPER_MODEL_DIRECTORY);
    return new fs.File(dir, spec.fileName);
  } catch {
    return null;
  }
}

/** Модель для данного языка скачана и выглядит целой. */
export function isNeuralModelReady(locale?: string): boolean {
  try {
    const spec = resolveWhisperModel(locale);
    const file = modelFileFor(spec);
    return Boolean(file?.exists) && (file?.size ?? 0) >= spec.minBytes;
  } catch {
    return false;
  }
}

/**
 * Удалить из папки моделей всё, кроме `keepFileName`: старую модель прошлого
 * целевого языка, устаревшую квантовку, хвост оборванной загрузки. Диск держит
 * максимум одну (нужную) модель. Best-effort — ошибки чтения/удаления глотаем.
 */
function pruneOtherModels(keepFileName: string): void {
  const fs = loadFs();
  if (!fs) return;
  try {
    const dir = new fs.Directory(fs.Paths.document, WHISPER_MODEL_DIRECTORY);
    if (!dir.exists) return;
    // Новый expo-file-system: Directory.list() → массив File/Directory.
    const entries: any[] = typeof dir.list === 'function' ? dir.list() : [];
    const names = entries
      .map((e) => String(e?.name ?? '').trim())
      .filter((n) => n.length > 0);
    for (const name of modelsToPrune(names, keepFileName)) {
      try {
        new fs.File(dir, name).delete();
      } catch {
        /* файл мог исчезнуть/залочен — не критично */
      }
    }
  } catch {
    /* нет доступа к папке — пропускаем уборку */
  }
}

// Загрузка кэшируется ПО имени файла модели: смена целевого языка меняет файл,
// и старый промис (для англ-модели) не должен «залипнуть» для новой.
let downloadFileName: string | null = null;
let downloadPromise: Promise<boolean> | null = null;

/**
 * Скачать модель нужного языка один раз (идемпотентно, конкурентные вызовы
 * делят промис). Перед загрузкой удаляет лишние модели с диска. true = модель
 * на месте. Ошибки сети НЕ бросаются — просто false: «Устно» продолжает
 * работать на контрольном прогоне системного движка.
 */
export function ensureNeuralModel(locale?: string): Promise<boolean> {
  const spec = resolveWhisperModel(locale);
  // Промис делим только когда он про ТУ ЖЕ модель.
  if (downloadPromise && downloadFileName === spec.fileName) return downloadPromise;
  downloadFileName = spec.fileName;
  downloadPromise = (async () => {
    try {
      // Уборка до проверки готовности: если язык сменился, старую модель убираем
      // сразу, не дожидаясь докачки новой.
      pruneOtherModels(spec.fileName);
      if (isNeuralModelReady(locale)) return true;
      const fs = loadFs();
      if (!fs) return false;
      const dir = new fs.Directory(fs.Paths.document, WHISPER_MODEL_DIRECTORY);
      if (!dir.exists) dir.create({ intermediates: true });
      const file = new fs.File(dir, spec.fileName);
      // Хвост оборванной загрузки затираем заново.
      if (file.exists && (file.size ?? 0) < spec.minBytes) file.delete();
      const downloaded = await fs.File.downloadFileAsync(spec.url, file);
      return Boolean(downloaded?.exists) && (downloaded?.size ?? 0) >= spec.minBytes;
    } catch {
      return false;
    } finally {
      // Провал не кэшируем: следующий вход в «Устно» попробует снова.
      if (!isNeuralModelReady(locale)) {
        downloadPromise = null;
        downloadFileName = null;
      }
    }
  })();
  return downloadPromise;
}

// Контекст whisper тоже кэшируется по имени файла: смена языка = новый контекст.
let contextFileName: string | null = null;
let contextPromise: Promise<WhisperContext | null> | null = null;

async function getContext(locale?: string): Promise<WhisperContext | null> {
  const spec = resolveWhisperModel(locale);
  if (contextPromise && contextFileName === spec.fileName) return contextPromise;
  // Язык сменился → старый контекст освобождаем перед созданием нового.
  if (contextPromise && contextFileName !== spec.fileName) {
    void releaseNeuralJudge();
  }
  contextFileName = spec.fileName;
  contextPromise = (async () => {
    try {
      const whisper = loadWhisperModule();
      if (!whisper) return null;
      if (!isNeuralModelReady(locale)) return null;
      const file = modelFileFor(spec);
      const filePath: string | undefined = file?.uri ?? undefined;
      if (!filePath) return null;
      return await whisper.initWhisper({ filePath });
    } catch {
      return null;
    }
  })();
  const ctx = await contextPromise;
  // Неудачную инициализацию не кэшируем (модель могла докачаться позже).
  if (!ctx) {
    contextPromise = null;
    contextFileName = null;
  }
  return ctx;
}

/** Освободить контекст (например, по memory-warning). Безопасно всегда. */
export async function releaseNeuralJudge(): Promise<void> {
  const pending = contextPromise;
  contextPromise = null;
  contextFileName = null;
  try {
    const ctx = pending ? await pending : null;
    await ctx?.release?.();
  } catch {
    /* no-op */
  }
}

export type NeuralJudgeVerdict = {
  transcript: string;
  /** Балл нейтрального транскрипта против цели (шкала скорера 0..100). */
  controlScore: number;
};

/**
 * Прогнать сохранённое аудио попытки через нейро-судью БЕЗ подсказки цели.
 * null = судья недоступен/не успел/не расслышал — вызывающая сторона
 * откатывается на контрольный прогон системного движка (штрафа нет).
 *
 * `locale` — BCP-47 целевого языка ('en-US', 'es-ES'…): выбирает модель
 * (англ-only / мультиязык) и язык транскрипции. По умолчанию 'en' — текущая
 * гарантированная цель.
 */
export async function judgeWithNeuralEngine(input: {
  wavUri: string;
  targetText: string;
  locale?: string;
}): Promise<NeuralJudgeVerdict | null> {
  try {
    const ctx = await getContext(input.locale);
    if (!ctx) return null;
    const job = ctx.transcribe(input.wavUri, {
      language: whisperLanguageFor(input.locale),
      translate: false,
      // Ничего похожего на prompt/цель судье не передаём — в этом весь смысл.
    });
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => {
        try {
          job.stop?.();
        } catch {
          /* no-op */
        }
        resolve(null);
      }, NEURAL_JUDGE_TIMEOUT_MS),
    );
    const outcome = await Promise.race([job.promise, timeout]);
    const transcript = String(outcome?.result ?? '').trim();
    if (!transcript) return null;
    const controlScore = neuralControlScore(input.targetText, transcript);
    if (controlScore == null) return null;
    return { transcript, controlScore };
  } catch {
    return null;
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
