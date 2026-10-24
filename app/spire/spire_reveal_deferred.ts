/**
 * Пик: верный порядок слов после ошибки в «Собери фразу» — после отрисовки ошибки и с коротким потолком перебора.
 *
 * зачем (жалоба №3 «Пик: дальше 6–7 шага не уйти, сильно тормозит»; решение координатора 24.10): в пакете недели ответов нет,
 * только отпечатки (иначе ответ подсмотрят), поэтому верный порядок ищется перебором. Раньше — до 40 000 попыток синхронно в
 * момент тапа: замер 2eb0f97c6 — 259 мс даже на Node, на телефоне кадр стоял секундами. Теперь ошибка рисуется сразу, поиск —
 * после неё (InteractionManager → кадр), потолок 5 000. Не нашли — «Правильно: …» не показываем (как и раньше за потолком).
 * Журнал [PEAK-PERF]: длительность, найден ли, потолок.
 */
import { InteractionManager } from 'react-native';
import { DebugLogger } from '../debug-logger';
import { SPIRE_REVEAL_FAST_TRIES, spireRevealTokens } from '../../modules/spire/answer_reveal';
import { PEAK_PERF } from './peak_perf_probe';

const SPIRE = '[SPIRE]';

export type SpireRevealTokensInput = Readonly<{ saltId: string; taskId: string; bank: readonly string[]; count: number; fingerprint: string; taskNo: number }>;

export function revealTokensAfterPaint(input: SpireRevealTokensInput): Promise<readonly string[] | null> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        const started = Date.now();
        let found: readonly string[] | null = null;
        try {
          found = spireRevealTokens(input.saltId, input.taskId, input.bank, input.count, input.fingerprint, SPIRE_REVEAL_FAST_TRIES);
        } catch (error) {
          DebugLogger.warn(SPIRE, `${PEAK_PERF} reveal: поиск упал задание ${input.taskNo} → без «Правильно»: ${error instanceof Error ? error.message : String(error)}`);
        }
        DebugLogger.info(SPIRE, `${PEAK_PERF} reveal: задание ${input.taskNo} банк=${input.bank.length} слов=${input.count} найден=${found ? 'да' : 'нет'} за ${Date.now() - started}мс (потолок ${SPIRE_REVEAL_FAST_TRIES})`);
        resolve(found);
      });
    });
  });
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
