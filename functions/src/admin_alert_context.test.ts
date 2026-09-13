import { enrichAdminAlertContext, type AlertContextInput, type AlertSourceRow } from './admin_alert_context';
import { renderAdminAlertMessages } from './admin_alert_privacy';

function fixture(rows: Record<string, AlertSourceRow>) {
  const paths: string[] = [];
  return { paths, read: async (path: string) => { paths.push(path); return rows[path] ?? null; } };
}
const input: AlertContextInput = { eventType: 'contentReport', source: 'legacy.content_report', sourceId: 'report-1', payload: { category: 'free_text', uidLast4: '7ee3', route: '#reports' } };

test('hydrates report text and event version with canonical numbered nickname instead of stale name or UID', async () => {
  const db = fixture({ 'error_reports/report-1': { uid: 'stable-1', userName: 'Old name', appVersion: '1.6.15', buildNumber: '215', platform: 'ios', comment: 'Не работает кнопка', dataText: 'I <like> & you', userAnswer: 'like', screen: 'practice_runes', diagnostics: { secret: 'PRIVATE-TIMELINE' } },
    'users/stable-1': { progress: { user_name: 'Виталий 3' }, appVersion: '9.9.9' } });
  const payload = await enrichAdminAlertContext(input, db.read);
  const message = renderAdminAlertMessages({ ...input, payload, occurredAtMs: 1725000000000 }).join('\n');
  expect(payload.nickname).toBe('Виталий 3');
  expect(payload.appVersion).toBe('1.6.15');
  expect(payload.buildNumber).toBe('215');
  expect(message).toContain('Не работает кнопка');
  expect(message).toContain('I &lt;like&gt; &amp; you');
  expect(message).toContain('practice_runes');
  expect(message).not.toMatch(/7ee3|stable-1|9\.9\.9|PRIVATE-TIMELINE/);
});

test('distinguishes reporter from reported user by their canonical unique names', async () => {
  const db = fixture({ 'user_reports/r1': { reporterUid: 'reporter', reportedUid: 'target', reason: 'offensive_nickname', appVersion: '1.6.15' },
    'users/reporter': { progress: { user_name: 'Анна 8' } }, 'users/target': { progress: { user_name: 'Гость 123' } } });
  const payload = await enrichAdminAlertContext({ ...input, eventType: 'userReport', source: 'legacy.user_report', sourceId: 'r1' }, db.read);
  expect(payload.nickname).toBe('Анна 8');
  expect(payload.relatedNickname).toBe('Гость 123');
  expect(payload.relatedRole).toBe('На кого жалоба');
  expect(payload.details).toContainEqual({ label: 'Причина', value: 'offensive_nickname' });
});

test('resolves auth UID through auth_links without mutating accounts', async () => {
  const db = fixture({ 'feedback_entries/f1': { uid: 'auth-1', message: 'Тихий звук', entityLabel: 'Travel 3', rating: 4, appVersion: '1.6.15' },
    'auth_links/auth-1': { stable_id: 'stable-1' }, 'users/stable-1': { progress: { user_name: 'Анна 8' } } });
  const payload = await enrichAdminAlertContext({ ...input, eventType: 'lessonRating', source: 'feedback.rating', sourceId: 'f1' }, db.read);
  expect(payload.nickname).toBe('Анна 8');
  expect(payload.details).toContainEqual({ label: 'Отзыв', value: 'Тихий звук' });
  expect(payload.details).toContainEqual({ label: 'Урок / сессия', value: 'Travel 3' });
});

test('live auth link takes precedence over an obsolete direct auth-user profile', async () => {
  const db = fixture({
    'feedback_entries/f1': { uid: 'auth-1', message: 'Тихий звук' },
    'users/auth-1': { progress: { user_name: 'Старый профиль 1' } },
    'auth_links/auth-1': { stable_id: 'stable-1' },
    'users/stable-1': { progress: { user_name: 'Текущий ник 8' } },
  });
  const payload = await enrichAdminAlertContext({ ...input, eventType: 'lessonRating', source: 'feedback.rating', sourceId: 'f1' }, db.read);
  expect(payload.nickname).toBe('Текущий ник 8');
  expect(JSON.stringify(payload)).not.toContain('Старый профиль 1');
});

