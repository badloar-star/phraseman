import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

function legacyInstructionLines(): string[] {
  const legacy = read('admin/legacy.html');
  const marker = 'const llmInstructions = [';
  const start = legacy.indexOf(marker);
  const end = legacy.indexOf("].join('\\n');", start);
  if (start < 0 || end < 0) throw new Error('legacy llmInstructions block not found');
  const literal = legacy.slice(start + marker.length - 1, end + 1);
  return Function(`"use strict"; return ${literal};`)() as string[];
}

function reportExportHelpers() {
  const source = read('admin/v2/scripts/admin-report-export.js').replace(/^export\s+/gm, '');
  return Function(`${source}\nreturn { LEGACY_REPORT_LLM_INSTRUCTION_LINES, buildReportClipboardText, chunkReportReferences, loadReportDocumentsInAdaptiveChunks };`)() as {
    LEGACY_REPORT_LLM_INSTRUCTION_LINES: string[];
    buildReportClipboardText: (input: Record<string, unknown>) => string;
    chunkReportReferences: (items: Array<{ source: string; id: string }>, chunkSize?: number) => Array<Array<{ source: string; id: string }>>;
    loadReportDocumentsInAdaptiveChunks: (
      items: Array<{ source: string; id: string }>,
      loadChunk: (chunk: Array<{ source: string; id: string }>) => Promise<Array<{ source: string; id: string; document: Record<string, unknown> }>>,
      chunkSize?: number,
    ) => Promise<Array<{ source: string; id: string; document: Record<string, unknown> }>>;
  };
}

describe('admin v2 complete report clipboard export', () => {
  test('copies the complete legacy instruction exactly, line for line', () => {
    expect(reportExportHelpers().LEGACY_REPORT_LLM_INSTRUCTION_LINES).toEqual(legacyInstructionLines());
  });

  test('preserves visible order, full copyText and the complete JSON document', () => {
    const { buildReportClipboardText } = reportExportHelpers();
    const firstCopyText = 'COPY TEXT SECOND\nответ пользователя без обрезки';
    const secondCopyText = 'COPY TEXT FIRST';
    const text = buildReportClipboardText({
      generatedAt: '2026-07-14T12:00:00.000Z',
      items: [
        { source: 'error_reports', id: 'second', rawStatus: 'new', createdAtMs: 200, category: 'grammar', context: { screen: 'quiz', dataId: 'p-2' }, users: { primaryUid: 'u-2' } },
        { source: 'error_reports', id: 'first', rawStatus: 'open', createdAtMs: 100, category: 'content', context: { screen: 'lesson', dataId: 'p-1' }, users: { primaryUid: 'u-1' } },
      ],
      documents: [
        { source: 'error_reports', id: 'first', document: { copyText: secondCopyText, comment: 'first document', nested: { value: 1 } } },
        { source: 'error_reports', id: 'second', document: { source: 'reported-by-client', copyText: firstCopyText, comment: 'second document', nested: { userAnswer: 'full answer' } } },
      ],
      filters: { source: 'error_reports', lane: 'open', rawStatus: '', uid: '', category: '', sinceDays: 7, grouping: 'lane' },
      hasNextPage: false,
      isTruncated: true,
    });

    expect(text).toContain('=== PHRASEMAN ERROR_REPORTS · EXPORT ===');
    expect(text.indexOf('id: second')).toBeLessThan(text.indexOf('id: first'));
    expect(text).toContain(firstCopyText);
    expect(text).toContain(secondCopyText);
    expect(text).toContain('--- полный документ (JSON) ---');
    expect(text).toContain('"userAnswer": "full answer"');
    expect(text).toContain('source: error_reports');
    expect(text).toContain('"source": "reported-by-client"');
    expect(text).toContain('"id": "second"');
    expect(text).toContain('сервер ограничил выборку; часть репортов могла не загрузиться');
  });

  test('chunks references without reordering or dropping reports', () => {
    const { chunkReportReferences } = reportExportHelpers();
    const refs = Array.from({ length: 205 }, (_, index) => ({ source: 'error_reports', id: `r-${index}` }));
    const chunks = chunkReportReferences(refs, 100);
    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 100, 5]);
    expect(chunks.flat()).toEqual(refs);
  });

  test('adaptively splits an oversized server chunk and preserves exact order', async () => {
    const { loadReportDocumentsInAdaptiveChunks } = reportExportHelpers();
    const refs = Array.from({ length: 5 }, (_, index) => ({ source: 'error_reports', id: `r-${index}` }));
    const callSizes: number[] = [];
    const documents = await loadReportDocumentsInAdaptiveChunks(refs, async (chunk) => {
      callSizes.push(chunk.length);
      if (chunk.length > 2) throw Object.assign(new Error('too large'), { code: 'functions/resource-exhausted' });
      return chunk.map((reference) => ({ ...reference, document: { copyText: reference.id } }));
    });

    expect(callSizes).toEqual([5, 2, 3, 1, 2]);
    expect(documents.map((entry) => entry.id)).toEqual(refs.map((entry) => entry.id));
  });
});

describe('admin v2 report export wiring', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const server = read('functions/src/admin_reports_center.ts');
  const index = read('functions/src/index.ts');

  test('loads complete documents only when the administrator presses copy', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminExportReportDocuments')");
    expect(firebase).toContain('exportReportDocuments: async (input)');
    expect(core).toContain('data-action="copy-all-reports"');
    expect(core).toContain('Скопировать все репорты');
    expect(core).toContain('navigator.clipboard.writeText');
    expect(core).toContain("authStillValid(authGeneration, 'reports.read')");
    expect(core).toContain("if (action === 'copy-all-reports')");
    expect(core.match(/visibleReportQueueItems\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(core).toContain("['idle', 'loading', 'error'].includes(state.reports.state)");
    expect(core).toContain('Дождитесь окончания загрузки репортов.');
    expect(core).toContain('Нет репортов в текущем фильтре.');

    const copyBlock = core.slice(core.indexOf('async function copyAllReports'), core.indexOf('async function updateReportStatus'));
    expect(copyBlock.indexOf('await actions.exportReportDocuments')).toBeLessThan(copyBlock.indexOf("authStillValid(authGeneration, 'reports.read')"));
    expect(copyBlock.lastIndexOf("authStillValid(authGeneration, 'reports.read')", copyBlock.indexOf('await navigator.clipboard.writeText'))).toBeGreaterThan(copyBlock.indexOf('buildReportClipboardText'));
  });

  test('keeps export read-only, bounded and permission checked on the server', () => {
    expect(server).toContain('export const adminExportReportDocuments = onCall');
    expect(server).toContain("requireReportPermission(request as { auth?: { uid?: string; token?: Row } }, 'reports.read')");
    expect(server).toContain("hasPermission(context.role, 'diagnostics.read')");
    expect(server).toContain('MAX_EXPORT_REFERENCES');
    expect(index).toContain('adminExportReportDocuments');
    const exportBlock = server.slice(server.indexOf('export const adminExportReportDocuments'), server.indexOf('export const adminUpdateReportStatus'));
    expect(exportBlock).not.toContain('.set(');
    expect(exportBlock).not.toContain('.update(');
    expect(exportBlock).not.toContain('.create(');
    expect(exportBlock).not.toContain('runTransaction');
    expect(exportBlock).not.toContain("collection('admin_log')");
  });
});
