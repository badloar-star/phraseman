// Заготовка минта MAX-звонка (premint) — чистый модуль без React и firebase.
//
// зачем: владелец 2026-08-16 — «звонок долго соединяет, при нажатии на кнопку
// надо, чтобы сразу работало». Самый долгий шаг старта — maxVoiceMint
// (гейты + три транзакции Firestore + client_secret у OpenAI, ~1.5–2.5с). Пока
// человек читает пре-экран и тянется к кнопке «Позвонить», минт уже идёт; тап
// открывает экран звонка, который ЗАБИРАЕТ готовую заготовку и сразу шлёт SDP.
//
// Правила:
//   • одна заготовка на приложение (звонков параллельно не бывает), с ключом
//     из параметров звонка — чужая заготовка не подойдёт;
//   • забирает её экран звонка (claim), пре-экран перед навигацией помечает
//     handoff, чтобы свой cleanup не отпустил резерв под ногами у сессии;
//   • брошенная заготовка (ушёл с пре-экрана, ключ не совпал) — release:
//     резерв возвращается серверу сразу, а не ждёт watchdog;
//   • годность: ephemeral-токен живёт до expires_at (сервер, 120с) — берём
//     заготовку, только если до истечения ≥20с (offer + SDP успеют); без
//     expires_at — не старше 40с (старый сервер с TTL 60с).
// Секунды разговора сервер считает от первого heartbeat («алло»), а не от
// минта, поэтому раздумья на пре-экране не списываются (activatedAtMs).

import type { MaxVoiceMintResponse } from './max_call_client';

/** Без expires_at (старый сервер, TTL 60с): годна не старше 40с. */
export const PREMINT_MAX_AGE_MS = 40_000;
/** С expires_at: до истечения токена должно оставаться ≥20с на offer+SDP. */
export const PREMINT_MIN_TOKEN_REMAINING_MS = 20_000;

export interface PremintKeyParams {
  format: 'scenario' | 'companion' | 'trial' | 'tutor';
  scenarioId?: string;
  cefr?: string;
  devMode?: boolean;
}

/** Ключ заготовки: те же параметры, из которых сервер строит instructions. */
export function premintKey(params: PremintKeyParams): string {
  const scenario = params.format === 'companion' ? '' : (params.scenarioId ?? '');
  return [params.format, scenario, params.cefr ?? '', params.devMode ? 'dev' : ''].join('|');
}

type PremintState = 'pending' | 'handoff' | 'claimed' | 'abandoned';

export interface PremintEntry {
  key: string;
  promise: Promise<MaxVoiceMintResponse>;
  createdAtMs: number;
}

interface Slot extends PremintEntry {
  state: PremintState;
}

let slot: Slot | null = null;

/**
 * Хвост незавершённых release'ов: свежий минт того же ученика, стартовавший
 * ДО того, как сервер отпустил брошенную заготовку, упёрся бы в
 * voice_session_active (быстрое «назад → снова на пре-экран»). Поэтому новый
 * минт ждёт release, но не дольше PREMINT_RELEASE_WAIT_MS — зависший release не
 * должен держать звонок (дальше вытеснит сервер).
 */
let releaseChain: Promise<void> = Promise.resolve();
export const PREMINT_RELEASE_WAIT_MS = 3_000;

function afterPendingRelease<T>(fn: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, PREMINT_RELEASE_WAIT_MS);
  });
  const clear = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return Promise.race([releaseChain, timeout]).then(clear, clear).then(fn);
}

/** Годна ли заготовка прямо сейчас (см. правила годности в шапке). */
export function isPremintUsable(mint: MaxVoiceMintResponse, createdAtMs: number, nowMs: number): boolean {
  if (typeof mint.expires_at === 'number' && Number.isFinite(mint.expires_at) && mint.expires_at > 0) {
    return mint.expires_at * 1000 - nowMs >= PREMINT_MIN_TOKEN_REMAINING_MS;
  }
  return nowMs - createdAtMs <= PREMINT_MAX_AGE_MS;
}

/**
 * Запустить заготовку. Живая (pending/handoff) заготовка с тем же ключом
 * переиспользуется — повторный mount пре-экрана не плодит минтов. Заготовка с
 * ДРУГИМ ключом отпускается через release: параллельных резервов не бывает.
 */
export function beginPremint(
  key: string,
  mintFn: () => Promise<MaxVoiceMintResponse>,
  nowMs: number,
  release: (mint: MaxVoiceMintResponse) => Promise<void> | void,
): PremintEntry {
  if (slot && slot.key === key && (slot.state === 'pending' || slot.state === 'handoff')) {
    return slot;
  }
  if (slot && slot.key !== key && slot.state === 'pending') {
    abandonPremint(slot.key, release);
  }
  const promise = afterPendingRelease(mintFn);
  // Отклонённая заготовка, которую никто не забрал, не должна становиться
  // unhandled rejection: забирающий сам обработает через свой await.
  promise.catch(() => {});
  slot = { key, promise, createdAtMs: nowMs, state: 'pending' };
  return slot;
}

/** Пре-экран перед навигацией: заготовку заберёт экран звонка, cleanup её не трогает. */
export function markPremintHandoff(key: string): void {
  if (slot && slot.key === key && slot.state === 'pending') slot.state = 'handoff';
}

/**
 * Экран звонка забирает заготовку (один раз). null — заготовки нет / другой
 * ключ / уже забрана или отпущена → обычный свежий минт.
 */
export function claimPremint(key: string): PremintEntry | null {
  if (!slot || slot.key !== key) return null;
  if (slot.state !== 'pending' && slot.state !== 'handoff') return null;
  slot.state = 'claimed';
  return slot;
}

/**
 * Отпустить незабранную заготовку: как только минт разрешится — release(mint)
 * (maxVoiceSessionEnd 'dropped', 0 секунд). Забранная/переданная — no-op.
 */
export function abandonPremint(
  key: string,
  release: (mint: MaxVoiceMintResponse) => Promise<void> | void,
): void {
  if (!slot || slot.key !== key || slot.state !== 'pending') return;
  slot.state = 'abandoned';
  const abandoned = slot;
  const released = abandoned.promise
    .then((mint) => Promise.resolve(release(mint)))
    .catch(() => {});
  releaseChain = releaseChain.then(() => released, () => released);
  if (slot === abandoned) slot = null;
}

/**
 * Свежий минт «с чистого листа», который обязан идти ПОСЛЕ отпускания
 * протухшей заготовки (иначе voice_session_active). Для экрана звонка.
 */
export function mintAfterRelease<T>(fn: () => Promise<T>): Promise<T> {
  return afterPendingRelease(fn);
}

/** Поставить release в очередь (без слота): протухшая заготовка на экране звонка. */
export function enqueueRelease(task: () => Promise<void> | void): void {
  const done = Promise.resolve().then(task).catch(() => {});
  releaseChain = releaseChain.then(() => done, () => done);
}

export function __resetPremintForTests(): void {
  slot = null;
  releaseChain = Promise.resolve();
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
