import fs from 'node:fs';
import path from 'node:path';
import { localizedSupportSignature } from './support_inbox';

/**
 * Сторож: адрес, который уходит клиенту, обязан существовать на сайте.
 *
 * зачем (владелец, 2026-08-17): подпись писем годами вела на
 * knowlyapps.com/help — страницы, которой в knowly-www НЕТ и никогда не было.
 * Каждый клиент получал ссылку на 404, включая женщину, которой мы отвечали
 * сегодня. Обнаружил это владелец, открыв ссылку из письма руками.
 *
 * Обычные тесты этот класс дефекта не ловят: они проверяют, что подпись
 * СОБРАЛАСЬ, а не что адрес внутри неё куда-то ведёт. Здесь связь «текст
 * письма ↔ файлы сайта» проверяется напрямую.
 */

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SITE_ROOT = path.join(REPO_ROOT, 'knowly-www');

/** Существует ли путь на сайте: /guides → knowly-www/guides/index.html */
function sitePathExists(urlPath: string): boolean {
  const clean = urlPath.replace(/^\/+|\/+$/g, '');
  if (!clean) return fs.existsSync(path.join(SITE_ROOT, 'index.html'));
  const asDir = path.join(SITE_ROOT, clean, 'index.html');
  const asFile = path.join(SITE_ROOT, clean);
  const asHtml = path.join(SITE_ROOT, `${clean}.html`);
  return fs.existsSync(asDir) || fs.existsSync(asFile) || fs.existsSync(asHtml);
}

function knowlyPathsIn(text: string): readonly string[] {
  const found = new Set<string>();
  // Ловим и «https://knowlyapps.com/x», и «knowlyapps.com/x» без схемы.
  const re = /(?:https?:\/\/)?knowlyapps\.com(\/[A-Za-z0-9._\-/]*)?/gi;
  for (const match of text.matchAll(re)) found.add(match[1] ?? '/');
  return Object.freeze([...found]);
}

describe('ссылки в письмах поддержки ведут на живые страницы', () => {
  test('сайт лежит там, где ожидает сторож', () => {
    // зачем: если папку переименуют, сторож начнёт молча пропускать всё.
    expect(fs.existsSync(path.join(SITE_ROOT, 'index.html'))).toBe(true);
  });

  test('в подписях нет ссылок вообще (решение владельца)', () => {
    for (const body of ['Здравствуйте!', 'Hello!', '¡Hola!']) {
      const signature = localizedSupportSignature(body, 'Thanks so much, The Phraseman Team');
      expect(knowlyPathsIn(signature)).toEqual([]);
      expect(signature).not.toMatch(/https?:\/\//i);
    }
  });

  test('knowlyapps.com/help НЕ существует — значит и в коде его быть не должно', () => {
    // Первичный факт, из-за которого сторож и появился.
    expect(sitePathExists('/help')).toBe(false);
    const source = fs.readFileSync(path.join(__dirname, 'support_inbox.ts'), 'utf8');
    // Упоминание в комментарии-объяснении допустимо, в строковых литералах — нет.
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(codeOnly).not.toMatch(/knowlyapps\.com\/help/i);
  });

  test('каждый адрес knowlyapps.com в модулях поддержки существует на сайте', () => {
    // зачем сканировать файлы, а не только подпись: адреса живут ещё в знании
    // Джарвиса и в текстах готовых ответов (бот оплаты, сертификат).
    const files = [
      path.join(__dirname, 'support_inbox.ts'),
      path.join(__dirname, 'support_auto_reply_policy.ts'),
      path.join(__dirname, 'jarvis', 'knowledge', 'money.md'),
      path.join(__dirname, 'jarvis', 'knowledge', 'product.md'),
    ].filter((file) => fs.existsSync(file));

    const dead: string[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(file, 'utf8');
      // зачем вырезать комментарии в .ts: объяснение «почему убрали /help»
      // само содержит этот адрес. Клиенту уходят строковые литералы, а не
      // комментарии, — сторож должен смотреть только на них.
      const text = file.endsWith('.ts')
        ? raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
        : raw;
      for (const urlPath of knowlyPathsIn(text)) {
        if (!sitePathExists(urlPath)) dead.push(`${path.basename(file)} → knowlyapps.com${urlPath}`);
      }
    }
    // Сообщение важнее самого факта: сразу видно, что именно чинить.
    expect(dead).toEqual([]);
  });
});
