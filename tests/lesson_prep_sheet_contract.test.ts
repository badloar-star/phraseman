// зачем (живой макет lesson-preparing-live.html, владелец утвердил 25.10; координатор: перенести в шторку «Начать» вкладки «Уроки»):
// шторка не закрывается на тапе, а ждёт подготовку — на кнопке ход «Готовим занятие…» (только если дольше 0,35 с); повторный тап по занятой кнопке
// ничего не запускает; готово — шторка плавно закрывается, затем экран занятия; отказ — кнопка свободна, прежняя подсказка. Старые контракты шторки целы.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('шторка «Начать»: ход подготовки', () => {
  const sheet = read('components/LearningV2SessionOutcomeSheet.tsx');
  const lessons = read('app/(tabs)/lessons.tsx');

  it('шторка: режим «остаться открытой», сигнал закрытия и общая начинка кнопки; старые выходы на месте', () => {
    expect(sheet).toContain('stayOpenWhilePreparing');
    expect(sheet).toContain('exitSignal');
    expect(sheet).toContain('<LessonPrepCtaBody');
    expect(sheet).toContain('source="lessons"');
    // прежние контракты (learning_v2_motion_performance_contract): выход по тапу остаётся для остальных вызовов
    expect(sheet).toMatch(/leave\(onPrimaryPress, true\)/);
    expect(sheet).toMatch(/leave\(onSecondaryPress, true\)/);
    expect(sheet).not.toMatch(/withRepeat/);
    expect(sheet).not.toMatch(/numberOfLines/);
  });

  it('экран «Уроки»: занятая кнопка не запускает второй раз; конец подготовки пишется на успехе и на отказе; шторка закрывается по готовности', () => {
    const start = lessons.indexOf('const launchSelectedLearningV2Session');
    const handler = lessons.slice(start, lessons.indexOf('// Витрина звёзд', start));
    expect(handler).toContain("if (!beginLessonPrep('lessons')) return;");
    expect(handler).toContain('markLessonPrepFinishing();');
    expect((handler.match(/endLessonPrep\(/g) ?? []).length).toBeGreaterThanOrEqual(4); // успех, устарел ×2, отказ
    expect(handler).toContain('exitSheet');
    // прежние контракты (learning_v2_session_preparation_architecture_contract)
    expect(handler).toMatch(/setSelectedLearningV2Session\(null\)/);
    expect(handler).toMatch(/LEARNING_V2_SESSION_MODAL_EXIT_MS/);
    expect(handler).toMatch(/Promise\.all/);
    expect(handler).toContain('prepare_failed'); // прежняя честная подсказка при отказе
  });

  it('шторка в «Уроках» получает режим и сигнал; «кадра загрузки» (actionsDisabled) по-прежнему нет', () => {
    const usage = lessons.match(/<LearningV2SessionOutcomeSheet[\s\S]*?\n\s*\/>/)?.[0] ?? '';
    expect(usage).toContain('stayOpenWhilePreparing');
    expect(usage).toContain('exitSignal={learningV2SheetExit}');
    expect(usage).not.toMatch(/actionsDisabled=/);
  });
});
