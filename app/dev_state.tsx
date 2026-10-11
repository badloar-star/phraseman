// ═══════════════════════════════════════════════════════════
// dev_state — DEV-фикстуры состояний для робот-съёмки (Maestro).
//
// зачем (координатор 11.10, план выпуска 20.10): робот выставляет состояние одной ссылкой и снимает экран:
//   phraseman://dev_state?energy=0&plus=off&mode=b&spire=open&onboarding=done&free=on&next=/(tabs)/home
// Экран показывает «DEV-STATE OK» (testID dev-state-done) — Maestro ждёт его, затем уходит на next.
// В релизе маршрута нет: router.ctx.js вырезает dev_state из стор-сборки, а здесь __DEV__ && !IS_STORE_RELEASE.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useEnergy } from '../components/EnergyContext';
import { applyDevState, isDevStateAvailable, parseDevStateParams, type DevStateResult } from './dev_state_fixtures';

export default function DevStateRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { reload } = useEnergy();
  const [result, setResult] = useState<DevStateResult | null>(null);
  const available = isDevStateAvailable();

  useEffect(() => {
    if (!available) return undefined;
    let alive = true;
    const { request, rejected } = parseDevStateParams(params as Record<string, unknown>);
    if (Object.keys(rejected).length > 0) console.warn('[DEV-STATE] rejected params', JSON.stringify(rejected)); // guard-ok: отброшенные параметры видны в логе
    void applyDevState(request)
      .then(async (applied) => {
        // Энергия и Plus читаются контекстом — перечитываем, чтобы экран после перехода показал новое состояние.
        await reload().catch((error: unknown) => console.warn('[DEV-STATE] energy reload failed', String(error))); // guard-ok: catch логируется
        if (!alive) return;
        setResult({ ...applied, skipped: { ...applied.skipped, ...rejected } });
        if (applied.next) setTimeout(() => router.replace(applied.next as never), 300);
      });
    return () => { alive = false; };
    // Применяем один раз на заход по ссылке.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  if (!available) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#111' }}>
      <Text testID={result ? 'dev-state-done' : 'dev-state-pending'} style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
        {result ? 'DEV-STATE OK' : 'DEV-STATE…'}
      </Text>
      {result ? (
        <Text style={{ color: '#aaa', fontSize: 12, marginTop: 12 }}>{/* guard-ok: dev-экран робота, технический вывод, не интерфейс игрока */}
          {JSON.stringify({ applied: result.applied, skipped: result.skipped, next: result.next })}
        </Text>
      ) : null}
    </View>
  );
}
