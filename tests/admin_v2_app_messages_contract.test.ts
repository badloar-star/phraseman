import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => {
  const file = path.join(root, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};

describe('Admin v2 native app messages workflow', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const capabilities = read('admin/v2/scripts/admin-capabilities.js');
  const functions = read('functions/src/admin_app_messages.ts');
  const index = read('functions/src/index.ts');
  const permissions = read('functions/src/admin/permissions.ts');

  test('uses a native Campaigns subpage under Application', () => {
    expect(capabilities).toContain("'app-messages': 'campaigns'");
    expect(core).toContain("campaigns: { title: 'Кампании'");
    expect(core).toContain('function renderCampaigns');
    expect(core).toContain("campaigns: 'application'");
    expect(core).toContain('data-action="load-app-messages"');
    expect(core).toContain('data-action="preview-app-message"');
    expect(core).toContain('data-action="publish-app-message"');
    expect(core).toContain('data-app-message-toggle');
  });

  test('keeps the complete message and poll creation contract behind preview', () => {
    expect(core).toContain('app-message-kind');
    expect(core).toContain('app-message-audience');
    expect(core).toContain('app-message-priority');
    expect(core).toContain('app-message-ttl-days');
    expect(core).toContain('app-message-title-ru');
    expect(core).toContain('app-message-body-ru');
    expect(core).toContain('app-message-poll-question-ru');
    expect(core).toContain('app-message-poll-option-${index + 1}');
    expect(core).toContain('app-message-reason');
    expect(core).toContain('function buildAppMessagePreview');
    expect(core).toContain('function sameAppMessagePayload');
    expect(core).toContain('Переводы на 8 языков');
    expect(core).not.toContain("addDoc(collection(db, 'app_messages')");
  });

  test('wires server-only list, create, edit, toggle, delete and cleanup commands', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListAppMessages')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminCreateAppMessage')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSetAppMessageActive')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminUpdateAppMessage')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminDeleteAppMessage')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminCleanupExpiredAppMessages')");
    expect(index).toContain('adminUpdateAppMessage');
    expect(index).toContain('adminDeleteAppMessage');
    expect(index).toContain('adminCleanupExpiredAppMessages');
    expect(permissions).toContain("| 'campaigns.read'");
    expect(permissions).toContain("| 'campaigns.write'");
    expect(functions).toContain('export function normalizeAppMessageCreateInput');
    expect(functions).toContain('export function normalizeAppMessageToggleInput');
    expect(functions).toContain('export function normalizeAppMessageUpdateInput');
    expect(functions).toContain('export function normalizeAppMessageDeleteInput');
    expect(functions).toContain("collection('app_messages')");
    expect(functions).toContain("collection('admin_log')");
    expect(functions).toContain('db.runTransaction');
    expect(functions).toContain('createAuditRecord');
    expect(functions).toContain('assertOperationActor');
    expect(functions).toContain('admin operation belongs to another actor');
    expect(functions).not.toContain(".catch(() => null)");
  });

  test('guards edit, delete and expired cleanup with preview, reason and explicit poll reset', () => {
    expect(core).toContain('data-app-message-edit');
    expect(core).toContain('data-app-message-delete');
    expect(core).toContain('data-action="preview-app-message-cleanup"');
    expect(core).toContain('resetPollEngagement');
    expect(core).toContain('Сообщение нужно сначала выключить');
    expect(core).toContain('Удалить сообщение и связанные данные');
    expect(core).toContain('Старый модуль сообщений');
    expect(core).toContain('title="Открыть старый модуль для Plus Survey и аварийной сверки"');
    expect(core).toContain('Профильный процесс');
    expect(functions).toContain('app_message_managed_by_special_workflow');
    expect(core).toContain('title="Сначала показать точное сообщение, аудиторию и срок без записи в production"');
    expect(core).toContain('Включить или выключить сообщение через серверную команду с причиной и audit log');
  });
});
