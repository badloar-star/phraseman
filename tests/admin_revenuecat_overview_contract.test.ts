import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

describe("live admin RevenueCat overview contract", () => {
  const html = fs.readFileSync(path.join(ROOT, "admin/v2/legacy.html"), "utf8");
  const server = fs.readFileSync(
    path.join(ROOT, "functions/src/admin_revenuecat_overview.ts"),
    "utf8",
  );
  const exportsFile = fs.readFileSync(
    path.join(ROOT, "functions/src/index.ts"),
    "utf8",
  );

  test("Paying now and On trial come from the protected RevenueCat API callable", () => {
    expect(html).toContain(
      "httpsCallable(functionsUs, 'adminGetRevenueCatOverviewMetrics')",
    );
    expect(html).toMatch(
      /an2Set\('an2-pay-total',[^;]*AN2_NUM\(_an2\.rcOverview\.activeSubscriptions\)/,
    );
    expect(html).toMatch(
      /an2Set\('an2-pay-trial',[^;]*AN2_NUM\(_an2\.rcOverview\.activeTrials\)/,
    );
    expect(html).toContain("REVENUECAT API · ACTIVE_SUBSCRIPTIONS");
    expect(html).toContain("REVENUECAT API · ACTIVE_TRIALS");
  });

  test("the secret stays server-side behind admin money.read permission", () => {
    expect(server).toContain("defineSecret('REVENUECAT_SECRET_API_KEY')");
    expect(server).toContain("hasPermission(role, 'money.read')");
    expect(server).toContain("https://api.revenuecat.com/v2/projects/");
    expect(html).not.toContain("REVENUECAT_SECRET_API_KEY");
    expect(exportsFile).toContain(
      "export { adminGetRevenueCatOverviewMetrics } from './admin_revenuecat_overview';",
    );
  });
});
