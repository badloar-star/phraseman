import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

function extractNamedFunction(source: string, name: string): string {
  const plainStart = source.indexOf(`function ${name}(`);
  const asyncStart = source.indexOf(`async function ${name}(`);
  const start =
    [plainStart, asyncStart]
      .filter((value) => value >= 0)
      .sort((a, b) => a - b)[0] ?? -1;
  if (start < 0) throw new Error(`missing function ${name}`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

describe("live admin gift certificates workflow", () => {
  const live = read("admin/v2/legacy.html");
  const server = read("functions/src/web_checkout.ts");
  const functionsIndex = read("functions/src/index.ts");
  const firestoreRules = read("firestore.rules");
  const jarvisContract = read("functions/src/jarvis/jarvis_data_contract_guard.test.ts");

  test("uses the Firebase callable SDK for authenticated envelopes and structured errors", () => {
    const helper = extractNamedFunction(live, "createAdminAuthCallable");
    expect(helper).toContain("return _fsHttpsCallable(functionsUs, name)");
    expect(helper).not.toContain("fetch(");
    expect(helper).not.toContain("X-Firebase-AppCheck");
  });

  test("keeps gift CSS in style and gift JS at module top level", () => {
    const cssMarker = live.indexOf("/* Gift certificates: compact");
    expect(cssMarker).toBeGreaterThan(0);
    expect(live.lastIndexOf("<style", cssMarker)).toBeGreaterThan(
      live.lastIndexOf("</style>", cssMarker),
    );

    const giftJsMarker = live.indexOf("// -- GIFT CERTIFICATES:");
    const moduleAuth = live.indexOf("const auth = getAuth(app);");
    const firstDailyPhrasesDrop = live.indexOf(
      "window.dpDrop = async function dpDrop",
    );
    expect(giftJsMarker).toBeGreaterThan(moduleAuth);
    expect(giftJsMarker).toBeLessThan(firstDailyPhrasesDrop);
  });

  test("does not reuse the globally styled app header element for the gift panel header", () => {
    expect(live).not.toContain('<header class="gift-cert-header">');
    expect(live).toContain('<div class="gift-cert-header">');
  });

  test("offers independent recipient and sender visibility in creation and modal UI", () => {
    expect(live).toContain('id="gift-certificate-senders"');
    expect(live).toContain('id="gift-certificate-emails"');
    expect(live).toMatch(
      /id="gift-certificate-show-recipient-name"[^>]*type="checkbox"/,
    );
    expect(live).toMatch(
      /id="gift-certificate-show-sender-name"[^>]*type="checkbox"/,
    );
    expect(
      live.match(
        /id="gift-certificate-show-(?:recipient|sender)-name"[^>]*checked/g,
      ) ?? [],
    ).toHaveLength(2);
    expect(live).toContain('id="gift-personalization-show-recipient"');
    expect(live).toContain('id="gift-personalization-show-sender"');
    expect(live).not.toContain('name="gift-certificate-personalization-mode"');
  });

  test("executes independent production personalization for all four combinations", () => {
    const validatorSource = extractNamedFunction(
      live,
      "giftCertificateValidatePersonalizationPayload",
    );
    const displaySource = extractNamedFunction(
      live,
      "giftCertificateDisplayPersonalization",
    );
    const { validate, display } = new Function(
      `${validatorSource}\n${displaySource}\nreturn { validate: giftCertificateValidatePersonalizationPayload, display: giftCertificateDisplayPersonalization };`,
    )() as {
      validate: (input: Record<string, unknown>) => Record<string, unknown>;
      display: (input: Record<string, unknown>) => Record<string, unknown>;
    };

    expect(() =>
      validate({
        action: "download",
        showRecipientName: true,
        displayRecipientName: "",
      }),
    ).toThrow();
    expect(() =>
      validate({
        action: "download",
        showSenderName: true,
        displaySenderName: "",
      }),
    ).toThrow();
    for (const [showRecipientName, showSenderName] of [
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ]) {
      const validated = validate({
        action: "download",
        showRecipientName,
        showSenderName,
        displayRecipientName: "Recipient",
        displaySenderName: "Sender",
        recipientEmail: "",
      });
      expect(validated).toMatchObject({ showRecipientName, showSenderName });
      expect(display(validated)).toEqual({
        showRecipientName,
        showSenderName,
        showPersonalization: showRecipientName || showSenderName,
        displayRecipientName: showRecipientName ? "Recipient" : "",
        displaySenderName: showSenderName ? "Sender" : "",
      });
    }
  });

  test("exists only on the single live legacy admin surface and under Money", () => {
    expect(live).toContain("switchTab('gift-certificates')");
    expect(live).toContain('id="tab-gift-certificates"');
    expect(live).toContain("'gift-certificates': 'revenue'");
    expect(live).toContain("'gift-certificates': 'Подарочные сертификаты'");
    for (const frozen of [
      "admin/index.html",
      "admin/full.html",
      "admin/site.html",
    ]) {
      const absolute = path.join(root, frozen);
      if (fs.existsSync(absolute))
        expect(fs.readFileSync(absolute, "utf8")).not.toContain(
          'id="tab-gift-certificates"',
        );
    }
    expect(fs.existsSync(path.join(root, "admin/v2/index.html"))).toBe(false);
  });

  test("uses Firebase-Auth-only server callables for issue/history/repair/send and never creates gift codes locally", () => {
    expect(live).toContain(
      "createAdminAuthCallable('adminCreateGiftCertificateBatch')",
    );
    expect(live).toContain(
      "createAdminAuthCallable('adminGetGiftCertificateBatchOperation')",
    );
    expect(live).toContain(
      "createAdminAuthCallable('adminListGiftCertificates')",
    );
    expect(live).toContain(
      "createAdminAuthCallable('adminUpdateGiftCertificatePersonalization')",
    );
    expect(live).toContain(
      "createAdminAuthCallable('adminGetGiftCertificateDownload')",
    );
    expect(live).toContain(
      "createAdminAuthCallable('adminReplaceSyntheticGiftCertificate')",
    );
    expect(live).toContain(
      "createAdminAuthCallable('adminSendPreparedGiftCertificate')",
    );
    expect(server).toContain(
      "export const adminCreateGiftCertificateBatch = onCall(",
    );
    expect(server).toContain(
      "export const adminListGiftCertificates = onCall(",
    );
    expect(server).toContain(
      "export const adminGetGiftCertificateDownload = onCall(",
    );
    expect(server).toContain(
      "hasClaimedPermission(auth.token, 'money.manual_access.write')",
    );
    expect(server).toContain("hasClaimedPermission(auth.token, 'money.read')");
    expect(server).toContain("enforceAppCheck: false");
    expect(server).not.toContain("enforceAppCheck: true");
    expect(functionsIndex).toContain("adminCreateGiftCertificateBatch");
    expect(functionsIndex).toContain("adminListGiftCertificates");
    expect(functionsIndex).toContain("adminUpdateGiftCertificateRecipient");
    expect(functionsIndex).toContain(
      "adminUpdateGiftCertificatePersonalization",
    );
    expect(functionsIndex).toContain("adminGetGiftCertificateDownload");
    const clientStart = live.indexOf("function giftCertificateReadForm");
    const clientEnd = live.indexOf("// END GIFT CERTIFICATES");
    expect(clientStart).toBeGreaterThan(0);
    expect(clientEnd).toBeGreaterThan(clientStart);
    const client = live.slice(clientStart, clientEnd);
    expect(client).not.toMatch(
      /Math\.random|crypto\.getRandomValues|GIFT-\s*\+/,
    );
  });

  test("persists a bounded multi-admin collection of opaque checkpoints and clears one acknowledged entry only", () => {
    const clientStart = live.indexOf("// -- GIFT CERTIFICATES:");
    const clientEnd = live.indexOf("// END GIFT CERTIFICATES", clientStart);
    expect(clientStart).toBeGreaterThan(0);
    expect(clientEnd).toBeGreaterThan(clientStart);
    const client = live.slice(clientStart, clientEnd);

    expect(client).toContain("let _giftCertificatePendingBatch = null;");
    expect(client).toContain(
      "const GIFT_CERTIFICATE_OPERATION_CHECKPOINT_STORAGE_KEY = 'phraseman_admin_operation_checkpoints_v4:gift-certificates';",
    );
    expect(client).toContain("const GIFT_CERTIFICATE_OPERATION_CHECKPOINT_MAX_ENTRIES = 8;");
    expect(client).not.toContain("ownerUid");
    expect(client).not.toContain("auth.currentUser.uid");
    expect(client).toContain("localStorage.getItem(storageKey)");
    expect(client).toContain("gift-certificate-operation-checkpoint-collection.v4");
    expect(client).toContain("localStorage.setItem(storageKey, JSON.stringify(collection))");
    expect(client).toContain("crypto.randomUUID().toLowerCase()");
    expect(client).toContain("createdAtMs");
    expect(client).not.toContain("submittedAtMs");
    expect(client).not.toContain("requestHash");
    const freezeSource = extractNamedFunction(live, "giftCertificateFreezePendingBatch");
    const freeze = new Function(
      `${freezeSource}\nreturn giftCertificateFreezePendingBatch;`,
    )() as (input: Record<string, unknown>) => Record<string, unknown>;
    expect(Object.keys(freeze({
      operationId: "7d71d9f8-8428-4adb-88fa-508a5a59f206",
      createdAtMs: 123,
      submittedAtMs: 456,
      ownerUid: "must-not-survive",
      recipientEmail: "must-not-survive@example.com",
    }))).toEqual(["operationId", "createdAtMs"]);
    const persist = extractNamedFunction(live, "giftCertificatePersistPendingBatch");
    expect(persist).not.toContain("recipientNames");
    expect(persist).not.toContain("senderNames");
    expect(persist).not.toContain("recipientEmails");
    expect(persist).not.toContain("request:");
    expect(client).toContain("giftCertificatePersistPendingBatch(checkpoint);");
    expect(client).toContain("giftCertificateRemovePendingBatch(checkpoint.operationId");
    expect(client).toContain("operationId: checkpoint.operationId");
    expect(client).toContain("adminGetGiftCertificateBatchOperation");
    expect(client).toContain("giftCertificateRecoverBatchReceipt");
    expect(client).toContain("adminCancelGiftCertificateBatchOperation");
    expect(client).toContain("checkpoint сохранён до подтверждённого результата");
    expect(client).toContain("await giftCertificateCancelPendingBatch(checkpoint)");
    expect(client).not.toContain("giftCertificateClearPendingBatch('explicit_cancellation')");
    expect(client).toContain(
      "response.data?.operationId !== checkpoint.operationId",
    );
    expect(client).toContain(
      "response.data.certificates.length !== form.count",
    );
    expect(client).toMatch(
      /response\.data\?\.operationId !== checkpoint\.operationId[\s\S]*?giftCertificateRemovePendingBatch\(checkpoint\.operationId, 'verified_success'\);[\s\S]*?const created/,
    );
    expect(client).toContain(
      "if (!['verified_success', 'server_cancelled'].includes(reason))",
    );
    const signOut = live.slice(
      live.indexOf("window.adminSignOut ="),
      live.indexOf("function adminCloseBlockingShellOverlays", live.indexOf("window.adminSignOut =")),
    );
    expect(signOut).toContain("giftCertificateResolveCheckpointBeforeAuthTransition");
    expect(signOut).toContain("signOut(auth)");
    expect(signOut).not.toContain("giftCertificateClearPendingBatch");
    const transition = extractNamedFunction(live, "giftCertificateResolveCheckpointBeforeAuthTransition");
    expect(transition).toContain("giftCertificateResolvePendingBatchForCurrentAdmin");
    expect(transition).toContain("giftCertificateCancelPendingBatch");
    expect(transition).not.toContain("'auth_transition'");
    const cleanup = extractNamedFunction(live, "clearGiftPii");
    expect(live).toContain("GIFT_CERTIFICATE_OPERATION_CHECKPOINT_STORAGE_KEY_LITERAL='phraseman_admin_operation_checkpoints_v4:gift-certificates'");
    expect(cleanup).toMatch(/key\s*===\s*GIFT_CERTIFICATE_OPERATION_CHECKPOINT_STORAGE_KEY_LITERAL[\s\S]*?continue/);
  });

  test("keeps foreign admin checkpoints quarantined and recovers the same actor after an A-to-B-to-A browser transition", async () => {
    const plannerSource = extractNamedFunction(live, "giftCertificatePlanCheckpointCollection");
    const freezeSource = extractNamedFunction(live, "giftCertificateFreezePendingBatch");
    const plan = new Function(
      `const GIFT_CERTIFICATE_OPERATION_CHECKPOINT_MAX_ENTRIES = 2;\n${freezeSource}\n${plannerSource}\nreturn giftCertificatePlanCheckpointCollection;`,
    )() as (entries: Array<Record<string, unknown>>, mutation: Record<string, unknown>) => Array<Record<string, unknown>>;
    const a = { operationId: '7d71d9f8-8428-4adb-88fa-508a5a59f206', createdAtMs: 1 };
    const b = { operationId: 'ea283384-2226-4c08-9742-9ed3275d51bd', createdAtMs: 2 };
    expect(plan(plan([], { kind: 'add', checkpoint: a }), { kind: 'add', checkpoint: b })).toEqual([a, b]);
    expect(plan([a, b], { kind: 'remove', operationId: b.operationId })).toEqual([a]);
    expect(() => plan([a, b], {
      kind: 'add',
      checkpoint: { operationId: 'f55aeb6e-6379-4235-b85a-c4f573dbb66d', createdAtMs: 3 },
    })).toThrow('gift_certificate_checkpoint_storage_full');

    const resolverSource = extractNamedFunction(live, "giftCertificateResolvePendingBatchForCurrentAdmin");
    const runResolution = (outcomes: Record<string, unknown>) => new Function(
      'entries',
      'outcomes',
      `function giftCertificateReadPendingBatchEntries(){ return entries; }\n`
        + `function giftCertificateOperationBelongsToAnotherActor(error){ return error?.code === 'functions/already-exists'; }\n`
        + `async function giftCertificateRecoverBatchReceipt(checkpoint){ const value = outcomes[checkpoint.operationId]; if(value instanceof Error) throw value; return value; }\n`
        + `function giftCertificateRemovePendingBatch(){ throw new Error('unexpected removal'); }\n`
        + `${resolverSource}\nreturn giftCertificateResolvePendingBatchForCurrentAdmin;`,
    )([a, b], outcomes) as () => Promise<Record<string, unknown> | null>;
    const foreign = Object.assign(new Error('gift_certificate_operation_conflict'), { code: 'functions/already-exists' });
    await expect(runResolution({
      [a.operationId]: foreign,
      [b.operationId]: { status: 'not_found' },
    })()).resolves.toMatchObject({ checkpoint: b, recovery: { status: 'not_found' }, foreignCount: 1 });
    await expect(runResolution({
      [a.operationId]: { status: 'pending' },
      [b.operationId]: foreign,
    })()).resolves.toMatchObject({ checkpoint: a, recovery: { status: 'pending' }, foreignCount: 0 });

    const signOut = live.slice(live.indexOf('window.adminSignOut ='), live.indexOf('function adminCloseBlockingShellOverlays'));
    expect(signOut).toContain('Promise.race');
    expect(signOut).not.toContain('giftCertificateRemovePendingBatch');
  });

  test("treats all server operation states explicitly and continues the same opaque id for pending/not-found", async () => {
    const recoverSource = extractNamedFunction(live, "giftCertificateRecoverBatchReceipt");
    const recoverFor = (payload: Record<string, unknown>) => new Function(
      "payload",
      `let _fnAdminGetGiftCertificateBatchOperation = async () => ({ data: payload });\n`
        + `function createAdminAuthCallable(){ throw new Error('unexpected callable factory'); }\n`
        + `${recoverSource}\nreturn giftCertificateRecoverBatchReceipt;`,
    )(payload) as (checkpoint: { operationId: string }) => Promise<Record<string, unknown>>;
    const checkpoint = { operationId: "7d71d9f8-8428-4adb-88fa-508a5a59f206" };
    await expect(recoverFor({ status: "not_found" })(checkpoint)).resolves.toEqual({ status: "not_found" });
    await expect(recoverFor({ status: "pending" })(checkpoint)).resolves.toEqual({ status: "pending" });
    await expect(recoverFor({ status: "cancelled" })(checkpoint)).resolves.toEqual({ status: "cancelled" });
    const receipt = { ok: true, operationId: checkpoint.operationId, certificates: [] };
    await expect(recoverFor({ status: "completed", receipt })(checkpoint)).resolves.toEqual({ status: "completed", receipt });

    const createFlow = live.slice(
      live.indexOf("window.createGiftCertificateBatch = async function()"),
      live.indexOf("window.giftCertificateReplaceSynthetic", live.indexOf("window.createGiftCertificateBatch = async function()")),
    );
    expect(createFlow).toContain("recovery.status === 'completed'");
    expect(extractNamedFunction(live, 'giftCertificateResolvePendingBatchForCurrentAdmin')).toContain("recovery.status === 'cancelled'");
    expect(createFlow).toMatch(/recovery\.status === 'not_found'[\s\S]*?checkpoint\.operationId/);
    expect(createFlow).toMatch(/recovery\.status === 'pending'[\s\S]*?checkpoint\.operationId/);
  });

  test("locks recipient fields for every ambiguous or final delivery state in both server and UI", () => {
    expect(server).toMatch(
      /current\.status === 'sent'[\s\S]*?current\.status === 'sending'[\s\S]*?current\.status === 'delivery_unknown'[\s\S]*?current\.status === 'reconciliation_required'/,
    );
    expect(live).toContain(
      "['sent', 'sending', 'delivery_unknown', 'reconciliation_required'].includes(String(record.status || ''))",
    );
  });

  test("propagates critical final delivery writes into the existing idempotent reconciliation path", () => {
    const writerStart = server.indexOf(
      "async function markActivationEmailStatusAt",
    );
    const writerEnd = server.indexOf(
      "export function deliveryStatusForEmailOutcome",
      writerStart,
    );
    const writer = server.slice(writerStart, writerEnd);
    expect(writerStart).toBeGreaterThan(0);
    expect(writer).toContain("propagateFailure: boolean = false");
    expect(writer).toMatch(
      /catch \(e\) \{[\s\S]*?if \(propagateFailure\) throw e;/,
    );

    const outcomeStart = server.indexOf(
      "async function markActivationEmailOutcome",
    );
    const outcomeEnd = server.indexOf("function formatRuDate", outcomeStart);
    const outcome = server.slice(outcomeStart, outcomeEnd);
    expect(outcome).toContain(
      "await markActivationEmailStatusAt(statusRef, { ...patch, status: deliveryStatus }, true);",
    );
    expect(server).toContain("}, deliveryRef, deliveryId);");
    expect(server).toContain(
      "if (!sent) throw new HttpsError('failed-precondition', 'gift_certificate_email_not_sent');",
    );
  });

  test("renders Gift Certificates as a standalone sibling of Promo Codes while preserving the promo list", () => {
    const promoNav = live.indexOf("switchTab('promo-codes')");
    const giftNav = live.indexOf("switchTab('gift-certificates')", promoNav);
    const promoSectionStart = live.indexOf(
      '<div id="tab-promo-codes"',
    );
    const giftSectionStart = live.indexOf(
      '<div id="tab-gift-certificates"',
    );
    expect(promoNav).toBeGreaterThan(0);
    expect(giftNav).toBeGreaterThan(promoNav);
    expect(promoSectionStart).toBeGreaterThan(0);
    expect(giftSectionStart).toBeGreaterThan(promoSectionStart);

    const promoSection = live.slice(promoSectionStart, giftSectionStart);
    expect(promoSection).toContain('id="promo-codes-list"');
    expect(promoSection).not.toContain('id="tab-gift-certificates"');
    expect(live).toContain(
      "[document.getElementById('cp-promo-list'), document.getElementById('promo-codes-list')]",
    );
  });

  test("keeps the standalone Gift Certificates navigation keyboard-operable outside layout edit mode", () => {
    const giftNav =
      live.match(/<div id="admin-nav-gift-certificates"[^>]*>/)?.[0] || "";

    expect(giftNav).toContain('id="admin-nav-gift-certificates"');
    expect(giftNav).toContain('class="tab"');
    expect(giftNav).toContain("onclick=\"switchTab('gift-certificates')\"");
    expect(giftNav).toContain('role="button"');
    expect(giftNav).toContain('tabindex="0"');
    expect(giftNav).toContain("dataset.navEdit !== 'true'");
    expect(giftNav).toContain("event.key === 'Enter'");
    expect(giftNav).toContain("event.key === ' '");
    expect(giftNav).toContain("event.preventDefault()");
    expect(live).toMatch(
      /#admin-nav-gift-certificates:focus-visible\s*\{[^}]*outline:/,
    );
  });

  test("has labelled quantity/product/recipient inputs, preview confirmation, safe history and per-row download", () => {
    expect(live).toContain('for="gift-certificate-product"');
    expect(live).toContain('id="gift-certificate-product"');
    expect(live).toContain('for="gift-certificate-count"');
    expect(live).toContain('id="gift-certificate-count" min="1" max="200"');
    expect(live).toContain('for="gift-certificate-recipients"');
    expect(live).toContain('id="gift-certificate-recipients"');
    expect(live).toContain('id="gift-certificate-preview"');
    expect(live).toContain(
      "title: isRetry ? 'Повторить незавершённую операцию?' : 'Создать подарочные сертификаты?'",
    );
    expect(live).toContain('id="gift-certificates-history"');
    expect(live).toContain('id="gift-certificate-history-filter"');
    expect(live).toContain('<option value="inactive">Неактивные текущие</option>');
    expect(live).toContain('<option value="archive">Архив / история</option>');
    expect(live).toContain('id="gift-certificate-history-search"');
    expect(live).toContain('id="gift-personalization-recipient"');
    expect(live).toContain('id="gift-personalization-email"');
    expect(live).toContain(
      "Отправитель: текущий production sender Phraseman (WEB_CHECKOUT_EMAIL_FROM через Resend)",
    );
    expect(live).toContain(
      "window.downloadGiftCertificate = async function(certificateId)",
    );
    expect(live).toContain(
      "window.sendGiftCertificateEmail = async function(certificateId)",
    );
    expect(live).toContain(
      "await persistGiftCertificatePersonalization(certificateId, personalization)",
    );
    expect(live).toContain("record.activationCode");
    expect(live).toContain("record.assetUrl");
    expect(live).toContain("giftCertificateAssertAsset(record)");
    expect(live).toContain("canvas.toBlob");
    expect(live).toContain("download.data?.assetBase64");
    expect(live).toContain("atob(download.data.assetBase64)");
    expect(live).not.toContain(
      "return fetch(url, { method: 'GET', mode: 'cors'",
    );
    expect(live).toContain("giftCertificateFilterHistory(records)");
    expect(live).toContain("Показаны последние ${records.length} записей");
    expect(live).toContain("здесь не ищутся");
    expect(live).not.toContain("Используй серверный экспорт");
  });

  test("renders redacted archive rows truthfully and disables actions that require hidden secrets", () => {
    const rowSource = extractNamedFunction(live, "giftCertificateRowHtml");
    const rowHtml = new Function(
      `const GIFT_CERTIFICATE_ASSETS = {}; const GIFT_CERTIFICATE_PRODUCT_LABELS = {yearly:'Год'};\n`
        + `function giftCertificateActivationBlocksActions(){ return true; }\n`
        + `function giftCertificatePersonalizationIsLocked(){ return true; }\n`
        + `function giftCertificateDisplayPersonalization(){ return {showPersonalization:false}; }\n`
        + `function giftCertificateDate(value){ return String(value || ''); }\n`
        + `function escapeHtml(value){ return String(value ?? ''); }\n`
        + `${rowSource}\n`
        + `return giftCertificateRowHtml;`,
    )() as (record: Record<string, unknown>) => string;
    const redacted = rowHtml({
      publicId: "gift-archive-deadbeef",
      product: "yearly",
      archived: true,
      archiveReason: "deleted",
      activationStatus: "disabled",
      activationStatusLabel: "Удалён",
      createdAtMs: 1,
      archivedAtMs: 2,
      archiveSensitiveFields: "redacted",
    });
    expect(redacted).toContain("Код скрыт");
    expect(redacted).not.toContain("undefined");
    expect(redacted).not.toContain('data-gift-certificate-action="download"');
    expect(redacted).not.toContain('data-gift-certificate-action="send"');
    expect(redacted).not.toContain('data-gift-certificate-action="delete"');
  });

  test("places every non-active row in history and never renders delete without server canDelete", () => {
    const filterSource = extractNamedFunction(live, "giftCertificateFilterHistory");
    expect(filterSource).toContain("const historical = !active");
    expect(filterSource).toContain("filter === 'archive' && !historical");
    const rowSource = extractNamedFunction(live, "giftCertificateRowHtml");
    expect(rowSource).toContain("record.canDelete === true");
    expect(rowSource).not.toMatch(/deletedArchive \? '' : `<button[^`]*data-gift-certificate-action="delete"/);

    const filter = new Function(
      `const document={getElementById:(id)=>({value:id.includes('filter')?'archive':''})};\n${filterSource}\nreturn giftCertificateFilterHistory;`,
    )() as (records: Array<Record<string, unknown>>) => Array<Record<string, unknown>>;
    const records = [
      { certificateId: 'active', activationStatus: 'available', archived: false },
      { certificateId: 'redeemed', activationStatus: 'redeemed', archived: false },
      { certificateId: 'expired', activationStatus: 'expired', archived: false },
      { publicId: 'deleted', activationStatus: 'disabled', archived: true },
    ];
    expect(filter(records).map((record) => record.certificateId || record.publicId)).toEqual(['redeemed', 'expired', 'deleted']);
  });

  test("separates active certificates from the real archive and keeps counters searchable", () => {
    const filterSource = extractNamedFunction(live, "giftCertificateFilterHistory");
    expect(filterSource).toContain("activationStatus === 'available'");
    expect(filterSource).toContain("filter === 'archive' && !historical");
    expect(filterSource).toContain("filter === 'inactive'");
    expect(filterSource).toContain("gift-certificate-history-search");
    expect(live).toContain("Активные:");
    expect(live).toContain("Архив:");
    expect(server).toContain("GIFT_CERTIFICATE_ARCHIVE_COLLECTION");
    expect(server).toContain("gift-certificate-archive.v1");
    expect(firestoreRules).toContain("match /gift_certificate_archive/{document=**}");
    expect(firestoreRules).toContain("match /gift_certificate_deliveries/{document=**}");
    expect(firestoreRules).toContain("match /admin_gift_certificate_batch_operations/{document=**}");
    expect(firestoreRules).toContain("collection != 'gift_certificate_deliveries'");
    expect(firestoreRules).toContain("collection != 'admin_gift_certificate_batch_operations'");
    expect(firestoreRules).toContain("collection != 'gift_certificate_archive'");
    expect(jarvisContract).toContain("collection: 'gift_certificate_archive'");
  });

  test("requires manual-access permission for secret list fields and every code-bearing path", () => {
    const listStart = server.indexOf('export const adminListGiftCertificates = onCall(');
    const listEnd = server.indexOf('/** Deletes an unused certificate', listStart);
    const listHandler = server.slice(listStart, listEnd);
    expect(listHandler).toContain('giftCertificateListProjection');
    expect(listHandler).toContain("canViewSecrets: canReadManualAccessSecrets");
    const downloadStart = server.indexOf('export const adminGetGiftCertificateDownload = onCall(');
    const downloadEnd = server.indexOf('/** Saves recipient identity', downloadStart);
    const downloadHandler = server.slice(downloadStart, downloadEnd);
    expect(downloadHandler).toContain('assertGiftCertificateAdminAccess(request.auth');
    expect(downloadHandler).not.toContain('assertGiftCertificateAdminReadAccess(request.auth');
    const operationStart = server.indexOf('export const adminGetGiftCertificateBatchOperation = onCall(');
    const operationEnd = server.indexOf('/** Creates a fail-closed tombstone', operationStart);
    const operationHandler = server.slice(operationStart, operationEnd);
    expect(operationHandler).toContain('assertGiftCertificateAdminAccess(request.auth');
    expect(operationHandler).not.toContain('assertGiftCertificateAdminReadAccess(request.auth');
    expect(live).toContain("record.canViewSecrets !== true");
    expect(live).toContain("record.canDownload === true");
    expect(live).toContain("record.canSend === true");
    expect(live).toContain("record.canDelete === true");
    expect(live).toContain('Данные скрыты: требуется право ручного управления сертификатами');
  });

  test("stores no bearer code or recipient PII in any certificate audit document", () => {
    const auditMatches = [...server.matchAll(/action: 'gift_certificate_[^']+'/g)];
    expect(auditMatches.map((match) => match[0])).toEqual([
      "action: 'gift_certificate_batch_create'",
      "action: 'gift_certificate_delete'",
      "action: 'gift_certificate_replace_synthetic'",
      "action: 'gift_certificate_recipient_update'",
      "action: 'gift_certificate_personalization_update'",
    ]);
    for (const match of auditMatches) {
      const tsIndex = server.indexOf('ts:', match.index);
      const auditTail = server.slice(match.index, server.indexOf('\n', tsIndex));
      expect(auditTail).not.toMatch(/\b(?:certificateIds|certificateId|activationCode|oldCode|newCode|recipientEmail|giftTo|giftFrom)\b\s*[:,}]/);
    }
    const personalizationStart = server.indexOf('export function buildGiftCertificatePersonalizationUpdate');
    const auditStart = server.indexOf('const auditDetails = {', personalizationStart);
    const auditDetails = server.slice(auditStart, server.indexOf('return { patch', auditStart));
    expect(auditDetails).not.toMatch(/certificateId|recipientEmail\s*[,}]/);
    expect(auditDetails).toContain('recipientEmailSet');
  });

  test("binds gift search and filter through module listeners and keeps truncation in render state", () => {
    expect(live).not.toMatch(/id="gift-certificate-history-filter"[^>]*onchange=/);
    expect(live).not.toMatch(/id="gift-certificate-history-search"[^>]*oninput=/);
    expect(live).toContain("giftCertificateBindHistoryControls()");
    expect(live).toContain("addEventListener('change'");
    expect(live).toContain("addEventListener('input'");
    expect(live).toContain("let _giftCertificateHistoryTruncated = false;");
    const render = extractNamedFunction(live, 'giftCertificateRenderHistory');
    expect(render).toContain('_giftCertificateHistoryTruncated');

    const binderSource = extractNamedFunction(live, 'giftCertificateBindHistoryControls');
    const listeners: Record<string, () => void> = {};
    const element = (id: string) => ({
      dataset: {} as Record<string, string>,
      addEventListener: (event: string, callback: () => void) => { listeners[`${id}:${event}`] = callback; },
    });
    const filter = element('filter');
    const search = element('search');
    const execute = new Function(
      'rootDocument',
      `${binderSource}\nconst _giftCertificateRecords = new Map([['id', {certificateId:'id'}]]); let renders = 0; function giftCertificateRenderHistory(records){ if(records.length === 1) renders += 1; } giftCertificateBindHistoryControls(rootDocument); return () => renders;`,
    )({
      getElementById: (id: string) => id === 'gift-certificate-history-filter' ? filter : search,
    }) as () => number;
    listeners['filter:change']();
    listeners['search:input']();
    expect(execute()).toBe(2);
  });

  test("downloads the complete public-style certificate composition from canonical server display data", () => {
    const downloadStart = live.indexOf(
      "window.downloadGiftCertificate = async function(certificateId)",
    );
    const downloadEnd = live.indexOf(
      "window.replaceVerifiedSyntheticGiftCertificate",
      downloadStart,
    );
    const download = live.slice(downloadStart, downloadEnd);

    expect(downloadStart).toBeGreaterThan(0);
    expect(downloadEnd).toBeGreaterThan(downloadStart);
    expect(download).toContain("ПОДАРОЧНЫЙ СЕРТИФИКАТ");
    expect(download).toContain("Phraseman");
    expect(download).toContain(
      "giftCertificateDisplayPersonalization(canonical)",
    );
    expect(download).toContain(
      "giftCertificateDrawTextBlock(context, displayPersonalization.displayRecipientName",
    );
    expect(download).toContain(
      "`от ${displayPersonalization.displaySenderName}`",
    );
    expect(download).toContain("canonical.productTitle");
    expect(download).toContain("canonical.giftPhrase");
    expect(download).toContain("canonical.activationCode");
    expect(download).toContain("canonical.expiresAtMs");
    expect(download).toContain("giftCertificateDrawRoundedPanel");
    expect(download).toContain("giftCertificateDrawTextBlock");
    expect(download).toContain(
      "giftCertificateCanvasLayout(canvas.width, canvas.height, canonical.product)",
    );
    expect(download).toContain(
      "headerSmallTop, headerSmallFont, headerSmallLineHeight",
    );
    expect(download).toContain(
      "headerBrandTop, headerBrandFont, headerBrandLineHeight",
    );
    expect(download).toContain("context.font = `700 ${headerSmallFont}px");
    expect(download).toContain(
      "context.fillText('ПОДАРОЧНЫЙ СЕРТИФИКАТ', centerX, headerSmallTop)",
    );
    expect(download).toContain("context.font = `900 ${headerBrandFont}px");
    expect(download).toContain(
      "context.fillText('Phraseman', centerX, headerBrandTop)",
    );
    expect(download).not.toContain(
      "panelHeight = Math.round(canvas.height * .22)",
    );
    expect(download).not.toContain(
      "context.fillStyle = 'rgba(8, 12, 20, .88)'",
    );
  });

  test("renders plan-specific WebP certificate previews in a responsive 3:2 visual history", () => {
    expect(live).toMatch(
      /\.gift-cert-history\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
    expect(live).toMatch(
      /@media\s*\(max-width:\s*700px\)[\s\S]*?\.gift-cert-history\s*\{[^}]*grid-template-columns:\s*1fr/,
    );
    expect(live).toMatch(
      /\.gift-cert-visual\s*\{[^}]*aspect-ratio:\s*3\s*\/\s*2/,
    );
    expect(live).toContain('class="gift-cert-visual ${record.product');
    expect(live).toContain("record.assetUrl");
    expect(live).toContain("record.productTitle");
    expect(live).toContain("record.giftPhrase");
    expect(live).toContain("giftCertificateDisplayPersonalization(record)");
    expect(live).toContain("ПОДАРОЧНЫЙ СЕРТИФИКАТ");
    expect(live).toContain("Phraseman");
  });

  test("shows truthful text-and-badge activation and separate delivery status", () => {
    expect(live).toContain("record.activationStatusLabel");
    expect(live).toContain("record.activationStatus === 'redeemed'");
    expect(live).toContain("Дата активации не записана");
    expect(live).toContain("data-gift-activation-status");
    expect(live).toContain("data-gift-delivery-status");
    expect(live).toMatch(/\.gift-cert-badge[^}]*color:\s*#07110a/);
  });

  test("opens one accessible personalization modal before download/send with strict action order", () => {
    expect(live).toContain('id="gift-certificate-personalization-modal"');
    expect(live).toContain('role="dialog"');
    expect(live).toContain('aria-modal="true"');
    expect(live).toContain('id="gift-personalization-show-recipient"');
    expect(live).toContain('id="gift-personalization-show-sender"');
    expect(live).not.toContain('name="gift-certificate-personalization-mode"');
    expect(live).toContain('for="gift-personalization-recipient"');
    expect(live).toContain('for="gift-personalization-sender"');
    expect(live).toContain('for="gift-personalization-email"');
    expect(live).toContain('maxlength="60"');
    expect(live).toContain("event.key === 'Escape'");
    expect(live).toContain("event.key !== 'Tab'");
    expect(live).toContain(
      "giftCertificateHandleModalKey(event, focusable, document.activeElement",
    );
    expect(live).toContain(
      "querySelectorAll('button:not([disabled]), input:not([disabled])')",
    );
    expect(live).toContain(
      "giftCertificateOpenPersonalizationModal(certificateId, 'download')",
    );
    expect(live).toContain(
      "giftCertificateOpenPersonalizationModal(certificateId, 'send')",
    );
    expect(live).not.toMatch(
      /sendGiftCertificateEmail[\s\S]{0,1800}showConfirmModal\(/,
    );
  });

  test("forces every hidden personalization-modal phase out of layout without changing global admin visibility", () => {
    expect(live).toMatch(
      /\.gift-cert-modal\s+\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/,
    );
    expect(live).not.toMatch(
      /(?:^|\})\s*\[hidden\]\s*\{\s*display:\s*none\s*!important;/,
    );
  });

  test("executes the production personalization validator for named, anonymous, download and send payloads", () => {
    const validatorSource = extractNamedFunction(
      live,
      "giftCertificateValidatePersonalizationPayload",
    );
    const displaySource = extractNamedFunction(
      live,
      "giftCertificateDisplayPersonalization",
    );
    const { validate, display } = new Function(
      `${validatorSource}\n${displaySource}\nreturn { validate: giftCertificateValidatePersonalizationPayload, display: giftCertificateDisplayPersonalization };`,
    )() as {
      validate: (input: Record<string, unknown>) => Record<string, unknown>;
      display: (input: Record<string, unknown>) => Record<string, unknown>;
    };

    expect(() =>
      validate({
        action: "download",
        personalizationMode: "named",
        displayRecipientName: "",
        displaySenderName: "Даритель",
      }),
    ).toThrow();
    expect(() =>
      validate({
        action: "download",
        personalizationMode: "named",
        displayRecipientName: "Получатель",
        displaySenderName: "",
      }),
    ).toThrow();
    expect(() =>
      validate({
        action: "send",
        personalizationMode: "named",
        displayRecipientName: "Получатель",
        displaySenderName: "Даритель",
        recipientEmail: "",
      }),
    ).toThrow("Для отправки введи email");
    expect(
      validate({
        action: "download",
        personalizationMode: "anonymous",
        displayRecipientName: "",
        displaySenderName: "",
        recipientEmail: "",
        savedRecipientName: "Сохранённый получатель",
        savedSenderName: "Сохранённый даритель",
      }),
    ).toMatchObject({
      personalizationMode: "anonymous",
      displayRecipientName: "Сохранённый получатель",
      displaySenderName: "Сохранённый даритель",
      recipientEmail: "",
    });
    expect(
      display({
        personalizationMode: "anonymous",
        savedRecipientName: "Сохранённый получатель",
        savedSenderName: "Сохранённый даритель",
      }),
    ).toEqual({
      showRecipientName: false,
      showSenderName: false,
      showPersonalization: false,
      displayRecipientName: "",
      displaySenderName: "",
    });
    expect(
      display({
        personalizationMode: "named",
        savedRecipientName: "Сохранённый получатель",
        savedSenderName: "Сохранённый даритель",
      }),
    ).toEqual({
      showRecipientName: true,
      showSenderName: true,
      showPersonalization: true,
      displayRecipientName: "Сохранённый получатель",
      displaySenderName: "Сохранённый даритель",
    });
  });

  test("rerenders persisted canonical history between persistence and execution and skips it on cancellation", async () => {
    const guardSource = extractNamedFunction(
      live,
      "giftCertificateCreateBusyGuard",
    );
    const orchestratorSource = extractNamedFunction(
      live,
      "giftCertificateRunAction",
    );
    const { createGuard, runAction } = new Function(
      `${guardSource}\n${orchestratorSource}\nreturn { createGuard: giftCertificateCreateBusyGuard, runAction: giftCertificateRunAction };`,
    )() as {
      createGuard: () => { tryEnter: () => boolean; leave: () => void };
      runAction: (
        certificateId: string,
        action: string,
        dependencies: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>;
    };
    const calls: string[] = [];
    const guard = createGuard();
    const completed = await runAction("GIFT-7QW8E9R2TY", "download", {
      guard,
      openModal: async () => {
        calls.push("modal");
        return { personalizationMode: "named" };
      },
      persist: async () => {
        calls.push("persist");
        return { certificateId: "GIFT-7QW8E9R2TY" };
      },
      afterPersist: async () => {
        calls.push("render");
      },
      execute: async () => {
        calls.push("download");
      },
    });
    expect(calls).toEqual(["modal", "persist", "render", "download"]);
    expect(completed).toMatchObject({
      status: "completed",
      record: { certificateId: "GIFT-7QW8E9R2TY" },
    });

    calls.length = 0;
    const cancelled = await runAction("GIFT-7QW8E9R2TY", "send", {
      guard,
      openModal: async () => {
        calls.push("modal");
        return null;
      },
      persist: async () => {
        calls.push("persist");
      },
      afterPersist: async () => {
        calls.push("render");
      },
      execute: async () => {
        calls.push("send");
      },
    });
    expect(calls).toEqual(["modal"]);
    expect(cancelled).toEqual({ status: "cancelled" });
  });

  test("executes the production busy guard and rejects a second concurrent certificate action", async () => {
    const guardSource = extractNamedFunction(
      live,
      "giftCertificateCreateBusyGuard",
    );
    const orchestratorSource = extractNamedFunction(
      live,
      "giftCertificateRunAction",
    );
    const { createGuard, runAction } = new Function(
      `${guardSource}\n${orchestratorSource}\nreturn { createGuard: giftCertificateCreateBusyGuard, runAction: giftCertificateRunAction };`,
    )() as {
      createGuard: () => { tryEnter: () => boolean; leave: () => void };
      runAction: (
        certificateId: string,
        action: string,
        dependencies: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>;
    };
    let releaseAction!: () => void;
    const actionWait = new Promise<void>((resolve) => {
      releaseAction = resolve;
    });
    let executeCount = 0;
    const guard = createGuard();
    const dependencies = {
      guard,
      openModal: async () => ({ personalizationMode: "named" }),
      persist: async () => ({ certificateId: "GIFT-7QW8E9R2TY" }),
      execute: async () => {
        executeCount += 1;
        await actionWait;
      },
    };
    const first = runAction("GIFT-7QW8E9R2TY", "download", dependencies);
    await Promise.resolve();
    await Promise.resolve();
    await expect(
      runAction("GIFT-7QW8E9R2TY", "send", dependencies),
    ).resolves.toEqual({ status: "busy" });
    expect(executeCount).toBe(1);
    releaseAction();
    await expect(first).resolves.toMatchObject({ status: "completed" });
  });

  test("keeps one send modal mounted through summary, busy send, inline failure, retry, and double-click rejection", async () => {
    const guardSource = extractNamedFunction(
      live,
      "giftCertificateCreateBusyGuard",
    );
    const orchestratorSource = extractNamedFunction(
      live,
      "giftCertificateRunAction",
    );
    const { createGuard, runAction } = new Function(
      `${guardSource}\n${orchestratorSource}\nreturn { createGuard: giftCertificateCreateBusyGuard, runAction: giftCertificateRunAction };`,
    )() as {
      createGuard: () => { tryEnter: () => boolean; leave: () => void };
      runAction: (
        certificateId: string,
        action: string,
        dependencies: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>;
    };
    const calls: string[] = [];
    let mounted = true;
    let busy = false;
    let executeCount = 0;
    let releaseRetry!: (retry: boolean) => void;
    const retry = new Promise<boolean>((resolve) => {
      releaseRetry = resolve;
    });
    const guard = createGuard();
    const record = {
      certificateId: "GIFT-7QW8E9R2TY",
      personalizationMode: "named",
      savedRecipientName: "Recipient",
      savedSenderName: "Sender",
      recipientEmail: "recipient@example.com",
    };
    const dependencies = {
      guard,
      openModal: async () => {
        calls.push("collect");
        return { personalizationMode: "named" };
      },
      persist: async () => {
        calls.push("persist");
        return record;
      },
      afterPersist: async () => {
        calls.push("render");
      },
      setBusy: async (next: boolean) => {
        busy = next;
        calls.push(`busy:${next}`);
      },
      showSummary: async (saved: typeof record) => {
        expect(saved).toBe(record);
        expect(mounted).toBe(true);
        calls.push(`summary:${saved.recipientEmail}:named`);
      },
      confirm: async () => {
        calls.push(executeCount === 0 ? "confirm" : "confirm-retry");
        return executeCount === 0 ? true : retry;
      },
      execute: async () => {
        executeCount += 1;
        calls.push(`send:${executeCount}`);
        if (executeCount === 1) throw new Error("transport failed");
      },
      fail: async (error: Error) => {
        expect(mounted).toBe(true);
        calls.push(`error:${error.message}`);
      },
      complete: async () => {
        mounted = false;
        calls.push("close");
      },
    };

    const action = runAction(record.certificateId, "send", dependencies);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(calls).toEqual([
      "collect",
      "busy:true",
      "persist",
      "render",
      "summary:recipient@example.com:named",
      "busy:false",
      "confirm",
      "busy:true",
      "send:1",
      "busy:false",
      "error:transport failed",
      "confirm-retry",
    ]);
    expect(mounted).toBe(true);
    expect(busy).toBe(false);
    await expect(
      runAction(record.certificateId, "send", dependencies),
    ).resolves.toEqual({ status: "busy" });
    releaseRetry(true);
    await expect(action).resolves.toMatchObject({
      status: "completed",
      record,
    });
    expect(calls.slice(-4)).toEqual([
      "busy:true",
      "send:2",
      "close",
      "busy:false",
    ]);
    expect(mounted).toBe(false);
    expect(busy).toBe(false);
  });

  test("keeps the send modal open and retries personalization persistence before showing the final summary", async () => {
    const guardSource = extractNamedFunction(
      live,
      "giftCertificateCreateBusyGuard",
    );
    const orchestratorSource = extractNamedFunction(
      live,
      "giftCertificateRunAction",
    );
    const { createGuard, runAction } = new Function(
      `${guardSource}\n${orchestratorSource}\nreturn { createGuard: giftCertificateCreateBusyGuard, runAction: giftCertificateRunAction };`,
    )() as {
      createGuard: () => { tryEnter: () => boolean; leave: () => void };
      runAction: (
        certificateId: string,
        action: string,
        dependencies: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>;
    };
    const calls: string[] = [];
    let mounted = true;
    let persistCount = 0;
    let releaseRetry!: (value: Record<string, unknown> | null) => void;
    const retry = new Promise<Record<string, unknown> | null>((resolve) => {
      releaseRetry = resolve;
    });
    const record = {
      certificateId: "GIFT-7QW8E9R2TY",
      recipientEmail: "fixed@example.com",
    };
    const action = runAction(record.certificateId, "send", {
      guard: createGuard(),
      openModal: async () => ({ recipientEmail: "first@example.com" }),
      setBusy: async (busy: boolean) => {
        calls.push(`busy:${busy}`);
      },
      persist: async (
        _id: string,
        personalization: { recipientEmail: string },
      ) => {
        persistCount += 1;
        calls.push(`persist:${personalization.recipientEmail}`);
        if (persistCount === 1) throw new Error("save failed");
        return record;
      },
      retryPersonalization: async () => retry,
      fail: async (error: Error) => {
        expect(mounted).toBe(true);
        calls.push(`error:${error.message}`);
      },
      afterPersist: async () => {
        calls.push("render");
      },
      showSummary: async () => {
        calls.push("summary");
      },
      confirm: async () => true,
      execute: async () => {
        calls.push("send");
      },
      complete: async () => {
        mounted = false;
        calls.push("close");
      },
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(calls).toEqual([
      "busy:true",
      "persist:first@example.com",
      "busy:false",
      "error:save failed",
    ]);
    expect(mounted).toBe(true);
    releaseRetry({ recipientEmail: "fixed@example.com" });
    await expect(action).resolves.toMatchObject({
      status: "completed",
      record,
    });
    expect(calls).toContain("persist:fixed@example.com");
    expect(calls.indexOf("render")).toBeLessThan(calls.indexOf("summary"));
    expect(calls.indexOf("summary")).toBeLessThan(calls.indexOf("send"));
    expect(mounted).toBe(false);
  });

  test("executes Escape cancellation and Tab/Shift+Tab focus wrapping through the production key handler", () => {
    const handlerSource = extractNamedFunction(
      live,
      "giftCertificateHandleModalKey",
    );
    const handleKey = new Function(
      `${handlerSource}\nreturn giftCertificateHandleModalKey;`,
    )() as (
      event: Record<string, unknown>,
      focusable: Array<{ focus: () => void }>,
      activeElement: unknown,
      cancel: () => void,
    ) => string;
    const focused: string[] = [];
    const first = { focus: () => focused.push("first") };
    const middle = { focus: () => focused.push("middle") };
    const last = { focus: () => focused.push("last") };
    let prevented = 0;
    let cancelled = 0;
    const event = (key: string, shiftKey = false) => ({
      key,
      shiftKey,
      preventDefault: () => {
        prevented += 1;
      },
    });

    expect(
      handleKey(event("Tab"), [first, middle, last], last, () => {
        cancelled += 1;
      }),
    ).toBe("wrapped-forward");
    expect(
      handleKey(event("Tab", true), [first, middle, last], first, () => {
        cancelled += 1;
      }),
    ).toBe("wrapped-backward");
    expect(
      handleKey(event("Escape"), [first, middle, last], middle, () => {
        cancelled += 1;
      }),
    ).toBe("cancelled");
    expect(focused).toEqual(["first", "last"]);
    expect(prevented).toBe(3);
    expect(cancelled).toBe(1);
  });

  test("restores modal focus to the connected trigger, its rerendered equivalent, or a safe history fallback", () => {
    const restoreSource = extractNamedFunction(
      live,
      "giftCertificateRestorePersonalizationFocus",
    );
    const closeSource = extractNamedFunction(
      live,
      "giftCertificateClosePersonalizationModal",
    );
    const restoreFocus = new Function(
      `${restoreSource}\nreturn giftCertificateRestorePersonalizationFocus;`,
    )() as (
      previousFocus: { isConnected?: boolean; focus?: () => void } | null,
      descriptor: { certificateId?: string; action?: string } | null,
      rootDocument: { getElementById: (id: string) => unknown },
    ) => string;
    const focused: string[] = [];
    const replacement = { focus: () => focused.push("replacement") };
    const fallback = { focus: () => focused.push("fallback") };
    const row = {
      querySelector: (selector: string) => {
        expect(selector).toBe('[data-gift-certificate-action="send"]');
        return replacement;
      },
    };
    const rerenderedDocument = {
      getElementById: (id: string) =>
        id === "gift-cert-row-GIFT-7QW8E9R2TY"
          ? row
          : id === "gift-certificates-history-title"
            ? fallback
            : null,
    };

    expect(
      restoreFocus(
        { isConnected: false, focus: () => focused.push("stale") },
        { certificateId: "GIFT-7QW8E9R2TY", action: "send" },
        rerenderedDocument,
      ),
    ).toBe("replacement");
    expect(focused).toEqual(["replacement"]);

    focused.length = 0;
    expect(
      restoreFocus(
        { isConnected: true, focus: () => focused.push("original") },
        { certificateId: "GIFT-7QW8E9R2TY", action: "download" },
        rerenderedDocument,
      ),
    ).toBe("original");
    expect(focused).toEqual(["original"]);

    focused.length = 0;
    expect(
      restoreFocus(
        { isConnected: false, focus: () => focused.push("stale") },
        { certificateId: 'unsafe\"]', action: 'send\"]' },
        {
          getElementById: (id: string) =>
            id === "gift-certificates-history-title" ? fallback : null,
        },
      ),
    ).toBe("fallback");
    expect(focused).toEqual(["fallback"]);

    expect(closeSource).toContain(
      "giftCertificateRestorePersonalizationFocus(",
    );
    expect(live).toContain("data-gift-certificate-id=");
    expect(live).toContain('data-gift-certificate-action="download"');
    expect(live).toContain('data-gift-certificate-action="send"');
  });

  test("skips a disabled rerendered send trigger and focuses the history fallback", () => {
    const restoreSource = extractNamedFunction(
      live,
      "giftCertificateRestorePersonalizationFocus",
    );
    const restoreFocus = new Function(
      `${restoreSource}\nreturn giftCertificateRestorePersonalizationFocus;`,
    )() as (
      previousFocus: { isConnected?: boolean; focus?: () => void } | null,
      descriptor: { certificateId?: string; action?: string } | null,
      rootDocument: { getElementById: (id: string) => unknown },
    ) => string;
    const focused: string[] = [];
    const disabledReplacement = {
      disabled: true,
      isConnected: true,
      hidden: false,
      focus: () => focused.push("disabled-replacement"),
    };
    const fallback = { focus: () => focused.push("fallback") };
    const rootDocument = {
      getElementById: (id: string) => {
        if (id === "gift-cert-row-GIFT-7QW8E9R2TY") {
          return { querySelector: () => disabledReplacement };
        }
        return id === "gift-certificates-history-title" ? fallback : null;
      },
    };

    expect(
      restoreFocus(
        { isConnected: false, focus: () => focused.push("stale") },
        { certificateId: "GIFT-7QW8E9R2TY", action: "send" },
        rootDocument,
      ),
    ).toBe("fallback");
    expect(focused).toEqual(["fallback"]);
  });

  test("persists canonical personalization before action and revalidates download/send server-side", () => {
    expect(server).toContain(
      "export const GIFT_CERTIFICATE_PERSONALIZATION_UPDATE_AUTHORIZATION = 'UPDATE_GIFT_CERTIFICATE_PERSONALIZATION'",
    );
    expect(server).toContain(
      "export const adminUpdateGiftCertificatePersonalization = onCall(",
    );
    expect(server).toContain(
      "export function buildGiftCertificatePersonalizationUpdate(",
    );
    expect(server).toContain("expectedUpdatedAtMs");
    expect(server).toContain(
      "action: 'gift_certificate_personalization_update'",
    );
    expect(server).toContain("recipientEmailSet:");
    expect(server).not.toMatch(
      /gift_certificate_personalization_update[\s\S]{0,500}details:\s*\{[^}]*recipientEmail\s*[,}]/,
    );
    expect(live).toContain(
      "authorization: 'UPDATE_" + "GIFT_CERTIFICATE_PERSONALIZATION'",
    );
    expect(live).toContain(
      "await persistGiftCertificatePersonalization(certificateId, personalization)",
    );
    expect(live).toContain(
      "expectedUpdatedAtMs: Number(record.updatedAtMs || record.createdAtMs || 0)",
    );
  });

  test("keeps anonymous download geometry but omits both visible name lines", () => {
    const downloadStart = live.indexOf(
      "window.downloadGiftCertificate = async function(certificateId)",
    );
    const downloadEnd = live.indexOf(
      "window.replaceVerifiedSyntheticGiftCertificate",
      downloadStart,
    );
    const download = live.slice(downloadStart, downloadEnd);
    expect(download).toContain(
      "if (displayPersonalization.showPersonalization)",
    );
    expect(download).toContain("if (displayPersonalization.showSenderName)");
    expect(download).toContain(
      "giftCertificateDrawTextBlock(context, displayPersonalization.displayRecipientName",
    );
    expect(download).toContain(
      "`от ${displayPersonalization.displaySenderName}`",
    );
    expect(download).toContain("canonical.productTitle");
    expect(download).toContain("canonical.giftPhrase");
  });

  test("fits and wraps persisted recipient and sender names without browser-supplied display copy", () => {
    expect(live).toContain(
      "function giftCertificateFitCanvasText(context, text, options)",
    );
    expect(live).toContain("context.measureText(candidate).width");
    expect(live).toContain("maxLines: 2");
    expect(live).toContain('maxlength="60"');
    expect(server).toContain(
      "export function buildGiftCertificateDownloadDisplayRecord(",
    );
    expect(server).toContain(
      "resolveCanonicalGiftCertificatePhrase(product, record.giftPhraseId)",
    );
    expect(server).toMatch(/\bsenderName[:,]/);
    expect(server).toContain("productTitle: giftPlanTitle(product)");
    expect(server).toContain("giftPhrase: phrase.text");
    expect(server).toContain(
      "certificate: buildGiftCertificateDownloadDisplayRecord(",
    );
  });

  test("executes canvas fitting without dropping any character from an unbroken 60-character name", () => {
    const wrapSource = extractNamedFunction(
      live,
      "giftCertificateWrapCanvasText",
    );
    const fitSource = extractNamedFunction(
      live,
      "giftCertificateFitCanvasText",
    );
    const fit = new Function(
      `${wrapSource}\n${fitSource}\nreturn giftCertificateFitCanvasText;`,
    )() as (
      context: {
        font: string;
        measureText: (value: string) => { width: number };
      },
      text: string,
      options: Record<string, number>,
    ) => { lines: string[] };
    let fontSize = 20;
    const context = {
      get font() {
        return `${fontSize}px sans-serif`;
      },
      set font(value: string) {
        fontSize = Number(value.match(/([0-9.]+)px/)?.[1] || 20);
      },
      measureText(value: string) {
        return { width: Array.from(value).length * fontSize };
      },
    };
    const name = "Ж".repeat(60);
    const fitted = fit(context, name, {
      maxWidth: 60,
      maxLines: 2,
      startSize: 20,
      minSize: 12,
      lineHeight: 1.1,
    });

    expect(fitted.lines.join("")).toBe(name);
    fitted.lines.forEach((line) =>
      expect(context.measureText(line).width).toBeLessThanOrEqual(60),
    );
  });

  test.each([
    ["monthly", "rgba(255, 249, 238, .84)", "rgba(135, 48, 40, .15)"],
    ["yearly", "rgba(255, 251, 242, .82)", "rgba(89, 66, 19, .16)"],
    ["lifetime", "rgba(8, 14, 13, .84)", "rgba(222, 181, 92, .38)"],
  ])(
    "executes public-preview geometry and palette tokens for %s",
    (product, panel, border) => {
      const layoutSource = extractNamedFunction(
        live,
        "giftCertificateCanvasLayout",
      );
      const layoutFor = new Function(
        `${layoutSource}\nreturn giftCertificateCanvasLayout;`,
      )() as (
        width: number,
        height: number,
        plan: string,
      ) => Record<string, any>;
      const layout = layoutFor(1536, 1024, product);
      const publicPanelTopPx = 22 + 11.5 * 1.68 + 4 + 22 * 1.68 + 17;

      expect(layout.panelX / 1536).toBeCloseTo(22 / 520, 6);
      expect(layout.panelWidth / 1536).toBeCloseTo((520 - 44) / 520, 6);
      expect(layout.panelTop / 1024).toBeCloseTo(publicPanelTopPx / 360, 6);
      expect(layout.panelHeight / 1024).toBeCloseTo(
        1 - publicPanelTopPx / 360 - 22 / 360,
        6,
      );
      expect(layout.panelPaddingTop / 1024).toBeCloseTo(22 / 360, 4);
      expect(layout.panelPaddingX / 1536).toBeCloseTo(24 / 520, 4);
      expect(layout.panelPaddingBottom / 1024).toBeCloseTo(20 / 360, 4);
      expect(layout.headerSmallTop / 1024).toBeCloseTo(22 / 360, 6);
      expect(layout.headerSmallFont / 1024).toBeCloseTo(11.5 / 360, 6);
      expect(layout.headerSmallLineHeight / 1024).toBeCloseTo(
        (11.5 * 1.68) / 360,
        6,
      );
      expect(layout.headerBrandTop / 1024).toBeCloseTo(
        (22 + 11.5 * 1.68 + 4) / 360,
        6,
      );
      expect(layout.headerBrandFont / 1024).toBeCloseTo(22 / 360, 6);
      expect(layout.headerBrandLineHeight / 1024).toBeCloseTo(
        (22 * 1.68) / 360,
        6,
      );
      expect(layout.palette.panel).toBe(panel);
      expect(layout.palette.border).toBe(border);
    },
  );

  test("keeps repair explicit without publishing recipient PII or the one-off target", () => {
    expect(live).not.toContain("GIFT-TEST-FRNRYV23VS");
    expect(live).not.toContain("Simulated gift purchase; no payment; requested 2026-07-29");
    expect(live).not.toContain("badloar@gmail.com");
    expect(live).not.toContain("Профессор Лингман");
    expect(live).toMatch(/id="gift-repair-old-code"[^>]*value=""/);
    expect(live).toMatch(/id="gift-repair-email"[^>]*value=""/);
    expect(live).toContain(
      "REPLACE_VERIFIED_SYNTHETIC_NO_PAYMENT_GIFT_CERTIFICATE",
    );
    expect(live).toContain("SEND_PREPARED_GIFT_CERTIFICATE");
    const repairStart = live.indexOf(
      "window.replaceVerifiedSyntheticGiftCertificate = async function()",
    );
    const repairEnd = live.indexOf(
      "window.sendPreparedGiftCertificate = async function",
      repairStart,
    );
    expect(repairStart).toBeGreaterThan(0);
    expect(repairEnd).toBeGreaterThan(repairStart);
    expect(live.slice(repairStart, repairEnd)).not.toContain(
      "adminSendPreparedGiftCertificate",
    );
  });
});
