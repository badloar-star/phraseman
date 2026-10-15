// lesson_next_access.ts — решение «Следующий урок» на итоге урока: открыть урок или показать пейвол.
//
// зачем (Ревизор по 31029c044, координатор 15.10, 🔴 «деньги и доверие»): быстрая проверка доступа без облака (`allowCloudRefresh:false`) клала в кэш `false` при холодном кэше, запасная проверка
// брала этот же `false` из кэша (TTL 5 мин) и платящий видел пейвол на уроке 4+. Правило теперь такое: пейвол — ТОЛЬКО при подтверждённом «нет». Порядок: контекст приложения говорит «Plus» →
// открываем сразу; иначе кэш памяти сбрасываем (`prepare`) и спрашиваем полным путём с облаком, но не дольше потолка; ответ «Plus» → открываем; «нет» (и контекст всё ещё не Plus) → пейвол;
// нет ответа за потолок / сбой проверки → открываем без пейвола (замок самого урока решает на входе), а если за это время контекст стал «Plus» — тоже открываем.
export type NextLessonAccessDecision = 'open' | 'paywall';

export type NextLessonAccessInput = Readonly<{
  /** Следующему уроку нужен Plus (по лимиту Free). */
  needsPremium: boolean;
  /** Что сейчас говорит контекст приложения (PremiumContext.hasPremiumAccess) — читается в момент решения, не на тапе. */
  contextPremium: () => boolean;
  /** Сбросить кэш доступа в памяти перед полной проверкой (холодный `false` не должен попасть в запасной вызов). */
  prepare: () => void;
  /** Полная проверка с облаком: true — Plus, false — подтверждённое «нет»; бросает при сбое. */
  verify: () => Promise<boolean>;
  /** Потолок ожидания ответа, мс. */
  timeoutMs?: number;
  /** Журнал решения (значение, а не голое true/false). */
  log?: (message: string) => void;
}>;

export const NEXT_LESSON_ACCESS_TIMEOUT_MS = 4_000;

export async function resolveNextLessonAccess(input: NextLessonAccessInput): Promise<NextLessonAccessDecision> {
  const log = input.log ?? (() => undefined);
  if (!input.needsPremium) {
    log('needsPremium=false → open');
    return 'open';
  }
  if (input.contextPremium()) {
    log('context=Plus → open без проверки');
    return 'open';
  }
  input.prepare();
  const timeoutMs = input.timeoutMs ?? NEXT_LESSON_ACCESS_TIMEOUT_MS;
  type Answer = 'plus' | 'free' | 'unconfirmed';
  let timer: ReturnType<typeof setTimeout> | null = null;
  const answer = await Promise.race<Answer>([
    input.verify().then((plus): Answer => (plus ? 'plus' : 'free')).catch((error: unknown): Answer => {
      log(`verify упала: ${error instanceof Error ? error.message : String(error)} → не подтверждено`);
      return 'unconfirmed';
    }),
    new Promise<Answer>((resolve) => { timer = setTimeout(() => resolve('unconfirmed'), timeoutMs); }),
  ]);
  if (timer) clearTimeout(timer);
  const contextNow = input.contextPremium();
  const decision: NextLessonAccessDecision = answer === 'free' && !contextNow ? 'paywall' : 'open';
  log(`answer=${answer} context=${String(contextNow)} → ${decision}`);
  return decision;
}

/* expo-router: keep this utility from being treated as a screen */
export default function __LessonNextAccessRouteShim() {
  return null;
}
