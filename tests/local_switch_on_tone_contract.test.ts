/**
 * Темы 4801981d8 / координатор 13.10 (образец settings-gap-013/014/015/034, kit `.gs-sw.on`): включённый переключатель в
 * Уведомлениях, Настройках обучения и Приватности — дорожка цвета акцента и «чернильный» бегунок из общего токена switchOnTone.
 */
import fs from 'fs';
import path from 'path';
import { switchOnTone } from '../components/settings/switch_chrome';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const FILES = ['app/settings_notifications.tsx', 'app/settings_edu.tsx', 'app/privacy_settings.tsx'];

describe('LocalSwitch on-state uses the shared switchOnTone token', () => {
  it('token: accent track and accent-ink knob', () => {
    expect(switchOnTone({ accentGraphic: '#4FD1C5', accentInk: '#002B26' })).toEqual({ track: '#4FD1C5', knob: '#002B26' });
  });

  it.each(FILES)('%s: on-state track/knob come from switchOnTone, not glass.selected/lightTint', (rel) => {
    const src = read(rel);
    const fn = src.slice(src.indexOf('function LocalSwitch('), src.indexOf('\n}\n', src.indexOf('function LocalSwitch(')));
    expect(src).toContain("import { switchOffTrackTone, switchOnTone } from '../components/settings/switch_chrome';");
    expect(fn).toContain('const onTone = switchOnTone(glass);');
    expect(fn).toMatch(/backgroundColor: value \? onTone\.track : /);
    expect(fn).toMatch(/backgroundColor: value \? onTone\.knob : /);
    expect(fn).not.toMatch(/value \? glass\.selected/);
    expect(fn).not.toMatch(/value \? glass\.lightTint/);
  });
});