test('an explicit stable event identity wins over a different auth UID in that event', async () => {
  const db = fixture({
    'app_errors/e1': { uid: 'auth-1', stableUid: 'stable-1', message: 'Ошибка', appVersion: '1.6.15' },
    'users/auth-1': { progress: { user_name: 'Старый профиль 1' } },
    'users/stable-1': { progress: { user_name: 'Текущий ник 8' } },
  });
  const payload = await enrichAdminAlertContext({ ...input, eventType: 'criticalError', source: 'app.error', sourceId: 'e1' }, db.read);
  expect(payload.nickname).toBe('Текущий ник 8');
});

test('all event families render their available language rather than silently discarding it', () => {
  const text = renderAdminAlertMessages({ eventType: 'lessonRating', occurredAtMs: 1725000000000,
    payload: { nickname: 'Анна 8', appVersion: '1.6.15', language: 'ru', rating: 4 } }).join('');
  expect(text).toContain('Язык: <b>ru</b>');
});

test('does not invent event version from current profile version', async () => {
  const db = fixture({ 'revenuecat_premium_events/r1': { uid: 'u1', productId: 'yearly', expirationAtMs: 1800000000000 },
    'users/u1': { progress: { user_name: 'Алексей 2' }, appVersion: '99.9.9' } });
  const payload = await enrichAdminAlertContext({ ...input, eventType: 'premiumPurchase', source: 'revenuecat.receipt', sourceId: 'r1' }, db.read);
  expect(payload.nickname).toBe('Алексей 2');
  expect(payload.appVersion).not.toBe('99.9.9');
  expect(payload.versionContext).toBe('server');
});

test('does not let untrusted source IDs choose an arbitrary Firestore path', async () => {
  const db = fixture({});
  await enrichAdminAlertContext({ ...input, sourceId: '../../private/secrets' }, db.read);
  expect(db.paths).toEqual([]);
});

test('keeps deleted profile identity hidden instead of resurrecting a stored display name', async () => {
  const db = fixture({ 'error_reports/report-1': { uid: 'deleted-1', userName: 'Private old name' },
    'users/deleted-1': { identityHidden: true, progress: { user_name: 'Private old name' } } });
  const result = await enrichAdminAlertContext(input, db.read);
  expect(result.nickname).toBeUndefined();
});

test('new-user delivery waits for initial nickname registration, not an ID-only message', async () => {
  const db = fixture({ 'users/new1': { progress: {} } });
  await expect(enrichAdminAlertContext({ eventType: 'newUser', source: 'user.created', sourceId: 'new1', payload: {} }, db.read)).rejects.toThrow('new_user_nickname_pending');
});

test('a user who never chooses a nickname is still reported on attempt four', async () => {
  const db = fixture({ 'users/new1': { progress: {} } });
  for (const attempts of [1, 2, 3]) await expect(enrichAdminAlertContext({ eventType: 'newUser', source: 'user.created', sourceId: 'new1', payload: {}, attempts }, db.read)).rejects.toThrow('new_user_nickname_pending');
  const payload = await enrichAdminAlertContext({ eventType: 'newUser', source: 'user.created', sourceId: 'new1', payload: {}, attempts: 4 }, db.read);
  const message = renderAdminAlertMessages({ eventType: 'newUser', occurredAtMs: 1725000000000, payload }).join('');
  // зачем: владелец 2026-09-13 убрал заглушки — письмо уходит без строки о нике,
  // но само событие доставляется (правило «на 4-й попытке отправляем» живо).
  expect(message).toContain('НОВЫЙ ЧЕЛОВЕК В PHRASEMAN');
  expect(message).not.toContain('ник не найден');
  expect(message).not.toContain('new1');
});

test('an unlinked event-supplied name is not promoted to verified account identity', async () => {
  const db = fixture({ 'telegram_premium_orders/o1': { appNickname: 'Someone else 3', totalAmount: 500 } });
  const result = await enrichAdminAlertContext({ eventType: 'premiumPurchase', source: 'telegram.paid_order', sourceId: 'o1:purchase:123', payload: {} }, db.read);
  expect(result.nickname).toBeUndefined();
  expect(result.details).toContainEqual({ label: 'Ник в событии', value: 'Someone else 3' });
});

