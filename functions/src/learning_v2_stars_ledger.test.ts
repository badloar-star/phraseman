import {
  STAR_OP_CLASS,
  STAR_OP_MAX_BACKDATE_MS,
  commitStarOperations,
  prepareStarOperations,
  type StarLedgerCtx,
  type StarOpRequest,
  type StarsState,
} from './stars_ledger';
import { WALLET_SUBUNITS_PER_STAR } from '../../modules/learning-v2/contracts/wallet';
import { requiredCourseUnlockPriceStars } from '../../modules/learning-v2/contracts/course_unlock';

/**
 * Learning V2 в едином журнале звёзд.
 * Дизайн — docs/superpowers/specs/2026-08-23-learning-v2-unified-stars-design.md
 *
 * Решения владельца, которые эти тесты сторожат:
 *  D-A  звезда — одна валюта на Арену, турниры и Learning V2 (жемчужины отдельно);
 *  D-B  клиент авторитетен, сервер — точка синхронизации между разделами;
 *  D-C  занятие открывается сразу, списание догоняет фоном;
 *  D-D  миграции нет — релиза со звёздами не было, у всех баланс 0.
 *
 * RED: причин learning_v2_* в журнале ещё нет, поэтому тесты падают до правки
 * stars_ledger.ts. Это ожидаемо и есть смысл шага 1 ТЗ.
 */

type FakeWorld = {
  tx: any;
  userSnap: any;
  reads: { count: number };
  writes: { sets: any[]; creates: any[] };
};

function makeWorld(stars?: Partial<StarsState>, existingReceiptIds: string[] = []): FakeWorld {
  const reads = { count: 0 };
  const writes: FakeWorld['writes'] = { sets: [], creates: [] };
  const receipts = new Set(existingReceiptIds);
  const userRef: any = {
    id: 'u1',
    path: 'users/u1',
    collection: () => ({ doc: (id: string) => ({ id, path: `users/u1/star_operations/${id}` }) }),
  };
  const userSnap: any = { ref: userRef, data: () => (stars ? { stars } : {}) };
  const tx: any = {
    get: async (ref: any) => { reads.count += 1; return { exists: receipts.has(ref.id), data: () => ({ seq: 7 }) }; },
    set: (ref: any, data: any) => writes.sets.push({ ref, data }),
    create: (ref: any, data: any) => writes.creates.push({ ref, data }),
  };
  return { tx, userSnap, reads, writes };
}

const NOW = 1_700_000_000_000;
const ctx = (over: Partial<StarLedgerCtx> = {}): StarLedgerCtx => ({
  nowMs: NOW,
  activeSeasonId: 'arena-2026-08-01',
  weekKeyNow: '2026-W33',
  authUid: 'auth1',
  deviceId: 'dev1',
  ...over,
});

const settled = (balance: number, over: Partial<StarsState> = {}): Partial<StarsState> => ({
  balance, earnedTotal: balance, grantedTotal: 0, spentTotal: 0,
  weekKey: '2026-W33', weekEarned: balance,
  seasonId: 'arena-2026-08-01', seasonEarned: balance, seq: 1, ...over,
});

/** Начисление за завершённое занятие. sourceId = courseSessionId. */
const earnOp = (sessionId: string, delta = 12): StarOpRequest => ({
  opId: `learning_v2:${sessionId}`,
  delta,
  reason: 'learning_v2_session' as StarOpRequest['reason'],
  sourceKind: 'learning_v2',
  sourceId: sessionId,
  ruleVersion: 1,
});

/**
 * Списание за открытие занятия.
 * зачем: двоеточие запрещено регексом opId, поэтому курс и порядковый номер
 * склеиваются через '_' — иначе ключ дедупа не пройдёт валидацию и списание
 * молча отвалится (D-C: занятие уже открыто, а деньги бы не списались).
 */
const unlockOp = (courseId: string, ordinal: number, priceStars: number): StarOpRequest => ({
  opId: `learning_v2_unlock:${courseId}_${ordinal}`,
  delta: -priceStars,
  reason: 'learning_v2_unlock' as StarOpRequest['reason'],
  sourceKind: 'learning_v2_unlock',
  sourceId: `${courseId}_${ordinal}`,
  ruleVersion: 1,
});

