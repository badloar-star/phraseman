/**
 * Темы 4801981d8 / координатор 13.10 (образец settings-gap-013/014/015/034, kit `.gs-sw.on`): включённый переключатель в
 * Уведомлениях, Настройках обучения и Приватности — дорожка цвета акцента и «чернильный» бегунок из общего токена switchOnTone.
 */
import fs from 'fs';
import path from 'path';
import { switchOnTone } from '../components/settings/switch_chrome';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('LocalSwitch on-state uses the shared switchOnTone token', () => {
  it('token: accent track and accent-ink knob', () => {
    expect(switchOnTone({ accentGraphic: '#4FD1C5', accentInk: '#002B26' })).toEqual({ track: '#4FD1C5', knob: '#002B26' });
  });

  it('GlassSwitch (общий): on-state из switchOnTone, экраны Уведомлений и Приватности делегируют ему', () => {
    const g = read('components/settings/GlassSwitch.tsx');
    expect(g).toContain('const onTone = switchOnTone(glass);');
    expect(g).toContain('backgroundColor: value ? onTone.knob : offTone.knob');
    expect(g).not.toMatch(/value ? glass.selected/);
    expect(read('app/settings_notifications.tsx')).toContain('return <GlassSwitch {...');
    expect(read('app/privacy_settings.tsx')).toContain('return <GlassSwitch {...');
  });

  it('Настройки обучения (LocalSwitch) и общий SettingsGlassSwitch делегируют GlassSwitch', () => {
    // зачем (ТОП-20 №3, 05.11): копии тумблера свёрнуты в общий GlassSwitch — тон включённого проверен выше
    expect(read('app/settings_edu.tsx')).toMatch(/function LocalSwitch\([^]*?return <GlassSwitch /);
    expect(read('components/settings/SettingsGlassRows.tsx')).toMatch(/export function SettingsGlassSwitch\([^]*?return <GlassSwitch /);
  });
});
