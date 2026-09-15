/**
 * Локальный след последнего урока с Максом: тема следующего урока и когда был
 * прошлый. Живёт в AsyncStorage.
 *
 * зачем: афиша в хабе обещает «Макс помнит, на чём вы остановились». Тянуть
 * ради одной строки память тутора из Firestore при КАЖДОМ заходе в раздел —
 * лишнее чтение на человека в день, а данные и так рождаются на устройстве в
 * конце урока. Авторитетная память остаётся серверной (voice_tutor_memory), эта
 * запись — только подпись на карточке.
 *
 * зачем ключ без uid: раздел читается до разрешения аккаунта, а подпись — не
 * приватные данные, только тема. При смене аккаунта запись перетирается первым
 * же законченным уроком.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tutor_lesson_last_v1';

export interface TutorLessonTrace {
  /** Тема, которую Макс назвал следующей. */
  nextTopic: string;
  /** Когда закончился прошлый урок (мс). */
  finishedAt: number;
}

/**
 * Читает след. Никогда не бросает: подпись на карточке не стоит того, чтобы
 * ронять раздел, а молчаливый catch запрещён — пишем причину.
 */
export async function readTutorLessonTrace(): Promise<TutorLessonTrace | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TutorLessonTrace>;
    const nextTopic = typeof parsed.nextTopic === 'string' ? parsed.nextTopic.trim().slice(0, 140) : '';
    const finishedAt = Number(parsed.finishedAt);
    if (!nextTopic || !Number.isFinite(finishedAt)) {
      console.log('[TUTOR-TRACE] read: запись есть, но пустая', JSON.stringify({ nextTopic, finishedAt }));
      return null;
    }
    return { nextTopic, finishedAt };
  } catch (error) {
    console.log('[TUTOR-TRACE] read failed', String((error as { message?: unknown })?.message ?? error));
    return null;
  }
}

/** Сохраняет след после урока. Пустая тема стирает запись, а не пишет пустоту. */
export async function writeTutorLessonTrace(nextTopic: string): Promise<void> {
  const topic = nextTopic.trim().slice(0, 140);
  try {
    if (!topic) {
      await AsyncStorage.removeItem(KEY);
      return;
    }
    const trace: TutorLessonTrace = { nextTopic: topic, finishedAt: Date.now() };
    await AsyncStorage.setItem(KEY, JSON.stringify(trace));
  } catch (error) {
    console.log('[TUTOR-TRACE] write failed', String((error as { message?: unknown })?.message ?? error));
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
