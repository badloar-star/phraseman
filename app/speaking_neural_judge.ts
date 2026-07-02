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

import { scorePlanPronunciationTranscript } from './personal_plan_pronunciation_scoring_client';

/** Спека модели: whisper tiny.en, 5-битная квантовка — баланс вес/качество. */
export const NEURAL_JUDGE_MODEL = {
  fileName: 'ggml-tiny.en-q5_1.bin',
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin',
  /** Санити-минимум размера файла: битая/оборванная загрузка не считается моделью. */
  minBytes: 30 * 1024 * 1024,
  /** Подкаталог в documentDirectory (кэш ОС может чиститься — документы нет). */
  directory: 'neural_judge',
} as const;

/** Потолок одного прогона судьи: короткая фраза, дальше — без поправки. */
export const NEURAL_JUDGE_TIMEOUT_MS = 6000;

/** Балл нейтрального транскрипта против цели — та же шкала, что у скорера. */
export function neuralControlScore(targetText: string, transcript: string): number | null {
  const text = transcript.trim();
  if (!text) return null;
  return scorePlanPronunciationTranscript({ targetText, transcript: text }).score;
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

function modelFile(): any | null {
  const fs = loadFs();
  if (!fs) return null;
  try {
    const dir = new fs.Directory(fs.Paths.document, NEURAL_JUDGE_MODEL.directory);
    return new fs.File(dir, NEURAL_JUDGE_MODEL.fileName);
  } catch {
    return null;
  }
}

/** Модель скачана и выглядит целой. */
export function isNeuralModelReady(): boolean {
  try {
    const file = modelFile();
    return Boolean(file?.exists) && (file?.size ?? 0) >= NEURAL_JUDGE_MODEL.minBytes;
  } catch {
    return false;
  }
}

let downloadPromise: Promise<boolean> | null = null;

/**
 * Скачать модель один раз (идемпотентно, конкурентные вызовы делят промис).
 * true = модель на месте. Ошибки сети НЕ бросаются — просто false: «Устно»
 * продолжает работать на контрольном прогоне системного движка.
 */
export function ensureNeuralModel(): Promise<boolean> {
  if (downloadPromise) return downloadPromise;
  downloadPromise = (async () => {
    try {
      if (isNeuralModelReady()) return true;
      const fs = loadFs();
      if (!fs) return false;
      const dir = new fs.Directory(fs.Paths.document, NEURAL_JUDGE_MODEL.directory);
      if (!dir.exists) dir.create({ intermediates: true });
      const file = new fs.File(dir, NEURAL_JUDGE_MODEL.fileName);
      // Хвост оборванной загрузки затираем заново.
      if (file.exists && (file.size ?? 0) < NEURAL_JUDGE_MODEL.minBytes) file.delete();
      const downloaded = await fs.File.downloadFileAsync(NEURAL_JUDGE_MODEL.url, file);
      return Boolean(downloaded?.exists) && (downloaded?.size ?? 0) >= NEURAL_JUDGE_MODEL.minBytes;
    } catch {
      return false;
    } finally {
      // Провал не кэшируем: следующий вход в «Устно» попробует снова.
      if (!isNeuralModelReady()) downloadPromise = null;
    }
  })();
  return downloadPromise;
}

let contextPromise: Promise<WhisperContext | null> | null = null;

async function getContext(): Promise<WhisperContext | null> {
  if (contextPromise) return contextPromise;
  contextPromise = (async () => {
    try {
      const whisper = loadWhisperModule();
      if (!whisper) return null;
      if (!isNeuralModelReady()) return null;
      const file = modelFile();
      const filePath: string | undefined = file?.uri ?? undefined;
      if (!filePath) return null;
      return await whisper.initWhisper({ filePath });
    } catch {
      return null;
    }
  })();
  const ctx = await contextPromise;
  // Неудачную инициализацию не кэшируем (модель могла докачаться позже).
  if (!ctx) contextPromise = null;
  return ctx;
}

/** Освободить контекст (например, по memory-warning). Безопасно всегда. */
export async function releaseNeuralJudge(): Promise<void> {
  const pending = contextPromise;
  contextPromise = null;
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
 */
export async function judgeWithNeuralEngine(input: {
  wavUri: string;
  targetText: string;
}): Promise<NeuralJudgeVerdict | null> {
  try {
    const ctx = await getContext();
    if (!ctx) return null;
    const job = ctx.transcribe(input.wavUri, {
      language: 'en',
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
