import fs from 'fs';
import path from 'path';
import { MAX_CALL_ORB_HYBRID } from '../constants/motionHybrid';

const orbPath = path.join(__dirname, '../components/max/MaxCallOrb.tsx');
const orb = fs.existsSync(orbPath) ? fs.readFileSync(orbPath, 'utf8') : '';
const session = fs.readFileSync(path.join(__dirname, '../app/max_call_session.tsx'), 'utf8');

describe('MAX tutor call sphere', () => {
  it('uses the Home layers with smooth named audio tokens and no ring geometry', () => {
    expect(MAX_CALL_ORB_HYBRID).toMatchObject({
      size: 238,
      audioScaleMax: 0.055,
      attackMs: 420,
      releaseMs: 680,
    });
    expect(orb).toContain('MaxHomeOrb');
    expect(orb).toContain('setAudioLevel');
    expect(orb).toContain('useReduceMotion()');
    expect(orb).not.toContain('borderWidth');
    expect(orb).not.toContain('outerRing');
    expect(orb).not.toContain('innerRing');
    expect(orb).not.toMatch(/halo|new Image/);
  });

  it('reacts only to inbound MAX audio, never the microphone', () => {
    expect(session).toContain('callOrbRef.current?.setAudioLevel(sample.remote)');
    expect(session).not.toContain("const level = owner === 'ai' ? sample.remote : owner === 'user' ? sample.mic");
  });

  it('renders MaxCallOrb for tutor while preserving MaxCallHalo for other formats', () => {
    expect(session).toContain('isTutor ? (');
    expect(session).toContain('<MaxCallOrb');
    expect(session).toContain('<MaxCallHalo');
    expect(session).not.toMatch(/isTutor[\s\S]{0,500}school-outline/);
  });
});
