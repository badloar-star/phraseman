import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triLang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import { FriendsGlassButton, useFriendsGlass } from './FriendsGlassKit';

// зачем (владелец 2026-09-29): пустой список 1 в 1 по макету community.html#COM-04-EMPTY
// (`friendsEmpty()`): плитка 61 со значком «люди», заголовок 20/26 по центру и одна компактная
// главная кнопка «Добавить друга».
// зачем (Сверка community-020, макет 04.10 новее PM-163): под заголовком короткое пояснение `.empty-state p` 14/20 --sec
// (D145 → 13/19), max-width 280: «Найдите друга по имени или поделитесь своим кодом.»

// зачем (правило владельца 01.10 и 18.10 «экранов-ошибок нигде»; координатор 18.10 08:00): прежний вариант COM-04-OFFLINE
// (экран «нет связи» с кнопкой повтора) на всю вкладку убран. При сбое подписки и пустом списке — тот же спокойный пустой вид,
// а список тихо перечитывается сам (friends.tsx, ворота useLoadGate). `error` остаётся только для журнала [NO-ERROR-SCREEN].
export default function FriendsEmptyState({
  onAdd,
  error = false,
}: {
  onAdd: () => void;
  error?: boolean;
}) {
  const { lang } = useLang();
  const { glass, textScale } = useFriendsGlass();
  useEffect(() => {
    if (!error) return;
    console.log('[NO-ERROR-SCREEN]', JSON.stringify({ screen: 'friends_tab', reason: 'friends_list_subscription_error', shown: 'quiet_empty' })); // guard-ok: причина замены экрана-ошибки
  }, [error]);
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
  const add = triLang(lang, { ru: 'Добавить друга', uk: 'Додати друга', en: 'Add friend', es: 'Agregar amigo', 'pt-BR': 'Adicionar amigo', vi: 'Thêm bạn', id: 'Tambah teman', tr: 'Arkadaş ekle', pl: 'Dodaj znajomego' });
  return (
    <View testID="friends-list-empty" style={{ alignItems: 'center', paddingTop: 68, paddingBottom: 8, paddingHorizontal: 24 }}>
      <View style={{ width: 61, height: 61, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl }}>
        <Ionicons name="people-outline" size={26} color={glass.lightTint} accessible accessibilityLabel="Friends" />
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 17, color: glass.text, fontSize: 20 * textScale, lineHeight: 26 * textScale, fontWeight: '700', textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ marginTop: 7, maxWidth: 280, color: glass.secondary, fontSize: 13 * textScale, lineHeight: 19 * textScale, textAlign: 'center' }}>
        {hint}
      </Text>
      <FriendsGlassButton
        glass={glass}
        textScale={textScale}
        compact
        label={add}
        onPress={onAdd}
        testID="friends-empty-add"
        accessibilityLabel={add}
        // зачем (R55, кадр эмулятора B 15.10): «Добавить друга» в макете `.cta.sm` inline-flex — компактная по центру;
        // PressableHybrid по умолчанию тянется (alignSelf stretch).
        style={{ marginTop: 20, alignSelf: 'center' }}
      />
    </View>
  );
}
