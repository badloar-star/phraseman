import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { runIosAccountProofPhase, type IosProofPhase } from '../runtime-probes/ios-account-sqlcipher/probe';
import { createIosProofPorts } from '../runtime-probes/ios-account-sqlcipher/probe_native';

/*
 * Account V2, Пакет 6H (OD17) — скрытый экран пробы хранилища на iPhone.
 * Открывается ссылкой phraseman://dev-account-v2-ios-proof.
 *
 * зачем отдельный маршрут: на iPhone нет adb и Metro — проба едет внутри
 * сборки EAS-профиля ios-account-v2-proof. Без EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF=1
 * этот файл и модули пробы ФИЗИЧЕСКИ исключены из бандла Metro (как dev-вход
 * OD23), а проверка ниже — второй замок на случай ручной сборки.
 * Экран служебный: синтетическая область, без сервера и данных владельца.
 */

const PHASES: readonly Readonly<{ phase: IosProofPhase; title: string }>[] = [
  { phase: 'write', title: '1. Записать и оставить открытым' },
  { phase: 'verify', title: '2. Проверить после перезапуска' },
  { phase: 'erase', title: '3. Стереть область' },
];

export default function DevAccountV2IosProofRoute() {
  const insets = useStableSafeAreaInsets();
  const [running, setRunning] = useState<IosProofPhase | null>(null);
  const [text, setText] = useState('Квитанция появится здесь после фазы.');
  const enabled = process.env.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF === '1';

  const run = useCallback(async (phase: IosProofPhase) => {
    if (running !== null) {
      console.warn(`[ACCOUNT-V2-IOS-PROOF] tap_ignored phase=${phase} running=${running}`); // guard-ok: проба едет в release-сборке, лог — её единственный след
      return;
    }
    setRunning(phase);
    setText(`Фаза ${phase} идёт…`);
    const receipt = await runIosAccountProofPhase(phase, createIosProofPorts());
    setText(receipt.text);
    setRunning(null);
  }, [running]);

  const share = useCallback(() => {
    Share.share({ message: text }).catch((error: unknown) => {
      console.warn(`[ACCOUNT-V2-IOS-PROOF] share_failed kind=${error instanceof Error ? error.name : typeof error}`); // guard-ok: немой catch запрещён
    });
  }, [text]);

  if (!enabled) {
    console.warn('[ACCOUNT-V2-IOS-PROOF] route_skip reason=not_proof_build'); // guard-ok: ранний выход логируется
    return (
      <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
        <Pressable style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>На главную</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.title}>Проба хранилища Account V2</Text>
      {PHASES.map(({ phase, title }) => (
        <Pressable
          key={phase}
          accessibilityRole="button"
          style={[styles.button, running === phase && styles.buttonBusy]}
          onPress={() => { void run(phase); }}
        >
          <Text style={styles.buttonText}>{running === phase ? `${title} — идёт` : title}</Text>
        </Pressable>
      ))}
      <ScrollView style={styles.receipt} contentContainerStyle={styles.receiptContent} decelerationRate="fast">
        <Text selectable style={styles.receiptText}>{text}</Text>
      </ScrollView>
      <Pressable accessibilityRole="button" style={styles.button} onPress={share}>
        <Text style={styles.buttonText}>Поделиться квитанцией</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101114', paddingHorizontal: 16, gap: 12 }, // theme-exempt: DEV-экран проверки покупки iOS — не пользовательский
  title: { color: '#F2F3F5', fontSize: 20, fontWeight: '600' }, // theme-exempt: DEV-экран проверки покупки iOS — не пользовательский
  button: { backgroundColor: '#23252B', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 }, // theme-exempt: DEV-экран проверки покупки iOS — не пользовательский
  buttonBusy: { backgroundColor: '#2F3340' }, // theme-exempt: DEV-экран проверки покупки iOS — не пользовательский
  buttonText: { color: '#F2F3F5', fontSize: 16 }, // theme-exempt: DEV-экран проверки покупки iOS — не пользовательский
  receipt: { flex: 1, backgroundColor: '#18191D', borderRadius: 12 }, // theme-exempt: DEV-экран проверки покупки iOS — не пользовательский
  receiptContent: { padding: 12 },
  receiptText: { color: '#C9CCD3', fontSize: 12, fontFamily: 'Menlo' }, // theme-exempt: DEV-экран проверки покупки iOS — не пользовательский
});
