import { type WordCategoryStat } from './phrase_analytics';

export type AnalyticsTrainerRouteParams = {
  mode: 'weak';
  source: 'analytics';
  category?: WordCategoryStat['category'];
  focusWords?: string;
  priority?: string;
  recovery?: string;
};

export function buildAnalyticsTrainerRouteParams(stat?: WordCategoryStat | null): AnalyticsTrainerRouteParams {
  const base: AnalyticsTrainerRouteParams = { mode: 'weak', source: 'analytics' };
  if (!stat) return base;

  const focusWords = [...new Set(stat.topWords.map(word => word.trim()).filter(Boolean))]
    .slice(0, 4)
    .join(',');

  return {
    ...base,
    category: stat.category,
    ...(focusWords ? { focusWords } : {}),
    priority: String(stat.priorityScore),
    recovery: String(stat.recoveryScore),
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
