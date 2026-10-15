// R58 #5 (аудит кнопок 15.10): закрытие окна рассылки ждало сеть (claim + начисление) — без сети окно было не закрыть.
// Окно закрывается сразу; получение — фоном с повторами; в этом запуске окно не всплывает повторно; при провале всех
// повторов отметка «закрыто» не ставится — окно вернётся при следующем запуске, награда не теряется.
import fs from 'fs';
import path from 'path';

const ui = fs.readFileSync(path.join(__dirname, '..', 'components', 'GlobalBroadcastModal.tsx'), 'utf8');
const core = fs.readFileSync(path.join(__dirname, '..', 'app', 'global_broadcast_modal.ts'), 'utf8');

describe('окно рассылки закрывается без сети', () => {
  it('закрытие и «оставить отзыв» не ждут claim: onClose сразу после фонового запуска', () => {
    expect(ui).toMatch(/closeGlobalBroadcastModalAndClaimInBackground\(payload, studyTarget, reward \? hapticSuccess : undefined\);\s*onClose\(\);/);
    expect(ui).toMatch(/closeGlobalBroadcastModalAndClaimInBackground\(payload, studyTarget\);\s*onClose\(\);/);
    expect(ui).not.toMatch(/await claimAndDismissGlobalBroadcastModal/);
  });

  it('фон: повторы с паузами, сдаётся с логом; в этом запуске окно не всплывает', () => {
    expect(core).toMatch(/const BACKGROUND_CLAIM_DELAYS_MS = \[0, 3_000, 15_000, 60_000\]/);
    expect(core).toContain('[GLOBAL-BROADCAST] claim:gave_up');
    expect(core).toMatch(/if \(closedThisSession\.has\(`\$\{uid\}:\$\{payload\.id\}`\)\) return skip\(/);
  });
});
