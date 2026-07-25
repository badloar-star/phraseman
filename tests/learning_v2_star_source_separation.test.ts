import {
  applyAccessStarDelta,
  applyBestPerformanceStars,
  type AccessStarDeltaProjection,
  type AccessStarSource,
} from "../modules/learning-v2/contracts/stars";

describe("Learning V2 star-source separation", () => {
  const bestInput = {
    previous: 1,
    candidate: 3,
    source: "performance" as const,
  };
  const accessInput = {
    previousTotal: 20,
    delta: 3,
    source: "optional_practice" as const,
    idempotencyKey: "account-1:quick-speak:attempt-1",
  };

  it("allows optional practice to add cumulative access without performance or mastery output", () => {
    const projection = applyAccessStarDelta({
      previousTotal: 20,
      delta: 3,
      source: "optional_practice",
      idempotencyKey: "account-1:quick-speak:attempt-1",
    });

    expect(projection).toEqual({
      nextTotal: 23,
      delta: 3,
      source: "optional_practice",
    });
    expect(projection).not.toHaveProperty("performanceStarsDelta");
    expect(projection).not.toHaveProperty("mastered");
  });

  it("narrows the cumulative projection contract to optional practice", () => {
    const projection = applyAccessStarDelta({
      previousTotal: 20,
      delta: 3,
      source: "optional_practice",
      idempotencyKey: "account-1:quick-speak:attempt-1",
    });
    const source: "optional_practice" = projection.source;
    const validProjection = {
      nextTotal: 23,
      delta: 3,
      source: "optional_practice",
    } satisfies AccessStarDeltaProjection;
    const invalidPurchaseProjection: AccessStarDeltaProjection = {
      nextTotal: 23,
      delta: 3,
      // @ts-expect-error purchase is gate-scoped, not a cumulative-practice projection
      source: "purchase",
    };

    expect(source).toBe("optional_practice");
    expect(validProjection.source).toBe("optional_practice");
    void invalidPurchaseProjection;
  });

  it("keeps the source vocabulary closed to performance, optional practice and purchase", () => {
    const sources: readonly AccessStarSource[] = [
      "performance",
      "optional_practice",
      "purchase",
    ];

    expect(sources).toEqual(["performance", "optional_practice", "purchase"]);
  });

  it("allows only the performance source to update best-by-slot stars", () => {
    expect(
      applyBestPerformanceStars({
        previous: 1,
        candidate: 3,
        source: "performance",
      }),
    ).toEqual({
      next: 3,
      performanceStarsDelta: 2,
      accessStarsEarnedDelta: 2,
    });
    expect(() =>
      applyBestPerformanceStars({
        previous: 1,
        candidate: 3,
        source: "optional_practice",
      }),
    ).toThrow("performance_star_source_invalid");
    expect(() =>
      applyBestPerformanceStars({
        previous: 1,
        candidate: 3,
        source: "purchase",
      }),
    ).toThrow("performance_star_source_invalid");
  });

  it("defaults an omitted best-by-slot source to performance", () => {
    expect(applyBestPerformanceStars({ previous: 1, candidate: 3 })).toEqual(
      applyBestPerformanceStars(bestInput),
    );
  });

  it("rejects purchase and performance sources from cumulative practice access", () => {
    const applyInvalid = (source: AccessStarSource) => () =>
      applyAccessStarDelta({
        previousTotal: 20,
        delta: 3,
        source,
        idempotencyKey: `account-1:${source}:operation-1`,
      } as Parameters<typeof applyAccessStarDelta>[0]);

    expect(applyInvalid("purchase")).toThrow("access_star_operation_invalid");
    expect(applyInvalid("performance")).toThrow(
      "access_star_operation_invalid",
    );
  });

  it("requires a bounded idempotency-ready identity without claiming durable replay dedupe", () => {
    const operation = {
      previousTotal: 20,
      delta: 3,
      source: "optional_practice" as const,
      idempotencyKey: "account-1:quick-speak:attempt-1",
    };

    expect(applyAccessStarDelta(operation)).toEqual(
      applyAccessStarDelta(operation),
    );
    expect(() =>
      applyAccessStarDelta({ ...operation, idempotencyKey: "" }),
    ).toThrow("access_star_operation_invalid");
  });

  it.each([
    ["negative total", { previousTotal: -1 }],
    ["unsafe total", { previousTotal: Number.MAX_SAFE_INTEGER + 1 }],
    ["negative delta", { delta: -1 }],
    ["unsafe delta", { delta: Number.MAX_SAFE_INTEGER + 1 }],
    ["invalid source", { source: "unknown" }],
    ["empty key", { idempotencyKey: "" }],
    ["oversized key", { idempotencyKey: "x".repeat(257) }],
    ["overflow", { previousTotal: Number.MAX_SAFE_INTEGER, delta: 1 }],
  ])("rejects an invalid %s", (_case, overrides) => {
    const input: unknown = {
      previousTotal: 20,
      delta: 3,
      source: "optional_practice",
      idempotencyKey: "account-1:quick-speak:attempt-1",
      ...overrides,
    };

    expect(() =>
      applyAccessStarDelta(input as Parameters<typeof applyAccessStarDelta>[0]),
    ).toThrow("access_star_operation_invalid");
  });

  it.each([
    ["previous", "performance_stars_invalid"],
    ["candidate", "performance_stars_invalid"],
    ["source", "performance_star_source_invalid"],
  ] as const)(
    "rejects a stateful best-star %s accessor without invoking it",
    (field, code) => {
      let getterCount = 0;
      const input = { ...bestInput };
      Object.defineProperty(input, field, {
        enumerable: true,
        configurable: true,
        get: () => {
          getterCount += 1;
          return getterCount % 2 === 0 ? "purchase" : 3;
        },
      });

      expect(() =>
        applyBestPerformanceStars(
          input as Parameters<typeof applyBestPerformanceStars>[0],
        ),
      ).toThrow(code);
      expect(getterCount).toBe(0);
    },
  );

  it("catches own-key and prototype proxy traps with stable codes", () => {
    expect(() =>
      applyBestPerformanceStars(
        new Proxy(bestInput, {
          ownKeys: () => {
            throw new Error("own_keys_trap");
          },
        }),
      ),
    ).toThrow("performance_stars_invalid");
    expect(() =>
      applyBestPerformanceStars(
        new Proxy(bestInput, {
          getPrototypeOf: () => {
            throw new Error("prototype_trap");
          },
        }),
      ),
    ).toThrow("performance_stars_invalid");
    expect(() =>
      applyAccessStarDelta(
        new Proxy(accessInput, {
          ownKeys: () => {
            throw new Error("own_keys_trap");
          },
        }),
      ),
    ).toThrow("access_star_operation_invalid");
    expect(() =>
      applyAccessStarDelta(
        new Proxy(accessInput, {
          getPrototypeOf: () => {
            throw new Error("prototype_trap");
          },
        }),
      ),
    ).toThrow("access_star_operation_invalid");
  });

  it.each([
    ["previous", "performance_stars_invalid"],
    ["candidate", "performance_stars_invalid"],
    ["source", "performance_star_source_invalid"],
  ] as const)(
    "rejects a throwing best-star %s accessor without invoking it",
    (field, code) => {
      let getterCount = 0;
      const input = { ...bestInput };
      Object.defineProperty(input, field, {
        enumerable: true,
        configurable: true,
        get: () => {
          getterCount += 1;
          throw new Error("getter_must_not_run");
        },
      });

      expect(() =>
        applyBestPerformanceStars(
          input as Parameters<typeof applyBestPerformanceStars>[0],
        ),
      ).toThrow(code);
      expect(getterCount).toBe(0);
    },
  );

  it.each(["previousTotal", "delta", "source", "idempotencyKey"] as const)(
    "rejects a stateful access-star %s accessor without invoking it",
    (field) => {
      let getterCount = 0;
      const input = { ...accessInput };
      Object.defineProperty(input, field, {
        enumerable: true,
        configurable: true,
        get: () => {
          getterCount += 1;
          return getterCount;
        },
      });

      expect(() =>
        applyAccessStarDelta(
          input as Parameters<typeof applyAccessStarDelta>[0],
        ),
      ).toThrow("access_star_operation_invalid");
      expect(getterCount).toBe(0);
    },
  );

  it.each(["previousTotal", "delta", "source", "idempotencyKey"] as const)(
    "rejects a throwing access-star %s accessor without invoking it",
    (field) => {
      let getterCount = 0;
      const input = { ...accessInput };
      Object.defineProperty(input, field, {
        enumerable: true,
        configurable: true,
        get: () => {
          getterCount += 1;
          throw new Error("getter_must_not_run");
        },
      });

      expect(() =>
        applyAccessStarDelta(
          input as Parameters<typeof applyAccessStarDelta>[0],
        ),
      ).toThrow("access_star_operation_invalid");
      expect(getterCount).toBe(0);
    },
  );

  it.each([
    ["previous", "performance_stars_invalid"],
    ["candidate", "performance_stars_invalid"],
    ["source", "performance_star_source_invalid"],
  ] as const)(
    "catches a throwing best-star %s descriptor trap with a stable code",
    (field, code) => {
      const input = new Proxy(bestInput, {
        getOwnPropertyDescriptor: (target, property) => {
          if (property === field) throw new Error("descriptor_trap");
          return Reflect.getOwnPropertyDescriptor(target, property);
        },
      });

      expect(() => applyBestPerformanceStars(input)).toThrow(code);
    },
  );

  it.each(["previousTotal", "delta", "source", "idempotencyKey"] as const)(
    "catches a throwing access-star %s descriptor trap with a stable code",
    (field) => {
      const input = new Proxy(accessInput, {
        getOwnPropertyDescriptor: (target, property) => {
          if (property === field) throw new Error("descriptor_trap");
          return Reflect.getOwnPropertyDescriptor(target, property);
        },
      });

      expect(() => applyAccessStarDelta(input)).toThrow(
        "access_star_operation_invalid",
      );
    },
  );

  it("takes one descriptor snapshot and never invokes proxy get traps", () => {
    const bestDescriptorCounts = new Map<PropertyKey, number>();
    const accessDescriptorCounts = new Map<PropertyKey, number>();
    let getTrapCount = 0;
    const proxy = <T extends object>(
      target: T,
      descriptorCounts: Map<PropertyKey, number>,
    ): T =>
      new Proxy(target, {
        get: () => {
          getTrapCount += 1;
          throw new Error("get_trap_must_not_run");
        },
        getOwnPropertyDescriptor: (current, property) => {
          descriptorCounts.set(
            property,
            (descriptorCounts.get(property) ?? 0) + 1,
          );
          return Reflect.getOwnPropertyDescriptor(current, property);
        },
      });

    expect(
      applyBestPerformanceStars(proxy(bestInput, bestDescriptorCounts)),
    ).toEqual({
      next: 3,
      performanceStarsDelta: 2,
      accessStarsEarnedDelta: 2,
    });
    expect(
      applyAccessStarDelta(proxy(accessInput, accessDescriptorCounts)),
    ).toEqual({
      nextTotal: 23,
      delta: 3,
      source: "optional_practice",
    });
    expect([...bestDescriptorCounts.values()]).toEqual([1, 1, 1]);
    expect([...accessDescriptorCounts.values()]).toEqual([1, 1, 1, 1]);
    expect(getTrapCount).toBe(0);
  });

  it("rejects non-plain, non-enumerable, symbol and extra flat inputs", () => {
    const nonEnumerable = { ...accessInput };
    Object.defineProperty(nonEnumerable, "delta", {
      value: 3,
      enumerable: false,
    });
    const symbolInput = Object.assign(
      { ...accessInput },
      { [Symbol("extra")]: true },
    );
    const inherited = Object.create({ inherited: true }) as typeof accessInput;
    Object.assign(inherited, accessInput);

    expect(() =>
      applyBestPerformanceStars({ ...bestInput, extra: true } as Parameters<
        typeof applyBestPerformanceStars
      >[0]),
    ).toThrow("performance_stars_invalid");
    expect(() => applyAccessStarDelta(nonEnumerable)).toThrow(
      "access_star_operation_invalid",
    );
    expect(() => applyAccessStarDelta(symbolInput)).toThrow(
      "access_star_operation_invalid",
    );
    expect(() => applyAccessStarDelta(inherited)).toThrow(
      "access_star_operation_invalid",
    );
  });
});
