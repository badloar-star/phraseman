import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Сторож решения владельца 2026-09-17 («не только Learning V2, но и Learning
 * V1 тоже надо»): озвучка результата последней фразы урока V1 обязана
 * дозвучать перед переходом на lesson_complete, а не обрываться фиксированным
 * таймером.
 *
 * Дефект, который он охраняет: переход на lesson_complete раньше был на
 * ЖЁСТКОМ таймере 1500мс, не зависящем от реального состояния озвучки. Клип
 * может стартовать до ~9с на холодном кэше (download timeout + player
 * watchdog + settle grace, см. phrase_audio_timing.ts) — переход срабатывал
 * заведомо раньше, router.replace размонтирует экран, и cleanup useAudio()
 * обрывает звук через unmount.
 *
 * Проверка — на ПОРЯДОК/СТРУКТУРУ, не на дословные значения (урок 15.09: text
 * guard пропустил пять утечек аренды). Не проверяет число 1500 или magic
 * timeout — то, что путь «голос включён» откладывает переход через ref вместо
 * голого фиксированного таймера.
 */

const LESSON1_SCREEN = join(process.cwd(), 'app', 'lesson1.tsx');

describe('озвучка результата в Learning V1 не режется таймером перехода', () => {
  const source = readFileSync(LESSON1_SCREEN, 'utf8');

  it('переход на lesson_complete больше не поставлен на голый setTimeout(…, 1500)', () => {
    // Старый дефект: setTimeout(async () => { ... }, 1500) — асинхронное тело
    // перехода жёстко привязано к фиксированному числу без всякой связи со
    // звуком. Новая структура выносит тело в именованную функцию и решает
    // ПОТОМ, ждать ли речь.
    expect(source).not.toMatch(/setTimeout\(async \(\) => \{[\s\S]{0,200}resetShuffleForNextPass/);
  });

  it('есть выделенная функция перехода, вызываемая условно (голос вкл/выкл), а не одним путём', () => {
    expect(source).toContain('const runLessonCompletionNavigation = async () => {');
    expect(source).toContain('if (!settings.voiceOut) {');
    // Путь без голоса — короткая пауза «дать увидеть результат», путь с
    // голосом — откладывается через ref до сигнала о реальном окончании речи.
    expect(source).toMatch(/if \(!settings\.voiceOut\) \{\s*setTimeout\(\(\) => \{ void runLessonCompletionNavigation\(\); \}, 1500\);/);
    expect(source).toContain('lessonCompletionNavigateRef.current = () => { void runLessonCompletionNavigation(); };');
  });

  it('фолбэк ожидания речи выведен из общего timing-контракта, а не изобретён заново', () => {
    // Инвариант: аварийный потолок ожидания НЕ может быть короче, чем время
    // холодного старта клипа — иначе переход снова обгонит звук на плохой
    // сети, просто реже. Источник истины один — phraseAudioClipStartTimeoutMs.
    expect(source).toContain(
      'const LESSON_COMPLETION_SPEECH_FALLBACK_MS = phraseAudioClipStartTimeoutMs(Platform.OS) + 6_000;',
    );
    expect(source).toContain('}, LESSON_COMPLETION_SPEECH_FALLBACK_MS);');
  });

  it('эффект эха результата сигналит settle по onDone/onStopped/onError — не только onDone', () => {
    // Если считать законченной речью только onDone, отмена/ошибка озвучки
    // оставили бы переход висеть до аварийного потолка на КАЖДОМ прерывании,
    // а не только на реальном сбое сети.
    const effectStart = source.indexOf("if (!lessonRuntimeActive || status !== 'result' || !phrase || !settings.voiceOut) return;");
    expect(effectStart).toBeGreaterThanOrEqual(0);
    const effectBody = source.slice(effectStart, effectStart + 1500);
    expect(effectBody).toContain('onDone: settle');
    expect(effectBody).toContain('onStopped: settle');
    expect(effectBody).toContain('onError: settle');
  });

  it('unmount-cleanup сбрасывает отложенный переход и его фолбэк-таймер', () => {
    // Без сброса отложенный router.replace('/lesson_complete') мог бы прийти
    // ПОСЛЕ unmount экрана (пользователь ушёл раньше) — навигация на мёртвом
    // компоненте. Ищем присутствие сброса рядом с известным unmount-эффектом
    // (пустые зависимости, stopAudio()).
    // Файл в CRLF (\r\n) — ищем без опоры на конкретный символ переноса строки.
    const cleanupMatch = source.match(/useEffect\(\(\) => \(\) => \{\r?\n\s*if \(replayAudioTimerRef\.current\) clearTimeout\(replayAudioTimerRef\.current\);/);
    expect(cleanupMatch).not.toBeNull();
    const cleanupEffect = cleanupMatch?.index ?? -1;
    expect(cleanupEffect).toBeGreaterThanOrEqual(0);
    const cleanupBody = source.slice(cleanupEffect, cleanupEffect + 700);
    expect(cleanupBody).toContain('lessonCompletionNavigateRef.current = null;');
    expect(cleanupBody).toContain('clearTimeout(lessonCompletionFallbackTimerRef.current);');
  });
});
