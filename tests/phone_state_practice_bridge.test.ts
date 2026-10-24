const randomUUID = jest.fn(() => "00000000-0000-4000-8000-000000000001");

jest.mock("expo-crypto", () => ({ randomUUID }));

import {
  commitPhoneStatePracticeReceipt,
  commitPhoneStatePracticeFact,
  commitPhoneStatePracticeRegister,
  configurePhoneStatePracticeBridge,
  mergePhoneStatePracticeFacts,
  readPhoneStatePracticeFactProjection,
  readOrImportPhoneStatePracticeRegister,
} from "../app/phone_state_practice_bridge";

describe("PhoneState practice bridge", () => {
  afterEach(() => configurePhoneStatePracticeBridge(null));

  test("uses stable fact identity and exact account-scoped payload", async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    configurePhoneStatePracticeBridge({
      scope: { stableUid: "account-a", accountGeneration: 4 },
      deviceId: "device-a",
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });

    await expect(
      commitPhoneStatePracticeFact("completed_task", "plan-1::task-1", {
        taskId: "task-1",
      }),
    ).resolves.toBe(true);
    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({
        stableUid: "account-a",
        accountGeneration: 4,
        domain: "practice",
        kind: "completed_task",
        entityId: "plan-1::task-1",
        payload: { value: { taskId: "task-1" } },
      }),
      { idempotencyKey: "practice:completed_task:plan-1::task-1" },
    );
  });

  test("distinguishes unavailable, stale, and available-empty fact projections", async () => {
    await expect(readPhoneStatePracticeFactProjection("attempt", "account-a"))
      .resolves.toEqual({ status: "unavailable" });

    configurePhoneStatePracticeBridge({
      scope: { stableUid: "account-b", accountGeneration: 8 },
      deviceId: "device-b",
      store: { commit: jest.fn(), readProjection: jest.fn(async () => null), replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    await expect(readPhoneStatePracticeFactProjection("attempt", "account-a"))
      .resolves.toEqual({ status: "stale_account" });
    await expect(readPhoneStatePracticeFactProjection("attempt", "account-b"))
      .resolves.toEqual({ status: "available", stableUid: "account-b", lineage: 8, facts: {} });
  });

  test("commits a receipt with caller-owned idempotency and rejects a changed lineage", async () => {
    const commit = jest.fn(async () => ({ duplicate: true }));
    const triggerSync = jest.fn();
    configurePhoneStatePracticeBridge({
      scope: { stableUid: "account-a", accountGeneration: 4 },
      deviceId: "device-a",
      store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
      triggerSync,
    });
    await expect(commitPhoneStatePracticeReceipt(
      "attempt", "revenue_quota:v1:receipt", { receipt: true }, "quota-key", "account-a", 4,
    )).resolves.toEqual({ status: "committed", duplicate: true });
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({
      kind: "attempt", entityId: "revenue_quota:v1:receipt", payload: { value: { receipt: true } },
    }), { idempotencyKey: "quota-key" });
    expect(triggerSync).toHaveBeenCalledTimes(1);

    await expect(commitPhoneStatePracticeReceipt(
      "attempt", "revenue_quota:v1:receipt-2", {}, "quota-key-2", "account-a", 5,
    )).resolves.toEqual({ status: "stale_account" });
    expect(commit).toHaveBeenCalledTimes(1);
  });

  test("register failure is silent so the compatibility mirror can continue", async () => {
    configurePhoneStatePracticeBridge({
      scope: { stableUid: "account-a", accountGeneration: 4 },
      deviceId: "device-a",
      store: {
        commit: jest.fn(async () => {
          throw new Error("disk_busy");
        }),
        readProjection: jest.fn(),
        replay: jest.fn(),
      } as never,
      triggerSync: jest.fn(),
    });

    await expect(
      commitPhoneStatePracticeRegister("plan_state", { planId: "gavan" }),
    ).resolves.toBe(false);
  });

  test("immutable fact read unions legacy and remote projection", async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    configurePhoneStatePracticeBridge({
      scope: { stableUid: "account-a", accountGeneration: 4 },
      deviceId: "device-a",
      store: {
        commit,
        readProjection: jest.fn(async () => ({
          state: {
            facts: {
              completed_task: { remote: { taskId: "remote" } },
              mistake: {},
              mastered: {},
              attempt: {},
            },
            registers: {},
            appliedOperationIds: [],
          },
        })),
        replay: jest.fn(),
      } as never,
      triggerSync: jest.fn(),
    });

    await expect(
      mergePhoneStatePracticeFacts("completed_task", {
        local: { taskId: "local" },
      }),
    ).resolves.toEqual({
      local: { taskId: "local" },
      remote: { taskId: "remote" },
    });
    expect(commit).toHaveBeenCalledTimes(1);
  });

  // жалобы 24.10 №4/8/16: журнал ошибок на каждом чтении перекоммичивал ВСЕ события — у давних учеников минуты загрузки
  test("merge commits only facts the projection does not hold yet and reads it once when nothing is new", async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    const readProjection = jest.fn(async () => ({
      state: {
        facts: { completed_task: {}, mistake: { a: { n: 1 }, b: { n: 2 } }, mastered: {}, attempt: {} },
        registers: {},
        appliedOperationIds: [],
      },
    }));
    configurePhoneStatePracticeBridge({
      scope: { stableUid: "account-a", accountGeneration: 4 },
      deviceId: "device-a",
      store: { commit, readProjection, replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });

    await expect(mergePhoneStatePracticeFacts("mistake", { a: { n: 1 }, b: { n: 2 } }))
      .resolves.toEqual({ a: { n: 1 }, b: { n: 2 } });
    expect(commit).not.toHaveBeenCalled();
    expect(readProjection).toHaveBeenCalledTimes(1);

    await mergePhoneStatePracticeFacts("mistake", { a: { n: 1 }, c: { n: 3 } });
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ entityId: "c" }), { idempotencyKey: "practice:mistake:c" });
  });

  // сторож роста (координатор 24.10): длинный журнал не должен давать N коммитов на каждое чтение — только новые факты
  test("merge cost grows with new facts, not with journal length", async () => {
    const held: Record<string, unknown> = {};
    for (let i = 0; i < 500; i += 1) held[`m${i}`] = { i };
    const commit = jest.fn(async () => ({ duplicate: false }));
    const readProjection = jest.fn(async () => ({
      state: { facts: { completed_task: {}, mistake: held, mastered: {}, attempt: {} }, registers: {}, appliedOperationIds: [] },
    }));
    configurePhoneStatePracticeBridge({
      scope: { stableUid: "account-a", accountGeneration: 4 },
      deviceId: "device-a",
      store: { commit, readProjection, replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });
    const local: Record<string, unknown> = { ...held, fresh1: { i: -1 }, fresh2: { i: -2 } };
    for (let read = 0; read < 3; read += 1) await mergePhoneStatePracticeFacts("mistake", local);
    // 3 чтения × 2 новых факта (мок не запоминает коммиты) — а не 3 × 502
    expect(commit).toHaveBeenCalledTimes(6);
  });

  test("register opening import is stable and does not overwrite an existing projection", async () => {
    const commit = jest.fn(async () => ({ duplicate: false }));
    const readProjection = jest.fn(async () => ({
      state: {
        facts: { completed_task: {}, mistake: {}, mastered: {}, attempt: {} },
        registers: {
          plan_state: {
            value: { planId: "remote" },
            clock: { deviceId: "b", counter: 9 },
          },
        },
        appliedOperationIds: [],
      },
    }));
    configurePhoneStatePracticeBridge({
      scope: { stableUid: "account-a", accountGeneration: 4 },
      deviceId: "device-a",
      store: { commit, readProjection, replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });

    await expect(
      readOrImportPhoneStatePracticeRegister("plan_state", {
        planId: "legacy",
      }),
    ).resolves.toEqual({ planId: "remote" });
    expect(commit).not.toHaveBeenCalled();
  });

  test("does not turn an empty pre-restore read into a durable null register", async () => {
    let register:
      | { value: unknown; clock: { deviceId: string; counter: number } }
      | undefined;
    const commit = jest.fn(
      async (operation: { payload: { value: unknown } }) => {
        register = {
          value: operation.payload.value,
          clock: { deviceId: "device-a", counter: 1 },
        };
        return { duplicate: false };
      },
    );
    const readProjection = jest.fn(async () => ({
      state: {
        facts: { completed_task: {}, mistake: {}, mastered: {}, attempt: {} },
        registers: register ? { personal_plan_state: register } : {},
        appliedOperationIds: [],
      },
    }));
    configurePhoneStatePracticeBridge({
      scope: { stableUid: "account-a", accountGeneration: 4 },
      deviceId: "device-a",
      store: { commit, readProjection, replay: jest.fn() } as never,
      triggerSync: jest.fn(),
    });

    await expect(
      readOrImportPhoneStatePracticeRegister("personal_plan_state", null),
    ).resolves.toBeNull();
    expect(commit).not.toHaveBeenCalled();

    const restored = { planId: "gavan", status: "active" };
    await expect(
      readOrImportPhoneStatePracticeRegister("personal_plan_state", restored),
    ).resolves.toEqual(restored);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  test("repairs a previously persisted null when cloud restore supplies the plan", async () => {
    let register: {
      value: unknown;
      clock: { deviceId: string; counter: number };
    } = {
      value: null,
      clock: { deviceId: "device-a", counter: 1 },
    };
    const commit = jest.fn(
      async (operation: { payload: { value: unknown } }) => {
        register = {
          value: operation.payload.value,
          clock: { deviceId: "device-a", counter: 2 },
        };
        return { duplicate: false };
      },
    );
    configurePhoneStatePracticeBridge({
      scope: { stableUid: "account-a", accountGeneration: 4 },
      deviceId: "device-a",
      store: {
        commit,
        readProjection: jest.fn(async () => ({
          state: {
            facts: {
              completed_task: {},
              mistake: {},
              mastered: {},
              attempt: {},
            },
            registers: { personal_plan_state: register },
            appliedOperationIds: [],
          },
        })),
        replay: jest.fn(),
      } as never,
      triggerSync: jest.fn(),
    });

    const restored = { planId: "gavan", status: "active" };
    await expect(
      readOrImportPhoneStatePracticeRegister("personal_plan_state", restored),
    ).resolves.toEqual(restored);
    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { field: "personal_plan_state", value: restored },
      }),
      {
        idempotencyKey:
          "practice:opening_import_non_null_v2:personal_plan_state",
      },
    );
  });
});
