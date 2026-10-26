// Аудит «назад» 26.10, B1 (правило владельца: «назад» Android закрывает так же, как кнопка экрана): итог диалога ✕ ведёт к Диалогам,
// а общий обработчик Android уводил на Главную — экран вне реестра разделов. Теперь экран сам владеет «назад» и идёт туда же, что ✕.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('итог диалога: Android «назад» = ✕', () => {
  const screen = read('app/dialogue_v2_completion.tsx');
  const nav = read('app/navigation_back.ts');

  it('экран в списке «сам владеет назад» — общий обработчик корня его не перехватывает', () => {
    const owned = /const SCREEN_OWNED_ANDROID_BACK_PATHS: ReadonlySet<string> = new Set\(\[([\s\S]*?)\]\);/.exec(nav);
    expect(owned?.[1]).toContain("'/dialogue_v2_completion'");
  });

  it('«назад» и ✕ ведут в одно место, повтор во время перехода пропускается и пишется в журнал', () => {
    // ✕ ведёт туда же, что «назад»; с защитой от повтора (Optimistic UI 26.10)
    expect(screen).toMatch(/const close = \(\) => \{[\s\S]{0,500}safeRouterBack\(router, '\/ai_dialog_home' as never\);/);
    const handler = /BackHandler\.addEventListener\('hardwareBackPress', \(\) => \{([\s\S]*?)\n {4}\}\);/.exec(screen)?.[1] ?? '';
    expect(handler).toContain("safeRouterBack(router, '/ai_dialog_home' as never);");
    expect(handler).toContain('return true;');
    expect(handler).toContain('[DIALOG-BACK] hardware back skip reason=already_leaving');
    expect(screen).toContain('return () => { sub.remove(); if (reset) clearTimeout(reset); };');
  });

  it('Ревизор 26.10: обработчик только пока экран в фокусе, флаг ухода сбрасывается при фокусе и через 1 с', () => {
    expect(screen).toMatch(/useFocusEffect\(useCallback\(\(\) => \{\n\s+backLeavingRef\.current = false;[\s\S]*?BackHandler\.addEventListener\('hardwareBackPress'/);
    expect(screen).toContain('[DIALOG-BACK] leaving flag reset reason=still_on_screen_after_1s');
    expect(screen).toMatch(/\}, 1000\);/);
    expect(screen).not.toMatch(/useEffect\(\(\) => \{\n\s+const sub = BackHandler/);
  });
});
