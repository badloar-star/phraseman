import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const html = readFileSync(path.join(repoRoot, 'admin/v2/legacy.html'), 'utf8');

function between(start: string, end: string): string {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return html.slice(from, to);
}

describe('Arena tournament v11 admin contract', () => {
  const card = between('id="tn-v11-review-card"', '<!-- зачем 2026-07-27');
  const handler = between('const TN_V11_POOL_VERSION', 'let _fnTnAiTournament');

  it('shows the live pool separately from the unpublished v11 review job', () => {
    expect(html).toContain('Текущий живой пул');
    expect(card).toContain('Проверка качества v11');
    expect(card).toContain('Не переключает живой пул');
    expect(card).not.toMatch(/активир|переключить пул|опубликовать v11/iu);
  });

  it('has one primary resume action and a secondary zero-write plan check', () => {
    expect(card).toContain('id="tn-v11-dry-run"');
    expect(card).toContain('Проверить план');
    expect(card).toContain('id="tn-v11-run"');
    expect(card).toContain('Начать / продолжить проверку v11');
    expect(card.match(/data-tn-v11-primary="true"/g)).toHaveLength(1);
    expect(handler).toContain("action: 'dry_run'");
    expect(handler).toContain("const exactReady = data.action !== 'dry_run'");
    expect(handler).toContain("data.continuation !== true");
    expect(handler).toContain('dryRun: true');
  });

  it('persists the stable job id, resumes sequentially, yields, and rejects double clicks', () => {
    expect(handler).toContain("const TN_V11_JOB_STORAGE_KEY = 'phraseman_tournament_v11_job_id'");
    expect(handler).toContain('localStorage.getItem(TN_V11_JOB_STORAGE_KEY)');
    expect(handler).toContain('localStorage.setItem(TN_V11_JOB_STORAGE_KEY, data.jobId)');
    expect(handler).toContain("action: 'run_batch'");
    expect(handler).toContain('jobId: tnV11StoredJobId() || undefined');
    expect(handler).toMatch(/while \(data\.continuation && !data\.paused && !data\.blocked && tnV11PageStillActive\(\)\)/u);
    expect(handler).toContain('await tnV11Yield();');
    expect(handler).toContain('if (_tnV11InFlight) return;');
    expect(handler).toContain('_tnV11InFlight = true;');
    expect(handler).toContain('_tnV11InFlight = false;');
  });

  it('renders every cell and the complete honest progress/budget vocabulary', () => {
    for (const field of [
      'cursor', 'totalCandidates', 'approved', 'rejected', 'quarantined',
      'cacheHits', 'providerAttempts', 'transientRetries', 'cells', 'shortages',
    ]) {
      expect(handler).toContain(`data.${field}`);
    }
    for (const label of [
      'Одобрено', 'Отклонено', 'Карантин', 'Из кэша', 'Запросов к проверке',
      'Повторных попыток', 'Недобор', 'Следующее действие',
    ]) {
      expect(handler).toContain(label);
    }
  });

  it('exposes accessible loading/error/paused states and never paints partial work ready', () => {
    expect(card).toContain('role="status"');
    expect(card).toContain('aria-live="polite"');
    expect(card).toContain('title="Проверить объём и недоборы без запуска проверки и без записи"');
    expect(card).toContain('title="Запустить или возобновить ограниченную проверку v11; живой пул не изменится"');
    expect(handler).toContain("data.state === 'ready'");
    expect(handler).toContain("data.state === 'paused'");
    expect(handler).toContain("data.state === 'blocked'");
    expect(handler).toContain('button.disabled = busy;');
    expect(handler).toContain("classList.toggle('tn-v11-ready', exactReady)");
    expect(handler).not.toContain('adminActivateTournament');
    expect(handler).not.toContain('runTextGeneration');
  });
});
