// зачем ([OPTIMISTIC-DESIGN] 17.10, координатор): быстрые повторные тапы не должны ни пропускать страницу вступления урока, ни вызывать его завершение дважды,
// ни открывать страницу стора дважды из окна оценки. Сторож держит замки в исходниках: уберут замок — тест покажет, какой именно.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

test('intro: «Дальше» берёт замок до смены страницы и снимает его при смене страницы', () => {
  const src = read('app/learning_v2_session_intro.tsx');
  assert.match(src, /const advanceLockRef = useRef\(false\);/);
  const advance = src.slice(src.indexOf('const advance = () => {'), src.indexOf('const advance = () => {') + 1400);
  assert.ok(advance.includes('if (advanceLockRef.current)'), 'повторный тап отбрасывается');
  assert.ok(advance.indexOf('advanceLockRef.current = true;') < advance.indexOf('onComplete('), 'замок берётся до завершения');
  assert.ok(advance.indexOf('advanceLockRef.current = true;') < advance.indexOf('setIndex('), 'замок берётся до смены страницы');
  assert.match(src, /useEffect\(\(\) => \{\n\s+advanceLockRef\.current = false;\n\s+\}, \[safeIndex\]\);/);
});

test('rating prompt: «Да» показывает «спасибо» сразу и не открывает стор дважды', () => {
  const src = read('app/lesson_complete.tsx');
  const yes = src.slice(src.indexOf('const handleYes = async () => {'), src.indexOf('const handleNo = async () => {'));
  assert.ok(yes.includes('if (yesTappedRef.current) return;'));
  assert.ok(yes.indexOf("setStep('thanks')") < yes.indexOf('await markReviewRated()'), '«спасибо» не ждёт запись на диск');
  assert.ok(yes.includes('markReviewRated().catch('), 'отказ записи не прячет страницу стора');
  assert.match(src, /yesTappedRef\.current = false;/, 'замок снимается при новом показе окна');
});
