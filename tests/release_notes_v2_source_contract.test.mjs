import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const file = (path) => join(root, path);

test('release 2.0 notes have a separate approved three-item copy', () => {
  const copyPath = file('components/release_notes_v2_copy.ts');
  assert.ok(existsSync(copyPath), '2.0 copy module must exist independently of build 118');
  const copy = readFileSync(copyPath, 'utf8');
  for (const line of [
    'Что нового · 2.0',
    'Новый PhraseMan',
    // §CORE-0168: заголовок без Шпиля — он скрыт в стор-сборке (сторож release_notes_v2_store_surface_guard).
    'Новый дизайн и темы',
    'Карточки из видео',
    'Фразы из роликов — одной кнопкой в свои наборы',
    'Энергия проще',
    'Пять делений, одно занятие — одно деление',
    'Только монеты',
    'Опыт ушёл, награда одна — монеты',
    'Понятно',
  ]) assert.ok(copy.includes(line), `missing approved copy: ${line}`);
  assert.match(copy, /items:\s*\[/);
});

test('release 2.0 uses a separate bottom Liquid Glass sheet with safe scrolling', () => {
  const modalPath = file('components/ReleaseNotesV2Modal.tsx');
  assert.ok(existsSync(modalPath), '2.0 modal must exist separately from the old announcement shell');
  const modal = readFileSync(modalPath, 'utf8');
  assert.match(modal, /HybridSheetShell/);
  assert.match(modal, /material="liquid-glass"/);
  assert.match(modal, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(modal, /<ScrollView/);
  assert.match(modal, /<DuoPressable/);
  assert.match(modal, /requestDismiss/);
});

// зачем (координатор 13.10, №34): ворота больше не «выключены» (return null) — релиз 16.10 настроен константой RELEASE_2_0 (сборка >=132, порог по install_date).
test('release 2.0 is wired behind its own release gate', () => {
  const gatePath = file('app/release_notes_v2_gate.ts');
  assert.ok(existsSync(gatePath), 'separate 2.0 release gate must exist');
  const gate = readFileSync(gatePath, 'utf8');
  const layout = readFileSync(file('app/_layout.tsx'), 'utf8');
  assert.match(gate, /export const RELEASE_2_0: ReleaseNotesV2Release = \{ minBuildId: \d+, newUserCutoffMs: Date\.UTC\(2026, 9, 16\) \};/);
  assert.match(gate, /release_notes_v2_dismissed/);
  assert.match(layout, /shouldOfferReleaseNotesV2Modal/);
  assert.match(layout, /isReleaseNotesV2ReleaseActive/);
  assert.match(layout, /<ReleaseNotesV2Modal/);
  assert.match(layout, /releaseNotesVariant === 'v2'/);
});
