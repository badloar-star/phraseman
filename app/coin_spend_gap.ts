// coin_spend_gap.ts — разрыв «показано ≠ можно потратить» при покупке за монеты.
// зачем (координатор 25.10): плашки показывают кошелёк + ожидающие монеты Пика (1140), а потратить можно только влитый кошелёк (690).
// Покупка за 800 говорила «не хватает монет», хотя на экране 1140 — ловушка. Если цена ≤ показанного, но > тратимого, сначала досылаем
// очередь Пика и ждём, пока сервер вольёт монеты в кошелёк; получилось — покупка повторяется сама, без второго тапа. Нет сети или не
// вышло — понятный текст «Монеты ещё сохраняются…», а не «не хватает». Досылка и повтор — ВНЕ замков покупки: слияние кошелька Пика
// берёт те же замки аккаунта и хранилища, что prepareRuneSpend, — внутри была бы взаимная блокировка.
// Firebase-экономия: сеть только в разрыве (редкий случай) и одной пачкой на язык Пика с ожидающими ступенями.

export type CoinSpendGapOutcome = 'not_gap' | 'flushed' | 'offline' | 'flush_failed';
export const COIN_SPEND_GAP_WAIT_MS = 4_000;

export type CoinSpendGapDeps = Readonly<{
  peekSpendable: () => number;
  peekDisplayed: () => number;
  /** Дослать очередь Пика; 'sent' — хоть одна пачка ушла и вернулась, 'offline' — сети нет, 'failed' — ушла с ошибкой/пропущена. */
  flush: () => Promise<'sent' | 'offline' | 'failed'>;
  /** Дождаться, пока тратимый кошелёк дорастёт до цены (слияние ответа сервера идёт фоном). */
  waitSpendable: (price: number, ms: number) => Promise<boolean>;
}>;

async function defaultDeps(): Promise<CoinSpendGapDeps> {
  const runes = await import('./runes_system');
  return {
    peekSpendable: () => runes.peekRunes(),
    peekDisplayed: () => runes.peekDisplayedRunes(),
    flush: flushPeakQueues,
    waitSpendable: (price, ms) => new Promise<boolean>((resolve) => {
      if (runes.peekRunes() >= price) { resolve(true); return; }
      let settled = false;
      const finish = (value: boolean): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        off();
        resolve(value);
      };
      const off = runes.subscribeRunesSnapshot((next) => { if (next.balance >= price) finish(true); });
      const timer = setTimeout(() => finish(runes.peekRunes() >= price), ms);
    }),
  };
}

const SPIRE_LANGS = ['en', 'es', 'de', 'fr', 'it'] as const;

