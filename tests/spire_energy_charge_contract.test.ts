/**
 * Сторож PM-274: ступень Шпиля стоит 1 энергию по единому контракту 2.0.
 *
 * зачем (TOWER.md T3, §4.2; D06/D07/D67/D72/D87): «одна ступень = одно списание
 * по id ступени, при старте. Сбой подготовки до первого задания энергию не
 * тратит. Возврата за провал нет. Plus без ожидания». До PM-274 ступень молча
 * уходила в 'classic_lesson' по умолчанию — цена совпадала случайно, а окно
 * энергии назвало бы её «урок».
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  activityEnergyCost,
  energyActivityForSessionKind,
} from '../app/energy_contract';
import { energyActivityTitle } from '../app/energy_activity_titles';
import { createEnergySessionIntent } from '../app/energy_session_operation_ledger';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('PM-274: энергия за ступень Шпиля', () => {
  it('ступень — своё занятие в каталоге цен и стоит ровно 1', () => {
    expect(energyActivityForSessionKind('spire_step')).toBe('spire_step');
    expect(activityEnergyCost('spire_step')).toBe(1);
    expect(energyActivityTitle('spire_step', 'ru')).toContain('Пика');
  });

  it('повтор mount/prefetch той же попытки даёт тот же id операции (журнал не спишет дважды)', () => {
    const a = createEnergySessionIntent('spire_step', '2026-W40:en:f1:s3', 'run-1');
    const b = createEnergySessionIntent('spire_step', '2026-W40:en:f1:s3', 'run-1');
    expect(a.operationId).toBe(b.operationId);
  });

  it('«Ещё раз» — новая попытка и новое списание (D67: возврата за провал нет)', () => {
    const a = createEnergySessionIntent('spire_step', '2026-W40:en:f1:s3', 'run-1');
    const b = createEnergySessionIntent('spire_step', '2026-W40:en:f1:s3', 'run-2');
    expect(a.operationId).not.toBe(b.operationId);
  });

  describe('исполнитель ступени (исходник)', () => {
    const runner = read('app/spire/use_spire_step_runner.ts');
    const game = read('app/spire/use_spire_game.ts');

    it('намерение энергии привязано к ступени и к id попытки', () => {
      expect(runner).toMatch(/useEnergySessionIntent\('spire_step',\s*`\$\{ctx\.weekKey\}:\$\{ctx\.lang\}:f\$\{ctx\.floor\}:s\$\{ctx\.stepInFloor \+ 1\}`,\s*input\.runId\)/);
      // id попытки рождается один раз при открытии ступени, а не в рендере.
      expect(game).toMatch(/const runId = `\$\{weekKey\}:\$\{floor\}:\$\{stepInFloor \+ 1\}:\$\{attempt\}:\$\{Date\.now\(\)\}`/);
    });

    it('списание одно: под флагом chargeStartedRef, через confirmSpendOne', () => {
      expect(runner.match(/confirmSpendOne\(/g)?.length).toBe(1);
      expect(runner).toMatch(/if \(chargeStartedRef\.current\) return;\s*chargeStartedRef\.current = true;/);
    });

    it('нет энергии — ступень не начинается; Plus/безлимит проходит без ожидания', () => {
      expect(runner).toMatch(/result === 'insufficient' \? 'no_energy' : 'cancelled'/);
      // 'unlimited' не ведёт в отказ: в 'playing' переходит всё, что не insufficient/cancelled.
      expect(runner).toMatch(/chargedRef\.current = result === 'spent' \? 'spent' : 'acked'/);
    });

    it('возврат только если первое задание не показано; провал не возвращает', () => {
      const refunds = runner.match(/refundOne\(intent\.operationId, '([a-z_]+)'\)/g) ?? [];
      expect(refunds).toEqual([
        "refundOne(intent.operationId, 'spire_closed_during_charge')",
        "refundOne(intent.operationId, 'spire_first_task_not_shown')",
      ]);
      // Первое задание показано → старт подтверждён, дальше возврата нет.
      expect(runner).toMatch(/acknowledgeSessionStart\(intent\.operationId\)/);
      const finishBody = runner.slice(runner.indexOf('const finish = useCallback'), runner.indexOf('const finish = useCallback') + 1500);
      expect(finishBody).not.toContain('refundOne');
    });
  });
});
