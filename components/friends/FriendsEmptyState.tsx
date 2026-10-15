import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triLang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import { FriendsGlassButton, useFriendsGlass } from './FriendsGlassKit';

// зачем (владелец 2026-09-29): пустой список 1 в 1 по макету community.html#COM-04-EMPTY
// (`friendsEmpty()`): плитка 61 со значком «люди», заголовок 20/26 по центру и одна компактная
// главная кнопка «Добавить друга».
// зачем (Сверка community-020, макет 04.10 новее PM-163): под заголовком короткое пояснение `.empty-state p` 14/20 --sec
// (D145 → 13/19), max-width 280: «Найдите друга по имени или поделитесь своим кодом.» / при ошибке — про сохранённый список.

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
  const hint = triLang(lang, {
    ru: 'Найди друга по имени или поделись своим кодом.',
    uk: 'Знайди друга за імʼям або поділись своїм кодом.',
    en: 'Find a friend by name or share your code.',
    es: 'Busca a un amigo por nombre o comparte tu código.',
    'pt-BR': 'Encontre um amigo pelo nome ou compartilhe seu código.',
    vi: 'Tìm bạn theo tên hoặc chia sẻ mã của bạn.',
    id: 'Cari teman dengan nama atau bagikan kodemu.',
    tr: 'Bir arkadaşını adıyla bul ya da kodunu paylaş.',
    pl: 'Znajdź znajomego po imieniu albo udostępnij swój kod.',
  });
  const offlineHint = triLang(lang, {
    ru: 'Список сохранён на устройстве. Проверь интернет и повтори обновление.',
    uk: 'Список збережено на пристрої. Перевір інтернет і повтори оновлення.',
    en: 'The list is saved on your device. Check your connection and refresh again.',
    es: 'La lista está guardada en el dispositivo. Revisa la conexión y vuelve a actualizar.',
    'pt-BR': 'A lista está salva no aparelho. Verifique a internet e atualize de novo.',
    vi: 'Danh sách đã lưu trên thiết bị. Kiểm tra mạng rồi làm mới lại.',
    id: 'Daftar tersimpan di perangkat. Periksa internet lalu muat ulang.',
    tr: 'Liste cihazında kayıtlı. İnternetini kontrol edip yeniden yenile.',
    pl: 'Lista jest zapisana na urządzeniu. Sprawdź internet i odśwież ponownie.',
  });
  const retry = triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Ponów' });
  const showError = error && !!onRetry;
  const add = triLang(lang, { ru: 'Добавить друга', uk: 'Додати друга', en: 'Add friend', es: 'Agregar amigo', 'pt-BR': 'Adicionar amigo', vi: 'Thêm bạn', id: 'Tambah teman', tr: 'Arkadaş ekle', pl: 'Dodaj znajomego' });
  return (
    <View testID={showError ? 'friends-list-offline' : 'friends-list-empty'} style={{ alignItems: 'center', paddingTop: 68, paddingBottom: 8, paddingHorizontal: 24 }}>
      <View style={{ width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl }}>
        <Ionicons name={showError ? 'cloud-offline-outline' : 'people-outline'} size={26} color={glass.lightTint} accessible accessibilityLabel={showError ? offlineTitle : 'Friends'} />
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 17, color: glass.text, fontSize: 20 * textScale, lineHeight: 26 * textScale, fontWeight: '700', textAlign: 'center' }}>
        {showError ? offlineTitle : title}
      </Text>
      <Text style={{ marginTop: 7, maxWidth: 280, color: glass.secondary, fontSize: 13 * textScale, lineHeight: 19 * textScale, textAlign: 'center' }}>
        {showError ? offlineHint : hint}
      </Text>
      <FriendsGlassButton
        glass={glass}
        textScale={textScale}
        compact
        label={showError ? retry : add}
        onPress={showError ? onRetry! : onAdd}
        testID={showError ? 'friends-offline-retry' : 'friends-empty-add'}
        accessibilityLabel={showError ? retry : add}
        // зачем (R55, кадр эмулятора B 15.10): «Добавить друга» в макете `.cta.sm` inline-flex — компактная по центру;
        // PressableHybrid по умолчанию тянется (alignSelf stretch). «Повторить» при ошибке — во всю ширину, как `width:100%` макета.
        style={showError ? { marginTop: 20 } : { marginTop: 20, alignSelf: 'center' }}
      />
    </View>
  );
}
