import * as fs from 'fs';
import * as path from 'path';
import {
  ARENA_CONFIG_EXPANSION_FLAGS,
  ARENA_CONFIG_FLAGS,
  arenaBuildConfigDoc,
} from '../functions/src/arena_config_contract';

/**
 * Экран управления конфигом Арены в админке.
 *
 * Владелец: «в админке нет ни одного экрана управления этим конфигом, а она
 * должна быть написана». Это корневая причина того, что Арена не работает:
 * бэкенд закрыт по умолчанию, и включить его было нечем.
 *
 * Страница статическая, отрендерить её здесь нечем, но самое дорогое в ней
 * проверяемо и без браузера: не разошлась ли она с серверным договором. Именно
 * такое расхождение и делает экран бесполезным — он покажет не те
 * переключатели или отправит не те имена.
 */

const ROOT = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'admin/v2/legacy.html'), 'utf8');
const arenaMarkup = page.slice(
  page.indexOf('<!-- Арена живёт только здесь:'),
  page.indexOf('<!-- 🗓 НЕДЕЛЬНЫЕ БОНУСЫ'),
);
const arenaScript = page.slice(
  page.indexOf('const ARENA_BASE_FLAGS = ['),
  page.indexOf('window.loadControlPanel = async function()'),
);

describe('страница существует и зовёт правильные вызовы', () => {
  it('читает и пишет конфиг через админские вызовы', () => {
    expect(page).toContain("'adminArenaConfigGet'");
    expect(page).toContain("'adminArenaConfigSet'");
  });

  /** Писать напрямую в Firestore из браузера нельзя: правила это запрещают,
   *  и обходить их страницей значило бы обойти и журнал действий. */
  it('не пишет в Firestore напрямую', () => {
    expect(arenaScript).not.toContain('setDoc(');
    expect(arenaScript).not.toContain("collection('arena_v2_config')");
  });
});

describe('страница не разошлась с договором', () => {
  it('показывает КАЖДЫЙ переключатель, который проверяет бэкенд', () => {
    for (const flag of ARENA_CONFIG_FLAGS) {
      expect(page).toContain(`'${flag}'`);
    }
  });

  it('не сбрасывает скрытые переключатели расширения при сохранении базы', () => {
    expect(arenaScript).toContain('window._arenaConfigExpansionFlags');
    expect(arenaScript).toContain('expansionFlags: { ...window._arenaConfigExpansionFlags }');
  });

  /**
   * Каждая проблема из договора должна иметь человеческий текст. Код вроде
   * `manifest_sha` на экране не говорит администратору ничего.
   */
  it('не вываливает внутренние коды проблем в рабочую форму', () => {
    expect(arenaMarkup).not.toContain('schema_version');
    expect(arenaMarkup).not.toContain('manifest_sha');
    expect(arenaScript).toContain('Конфиг Арены несовместим с сервером');
  });
});

describe('страница не даёт выстрелить в ногу', () => {
  /** Версии и хеши — из сборки. Ровно на них конфиг и ломался. */
  it('не даёт вводить версии схемы и хеши руками', () => {
    expect(arenaMarkup).not.toContain('id="schemaVersion"');
    expect(arenaMarkup).not.toContain('id="manifestSha256"');
    expect(arenaMarkup).not.toContain('id="poolVersion"');
  });

  it('не просит администратора вводить версию приложения', () => {
    expect(arenaMarkup).not.toContain('id="minClientVersion"');
    expect(arenaScript).toContain("minClientVersion: '0.0.0'");
  });

  it('требует причину — она уходит в журнал админских действий', () => {
    expect(arenaMarkup).toContain('id="cp-arena-reason"');
    expect(arenaScript).toContain('Укажи причину изменения');
  });

  /** Иначе админ решит, что кнопка не сработала, и нажмёт ещё раз. */
  it('предупреждает про задержку кеша', () => {
    expect(arenaMarkup).toContain('15 секунд');
    expect(arenaScript).toContain('15 секунд');
  });

  /**
   * Три состояния различаются на экране: документа нет, документ не сходится,
   * документ в порядке. Первое лечится кнопкой, второе — выкаткой функций, и
   * путать их нельзя.
   */
  it('различает «нет документа», «не сходится» и «выключено»', () => {
    expect(arenaScript).toContain('Арена не настроена');
    expect(arenaScript).toContain('Конфиг Арены несовместим');
    expect(arenaScript).toContain('Арена работает');
    expect(arenaScript).toContain('Арена выключена');
  });
});

/**
 * Страница конфига обязана уметь всё, что проверяет сервер.
 *
 * Иначе получается тихая ловушка: сервер закрывает раздел по флагу, которого
 * на странице нет, и владелец видит выключенный раздел без единого способа
 * его включить — кроме ручной правки документа в консоли Firestore, которую
 * он запретил (D-01). Так и было: сервер смотрел семь переключателей
 * расширения, страница знала четыре.
 */
describe('Arena config page covers every server gate', () => {
  const page = fs.readFileSync(path.join(ROOT, 'admin/v2/legacy.html'), 'utf8');
  const expansion = fs.readFileSync(path.join(ROOT, 'functions/src/arena_expansion.ts'), 'utf8');

  /**
   * Флаги, по которым сервер решает доступность разделов расширения.
   *
   * Берутся только те, что читаются ИЗ КОНФИГА (`config.arenaXEnabled`).
   * Простой поиск по имени сюда же притаскивал `arenaPartnerNudgesEnabled` —
   * а это настройка самого игрока в его документе, оператору она не
   * принадлежит. Ложная тревога в такой проверке хуже пропуска: по ней в
   * операторскую страницу добавляют чужую ручку.
   */
  function serverFlags(): readonly string[] {
    const matches = expansion.match(/config\.(arena[A-Za-z0-9]*Enabled)/g) ?? [];
    return [...new Set(matches.map((raw) => raw.split('.')[1] as string))];
  }

  test('разбор нашёл флаги сервера', () => {
    expect(serverFlags().length).toBeGreaterThanOrEqual(6);
  });

  test('каждый флаг расширения остаётся в серверном договоре', () => {
    const missing: string[] = [];
    for (const flag of serverFlags()) {
      if (!ARENA_CONFIG_EXPANSION_FLAGS.includes(flag as never)) missing.push(`${flag}: нет в договоре`);
    }
    expect(missing).toEqual([]);
  });

  test('версии магазина и соперничеств подставляет сборка, а не живая форма', () => {
    // Опечатка в такой строке даёт отказ, неотличимый от «раздел выключен».
    const doc = arenaBuildConfigDoc({});
    expect(doc.arenaCosmeticCatalogVersion).toBe('arena-cosmetics.v1');
    expect(doc.arenaRivalRuntimeVersion).toBe('arena-rival.v1');
    expect(expansion).toContain("config.arenaRivalRuntimeVersion !== 'arena-rival.v1'");
    expect(arenaMarkup).not.toContain('arenaCosmeticCatalogVersion');
    expect(arenaMarkup).not.toContain('arenaRivalRuntimeVersion');
  });
});
