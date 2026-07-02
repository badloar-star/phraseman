/**
 * Настройки → Компас. Личные тумблеры поверхностей Компаса (пользовательский
 * слой поверх админских remote-флагов compass_flags: админ гасит всё, ученик —
 * выбирает, где Компасу быть).
 *
 * Хранение — app/compass/compass_user_prefs.ts (AsyncStorage, дефолт всё вкл).
 * Хост брифинга читает prefs при монтировании home; выключение вступает в силу
 * со следующего захода на главную (модалка и так показывается раз в день).
 */
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BouncyScrollView from '../components/BouncyScrollView';
import TapScale from '../components/TapScale';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import CustomSwitch from '../components/CustomSwitch';
import {
  SettingsGroup,
  SettingsRow,
  SettingsSectionTitle,
} from '../components/settings/SettingsGroup';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import {
  DEFAULT_COMPASS_USER_PREFS,
  loadCompassUserPrefs,
  saveCompassUserPrefs,
  type CompassUserPrefs,
} from './compass/compass_user_prefs';

type PrefKey = keyof CompassUserPrefs;

/** Строка на 8 UI-языках (форма triLang). */
interface Text8 {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}

export default function CompassSettings() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const [prefs, setPrefs] = useState<CompassUserPrefs>(DEFAULT_COMPASS_USER_PREFS);

  useEffect(() => {
    let cancelled = false;
    void loadCompassUserPrefs().then((loaded) => {
      if (!cancelled) setPrefs(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (key: PrefKey) => (value: boolean) => {
    void hapticTap();
    // Оптимистично в UI, затем персист (иммутабельно, save вернёт слитое).
    setPrefs((current) => ({ ...current, [key]: value }));
    void saveCompassUserPrefs({ [key]: value }).catch(() => {});
  };

  const L = (text: Text8): string => triLang(lang, text);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TapScale
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as never)}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TapScale>
            <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '700', marginLeft: 8 }}>
              {L({ ru: 'Компас', uk: 'Компас', es: 'Brújula', 'pt-BR': 'Bússola', vi: 'La bàn', id: 'Kompas', tr: 'Pusula', pl: 'Kompas' })}
            </Text>
          </View>

          <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ paddingTop: 12, paddingBottom: 36 }} scrollEventThrottle={16}>
            {/* Живой голос Компаса — от первого лица, по канону. */}
            <Text style={{ color: t.textSecond, fontSize: 13.5, lineHeight: 19, fontWeight: '600', marginHorizontal: 20, marginBottom: 4 }}>
              {L({
                ru: 'Я подсказываю утром и подвожу итог вечером. Здесь решаешь, где мне быть — ничего не навязываю.',
                uk: 'Я підказую вранці та підбиваю підсумок увечері. Тут вирішуєш, де мені бути — нічого не навʼязую.',
                es: 'Te oriento por la mañana y cierro el día por la noche. Aquí decides dónde quieres verme.',
                'pt-BR': 'Te oriento de manhã e fecho o dia à noite. Aqui você decide onde me quer.',
                vi: 'Mình gợi ý buổi sáng và tổng kết buổi tối. Bạn quyết định mình xuất hiện ở đâu.',
                id: 'Aku memandu di pagi hari dan merangkum di malam hari. Di sini kamu yang menentukan.',
                tr: 'Sabah yol gösteririm, akşam günü kapatırım. Nerede olacağıma burada sen karar verirsin.',
                pl: 'Podpowiadam rano i podsumowuję wieczorem. Tutaj decydujesz, gdzie mam być.',
              })}
            </Text>

            <SettingsSectionTitle title={L({ ru: 'Ежедневные ритуалы', uk: 'Щоденні ритуали', es: 'Rituales diarios', 'pt-BR': 'Rituais diários', vi: 'Nghi thức hằng ngày', id: 'Ritual harian', tr: 'Günlük ritüeller', pl: 'Codzienne rytuały' })} />
            <SettingsGroup surfaceColor={t.bgCard} borderColor={t.border} dividerColor={t.border}>
              <SettingsRow
                testID="compass-settings-briefing"
                icon="sunny-outline"
                color="orange"
                label={L({ ru: 'Утренний брифинг', uk: 'Ранковий брифінг', es: 'Briefing matutino', 'pt-BR': 'Briefing da manhã', vi: 'Điểm tin buổi sáng', id: 'Arahan pagi', tr: 'Sabah brifingi', pl: 'Poranna odprawa' })}
                sub={L({ ru: 'План и голос Компаса при входе', uk: 'План і голос Компаса на вході', es: 'Plan y voz de la Brújula al entrar', 'pt-BR': 'Plano e voz da Bússola ao entrar', vi: 'Kế hoạch và lời La bàn khi mở', id: 'Rencana dan suara Kompas saat masuk', tr: 'Girişte Pusula planı ve sesi', pl: 'Plan i głos Kompasu przy wejściu' })}
                hideChevron
                right={<CustomSwitch value={prefs.briefing} onValueChange={toggle('briefing')} />}
              />
              <SettingsRow
                testID="compass-settings-day-closing"
                icon="moon-outline"
                color="indigo"
                label={L({ ru: 'Вечерний итог дня', uk: 'Вечірній підсумок дня', es: 'Cierre del día', 'pt-BR': 'Resumo da noite', vi: 'Tổng kết buổi tối', id: 'Ringkasan malam', tr: 'Akşam gün özeti', pl: 'Wieczorne podsumowanie' })}
                sub={L({ ru: 'Итог, фокус на завтра и награда', uk: 'Підсумок, фокус на завтра й нагорода', es: 'Resultado, foco de mañana y premio', 'pt-BR': 'Resultado, foco de amanhã e prêmio', vi: 'Kết quả, trọng tâm mai và thưởng', id: 'Hasil, fokus besok, dan hadiah', tr: 'Sonuç, yarın odağı ve ödül', pl: 'Wynik, fokus na jutro i nagroda' })}
                hideChevron
                right={<CustomSwitch value={prefs.dayClosing} onValueChange={toggle('dayClosing')} />}
              />
            </SettingsGroup>

            <SettingsSectionTitle title={L({ ru: 'Внутри брифинга', uk: 'Усередині брифінгу', es: 'Dentro del briefing', 'pt-BR': 'Dentro do briefing', vi: 'Bên trong điểm tin', id: 'Di dalam arahan', tr: 'Brifing içinde', pl: 'Wewnątrz odprawy' })} />
            <SettingsGroup surfaceColor={t.bgCard} borderColor={t.border} dividerColor={t.border}>
              <SettingsRow
                testID="compass-settings-ai-voice"
                icon="sparkles-outline"
                color="purple"
                label={L({ ru: 'Живой голос', uk: 'Живий голос', es: 'Voz viva', 'pt-BR': 'Voz viva', vi: 'Giọng nói sống động', id: 'Suara hidup', tr: 'Canlı ses', pl: 'Żywy głos' })}
                sub={L({ ru: 'Личный тёплый текст под твой день', uk: 'Особистий теплий текст під твій день', es: 'Texto personal y cálido para tu día', 'pt-BR': 'Texto pessoal e caloroso para o seu dia', vi: 'Lời nhắn ấm áp riêng cho ngày của bạn', id: 'Pesan hangat pribadi untuk harimu', tr: 'Gününe özel sıcak metin', pl: 'Osobisty, ciepły tekst na twój dzień' })}
                hideChevron
                right={<CustomSwitch value={prefs.aiVoice} onValueChange={toggle('aiVoice')} />}
              />
              <SettingsRow
                testID="compass-settings-social"
                icon="people"
                color="teal"
                label={L({ ru: 'Сводка «Кстати…»', uk: 'Зведення «До речі…»', es: 'Resumen «Por cierto…»', 'pt-BR': 'Resumo «Aliás…»', vi: 'Tin «Nhân tiện…»', id: 'Ringkasan «Ngomong-ngomong…»', tr: '«Bu arada…» özeti', pl: 'Podsumowanie «Przy okazji…»' })}
                sub={L({ ru: 'Заявки в друзья, принятия и лайки', uk: 'Заявки в друзі, прийняття і лайки', es: 'Solicitudes de amistad y me gusta', 'pt-BR': 'Pedidos de amizade e curtidas', vi: 'Lời mời kết bạn và lượt thích', id: 'Permintaan pertemanan dan suka', tr: 'Arkadaşlık istekleri ve beğeniler', pl: 'Zaproszenia do znajomych i polubienia' })}
                hideChevron
                right={<CustomSwitch value={prefs.social} onValueChange={toggle('social')} />}
              />
            </SettingsGroup>

            <Text style={{ color: t.textMuted, fontSize: 12, lineHeight: 17, fontWeight: '600', marginHorizontal: 20, marginTop: 10 }}>
              {L({
                ru: 'Выключенное окно не всплывает само. Изменения вступают в силу со следующего захода на главную.',
                uk: 'Вимкнене вікно не зʼявляється саме. Зміни діють з наступного заходу на головну.',
                es: 'Una ventana apagada no aparece sola. Los cambios aplican al volver al inicio.',
                'pt-BR': 'Uma janela desativada não aparece sozinha. As mudanças valem ao voltar à tela inicial.',
                vi: 'Cửa sổ đã tắt sẽ không tự hiện. Thay đổi áp dụng lần mở trang chính sau.',
                id: 'Jendela yang dimatikan tidak muncul sendiri. Perubahan berlaku saat kembali ke beranda.',
                tr: 'Kapatılan pencere kendiliğinden açılmaz. Değişiklikler ana ekrana dönünce geçerli olur.',
                pl: 'Wyłączone okno nie pojawia się samo. Zmiany działają od następnego wejścia na główną.',
              })}
            </Text>
          </BouncyScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
