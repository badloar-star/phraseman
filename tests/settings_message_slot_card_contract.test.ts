import fs from 'node:fs';
import path from 'node:path';

describe('settings message slot card', () => {
  it('is accessible and appears in both approved settings positions', () => {
    const card = fs.readFileSync(path.join(process.cwd(), 'components/settings/SettingsMessageSlotCard.tsx'), 'utf8');
    const settings = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/settings.tsx'), 'utf8');
    expect(card).toContain('accessibilityRole="radio"');
    expect(card).toContain('minHeight: 44');
    expect(card).toContain('settings-message-slot-');
    expect(settings.indexOf('settings-message-slot-top')).toBeGreaterThan(settings.indexOf('settings-plus-row'));
    expect(settings.indexOf('settings-message-slot-bottom')).toBeLessThan(settings.indexOf('PHRASEMAN'));
  });
});
