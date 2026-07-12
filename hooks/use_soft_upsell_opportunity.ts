import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { trackSoftUpsellEvent } from '../app/analytics';
import {
  decideSoftUpsell,
  type SoftUpsellCandidate,
  type SoftUpsellContext,
  type SoftUpsellOpportunity,
  type SoftUpsellStudyTarget,
} from '../app/soft_upsell_core';
import { getSoftUpsellEnabledByTrigger } from '../app/remote_flags';
import {
  claimSoftUpsell,
  markSoftUpsellDismissed,
  markSoftUpsellImpression,
  readSoftUpsellState,
} from '../app/soft_upsell_state';
import { useOverlayOccupied } from '../components/OverlayArbiter';

type Input = {
  candidates: readonly SoftUpsellCandidate[];
  accountScope: string;
  studyTarget: SoftUpsellStudyTarget;
  hasPremiumAccess: boolean;
};

type Result = {
  opportunity: SoftUpsellOpportunity | null;
  onImpression: () => Promise<void>;
  onDismiss: () => Promise<void>;
  onCta: () => Promise<void>;
};

const CONTEXT_BY_TRIGGER: Record<SoftUpsellCandidate['trigger'], SoftUpsellContext> = {
  first_lesson: 'first_lesson_success',
  free_lessons_complete: 'free_lessons_complete',
  weekly_review: 'weekly_review',
  second_ai_dialogue: 'dialog_repeat_success',
  streak_milestone: 'streak_milestone',
  repeated_training: 'trainer_repeat_success',
};

function signature(candidates: readonly SoftUpsellCandidate[]): string {
  return candidates
    .map(({ trigger, value, studyTarget }) => `${trigger}:${value}:${studyTarget}`)
    .sort()
    .join('|');
}

export function useSoftUpsellOpportunity({
  candidates,
  accountScope,
  studyTarget,
  hasPremiumAccess,
}: Input): Result {
  const overlayOccupied = useOverlayOccupied();
  const candidateSignature = signature(candidates);
  // The signature intentionally provides value semantics for caller-created arrays.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableCandidates = useMemo(() => candidates.map((candidate) => ({ ...candidate })), [candidateSignature]);
  const [opportunity, setOpportunity] = useState<SoftUpsellOpportunity | null>(null);
  const opportunityRef = useRef<SoftUpsellOpportunity | null>(null);
  const impressionRef = useRef<string | null>(null);
  const dismissRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setOpportunity(null);
      opportunityRef.current = null;
      const persisted = await readSoftUpsellState(accountScope, studyTarget);
      if (!active) return;
      const decision = decideSoftUpsell({
        candidates: stableCandidates,
        hasPremiumAccess,
        enabled: getSoftUpsellEnabledByTrigger(),
        overlayOccupied,
        sessionClaimed: false,
        nowMs: Date.now(),
        lastGlobalImpressionMs: persisted.lastGlobalImpressionMs,
        contextDismissedAtMs: persisted.contextDismissedAtMs,
        consumedMilestones: persisted.consumedMilestones,
      });
      const candidate = stableCandidates[0];
      if (decision.status === 'suppressed') {
        if (candidate) {
          await trackSoftUpsellEvent('soft_upsell_suppressed', {
            context: CONTEXT_BY_TRIGGER[candidate.trigger], trigger: candidate.trigger,
            studyTarget, overlayOccupied, schemaVersion: 1, triggerValue: candidate.value,
            suppressionReason: decision.reason,
          });
        }
        return;
      }
      const claimed = await claimSoftUpsell({ accountScope, studyTarget });
      if (!active) return;
      if (!claimed) {
        await trackSoftUpsellEvent('soft_upsell_suppressed', {
          context: decision.opportunity.context, trigger: decision.opportunity.trigger,
          studyTarget, overlayOccupied, schemaVersion: 1, triggerValue: decision.opportunity.value,
          suppressionReason: 'session_cap',
        });
        return;
      }
      opportunityRef.current = decision.opportunity;
      setOpportunity(decision.opportunity);
      await trackSoftUpsellEvent('soft_upsell_eligible', {
        context: decision.opportunity.context, trigger: decision.opportunity.trigger,
        studyTarget, overlayOccupied, schemaVersion: 1, triggerValue: decision.opportunity.value,
      });
    };
    void run().catch(() => {});
    return () => { active = false; };
  }, [accountScope, candidateSignature, hasPremiumAccess, overlayOccupied, stableCandidates, studyTarget]);

  const basePayload = useCallback((item: SoftUpsellOpportunity) => ({
    context: item.context,
    trigger: item.trigger,
    studyTarget: item.studyTarget,
    overlayOccupied,
    schemaVersion: 1 as const,
    triggerValue: item.value,
  }), [overlayOccupied]);

  const onImpression = useCallback(async () => {
    const item = opportunityRef.current;
    if (!item || impressionRef.current === item.milestoneId) return;
    impressionRef.current = item.milestoneId;
    await markSoftUpsellImpression(accountScope, studyTarget, item.context, item.milestoneId, Date.now());
    await trackSoftUpsellEvent('soft_upsell_impression', { ...basePayload(item), destination: item.destination });
  }, [accountScope, basePayload, studyTarget]);

  const onDismiss = useCallback(async () => {
    const item = opportunityRef.current;
    if (!item || dismissRef.current === item.milestoneId) return;
    dismissRef.current = item.milestoneId;
    await markSoftUpsellDismissed(accountScope, studyTarget, item.context, Date.now());
    await trackSoftUpsellEvent('soft_upsell_dismiss', basePayload(item));
  }, [accountScope, basePayload, studyTarget]);

  const onCta = useCallback(async () => {
    const item = opportunityRef.current;
    if (!item) return;
    await trackSoftUpsellEvent('soft_upsell_cta', { ...basePayload(item), destination: item.destination });
  }, [basePayload]);

  return { opportunity, onImpression, onDismiss, onCta };
}
