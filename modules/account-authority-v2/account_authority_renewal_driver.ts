import type {
  AccountAuthorityRenewalGate,
  AccountAuthorityRenewalTrigger,
} from './account_authority_failure_policy';
import {
  accountAuthorityErrorCode,
  accountAuthorityErrorKind,
  type AccountAuthorityLogger,
} from './account_authority_logger';

/*
 * AA S4b (п. 4): привод продления аренды по шлюзу R1 (S2b-R1).
 *
 * зачем: продление (resume → acquire) — вызов функции и чтения Firestore.
 * Шлюз пускает его только на холодном старте и при возврате из фона и не чаще
 * раза в 5 минут; неудача отметку не сдвигает (следующий повод повторит).
 * Продление же — та самая «проверка при resume/foreground»: отказ сервера
 * из закрытого списка переводит устройство в «аренду забрали» (runtime).
 */

export type AccountAuthorityRenewalOutcome = 'skipped' | 'succeeded' | 'failed';

export type AccountAuthorityRenewalDriver = Readonly<{
  trigger(trigger: AccountAuthorityRenewalTrigger): Promise<AccountAuthorityRenewalOutcome>;
}>;

export function createAccountAuthorityRenewalDriver(input: Readonly<{
  gate: AccountAuthorityRenewalGate;
  resume: () => Promise<void>;
  log: AccountAuthorityLogger;
}>): AccountAuthorityRenewalDriver {
  const { gate, log } = input;
  return Object.freeze({
    trigger: async (trigger: AccountAuthorityRenewalTrigger): Promise<AccountAuthorityRenewalOutcome> => {
      const decision = gate.tryBegin(trigger);
      if (!decision.renew) {
        log.info('[AA-S4] renewal skipped', { source: trigger, reason: decision.reason });
        return 'skipped';
      }
      log.info('[AA-S4] renewal start', { source: trigger });
      try {
        await input.resume();
      } catch (error) {
        gate.finish('failed');
        log.warn('[AA-S4] renewal failed', {
          source: trigger, kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
        });
        return 'failed';
      }
      gate.finish('succeeded');
      log.info('[AA-S4] renewal done', { source: trigger });
      return 'succeeded';
    },
  });
}
