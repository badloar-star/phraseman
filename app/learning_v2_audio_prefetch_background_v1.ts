import NetInfo from "@react-native-community/netinfo";

import { runPersistedLearningV2AudioPrefetchV1 } from "./learning_v2_audio_prefetch_coordinator_v1";

const LEARNING_V2_AUDIO_PREFETCH_TASK_V1 = "learning-v2-audio-prefetch-v1";
const LOG = "[BG-PREFETCH]";

// зачем: владелец 2026-09-20 прислал падение старта приложения
// «Cannot find native module 'ExpoTaskManager'». Раньше expo-task-manager и
// expo-background-task импортировались статически, а defineTask вызывался прямо
// в module scope — то есть при импорте, ДО любой проверки доступности. Пакеты
// свежие и нативной части нет в текущей сборке, поэтому падал весь бандл, а не
// одна фоновая фича: app/_layout.tsx импортирует этот файл на старте.
// Теперь нативные модули грузятся лениво и только внутри try/catch: нет
// нативной части — фоновая догрузка молча выключается, приложение живёт.
type TaskManagerModule = typeof import("expo-task-manager");
type BackgroundTaskModule = typeof import("expo-background-task");

interface NativeBackgroundModules {
  // Имена с заглавной буквы намеренно: это модули целиком, и сторож контракта
  // tests/learning_v2_audio_prefetch_coordinator_contract.test.ts ищет вызовы
  // ровно как `TaskManager.defineTask` и `BackgroundTask.registerTaskAsync`.
  readonly TaskManager: TaskManagerModule;
  readonly BackgroundTask: BackgroundTaskModule;
}

let cachedModules: NativeBackgroundModules | null = null;
let nativeUnavailableReason: string | null = null;

/**
 * Проверяет наличие нативного модуля, НЕ загружая пакет.
 *
 * зачем: `expo-task-manager/build/ExpoTaskManager.js` — это одна строка
 * `export default requireNativeModule('ExpoTaskManager')`, то есть бросок
 * происходит при вычислении модуля. В metro.config.js нет `inlineRequires`,
 * поэтому Metro поднимает любой require наверх и выполняет его при загрузке
 * бандла — раньше, чем управление дойдёт до try/catch. Первый круг починки
 * (2026-09-20) именно на этом и провалился: стек переехал внутрь загрузчика,
 * а падение осталось. Единственный надёжный путь — не допускать загрузку
 * пакета, пока не известно, что нативная часть есть.
 *
 * Реестр `globalThis.expo.modules` — тот же источник, который опрашивает
 * `requireOptionalNativeModule` внутри expo-modules-core.
 */
