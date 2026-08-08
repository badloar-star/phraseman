import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('friends gift tonal design contract', () => {
  const source = () => fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'friends.tsx'), 'utf8');

  it('uses semantic lightweight tonal surfaces for the friend gift picker', () => {
    const friends = source();

    expect(friends).toContain('function friendGiftAccent');
    expect(friends).toContain("giftId === 'chain_shield_1'");
    expect(friends).toContain("giftId === 'xp_boost_2x_24h'");
    expect(friends).toContain('const friendGiftSheetColors =');
    expect(friends).toContain('const friendGiftPillColors =');
    expect(friends).toContain('colors={friendGiftSheetColors}');
    expect(friends).toContain('colors={friendGiftPillColors}');
    expect(friends).toContain('const giftAccentColor = friendGiftAccent(gift.id, t);');
    expect(friends).toContain('const optionColors =');
    expect(friends).toContain('colors={optionColors}');
    expect(friends).toContain('backgroundColor: glassFill(giftAccentColor');
    expect(friends).toContain('color={giftAccentColor}');
  });

  it('keeps the friend gift picker borderless and avoids heavy glass effects', () => {
    const friends = source();
    const giftPickerStart = friends.indexOf('visible={giftTarget !== null}');
    const giftPickerEnd = friends.indexOf('visible={sentGiftReceipt !== null}', giftPickerStart);
    const giftPicker = friends.slice(giftPickerStart, giftPickerEnd);

    expect(giftPickerStart).toBeGreaterThan(-1);
    expect(giftPickerEnd).toBeGreaterThan(giftPickerStart);
    expect(giftPicker).toContain('borderWidth: 0');
    expect(giftPicker).not.toContain('borderWidth: 1');
    expect(giftPicker).not.toContain('<BlurView');
    expect(giftPicker).not.toContain('backdropFilter');
    expect(giftPicker).not.toContain('filter: blur');
  });
});
