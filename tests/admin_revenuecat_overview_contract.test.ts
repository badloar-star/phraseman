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
    expect(html).toContain("overview?.activeSubscriptions");
    expect(html).toContain("overview?.activeTrials");
    expect(html).toContain("an2ExactCell(overviewExact, overview?.activeSubscriptions)");
    expect(html).toContain("an2ExactCell(overviewExact, overview?.activeTrials)");
    expect(html).toContain("an2Set('an2-pay-cancelled', 'n/a')");
    expect(html).toContain("REVENUECAT API · ACTIVE_SUBSCRIPTIONS");
    expect(html).toContain("REVENUECAT API · ACTIVE_TRIALS");
  });

  test("the secret stays server-side behind admin money.read permission", () => {
    expect(server).toContain("defineSecret('REVENUECAT_SECRET_API_KEY')");
    expect(server).toContain('roleFromAdminToken(request.auth.token)');
    expect(server).toContain("hasClaimedPermission(request.auth.token, 'money.read')");
    expect(server).toContain("https://api.revenuecat.com/v2/projects/");
    expect(html).not.toContain("REVENUECAT_SECRET_API_KEY");
    expect(exportsFile).toMatch(
      /export\s*\{\s*adminGetRevenueCatOverviewMetrics\s*\}\s*from\s*["']\.\/admin_revenuecat_overview["'];/,
    );
  });
});