async function flushPeakQueues(): Promise<'sent' | 'offline' | 'failed'> {
  try {
    const [{ peekSpireWeekLocal, spireFlushNow }, { getCanonicalUserId }, { getStableId }] = await Promise.all([
      import('./spire_report_client'),
      import('./user_id_policy'),
      import('./stable_id'),
    ]);
    const [uid, stableId] = await Promise.all([getCanonicalUserId(), getStableId()]);
    if (!uid || !stableId) return 'failed';
    const langs = SPIRE_LANGS.filter((lang) => (peekSpireWeekLocal(lang)?.pending.length ?? 0) > 0);
    if (langs.length === 0) return 'failed';
    const outcomes = await Promise.all(langs.map((lang) => spireFlushNow({ uid, stableId, lang, trigger: 'manual' })));
    if (outcomes.some((out) => out?.status === 'sent')) return 'sent';
    const reasons = outcomes.map((out) => String(out?.reason ?? out?.status ?? 'null')).join(',');
    return /network|unavailable|offline|deadline|timeout/i.test(reasons) ? 'offline' : 'failed';
  } catch (error) {
    console.warn('[COIN-SPEND-GAP] flush_threw', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
    return 'failed';
  }
}

/** Разрыв при цене `price`: не разрыв / досланы и влиты / нет сети / досылка не помогла. Журнал — строка на каждый разрыв. */
export async function resolveCoinSpendGap(label: string, price: number, injected?: CoinSpendGapDeps): Promise<CoinSpendGapOutcome> {
  let deps: CoinSpendGapDeps;
  try {
    deps = injected ?? await defaultDeps();
  } catch (error) {
    console.warn('[COIN-SPEND-GAP] deps_failed', JSON.stringify({ label, price, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
    return 'not_gap';
  }
  const spendable = deps.peekSpendable();
  const displayed = deps.peekDisplayed();
  if (!(price > spendable && price <= displayed)) return 'not_gap';
  const flushed = await deps.flush();
  const covered = flushed === 'sent' ? await deps.waitSpendable(price, COIN_SPEND_GAP_WAIT_MS) : false;
  const outcome: CoinSpendGapOutcome = covered ? 'flushed' : flushed === 'offline' ? 'offline' : 'flush_failed';
  console.log('[COIN-SPEND-GAP]', JSON.stringify({
    label, price, displayed, spendable, spendableAfter: deps.peekSpendable(),
    flush: outcome === 'flushed' ? 'ok' : outcome === 'offline' ? 'offline' : 'fail',
  })); // guard-ok: итог разрыва — что увидит человек
  return outcome;
}

/**
 * Покупка с учётом разрыва: попытка → отказ по цене в разрыве → досылка → один повтор; не вышло — результат «монеты ещё сохраняются».
 * `priceOf(result)` — цена отказа «не хватает монет» или null (успех/другая причина).
 */
export async function purchaseWithSpendGap<R>(
  label: string,
  attempt: () => Promise<R>,
  priceOf: (result: R) => number | null,
  savingResult: (result: R) => R,
  injected?: CoinSpendGapDeps,
): Promise<R> {
  const first = await attempt();
  const price = priceOf(first);
  if (price === null) return first;
  const gap = await resolveCoinSpendGap(label, price, injected);
  if (gap === 'not_gap') return first;
  if (gap === 'flushed') return attempt();
  return savingResult(first);
}

const COINS_SAVING_TEXT: Readonly<Record<string, string>> = {
  ru: 'Монеты ещё сохраняются — нужна связь, попробуй через минуту',
  uk: 'Монети ще зберігаються — потрібен зв’язок, спробуй за хвилину',
  en: 'Your coins are still being saved — you need a connection, try again in a minute',
  es: 'Tus monedas aún se están guardando: necesitas conexión, inténtalo en un minuto',
  'pt-BR': 'Suas moedas ainda estão sendo salvas — é preciso conexão, tente em um minuto',
  vi: 'Xu của bạn vẫn đang được lưu — cần có mạng, hãy thử lại sau một phút',
  id: 'Koinmu masih disimpan — perlu koneksi, coba lagi sebentar lagi',
  tr: 'Jetonların hâlâ kaydediliyor — bağlantı gerekiyor, bir dakika sonra dene',
  pl: 'Monety wciąż się zapisują — potrzebne połączenie, spróbuj za minutę',
};

/** Тост для причины `coins_saving` — одно сообщение для всех пяти покупок (emitAppEvent('action_toast', …)). */
export function coinsSavingToast(): Readonly<{
  type: 'info'; messageRu: string; messageUk: string; messageEn: string; messageEs: string;
  messagePtBr: string; messageVi: string; messageId: string; messageTr: string; messagePl: string;
}> {
  return {
    type: 'info',
    messageRu: COINS_SAVING_TEXT.ru, messageUk: COINS_SAVING_TEXT.uk, messageEn: COINS_SAVING_TEXT.en, messageEs: COINS_SAVING_TEXT.es,
    messagePtBr: COINS_SAVING_TEXT['pt-BR'], messageVi: COINS_SAVING_TEXT.vi, messageId: COINS_SAVING_TEXT.id,
    messageTr: COINS_SAVING_TEXT.tr, messagePl: COINS_SAVING_TEXT.pl,
  };
}

/** Текст для причины `coins_saving` на языке интерфейса (нет языка → английский). */
export function coinsSavingMessage(lang: string): string {
  return COINS_SAVING_TEXT[lang] ?? COINS_SAVING_TEXT.en;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
