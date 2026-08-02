import type { AppTier } from './app_tier';
import { tierAbsoluteThresholdMultiplier } from './app_tier';
import { buildDecision, type Decision, type DecisionTrigger } from './decision';
import type { FetchQualitySourceResult } from './quality_firestore_fetcher';
import { aggregateQualityRows, buildQualityEvidence } from './quality_source_reader';

/**
 * Департамент «Качество» — первый департамент Джарвиса (решение владельца
 * 2026-08-01). Читает error_reports/user_reports/app_errors, решает, есть ли
 * скачок жалоб/крашей, и если да — строит Decision. Департаменты не общаются
 * между собой: департамент только пишет решения, ничего никому не шлёт.
 *
 * зачем appTier: владелец 2026-08-02 — «Качество» использует АБСОЛЮТНЫЙ порог
 * (число репортов), поэтому он растёт с тиром (tierAbsoluteThresholdMultiplier),
 * в отличие от процентного порога «Денег». Без явного тира считаем 'seed' —
 * самый строгий порог, отсутствие данных о масштабе не делает департамент
 * более шумным по умолчанию.
 */

/** Базовый порог скачка: сколько репортов одной категории на одном экране за
 * сутки уже не укладывается в фоновый шум — масштабируется по тиру. */
const CATEGORY_SCREEN_SPIKE_THRESHOLD = 15;

export interface RunQualityDepartmentInput {
  readonly fetches: readonly FetchQualitySourceResult[];
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface RunQualityDepartmentResult {
  readonly decisions: readonly Decision[];
}

interface Spike {
  readonly category: string;
  readonly screen: string;
  readonly count: number;
}

/**
 * Возвращает самую крупную комбинацию category×screen, но только если она
 * пересекает порог фонового шума. Без порога любое единичное «typo» на
 * «home» рождало бы решение — а это шум, а не сигнал.
 */
function findTopSpike(fetches: readonly FetchQualitySourceResult[], appTier: AppTier): Spike | null {
  const threshold = CATEGORY_SCREEN_SPIKE_THRESHOLD * tierAbsoluteThresholdMultiplier(appTier);
  let best: Spike | null = null;
  for (const fetch of fetches) {
    const counts = new Map<string, number>();
    for (const row of fetch.rows) {
      const category = row.category ?? 'unknown';
      const screen = row.screen ?? 'unknown';
      const key = `${category}::${screen}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of counts) {
      if (count < threshold) continue;
      if (best && count <= best.count) continue;
      const [category, screen] = key.split('::');
      best = { category, screen, count };
    }
  }
  return best;
}

function buildFindingText(spike: Spike | null, fetches: readonly FetchQualitySourceResult[]): string {
  if (spike) {
    return `За последние сутки замечено ${spike.count} репортов категории "${spike.category}" на экране "${spike.screen}" — это выше обычного фона.`;
  }
  const total = fetches.reduce((sum, fetch) => sum + aggregateQualityRows(fetch.rows).totalCount, 0);
  return total > 0
    ? `За последние сутки поступило ${total} репортов, без явного скачка по одной категории или экрану.`
    : 'За последние сутки новых репортов о качестве не поступало.';
}

export function runQualityDepartment(input: RunQualityDepartmentInput): RunQualityDepartmentResult {
  const evidence = input.fetches.map((fetch) => buildQualityEvidence({
    sourceId: fetch.sourceId,
    state: fetch.state,
    truncated: fetch.truncated,
    droppedCount: fetch.droppedCount,
    rows: fetch.rows,
    observedAtMs: fetch.observedAtMs,
  }));

  const appTier: AppTier = input.appTier ?? 'seed';
  const spike = findTopSpike(input.fetches, appTier);
  const anyTrustworthy = evidence.some((item) => item.trustworthy);

  // зачем: по расписанию департамент молчит, если нет ни скачка, ни владельческого
  // вопроса — иначе он писал бы решение каждые сутки просто потому, что запустился.
  const shouldDecide = input.trigger === 'owner_request' || Boolean(spike) || !anyTrustworthy;
  if (!shouldDecide) return { decisions: [] };

  const finding = buildFindingText(spike, input.fetches);
  const question = input.question ?? (spike
    ? `Растут ли жалобы категории "${spike.category}" на экране "${spike.screen}"?`
    : 'Есть ли аномалии в качестве за последние сутки?');

  const decision = buildDecision({
    department: 'quality',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: spike
      ? `Вероятная причина — недавнее изменение на экране "${spike.screen}", затрагивающее категорию "${spike.category}".`
      : 'Недостаточно данных для гипотезы.',
    options: spike
      ? [
        { title: 'Откатить последнее изменение на этом экране', cost: 1, risk: 'low' },
        { title: 'Точечно исправить причину без отката', cost: 5, risk: 'medium' },
      ]
      : [
        { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
        { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
      ],
    recommendation: spike ? 'Откатить последнее изменение на этом экране' : 'Продолжить наблюдение без вмешательства',
    risk: spike ? 'Откат может вернуть ранее исправленную проблему' : 'Пропустить начало скачка, если он появится позже',
    cost: spike ? 1 : 0,
    successMetric: spike
      ? `Число репортов категории "${spike.category}" на экране "${spike.screen}" возвращается к фоновому уровню`
      : 'Отсутствие новых скачков в следующем суточном снапшоте',
    rollback: 'Вернуть предыдущую сборку экрана',
    evidence,
    nowMs: input.nowMs,
  });

  return { decisions: [decision] };
}
