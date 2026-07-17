import { parseManagerTaskResult, type ManagerTaskResult } from './contracts';

type AnalyticsFacts = Readonly<{
  reports: Readonly<{ total: number; open: number }>;
  appErrors: Readonly<{ total: number; critical: number }>;
  revenue: Readonly<{ newPaying: number; refunds: number; paywallPurchases: number }>;
  sourceCoverage: readonly Readonly<{ sourceId: string; status: 'ok' | 'partial' | 'failed'; rowCount: number; truncated: boolean }>[];
}>;

function count(value: number): number { return Number.isSafeInteger(value) && value >= 0 ? value : 0; }

/** Builds an aggregate-only recommendation. It never receives or returns source rows. */
export function buildAnalyticsDecisionBrief(input: AnalyticsFacts): ManagerTaskResult {
  const partial = input.sourceCoverage.filter((source) => source.status !== 'ok' || source.truncated).length;
  const sentences = [
    `За период: репортов ${count(input.reports.total)}, открытых ${count(input.reports.open)}, критических ошибок ${count(input.appErrors.critical)} из ${count(input.appErrors.total)}.`,
    `Платежные сигналы: новых оплат ${count(input.revenue.newPaying)}, возвратов ${count(input.revenue.refunds)}, завершений воронки ${count(input.revenue.paywallPurchases)}.`,
    partial ? `Данные неполные: ${partial} источник(а) требуют проверки перед решением.` : 'Источники доступны без отмеченных ограничений.',
    'Это аналитическая рекомендация для ручной проверки; никаких изменений, отправок или публикаций не выполнено.',
  ];
  return parseManagerTaskResult({ summary: sentences.join(' '), outcome: 'needs_review' });
}
