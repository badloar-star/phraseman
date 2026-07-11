import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'components', 'ArenaLimitModal.tsx'), 'utf8');
const noEnergySource = readFileSync(join(__dirname, '..', 'components', 'NoEnergyModal.tsx'), 'utf8');
const energyRefillSource = readFileSync(join(__dirname, '..', 'components', 'EnergyRefillShardModal.tsx'), 'utf8');
const cardPackShardPaywallSource = readFileSync(join(__dirname, '..', 'app', 'flashcards', 'CardPackShardPaywallModal.tsx'), 'utf8');

describe('ArenaLimitModal planned locale runtime copy', () => {
  it('does not route planned locales through legacy RU/UK/ES branches', () => {
    expect(source).not.toMatch(/\b(lang === 'ru'|lang === 'uk'|lang === 'es'|isUK|isES)\b/u);
  });

  it('has visible modal and toast copy for planned locales', () => {
    for (const marker of ["'pt-BR'", 'vi:', 'id:', 'tr:', 'pl:']) {
      expect(source).toContain(marker);
    }
    for (const marker of ['messagePtBr', 'messageVi', 'messageId', 'messageTr', 'messagePl']) {
      expect(source).toContain(marker);
    }
    expect(source).toContain('Com Plus, duelos ilimitados todos os dias');
    expect(source).toContain('Với Plus, bạn có lượt đấu không giới hạn mỗi ngày');
    expect(source).toContain('Dengan Plus, duel tak terbatas setiap hari');
    expect(source).toContain('Plus ile her gün sınırsız düello');
    expect(source).toContain('Z Plus masz nielimitowane pojedynki każdego dnia');
  });

  it('keeps limit modals on opaque surfaces instead of paywall glass', () => {
    expect(source).not.toContain('paywallGlassColor');
    expect(noEnergySource).not.toContain('paywallGlassColor');
    expect(energyRefillSource).not.toContain('paywallGlassColor');
    expect(cardPackShardPaywallSource).not.toContain('paywallGlassColor');
    expect(source).toContain('function opaqueArenaLimitSurface');
    expect(source).toContain('const paywallSheetBg = opaqueArenaLimitSurface(t.bgCard);');
    expect(source).toContain('styles.sheetOpaqueFill');
    expect(noEnergySource).toContain('const paywallCardBg = t.bgCard;');
    expect(energyRefillSource).toContain('const shardModalCardBg = t.bgCard;');
    expect(cardPackShardPaywallSource).toContain('const sheetCardBg = t.bgCard;');
    expect(cardPackShardPaywallSource).toContain('const sheetSurfaceBg = t.bgSurface;');
    expect(cardPackShardPaywallSource).toContain('const sheetPrimaryBg = t.bgPrimary;');
  });

  it('keeps the no-energy hero bolt visually centered without moving the halo', () => {
    expect(noEnergySource).toContain('HERO_ENERGY_ICON_CONTENT_OFFSET');
    expect(noEnergySource).toContain('styles.energyHeroIconContent');
    expect(noEnergySource).toContain('{ translateX: HERO_ENERGY_ICON_CONTENT_OFFSET.x }');
  });
});
