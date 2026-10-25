// Координатор 26.10 по эталону dialogs-gaps-states №1–6 (`memHead`: `.rb.l` 48 + заголовок в строке; kit.css `.rb.l` 48×48) и закону
// владельца «назад в одном месте везде»: круг «назад» на экране «Память диалогов» — 48, как у общей кнопки (был 44).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
// зачем: размер общей кнопки — из исходника (импорт компонента тянет иконки, которые jest не разбирает)
const SCREEN_BACK_SIZE = Number(/export const SCREEN_BACK_SIZE = (\d+);/.exec(read('components/v2/ScreenBackButton.tsx'))?.[1]);

describe('Память диалогов: «назад» — круг 48 в строке с заголовком', () => {
  const screen = read('app/dialogue_v2_memory.tsx');
  it('эталон — `.rb.l` в строке заголовка; круг кода — SCREEN_BACK_SIZE = 48', () => {
    expect(read('docs/design/v2-app/dialogs-gaps-states.html')).toMatch(/const memHead = `<div class="flex"[^`]*<span class="rb l t">/);
    expect(SCREEN_BACK_SIZE).toBe(48);
    expect(screen).toContain('style={{ width: SCREEN_BACK_SIZE, height: SCREEN_BACK_SIZE, borderRadius: SCREEN_BACK_SIZE / 2,');
    expect(screen).not.toMatch(/width: V2\.iconButton, height: V2\.iconButton/);
  });
  it('шапка не режет заголовок при крупном шрифте: minHeight, а не фиксированная высота', () => {
    expect(screen).toContain("<View style={{ minHeight: 60, paddingHorizontal: V2.screenPad, flexDirection: 'row', alignItems: 'center', gap: V2.gap }}>");
  });
});
