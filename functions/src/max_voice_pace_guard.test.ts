// ═══════════════════════════════════════════════════════════════════════════
// Сторож темпа речи MAX.
//
// зачем (владелец 2026-09-01): «задавай максимальную медленность, чтобы он
// всегда по умолчанию говорил очень медленно» → «КАК С ДЕТЬМИ».
//
// Повод. Промпт требовал медленной речи в VOICE RULES 0 — и тут же, строкой
// выше, разрешал «natural pace for B1/B2». Модель видела оба указания и на
// сильных учениках выбирала быстрое: ровно то, на что жаловался владелец.
// Класс бага — «две инструкции об одном, с разными числами».
//
// Сторож ломает сборку, если противоречие вернётся. Сработал — чинить промпт,
// а не сторожа.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { join } from 'path';

import { TUTOR_PACE_NOTE_PREFIX, TUTOR_TIME_NOTE_PREFIX } from './max_voice_prompt';

const promptSource = readFileSync(join(__dirname, 'max_voice_prompt.ts'), 'utf8');

describe('темп речи MAX', () => {
  it('нигде не разрешает обычный темп для сильных учеников', () => {
    // Именно эта формулировка и отменяла правило медленной речи.
    expect(promptSource).not.toMatch(/natural pace for B1/i);
    expect(promptSource).not.toMatch(/70% of natural speed/i);
  });

  it('требует одинаково медленный темп на всех уровнях', () => {
    expect(promptSource).toMatch(/SPEAK VERY SLOWLY/);
    // Уровень меняет объём сказанного, а не скорость.
    expect(promptSource).toMatch(/never speed|never how fast/i);
  });

  it('заметка о темпе отделена от заметок времени', () => {
    // Общий префикс заставил бы учителя прощаться посреди урока.
    expect(TUTOR_PACE_NOTE_PREFIX).not.toBe(TUTOR_TIME_NOTE_PREFIX);
    expect(promptSource).toContain(`"${TUTOR_PACE_NOTE_PREFIX} ..."`);
    // Учитель обязан знать, что это НЕ сигнал заканчивать.
    expect(promptSource).toMatch(/NEVER a signal to wrap up/i);
  });

  it('запрещает зачитывать служебные заметки вслух', () => {
    expect(promptSource).toMatch(/NEVER read a note out loud/i);
  });
});

describe('память об ученике', () => {
  const memorySource = readFileSync(join(__dirname, 'max_voice_tutor_memory.ts'), 'utf8');

  it('не знакомится заново с тем, кого уже знает', () => {
    // Признак знакомства — сама память, а не счётчик уроков: у пробника он
    // остаётся нулём, и MAX спрашивал имя во второй раз.
    expect(memorySource).toMatch(/YOU HAVE ALREADY MET THIS LEARNER/);
    expect(memorySource).toMatch(/preferredName[^\n]*!== ''\s*\n?\s*\|\|/);
  });

  it('добирает недостающие факты при частичном знакомстве', () => {
    // Знаем имя, но не знаем цель — обязаны спросить один раз, а не молчать вечно.
    expect(memorySource).toMatch(/You still do not know what to call them/);
    expect(memorySource).toMatch(/You still do not know why they are learning English/);
  });
});
