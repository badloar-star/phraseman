import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import HybridSheetShell from '../../components/modal_fx/HybridSheetShell';
import { useLang } from '../../components/LangContext';
import { useTheme } from '../../components/ThemeContext';
import { triLang } from '../../constants/i18n';
import VoiceMinutePackPanel from './VoiceMinutePackPanel';
import type { VoiceMinuteWalletStatus } from './wallet';

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  onCredited?: (wallet: VoiceMinuteWalletStatus) => void;
}>;

export default function VoiceMinutePackSheet({ visible, onClose, onCredited }: Props) {
  const { lang } = useLang();
  const { theme: t } = useTheme();
  const [purchaseBusy, setPurchaseBusy] = React.useState(false);
  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={triLang(lang, {
        ru: 'Закрыть покупку минут', en: 'Close minute purchase', uk: 'Закрити купівлю хвилин',
        es: 'Cerrar compra de minutos', 'pt-BR': 'Fechar compra de minutos', vi: 'Đóng mua phút',
        id: 'Tutup pembelian menit', tr: 'Dakika satın almayı kapat', pl: 'Zamknij zakup minut',
      })}
      dismissDisabled={purchaseBusy}
      testID="voice-minute-pack-sheet"
      glowColor={t.accent}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <VoiceMinutePackPanel onCredited={onCredited} onBusyChange={setPurchaseBusy} />
      </ScrollView>
    </HybridSheetShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  content: { paddingBottom: 4 },
});
