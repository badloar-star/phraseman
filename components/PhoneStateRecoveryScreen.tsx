import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import {
  phoneStateDurabilityRecovery,
  phoneStateRecoveryCopyRu,
} from '../app/phone_state_recovery';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import FullscreenHybridEntrance from './feedback/FullscreenHybridEntrance';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import ResponsiveModalScrollView from './ResponsiveModalScrollView';
import { LinearGradient } from './SafeLinearGradient';

const AUTOMATIC_RETRY_MS = 5_000;

function PhoneStateRecoveryScreen() {
  const { f, liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const [snapshot, setSnapshot] = useState(phoneStateDurabilityRecovery.getSnapshot());
  // зачем: человек вправе убрать экран кнопкой «назад». Сбрасываем отказ, когда
  // восстановление удалось (failedAttempts вернулся к 0) — тогда при следующей
  // настоящей беде экран снова имеет право показаться.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => phoneStateDurabilityRecovery.subscribe(() => {
    setSnapshot(phoneStateDurabilityRecovery.getSnapshot());
  }), []);

  useEffect(() => {
    if (snapshot.failedAttempts === 0) setDismissed(false);
  }, [snapshot.failedAttempts]);

  // зачем (владелец, 2026-09-22, «блокера не должно быть»): повторы обязаны
  // продолжаться и ПОСЛЕ того, как экран скрылся по потолку показа. Иначе
  // снятие стены превратило бы вечное ожидание в тихо умершее восстановление —
  // то есть заменило бы один баг другим, молчаливым.
  useEffect(() => {
    const timer = setTimeout(() => {
      void phoneStateDurabilityRecovery.retryPending();
    }, AUTOMATIC_RETRY_MS);
    return () => clearTimeout(timer);
  }, [snapshot.failedAttempts]);

  const title = triLang(lang, {
    ru: 'Восстанавливаем сохранение',
    uk: 'Відновлюємо збереження',
    en: 'Restoring your save',
    es: 'Restaurando el guardado',
    'pt-BR': 'Restaurando o salvamento',
    vi: 'Đang khôi phục bản lưu',
    id: 'Memulihkan penyimpanan',
    tr: 'Kayıt geri yükleniyor',
    pl: 'Przywracamy zapis',
  });
  const body = triLang(lang, {
    ru: phoneStateRecoveryCopyRu,
    uk: 'Звільняємо місце та відновлюємо збереження…',
    en: 'Freeing up space and restoring your save…',
    es: 'Liberando espacio y restaurando el guardado…',
    'pt-BR': 'Liberando espaço e restaurando o salvamento…',
    vi: 'Đang giải phóng dung lượng và khôi phục bản lưu…',
    id: 'Mengosongkan ruang dan memulihkan penyimpanan…',
    tr: 'Alan açılıyor ve kayıt geri yükleniyor…',
    pl: 'Zwalniamy miejsce i przywracamy zapis…',
  });

  const indicatorSlot = (
    <View style={styles.indicatorWrap} accessibilityElementsHidden>
      <ActivityIndicator size="large" color={glass.lightTint} />
    </View>
  );
  const titleSlot = (
    <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h2 }]}>
      {title}
    </Text>
  );
  const bodySlot = (
    <Text style={[styles.body, { color: glass.secondary, fontSize: f.body }]}>
      {body}
    </Text>
  );

  return (
    <Modal
      visible={snapshot.visible && !dismissed}
      transparent={false}
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      // зачем (владелец, 2026-09-22, «блокера не должно быть»): раньше кнопка
      // «назад» на Android не делала ничего, и экран был непроходим. Теперь
      // человек может его убрать: восстановление записи от этого не
      // отменяется — повторы продолжаются в фоне (см. эффект выше).
      onRequestClose={() => setDismissed(true)}
    >
      <View
        style={[styles.root, { backgroundColor: glass.bg }]}
        accessibilityViewIsModal
        importantForAccessibility="yes"
      >
        <LinearGradient
          pointerEvents="none"
          colors={[glass.bgTop, glass.bgBottom]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <ResponsiveModalScrollView
          testID="phone-state-recovery-scroll"
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            accessibilityLabel={`${title}. ${body}`}
            style={styles.content}
          >
            <FullscreenHybridEntrance
              visible={snapshot.visible}
              bloomColor={glass.cta}
              slots={[indicatorSlot, titleSlot, bodySlot]}
              style={styles.entrance}
            />
          </View>
        </ResponsiveModalScrollView>
      </View>
    </Modal>
  );
}

export default memo(PhoneStateRecoveryScreen);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  scroll: { backgroundColor: 'transparent' },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  entrance: { width: '100%' },
  indicatorWrap: { alignItems: 'center', minHeight: 48 },
  title: { marginTop: 22, fontWeight: '800', textAlign: 'center' },
  body: { width: '100%', maxWidth: 440, alignSelf: 'center', marginTop: 10, lineHeight: 24, textAlign: 'center' },
});