async function run(
  stars: Partial<StarsState> | undefined,
  ops: StarOpRequest[],
  c: StarLedgerCtx = ctx(),
  existing: string[] = [],
) {
  const world = makeWorld(stars, existing);
  const prepared = await prepareStarOperations(world.tx, {} as any, 'u1', world.userSnap, ops, c);
  const result = commitStarOperations(world.tx, prepared);
  return { result, world };
}

describe('Learning V2 — единый журнал звёзд', () => {
  describe('классы операций', () => {
    it('занятие — это заработок, а не подарок', () => {
      // earnedTotal открывает награды сезонного пропуска. Учёба обязана их
      // открывать, иначе Learning V2 не даёт прогресса по сезону.
      expect(STAR_OP_CLASS['learning_v2_session' as keyof typeof STAR_OP_CLASS]).toBe('earn');
    });

    it('открытие занятия — это трата', () => {
      expect(STAR_OP_CLASS['learning_v2_unlock' as keyof typeof STAR_OP_CLASS]).toBe('spend');
    });
  });

  describe('начисление за занятие', () => {
    it('начисляет и попадает в недельный и сезонный счётчики', async () => {
      const { result, world } = await run(undefined, [earnOp('s1')]);
      expect(result.balance).toBe(12);
      expect(result.earnedTotal).toBe(12);
      expect(result.grantedTotal).toBe(0);
      expect(result.weekEarned).toBe(12);
      expect(result.seasonEarned).toBe(12);
      expect(world.writes.creates).toHaveLength(1);
    });

    it('повторная отправка того же занятия из outbox бесплатна', async () => {
      // Телефон авторитетен (D-B) и шлёт из очереди повторно при потере сети.
      // Дедуп по opId обязан вернуть already_applied и не записать ничего.
      const { result, world } = await run(
        settled(12), [earnOp('s1')], ctx(), ['learning_v2:s1'],
      );
      expect(result.balance).toBe(12);
      expect(result.outcomes[0].status).toBe('already_applied');
      expect(result.outcomes[0].appliedDelta).toBe(0);
      expect(world.writes.sets.length + world.writes.creates.length).toBe(0);
    });

    it('копится вместе со звёздами Арены — одна валюта', async () => {
      // D-A: разделов много, баланс один.
      const { result } = await run(settled(24), [earnOp('s1')]);
      expect(result.balance).toBe(36);
      expect(result.earnedTotal).toBe(36);
    });

    it('пакет из нескольких занятий применяется без затирания', async () => {
      const { result, world } = await run(undefined, [earnOp('s1'), earnOp('s2', 8)]);
      expect(result.balance).toBe(20);
      expect(world.writes.creates).toHaveLength(2);
      expect(world.writes.creates.map((r: any) => r.data.seq)).toEqual([1, 2]);
    });
  });

  describe('ключ дедупа', () => {
    it('отвергает courseSessionId с двоеточием', async () => {
      // Двоеточие разделяет sourceKind и sourceId — внутри id оно ломает ключ.
      const { result, world } = await run(undefined, [earnOp('course:1')]);
      expect(result.outcomes[0].status).toBe('rejected');
      expect(result.outcomes[0].errorCode).toBe('invalid_op_id');
      expect(world.writes.creates).toHaveLength(0);
    });

    it('отвергает courseSessionId длиннее 96 символов', async () => {
      const { result } = await run(undefined, [earnOp('s'.repeat(97))]);
      expect(result.outcomes[0].status).toBe('rejected');
      expect(result.outcomes[0].errorCode).toBe('invalid_op_id');
    });

    it('принимает ключ открытия, склеенный через подчёркивание', async () => {
      const { result } = await run(settled(100), [unlockOp('course.en.a1', 3, 55)]);
      expect(result.outcomes[0].status).toBe('applied');
    });
  });

  describe('списание за открытие занятия', () => {
    it('лестница цен 0/45/50/55/60/65 и далее всегда 65', () => {
      expect(requiredCourseUnlockPriceStars(0)).toBe(0);
      expect(requiredCourseUnlockPriceStars(1)).toBe(45);
      expect(requiredCourseUnlockPriceStars(2)).toBe(50);
      expect(requiredCourseUnlockPriceStars(3)).toBe(55);
      expect(requiredCourseUnlockPriceStars(4)).toBe(60);
      expect(requiredCourseUnlockPriceStars(5)).toBe(65);
      expect(requiredCourseUnlockPriceStars(6)).toBe(65);
      expect(requiredCourseUnlockPriceStars(383)).toBe(65);
    });

    it('списывает цену и не трогает заработанное за всё время', async () => {
      // Трата уменьшает баланс, но earnedTotal — витрина заслуг, она не падает.
      const { result } = await run(settled(100), [unlockOp('c1', 1, 45)]);
      expect(result.balance).toBe(55);
      expect(result.spentTotal).toBe(45);
      expect(result.earnedTotal).toBe(100);
    });

    it('не пускает баланс в минус при нехватке звёзд', async () => {
      const { result, world } = await run(settled(10), [unlockOp('c1', 1, 45)]);
      expect(result.outcomes[0].status).toBe('rejected');
      expect(result.outcomes[0].errorCode).toBe('insufficient_stars');
      expect(result.balance).toBe(10);
      expect(world.writes.creates).toHaveLength(0);
    });

    it('повторное открытие того же занятия списывает один раз', async () => {
      // Защита от двойного тапа: второй тап приходит с тем же ключом.
      const { result, world } = await run(
        settled(100), [unlockOp('c1', 1, 45)], ctx(), ['learning_v2_unlock:c1_1'],
      );
      expect(result.outcomes[0].status).toBe('already_applied');
      expect(result.balance).toBe(100);
      expect(world.writes.sets.length + world.writes.creates.length).toBe(0);
    });

    it('заработок и открытие в одной отправке считаются вместе', async () => {
      // Телефон копит очередь оффлайн и отдаёт её пачкой (D-C).
      const { result } = await run(settled(50), [earnOp('s1', 12), unlockOp('c1', 2, 50)]);
      expect(result.balance).toBe(12);
      expect(result.earnedTotal).toBe(62);
      expect(result.spentTotal).toBe(50);
    });
  });

  describe('оффлайн-хвост', () => {
    it('занятие, закрытое три дня назад, попадает в свою неделю', async () => {
      // Иначе лига посчитает заработок не в той неделе.
      const threeDays = 3 * 24 * 60 * 60 * 1_000;
      const { world } = await run(
        undefined,
        [{ ...earnOp('s1'), earnedAtMs: NOW - threeDays }],
        ctx({ weekKeyForMs: () => '2026-W32' }),
      );
      expect(world.writes.creates[0].data.earnedAtMs).toBe(NOW - threeDays);
    });

    it('окно датирования задним числом покрывает восемь суток', () => {
      // Очередь оффлайн живёт столько же, сколько журнал готов принять.
      expect(STAR_OP_MAX_BACKDATE_MS).toBe(8 * 24 * 60 * 60 * 1_000);
    });
  });

  describe('подъединицы кошелька', () => {
    it('звезда делится на подъединицы нацело — дробных звёзд не бывает', () => {
      // Остатка от деления не существует ни на одном пути: цены кратны звезде.
      expect(WALLET_SUBUNITS_PER_STAR).toBe(10_000);
      for (const price of [0, 45, 50, 55, 60, 65]) {
        expect((price * WALLET_SUBUNITS_PER_STAR) % WALLET_SUBUNITS_PER_STAR).toBe(0);
      }
    });
  });

  describe('инвариант журнала', () => {
    it('баланс сходится после заработка и траты', async () => {
      const { result } = await run(settled(100), [earnOp('s1', 20), unlockOp('c1', 1, 65)]);
      expect(result.earnedTotal + result.grantedTotal - result.spentTotal).toBe(result.balance);
    });
  });
});
