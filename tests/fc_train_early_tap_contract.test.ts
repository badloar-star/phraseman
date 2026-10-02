// зачем (координатор §90, 02.10): кнопка «Тренироваться» не бывает «мёртвой». Ранний тап, пока квота
// читается ('waiting' — на слабом устройстве секунды очереди AsyncStorage), сразу открывает окно режимов;
// режимы ждут и оживают сами; 15 с → «Не получилось подготовить тренировку» + «Повторить»; двойной тап
// и поздний ответ после закрытия окна не делают ничего лишнего (автоперехода нет).
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const hub = fs.readFileSync(path.join(root, 'app/flashcards/FlashcardsHubScreen.tsx'), 'utf8');
const sheet = fs.readFileSync(path.join(root, 'app/flashcards/FlashcardsTrainingModeSheet.tsx'), 'utf8');
const quota = fs.readFileSync(path.join(root, 'app/monthly_training_sessions.ts'), 'utf8');

describe('FC train early tap (§90)', () => {
  test('кнопка не отключается на ожидании квоты и не серая', () => {
    expect(hub).not.toMatch(/disabled=\{!trainingLocked && !trainingEntryReady\}/);
    expect(hub).not.toMatch(/\(!trainingLocked && !trainingEntryReady\) && styles\.trainDisabled/);
    expect(hub).not.toContain('МЁРТВЫЙ ТАП');
  });

  test('ранний тап открывает окно сразу; двойной тап проглочен', () => {
    expect(hub).toContain("console.log(`[FC-TRAIN-ENTRY] early_tap:waiting");
    expect(hub).toContain("setEarlyTap('waiting');");
    expect(hub).toContain('setModeSheetVisible(true);');
    expect(hub).toContain('early_tap:double_tap_ignored');
  });

  test('потолок 15 с → failed; повтор; закрытие сбрасывает; без автоперехода', () => {
    expect(hub).toContain('const EARLY_TAP_CEILING_MS = 15_000;');
    expect(hub).toContain("setEarlyTap('failed');");
    expect(hub).toContain('early_tap:retry');
    expect(hub).toContain('early_tap:closed');
    expect(hub).toContain('early_tap:resolved');
    expect(hub).toContain('early_tap:choose_ignored');
    // Ответ квоты только оживляет режимы — навигации из эффекта раннего тапа нет.
    const effect = hub.slice(hub.indexOf('// Ранний тап: квота ответила'), hub.indexOf('const retryEarlyTap'));
    expect(effect).not.toMatch(/router\.|setModeSheetVisible\(/);
    expect(hub).toContain('preparing={earlyTap}');
    expect(hub).toContain('onRetry={retryEarlyTap}');
  });

  test('окно: строка подготовки/ошибки в 9 локалях, режимы приглушены, «Повторить»', () => {
    for (const text of ['Готовим тренировку…', 'Не получилось подготовить тренировку', 'Повторить']) {
      expect(sheet).toContain(text);
    }
    for (const lang of ['uk:', 'en:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:']) {
      const preparing = sheet.slice(sheet.indexOf('const preparingSubtitle'), sheet.indexOf('const failedSubtitle'));
      expect(preparing).toContain(lang);
    }
    expect(sheet).toContain("|| preparing !== null;");
    expect(sheet).toContain('testID="fc-training-mode-retry"');
  });

  test('квота: немых catch больше нет', () => {
    expect(quota).not.toMatch(/catch \{\s*\n/);
    expect(quota).toContain('monthly_sessions:preview_failed');
    expect(quota).toContain('monthly_sessions:corrupt_record');
  });
});
