import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';

import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken } from '../app/account_generation';
import { trackSoftUpsellEvent } from '../app/analytics';
import {
  createSoftUpsellAttribution,
  softUpsellEventId,
  type SoftUpsellAttribution,
  type SoftUpsellMode,
} from '../app/soft_upsell_attribution';
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
import { useOverlayTryClaim, type OverlayLease } from '../components/OverlayArbiter';

type Input = {
  candidates: readonly SoftUpsellCandidate[];
  accountScope: string;
  studyTarget: SoftUpsellStudyTarget | null;
  hasPremiumAccess: boolean;
  mode?: SoftUpsellMode;
};

type Result = {
  opportunity: SoftUpsellOpportunity | null;
  attribution: SoftUpsellAttribution | null;
  onImpression: () => Promise<void>;
  onDismiss: () => Promise<void>;
  onCta: () => Promise<boolean>;
  onNavigationFailure: () => Promise<boolean>;
};

type BoundOpportunity = Readonly<{
  item: SoftUpsellOpportunity;
  identityKey: string;
  attribution: SoftUpsellAttribution;
  accountToken: AccountGenerationToken;
  lease: OverlayLease;
}>;

const CONTEXT_BY_TRIGGER: Record<SoftUpsellCandidate['trigger'], SoftUpsellContext> = {
  first_lesson: 'first_lesson_success', free_lessons_complete: 'free_lessons_complete',
  weekly_review: 'weekly_review', second_ai_dialogue: 'dialog_repeat_success',
  streak_milestone: 'streak_milestone', repeated_training: 'trainer_repeat_success',
};
const TRIGGER_PRIORITY: Record<SoftUpsellCandidate['trigger'], number> = {
  free_lessons_complete: 6, second_ai_dialogue: 5, weekly_review: 4,
  streak_milestone: 3, first_lesson: 2, repeated_training: 1,
};

function identityKey(accountScope: string, studyTarget: SoftUpsellStudyTarget | null): string {
  return `${studyTarget ?? 'unsupported'}:${accountScope}`;
}

function signature(candidates: readonly SoftUpsellCandidate[]): string {
  return candidates.map(({ trigger, value, studyTarget }) => `${trigger}:${value}:${studyTarget}`).sort().join('|');
}

async function attemptTwice(operation: () => Promise<void>): Promise<void> {
  try { await operation(); } catch { await operation(); }
}

function suppressionEventId(): string {
  return `${Crypto.randomUUID()}:suppressed`.slice(0, 80);
}

