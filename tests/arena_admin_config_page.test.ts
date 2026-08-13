import * as fs from 'fs';
import * as path from 'path';
import {
  ARENA_CONFIG_EXPANSION_FLAGS,
  ARENA_CONFIG_FLAGS,
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
const page = fs.readFileSync(path.join(ROOT, 'admin/arena-config.html'), 'utf8');

describe('страница существует и зовёт правильные вызовы', () => {
  it('читает и пишет конфиг через админские вызовы', () => {
    expect(page).toContain("'adminArenaConfigGet'");
    expect(page).toContain("'adminArenaConfigSet'");
  });

  /** Писать напрямую в Firestore из браузера нельзя: правила это запрещают,
   *  и обходить их страницей значило бы обойти и журнал действий. */
  it('не пишет в Firestore напрямую', () => {
    expect(page).not.toContain('firebase-firestore.js');
    expect(page).not.toContain('setDoc(');
  });
});

describe('страница не разошлась с договором', () => {
  it('показывает КАЖДЫЙ переключатель, который проверяет бэкенд', () => {
    for (const flag of ARENA_CONFIG_FLAGS) {
      expect(page).toContain(`'${flag}'`);
    }
  });

  it('показывает все переключатели расширения', () => {
    for (const flag of ARENA_CONFIG_EXPANSION_FLAGS) {
      expect(page).toContain(`'${flag}'`);
    }
  });

  /**
   * Каждая проблема из договора должна иметь человеческий текст. Код вроде
   * `manifest_sha` на экране не говорит администратору ничего.
   */
  it('объясняет каждую возможную проблему по-человечески', () => {
    for (const code of [
      'schema_version', 'product_version', 'min_client_version',
      'pool_version', 'manifest_sha', 'merkle_root', 'flags',
    ]) {
      expect(page).toContain(`${code}:`);
    }
  });
});

describe('страница не даёт выстрелить в ногу', () => {
  /** Версии и хеши — из сборки. Ровно на них конфиг и ломался. */
  it('не даёт вводить версии схемы и хеши руками', () => {
    expect(page).not.toContain('id="schemaVersion"');
    expect(page).not.toContain('id="manifestSha256"');
    expect(page).not.toContain('id="poolVersion"');
  });

  it('требует причину — она уходит в журнал админских действий', () => {
    expect(page).toContain("id=\"reason\"");
    expect(page).toContain('Укажите причину');
  });

  /** Иначе админ решит, что кнопка не сработала, и нажмёт ещё раз. */
  it('предупреждает про задержку кеша', () => {
    expect(page).toContain('propagationDelayMs');
    expect(page).toContain('15');
  });

  /**
   * Три состояния различаются на экране: документа нет, документ не сходится,
   * документ в порядке. Первое лечится кнопкой, второе — выкаткой функций, и
   * путать их нельзя.
   */
  it('различает «нет документа», «не сходится» и «выключено»', () => {
    expect(page).toContain('arena_config_missing');
    expect(page).toContain('arena_config_incompatible');
    expect(page).toContain('Арена работает');
    expect(page).toContain('Арена выключена');
  });
});