function isNativeTaskManagerInstalled(): boolean {
  try {
    const registry = (
      globalThis as {
        expo?: { modules?: Record<string, unknown> };
      }
    ).expo?.modules;
    return Boolean(registry && registry.ExpoTaskManager);
  } catch (error: unknown) {
    // Запрет немого catch: сам доступ к реестру тоже может измениться.
    console.warn(
      `${LOG} не удалось прочитать реестр нативных модулей: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

/**
 * Возвращает нативные модули фоновых задач или null, если их нет в сборке.
 * Никогда не бросает: отсутствие нативной части — штатное состояние сборки,
 * сделанной до появления этих пакетов.
 */
function loadNativeBackgroundModules(): NativeBackgroundModules | null {
  if (cachedModules) return cachedModules;
  if (nativeUnavailableReason !== null) return null;

  if (!isNativeTaskManagerInstalled()) {
    nativeUnavailableReason = "ExpoTaskManager отсутствует в сборке";
    // Запрет немого catch: без этой строки фоновая догрузка молча не работала
    // бы месяцами, а причина («нужна пересборка клиента») нигде не видна.
    console.warn(
      `${LOG} нативный модуль ExpoTaskManager отсутствует в этой сборке, ` +
        `фоновая догрузка выключена. Лечится пересборкой приложения с ` +
        `expo-task-manager и expo-background-task; пакет намеренно не загружается, ` +
        `иначе падает весь бандл.`,
    );
    return null;
  }

  try {
    // Пакеты грузим только здесь: нативная часть уже подтверждена реестром.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const TaskManager = require("expo-task-manager") as TaskManagerModule;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BackgroundTask = require("expo-background-task") as BackgroundTaskModule;
    cachedModules = { TaskManager, BackgroundTask };
    return cachedModules;
  } catch (error: unknown) {
    // Второй рубеж на случай, если реестр соврал или изменился в новой версии
    // Expo. Молча проглатывать нельзя — иначе снова немой баг на месяцы.
    nativeUnavailableReason =
      error instanceof Error ? error.message : String(error);
    console.warn(
      `${LOG} реестр сообщил о наличии ExpoTaskManager, но загрузка пакета ` +
        `не удалась: ${nativeUnavailableReason}. Фоновая догрузка выключена.`,
    );
    return null;
  }
}

let taskDefined = false;

/**
 * Определяет фоновую задачу. Expo требует, чтобы задача была определена до
 * монтирования React-дерева, но не раньше проверки наличия нативного модуля.
 */
function defineBackgroundTaskOnce(modules: NativeBackgroundModules): boolean {
  if (taskDefined) return true;

  const { TaskManager, BackgroundTask } = modules;
  try {
    if (!TaskManager.isTaskDefined(LEARNING_V2_AUDIO_PREFETCH_TASK_V1)) {
      TaskManager.defineTask(LEARNING_V2_AUDIO_PREFETCH_TASK_V1, async () => {
        try {
          await runPersistedLearningV2AudioPrefetchV1();
          console.log(`${LOG} фоновая догрузка завершена успешно`);
          return BackgroundTask.BackgroundTaskResult.Success;
        } catch (error: unknown) {
          const reason = error instanceof Error ? error.message : String(error);
          try {
            const network = await NetInfo.fetch();
            if (
              network.isConnected !== true ||
              network.isInternetReachable !== true
            ) {
              // Оффлайн — нормальная пауза: запрос сохранён и возобновится с
              // проверенного кэша при следующем появлении сети.
              console.log(
                `${LOG} пауза: нет сети (connected=${String(network.isConnected)}, ` +
                  `reachable=${String(network.isInternetReachable)}); догрузка продолжится позже. ` +
                  `Исходная ошибка: ${reason}`,
              );
              return BackgroundTask.BackgroundTaskResult.Success;
            }
          } catch (networkError: unknown) {
            const networkReason =
              networkError instanceof Error
                ? networkError.message
                : String(networkError);
            console.warn(
              `${LOG} не удалось проверить сеть: ${networkReason}. ` +
                `Исходная ошибка догрузки: ${reason}`,
            );
            return BackgroundTask.BackgroundTaskResult.Success;
          }
          console.warn(`${LOG} догрузка не удалась при живой сети: ${reason}`);
          return BackgroundTask.BackgroundTaskResult.Failed;
        }
      });
    }
    taskDefined = true;
    return true;
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG} не удалось определить фоновую задачу: ${reason}`);
    return false;
  }
}

/**
 * Регистрирует фоновую догрузку аудио. Безопасна на сборке без нативных
 * модулей: в этом случае просто пишет причину в лог и возвращает управление.
 */
export async function registerLearningV2AudioPrefetchBackgroundTaskV1(): Promise<void> {
  const modules = loadNativeBackgroundModules();
  if (!modules) return; // причина уже записана в лог выше

  if (!defineBackgroundTaskOnce(modules)) return;

  const { TaskManager, BackgroundTask } = modules;
  try {
    if (!(await TaskManager.isAvailableAsync())) {
      console.log(`${LOG} фоновые задачи недоступны на этом устройстве`);
      return;
    }

    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
      console.log(
        `${LOG} фоновые задачи запрещены системой, статус=${String(status)}`,
      );
      return;
    }

    if (await TaskManager.isTaskRegisteredAsync(LEARNING_V2_AUDIO_PREFETCH_TASK_V1)) {
      return;
    }

    await BackgroundTask.registerTaskAsync(LEARNING_V2_AUDIO_PREFETCH_TASK_V1, {
      minimumInterval: 15,
    });
    console.log(`${LOG} фоновая догрузка зарегистрирована, интервал 15 мин`);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG} регистрация фоновой задачи не удалась: ${reason}`);
  }
}
