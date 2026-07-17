const LEVELS = new Set(['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const AVAILABILITY = new Set(['', 'active', 'removed']);

export function createArenaQuestionPoolState() {
  return { state: 'idle', questions: [], error: '', filters: { level: '', availability: '', topicArtifactId: '' } };
}

export function readArenaQuestionPoolFilters(document) {
  const level = String(document.getElementById('arena-pool-level')?.value ?? '').trim();
  const availability = String(document.getElementById('arena-pool-availability')?.value ?? '').trim();
  const topicArtifactId = String(document.getElementById('arena-pool-topic')?.value ?? '').trim();
  if (!LEVELS.has(level) || !AVAILABILITY.has(availability) || topicArtifactId.length > 500) throw new Error('Проверьте фильтры пула вопросов.');
  return { level, availability, topicArtifactId };
}

export async function loadArenaQuestionPool({ actions, filters }) {
  const result = await actions.adminListArenaQuestionPool({ limit: 100, ...filters });
  const questions = Array.isArray(result?.questions) ? result.questions : [];
  return { state: questions.length ? 'ready' : 'empty', questions, error: '', filters };
}

export async function publishArenaQuestionBatch({ actions, stageId, expectedReviewFingerprint, arenaDraftSealed }) {
  if (!arenaDraftSealed || !/^[a-f0-9]{64}$/i.test(expectedReviewFingerprint)) throw new Error('Для публикации нужна заново проверенная запечатанная одобренная пачка.');
  if (!globalThis.confirm('Добавить все 10 вопросов этой одобренной пачки в пул Арены? В матчи попадут только опубликованные вопросы.')) return null;
  return actions.adminPublishArenaQuestionBatch({ stageId, expectedReviewFingerprint });
}

export async function removeArenaPoolQuestion({ actions, questionId, expectedRevision, reason }) {
  if (!reason || reason.length > 500) throw new Error('Укажите понятную причину снятия вопроса из пула.');
  if (!globalThis.confirm('Убрать вопрос из выдачи матчей? Вопрос сохранится и его можно будет вернуть отдельным действием.')) return null;
  return actions.adminRemoveArenaPoolQuestion({ questionId, expectedRevision, reason });
}

export async function restoreArenaPoolQuestion({ actions, questionId, expectedRevision }) {
  if (!globalThis.confirm('Вернуть вопрос в выдачу матчей? Сервер проверит текущую ревизию.')) return null;
  return actions.adminRestoreArenaPoolQuestion({ questionId, expectedRevision, reason: '' });
}
