import { deriveLearningV2EconomicAccountScopeHash } from "../modules/learning-v2/progress/economic_account_scope";
import { deriveProgressAccountScopeHash } from "../functions/src/learning_v2/progress_event";

describe("Learning V2 economic account scope", () => {
  it("is stable across account generations while progress scope remains fenced", () => {
    const stableUid = "stable-user-1";
    const economic = deriveLearningV2EconomicAccountScopeHash(stableUid);
    expect(deriveLearningV2EconomicAccountScopeHash(stableUid)).toBe(economic);
    expect(deriveProgressAccountScopeHash(stableUid, 4)).not.toBe(
      deriveProgressAccountScopeHash(stableUid, 5),
    );
    expect(economic).toMatch(/^[a-f0-9]{64}$/);
  });

  it("isolates accounts and rejects coercion or unsafe identities", () => {
    expect(deriveLearningV2EconomicAccountScopeHash("stable-user-1")).not.toBe(
      deriveLearningV2EconomicAccountScopeHash("stable-user-2"),
    );
    let coercions = 0;
    expect(() => deriveLearningV2EconomicAccountScopeHash({
      toString: () => { coercions += 1; return "stable-user-1"; },
    })).toThrow("learning_v2_economic_account_scope_invalid");
    expect(coercions).toBe(0);
    expect(() => deriveLearningV2EconomicAccountScopeHash("../escape"))
      .toThrow("learning_v2_economic_account_scope_invalid");
  });
});
