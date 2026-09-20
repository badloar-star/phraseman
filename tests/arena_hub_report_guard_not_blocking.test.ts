/**
 * Сторож: незавершённая проверка отчётов НЕ гасит кнопки режимов.
 *
 * Повод (владелец 2026-09-20, «они серые они не нажимаются»): гвард отчётов
 * висел в `checking`, из-за чего `known` был false, блок становился
 * `unknown`, и все режимы гасли с подписью «Данные пока недоступны» — при
 * полностью здоровом хабе. Логи устройства: availabilityEnabled=true,
 * homeLoaded=true, serverFailure=false, reportGuard=checking.
 *
 * Правило: запрещает только ПОДТВЕРЖДЁННЫЙ отказ, а не «ещё проверяю».
 *
 * Сработал — чинить хаб, а не сторожа.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { arenaHubActionBlock } from '../modules/arena/hub_view';

function hubCode(): string {
  return readFileSync(
    join(__dirname, '..', 'components', 'arena', 'ArenaHubSurface.tsx'), 'utf8',
  ).replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('гвард отчётов не держит кнопки режимов', () => {
  test('known не зависит от незавершённой проверки', () => {
    // Именно эта форма гасила все режимы при здоровом хабе.
    expect(hubCode()).not.toContain('known: home !== null && !reportChecking');
    expect(hubCode()).not.toContain('known: expansion !== null && !reportChecking');
  });

  test('здоровый хаб даёт ok, даже пока проверка не закончена', () => {
    expect(arenaHubActionBlock({
      known: true,
      offline: false,
      server: false,
      maintenance: false,
      reportBlocked: false,
    })).toBe('ok');
  });

  test('подтверждённая блокировка отчётов по-прежнему запрещает', () => {
    expect(arenaHubActionBlock({
      known: true,
      offline: false,
      server: false,
      maintenance: false,
      reportBlocked: true,
    })).toBe('report_blocked');
  });

  test('неизвестное состояние данных по-прежнему запрещает', () => {
    // Данных хаба нет вовсе — это честная причина, в отличие от «ещё проверяю».
    expect(arenaHubActionBlock({ known: false })).toBe('unknown');
  });
});
