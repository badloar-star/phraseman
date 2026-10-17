// зачем ([BACK-BTN] 18.10, Сверка: на экране «Все уроки» метки в журнале не было): круглая «назад» этого экрана пишет tap → decision, а возврат на карту — arrived.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = readFileSync('components/learning-v2/LearningV2ChaptersCourse.tsx', 'utf8').replace(/\r\n/g, '\n');

test('«Все уроки»: стрелка назад ставит метку до закрытия экрана, возврат на карту — «прибыли»', () => {
  assert.ok(src.includes('import { noteBackArrived, noteBackDecision, noteBackTap } from "../../app/back_tap_probe";'));
  const press = src.indexOf("noteBackTap('v2_all_lessons', 'header_back_button')");
  assert.ok(press > 0, 'метка тапа');
  assert.ok(press < src.indexOf('setAllLessonsOpen(false); }} style={[styles.iconButton'), 'метка раньше закрытия');
  assert.ok(src.includes("noteBackDecision('all_lessons → map')"));
  assert.ok(src.includes("if (!allLessonsOpen) noteBackArrived('v2_map', 'all_lessons_closed');"));
  // эффект стоит до условного return, иначе порядок хуков зависел бы от состояния
  assert.ok(src.indexOf("noteBackArrived('v2_map'") < src.indexOf('if (allLessonsOpen) {'));
});
