const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'admin/v2/legacy.html'), 'utf8');

test('community ideas use section-scoped compact rows instead of the global report-card layout', () => {
  assert.match(html, /#tab-ideas \.idea-admin-row/);
  assert.match(html, /\.idea-admin-row-main/);
  assert.match(html, /\.idea-admin-row-likes/);
  assert.match(html, /\.idea-admin-row-status/);
  assert.match(html, /\.idea-admin-row-action/);
  assert.match(html, /@media\(max-width:760px\)/);

  const renderStart = html.indexOf('function renderAdminIdeaList(ideas)');
  const renderEnd = html.indexOf('// Обновляет визуальный бейдж', renderStart);
  const renderSource = html.slice(renderStart, renderEnd);

  assert.ok(renderStart > -1);
  assert.ok(renderEnd > renderStart);
  assert.match(renderSource, /class="idea-admin-row"/);
  assert.match(renderSource, /class="idea-admin-row-action"/);
  assert.ok(renderSource.includes("setUserIdeaLifecycleStatus('${id}','in_progress',this)"));
  assert.doesNotMatch(renderSource, /class="report-card" role="button"/);
  assert.doesNotMatch(renderSource, /style="display:flex;align-items:center;gap:14px/);
});

test('compact rows keep keyboard opening and all operational data', () => {
  assert.ok(html.includes("onkeydown=\"if(event.key==='Enter'||event.key===' ')renderAdminIdeaDetail('${id}')\""));
  assert.ok(html.includes('data-idea-uid="${uid}"'));
  assert.ok(html.includes('${Math.max(0, Number(r.likeCount || 0))}'));
  assert.ok(html.includes('${ideaLifecycleLabel(status)}'));
  assert.ok(html.includes('${reportBadge}'));
  assert.ok(html.includes("setUserIdeaLifecycleStatus('${escapeHtml(ideaId)}','in_progress',this)"));
  assert.ok(html.includes("setUserIdeaLifecycleStatus('${escapeHtml(ideaId)}','implemented',this)"));
  assert.ok(html.includes("restoreFlaggedUserIdea('${escapeHtml(ideaId)}',this)"));
});
