// mem_moments_probe.ts — журнал [MEM-MOMENTS]: сколько хостов моментов и монет с циклами анимаций живо прямо сейчас.
// зачем (координатор 18.10, R129 «возможная утечка памяти»): Главная держит хосты моментов (неделя Пика, «С возвращением», «Хватает на ранг»,
// бонус-приветствие), итоги уроков — рубежи серии. Проверяем фактом, а не гаданием: после закрытия момента его хост и монета РАЗМОНТИРОВАНЫ
// (счётчик возвращается к нулю), а не висят невидимыми. Только запись; только отладка (`__DEV__ && !IS_STORE_RELEASE`), в сторе — пустые вызовы.
import { useEffect } from 'react';
import { DIAG_ENABLED } from '../../app/dev_diag_gate';

export const MEM_MOMENTS_LOG = '[MEM-MOMENTS]';
// зачем (координатор 18.10): общий гейт диагностических проб (dev_diag_gate) — без импортов, в сторе выключен
const ENABLED = DIAG_ENABLED;

const live = new Map<string, number>();
const mountedAt = new Map<string, number[]>();

const snapshot = (): Record<string, number> => Object.fromEntries([...live.entries()].filter(([, n]) => n > 0));

/** Отметить появление/уход; возвращает снятие отметки. Чистая функция над памятью процесса — считается в тестах. */
export function memMomentsMount(name: string, detail = ''): () => void {
  if (!ENABLED) return () => undefined;
  live.set(name, (live.get(name) ?? 0) + 1);
  const t0 = Date.now();
  mountedAt.set(name, [...(mountedAt.get(name) ?? []), t0]);
  console.log(`${MEM_MOMENTS_LOG} mount ${name}${detail ? ` (${detail})` : ''} live=${JSON.stringify(snapshot())}`); // guard-ok: строка пробы (только отладка)
  return () => {
    live.set(name, Math.max(0, (live.get(name) ?? 1) - 1));
    mountedAt.set(name, (mountedAt.get(name) ?? []).filter((t) => t !== t0));
    console.log(`${MEM_MOMENTS_LOG} unmount ${name} жил=${Date.now() - t0}мс live=${JSON.stringify(snapshot())}`); // guard-ok: строка пробы (только отладка)
  };
}

/** Хук: отметка на время жизни компонента (или пока active). */
export function useMemMomentsTrack(name: string, active = true, detail = ''): void {
  useEffect(() => (active ? memMomentsMount(name, detail) : undefined), [name, active, detail]);
}

/** Только для тестов и ручного опроса из отладчика. */
export function memMomentsLive(): Readonly<Record<string, number>> {
  return snapshot();
}
export function __resetMemMoments(): void {
  live.clear();
  mountedAt.clear();
}
export const MEM_MOMENTS_ENABLED = ENABLED;
