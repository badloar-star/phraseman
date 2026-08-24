const randomUUID = jest.fn(() => "00000000-0000-4000-8000-000000000001");

jest.mock("expo-crypto", () => ({ randomUUID }));

import {
  commitPhoneStatePracticeFact,
  commitPhoneStatePracticeRegister,
  configurePhoneStatePracticeBridge,
  mergePhoneStatePracticeFacts,
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
