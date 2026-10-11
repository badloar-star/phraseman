// зачем (запрос координатора, Макеты spire-gap-008: подпись «Задания этой недели ещё готовятся» наезжает на ряд друзей): правило «сперва логи» —
// цифры раскладки нижней панели и списка, чтобы правка вёрстки шла по фактам. Только dev-сборка, одинаковые значения подряд не повторяются.
const last = new Map<string, string>();

export function logSpireLayout(tag: string, data: Record<string, number | string | null>): void {
  if (typeof __DEV__ === 'undefined' || __DEV__ !== true) return;
  const body = JSON.stringify(data);
  if (last.get(tag) === body) return;
  last.set(tag, body);
  console.log(`[SPIRE-LAYOUT] ${tag} ${body}`);
}

export const roundLayout = (v: number): number => Math.round(v * 10) / 10;
