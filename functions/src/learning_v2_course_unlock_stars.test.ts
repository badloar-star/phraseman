import { createFirestoreLearningV2CourseUnlockStore } from "./learning_v2_course_unlock";
import { WALLET_SUBUNITS_PER_STAR } from "../../modules/learning-v2/contracts/wallet";
import { STAR_OPERATIONS_COLLECTION } from "./stars_ledger";

/**
 * Списание звёзд за открытие занятия — проводка в единый журнал.
 * Дизайн — docs/superpowers/specs/2026-08-23-learning-v2-unified-stars-design.md
 *
 * Владелец 2026-08-23: звёзды Арены, турниров и Learning V2 — одна валюта.
 * Начисление уже проводится (required_session_completion_callable), здесь —
 * вторая половина: трата.
 */

type Doc = { id: string; path: string; parentId?: string };

/**
 * Фейковый Firestore ровно той формы, что нужна store и журналу.
 * Считает чтения и записи — Firebase-экономию проверяем числом, а не на глаз.
 */
function makeDb(seed: {
  readonly stars?: Record<string, unknown>;
  readonly existingUnlockIds?: readonly string[];
  readonly existingOpIds?: readonly string[];
}) {
  const existingUnlocks = new Set(seed.existingUnlockIds ?? []);
  const existingOps = new Set(seed.existingOpIds ?? []);
  const reads: string[] = [];
  const creates: Array<{ path: string; data: any }> = [];
  const sets: Array<{ path: string; data: any }> = [];

  const makeDoc = (path: string, id: string): any => ({
    id,
    path,
    collection: (name: string) => ({
      doc: (childId: string) => makeDoc(`${path}/${name}/${childId}`, childId),
    }),
  });
  const db: any = {
    collection: (name: string) => ({
      doc: (id: string) => makeDoc(`${name}/${id}`, id),
    }),
  };

  const transaction: any = {
    get: async (ref: Doc) => {
      reads.push(ref.path);
      if (ref.path.includes(`/${STAR_OPERATIONS_COLLECTION}/`)) {
        return { exists: existingOps.has(ref.id), data: () => ({ seq: 3 }) };
      }
      if (ref.path.includes("/v2_course_unlock_receipts/")) {
        return { exists: existingUnlocks.has(ref.id), data: () => ({ stored: true }) };
      }
      // users/{uid}
      return { exists: true, ref, data: () => ({ stars: seed.stars }) };
    },
    create: (ref: Doc, data: any) => creates.push({ path: ref.path, data }),
    set: (ref: Doc, data: any) => sets.push({ path: ref.path, data }),
  };
  db.runTransaction = async (fn: (tx: any) => Promise<any>) => fn(transaction);
  return { db, reads, creates, sets };
}

const receipt = (over: Partial<Record<string, unknown>> = {}) => ({
  schemaVersion: "learning-v2-protected-course-unlock-receipt.v1" as const,
  accountScopeHash: "a".repeat(64),
  unlockId: "unlock-c1-2",
  unlockFingerprint: "f".repeat(64),
  encoded: "{}",
  ...over,
});

const settledStars = (balance: number) => ({
  schemaVersion: "stars.v1",
  balance,
  earnedTotal: balance,
  grantedTotal: 0,
  spentTotal: 0,
  weekKey: "2026-W33",
  weekEarned: balance,
  prevWeekKey: "",
  prevWeekEarned: 0,
  seasonId: "",
  seasonEarned: 0,
  seq: 1,
  lastOpId: "seed:1",
  updatedAtMs: 1,
});

const starOpCreates = (creates: Array<{ path: string; data: any }>) =>
  creates.filter((c) => c.path.includes(`/${STAR_OPERATIONS_COLLECTION}/`));

