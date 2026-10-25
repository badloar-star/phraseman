// outcome_host_trace.ts — [SPIRE-AFTER-ROUND] сколько окон итога Пика сейчас смонтировано (для трассы закрытия).
//
// зачем (Сверка 25.10, «возможный, не стабильный» 1 из 2: после «Время вышло» тап «В раздел Пик» → onLater, а картинка итога
// висит 7+ с; правило владельца «сперва логи»): окно итога (SpireOutcomeMomentHost) отмечается здесь при монтировании и
// снятии, а выбор «В раздел Пик» через 300 мс и 1 с пишет, осталось ли окно в дереве. Так видно: React окно снял, а натив
// держит картинку (Modal снят, будучи visible) — или окно не снялось вовсе (итог не обнулился).

let mounted = 0;
let lastKind: string | null = null;
let lastChangeAt = 0;

export function noteOutcomeHostMounted(kind: string): void {
  mounted += 1;
  lastKind = kind;
  lastChangeAt = Date.now();
  console.log(`[SPIRE-AFTER-ROUND] окно итога смонтировано kind=${kind} всего=${mounted}`); // guard-ok: трасса закрытия итога
}

export function noteOutcomeHostUnmounted(kind: string, reason: string): void {
  mounted = Math.max(0, mounted - 1); // guard-ok: счётчик смонтированных окон, не баланс
  lastChangeAt = Date.now();
  console.log(`[SPIRE-AFTER-ROUND] окно итога снято kind=${kind} причина=${reason} осталось=${mounted}`); // guard-ok: трасса закрытия итога
}

export function peekOutcomeHost(): Readonly<{ mounted: number; lastKind: string | null; sinceChangeMs: number }> {
  return { mounted, lastKind, sinceChangeMs: lastChangeAt === 0 ? -1 : Date.now() - lastChangeAt };
}

/** После выбора «В раздел Пик»: что в дереве через 300 мс и 1 с (окно должно быть снято). */
export function traceOutcomeCloseAfter(kind: string): void {
  for (const ms of [300, 1000]) {
    setTimeout(() => {
      const s = peekOutcomeHost();
      const verdict = s.mounted === 0 ? 'окно снято' : `ОКНО ВСЁ ЕЩЁ СМОНТИРОВАНО (kind=${s.lastKind})`;
      console.log(`[SPIRE-AFTER-ROUND] через ${ms}мс после toSpire kind=${kind}: ${verdict} всего=${s.mounted} изменение ${s.sinceChangeMs}мс назад`); // guard-ok: трасса закрытия итога
    }, ms);
  }
}
