import { renderStageSpecificPreview, renderStudioWorkflow } from '../content-factory/stage-renderers.js';

const GENERATORS = Object.freeze([
  { id: 'lessons', title: 'Уроки', description: 'План, фразы, словарь, глаголы, предлоги и теория по отдельности.', defaultKind: 'lesson_outline' },
  { id: 'challenges', title: 'Вызовы', description: 'Отдельная тема и задания с собственным контрактом.', defaultKind: 'challenge_topic' },
  { id: 'flashcards', title: 'Карточки', description: 'Идея пака отдельно от генерации карточек.', defaultKind: 'flashcard_pack_idea' },
]);

const STAGE_LABELS = Object.freeze({
  lesson_outline: 'План урока', lesson_phrases: 'Фразы', lesson_vocabulary: 'Словарь', lesson_irregular_verbs: 'Неправильные глаголы', lesson_prepositions: 'Предлоги', lesson_theory: 'Теория',
  challenge_topic: 'Тема вызова', challenge_questions: 'Задания вызова', challenge_question_replacement: 'Замена задания вызова', flashcard_pack_idea: 'Идея пака', flashcard_items: 'Карточки', flashcard_item_replacement: 'Замена карточки',
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function stageOptions(selected, capabilities) {
  const allowed = new Set(Object.keys(capabilities || {}));
  return Object.entries(STAGE_LABELS).filter(([kind]) => allowed.has(kind)).map(([kind, label]) => `<option value="${kind}"${kind === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function stageRow(stage, canWrite) {
  const id = escapeHtml(stage.stageId ?? stage.id);
  const state = String(stage.state ?? 'queued');
  const controls = [];
  if (['queued', 'running'].includes(state)) controls.push(`<button class="button small" data-control-content-stage="pause" data-stage-id="${id}" type="button" title="Приостановить эту стадию"${canWrite ? '' : ' disabled'}>Пауза</button>`);
  if (['queued', 'failed'].includes(state) && (state !== 'failed' || stage.retryable === true)) controls.unshift(`<button class="button small primary" data-run-content-stage="${id}" type="button" title="${state === 'failed' ? 'Сделать новый provider attempt только для этой стадии' : 'Запустить первый provider attempt только для этой стадии'}"${canWrite ? '' : ' disabled'}>${state === 'failed' ? 'Повторить генерацию' : 'Сгенерировать'}</button>`);
  if (['needs_review', 'approved', 'rejected'].includes(state)) controls.unshift(`<button class="button small" data-preview-content-stage="${id}" type="button" title="Открыть неизменяемый результат и квитанцию качества">Предпросмотр</button>`);
  if (state === 'approved' && stage.kind === 'lesson_phrases') {
    for (const [kind, label] of [['lesson_vocabulary', 'Словарь'], ['lesson_irregular_verbs', 'Глаголы'], ['lesson_prepositions', 'Предлоги'], ['lesson_theory', 'Теория']]) controls.push(`<button class="button small" data-create-derived-lesson-stage="${kind}" data-prerequisite-stage-id="${id}" type="button" title="Создать отдельную стадию «${label}» только из этих одобренных фраз"${canWrite ? '' : ' disabled'}>${label}</button>`);
  }
  if (state === 'approved' && stage.kind === 'challenge_topic') controls.push(`<button class="button small primary" data-create-question-batch="challenge_questions" data-prerequisite-stage-id="${id}" type="button" title="Создать новую независимую пачку ровно из 10 вопросов по одобренной теме"${canWrite ? '' : ' disabled'}>10 вопросов</button>`);
  if (state === 'approved' && stage.kind === 'flashcard_pack_idea') controls.push(`<button class="button small primary" data-create-flashcard-batch="flashcard_items" data-prerequisite-stage-id="${id}" type="button" title="Создать новую независимую пачку из 10 карточек по одобренной идее"${canWrite ? '' : ' disabled'}>10 карточек</button>`);
  if (state === 'paused') controls.push(`<button class="button small" data-control-content-stage="resume" data-stage-id="${id}" type="button" title="Снять паузу без нового provider attempt; генерация запускается отдельно"${canWrite ? '' : ' disabled'}>Продолжить без генерации</button>`);
  if (['queued', 'running', 'paused', 'failed'].includes(state)) controls.push(`<button class="button small danger" data-control-content-stage="cancel" data-stage-id="${id}" type="button" title="Отменить только эту стадию"${canWrite ? '' : ' disabled'}>Отменить</button>`);
  const draftOnly = String(stage.kind ?? '').startsWith('challenge_') ? ' · только черновик, не подключено к приложению' : '';
  const partialProgress = Number(stage.acceptedCount) > 0 && Number(stage.missingCount) > 0
    ? (stage.kind === 'lesson_phrases' ? ` · Сохранено фраз: ${Number(stage.acceptedCount)}, осталось: ${Number(stage.missingCount)}` : ` · Сохранено карточек: ${Number(stage.acceptedCount)}, осталось: ${Number(stage.missingCount)}`)
    : '';
  const errorDetails = state === 'failed' && (stage.errorCode || stage.errorMessage) ? `<div class="notice danger section" role="alert"><strong>${escapeHtml(stage.errorCode || 'generation_failed')}</strong><p>${escapeHtml(stage.errorMessage || 'Генерация не завершилась.')}</p><small>${stage.retryable === true ? 'Ошибка временная: можно повторить только эту стадию.' : 'Повтор заблокирован до изменения входных данных.'}</small></div>` : '';
  return `<article class="list-row"><div><strong>${escapeHtml(STAGE_LABELS[stage.kind] ?? stage.kind)}</strong><small><code>${id}</code> · ${escapeHtml(state)} · количество: ${Number(stage.resolvedCount ?? stage.count ?? 0)}${partialProgress}${draftOnly}</small>${errorDetails}</div><div class="actions">${controls.join('')}</div></article>`;
}

function questionReplacementButtons(preview, canWrite) {
  const kind = String(preview?.stage?.kind ?? '');
  const state = String(preview?.stage?.state ?? '');
  if (kind !== 'challenge_questions' || state !== 'approved' || !Array.isArray(preview?.payload?.items)) return '';
  const batchStageId = escapeHtml(preview.stage.stageId ?? preview.stage.id);
  return `<div class="section"><h4>Заменить один вопрос</h4><div class="actions">${preview.payload.items.map((item, index) => `<button class="button small" data-create-question-replacement="challenge_question_replacement" data-batch-stage-id="${batchStageId}" data-question-id="${escapeHtml(item?.id)}" type="button" title="Создать отдельную replacement-стадию только для вопроса ${index + 1}"${canWrite ? '' : ' disabled'}>Вопрос ${index + 1}</button>`).join('')}</div></div>`;
}

function flashcardReplacementButtons(preview, canWrite) {
  if (String(preview?.stage?.kind ?? '') !== 'flashcard_items' || String(preview?.stage?.state ?? '') !== 'approved' || !Array.isArray(preview?.payload?.items)) return '';
  const batchStageId = escapeHtml(preview.stage.stageId ?? preview.stage.id);
  return `<div class="section"><h4>Заменить одну карточку</h4><div class="actions">${preview.payload.items.map((item, index) => `<button class="button small" data-create-flashcard-replacement="flashcard_item_replacement" data-batch-stage-id="${batchStageId}" data-card-id="${escapeHtml(item?.id)}" type="button" title="Создать отдельную стадию замены только для карточки ${index + 1}"${canWrite ? '' : ' disabled'}>Карточка ${index + 1}</button>`).join('')}</div></div>`;
}

export function renderContentGeneratorShell(model) {
  const selectedGenerator = String(model.selectedGenerator ?? 'lessons');
  const selectedKind = String(model.kind ?? 'lesson_outline');
  const fixedCount = selectedKind === 'lesson_phrases' ? 50 : selectedKind === 'challenge_questions' ? 10 : (selectedKind.endsWith('_replacement') ? 1 : null);
  const selectedCount = fixedCount ?? Number(model.count ?? 1);
  const stages = Array.isArray(model.stages) ? model.stages : [];
  const readiness = model.readiness ?? { state: 'idle', metrics: null, error: '' };
  const metrics = readiness.metrics;
  const partialNotice = metrics?.isPartial
    ? `<div class="notice warning" role="status"><strong>Выборка неполная</strong><p>Показана только ограниченная часть документов. Расширение запуска заблокировано: rolloutEligible=${escapeHtml(String(metrics.rolloutEligible))}. Stages: ${Number(metrics.samples?.stages?.returned || 0)}, legacy units: ${Number(metrics.samples?.units?.returned || 0)}, jobs: ${Number(metrics.samples?.jobs?.returned || 0)}.</p></div>`
    : '';
  const readinessBody = readiness.state === 'loading'
    ? '<div class="notice" role="status">Загружаем ограниченную выборку метрик…</div>'
    : readiness.state === 'error'
      ? `<div class="notice danger" role="alert"><strong>Метрики не загружены</strong><p>${escapeHtml(readiness.error || 'Сервер не вернул данные.')}</p></div>`
      : readiness.state === 'ready' && metrics
        ? `${partialNotice}<dl class="metric-grid"><div><dt>Попыток · всего</dt><dd>${Number(metrics.attemptCount || 0)}</dd></div><div><dt>Новые stages / legacy units</dt><dd>${Number(metrics.populations?.staged?.attemptCount || 0)} / ${Number(metrics.populations?.legacy?.attemptCount || 0)}</dd></div><div><dt>Принято артефактов</dt><dd>${Number(metrics.acceptedArtifactCount || 0)}</dd></div><div><dt>Попыток на принятый</dt><dd>${Number(metrics.attemptsPerAcceptedArtifact || 0)}</dd></div><div><dt>QA passed / failed</dt><dd>${Number(metrics.qa?.passed || 0)} / ${Number(metrics.qa?.failed || 0)}</dd></div><div><dt>Исправления оператором</dt><dd>${metrics.operatorCorrection?.status === 'unavailable_not_collected' ? 'Не собирается' : `${Math.round(Number(metrics.operatorCorrectionRate || 0) * 100)}%`}</dd></div><div><dt>Задержка p50 / p95</dt><dd>${Number(metrics.latencyMs?.p50 || 0)} / ${Number(metrics.latencyMs?.p95 || 0)} мс</dd></div><div><dt>Резервы дневного лимита</dt><dd>${Number(metrics.budgetProxy?.reservedUnits || 0)} / ${Number(metrics.budgetProxy?.capUnits || 0)}</dd></div></dl><p class="hint">Окно: ${escapeHtml(new Date(Number(metrics.window?.fromMs || 0)).toLocaleString('ru-RU'))} — ${escapeHtml(new Date(Number(metrics.window?.toMs || 0)).toLocaleString('ru-RU'))}. Включены до 100 новых stages, 100 legacy units и 100 jobs. Резервы — это число реальных запросов к провайдеру из дневного cap, а не токены, деньги или выставленная стоимость.</p><pre class="code-preview">${escapeHtml(JSON.stringify(metrics.failuresByCategory || {}, null, 2))}</pre>`
        : '<div class="empty-state"><p>Метрики ещё не загружены. Запрос читает не более 100 стадий и 100 заданий.</p></div>';
  const html = `<section class="card section content-generator-shell"><div class="card-header"><div><h2>Независимый генератор контента</h2><p>Выберите только нужный результат. Успешные стадии не будут перегенерированы вместе с ошибочной.</p></div><span class="badge">Новая система</span></div><div class="card-body">
    <section class="section" aria-labelledby="content-readiness-title"><div class="actions" style="justify-content:space-between"><div><h3 id="content-readiness-title">Готовность контролируемого запуска</h3><p><strong>Deployment не выполнялся</strong></p></div><button class="button" data-action="load-content-readiness" type="button" title="Загрузить серверные метрики по ограниченной выборке документов">Обновить метрики</button></div>${readinessBody}<p><a href="#content" data-action="load-factory-jobs" title="Открыть активные релизы и доступные цели отката">Остановить запуск или открыть откат</a></p></section>
    <div class="capability-grid section">${GENERATORS.map((generator) => `<button class="capability-card${generator.id === selectedGenerator ? ' selected' : ''}" data-select-content-generator="${generator.id}" data-default-stage-kind="${generator.defaultKind}" type="button" title="Открыть генератор: ${escapeHtml(generator.title)}" aria-pressed="${generator.id === selectedGenerator}"><strong>${escapeHtml(generator.title)}</strong><small>${escapeHtml(generator.description)}</small></button>`).join('')}</div>
    ${renderStudioWorkflow(model)}
    <details class="section legacy-single-stage-form"><summary>Расширенная форма одной стадии</summary><div class="fields">
      <div class="field"><label for="content-stage-kind">Что сгенерировать</label><select id="content-stage-kind">${stageOptions(selectedKind, model.capabilities?.capabilities)}</select></div>
      <div class="field"><label for="content-stage-target">Изучаемый язык</label><input id="content-stage-target" value="${escapeHtml(model.studyTarget ?? 'fr')}" maxlength="12"></div>
      <div class="field"><label for="content-stage-source">Язык объяснений</label><input id="content-stage-source" value="${escapeHtml(model.sourceLocale ?? 'ru')}" maxlength="12"></div>
      <div class="field"><label for="content-stage-cefr">Уровень</label><select id="content-stage-cefr">${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => `<option value="${level}"${level === (model.cefr ?? 'A1') ? ' selected' : ''}>${level}</option>`).join('')}</select></div>
      <div class="field full"><label for="content-stage-objective">Направление и учебная цель</label><textarea id="content-stage-objective" maxlength="1000" placeholder="Например: знакомство и представление себя в неформальной ситуации">${escapeHtml(model.objective ?? '')}</textarea></div>
      <div class="field"><label for="content-stage-scope">Урок, тема или пак</label><input id="content-stage-scope" value="${escapeHtml(model.scopeId ?? 'lesson-1')}" maxlength="160" placeholder="lesson-1 или topic-travel"></div>
      <div class="field"><label for="content-stage-count">Количество</label><input id="content-stage-count" type="number" min="1" max="${selectedKind === 'flashcard_items' ? 20 : 1000}" value="${selectedCount}"${fixedCount !== null ? ' readonly aria-readonly="true"' : ''}><small class="hint">Пачка вопросов всегда содержит ровно 10 элементов. Артефакт фраз урока всегда содержит ровно 50 фраз. Карточки создаются пачками от 1 до 20.</small></div>
      <div class="field"><label for="content-stage-prerequisites">Одобренные зависимости</label><input id="content-stage-prerequisites" value="${escapeHtml(model.prerequisiteStageIds ?? '')}" placeholder="stage ID через запятую"><small class="hint">Производный раздел активируется только после одобрения основы. Для карточек можно вторым ID указать одобренные фразы выбранного урока — совпадения будут исключены.</small></div>
    </div>
    <div class="actions end section"><button class="button" data-action="load-content-stages" type="button" title="Обновить очередь независимых стадий">Обновить очередь</button><button class="button primary" data-action="create-content-stage" type="button" title="Создать только выбранную стадию"${model.canWrite ? '' : ' disabled'}>Создать стадию</button></div></details>
        <div class="section"><h3>Очередь стадий</h3>${model.isPartial ? '<div class="notice warning" role="status"><strong>Показана часть очереди.</strong><p>Загрузите следующую страницу, чтобы не принимать решение по неполным данным.</p></div>' : ''}<div class="data-list">${stages.length ? stages.map((stage) => stageRow(stage, model.canWrite)).join('') : '<div class="empty-state"><p>Стадий пока нет. Создайте первый отдельный черновик.</p></div>'}</div>${model.nextCursor ? '<div class="actions end"><button class="button" data-action="load-more-content-stages" type="button" title="Загрузить следующую страницу очереди без повторов">Загрузить ещё</button></div>' : ''}</div>
        ${model.preview ? `<div class="section"><h3>Проверка результата</h3>${String(model.preview.stage?.kind ?? '') === 'lesson_phrases' ? `<div class="notice" role="status"><strong>Checkpoint фраз завершён — структурная проверка</strong><p>Принято: ${Number(model.preview.stage?.acceptedCount || 0)} из 50. Осталось: ${Number(model.preview.stage?.missingCount || 0)}. Хеш: ${escapeHtml(model.preview.stage?.finalCheckpointHash || '—')}</p><p>Перед одобрением вручную проверьте грамматику и естественность английского, естественность русского перевода, совпадение смысла, уровень A2 и смысловые повторы. Теневой judge ниже — только подсказка и никогда не заменяет ручное решение.</p></div>` : ''}${String(model.preview.stage?.kind ?? '').startsWith('challenge_') ? '<div class="notice warning"><strong>Не подключено к приложению</strong><p>Challenge сохраняется только как проверяемый черновик и не может быть опубликован в runtime.</p></div>' : ''}${String(model.preview.stage?.kind ?? '').startsWith('flashcard_') ? '<div class="notice warning"><strong>Черновик с полными данными</strong><p>Текущий community consumer не сохраняет rich fields — примеры и заметки. Публикация заблокирована до совместимого адаптера.</p></div>' : ''}<pre class="code-preview">${escapeHtml(JSON.stringify(model.preview.payload ?? {}, null, 2))}</pre>${questionReplacementButtons(model.preview, model.canWrite)}${flashcardReplacementButtons(model.preview, model.canWrite)}<h4>Основание и исключения</h4><pre class="code-preview">${escapeHtml(JSON.stringify(model.preview.stage?.groundingReceipt ?? {}, null, 2))}</pre><h4>Квитанция качества</h4><pre class="code-preview">${escapeHtml(JSON.stringify(model.preview.qaReceipt ?? {}, null, 2))}</pre><h4>Теневой AI-судья — только рекомендация</h4><div class="notice ${model.preview.judgeReceipt?.status === 'advisory_pass' ? 'success' : 'warning'}" role="status"><strong>${model.preview.judgeReceipt?.status === 'advisory_pass' ? 'Серьёзных замечаний не найдено' : 'Нужна ручная проверка'}</strong><p>Судья не может одобрить или опубликовать материал. Статус: ${escapeHtml(model.preview.judgeReceipt?.status ?? 'ещё не запускался')}.</p></div><pre class="code-preview">${escapeHtml(JSON.stringify(model.preview.judgeReceipt ?? model.preview.stage?.judgeReceipt ?? {}, null, 2))}</pre><div class="field"><label for="content-stage-review-reason">Комментарий проверяющего</label><textarea id="content-stage-review-reason" maxlength="500" placeholder="Что именно проверено"></textarea></div><div class="actions end"><button class="button danger" data-review-content-stage="rejected" data-stage-id="${escapeHtml(model.preview.stage?.stageId ?? model.preview.stage?.id)}" type="button" title="Отклонить только эту стадию"${model.canPublish ? '' : ' disabled'}>Отклонить</button><button class="button primary" data-review-content-stage="approved" data-stage-id="${escapeHtml(model.preview.stage?.stageId ?? model.preview.stage?.id)}" type="button" title="Одобрить эту стадию и разрешить зависимые операции"${model.canPublish ? '' : ' disabled'}>Одобрить</button></div></div>` : ''}
  </div></section>`;
  const rendered = html.replace('<div class="section"><h3>Очередь стадий</h3>', '<div class="section"><div class="actions" style="justify-content:space-between"><h3>Очередь стадий</h3><button class="button" data-action="load-content-stages" type="button" title="Обновить очередь независимых стадий">Обновить очередь</button></div>')
    .replace('<div class="notice warning"><strong>Черновик с полными данными</strong><p>Текущий community consumer не сохраняет rich fields — примеры и заметки. Публикация заблокирована до совместимого адаптера.</p></div>', '<div class="notice success"><strong>Rich-карточки поддерживаются</strong><p>Примеры, заметки и все ссылки на источники сохраняются в community runtime. Старые клиенты продолжают читать совместимые базовые поля.</p></div>');
  if (!model.preview) return rendered;
  const rawPayload = `<pre class="code-preview">${escapeHtml(JSON.stringify(model.preview.payload ?? {}, null, 2))}</pre>`;
  return rendered.replace(rawPayload, renderStageSpecificPreview(model.preview, model));
}

export const CONTENT_GENERATOR_STAGE_LABELS = STAGE_LABELS;
