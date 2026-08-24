import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('friend gift human flow', () => {
  it('selects a gift first and sends it through one explicit CTA', () => {
    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).toContain('selectedGiftId');
    expect(friends).toContain('friend-gift-send-cta');
    expect(friends).toContain('Подарок для');
    expect(friends).toContain('Отправить');
    expect(friends).toContain('Повторить');
    expect(friends).not.toContain('onPress={() => requestSendGift(gift.id)}');
    expect(friends).not.toContain('{giftDescription(gift)}');
  });

  it('shows incoming gifts globally through the overlay arbiter, not a generic toast', () => {
    const host = read('components/GlobalFriendGiftHost.tsx');
    const arbiter = read('components/overlay_arbiter_core.ts');
    expect(host).toContain("useOverlayVisible('friendGift'");
    expect(host).toContain('HybridAlertShell');
    expect(host).toContain('Подарок от');
    expect(host).toContain('Забрать');
    expect(host).not.toContain("emitAppEvent('action_toast'");
    expect(host).toContain('subscribeAccountGeneration');
    expect(host).toContain('setPending([])');
    expect(arbiter).toContain("| 'friendGift'");
    expect(arbiter).toContain("'friendGift',");
  });
});
