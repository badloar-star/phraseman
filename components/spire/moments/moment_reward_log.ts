// moment_reward_log.ts — журнал [MOMENT-REWARD]: какую награду окно момента показало и какой баланс у человека в эту секунду (то же, что увидит Главная).
// зачем (координатор 18.10, проверка наград моментов — сперва логи): окна ступени/этажа/вершины показывают «+N» из конфига, а кошелёк Главной
// растёт только после серверного снимка. Строка рядом с [MOMENT-REWARD] spire:flush даёт цепочку «показали → сервер начислил → локально».
export function logMomentReward(place: string, shown: number): void {
  void (async () => {
    try {
      const { peekRunes } = await import('../../../app/runes_system');
      console.log(`[MOMENT-REWARD] ${place} ${JSON.stringify({ shown, localBalance: peekRunes(), source: 'config', awardedBy: 'server:spireReportSteps' })}`); // guard-ok: строка на показ окна
    } catch (error) {
      console.warn(`[MOMENT-REWARD] ${place} log_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя журнала
    }
  })();
}
