/**
 * Сторож заданий диалога (владелец 2026-09-17: «РАЗРАБОТАЙ НОРМАЛЬНЫЕ ЦЕЛИ
 * ПРАВИЛЬНЫЕ ДЛЯ КАЖДОГО ДИАЛОГА ИЗ ВСЕХ»).
 *
 * зачем сторож нужен вообще. Поле `objectives` НЕОБЯЗАТЕЛЬНОЕ: если его не
 * задать, `scenarioObjectives` молча нарежет цели из `goalEn` по запятым и
 * `and`. Именно так и вышло «в каждом диалоге ровно три задания» — у 22 из 53
 * сценариев своего списка не было вовсе, а ещё у 25 он был коротким.
 * Автонарезка не падает и ничего не ломает, поэтому обычные тесты её не
 * замечают: это класс бага «механизм есть, а данных не дали».
 *
 * Сторож фиксирует РЕЗУЛЬТАТ, а не реализацию: у каждого активного сценария
 * есть собственный список из 4–7 заданий с уникальными id.
 */
import {
  DIALOG_SCENARIOS,
  scenarioObjectives,
  type DialogScenario,
} from '../app/ai_dialog_scenarios';

const activeScenarios: readonly DialogScenario[] = DIALOG_SCENARIOS.filter((s) => s.active);

describe('dialog scenario objectives contract', () => {
  it('каждый активный сценарий несёт СВОЙ список заданий, а не автонарезку', () => {
    const missing = activeScenarios
      .filter((s) => !s.objectives || s.objectives.length === 0)
      .map((s) => s.id);

    expect(missing).toEqual([]);
  });

  /**
   * Границы 4..7 не произвольны:
   *  • меньше 4 — владелец прямо назвал такую сцену слишком короткой
   *    («диалог заканчивается очень быстро»);
   *  • больше 7 — сцена не влезет в RECOMMENDED_EXCHANGES = 14 обменов
   *    (одно задание ≈ 2 реплики), и победы не случится: сервер объявит
   *    `stalled` раньше, чем человек закроет последнее задание.
   */
  it('заданий от 4 до 7 — и разное количество, а не одно число на всех', () => {
    const outOfRange = activeScenarios
      .map((s) => ({ id: s.id, count: scenarioObjectives(s).length }))
      .filter(({ count }) => count < 4 || count > 7);

    expect(outOfRange).toEqual([]);

    // Владелец просил «разное количество, зависит от ситуации» — проверяем, что
    // это действительно так, а не 4 везде.
    const distinctCounts = new Set(activeScenarios.map((s) => scenarioObjectives(s).length));
    expect(distinctCounts.size).toBeGreaterThan(1);
  });

  it('id заданий уникальны внутри сценария', () => {
    // id уходит на сервер в objectivesMet и сравнивается по строке: дубликат
    // означал бы, что две галочки закрываются одной репликой.
    const withDuplicates = activeScenarios
      .map((s) => {
        const ids = scenarioObjectives(s).map((o) => o.id);
        return { id: s.id, duplicated: ids.length !== new Set(ids).size };
      })
      .filter(({ duplicated }) => duplicated)
      .map(({ id }) => id);

    expect(withDuplicates).toEqual([]);
  });

  it('у каждого задания есть русская метка и английское описание для сервера', () => {
    const broken = activeScenarios.flatMap((s) =>
      scenarioObjectives(s)
        .filter((o) => !o.id.trim() || !o.labelRu.trim() || !(o.en ?? '').trim())
        .map((o) => `${s.id}:${o.id || '(нет id)'}`),
    );

    expect(broken).toEqual([]);
  });

  /**
   * Медицинская граница. Персонажи аптеки и клиники НЕ дают лечение и
   * дозировку — это же режет серверный `sanitizeRegulatedAdviceReply`. Если
   * поставить такую цель, человек будет обязан добиться ответа, которого
   * система никогда не даст: победа станет недостижимой.
   */
  it('в медицинских сценариях нет заданий про лекарство или дозировку', () => {
    const medical = activeScenarios.filter((s) => s.id === 'pharmacy' || s.id === 'doctor_visit');
    expect(medical.length).toBe(2);

    const forbidden = /(medicine|medication|dosage|dose|prescri|pill|treatment|diagnos)/i;
    const offending = medical.flatMap((s) =>
      scenarioObjectives(s)
        .filter((o) => forbidden.test(o.en ?? '') || forbidden.test(o.labelRu))
        .map((o) => `${s.id}:${o.id}`),
    );

    expect(offending).toEqual([]);
  });
});
