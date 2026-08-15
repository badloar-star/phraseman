import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.resolve(__dirname, "../admin/v2/legacy.html"),
  "utf8",
);

function block(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

const handlers = {
  grantHelperShards: () =>
    block(
      "window.grantHelperShards = async function(uid) {",
      "\n  window.grantHelperPlus",
    ),
  grantHelperPlus: () =>
    block(
      "window.grantHelperPlus = async function(uid) {",
      "\n  window.editShards",
    ),
  grantAdminPremiumChoice: () =>
    block(
      "async function grantAdminPremiumChoice(uid, spec) {",
      "\n  window.revokeAdminVip",
    ),
  revokeAdminVip: () =>
    block(
      "window.revokeAdminVip = async function(uid) {",
      "\n  window.warnUserDirect",
    ),
};

describe("live admin Plus/helper protected callable contract", () => {
  it("has exactly one cached callable getter for access and reward mutations", () => {
    expect(
      source.match(/httpsCallable\(functionsUs, 'adminGrantAccess'\)/g) || [],
    ).toHaveLength(1);
    expect(source).toContain("function getAdminGrantAccessCallable()");
    expect(
      source.match(/httpsCallable\(functionsUs, 'adminGrantReward'\)/g) || [],
    ).toHaveLength(1);
    expect(source).toContain("function getAdminGrantFn()");

    const existingRewardConsumer = block(
      "window.grantReward = async function grantReward",
      "\n  window.viewAchievements",
    );
    expect(existingRewardConsumer).toContain("getAdminGrantFn()");
  });

  it.each([
    ["grantAdminPremiumChoice", true],
    ["revokeAdminVip", false],
    ["grantHelperPlus", true],
  ] as const)(
    "%s requires a reason and sends an idempotent VIP access command",
    (name, active) => {
      const body = handlers[name]();
      expect(body).toContain("showInputModal({");
      expect(body).toContain(".trim();");
      expect(body).toMatch(/if\s*\(!reason\)/);
      expect(body).toContain("const requestId = createAdminCommandId(");
      expect(body).toContain("const idempotencyKey = createAdminCommandId(");
      expect(body).toContain("await getAdminGrantAccessCallable()({");
      expect(body).toContain("kind: 'vip'");
      expect(body).toContain(`active: ${String(active)}`);
      expect(body).toContain("durationDays");
      expect(body).toContain("reason,");
      expect(body).toContain("requestId,");
      expect(body).toContain("idempotencyKey,");
    },
  );

  it.each([
    "grantAdminPremiumChoice",
    "revokeAdminVip",
    "grantHelperPlus",
  ] as const)(
    "%s trusts only an acknowledged canonical server result before refreshing UI",
    (name) => {
      const body = handlers[name]();
      const call = body.indexOf("await getAdminGrantAccessCallable()({");
      const acknowledged = body.indexOf("response.data.ok !== true");
      const canonicalUid = body.indexOf(
        "const writeUid = response.data.uid;",
        acknowledged,
      );
      const expiry = body.indexOf(
        "const expiresAtMs = Number(response.data.expiresAtMs);",
        acknowledged,
      );
      const cachedMutation = body.indexOf(
        "applyVipPatchToCachedUser(writeUid,",
        acknowledged,
      );
      const successToast = body.indexOf("showToast(", cachedMutation);
      const errorToast = body.lastIndexOf("showToast(");

      expect(call).toBeGreaterThan(-1);
      expect(acknowledged).toBeGreaterThan(call);
      expect(canonicalUid).toBeGreaterThan(acknowledged);
      expect(expiry).toBeGreaterThan(acknowledged);
      expect(cachedMutation).toBeGreaterThan(expiry);
      expect(successToast).toBeGreaterThan(cachedMutation);
      expect(errorToast).toBeGreaterThan(successToast);
      expect(body.slice(errorToast)).toContain("'err'");
    },
  );

  it("keeps the Plus modal/list/detail refresh flow after callable success", () => {
    const grant = handlers.grantAdminPremiumChoice();
    expect(grant).toContain("closePremiumGrantModal();");
    expect(grant).toContain("openDetail(writeUid);");
    expect(grant).toContain("renderTable();");
    expect(grant).toContain("renderPremiumList()");
    expect(grant).toContain("renderVipList()");
    expect(grant).toContain("renderVipSurveyResponses()");

    const revoke = handlers.revokeAdminVip();
    expect(revoke).toContain("openDetail(writeUid);");
    expect(revoke).toContain("renderTable();");
    expect(revoke).toContain("renderPremiumList()");
    expect(revoke).toContain("renderVipList()");
    expect(revoke).toContain("renderVipSurveyResponses()");
  });

  it("grants helper shards through adminGrantReward with bounded input and optional bounded comment", () => {
    const body = handlers.grantHelperShards();
    expect(body).toMatch(/amt\s*>\s*10000/);
    expect(body).toContain("const reason = String(await showInputModal({");
    expect(body).toMatch(/if\s*\(!reason\)/);
    expect(body).toContain("allowEmpty: true");
    expect(body).toContain(".slice(0, 200)");
    expect(body).toContain("await getAdminGrantFn()({");
    expect(body).toContain("type: 'shards'");
    expect(body).toContain("amount: amt");
    expect(body).toContain("comment,");
    expect(body).toContain("reason,");
    expect(body).toContain("requestId,");
    expect(body).toContain("idempotencyKey,");
    expect(body).toContain("response.data.ok !== true");
    expect(body).toContain("response.data.amount");
  });

  it.each([
    "grantHelperShards",
    "grantHelperPlus",
    "grantAdminPremiumChoice",
    "revokeAdminVip",
  ] as const)(
    "%s has no direct user mutation, client audit, or canonical fallback",
    (name) => {
      const body = handlers[name]();
      expect(body).not.toMatch(/\b(?:getDoc|setDoc|updateDoc|deleteDoc)\s*\(/);
      expect(body).not.toContain("logAction(");
      expect(body).not.toContain("resolveAdminVipWriteTarget");
      expect(body).not.toMatch(
        /target\s*&&\s*target\.uid|target\.uid\s*\|\|\s*uid/,
      );
    },
  );

  it("bounds every finite Plus duration before sending it to the server", () => {
    const premium = handlers.grantAdminPremiumChoice();
    expect(premium).toContain("spec.kind === 'forever' ? 0 : spec.n * 30");
    expect(premium).toMatch(/durationDays\s*>\s*3650/);

    const helper = handlers.grantHelperPlus();
    expect(helper).toContain("months === 0 ? 0 : months * 30");
    expect(helper).toMatch(/durationDays\s*>\s*3650/);
  });
});