test('retired mistake explanations load their correct source, not phrase cache', async () => {
  const db = fixture({ 'mistake_explanations/hash1': { phraseEn: 'I am here', userAnswer: 'I is here', explanationText: 'Use am with I' } });
  const result = await enrichAdminAlertContext({ eventType: 'explanationReport', source: 'explanation.retired', sourceId: 'hash1', payload: { category: 'mistake:ru' } }, db.read);
  expect(result.details).toContainEqual({ label: 'Контент', value: 'Use am with I' });
});

test.each([
  ['newIdea', 'user_ideas.created', 'idea1', 'user_ideas/idea1', { uid: 'u1', title: 'Улучшение', description: 'Полное описание' }, 'Описание', 'Полное описание'],
  ['websiteInbox', 'website_contact_inbox.created', 'c1', 'website_contact_inbox/c1', { message: 'Письмо с сайта', topic: 'Вопрос' }, 'Сообщение', 'Письмо с сайта'],
  ['supportEmail', 'support_inbox.created', 'm1', 'support_inbox/m1', { bodyText: 'Полный текст письма', subject: 'Помогите' }, 'Сообщение', 'Полный текст письма'],
  ['ugcSubmission', 'community_pack_submissions.created', 's1', 'community_pack_submissions/s1', { authorStableId: 'u1', payload: { titleRu: 'Животные', cards: [{}, {}] } }, 'Набор', 'Животные'],
  ['cancelReason', 'subscription_cancel_surveys.created', 's1', 'subscription_cancel_surveys/s1', { uid: 'u1', reason: 'other', reasonText: 'Не хватает времени', appVersion: '1.6.15' }, 'Комментарий', 'Не хватает времени'],
  ['pushJob', 'push.job_terminal', 'p1:error', 'admin_push_jobs/p1', { notification: { title: 'Привет', body: 'Пора учиться' }, error: 'push_failed' }, 'Сообщение', 'Пора учиться'],
  ['appMessagePublished', 'app_message.published', 'p1:published', 'app_messages/p1', { titleRu: 'Вопрос', messageRu: 'Расскажите нам', poll: { questionRu: 'Как дела?', options: [{ textRu: 'Хорошо' }, { textRu: 'Отлично' }] } }, 'Варианты ответа', 'Хорошо\nОтлично'],
  ['jarvisCritical', 'jarvis.critical_plan', 'p1:hash1', 'jarvis_plans/p1', { finding: 'Возросли ошибки входа', recommendation: 'Проверить провайдера' }, 'Рекомендация', 'Проверить провайдера'],
  ['safetyFlag', 'safety.flag', 's1', 'safety_flags/s1', { uid: 'u1', userText: 'Нужна помощь', historyContext: [{ content: 'HIDDEN-HISTORY' }] }, 'Текст пользователя', 'Нужна помощь'],
] as const)('%s retains its actual source body and details', async (eventType, source, sourceId, path, data, label, value) => {
  const db = fixture({ [path]: data, 'users/u1': { progress: { user_name: 'Анна 8' } } });
  const result = await enrichAdminAlertContext({ eventType, source, sourceId, payload: {} }, db.read);
  expect(result.details).toContainEqual({ label, value });
  expect(JSON.stringify(result)).not.toContain('HIDDEN-HISTORY');
});

test('keeps all long owner-requested text in valid bounded HTML parts, with identity on every part', () => {
  const text = 'Очень длинный отзыв <&> 😀\n'.repeat(600);
  const messages = renderAdminAlertMessages({ eventType: 'contentReport', occurredAtMs: 1725000000000,
    payload: { nickname: 'Анна 8', appVersion: '1.6.15', details: [{ label: 'Текст репорта', value: text }] } });
  expect(messages.length).toBeGreaterThan(1);
  for (const message of messages) {
    expect(message.length).toBeLessThanOrEqual(4096);
    expect(message).toContain('Анна 8');
    expect(message).toContain('1.6.15');
    expect(message.match(/<b>/g)?.length).toBe(message.match(/<\/b>/g)?.length);
    expect(message).not.toMatch(/\uD83D(?!\uDE00)/u);
  }
  const chunks = messages.flatMap((message) => [...message.matchAll(/<b>Текст репорта(?: \(продолжение\))?:<\/b>\n<blockquote>([\s\S]*?)<\/blockquote>/g)].map((match) => match[1]));
  expect(chunks.join('').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim()).toBe(text.trim());
});
