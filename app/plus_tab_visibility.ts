// Governance-ID: TG-BF6A8ECE6C57
import { DebugLogger } from './debug-logger';

// зачем (слово владельца 05.11, макет plus_tab_approved_2026-11-05.html, «Правило вкладки»): вкладка Plus видна ТОЛЬКО пока в нижней панели
// 4 иконки И у человека нет подписки. Открылась пятая вкладка по рангу или куплен Plus/Ultra — вкладка Plus исчезает сразу, без перезапуска.
const LOG = '[PLUS-TAB]';

export type PlusTabTier = 'plus' | 'ultra' | null;

export type PlusTabDecision = Readonly<{
  visible: boolean;
  /** Почему: shown | hidden:has_subscription | hidden:tabs_not_4 (с числом в tabs). */
  reason: 'shown' | 'hidden:has_subscription' | 'hidden:tabs_not_4';
  /** Сколько иконок в панели БЕЗ вкладки Plus. */
  tabs: number;
  tier: PlusTabTier;
}>;

/** Чистое правило. `baseTabs` — число видимых иконок основной панели (без Plus). */
export function decidePlusTab(input: Readonly<{ baseTabs: number; tier: PlusTabTier }>): PlusTabDecision {
  const { baseTabs, tier } = input;
  if (tier !== null) return { visible: false, reason: 'hidden:has_subscription', tabs: baseTabs, tier };
  if (baseTabs !== 4) return { visible: false, reason: 'hidden:tabs_not_4', tabs: baseTabs, tier };
  return { visible: true, reason: 'shown', tabs: baseTabs, tier };
}

let lastSignature = '';

/** Одна строка на смену решения (рендер оболочки частый). Не бросает. */
export function logPlusTabDecision(decision: PlusTabDecision): void {
  try {
    const line = `tabs=${decision.tabs} tier=${decision.tier ?? 'none'} visible=${decision.visible} reason=${decision.reason}`;
    if (line === lastSignature) return;
    lastSignature = line;
    DebugLogger.info(LOG, line);
  } catch (error) {
    console.warn(LOG, 'log_failed', error instanceof Error ? error.message : String(error));
  }
}

export function __resetPlusTabLogForTests(): void {
  lastSignature = '';
}