describe("открытие занятия списывает звёзды в единый журнал", () => {
  it("списывает цену занятия с общего баланса", async () => {
    const { db, creates, sets } = makeDb({ stars: settledStars(100) });
    const store = createFirestoreLearningV2CourseUnlockStore(db);
    const result = await store.putIfAbsent({
      stableUid: "u1",
      receipt: receipt(),
      chargeSubunits: 50 * WALLET_SUBUNITS_PER_STAR,
    } as any);

    expect(result.status).toBe("created");
    const ops = starOpCreates(creates);
    expect(ops).toHaveLength(1);
    expect(ops[0].data.delta).toBe(-50);
    expect(ops[0].data.reason).toBe("learning_v2_unlock");
    // Баланс игрока обновлён одной записью.
    const userWrite = sets.find((s) => s.path === "users/u1");
    expect(userWrite?.data?.stars?.balance).toBe(50);
    expect(userWrite?.data?.stars?.spentTotal).toBe(50);
    // Заслуги не уменьшаются тратой.
    expect(userWrite?.data?.stars?.earnedTotal).toBe(100);
  });

  it("первое занятие бесплатно — ни одной звёздной записи", async () => {
    const { db, creates } = makeDb({ stars: settledStars(100) });
    const store = createFirestoreLearningV2CourseUnlockStore(db);
    await store.putIfAbsent({
      stableUid: "u1", receipt: receipt({ unlockId: "unlock-c1-1" }), chargeSubunits: 0,
    } as any);
    expect(starOpCreates(creates)).toHaveLength(0);
  });

  it("повторное открытие не списывает второй раз", async () => {
    // Защита от двойного тапа и от повторной доставки из очереди.
    const { db, creates, sets } = makeDb({
      stars: settledStars(100), existingUnlockIds: ["unlock-c1-2"],
    });
    const store = createFirestoreLearningV2CourseUnlockStore(db);
    const result = await store.putIfAbsent({
      stableUid: "u1", receipt: receipt(), chargeSubunits: 50 * WALLET_SUBUNITS_PER_STAR,
    } as any);

    expect(result.status).toBe("existing");
    expect(starOpCreates(creates)).toHaveLength(0);
    expect(sets.find((s) => s.path === "users/u1")).toBeUndefined();
  });

  it("дедуп журнала гасит списание, даже если расписка открытия пропала", async () => {
    // Разные слои защиты не должны зависеть друг от друга.
    const { db, creates, sets } = makeDb({
      stars: settledStars(100),
      existingOpIds: ["learning_v2_unlock:unlock-c1-2"],
    });
    const store = createFirestoreLearningV2CourseUnlockStore(db);
    await store.putIfAbsent({
      stableUid: "u1", receipt: receipt(), chargeSubunits: 50 * WALLET_SUBUNITS_PER_STAR,
    } as any);
    expect(starOpCreates(creates)).toHaveLength(0);
    expect(sets.find((s) => s.path === "users/u1")).toBeUndefined();
  });

  it("не пускает баланс в минус, но занятие всё равно открывает", async () => {
    // D-C: учёбу не отбираем. Занятие открыто, долг гасится начислениями.
    const { db, creates } = makeDb({ stars: settledStars(10) });
    const store = createFirestoreLearningV2CourseUnlockStore(db);
    const result = await store.putIfAbsent({
      stableUid: "u1", receipt: receipt(), chargeSubunits: 65 * WALLET_SUBUNITS_PER_STAR,
    } as any);

    expect(result.status).toBe("created");
    const unlockWrite = creates.find((c) => c.path.includes("/v2_course_unlock_receipts/"));
    expect(unlockWrite).toBeDefined();
    expect(starOpCreates(creates)).toHaveLength(0);
  });

  it("читает документ игрока только когда есть что списывать", async () => {
    // Firebase-экономия: бесплатное занятие не должно стоить лишнего чтения.
    const free = makeDb({ stars: settledStars(100) });
    await createFirestoreLearningV2CourseUnlockStore(free.db).putIfAbsent({
      stableUid: "u1", receipt: receipt({ unlockId: "unlock-c1-1" }), chargeSubunits: 0,
    } as any);
    expect(free.reads.some((p) => p === "users/u1")).toBe(false);

    const paid = makeDb({ stars: settledStars(100) });
    await createFirestoreLearningV2CourseUnlockStore(paid.db).putIfAbsent({
      stableUid: "u1", receipt: receipt(), chargeSubunits: 50 * WALLET_SUBUNITS_PER_STAR,
    } as any);
    expect(paid.reads.filter((p) => p === "users/u1")).toHaveLength(1);
  });

  it("падает на дробной цене вместо молчаливого округления", async () => {
    const { db } = makeDb({ stars: settledStars(100) });
    const store = createFirestoreLearningV2CourseUnlockStore(db);
    await expect(store.putIfAbsent({
      stableUid: "u1", receipt: receipt(), chargeSubunits: WALLET_SUBUNITS_PER_STAR + 1,
    } as any)).rejects.toThrow();
  });
});
