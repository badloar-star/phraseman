import { useCallback, useEffect, useRef, useState } from 'react';

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

type OpportunityIdentity = Readonly<{ accountScope: string; studyTarget: SoftUpsellStudyTarget }>;
type BoundOpportunity = Readonly<{ item: SoftUpsellOpportunity; identityKey: string }>;

function identityKey(identity: OpportunityIdentity): string {
  return `${identity.studyTarget}:${identity.accountScope}`;
}

const CONTEXT_BY_TRIGGER: Record<SoftUpsellCandidate['trigger'], SoftUpsellContext> = {
  first_lesson: 'first_lesson_success',
  free_lessons_complete: 'free_lessons_complete',
  weekly_review: 'weekly_review',
  second_ai_dialogue: 'dialog_repeat_success',
  streak_milestone: 'streak_milestone',
  repeated_training: 'trainer_repeat_success',
};

const TRIGGER_PRIORITY: Record<SoftUpsellCandidate['trigger'], number> = {
  free_lessons_complete: 6,
  second_ai_dialogue: 5,
  weekly_review: 4,
  streak_milestone: 3,
  first_lesson: 2,
  repeated_training: 1,
};

function signature(candidates: readonly SoftUpsellCandidate[]): string {
  return candidates
    .map(({ trigger, value, studyTarget }) => `${trigger}:${value}:${studyTarget}`)
    .sort()
    .join('|');
}

async function attemptTwice(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    await operation();
  }
}

export function useSoftUpsellOpportunity({
  candidates,
  accountScope,
  studyTarget,
  hasPremiumAccess,
}: Input): Result {
  const currentIdentityKey = identityKey({ accountScope, studyTarget });
  const currentIdentityKeyRef = useRef(currentIdentityKey);
  currentIdentityKeyRef.current = currentIdentityKey;
  const overlayOccupied = useOverlayOccupied();
  const targetCandidates = candidates.filter((candidate) => candidate.studyTarget === studyTarget);
  const candidateSignature = signature(targetCandidates);
  const stableCandidatesRef = useRef<{ signature: string; value: SoftUpsellCandidate[] } | null>(null);
  if (stableCandidatesRef.current?.signature !== candidateSignature) {
    stableCandidatesRef.current = {
      signature: candidateSignature,
      value: targetCandidates.map((candidate) => ({ ...candidate }))
        .sort((left, right) => TRIGGER_PRIORITY[right.trigger] - TRIGGER_PRIORITY[left.trigger]
          || (right.trigger === 'streak_milestone' ? right.value - left.value : 0)),
    };
  }
  const stableCandidates = stableCandidatesRef.current.value;
  const [boundOpportunity, setBoundOpportunity] = useState<BoundOpportunity | null>(null);
  const opportunityRef = useRef<BoundOpportunity | null>(null);
  const pendingDismissRef = useRef<BoundOpportunity | null>(null);
  const impressionCompletedRef = useRef(new Set<string>());
  const impressionInFlightRef = useRef(new Map<string, Promise<void>>());
  const dismissCompletedRef = useRef(new Set<string>());
  const dismissInFlightRef = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    let active = true;
    const run = async () => {
      setBoundOpportunity(null);
      opportunityRef.current = null;
      pendingDismissRef.current = null;
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
      const claimed = await claimSoftUpsell({ accountScope, studyTarget, canClaim: () => active });
      if (!active) return;
      if (!claimed) {
        await trackSoftUpsellEvent('soft_upsell_suppressed', {
          context: decision.opportunity.context, trigger: decision.opportunity.trigger,
          studyTarget, overlayOccupied, schemaVersion: 1, triggerValue: decision.opportunity.value,
          suppressionReason: 'session_cap',
        });
        return;
      }
      const bound = { item: decision.opportunity, identityKey: currentIdentityKey };
      opportunityRef.current = bound;
      setBoundOpportunity(bound);
      await trackSoftUpsellEvent('soft_upsell_eligible', {
        context: decision.opportunity.context, trigger: decision.opportunity.trigger,
        studyTarget, overlayOccupied, schemaVersion: 1, triggerValue: decision.opportunity.value,
      });
    };
    void run().catch(() => {});
    return () => { active = false; };
  }, [accountScope, candidateSignature, currentIdentityKey, hasPremiumAccess, overlayOccupied, stableCandidates, studyTarget]);

  const basePayload = useCallback((item: SoftUpsellOpportunity) => ({
    context: item.context,
    trigger: item.trigger,
    studyTarget: item.studyTarget,
    overlayOccupied,
    schemaVersion: 1 as const,
    triggerValue: item.value,
  }), [overlayOccupied]);

  const onImpression = useCallback(async () => {
    const bound = opportunityRef.current;
    if (!bound || bound.identityKey !== currentIdentityKey
      || currentIdentityKeyRef.current !== currentIdentityKey) return;
    const item = bound.item;
    if (impressionCompletedRef.current.has(item.milestoneId)) return;
    const existing = impressionInFlightRef.current.get(item.milestoneId);
    if (existing) return existing;
    const operation = (async () => {
      await attemptTwice(() => markSoftUpsellImpression(
        accountScope, studyTarget, item.context, item.milestoneId, Date.now(),
      ));
      await trackSoftUpsellEvent('soft_upsell_impression', { ...basePayload(item), destination: item.destination });
      impressionCompletedRef.current.add(item.milestoneId);
    })();
    impressionInFlightRef.current.set(item.milestoneId, operation);
    try {
      await operation;
    } finally {
      impressionInFlightRef.current.delete(item.milestoneId);
    }
  }, [accountScope, basePayload, currentIdentityKey, studyTarget]);

  const onDismiss = useCallback(async () => {
    const bound = opportunityRef.current ?? pendingDismissRef.current;
    if (!bound || bound.identityKey !== currentIdentityKey
      || currentIdentityKeyRef.current !== currentIdentityKey) return;
    const item = bound.item;
    if (dismissCompletedRef.current.has(item.milestoneId)) return;
    if (opportunityRef.current) {
      opportunityRef.current = null;
      pendingDismissRef.current = bound;
      setBoundOpportunity(null);
    }
    const existing = dismissInFlightRef.current.get(item.milestoneId);
    if (existing) return existing;
    const operation = (async () => {
      try {
        await attemptTwice(() => markSoftUpsellDismissed(accountScope, studyTarget, item.context, Date.now()));
        await trackSoftUpsellEvent('soft_upsell_dismiss', basePayload(item));
        dismissCompletedRef.current.add(item.milestoneId);
        if (pendingDismissRef.current?.item.milestoneId === item.milestoneId) pendingDismissRef.current = null;
      } catch {
        // The card is already hidden. A later session may evaluate it again because no cooldown was persisted.
      }
    })();
    dismissInFlightRef.current.set(item.milestoneId, operation);
    try {
      await operation;
    } finally {
      dismissInFlightRef.current.delete(item.milestoneId);
    }
  }, [accountScope, basePayload, currentIdentityKey, studyTarget]);

  const onCta = useCallback(async () => {
    const bound = opportunityRef.current;
    if (!bound || bound.identityKey !== currentIdentityKey
      || currentIdentityKeyRef.current !== currentIdentityKey) return;
    const item = bound.item;
    await trackSoftUpsellEvent('soft_upsell_cta', { ...basePayload(item), destination: item.destination });
  }, [basePayload, currentIdentityKey]);

  const opportunity = boundOpportunity?.identityKey === currentIdentityKey ? boundOpportunity.item : null;
  return { opportunity, onImpression, onDismiss, onCta };
}
