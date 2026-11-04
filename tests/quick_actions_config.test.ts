// Сторож ярлыков на значке (владелец 04.11): конфиг ↔ существующие маршруты, 9 языков, V2 не открывается, пакет зафиксирован точно.
import fs from 'fs';
import path from 'path';
import {
  QUICK_ACTION_IDS,
  QUICK_ACTION_ROUTE_FILES,
  QUICK_ACTION_TITLES,
  lastLessonIdOrFirst,
  quickActionRoute,
  quickActionTitles,
} from '../app/quick_actions_config';

const root = path.join(__dirname, '..');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('ярлыки на значке', () => {
  it('маршрут каждого ярлыка — существующий экран приложения', () => {
    for (const id of QUICK_ACTION_IDS) {
      const file = path.join(root, 'app', `${QUICK_ACTION_ROUTE_FILES[id]}.tsx`);
      expect(fs.existsSync(file)).toBe(true);
      expect(quickActionRoute(id, '5').pathname).toBe(`/${QUICK_ACTION_ROUTE_FILES[id]}`);
    }
  });

  it('V2 не открывается ни одним ярлыком (заморозка)', () => {
    for (const id of QUICK_ACTION_IDS) {
      expect(JSON.stringify(quickActionRoute(id, '3'))).not.toMatch(/learning-v2|learning_v2/i);
    }
  });

  it('«Продолжить урок»: последний урок или урок 1 (новичок/мусор)', () => {
    expect(quickActionRoute('continue_lesson', '7').params).toEqual({ id: '7' });
    for (const raw of [null, undefined, '', 'x', '0', '33', '-2']) expect(lastLessonIdOrFirst(raw)).toBe('1');
  });

  it('подписи: 9 языков × 3 ярлыка, непустые, короткие; неизвестный язык → английский', () => {
    for (const lang of LANGS) {
      for (const id of QUICK_ACTION_IDS) {
        const title = QUICK_ACTION_TITLES[lang][id];
        expect(title.trim().length).toBeGreaterThan(0);
        expect(title.length).toBeLessThanOrEqual(30);
      }
    }
    expect(quickActionTitles('xx')).toBe(QUICK_ACTION_TITLES.en);
  });

  it('подписи совпадают с файлом Переводчика (английская строка и русская)', () => {
    const md = fs.readFileSync(path.join(root, 'docs', 'work', 'ux_conveniences_strings_9lang.md'), 'utf8');
    for (const [key, id] of [['continueLesson', 'continue_lesson'], ['reviewWords', 'review_words'], ['newCard', 'new_card']] as const) {
      const row = md.split('\n').find((line) => line.startsWith(`| ${key} |`)) ?? '';
      const cells = row.split('|').map((c) => c.trim()).filter(Boolean).slice(1);
      LANGS.forEach((lang, i) => expect(QUICK_ACTION_TITLES[lang][id]).toBe(cells[i]));
    }
  });

  it('пакет зафиксирован точно (без ^ и ~) и мост без сетевых вызовов', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
    expect(pkg.dependencies['expo-quick-actions']).toBe('6.0.1');
    const bridge = fs.readFileSync(path.join(root, 'app', 'quick_actions_bridge.tsx'), 'utf8');
    expect(bridge).not.toMatch(/fetch\(|firestore|httpsCallable|XMLHttpRequest/i);
  });

  it('мост смонтирован во вкладках (после онбординга)', () => {
    const tabs = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');
    expect(tabs).toMatch(/<QuickActionsBridge \/>/);
  });

  // правки Ревизора 04.11: онбординг и один initial за запуск
  it('ярлыки и действия ждут конец онбординга', () => {
    const bridge = fs.readFileSync(path.join(root, 'app', 'quick_actions_bridge.tsx'), 'utf8');
    expect(bridge).toMatch(/whenOnboardingSettled\('quick_actions_items'\)/);
    expect(bridge).toMatch(/whenOnboardingSettled\(`quick_action_\$\{source\}`\)/);
  });

  it('флаг начального действия — на уровне модуля, не useRef', () => {
    const bridge = fs.readFileSync(path.join(root, 'app', 'quick_actions_bridge.tsx'), 'utf8');
    expect(bridge).toMatch(/^let initialQuickActionHandled = false;/m);
    expect(bridge).not.toMatch(/handledInitialRef/);
  });
});
