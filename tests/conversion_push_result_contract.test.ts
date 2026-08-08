import fs from 'fs';
import path from 'path';

/**
 * «Конверсионные пуши» (Premium-истекает + upsell D+4/D+7/D+14) — это ЛОКАЛЬНЫЕ
 *
 * Баг: планировщики молча глотали любую ошибку (return void, только console.warn в
 * DEV), а QA-кнопки ВСЕГДА показывали «запланирован». Тестер видел «пуш не пришёл»
 * + невнятную ошибку и думал, что сломаны пуши. Фикс: планировщики возвращают
 * структурный результат {ok, reason}, а QA показывает точную причину провала.
 */
function readSource(rel: string): string {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

describe('conversion push schedulers return a structured result', () => {
  const notif = () => readSource(path.join('app', 'notifications.ts'));

  it('exposes a ConversionPushResult type with ok flag and failure reasons', () => {
    const source = notif();
    expect(source).toContain('export type ConversionPushResult');
    expect(source).toContain("reason: 'no_module' | 'no_permission' | 'too_soon' | 'schedule_failed'");
  });

  it('scheduleIntroExpiringNotification returns the result instead of void', () => {
    const source = notif();
    const slice = source.slice(
      source.indexOf('export const scheduleIntroExpiringNotification'),
      source.indexOf('export const cancelIntroExpiringNotification'),
    );
    expect(slice).toContain('): Promise<ConversionPushResult>');
    // success path
    expect(slice).toContain('return { ok: true, scheduled: 1 }');
    // each early-out is now an explicit failure reason, not a silent return
    expect(slice).toContain("return { ok: false, reason: 'no_module' }");
    expect(slice).toContain("return { ok: false, reason: 'no_permission' }");
    expect(slice).toContain("return { ok: false, reason: 'too_soon' }");
    // the catch surfaces the real error instead of swallowing it
    expect(slice).toContain("reason: 'schedule_failed'");
  });

  it('scheduleUpsellNotifications returns the result and counts scheduled slots', () => {
    const source = notif();
    const slice = source.slice(
      source.indexOf('export const scheduleUpsellNotifications'),
      source.indexOf('export const cancelUpsellNotifications'),
    );
    expect(slice).toContain('): Promise<ConversionPushResult>');
    expect(slice).toContain('scheduled++');
    expect(slice).toContain('return scheduled > 0 ? { ok: true, scheduled }');
    expect(slice).toContain("reason: 'schedule_failed'");
  });
});
