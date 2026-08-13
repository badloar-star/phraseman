import fs from "node:fs";
import path from "node:path";

const html = fs.readFileSync(
  path.resolve(__dirname, "../admin/legacy.html"),
  "utf8",
);

function windowHandler(name: string): string {
  const start = html.indexOf(`window.${name} = async function`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = html.indexOf("\n  };", start);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end + 5);
}

function namedAsyncFunction(name: string): string {
  const start = html.indexOf(`async function ${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = html.indexOf("\n  /*", start + 1);
  return html.slice(start, next < 0 ? html.length : next);
}

const directWritePattern =
  /\b(?:addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\s*\(/;

describe("live admin sensitive write handlers", () => {
  const handlers: Record<string, string> = {
    adminNavSaveToServer: namedAsyncFunction("adminNavSaveToServer"),
    deactivateVipSurveyMessages: windowHandler("deactivateVipSurveyMessages"),
    sendVipSurveyCampaign: windowHandler("sendVipSurveyCampaign"),
    saveAlertsConfig: windowHandler("saveAlertsConfig"),
    sendAlertTest: windowHandler("sendAlertTest"),
    saveAppMessage: windowHandler("saveAppMessage"),
    toggleAppMessageActive: windowHandler("toggleAppMessageActive"),
    deleteAppMessage: windowHandler("deleteAppMessage"),
    cleanupExpiredAppMessages: windowHandler("cleanupExpiredAppMessages"),
    leagueResetPoints: windowHandler("leagueResetPoints"),
    leagueMoveUser: windowHandler("leagueMoveUser"),
  };

  test.each(Object.entries(handlers))(
    "%s delegates writes to verified callables",
    (_name, body) => {
      expect(body).not.toMatch(directWritePattern);
      expect(body).toMatch(/reason/i);
      expect(body).toMatch(/idempotencyKey/);
      expect(body).toMatch(/requestId/);
      expect(body).toMatch(/\.data\?\.ok|\.data\.ok/);
    },
  );

  test("uses the exact protected write lanes for each domain", () => {
    expect(handlers.adminNavSaveToServer).toContain(
      "getAdminPublishNavLayoutCallable",
    );
    expect(handlers.deactivateVipSurveyMessages).toContain(
      "getAdminDeactivateVipSurveyCampaignCallable",
    );
    expect(handlers.sendVipSurveyCampaign).toContain(
      "getAdminLaunchVipSurveyCampaignCallable",
    );
    expect(handlers.saveAlertsConfig).toContain(
      "getAdminPublishAlertsConfigCallable",
    );
    expect(handlers.sendAlertTest).toContain("getAdminTestAlertsCallable");
    expect(handlers.saveAppMessage).toMatch(
      /getAdmin(?:Create|Update)AppMessageCallable/,
    );
    expect(handlers.toggleAppMessageActive).toContain(
      "getAdminSetAppMessageActiveCallable",
    );
    expect(handlers.deleteAppMessage).toContain(
      "getAdminDeleteAppMessageCallable",
    );
    expect(handlers.cleanupExpiredAppMessages).toContain(
      "getAdminCleanupExpiredAppMessagesCallable",
    );
    expect(handlers.leagueResetPoints).toContain(
      "getAdminResetLeaguePointsCallable",
    );
    expect(handlers.leagueMoveUser).toContain("getAdminMoveLeagueUserCallable");
  });

  test("alert testing does not submit or persist client-side alert configuration", () => {
    expect(handlers.sendAlertTest).not.toContain("alertsReadForm");
    expect(handlers.sendAlertTest).not.toMatch(
      /document\.getElementById\(['"]alerts-/,
    );
    const callStart = handlers.sendAlertTest.indexOf(
      "getAdminTestAlertsCallable()({",
    );
    const callEnd = handlers.sendAlertTest.indexOf("});", callStart);
    const payload = handlers.sendAlertTest.slice(callStart, callEnd);
    expect(payload).not.toMatch(
      /chatId|enabled|types|spikeThreshold|spikePerHour/,
    );
  });
});
