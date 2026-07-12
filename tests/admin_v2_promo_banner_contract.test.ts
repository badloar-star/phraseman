import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 promo banner workflow', () => {
  const core = read('admin/v2/scripts/admin-core.js');

  test('renders the complete legacy promo banner contract inside Application', () => {
    expect(core).toContain('function renderPromoBannerWorkflow');
    expect(core).toContain('data-action="preview-promo-banner"');
    expect(core).toContain('data-action="preview-promo-banner-stop"');
    expect(core).toContain('promo-banner-text-ru');
    expect(core).toContain('promo-banner-text-uk');
    expect(core).toContain('promo-banner-text-es');
    expect(core).toContain('promo-banner-url');
    expect(core).toContain('promo-banner-until');
    expect(core).toContain('promo-banner-campaign');
    expect(core).toContain('promo-banner-audience');
    expect(core).toContain('promo-banner-platform');
    expect(core).toContain('promo-banner-reason');
    expect(core).toContain('renderReleaseMaintenanceWorkflow() + renderPromoBannerWorkflow()');
    expect(core).toContain("primaryLabel: 'Открыть промо-баннер'");
  });

  test('seals preview data and publishes through the guarded remote config command', () => {
    expect(core).toContain('function buildPromoBannerPreview');
    expect(core).toContain('function buildPromoBannerStopPreview');
    expect(core).toContain('function ensurePromoBannerPreviewIsFresh');
    expect(core).toContain("source: 'promo-banner'");
    expect(core).toContain('promo_banner_enabled');
    expect(core).toContain('promo_banner_campaign_id');
    expect(core).toContain('promo_banner_audience');
    expect(core).toContain('promo_banner_platform');
    expect(core).toContain('state.remoteConfigPreview = buildPromoBannerPreview()');
    expect(core).toContain('state.remoteConfigPreview = buildPromoBannerStopPreview()');
    expect(core).toContain("if (preview?.source === 'promo-banner')");
    expect(core).toContain('await actions.publishRemoteConfig');
    expect(core).not.toContain('savePromoBanner(');
  });

  test('requires campaign safety fields and keeps other remote config forms locked during preview', () => {
    expect(core).toContain('Укажите причину изменения промо-баннера.');
    expect(core).toContain('Campaign ID промо-баннера');
    expect(core).toContain('Ссылка промо-баннера должна начинаться с https:// или phraseman://');
    expect(core).toContain('Агрегированный счётчик закрытий пока недоступен');
    expect(core).toContain("['release-maintenance', 'partial-restore-remote-config', 'premium-access', 'promo-banner']");
    expect(core).toContain("['partial-restore-remote-config', 'premium-access', 'promo-banner']");
    expect(core).toContain('Promo banner audience:');
    expect(core).toContain('Promo banner stop condition:');
  });

  test('keeps local calendar dates stable and provides accessible button guidance', () => {
    expect(core).toContain('function promoBannerDateValue');
    expect(core).toContain("`${date}T23:59:59`");
    expect(core).toContain('title="Показать точные изменения баннера до публикации"');
    expect(core).toContain('title="Подготовить безопасное выключение баннера для всех пользователей"');
    expect(core).toContain('title="Отменить предпросмотр без изменения production"');
  });
});
