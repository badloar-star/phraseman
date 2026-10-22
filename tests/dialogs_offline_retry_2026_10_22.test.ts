// зачем (аудит кнопок Ревизора 22.10, F1/F2; координатор: «ничего не нажимается»): «нет сети» в Диалогах — только при потере подключения (isConnected === false), а не по одному
// isInternetReachable === false; «Повторить» нажимается и перепроверяет сеть и каталог; кнопки dev-превью сцен ведут туда же, куда в боевых экранах;
// экран описания диалога отступает от часов устойчивым inset. Исходники читаются как текст, чистое решение — функцией.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { addEventListener: jest.fn(), refresh: jest.fn() } }));
jest.mock('react-native', () => ({ InteractionManager: { runAfterInteractions: () => ({ cancel: () => undefined }) } }));

import { dialogsSceneOfflineVerdict } from '../components/dialogs/scene/use_dialogs_scene_offline';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('Диалоги: решение «нет сети»', () => {
  it('нет подключения → офлайн', () => {
    expect(dialogsSceneOfflineVerdict({ isConnected: false, isInternetReachable: false, type: 'none' as never }).offline).toBe(true);
    expect(dialogsSceneOfflineVerdict({ isConnected: false, isInternetReachable: null, type: 'none' as never }).offline).toBe(true);
  });
  it('подключение есть, а «интернет недоступен» (портал, эмулятор, медленная проба) → экран не блокируется, причина в журнале', () => {
    const v = dialogsSceneOfflineVerdict({ isConnected: true, isInternetReachable: false, type: 'wifi' as never });
    expect(v.offline).toBe(false);
    expect(v.reason).toContain('reachable_false_but_connected_not_blocking');
  });
  it('онлайн и «неизвестно» → не офлайн', () => {
    expect(dialogsSceneOfflineVerdict({ isConnected: true, isInternetReachable: true, type: 'wifi' as never }).offline).toBe(false);
    expect(dialogsSceneOfflineVerdict({ isConnected: null, isInternetReachable: null, type: 'unknown' as never }).offline).toBe(false);
  });
});

describe('Диалоги: «Повторить» и журнал [DIALOGS-NET]', () => {
  const hook = code(read('components/dialogs/scene/use_dialogs_scene_offline.ts'));
  const hub = code(read('components/dialogs/scene/DialogsSceneHub.tsx'));
  const data = code(read('components/dialogs/scene/use_dialogs_scene_hub.ts'));
  const copy = code(read('components/dialogs/scene/dialogs_scene_copy.ts'));

  it('хук: журнал [DIALOGS-NET], NetInfo.refresh() по «Повторить», повторный тап во время проверки игнорируется с причиной', () => {
    expect(hook).toContain("const LOG = '[DIALOGS-NET]';");
    expect(hook).toContain('await NetInfo.refresh()');
    expect(hook).toContain("reason: 'already_checking'");
    expect(hook).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*\}/);
  });
  it('хаб данных: свой хук сети вместо флага Главной; «Повторить» ещё и перечитывает каталог (общий кэш)', () => {
    expect(data).toContain("import { useDialogsSceneOffline } from './use_dialogs_scene_offline';");
    expect(data).not.toContain('useHomeSceneOffline');
    expect(data).toContain('retry: () => Promise<void>');
    expect(data).toContain("fetchReleasedDialogueV2Catalogue(studyTarget, { awaitRefresh: true })");
  });
  it('хаб сцены: тап «Повторить» зовёт hub.retry(); кнопка офлайна не выключена', () => {
    expect(hub).toContain('void hub.retry();');
    expect(copy).toMatch(/offlineCta'\), ctaIcon: 'reload', ctaDisabled: false,/);
  });
});

describe('dev-превью сцен: кнопки ведут туда же, куда в боевых экранах', () => {
  it('Диалоги: карточка и «Начать» — брифинг, лимит — premium_modal, «назад» — на Главную', () => {
    const src = code(read('app/dev_dialogs_scene_preview.tsx'));
    expect(src).not.toContain('noop');
    expect(src).toContain("pathname: '/dialogue_v2_briefing'");
    expect(src).toContain("pathname: '/premium_modal'");
    expect(src).toContain("safeRouterBack(router, '/(tabs)/home' as never)");
    expect(src).toContain('onCard={openBriefing}');
  });
  it('Сегодня: задача — как в today_tasks (вкладки dismissTo, остальное push), «назад» на Главную', () => {
    const src = code(read('app/dev_today_scene_preview.tsx'));
    expect(src).not.toContain('noop');
    expect(src).toContain('dismissToTabRoute(router, task.route)');
    expect(src).toContain('onOpenTask={openTask}');
  });
  it('Пик: «Все участники» открывают SpireAllMembers, «Играть» даёт тост с названием действия', () => {
    const src = code(read('app/dev_spire_scene_preview.tsx'));
    expect(src).not.toContain('noop');
    expect(src).toContain('onOpenAll={openAll}');
    expect(src).toContain('onClimb={climb}');
    expect(src).toContain('<SpireAllMembers');
  });
});

describe('экран описания диалога: отступ от часов', () => {
  it('верх — устойчивый inset (первый кадр финальный), нижний SafeAreaView остаётся; фон корня идёт под строку статуса', () => {
    const src = code(read('components/dialogs/DialogueV2BriefingScreen.tsx'));
    expect(src).toContain('const insets = useStableSafeAreaInsets();');
    expect(src).toContain('style={[styles.fill, { paddingTop: insets.top }]}');
    expect(src).not.toContain("edges={['top']}");
    expect(src).toContain("edges={['bottom']}");
    expect(src).toMatch(/style=\{\[styles\.fill, \{ backgroundColor: glass\.bg \}\]\} testID="dialogue-v2-briefing-screen"/);
  });
});
