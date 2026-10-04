import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const settingsSource = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'settings.tsx'), 'utf8');
const educationSource = fs.readFileSync(path.join(ROOT, 'app', 'settings_edu.tsx'), 'utf8');

describe('main Settings sound controls', () => {
  test('shows one Sound group with exactly the two approved independent switches', () => {
    const start = settingsSource.indexOf('sound-settings-start');
    const end = settingsSource.indexOf('sound-settings-end');
    const block = settingsSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // 04.10 (Настройки A, решение (б)): звук — строками внутри группы «Обучение», без своего заголовка и без подписей.
    expect(block).not.toContain("L('Звук'");
    expect(block).toContain('uiSoundsLabel(lang)');
    expect(block).toContain('voiceOutLabel(lang)');
    expect(block).not.toContain('uiSoundsSub(lang)');
    expect(block).not.toContain('voiceOutSub(lang)');
    expect(block.match(/<CustomSwitch/g)).toHaveLength(2);
    expect(block).toContain('testID="settings-ui-sounds-switch"');
    expect(block).toContain('testID="settings-voice-out-switch"');
    expect(block).toContain('accessibilityLabel={uiSoundsLabel(lang)}');
    expect(block).toContain('accessibilityLabel={voiceOutLabel(lang)}');
    expect(block).not.toMatch(/TTS|OpenAI|AI voice/i);
  });

  test('moves the voice switch out of education settings but keeps speech speed', () => {
    expect(educationSource).not.toContain("key: 'voiceOut'");
    expect(educationSource).toContain('normalizeSpeechRate(s.speechRate)');
    expect(educationSource).toContain('voicePlaybackPolicy.isEnabled()');
  });
});
