import { readFileSync } from 'fs';
import { join } from 'path';

const modelSource = readFileSync(join(__dirname, '..', 'app', 'global_broadcast_modal.ts'), 'utf8');
const modalSource = readFileSync(join(__dirname, '..', 'components', 'GlobalBroadcastModal.tsx'), 'utf8');

describe('GlobalBroadcastModal planned locale runtime copy', () => {
  it('keeps planned locale payload fields and defaults explicit', () => {
    for (const marker of [
      'titlePtBr',
      'titleVi',
      'titleId',
      'titleTr',
      'titlePl',
      'messagePtBr',
      'messageVi',
      'messageId',
      'messageTr',
      'messagePl',
      'reviewCtaPtBr',
      'reviewCtaVi',
      'reviewCtaId',
      'reviewCtaTr',
      'reviewCtaPl',
    ]) {
      expect(modelSource).toContain(marker);
    }
    expect(modelSource).toContain('Mensagem da equipe');
    expect(modelSource).toContain('Thông báo từ đội ngũ');
    expect(modelSource).toContain('Pesan dari tim');
    expect(modelSource).toContain('Ekipten mesaj');
    expect(modelSource).toContain('Wiadomość od zespołu');
  });

  it('renders planned payload fields through triLang instead of legacy locale branches', () => {
    expect(modalSource).toContain('triLang(lang');
    expect(modalSource).toContain("'pt-BR': payload.titlePtBr");
    expect(modalSource).toContain('vi: payload.messageVi');
    expect(modalSource).toContain('id: payload.reviewCtaId');
    expect(modalSource).toContain('tr: reward.labelTr');
    expect(modalSource).toContain('pl: reward.labelPl');
    expect(modalSource).not.toMatch(/\b(lang === 'ru'|lang === 'uk'|lang === 'es'|isUK|isES)\b/u);
  });

  it('does not leave generic runtime fallback markers in the payload model', () => {
    expect(modelSource).not.toContain('fallback');
    expect(modelSource).not.toContain('Fallback');
  });
});
