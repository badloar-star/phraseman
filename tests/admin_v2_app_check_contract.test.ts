import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("live admin web App Check contract", () => {
  const live = read("admin/v2/legacy.html");
  const giftServer = read("functions/src/web_checkout.ts");
  const referralAdmin = read("functions/src/admin_referrals.ts");
  const callableOptions = read("functions/src/callable_options.ts");

  test("does not initialize or request a client App Check token while owner policy is sealed off", () => {
    expect(live).not.toContain("firebase-app-check.js");
    expect(live).not.toContain("initializeAppCheck");
    expect(live).not.toContain("ReCaptchaEnterpriseProvider");
    expect(live).not.toContain("getAppCheckToken");
    expect(live).not.toContain("X-Firebase-AppCheck");
    expect(live).not.toContain("ADMIN_APP_CHECK_ENTERPRISE_SITE_KEY");
    expect(live).not.toContain("requireAdminAppCheckForGiftCertificates");
  });

  test("uses the authenticated admin callable transport and sends only Firebase Auth", () => {
    const helperStart = live.indexOf(
      "function createAdminAuthCallable(name)",
    );
    const helperEnd = live.indexOf(
      "const functionsUs = getFunctions(app, 'us-central1');",
      helperStart,
    );
    const helper = live.slice(helperStart, helperEnd);
    expect(helperStart).toBeGreaterThan(0);
    expect(helperEnd).toBeGreaterThan(helperStart);
    expect(helper).toContain("return _fsHttpsCallable(functionsUs, name)");
    expect(helper).not.toContain("AppCheck");
    expect(helper).not.toContain("appCheck");
    expect(helper).not.toContain("fetch(");
    expect(helper).not.toContain("Authorization:");
    for (const name of [
      "adminCreateGiftCertificateBatch",
      "adminGetGiftCertificateBatchOperation",
      "adminCancelGiftCertificateBatchOperation",
      "adminListGiftCertificates",
      "adminDeleteGiftCertificate",
      "adminUpdateGiftCertificatePersonalization",
      "adminGetGiftCertificateDownload",
      "adminReplaceSyntheticGiftCertificate",
      "adminSendPreparedGiftCertificate",
    ]) {
      expect(live).toContain(`createAdminAuthCallable('${name}')`);
      expect(live).not.toContain(`httpsCallable(functionsUs, '${name}')`);
    }
  });

  test("keeps server admin App Check enforcement sealed off and does not copy initialization to redirect stubs", () => {
    expect(giftServer).toContain(
      "export const GIFT_CERTIFICATE_MUTATION_OPTIONS = { region: REGION, enforceAppCheck: false } as const;",
    );
    expect(giftServer).toContain(
      "export const GIFT_CERTIFICATE_READ_OPTIONS = { region: REGION, enforceAppCheck: false } as const;",
    );
    expect(callableOptions).toContain(
      "export const APP_CHECK_SEALED_BY_OWNER_2026_08_17 = true as const;",
    );
    expect(callableOptions).toContain(
      "export const ENFORCE_APP_CHECK_ADMIN = false;",
    );
    expect(callableOptions).toContain(
      "enforceAppCheck: ENFORCE_APP_CHECK_ADMIN",
    );
    expect(referralAdmin).toContain(
      "const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK_ADMIN } as const;",
    );
    expect(referralAdmin).not.toContain(
      "const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;",
    );

    for (const frozen of [
      "admin/index.html",
      "admin/full.html",
      "admin/site.html",
    ]) {
      const absolute = path.join(root, frozen);
      if (fs.existsSync(absolute)) {
        expect(fs.readFileSync(absolute, "utf8")).not.toContain(
          "firebase-app-check.js",
        );
      }
    }
    expect(fs.existsSync(path.join(root, "admin/v2/index.html"))).toBe(false);
  });
});
