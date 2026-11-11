import React, { memo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { captureAccountGeneration, isCurrentAccountGeneration } from '../../app/account_generation';
import { setDevLocalPlusOverride } from '../../app/dev_plus_controls';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useLang } from '../LangContext';
import { usePremium } from '../PremiumContext';
import { useTheme } from '../ThemeContext';
import V2Pressable from '../v2/V2Pressable';

export default memo(function DevPlusToggle() {
  const { accessResolved, hasPremiumAccess } = usePremium();
  const { liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const colors = liquidGlassTokens(liquidGlassThemeId);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const unavailable = !accessResolved || captureAccountGeneration().phase !== 'active';

  async function toggle() {
    if (pending.current || unavailable) return;
    const account = captureAccountGeneration();
    if (account.phase !== 'active' || !account.stableId || !isCurrentAccountGeneration(account, account.stableId)) return;

    pending.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await setDevLocalPlusOverride(account.stableId, hasPremiumAccess ? 'removed' : 'granted');
    } catch (error: unknown) {
      // зачем (правило владельца «никаких немых catch», сторож SILENT-CATCH 11.11): отладочный переключатель Plus не сработал — причина в журнал
      console.warn('[DEV-PLUS-TOGGLE] override:failed', error instanceof Error ? error.message : String(error));
      if (isCurrentAccountGeneration(account, account.stableId)) setFailed(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.row}>
      <V2Pressable
        testID="settings-dev-plus-toggle"
        accessibilityRole="switch"
        accessibilityLabel="DEV Plus"
        accessibilityState={{ checked: hasPremiumAccess, busy }}
        disabled={unavailable || busy}
        onPress={() => { void toggle(); }}
        withHaptic
        style={[styles.button, { backgroundColor: hasPremiumAccess ? colors.ctaFill : colors.opaqueControl }]}
      >
        <Text style={[styles.label, { color: hasPremiumAccess ? colors.ctaFillInk : colors.text }]}>
          {busy || unavailable ? 'DEV Plus · …' : hasPremiumAccess ? 'DEV Plus · ON' : 'DEV Plus · OFF'}
        </Text>
      </V2Pressable>
      {failed ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.text }}>
          {triLang(lang, {
            ru: 'Не удалось переключить Plus', uk: 'Не вдалося перемкнути Plus', en: 'Could not switch Plus', es: 'No se pudo cambiar Plus',
            'pt-BR': 'Não foi possível alternar o Plus', vi: 'Không thể chuyển Plus', id: 'Gagal mengganti Plus', tr: 'Plus değiştirilemedi', pl: 'Nie udało się przełączyć Plus',
          })}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: 'center', marginTop: 4 },
  button: { minHeight: 48, borderRadius: 24, justifyContent: 'center', paddingHorizontal: 12 },
  label: { fontSize: 13, fontWeight: '700' },
});
