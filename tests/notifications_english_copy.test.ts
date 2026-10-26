import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// зачем (координатор 12.10, решение «б»): английские локальные пуши. Планировщик (когда и сколько шлём) НЕ менялся — только тексты и
// нормализация языка. Пока ENGLISH_UI_LOCALE_ENABLED=false, en ведёт себя как раньше (русские пуши); при включённом — английские.
let mockEnglishEnabled = true;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get ENGLISH_UI_LOCALE_ENABLED() { return mockEnglishEnabled; },
}));

import { normalizeNotificationLang, pickNotif, reminderMessages } from '../app/notifications';

describe('push language normalisation', () => {
  afterEach(() => { mockEnglishEnabled = true; });

  it('uses English only while the English interface is enabled', () => {
    mockEnglishEnabled = true;
    expect(normalizeNotificationLang('en')).toBe('en');
    mockEnglishEnabled = false;
    expect(normalizeNotificationLang('en')).toBe('ru');
  });

  it('keeps every other language as before', () => {
    for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) expect(normalizeNotificationLang(lang)).toBe(lang);
    expect(normalizeNotificationLang('xx')).toBe('ru');
    expect(normalizeNotificationLang(undefined)).toBe('ru');
  });

  it('picks the English copy when present and falls back to Russian otherwise', () => {
    const full = { ru: 'ru', uk: 'uk', es: 'es', 'pt-BR': 'pt', vi: 'vi', id: 'id', tr: 'tr', pl: 'pl' } as const;
    mockEnglishEnabled = true;
    expect(pickNotif('en', { ...full, en: 'en' })).toBe('en');
    expect(pickNotif('en', full)).toBe('ru');
    mockEnglishEnabled = false;
    expect(pickNotif('en', { ...full, en: 'en' })).toBe('ru');
  });

  it('reminder messages: English for both course variants when enabled, Russian (unchanged) when switched off', () => {
    mockEnglishEnabled = true;
    const en = reminderMessages('en');
    expect(en).toHaveLength(5);
    expect(en[0]!.title).toBe('🔥 Your streak is waiting!');
    // зачем (голос PhraseMan e7571a7a3): «Don’t break the streak» заменено на тёплое «keeps your streak growing» — тест держит английский текст, а не старую формулировку
    expect(reminderMessages('en', 'fr')[0]!.body).toContain('keeps your streak growing');
    mockEnglishEnabled = false;
    expect(reminderMessages('en')).toEqual(reminderMessages('ru'));
    expect(reminderMessages('en', 'fr')).toEqual(reminderMessages('ru', 'fr'));
  });
});

describe('every push type has English text', () => {
  const file = path.resolve(__dirname, '..', 'app', 'notifications.ts');
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile('notifications.ts', source, ts.ScriptTarget.Latest, true);
  const keyName = (p: ts.ObjectLiteralElementLike) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null);

  type Copy = { line: number; node: ts.ObjectLiteralExpression; props: Map<string, ts.Expression> };
  const copies: Copy[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'notificationCopy' && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
      const obj = n.arguments[0];
      const props = new Map<string, ts.Expression>();
      for (const p of obj.properties) if (ts.isPropertyAssignment(p)) { const k = keyName(p); if (k) props.set(k, p.initializer); }
      copies.push({ line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, node: obj, props });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);

  it('finds the push copy tables', () => {
    expect(copies.length).toBeGreaterThanOrEqual(30);
  });

  it('each table that has Russian and Spanish also has an English entry', () => {
    const missing = copies.filter((c) => c.props.has('ru') && c.props.has('es') && !c.props.has('en')).map((c) => c.line);
    expect(missing).toEqual([]);
  });

  const simplePlaceholders = (e: ts.Expression): string[] => {
    const found = new Set<string>();
    const walk = (n: ts.Node) => {
      if (ts.isTemplateExpression(n)) {
        for (const span of n.templateSpans) if (ts.isIdentifier(span.expression)) found.add(span.expression.text);
      }
      ts.forEachChild(n, walk);
    };
    walk(e);
    return [...found].sort();
  };

  it('English keeps the same {placeholders} as the Spanish original', () => {
    const bad: string[] = [];
    for (const c of copies) {
      const en = c.props.get('en');
      const es = c.props.get('es');
      if (!en || !es) continue;
      const a = simplePlaceholders(es);
      const b = simplePlaceholders(en);
      // Английский может записать число словом-формой иначе, но переменные из es обязаны встречаться и в en.
      for (const name of a) if (!b.includes(name)) bad.push(`L${c.line}: нет \${${name}} в en`);
    }
    expect(bad).toEqual([]);
  });

  it('English push titles and bodies stay short enough for a notification', () => {
    const tooLong: string[] = [];
    const collectText = (e: ts.Expression): string[] => {
      const out: string[] = [];
      const walk = (n: ts.Node) => {
        if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
        else if (ts.isTemplateExpression(n)) out.push(n.head.text + n.templateSpans.map((s) => 'XXX' + s.literal.text).join(''));
        ts.forEachChild(n, walk);
      };
      walk(e);
      return out;
    };
    for (const c of copies) {
      const en = c.props.get('en');
      if (!en) continue;
      for (const text of collectText(en)) if (text.length > 140) tooLong.push(`L${c.line}: ${text.length} знаков «${text.slice(0, 40)}…»`);
    }
    expect(tooLong).toEqual([]);
    // Заголовки напоминаний (MESSAGES_EN) — короче: на экране блокировки их режут первыми.
    const titles = reminderMessages('en').map((m) => m.title);
    for (const title of titles) expect(title.length).toBeLessThanOrEqual(40);
  });
});