export function useSoftUpsellOpportunity({
  candidates, accountScope, studyTarget, hasPremiumAccess, mode = 'production',
}: Input): Result {
  const currentIdentity = identityKey(accountScope, studyTarget);
  const currentIdentityRef = useRef(currentIdentity);
  currentIdentityRef.current = currentIdentity;
  const tryClaimOverlay = useOverlayTryClaim();
  const targetCandidates = studyTarget
    ? candidates.filter((candidate) => candidate.studyTarget === studyTarget)
    : [];
  const candidateSignature = signature(targetCandidates);
  const stableCandidatesRef = useRef<{ signature: string; value: SoftUpsellCandidate[] } | null>(null);
  if (stableCandidatesRef.current?.signature !== candidateSignature) {
    stableCandidatesRef.current = {
      signature: candidateSignature,
      value: targetCandidates.map((candidate) => ({ ...candidate })).sort((left, right) => (
        TRIGGER_PRIORITY[right.trigger] - TRIGGER_PRIORITY[left.trigger]
        || (right.trigger === 'streak_milestone' ? right.value - left.value : 0)
      )),
    };
  }
  const stableCandidates = stableCandidatesRef.current.value;
  const [bound, setBound] = useState<BoundOpportunity | null>(null);
  const boundRef = useRef<BoundOpportunity | null>(null);
  const outcomeRef = useRef<'cta' | 'dismiss' | null>(null);
  const navigationHandoffRef = useRef<BoundOpportunity | null>(null);
  const impressionDoneRef = useRef(new Set<string>());
  const impressionInFlightRef = useRef(new Map<string, Promise<void>>());

  useEffect(() => {
    let active = true;
    const run = async () => {
      boundRef.current?.lease.release();
      boundRef.current = null;
      setBound(null);
      outcomeRef.current = null;
      if (!studyTarget) return;
      const activeStudyTarget = studyTarget;
      const persisted = await readSoftUpsellState(accountScope, activeStudyTarget);
      if (!active) return;
      const decision = decideSoftUpsell({
        candidates: stableCandidates,
        hasPremiumAccess,
        enabled: getSoftUpsellEnabledByTrigger(),
        overlayOccupied: false,
        sessionClaimed: false,
        nowMs: Date.now(),
        lastGlobalImpressionMs: mode === 'production' ? persisted.lastGlobalImpressionMs : null,
        contextDismissedAtMs: mode === 'production' ? persisted.contextDismissedAtMs : {},
        consumedMilestones: mode === 'production' ? persisted.consumedMilestones : [],
      });
      const candidate = stableCandidates[0];
      if (decision.status === 'suppressed') {
        if (candidate) void trackSoftUpsellEvent('soft_upsell_suppressed', {
          context: CONTEXT_BY_TRIGGER[candidate.trigger], trigger: candidate.trigger, studyTarget: activeStudyTarget,
          overlayOccupied: false, schemaVersion: 1, triggerValue: candidate.value,
          suppressionReason: decision.reason,
          event_id: suppressionEventId(),
        });
        return;
      }
      const lease = await tryClaimOverlay();
      if (!active) { lease?.release(); return; }
      if (!lease) {
        void trackSoftUpsellEvent('soft_upsell_suppressed', {
          context: decision.opportunity.context, trigger: decision.opportunity.trigger, studyTarget: activeStudyTarget,
          overlayOccupied: true, schemaVersion: 1, triggerValue: decision.opportunity.value,
          suppressionReason: 'overlay_occupied',
          event_id: suppressionEventId(),
        });
        return;
      }
      const sessionClaimed = mode === 'test' || await claimSoftUpsell({ accountScope, studyTarget: activeStudyTarget, canClaim: () => active });
      if (!active || !sessionClaimed) {
        lease.release();
        if (active) void trackSoftUpsellEvent('soft_upsell_suppressed', {
          context: decision.opportunity.context, trigger: decision.opportunity.trigger, studyTarget: activeStudyTarget,
          overlayOccupied: false, schemaVersion: 1, triggerValue: decision.opportunity.value,
          suppressionReason: 'session_cap',
          event_id: suppressionEventId(),
        });
        return;
      }
      const accountToken = captureAccountGeneration();
      const attribution = createSoftUpsellAttribution({
        impressionId: Crypto.randomUUID(), trigger: decision.opportunity.trigger,
        context: decision.opportunity.context, mode,
      });
      const next: BoundOpportunity = { item: decision.opportunity, identityKey: currentIdentity, attribution, accountToken, lease };
      boundRef.current = next;
      setBound(next);
      void trackSoftUpsellEvent('soft_upsell_eligible', {
        context: next.item.context, trigger: next.item.trigger, studyTarget: activeStudyTarget, overlayOccupied: false,
        schemaVersion: 1, triggerValue: next.item.value,
        soft_upsell_impression_id: attribution.impressionId,
        soft_upsell_trigger: attribution.trigger,
        soft_upsell_context: attribution.context,
        soft_upsell_mode: attribution.mode,
        event_id: softUpsellEventId(attribution, 'eligible'),
      } as never);
    };
    void run().catch(() => {});
    return () => {
      active = false;
      const current = boundRef.current;
      if (current?.identityKey === currentIdentity) {
        current.lease.release();
        boundRef.current = null;
      }
    };
  }, [accountScope, candidateSignature, currentIdentity, hasPremiumAccess, mode, stableCandidates, studyTarget, tryClaimOverlay]);

  const isCurrent = useCallback((value: BoundOpportunity | null): value is BoundOpportunity => (
    value != null && value.identityKey === currentIdentity
    && currentIdentityRef.current === currentIdentity
    && isCurrentAccountGeneration(value.accountToken)
  ), [currentIdentity]);

  const payload = useCallback((value: BoundOpportunity, suffix: string) => ({
    context: value.item.context, trigger: value.item.trigger, studyTarget: value.item.studyTarget,
    overlayOccupied: false, schemaVersion: 1 as const, triggerValue: value.item.value,
    soft_upsell_impression_id: value.attribution.impressionId,
    soft_upsell_trigger: value.attribution.trigger,
    soft_upsell_context: value.attribution.context,
    soft_upsell_mode: value.attribution.mode,
    event_id: softUpsellEventId(value.attribution, suffix),
  }), []);

  const onImpression = useCallback(async () => {
    if (!studyTarget) return;
    const current = boundRef.current;
    if (!isCurrent(current)) return;
    const key = current.attribution.impressionId;
    if (impressionDoneRef.current.has(key)) return;
    const existing = impressionInFlightRef.current.get(key);
    if (existing) return existing;
    const operation = (async () => {
      if (current.attribution.mode === 'production') {
        await attemptTwice(() => markSoftUpsellImpression(
          accountScope, studyTarget, current.item.context, current.item.milestoneId, Date.now(),
        ));
      }
      if (!isCurrent(current)) return;
      await trackSoftUpsellEvent('soft_upsell_impression', {
        ...payload(current, 'impression'), destination: 'paywall',
      } as never);
      impressionDoneRef.current.add(key);
    })();
    impressionInFlightRef.current.set(key, operation);
    try { await operation; } finally { impressionInFlightRef.current.delete(key); }
  }, [accountScope, isCurrent, payload, studyTarget]);

  const releaseAndHide = useCallback((current: BoundOpportunity) => {
    current.lease.release();
    if (boundRef.current === current) boundRef.current = null;
    setBound((value) => value === current ? null : value);
  }, []);

  const onDismiss = useCallback(async () => {
    if (!studyTarget) return;
    const current = boundRef.current;
    if (!isCurrent(current) || outcomeRef.current !== null) return;
    outcomeRef.current = 'dismiss';
    releaseAndHide(current);
    try {
      if (current.attribution.mode === 'production') {
        await attemptTwice(() => markSoftUpsellDismissed(accountScope, studyTarget, current.item.context, Date.now()));
      }
      if (currentIdentityRef.current !== currentIdentity) return;
      await trackSoftUpsellEvent('soft_upsell_dismiss', payload(current, 'dismiss') as never);
    } catch { /* dismissal is intentionally non-blocking */ }
  }, [accountScope, currentIdentity, isCurrent, payload, releaseAndHide, studyTarget]);

  const onCta = useCallback(async () => {
    const current = boundRef.current;
    if (!isCurrent(current) || outcomeRef.current !== null) return false;
    outcomeRef.current = 'cta';
    navigationHandoffRef.current = current;
    releaseAndHide(current);
    void trackSoftUpsellEvent('soft_upsell_cta', {
      ...payload(current, 'cta'), destination: 'paywall',
    } as never).catch(() => undefined);
    return true;
  }, [isCurrent, payload, releaseAndHide]);

  const onNavigationFailure = useCallback(async () => {
    const previous = navigationHandoffRef.current;
    if (!previous || !isCurrent(previous) || outcomeRef.current !== 'cta') return false;
    const freshLease = await tryClaimOverlay();
    if (!freshLease || !isCurrent(previous)) {
      freshLease?.release();
      return false;
    }
    const retry = { ...previous, lease: freshLease };
    navigationHandoffRef.current = null;
    outcomeRef.current = null;
    boundRef.current = retry;
    setBound(retry);
    return true;
  }, [isCurrent, tryClaimOverlay]);

  const visibleBound = bound?.identityKey === currentIdentity ? bound : null;
  return {
    opportunity: visibleBound?.item ?? null,
    attribution: visibleBound?.attribution ?? null,
    onImpression,
    onDismiss,
    onCta,
    onNavigationFailure,
  };
}
