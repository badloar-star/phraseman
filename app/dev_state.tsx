// ═══════════════════════════════════════════════════════════
// dev_state — DEV-фикстуры состояний для робот-съёмки (Maestro).
//
// зачем (координатор 11.10, план выпуска 20.10): робот выставляет состояние одной ссылкой и снимает экран:
//   phraseman://dev_state?energy=0&plus=off&mode=b&spire=open&onboarding=done&free=on&cards=demo&next=/(tabs)/home
// Экран показывает «DEV-STATE OK» (testID dev-state-done) — Maestro ждёт его, затем уходит на next.
// Шрифты по шкале D145 (16/21 и 13/17) — сторож typography_two_sizes считает и dev-экраны вне своего списка исключений.
// В релизе маршрута нет: router.ctx.js вырезает dev_state из стор-сборки, а здесь __DEV__ && !IS_STORE_RELEASE.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useEnergy } from '../components/EnergyContext';
import { useTheme } from '../components/ThemeContext';
import { applyDevState, isDevStateAvailable, parseDevStateParams, runAfterDevStateRouteActions, type DevStateResult } from './dev_state_fixtures';

// зачем: потолок ожидания перечитывания энергии (см. комментарий в эффекте).
const ENERGY_RELOAD_CEILING_MS = 3000;
// зачем (координатор 13.10, energy-modes-003/007: «перечитывание энергии → потолок», на кадре 5): на свежей установке загрузка
// энергии стоит за замком аккаунта дольше 3 с, и робот уходил на экран раньше, чем контекст узнал подмену. Если подменяется
// энергия — ждём дольше (робот ждёт маркер до 20 с).
const ENERGY_RELOAD_CEILING_WITH_ENERGY_MS = 12000;

export default function DevStateRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { reload, energy: contextEnergy, energyReady } = useEnergy();
  // зачем (храповик цветов, координатор 15.10): служебный экран робота берёт цвета у активной темы, а не хардкодом #111/#fff/#aaa.
  const { theme: devTheme } = useTheme();
  const [result, setResult] = useState<DevStateResult | null>(null);
  const available = isDevStateAvailable();

  // зачем: журнал робота пропускает только [DEV-STATE] — видно, какое значение энергии реально у экранов после подмены.
  useEffect(() => {
    if (!available) return;
    console.warn('[DEV-STATE] энергия в контексте =', contextEnergy, `ready=${String(energyReady)}`); // guard-ok: трассировка робот-ссылки
  }, [available, contextEnergy, energyReady]);

  useEffect(() => {
    if (!available) return undefined;
    let alive = true;
    const { request, rejected } = parseDevStateParams(params as Record<string, unknown>);
    if (Object.keys(rejected).length > 0) console.warn('[DEV-STATE] rejected params', JSON.stringify(rejected)); // guard-ok: отброшенные параметры видны в логе
    // зачем (координатор 12.10: «повис на DEV-STATE… больше 90 с, перехода на next нет»): раньше после applyDevState
    // шло безлимитное `await reload()` энергии (её загрузчик ждёт замок/сеть) и ни одного лога — экран молчал.
    // Теперь каждый шаг пишет [DEV-STATE] route: …, а ожидание энергии ограничено потолком: фикстуры УЖЕ применены,
    // переход на next не должен зависеть от того, успела ли перечитаться энергия.
    void (async () => {
      const startedAt = Date.now();
      const since = () => `${Date.now() - startedAt}мс`;
      let ceilingTimer: ReturnType<typeof setTimeout> | null = null;
      try {
        console.warn('[DEV-STATE] route: старт', JSON.stringify({ request, rejected })); // guard-ok: трассировка робот-ссылки
        const applied = await applyDevState(request);
        console.warn('[DEV-STATE] route: фикстуры применены', since(), JSON.stringify({ applied: applied.applied, skipped: applied.skipped, next: applied.next })); // guard-ok: трассировка
        // Энергия и Plus читаются контекстом — перечитываем, чтобы экран после перехода показал новое состояние.
        const reloadOutcome = await Promise.race([
          reload().then(() => 'ok', (error: unknown) => `error: ${String(error)}`),
          new Promise<string>((resolve) => {
            const ceilingMs = request.energy !== undefined || request.energyRestoreInSec !== undefined ? ENERGY_RELOAD_CEILING_WITH_ENERGY_MS : ENERGY_RELOAD_CEILING_MS;
            ceilingTimer = setTimeout(() => resolve(`потолок ${ceilingMs}мс`), ceilingMs);
          }),
        ]);
        console.warn('[DEV-STATE] route: перечитывание энергии →', reloadOutcome, since()); // guard-ok: трассировка
        if (!alive) {
          console.warn('[DEV-STATE] route: экран уже закрыт (alive=false) — переход не делаем', since()); // guard-ok: ранний выход логируется
          runAfterDevStateRouteActions('screen_closed');
          return;
        }
        setResult({ ...applied, skipped: { ...applied.skipped, ...rejected } });
        if (!applied.next) {
          console.warn('[DEV-STATE] route: next не задан — остаёмся на экране', since()); // guard-ok: ранний выход логируется
          runAfterDevStateRouteActions('no_next');
          return;
        }
        console.warn('[DEV-STATE] route: replace через 300 мс →', applied.next, since()); // guard-ok: трассировка
        setTimeout(() => {
          try {
            router.replace(applied.next as never);
            console.warn('[DEV-STATE] route: replace вызван →', applied.next); // guard-ok: трассировка
            // зачем (№18, paywall-gap-011…013): действия «после перехода» (тост) — когда экран `next` уже открывается, а не по таймеру от шага
            setTimeout(() => runAfterDevStateRouteActions('replaced'), 900);
          } catch (error) {
            console.warn('[DEV-STATE] route: replace УПАЛ', applied.next, String(error)); // guard-ok: catch логируется
            runAfterDevStateRouteActions('replace_failed');
          }
        }, 300);
      } catch (error) {
        console.warn('[DEV-STATE] route: ОШИБКА до перехода', since(), String(error)); // guard-ok: catch логируется
        runAfterDevStateRouteActions('route_error');
        if (alive) setResult({ applied: {}, skipped: { route_error: String(error) }, next: null });
      } finally {
        if (ceilingTimer) clearTimeout(ceilingTimer);
      }
    })();
    return () => { alive = false; };
    // Применяем один раз на заход по ссылке.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  if (!available) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: devTheme.bgPrimary }}>
      <Text testID={result ? 'dev-state-done' : 'dev-state-pending'} style={{ color: devTheme.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>
        {result ? 'DEV-STATE OK' : 'DEV-STATE…'}
      </Text>
      {result ? (
        <Text style={{ color: devTheme.textMuted, fontSize: 13, lineHeight: 17, marginTop: 12 }}>{/* guard-ok: dev-экран робота, технический вывод, не интерфейс игрока */}
          {JSON.stringify({ applied: result.applied, skipped: result.skipped, next: result.next })}
        </Text>
      ) : null}
    </View>
  );
}
