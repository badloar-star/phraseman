import type { Lang } from '../../constants/i18n';
import { paywallMHeadFor, type PaywallMHeadFacts, type PaywallMHeadKind } from './m/paywall_m_head';
import type { PaywallMPerson } from './m/paywall_m_model';

const isFact = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Retains only complete, entrance-specific M facts inside the shared C surface.
 * Generic progress copy must not override the contextual C benefit caption.
 */
export function paywallCFactCaption(
  enabled: boolean,
  kind: PaywallMHeadKind,
  lang: Lang,
  person: PaywallMPerson,
  facts: PaywallMHeadFacts,
): string | undefined {
  if (!enabled) return undefined;

  const parts: string[] = [];
  if (kind === 'dialog') {
    if (isFact(facts.dialogMinutes) && isFact(facts.dialogPhrases)) {
      parts.push(paywallMHeadFor(kind, lang, person, facts).kicker);
    }
    if (facts.correctionWas && facts.correctionNow) {
      parts.push(`${facts.correctionWas} → ${facts.correctionNow}`);
    }
  }

  return parts.filter(Boolean).join(' · ') || undefined;
}
