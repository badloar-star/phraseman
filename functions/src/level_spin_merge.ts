export type LevelSpinMergeDoc = { id: string; data: Record<string, any> };

export type LevelSpinMergeSnapshot = {
  stableUid: string;
  state: Record<string, any>;
  credits: LevelSpinMergeDoc[];
  results: LevelSpinMergeDoc[];
  bonusClaims: LevelSpinMergeDoc[];
};

export type LevelSpinMergePlan = {
  state: Record<string, any>;
  credits: LevelSpinMergeDoc[];
  results: LevelSpinMergeDoc[];
  bonusClaims: LevelSpinMergeDoc[];
};

const RESULT_IMMUTABLE_FIELDS = [
  'originStableUid', 'requestId', 'creditId', 'level', 'kind', 'premiumAtEarn',
  'baseGiftId', 'premiumGiftId', 'rewardOccurrences', 'catalogVersion',
  'schemaVersion', 'createdAtMs', 'expiresAtMs',
] as const;

function immutableResultCore(data: Record<string, any>): string {
  return JSON.stringify(Object.fromEntries(RESULT_IMMUTABLE_FIELDS.map((field) => [field, data[field] ?? null])));
}

function deliveryRank(state: unknown): number {
  return state === 'delivered' ? 4 : state === 'expired' ? 3 : state === 'delivering' ? 2 : 1;
}

function mergeDelivery(left: Record<string, any> | undefined, right: Record<string, any> | undefined): Record<string, any> {
  if (!left) return { ...(right ?? { state: 'unclaimed' }) };
  if (!right) return { ...left };
  const leftSelection = String(left.selectedGiftId ?? '');
  const rightSelection = String(right.selectedGiftId ?? '');
  if (leftSelection && rightSelection && leftSelection !== rightSelection) {
    throw new Error('level_spin_delivery_selection_collision');
  }
  const chosen = deliveryRank(left.state) >= deliveryRank(right.state) ? left : right;
  if (chosen.state === 'delivering') {
    return { state: 'unclaimed', ...(leftSelection || rightSelection ? { selectedGiftId: leftSelection || rightSelection } : {}) };
  }
  return {
    ...chosen,
    ...(leftSelection || rightSelection ? { selectedGiftId: leftSelection || rightSelection } : {}),
  };
}

function mergeResult(left: LevelSpinMergeDoc, right: LevelSpinMergeDoc): LevelSpinMergeDoc {
  if (immutableResultCore(left.data) !== immutableResultCore(right.data)) {
    throw new Error('level_spin_result_collision');
  }
  const lanes = new Set([
    ...Object.keys(left.data.deliveries ?? {}),
    ...Object.keys(right.data.deliveries ?? {}),
  ]);
  const deliveries = Object.fromEntries([...lanes].sort().map((lane) => [
    lane,
    mergeDelivery(left.data.deliveries?.[lane], right.data.deliveries?.[lane]),
  ]));
  return {
    id: left.id,
    data: {
      ...left.data,
      revealState: left.data.revealState === 'acknowledged' || right.data.revealState === 'acknowledged'
        ? 'acknowledged'
        : 'pending',
      deliveries,
      hasPendingDelivery: Object.values(deliveries)
        .some((lane) => lane && lane.state !== 'delivered' && lane.state !== 'expired'),
    },
  };
}

function docUnion(
  left: LevelSpinMergeDoc[],
  right: LevelSpinMergeDoc[],
  collision: (a: LevelSpinMergeDoc, b: LevelSpinMergeDoc) => LevelSpinMergeDoc,
): LevelSpinMergeDoc[] {
  const merged = new Map<string, LevelSpinMergeDoc>();
  for (const doc of [...left, ...right]) {
    const prior = merged.get(doc.id);
    merged.set(doc.id, prior ? collision(prior, doc) : { id: doc.id, data: { ...doc.data } });
  }
  return [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function chooseCredit(
  left: LevelSpinMergeDoc,
  right: LevelSpinMergeDoc,
  leftOwner: string,
  rightOwner: string,
): LevelSpinMergeDoc {
  const statusRank = (status: unknown) => status === 'consumed' ? 2 : status === 'available' ? 1 : 0;
  const leftRank = statusRank(left.data.status);
  const rightRank = statusRank(right.data.status);
  if (!leftRank || !rightRank) throw new Error('level_spin_credit_status_invalid');
  if (leftRank !== rightRank) return leftRank > rightRank ? left : right;
  const leftEarned = Number(left.data.earnedAtMs ?? Number.MAX_SAFE_INTEGER);
  const rightEarned = Number(right.data.earnedAtMs ?? Number.MAX_SAFE_INTEGER);
  if (leftEarned !== rightEarned) return leftEarned < rightEarned ? left : right;
  return leftOwner.localeCompare(rightOwner) <= 0 ? left : right;
}

export function buildLevelSpinMergePlan(
  winner: LevelSpinMergeSnapshot,
  loser: LevelSpinMergeSnapshot,
): LevelSpinMergePlan {
  const results: LevelSpinMergeDoc[] = docUnion(winner.results, loser.results, mergeResult).map((doc): LevelSpinMergeDoc => {
    const deliveries = doc.data.deliveries && typeof doc.data.deliveries === 'object'
      ? doc.data.deliveries as Record<string, Record<string, unknown>>
      : {};
    return {
      ...doc,
      data: {
        ...doc.data,
        hasPendingDelivery: Object.values(deliveries)
          .some((lane) => lane && lane.state !== 'delivered' && lane.state !== 'expired'),
      },
    };
  });
  const winnerCredits = new Map(winner.credits.map((doc) => [doc.id, doc]));
  const loserCredits = new Map(loser.credits.map((doc) => [doc.id, doc]));
  const creditIds = [...new Set([...winnerCredits.keys(), ...loserCredits.keys()])].sort();
  const credits = creditIds.map((id) => {
    const left = winnerCredits.get(id);
    const right = loserCredits.get(id);
    const chosen = left && right
      ? chooseCredit(left, right, winner.stableUid, loser.stableUid)
      : (left ?? right)!;
    return { id, data: { ...chosen.data } };
  });
  const resultById = new Map(results.map((doc) => [doc.id, doc]));
  for (const credit of credits) {
    if (credit.data.status !== 'consumed') continue;
    const requestId = String(credit.data.claimRequestId ?? '');
    const receipt = resultById.get(requestId);
    if (!receipt || receipt.data.creditId !== credit.id) {
      throw new Error('level_spin_consumed_receipt_missing');
    }
  }
  const bonusClaims = docUnion(winner.bonusClaims, loser.bonusClaims, (left) => left);
  const balance = credits.filter((credit) => credit.data.status === 'available').length;
  const protocol = winner.state.protocol === 'v1' || loser.state.protocol === 'v1' ? 'v1' : 'legacy';
  return {
    state: {
      protocol,
      levelBaseline: Math.min(60, Math.max(
        0,
        Number(winner.state.levelBaseline ?? 0) || 0,
        Number(loser.state.levelBaseline ?? 0) || 0,
      )),
      balance,
      activeRequestId: null,
    },
    credits,
    results,
    bonusClaims,
  };
}
