import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import {
  phoneStateDurabilityRecovery,
  phoneStateRecoveryCopyRu,
} from '../app/phone_state_recovery';
import { triLang } from '../constants/i18n';
import FullscreenHybridEntrance from './feedback/FullscreenHybridEntrance';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import ResponsiveModalScrollView from './ResponsiveModalScrollView';

const AUTOMATIC_RETRY_MS = 5_000;

function PhoneStateRecoveryScreen() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
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
      <ActivityIndicator size="large" color={t.accent} />
    </View>
  );
  const titleSlot = (
    <Text accessibilityRole="header" style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
      {title}
    </Text>
  );
  const bodySlot = (
    <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>
      {body}
    </Text>
  );

  return (
    <Modal
      visible={snapshot.visible && !dismissed}
      transparent
      animationType="none"
      statusBarTranslucent
      // зачем (владелец, 2026-09-22, «блокера не должно быть»): раньше кнопка
      // «назад» на Android не делала ничего, и экран был непроходим. Теперь
      // человек может его убрать: восстановление записи от этого не
      // отменяется — повторы продолжаются в фоне (см. эффект выше).
      onRequestClose={() => setDismissed(true)}
    >
      <ResponsiveModalScrollView style={{ backgroundColor: 'rgba(0,0,0,0.68)' }} accessibilityViewIsModal>
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${title}. ${body}`}
          style={[styles.card, { backgroundColor: t.bgCard, borderColor: `${t.accent}66` }]}
        >
          <FullscreenHybridEntrance
            visible={snapshot.visible}
            bloomColor={t.accent}
            slots={[indicatorSlot, titleSlot, bodySlot]}
          />
        </View>
      </ResponsiveModalScrollView>
    </Modal>
  );
}

export default memo(PhoneStateRecoveryScreen);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  indicatorWrap: { alignItems: 'center', minHeight: 48 },
  title: { marginTop: 18, fontWeight: '800', textAlign: 'center' },
  body: { marginTop: 12, lineHeight: 24, textAlign: 'center' },
});
