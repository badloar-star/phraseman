import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

/**
 * Guard for the failure mode that killed the whole Android widget on 2026-08-26.
 *
 * зачем: натив — отдельный артефакт сборки, он не может импортировать TS-типы,
 * поэтому переименованное/удалённое поле схемы НЕ ломает компиляцию — оно тихо
 * делает виджет мёртвым. Именно так и вышло: схема уехала с v2 на v3 (личные
 * колоды), а Android-мост продолжал требовать плоское поле `english` из v2, ронял
 * КАЖДЫЙ setData, и снимок не записывался никогда. Отказ был немым: ошибку глушил
 * catch в widget_bridge, а предупреждение стояло под __DEV__.
 *
 * Обычные контрактные тесты виджета ищут строки в файлах и этот класс бага не
 * ловят — они остались зелёными всю поломку.
 */
describe('widget schema v3 ↔ native decoders stay aligned', () => {
  const bridge = read('app/widget_bridge.ts');
  const types = read('modules/phrase-widget/types.ts');
  const androidModule = read(
    'modules/phrase-widget/android/src/main/java/app/phraseman/phrasewidget/PhraseWidgetModule.kt',
  );
  const androidWidget = read(
    'modules/phrase-widget/android/src/main/java/app/phraseman/phrasewidget/PhraseGlanceWidget.kt',
  );
  const iosPayload = read('targets/widget/PhrasePayload.swift');

  /** Fields the live builder actually publishes. Nothing else may be required. */
  const LIVE_FIELDS = ['schemaVersion', 'access', 'decks', 'lang', 'theme', 'updatedAt'] as const;

  /** Dropped in the v2→v3 rework. Requiring one of these bricks the widget. */
  const DEAD_V2_FIELDS = ['english', 'deepLink', 'playDeepLink', 'kicker', 'phraseId'] as const;

  test('the live builder publishes exactly the v3 fields the native side reads', () => {
    for (const field of LIVE_FIELDS) {
      expect(bridge).toContain(`${field}:`);
      expect(types).toContain(field);
    }
  });

  test('Android bridge never requires a field the v3 snapshot does not carry', () => {
    // Whole lines, so nested parens inside the condition (`x.isNotEmpty()`) and
    // the trailing message lambda both stay attached to their guard.
    const guards = androidModule
      .split('\n')
      .filter((line) => line.trimStart().startsWith('require('));
    expect(guards.length).toBeGreaterThan(0);

    for (const guard of guards) {
      for (const dead of DEAD_V2_FIELDS) {
        // A guard on a dead v2 field rejects every real snapshot -> dead widget.
        // Quote style varies ("english" vs 'english'), so match the bare name.
        expect(guard).not.toMatch(new RegExp(`\\b${dead}\\b`));
      }
    }
  });

  test('Android bridge validates the v3 fields instead', () => {
    expect(androidModule).toContain('"schemaVersion"');
    expect(androidModule).toContain('"access"');
    expect(androidModule).toContain('"decks"');
  });

  test('Android converts the nested payload tree into real JSON nodes', () => {
    // JSONObject(Map) does NOT convert nested Map/List — the reader would get null
    // back from optJSONObject("decks") / optJSONArray("cards").
    expect(androidWidget).toContain('optJSONObject("decks")');
    expect(androidWidget).toContain('optJSONArray("cards")');
    expect(androidModule).toContain('toJsonObject');
    expect(androidModule).toContain('toJsonArray');
    expect(androidModule).not.toMatch(/JSONObject\(payload\)/);
  });

  test('both native decoders accept the schema version the app publishes', () => {
    const published = bridge.match(/schemaVersion:\s*(\d+)\s*as const/);
    expect(published).not.toBeNull();
    const version = Number(published?.[1]);

    const androidMax = androidWidget.match(/MAX_SCHEMA_VERSION\s*=\s*(\d+)/);
    const iosMax = iosPayload.match(/kMaxWidgetSchemaVersion\s*=\s*(\d+)/);
    expect(Number(androidMax?.[1])).toBeGreaterThanOrEqual(version);
    expect(Number(iosMax?.[1])).toBeGreaterThanOrEqual(version);
  });

  test('a widget sync failure is never dev-only', () => {
    // The __DEV__-only warning is exactly why a fully dead widget went unnoticed.
    const catchBlock = bridge.slice(bridge.lastIndexOf('} catch (error) {'));
    expect(catchBlock).toContain("console.warn('[widget_bridge] syncWidgetData failed:'");
    expect(catchBlock).not.toMatch(/if \(__DEV__\)[\s\S]*syncWidgetData failed/);
  });
});
