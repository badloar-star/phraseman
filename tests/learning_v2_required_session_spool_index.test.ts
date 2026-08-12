import {
  createRequiredSessionSpoolIndex,
} from "../modules/learning-v2/progress/required_session_spool_index";
import { canonicalJsonV1, hashCanonicalBody } from
  "../modules/learning-v2/policies/decision_registry";
import type { ProgressStorage } from "../modules/learning-v2/progress/progress_store";

const scope = {
  stableId: "stable-spool-index-user",
  accountScopeHash: "a".repeat(64),
  seasonId: "learning-v2",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  generation: 0,
};

const backingStorage = () => {
  const values = new Map<string, string>();
  const storage: ProgressStorage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
    getAllKeys: jest.fn(async () => [...values.keys()]),
  };
  return { values, storage };
};

describe("required-session bounded spool index", () => {
  test("pages an unlimited logical queue while every read exposes at most 64 ids", async () => {
    const backing = backingStorage();
    const index = createRequiredSessionSpoolIndex(backing.storage, () => true);
    for (let ordinal = 0; ordinal < 130; ordinal += 1) {
      await index.append(scope, `mutation-${String(ordinal).padStart(4, "0")}`);
    }
    expect(await index.count(scope)).toBe(130);
    expect(await index.peek(scope)).toHaveLength(64);
    expect(backing.storage.getAllKeys).not.toHaveBeenCalled();

    const observed: string[] = [];
    while (await index.count(scope) > 0) {
      const page = await index.peek(scope);
      expect(page.length).toBeGreaterThan(0);
      expect(page.length).toBeLessThanOrEqual(64);
      for (const mutationId of page) {
        observed.push(mutationId);
        await index.shift(scope, mutationId);
      }
    }
    expect(observed).toEqual(Array.from({ length: 130 }, (_, ordinal) =>
      `mutation-${String(ordinal).padStart(4, "0")}`));
    expect(await index.peek(scope)).toEqual([]);
    expect(backing.storage.getAllKeys).not.toHaveBeenCalled();
  });

  test.each([1, 2, 3, 4, 5])(
    "repairs append after durable write cut %i",
    async (cutAfter) => {
      const backing = backingStorage();
      let writes = 0;
      const cut = () => {
        writes += 1;
        if (writes === cutAfter) throw new Error("simulated_process_cut");
      };
      const storage: ProgressStorage = {
        getItem: backing.storage.getItem,
        setItem: async (key, value) => {
          await backing.storage.setItem(key, value);
          cut();
        },
        removeItem: async (key) => {
          await backing.storage.removeItem!(key);
          cut();
        },
      };
      await expect(createRequiredSessionSpoolIndex(storage, () => true)
        .append(scope, "mutation-crash-append")).rejects.toThrow("simulated_process_cut");

      const recovered = createRequiredSessionSpoolIndex(backing.storage, () => true);
      await recovered.recover(scope);
      expect(await recovered.count(scope)).toBe(1);
      expect(await recovered.peek(scope)).toEqual(["mutation-crash-append"]);
      await recovered.append(scope, "mutation-crash-append");
      expect(await recovered.count(scope)).toBe(1);
    },
  );

  test.each([1, 2, 3, 4, 5])(
    "repairs shift after durable write cut %i",
    async (cutAfter) => {
      const backing = backingStorage();
      await createRequiredSessionSpoolIndex(backing.storage, () => true)
        .append(scope, "mutation-crash-shift");
      let writes = 0;
      const cut = () => {
        writes += 1;
        if (writes === cutAfter) throw new Error("simulated_process_cut");
      };
      const storage: ProgressStorage = {
        getItem: backing.storage.getItem,
        setItem: async (key, value) => {
          await backing.storage.setItem(key, value);
          cut();
        },
        removeItem: async (key) => {
          await backing.storage.removeItem!(key);
          cut();
        },
      };
      await expect(createRequiredSessionSpoolIndex(storage, () => true)
        .shift(scope, "mutation-crash-shift")).rejects.toThrow("simulated_process_cut");

      const recovered = createRequiredSessionSpoolIndex(backing.storage, () => true);
      await recovered.recover(scope);
      expect(await recovered.count(scope)).toBe(0);
      expect(await recovered.peek(scope)).toEqual([]);
    },
  );

  test("fails closed on a silently dropped transaction write", async () => {
    const backing = backingStorage();
    const storage: ProgressStorage = {
      getItem: backing.storage.getItem,
      setItem: async (key, value) => {
        if (key.endsWith(":transaction")) return;
        await backing.storage.setItem(key, value);
      },
      removeItem: backing.storage.removeItem,
    };
    await expect(createRequiredSessionSpoolIndex(storage, () => true)
      .append(scope, "mutation-silent-drop"))
      .rejects.toThrow("required_session_spool_index_indeterminate");
    expect(backing.values.size).toBe(0);
  });

  test("rejects out-of-order removal and stale generation without mutation", async () => {
    const backing = backingStorage();
    const index = createRequiredSessionSpoolIndex(backing.storage, () => true);
    await index.append(scope, "mutation-first");
    await index.append(scope, "mutation-second");
    await expect(index.shift(scope, "mutation-second"))
      .rejects.toThrow("required_session_spool_index_order_mismatch");
    expect(await index.count(scope)).toBe(2);

    const stale = createRequiredSessionSpoolIndex(backing.storage, () => false);
    await expect(stale.append(scope, "mutation-stale"))
      .rejects.toThrow("progress_generation_stale");
    expect(await index.count(scope)).toBe(2);
  });

  test("a self-rehashed transaction cannot target an unrelated storage key", async () => {
    const backing = backingStorage();
    let firstWrite = true;
    const storage: ProgressStorage = {
      getItem: backing.storage.getItem,
      setItem: async (key, value) => {
        await backing.storage.setItem(key, value);
        if (firstWrite) {
          firstWrite = false;
          throw new Error("simulated_process_cut");
        }
      },
      removeItem: backing.storage.removeItem,
    };
    await expect(createRequiredSessionSpoolIndex(storage, () => true)
      .append(scope, "mutation-hostile-transaction")).rejects.toThrow("simulated_process_cut");
    const transactionKey = [...backing.values.keys()].find((key) => key.endsWith(":transaction"));
    expect(transactionKey).toBeDefined();
    const parsed = JSON.parse(backing.values.get(transactionKey!)!) as Record<string, unknown>;
    const { transactionFingerprint: _old, ...body } = parsed;
    const hostileBody = { ...body, pageKey: "unrelated_device_preference" };
    backing.values.set(transactionKey!, canonicalJsonV1({
      ...hostileBody,
      transactionFingerprint: hashCanonicalBody(hostileBody),
    }));

    await expect(createRequiredSessionSpoolIndex(backing.storage, () => true).recover(scope))
      .rejects.toThrow("required_session_spool_index_corrupt");
    expect(backing.values.has("unrelated_device_preference")).toBe(false);
  });

  test("an orphan member cannot masquerade as an idempotently indexed mutation", async () => {
    const backing = backingStorage();
    const index = createRequiredSessionSpoolIndex(backing.storage, () => true);
    await index.append(scope, "mutation-orphan-member");
    const pageKey = [...backing.values.keys()].find((key) => key.includes(":page:"));
    expect(pageKey).toBeDefined();
    backing.values.delete(pageKey!);

    await expect(index.append(scope, "mutation-orphan-member"))
      .rejects.toThrow("required_session_spool_index_corrupt");
    await expect(index.has(scope, "mutation-orphan-member"))
      .rejects.toThrow("required_session_spool_index_corrupt");
  });

  test("peek rejects a page whose bounded member closure is incomplete", async () => {
    const backing = backingStorage();
    const index = createRequiredSessionSpoolIndex(backing.storage, () => true);
    await index.append(scope, "mutation-member-first");
    await index.append(scope, "mutation-member-second");
    const secondMemberKey = [...backing.values.keys()].find((key) =>
      key.includes(":member:") && key.endsWith("mutation-member-second"));
    expect(secondMemberKey).toBeDefined();
    backing.values.delete(secondMemberKey!);

    await expect(index.peek(scope)).rejects.toThrow("required_session_spool_index_corrupt");
  });

  test("rejects a self-rehashed head/page count mismatch before journaling a shift", async () => {
    const backing = backingStorage();
    const index = createRequiredSessionSpoolIndex(backing.storage, () => true);
    await index.append(scope, "mutation-head-count");
    const headStorageKey = [...backing.values.keys()].find((key) => key.endsWith(":head"));
    expect(headStorageKey).toBeDefined();
    const parsed = JSON.parse(backing.values.get(headStorageKey!)!) as Record<string, unknown>;
    const { indexFingerprint: _old, ...originalBody } = parsed;
    const hostileBody = { ...originalBody, pendingCount: 2 };
    backing.values.set(headStorageKey!, canonicalJsonV1({
      ...hostileBody,
      indexFingerprint: hashCanonicalBody(hostileBody),
    }));

    await expect(index.shift(scope, "mutation-head-count"))
      .rejects.toThrow("required_session_spool_index_corrupt");
    expect([...backing.values.keys()].some((key) => key.endsWith(":transaction"))).toBe(false);
  });
});
