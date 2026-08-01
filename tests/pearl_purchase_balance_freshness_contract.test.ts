import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function extract(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('pearl purchase balance freshness contract', () => {
  it('resolves stable identity before boot shard-cache prewarm', () => {
    const source = read('app/_layout.tsx');
    const prewarmStart = source.indexOf('void getStableId()');
    const shardRead = source.indexOf('.then(() => getShardsBalance())', prewarmStart);

    expect(source).toContain("import { getStableId } from './stable_id';");
    expect(prewarmStart).toBeGreaterThanOrEqual(0);
    expect(shardRead).toBeGreaterThan(prewarmStart);
  });

  it('hydrates the flashcard market balance from the synchronous shard peek', () => {
    const source = read('app/flashcards.tsx');

    expect(source).toContain('peekLastKnownShardsBalance');
    expect(source).toContain(
      'const [shardBalance, setShardBalance] = useState(() => peekLastKnownShardsBalance() ?? 0);',
    );
  });

  it('recomputes an active card-pack paywall when balance or voucher eligibility changes', () => {
    const source = read('app/flashcards/useCardPackShardPaywall.tsx');
    const revalidation = extract(
      source,
      'useEffect(() => {\n    if (purchasingRef.current) return;',
      '  const closePaywall',
    );

    expect(source).toContain('const purchasingRef = useRef(false);');
    expect(source).toContain('purchasingRef.current = true;\n    setPurchasing(true);');
    expect(source).toContain('purchasingRef.current = false;\n      setPurchasing(false);');
    expect(revalidation).toContain(
      'const voucherEligible = hasVoucher && (!prev.pack.isCommunityUgc || hasCommunityVoucher);',
    );
    expect(revalidation).toContain('const desiredMode = voucherEligible');
    expect(revalidation).toContain("? 'voucher'");
    expect(revalidation).toContain(': balance < prev.pack.priceShards');
    expect(revalidation).toContain("? 'insufficient'");
    expect(revalidation).toContain(": 'confirm';");
    expect(revalidation).toContain('prev.mode === desiredMode');
    expect(revalidation).toContain('{ ...prev, mode: desiredMode }');
    expect(revalidation).toContain('[balance, hasCommunityVoucher, hasVoucher]');
    expect(revalidation).not.toContain('hasVoucher, purchasing]');
  });

  it('blocks a same-tick second card-pack purchase before reading the active paywall', () => {
    const source = read('app/flashcards/useCardPackShardPaywall.tsx');
    const confirmPurchase = extract(
      source,
      'const onConfirmPurchase = useCallback(async () => {',
      '  const onGoToShards',
    );
    const inFlightGuard = confirmPurchase.indexOf('if (purchasingRef.current) return;');
    const paywallRead = confirmPurchase.indexOf('const pw = paywallRef.current;');

    expect(inFlightGuard).toBeGreaterThanOrEqual(0);
    expect(paywallRead).toBeGreaterThan(inFlightGuard);
  });

  it('hydrates gift balance from peek and re-reads it safely before redirecting or sending', () => {
    const source = read('app/(tabs)/friends.tsx');
    const requestSendGift = extract(
      source,
      'const requestSendGift = async (giftId: FriendGiftId) => {',
      'const incomingReplyTarget',
    );

    expect(source).toContain(
      'const [giftBalance, setGiftBalance] = useState(() => peekLastKnownShardsBalance() ?? 0);',
    );
    const readBalance = requestSendGift.indexOf('const freshBalance = await getShardsBalance();');
    const accountGuard = requestSendGift.indexOf(
      'isCurrentAccountGeneration(requestAccountToken',
      readBalance,
    );
    const currentTargetGuard = requestSendGift.indexOf('giftTargetRef.current?.uid !== target.uid');
    const insufficientBranch = requestSendGift.indexOf('if (freshBalance < gift.costShards)');
    const send = requestSendGift.indexOf('await handleSendGift(giftId, target, freshBalance);');

    expect(readBalance).toBeGreaterThanOrEqual(0);
    expect(accountGuard).toBeGreaterThan(readBalance);
    expect(currentTargetGuard).toBeGreaterThan(readBalance);
    expect(insufficientBranch).toBeGreaterThan(currentTargetGuard);
    expect(send).toBeGreaterThan(insufficientBranch);
  });
});
