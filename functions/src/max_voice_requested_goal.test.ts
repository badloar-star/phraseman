// Сторож выбора урока в разделе «Уроки с МАКСом».
//
// зачем (владелец 2026-08-31): «можно идти поочерёдно или выбрать 1 из уроков
// из раздела и запустить». Если выбранный урок теряется по дороге, симптом
// молчаливый и обидный: человек тапает «Заказать в кафе», а MAX учит
// здороваться — и никакой ошибки при этом нет. Этот тест закрывает шов.

import { buildTutorPreview } from './max_voice_tutor_preview';
import { TUTOR_MEMORY_EMPTY, type TutorMemory } from './max_voice_tutor_memory';

const NOW = 1_756_000_000_000;

function preview(memory: TutorMemory, requestedGoalId?: string) {
  return buildTutorPreview({
    memory,
    cefr: 'A1',
    interfaceLang: 'ru',
    tutorName: 'Max',
    nowMs: NOW,
    requestedGoalId,
  });
}

describe('превью ведёт выбранный в каталоге урок', () => {
  it('без выбора — следующая незакрытая цель, как раньше', () => {
    expect(preview(TUTOR_MEMORY_EMPTY).goal?.id).toBe('a1_greet');
  });

  it('выбранный урок побеждает порядок', () => {
    expect(preview(TUTOR_MEMORY_EMPTY, 'a1_order_cafe').goal?.id).toBe('a1_order_cafe');
  });

  it('можно открыть урок выше своего уровня — блокировок нет', () => {
    // Владелец 2026-08-31: «все открыты сразу, есть рекомендуемый».
    expect(preview(TUTOR_MEMORY_EMPTY, 'b2_meeting').goal?.id).toBe('b2_meeting');
  });

  it('можно вернуться к уже закрытому уроку', () => {
    const memory: TutorMemory = { ...TUTOR_MEMORY_EMPTY, goalMastery: { a1_greet: 3 } };
    expect(preview(memory, 'a1_greet').goal?.id).toBe('a1_greet');
    // Без выбора закрытый урок пропускается — это прежнее поведение.
    expect(preview(memory).goal?.id).toBe('a1_intro');
  });

  it('неизвестный id молча падает в обычный порядок, а не ломает урок', () => {
    // Диплинк — недоверенный ввод: подделанный id не должен рвать звонок.
    expect(preview(TUTOR_MEMORY_EMPTY, 'нет_такого_урока').goal?.id).toBe('a1_greet');
    expect(preview(TUTOR_MEMORY_EMPTY, '').goal?.id).toBe('a1_greet');
  });
});

describe('каталог звёзд и прогресс уходят клиенту', () => {
  it('у новичка карта звёзд пуста, прогресс нулевой', () => {
    const p = preview(TUTOR_MEMORY_EMPTY);
    expect(p.catalogMastery).toEqual({});
    expect(p.progress.done).toBe(0);
    expect(p.progress.total).toBe(78);
  });

  it('нули не передаются — экономим размер ответа', () => {
    const memory: TutorMemory = {
      ...TUTOR_MEMORY_EMPTY,
      goalMastery: { a1_greet: 3, a1_intro: 0, a1_ask_name: 2 },
    };
    const p = preview(memory);
    expect(p.catalogMastery).toEqual({ a1_greet: 3, a1_ask_name: 2 });
    expect(p.progress.done).toBe(1);
  });

  it('ступени зажаты в 0..3', () => {
    const memory: TutorMemory = {
      ...TUTOR_MEMORY_EMPTY,
      goalMastery: { a1_greet: 99, a1_intro: -5 },
    };
    expect(preview(memory).catalogMastery).toEqual({ a1_greet: 3 });
  });
});
