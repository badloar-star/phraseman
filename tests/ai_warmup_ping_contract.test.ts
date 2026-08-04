/**
 * Сторож бесплатности прогрева (warmupPing).
 *
 * Клиент будит инстанс Cloud Run заранее (app/ai_callable_resilience.ts), потому
 * что все три платные ИИ-функции держат minInstances: 0 — владелец не платит за
 * тёплый инстанс (сторож ai_functions_warm_instance_contract).
 *
 * ЧЕМ ЭТО ОПАСНО И ЧТО ОХРАНЯЕТСЯ ЗДЕСЬ: прогрев зовёт ту же самую платную
 * функцию. Если ветка warmupPing уедет ниже по коду — за проверку доступа,
 * за чтения Firestore, за списание дневного капа или за вызов OpenAI — то
 * безобидный «пинг» начнёт стоить денег и тратить квоту пользователя, который
 * ничего не просил. На аудитории это тысячи лишних чтений в день.
 *
 * Поэтому проверяем позицию: ветка ping'а обязана стоять ДО первого обращения
 * к Firestore и ДО любых гейтов. Тест намеренно текстовый (как соседние
 * контрактные сторожа проекта) — он ловит именно смещение ветки при рефакторинге.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

/** Тело обработчика callable — от опций onCall до конца файла. */
function handlerBody(source: string, exportName: string): string {
  const start = source.indexOf(`export const ${exportName} = onCall({`);
  expect(start).toBeGreaterThan(-1);
  return source.slice(start);
}

const AI_CALLABLES: ReadonlyArray<readonly [string, string]> = [
  ['functions/src/explain_phrase.ts', 'explainPhrase'],
  ['functions/src/mistake_explain.ts', 'explainMistake'],
  ['functions/src/premium_dialog.ts', 'premiumDialogSend'],
];

describe('warmupPing остаётся бесплатным', () => {
  it.each(AI_CALLABLES)('%s: %s принимает warmupPing', (file, exportName) => {
    expect(handlerBody(read(file), exportName)).toContain('warmupPing');
  });

  it.each(AI_CALLABLES)('%s: %s отвечает на ping ДО Firestore', (file, exportName) => {
    const body = handlerBody(read(file), exportName);
    const ping = body.indexOf('warmupPing');
    const firestore = body.indexOf('admin.firestore()');
    expect(ping).toBeGreaterThan(-1);
    // Функция без обращения к Firestore в теле — ограничение неприменимо.
    if (firestore === -1) return;
    expect(ping).toBeLessThan(firestore);
  });

  it.each(AI_CALLABLES)('%s: %s не вызывает OpenAI на ping', (file, exportName) => {
    const body = handlerBody(read(file), exportName);
    const ping = body.indexOf('warmupPing');
    const openai = body.indexOf('OPENAI_API_KEY.value()');
    expect(ping).toBeGreaterThan(-1);
    if (openai === -1) return;
    expect(ping).toBeLessThan(openai);
  });

  it('explainPhrase не списывает дневной free-кап на ping', () => {
    const body = handlerBody(read('functions/src/explain_phrase.ts'), 'explainPhrase');
    const ping = body.indexOf('warmupPing');
    const cap = body.indexOf('enforceFreeJobGenLimit');
    expect(ping).toBeGreaterThan(-1);
    expect(cap).toBeGreaterThan(-1);
    expect(ping).toBeLessThan(cap);
  });

  it('ping требует авторизацию — открытой дырой прогрев быть не должен', () => {
    // Иначе кто угодно без аккаунта мог бы дёргать платную функцию.
    for (const [file, exportName] of AI_CALLABLES) {
      const body = handlerBody(read(file), exportName);
      const auth = body.indexOf("'unauthenticated'");
      const ping = body.indexOf('warmupPing');
      expect(auth).toBeGreaterThan(-1);
      expect(auth).toBeLessThan(ping);
    }
  });
});

/**
 * Сторож границы повтора для СПИСЫВАЮЩЕГО вызова.
 *
 * Дефект, найденный аудитом 2026-08-04: отправка сообщения в диалоге списывает
 * дневную квоту (enforceDailyQuota) ДО обращения к OpenAI. Если повтор этого
 * вызова расширят до общей проверки isColdStartLike, он начнёт повторяться по
 * таймауту — а таймаут не гарантирует, что сервер не отработал. Пользователь
 * потерял бы вторую единицу квоты и отправил сообщение дважды.
 *
 * Тест текстовый намеренно: он охраняет именно ВЫБОР предиката в месте вызова,
 * который никакой юнит-тест логики не заметит.
 */
describe('повтор отправки диалога остаётся строгим', () => {
  it('premiumDialogSend повторяется ТОЛЬКО по isDefinitelyNotStarted', () => {
    const client = read('app/ai_dialog_client.ts');
    // Якорь — метка внутри опций ретрая, а не имя callable: имя встречается
    // раньше в прогреве (warmPremiumDialog), и срез уехал бы не туда.
    const start = client.indexOf("label: 'premiumDialogSend'");
    expect(start).toBeGreaterThan(-1);
    const callSite = client.slice(start, start + 300);
    expect(callSite).toContain('shouldRetry: isDefinitelyNotStarted');
    // Общая проверка здесь запрещена — она повторяет и по таймауту.
    expect(callSite).not.toContain('shouldRetry: isColdStartLike');
  });

  it('квота диалога списывается ДО генерации — предпосылка строгого правила жива', () => {
    // Именно этот порядок делает повтор по таймауту опасным. Если квоту начнут
    // снимать ПОСЛЕ успешной генерации, правило можно смягчить — но осознанно,
    // уронив сначала этот тест, а не молча.
    const body = handlerBody(read('functions/src/premium_dialog.ts'), 'premiumDialogSend');
    const quotaCharge = body.indexOf('await enforceDailyQuota(');
    const generation = body.indexOf('fetch(OPENAI_CHAT_URL');
    expect(quotaCharge).toBeGreaterThan(-1);
    expect(generation).toBeGreaterThan(-1);
    expect(quotaCharge).toBeLessThan(generation);
  });
});
