// ═══════════════════════════════════════════════════════════════════════════
// Сторож формата голосового звонка.
//
// зачем: экран /max_call_prestart по умолчанию уходит в 'scenario' — отыгрыш
// сценки БЕЗ памяти об ученике, без цели урока и без правил медленной речи.
// Точка входа, забывшая передать format, молча даёт человеку не то, что
// обещала кнопка: 2026-09-01 так вела кнопка «Позвонить MAX» в окне после
// покупки премиума, причём комментарий рядом уверял, что дефолт другой.
//
// Отказ молчаливый — упасть тут нечему, поэтому и нужен сторож.
// Сработал — добавь format в свою точку входа, а не правь проверку.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { join } from 'path';

const ENTRY_POINTS = [
  'components/PremiumCelebrationModal.tsx',
  'app/notifications.ts',
];

describe('точки входа в голосовой звонок', () => {
  it.each(ENTRY_POINTS)('%s передаёт format при открытии звонка', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    const opensCall = source.includes('/max_call_prestart');
    if (!opensCall) return; // Точка входа исчезла — сторожить нечего.

    // Каждое открытие экрана обязано нести format в параметрах.
    const bareOpen = /router\.(push|replace)\(\s*['"]\/max_call_prestart['"]/.test(source);
    expect(bareOpen).toBe(false);
    expect(source).toMatch(/max_call_prestart[\s\S]{0,200}?format:\s*'tutor'/);
  });

  it('дефолт экрана всё ещё scenario — иначе сторож бессмыслен', () => {
    // Если дефолт однажды станет 'tutor', эта проверка напомнит пересмотреть
    // сторожа целиком, а не оставлять его охранять несуществующий риск.
    const prestart = readFileSync(join(process.cwd(), 'app/max_call_prestart.tsx'), 'utf8');
    expect(prestart).toMatch(/:\s*'scenario';/);
  });
});
