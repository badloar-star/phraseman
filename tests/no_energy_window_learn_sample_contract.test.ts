// зачем (координатор 12.10, energy-modes-017, образец А3 №25 энергия-modes-states): окно «нет энергии» старта урока — «Энергия закончилась» + фиксированная фраза с живым таймером; DEV-кнопка урока не попадает в кадры при overlays=off.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('окно «нет энергии», вариант learn = образец А3', () => {
  const src = read('components/NoEnergyModal.tsx');

  it('текст — первая фраза пула (детерминированно), не случайная и не «Для урока нужно…»; журнал [NO-ENERGY-WINDOW]', () => {
    const at = src.indexOf("if (variant === 'learn') {");
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at, at + 1200);
    expect(block).toContain('lessonEnergyMessages(lang)[0]');
    expect(block).toContain('[NO-ENERGY-WINDOW] learn');
    // ветка learn стоит ДО ветки isGate в эффекте выбора текста
    expect(at).toBeLessThan(src.indexOf('if (isGate) {', at));
    expect(src).toContain("}, [modalVisible, isGate, lang, requiredEnergy, totalAvailable, variant, activity]);");
  });

  it('заголовок learn — «Энергия закончилась» даже у занятия с ценой; тело — фраза с {time}', () => {
    expect(src).toContain("const titleText = isGate && variant !== 'learn'");
    expect(src).toContain("const showBody = ((isGate && variant !== 'learn') ? (lineText || gateFallback) : (lineText || defaultSubtitle)).replace(/\\{time\\}/g, recoveryTimeText);");
  });

  it('первая фраза пула на всех 9 языках содержит {time} и значок ⚡ (живой таймер подставляется)', () => {
    const pool = `${read('app/lesson1_energy.ts')}
${read('app/lesson_locale_utils.ts')}`;
    const names = ['RU', 'UK', 'EN', 'ES', 'PT_BR', 'VI', 'ID', 'TR', 'PL'];
    for (const name of names) {
      const m = pool.match(new RegExp(String.raw`const ENERGY_MESSAGES_${name}\s*=\s*\[\s*\n\s*'([^\n]*)'`));
      expect(m).not.toBeNull();
      expect(m![1]).toContain('{time}');
    }
    expect(pool).toContain('Дай знаниям немного уложиться. +1 ⚡ вернётся через {time}. Или забудь о паузах с Плюс прямо сейчас.');
  });

  it('DEV-кнопка «grammar hint» в уроке скрыта при dev overlays=off', () => {
    const lesson = read('app/lesson1.tsx');
    expect(lesson).toContain('{__DEV__ && !isDevOverlaysOff() && (');
    expect(lesson).toContain("import { isDevOverlaysOff } from './dev_overlays_off';");
  });
});
