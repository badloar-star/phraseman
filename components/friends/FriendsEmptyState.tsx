import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triLang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import { FriendsGlassButton, useFriendsGlass } from './FriendsGlassKit';

// зачем (владелец 2026-09-29): пустой список 1 в 1 по макету community.html#COM-04-EMPTY
// (`friendsEmpty()`): плитка 61 со значком «люди», заголовок 20/26 по центру и одна компактная
// главная кнопка «Добавить друга». Длинную подсказку макета не переносим (PM-163: без пояснений).

// зачем (макет community.html#COM-04-OFFLINE): тот же каркас, но при ошибке обновления —
// значок «нет связи», «Связь пропала» и «Повторить» вместо «Добавить друга».
export default function FriendsEmptyState({
  onAdd,
  error = false,
  onRetry,
}: {
  onAdd: () => void;
  error?: boolean;
  onRetry?: () => void;
}) {
  const { lang } = useLang();
  const { glass, textScale } = useFriendsGlass();
  const title = triLang(lang, {
    ru: 'Учиться вместе приятнее',
    uk: 'Навчатися разом приємніше',
    en: 'Learning together is nicer',
    es: 'Aprender juntos es más agradable',
    'pt-BR': 'Aprender junto é mais agradável',
    vi: 'Học cùng nhau dễ chịu hơn',
    id: 'Belajar bersama lebih menyenangkan',
    tr: 'Birlikte öğrenmek daha keyifli',
    pl: 'Razem nauka jest przyjemniejsza',
  });
  const offlineTitle = triLang(lang, {
    ru: 'Связь пропала',
    uk: 'Звʼязок зник',
    en: 'Connection lost',
    es: 'Se perdió la conexión',
    'pt-BR': 'A conexão caiu',
    vi: 'Mất kết nối',
    id: 'Koneksi terputus',
    tr: 'Bağlantı koptu',
    pl: 'Utracono połączenie',
  });
  const retry = triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Ponów' });
  const showError = error && !!onRetry;
  const add = triLang(lang, { ru: 'Добавить друга', uk: 'Додати друга', en: 'Add friend', es: 'Agregar amigo', 'pt-BR': 'Adicionar amigo', vi: 'Thêm bạn', id: 'Tambah teman', tr: 'Arkadaş ekle', pl: 'Dodaj znajomego' });
  return (
    <View testID={showError ? 'friends-list-offline' : 'friends-list-empty'} style={{ alignItems: 'center', paddingTop: 48, paddingBottom: 8, paddingHorizontal: 24 }}>
      <View style={{ width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl }}>
        <Ionicons name={showError ? 'cloud-offline-outline' : 'people-outline'} size={26} color={glass.lightTint} accessible accessibilityLabel={showError ? offlineTitle : 'Friends'} />
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 17, color: glass.text, fontSize: 20 * textScale, lineHeight: 26 * textScale, fontWeight: '700', textAlign: 'center' }}>
        {showError ? offlineTitle : title}
      </Text>
      <FriendsGlassButton
        glass={glass}
        textScale={textScale}
        compact
        label={showError ? retry : add}
        onPress={showError ? onRetry! : onAdd}
        testID={showError ? 'friends-offline-retry' : 'friends-empty-add'}
        accessibilityLabel={showError ? retry : add}
        style={{ marginTop: 20 }}
      />
    </View>
  );
}
