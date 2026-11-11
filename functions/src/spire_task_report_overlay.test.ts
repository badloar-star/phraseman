/**
 * Пик: жалоба на задание новой механики (владелец 11.11.2026, «Да, доделай»).
 *
 * зачем: задание новой механики стоит не в пакете недели, а в накладке рядом с ним. Прежняя сверка искала номер
 * задания в пакете и отклоняла такую жалобу; пул при этом ещё не прошёл независимую проверку — жалоба игрока здесь
 * главный способ узнать об ошибке. Сторож держит: жалоба принимается только на задание, которое накладка ЭТОГО пакета
 * ставит в ЭТОТ слот, и номер нового задания проходит строгий разбор списка снятых заданий.
 */
import { spirePackHash } from './spire_pack_contract';
import {
  parseSpireTaskFlagsDocStrict,
  spireTaskFlagAdd,
  spireTaskIdBelongsToTarget,
} from './spire_task_flag_contract';
import { spireTaskIncidentId } from './spire_task_incident_contract';
import {
  isSpireExpandedTaskClaim,
  parseSpireTaskReportClaim,
  verifySpireTaskClaimAgainstOverlay,
  verifySpireTaskClaimAgainstPack,
} from './spire_task_report_contract';

const EXPANDED_ID = 'peak-expanded-es-b003-word_repair-05';

const packBody = {
  schema: 'spire-pack-v1' as const,
  weekId: '2026-W46',
  lang: 'es' as const,
  tier: 2,
  floors: [{
    floor: 4,
    steps: [{
      step: 2,
      sets: [
        { tasks: [{ taskId: 'arena-es-fill_gap-1-0000', mode: 'fill_gap', kind: 'choice', difficulty: 1, payload: {} }] },
        { tasks: [
          { taskId: 'arena-es-fill_gap-1-0001', mode: 'fill_gap', kind: 'choice', difficulty: 1, payload: {} },
          { taskId: 'arena-es-fill_gap-1-0002', mode: 'fill_gap', kind: 'choice', difficulty: 1, payload: {} },
        ] },
      ],
    }],
  }],
};
const packHash = spirePackHash(packBody);
const pack = { ...packBody, packHash };

const overlay = {
  schema: 'spire-expanded-overlay-v1',
  weekId: '2026-W46',
  lang: 'es',
  tier: 2,
  basePackHash: packHash,
  tasks: { [EXPANDED_ID]: { taskId: EXPANDED_ID, mode: 'word_repair', kind: 'expanded', difficulty: 2, payload: {} } },
  slots: [[4, 2, 1, 1, EXPANDED_ID]],
};

const claim = parseSpireTaskReportClaim({
  taskId: EXPANDED_ID, studyTarget: 'es', weekId: '2026-W46', tier: 2, packHash,
  floor: 4, step: 2, setIndex: 1, taskIndex: 1, reason: 'Подходят два варианта',
});

describe('Пик: жалоба на задание новой механики', () => {
  it('номер нового задания принадлежит своему языку и только ему', () => {
    expect(spireTaskIdBelongsToTarget(EXPANDED_ID, 'es')).toBe(true);
    expect(spireTaskIdBelongsToTarget(EXPANDED_ID, 'de')).toBe(false);
    expect(spireTaskIdBelongsToTarget('peak-expanded-en-b001-context_choice-01', 'en')).toBe(true);
    expect(spireTaskIdBelongsToTarget('peak-expanded-', 'es')).toBe(false);
    expect(spireTaskIdBelongsToTarget('something-es-1', 'es')).toBe(false);
    // прежние номера работают как раньше
    expect(spireTaskIdBelongsToTarget('arena-es-fill_gap-1-0000', 'es')).toBe(true);
    expect(spireTaskIdBelongsToTarget('spire-en-listen-0001', 'en')).toBe(true);
    expect(spireTaskIncidentId('es', EXPANDED_ID)).toBe(`es__${EXPANDED_ID}`);
  });

  it('жалоба распознаётся как жалоба на новую механику и сверяется с накладкой', () => {
    expect(isSpireExpandedTaskClaim(claim)).toBe(true);
    expect(verifySpireTaskClaimAgainstOverlay(claim, pack, packHash, overlay)).toMatchObject({
      taskId: EXPANDED_ID, mode: 'word_repair', kind: 'expanded', difficulty: 2,
    });
    // в самом пакете такого задания нет — прежняя сверка его справедливо не находит
    expect(() => verifySpireTaskClaimAgainstPack(claim, pack, packHash)).toThrow('spire_task_report_pack_mismatch');
  });

  it('отказ, если накладка от другого пакета, слот другой или задания в ней нет', () => {
    const cases: [string, unknown, unknown, string][] = [
      ['накладка другого пакета', pack, { ...overlay, basePackHash: 'sp1_other_pack_hash' }, packHash],
      ['другая неделя накладки', pack, { ...overlay, weekId: '2026-W45' }, packHash],
      ['другой язык накладки', pack, { ...overlay, lang: 'de' }, packHash],
      ['слот не тот', pack, { ...overlay, slots: [[4, 2, 0, 0, EXPANDED_ID]] }, packHash],
      ['задания нет в таблице', pack, { ...overlay, tasks: {} }, packHash],
      ['задание не новой механики', pack, { ...overlay, tasks: { [EXPANDED_ID]: { taskId: EXPANDED_ID, kind: 'choice' } } }, packHash],
      ['накладки нет', pack, null, packHash],
      ['отпечаток в хранилище другой', pack, overlay, 'sp1_other_pack_hash'],
      ['пакет подменён', { ...pack, tier: 3 }, overlay, packHash],
    ];
    for (const [name, rawPack, rawOverlay, published] of cases) {
      expect([name, (() => {
        try { verifySpireTaskClaimAgainstOverlay(claim, rawPack, published, rawOverlay); return 'accepted'; } catch (error) { return (error as Error).message; }
      })()]).toEqual([name, 'spire_task_report_pack_mismatch']);
    }
    // слот, которого в пакете нет вовсе
    const farClaim = { ...claim, taskIndex: 7 };
    expect(() => verifySpireTaskClaimAgainstOverlay(farClaim, pack, packHash, { ...overlay, slots: [[4, 2, 1, 7, EXPANDED_ID]] }))
      .toThrow('spire_task_report_pack_mismatch');
    // обычное задание этой дорогой не проходит
    const plain = { ...claim, taskId: 'arena-es-fill_gap-1-0002' };
    expect(() => verifySpireTaskClaimAgainstOverlay(plain, pack, packHash, overlay)).toThrow('spire_task_report_pack_mismatch');
  });

  it('снятое новое задание проходит строгий разбор списка снятых — сборка пакета языка от него не падает', () => {
    const empty = parseSpireTaskFlagsDocStrict(null, 'es');
    const next = spireTaskFlagAdd(empty, { taskId: EXPANDED_ID, reason: 'Жалоба игрока', flaggedByUid: 'server:client-report', flaggedAtMs: 1_800_000_000_000 });
    const stored = JSON.parse(JSON.stringify(next)) as unknown;
    expect(Object.keys(parseSpireTaskFlagsDocStrict(stored, 'es').flagged)).toEqual([EXPANDED_ID]);
  });
});
