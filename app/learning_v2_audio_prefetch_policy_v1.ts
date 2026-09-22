export type LearningV2AudioPrefetchCoordinateV1 = Readonly<{
  lessonOrdinal: number;
  sessionOrdinal: number;
}>;

export type LearningV2AudioPrefetchNetworkV1 = Readonly<{
  type: string;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isConnectionExpensive: boolean | null;
}>;

const SESSIONS_PER_LESSON = 56;
const MAX_LESSON_ORDINAL = 32;

function nextCoordinate(
  coordinate: LearningV2AudioPrefetchCoordinateV1,
): LearningV2AudioPrefetchCoordinateV1 | null {
  if (coordinate.sessionOrdinal < SESSIONS_PER_LESSON) {
    return Object.freeze({
      lessonOrdinal: coordinate.lessonOrdinal,
      sessionOrdinal: coordinate.sessionOrdinal + 1,
    });
  }
  if (coordinate.lessonOrdinal >= MAX_LESSON_ORDINAL) return null;
  return Object.freeze({
    lessonOrdinal: coordinate.lessonOrdinal + 1,
    sessionOrdinal: 1,
  });
}

export function learningV2UrgentAudioCoordinatesV1(input: {
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
  readonly count: number;
  readonly isPublished: (lessonOrdinal: number, sessionOrdinal: number) => boolean;
}): readonly LearningV2AudioPrefetchCoordinateV1[] {
  if (
    !Number.isSafeInteger(input.lessonOrdinal) || input.lessonOrdinal < 1 || input.lessonOrdinal > MAX_LESSON_ORDINAL ||
    !Number.isSafeInteger(input.sessionOrdinal) || input.sessionOrdinal < 1 || input.sessionOrdinal > SESSIONS_PER_LESSON ||
    !Number.isSafeInteger(input.count) || input.count < 1 || input.count > 8
  ) throw new Error("learning_v2_audio_prefetch_policy_invalid");
  const result: LearningV2AudioPrefetchCoordinateV1[] = [];
  let coordinate: LearningV2AudioPrefetchCoordinateV1 | null = Object.freeze({
    lessonOrdinal: input.lessonOrdinal,
    sessionOrdinal: input.sessionOrdinal,
  });
  while (coordinate && result.length < input.count) {
    if (!input.isPublished(coordinate.lessonOrdinal, coordinate.sessionOrdinal)) break;
    result.push(coordinate);
    coordinate = nextCoordinate(coordinate);
  }
  return Object.freeze(result);
}

/**
 * зачем (владелец, 22.09): «занятие не подготовилось» на уроке 2. Массовая
 * закачка урока требовала Wi-Fi, поэтому человек с мобильным интернетом
 * НИКОГДА не получал запаса вперёд и упирался в отказ на каждой новой сессии.
 * Владелец выбрал «качать на любой сети»: файл весит десятки килобайт и
 * скачивается один раз навсегда.
 *
 * Остаётся единственный настоящий стоп — соединение, за которое платят по
 * счётчику (`isConnectionExpensive === true`, роуминг/лимитный тариф). Там
 * массовую закачку по-прежнему не начинаем: срочное окно ниже всё равно
 * принесёт ближайшие сессии.
 */
export function isLearningV2BulkAudioNetworkEligibleV1(
  network: LearningV2AudioPrefetchNetworkV1,
): boolean {
  return network.isConnected === true && network.isConnectionExpensive !== true;
}

/**
 * зачем (владелец, 22.09): раньше требовалось `isInternetReachable === true`.
 * NetInfo отдаёт здесь `null`, пока проверка достижимости не завершилась — а
 * это обычное состояние сразу после запуска приложения, ровно в тот момент,
 * когда человек открывает карту уроков. Строгое сравнение с `true` означало,
 * что прогрев не стартовал ВОВСЕ, и первая же сессия без бандл-озвучки давала
 * «Занятие не подготовилось. Проверь связь».
 *
 * Теперь неизвестность (`null`) трактуется как «попробовать стоит»: худший
 * исход — неудачная закачка, которую вызывающий переживает и логирует. Явное
 * `false` (сеть есть, интернета нет) по-прежнему останавливает.
 */
export function isLearningV2UrgentAudioNetworkEligibleV1(
  network: LearningV2AudioPrefetchNetworkV1,
): boolean {
  return network.isConnected !== false && network.isInternetReachable !== false;
}
